import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('System Logs & Audit Trail Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;

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

    // 2. Teacher login
    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;

    // 3. Parent login
    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;
  });

  describe('1. Access Control & Admin Isolation', () => {
    it('rejects unauthenticated request to /api/v1/system-logs with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/system-logs');
      expect(res.status).toBe(401);
    });

    it('rejects TEACHER role from accessing /api/v1/system-logs with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects PARENT role from accessing /api/v1/system-logs with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects PARENT from downloading system logs CSV with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs/download')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(res.status).toBe(403);
    });

    it('allows ADMIN to access /api/v1/system-logs with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('2. Automatic System Auditing in Workflows', () => {
    it('records a USER_LOGIN audit event upon successful authentication', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs?action=USER_LOGIN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const loginLog = res.body.data.find((l: any) => l.action === 'USER_LOGIN');
      expect(loginLog).toBeDefined();
      expect(loginLog.category).toBe('AUTH');
      expect(loginLog.status).toBe('SUCCESS');
    });

    it('records a LOGIN_FAILED audit event upon failed authentication attempt', async () => {
      // Trigger a failed login
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'intruder@unknown.com', password: 'WrongPassword999' });

      // Verify log was captured
      const res = await request(app)
        .get('/api/v1/system-logs?action=LOGIN_FAILED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const failLog = res.body.data.find((l: any) => l.action === 'LOGIN_FAILED');
      expect(failLog).toBeDefined();
      expect(failLog.category).toBe('AUTH');
      expect(failLog.level).toBe('WARN');
      expect(failLog.status).toBe('FAILED');
      expect(failLog.actorEmail).toBe('intruder@unknown.com');
    });

    it('records a STUDENT_ADMITTED audit event when learner is registered', async () => {
      const studentRes = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-AUDIT-001',
          firstName: 'Audit',
          lastName: 'Learner',
          dateOfBirth: '2015-05-15',
          gender: 'FEMALE',
          gradeLevel: 'GRADE_1'
        });
      expect(studentRes.status).toBe(201);

      // Verify audit log
      const res = await request(app)
        .get('/api/v1/system-logs?action=STUDENT_ADMITTED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const admitLog = res.body.data.find((l: any) => l.action === 'STUDENT_ADMITTED');
      expect(admitLog).toBeDefined();
      expect(admitLog.category).toBe('STUDENTS');
      expect(admitLog.level).toBe('AUDIT');
      expect(admitLog.status).toBe('SUCCESS');
      expect(admitLog.details).toContain('ADM-AUDIT-001');
    });

    it('records a PAYMENT_RECORDED audit event when fee is paid', async () => {
      const paymentRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: 'inv-student-001',
          amount: 2500,
          paymentMethod: 'CASH',
          transactionReference: 'TXN-AUDIT-999',
          recordedByUserId: 'usr-admin-01',
          notes: 'Guardian Audit payment'
        });
      expect(paymentRes.status).toBe(201);

      // Verify audit log
      const res = await request(app)
        .get('/api/v1/system-logs?action=PAYMENT_RECORDED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const payLog = res.body.data.find((l: any) => l.action === 'PAYMENT_RECORDED');
      expect(payLog).toBeDefined();
      expect(payLog.category).toBe('FINANCE');
      expect(payLog.level).toBe('AUDIT');
      expect(payLog.details).toContain('2500');
    });

    it('records a MARKS_UPLOADED audit event when teacher uploads summative marks', async () => {
      const marksRes = await request(app)
        .post('/api/v1/cbc/summative')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: 'student-001',
          teacherId: 'teacher-001',
          learningAreaId: 'la-science-7',
          termId: 'term-2026-1',
          academicYearId: 'year-2026',
          strandScores: [
            {
              strandId: 'strand-scie-01',
              performanceLevel: 'EE',
              rawScore: 92,
              maxScore: 100
            }
          ],
          overallPerformanceLevel: 'EE',
          teacherRemarks: 'Excellent performance in scientific enquiry.',
          evaluationDate: '2026-03-25'
        });
      expect(marksRes.status).toBe(201);

      // Verify audit log in ACADEMICS category
      const res = await request(app)
        .get('/api/v1/system-logs?category=ACADEMICS&action=MARKS_UPLOADED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const markLog = res.body.data.find((l: any) => l.action === 'MARKS_UPLOADED' && l.metadata?.studentId === 'student-001');
      expect(markLog).toBeDefined();
      expect(markLog.category).toBe('ACADEMICS');
      expect(markLog.level).toBe('AUDIT');
      expect(markLog.status).toBe('SUCCESS');
      expect(markLog.details).toContain('student-001');
      expect(markLog.details).toContain('EE');
      expect(markLog.details).toContain('92/100');
    });

    it('records a MARKS_UPLOADED audit event when teacher records formative assessment marks', async () => {
      const formativeRes = await request(app)
        .post('/api/v1/cbc/formative')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: 'student-001',
          teacherId: 'teacher-001',
          learningAreaId: 'la-science-7',
          subStrandId: 'substrand-scie-01',
          termId: 'term-2026-1',
          academicYearId: 'year-2026',
          assessmentDate: '2026-03-26',
          assessmentMethod: 'OBSERVATION',
          performanceLevel: 'ME',
          specificOutcomeTested: 'Observing cellular structure under microscope',
          teacherRemarks: 'Successfully prepared and focused slides.',
          targetedCompetencies: ['CRITICAL_THINKING_AND_PROBLEM_SOLVING'],
          valuesObserved: ['RESPECT']
        });
      expect(formativeRes.status).toBe(201);

      // Verify audit log in ACADEMICS category
      const res = await request(app)
        .get('/api/v1/system-logs?category=ACADEMICS&search=microscope')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const formLog = res.body.data[0];
      expect(formLog.category).toBe('ACADEMICS');
      expect(formLog.status).toBe('SUCCESS');
      expect(formLog.details).toContain('Observing cellular structure under microscope');
    });
  });

  describe('3. Filtering & Search', () => {
    it('filters logs by category=AUTH', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs?category=AUTH')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const log of res.body.data) {
        expect(log.category).toBe('AUTH');
      }
    });

    it('filters logs by category=ACADEMICS', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs?category=ACADEMICS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const log of res.body.data) {
        expect(log.category).toBe('ACADEMICS');
      }
    });

    it('filters logs by category=FINANCE', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs?category=FINANCE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const log of res.body.data) {
        expect(log.category).toBe('FINANCE');
      }
    });

    it('filters logs by level=WARN', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs?level=WARN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      for (const log of res.body.data) {
        expect(log.level).toBe('WARN');
      }
    });

    it('searches logs by text query', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs?search=intruder')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].details).toContain('intruder');
    });
  });

  describe('4. Statistics Summary', () => {
    it('returns aggregated audit statistics for dashboard KPIs', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(res.body.data.byCategory).toBeDefined();
      expect(res.body.data.byLevel).toBeDefined();
      expect(res.body.data.byStatus).toBeDefined();
    });
  });

  describe('5. CSV Export & Download', () => {
    it('downloads logs as a CSV attachment with proper headers', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs/download')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('.csv');

      // Validate CSV content
      const csvText = res.text;
      expect(csvText).toContain('Log ID');
      expect(csvText).toContain('Timestamp (UTC)');
      expect(csvText).toContain('Level');
      expect(csvText).toContain('Category');
      expect(csvText).toContain('Action');
      expect(csvText).toContain('USER_LOGIN');
    });

    it('downloads filtered CSV logs', async () => {
      const res = await request(app)
        .get('/api/v1/system-logs/download?category=FINANCE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toContain('FINANCE');
      expect(res.text).not.toContain('USER_LOGIN');
    });
  });
});
