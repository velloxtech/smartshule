import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Teacher & Staff Onboarding and Profile Management Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // Login as Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });

    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;

    // Login as Teacher
    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sarah.mwangi@smartshule.ac.ke', password: 'Teacher@123' });

    expect(teacherLoginRes.status).toBe(200);
    teacherToken = teacherLoginRes.body.data.accessToken;
  });

  it('allows onboarding staff with ADMISSIONS role and without a compulsory TSC number', async () => {
    const res = await request(app)
      .post('/api/v1/teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'admissions.officer@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'Grace',
        lastName: 'Achieng',
        phone: '+254712345678',
        schoolId: 'school-001',
        role: 'ADMISSIONS',
        employeeNumber: 'EMP-ADM-001',
        qualification: 'B.A. Public Administration'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMISSIONS');
    expect(res.body.data.employeeNumber).toBe('EMP-ADM-001');
    expect(res.body.data.tscNumber).toBeUndefined();
  });

  it('allows onboarding a teacher without a TSC number (TSC pending/not issued)', async () => {
    const res = await request(app)
      .post('/api/v1/teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new.teacher@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'Daniel',
        lastName: 'Kipruto',
        phone: '+254722334455',
        schoolId: 'school-001',
        employeeNumber: 'EMP-TCH-999',
        specialization: ['Mathematics'],
        qualification: 'B.Ed (Science)'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('TEACHER');
    expect(res.body.data.tscNumber).toBeUndefined();
  });

  it('allows authenticated teacher to update their own profile via PUT /api/v1/teachers/me/profile', async () => {
    const res = await request(app)
      .put('/api/v1/teachers/me/profile')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        firstName: 'Sarah',
        lastName: 'Mwangi-Ochieng',
        phone: '+254700998877',
        tscNumber: 'TSC/778899',
        qualification: 'Masters in Education (M.Ed)',
        specialization: ['English Language', 'Literature in English']
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.lastName).toBe('Mwangi-Ochieng');
    expect(res.body.data.user.phone).toBe('+254700998877');
    expect(res.body.data.tscNumber).toBe('TSC/778899');
    expect(res.body.data.qualification).toBe('Masters in Education (M.Ed)');
    expect(res.body.data.specialization).toContain('Literature in English');
  });

  it('allows administrator to update teacher details via PUT /api/v1/teachers/:id', async () => {
    // Get existing teachers
    const listRes = await request(app)
      .get('/api/v1/teachers')
      .set('Authorization', `Bearer ${adminToken}`);

    const teacher = listRes.body.data[0];
    expect(teacher).toBeDefined();

    const updateRes = await request(app)
      .put(`/api/v1/teachers/${teacher.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        qualification: 'Doctor of Philosophy in Education (Ph.D)',
        phone: '+254711122233'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.qualification).toBe('Doctor of Philosophy in Education (Ph.D)');
    expect(updateRes.body.data.user.phone).toBe('+254711122233');
  });

  it('does NOT provide parent dual-role to teachers without an admitted child in the school', async () => {
    // 1. Teacher Sarah Mwangi has no children admitted in the school
    const profileRes = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.role).toBe('TEACHER');
    expect(profileRes.body.data.hasEnrolledChildren).toBe(false);
    expect(profileRes.body.data.enrolledChildIds).toEqual([]);

    // 2. Querying guardian portal data returns zero children for this teacher
    const guardianMeRes = await request(app)
      .get('/api/v1/students/guardian/me')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(guardianMeRes.status).toBe(200);
    expect(guardianMeRes.body.data.children).toHaveLength(0);
  });

  it('ONLY provides parent dual-role to teachers whom the system has recognized have a child admitted in the school', async () => {
    // 1. Onboard a teacher who will also have an admitted child
    const newTeacherRes = await request(app)
      .post('/api/v1/teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'teacher.parent@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'Beatrice',
        lastName: 'Wanjiku',
        phone: '+254744111222',
        schoolId: 'school-001',
        employeeNumber: 'EMP-TCH-088',
        tscNumber: 'TSC/889900',
        specialization: ['Science', 'Agriculture']
      });

    expect(newTeacherRes.status).toBe(201);

    // Login as Beatrice before any child is admitted
    const loginBeforeRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher.parent@smartshule.ac.ke', password: 'Password@123' });

    expect(loginBeforeRes.status).toBe(200);
    expect(loginBeforeRes.body.data.user.hasEnrolledChildren).toBe(false);
    expect(loginBeforeRes.body.data.user.enrolledChildIds).toEqual([]);

    // 2. Now admit a learner whose parent/guardian is Beatrice Wanjiku (matching phone +254744111222 / email)
    const admitRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Samuel',
        lastName: 'Kariuki',
        dateOfBirth: '2016-04-12',
        gender: 'MALE',
        gradeLevel: 'GRADE_3',
        schoolId: 'school-001',
        guardian: {
          firstName: 'Beatrice',
          lastName: 'Wanjiku',
          phone: '+254744111222',
          emergencyContact: '+254744111222',
          email: 'teacher.parent@smartshule.ac.ke',
          nationalId: '30112233',
          relationship: 'MOTHER'
        }
      });

    expect(admitRes.status).toBe(201);
    const admittedStudentId = admitRes.body.data.id;
    expect(admittedStudentId).toBeDefined();

    // 3. Login as Beatrice now that her child is admitted in the school
    const loginAfterRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher.parent@smartshule.ac.ke', password: 'Password@123' });

    expect(loginAfterRes.status).toBe(200);
    expect(loginAfterRes.body.data.user.role).toBe('TEACHER');
    expect(loginAfterRes.body.data.user.hasEnrolledChildren).toBe(true);
    expect(loginAfterRes.body.data.user.enrolledChildIds).toContain(admittedStudentId);

    // Profile check
    const profileAfterRes = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${loginAfterRes.body.data.accessToken}`);

    expect(profileAfterRes.status).toBe(200);
    expect(profileAfterRes.body.data.hasEnrolledChildren).toBe(true);
    expect(profileAfterRes.body.data.enrolledChildIds).toContain(admittedStudentId);

    // Guardian portal data check
    const guardianDataRes = await request(app)
      .get('/api/v1/students/guardian/me')
      .set('Authorization', `Bearer ${loginAfterRes.body.data.accessToken}`);

    expect(guardianDataRes.status).toBe(200);
    expect(guardianDataRes.body.data.children).toHaveLength(1);
    expect(guardianDataRes.body.data.children[0].id).toBe(admittedStudentId);
  });
});
