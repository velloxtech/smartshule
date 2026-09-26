import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { PaymentMethod, PaymentStatus, InvoiceStatus } from '../../src/core/domain/finance/Fee';

describe('KCB Buni API Platform Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let testInvoiceId: string;
  let studentAdmissionNumber: string;
  let initialBalance: number;

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

    // Register a student to test payments against
    const studentRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-KCB-999',
        firstName: 'Baraka',
        lastName: 'Otieno',
        dateOfBirth: '2012-05-14',
        gender: 'MALE',
        gradeLevel: 'GRADE_8',
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
        upiNumber: 'UPI-KCB-999',
        guardian: {
          firstName: 'Grace',
          lastName: 'Otieno',
          email: 'grace.kcb@test.com',
          phone: '+254711223344',
          relationship: 'MOTHER',
          emergencyContact: '+254711223344'
        }
      });

    expect(studentRes.status).toBe(201);
    studentAdmissionNumber = studentRes.body.data.admissionNumber;

    // Fetch invoice automatically created upon registration
    const invRes = await request(app)
      .get(`/api/v1/finance/invoices?studentId=${studentRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invRes.status).toBe(200);
    expect(invRes.body.data.length).toBeGreaterThanOrEqual(1);
    testInvoiceId = invRes.body.data[0].id;
    initialBalance = invRes.body.data[0].balance;
  });

  describe('1. KCB Buni Configuration Endpoint', () => {
    it('returns KCB Buni gateway configuration and Paybill 522123 details', async () => {
      const res = await request(app).get('/api/v1/finance/kcb-buni/config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gateway).toBe('KCB_BUNI');
      expect(res.body.data.bankName).toBe('KCB Bank Kenya');
      expect(res.body.data.paybillNumber).toBe('522123');
      expect(res.body.data.supportedChannels).toContain('KCB_BUNI_STK');
      expect(res.body.data.supportedChannels).toContain('MPESA_PAYBILL_522123');
      expect(res.body.data.supportedChannels).toContain('KCB_APP');
    });
  });

  describe('2. KCB Buni M-Pesa Express STK Push', () => {
    let checkoutRequestId: string;

    it('initiates an STK push prompt via KCB Buni API', async () => {
      const res = await request(app)
        .post('/api/v1/finance/kcb-buni/stk-push')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceId: testInvoiceId,
          phoneNumber: '0712345678',
          amount: 5000,
          description: 'Term 1 Fee Partial'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkoutRequestId).toBeDefined();
      expect(res.body.data.studentAdmission).toBe(studentAdmissionNumber);
      expect(res.body.data.customerMessage).toContain('522123');
      checkoutRequestId = res.body.data.checkoutRequestId;
    });

    it('queries transaction status via KCB Buni API', async () => {
      const res = await request(app)
        .get(`/api/v1/finance/kcb-buni/status/${checkoutRequestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.receiptNumber).toBeDefined();
    });

    it('processes KCB Buni callback and records payment into invoice', async () => {
      const callbackPayload = {
        checkoutRequestId,
        merchantRequestId: 'MR_KCB_TEST_001',
        resultCode: 0,
        resultDesc: 'The service request is processed successfully.',
        amount: 5000,
        mpesaReceiptNumber: 'KCB_RCP_' + Date.now(),
        phoneNumber: '254712345678',
        transactionDate: new Date().toISOString()
      };

      const res = await request(app)
        .post('/api/v1/finance/kcb-buni/callback')
        .send(callbackPayload);

      expect(res.status).toBe(200);
      expect(res.body.ResultCode).toBe(0);
      expect(res.body.data.status).toBe('SUCCESS');
      expect(res.body.data.amount).toBe(5000);

      // Verify invoice balance decreased by 5,000
      const invoice = await container.feeRepository.findInvoiceById(testInvoiceId);
      expect(invoice).not.toBeNull();
      expect(invoice?.amountPaid).toBe(5000);
      expect(invoice?.balance).toBe(initialBalance - 5000);
      expect(invoice?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    });
  });

  describe('3. KCB Buni C2B Bill Validation (Paybill 522123)', () => {
    it('successfully validates existing student admission number and returns balance', async () => {
      const res = await request(app)
        .post('/api/v1/finance/kcb-buni/validate')
        .send({
          billReferenceNumber: studentAdmissionNumber,
          amount: initialBalance - 5000,
          phoneNumber: '254712345678'
        });

      expect(res.status).toBe(200);
      expect(res.body.resultCode).toBe('0');
      expect(res.body.resultDesc).toBe('Validation Successful');
      expect(res.body.studentName).toContain('Baraka Otieno');
      expect(res.body.currentBalance).toBe(initialBalance - 5000);
    });

    it('rejects validation for unknown student admission number', async () => {
      const res = await request(app)
        .post('/api/v1/finance/kcb-buni/validate')
        .send({
          billReferenceNumber: 'INVALID-ADM-NONEXISTENT',
          amount: 5000
        });

      expect(res.status).toBe(200);
      expect(res.body.resultCode).toBe('C2B00012');
      expect(res.body.resultDesc).toContain('No student found');
    });
  });

  describe('4. KCB Buni C2B Bill Confirmation (Paybill 522123 / KCB App)', () => {
    it('confirms payment from KCB Paybill 522123 and updates invoice balance', async () => {
      const confirmAmount = initialBalance - 7000;
      const transactionId = 'KCBTX_' + Date.now();
      const res = await request(app)
        .post('/api/v1/finance/kcb-buni/confirm')
        .send({
          transactionId,
          transactionTime: new Date().toISOString(),
          billReferenceNumber: studentAdmissionNumber,
          transactionAmount: confirmAmount,
          phoneNumber: '254722000000',
          senderName: 'Mama Baraka',
          channel: 'KCB_APP'
        });

      expect(res.status).toBe(200);
      expect(res.body.resultCode).toBe('0');
      expect(res.body.resultDesc).toBe('Payment confirmed successfully');
      expect(res.body.paymentId).toBeDefined();

      // Verify invoice balance is now 2000
      const invoice = await container.feeRepository.findInvoiceById(testInvoiceId);
      expect(invoice).not.toBeNull();
      expect(invoice?.balance).toBe(2000);
      expect(invoice?.amountPaid).toBe(5000 + confirmAmount);
      expect(invoice?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

      // Verify payment entity recorded with KCB_BUNI payment method
      const payment = await container.feeRepository.findPaymentByReference(transactionId);
      expect(payment).not.toBeNull();
      expect(payment?.paymentMethod).toBe(PaymentMethod.KCB_BUNI);
      expect(payment?.amount).toBe(confirmAmount);
      expect(payment?.status).toBe(PaymentStatus.COMPLETED);
    });

    it('is idempotent when same transactionId is confirmed again', async () => {
      const transactionId = 'KCBTX_IDEMPOTENT_TEST';
      // First confirmation
      await request(app)
        .post('/api/v1/finance/kcb-buni/confirm')
        .send({
          transactionId,
          billReferenceNumber: studentAdmissionNumber,
          transactionAmount: 1000
        });

      // Second confirmation with same transactionId
      const res2 = await request(app)
        .post('/api/v1/finance/kcb-buni/confirm')
        .send({
          transactionId,
          billReferenceNumber: studentAdmissionNumber,
          transactionAmount: 1000
        });

      expect(res2.status).toBe(200);
      expect(res2.body.resultCode).toBe('0');
      expect(res2.body.resultDesc).toContain('already confirmed');
    });
  });

  describe('5. Legacy M-Pesa Route Compatibility', () => {
    it('redirects legacy /mpesa/stk-push seamlessly to KCB Buni API platform', async () => {
      const res = await request(app)
        .post('/api/v1/finance/mpesa/stk-push')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          invoiceId: testInvoiceId,
          phoneNumber: '254712345678',
          amount: 1000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkoutRequestId).toBeDefined();
    });
  });
});
