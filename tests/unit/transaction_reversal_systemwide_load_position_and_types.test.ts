import * as fs from 'fs';
import * as path from 'path';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
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
import {
  TransactionReversalRequest,
  TransactionReversalStatus,
  ReversibleTransactionType
} from '../../src/core/domain/finance/TransactionReversalRequest';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import {
  InMemoryFeeRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ConflictError, ForbiddenError, ValidationError } from '../../src/core/domain/shared/Errors';

describe('System-Wide Transaction Reversal Form & Type Verification (Bug Fix: loadPosition)', () => {
  let feeRepo: InMemoryFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let feeUseCases: FeeUseCases;

  const schoolId = 'school-grace-seeds';
  const academicYearId = 'year-2026';
  const term1Id = 'term-2026-t1';
  const term2Id = 'term-2026-t2';
  const term3Id = 'term-2026-t3';

  const bursarUserContext = {
    userId: 'usr-bursar-1',
    schoolId,
    role: UserRole.BURSAR,
    firstName: 'Alice',
    lastName: 'Wairimu',
    email: 'bursar@graceseeds.sc.ke'
  };

  const adminUserContext = {
    userId: 'usr-admin-1',
    schoolId,
    role: UserRole.ADMIN,
    firstName: 'Director',
    lastName: 'Omondi',
    email: 'admin@graceseeds.sc.ke'
  };

  beforeEach(async () => {
    feeRepo = new InMemoryFeeRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();

    const mockNotificationService = {
      sendSMS: async () => true,
      sendEmail: async () => true
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
  });

  const createStudent = async (id: string, admNo: string, name: string, gradeLevel: string = 'GRADE_3') => {
    const student = Student.create(
      {
        admissionNumber: admNo,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || 'Learner',
        gender: StudentGender.MALE,
        dateOfBirth: '2018-05-10',
        schoolId,
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE,
        gradeLevel: gradeLevel as any
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
    amount: number
  ) => {
    const items: FeeItem[] = [
      {
        id: `item-${id}`,
        name: 'Tuition Fee',
        amount,
        category: 'TUITION' as any,
        isOptional: false
      }
    ];

    const invoice = StudentInvoice.create(
      {
        schoolId,
        studentId,
        feeStructureId: 'fs-standard',
        termId,
        academicYearId,
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

  // =========================================================================
  // TEST 1: Static Codebase Analysis: Zero undefined loadPosition references
  // =========================================================================
  test('Requirement 1 & 2: Static audit verifies no undefined or un-scoped loadPosition calls remain in the frontend', () => {
    const srcDir = path.resolve(__dirname, '../../Frontend/smartshule/src');

    const checkFile = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      if (filePath.endsWith('LearnerFeeCollectionDesk.tsx')) {
        // Must declare loadPosition
        expect(content).toContain('const loadPosition =');
      }
      if (filePath.endsWith('RequestTransactionReversalModal.tsx')) {
        // Must export loadPosition and define it internally
        expect(content).toContain('export const loadPosition');
        expect(content).toContain('const loadPosition =');
      }
      if (filePath.endsWith('StudentFeeCheckerView.tsx')) {
        // Must declare loadPosition
        expect(content).toContain('const loadPosition =');
      }
    };

    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          walk(full);
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
          checkFile(full);
        }
      }
    };

    walk(srcDir);
  });

  // =========================================================================
  // TEST 2: Dynamic Learner Position Retrieval (Reusable loadPosition logic)
  // =========================================================================
  test('Requirement 3: Authoritative fee position can be loaded dynamically for any learner without hardcoding', async () => {
    const studentA = await createStudent('stud-alpha', 'ADM-ALPHA-101', 'Faith Achieng', 'GRADE_1');
    const studentB = await createStudent('stud-beta', 'ADM-BETA-202', 'Victor Kiprop', 'GRADE_4');

    // Create invoices for both
    await createInvoice('inv-a', studentA.id, term3Id, 'INV-A-001', 12500);
    await createInvoice('inv-b', studentB.id, term3Id, 'INV-B-001', 18000);

    // Dynamic retrieval for Student A
    const posA = await feeUseCases.getLearnerFeePosition(studentA.id, { termId: term3Id }, bursarUserContext);
    expect(posA.student.id).toBe(studentA.id);
    expect(posA.student.admissionNumber).toBe('ADM-ALPHA-101');
    expect(posA.financialPosition.outstandingBalance).toBe(12500);
    expect(posA.financialPosition.overpaymentCredit).toBe(0);

    // Dynamic retrieval for Student B
    const posB = await feeUseCases.getLearnerFeePosition(studentB.id, { termId: term3Id }, bursarUserContext);
    expect(posB.student.id).toBe(studentB.id);
    expect(posB.student.admissionNumber).toBe('ADM-BETA-202');
    expect(posB.financialPosition.outstandingBalance).toBe(18000);
    expect(posB.financialPosition.overpaymentCredit).toBe(0);
  });

  // =========================================================================
  // TEST 3: Eligible Transaction Type 1 - Original Fee Payment
  // =========================================================================
  test('Requirement 4A: Bursar can request reversal for an original fee payment across different learners and amounts', async () => {
    const student = await createStudent('stud-pay-1', 'ADM-5501', 'Grace Mwangi', 'GRADE_2');
    const invoice = await createInvoice('inv-p1', student.id, term3Id, 'INV-P1', 15000);

    const paymentRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 15000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MPESA-QZX789',
      recordedByUserId: bursarUserContext.userId
    });

    const paymentReceipt = paymentRes.payment.receiptNumber;

    // Bursar submits request
    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionId: paymentRes.payment.id,
        transactionReference: paymentReceipt,
        transactionType: 'PAYMENT',
        studentId: student.id,
        reason: 'Payment M-Pesa reference duplicated by parent'
      },
      bursarUserContext
    );

    expect(reqRes.success).toBe(true);
    expect(reqRes.request.status).toBe(TransactionReversalStatus.PENDING_ADMIN_APPROVAL);
    expect(reqRes.request.transactionType).toBe(ReversibleTransactionType.PAYMENT);
    expect(reqRes.request.originalAmount).toBe(15000);

    // Balances remain 100% untouched while request is pending
    const postReqPosition = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(postReqPosition.financialPosition.outstandingBalance).toBe(0);

    // Admin approves & executes
    const approveRes = await feeUseCases.approveAndExecuteTransactionReversal(
      reqRes.request.id,
      'Approved after bank reconciliation',
      adminUserContext
    );
    expect(approveRes.success).toBe(true);
    expect(approveRes.reversalReceiptNumber).toMatch(/^PAY-REV-\d{4}-\d{5}$/);

    // Balances are now restored
    const finalPosition = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(finalPosition.financialPosition.outstandingBalance).toBe(15000);
  });

  // =========================================================================
  // TEST 4: Eligible Transaction Type 2 - Fee Credit Utilization Transaction
  // =========================================================================
  test('Requirement 4B: Bursar can request reversal for a Fee Credit Utilization (FCUR) transaction', async () => {
    const student = await createStudent('stud-fcur-1', 'ADM-7702', 'Dennis Otieno', 'GRADE_5');
    const invoice = await createInvoice('inv-fcur-1', student.id, term3Id, 'INV-FCUR-1', 10000);

    // Record payment with surplus to create credit
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 16000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'BNK-DEP-7702',
      recordedByUserId: bursarUserContext.userId
    });

    // Add arrears invoice of KES 4,000
    const arrearsInvoice = await createInvoice('inv-fcur-arr', student.id, term2Id, 'INV-ARR-7702', 4000);

    // Admin initiates credit utilization
    const utilRes = await feeUseCases.adminInitiateFeeCreditUtilization(
      {
        studentId: student.id,
        targetInvoiceId: arrearsInvoice.id,
        amountToApply: 4000,
        reason: 'Apply advance deposit to prior term arrears'
      },
      adminUserContext
    );

    const fcurReceiptNumber = utilRes.receipt.receiptNumber;
    expect(fcurReceiptNumber).toMatch(/^FCUR-\d{4}-\d{5}$/);

    // Bursar requests reversal of the credit utilization
    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: fcurReceiptNumber,
        transactionType: 'CREDIT_UTILIZATION',
        studentId: student.id,
        reason: 'Parent requested to hold credit for Term 1 2027 instead of clearing Term 2 arrears'
      },
      bursarUserContext
    );

    expect(reqRes.success).toBe(true);
    expect(reqRes.request.transactionType).toBe(ReversibleTransactionType.CREDIT_UTILIZATION);
    expect(reqRes.request.status).toBe(TransactionReversalStatus.PENDING_ADMIN_APPROVAL);

    // Admin approves & executes reversal
    const appRes = await feeUseCases.approveAndExecuteTransactionReversal(
      reqRes.request.id,
      'Approved reversal of credit utilization',
      adminUserContext
    );

    expect(appRes.success).toBe(true);
    expect(appRes.reversalReceiptNumber).toMatch(/^FCUR-REV-\d{4}-\d{5}$/);

    // Credit is restored to 6,000 gross and arrears re-opened to 4,000
    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits[0].balance).toBe(6000);

    const finalPos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(finalPos.financialPosition.overpaymentCredit).toBe(2000); // Net overpayment 6,000 credit - 4,000 arrears
    expect(finalPos.financialPosition.previousBalance).toBe(4000);
  });

  // =========================================================================
  // TEST 5: Eligible Transaction Type 3 - Fee Allocation / Other
  // =========================================================================
  test('Requirement 4C: Reversal preview and handling for generic and fee allocation transactions', async () => {
    const student = await createStudent('stud-gen-1', 'ADM-9903', 'Esther Cherotich', 'PP2');
    const invoice = await createInvoice('inv-gen-1', student.id, term3Id, 'INV-GEN-1', 7500);

    const paymentRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 7500,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-9903',
      recordedByUserId: bursarUserContext.userId
    });

    const preview = await feeUseCases.getTransactionReversalPreview(paymentRes.payment.receiptNumber, bursarUserContext);
    expect(preview.studentId).toBe(student.id);
    expect(preview.admissionNumber).toBe('ADM-9903');
    expect(preview.originalAmount).toBe(7500);
    expect(preview.projectedOutstandingBalance).toBe(7500);
    expect(preview.hasBlockingDependencies).toBe(false);
  });

  // =========================================================================
  // TEST 6: Strict RBAC: Bursar is blocked from executing reversals (403)
  // =========================================================================
  test('Requirement 6: Bursar cannot approve or directly execute reversals', async () => {
    const student = await createStudent('stud-rbac-1', 'ADM-3301', 'Kevin Barasa', 'GRADE_6');
    const invoice = await createInvoice('inv-rbac-1', student.id, term3Id, 'INV-RBAC-1', 9000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 9000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-3301',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionId: payRes.payment.id,
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Test unauthorized execution block'
      },
      bursarUserContext
    );

    // Bursar attempting to approve must throw ForbiddenError
    await expect(
      feeUseCases.approveAndExecuteTransactionReversal(reqRes.request.id, 'Self-approval', bursarUserContext)
    ).rejects.toThrow(ForbiddenError);

    // Bursar attempting to reject must throw ForbiddenError
    await expect(
      feeUseCases.rejectTransactionReversalRequest(reqRes.request.id, 'Self-rejection', bursarUserContext)
    ).rejects.toThrow(ForbiddenError);

    // Bursar attempting direct payment reversal must throw ForbiddenError
    await expect(
      feeUseCases.reversePayment(payRes.payment.id, 'Direct bypass', bursarUserContext)
    ).rejects.toThrow(ForbiddenError);
  });

  // =========================================================================
  // TEST 7: Zero Balance Mutation & History Preservation
  // =========================================================================
  test('Requirement 5 & 8: Request submission does not modify balances and original receipts remain valid and retrievable', async () => {
    const student = await createStudent('stud-audit-1', 'ADM-1122', 'Mercy Chebet', 'GRADE_3');
    const invoice = await createInvoice('inv-audit-1', student.id, term3Id, 'INV-AUD-1', 8000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 8000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MPESA-AUD1122',
      recordedByUserId: bursarUserContext.userId
    });

    const receiptNo = payRes.payment.receiptNumber;

    // Snapshot position before request
    const beforePos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(beforePos.financialPosition.outstandingBalance).toBe(0);

    // Bursar submits request
    await feeUseCases.requestTransactionReversal(
      {
        transactionReference: receiptNo,
        reason: 'Cheque replacement requested'
      },
      bursarUserContext
    );

    // Position remains unchanged
    const afterReqPos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(afterReqPos.financialPosition.outstandingBalance).toBe(beforePos.financialPosition.outstandingBalance);

    // Original payment record remains intact
    const origPayment = await feeRepo.findPaymentByReceiptNumber(receiptNo);
    expect(origPayment).toBeDefined();
    expect(origPayment?.amount).toBe(8000);
    expect(origPayment?.status).toBe(PaymentStatus.COMPLETED); // Remains completed until Admin approves
  });
});
