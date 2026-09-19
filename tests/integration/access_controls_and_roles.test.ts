import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { UserRole } from '../../src/core/domain/user/User';
import { setupTestFixtures } from '../helpers/testFixtures';

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
    // Ensure all 8 default role accounts exist
    await container.ensureRoleAccounts();
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
});


