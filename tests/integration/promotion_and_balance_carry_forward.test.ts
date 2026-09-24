import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Student Promotion, Admission Fee & Balance Carry-Forward Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // Login as Super Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });

    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;
  });

  describe('1. Fee Structure with ADMISSION Category', () => {
    it('allows creating a fee structure with category ADMISSION', async () => {
      const res = await request(app)
        .post('/api/v1/finance/structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          termId: 'term-2026-t1',
          gradeLevel: 'GRADE_7',
          title: 'Grade 7 Ratified Fees',
          dueDate: '2026-02-15',
          items: [
            { name: 'Tuition Fee', amount: 20000, isOptional: false, category: 'TUITION' },
            { name: 'CBC Learning Materials', amount: 5000, isOptional: false, category: 'ASSESSMENT' },
            { name: 'Admission Fee', amount: 3500, isOptional: false, category: 'ADMISSION' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Admission Fee', category: 'ADMISSION', amount: 3500 })
        ])
      );
    });
  });

  describe('2. Single Student Promotion & Balance Carry-Forward', () => {
    let studentId: string;

    it('registers a learner and creates an initial invoice with Admission Fee', async () => {
      const regRes = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-TEST-PROMOTE-01',
          firstName: 'Brian',
          lastName: 'Otieno',
          dateOfBirth: '2012-05-14',
          gender: 'MALE',
          gradeLevel: 'GRADE_7',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          termId: 'term-2026-t1',
          guardian: {
            firstName: 'Grace',
            lastName: 'Otieno',
            email: 'grace.otieno@test.com',
            phone: '+254711223344',
            relationship: 'MOTHER',
            emergencyContact: '+254711223344'
          }
        });

      expect(regRes.status).toBe(201);
      studentId = regRes.body.data.id;
      expect(studentId).toBeDefined();

      // Check student's invoices
      const invRes = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(invRes.status).toBe(200);
      expect(invRes.body.data.length).toBeGreaterThanOrEqual(1);

      const firstInvoice = invRes.body.data[0];
      expect(firstInvoice.balance).toBeGreaterThan(0);
      // Verify Admission Fee item exists
      const hasAdmission = firstInvoice.items.some((i: any) => i.category === 'ADMISSION' || i.name === 'Admission Fee');
      expect(hasAdmission).toBe(true);
    });

    it('records a partial payment leaving an outstanding balance', async () => {
      const invRes = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const invoice = invRes.body.data[0];
      const initialBalance = invoice.balance;
      const partialPaymentAmount = 10000;

      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: invoice.id,
          amount: partialPaymentAmount,
          paymentMethod: 'MPESA',
          transactionReference: 'MPESA-TEST-9988',
          paymentDate: '2026-02-01',
          recordedByUserId: 'usr-admin-01'
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.data.updatedInvoice.balance).toBe(initialBalance - partialPaymentAmount);
    });

    it('promotes learner to Grade 8, carries forward the unpaid balance into the new invoice, and marks previous invoice CARRIED_FORWARD', async () => {
      // Fetch current balance before promotion
      const invResBefore = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const priorInvoice = invResBefore.body.data[0];
      const priorBalance = priorInvoice.balance;
      expect(priorBalance).toBeGreaterThan(0);

      // Promote student
      const promoteRes = await request(app)
        .post(`/api/v1/students/${studentId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetAcademicYearId: 'year-2026',
          targetTermId: 'term-2026-t2',
          carryForwardBalance: true
        });

      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body.success).toBe(true);
      expect(promoteRes.body.data.previousGrade).toBe('GRADE_7');
      expect(promoteRes.body.data.newGrade).toBe('GRADE_8');
      expect(promoteRes.body.data.carriedForwardBalance).toBe(priorBalance);

      // Verify the new invoice has the arrears line item
      const newInvoice = promoteRes.body.data.invoice;
      expect(newInvoice).toBeDefined();
      const arrearsItem = newInvoice.items.find(
        (it: any) => it.name.includes('Carried Forward') || it.name.includes('Arrears')
      );
      expect(arrearsItem).toBeDefined();
      expect(arrearsItem.amount).toBe(priorBalance);

      // Verify prior invoice status is now CARRIED_FORWARD with balance 0
      const invResAfter = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const updatedPriorInvoice = invResAfter.body.data.find((i: any) => i.id === priorInvoice.id);
      expect(updatedPriorInvoice.status).toBe('CARRIED_FORWARD');
      expect(updatedPriorInvoice.balance).toBe(0);

      // Verify statement does not double-count carried-forward balance
      const stmtRes = await request(app)
        .get(`/api/v1/finance/statements/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(stmtRes.status).toBe(200);
      const summary = stmtRes.body.data.summary;
      // Current balance should match the new invoice balance exactly
      expect(summary.currentBalance).toBe(newInvoice.balance);
    });
  });

  describe('3. Bulk Learner Promotion', () => {
    let studentIdA: string;
    let studentIdB: string;

    beforeAll(async () => {
      const regA = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-BULK-01',
          firstName: 'Faith',
          lastName: 'Chebet',
          dateOfBirth: '2015-08-20',
          gender: 'FEMALE',
          gradeLevel: 'GRADE_3',
          schoolId: 'school-001',
          academicYearId: 'year-2026'
        });
      studentIdA = regA.body.data.id;

      const regB = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-BULK-02',
          firstName: 'Dennis',
          lastName: 'Kiprono',
          dateOfBirth: '2015-11-10',
          gender: 'MALE',
          gradeLevel: 'GRADE_3',
          schoolId: 'school-001',
          academicYearId: 'year-2026'
        });
      studentIdB = regB.body.data.id;
    });

    it('promotes multiple learners in bulk from Grade 3 to Grade 4', async () => {
      const bulkRes = await request(app)
        .post('/api/v1/students/promote-bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentIds: [studentIdA, studentIdB],
          carryForwardBalance: true
        });

      expect(bulkRes.status).toBe(200);
      expect(bulkRes.body.success).toBe(true);
      expect(bulkRes.body.data.promotedCount).toBe(2);

      // Verify individual profiles reflect new grade GRADE_4
      const getA = await request(app)
        .get(`/api/v1/students/${studentIdA}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getA.body.data.gradeLevel).toBe('GRADE_4');

      const getB = await request(app)
        .get(`/api/v1/students/${studentIdB}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getB.body.data.gradeLevel).toBe('GRADE_4');
    });
  });
});
