import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Strict Multi-Tenant Parent Data Isolation', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let parentToken: string;
  let unlinkedParentToken: string;

  let testStudentId: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // 2. Parent login (linked to student-001 by testFixtures)
    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;

    // 3. Register a second parent (not linked to student-001)
    const unlinkedParentReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'unlinked.parent@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'Beatrice',
        lastName: 'Otieno',
        role: 'PARENT',
        phone: '+254711889900'
      });
    expect(unlinkedParentReg.status).toBe(201);
    unlinkedParentToken = unlinkedParentReg.body.data.accessToken;

    // 4. Enroll another student not linked to the first parent
    const studentRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-ISOLATION-999',
        firstName: 'Brian',
        lastName: 'Kiprono',
        dateOfBirth: '2012-05-15',
        gender: 'MALE',
        gradeLevel: 'GRADE_6',
        schoolId: 'school-001',
        guardian: {
          firstName: 'Beatrice',
          lastName: 'Otieno',
          phone: '+254711889900',
          emergencyContact: '+254711889900',
          relationship: 'MOTHER'
        }
      });
    expect(studentRes.status).toBe(201);
    testStudentId = studentRes.body.data.id;
  });

  describe('1. Student Entity Isolation', () => {
    it('GET /api/v1/students returns only linked children for parent and not all students', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Parent should only see their child (student-001) and NOT Brian Kiprono (testStudentId)
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toContain('student-001');
      expect(ids).not.toContain(testStudentId);
    });

    it('GET /api/v1/students/:id rejects access to an unlinked child with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/v1/students/${testStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Access denied/i);
    });

    it('GET /api/v1/students/:id allows parent to view their own linked child', async () => {
      const res = await request(app)
        .get('/api/v1/students/student-001')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('student-001');
    });
  });

  describe('2. Finance & Invoices Isolation', () => {
    it('GET /api/v1/finance/invoices returns only invoices for linked children', async () => {
      const res = await request(app)
        .get('/api/v1/finance/invoices')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // All returned invoices must belong to student-001
      for (const inv of res.body.data) {
        expect(inv.studentId).toBe('student-001');
      }
    });

    it('GET /api/v1/finance/summary returns parent view scoped strictly to their children', async () => {
      const res = await request(app)
        .get('/api/v1/finance/summary')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isParentView).toBe(true);
      expect(res.body.data.childrenCount).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/finance/defaulters blocks parent with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/finance/defaulters')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Analytics & Attendance Isolation', () => {
    it('GET /api/v1/analytics/dashboard blocks parent with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/attendance/daily blocks parent with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/daily?streamId=stream-001&date=2026-03-01')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/attendance/student/:studentId rejects access to unlinked child with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/student/${testStudentId}?termId=term-001&academicYearId=year-001`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('4. Library & Concerns Scoping', () => {
    it('GET /api/v1/library/stats blocks parent with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/library/stats')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/concerns returns only concerns created by the parent', async () => {
      // 1. Submit a concern as parent
      const createRes = await request(app)
        .post('/api/v1/concerns')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          title: 'Transport pickup delay inquiry',
          description: 'The bus was 20 minutes late today at the junction pickup point.',
          category: 'TRANSPORT',
          priority: 'MEDIUM'
        });
      expect(createRes.status).toBe(201);

      // 2. Fetch concerns as this parent
      const listRes = await request(app)
        .get('/api/v1/concerns')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      expect(listRes.body.data[0].title).toBe('Transport pickup delay inquiry');

      // 3. Fetch concerns as unlinked parent (should not see the first parent's concern)
      const unlinkedListRes = await request(app)
        .get('/api/v1/concerns')
        .set('Authorization', `Bearer ${unlinkedParentToken}`);

      expect(unlinkedListRes.status).toBe(200);
      const otherTitles = unlinkedListRes.body.data.map((c: any) => c.title);
      expect(otherTitles).not.toContain('Transport pickup delay inquiry');
    });
  });
});
