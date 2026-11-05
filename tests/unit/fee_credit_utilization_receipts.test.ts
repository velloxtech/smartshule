import {
  FeeStructure,
  PaymentMethod,
  PaymentStatus,
  StudentInvoice,
  InvoiceStatus,
  StudentFeeCredit,
  FeeCreditApplication,
  Payment,
  FeeItem
} from '../../src/core/domain/finance/Fee';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
import { StudentUseCases } from '../../src/application/students/StudentUseCases';
import {
  InMemoryFeeRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';

describe('SmartShule — Fee Credit Utilization with Receipts (14 Scenarios)', () => {
  let feeRepo: InMemoryFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let feeUseCases: FeeUseCases;
  let studentUseCases: StudentUseCases;

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

  const adminUserContext = {
    userId: 'usr-admin-1',
    role: UserRole.ADMIN,
    schoolId
  };

  const parentUserContext = {
    userId: 'usr-parent-1',
    role: UserRole.PARENT,
    schoolId
  };

  const otherParentUserContext = {
    userId: 'usr-parent-2',
    role: UserRole.PARENT,
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

    const mockPasswordHasher = {
      hash: async (pwd: string) => pwd,
      compare: async (pwd: string, hash: string) => pwd === hash
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

    studentUseCases = new StudentUseCases(
      studentRepo,
      guardianRepo,
      userRepo,
      mockPasswordHasher as any,
      academicRepo,
      feeRepo
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

    // Setup Users
    const bursar = User.create({
      schoolId,
      email: 'bursar@graceseeds.sc.ke',
      passwordHash: 'hash123',
      firstName: 'Faith',
      lastName: 'Bursar',
      role: UserRole.BURSAR,
      status: UserStatus.ACTIVE
    }, 'usr-bursar-1');
    await userRepo.save(bursar);

    const parentUser = User.create({
      schoolId,
      email: 'parent1@gmail.com',
      passwordHash: 'hash123',
      firstName: 'Alice',
      lastName: 'Otieno',
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE
    }, 'usr-parent-1');
    await userRepo.save(parentUser);

    const otherParentUser = User.create({
      schoolId,
      email: 'parent2@gmail.com',
      passwordHash: 'hash123',
      firstName: 'Bob',
      lastName: 'Kamau',
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE
    }, 'usr-parent-2');
    await userRepo.save(otherParentUser);
  });

  // Helpers
  const createStudent = async (id: string, admNo: string, name: string) => {
    const student = Student.create(
      {
        admissionNumber: admNo,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || 'Learner',
        dateOfBirth: '2019-05-15',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        schoolId,
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE,
        streamId: 'East'
      },
      id
    );
    await studentRepo.save(student);
    return student;
  };

  const createInvoice = async (
    id: string,
    studentId: string,
    termId: string,
    invoiceNumber: string,
    amount: number,
    options?: { isArrear?: boolean }
  ): Promise<StudentInvoice> => {
    const isManualArrear = options?.isArrear || invoiceNumber.includes('ARR');
    const items: FeeItem[] = [
      {
        id: `item-${id}`,
        name: isManualArrear ? 'Manual Arrears Balance' : 'Term Tuition Fee',
        amount,
        category: (isManualArrear ? 'OTHER' : 'TUITION') as any,
        isOptional: false
      }
    ];

    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId,
        feeStructureId: isManualArrear ? 'MANUAL_ARREARS' : 'fs-standard',
        academicYearId,
        termId,
        invoiceNumber,
        items,
        amountBilled: amount,
        discountAmount: 0,
        amountPayable: amount,
        amountPaid: 0,
        balance: amount,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-10-15'
      },
      id
    );
    await feeRepo.saveInvoice(invoice);
    return invoice;
  };

  const createCredit = async (
    id: string,
    studentId: string,
    amount: number,
    receiptNumber: string = 'RCP-CREDIT-001'
  ): Promise<StudentFeeCredit> => {
    const credit = StudentFeeCredit.create(
      {
        schoolId,
        studentId,
        academicYearId,
        termId: term3Id,
        amount,
        amountUsed: 0,
        balance: amount,
        status: 'AVAILABLE',
        originatingReceiptNumber: receiptNumber,
        notes: `Advance credit deposit for student ${studentId}`
      },
      id
    );
    await feeRepo.saveCredit(credit);
    return credit;
  };

  const linkGuardian = async (guardianId: string, userId: string, studentId: string) => {
    const g = Guardian.create(
      {
        userId,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '0712345678',
        studentIds: [studentId]
      },
      guardianId
    );
    await guardianRepo.save(g);
    return g;
  };

  // ==========================================
  // SCENARIO 1: Automatic utilization generates a receipt
  // ==========================================
  test('Scenario 1: Automatic utilization generates a receipt with FCUR-YYYY-XXXXX format', async () => {
    const student = await createStudent('stud-1', 'ADM-101', 'Brian Otieno');

    // Previous term arrears (Term 1)
    await createInvoice('inv-arr-101', student.id, term1Id, 'INV-ARR-101', 4000, { isArrear: true });
    // Current term fees (Term 3)
    await createInvoice('inv-cur-101', student.id, term3Id, 'INV-CUR-101', 6000);
    // Available fee credit 7000
    await createCredit('crd-101', student.id, 7000);

    const res = await feeUseCases.autoReconcileStudentFeeCredits(student.id, {
      requestingUser: bursarUserContext
    });

    expect(res).not.toBeNull();
    expect(res!.creditApplied).toBe(7000); // 4000 arrears + 3000 current fees
    expect(res!.arrearsSettled).toBe(4000);
    expect(res!.currentFeesSettled).toBe(3000);
    expect(res!.remainingOutstanding).toBe(3000); // 6000 - 3000
    expect(res!.remainingCredit).toBe(0);

    expect(res!.receiptNumber).toBeDefined();
    expect(res!.receiptNumber).toMatch(/^FCUR-\d{4}-\d{5}$/);
    expect(res!.receipt).toBeDefined();
    expect(res!.receipt?.transactionType).toBe('AUTOMATIC');
    expect(res!.receipt?.isSystemGenerated).toBe(true);
    expect(res!.receipt?.totalCreditUtilized).toBe(7000);
    expect(res!.receipt?.amountAppliedToArrears).toBe(4000);
    expect(res!.receipt?.amountAppliedToCurrentFees).toBe(3000);

    // Stored FeeCreditApplication entities retain receiptNumber
    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(2);
    expect(apps[0].receiptNumber).toBe(res!.receiptNumber);
    expect(apps[1].receiptNumber).toBe(res!.receiptNumber);
    expect(apps[0].receiptPayload?.receiptNumber).toBe(res!.receiptNumber);
  });

  // ==========================================
  // SCENARIO 2: Admin-initiated utilization generates a receipt
  // ==========================================
  test('Scenario 2: Admin-initiated utilization generates an auditable receipt with reason and admin details', async () => {
    const student = await createStudent('stud-2', 'ADM-102', 'Cynthia Achieng');

    await createInvoice('inv-cur-102', student.id, term3Id, 'INV-CUR-102', 10000);
    await createCredit('crd-102', student.id, 8000);

    const result = await feeUseCases.adminInitiateFeeCreditUtilization(
      {
        studentId: student.id,
        amount: 5000,
        reason: 'Parent requested partial offset of Term 3 tuition from advance balance'
      },
      bursarUserContext
    );

    expect(result.success).toBe(true);
    expect(result.allocation.creditApplied).toBe(5000);
    expect(result.receipt.receiptNumber).toMatch(/^FCUR-\d{4}-\d{5}$/);
    expect(result.receipt).toBeDefined();
    expect(result.receipt.transactionType).toBe('ADMIN-INITIATED');
    expect(result.receipt.isSystemGenerated).toBe(false);
    expect(result.receipt.initiatedByAdminName).toBe('Faith Bursar');
    expect(result.receipt.mandatoryReason).toBe('Parent requested partial offset of Term 3 tuition from advance balance');
    expect(result.receipt.totalCreditUtilized).toBe(5000);
    expect(result.receipt.remainingCredit).toBe(3000);
    expect(result.receipt.remainingOutstanding).toBe(5000);
  });

  // ==========================================
  // SCENARIO 3: Both receipts contain correct allocation details and explicit notice
  // ==========================================
  test('Scenario 3: Receipts contain the exact required notice statement, school header, and balances', async () => {
    const student = await createStudent('stud-3', 'ADM-103', 'Dennis Mwangi');

    await createInvoice('inv-cur-103', student.id, term3Id, 'INV-CUR-103', 5000);
    await createCredit('crd-103', student.id, 5000);

    const result = await feeUseCases.adminInitiateFeeCreditUtilization(
      {
        studentId: student.id,
        amount: 5000,
        reason: 'Full term fee credit application'
      },
      bursarUserContext
    );

    const receipt = result.receipt;
    expect(receipt.statement).toBe(
      "THIS DOCUMENT CONFIRMS THE UTILIZATION OF PREVIOUSLY RECEIVED FEE CREDIT. IT IS NOT A NEW CASH, BANK OR MOBILE MONEY PAYMENT."
    );
    expect(receipt.schoolName).toBe('Grace Seeds School');
    expect(receipt.studentName).toBe('Dennis Mwangi');
    expect(receipt.admissionNumber).toBe('ADM-103');
    expect(receipt.availableCreditBefore).toBe(5000);
    expect(receipt.totalCreditUtilized).toBe(5000);
    expect(receipt.remainingCredit).toBe(0);
    expect(receipt.remainingOutstanding).toBe(0);
    expect(receipt.outstandingBalanceBefore).toBe(5000);
    expect(receipt.outstandingBalanceAfter).toBe(0);
    expect(receipt.invoiceAllocations).toBeDefined();
    expect(receipt.invoiceAllocations?.length).toBe(1);
    expect(receipt.invoiceAllocations?.[0].invoiceNumber).toBe('INV-CUR-103');
    expect(receipt.invoiceAllocations?.[0].amountApplied).toBe(5000);
    expect(receipt.invoiceAllocations?.[0].remainingBalance).toBe(0);
  });

  // ==========================================
  // SCENARIO 4: Receipt references are strictly unique
  // ==========================================
  test('Scenario 4: Receipt references are unique across successive and distinct utilization events', async () => {
    const s1 = await createStudent('stud-4a', 'ADM-104A', 'Evans Kariuki');
    const s2 = await createStudent('stud-4b', 'ADM-104B', 'Faith Wanjiku');

    await createInvoice('i-4a', s1.id, term3Id, 'INV-4A', 3000);
    await createCredit('c-4a', s1.id, 3000);

    await createInvoice('i-4b', s2.id, term3Id, 'INV-4B', 4000);
    await createCredit('c-4b', s2.id, 4000);

    const res1 = await feeUseCases.autoReconcileStudentFeeCredits(s1.id, { requestingUser: bursarUserContext });
    const res2 = await feeUseCases.autoReconcileStudentFeeCredits(s2.id, { requestingUser: bursarUserContext });

    expect(res1?.receiptNumber).toBeDefined();
    expect(res2?.receiptNumber).toBeDefined();
    expect(res1?.receiptNumber).not.toBe(res2?.receiptNumber);
  });

  // ==========================================
  // SCENARIO 5: Failed allocations do not generate receipts
  // ==========================================
  test('Scenario 5: Failed allocations do not generate receipts or persist audit records', async () => {
    const student = await createStudent('stud-5', 'ADM-105', 'George Otieno');

    // Fee balance exists but zero credit
    await createInvoice('inv-5', student.id, term3Id, 'INV-5', 5000);

    const autoRes = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    expect(autoRes).toBeNull();

    // Admin attempt with zero credit throws error
    await expect(
      feeUseCases.adminInitiateFeeCreditUtilization(
        {
          studentId: student.id,
          amount: 1000,
          reason: 'Attempt with no credit'
        },
        bursarUserContext
      )
    ).rejects.toThrow(/available fee credit/i);

    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(0);
  });

  // ==========================================
  // SCENARIO 6: Duplicate requests do not create duplicate receipts
  // ==========================================
  test('Scenario 6: Subsequent calls after credit is exhausted do not generate duplicate receipts', async () => {
    const student = await createStudent('stud-6', 'ADM-106', 'Helen Njeri');

    await createInvoice('inv-6', student.id, term3Id, 'INV-6', 2000);
    await createCredit('c-6', student.id, 2000);

    const firstRes = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    expect(firstRes).not.toBeNull();
    expect(firstRes!.receiptNumber).toBeDefined();

    // Second call immediately after (credit now 0)
    const secondRes = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    expect(secondRes).toBeNull();

    // Exactly 1 receipt in repo
    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(1);
    expect(apps[0].receiptNumber).toBe(firstRes!.receiptNumber);
  });

  // ==========================================
  // SCENARIO 7: Receipts remain retrievable after page refresh
  // ==========================================
  test('Scenario 7: Receipts remain retrievable by receipt number and student ID', async () => {
    const student = await createStudent('stud-7', 'ADM-107', 'Ian Mutua');

    await createInvoice('inv-7', student.id, term3Id, 'INV-7', 3500);
    await createCredit('c-7', student.id, 3500);

    const res = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    const receiptNumber = res!.receiptNumber!;

    // Retrieve via use case
    const fetchedReceipt = await feeUseCases.getCreditUtilizationReceipt(receiptNumber, bursarUserContext);
    expect(fetchedReceipt).toBeDefined();
    expect(fetchedReceipt.receipt.receiptNumber).toBe(receiptNumber);
    expect(fetchedReceipt.receipt.studentName).toBe('Ian Mutua');
    expect(fetchedReceipt.receipt.totalCreditUtilized).toBe(3500);

    // Direct repository retrieval
    const app = await feeRepo.findCreditApplicationByReceiptNumber(receiptNumber);
    expect(app).toBeDefined();
    expect(app?.receiptNumber).toBe(receiptNumber);
  });

  // ==========================================
  // SCENARIO 8: Parents can access their linked child's utilization receipts
  // ==========================================
  test('Scenario 8: Authenticated parent can retrieve receipts for their linked child', async () => {
    const student = await createStudent('stud-8', 'ADM-108', 'Joy Anyango');
    await linkGuardian('g-8', 'usr-parent-1', student.id);

    await createInvoice('inv-8', student.id, term3Id, 'INV-8', 4500);
    await createCredit('c-8', student.id, 4500);

    const res = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    const receiptNumber = res!.receiptNumber!;

    // Parent retrieves single receipt
    const receipt = await feeUseCases.getCreditUtilizationReceipt(receiptNumber, parentUserContext);
    expect(receipt).toBeDefined();
    expect(receipt.receipt.receiptNumber).toBe(receiptNumber);

    // Parent retrieves student's receipts list
    const studentReceipts = await feeUseCases.getStudentCreditUtilizationReceipts(student.id, parentUserContext);
    expect(studentReceipts.length).toBe(1);
    expect(studentReceipts[0].receiptNumber).toBe(receiptNumber);
  });

  // ==========================================
  // SCENARIO 9: Parents cannot access another learner's receipts (403 Forbidden)
  // ==========================================
  test("Scenario 9: Parent cannot access an unlinked child's utilization receipts (throws 403 Forbidden)", async () => {
    const student = await createStudent('stud-9', 'ADM-109', 'Kevin Ochieng');
    // Linked only to parent 1, NOT parent 2
    await linkGuardian('g-9', 'usr-parent-1', student.id);

    await createInvoice('inv-9', student.id, term3Id, 'INV-9', 5000);
    await createCredit('c-9', student.id, 5000);

    const res = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    const receiptNumber = res!.receiptNumber!;

    // Other parent tries to get single receipt -> throws ForbiddenError (403)
    await expect(
      feeUseCases.getCreditUtilizationReceipt(receiptNumber, otherParentUserContext)
    ).rejects.toThrow(/not authorized/i);

    // Other parent tries to list receipts for unlinked student -> throws ForbiddenError (403)
    await expect(
      feeUseCases.getStudentCreditUtilizationReceipts(student.id, otherParentUserContext)
    ).rejects.toThrow(/not authorized/i);
  });

  // ==========================================
  // SCENARIO 10: Authorized Admins can retrieve receipts across learners
  // ==========================================
  test('Scenario 10: Bursar and Admin can retrieve receipts for any school learner', async () => {
    const student = await createStudent('stud-10', 'ADM-110', 'Lorraine Chebet');

    await createInvoice('inv-10', student.id, term3Id, 'INV-10', 2500);
    await createCredit('c-10', student.id, 2500);

    const res = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    const receiptNumber = res!.receiptNumber!;

    const receipt = await feeUseCases.getCreditUtilizationReceipt(receiptNumber, bursarUserContext);
    expect(receipt).toBeDefined();
    expect(receipt.receipt.receiptNumber).toBe(receiptNumber);

    const receipts = await feeUseCases.getStudentCreditUtilizationReceipts(student.id, bursarUserContext);
    expect(receipts.length).toBe(1);
  });

  // ==========================================
  // SCENARIO 11: Original payment receipts remain unchanged
  // ==========================================
  test('Scenario 11: Original cash/M-Pesa payment records and receipts remain completely unchanged', async () => {
    const student = await createStudent('stud-11', 'ADM-111', 'Michael Waweru');

    const origPayment = Payment.create(
      {
        schoolId,
        invoiceId: 'inv-11',
        studentId: student.id,
        amount: 15000,
        paymentMethod: PaymentMethod.MPESA,
        status: PaymentStatus.COMPLETED,
        transactionReference: 'MPESA-QWE9988',
        paymentDate: '2026-01-10',
        recordedByUserId: 'usr-bursar-1',
        receiptNumber: 'REC-2026-00099'
      },
      'pay-orig-11'
    );
    await feeRepo.savePayment(origPayment);

    await createInvoice('inv-11', student.id, term3Id, 'INV-11', 6000);
    await createCredit('c-11', student.id, 9000);

    const res = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });

    const payments = await feeRepo.findPayments({ studentId: student.id });
    expect(payments.length).toBe(1);
    expect(payments[0].id).toBe('pay-orig-11');
    expect(payments[0].amount).toBe(15000);
    expect(payments[0].receiptNumber).toBe('REC-2026-00099');
    expect(payments[0].receiptNumber).not.toBe(res!.receiptNumber);
  });

  // ==========================================
  // SCENARIO 12: Credit utilization does not increase cash collection reports
  // ==========================================
  test('Scenario 12: Fee credit utilization never inflates cash collection reports', async () => {
    const student = await createStudent('stud-12', 'ADM-112', 'Nancy Adhiambo');

    const cashPayment = Payment.create(
      {
        schoolId,
        invoiceId: 'inv-12',
        studentId: student.id,
        amount: 10000,
        paymentMethod: PaymentMethod.BANK_DEPOSIT,
        status: PaymentStatus.COMPLETED,
        transactionReference: 'DEPOSIT-1001',
        paymentDate: '2026-01-15',
        recordedByUserId: 'usr-bursar-1',
        receiptNumber: 'REC-2026-00012'
      },
      'pay-cash-12'
    );
    await feeRepo.savePayment(cashPayment);

    const initialPayments = await feeRepo.findPayments({ schoolId });
    const initialTotalCash = initialPayments.reduce((acc, p) => acc + p.amount, 0);
    expect(initialTotalCash).toBe(10000);

    await createInvoice('inv-12', student.id, term3Id, 'INV-12', 5000);
    await createCredit('c-12', student.id, 5000);

    await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });

    const afterPayments = await feeRepo.findPayments({ schoolId });
    const afterTotalCash = afterPayments.reduce((acc, p) => acc + p.amount, 0);
    expect(afterPayments.length).toBe(1);
    expect(afterTotalCash).toBe(10000);
  });

  // ==========================================
  // SCENARIO 13: Reversal produces a separate traceable document without deleting original receipt
  // ==========================================
  test('Scenario 13: Reversal produces a separate traceable document without deleting the original receipt', async () => {
    const student = await createStudent('stud-13', 'ADM-113', 'Oscar Kipchoge');

    const inv = await createInvoice('inv-13', student.id, term3Id, 'INV-13', 4000);
    const crd = await createCredit('c-13', student.id, 4000);

    const res = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    const receiptNumber = res!.receiptNumber!;

    // Initial state after allocation: invoice balance 0, credit balance 0
    const invAfterAlloc = await feeRepo.findInvoiceById(inv.id);
    const crdAfterAlloc = (await feeRepo.findCredits({ studentId: student.id }))[0];
    expect(invAfterAlloc?.balance).toBe(0);
    expect(crdAfterAlloc.balance).toBe(0);

    // Bursar direct reversal execution is blocked (403 Forbidden)
    await expect(
      feeUseCases.reverseCreditUtilization(
        receiptNumber,
        'Parent requested full refund of previous advance deposit',
        bursarUserContext
      )
    ).rejects.toThrow(/Bursars and Accountants cannot directly execute credit reversals/i);

    // Reversal executed by authorized Administrator
    const revRes = await feeUseCases.reverseCreditUtilization(
      receiptNumber,
      'Parent requested full refund of previous advance deposit',
      adminUserContext
    );

    expect(revRes.success).toBe(true);
    expect(revRes.reversal).toBeDefined();
    expect(revRes.reversal.reversalNumber).toMatch(/^FCUR-REV-\d{4}-\d{5}$/);
    expect(revRes.reversal.originalReceiptNumber).toBe(receiptNumber);
    expect(revRes.reversal.amountReversed).toBe(4000);
    expect(revRes.reversal.creditRestored).toBe(4000);
    expect(revRes.reversal.status).toBe('REVERSED');
    expect(revRes.reversal.statement).toContain('REVERSAL OF A PREVIOUS FEE CREDIT UTILIZATION TRANSACTION');

    // Original receipt is preserved and remains retrievable!
    const fetchedOrig = await feeUseCases.getCreditUtilizationReceipt(receiptNumber, bursarUserContext);
    expect(fetchedOrig.receipt.receiptNumber).toBe(receiptNumber);
    expect(fetchedOrig.receipt.status).toBe('REVERSED');
    expect(fetchedOrig.receipt.reversalReference).toBe(revRes.reversal.reversalNumber);

    // Balances are restored on underlying financial entities:
    const invAfterRev = await feeRepo.findInvoiceById(inv.id);
    const crdAfterRev = (await feeRepo.findCredits({ studentId: student.id }))[0];
    expect(invAfterRev?.balance).toBe(4000);
    expect(crdAfterRev.balance).toBe(4000);
    expect(crdAfterRev.status).toBe('AVAILABLE');

    // Duplicate reversal attempt is blocked
    await expect(
      feeUseCases.reverseCreditUtilization(receiptNumber, 'Second attempt', adminUserContext)
    ).rejects.toThrow(/already been reversed/i);
  });

  // ==========================================
  // SCENARIO 14: Concurrent requests cannot double-spend credit
  // ==========================================
  test('Scenario 14: Concurrent requests cannot double-spend credit beyond the available amount', async () => {
    const student = await createStudent('stud-14', 'ADM-114', 'Patricia Njoki');

    await createInvoice('inv-14', student.id, term3Id, 'INV-14', 10000);
    await createCredit('c-14', student.id, 6000);

    // Trigger two concurrent requests to utilize 5,000 credit each (requested 10,000 > available 6,000)
    const results = await Promise.allSettled([
      feeUseCases.adminInitiateFeeCreditUtilization(
        {
          studentId: student.id,
          amount: 5000,
          reason: 'Concurrent request A'
        },
        bursarUserContext
      ),
      feeUseCases.adminInitiateFeeCreditUtilization(
        {
          studentId: student.id,
          amount: 5000,
          reason: 'Concurrent request B'
        },
        bursarUserContext
      )
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // One succeeds, one is rejected due to insufficient credit after lock release
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits[0].balance).toBe(1000);
    expect(credits[0].amountUsed).toBe(5000);

    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(1);
    expect(apps[0].amountApplied).toBe(5000);
  });

  // ==========================================
  // SCENARIO 15: PDF generation failure can be retried without repeating allocation
  // ==========================================
  test('Scenario 15: PDF generation failure can be retried without repeating the financial allocation', async () => {
    const student = await createStudent('stud-15', 'ADM-115', 'Quincy Ombati');

    await createInvoice('inv-15', student.id, term3Id, 'INV-15', 3000);
    await createCredit('c-15', student.id, 3000);

    const autoRes = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    const receiptNumber = autoRes!.receiptNumber!;

    // Initial allocation committed
    const appsBefore = await feeRepo.findCreditApplications({ receiptNumber });
    expect(appsBefore.length).toBe(1);

    // Retry PDF generation
    const retryRes = await feeUseCases.generateOrRetryCreditUtilizationPdf(receiptNumber, bursarUserContext);
    expect(retryRes.success).toBe(true);
    expect(retryRes.retried).toBe(true);
    expect(retryRes.receipt.receiptNumber).toBe(receiptNumber);
    expect(retryRes.html).toContain('FEE CREDIT UTILIZATION RECEIPT');

    // No extra allocation created and financial position unchanged
    const appsAfter = await feeRepo.findCreditApplications({ receiptNumber });
    expect(appsAfter.length).toBe(1);
    expect(appsAfter[0].amountApplied).toBe(3000);

    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits[0].balance).toBe(0);
    expect(credits[0].amountUsed).toBe(3000);
  });

  // ==========================================
  // SCENARIO 16: Reports and summaries do not count credit utilization as new money
  // ==========================================
  test('Scenario 16: Reports do not count credit utilization as new money received', async () => {
    const student = await createStudent('stud-16', 'ADM-116', 'Rachel Wambui');

    // Parent pays actual KES 20,000 cash for tuition
    const realPayment = Payment.create(
      {
        schoolId,
        invoiceId: 'inv-16a',
        studentId: student.id,
        amount: 20000,
        paymentMethod: PaymentMethod.MPESA,
        status: PaymentStatus.COMPLETED,
        transactionReference: 'MPESA-REAL-20K',
        paymentDate: '2026-02-01',
        recordedByUserId: 'usr-bursar-1',
        receiptNumber: 'REC-2026-20000'
      },
      'pay-real-16'
    );
    await feeRepo.savePayment(realPayment);

    // Initial fee invoice of KES 14,000
    const inv1 = await createInvoice('inv-16a', student.id, term1Id, 'INV-16A', 14000);
    inv1.recordPayment(14000);
    await feeRepo.updateInvoice(inv1);

    // Overpayment credit of KES 6,000
    await createCredit('crd-16', student.id, 6000, 'REC-2026-20000');

    // Finance summary shows total collected = 20,000
    const summaryBefore = await feeUseCases.getFinanceSummary(schoolId, bursarUserContext);
    expect(summaryBefore.totalCollected).toBe(20000);

    // Subsequently: KES 3,000 arrears added
    await createInvoice('inv-16b', student.id, term2Id, 'INV-ARR-16B', 3000, { isArrear: true });

    // Automatic credit utilization applies KES 3,000
    const autoRes = await feeUseCases.autoReconcileStudentFeeCredits(student.id, { requestingUser: bursarUserContext });
    expect(autoRes?.creditApplied).toBe(3000);
    expect(autoRes?.receiptNumber).toBeDefined();

    // Finance summary STILL shows total collected = 20,000 (NOT 23,000!)
    const summaryAfter = await feeUseCases.getFinanceSummary(schoolId, bursarUserContext);
    expect(summaryAfter.totalCollected).toBe(20000);

    // Cash flow ledger also confirms exactly 20,000 total inflow
    const cashFlow = await feeUseCases.getCashFlowLedger(schoolId, undefined, bursarUserContext);
    expect(cashFlow.totalMoneyIn).toBe(20000);
    expect(cashFlow.feeInflow).toBe(20000);
  });

  // ==========================================
  // SCENARIO 17: Section G End-to-End Workflow Demonstration
  // ==========================================
  test('Scenario 17: Section G Complete Workflow: KES 20,000 paid against KES 14,000 fees -> KES 6,000 credit -> KES 3,000 arrears added -> KES 3,000 auto-applied -> KES 3,000 credit remains -> verify documents and ledger integrity', async () => {
    // 0. Setup learner linked to parent
    const student = await createStudent('stud-17', 'ADM-117', 'Samuel Gitau');
    await linkGuardian('g-17', 'usr-parent-1', student.id);

    // Initial fee invoice of KES 14,000 for Term 3
    const invoice = await createInvoice('inv-17', student.id, term3Id, 'INV-17-2026', 14000);

    // Step 1: Record KES 20,000 payment against KES 14,000 fees
    const paymentResult = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 20000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-KCB-99001',
      recordedByUserId: 'usr-bursar-1',
      bankName: 'KCB Bank'
    });

    const origReceiptNumber = paymentResult.payment.receiptNumber;
    expect(origReceiptNumber).toBeDefined();
    expect(paymentResult.allocation.currentFeesPaid).toBe(14000);
    expect(paymentResult.allocation.overpaymentAmount).toBe(6000);

    // Step 2: Confirm KES 6,000 overpayment credit created
    const creditsStep2 = await feeRepo.findCredits({ studentId: student.id });
    expect(creditsStep2.length).toBe(1);
    expect(creditsStep2[0].amount).toBe(6000);
    expect(creditsStep2[0].balance).toBe(6000);
    expect(creditsStep2[0].status).toBe('AVAILABLE');

    // Confirm original invoice is fully settled
    const invoiceStep2 = await feeRepo.findInvoiceById(invoice.id);
    expect(invoiceStep2?.balance).toBe(0);
    expect(invoiceStep2?.amountPaid).toBe(14000);

    // Step 3: Add KES 3,000 arrears via addOrUpdateManualArrear
    const arrearResult = await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 3000,
        reason: 'Term 1 Carried Arrears',
        academicYearId,
        termId: term1Id
      },
      bursarUserContext
    );

    expect(arrearResult.success).toBe(true);

    // Step 4: Confirm automatic utilization of KES 3,000 and receipt FCUR-YYYY-XXXXX generation
    const applications = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(applications.length).toBe(1);
    const fcuReceiptNumber = applications[0].receiptNumber!;
    expect(fcuReceiptNumber).toMatch(/^FCUR-\d{4}-\d{5}$/);
    expect(applications[0].amountApplied).toBe(3000);

    // Step 5: Confirm remaining credit is KES 3,000
    const creditsStep5 = await feeRepo.findCredits({ studentId: student.id });
    expect(creditsStep5.length).toBe(1);
    expect(creditsStep5[0].balance).toBe(3000);
    expect(creditsStep5[0].amountUsed).toBe(3000);
    expect(creditsStep5[0].status).toBe('PARTIALLY_USED');

    // Step 6: Verify original KES 20,000 payment receipt remains unchanged
    const payments = await feeRepo.findPayments({ studentId: student.id });
    expect(payments.length).toBe(1);
    expect(payments[0].receiptNumber).toBe(origReceiptNumber);
    expect(payments[0].amount).toBe(20000);
    expect(payments[0].transactionReference).toBe('DEP-KCB-99001');

    // Step 7: Verify newly generated KES 3,000 FCU receipt is retrievable with correct breakdown
    const fcuDoc = await feeUseCases.getCreditUtilizationReceipt(fcuReceiptNumber, bursarUserContext);
    expect(fcuDoc).toBeDefined();
    expect(fcuDoc.receipt.receiptNumber).toBe(fcuReceiptNumber);
    expect(fcuDoc.receipt.totalCreditUtilized).toBe(3000);
    expect(fcuDoc.receipt.remainingCredit).toBe(3000);
    expect(fcuDoc.receipt.outstandingBalanceBefore).toBe(3000);
    expect(fcuDoc.receipt.outstandingBalanceAfter).toBe(0);
    expect(fcuDoc.receipt.statement).toContain(
      'THIS DOCUMENT CONFIRMS THE UTILIZATION OF PREVIOUSLY RECEIVED FEE CREDIT. IT IS NOT A NEW CASH, BANK OR MOBILE MONEY PAYMENT.'
    );
    expect(fcuDoc.receipt.originatingPaymentReferences).toContain(origReceiptNumber);

    // Step 8: Verify both documents are available for Parent and Finance roles
    // Finance role access
    const financeReceipts = await feeUseCases.getStudentCreditUtilizationReceipts(student.id, bursarUserContext);
    expect(financeReceipts.some(r => r.receiptNumber === fcuReceiptNumber)).toBe(true);

    // Parent role access for linked child
    const parentReceipts = await feeUseCases.getStudentCreditUtilizationReceipts(student.id, parentUserContext);
    expect(parentReceipts.some(r => r.receiptNumber === fcuReceiptNumber)).toBe(true);

    const parentSingleDoc = await feeUseCases.getCreditUtilizationReceipt(fcuReceiptNumber, parentUserContext);
    expect(parentSingleDoc.receipt.receiptNumber).toBe(fcuReceiptNumber);

    // Step 9: Confirm all fee ledgers report the same balances
    // 9a: getStudentFeeAccounts
    const accounts = await feeUseCases.getStudentFeeAccounts({
      schoolId,
      academicYearId,
      termId: term3Id,
      requestingUser: bursarUserContext
    });
    const account = accounts.accounts.find(a => a.studentId === student.id);
    expect(account).toBeDefined();
    expect(account!.balance).toBe(0);
    expect(account!.overpaymentCredit).toBe(3000);

    // 9b: getLearnerFeePosition
    const feePosition = await feeUseCases.getLearnerFeePosition(
      student.id,
      { academicYearId, termId: term3Id },
      bursarUserContext
    );
    expect(feePosition.financialPosition.outstandingBalance).toBe(0);
    expect(feePosition.financialPosition.overpaymentCredit).toBe(3000);

    // 9c: getFinanceSummary
    const summary = await feeUseCases.getFinanceSummary(schoolId, bursarUserContext);
    expect(summary.totalCollected).toBe(20000); // Only genuine payment of 20,000

    // 9d: getCashFlowLedger
    const cashFlow = await feeUseCases.getCashFlowLedger(schoolId, undefined, bursarUserContext);
    expect(cashFlow.totalMoneyIn).toBe(20000);
    expect(cashFlow.feeInflow).toBe(20000);
  });
});
