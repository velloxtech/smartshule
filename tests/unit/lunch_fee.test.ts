import {
  LunchEnrollment,
  LunchEnrollmentStatus,
  LunchPaymentStatus,
  LunchPayment
} from '../../src/core/domain/finance/LunchEnrollment';
import { LunchFeeUseCases } from '../../src/application/finance/LunchFeeUseCases';
import { InMemoryLunchFeeRepository } from '../../src/infrastructure/database/in-memory/InMemoryLunchFeeRepository';
import { InMemoryStudentRepository, InMemoryUserRepository, InMemoryGuardianRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { ForbiddenError, ConflictError, ValidationError, NotFoundError } from '../../src/core/domain/shared/Errors';

describe('Lunch Fee Domain & Use Cases Unit Tests', () => {
  describe('LunchEnrollment Entity', () => {
    it('creates lunch enrollment with proper fields, auto-calculating balance and payment status', () => {
      const enrollment = LunchEnrollment.create(
        {
          schoolId: 'school-001',
          studentId: 'stud-001',
          academicYearId: 'year-2026',
          termId: 'term-3',
          planName: 'Standard Hot Lunch',
          amount: 6000,
          dietaryNotes: 'Vegetarian, No nuts',
          status: LunchEnrollmentStatus.ACTIVE,
          notes: 'Special catering note',
          enrolledAt: new Date()
        },
        'enr-001'
      );

      expect(enrollment.id).toBe('enr-001');
      expect(enrollment.amount).toBe(6000);
      expect(enrollment.amountPaid).toBe(0);
      expect(enrollment.balance).toBe(6000);
      expect(enrollment.paymentStatus).toBe(LunchPaymentStatus.UNPAID);
      expect(enrollment.dietaryNotes).toBe('Vegetarian, No nuts');
      expect(enrollment.status).toBe(LunchEnrollmentStatus.ACTIVE);
    });

    it('updates enrollment details and adjusts balance correctly', () => {
      const enrollment = LunchEnrollment.create(
        {
          schoolId: 'school-001',
          studentId: 'stud-001',
          planName: 'Standard Hot Lunch',
          amount: 6000,
          status: LunchEnrollmentStatus.ACTIVE,
          enrolledAt: new Date()
        },
        'enr-002'
      );

      enrollment.updateDetails({
        amount: 7500,
        planName: 'Full Diet + Fruits',
        dietaryNotes: 'Halal only',
        status: LunchEnrollmentStatus.SUSPENDED
      });

      expect(enrollment.amount).toBe(7500);
      expect(enrollment.balance).toBe(7500);
      expect(enrollment.planName).toBe('Full Diet + Fruits');
      expect(enrollment.dietaryNotes).toBe('Halal only');
      expect(enrollment.status).toBe(LunchEnrollmentStatus.SUSPENDED);
    });

    it('records payments towards lunch fee and transitions status from PARTIAL to PAID', () => {
      const enrollment = LunchEnrollment.create(
        {
          schoolId: 'school-001',
          studentId: 'stud-001',
          planName: 'Standard Hot Lunch',
          amount: 5000,
          status: LunchEnrollmentStatus.ACTIVE,
          enrolledAt: new Date()
        },
        'enr-003'
      );

      // 1. Partial payment of 2,000
      enrollment.recordPayment({
        id: 'pay-001',
        lunchEnrollmentId: enrollment.id,
        studentId: 'stud-001',
        schoolId: 'school-001',
        amount: 2000,
        receiptNumber: 'REC-001',
        paymentMethod: 'MPESA',
        transactionReference: 'QHJ12345',
        paymentDate: '2026-09-28',
        createdAt: new Date()
      });

      expect(enrollment.amountPaid).toBe(2000);
      expect(enrollment.balance).toBe(3000);
      expect(enrollment.paymentStatus).toBe(LunchPaymentStatus.PARTIAL);
      expect(enrollment.payments.length).toBe(1);

      // 2. Full remaining payment of 3,000
      enrollment.recordPayment({
        id: 'pay-002',
        lunchEnrollmentId: enrollment.id,
        studentId: 'stud-001',
        schoolId: 'school-001',
        amount: 3000,
        receiptNumber: 'REC-002',
        paymentMethod: 'CASH',
        transactionReference: 'CSH-999',
        paymentDate: '2026-09-28',
        createdAt: new Date()
      });

      expect(enrollment.amountPaid).toBe(5000);
      expect(enrollment.balance).toBe(0);
      expect(enrollment.paymentStatus).toBe(LunchPaymentStatus.PAID);
      expect(enrollment.payments.length).toBe(2);
    });

    it('serializes to JSON accurately', () => {
      const enrollment = LunchEnrollment.create(
        {
          schoolId: 'school-001',
          studentId: 'stud-001',
          planName: 'Standard Hot Lunch',
          amount: 5000,
          status: LunchEnrollmentStatus.ACTIVE,
          enrolledAt: new Date()
        },
        'enr-json'
      );

      const json = enrollment.toJSON();
      expect(json.id).toBe('enr-json');
      expect(json.planName).toBe('Standard Hot Lunch');
      expect(json.balance).toBe(5000);
      expect(json.paymentStatus).toBe(LunchPaymentStatus.UNPAID);
    });
  });

  describe('LunchFeeUseCases Strict RBAC & Logic', () => {
    let lunchRepo: InMemoryLunchFeeRepository;
    let studentRepo: InMemoryStudentRepository;
    let userRepo: InMemoryUserRepository;
    let guardianRepo: InMemoryGuardianRepository;
    let useCases: LunchFeeUseCases;

    const adminUser = { userId: 'admin-01', role: UserRole.ADMIN, schoolId: 'school-001' };
    const headTeacherUser = { userId: 'ht-01', role: UserRole.HEAD_TEACHER, schoolId: 'school-001' };
    const superAdminUser = { userId: 'sa-01', role: UserRole.SUPER_ADMIN, schoolId: 'school-001' };
    const teacherUser = { userId: 'teacher-01', role: UserRole.TEACHER, schoolId: 'school-001' };
    const parentUser = { userId: 'parent-01', role: UserRole.PARENT, schoolId: 'school-001' };
    const studentUser = { userId: 'student-01', role: UserRole.STUDENT, schoolId: 'school-001' };

    let testStudent1: Student;
    let testStudent2: Student;

    beforeEach(async () => {
      lunchRepo = new InMemoryLunchFeeRepository();
      studentRepo = new InMemoryStudentRepository();
      userRepo = new InMemoryUserRepository();
      guardianRepo = new InMemoryGuardianRepository();
      useCases = new LunchFeeUseCases(lunchRepo, studentRepo, userRepo, guardianRepo);

      // Create test students
      testStudent1 = Student.create(
        {
          admissionNumber: 'ADM-001',
          firstName: 'Alice',
          lastName: 'Moraa',
          dateOfBirth: '2018-05-12',
          gender: StudentGender.FEMALE,
          gradeLevel: CbcGradeLevel.PP1,
          streamId: 'stream-east',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          status: StudentStatus.ACTIVE,
          guardianIds: ['guardian-01']
        },
        'stud-001'
      );
      await studentRepo.save(testStudent1);

      testStudent2 = Student.create(
        {
          admissionNumber: 'ADM-002',
          firstName: 'Brian',
          lastName: 'Kiprono',
          dateOfBirth: '2018-08-20',
          gender: StudentGender.MALE,
          gradeLevel: CbcGradeLevel.PP1,
          streamId: 'stream-east',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          status: StudentStatus.ACTIVE,
          guardianIds: ['guardian-other']
        },
        'stud-002'
      );
      await studentRepo.save(testStudent2);

      // Create Guardian linked to parentUser and testStudent1
      const guardian1 = Guardian.create(
        {
          userId: 'parent-01',
          relationship: GuardianRelationship.MOTHER,
          emergencyContact: '+254711223344',
          studentIds: ['stud-001']
        },
        'guardian-01'
      );
      await guardianRepo.save(guardian1);
    });

    it('allows Admin, Super Admin, and Head Teacher to enroll learner onto lunch list', async () => {
      const res1 = await useCases.enrollStudent(
        {
          studentId: 'stud-001',
          amount: 6000,
          termId: 'term-3',
          dietaryNotes: 'Vegetarian'
        },
        adminUser
      );
      expect(res1.enrollment.studentId).toBe('stud-001');
      expect(res1.enrollment.amount).toBe(6000);

      const res2 = await useCases.enrollStudent(
        {
          studentId: 'stud-002',
          amount: 6000,
          termId: 'term-3',
          dietaryNotes: 'Standard'
        },
        headTeacherUser
      );
      expect(res2.enrollment.studentId).toBe('stud-002');
    });

    it('rejects general Teacher from creating lunch fee list with ForbiddenError', async () => {
      await expect(
        useCases.enrollStudent(
          {
            studentId: 'stud-001',
            amount: 6000
          },
          teacherUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects Parent from creating lunch fee list with ForbiddenError', async () => {
      await expect(
        useCases.enrollStudent(
          {
            studentId: 'stud-001',
            amount: 6000
          },
          parentUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects Student role from creating lunch fee list with ForbiddenError', async () => {
      await expect(
        useCases.enrollStudent(
          {
            studentId: 'stud-001',
            amount: 6000
          },
          studentUser
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('prevents duplicate active enrollment for the same student and term', async () => {
      await useCases.enrollStudent(
        {
          studentId: 'stud-001',
          amount: 6000,
          termId: 'term-3'
        },
        adminUser
      );

      await expect(
        useCases.enrollStudent(
          {
            studentId: 'stud-001',
            amount: 6000,
            termId: 'term-3'
          },
          adminUser
        )
      ).rejects.toThrow(ConflictError);
    });

    it('allows Admin to bulk enroll multiple students into lunch roster', async () => {
      const bulkRes = await useCases.enrollStudentsBulk(
        {
          studentIds: ['stud-001', 'stud-002'],
          amount: 5500,
          termId: 'term-3',
          planName: 'Term 3 Hot Lunch'
        },
        adminUser
      );

      expect(bulkRes.enrolledCount).toBe(2);
      expect(bulkRes.enrolled.length).toBe(2);
    });

    it('allows Admin & Head Teacher to view the full lunch roster', async () => {
      await useCases.enrollStudent(
        {
          studentId: 'stud-001',
          amount: 6000,
          termId: 'term-3'
        },
        adminUser
      );
      await useCases.enrollStudent(
        {
          studentId: 'stud-002',
          amount: 6000,
          termId: 'term-3'
        },
        headTeacherUser
      );

      // Admin sees both
      const adminList = await useCases.getLunchList({}, adminUser);
      expect(adminList.length).toBe(2);

      // Head teacher sees both
      const htList = await useCases.getLunchList({}, headTeacherUser);
      expect(htList.length).toBe(2);
    });

    it('allows Parent to ONLY see their enrolled child(ren) who are in the list', async () => {
      // Enroll both stud-001 (parent's child) and stud-002 (someone else's child)
      await useCases.enrollStudent(
        {
          studentId: 'stud-001',
          amount: 6000,
          termId: 'term-3'
        },
        adminUser
      );
      await useCases.enrollStudent(
        {
          studentId: 'stud-002',
          amount: 6000,
          termId: 'term-3'
        },
        adminUser
      );

      // Parent queries lunch list
      const parentList = await useCases.getLunchList({}, parentUser);
      expect(parentList.length).toBe(1);
      expect(parentList[0].studentId).toBe('stud-001');
      expect(parentList[0].studentName).toBe('Alice Moraa');
    });

    it('returns empty list for Parent whose children are NOT on the lunch list', async () => {
      // Only enroll stud-002 (not parent's child)
      await useCases.enrollStudent(
        {
          studentId: 'stud-002',
          amount: 6000,
          termId: 'term-3'
        },
        adminUser
      );

      // Parent queries lunch list -> must NOT see stud-002!
      const parentList = await useCases.getLunchList({}, parentUser);
      expect(parentList).toEqual([]);
    });

    it('rejects regular Teacher from viewing lunch list with ForbiddenError', async () => {
      await expect(useCases.getLunchList({}, teacherUser)).rejects.toThrow(ForbiddenError);
    });

    it('calculates financial summary accurately for Admins and Head Teacher', async () => {
      const enr1 = await useCases.enrollStudent(
        {
          studentId: 'stud-001',
          amount: 6000,
          dietaryNotes: 'Vegetarian'
        },
        adminUser
      );
      await useCases.enrollStudent(
        {
          studentId: 'stud-002',
          amount: 6000,
          dietaryNotes: 'Standard'
        },
        headTeacherUser
      );

      // Record 4,000 payment for enr1
      await useCases.recordPayment(
        enr1.enrollment.id,
        {
          amount: 4000,
          paymentMethod: 'MPESA',
          transactionReference: 'QHJ123'
        },
        adminUser
      );

      const summary = await useCases.getLunchSummary({}, adminUser);
      expect(summary.totalEnrolled).toBe(2);
      expect(summary.totalBilled).toBe(12000);
      expect(summary.totalPaid).toBe(4000);
      expect(summary.totalBalance).toBe(8000);
      expect(summary.partialCount).toBe(1);
      expect(summary.unpaidCount).toBe(1);
      expect(summary.dietaryBreakdown['Vegetarian']).toBe(1);
      expect(summary.dietaryBreakdown['Standard']).toBe(1);
    });
  });
});
