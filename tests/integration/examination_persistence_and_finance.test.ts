import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Examination Persistence, Deduplication & Private School Finance API', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let testStudentId: string;
  let testInvoiceId: string;

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

    // 3. Create a test student in Grade 3
    const studentRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-EXAM-2026',
        firstName: 'Zari',
        lastName: 'Achieng',
        dateOfBirth: '2016-04-12',
        gender: 'FEMALE',
        gradeLevel: 'GRADE_3',
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        guardianName: 'Achieng Mother',
        guardianPhone: '+254711998877',
      });
    expect(studentRes.status).toBe(201);
    testStudentId = studentRes.body.data.id;
  });

  describe('Examination Recording Lifecycle & Deduplication', () => {
    it('should successfully record batch summative marks across multiple subjects without overwriting', async () => {
      const batchPayload = {
        assessments: [
          {
            studentId: testStudentId,
            teacherId: 'tch-001',
            learningAreaId: 'la-mat', // Generic key that resolves to canonical Math for Grade 3
            termId: 'term-2026-t1',
            academicYearId: 'year-2026',
            strandScores: [
              {
                strandId: 'la-mat',
                performanceLevel: 'EE',
                rawScore: 88,
                maxScore: 100,
              },
            ],
            overallPerformanceLevel: 'EE',
            teacherRemarks: 'Exemplary mathematical proficiency',
            evaluationDate: '2026-10-24',
          },
          {
            studentId: testStudentId,
            teacherId: 'tch-001',
            learningAreaId: 'la-eng', // Generic key that resolves to canonical English for Grade 3
            termId: 'term-2026-t1',
            academicYearId: 'year-2026',
            strandScores: [
              {
                strandId: 'la-eng',
                performanceLevel: 'ME',
                rawScore: 72,
                maxScore: 100,
              },
            ],
            overallPerformanceLevel: 'ME',
            teacherRemarks: 'Good reading and comprehension ability',
            evaluationDate: '2026-10-24',
          },
          {
            studentId: testStudentId,
            teacherId: 'tch-001',
            learningAreaId: 'la-kis', // Kiswahili
            termId: 'term-2026-t1',
            academicYearId: 'year-2026',
            strandScores: [
              {
                strandId: 'la-kis',
                performanceLevel: 'AE',
                rawScore: 56,
                maxScore: 100,
              },
            ],
            overallPerformanceLevel: 'AE',
            teacherRemarks: 'Needs guided reading practice in Kusoma',
            evaluationDate: '2026-10-24',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/cbc/summative/batch')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(batchPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);

      // Verify that all 3 assessments have distinct learningAreaIds and preserved scores
      const mathAssessment = res.body.data.find((a: any) =>
        a.learningAreaId.includes('math') || a.learningAreaId.includes('mat')
      );
      const engAssessment = res.body.data.find((a: any) =>
        a.learningAreaId.includes('eng')
      );
      const kisAssessment = res.body.data.find((a: any) =>
        a.learningAreaId.includes('kis')
      );

      expect(mathAssessment).toBeDefined();
      expect(engAssessment).toBeDefined();
      expect(kisAssessment).toBeDefined();
      expect(mathAssessment.learningAreaId).not.toBe(engAssessment.learningAreaId);
      expect(mathAssessment.learningAreaId).not.toBe(kisAssessment.learningAreaId);
    });

    it('should edit existing marks in-place idempotently without creating duplicate records', async () => {
      // Update Math mark from 88 to 94
      const updatePayload = {
        studentId: testStudentId,
        teacherId: 'tch-001',
        learningAreaId: 'la-mat',
        termId: 'term-2026-t1',
        academicYearId: 'year-2026',
        strandScores: [
          {
            strandId: 'la-mat',
            performanceLevel: 'EE',
            rawScore: 94,
            maxScore: 100,
          },
        ],
        overallPerformanceLevel: 'EE',
        teacherRemarks: 'Outstanding improvement to near perfect score',
        evaluationDate: '2026-10-24',
      };

      const res = await request(app)
        .post('/api/v1/cbc/summative')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updatePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacherRemarks).toBe('Outstanding improvement to near perfect score');
      expect(res.body.data.strandScores[0].rawScore).toBe(94);

      // Query database via API to confirm no duplicate entries were generated
      const listRes = await request(app)
        .get(`/api/v1/cbc/summative?studentId=${testStudentId}&termId=term-2026-t1&academicYearId=year-2026`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);

      const mathRecords = listRes.body.data.filter((a: any) =>
        a.learningAreaId.includes('math') || a.learningAreaId.includes('mat')
      );
      // Must be exactly 1 record for Math (no duplicates created by the update)
      expect(mathRecords).toHaveLength(1);
      expect(mathRecords[0].strandScores[0].rawScore).toBe(94);
    });

    it('should reject invalid marks exceeding maximum score or negative marks', async () => {
      const invalidOverMaxPayload = {
        studentId: testStudentId,
        teacherId: 'tch-001',
        learningAreaId: 'la-mat',
        termId: 'term-2026-t1',
        academicYearId: 'year-2026',
        strandScores: [
          {
            strandId: 'la-mat',
            performanceLevel: 'EE',
            rawScore: 120, // exceeds maxScore
            maxScore: 100,
          },
        ],
        overallPerformanceLevel: 'EE',
        evaluationDate: '2026-10-24',
      };

      const res1 = await request(app)
        .post('/api/v1/cbc/summative')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidOverMaxPayload);

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const invalidNegativePayload = {
        studentId: testStudentId,
        teacherId: 'tch-001',
        learningAreaId: 'la-mat',
        termId: 'term-2026-t1',
        academicYearId: 'year-2026',
        strandScores: [
          {
            strandId: 'la-mat',
            performanceLevel: 'BE',
            rawScore: -15, // negative score
            maxScore: 100,
          },
        ],
        overallPerformanceLevel: 'BE',
        evaluationDate: '2026-10-24',
      };

      const res2 = await request(app)
        .post('/api/v1/cbc/summative')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidNegativePayload);

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });
  });

  describe('Private School Fee Structure Management (PUT /api/v1/finance/structures/:id)', () => {
    let testFeeStructureId: string;

    beforeAll(async () => {
      // Create initial fee structure
      const createRes = await request(app)
        .post('/api/v1/finance/structures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          title: 'Grade 3 Term 1 Fees 2026',
          gradeLevel: 'GRADE_3',
          academicYearId: 'year-2026',
          termId: 'term-2026-t1',
          dueDate: '2026-01-31',
          items: [
            { name: 'Tuition Fee', amount: 18000, category: 'TUITION', isOptional: false },
            { name: 'Activity & Sports', amount: 2500, category: 'ACTIVITY', isOptional: false },
          ],
        });

      expect(createRes.status).toBe(201);
      testFeeStructureId = createRes.body.data.id;
    });

    it('should allow authorized admin to update an existing fee structure', async () => {
      const updatePayload = {
        title: 'Grade 3 Term 1 Fees 2026 (Revised)',
        gradeLevel: 'GRADE_3',
        dueDate: '2026-02-15',
        items: [
          { name: 'Tuition Fee', amount: 20000, category: 'TUITION', isOptional: false },
          { name: 'Activity & Sports', amount: 3000, category: 'ACTIVITY', isOptional: false },
          { name: 'ICT & Coding Lab', amount: 2500, category: 'OTHER', isOptional: true },
        ],
      };

      const res = await request(app)
        .put(`/api/v1/finance/structures/${testFeeStructureId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Grade 3 Term 1 Fees 2026 (Revised)');
      expect(res.body.data.dueDate).toBe('2026-02-15');
      expect(res.body.data.items).toHaveLength(3);
      // Total amount should be 20000 + 3000 + 2500 = 25500
      expect(res.body.data.totalAmount).toBe(25500);
    });

    it('should reject unauthorized updates from non-finance non-admin users', async () => {
      const res = await request(app)
        .put(`/api/v1/finance/structures/${testFeeStructureId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Unauthorized Hack',
          gradeLevel: 'GRADE_3',
          items: [{ name: 'Tuition', amount: 100, category: 'TUITION', isOptional: false }],
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Auditable Payment Reversal & Financial Balance Restoration', () => {
    let testPaymentId: string;

    beforeAll(async () => {
      // 1. Generate an invoice for testStudentId
      const invoiceRes = await request(app)
        .post('/api/v1/finance/invoices/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          academicYearId: 'year-2026',
          termId: 'term-2026-t1',
          gradeLevel: 'GRADE_3',
          studentId: testStudentId,
        });

      expect(invoiceRes.status).toBe(201);
      const invoices = invoiceRes.body.data.invoices || invoiceRes.body.data;
      testInvoiceId = invoices[0].id;

      // 2. Record a partial payment of 5,000 against this invoice
      const paymentRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: testInvoiceId,
          amount: 5000,
          paymentMethod: 'CASH',
          transactionReference: 'CSH-AUDIT-001',
          recordedByUserId: 'admin-001',
          notes: 'Test cash payment for reversal audit',
        });

      expect(paymentRes.status).toBe(201);
      testPaymentId = paymentRes.body.data.payment?.id || paymentRes.body.data.id;
    });

    it('should accurately reverse an existing payment and restore invoice balance', async () => {
      // Check invoice balance before reversal
      const statementBefore = await request(app)
        .get(`/api/v1/finance/statements/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statementBefore.status).toBe(200);
      const summaryBefore = statementBefore.body.data.summary || statementBefore.body.data;
      const initialPaid = summaryBefore.totalPaid;
      const initialBalance = summaryBefore.currentBalance;

      // Reversal request
      const reverseRes = await request(app)
        .post(`/api/v1/finance/payments/${testPaymentId}/reverse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Erroneous receipt entry - bank slip belonged to another family',
        });

      expect(reverseRes.status).toBe(200);
      expect(reverseRes.body.success).toBe(true);
      expect(reverseRes.body.payment.status).toBe('REVERSED');

      // Check statement after reversal: totalPaid must decrease by 5,000, currentBalance must increase by 5,000
      const statementAfter = await request(app)
        .get(`/api/v1/finance/statements/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statementAfter.status).toBe(200);
      const summaryAfter = statementAfter.body.data.summary || statementAfter.body.data;
      expect(summaryAfter.totalPaid).toBe(initialPaid - 5000);
      expect(summaryAfter.currentBalance).toBe(initialBalance + 5000);
    });

    it('should reject reversal of an already-reversed payment (idempotency & fraud protection)', async () => {
      const secondReverseRes = await request(app)
        .post(`/api/v1/finance/payments/${testPaymentId}/reverse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Second attempt to reverse same payment',
        });

      expect(secondReverseRes.status).toBe(409); // ConflictError
    });

    it('should reject payment reversal attempted by unauthorized roles (e.g. Teacher)', async () => {
      const unauthorizedRes = await request(app)
        .post(`/api/v1/finance/payments/${testPaymentId}/reverse`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          reason: 'Teacher attempting unauthorized financial reversal',
        });

      expect(unauthorizedRes.status).toBe(403);
    });

    it('should reject payment reversal when reason is missing or too short', async () => {
      const invalidReasonRes = await request(app)
        .post(`/api/v1/finance/payments/${testPaymentId}/reverse`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'no', // < 3 characters
        });

      expect(invalidReasonRes.status).toBe(400);
    });
  });

  describe('Manual Payments & Forwarded Payment Message Workflows', () => {
    const uniqueTxRef1 = `MPESA-MANUAL-${Date.now().toString().slice(-6)}`;
    const uniqueTxRef2 = `MPESA-FWD-${Date.now().toString().slice(-6)}`;
    let forwardedPaymentId: string;

    it('Path 1: should record standard manual payment and reject duplicate transaction reference', async () => {
      // 1. Record valid manual payment
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: testInvoiceId,
          amount: 3500,
          paymentMethod: 'MPESA',
          transactionReference: uniqueTxRef1,
          mpesaPhoneNumber: '0712345678',
          notes: 'Standard manual payment verified from bank portal',
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.data.payment.status).toBe('COMPLETED');
      expect(payRes.body.data.payment.receiptNumber).toMatch(/^REC-/);

      // 2. Reject duplicate submission of same reference
      const dupRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: testInvoiceId,
          amount: 3500,
          paymentMethod: 'MPESA',
          transactionReference: uniqueTxRef1,
        });

      expect(dupRes.status).toBe(409); // ConflictError
    });

    it('Path 2: should accept forwarded payment confirmation into PENDING queue without prematurely crediting balance', async () => {
      // Get balance before forwarding
      const statementBefore = await request(app)
        .get(`/api/v1/finance/statements/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const balanceBefore = statementBefore.body.data.summary.currentBalance;

      // Forward payment transaction with original message evidence
      const rawSms = `${uniqueTxRef2} Confirmed. Ksh4,000.00 sent to SmartShule on 24/10/26.`;
      const fwdRes = await request(app)
        .post('/api/v1/finance/payments/forward-transaction')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          studentId: testStudentId,
          amount: 4000,
          paymentMethod: 'MPESA',
          transactionReference: uniqueTxRef2,
          smsMessage: rawSms,
          senderName: 'Mary Otieno',
          mpesaPhoneNumber: '0722001122',
        });

      expect([200, 201]).toContain(fwdRes.status);
      expect(fwdRes.body.success).toBe(true);
      expect(fwdRes.body.payment.status).toBe('PENDING');
      expect(fwdRes.body.payment.receiptNumber).toMatch(/^FWD-/);
      forwardedPaymentId = fwdRes.body.payment.id;

      // Verify fee balance is NOT yet updated (retains balance until approved)
      const statementAfterFwd = await request(app)
        .get(`/api/v1/finance/statements/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statementAfterFwd.body.data.summary.currentBalance).toBe(balanceBefore);

      // Verify transaction is visible in bursar verification queue
      const queueRes = await request(app)
        .get('/api/v1/finance/payments/forwarded')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(queueRes.status).toBe(200);
      const queueItems = Array.isArray(queueRes.body) ? queueRes.body : (queueRes.body.data || []);
      const queuedItem = queueItems.find((t: any) => t.id === forwardedPaymentId);
      expect(queuedItem).toBeDefined();
      expect(queuedItem.transactionReference).toBe(uniqueTxRef2);
      expect(queuedItem.status).toBe('PENDING');
    });

    it('Path 2: should reject duplicate forwarded message submission with same reference', async () => {
      const dupFwdRes = await request(app)
        .post('/api/v1/finance/payments/forward-transaction')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          studentId: testStudentId,
          amount: 4000,
          paymentMethod: 'MPESA',
          transactionReference: uniqueTxRef2,
        });

      expect(dupFwdRes.status).toBe(409); // ConflictError
    });

    it('Path 2: should credit fee balance and issue official receipt upon authorized staff verification and approval', async () => {
      const statementBeforeApprove = await request(app)
        .get(`/api/v1/finance/statements/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const balanceBefore = statementBeforeApprove.body.data.summary.currentBalance;

      // Bursar approves forwarded transaction after checking settlement report
      const approveRes = await request(app)
        .post(`/api/v1/finance/payments/forwarded/${forwardedPaymentId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'APPROVE',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.payment.status).toBe('COMPLETED');
      expect(approveRes.body.payment.receiptNumber).toMatch(/^REC-/);

      // Verify student's fee balance is now credited by 4,000
      const statementAfterApprove = await request(app)
        .get(`/api/v1/finance/statements/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(statementAfterApprove.body.data.summary.currentBalance).toBe(balanceBefore - 4000);
    });
  });
});
