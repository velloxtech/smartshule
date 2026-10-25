import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Inventory Control, Approval Workflow, and Financial Audit Trail Integration Audit', () => {
  let app: Express;
  let container: AppContainer;
  let superAdminToken: string;
  let adminToken: string;
  let bursarToken: string;
  let teacherToken: string;
  let parentToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Super Admin login
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@smartshule.ac.ke', password: 'SuperAdmin@123' });
    expect(saLogin.status).toBe(200);
    superAdminToken = saLogin.body.data.accessToken;

    // 2. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // 3. Bursar login
    const bursarLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bursar@smartshule.ac.ke', password: 'Bursar@123' });
    expect(bursarLogin.status).toBe(200);
    bursarToken = bursarLogin.body.data.accessToken;

    // 4. Teacher login
    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;

    // 5. Parent login (unauthorized for inventory)
    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;
  });

  const getLedger = async () => {
    const res = await request(app)
      .get('/api/v1/finance/cashflow-ledger')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    return res.body.data;
  };

  // Shared test variables
  let testItemId: string;
  let testPurchaseRequestId: string;
  let selfPrId: string;
  let rejectPrId: string;
  let testInvoiceId: string;
  let initialBankOutflow: number;

  /**
   * Setup test item in stores catalog
   */
  it('0. Creates a consumable inventory item in the stores catalog with 0 initial stock', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        itemName: 'CBC Grade 4 Science Exercise Books (120 Pages)',
        category: 'STATIONERY',
        unit: 'Pieces',
        quantityInStock: 0,
        reorderLevel: 20,
        unitCost: 85,
        supplier: 'Apex Book Publishers Ltd',
        notes: 'Official CBC pupil record books'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testItemId = res.body.data.id;
    expect(res.body.data.quantityInStock).toBe(0);
    expect(res.body.data.isLowStock).toBe(true);
  });

  /**
   * Scenario 1: Purchase Request Creation Preserves Stock and Cash Invariants
   */
  it('Scenario 1: Creating a purchase request preserves inventory stock and school cash balances', async () => {
    const initialLedger = await getLedger();
    initialBankOutflow = initialLedger.accountBalances?.bank?.outflows || 0;

    const res = await request(app)
      .post('/api/v1/inventory/purchase-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        itemId: testItemId,
        quantityRequested: 100,
        estimatedUnitCost: 85,
        reason: 'Restocking Grade 4 science workbooks for Term 1 CBC activities',
        supplierName: 'Apex Book Publishers Ltd'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    testPurchaseRequestId = res.body.data.id;
    expect(res.body.data.requestNumber).toMatch(/^PR-\d{4}-\d{4}$/);
    expect(res.body.data.status).toBe('REQUESTED');
    expect(res.body.data.quantityRequested).toBe(100);
    expect(res.body.data.totalEstimatedCost).toBe(8500);
    expect(res.body.data.deliveredQuantity).toBe(0);
    expect(res.body.data.outstandingQuantity).toBe(100);

    // Invariant: Stock balance must remain 0
    const itemRes = await request(app)
      .get(`/api/v1/inventory/items/${testItemId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(itemRes.status).toBe(200);
    expect(itemRes.body.data.quantityInStock).toBe(0);

    // Invariant: Cash outflow must remain unchanged
    const afterLedger = await getLedger();
    const afterBankOutflow = afterLedger.accountBalances?.bank?.outflows || 0;
    expect(afterBankOutflow).toBe(initialBankOutflow);
  });

  /**
   * Scenario 2: Separation of Duties — Requester Cannot Approve Their Own Purchase Request
   */
  it('Scenario 2: Separation of duties blocks users from approving their own purchase requests', async () => {
    // Bursar creates a purchase request
    const prRes = await request(app)
      .post('/api/v1/inventory/purchase-requests')
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        itemId: testItemId,
        quantityRequested: 30,
        estimatedUnitCost: 85,
        reason: 'Bursar office supplementary request'
      });
    expect(prRes.status).toBe(201);
    selfPrId = prRes.body.data.id;

    // Bursar attempts to approve their own purchase request
    const approveRes = await request(app)
      .post(`/api/v1/inventory/purchase-requests/${selfPrId}/approve`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({ notes: 'Self approval attempt' });

    expect(approveRes.status).toBe(403);
    expect(approveRes.body.success).toBe(false);
    expect(approveRes.body.error?.message || approveRes.body.message).toContain('Separation of duties violation');

    // Verify status is still REQUESTED
    const checkRes = await request(app)
      .get(`/api/v1/inventory/purchase-requests/${selfPrId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.status).toBe('REQUESTED');
  });

  /**
   * Scenario 3: Rejection of Purchase Request Leaves Stock and Accounts Payable Unchanged
   */
  it('Scenario 3: Rejection of purchase request captures reason and prevents goods delivery', async () => {
    // Admin rejects the selfPrId
    const rejectRes = await request(app)
      .post(`/api/v1/inventory/purchase-requests/${selfPrId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Sufficient stationery already allocated for the month' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED');
    expect(rejectRes.body.data.rejectionReason).toContain('Sufficient stationery');

    // Attempting to receive goods against this rejected PR is blocked
    const grnRes = await request(app)
      .post('/api/v1/inventory/grn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseRequestId: selfPrId,
        quantityDelivered: 30,
        quantityAccepted: 30,
        quantityRejected: 0
      });

    expect(grnRes.status).toBe(400);
    expect(grnRes.body.error?.message || grnRes.body.message).toContain('rejected');
  });

  /**
   * Scenario 4: Purchase Request Approval by Authorized Officer does NOT Reduce Cash Balance
   */
  it('Scenario 4: Approved purchase request changes status but does NOT deduct cash balance', async () => {
    // Admin approves the teacher's PR (testPurchaseRequestId)
    const approveRes = await request(app)
      .post(`/api/v1/inventory/purchase-requests/${testPurchaseRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Approved for Term 1 CBC activities' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');
    expect(approveRes.body.data.approvedByName).toBeDefined();

    // Verify stock is still 0
    const itemRes = await request(app)
      .get(`/api/v1/inventory/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(itemRes.body.data.quantityInStock).toBe(0);

    // Verify cash flow ledger has no new outflow
    const ledger = await getLedger();
    const bankOutflow = ledger.accountBalances?.bank?.outflows || 0;
    expect(bankOutflow).toBe(initialBankOutflow);
  });

  /**
   * Scenario 5: Goods Received Note (GRN) with Partial Delivery — Only Accepted Quantities Enter Stock
   */
  it('Scenario 5: GRN partial delivery adds ONLY accepted quantities to stock on hand', async () => {
    // Supplier delivers 60 units: 50 accepted, 10 rejected due to damage
    const grnRes = await request(app)
      .post('/api/v1/inventory/grn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseRequestId: testPurchaseRequestId,
        quantityDelivered: 60,
        quantityAccepted: 50,
        quantityRejected: 10,
        rejectionReason: 'Damaged covers during transit',
        deliveryNoteRef: 'DN-APEX-9042',
        receivedDate: '2026-10-25',
        notes: 'First batch delivery'
      });

    expect(grnRes.status).toBe(201);
    expect(grnRes.body.success).toBe(true);
    expect(grnRes.body.data.grn.grnNumber).toMatch(/^GRN-\d{4}-\d{4}$/);
    expect(grnRes.body.data.grn.quantityAccepted).toBe(50);
    expect(grnRes.body.data.grn.quantityRejected).toBe(10);
    expect(grnRes.body.data.grn.deliveryStatus).toBe('PARTIAL');

    // Invariant: Stock balance is increased by EXACTLY accepted quantity (+50)
    expect(grnRes.body.data.item.quantityInStock).toBe(50);

    // Invariant: PR delivered quantity is 50, outstanding is 50, status PARTIALLY_DELIVERED
    expect(grnRes.body.data.purchaseRequest.deliveredQuantity).toBe(50);
    expect(grnRes.body.data.purchaseRequest.outstandingQuantity).toBe(50);
    expect(grnRes.body.data.purchaseRequest.status).toBe('PARTIALLY_DELIVERED');

    // Verify StockMovement audit log
    const movementsRes = await request(app)
      .get(`/api/v1/inventory/movements?itemId=${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(movementsRes.status).toBe(200);
    const grnMovement = movementsRes.body.data.find((m: any) => m.movementType === 'GOODS_RECEIVED');
    expect(grnMovement).toBeDefined();
    expect(grnMovement.quantity).toBe(50);
    expect(grnMovement.balanceBefore).toBe(0);
    expect(grnMovement.balanceAfter).toBe(50);
  });

  /**
   * Scenario 6: Over-Delivery Guard Safeguards Store Limits
   */
  it('Scenario 6: Attempting to accept more than the outstanding quantity is safely rejected', async () => {
    // Only 50 units remain outstanding. Supplier delivers 70 units.
    const overDeliveryRes = await request(app)
      .post('/api/v1/inventory/grn')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        purchaseRequestId: testPurchaseRequestId,
        quantityDelivered: 70,
        quantityAccepted: 70,
        quantityRejected: 0
      });

    expect(overDeliveryRes.status).toBe(400);
    expect(overDeliveryRes.body.error?.message || overDeliveryRes.body.message).toContain('exceeds remaining outstanding');

    // Item stock remains 50
    const itemRes = await request(app)
      .get(`/api/v1/inventory/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(itemRes.body.data.quantityInStock).toBe(50);
  });

  /**
   * Scenario 7: Supplier Invoice Recording Links to Purchase Order Without Premature Cash Deductions
   */
  it('Scenario 7: Recording a supplier invoice records accounts payable without deducting cash', async () => {
    // 50 books @ 85 = 4,250 KES
    const invRes = await request(app)
      .post('/api/v1/inventory/supplier-invoices')
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        supplierName: 'Apex Book Publishers Ltd',
        invoiceNumber: 'INV-2026-8801',
        purchaseRequestId: testPurchaseRequestId,
        invoiceDate: '2026-10-25',
        dueDate: '2026-11-25',
        totalAmount: 4250,
        taxAmount: 0,
        notes: 'Invoice for 50 accepted CBC Grade 4 science workbooks'
      });

    expect(invRes.status).toBe(201);
    expect(invRes.body.success).toBe(true);
    testInvoiceId = invRes.body.data.id;
    expect(invRes.body.data.paymentStatus).toBe('UNPAID');
    expect(invRes.body.data.totalAmount).toBe(4250);
    expect(invRes.body.data.amountPaid).toBe(0);
    expect(invRes.body.data.balance).toBe(4250);

    // Verify cash flow ledger has no cash outflow yet
    const ledger = await getLedger();
    const bankOutflow = ledger.accountBalances?.bank?.outflows || 0;
    expect(bankOutflow).toBe(initialBankOutflow);
  });

  /**
   * Scenario 8: Supplier Invoice Payment Processing Deducts Account Balance Exactly Once & Posts Expense Voucher
   */
  it('Scenario 8: Disbursing payment updates invoice to PAID, posts an Expense voucher, and deducts bank balance exactly once', async () => {
    const payRes = await request(app)
      .post(`/api/v1/inventory/supplier-invoices/${testInvoiceId}/pay`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: 4250,
        paymentMethod: 'BANK',
        fundingAccount: 'BANK',
        paymentReference: 'EFT-APEX-INV-8801',
        paymentDate: '2026-10-25',
        notes: 'Full payment via KCB Bank EFT'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.invoice.paymentStatus).toBe('PAID');
    expect(payRes.body.data.invoice.amountPaid).toBe(4250);
    expect(payRes.body.data.invoice.balance).toBe(0);
    expect(payRes.body.data.invoice.voucherNumber).toMatch(/^PV-INV-\d{4}-\d+$/);

    // Verify Expense voucher was saved in FeeRepository
    const expenseData = payRes.body.data.expense;
    expect(expenseData).toBeDefined();
    expect(expenseData.amount).toBe(4250);
    expect(expenseData.status).toBe('PAID');
    expect(expenseData.paymentReference).toBe('EFT-APEX-INV-8801');

    // Verify Cash Flow Ledger Bank Outflows incremented by EXACTLY 4,250
    const ledger = await getLedger();
    const bankOutflow = ledger.accountBalances?.bank?.outflows || 0;
    expect(bankOutflow).toBe(initialBankOutflow + 4250);
  });

  /**
   * Scenario 9: Duplicate Invoice and Duplicate Payment Reference Detection
   */
  it('Scenario 9: Rejects duplicate supplier invoices and duplicate transaction references with 409 Conflict', async () => {
    // 1. Duplicate invoice
    const dupeInvRes = await request(app)
      .post('/api/v1/inventory/supplier-invoices')
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        supplierName: 'Apex Book Publishers Ltd',
        invoiceNumber: 'INV-2026-8801', // Duplicate!
        invoiceDate: '2026-10-25',
        totalAmount: 4250
      });

    expect(dupeInvRes.status).toBe(409);
    expect(dupeInvRes.body.error?.message || dupeInvRes.body.message).toContain('already been recorded');

    // 2. Duplicate payment reference
    // Create new second invoice
    const inv2Res = await request(app)
      .post('/api/v1/inventory/supplier-invoices')
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        supplierName: 'Apex Book Publishers Ltd',
        invoiceNumber: 'INV-2026-8802',
        invoiceDate: '2026-10-25',
        totalAmount: 1500
      });
    expect(inv2Res.status).toBe(201);
    const inv2Id = inv2Res.body.data.id;

    // Disburse with existing payment reference 'EFT-APEX-INV-8801'
    const dupePayRes = await request(app)
      .post(`/api/v1/inventory/supplier-invoices/${inv2Id}/pay`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: 1500,
        paymentMethod: 'BANK',
        fundingAccount: 'BANK',
        paymentReference: 'EFT-APEX-INV-8801' // Duplicate!
      });

    expect(dupePayRes.status).toBe(409);
    expect(dupePayRes.body.error?.message || dupePayRes.body.message).toContain('already been recorded');
  });

  /**
   * Scenario 10: Unauthorized Stock Adjustments & Unauthorized Payment Disbursals Blocked by RBAC
   */
  it('Scenario 10: Enforces strict RBAC on stock adjustments, payments, and deletions', async () => {
    // Teacher cannot adjust stock count
    const teacherAdjustRes = await request(app)
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        itemId: testItemId,
        newQuantity: 100,
        reason: 'Unauthorized stock expansion'
      });
    expect(teacherAdjustRes.status).toBe(403);

    // Teacher cannot disburse supplier payment
    const teacherPayRes = await request(app)
      .post(`/api/v1/inventory/supplier-invoices/${testInvoiceId}/pay`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        amount: 500,
        paymentMethod: 'CASH',
        fundingAccount: 'CASH',
        paymentReference: 'CASH-999'
      });
    expect(teacherPayRes.status).toBe(403);

    // Parent cannot access inventory routes
    const parentRes = await request(app)
      .get('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${parentToken}`);
    expect([401, 403]).toContain(parentRes.status);
  });

  /**
   * Scenario 11: Authorized Stock Issue Deducts Inventory and Records Audit Movement
   */
  it('Scenario 11: Authorized stock issue decrements store balance and logs stock movement', async () => {
    // Stock is currently 50. Issue 15 units to Grade 4 East class teacher.
    const issueRes = await request(app)
      .post('/api/v1/inventory/issue')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        itemId: testItemId,
        quantity: 15,
        issuedTo: 'Grade 4 East Class (Teacher Mwangi)',
        purpose: 'Pupil distribution for term science project',
        reason: 'Term 1 science workbook assignment'
      });

    expect(issueRes.status).toBe(200);
    expect(issueRes.body.success).toBe(true);
    expect(issueRes.body.data.item.quantityInStock).toBe(35);
    expect(issueRes.body.data.movement.movementType).toBe('STOCK_ISSUE');
    expect(issueRes.body.data.movement.balanceBefore).toBe(50);
    expect(issueRes.body.data.movement.balanceAfter).toBe(35);

    // Attempting to issue more than remaining stock (35) is rejected
    const overIssueRes = await request(app)
      .post('/api/v1/inventory/issue')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        itemId: testItemId,
        quantity: 40,
        issuedTo: 'Grade 4 West',
        reason: 'Excess requisition'
      });

    expect(overIssueRes.status).toBe(400);
    expect(overIssueRes.body.error?.message || overIssueRes.body.message).toContain('Insufficient stock');
  });

  /**
   * Scenario 12: Supplier Payment Reversal Restores School Financial Account Balance and Cancels Voucher
   */
  it('Scenario 12: Reversing a supplier payment marks expense voucher REJECTED and restores bank balance', async () => {
    // Admin reverses payment for testInvoiceId
    const reverseRes = await request(app)
      .post(`/api/v1/inventory/supplier-invoices/${testInvoiceId}/reverse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Payment sent to incorrect supplier IBAN; EFT recalled by bank'
      });

    expect(reverseRes.status).toBe(200);
    expect(reverseRes.body.success).toBe(true);
    expect(reverseRes.body.data.invoice.paymentStatus).toBe('UNPAID');
    expect(reverseRes.body.data.invoice.amountPaid).toBe(0);
    expect(reverseRes.body.data.invoice.balance).toBe(4250);

    // Linked expense voucher is marked REJECTED
    expect(reverseRes.body.data.expense.status).toBe('REJECTED');

    // Financial Cash Flow Ledger Bank Outflows restored (decreased back to initialBankOutflow)
    const ledger = await getLedger();
    const bankOutflow = ledger.accountBalances?.bank?.outflows || 0;
    expect(bankOutflow).toBe(initialBankOutflow);
  });

  /**
   * Scenario 13: End-to-End Stock Ledger Mathematical Invariant Consistency
   */
  it('Scenario 13: Validates end-to-end stock balance mathematical invariants from movements', async () => {
    const itemRes = await request(app)
      .get(`/api/v1/inventory/items/${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(itemRes.status).toBe(200);
    const currentStock = itemRes.body.data.quantityInStock;

    // Movement history
    const movRes = await request(app)
      .get(`/api/v1/inventory/movements?itemId=${testItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(movRes.status).toBe(200);
    const movements = movRes.body.data;

    // Opening (0) + Goods Received (50) - Issue (15) = 35
    const totalReceived = movements
      .filter((m: any) => m.movementType === 'GOODS_RECEIVED')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    const totalIssued = movements
      .filter((m: any) => m.movementType === 'STOCK_ISSUE')
      .reduce((sum: number, m: any) => sum + m.quantity, 0);

    expect(totalReceived).toBe(50);
    expect(totalIssued).toBe(15);
    expect(totalReceived - totalIssued).toBe(currentStock);
    expect(currentStock).toBe(35);
  });

  /**
   * Scenario 14: Inventory Stats & Reports Agree With Underlying Records
   */
  it('Scenario 14: Inventory valuation and audit reports agree with physical stock and payable ledgers', async () => {
    const statsRes = await request(app)
      .get('/api/v1/inventory/stats')
      .set('Authorization', `Bearer ${bursarToken}`);

    expect(statsRes.status).toBe(200);
    const stats = statsRes.body.data;

    // Item valuation: 35 units * 85 KES = 2,975 KES
    expect(stats.totalSuppliesValue).toBeGreaterThanOrEqual(2975);
    expect(stats.unpaidInvoicesCount).toBeGreaterThanOrEqual(1);
    expect(stats.totalPayableBalance).toBeGreaterThanOrEqual(4250);

    // Reports endpoint
    const reportsRes = await request(app)
      .get('/api/v1/inventory/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.data.summary).toBeDefined();
    expect(reportsRes.body.data.recentMovements.length).toBeGreaterThanOrEqual(2);
    expect(reportsRes.body.data.unpaidInvoices.some((i: any) => i.id === testInvoiceId)).toBe(true);
  });
});
