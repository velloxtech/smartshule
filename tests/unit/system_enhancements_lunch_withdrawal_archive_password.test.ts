import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { ClassRoom, Stream, EducationLevel } from '../../src/core/domain/academic/ClassRoom';

describe('SmartShule Enhancements: Lunch Daily Collections, Withdrawal, Archiving & Password Reset', () => {
  let app: Express;
  let container: AppContainer;

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';

  let adminToken: string;
  let headteacherToken: string;
  let pureParentToken: string;

  const ADMIN_USER_ID = 'usr-admin-01';
  const HT_USER_ID = 'usr-headteacher-01';
  const HT_GUARDIAN_ID = 'grd-ht-01';
  const HT_STUDENT_ID = 'std-ht-child-01';

  const PARENT_USER_ID = 'usr-parent-multi-01';
  const PARENT_GUARDIAN_ID = 'grd-parent-multi-01';
  const PARENT_CHILD_A_ID = 'std-child-a-01';
  const PARENT_CHILD_B_ID = 'std-child-b-01';

  const SINGLE_PARENT_USER_ID = 'usr-parent-single-01';
  const SINGLE_PARENT_GUARDIAN_ID = 'grd-parent-single-01';
  const SINGLE_CHILD_ID = 'std-child-single-01';

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // 1. Setup Academic Class
    const pp1Class = ClassRoom.create(
      {
        schoolId,
        name: 'PP1 East',
        gradeLevel: CBCGradeLevel.PP1,
        educationLevel: EducationLevel.PRE_PRIMARY,
      },
      'class-pp1-enh'
    );
    await container.academicRepository.saveClass(pp1Class);

    const stream = Stream.create(
      { classRoomId: pp1Class.id, name: 'East', capacity: 30 },
      'stream-pp1-enh'
    );
    await container.academicRepository.saveStream(stream);

    // 2. Setup Administrator User
    const adminUser = User.create(
      {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin.enhancements@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Admin@2026!'),
        role: UserRole.ADMIN,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      ADMIN_USER_ID
    );
    await container.userRepository.save(adminUser);

    // 3. Setup Dual-Role Headteacher User (Staff + Parent)
    const htUser = User.create(
      {
        firstName: 'Rael',
        lastName: 'Nandi',
        email: 'headteacher.dual@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Headteacher@2026!'),
        role: UserRole.HEAD_TEACHER,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      HT_USER_ID
    );
    await container.userRepository.save(htUser);

    const htGuardian = Guardian.create(
      {
        userId: HT_USER_ID,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '0707123456',
        studentIds: [HT_STUDENT_ID],
      },
      HT_GUARDIAN_ID
    );
    await container.guardianRepository.save(htGuardian);

    const htChild = Student.create(
      {
        schoolId,
        academicYearId,
        classroomId: pp1Class.id,
        streamId: stream.id,
        admissionNumber: 'ADM-HT-01',
        firstName: 'Edwin',
        lastName: 'Bright',
        gradeLevel: CBCGradeLevel.PP1,
        gender: StudentGender.MALE,
        dateOfBirth: '2021-03-10',
        guardianIds: [HT_GUARDIAN_ID],
        status: StudentStatus.ACTIVE,
      },
      HT_STUDENT_ID
    );
    await container.studentRepository.save(htChild);

    // 4. Setup Pure Parent with Multiple Children (Child A & Child B)
    const multiParentUser = User.create(
      {
        firstName: 'Grace',
        lastName: 'Parent',
        email: 'parent.multi@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Parent@2026!'),
        role: UserRole.PARENT,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      PARENT_USER_ID
    );
    await container.userRepository.save(multiParentUser);

    const multiGuardian = Guardian.create(
      {
        userId: PARENT_USER_ID,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '0712345678',
        studentIds: [PARENT_CHILD_A_ID, PARENT_CHILD_B_ID],
      },
      PARENT_GUARDIAN_ID
    );
    await container.guardianRepository.save(multiGuardian);

    const childA = Student.create(
      {
        schoolId,
        academicYearId,
        classroomId: pp1Class.id,
        streamId: stream.id,
        admissionNumber: 'ADM-CH-A',
        firstName: 'Alice',
        lastName: 'Parent',
        gradeLevel: CBCGradeLevel.PP1,
        gender: StudentGender.FEMALE,
        dateOfBirth: '2021-01-15',
        guardianIds: [PARENT_GUARDIAN_ID],
        status: StudentStatus.ACTIVE,
      },
      PARENT_CHILD_A_ID
    );
    await container.studentRepository.save(childA);

    const childB = Student.create(
      {
        schoolId,
        academicYearId,
        classroomId: pp1Class.id,
        streamId: stream.id,
        admissionNumber: 'ADM-CH-B',
        firstName: 'Bob',
        lastName: 'Parent',
        gradeLevel: CBCGradeLevel.PP1,
        gender: StudentGender.MALE,
        dateOfBirth: '2021-06-20',
        guardianIds: [PARENT_GUARDIAN_ID],
        status: StudentStatus.ACTIVE,
      },
      PARENT_CHILD_B_ID
    );
    await container.studentRepository.save(childB);

    // 5. Setup Pure Parent with Single Child
    const singleParentUser = User.create(
      {
        firstName: 'Solo',
        lastName: 'Guardian',
        email: 'parent.single@smartshule.ac.ke',
        passwordHash: await container.passwordHasher.hash('Single@2026!'),
        role: UserRole.PARENT,
        schoolId,
        status: UserStatus.ACTIVE,
      },
      SINGLE_PARENT_USER_ID
    );
    await container.userRepository.save(singleParentUser);

    const singleGuardian = Guardian.create(
      {
        userId: SINGLE_PARENT_USER_ID,
        relationship: GuardianRelationship.FATHER,
        emergencyContact: '0799887766',
        studentIds: [SINGLE_CHILD_ID],
      },
      SINGLE_PARENT_GUARDIAN_ID
    );
    await container.guardianRepository.save(singleGuardian);

    const singleChild = Student.create(
      {
        schoolId,
        academicYearId,
        classroomId: pp1Class.id,
        streamId: stream.id,
        admissionNumber: 'ADM-SOLO-01',
        firstName: 'Solo',
        lastName: 'Junior',
        gradeLevel: CBCGradeLevel.PP1,
        gender: StudentGender.MALE,
        dateOfBirth: '2021-04-12',
        guardianIds: [SINGLE_PARENT_GUARDIAN_ID],
        status: StudentStatus.ACTIVE,
      },
      SINGLE_CHILD_ID
    );
    await container.studentRepository.save(singleChild);

    // Obtain JWT Tokens
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin.enhancements@smartshule.ac.ke',
      password: 'Admin@2026!',
    });
    adminToken = adminLogin.body.data.accessToken || adminLogin.body.data.token;

    const htLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'headteacher.dual@smartshule.ac.ke',
      password: 'Headteacher@2026!',
    });
    headteacherToken = htLogin.body.data.accessToken || htLogin.body.data.token;

    const parentLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'parent.multi@smartshule.ac.ke',
      password: 'Parent@2026!',
    });
    pureParentToken = parentLogin.body.data.accessToken || parentLogin.body.data.token;
  });

  // =========================================================================
  // MODULE 1: LUNCH PROGRAM — DAILY COLLECTION, REVERSAL & REPORTING
  // =========================================================================
  describe('Module 1: Lunch Program Daily Collection & Financial Accountability', () => {
    const studentId = HT_STUDENT_ID;

    it('1.1 should record daily lunch collection and auto-enroll learner with DAILY frequency', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          amount: 150,
          paymentDate: '2026-11-02',
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-DAILY-001',
          idempotencyKey: 'idemp-daily-test-001',
          notes: 'Daily lunch cash/mpesa collection',
          recordedByStaffName: 'Finance Officer Sarah',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(150);
      expect(res.body.data.payment.receiptNumber).toBeDefined();
      expect(res.body.data.enrollment.paymentFrequency).toBe('DAILY');
      expect(res.body.data.enrollment.amountPaid).toBe(150);
    });

    it('1.2 should return identical payment idempotently when duplicate idempotencyKey is used', async () => {
      // Re-submitting with identical idempotencyKey
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          amount: 150,
          paymentDate: '2026-11-02',
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-DAILY-001',
          idempotencyKey: 'idemp-daily-test-001',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('idempotently');
      expect(res.body.data.payment.amount).toBe(150);

      // Verify that total enrollment amountPaid was NOT double-counted
      const enrollments = await container.lunchFeeRepository.findEnrollments({ studentId });
      expect(enrollments[0]?.amountPaid).toBe(150);
    });

    it('1.3 should allow legitimate second payment on same date with distinct reference', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          amount: 100,
          paymentDate: '2026-11-02',
          paymentMethod: 'CASH',
          transactionReference: 'CSH-RECEIPT-002',
          idempotencyKey: 'idemp-daily-test-002',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(100);

      // Enrollment should now have 150 + 100 = 250
      const enrollments = await container.lunchFeeRepository.findEnrollments({ studentId });
      expect(enrollments[0]?.amountPaid).toBe(250);
    });

    it('1.4 should reject duplicate payment when same transaction reference is submitted without idempotencyKey', async () => {
      const res = await request(app)
        .post('/api/v1/lunch/payments/daily')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          amount: 100,
          paymentDate: '2026-11-02',
          paymentMethod: 'CASH',
          transactionReference: 'CSH-RECEIPT-002', // duplicate
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('1.5 should reverse lunch payment, deduct from enrollment, restore balance, and maintain audit trail', async () => {
      // Find the second payment
      const payments = await container.lunchFeeRepository.findPayments(undefined, studentId);
      const targetPayment = payments.find((p) => p.amount === 100 && !p.isReversed);
      expect(targetPayment).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/lunch/payments/${targetPayment!.id}/reverse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Duplicate entry entered accidentally by cash office',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.isReversed).toBe(true);
      expect(res.body.data.payment.reversalReason).toBe(
        'Duplicate entry entered accidentally by cash office'
      );

      // Enrollment amountPaid should be reduced back to 150
      const enrollments = await container.lunchFeeRepository.findEnrollments({ studentId });
      expect(enrollments[0]?.amountPaid).toBe(150);
    });

    it('1.6 should generate weekly collection report grouping collections by date without double-counting', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/reports/weekly?startDate=2026-11-01&endDate=2026-11-07')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.startDate).toBe('2026-11-01');
      expect(res.body.data.endDate).toBe('2026-11-07');
      expect(res.body.data.totalCollected).toBeGreaterThanOrEqual(150);
      expect(Array.isArray(res.body.data.dailyBreakdown)).toBe(true);
      expect(res.body.data.byPaymentMethod).toBeDefined();
    });

    it('1.7 should generate monthly collection report reconciling calendar weeks cleanly', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/reports/monthly?year=2026&month=11')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.year).toBe(2026);
      expect(res.body.data.month).toBe(11);
      expect(res.body.data.totalCollected).toBeGreaterThanOrEqual(150);
      expect(res.body.data.totalReversed).toBe(100);
      expect(res.body.data.netCollected).toBeGreaterThanOrEqual(150);
      expect(Array.isArray(res.body.data.weeklyBreakdown)).toBe(true);
      expect(res.body.data.weeklyBreakdown.length).toBe(5); // 5 calendar segments in 30-day month
    });

    it('1.8 should provide real-time lunch dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/v1/lunch/dashboard-metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.todayCollected).toBeGreaterThanOrEqual(150);
      expect(res.body.data.todayLearnersPaid).toBeGreaterThanOrEqual(1);
      expect(res.body.data.thisWeekCollected).toBeGreaterThanOrEqual(150);
      expect(res.body.data.thisMonthCollected).toBeGreaterThanOrEqual(150);
      expect(res.body.data.frequencyBreakdown).toBeDefined();
    });
  });

  // =========================================================================
  // MODULE 2: LEARNER WITHDRAWAL AND ACCOUNT SUSPENSION
  // =========================================================================
  describe('Module 2: Learner Withdrawal, Account Suspension & Dual-Role Protection', () => {
    it('2.1 withdrawing a child of a dual-role Headteacher/Teacher MUST NEVER delete or suspend the staff user account', async () => {
      // Rael Nandi (Headteacher) has enrolled child Edwin Bright
      const withdrawRes = await request(app)
        .post(`/api/v1/students/${HT_STUDENT_ID}/withdraw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          withdrawalDate: '2026-11-02',
          reason: 'Family relocated to another county',
          destinationSchool: 'Hillside Academy Eldoret',
          notes: 'Transfer certificate issued',
        });

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.success).toBe(true);
      expect(withdrawRes.body.data.student.status).toBe(StudentStatus.WITHDRAWN);
      expect(withdrawRes.body.data.student.withdrawalReason).toBe('Family relocated to another county');
      expect(withdrawRes.body.data.student.destinationSchool).toBe('Hillside Academy Eldoret');

      // CRITICAL INVARIANT VERIFICATION: Headteacher User account MUST remain ACTIVE
      const htUserAfter = await container.userRepository.findById(HT_USER_ID);
      expect(htUserAfter).toBeDefined();
      expect(htUserAfter!.status).toBe(UserStatus.ACTIVE);
      expect(htUserAfter!.role).toBe(UserRole.HEAD_TEACHER);

      // Verify Headteacher can still make authenticated requests with their existing token
      const htTestReq = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${headteacherToken}`);
      expect(htTestReq.status).toBe(200);
    });

    it('2.2 withdrawing one child from a multi-child parent preserves parent access to active child', async () => {
      // Grace Parent has Child A and Child B
      const withdrawRes = await request(app)
        .post(`/api/v1/students/${PARENT_CHILD_A_ID}/withdraw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          withdrawalDate: '2026-11-02',
          reason: 'Child transferred to boarding school',
        });

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.data.student.status).toBe(StudentStatus.WITHDRAWN);

      // Parent user account must remain ACTIVE because Child B is still enrolled
      const parentUserAfter = await container.userRepository.findById(PARENT_USER_ID);
      expect(parentUserAfter!.status).toBe(UserStatus.ACTIVE);

      // Parent portal data check: Parent only sees active child (Child B), Child A is filtered out
      const portalRes = await request(app)
        .get('/api/v1/students/guardian/me')
        .set('Authorization', `Bearer ${pureParentToken}`);

      expect(portalRes.status).toBe(200);
      const studentIds = portalRes.body.data.students.map((s: any) => s.id);
      expect(studentIds).toContain(PARENT_CHILD_B_ID);
      expect(studentIds).not.toContain(PARENT_CHILD_A_ID);
    });

    it('2.3 withdrawing the only child of a pure parent suspends login access without destructive hard-deletion', async () => {
      // Solo Guardian has only SINGLE_CHILD_ID
      const withdrawRes = await request(app)
        .post(`/api/v1/students/${SINGLE_CHILD_ID}/withdraw`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          withdrawalDate: '2026-11-02',
          reason: 'Transferred to day school',
        });

      expect(withdrawRes.status).toBe(200);

      // User account is SUSPENDED, NOT deleted from database
      const soloUser = await container.userRepository.findById(SINGLE_PARENT_USER_ID);
      expect(soloUser).toBeDefined();
      expect(soloUser!.status).toBe(UserStatus.SUSPENDED);
    });

    it('2.4 should suspend and reactivate a learner through dedicated endpoints', async () => {
      // Suspend Child B
      const suspendRes = await request(app)
        .post(`/api/v1/students/${PARENT_CHILD_B_ID}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Disciplinary suspension' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.student.status).toBe(StudentStatus.SUSPENDED);

      // Reactivate Child B
      const reactivateRes = await request(app)
        .post(`/api/v1/students/${PARENT_CHILD_B_ID}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.student.status).toBe(StudentStatus.ACTIVE);
    });
  });

  // =========================================================================
  // MODULE 3: COMPLETE LEARNER ARCHIVING & RETENTION POLICY GATE
  // =========================================================================
  describe('Module 3: Complete Learner Archiving, 12 Domains & Retention Policy Gate', () => {
    let archivedRecordId: string;

    it('3.1 deleting a student creates complete archive record with 7-year retention policy and expiry date', async () => {
      // Register a temporary student to test full archiving
      const registerRes = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-ARCH-99',
          firstName: 'Archive',
          lastName: 'Candidate',
          gradeLevel: 'PP1',
          gender: 'MALE',
          dateOfBirth: '2021-02-14',
          schoolId,
        });

      expect(registerRes.status).toBe(201);
      const tempStudentId = registerRes.body.data.id;

      // Delete student into archive
      const deleteRes = await request(app)
        .delete(`/api/v1/students/${tempStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Completed PP1 and moved' });

      expect(deleteRes.status).toBe(200);
      archivedRecordId = deleteRes.body.data.deletedStudentId;
      expect(archivedRecordId).toBeDefined();

      // Verify retention policy
      const archivedRecord = await container.deletedStudentRepository.findById(archivedRecordId);
      expect(archivedRecord).toBeDefined();
      expect(archivedRecord!.retentionPolicyYears).toBe(7);
      expect(archivedRecord!.retentionExpiresAt).toBeDefined();

      const retentionYear = new Date(archivedRecord!.retentionExpiresAt!).getFullYear();
      const currentYear = new Date().getFullYear();
      expect(retentionYear).toBe(currentYear + 7);
    });

    it('3.2 should generate completeness report across all 12 domains for archived student', async () => {
      const res = await request(app)
        .get(`/api/v1/students/deleted/${archivedRecordId}/completeness`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalDomains).toBe(12);
      expect(res.body.data.completenessScore).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.domainChecks)).toBe(true);
      expect(res.body.data.retentionPolicyYears).toBe(7);
    });

    it('3.3 should BLOCK permanent deletion before statutory retention period has expired', async () => {
      const purgeRes = await request(app)
        .post(`/api/v1/students/deleted/${archivedRecordId}/permanent-delete`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(purgeRes.status).toBe(400);
      expect(purgeRes.body.success).toBe(false);
      expect(purgeRes.body.message).toContain('retention period expires');

      // Record must still exist in deleted_students repository
      const record = await container.deletedStudentRepository.findById(archivedRecordId);
      expect(record).toBeDefined();
    });

    it('3.4 should safely restore archived student back to active database', async () => {
      const restoreRes = await request(app)
        .post(`/api/v1/students/deleted/${archivedRecordId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.success).toBe(true);

      // Student is now active in student repository
      const restored = await container.studentRepository.findByAdmissionNumber(
        'ADM-ARCH-99',
        schoolId
      );
      expect(restored).toBeDefined();
      expect(restored!.status).toBe(StudentStatus.ACTIVE);
    });
  });

  // =========================================================================
  // MODULE 4: ADMINISTRATOR PASSWORD RESET & FORCED PASSWORD CHANGE WORKFLOW
  // =========================================================================
  describe('Module 4: Admin Password Reset & Mandatory Forced Password Change', () => {
    let testUserToken: string;
    let temporaryPasswordGenerated: string;

    it('4.1 administrator resets user password, generating secure temporary credential and mustChangePassword=true', async () => {
      const res = await request(app)
        .post(`/api/v1/users/${PARENT_USER_ID}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // leave newPassword blank to auto-generate temporary credentials

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.temporaryPassword).toBeDefined();
      expect(res.body.mustChangePassword).toBe(true);

      temporaryPasswordGenerated = res.body.temporaryPassword;

      // Verify user entity in database has mustChangePassword=true
      const user = await container.userRepository.findById(PARENT_USER_ID);
      expect(user!.mustChangePassword).toBe(true);
    });

    it('4.2 user successfully logs in with temporary password and receives mustChangePassword=true in response', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'parent.multi@smartshule.ac.ke',
          password: temporaryPasswordGenerated,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.user.mustChangePassword).toBe(true);

      testUserToken = loginRes.body.data.accessToken || loginRes.body.data.token;
      expect(testUserToken).toBeDefined();
    });

    it('4.3 user CANNOT reuse the same temporary password when forced to change', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          newPassword: temporaryPasswordGenerated,
          confirmPassword: temporaryPasswordGenerated,
          // Notice: currentPassword is intentionally omitted because user is in forced-change mode
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('different from your temporary password');
    });

    it('4.4 user successfully changes password with strictly two fields (New and Confirm), clearing forced flag', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          newPassword: 'MyNewSecurePassword@2026',
          confirmPassword: 'MyNewSecurePassword@2026',
          // Strictly omitted currentPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify flag is cleared
      const updatedUser = await container.userRepository.findById(PARENT_USER_ID);
      expect(updatedUser!.mustChangePassword).toBe(false);

      // Verify login with new password works
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'parent.multi@smartshule.ac.ke',
          password: 'MyNewSecurePassword@2026',
        });

      expect(newLogin.status).toBe(200);
      expect(newLogin.body.data.user.mustChangePassword).toBe(false);
    });
  });
});
