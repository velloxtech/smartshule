import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { UserRole } from '../../src/core/domain/user/User';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Access Controls, 8 Role Accounts & Lesson Plan Approvals', () => {
  let app: any;
  let container: AppContainer;

  // Role tokens
  let superAdminToken: string;
  let adminToken: string;
  let headTeacherToken: string;
  let deputyToken: string;
  let admissionsToken: string;
  let bursarToken: string;
  let teacherToken: string;
  let parentToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    // Ensure all 8 test role accounts exist
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Super Admin
    const saLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@smartshule.ac.ke',
      password: 'SuperAdmin@123'
    });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.data.accessToken;
    expect(saLogin.body.data.user.role).toBe(UserRole.SUPER_ADMIN);

    // 2. Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartshule.ac.ke',
      password: 'Admin@123'
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // 3. Head Teacher
    const htLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'headteacher@smartshule.ac.ke',
      password: 'HeadTeacher@123'
    });
    expect(htLogin.status).toBe(200);
    headTeacherToken = htLogin.body.data.accessToken;
    expect(htLogin.body.data.user.role).toBe(UserRole.HEAD_TEACHER);

    // 4. Deputy Head Teacher
    const deputyLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'deputy@smartshule.ac.ke',
      password: 'Deputy@123'
    });
    expect(deputyLogin.status).toBe(200);
    deputyToken = deputyLogin.body.data.accessToken;
    expect(deputyLogin.body.data.user.role).toBe(UserRole.DEPUTY_HEAD_TEACHER);

    // 5. Admissions
    const admLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admissions@smartshule.ac.ke',
      password: 'Admissions@123'
    });
    expect(admLogin.status).toBe(200);
    admissionsToken = admLogin.body.data.accessToken;
    expect(admLogin.body.data.user.role).toBe(UserRole.ADMISSIONS);

    // 6. Bursar
    const bursarLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'bursar@smartshule.ac.ke',
      password: 'Bursar@123'
    });
    expect(bursarLogin.status).toBe(200);
    bursarToken = bursarLogin.body.data.accessToken;
    expect(bursarLogin.body.data.user.role).toBe(UserRole.BURSAR);

    // 7. Teacher
    const teacherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@smartshule.ac.ke',
      password: 'Teacher@123'
    });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;
    expect(teacherLogin.body.data.user.role).toBe(UserRole.TEACHER);

    // 8. Parent
    const parentLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'parent@smartshule.ac.ke',
      password: 'Parent@123'
    });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;
    expect(parentLogin.body.data.user.role).toBe(UserRole.PARENT);
  });

  // =================================================================
  // 1. QUICK LOGIN ALIASES FOR ALL 8 ROLES
  // =================================================================
  describe('1. Quick Login Aliases for All 8 Roles', () => {
    it('supports quick login with short handles', async () => {
      const handles = [
        { handle: 'superadmin', pass: 'SuperAdmin@123', expectedRole: UserRole.SUPER_ADMIN },
        { handle: 'admin', pass: 'Admin@123' },
        { handle: 'headteacher', pass: 'HeadTeacher@123', expectedRole: UserRole.HEAD_TEACHER },
        { handle: 'deputy', pass: 'Deputy@123', expectedRole: UserRole.DEPUTY_HEAD_TEACHER },
        { handle: 'admissions', pass: 'Admissions@123', expectedRole: UserRole.ADMISSIONS },
        { handle: 'bursar', pass: 'Bursar@123', expectedRole: UserRole.BURSAR },
        { handle: 'teacher', pass: 'Teacher@123', expectedRole: UserRole.TEACHER },
        { handle: 'parent', pass: 'Parent@123', expectedRole: UserRole.PARENT },
      ];

      for (const item of handles) {
        const res = await request(app).post('/api/v1/auth/login').send({
          email: item.handle,
          password: item.pass
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        if (item.expectedRole) {
          expect(res.body.data.user.role).toBe(item.expectedRole);
        }
      }
    });
  });

  // =================================================================
  // 2. TEACHER ONBOARDING ACCESS CONTROLS & NATIONAL ID PASSWORD
  // =================================================================
  describe('2. Teacher Onboarding Access Controls & Password as National ID', () => {
    const testTeacherNationalId = '32984712';
    const testTeacherEmail = 'new.teacher@smartshule.ac.ke';

    it('denies teacher onboarding from unauthorized roles (TEACHER, BURSAR, PARENT)', async () => {
      const unauthorizedTokens = [
        { role: 'TEACHER', token: teacherToken },
        { role: 'BURSAR', token: bursarToken },
        { role: 'PARENT', token: parentToken },
      ];

      for (const item of unauthorizedTokens) {
        const res = await request(app)
          .post('/api/v1/teachers')
          .set('Authorization', `Bearer ${item.token}`)
          .send({
            email: `denied.${item.role.toLowerCase()}@smartshule.ac.ke`,
            firstName: 'Unauthorized',
            lastName: 'Attempt',
            employeeNumber: `EMP-${item.role}`,
            schoolId: 'school-001',
            specialization: ['Mathematics'],
            nationalId: '12345678'
          });

        expect(res.status).toBe(403);
      }
    });

    it('allows Admissions to onboard a teacher with National ID set as password', async () => {
      const res = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${admissionsToken}`)
        .send({
          email: testTeacherEmail,
          firstName: 'Joseph',
          lastName: 'Mugo',
          phone: '+254711888999',
          employeeNumber: 'EMP-ONBOARD-01',
          tscNumber: 'TSC/998877',
          schoolId: 'school-001',
          specialization: ['Social Studies', 'CRE'],
          qualification: 'B.Ed (Arts)',
          nationalId: testTeacherNationalId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employeeNumber).toBe('EMP-ONBOARD-01');

      // Now verify the new teacher can log in USING THEIR NATIONAL ID as password!
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testTeacherEmail,
          password: testTeacherNationalId // National ID as password!
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.user.role).toBe(UserRole.TEACHER);
    });

    it('also allows Super Admin, Admin, and Head Teacher to onboard teachers', async () => {
      const authorizedRoles = [
        { role: 'SUPER_ADMIN', token: superAdminToken, emp: 'EMP-SA-01', email: 't.sa@smartshule.ac.ke', id: '11111111' },
        { role: 'ADMIN', token: adminToken, emp: 'EMP-ADM-01', email: 't.adm@smartshule.ac.ke', id: '22222222' },
        { role: 'HEAD_TEACHER', token: headTeacherToken, emp: 'EMP-HT-01', email: 't.ht@smartshule.ac.ke', id: '33333333' }
      ];

      for (const item of authorizedRoles) {
        const res = await request(app)
          .post('/api/v1/teachers')
          .set('Authorization', `Bearer ${item.token}`)
          .send({
            email: item.email,
            firstName: 'Faculty',
            lastName: item.role,
            employeeNumber: item.emp,
            schoolId: 'school-001',
            specialization: ['English'],
            nationalId: item.id
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
      }
    });
  });

  // =================================================================
  // 3. LESSON PLAN SUBMISSION & APPROVAL WORKFLOW
  // =================================================================
  describe('3. Lesson Plan Submission & Approval Workflow', () => {
    let lessonPlanId: string;

    it('allows a teacher to create a lesson plan with initial status DRAFT', async () => {
      const res = await request(app)
        .post('/api/v1/curriculum/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          teacherId: 'tch-default-01',
          learningAreaId: 'la-001',
          classRoomId: 'class-001',
          lessonDate: '2026-09-22',
          durationMinutes: 40,
          rollBoys: 18,
          rollGirls: 20,
          strand: 'Numbers',
          subStrand: 'Fractions and Decimals',
          specificLearningOutcomes: ['By the end of the lesson, the learner should be able to identify proper fractions.'],
          keyInquiryQuestions: ['What is the difference between a numerator and denominator?'],
          coreCompetenciesAddressed: ['CRITICAL_THINKING_AND_PROBLEM_SOLVING'],
          valuesAddressed: ['UNITY', 'RESPECT'],
          learningResources: ['Fraction charts', 'Textbooks'],
          steps: [
            {
              stepNumber: 1,
              stepTitle: 'Introduction',
              durationMinutes: 5,
              teacherActivities: 'Review whole numbers',
              learnerActivities: 'Answer questions'
            },
            {
              stepNumber: 2,
              stepTitle: 'Concept Development',
              durationMinutes: 25,
              teacherActivities: 'Demonstrate dividing an apple into 4 parts',
              learnerActivities: 'Work in pairs with cut-out shapes'
            },
            {
              stepNumber: 3,
              stepTitle: 'Conclusion',
              durationMinutes: 10,
              teacherActivities: 'Summarize key points',
              learnerActivities: 'Complete formative exercise'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('DRAFT');
      lessonPlanId = res.body.data.id;
    });

    it('allows a teacher to submit their lesson plan for review', async () => {
      const res = await request(app)
        .post(`/api/v1/curriculum/lesson-plans/${lessonPlanId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
    });

    it('denies approval from unauthorized roles (e.g. Bursar or Parent)', async () => {
      const deniedTokens = [bursarToken, parentToken];

      for (const token of deniedTokens) {
        const res = await request(app)
          .post(`/api/v1/curriculum/lesson-plans/${lessonPlanId}/review`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            approved: true,
            remarks: 'Illegal approval attempt'
          });

        expect(res.status).toBe(403);
      }
    });

    it('allows Deputy Head Teacher to approve the submitted lesson plan', async () => {
      const res = await request(app)
        .post(`/api/v1/curriculum/lesson-plans/${lessonPlanId}/review`)
        .set('Authorization', `Bearer ${deputyToken}`)
        .send({
          approved: true,
          remarks: 'Approved by Deputy Head Teacher. Excellent CBC learner-centered activities.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.reviewRemarks).toContain('Deputy Head Teacher');
    });

    it('allows Head Teacher to also review and reject/request revision with remarks', async () => {
      // Re-submit
      await request(app)
        .post(`/api/v1/curriculum/lesson-plans/${lessonPlanId}/submit`)
        .set('Authorization', `Bearer ${teacherToken}`);

      const res = await request(app)
        .post(`/api/v1/curriculum/lesson-plans/${lessonPlanId}/review`)
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({
          approved: false,
          remarks: 'Please add more formative assessment rubrics for step 2.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.reviewRemarks).toContain('formative assessment rubrics');
    });

    it('allows Super Admin and Admin to review lesson plans as well', async () => {
      // Super Admin approval
      const resSa = await request(app)
        .post(`/api/v1/curriculum/lesson-plans/${lessonPlanId}/review`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          approved: true,
          remarks: 'Super Admin executive approval.'
        });

      expect(resSa.status).toBe(200);
      expect(resSa.body.data.status).toBe('APPROVED');

      // Admin approval
      const resAdmin = await request(app)
        .post(`/api/v1/curriculum/lesson-plans/${lessonPlanId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: true,
          remarks: 'School Admin approval.'
        });

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.status).toBe('APPROVED');
    });
  });

  // =================================================================
  // 4. DEPARTMENTAL ACCESS ISOLATION (WHATSAPP & FINANCE)
  // =================================================================
  describe('4. Departmental Access Isolation', () => {
    it('allows Super Admin and Admin to access WhatsApp management endpoints', async () => {
      const resAdmin = await request(app)
        .get('/api/v1/whatsapp/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.success).toBe(true);

      const resSa = await request(app)
        .get('/api/v1/whatsapp/status')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(resSa.status).toBe(200);
    });

    it('denies WhatsApp management endpoints to non-admin roles (Teacher, Bursar, Deputy, Admissions, Parent)', async () => {
      const unauthorizedTokens = [
        { role: 'TEACHER', token: teacherToken },
        { role: 'BURSAR', token: bursarToken },
        { role: 'DEPUTY', token: deputyToken },
        { role: 'ADMISSIONS', token: admissionsToken },
        { role: 'PARENT', token: parentToken },
      ];

      for (const item of unauthorizedTokens) {
        const res = await request(app)
          .get('/api/v1/whatsapp/status')
          .set('Authorization', `Bearer ${item.token}`);

        expect(res.status).toBe(403);
      }
    });

    it('allows Bursar to access finance ledgers while denying non-financial roles', async () => {
      // Bursar can access cashflow ledger
      const resBursar = await request(app)
        .get('/api/v1/finance/cashflow-ledger')
        .set('Authorization', `Bearer ${bursarToken}`);

      expect(resBursar.status).toBe(200);

      // Teacher is denied access to finance cashflow ledger
      const resTeacher = await request(app)
        .get('/api/v1/finance/cashflow-ledger')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(resTeacher.status).toBe(403);

      // Parent is denied access to finance cashflow ledger
      const resParent = await request(app)
        .get('/api/v1/finance/cashflow-ledger')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(resParent.status).toBe(403);
    });

    it('returns academic context with auto-provisioned terms and session lifecycle notices', async () => {
      const res = await request(app)
        .get('/api/v1/academics/context')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentTerm).toBeDefined();
      expect(res.body.data.currentTerm.name).toContain('Term');
      expect(res.body.data.currentTerm.startDate).toBeDefined();
      expect(res.body.data.currentTerm.endDate).toBeDefined();
      expect(res.body.data.currentTerm.status).toBeDefined();
      expect(res.body.data.allTerms.length).toBeGreaterThanOrEqual(3);
    });

    it('allows Admin to update term dates and transition terms, while denying Teacher and Bursar', async () => {
      // Get context to find active term
      const ctxRes = await request(app)
        .get('/api/v1/academics/context')
        .set('Authorization', `Bearer ${adminToken}`);
      const termId = ctxRes.body.data.currentTerm.id;

      // Admin updates term dates
      const updateRes = await request(app)
        .put(`/api/v1/academics/terms/${termId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: '2026-08-25',
          endDate: '2026-10-24',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.startDate).toBe('2026-08-25');
      expect(updateRes.body.data.endDate).toBe('2026-10-24');

      // Teacher is denied updating term dates (403)
      const teacherRes = await request(app)
        .put(`/api/v1/academics/terms/${termId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          startDate: '2026-08-20',
          endDate: '2026-10-20',
        });
      expect(teacherRes.status).toBe(403);

      // Bursar is denied updating term dates (403)
      const bursarRes = await request(app)
        .put(`/api/v1/academics/terms/${termId}`)
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          startDate: '2026-08-20',
          endDate: '2026-10-20',
        });
      expect(bursarRes.status).toBe(403);

      // Head Teacher can activate another term
      const otherTerm = ctxRes.body.data.allTerms.find((t: any) => t.id !== termId);
      if (otherTerm) {
        const activateRes = await request(app)
          .post(`/api/v1/academics/terms/${otherTerm.id}/activate`)
          .set('Authorization', `Bearer ${headTeacherToken}`);
        expect(activateRes.status).toBe(200);
        expect(activateRes.body.data.isCurrent).toBe(true);

        // Switch back to original term
        await request(app)
          .post(`/api/v1/academics/terms/${termId}/activate`)
          .set('Authorization', `Bearer ${superAdminToken}`);
      }
    });
  });

  describe('5. User Management & Access Control', () => {
    let createdUserId: string;

    it('allows Super Admin and Admin to list users', async () => {
      const saRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(saRes.status).toBe(200);
      expect(Array.isArray(saRes.body.data)).toBe(true);

      const adminRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(Array.isArray(adminRes.body.data)).toBe(true);
    });

    it('denies user management listing to non-admin roles (Head Teacher, Deputy, Teacher, Parent, Bursar)', async () => {
      const htRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htRes.status).toBe(403);

      const deputyRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(deputyRes.status).toBe(403);

      const teacherRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(teacherRes.status).toBe(403);

      const parentRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(parentRes.status).toBe(403);
    });

    it('allows Admin to create, update, suspend, reset password, and delete a user account', async () => {
      // 1. Create
      const createRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test.staff@smartshule.ac.ke',
          password: 'StaffInitial@123',
          firstName: 'Brian',
          lastName: 'Oduor',
          role: UserRole.TEACHER,
          phone: '+254711223344'
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.email).toBe('test.staff@smartshule.ac.ke');
      createdUserId = createRes.body.data.id;

      // 2. Update
      const updateRes = await request(app)
        .put(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Brian Updated',
          phone: '+254799000111'
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.fullName).toBe('Brian Updated Oduor');

      // Verify Head Teacher and Deputy cannot alter user status (403 Forbidden)
      const htDenyStatus = await request(app)
        .patch(`/api/v1/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({ status: 'SUSPENDED' });
      expect(htDenyStatus.status).toBe(403);

      const deputyDenyStatus = await request(app)
        .patch(`/api/v1/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${deputyToken}`)
        .send({ status: 'SUSPENDED' });
      expect(deputyDenyStatus.status).toBe(403);

      // 3. Suspend via Admin
      const suspendRes = await request(app)
        .patch(`/api/v1/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe('SUSPENDED');

      // Suspended user cannot login
      const failedLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test.staff@smartshule.ac.ke',
          password: 'StaffInitial@123'
        });
      expect(failedLogin.status).toBe(401);

      // Reactivate via Super Admin
      const reactivateRes = await request(app)
        .patch(`/api/v1/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'ACTIVE' });
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.status).toBe('ACTIVE');

      // 4. Reset password
      const resetRes = await request(app)
        .post(`/api/v1/users/${createdUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewStaffPassword@456' });
      expect(resetRes.status).toBe(200);

      // Verify login with new password
      const successLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test.staff@smartshule.ac.ke',
          password: 'NewStaffPassword@456'
        });
      expect(successLogin.status).toBe(200);

      // 5. Delete
      const deleteRes = await request(app)
        .delete(`/api/v1/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(deleteRes.status).toBe(200);
    });

    it('allows an authenticated user to change their own password via /api/v1/auth/change-password', async () => {
      // Create a temporary user to test self-service password change
      const tempUserRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'pwdchange.test@smartshule.ac.ke',
          password: 'InitialPassword@123',
          firstName: 'Password',
          lastName: 'Tester',
          role: UserRole.TEACHER,
          phone: '+254700998877'
        });
      expect(tempUserRes.status).toBe(201);
      const tempUserId = tempUserRes.body.data.id;

      // Log in as the temporary user to get their token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'pwdchange.test@smartshule.ac.ke',
          password: 'InitialPassword@123'
        });
      expect(loginRes.status).toBe(200);
      const userToken = loginRes.body.data.accessToken;

      // Attempt to change password with WRONG current password -> expect 401
      const wrongPwdRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'WrongPassword@999',
          newPassword: 'MyNewSecretPassword@456'
        });
      expect(wrongPwdRes.status).toBe(401);

      // Successfully change password with CORRECT current password -> expect 200
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'InitialPassword@123',
          newPassword: 'MyNewSecretPassword@456'
        });
      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);

      // Verify that old password no longer works
      const oldLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'pwdchange.test@smartshule.ac.ke',
          password: 'InitialPassword@123'
        });
      expect(oldLoginRes.status).toBe(401);

      // Verify that new password works
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'pwdchange.test@smartshule.ac.ke',
          password: 'MyNewSecretPassword@456'
        });
      expect(newLoginRes.status).toBe(200);

      // Clean up test user
      await request(app)
        .delete(`/api/v1/users/${tempUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
    });
  });

  // =================================================================
  // 6. Strict Parent Data Isolation & Child Ownership Enforcement
  // =================================================================
  describe('6. Strict Parent Data Isolation & Child Ownership Enforcement', () => {
    const unlinkedStudentId = 'student-unlinked-999';

    beforeAll(async () => {
      // Register an unlinked student belonging to another family
      const unlinkedStudent = Student.create(
        {
          admissionNumber: 'ADM-2026-999',
          upiNumber: 'NEMIS-X9999Z',
          firstName: 'Brian',
          lastName: 'Oduor',
          dateOfBirth: '2013-08-10',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_7,
          streamId: 'stream-g7-east',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          guardianIds: ['guardian-other-999'],
          status: StudentStatus.ACTIVE
        },
        unlinkedStudentId
      );
      await container.studentRepository.save(unlinkedStudent);
    });

    it('returns only the parent’s own linked child when listing students via GET /students', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const studentIds = res.body.data.map((s: any) => s.id);
      expect(studentIds).toContain('student-001');
      expect(studentIds).not.toContain(unlinkedStudentId);
    });

    it('denies parent from accessing an unlinked student’s profile via GET /students/:id (403 Forbidden)', async () => {
      // Accessing linked child works
      const ownChildRes = await request(app)
        .get('/api/v1/students/student-001')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(ownChildRes.status).toBe(200);
      expect(ownChildRes.body.data.id).toBe('student-001');

      // Accessing unlinked student is blocked
      const unlinkedRes = await request(app)
        .get(`/api/v1/students/${unlinkedStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`);
      expect(unlinkedRes.status).toBe(403);
      expect(unlinkedRes.body.error.message).toMatch(/Access denied/i);
    });

    it('denies parent from viewing daily roll-call register via GET /attendance/daily (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/daily?date=2026-09-20&type=DAILY_MORNING')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('denies parent from accessing another learner’s attendance record via GET /attendance/student/:id (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/student/${unlinkedStudentId}?termId=term-2026-3&academicYearId=year-2026`)
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('denies parent from accessing school-wide CBC analytics via GET /CBC/analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/CBC/analytics?termId=term-2026-3&academicYearId=year-2026')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('denies parent from viewing an unlinked learner’s report card via GET /CBC/report-cards (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/CBC/report-cards?studentId=${unlinkedStudentId}&termId=term-2026-3&academicYearId=year-2026`)
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('denies parent from viewing another learner’s fee statement via GET /finance/statements/:id (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/statements/${unlinkedStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('denies parent from viewing another learner’s eDiary entries via GET /ediary/student/:id (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/ediary/student/${unlinkedStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('denies parent from viewing another learner’s progress photos via GET /media/progress-photos?studentId=:id (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/media/progress-photos?studentId=${unlinkedStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('denies parent from accessing fee defaulters report via GET /finance/defaulters (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/finance/defaulters')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('8. Head Teacher & Deputy Head Teacher Access Restrictions (Finance & Administration)', () => {
    it('denies HEAD_TEACHER and DEPUTY_HEAD_TEACHER from Finance module endpoints (403 Forbidden)', async () => {
      // 1. Defaulters
      const htDefaulters = await request(app)
        .get('/api/v1/finance/defaulters')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htDefaulters.status).toBe(403);

      const depDefaulters = await request(app)
        .get('/api/v1/finance/defaulters')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depDefaulters.status).toBe(403);

      // 2. Cash Flow Ledger
      const htCashflow = await request(app)
        .get('/api/v1/finance/cashflow-ledger')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htCashflow.status).toBe(403);

      const depCashflow = await request(app)
        .get('/api/v1/finance/cashflow-ledger')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depCashflow.status).toBe(403);

      // 3. Operating Expenses
      const htExpenses = await request(app)
        .get('/api/v1/finance/expenses')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htExpenses.status).toBe(403);

      const depExpenses = await request(app)
        .get('/api/v1/finance/expenses')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depExpenses.status).toBe(403);

      // 4. Other Income / Grants
      const htIncome = await request(app)
        .get('/api/v1/finance/income')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htIncome.status).toBe(403);

      const depIncome = await request(app)
        .get('/api/v1/finance/income')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depIncome.status).toBe(403);

      // 5. Arrears Summary
      const htArrears = await request(app)
        .get('/api/v1/finance/arrears/summary')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htArrears.status).toBe(403);

      const depArrears = await request(app)
        .get('/api/v1/finance/arrears/summary')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depArrears.status).toBe(403);

      // 6. Fee Structure Mutation
      const htFeeStruct = await request(app)
        .post('/api/v1/finance/structures')
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({ title: 'Test Structure', academicYearId: 'yr-1', termId: 'tm-1', gradeLevel: 'PP1', totalAmount: 10000 });
      expect(htFeeStruct.status).toBe(403);
    });

    it('denies HEAD_TEACHER and DEPUTY_HEAD_TEACHER from Administrative pages (User Mgmt, Archive Vault, System Logs)', async () => {
      // 1. User Management Listing
      const htUsers = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htUsers.status).toBe(403);

      const depUsers = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depUsers.status).toBe(403);

      // 2. Archived Accounts (Deleted Records Vault)
      const htArchive = await request(app)
        .get('/api/v1/students/deleted')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htArchive.status).toBe(403);

      const depArchive = await request(app)
        .get('/api/v1/students/deleted')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depArchive.status).toBe(403);

      // 3. System Logs
      const htLogs = await request(app)
        .get('/api/v1/system-logs')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htLogs.status).toBe(403);

      const depLogs = await request(app)
        .get('/api/v1/system-logs')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(depLogs.status).toBe(403);
    });

    it('allows ADMIN (Director) and SUPER_ADMIN to manage fee payment deadline banner, and forbids other roles', async () => {
      // 1. Initial GET
      const getRes = await request(app)
        .get('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.deadlineDate).toBeDefined();

      // 2. Admin (Director) updates banner
      const updateRes = await request(app)
        .put('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deadlineDate: '2026-11-20',
          bannerTitle: 'Term 3 Final Fee Clearance Directive',
          customMessage: 'Please clear all arrears prior to KPSEA assessment.',
          paybillNumber: '522533',
          bankName: 'KCB Bank',
          bankAccountNumber: '987654321',
          isEnabled: true,
          showOnlyToDefaulters: true
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.deadlineDate).toBe('2026-11-20');
      expect(updateRes.body.data.bannerTitle).toBe('Term 3 Final Fee Clearance Directive');
      expect(updateRes.body.data.customMessage).toBe('Please clear all arrears prior to KPSEA assessment.');

      // 3. Super Admin can also update banner
      const saUpdate = await request(app)
        .put('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          deadlineDate: '2026-11-30',
          bannerTitle: 'Official School Fee Notice'
        });
      expect(saUpdate.status).toBe(200);
      expect(saUpdate.body.success).toBe(true);
      expect(saUpdate.body.data.deadlineDate).toBe('2026-11-30');

      // 4. Forbidden roles get 403 on PUT
      const htForbidden = await request(app)
        .put('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({ deadlineDate: '2026-12-01' });
      expect(htForbidden.status).toBe(403);

      const depForbidden = await request(app)
        .put('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${deputyToken}`)
        .send({ deadlineDate: '2026-12-01' });
      expect(depForbidden.status).toBe(403);

      const teacherForbidden = await request(app)
        .put('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ deadlineDate: '2026-12-01' });
      expect(teacherForbidden.status).toBe(403);

      const bursarForbidden = await request(app)
        .put('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({ deadlineDate: '2026-12-01' });
      expect(bursarForbidden.status).toBe(403);

      const parentForbidden = await request(app)
        .put('/api/v1/finance/fee-banner')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ deadlineDate: '2026-12-01' });
      expect(parentForbidden.status).toBe(403);
    });

    it('restricts Fully Sponsored Students page and API endpoints to ADMIN (Director) and SUPER_ADMIN only', async () => {
      // Find an active student for sponsorship
      const allStudents = await container.studentRepository.findAll();
      expect(allStudents.length).toBeGreaterThan(0);
      const student = allStudents[0];

      // 1. Forbidden roles cannot access GET /api/v1/sponsorships
      for (const token of [headTeacherToken, deputyToken, teacherToken, bursarToken, parentToken]) {
        const getRes = await request(app)
          .get('/api/v1/sponsorships')
          .set('Authorization', `Bearer ${token}`);
        expect(getRes.status).toBe(403);
      }

      // 2. Forbidden roles cannot POST /api/v1/sponsorships
      for (const token of [headTeacherToken, deputyToken, teacherToken, bursarToken, parentToken]) {
        const postRes = await request(app)
          .post('/api/v1/sponsorships')
          .set('Authorization', `Bearer ${token}`)
          .send({
            studentId: student.id,
            sponsorshipType: 'DIRECTOR_BENEVOLENCE',
            sponsorName: 'Director Outreach Fund',
            startDate: '2026-01-05',
            reasonNotes: 'Needy learner sponsorship'
          });
        expect(postRes.status).toBe(403);
      }

      // 3. Admin (Director) creates sponsorship
      const createRes = await request(app)
        .post('/api/v1/sponsorships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student.id,
          sponsorshipType: 'DIRECTOR_BENEVOLENCE',
          sponsorName: "School Director's Benevolence Fund",
          sponsorContact: '+254700112233',
          coverage: {
            tuitionCovered: true,
            lunchCovered: true,
            materialsCovered: true,
            uniformCovered: false,
            activitiesCovered: true,
            percentageCovered: 100
          },
          termlySubsidyAmount: 18000,
          annualSubsidyAmount: 54000,
          startDate: '2026-01-05',
          reasonNotes: 'Full tuition and lunch sponsored under Director Benevolent Trust.',
          confidentialNotes: 'Assessed during Q1 community outreach.'
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.studentId).toBe(student.id);
      expect(createRes.body.data.approvalReference).toBeDefined();
      const sponsorshipId = createRes.body.data.id;

      // 4. Admin (Director) lists sponsorships
      const listRes = await request(app)
        .get('/api/v1/sponsorships')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThan(0);

      // 5. Admin retrieves stats
      const statsRes = await request(app)
        .get('/api/v1/sponsorships/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.totalSponsoredStudents).toBeGreaterThan(0);
      expect(statsRes.body.data.lunchCoveredCount).toBeGreaterThan(0);

      // 6. Super Admin can update sponsorship status
      const statusRes = await request(app)
        .patch(`/api/v1/sponsorships/${sponsorshipId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'SUSPENDED', confidentialRemark: 'Pending mid-term review' });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.sponsorshipStatus).toBe('SUSPENDED');

      // 7. Admin restores status to ACTIVE
      const reactivateRes = await request(app)
        .patch(`/api/v1/sponsorships/${sponsorshipId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE', confidentialRemark: 'Review passed' });
      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.sponsorshipStatus).toBe('ACTIVE');

      // 8. Unauthorized delete rejected
      const htDel = await request(app)
        .delete(`/api/v1/sponsorships/${sponsorshipId}`)
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htDel.status).toBe(403);

      // 9. Admin delete succeeds
      const adminDel = await request(app)
        .delete(`/api/v1/sponsorships/${sponsorshipId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminDel.status).toBe(200);
      expect(adminDel.body.success).toBe(true);
    });

    it('strictly enforces that sponsored students are Charge-Exempt and cannot be charged (blocked from invoicing, arrears, and payments)', async () => {
      const allStudents = await container.studentRepository.findAll();
      const student = allStudents[0];

      // Enroll student in sponsorship program
      const enrollRes = await request(app)
        .post('/api/v1/sponsorships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student.id,
          sponsorshipType: 'DIRECTOR_BENEVOLENCE',
          sponsorName: 'Equity Wings to Fly Foundation',
          sponsorContact: '+254700998877',
          coverage: {
            tuitionCovered: true,
            lunchCovered: true,
            materialsCovered: true,
            uniformCovered: false,
            activitiesCovered: true,
            percentageCovered: 100
          },
          startDate: '2026-01-05',
          reasonNotes: '100% full institutional scholarship'
        });
      expect(enrollRes.status).toBe(201);
      const sponsorshipId = enrollRes.body.data.id;

      // 1. Invoicing a sponsored student is blocked (returns 409 Conflict)
      const invoiceRes = await request(app)
        .post('/api/v1/finance/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          academicYearId: 'ay-2026',
          termId: 'term-1',
          studentId: student.id
        });
      expect(invoiceRes.status).toBe(409);
      expect(invoiceRes.body.message).toMatch(/Scholarship|exempt|sponsored/i);

      // 2. Charging manual arrears is blocked (returns 409 Conflict)
      const arrearsRes = await request(app)
        .post('/api/v1/finance/arrears')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student.id,
          amount: 5000,
          reason: 'Arrears carryover test'
        });
      expect(arrearsRes.status).toBe(409);
      expect(arrearsRes.body.message).toMatch(/sponsored|exempt/i);

      // 3. Fee statement returns CHARGE_EXEMPT status and 0 balance
      const statementRes = await request(app)
        .get(`/api/v1/finance/statements/${student.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statementRes.status).toBe(200);
      expect(statementRes.body.data.summary.status).toBe('CHARGE_EXEMPT');
      expect(statementRes.body.data.summary.currentBalance).toBe(0);

      // 4. Defaulters report excludes this student
      const defaultersRes = await request(app)
        .get('/api/v1/finance/defaulters')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(defaultersRes.status).toBe(200);
      const defaultersList = defaultersRes.body.data?.defaulters || [];
      const foundInDefaulters = defaultersList.some((d: any) => d.studentId === student.id || d.id === student.id);
      expect(foundInDefaulters).toBe(false);

      // Clean up sponsorship
      await request(app)
        .delete(`/api/v1/sponsorships/${sponsorshipId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  describe('9. Fee Payment Receipt Generation, Multi-Channel Issuance & Re-issuance', () => {
    let recordedPaymentId: string;
    let generatedReceiptNumber: string;

    it('generates an official receipt and dispatches to parent via Email & WhatsApp upon recording payment', async () => {
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: 'inv-student-001',
          amount: 5000,
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA998877AA',
          mpesaPhoneNumber: '+254759496975',
          notes: 'Term 1 partial fee payment test'
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.data).toBeDefined();

      const { payment, receipt, delivery } = payRes.body.data;
      expect(payment).toBeDefined();
      expect(payment.receiptNumber).toMatch(/^REC-\d{4}-\d+/);
      recordedPaymentId = payment.id;
      generatedReceiptNumber = payment.receiptNumber;

      // Verify generated receipt payload
      expect(receipt).toBeDefined();
      expect(receipt.receiptNumber).toBe(generatedReceiptNumber);
      expect(receipt.amountPaid).toBe(5000);
      expect(receipt.studentName).toContain('Kevin');
      expect(receipt.admissionNumber).toBe('ADM-2026-001');
      expect(receipt.schoolName).toBe('Grace Seeds School');

      // Verify multi-channel delivery attempt
      expect(delivery).toBeDefined();
      expect(delivery.email).toBeDefined();
      expect(delivery.whatsApp).toBeDefined();
      expect(delivery.sms).toBeDefined();
    });

    it('retrieves the full receipt details via GET /api/v1/finance/payments/:id/receipt', async () => {
      const receiptRes = await request(app)
        .get(`/api/v1/finance/payments/${recordedPaymentId}/receipt`)
        .set('Authorization', `Bearer ${bursarToken}`);

      expect(receiptRes.status).toBe(200);
      expect(receiptRes.body.success).toBe(true);
      expect(receiptRes.body.data).toBeDefined();
      const receiptData = receiptRes.body.data.receipt || receiptRes.body.data;
      expect(receiptData.receiptNumber).toBe(generatedReceiptNumber);
      expect(receiptData.amountPaid).toBe(5000);
      expect(receiptData.transactionReference).toBe('MPESA998877AA');
    });

    it('allows re-issuing a receipt to parents via POST /api/v1/finance/payments/:id/issue-receipt', async () => {
      const reissueRes = await request(app)
        .post(`/api/v1/finance/payments/${recordedPaymentId}/issue-receipt`)
        .set('Authorization', `Bearer ${bursarToken}`);

      expect(reissueRes.status).toBe(200);
      expect(reissueRes.body.success).toBe(true);
      expect(reissueRes.body.data.receipt.receiptNumber).toBe(generatedReceiptNumber);
      expect(reissueRes.body.data.delivery).toBeDefined();
    });

    it('denies non-financial unauthorized roles from re-issuing or managing payment receipts', async () => {
      const htRes = await request(app)
        .post(`/api/v1/finance/payments/${recordedPaymentId}/issue-receipt`)
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(htRes.status).toBe(403);

      const teacherRes = await request(app)
        .post(`/api/v1/finance/payments/${recordedPaymentId}/issue-receipt`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(teacherRes.status).toBe(403);
    });
  });
});


