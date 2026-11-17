import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { ClassRoom, Stream, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { LunchEnrollment, LunchEnrollmentStatus } from '../../src/core/domain/finance/LunchEnrollment';

describe('SmartShule Lunch Program — UI Enhancements & Contribution Workflows', () => {
  let app: Express;
  let container: AppContainer;

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';

  let adminToken: string;
  let headteacherToken: string;
  let bursarToken: string;
  let teacherToken: string;
  let parentToken: string;

  // Student IDs
  const DAILY_STUDENT_ID = 'std-lunch-daily-01';
  const MONTHLY_STUDENT_ID = 'std-lunch-monthly-01';
  const TERMLY_STUDENT_ID = 'std-lunch-termly-01';
  const UNENROLLED_STUDENT_ID = 'std-lunch-unenrolled-01';
  const SUSPENDED_STUDENT_ID = 'std-lunch-suspended-01';

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // Setup Classroom & Stream
    const testClass = ClassRoom.create(
      {
        schoolId,
        name: 'Grade 2 Blue',
        gradeLevel: CBCGradeLevel.GRADE_2,
        educationLevel: EducationLevel.LOWER_PRIMARY,
      },
      'class-lunch-01'
    );
    await container.academicRepository.saveClass(testClass);

    const testStream = Stream.create(
      { classRoomId: testClass.id, name: 'Blue', capacity: 35 },
      'stream-lunch-01'
    );
    await container.academicRepository.saveStream(testStream);

    // Setup Users
    const adminUser = User.create(
      {
        firstName: 'Finance',
        lastName: 'Admin',
        email: 'lunch.admin@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Admin@2026!'),
        role: UserRole.ADMIN,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      'usr-lunch-admin'
    );
    await container.userRepository.save(adminUser);

    const htUser = User.create(
      {
        firstName: 'Sarah',
        lastName: 'Headteacher',
        email: 'lunch.ht@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Headteacher@2026!'),
        role: UserRole.HEAD_TEACHER,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      'usr-lunch-ht'
    );
    await container.userRepository.save(htUser);

    const bursarUser = User.create(
      {
        firstName: 'David',
        lastName: 'Bursar',
        email: 'lunch.bursar@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Bursar@2026!'),
        role: UserRole.BURSAR,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      'usr-lunch-bursar'
    );
    await container.userRepository.save(bursarUser);

    const teacherUser = User.create(
      {
        firstName: 'Grace',
        lastName: 'Teacher',
        email: 'lunch.teacher@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Teacher@2026!'),
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      'usr-lunch-teacher'
    );
    await container.userRepository.save(teacherUser);

    const parentUser = User.create(
      {
        firstName: 'Peter',
        lastName: 'Parent',
        email: 'lunch.parent@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Parent@2026!'),
        role: UserRole.PARENT,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      'usr-lunch-parent'
    );
    await container.userRepository.save(parentUser);

    // Setup Students
    const createTestStudent = async (id: string, adm: string, first: string, last: string) => {
      const student = Student.create(
        {
          schoolId,
          academicYearId,
          classroomId: testClass.id,
          streamId: testStream.id,
          admissionNumber: adm,
          firstName: first,
          lastName: last,
          gradeLevel: CBCGradeLevel.GRADE_2,
          gender: StudentGender.MALE,
          dateOfBirth: '2019-05-15',
          guardianIds: [],
          status: StudentStatus.ACTIVE,
        },
        id
      );
      await container.studentRepository.save(student);
      return student;
    };

    await createTestStudent(DAILY_STUDENT_ID, 'ADM-DAILY-01', 'Dennis', 'Daily');
    await createTestStudent(MONTHLY_STUDENT_ID, 'ADM-MONTHLY-01', 'Mary', 'Monthly');
    await createTestStudent(TERMLY_STUDENT_ID, 'ADM-TERMLY-01', 'Thomas', 'Termly');
    await createTestStudent(UNENROLLED_STUDENT_ID, 'ADM-UNENROLLED-01', 'Ursula', 'Unenrolled');
    await createTestStudent(SUSPENDED_STUDENT_ID, 'ADM-SUSPENDED-01', 'Samson', 'Suspended');

    // Setup Lunch Enrollments
    const dailyEnrollment = LunchEnrollment.create(
      {
        schoolId,
        studentId: DAILY_STUDENT_ID,
        academicYearId,
        planName: 'Daily Hot Lunch',
        paymentFrequency: 'DAILY',
        dailyRate: 150,
        amount: 0,
        status: LunchEnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      },
      'enr-daily-01'
    );
    await container.lunchFeeRepository.save(dailyEnrollment);

    const monthlyEnrollment = LunchEnrollment.create(
      {
        schoolId,
        studentId: MONTHLY_STUDENT_ID,
        academicYearId,
        planName: 'Standard Monthly Plan',
        paymentFrequency: 'MONTHLY',
        dailyRate: 0,
        amount: 3000,
        status: LunchEnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      },
      'enr-monthly-01'
    );
    await container.lunchFeeRepository.save(monthlyEnrollment);

    const termlyEnrollment = LunchEnrollment.create(
      {
        schoolId,
        studentId: TERMLY_STUDENT_ID,
        academicYearId,
        planName: 'Full Term Dining Plan',
        paymentFrequency: 'TERMLY',
        dailyRate: 0,
        amount: 8000,
        status: LunchEnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      },
      'enr-termly-01'
    );
    await container.lunchFeeRepository.save(termlyEnrollment);

    const suspendedEnrollment = LunchEnrollment.create(
      {
        schoolId,
        studentId: SUSPENDED_STUDENT_ID,
        academicYearId,
        planName: 'Suspended Lunch Plan',
        paymentFrequency: 'DAILY',
        dailyRate: 150,
        amount: 0,
        status: LunchEnrollmentStatus.SUSPENDED,
        enrolledAt: new Date(),
      },
      'enr-suspended-01'
    );
    await container.lunchFeeRepository.save(suspendedEnrollment);

    // Login Users and acquire tokens
    const loginUser = async (email: string, pass: string) => {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: pass });
      return res.body.data.accessToken || res.body.data.token;
    };

    adminToken = await loginUser('lunch.admin@smartshule.ac.ke', 'Admin@2026!');
    headteacherToken = await loginUser('lunch.ht@smartshule.ac.ke', 'Headteacher@2026!');
    bursarToken = await loginUser('lunch.bursar@smartshule.ac.ke', 'Bursar@2026!');
    teacherToken = await loginUser('lunch.teacher@smartshule.ac.ke', 'Teacher@2026!');
    parentToken = await loginUser('lunch.parent@smartshule.ac.ke', 'Parent@2026!');
  });

  // =========================================================================
  // 1. DAILY LUNCH CONTRIBUTION WORKFLOW & VALIDATIONS
  // =========================================================================
  describe('1. Daily Lunch Contribution Workflow', () => {
    it('1.1 should record daily contribution for learner enrolled with DAILY frequency', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          studentId: DAILY_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-03',
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-DLY-001',
          idempotencyKey: 'idemp-daily-test-valid-01',
          recordedByStaffName: 'Bursar David',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(150);
      expect(res.body.data.payment.receiptNumber).toMatch(/^LNCH-REC-/);
      expect(res.body.data.enrollment.amountPaid).toBe(150);
      expect(res.body.data.enrollment.paymentFrequency).toBe('DAILY');
    });

    it('1.2 should REJECT daily contribution for unenrolled learner with 400 ValidationError (no silent auto-enrollment)', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: UNENROLLED_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-03',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not enrolled in the Lunch Program');
    });

    it('1.3 should REJECT daily contribution for learner enrolled under MONTHLY frequency', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          studentId: MONTHLY_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-03',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('restricted to learners enrolled with DAILY payment frequency');
    });

    it('1.4 should REJECT daily contribution for learner with SUSPENDED lunch enrollment', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          studentId: SUSPENDED_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-03',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot be recorded for inactive or withdrawn enrollments');
    });

    it('1.5 should return existing payment idempotently when duplicate idempotencyKey is submitted', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          studentId: DAILY_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-03',
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-DLY-001',
          idempotencyKey: 'idemp-daily-test-valid-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('idempotently');
      expect(res.body.data.isDuplicateReplay).toBe(true);
      expect(res.body.data.payment.amount).toBe(150);
    });

    it('1.6 should ALLOW legitimate second payment on same date with distinct reference', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          studentId: DAILY_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-03',
          paymentMethod: 'CASH',
          transactionReference: 'CASH-DLY-LEGIT-002',
          idempotencyKey: 'idemp-daily-legit-002',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrollment.amountPaid).toBe(300); // 150 + 150
    });
  });

  // =========================================================================
  // 2. MONTHLY LUNCH CONTRIBUTION WORKFLOW & VALIDATIONS
  // =========================================================================
  describe('2. Monthly Lunch Contribution Workflow', () => {
    it('2.1 should record monthly contribution for learner enrolled with MONTHLY frequency', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          studentId: MONTHLY_STUDENT_ID,
          amount: 1500,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-03',
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-MTH-001',
          idempotencyKey: 'idemp-monthly-test-01',
          recordedByStaffName: 'Headteacher Sarah',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(1500);
      expect(res.body.data.payment.receiptNumber).toMatch(/^LNCH-REC-/);
      expect(res.body.data.enrollment.amountPaid).toBe(1500);
      expect(res.body.data.enrollment.balance).toBe(1500); // 3000 - 1500
    });

    it('2.2 should record monthly payment for learner enrolled with TERMLY frequency', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          studentId: TERMLY_STUDENT_ID,
          amount: 4000,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-03',
          paymentMethod: 'BANK_DEPOSIT',
          transactionReference: 'BANK-TRM-001',
          idempotencyKey: 'idemp-termly-test-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(4000);
      expect(res.body.data.enrollment.amountPaid).toBe(4000);
      expect(res.body.data.enrollment.balance).toBe(4000); // 8000 - 4000
    });

    it('2.3 should REJECT monthly contribution for unenrolled learner with 400 ValidationError', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: UNENROLLED_STUDENT_ID,
          amount: 2000,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-03',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not enrolled in the Lunch Program');
    });

    it('2.4 should REJECT monthly contribution for learner enrolled under DAILY frequency', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          studentId: DAILY_STUDENT_ID,
          amount: 3000,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-03',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please use the Daily Collection workflow instead of monthly contribution');
    });

    it('2.5 should REJECT monthly contribution for learner with SUSPENDED lunch enrollment', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: SUSPENDED_STUDENT_ID,
          amount: 2000,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-03',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('cannot be recorded for inactive or withdrawn enrollments');
    });

    it('2.6 should return existing payment idempotently when duplicate idempotencyKey is submitted for monthly payment', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          studentId: MONTHLY_STUDENT_ID,
          amount: 1500,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-03',
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-MTH-001',
          idempotencyKey: 'idemp-monthly-test-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('idempotently');
      expect(res.body.data.isDuplicateReplay).toBe(true);
      expect(res.body.data.payment.amount).toBe(1500);
    });

    it('2.7 should reject duplicate payment when identical transaction reference is submitted without idempotencyKey', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: MONTHLY_STUDENT_ID,
          amount: 1500,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-03',
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-MTH-001',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  // =========================================================================
  // 3. RBAC & PERMISSION BOUNDARIES
  // =========================================================================
  describe('3. Lunch Program RBAC & Permission Verification', () => {
    it('3.1 should allow HEAD_TEACHER to record daily and monthly lunch payments', async () => {
      const dailyRes = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          studentId: DAILY_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-04',
          paymentMethod: 'CASH',
          transactionReference: 'CASH-HT-AUTH-01',
          idempotencyKey: 'idemp-ht-auth-01',
        });

      expect(dailyRes.status).toBe(201);
      expect(dailyRes.body.success).toBe(true);
    });

    it('3.2 should REJECT TEACHER role from recording lunch payments with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: DAILY_STUDENT_ID,
          amount: 150,
          paymentDate: '2026-11-04',
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3.3 should REJECT PARENT role from recording lunch payments with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          studentId: MONTHLY_STUDENT_ID,
          amount: 1000,
          paymentMonth: '2026-11',
          paymentDate: '2026-11-04',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3.4 should REJECT unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/monthly')
        .send({
          studentId: MONTHLY_STUDENT_ID,
          amount: 1000,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
