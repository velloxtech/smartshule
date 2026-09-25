import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { UserRole } from '../../src/core/domain/user/User';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('SmartShule Security Hardening & Vulnerability Remediation Integration Tests', () => {
  let app: any;
  let container: AppContainer;

  let superAdminToken: string;
  let superAdminId: string;
  let adminToken: string;
  let headTeacherToken: string;
  let deputyToken: string;
  let admissionsToken: string;
  let bursarToken: string;
  let teacher1Token: string;
  let teacher2Token: string;
  let parentToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Super Admin
    const saLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@smartshule.ac.ke',
      password: 'SuperAdmin@123'
    });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.data.accessToken;
    superAdminId = saLogin.body.data.user.id;

    // 2. Regular Admin (non-superadmin)
    const { User, UserStatus } = await import('../../src/core/domain/user/User');
    const regularAdminHash = await container.passwordHasher.hash('Admin@123');
    const regularAdmin = User.create(
      {
        email: 'regular.admin@smartshule.ac.ke',
        passwordHash: regularAdminHash,
        firstName: 'Regular',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        phone: '+254711888999',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-regular-admin-01'
    );
    await container.userRepository.save(regularAdmin);

    const regularAdminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'regular.admin@smartshule.ac.ke',
      password: 'Admin@123'
    });
    expect(regularAdminLogin.status).toBe(200);
    adminToken = regularAdminLogin.body.data.accessToken;

    // Secondary Super Admin for deletion/modification security tests
    const secSuperAdmin = User.create(
      {
        email: 'sec.superadmin@smartshule.ac.ke',
        passwordHash: regularAdminHash,
        firstName: 'Second',
        lastName: 'Super',
        role: UserRole.SUPER_ADMIN,
        phone: '+254711777888',
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-sec-superadmin-01'
    );
    await container.userRepository.save(secSuperAdmin);

    // 3. Head Teacher
    const htLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'headteacher@smartshule.ac.ke',
      password: 'HeadTeacher@123'
    });
    expect(htLogin.status).toBe(200);
    headTeacherToken = htLogin.body.data.accessToken;

    // 4. Deputy Head Teacher
    const deputyLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'deputy@smartshule.ac.ke',
      password: 'Deputy@123'
    });
    expect(deputyLogin.status).toBe(200);
    deputyToken = deputyLogin.body.data.accessToken;

    // 5. Admissions
    const admLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admissions@smartshule.ac.ke',
      password: 'Admissions@123'
    });
    expect(admLogin.status).toBe(200);
    admissionsToken = admLogin.body.data.accessToken;

    // 6. Bursar
    const bursarLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'bursar@smartshule.ac.ke',
      password: 'Bursar@123'
    });
    expect(bursarLogin.status).toBe(200);
    bursarToken = bursarLogin.body.data.accessToken;

    // 7. Teacher 1 (Sarah)
    const t1Login = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@smartshule.ac.ke',
      password: 'Teacher@123'
    });
    expect(t1Login.status).toBe(200);
    teacher1Token = t1Login.body.data.accessToken;

    // 8. Teacher 2 (John Ochieng)
    const t2Login = await request(app).post('/api/v1/auth/login').send({
      email: 'john.ochieng@smartshule.ac.ke',
      password: 'Teacher@123'
    });
    expect(t2Login.status).toBe(200);
    teacher2Token = t2Login.body.data.accessToken;

    // 9. Parent
    const parentLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'parent@smartshule.ac.ke',
      password: 'Parent@123'
    });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;
  });

  // =================================================================
  // 1. SELF-REGISTRATION PRIVILEGE ESCALATION PREVENTION
  // =================================================================
  describe('1. Self-Registration Privilege Escalation Prevention', () => {
    it('blocks self-registration with SUPER_ADMIN role (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'hacker-superadmin@evil.com',
          password: 'Password@123',
          firstName: 'Evil',
          lastName: 'SuperAdmin',
          role: UserRole.SUPER_ADMIN
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Self-registration is not allowed for privileged/i);
    });

    it('blocks self-registration with ADMIN role (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'hacker-admin@evil.com',
          password: 'Password@123',
          firstName: 'Evil',
          lastName: 'Admin',
          role: UserRole.ADMIN
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Self-registration is not allowed for privileged/i);
    });

    it('blocks self-registration with HEAD_TEACHER role (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'hacker-ht@evil.com',
          password: 'Password@123',
          firstName: 'Evil',
          lastName: 'HeadTeacher',
          role: UserRole.HEAD_TEACHER
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks self-registration with BURSAR role (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'hacker-bursar@evil.com',
          password: 'Password@123',
          firstName: 'Evil',
          lastName: 'Bursar',
          role: UserRole.BURSAR
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows valid self-registration for non-privileged TEACHER role (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'legit.teacher@smartshule.ac.ke',
          password: 'Password@123',
          firstName: 'Legit',
          lastName: 'Teacher',
          role: UserRole.TEACHER
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.TEACHER);
    });
  });

  // =================================================================
  // 2. USER MANAGEMENT PRIVILEGE ESCALATION & SUPER ADMIN PROTECTIONS
  // =================================================================
  describe('2. User Management Privilege Escalation & Super Admin Protections', () => {
    it('denies non-superadmin (ADMIN) from creating a SUPER_ADMIN account (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'second-superadmin@smartshule.ac.ke',
          password: 'Password@123',
          firstName: 'Rogue',
          lastName: 'SuperAdmin',
          role: UserRole.SUPER_ADMIN
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only Super Administrators can create accounts with the SUPER_ADMIN role/i);
    });

    it('denies non-superadmin (ADMIN) from deleting a SUPER_ADMIN account (403 Forbidden)', async () => {
      const res = await request(app)
        .delete('/api/v1/users/usr-sec-superadmin-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only Super Administrators can delete Super Admin accounts/i);
    });

    it('denies non-superadmin (ADMIN) from modifying a SUPER_ADMIN account (403 Forbidden)', async () => {
      const res = await request(app)
        .put('/api/v1/users/usr-sec-superadmin-01')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Tampered'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only Super Administrators can modify Super Admin accounts/i);
    });

    it('denies non-superadmin (ADMIN) from suspending a SUPER_ADMIN account (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/usr-sec-superadmin-01/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only Super Administrators can change the status of Super Admin accounts/i);
    });

    it('prevents even SUPER_ADMIN from deleting the root primary superadmin account (403 Forbidden)', async () => {
      // Authenticate as another super admin (admin@smartshule.ac.ke) to attempt deleting root superadmin (superAdminId = usr-superadmin-01)
      const otherSaLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@smartshule.ac.ke',
        password: 'Admin@123'
      });
      expect(otherSaLogin.status).toBe(200);
      const otherSaToken = otherSaLogin.body.data.accessToken;

      const res = await request(app)
        .delete(`/api/v1/users/${superAdminId}`)
        .set('Authorization', `Bearer ${otherSaToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/default root Super Administrator account cannot be deleted/i);
    });
  });

  // =================================================================
  // 3. BRUTE-FORCE PASSWORD RESET CODE VERIFICATION RATE LIMITING
  // =================================================================
  describe('3. Password Reset Verification Brute-Force Rate Limiting', () => {
    it('invalidates reset token after 5 failed verification attempts to defeat brute-forcing', async () => {
      // 1. Request reset code
      const reqRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'teacher@smartshule.ac.ke'
        });

      expect(reqRes.status).toBe(200);
      const validCode = reqRes.body.debugCode;
      expect(validCode).toBeDefined();

      // 2. Submit 4 wrong verification attempts
      for (let attempt = 1; attempt <= 4; attempt++) {
        const failRes = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({
            email: 'teacher@smartshule.ac.ke',
            resetCode: `00000${attempt}`,
            newPassword: 'NewSecurePassword@123'
          });

        expect(failRes.status).toBe(401);
        expect(failRes.body.message).toMatch(/Invalid verification code/i);
      }

      // 3. 5th failed attempt triggers brute-force lockdown
      const fifthRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'teacher@smartshule.ac.ke',
          resetCode: '000005',
          newPassword: 'NewSecurePassword@123'
        });

      expect(fifthRes.status).toBe(401);
      expect(fifthRes.body.message).toMatch(/Too many failed verification attempts.*invalidated/i);

      // 4. Now, attempting with the actual validCode must fail because token was wiped
      const poisonedRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'teacher@smartshule.ac.ke',
          resetCode: validCode,
          newPassword: 'NewSecurePassword@123'
        });

      expect(poisonedRes.status).toBe(401);
    });
  });

  // =================================================================
  // 4. IDOR PROTECTION ON RECORDS OF WORK
  // =================================================================
  describe('4. Record of Work Ownership & IDOR Protection', () => {
    let recordId: string;

    it('allows Teacher 1 to create their own record of work', async () => {
      const res = await request(app)
        .post('/api/v1/curriculum/records-of-work')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          subjectAndGrade: 'Science Grade 7 East',
          strandAndWorkCovered: 'Living Things & Cell Structure microscopy lab',
          date: '2026-09-25'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      recordId = res.body.data.id;
      expect(recordId).toBeDefined();
    });

    it('denies Teacher 2 from modifying Teacher 1’s record of work (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/v1/curriculum/records-of-work/${recordId}`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .send({
          subjectAndGrade: 'Science Grade 7 East - Tampered',
          strandAndWorkCovered: 'Tampered content'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You can only update your own records of work/i);
    });

    it('denies Teacher 2 from deleting Teacher 1’s record of work (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/curriculum/records-of-work/${recordId}`)
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/You can only delete your own records of work/i);
    });

    it('allows Teacher 1 to update their own record of work (200 OK)', async () => {
      const res = await request(app)
        .put(`/api/v1/curriculum/records-of-work/${recordId}`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          subjectAndGrade: 'Science Grade 7 East',
          strandAndWorkCovered: 'Living Things & Cell Structure microscopy lab - Updated'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.strandAndWorkCovered).toContain('Updated');
    });

    it('allows Teacher 1 to delete their own record of work (200 OK)', async () => {
      const res = await request(app)
        .delete(`/api/v1/curriculum/records-of-work/${recordId}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =================================================================
  // 5. IDOR PROTECTION ON SCHEMES OF WORK & LESSON PLANS
  // =================================================================
  describe('5. Schemes of Work & Lesson Plans IDOR Protection', () => {
    let schemeId: string;
    let lessonPlanId: string;

    it('creates a scheme of work under Teacher 1 and denies Teacher 2 deletion (403)', async () => {
      // Create scheme as Teacher 1
      const createRes = await request(app)
        .post('/api/v1/curriculum/schemes')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          teacherId: 'usr-teacher-01',
          learningAreaId: 'la-science-7',
          classRoomId: 'class-grade-7',
          academicYearId: 'year-2026',
          termId: 'term-2026-1',
          title: 'Teacher 1 Botany Scheme'
        });

      expect(createRes.status).toBe(201);
      schemeId = createRes.body.data.id;

      // Teacher 2 attempts deletion
      const delRes = await request(app)
        .delete(`/api/v1/curriculum/schemes/${schemeId}`)
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(delRes.status).toBe(403);
      expect(delRes.body.message).toMatch(/You can only delete your own schemes of work/i);

      // Teacher 1 successfully deletes own scheme
      const t1DelRes = await request(app)
        .delete(`/api/v1/curriculum/schemes/${schemeId}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(t1DelRes.status).toBe(200);
    });

    it('creates a lesson plan under Teacher 1 and denies Teacher 2 deletion (403)', async () => {
      // Create lesson plan as Teacher 1
      const createRes = await request(app)
        .post('/api/v1/curriculum/lesson-plans')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          teacherId: 'usr-teacher-01',
          learningAreaId: 'la-science-7',
          classRoomId: 'class-grade-7',
          lessonDate: '2026-09-26',
          durationMinutes: 40,
          strand: 'Living Things',
          subStrand: 'Plant Cells',
          specificLearningOutcomes: ['Identify plant organelles'],
          keyInquiryQuestions: ['What differentiates plant cells?'],
          coreCompetenciesAddressed: ['CRITICAL_THINKING_AND_PROBLEM_SOLVING'],
          valuesAddressed: ['INTEGRITY'],
          learningResources: ['Wall chart'],
          steps: [
            {
              stepNumber: 1,
              stepTitle: 'Introduction',
              durationMinutes: 10,
              teacherActivities: 'Display diagrams',
              learnerActivities: 'Name organelles'
            }
          ]
        });

      expect(createRes.status).toBe(201);
      lessonPlanId = createRes.body.data.id;

      // Teacher 2 attempts deletion
      const delRes = await request(app)
        .delete(`/api/v1/curriculum/lesson-plans/${lessonPlanId}`)
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(delRes.status).toBe(403);
      expect(delRes.body.message).toMatch(/You can only delete your own lesson plans/i);

      // Teacher 1 successfully deletes own lesson plan
      const t1DelRes = await request(app)
        .delete(`/api/v1/curriculum/lesson-plans/${lessonPlanId}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(t1DelRes.status).toBe(200);
    });
  });

  // =================================================================
  // 6. IDOR PROTECTION ON FORMATIVE ASSESSMENTS & eDIARY
  // =================================================================
  describe('6. Formative Assessment & eDiary IDOR Protection', () => {
    let formativeId: string;
    let ediaryId: string;

    it('denies Teacher 2 from deleting Teacher 1’s formative assessment (403 Forbidden)', async () => {
      const createRes = await request(app)
        .post('/api/v1/cbc/formative')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          studentId: 'student-001',
          teacherId: 'usr-teacher-01',
          learningAreaId: 'la-science-7',
          subStrandId: 'substrand-scie-01',
          termId: 'term-2026-1',
          academicYearId: 'year-2026',
          assessmentDate: '2026-09-25',
          assessmentMethod: 'PRACTICAL_WORK',
          performanceLevel: 'EE',
          specificOutcomeTested: 'Mounting onion epidermis cell slide safely'
        });

      expect(createRes.status).toBe(201);
      formativeId = createRes.body.data.id;

      // Teacher 2 attempts deletion
      const delRes = await request(app)
        .delete(`/api/v1/cbc/formative/${formativeId}`)
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(delRes.status).toBe(403);
      expect(delRes.body.message).toMatch(/You can only delete your own formative assessments/i);

      // Teacher 1 can delete it
      const t1DelRes = await request(app)
        .delete(`/api/v1/cbc/formative/${formativeId}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(t1DelRes.status).toBe(200);
    });

    it('denies Teacher 2 from deleting Teacher 1’s eDiary entry (403 Forbidden)', async () => {
      const createRes = await request(app)
        .post('/api/v1/ediary')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .send({
          schoolId: 'school-001',
          streamId: 'stream-g7-east',
          date: '2026-09-25',
          title: 'Science Homework',
          homework: 'Draw and label parts of animal cell in workbooks'
        });

      expect(createRes.status).toBe(201);
      ediaryId = createRes.body.data.id;

      // Teacher 2 attempts deletion
      const delRes = await request(app)
        .delete(`/api/v1/ediary/${ediaryId}`)
        .set('Authorization', `Bearer ${teacher2Token}`);

      expect(delRes.status).toBe(403);
      expect(delRes.body.message).toMatch(/You can only delete your own eDiary entries/i);

      // Teacher 1 can delete it
      const t1DelRes = await request(app)
        .delete(`/api/v1/ediary/${ediaryId}`)
        .set('Authorization', `Bearer ${teacher1Token}`);

      expect(t1DelRes.status).toBe(200);
    });
  });

  // =================================================================
  // 7. COMPLAINT SYSTEM ROLE RESTRICTIONS
  // =================================================================
  describe('7. Complaint System Role Restrictions (Headteacher & Admins Only)', () => {
    it('rejects unauthenticated requests (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/complaints');
      expect(res.status).toBe(401);
    });

    it('rejects TEACHER access to complaints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${teacher1Token}`);
      expect(res.status).toBe(403);
    });

    it('rejects PARENT access to complaints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects BURSAR access to complaints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${bursarToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects DEPUTY_HEAD_TEACHER access to complaints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${deputyToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects ADMISSIONS access to complaints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${admissionsToken}`);
      expect(res.status).toBe(403);
    });

    it('grants HEAD_TEACHER access to complaints (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${headTeacherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('grants ADMIN access to complaints (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('grants SUPER_ADMIN access to complaints (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
