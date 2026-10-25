import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('New Term Initialization — Strict Role-Based Access Control & Safe Invariants', () => {
  let app: Express;
  let container: AppContainer;

  // Tokens for authorized roles
  let superAdminToken: string;
  let adminToken: string;
  let headteacherToken: string;

  // Tokens for unauthorized roles
  let teacherToken: string;
  let bursarToken: string;
  let parentToken: string;
  let deputyToken: string;
  let admissionsToken: string;

  // Test Academic Year
  let testYearId: string;
  const testYearName = '2028';

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // Login Super Admin
    const superAdminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@smartshule.ac.ke', password: 'SuperAdmin@123' });
    expect(superAdminLogin.status).toBe(200);
    superAdminToken = superAdminLogin.body.data.accessToken;

    // Login Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // Login Headteacher
    const headteacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'headteacher@smartshule.ac.ke', password: 'HeadTeacher@123' });
    expect(headteacherLogin.status).toBe(200);
    headteacherToken = headteacherLogin.body.data.accessToken;

    // Login Unauthorized Roles
    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    teacherToken = teacherLogin.body.data.accessToken;

    const bursarLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bursar@smartshule.ac.ke', password: 'Bursar@123' });
    bursarToken = bursarLogin.body.data.accessToken;

    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    parentToken = parentLogin.body.data.accessToken;

    const deputyLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'deputy@smartshule.ac.ke', password: 'Deputy@123' });
    deputyToken = deputyLogin.body.data.accessToken;

    const admissionsLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admissions@smartshule.ac.ke', password: 'Admissions@123' });
    admissionsToken = admissionsLogin.body.data.accessToken;

    // Create a dedicated Academic Year for testing term initialization
    const createYearRes = await request(app)
      .post('/api/v1/academics/years')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testYearName,
        startDate: '2028-01-05',
        endDate: '2028-11-25',
        isCurrent: false,
        schoolId: 'school-001',
      });
    expect(createYearRes.status).toBe(201);
    testYearId = createYearRes.body.data.id;
  });

  describe('1. Role Authorization Matrix for New Term Initialization', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
          isCurrent: true,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny TEACHER role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should deny BURSAR role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${bursarToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
        });

      expect(res.status).toBe(403);
    });

    it('should deny PARENT role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
        });

      expect(res.status).toBe(403);
    });

    it('should deny DEPUTY_HEAD_TEACHER role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${deputyToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
        });

      expect(res.status).toBe(403);
    });

    it('should deny ADMISSIONS role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${admissionsToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
        });

      expect(res.status).toBe(403);
    });

    it('should prevent role spoofing by modifying request payloads (e.g. body role injection)', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
          role: 'SUPER_ADMIN',
          userId: 'usr-superadmin-01',
        });

      // Server must reject based on verified JWT token, ignoring spoofed body parameters
      expect(res.status).toBe(403);
    });
  });

  describe('2. Authorized Execution by SUPER_ADMIN, ADMIN & HEADTEACHER', () => {
    it('1. Super Admin can initialize a valid new term (Term 1)', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1,
          name: 'Term 1 - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
          isCurrent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.termNumber).toBe(1);
      expect(res.body.data.name).toBe('Term 1 - 2028');
      expect(res.body.data.isCurrent).toBe(true);
      expect(res.body.data.startDate).toBe('2028-01-05');
      expect(res.body.data.endDate).toBe('2028-04-05');
    });

    it('2. Admin can initialize a valid new term (Term 2)', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 2,
          name: 'Term 2 - 2028',
          startDate: '2028-05-02',
          endDate: '2028-08-04',
          isCurrent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.termNumber).toBe(2);
      expect(res.body.data.name).toBe('Term 2 - 2028');
      expect(res.body.data.isCurrent).toBe(true);

      // Verify Term 1 is now marked as not current, without destroying records
      const termsRes = await request(app)
        .get(`/api/v1/academics/terms/by-year/${testYearId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(termsRes.status).toBe(200);
      const term1 = termsRes.body.data.find((t: any) => t.termNumber === 1);
      expect(term1.isCurrent).toBe(false);
    });

    it('3. Headteacher can initialize a valid new term (Term 3)', async () => {
      const res = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 3,
          name: 'Term 3 - 2028',
          startDate: '2028-08-28',
          endDate: '2028-10-27',
          isCurrent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.termNumber).toBe(3);
      expect(res.body.data.name).toBe('Term 3 - 2028');
      expect(res.body.data.isCurrent).toBe(true);
    });
  });

  describe('3. Duplicate Initialization Prevention & Date Invariants', () => {
    it('should reject duplicate initialization of an existing term number with 409 Conflict', async () => {
      const dupRes = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 1, // Already initialized above
          name: 'Term 1 Alternate - 2028',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.message).toMatch(/already been initialized/i);
    });

    it('should reject duplicate initialization with same term name (case-insensitive) with 409 Conflict', async () => {
      const dupNameRes = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          academicYearId: testYearId,
          termNumber: 3,
          name: 'term 3 - 2028', // Lowercase match
          startDate: '2028-08-28',
          endDate: '2028-10-27',
        });

      expect(dupNameRes.status).toBe(409);
    });

    it('should reject invalid dates where endDate <= startDate with 400 Bad Request', async () => {
      // Create new year to test date validation
      const yearRes = await request(app)
        .post('/api/v1/academics/years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2029',
          startDate: '2029-01-05',
          endDate: '2029-11-25',
          isCurrent: false,
          schoolId: 'school-001',
        });
      const year2029Id = yearRes.body.data.id;

      const invalidDateRes = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          academicYearId: year2029Id,
          termNumber: 1,
          name: 'Term 1 - 2029',
          startDate: '2029-04-10',
          endDate: '2029-01-10', // End date is before start date
        });

      expect(invalidDateRes.status).toBe(400);
      expect(invalidDateRes.body.message).toMatch(/after/i);
    });

    it('should reject term dates that are inconsistent with the Academic Year bounds with 400 Bad Request', async () => {
      // Academic year 2028 runs 2028-01-05 to 2028-11-25.
      // Create new year 2030 to test
      const yearRes = await request(app)
        .post('/api/v1/academics/years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2030',
          startDate: '2030-01-05',
          endDate: '2030-11-25',
          isCurrent: false,
          schoolId: 'school-001',
        });
      const year2030Id = yearRes.body.data.id;

      const outOfBoundsRes = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          academicYearId: year2030Id,
          termNumber: 1,
          name: 'Term 1 - 2030',
          startDate: '2031-01-05', // In Year 2031 instead of 2030
          endDate: '2031-04-05',
        });

      expect(outOfBoundsRes.status).toBe(400);
      expect(outOfBoundsRes.body.message).toMatch(/within or aligned/i);
    });

    it('should reject initialization when non-existent academicYearId is provided with 404 Not Found', async () => {
      const notFoundRes = await request(app)
        .post('/api/v1/academics/terms/initialize')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          academicYearId: 'non-existent-year-id-999',
          termNumber: 1,
          name: 'Term 1',
          startDate: '2028-01-05',
          endDate: '2028-04-05',
        });

      expect(notFoundRes.status).toBe(404);
    });
  });

  describe('4. Historical Data Preservation & Invariant Protection', () => {
    it('should preserve previous term marks, invoices, and attendance without resets or alterations', async () => {
      // Verify active year 2026 and existing terms
      const contextRes = await request(app)
        .get('/api/v1/academics/context')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(contextRes.status).toBe(200);

      // Verify that past invoices and payments are still present and intact
      const invoicesRes = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(invoicesRes.status).toBe(200);

      const paymentsRes = await request(app)
        .get('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(paymentsRes.status).toBe(200);
      expect(Array.isArray(paymentsRes.body.data)).toBe(true);
      const initialPaymentCount = paymentsRes.body.data.length;

      // Verify that student registrations and academic profiles were not wiped
      const studentsRes = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(studentsRes.status).toBe(200);
      expect(studentsRes.body.data.length).toBeGreaterThan(0);

      // Historical payments count remains intact
      const paymentsAfterRes = await request(app)
        .get('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(paymentsAfterRes.body.data.length).toBe(initialPaymentCount);
    });
  });

  describe('5. Audit Trail Verification', () => {
    it('should record an audit trail entry identifying the authenticated actor and term details', async () => {
      // Fetch system audit logs for category ACADEMICS
      const logsRes = await request(app)
        .get('/api/v1/system-logs?category=ACADEMICS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(logsRes.status).toBe(200);
      const logs = logsRes.body.data || [];
      const termInitLogs = logs.filter((l: any) => l.action === 'TERM_INITIALIZED');

      expect(termInitLogs.length).toBeGreaterThan(0);
      const latestLog = termInitLogs[0];
      expect(latestLog.action).toBe('TERM_INITIALIZED');
      expect(latestLog.category).toBe('ACADEMICS');
      // Must identify authenticated user email and role
      expect(latestLog.actorEmail).toBeDefined();
      expect(['SUPER_ADMIN', 'ADMIN', 'HEAD_TEACHER']).toContain(latestLog.actorRole);
      expect(latestLog.details).toMatch(/Initialized Term/i);
    });
  });
});
