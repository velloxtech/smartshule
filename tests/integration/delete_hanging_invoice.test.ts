import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { PaymentMethod } from '../../src/core/domain/finance/Fee';

describe('Hanging Invoice Deletion Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let studentId: string;
  let hangingInvoiceId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // Login as Super Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });

    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;

    // Register a student to generate fee invoices
    const studentRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-DEL-INV-001',
        firstName: 'Teresa',
        lastName: 'Wanjiku',
        dateOfBirth: '2013-08-20',
        gender: 'FEMALE',
        gradeLevel: 'GRADE_7',
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
        guardian: {
          firstName: 'Margaret',
          lastName: 'Wanjiku',
          email: 'margaret.w@test.com',
          phone: '+254712334455',
          relationship: 'MOTHER',
          emergencyContact: '+254712334455'
        }
      });

    expect(studentRes.status).toBe(201);
    studentId = studentRes.body.data.id;

    // Fetch the generated invoice
    const invRes = await request(app)
      .get(`/api/v1/finance/invoices?studentId=${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invRes.status).toBe(200);
    expect(invRes.body.data.length).toBeGreaterThan(0);
    hangingInvoiceId = invRes.body.data[0].id;
  });

  describe('Access Control', () => {
    it('rejects unauthenticated requests to delete an invoice', async () => {
      const res = await request(app).delete(`/api/v1/finance/invoices/${hangingInvoiceId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Deletion Guardrails: Active Paid Invoices Cannot Be Deleted', () => {
    let paidInvoiceId: string;

    beforeAll(async () => {
      // Register a second student
      const studentRes = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-PAID-INV-002',
          firstName: 'Brian',
          lastName: 'Kiprono',
          dateOfBirth: '2013-02-10',
          gender: 'MALE',
          gradeLevel: 'GRADE_7',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          termId: 'term-2026-t1',
          guardian: {
            firstName: 'Kiprono',
            lastName: 'Cheruiyot',
            email: 'kiprono@test.com',
            phone: '+254722998877',
            relationship: 'FATHER',
            emergencyContact: '+254722998877'
          }
        });

      const stId = studentRes.body.data.id;
      const invRes = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${stId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      paidInvoiceId = invRes.body.data[0].id;

      // Record a payment against this invoice
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: paidInvoiceId,
          amount: 2500,
          paymentMethod: PaymentMethod.CASH,
          transactionReference: 'TX_CASH_GUARD_001',
          recordedByUserId: 'usr-admin-001',
          notes: 'Test partial cash payment'
        });

      expect(payRes.status).toBe(201);
    });

    it('rejects deletion of an invoice that has payments recorded (amountPaid > 0)', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/finance/invoices/${paidInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(400);
      const errMsg = typeof deleteRes.body.error === 'string'
        ? deleteRes.body.error
        : (deleteRes.body.error?.message || deleteRes.body.message || '');
      expect(errMsg).toMatch(/cannot delete invoice.*recorded payments/i);
    });
  });

  describe('Successful Deletion of Hanging (Unsettled, 0 Payment) Invoice', () => {
    it('successfully deletes a hanging invoice when amountPaid is 0', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/finance/invoices/${hangingInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.deletedInvoiceId).toBe(hangingInvoiceId);
    });

    it('returns 404 when attempting to delete the same invoice again', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/finance/invoices/${hangingInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(404);
    });

    it('confirms the invoice is removed from the student invoices list', async () => {
      const invRes = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(invRes.status).toBe(200);
      const remaining = invRes.body.data.filter((i: any) => i.id === hangingInvoiceId);
      expect(remaining.length).toBe(0);
    });
  });
});
