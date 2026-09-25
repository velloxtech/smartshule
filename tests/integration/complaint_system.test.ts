import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { UserRole } from '../../src/core/domain/user/User';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Complaint System Backend Integration Tests', () => {
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
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Super Admin
    const saLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@smartshule.ac.ke',
      password: 'SuperAdmin@123'
    });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.data.accessToken;

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

    // 7. Teacher
    const teacherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@smartshule.ac.ke',
      password: 'Teacher@123'
    });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;

    // 8. Parent
    const parentLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'parent@smartshule.ac.ke',
      password: 'Parent@123'
    });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;
  });

  // =================================================================
  // 1. STRICT ACCESS CONTROL (Headteacher, Admin, Super_admin Only)
  // =================================================================
  describe('1. Role-Based Access Control Restrictions', () => {
    it('allows Headteacher to access complaints endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('allows Admin to access complaints endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('allows Super Admin to access complaints endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('denies Deputy Head Teacher with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${deputyToken}`);

      expect(res.status).toBe(403);
    });

    it('denies Teacher with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it('denies Parent with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('denies Bursar with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${bursarToken}`);

      expect(res.status).toBe(403);
    });

    it('denies Admissions officer with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${admissionsToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/complaints');
      expect(res.status).toBe(401);
    });

    it('rejects invalid token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', 'Bearer invalid-token-xyz');
      expect(res.status).toBe(401);
    });
  });

  // =================================================================
  // 2. COMPLAINT LIFECYCLE & OPERATIONS
  // =================================================================
  describe('2. Complaint Creation, Lifecycle, and Resolution', () => {
    let createdComplaintId: string;

    it('allows Headteacher to create a new complaint', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({
          title: 'Damaged Laboratory Microscope',
          description: 'Microscope lens in Science Lab 2 is broken.',
          category: 'FACILITY',
          priority: 'HIGH',
          complainantName: 'Mr. Omondi',
          complainantRole: 'TEACHER',
          complainantPhone: '+254712000333',
          complainantEmail: 'omondi@smartshule.ac.ke'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('Damaged Laboratory Microscope');
      expect(res.body.data.status).toBe('OPEN');
      expect(res.body.data.priority).toBe('HIGH');
      expect(res.body.data.category).toBe('FACILITY');

      createdComplaintId = res.body.data.id;
    });

    it('retrieves the complaint by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdComplaintId);
      expect(res.body.data.title).toBe('Damaged Laboratory Microscope');
    });

    it('updates complaint details', async () => {
      const res = await request(app)
        .put(`/api/v1/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Damaged Laboratory Microscope (Lab 2)',
          priority: 'URGENT'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Damaged Laboratory Microscope (Lab 2)');
      expect(res.body.data.priority).toBe('URGENT');
    });

    it('assigns the complaint to a staff member and moves status to IN_REVIEW', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${createdComplaintId}/assign`)
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({
          assignedToUserId: 'usr-admin-01'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedToUserId).toBe('usr-admin-01');
      expect(res.body.data.status).toBe('IN_REVIEW');
    });

    it('updates status to INVESTIGATING with notes', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${createdComplaintId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'INVESTIGATING',
          notes: 'Lab technician inspected the microscope; replacement lens ordered.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INVESTIGATING');
      expect(res.body.data.resolutionNotes).toContain('replacement lens ordered');
    });

    it('resolves the complaint with resolution notes and captures resolvedBy', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${createdComplaintId}/resolve`)
        .set('Authorization', `Bearer ${headTeacherToken}`)
        .send({
          resolutionNotes: 'Replacement lens installed and tested by Science Dept Head.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(res.body.data.resolutionNotes).toBe(
        'Replacement lens installed and tested by Science Dept Head.'
      );
      expect(res.body.data.resolvedByUserId).toBeDefined();
      expect(res.body.data.resolvedAt).toBeDefined();
    });

    it('allows Admin to create and dismiss another complaint', async () => {
      const createRes = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Incorrect Uniform Color',
          description: 'Student reported wrong sweater color for Grade 5.',
          category: 'DISCIPLINE',
          priority: 'LOW',
          complainantName: 'Anonymous',
          complainantRole: 'ANONYMOUS'
        });

      expect(createRes.status).toBe(201);
      const dismissId = createRes.body.data.id;

      const dismissRes = await request(app)
        .post(`/api/v1/complaints/${dismissId}/dismiss`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          reason: 'Sweater color conforms with the revised 2026 uniform guidelines.'
        });

      expect(dismissRes.status).toBe(200);
      expect(dismissRes.body.success).toBe(true);
      expect(dismissRes.body.data.status).toBe('DISMISSED');
      expect(dismissRes.body.data.resolutionNotes).toContain('2026 uniform guidelines');
    });

    it('filters complaints by status, category, and priority', async () => {
      const resResolved = await request(app)
        .get('/api/v1/complaints?status=RESOLVED')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(resResolved.status).toBe(200);
      expect(resResolved.body.data.every((c: any) => c.status === 'RESOLVED')).toBe(true);

      const resFacility = await request(app)
        .get('/api/v1/complaints?category=FACILITY')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(resFacility.status).toBe(200);
      expect(resFacility.body.data.every((c: any) => c.category === 'FACILITY')).toBe(true);
    });

    it('searches complaints by text keyword', async () => {
      const res = await request(app)
        .get('/api/v1/complaints?search=microscope')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title).toContain('Microscope');
    });

    it('returns statistics summary for complaints dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/complaints/stats/summary')
        .set('Authorization', `Bearer ${headTeacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data.resolved).toBeGreaterThanOrEqual(1);
      expect(res.body.data.dismissed).toBeGreaterThanOrEqual(1);
      expect(res.body.data.byCategory).toBeDefined();
      expect(res.body.data.byPriority).toBeDefined();
    });

    it('deletes complaint and verifies subsequent lookup returns 404', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/v1/complaints/${createdComplaintId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
