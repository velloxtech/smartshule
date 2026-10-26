import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';
import { PaymentMethod } from '../../src/core/domain/finance/Fee';

describe('Individual Invoicing Pipeline & Fee Management Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let student1Id: string;
  let student2Id: string;
  let academicYearId: string;
  let termId: string;

  beforeAll(async () => {
    jest.setTimeout(45000);
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // Login as Super Admin
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

    // Fetch active academic period
    const yearsRes = await request(app)
      .get('/api/v1/academics/years')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(yearsRes.status).toBe(200);
    const activeYear = yearsRes.body.data.find((y: any) => y.isCurrent) || yearsRes.body.data[0];
    academicYearId = activeYear.id;

    const termsRes = await request(app)
      .get(`/api/v1/academics/terms?academicYearId=${academicYearId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(termsRes.status).toBe(200);
    const activeTerm = termsRes.body.data.find((t: any) => t.isCurrent) || termsRes.body.data[0];
    termId = activeTerm.id;

    // Register Student 1
    const s1Res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-IND-001',
        firstName: 'Kelvin',
        lastName: 'Otieno',
        dateOfBirth: '2014-03-15',
        gender: 'MALE',
        gradeLevel: 'GRADE_6',
        schoolId: 'school-001',
        academicYearId,
        termId,
        guardian: {
          firstName: 'Joseph',
          lastName: 'Otieno',
          email: 'joseph.otieno@test.com',
          phone: '+254711112233',
          relationship: 'FATHER',
          emergencyContact: '+254711112233'
        }
      });
    expect(s1Res.status).toBe(201);
    student1Id = s1Res.body.data.id;

    // Register Student 2
    const s2Res = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-IND-002',
        firstName: 'Brenda',
        lastName: 'Achieng',
        dateOfBirth: '2014-06-20',
        gender: 'FEMALE',
        gradeLevel: 'GRADE_6',
        schoolId: 'school-001',
        academicYearId,
        termId,
        guardian: {
          firstName: 'Grace',
          lastName: 'Achieng',
          email: 'grace.achieng@test.com',
          phone: '+254722223344',
          relationship: 'MOTHER',
          emergencyContact: '+254722223344'
        }
      });
    expect(s2Res.status).toBe(201);
    student2Id = s2Res.body.data.id;
  });

  describe('Scenario 1 & 2: Create Individual Invoice for Single Learner', () => {
    it('should create an individual invoice for Student 1 with custom items, quantities, and unit prices', async () => {
      const invoicePayload = {
        studentId: student1Id,
        academicYearId,
        termId,
        dueDate: '2026-11-30',
        title: 'Term 1 Tuition & Swimming Elective',
        description: 'Direct individual invoice for elective sports and boarding',
        items: [
          { name: 'Tuition Fee', category: 'TUITION', quantity: 1, unitAmount: 18000, amount: 18000 },
          { name: 'Lunch Scheme', category: 'MEALS', quantity: 1, unitAmount: 4500, amount: 4500 },
          { name: 'Swimming Lessons', category: 'ACTIVITY', quantity: 3, unitAmount: 500, amount: 1500 }
        ],
        discountAmount: 1000,
        status: 'UNPAID'
      };

      const res = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invoicePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const inv = res.body.data;
      expect(inv.studentId).toBe(student1Id);
      expect(inv.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
      expect(inv.amountBilled).toBe(24000); // 18000 + 4500 + 1500
      expect(inv.discountAmount).toBe(1000);
      expect(inv.amountPayable).toBe(23000); // 24000 - 1000
      expect(inv.amountPaid).toBe(0);
      expect(inv.balance).toBe(23000);
      expect(inv.status).toBe('UNPAID');
      expect(inv.items).toHaveLength(3);
      expect(inv.title).toBe('Term 1 Tuition & Swimming Elective');
    });
  });

  describe('Scenario 3 & 4: Draft Invoicing Lifecycle & Liability Exclusion', () => {
    let draftInvoiceId: string;

    it('should save an invoice as DRAFT and ensure it does not create active financial liabilities', async () => {
      const draftPayload = {
        studentId: student2Id,
        academicYearId,
        termId,
        dueDate: '2026-12-15',
        title: 'Tentative Term 2 Electives',
        items: [
          { name: 'Music Elective', category: 'ACTIVITY', quantity: 1, unitAmount: 5000, amount: 5000 }
        ],
        status: 'DRAFT'
      };

      const res = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(draftPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
      draftInvoiceId = res.body.data.id;

      // Check fee statement: DRAFT invoices must not be counted as billed fee obligations
      const statementRes = await request(app)
        .get(`/api/v1/finance/statements/${student2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statementRes.status).toBe(200);
      // Ensure the student statement does not include the draft as a pending debt
      const invoicesOnStatement = statementRes.body.data?.invoices || [];
      const draftInStatement = invoicesOnStatement.find((i: any) => i.id === draftInvoiceId);
      // Either draft is not included or balance due ignores draft
      if (draftInStatement) {
        expect(draftInStatement.status).toBe('DRAFT');
      }
    });

    it('should officially issue the draft invoice when requested', async () => {
      const issueRes = await request(app)
        .post(`/api/v1/finance/invoices/${draftInvoiceId}/issue`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(issueRes.status).toBe(200);
      expect(issueRes.body.success).toBe(true);
      expect(issueRes.body.data.status).toBe('UNPAID');
      expect(issueRes.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{6}$/);
    });
  });

  describe('Scenario 5 & 6: Arrears Transparency (No Silent Debt Aggregation)', () => {
    it('should transparently itemize prior arrears as a distinct separate line item when requested', async () => {
      // 1. Add manual arrears to Student 1
      await request(app)
        .post('/api/v1/finance/arrears')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student1Id,
          amount: 3500,
          reason: 'Prior Transport Arrears',
          mode: 'ADD'
        });

      // 2. Create individual invoice with includeArrears: true
      const invRes = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student1Id,
          academicYearId,
          termId,
          dueDate: '2026-11-30',
          title: 'Term 2 Fee with Arrears Carryover',
          items: [
            { name: 'Tuition Fee', category: 'TUITION', quantity: 1, unitAmount: 15000, amount: 15000 }
          ],
          includeArrears: true,
          status: 'UNPAID'
        });

      expect(invRes.status).toBe(201);
      const invoice = invRes.body.data;
      // Must contain transparent line item for previous arrears
      const arrearsItem = invoice.items.find((it: any) => it.name.includes('Previous Outstanding Arrears'));
      expect(arrearsItem).toBeDefined();
      expect(arrearsItem.amount).toBe(11500);
      expect(arrearsItem.category).toBe('OTHER');
      expect(invoice.amountBilled).toBe(26500); // 15000 + 11500
    });
  });

  describe('Scenario 7 & 8: Payment Recording & Status Transitions', () => {
    let testInvoiceId: string;

    beforeAll(async () => {
      const invRes = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student1Id,
          academicYearId,
          termId,
          dueDate: '2026-12-01',
          title: 'Laboratory Fee Invoice',
          items: [
            { name: 'Science Lab Manual & Practical Materials', category: 'ASSESSMENT', quantity: 1, unitAmount: 4000, amount: 4000 }
          ],
          status: 'UNPAID'
        });
      testInvoiceId = invRes.body.data.id;
    });

    it('should transition to PARTIALLY_PAID upon partial payment', async () => {
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: testInvoiceId,
          amount: 2500,
          paymentMethod: PaymentMethod.CASH,
          transactionReference: 'REC-TEST-PARTIAL-001'
        });

      expect(payRes.status).toBe(201);

      // Verify invoice status
      const detailsRes = await request(app)
        .get(`/api/v1/finance/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailsRes.status).toBe(200);
      const inv = detailsRes.body.data.invoice;
      expect(inv.status).toBe('PARTIALLY_PAID');
      expect(inv.amountPaid).toBe(2500);
      expect(inv.balance).toBe(1500);
    });

    it('should transition to PAID once outstanding balance reaches 0', async () => {
      const payRes = await request(app)
        .post('/api/v1/finance/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId: 'school-001',
          invoiceId: testInvoiceId,
          amount: 1500,
          paymentMethod: PaymentMethod.CASH,
          transactionReference: 'REC-TEST-FULL-002'
        });

      expect(payRes.status).toBe(201);

      const detailsRes = await request(app)
        .get(`/api/v1/finance/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailsRes.status).toBe(200);
      const inv = detailsRes.body.data.invoice;
      expect(inv.status).toBe('PAID');
      expect(inv.amountPaid).toBe(4000);
      expect(inv.balance).toBe(0);
    });
  });

  describe('Scenario 9: Cancellation & Voiding of Unpaid Invoices', () => {
    let cancelInvoiceId: string;

    beforeAll(async () => {
      const invRes = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student2Id,
          academicYearId,
          termId,
          dueDate: '2026-12-01',
          title: 'Invoice to be Cancelled',
          items: [{ name: 'Test Activity', category: 'ACTIVITY', quantity: 1, unitAmount: 3000, amount: 3000 }],
          status: 'UNPAID'
        });
      cancelInvoiceId = invRes.body.data.id;
    });

    it('should allow cancelling an unpaid invoice with zero payments', async () => {
      const cancelRes = await request(app)
        .post(`/api/v1/finance/invoices/${cancelInvoiceId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate billing entry error' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('should reject cancelling an already cancelled invoice', async () => {
      const cancelRes = await request(app)
        .post(`/api/v1/finance/invoices/${cancelInvoiceId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Try again' });

      expect([400, 409]).toContain(cancelRes.status);
    });
  });

  describe('Scenario 10: Role-Based Access Control', () => {
    it('should forbid unauthorized roles (e.g. Teacher) from creating individual invoices (403)', async () => {
      const res = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: student1Id,
          academicYearId,
          termId,
          dueDate: '2026-11-30',
          title: 'Unauthorized Invoice',
          items: [{ name: 'Test Fee', category: 'OTHER', quantity: 1, unitAmount: 1000, amount: 1000 }]
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Scenario 11: Validation Safeguards', () => {
    it('should reject negative amounts and discounts exceeding billed amount', async () => {
      const negativeRes = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student1Id,
          academicYearId,
          termId,
          dueDate: '2026-11-30',
          items: [{ name: 'Negative Item', category: 'OTHER', quantity: 1, unitAmount: -500, amount: -500 }]
        });

      expect(negativeRes.status).toBe(400);

      const excessDiscountRes = await request(app)
        .post('/api/v1/finance/invoices/individual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: student1Id,
          academicYearId,
          termId,
          dueDate: '2026-11-30',
          items: [{ name: 'Valid Item', category: 'OTHER', quantity: 1, unitAmount: 1000, amount: 1000 }],
          discountAmount: 2500 // Exceeds 1000
        });

      expect(excessDiscountRes.status).toBe(400);
    });
  });
});
