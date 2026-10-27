import {
  FeeStructure,
  PaymentMethod,
  PaymentStatus,
  StudentInvoice,
  InvoiceStatus,
  Payment
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
import { ConflictError, NotFoundError } from '../../src/core/domain/shared/Errors';

describe('Payment Full Ledger Persistence & Synchronization Unit Tests', () => {
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

  const bursarUser = {
    userId: 'usr-bursar-1',
    role: UserRole.BURSAR,
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

    // Setup Academic Context (2026, Term 3 is Current)
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

  const createStudent = async (id: string, admNo: string, name: string): Promise<Student> => {
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

  test('1. Newly recorded Cash payment persists in repository and immediately appears in full fee ledger', async () => {
    const student = await createStudent('std-101', 'ADM-101', 'Brian Ochieng');

    // Invoice student for Term 3 (KES 10,000)
    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-term3',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-101',
        items: [{ id: 'fi-1', name: 'Tuition', amount: 10000, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 10000,
        discountAmount: 0,
        amountPayable: 10000,
        amountPaid: 0,
        balance: 10000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-11-20'
      },
      'inv-101'
    );
    await feeRepo.saveInvoice(invoice);

    // Verify initial full ledger state: Paid 0, Balance 10,000, Status ARREARS
    let accountsRes = await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' });
    let acc = accountsRes.accounts.find(a => a.studentId === student.id);
    expect(acc).toBeDefined();
    expect(acc?.billedFees).toBe(10000);
    expect(acc?.paidFees).toBe(0);
    expect(acc?.balance).toBe(10000);
    expect(acc?.status).toBe('ARREARS');

    // Record Cash Payment of KES 3,500
    const paymentResult = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 3500,
      paymentMethod: PaymentMethod.CASH,
      paymentDate: '2026-10-27',
      recordedByUserId: bursarUser.userId
    });

    expect(paymentResult.payment).toBeDefined();
    expect(paymentResult.payment.receiptNumber).toMatch(/^REC-/);
    expect(paymentResult.payment.amount).toBe(3500);

    // Verify persistence in repository
    const storedPayments = await feeRepo.findPayments({ studentId: student.id });
    expect(storedPayments.length).toBe(1);
    expect(storedPayments[0].amount).toBe(3500);
    expect(storedPayments[0].status).toBe(PaymentStatus.COMPLETED);

    // Check Full Fee Ledger: Paid must now be 3,500, Balance must be 6,500, Status PARTIAL
    accountsRes = await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' });
    acc = accountsRes.accounts.find(a => a.studentId === student.id);
    expect(acc?.paidFees).toBe(3500);
    expect(acc?.balance).toBe(6500);
    expect(acc?.totalDue).toBe(10000);
    expect(acc?.status).toBe('PARTIAL');

    // Verify exact agreement with Learner Fee Position (Cashier Desk)
    const pos = await feeUseCases.getLearnerFeePosition(student.id, { termId: 'term-3' });
    expect(pos.financialPosition.totalPaid).toBe(acc?.paidFees);
    expect(pos.financialPosition.outstandingBalance).toBe(acc?.balance);
    expect(pos.financialPosition.feesThisTerm).toBe(acc?.billedFees);
    expect(pos.financialPosition.status).toBe(acc?.status);
  });

  test('2. Multiple invoices in the current term are aggregated without misclassifying current term fees as prior arrears', async () => {
    const student = await createStudent('std-102', 'ADM-102', 'Mercy Wanjiku');

    // Invoice 1: Tuition (Term 3, KES 12,000)
    const invTuition = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-t3-tuition',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-102A',
        items: [{ id: 'fi-2', name: 'Tuition Fee', amount: 12000, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 12000,
        discountAmount: 0,
        amountPayable: 12000,
        amountPaid: 0,
        balance: 12000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-11-20'
      },
      'inv-102a'
    );
    await feeRepo.saveInvoice(invTuition);

    // Invoice 2: Activities & Meals (Term 3, KES 4,000)
    const invActivities = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-t3-meals',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-102B',
        items: [{ id: 'fi-3', name: 'Lunch & Activities', amount: 4000, category: 'ACTIVITIES' as any, isOptional: false }],
        amountBilled: 4000,
        discountAmount: 0,
        amountPayable: 4000,
        amountPaid: 0,
        balance: 4000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-11-20'
      },
      'inv-102b'
    );
    await feeRepo.saveInvoice(invActivities);

    // Pay KES 4,000 towards the second invoice (Activities)
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invActivities.id,
      amount: 4000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'QHJ8921KL1',
      recordedByUserId: bursarUser.userId
    });

    // Check Full Fee Ledger
    const accountsRes = await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' });
    const acc = accountsRes.accounts.find(a => a.studentId === student.id);

    // Both invoices belong to Term 3, so billedFees = 12000 + 4000 = 16000
    // Neither invoice should be pushed into priorArrears!
    expect(acc?.billedFees).toBe(16000);
    expect(acc?.priorArrears).toBe(0);
    expect(acc?.totalDue).toBe(16000);
    expect(acc?.paidFees).toBe(4000);
    expect(acc?.balance).toBe(12000);
    expect(acc?.status).toBe('PARTIAL');
  });

  test('3. Cash Flow Ledger reflects newly recorded payment with resolved student party and correct inflows', async () => {
    const student = await createStudent('std-103', 'ADM-103', 'Faith Mwangi');

    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-t3',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-103',
        items: [{ id: 'fi-4', name: 'Tuition Fee', amount: 8000, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 8000,
        discountAmount: 0,
        amountPayable: 8000,
        amountPaid: 0,
        balance: 8000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-11-20'
      },
      'inv-103'
    );
    await feeRepo.saveInvoice(invoice);

    // Record Bank Deposit of KES 8,000 (clearing fees)
    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 8000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      bankName: 'KCB Bank Kenya',
      slipNumber: 'DEP-889922',
      recordedByUserId: bursarUser.userId
    });

    // Query Cash Flow Ledger
    const cashFlow = await feeUseCases.getCashFlowLedger(schoolId, undefined, bursarUser as any);
    expect(cashFlow.totalMoneyIn).toBe(8000);
    expect(cashFlow.feeInflow).toBe(8000);
    expect(cashFlow.accountBalances.bank.inflows).toBe(8000);

    const ledgerTx = cashFlow.recentLedger.find(t => t.id === payRes.payment.id);
    expect(ledgerTx).toBeDefined();
    expect(ledgerTx?.type).toBe('INFLOW');
    expect(ledgerTx?.category).toBe('FEES_COLLECTION');
    expect(ledgerTx?.amount).toBe(8000);
    expect(ledgerTx?.party).toContain('Faith Mwangi');
    expect(ledgerTx?.party).toContain('ADM-103');

    // Confirm full ledger displays CLEARED status
    const accountsRes = await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' });
    const acc = accountsRes.accounts.find(a => a.studentId === student.id);
    expect(acc?.paidFees).toBe(8000);
    expect(acc?.balance).toBe(0);
    expect(acc?.status).toBe('CLEARED');
  });

  test('4. Payment idempotency: Duplicate reference is rejected with ConflictError', async () => {
    const student = await createStudent('std-104', 'ADM-104', 'Kelvin Kiprop');

    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-t3',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-104',
        items: [{ id: 'fi-5', name: 'Tuition', amount: 5000, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 5000,
        discountAmount: 0,
        amountPayable: 5000,
        amountPaid: 0,
        balance: 5000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-11-20'
      },
      'inv-104'
    );
    await feeRepo.saveInvoice(invoice);

    // First payment with reference 'REF-UNIQUE-001'
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 2500,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'REF-UNIQUE-001',
      recordedByUserId: bursarUser.userId
    });

    // Attempting duplicate payment with identical reference must throw ConflictError
    await expect(
      feeUseCases.recordPayment({
        schoolId,
        studentId: student.id,
        invoiceId: invoice.id,
        amount: 2500,
        paymentMethod: PaymentMethod.MPESA,
        transactionReference: 'REF-UNIQUE-001',
        recordedByUserId: bursarUser.userId
      })
    ).rejects.toThrow(ConflictError);

    // Verify exactly 1 payment exists and ledger reflects 2,500
    const payments = await feeRepo.findPayments({ studentId: student.id });
    expect(payments.length).toBe(1);

    const accountsRes = await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' });
    const acc = accountsRes.accounts.find(a => a.studentId === student.id);
    expect(acc?.paidFees).toBe(2500);
    expect(acc?.balance).toBe(2500);
  });

  test('5. Default term resolution in getStudentFeeAccounts resolves active Term 3 when termId is omitted', async () => {
    const student = await createStudent('std-105', 'ADM-105', 'Sarah Cherono');

    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-t3',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-105',
        items: [{ id: 'fi-6', name: 'Term 3 Fee', amount: 7500, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 7500,
        discountAmount: 0,
        amountPayable: 7500,
        amountPaid: 1500,
        balance: 6000,
        status: InvoiceStatus.PARTIALLY_PAID,
        dueDate: '2026-11-20'
      },
      'inv-105'
    );
    await feeRepo.saveInvoice(invoice);

    // Call getStudentFeeAccounts with empty criteria {} (omitted termId)
    const accountsRes = await feeUseCases.getStudentFeeAccounts({});
    const acc = accountsRes.accounts.find(a => a.studentId === student.id);
    expect(acc).toBeDefined();
    expect(acc?.billedFees).toBe(7500);
    expect(acc?.paidFees).toBe(1500);
    expect(acc?.balance).toBe(6000);
    expect(acc?.status).toBe('PARTIAL');
  });

  test('6. Payment reversal immediately restores outstanding balance and removes inflow from completed ledger', async () => {
    const student = await createStudent('std-106', 'ADM-106', 'Dennis Kibet');

    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-t3',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-106',
        items: [{ id: 'fi-7', name: 'Tuition Fee', amount: 9000, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 9000,
        discountAmount: 0,
        amountPayable: 9000,
        amountPaid: 0,
        balance: 9000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-11-20'
      },
      'inv-106'
    );
    await feeRepo.saveInvoice(invoice);

    // Record payment of KES 9,000 (clearing fees)
    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 9000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUser.userId
    });

    let acc = (await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' })).accounts.find(a => a.studentId === student.id);
    expect(acc?.paidFees).toBe(9000);
    expect(acc?.balance).toBe(0);
    expect(acc?.status).toBe('CLEARED');

    // Reverse the payment
    const revRes = await feeUseCases.reversePayment(
      payRes.payment.id,
      'Erroneous duplicate entry recorded by cashier',
      bursarUser as any
    );
    expect(revRes.success).toBe(true);

    // Verify full ledger state after reversal: Paid returns to 0, Balance returns to 9,000, Status is ARREARS
    acc = (await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' })).accounts.find(a => a.studentId === student.id);
    expect(acc?.paidFees).toBe(0);
    expect(acc?.balance).toBe(9000);
    expect(acc?.status).toBe('ARREARS');

    // Verify Cash Flow Ledger excludes the reversed payment
    const cashFlow = await feeUseCases.getCashFlowLedger(schoolId, undefined, bursarUser as any);
    expect(cashFlow.feeInflow).toBe(0);
    expect(cashFlow.totalMoneyIn).toBe(0);
  });

  test('7. Payment towards manual arrears invoice is reflected in paid fees and settles student obligation', async () => {
    const student = await createStudent('std-107', 'ADM-107', 'Joy Achieng');

    // Current Term 3 Invoice: KES 6,000
    const currentInv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'fs-t3',
        academicYearId,
        termId: term3Id,
        invoiceNumber: 'INV-2026-107',
        items: [{ id: 'fi-8', name: 'Tuition Fee', amount: 6000, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 6000,
        discountAmount: 0,
        amountPayable: 6000,
        amountPaid: 0,
        balance: 6000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-11-20'
      },
      'inv-107'
    );
    await feeRepo.saveInvoice(currentInv);

    // Manual Arrears Invoice: KES 8,000
    const arrearsInv = StudentInvoice.create(
      {
        schoolId,
        studentId: student.id,
        feeStructureId: 'MANUAL_ARREARS',
        academicYearId,
        termId: term1Id,
        invoiceNumber: 'INV-ARR-107',
        items: [{ id: 'fi-9', name: 'Previous Term Arrears', amount: 8000, category: 'TUITION' as any, isOptional: false }],
        amountBilled: 8000,
        discountAmount: 0,
        amountPayable: 8000,
        amountPaid: 0,
        balance: 8000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-04-03'
      },
      'inv-arr-107'
    );
    await feeRepo.saveInvoice(arrearsInv);

    // Initial state: Billed 6,000, Prior Arrears 8,000, Total Due 14,000, Paid 0, Balance 14,000
    let acc = (await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' })).accounts.find(a => a.studentId === student.id);
    expect(acc?.billedFees).toBe(6000);
    expect(acc?.priorArrears).toBe(8000);
    expect(acc?.totalDue).toBe(14000);
    expect(acc?.paidFees).toBe(0);
    expect(acc?.balance).toBe(14000);

    // Record payment of KES 5,000 towards the arrears invoice
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: arrearsInv.id,
      amount: 5000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUser.userId
    });

    // Verify that the arrears invoice balance reduced to 3,000
    const updatedArrearsInv = await feeRepo.findInvoiceById(arrearsInv.id);
    expect(updatedArrearsInv?.balance).toBe(3000);
    expect(updatedArrearsInv?.amountPaid).toBe(5000);

    // Verify full ledger: Prior arrears balance is 3,000, current term 6,000 -> total remaining balance is 9,000
    acc = (await feeUseCases.getStudentFeeAccounts({ termId: 'term-3' })).accounts.find(a => a.studentId === student.id);
    expect(acc?.billedFees).toBe(6000);
    expect(acc?.priorArrears).toBe(3000);
    expect(acc?.totalDue).toBe(9000);
    expect(acc?.balance).toBe(9000);
  });
});
