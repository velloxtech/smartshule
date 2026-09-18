import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('SmartShule Hexagonal API Integration Tests', () => {
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

  describe('1. Health and API Meta', () => {
    it('GET /health returns status UP', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('GET /api returns overview', async () => {
      const res = await request(app).get('/api');
      expect(res.status).toBe(200);
      expect(res.body.documentation.modules.length).toBeGreaterThan(0);
    });
  });

  describe('2. Authentication & Profile', () => {
    it('GET /api/v1/auth/profile returns user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@smartshule.ac.ke');
      expect(res.body.data.role).toBe('SUPER_ADMIN');
    });

    it('POST /api/v1/auth/login with bad password returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@smartshule.ac.ke', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Academic Structure', () => {
    it('GET /api/v1/academics/school returns school profile', async () => {
      const res = await request(app)
        .get('/api/v1/academics/school')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(['Grace Seeds School', 'Grace Seeds School']).toContain(res.body.data.name);
      expect(res.body.data.centerCode).toBe('CBA-041289');
    });

    it('GET /api/v1/academics/classes returns classes', async () => {
      const res = await request(app)
        .get('/api/v1/academics/classes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].gradeLevel).toBe('GRADE_7');
    });

    it('GET /api/v1/academics/learning-areas returns learning areas', async () => {
      const res = await request(app)
        .get('/api/v1/academics/learning-areas')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((a: any) => a.code === 'SCIE7')).toBe(true);
    });
  });

  describe('4. Students and Guardians', () => {
    it('GET /api/v1/students returns enrolled students', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.data[0].admissionNumber).toBe('ADM-2026-001');
    });

    it('POST /api/v1/students registers a new student with guardian', async () => {
      const res = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-2026-099',
          upiNumber: 'NEMIS-X9999',
          firstName: 'Brian',
          lastName: 'Otieno',
          dateOfBirth: '2013-08-20',
          gender: 'MALE',
          gradeLevel: 'GRADE_7',
          streamId: 'stream-g7-east',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          guardian: {
            firstName: 'Grace',
            lastName: 'Otieno',
            email: 'grace.otieno@test.com',
            phone: '+254711223344',
            relationship: 'MOTHER',
            emergencyContact: '+254711223344'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.admissionNumber).toBe('ADM-2026-099');
    });
  });

  describe('5. Teachers & Timetables', () => {
    it('GET /api/v1/teachers lists teachers', async () => {
      const res = await request(app)
        .get('/api/v1/teachers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it('GET /api/v1/timetables/stream returns stream schedule', async () => {
      const res = await request(app)
        .get('/api/v1/timetables/stream?streamId=stream-g7-east&termId=term-2026-1')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.slots.length).toBeGreaterThan(0);
    });
  });

  describe('6. CBC Assessments & Report Cards', () => {
    it('POST /api/v1/cbc/formative records continuous assessment', async () => {
      const res = await request(app)
        .post('/api/v1/cbc/formative')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: 'student-001',
          teacherId: 'teacher-001',
          learningAreaId: 'la-science-7',
          subStrandId: 'substrand-scie-01',
          termId: 'term-2026-1',
          academicYearId: 'year-2026',
          assessmentDate: '2026-02-15',
          assessmentMethod: 'PROJECT',
          performanceLevel: 'ME',
          specificOutcomeTested: 'Constructing a simple periscope model',
          teacherRemarks: 'Good attempt, demonstrated understanding of reflection of light.',
          targetedCompetencies: ['CRITICAL_THINKING_AND_PROBLEM_SOLVING'],
          valuesObserved: ['INTEGRITY']
        });

      expect(res.status).toBe(201);
      expect(res.body.data.performanceLevel).toBe('ME');
      expect(res.body.data.performanceScore).toBe(3);
    });

    it('POST /api/v1/cbc/report-cards/generate compiles CBC Report Card', async () => {
      const res = await request(app)
        .post('/api/v1/cbc/report-cards/generate')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: 'student-001',
          termId: 'term-2026-1',
          academicYearId: 'year-2026',
          classTeacherRemarks: 'Kevin is an exemplary learner with exceptional practical skills.',
          headTeacherRemarks: 'Outstanding term performance. Keep up the high standard.',
          closingDate: '2026-04-03',
          nextTermOpeningDate: '2026-04-28'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.studentId).toBe('student-001');
      expect(res.body.data.overallPerformanceLevel).toBeDefined();
      expect(res.body.data.coreCompetencyAssessments.length).toBe(7);
      expect(res.body.data.valueAssessments.length).toBe(7);
    });

    it('GET /api/v1/cbc/analytics calculates proficiency distribution', async () => {
      const res = await request(app)
        .get('/api/v1/cbc/analytics?termId=term-2026-1&academicYearId=year-2026')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.distribution).toBeDefined();
    });
  });

  describe('7. Schemes of Work & Lesson Plans', () => {
    it('GET /api/v1/curriculum/schemes returns schemes of work', async () => {
      const res = await request(app)
        .get('/api/v1/curriculum/schemes')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.data[0].status).toBe('APPROVED');
    });

    it('GET /api/v1/curriculum/lesson-plans returns lesson plans', async () => {
      const res = await request(app)
        .get('/api/v1/curriculum/lesson-plans')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
      expect(res.body.data[0].durationMinutes).toBe(40);
    });
  });

  describe('8. Attendance & Class Registers', () => {
    it('POST /api/v1/attendance marks student attendance', async () => {
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId: 'school-001',
          classRoomId: 'class-grade-7',
          streamId: 'stream-g7-east',
          academicYearId: 'year-2026',
          termId: 'term-2026-1',
          date: '2026-02-12',
          type: 'DAILY_MORNING',
          markedByTeacherId: 'teacher-001',
          entries: [
            {
              studentId: 'student-001',
              status: 'PRESENT'
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.summary.present).toBe(1);
    });

    it('GET /api/v1/attendance/student/student-001 returns attendance history', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/student/student-001?termId=term-2026-1&academicYearId=year-2026')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats.present).toBeGreaterThan(0);
    });
  });

  describe('9. Fee Billing & Payments (M-Pesa / Bank)', () => {
    it('GET /api/v1/finance/structures returns fee structures', async () => {
      const res = await request(app)
        .get('/api/v1/finance/structures?schoolId=school-001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/finance/mpesa/stk-push initiates M-Pesa push prompt', async () => {
      const res = await request(app)
        .post('/api/v1/finance/mpesa/stk-push')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceId: 'inv-student-001',
          phoneNumber: '254799888777'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.responseCode).toBe('0');
      expect(res.body.data.customerMessage).toContain('Success');
    });

    it('POST /api/v1/finance/payments records manual cash/bank payment', async () => {
      const res = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: 'inv-student-001',
          amount: 12000,
          paymentMethod: 'BANK_TRANSFER',
          transactionReference: 'BNK-7890123',
          recordedByUserId: 'usr-admin-01'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.receiptNumber).toBeDefined();
      expect(res.body.data.updatedInvoice.balance).toBe(0);
      expect(res.body.data.updatedInvoice.status).toBe('PAID');
    });

    it('GET /api/v1/finance/statements/student-001 returns fee statement', async () => {
      const res = await request(app)
        .get('/api/v1/finance/statements/student-001')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalBilled).toBe(42000);
      expect(res.body.data.summary.currentBalance).toBe(0);
      expect(res.body.data.summary.status).toBe('CLEARED');
    });
  });

  describe('10. School Analytics & KPIs Dashboard', () => {
    it('GET /api/v1/analytics/dashboard returns executive KPIs', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.counts.totalStudents).toBeGreaterThan(0);
      expect(res.body.data.finance.totalCollected).toBeGreaterThan(0);
    });
  });
});
