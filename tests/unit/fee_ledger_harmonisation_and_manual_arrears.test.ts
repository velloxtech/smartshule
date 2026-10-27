import {
  FeeStructure,
  PaymentMethod,
  PaymentStatus,
  StudentInvoice,
  InvoiceStatus
} from '../../src/core/domain/finance/Fee';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
import {
  InMemoryFeeRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ConflictError, ForbiddenError } from '../../src/core/domain/shared/Errors';

describe('Fee Ledger Harmonisation & Manual Arrears Unit Tests (Cases 1 - 10)', () => {
  let feeRepo: InMemoryFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let feeUseCases: FeeUseCases;

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const term1Id = 'term-2026-t1';
  const term2Id = 'term-2026-t2';
  const term3Id = 'term-2026-t3';

  const bursarUserContext = {
    userId: 'usr-bursar-1',
    role: UserRole.BURSAR,
    schoolId
  };

  const teacherUserContext = {
    userId: 'usr-teacher-1',
    role: UserRole.TEACHER,
    schoolId
  };

  beforeEach(async () => {
    feeRepo = new InMemoryFeeRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();

    const mockNotificationService = {
      sendSms: async () => true,
      sendBulkSms: async () => ({ success: true, successfulCount: 0, failedCount: 0, messageIds: [] }),
      sendTemplateSms: async () => true,
    };

    const mockPaymentGateway = {
      processPayment: async () => ({ success: true, transactionId: 'TX-TEST' }),
      verifyPayment: async () => true,
    };

    feeUseCases = new FeeUseCases(
      feeRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      mockPaymentGateway as any,
      mockNotificationService as any,
      academicRepo
    );

    // Setup Academic Context (2026, Term 1, Term 2, Term 3)
    const year = AcademicYear.create(
      { name: '2026', startDate: '2026-01-05', endDate: '2026-11-20', isCurrent: true, schoolId },
      academicYearId
    );
    await academicRepo.saveYear(year);

    const term1 = AcademicTerm.create({ academicYearId, termNumber: 1, name: 'Term 1', startDate: '2026-01-05', endDate: '2026-04-03', isCurrent: false }, term1Id);
    const term2 = AcademicTerm.create({ academicYearId, termNumber: 2, name: 'Term 2', startDate: '2026-05-04', endDate: '2026-08-07', isCurrent: false }, term2Id);
    const term3 = AcademicTerm.create({ academicYearId, termNumber: 3, name: 'Term 3', startDate: '2026-08-31', endDate: '2026-11-20', isCurrent: true }, term3Id);
    await academicRepo.saveTerm(term1);
    await academicRepo.saveTerm(term2);
    await academicRepo.saveTerm(term3);

    // Setup Bursar User
    const bursar = User.create(
      {
        email: 'bursar@smartshule.ac.ke',
        passwordHash: 'hash',
        role: UserRole.BURSAR,
        status: UserStatus.ACTIVE,
        firstName: 'Jane',
        lastName: 'Bursar',
        schoolId
      },
      'usr-bursar-1'
    );
    await userRepo.save(bursar);
  });

  const createTestStudent = async (id: string, admNo: string, name: string): Promise<Student> => {
    const student = Student.create(
      {
        admissionNumber: admNo,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || 'Learner',
        dateOfBirth: '2019-03-12',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        schoolId,
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      id
    );
    await studentRepo.save(student);
    return student;
  };

  /**
   * CASE 1: No arrears
   * - Current-term charges: KSh 4,500
   * - Previous balance: KSh 0
   * - Payments: KSh 4,500
   * - Expected outstanding balance: KSh 0
   * - Expected status: Fees Cleared
   */
  test('Case 1: No arrears - charges 4,500, paid 4,500 -> balance 0, Fees Cleared', async () => {
    const student = await createTestStudent('st-c1', 'ADM-C1', 'Faith Wanjiku');

    // Create current term invoice: 4,500
    const inv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-001',
        items: [{ id: 'item-1', name: 'Term Tuition', amount: 4500, category: 'TUITION', isOptional: false }],
        amountBilled: 4500,
        discountAmount: 0,
        amountPayable: 4500,
        amountPaid: 0,
        balance: 4500,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-10-30'
      },
      'inv-c1'
    );
    await feeRepo.saveInvoice(inv);

    // Pay full 4,500
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: inv.id,
      amount: 4500,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MP-CASE1',
      paymentDate: '2026-09-10',
      recordedByUserId: 'usr-bursar-1'
    });

    const pos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(pos.financialPosition.feesThisTerm).toBe(4500);
    expect(pos.financialPosition.previousBalance).toBe(0);
    expect(pos.financialPosition.totalPaid).toBe(4500);
    expect(pos.financialPosition.outstandingBalance).toBe(0);
    expect(pos.financialPosition.status).toBe('CLEARED');
    expect(pos.financialPosition.statusLabel).toBe('Fees Cleared');
  });

  /**
   * CASE 2: Existing arrears
   * - Current-term charges: KSh 4,500
   * - Previous balance: KSh 1,000
   * - Payments: KSh 4,000
   * - Expected outstanding balance: KSh 1,500
   */
  test('Case 2: Existing arrears - charges 4,500, prior 1,000, paid 4,000 -> balance 1,500', async () => {
    const student = await createTestStudent('st-c2', 'ADM-C2', 'David Kimani');

    // Prior term invoice: 1,000 balance
    const priorInv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term2Id,
        invoiceNumber: 'INV-2026-PRIOR',
        items: [{ id: 'item-p', name: 'Term 2 Balance', amount: 1000, category: 'TUITION', isOptional: false }],
        amountBilled: 1000,
        discountAmount: 0,
        amountPayable: 1000,
        amountPaid: 0,
        balance: 1000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-06-30'
      },
      'inv-c2-prior'
    );
    await feeRepo.saveInvoice(priorInv);

    // Current term invoice: 4,500
    const currentInv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-CURR',
        items: [{ id: 'item-c', name: 'Term 3 Tuition', amount: 4500, category: 'TUITION', isOptional: false }],
        amountBilled: 4500,
        discountAmount: 0,
        amountPayable: 4500,
        amountPaid: 0,
        balance: 4500,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-10-30'
      },
      'inv-c2-curr'
    );
    await feeRepo.saveInvoice(currentInv);

    // Pay 4,000 towards current term
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: currentInv.id,
      amount: 4000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MP-CASE2',
      paymentDate: '2026-09-15',
      recordedByUserId: 'usr-bursar-1'
    });

    const pos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(pos.financialPosition.feesThisTerm).toBe(4500);
    expect(pos.financialPosition.previousBalance).toBe(1000);
    expect(pos.financialPosition.totalPaid).toBe(4000);
    expect(pos.financialPosition.outstandingBalance).toBe(1500);
    expect(pos.financialPosition.status).toBe('PARTIAL');
  });

  /**
   * CASE 3: Manually recorded arrears
   * - Existing outstanding balance: KSh 0
   * - Authorised manual arrears entry: KSh 1,000
   * - Expected updated outstanding balance: KSh 1,000
   */
  test('Case 3: Manually recorded arrears - initial balance 0 -> add 1,000 arrears -> updated balance 1,000', async () => {
    const student = await createTestStudent('st-c3', 'ADM-C3', 'Tania Cherotich');

    // Currently cleared: 0 balance
    const initialPos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(initialPos.financialPosition.outstandingBalance).toBe(0);

    // Authorised cashier records 1,000 arrears
    const arrearsRes = await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 1000,
        academicYearId: 'year-2025',
        termId: 'term-2025-t3',
        reason: 'Outstanding fees from previous term',
        source: 'Verified school records',
        mode: 'ADD'
      },
      bursarUserContext
    );

    expect(arrearsRes.success).toBe(true);
    expect(arrearsRes.invoiceNumber).toMatch(/^INV-ARR-/);

    // Immediately verify updated fee position
    const updatedPos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(updatedPos.financialPosition.previousBalance).toBe(1000);
    expect(updatedPos.financialPosition.outstandingBalance).toBe(1000);
    expect(updatedPos.financialPosition.status).toBe('ARREARS');
  });

  /**
   * CASE 4: Duplicate arrears attempt
   * - An arrears entry already exists.
   * - The user attempts to enter the same source debt again.
   * - Expected result: ConflictError duplicate warning; no additional debt is created.
   * - When explicitly confirmed (confirmDuplicate: true), legitimate entry is permitted.
   */
  test('Case 4: Duplicate arrears attempt - rejects unconfirmed duplicate, prevents double counting', async () => {
    const student = await createTestStudent('st-c4', 'ADM-C4', 'Brian Kiprop');

    // 1. Initial arrears entry: 1,000
    await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 1000,
        academicYearId: 'year-2025',
        termId: 'term-2025-t3',
        reason: 'Outstanding boarding balance',
        source: 'Verified school records',
        mode: 'ADD'
      },
      bursarUserContext
    );

    // 2. Duplicate attempt with identical amount, period, and reason without confirmation
    await expect(
      feeUseCases.addOrUpdateManualArrear(
        {
          studentId: student.id,
          amount: 1000,
          academicYearId: 'year-2025',
          termId: 'term-2025-t3',
          reason: 'Outstanding boarding balance',
          source: 'Verified school records',
          mode: 'ADD'
        },
        bursarUserContext
      )
    ).rejects.toThrow(ConflictError);

    // Verify balance was NOT doubled
    const posAfterRejected = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(posAfterRejected.financialPosition.previousBalance).toBe(1000);
    expect(posAfterRejected.financialPosition.outstandingBalance).toBe(1000);

    // 3. With explicit confirmation, separate legitimate arrears can be added
    const confirmedRes = await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 1000,
        academicYearId: 'year-2025',
        termId: 'term-2025-t3',
        reason: 'Outstanding transport balance',
        source: 'Verified school records',
        mode: 'ADD',
        confirmDuplicate: true
      },
      bursarUserContext
    );
    expect(confirmedRes.success).toBe(true);

    const posAfterConfirmed = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(posAfterConfirmed.financialPosition.previousBalance).toBe(2000);
    expect(posAfterConfirmed.financialPosition.outstandingBalance).toBe(2000);
  });

  /**
   * CASE 5: Payment settles all debt
   * - Existing outstanding balance: KSh 1,000
   * - Valid payment allocated: KSh 1,000
   * - Expected outstanding balance: KSh 0
   * - Expected status: Fees Cleared / Fully Cleared
   */
  test('Case 5: Payment settles all debt - balance 1,000 -> pay 1,000 -> balance 0, Fees Cleared', async () => {
    const student = await createTestStudent('st-c5', 'ADM-C5', 'Mercy Chebet');

    // Add 1,000 arrears
    const arrRes = await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 1000,
        academicYearId: 'year-2025',
        termId: 'term-2025-t3',
        reason: 'Historical tuition balance',
        mode: 'ADD'
      },
      bursarUserContext
    );

    // Verify balance is 1,000
    const posBefore = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(posBefore.financialPosition.outstandingBalance).toBe(1000);

    // Record payment of 1,000 towards the arrears
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: arrRes.invoiceId,
      amount: 1000,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: '2026-09-20',
      recordedByUserId: 'usr-bursar-1'
    });

    const posAfter = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(posAfter.financialPosition.previousBalance).toBe(0);
    expect(posAfter.financialPosition.outstandingBalance).toBe(0);
    expect(posAfter.financialPosition.status).toBe('CLEARED');
    expect(posAfter.financialPosition.statusLabel).toBe('Fees Cleared');
  });

  /**
   * CASE 6: Current term paid, arrears remain
   * - Previous arrears: KSh 1,000
   * - Current-term fees: KSh 4,500
   * - Current-term payment: KSh 4,500
   * - Expected current-term status: Paid
   * - Expected overall account status: KSh 1,000 outstanding, NEVER "Fees Cleared"
   */
  test('Case 6: Current term paid, arrears remain - NEVER mark as Fees Cleared', async () => {
    const student = await createTestStudent('st-c6', 'ADM-C6', 'Kevin Omondi');

    // 1. Prior arrears of 1,000
    await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 1000,
        academicYearId: 'year-2025',
        termId: 'term-2025-t3',
        reason: 'Prior Year Unpaid Arrears',
        mode: 'ADD'
      },
      bursarUserContext
    );

    // 2. Current term invoice of 4,500
    const currentInv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-C6',
        items: [{ id: 'item-t3', name: 'Term 3 Tuition', amount: 4500, category: 'TUITION', isOptional: false }],
        amountBilled: 4500,
        discountAmount: 0,
        amountPayable: 4500,
        amountPaid: 0,
        balance: 4500,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-10-30'
      },
      'inv-c6-curr'
    );
    await feeRepo.saveInvoice(currentInv);

    // 3. Pay exactly 4,500 towards current term invoice
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: currentInv.id,
      amount: 4500,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MP-CASE6',
      paymentDate: '2026-09-22',
      recordedByUserId: 'usr-bursar-1'
    });

    const pos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });

    // Current term invoice is fully paid
    expect(currentInv.balance).toBe(0);
    expect(pos.financialPosition.feesThisTerm).toBe(4500);
    expect(pos.financialPosition.previousBalance).toBe(1000);
    expect(pos.financialPosition.totalPaid).toBe(4500);

    // Overall outstanding balance is 1,000
    expect(pos.financialPosition.outstandingBalance).toBe(1000);

    // Must NOT be Fees Cleared!
    expect(pos.financialPosition.status).not.toBe('CLEARED');
    expect(pos.financialPosition.statusLabel).toBe('Current Term Cleared, Arrears Remain');
  });

  /**
   * CASE 7: Multiple terms allocation
   * - Verify payments and arrears are allocated to correct periods without double-counting.
   */
  test('Case 7: Multiple terms - allocations preserve term boundaries without double counting', async () => {
    const student = await createTestStudent('st-c7', 'ADM-C7', 'Grace Achieng');

    // Term 1 invoice: 3,000
    const inv1 = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term1Id,
        invoiceNumber: 'INV-T1',
        items: [{ id: 'it-1', name: 'Term 1 Fee', amount: 3000, category: 'TUITION', isOptional: false }],
        amountBilled: 3000,
        discountAmount: 0,
        amountPayable: 3000,
        amountPaid: 0,
        balance: 3000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-03-30'
      },
      'inv-t1'
    );
    await feeRepo.saveInvoice(inv1);

    // Term 2 invoice: 4,000
    const inv2 = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term2Id,
        invoiceNumber: 'INV-T2',
        items: [{ id: 'it-2', name: 'Term 2 Fee', amount: 4000, category: 'TUITION', isOptional: false }],
        amountBilled: 4000,
        discountAmount: 0,
        amountPayable: 4000,
        amountPaid: 0,
        balance: 4000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-07-30'
      },
      'inv-t2'
    );
    await feeRepo.saveInvoice(inv2);

    // Payment of 3,000 to settle Term 1
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: inv1.id,
      amount: 3000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'BK-T1',
      paymentDate: '2026-02-15',
      recordedByUserId: 'usr-bursar-1'
    });

    // Check Term 1 position
    const posT1 = await feeUseCases.getLearnerFeePosition(student.id, { termId: term1Id });
    expect(posT1.financialPosition.feesThisTerm).toBe(3000);
    expect(posT1.financialPosition.totalPaid).toBe(3000);
    expect(posT1.financialPosition.outstandingBalance).toBe(4000); // T2 remains unpaid
    expect(posT1.financialPosition.previousBalance).toBe(4000);

    // Check Term 2 position
    const posT2 = await feeUseCases.getLearnerFeePosition(student.id, { termId: term2Id });
    expect(posT2.financialPosition.feesThisTerm).toBe(4000);
    expect(posT2.financialPosition.previousBalance).toBe(0); // T1 was cleared
    expect(posT2.financialPosition.outstandingBalance).toBe(4000);
  });

  /**
   * CASE 8: Consistency across pages
   * - Compare getLearnerFeePosition, getStudentFeeAccounts, and getArrearsSummary
   * - All figures and statuses must reconcile identically.
   */
  test('Case 8: Consistency across pages - fee-position, fee-accounts, and arrears summary agree', async () => {
    const student = await createTestStudent('st-c8', 'ADM-C8', 'Samuel Mutua');

    // Add 2,500 arrears
    await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 2500,
        academicYearId: 'year-2025',
        termId: 'term-2025-t3',
        reason: 'Consolidated Prior Arrears',
        mode: 'ADD'
      },
      bursarUserContext
    );

    // Add Term 3 invoice: 5,000
    const inv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-C8-T3',
        items: [{ id: 'it-c8', name: 'Term 3 Charges', amount: 5000, category: 'TUITION', isOptional: false }],
        amountBilled: 5000,
        discountAmount: 0,
        amountPayable: 5000,
        amountPaid: 0,
        balance: 5000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-10-30'
      },
      'inv-c8'
    );
    await feeRepo.saveInvoice(inv);

    // Record partial payment: 3,000
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: inv.id,
      amount: 3000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MP-C8',
      paymentDate: '2026-09-25',
      recordedByUserId: 'usr-bursar-1'
    });

    // 1. Fee Position Desk API
    const pos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    const posNetBalance = pos.financialPosition.outstandingBalance;

    // 2. Student Fee Accounts (Full Ledger Table) API
    const accountsRes = await feeUseCases.getStudentFeeAccounts({
      schoolId,
      termId: term3Id,
      academicYearId
    });
    const stAccount = accountsRes.accounts.find(a => a.studentId === student.id);

    // 3. Arrears Summary API
    const arrearsSummary = await feeUseCases.getArrearsSummary(schoolId);
    const learnerArrear = arrearsSummary.learners.find(l => l.id === student.id);

    // Reconcile across all 3 backend endpoints
    expect(posNetBalance).toBe(4500); // (5000 + 2500 - 3000)
    expect(stAccount?.balance).toBe(4500);
    expect(learnerArrear?.feeBalance).toBe(4500);
    expect(stAccount?.status).toBe('PARTIAL');
    expect(pos.financialPosition.status).toBe('PARTIAL');
  });

  /**
   * CASE 9: Authorisation
   * - Unauthorised users (e.g. Teacher, Parent, Student) cannot record arrears.
   */
  test('Case 9: Authorisation - unauthorized users cannot record manual arrears', async () => {
    const student = await createTestStudent('st-c9', 'ADM-C9', 'Hassan Ali');

    await expect(
      feeUseCases.addOrUpdateManualArrear(
        {
          studentId: student.id,
          amount: 1500,
          reason: 'Unauthorized attempt',
          mode: 'ADD'
        },
        teacherUserContext
      )
    ).rejects.toThrow(ForbiddenError);
  });

  /**
   * CASE 10: Reversals and credits
   * - Authorised payment reversal updates balance correctly and preserves audit history.
   */
  test('Case 10: Reversals and credits - payment reversal restores balance and preserves audit trail', async () => {
    const student = await createTestStudent('st-c10', 'ADM-C10', 'Joy Muthoni');

    // Create invoice: 2,000
    const inv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-g1',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-C10',
        items: [{ id: 'it-c10', name: 'Tuition', amount: 2000, category: 'TUITION', isOptional: false }],
        amountBilled: 2000,
        discountAmount: 0,
        amountPayable: 2000,
        amountPaid: 0,
        balance: 2000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-10-30'
      },
      'inv-c10'
    );
    await feeRepo.saveInvoice(inv);

    // Record payment of 2,000
    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: inv.id,
      amount: 2000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MP-REVERSE-TEST',
      paymentDate: '2026-09-28',
      recordedByUserId: 'usr-bursar-1'
    });

    const paymentId = payRes.payment.id;

    // Verify balance is 0 before reversal
    const posBefore = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(posBefore.financialPosition.outstandingBalance).toBe(0);

    // Authorised Bursar reverses payment
    const revRes = await feeUseCases.reversePayment(
      paymentId,
      'Bank chargeback / Cheque returned unpaid',
      bursarUserContext
    );

    expect(revRes.success).toBe(true);
    expect(revRes.payment.status).toBe(PaymentStatus.REVERSED);
    expect(revRes.payment.notes).toContain('Cheque returned unpaid');

    // Verify balance is restored to 2,000
    const posAfter = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id });
    expect(posAfter.financialPosition.outstandingBalance).toBe(2000);
    expect(posAfter.financialPosition.status).toBe('ARREARS');
  });

  it('Case 11: Foreign key constraint resolution - maps raw year numbers and term aliases to valid IDs', async () => {
    const student = await createTestStudent('std-fk-001', 'PP1-088', 'FK Learner');

    // 1. addOrUpdateManualArrear with raw year "2026" and alias "term-3"
    const arrearRes1 = await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 3500,
        reason: 'Unpaid prior transport fee',
        academicYearId: '2026', // Raw year number as sent by UI
        termId: 'term-3',       // Alias as sent by UI dropdown
        source: 'Director verified records',
        mode: 'ADD'
      },
      bursarUserContext
    );

    expect(arrearRes1.success).toBe(true);
    // Verified that invoice has resolved valid foreign keys matching academic_years(id) and academic_terms(id)
    expect(arrearRes1.invoice.academicYearId).toBe('year-2026');
    expect(arrearRes1.invoice.termId).toBe('term-2026-t3');
    expect(arrearRes1.invoice.amountBilled).toBe(3500);

    // 2. addOrUpdateManualArrear with historical year "2025" and alias "term-1"
    const arrearRes2 = await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 1500,
        reason: 'Historical balance 2025',
        academicYearId: '2025',
        termId: 'term-1',
        source: 'Opening ledger audit',
        mode: 'ADD',
        allowDuplicate: true
      },
      bursarUserContext
    );

    expect(arrearRes2.success).toBe(true);
    expect(arrearRes2.invoice.academicYearId).toBe('year-2025');
    expect(arrearRes2.invoice.termId).toBe('term-2025-t1');

    // 3. createIndividualInvoice with raw year "2026" and alias "term-2"
    const indInv = await feeUseCases.createIndividualInvoice(
      {
        studentId: student.id,
        academicYearId: '2026',
        termId: 'term-2',
        dueDate: '2026-11-30',
        items: [
          { name: 'Special Activity', amount: 800, category: 'ACTIVITY' as any }
        ]
      },
      bursarUserContext
    );

    expect(indInv.invoice.academicYearId).toBe('year-2026');
    expect(indInv.invoice.termId).toBe('term-2026-t2');
  });
});
