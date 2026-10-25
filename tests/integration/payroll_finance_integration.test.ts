import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Payroll and School Finances Integration Audit', () => {
  let app: Express;
  let container: AppContainer;
  let superAdminToken: string;
  let bursarToken: string;
  let teacherToken: string;
  const testMonth = '2026-10';

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

    // 2. Bursar login
    const bursarLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bursar@smartshule.ac.ke', password: 'Bursar@123' });
    expect(bursarLogin.status).toBe(200);
    bursarToken = bursarLogin.body.data.accessToken;

    // 3. Teacher login (unauthorized for payroll approval and disbursement)
    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;
  });

  // Helper to fetch current cash flow ledger
  const getLedger = async () => {
    const res = await request(app)
      .get('/api/v1/finance/cashflow-ledger')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    return res.body.data;
  };

  /**
   * Scenario 1: Preparing payroll does NOT reduce available school account balance
   */
  let payrollRecord1Id: string;
  let initialLedger: any;

  it('Scenario 1: Preparing payroll creates a DRAFT record and does NOT reduce school available balance', async () => {
    initialLedger = await getLedger();
    const initialBankOut = initialLedger.accountBalances?.bank?.outflows || 0;
    const initialTotalMoneyOut = initialLedger.totalMoneyOut || 0;
    const initialBankBalance = initialLedger.accountBalances?.bank?.balance || 0;

    // Create a custom payroll record in DRAFT status
    const createRes = await request(app)
      .post('/api/v1/payroll/custom')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        teacherId: 'usr-teacher-01',
        teacherName: 'Sarah Mwangi',
        month: testMonth,
        basicSalary: 50000,
        houseAllowance: 15000,
        commuterAllowance: 5000,
        responsibilityAllowance: 0,
        otherDeductions: 0,
        applyPaye: true,
        applyShif: true,
        applyNssf: true,
        applyHousingLevy: true,
        notes: 'Monthly teacher payroll preparation'
      });

    expect([200, 201]).toContain(createRes.status);
    expect(createRes.body.success).toBe(true);
    payrollRecord1Id = createRes.body.data.id;
    expect(payrollRecord1Id).toBeDefined();
    expect(createRes.body.data.status).toBe('DRAFT');
    expect(createRes.body.data.netSalary).toBeGreaterThan(0);

    // Verify cash flow ledger has NOT changed at all
    const currentLedger = await getLedger();
    expect(currentLedger.accountBalances?.bank?.outflows || 0).toBe(initialBankOut);
    expect(currentLedger.totalMoneyOut || 0).toBe(initialTotalMoneyOut);
    expect(currentLedger.accountBalances?.bank?.balance || 0).toBe(initialBankBalance);
  });

  /**
   * Scenario 2: Approving payroll does NOT prematurely deduct salary
   */
  it('Scenario 2: Approving payroll transitions to APPROVED and does NOT deduct funds prematurely', async () => {
    const beforeApproveLedger = await getLedger();
    const bankOutBefore = beforeApproveLedger.accountBalances?.bank?.outflows || 0;
    const totalOutBefore = beforeApproveLedger.totalMoneyOut || 0;
    const bankBalBefore = beforeApproveLedger.accountBalances?.bank?.balance || 0;

    // Teacher cannot approve payroll
    const teacherApproveRes = await request(app)
      .patch(`/api/v1/payroll/${payrollRecord1Id}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(teacherApproveRes.status).toBe(403);

    // Super Admin approves payroll
    const approveRes = await request(app)
      .patch(`/api/v1/payroll/${payrollRecord1Id}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('APPROVED');
    expect(approveRes.body.data.approvedByUserId).toBeDefined();

    // Verify financial ledger is STILL unchanged (no cash outflow on approval)
    const afterApproveLedger = await getLedger();
    expect(afterApproveLedger.accountBalances?.bank?.outflows || 0).toBe(bankOutBefore);
    expect(afterApproveLedger.totalMoneyOut || 0).toBe(totalOutBefore);
    expect(afterApproveLedger.accountBalances?.bank?.balance || 0).toBe(bankBalBefore);
  });

  /**
   * Scenario 3: Successful payment reduces correct school account balance and creates Expense voucher
   */
  let record1NetSalary: number;
  let record1VoucherNumber: string;

  it('Scenario 3: Successful salary payment records expense, generates voucher, and reduces correct account balance', async () => {
    const beforePayLedger = await getLedger();
    const bankBefore = beforePayLedger.accountBalances?.bank?.balance || 0;
    const bankOutBefore = beforePayLedger.accountBalances?.bank?.outflows || 0;
    const totalOutBefore = beforePayLedger.totalMoneyOut || 0;

    // Fetch payroll record to get exact netSalary
    const getRes = await request(app)
      .get(`/api/v1/payroll/${payrollRecord1Id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(getRes.status).toBe(200);
    record1NetSalary = getRes.body.data.netSalary;
    expect(record1NetSalary).toBeGreaterThan(0);

    // Disburse payment via Bursar
    const disburseRes = await request(app)
      .post(`/api/v1/payroll/${payrollRecord1Id}/disburse`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: record1NetSalary,
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'KCB-EFT-992384',
        fundingAccount: 'BANK',
        paymentDate: '2026-10-25',
        notes: 'Disbursed October salary to Sarah Mwangi'
      });

    expect(disburseRes.status).toBe(200);
    expect(disburseRes.body.success).toBe(true);
    const updatedPayroll = disburseRes.body.data.payroll;
    expect(updatedPayroll.status).toBe('PAID');
    expect(updatedPayroll.amountPaid).toBe(record1NetSalary);
    expect(updatedPayroll.balance).toBe(0);
    expect(updatedPayroll.fundingAccount).toBe('BANK');
    record1VoucherNumber = updatedPayroll.voucherNumber;
    expect(record1VoucherNumber).toMatch(/^PV-SAL-/);

    // Verify linked expense in response
    const expense = disburseRes.body.data.expense;
    expect(expense).toBeDefined();
    expect(expense.category).toBe('SALARIES_WAGES');
    expect(expense.status).toBe('PAID');
    expect(expense.amount).toBe(record1NetSalary);
    expect(expense.voucherNumber).toBe(record1VoucherNumber);

    // Check financial cash flow ledger reflects the reduction
    const afterPayLedger = await getLedger();
    expect(afterPayLedger.accountBalances?.bank?.outflows || 0).toBe(bankOutBefore + record1NetSalary);
    expect(afterPayLedger.totalMoneyOut || 0).toBe(totalOutBefore + record1NetSalary);
    expect(afterPayLedger.accountBalances?.bank?.balance || 0).toBe(bankBefore - record1NetSalary);
  });

  /**
   * Scenario 4: Failed payments do NOT create completed expenses or deduct funds
   */
  it('Scenario 4: Invalid/unauthorized payment attempts are rejected and do not create expenses or deduct funds', async () => {
    const beforeFailLedger = await getLedger();

    // 1. Unapproved payroll cannot be disbursed
    const unapprovedPayrollRes = await request(app)
      .post('/api/v1/payroll/custom')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        teacherId: 'usr-teacher-02',
        teacherName: 'John Ochieng',
        month: testMonth,
        basicSalary: 45000,
        houseAllowance: 10000,
        commuterAllowance: 4000,
        responsibilityAllowance: 0,
        otherDeductions: 0,
        applyPaye: true,
        applyShif: true,
        applyNssf: true,
        applyHousingLevy: true
      });
    const unapprovedId = unapprovedPayrollRes.body.data.id;

    const prematurePayRes = await request(app)
      .post(`/api/v1/payroll/${unapprovedId}/disburse`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: 20000,
        paymentMethod: 'BANK_TRANSFER',
        fundingAccount: 'BANK',
        paymentReference: 'REF-PREMATURE'
      });
    expect(prematurePayRes.status).toBe(400);

    // 2. Unauthorized role (Teacher) cannot disburse
    const unauthorizedDisburse = await request(app)
      .post(`/api/v1/payroll/${unapprovedId}/disburse`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        amount: 10000,
        paymentMethod: 'CASH',
        fundingAccount: 'CASH',
        paymentReference: 'REF-UNAUTH'
      });
    expect(unauthorizedDisburse.status).toBe(403);

    // 3. Negative amount is rejected
    const approveUnapproved = await request(app)
      .patch(`/api/v1/payroll/${unapprovedId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(approveUnapproved.status).toBe(200);

    const negativeAmountRes = await request(app)
      .post(`/api/v1/payroll/${unapprovedId}/disburse`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: -5000,
        paymentMethod: 'BANK_TRANSFER',
        fundingAccount: 'BANK',
        paymentReference: 'REF-NEG'
      });
    expect(negativeAmountRes.status).toBe(400);

    // Verify cash flow ledger balances were NOT modified by failed attempts
    const afterFailLedger = await getLedger();
    expect(afterFailLedger.totalMoneyOut || 0).toBe(beforeFailLedger.totalMoneyOut || 0);
  });

  /**
   * Scenario 5: Duplicate submissions do NOT deduct twice
   */
  it('Scenario 5: Duplicate disbursements or reusing payment references are rejected', async () => {
    const beforeDupLedger = await getLedger();

    // 1. Attempt to pay already fully paid payroll record 1
    const secondPayRes = await request(app)
      .post(`/api/v1/payroll/${payrollRecord1Id}/disburse`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: 5000,
        paymentMethod: 'BANK_TRANSFER',
        fundingAccount: 'BANK',
        paymentReference: 'KCB-EFT-NEW'
      });
    expect([400, 409]).toContain(secondPayRes.status);

    // 2. Attempt to disburse another record using duplicate reference 'KCB-EFT-992384'
    // Create new approved payroll
    const prNewRes = await request(app)
      .post('/api/v1/payroll/custom')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        teacherId: 'usr-teacher-02',
        teacherName: 'John Ochieng',
        month: '2026-11',
        basicSalary: 30000,
        houseAllowance: 5000,
        commuterAllowance: 2000,
        responsibilityAllowance: 0,
        otherDeductions: 0,
        applyPaye: false,
        applyShif: false,
        applyNssf: false,
        applyHousingLevy: false
      });
    const prNewId = prNewRes.body.data.id;
    await request(app)
      .patch(`/api/v1/payroll/${prNewId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    const dupRefRes = await request(app)
      .post(`/api/v1/payroll/${prNewId}/disburse`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: 37000,
        paymentMethod: 'BANK_TRANSFER',
        fundingAccount: 'BANK',
        paymentReference: 'KCB-EFT-992384' // Duplicate reference from Scenario 3
      });
    expect([400, 409]).toContain(dupRefRes.status);
    expect(dupRefRes.body.message).toMatch(/already.*(recorded|used)|unique/i);

    // Verify ledger balance was not touched
    const afterDupLedger = await getLedger();
    expect(afterDupLedger.totalMoneyOut || 0).toBe(beforeDupLedger.totalMoneyOut || 0);
  });

  /**
   * Scenario 6: Partial payments reduce balance ONLY by amount paid
   */
  it('Scenario 6: Partial payments reduce account balance only by amount disbursed and track remaining balance', async () => {
    // Create & approve payroll record with net salary 50,000
    const prPartialRes = await request(app)
      .post('/api/v1/payroll/custom')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        teacherId: 'usr-teacher-01',
        teacherName: 'Sarah Mwangi',
        month: '2026-12',
        basicSalary: 50000,
        houseAllowance: 0,
        commuterAllowance: 0,
        responsibilityAllowance: 0,
        otherDeductions: 0,
        applyPaye: false,
        applyShif: false,
        applyNssf: false,
        applyHousingLevy: false
      });
    const prPartialId = prPartialRes.body.data.id;
    expect(prPartialRes.body.data.netSalary).toBe(50000);

    await request(app)
      .patch(`/api/v1/payroll/${prPartialId}/approve`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    const ledgerBeforePart1 = await getLedger();
    const mpesaOutBefore = ledgerBeforePart1.accountBalances?.mpesa?.outflows || 0;
    const mpesaBalBefore = ledgerBeforePart1.accountBalances?.mpesa?.balance || 0;

    // Disburse 1st installment: KES 20,000 via MPESA
    const part1Res = await request(app)
      .post(`/api/v1/payroll/${prPartialId}/disburse`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: 20000,
        paymentMethod: 'MPESA',
        fundingAccount: 'MPESA',
        paymentReference: 'MPESA-PRT-001',
        paymentDate: '2026-12-05'
      });

    expect(part1Res.status).toBe(200);
    const p1 = part1Res.body.data.payroll;
    expect(p1.status).toBe('PARTIALLY_PAID');
    expect(p1.amountPaid).toBe(20000);
    expect(p1.balance).toBe(30000);

    // Verify MPESA outflow increased by ONLY 20,000 (not 50,000)
    const ledgerAfterPart1 = await getLedger();
    expect(ledgerAfterPart1.accountBalances?.mpesa?.outflows || 0).toBe(mpesaOutBefore + 20000);
    expect(ledgerAfterPart1.accountBalances?.mpesa?.balance || 0).toBe(mpesaBalBefore - 20000);

    // Disburse 2nd installment: KES 30,000 (remaining balance)
    const part2Res = await request(app)
      .post(`/api/v1/payroll/${prPartialId}/disburse`)
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        amount: 30000,
        paymentMethod: 'MPESA',
        fundingAccount: 'MPESA',
        paymentReference: 'MPESA-PRT-002',
        paymentDate: '2026-12-20'
      });

    expect(part2Res.status).toBe(200);
    const p2 = part2Res.body.data.payroll;
    expect(p2.status).toBe('PAID');
    expect(p2.amountPaid).toBe(50000);
    expect(p2.balance).toBe(0);

    // Total MPESA outflow increased by additional 30,000 (total 50,000)
    const ledgerAfterPart2 = await getLedger();
    expect(ledgerAfterPart2.accountBalances?.mpesa?.outflows || 0).toBe(mpesaOutBefore + 50000);
    expect(ledgerAfterPart2.accountBalances?.mpesa?.balance || 0).toBe(mpesaBalBefore - 50000);
  });

  /**
   * Scenario 7: Bulk payroll totals agree with individual records and ledger deductions
   */
  it('Scenario 7: Bulk payroll batch payment deducts exact aggregate total and updates each individual record', async () => {
    const batchMonth = '2027-01';

    // Create 3 payroll records for batchMonth
    const r1 = await request(app)
      .post('/api/v1/payroll/custom')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        teacherId: 'usr-teacher-01',
        teacherName: 'Teacher Alpha',
        month: batchMonth,
        basicSalary: 30000,
        houseAllowance: 0,
        commuterAllowance: 0,
        responsibilityAllowance: 0,
        otherDeductions: 0,
        applyPaye: false,
        applyShif: false,
        applyNssf: false,
        applyHousingLevy: false
      });
    const r2 = await request(app)
      .post('/api/v1/payroll/custom')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        teacherId: 'usr-teacher-02',
        teacherName: 'Teacher Beta',
        month: batchMonth,
        basicSalary: 40000,
        houseAllowance: 0,
        commuterAllowance: 0,
        responsibilityAllowance: 0,
        otherDeductions: 0,
        applyPaye: false,
        applyShif: false,
        applyNssf: false,
        applyHousingLevy: false
      });
    const r3 = await request(app)
      .post('/api/v1/payroll/custom')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        teacherId: 'usr-teacher-03',
        teacherName: 'Teacher Gamma',
        month: batchMonth,
        basicSalary: 50000,
        houseAllowance: 0,
        commuterAllowance: 0,
        responsibilityAllowance: 0,
        otherDeductions: 0,
        applyPaye: false,
        applyShif: false,
        applyNssf: false,
        applyHousingLevy: false
      });

    const id1 = r1.body.data.id;
    const id2 = r2.body.data.id;
    const id3 = r3.body.data.id;

    // Approve all 3
    await request(app).patch(`/api/v1/payroll/${id1}/approve`).set('Authorization', `Bearer ${superAdminToken}`);
    await request(app).patch(`/api/v1/payroll/${id2}/approve`).set('Authorization', `Bearer ${superAdminToken}`);
    await request(app).patch(`/api/v1/payroll/${id3}/approve`).set('Authorization', `Bearer ${superAdminToken}`);

    const expectedBatchTotal = 30000 + 40000 + 50000; // 120,000

    const ledgerBeforeBatch = await getLedger();
    const bankOutBefore = ledgerBeforeBatch.accountBalances?.bank?.outflows || 0;
    const bankBalBefore = ledgerBeforeBatch.accountBalances?.bank?.balance || 0;

    // Execute bulk pay
    const batchPayRes = await request(app)
      .post('/api/v1/payroll/batch/pay')
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        month: batchMonth,
        paymentMethod: 'BANK_TRANSFER',
        batchReference: 'BATCH-JAN27',
        paymentDate: '2027-01-30',
        fundingAccount: 'BANK',
        notes: 'January 2027 faculty bulk payment'
      });

    expect(batchPayRes.status).toBe(200);
    expect(batchPayRes.body.success).toBe(true);
    expect(batchPayRes.body.data.count).toBe(3);
    expect(batchPayRes.body.data.totalDisbursed).toBe(expectedBatchTotal);

    // Verify all 3 individual records are PAID with unique vouchers
    const rec1 = (await request(app).get(`/api/v1/payroll/${id1}`).set('Authorization', `Bearer ${superAdminToken}`)).body.data;
    const rec2 = (await request(app).get(`/api/v1/payroll/${id2}`).set('Authorization', `Bearer ${superAdminToken}`)).body.data;
    const rec3 = (await request(app).get(`/api/v1/payroll/${id3}`).set('Authorization', `Bearer ${superAdminToken}`)).body.data;

    expect(rec1.status).toBe('PAID');
    expect(rec2.status).toBe('PAID');
    expect(rec3.status).toBe('PAID');
    expect(rec1.amountPaid).toBe(30000);
    expect(rec2.amountPaid).toBe(40000);
    expect(rec3.amountPaid).toBe(50000);
    expect(rec1.voucherNumber).toBeDefined();
    expect(rec2.voucherNumber).toBeDefined();
    expect(rec3.voucherNumber).toBeDefined();
    expect(new Set([rec1.voucherNumber, rec2.voucherNumber, rec3.voucherNumber]).size).toBe(3);

    // Check financial cash flow ledger reflects exactly 120,000 deduction
    const ledgerAfterBatch = await getLedger();
    expect(ledgerAfterBatch.accountBalances?.bank?.outflows || 0).toBe(bankOutBefore + expectedBatchTotal);
    expect(ledgerAfterBatch.accountBalances?.bank?.balance || 0).toBe(bankBalBefore - expectedBatchTotal);
  });

  /**
   * Scenario 8: Reversals recorded correctly without deleting historical records
   */
  it('Scenario 8: Reversing salary payment restores account balance and cancels expense without deleting records', async () => {
    // We reverse payrollRecord1Id from Scenario 3
    const ledgerBeforeReverse = await getLedger();
    const bankOutBefore = ledgerBeforeReverse.accountBalances?.bank?.outflows || 0;
    const bankBalBefore = ledgerBeforeReverse.accountBalances?.bank?.balance || 0;

    const reverseRes = await request(app)
      .post(`/api/v1/payroll/${payrollRecord1Id}/reverse`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        reason: 'Incorrect bank account number entered; disbursal refunded by bank'
      });

    expect(reverseRes.status).toBe(200);
    expect(reverseRes.body.success).toBe(true);
    const reversedPayroll = reverseRes.body.data.payroll;
    expect(reversedPayroll.status).toBe('APPROVED'); // Reverts to APPROVED ready for correction
    expect(reversedPayroll.balance).toBe(record1NetSalary);
    expect(reversedPayroll.amountPaid).toBe(0);
    expect(reversedPayroll.reversalReason).toMatch(/Incorrect bank account/);
    expect(reversedPayroll.reversedAt).toBeDefined();

    // Verify historical record still exists in database
    const verifyGet = await request(app)
      .get(`/api/v1/payroll/${payrollRecord1Id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(verifyGet.status).toBe(200);
    expect(verifyGet.body.data.id).toBe(payrollRecord1Id);

    // Verify linked expense voucher status changed to REJECTED (cancelled, not deleted)
    const cancelledExpense = reverseRes.body.data.expense;
    expect(cancelledExpense.status).toBe('REJECTED');
    expect(cancelledExpense.voucherNumber).toBe(record1VoucherNumber);

    // Verify school account balance is restored
    const ledgerAfterReverse = await getLedger();
    expect(ledgerAfterReverse.accountBalances?.bank?.outflows || 0).toBe(bankOutBefore - record1NetSalary);
    expect(ledgerAfterReverse.accountBalances?.bank?.balance || 0).toBe(bankBalBefore + record1NetSalary);
  });

  /**
   * Scenario 9: Finance dashboards and reports reflect payroll transactions and reconciliation
   */
  it('Scenario 9: Reconciliation endpoint computes 0 variance between payroll disbursements and financial outflow expenses', async () => {
    const reconRes = await request(app)
      .get('/api/v1/payroll/reconciliation?month=2027-01')
      .set('Authorization', `Bearer ${bursarToken}`);

    expect(reconRes.status).toBe(200);
    expect(reconRes.body.success).toBe(true);
    const recon = reconRes.body.data;
    expect(recon.month).toBe('2027-01');
    expect(recon.totalDisbursedSalaries).toBe(120000);
    expect(recon.totalFinancialExpenseAmount).toBe(120000);
    expect(recon.variance).toBe(0);
    expect(recon.isReconciled).toBe(true);
  });

  /**
   * Scenario 10: Existing manual student-fee payment recording remains correct
   */
  it('Scenario 10: Student fee payment recording functions correctly and harmoniously alongside payroll disbursements', async () => {
    const ledgerBeforeFee = await getLedger();
    const moneyInBefore = ledgerBeforeFee.totalMoneyIn || 0;
    const bankInBefore = ledgerBeforeFee.accountBalances?.bank?.inflows || 0;
    const bankBalBefore = ledgerBeforeFee.accountBalances?.bank?.balance || 0;

    // Record fee payment of KES 15,000 against fixture invoice 'inv-student-001'
    const feePayRes = await request(app)
      .post('/api/v1/finance/payments')
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({
        schoolId: 'school-001',
        invoiceId: 'inv-student-001',
        amount: 15000,
        paymentMethod: 'BANK_DEPOSIT',
        transactionReference: `FEE-DEP-${Date.now()}`
      });

    expect([200, 201]).toContain(feePayRes.status);
    expect(feePayRes.body.success).toBe(true);
    expect(feePayRes.body.data.payment?.receiptNumber).toBeDefined();

    // Verify cash flow ledger reflects the fee inflow
    const ledgerAfterFee = await getLedger();
    expect(ledgerAfterFee.totalMoneyIn || 0).toBe(moneyInBefore + 15000);
    expect(ledgerAfterFee.accountBalances?.bank?.inflows || 0).toBe(bankInBefore + 15000);
    expect(ledgerAfterFee.accountBalances?.bank?.balance || 0).toBe(bankBalBefore + 15000);
  });
});
