import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Student Fee Accounts, Term Billing, Arrears & Traceable Credits Audit', () => {
  let app: Express;
  let container: AppContainer;
  let superAdminToken: string;
  let adminToken: string;
  let testYearId: string;
  let testTerm1Id: string;
  let testTerm2Id: string;
  let testTerm3Id: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // Super Admin login
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@smartshule.ac.ke', password: 'SuperAdmin@123' });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.data.accessToken;

    // Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // Fetch active academic year & terms
    const yearsRes = await request(app)
      .get('/api/v1/academics/years')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(yearsRes.status).toBe(200);
    const activeYear = yearsRes.body.data.find((y: any) => y.isCurrent) || yearsRes.body.data[0];
    testYearId = activeYear ? activeYear.id : 'year-2026';

    const termsRes = await request(app)
      .get(`/api/v1/academics/terms?academicYearId=${testYearId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(termsRes.status).toBe(200);
    const terms = termsRes.body.data;
    const t1 = terms.find((t: any) => t.termNumber === 1 || t.name.includes('1'));
    const t2 = terms.find((t: any) => t.termNumber === 2 || t.name.includes('2'));
    const t3 = terms.find((t: any) => t.termNumber === 3 || t.name.includes('3'));
    testTerm1Id = t1 ? t1.id : 'term-2026-t1';
    testTerm2Id = t2 ? t2.id : 'term-2026-t2';
    testTerm3Id = t3 ? t3.id : 'term-2026-t3';

    // Ensure distinct term fee structures exist for testing term switching
    // Create Fee Structure for Grade 3 Term 1: KES 12,000
    const fs1Res = await request(app)
      .post('/api/v1/finance/structures')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        schoolId: 'school-001',
        academicYearId: testYearId,
        termId: testTerm1Id,
        gradeLevel: 'GRADE_3',
        title: 'Grade 3 Term 1 Fee Schedule',
        dueDate: '2026-04-15',
        items: [
          { name: 'Tuition', amount: 10000, category: 'TUITION', isOptional: false },
          { name: 'Activity', amount: 2000, category: 'ACTIVITY', isOptional: false }
        ]
      });
    if (fs1Res.status !== 201 && fs1Res.status !== 200) {
      console.error('fs1Res error:', fs1Res.status, fs1Res.body);
    }

    // Create Fee Structure for Grade 3 Term 2: KES 14,500
    const fs2Res = await request(app)
      .post('/api/v1/finance/structures')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        schoolId: 'school-001',
        academicYearId: testYearId,
        termId: testTerm2Id,
        gradeLevel: 'GRADE_3',
        title: 'Grade 3 Term 2 Fee Schedule',
        dueDate: '2026-08-15',
        items: [
          { name: 'Tuition', amount: 12000, category: 'TUITION', isOptional: false },
          { name: 'Assessment', amount: 2500, category: 'ASSESSMENT', isOptional: false }
        ]
      });
    if (fs2Res.status !== 201 && fs2Res.status !== 200) {
      console.error('fs2Res error:', fs2Res.status, fs2Res.body);
    }
  });

  // Helper to register student
  const createTestStudent = async (prefix: string) => {
    const admNo = `ADM-TEST-${prefix}-${Date.now().toString().slice(-4)}`;
    const res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        admissionNumber: admNo,
        firstName: `Test${prefix}`,
        lastName: 'Learner',
        dateOfBirth: '2016-05-12',
        gender: 'MALE',
        gradeLevel: 'GRADE_3',
        schoolId: 'school-001',
        academicYearId: testYearId,
        authorizeBilling: false // We will generate specific term invoices manually in tests
      });
    expect([200, 201]).toContain(res.status);
    return res.body.data;
  };

  // Helper to generate term invoice for student
  const generateTermInvoice = async (studentId: string, termId: string) => {
    const res = await request(app)
      .post('/api/v1/finance/invoices/generate')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        studentId,
        schoolId: 'school-001',
        academicYearId: testYearId,
        termId,
        gradeLevel: 'GRADE_3'
      });
    if (res.status !== 200 && res.status !== 201) {
      console.error('generateTermInvoice failed:', res.status, res.body);
    }
    const invs = res.body.data?.invoices || res.body.data;
    return Array.isArray(invs) ? invs[0] : invs;
  };

  describe('Scenario A: Exact payment for the current term', () => {
    it('should set balance to 0 and credit to 0 on exact payment', async () => {
      const student = await createTestStudent('Exact');
      const invoice = await generateTermInvoice(student.id, testTerm2Id);
      const feeDue = invoice.amountPayable;
      expect(feeDue).toBe(14500);

      // Record exact payment of 14,500
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: invoice.id,
          amount: 14500,
          paymentMethod: 'CASH',
          transactionReference: `EXACT-${Date.now()}`
        });
      expect(payRes.status).toBe(201);
      expect(payRes.body.data.studentTotalBalance).toBe(0);
      expect(payRes.body.data.creditBalance).toBe(0);

      // Verify authoritative student-accounts endpoint
      const accRes = await request(app)
        .get(`/api/v1/finance/student-accounts?termId=${testTerm2Id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(accRes.status).toBe(200);

      const acc = accRes.body.data.accounts.find((a: any) => a.studentId === student.id);
      expect(acc).toBeDefined();
      expect(acc.billedFees).toBe(14500);
      expect(acc.priorArrears).toBe(0);
      expect(acc.totalDue).toBe(14500);
      expect(acc.paidFees).toBe(14500);
      expect(acc.balance).toBe(0);
      expect(acc.overpaymentCredit).toBe(0);
      expect(acc.status).toBe('CLEARED');
    });
  });

  describe('Scenario B: Underpayment for the current term', () => {
    it('should reflect remaining balance of 4,500 and 0 credit when paying 10,000 of 14,500', async () => {
      const student = await createTestStudent('Under');
      const invoice = await generateTermInvoice(student.id, testTerm2Id);
      expect(invoice.amountPayable).toBe(14500);

      // Record underpayment of 10,000
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: invoice.id,
          amount: 10000,
          paymentMethod: 'CASH',
          transactionReference: `UNDER-${Date.now()}`
        });
      expect(payRes.status).toBe(201);
      expect(payRes.body.data.studentTotalBalance).toBe(4500);
      expect(payRes.body.data.creditBalance).toBe(0);

      // Query authoritative accounts
      const accRes = await request(app)
        .get(`/api/v1/finance/student-accounts?termId=${testTerm2Id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(accRes.status).toBe(200);

      const acc = accRes.body.data.accounts.find((a: any) => a.studentId === student.id);
      expect(acc).toBeDefined();
      expect(acc.billedFees).toBe(14500);
      expect(acc.priorArrears).toBe(0);
      expect(acc.totalDue).toBe(14500);
      expect(acc.paidFees).toBe(10000);
      expect(acc.balance).toBe(4500);
      expect(acc.overpaymentCredit).toBe(0);
      expect(acc.status).toBe('PARTIAL');
    });
  });

  describe('Scenario C: Overpayment for the current term', () => {
    let studentC: any;
    let paymentCId: string;

    it('should set balance to 0 and credit to 5,500 in traceable credit ledger when paying 20,000 on 14,500', async () => {
      studentC = await createTestStudent('Overpay');
      const invoice = await generateTermInvoice(studentC.id, testTerm2Id);
      expect(invoice.amountPayable).toBe(14500);

      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: invoice.id,
          amount: 20000,
          paymentMethod: 'BANK_DEPOSIT',
          slipNumber: `SLIP-${Date.now()}`,
          transactionReference: `OVER-${Date.now()}`
        });
      expect(payRes.status).toBe(201);
      paymentCId = payRes.body.data.payment.id;
      expect(payRes.body.data.studentTotalBalance).toBe(-5500);
      expect(payRes.body.data.creditBalance).toBe(5500);

      // Check credit ledger endpoint
      const creditsRes = await request(app)
        .get(`/api/v1/finance/credits/${studentC.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(creditsRes.status).toBe(200);
      expect(creditsRes.body.data.totalCredit).toBe(5500);
      expect(creditsRes.body.data.availableBalance).toBe(5500);
      expect(creditsRes.body.data.credits.length).toBeGreaterThanOrEqual(1);

      const creditItem = creditsRes.body.data.credits[0];
      expect(creditItem.amount).toBe(5500);
      expect(creditItem.balance).toBe(5500);
      expect(creditItem.status).toBe('AVAILABLE');
      expect(creditItem.originatingPaymentId).toBe(paymentCId);

      // Verify student fee accounts endpoint
      const accRes = await request(app)
        .get(`/api/v1/finance/student-accounts?termId=${testTerm2Id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(accRes.status).toBe(200);

      const acc = accRes.body.data.accounts.find((a: any) => a.studentId === studentC.id);
      expect(acc).toBeDefined();
      expect(acc.billedFees).toBe(14500);
      expect(acc.totalDue).toBe(14500);
      expect(acc.balance).toBe(0); // Balance must be 0, not negative
      expect(acc.overpaymentCredit).toBe(5500);
      expect(acc.status).toBe('OVERPAID');
    });
  });

  describe('Scenario D: Prior arrears with partial clearing payment', () => {
    it('should show billed 14,500, prior arrears 3,000, total due 17,500, paid 15,000, balance 2,500', async () => {
      const student = await createTestStudent('Arrears');

      // Add prior arrears of 3,000
      const arrearRes = await request(app)
        .post('/api/v1/finance/arrears')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          studentId: student.id,
          amount: 3000,
          reason: 'Term 1 Unpaid Arrears Brought Forward',
          mode: 'SET'
        });
      expect([200, 201]).toContain(arrearRes.status);

      // Generate Term 2 invoice (billed 14,500)
      const invoice = await generateTermInvoice(student.id, testTerm2Id);

      // Record payment of 15,000
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: invoice.id,
          amount: 15000,
          paymentMethod: 'CASH',
          transactionReference: `ARR-PAY-${Date.now()}`
        });
      expect(payRes.status).toBe(201);

      // Verify student fee accounts
      const accRes = await request(app)
        .get(`/api/v1/finance/student-accounts?termId=${testTerm2Id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(accRes.status).toBe(200);

      const acc = accRes.body.data.accounts.find((a: any) => a.studentId === student.id);
      expect(acc).toBeDefined();
      expect(acc.billedFees).toBe(14500); // Billed fees must only be the current term
      expect(acc.priorArrears).toBe(3000); // Prior arrears distinctly separated
      expect(acc.totalDue).toBe(17500); // Total due = 14,500 + 3,000
      expect(acc.paidFees).toBe(15000);
      expect(acc.balance).toBe(2500); // 17,500 - 15,000
      expect(acc.overpaymentCredit).toBe(0);
      expect(acc.status).toBe('PARTIAL');
    });
  });

  describe('Scenario E: Previous credit applied to a new term', () => {
    it('should apply 5,500 credit to 14,500 invoice leaving 9,000 balance and 0 remaining credit', async () => {
      // 1. Create a student with advance payment generating 5,500 credit
      const student = await createTestStudent('CreditApp');
      const term1Inv = await generateTermInvoice(student.id, testTerm1Id);
      const term1Due = term1Inv.amountPayable; // 12,000

      // Pay 17,500 on 12,000 invoice (leaving 5,500 overpayment credit)
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: term1Inv.id,
          amount: 17500,
          paymentMethod: 'CASH',
          transactionReference: `ADV-CR-${Date.now()}`
        });
      expect(payRes.status).toBe(201);

      // Verify credit of 5,500 exists
      const creditsBefore = await request(app)
        .get(`/api/v1/finance/credits/${student.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(creditsBefore.status).toBe(200);
      expect(creditsBefore.body.data.availableBalance).toBe(5500);
      const creditId = creditsBefore.body.data.credits[0].id;

      // 2. Generate Term 2 invoice (KES 14,500)
      const term2Inv = await generateTermInvoice(student.id, testTerm2Id);
      expect(term2Inv.amountPayable).toBe(14500);
      expect(term2Inv.balance).toBe(14500);

      // 3. Apply the 5,500 credit to the Term 2 invoice
      const applyRes = await request(app)
        .post('/api/v1/finance/credits/apply')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          creditId,
          invoiceId: term2Inv.id,
          amount: 5500
        });
      expect(applyRes.status).toBe(200);
      expect(applyRes.body.success).toBe(true);
      expect(applyRes.body.updatedInvoice.balance).toBe(9000);
      expect(applyRes.body.updatedCredit.balance).toBe(0);
      expect(applyRes.body.updatedCredit.status).toBe('FULLY_USED');

      // 4. Verify student fee accounts for Term 2
      const accRes = await request(app)
        .get(`/api/v1/finance/student-accounts?termId=${testTerm2Id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(accRes.status).toBe(200);

      const acc = accRes.body.data.accounts.find((a: any) => a.studentId === student.id);
      expect(acc).toBeDefined();
      expect(acc.billedFees).toBe(14500);
      expect(acc.totalDue).toBe(14500);
      expect(acc.paidFees).toBe(5500);
      expect(acc.balance).toBe(9000);
      expect(acc.overpaymentCredit).toBe(0); // Credit has been applied, so 0 remaining
    });
  });

  describe('Scenario F: Changing the selected term', () => {
    it('should return term-isolated charges when switching between Term 1 and Term 2', async () => {
      const student = await createTestStudent('TermSwitch');
      // Student has no invoices yet, should reflect grade fee structure for that term
      // Term 1: KES 12,000
      const t1Res = await request(app)
        .get(`/api/v1/finance/student-accounts?termId=${testTerm1Id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(t1Res.status).toBe(200);
      const accT1 = t1Res.body.data.accounts.find((a: any) => a.studentId === student.id);
      expect(accT1).toBeDefined();
      expect(accT1.billedFees).toBe(12000);

      // Term 2: KES 14,500
      const t2Res = await request(app)
        .get(`/api/v1/finance/student-accounts?termId=${testTerm2Id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(t2Res.status).toBe(200);
      const accT2 = t2Res.body.data.accounts.find((a: any) => a.studentId === student.id);
      expect(accT2).toBeDefined();
      expect(accT2.billedFees).toBe(14500);

      // Verify that Term 1 and Term 2 show distinct charges and do not bleed into each other
      expect(accT1.billedFees).not.toBe(accT2.billedFees);
    });
  });

  describe('Scenario G: Duplicate payment prevention', () => {
    it('should reject payment with duplicate transaction reference with 409 Conflict', async () => {
      const student = await createTestStudent('DupeTest');
      const invoice = await generateTermInvoice(student.id, testTerm2Id);
      const txRef = `UNIQUE-TX-${Date.now()}`;

      // First submission: Success
      const firstPayRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: invoice.id,
          amount: 5000,
          paymentMethod: 'CASH',
          transactionReference: txRef
        });
      expect(firstPayRes.status).toBe(201);

      // Second submission with identical reference: Must be rejected with 409 Conflict
      const dupePayRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: invoice.id,
          amount: 5000,
          paymentMethod: 'CASH',
          transactionReference: txRef
        });
      expect(dupePayRes.status).toBe(409);
      expect(dupePayRes.body.message).toContain(txRef);

      // Verify invoice was not credited twice
      const invRes = await request(app)
        .get(`/api/v1/finance/invoices?studentId=${student.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(invRes.status).toBe(200);
      const updatedInv = invRes.body.data.find((i: any) => i.id === invoice.id);
      expect(updatedInv.amountPaid).toBe(5000);
      expect(updatedInv.balance).toBe(9500); // 14,500 - 5,000 = 9,500
    });
  });
});
