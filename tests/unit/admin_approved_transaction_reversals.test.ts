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
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
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
import { ConflictError, ForbiddenError, ValidationError } from '../../src/core/domain/shared/Errors';

describe('SMARTSHULE FINANCE — Admin-Approved Transaction Reversal Workflow', () => {
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

    const admin = User.create({
      schoolId,
      email: 'admin@graceseeds.sc.ke',
      passwordHash: 'hash123',
      firstName: 'George',
      lastName: 'Headteacher',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE
    }, 'usr-admin-1');
    await userRepo.save(admin);

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

  // Helper methods
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
    amount: number
  ): Promise<StudentInvoice> => {
    const items: FeeItem[] = [
      {
        id: `item-${id}`,
        name: 'Term Tuition Fee',
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

  const linkGuardian = async (guardianId: string, userId: string, studentId: string) => {
    const g = Guardian.create(
      {
        userId,
        studentIds: [studentId],
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '0712345678'
      },
      guardianId
    );
    await guardianRepo.save(g);
    return g;
  };

  // ==========================================
  // SCENARIO 1: Bursar can submit a reversal request
  // ==========================================
  test('Scenario 1: Bursar can submit a reversal request with reason and metadata', async () => {
    const student = await createStudent('stud-1', 'ADM-001', 'Brian Omondi');
    const invoice = await createInvoice('inv-1', student.id, term3Id, 'INV-001', 10000);

    const paymentRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 10000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-10001',
      recordedByUserId: bursarUserContext.userId
    });

    const receiptNumber = paymentRes.payment.receiptNumber;

    // Bursar requests reversal
    const requestRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: receiptNumber,
        reason: 'Duplicate teller entry recorded on same deposit slip',
        explanation: 'Bank statement shows single deposit of KES 10,000 only'
      },
      bursarUserContext
    );

    expect(requestRes.success).toBe(true);
    expect(requestRes.request).toBeDefined();
    expect(requestRes.request.requestReference).toMatch(/^REV-REQ-\d{4}-\d{5}$/);
    expect(requestRes.request.status).toBe(TransactionReversalStatus.PENDING_ADMIN_APPROVAL);
    expect(requestRes.request.originalAmount).toBe(10000);
    expect(requestRes.request.studentName).toBe('Brian Omondi');
    expect(requestRes.request.requestedByName).toBe('Faith Bursar');
  });

  // ==========================================
  // SCENARIO 2: Bursar cannot execute a reversal through the API (Throws 403 Forbidden)
  // ==========================================
  test('Scenario 2: Bursar cannot execute a reversal through the API (throws 403 Forbidden)', async () => {
    const student = await createStudent('stud-2', 'ADM-002', 'Cynthia Wambui');
    const invoice = await createInvoice('inv-2', student.id, term3Id, 'INV-002', 8000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 8000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-80001',
      recordedByUserId: bursarUserContext.userId
    });

    const paymentId = payRes.payment.id;
    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionId: paymentId,
        reason: 'Erroneous cash payment logged'
      },
      bursarUserContext
    );

    const requestId = reqRes.request.id;

    // Direct execute approval by Bursar is strictly forbidden!
    await expect(
      feeUseCases.approveAndExecuteTransactionReversal(requestId, 'Bursar attempting self execution', bursarUserContext)
    ).rejects.toThrow(ForbiddenError);

    // Direct call to reversePayment by Bursar is strictly forbidden!
    await expect(
      feeUseCases.reversePayment(paymentId, 'Direct execution attempt', bursarUserContext)
    ).rejects.toThrow(ForbiddenError);
  });

  // ==========================================
  // SCENARIO 3: Request submission does not change financial balances
  // ==========================================
  test('Scenario 3: Request submission does not change financial balances', async () => {
    const student = await createStudent('stud-3', 'ADM-003', 'Dennis Kipkemoi');
    const invoice = await createInvoice('inv-3', student.id, term3Id, 'INV-003', 12000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 15000, // 12,000 settled + 3,000 credit
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-15000',
      recordedByUserId: bursarUserContext.userId
    });

    // Balances right after payment
    const posBefore = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(posBefore.financialPosition.outstandingBalance).toBe(0);
    expect(posBefore.financialPosition.overpaymentCredit).toBe(3000);

    // Bursar requests reversal
    await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Parent brought incorrect slip'
      },
      bursarUserContext
    );

    // Balances while request is PENDING remain 100% UNCHANGED!
    const posDuring = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(posDuring.financialPosition.outstandingBalance).toBe(0);
    expect(posDuring.financialPosition.overpaymentCredit).toBe(3000);

    const refreshedInvoice = await feeRepo.findInvoiceById(invoice.id);
    expect(refreshedInvoice?.balance).toBe(0);
    expect(refreshedInvoice?.amountPaid).toBe(12000);

    const refreshedCredits = await feeRepo.findCredits({ studentId: student.id });
    expect(refreshedCredits[0].balance).toBe(3000);
    expect(refreshedCredits[0].status).toBe('AVAILABLE');
  });

  // ==========================================
  // SCENARIO 4: Administrator can approve and execute a valid request
  // ==========================================
  test('Scenario 4: Administrator can approve and execute a valid reversal request', async () => {
    const student = await createStudent('stud-4', 'ADM-004', 'Eunice Nyambura');
    const invoice = await createInvoice('inv-4', student.id, term3Id, 'INV-004', 7000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 7000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-70001',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Erroneous cash payment allocation'
      },
      bursarUserContext
    );

    // Administrator approves and executes
    const approvalRes = await feeUseCases.approveAndExecuteTransactionReversal(
      reqRes.request.id,
      'Approved after verifying cashier logbook',
      adminUserContext
    );

    expect(approvalRes.success).toBe(true);
    expect(approvalRes.reversalReceiptNumber).toMatch(/^PAY-REV-\d{4}-\d{5}$/);
    expect(approvalRes.request.status).toBe(TransactionReversalStatus.COMPLETED);

    // Balance is restored to 7,000
    const invAfter = await feeRepo.findInvoiceById(invoice.id);
    expect(invAfter?.balance).toBe(7000);
    expect(invAfter?.amountPaid).toBe(0);
  });

  // ==========================================
  // SCENARIO 5: Administrator can reject a request with a mandatory reason
  // ==========================================
  test('Scenario 5: Administrator can reject a request with a mandatory reason', async () => {
    const student = await createStudent('stud-5', 'ADM-005', 'Felix Kiprono');
    const invoice = await createInvoice('inv-5', student.id, term3Id, 'INV-005', 5000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 5000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-50001',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Parent claiming wrong grade level'
      },
      bursarUserContext
    );

    // Rejection without reason fails
    await expect(
      feeUseCases.rejectTransactionReversalRequest(reqRes.request.id, '', adminUserContext)
    ).rejects.toThrow(ValidationError);

    // Rejection with reason succeeds
    const rejectRes = await feeUseCases.rejectTransactionReversalRequest(
      reqRes.request.id,
      'Bank statement confirms genuine deposit matching learner registration',
      adminUserContext
    );

    expect(rejectRes.success).toBe(true);
    expect(rejectRes.request.status).toBe(TransactionReversalStatus.REJECTED);
    expect(rejectRes.request.rejectionReason).toBe(
      'Bank statement confirms genuine deposit matching learner registration'
    );

    // Transaction remains valid and balance remains 0
    const inv = await feeRepo.findInvoiceById(invoice.id);
    expect(inv?.balance).toBe(0);
  });

  // ==========================================
  // SCENARIO 6: Bursar can see the final decision
  // ==========================================
  test('Scenario 6: Bursar can see the final decision and audit comments', async () => {
    const student = await createStudent('stud-6', 'ADM-006', 'Grace Muthoni');
    const invoice = await createInvoice('inv-6', student.id, term3Id, 'INV-006', 4000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 4000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-40001',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Payment recorded to wrong learner'
      },
      bursarUserContext
    );

    await feeUseCases.approveAndExecuteTransactionReversal(
      reqRes.request.id,
      'Approved: Transferring funds to correct sibling account',
      adminUserContext
    );

    // Bursar fetches request
    const bursarView = await feeUseCases.getTransactionReversalById(reqRes.request.id, bursarUserContext);
    expect(bursarView.status).toBe(TransactionReversalStatus.COMPLETED);
    expect(bursarView.reviewedByName).toBe('George Headteacher');
    expect(bursarView.approvalComment).toBe('Approved: Transferring funds to correct sibling account');
    expect(bursarView.reversalReceiptNumber).toBeDefined();
  });

  // ==========================================
  // SCENARIO 7: Approved reversal generates a separate reversal transaction
  // ==========================================
  test('Scenario 7: Approved reversal generates a separate linked reversal transaction', async () => {
    const student = await createStudent('stud-7', 'ADM-007', 'Hassan Ali');
    const invoice = await createInvoice('inv-7', student.id, term3Id, 'INV-007', 9000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 9000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-90001',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Bounced cheque from employer'
      },
      bursarUserContext
    );

    const approval = await feeUseCases.approveAndExecuteTransactionReversal(
      reqRes.request.id,
      'Approved following bank return slip',
      adminUserContext
    );

    expect(approval.reversalReceipt).toBeDefined();
    expect(approval.reversalReceipt.reversalReceiptNumber).toMatch(/^PAY-REV-\d{4}-\d{5}$/);
    expect(approval.reversalReceipt.originalTransactionReference).toBe(payRes.payment.transactionReference);
    expect(approval.reversalReceipt.amountReversed).toBe(9000);
  });

  // ==========================================
  // SCENARIO 8: Successful reversal generates a formal reversal receipt
  // ==========================================
  test('Scenario 8: Successful reversal generates a formal reversal receipt with mandatory notice', async () => {
    const student = await createStudent('stud-8', 'ADM-008', 'Irene Chebet');
    const invoice = await createInvoice('inv-8', student.id, term3Id, 'INV-008', 6000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 6000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-60001',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Counter receipt error'
      },
      bursarUserContext
    );

    const approval = await feeUseCases.approveAndExecuteTransactionReversal(
      reqRes.request.id,
      'Approved',
      adminUserContext
    );

    const doc = await feeUseCases.getReversalReceiptDocument(approval.reversalReceiptNumber, bursarUserContext);
    expect(doc.receipt.mandatoryNoticeStatement).toBe(
      'THIS DOCUMENT CONFIRMS THE REVERSAL OF A PREVIOUS FINANCIAL TRANSACTION. IT IS NOT A NEW CASH, BANK OR MOBILE MONEY PAYMENT.'
    );
    expect(doc.receipt.schoolName).toBe('Grace Seeds School');
    expect(doc.receipt.resultingBalances.outstandingBalance).toBe(6000);
  });

  // ==========================================
  // SCENARIO 9: Original receipt remains unchanged
  // ==========================================
  test('Scenario 9: Original receipt remains unchanged and retrievable', async () => {
    const student = await createStudent('stud-9', 'ADM-009', 'John Mwangi');
    const invoice = await createInvoice('inv-9', student.id, term3Id, 'INV-009', 11000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 11000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-11001',
      recordedByUserId: bursarUserContext.userId
    });

    const origReceiptNumber = payRes.payment.receiptNumber;

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: origReceiptNumber,
        reason: 'Direct counter error'
      },
      bursarUserContext
    );

    await feeUseCases.approveAndExecuteTransactionReversal(reqRes.request.id, 'Approved', adminUserContext);

    // Original payment record is still in the database with status REVERSED
    const payment = await feeRepo.findPaymentByReceiptNumber(origReceiptNumber);
    expect(payment).toBeDefined();
    expect(payment?.status).toBe(PaymentStatus.REVERSED);
    expect(payment?.receiptNumber).toBe(origReceiptNumber);
    expect(payment?.amount).toBe(11000);
  });

  // ==========================================
  // SCENARIO 10: Duplicate execution is prevented
  // ==========================================
  test('Scenario 10: Duplicate execution is prevented on completed requests', async () => {
    const student = await createStudent('stud-10', 'ADM-010', 'Kipchumba Ronoh');
    const invoice = await createInvoice('inv-10', student.id, term3Id, 'INV-010', 3000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 3000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-30001',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Testing duplicate prevention'
      },
      bursarUserContext
    );

    // First execution
    await feeUseCases.approveAndExecuteTransactionReversal(reqRes.request.id, 'First execution', adminUserContext);

    // Second execution must be rejected
    await expect(
      feeUseCases.approveAndExecuteTransactionReversal(reqRes.request.id, 'Second execution', adminUserContext)
    ).rejects.toThrow(/already been completed/i);
  });

  // ==========================================
  // SCENARIO 11: Already reversed transactions cannot be reversed again
  // ==========================================
  test('Scenario 11: Already reversed transactions cannot be reversed again', async () => {
    const student = await createStudent('stud-11', 'ADM-011', 'Lucy Wangari');
    const invoice = await createInvoice('inv-11', student.id, term3Id, 'INV-011', 5000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 5000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-50001',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Initial reversal'
      },
      bursarUserContext
    );

    await feeUseCases.approveAndExecuteTransactionReversal(reqRes.request.id, 'Approved', adminUserContext);

    // Attempting to submit another request for the already reversed payment is blocked!
    await expect(
      feeUseCases.requestTransactionReversal(
        {
          transactionReference: payRes.payment.receiptNumber,
          reason: 'Second reversal request attempt'
        },
        bursarUserContext
      )
    ).rejects.toThrow(/already been reversed/i);
  });

  // ==========================================
  // SCENARIO 12: Credit utilization reversal workflow
  // ==========================================
  test('Scenario 12: Specific Fee Credit Utilization Reversal workflow', async () => {
    const student = await createStudent('stud-12', 'ADM-012', 'Moses Odhiambo');

    // Invoice of 14,000 paid with 20,000 -> 6,000 credit
    const invoice = await createInvoice('inv-12', student.id, term3Id, 'INV-012', 14000);
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 20000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-20000',
      recordedByUserId: bursarUserContext.userId
    });

    // Add 3,000 arrears
    await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 3000,
        reason: 'Term 1 Arrears',
        academicYearId,
        termId: term1Id
      },
      bursarUserContext
    );

    // 3,000 was auto-applied. Find the FCUR receipt.
    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(1);
    const fcurReceiptNumber = apps[0].receiptNumber!;

    // Bursar requests reversal of the credit utilization
    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: fcurReceiptNumber,
        reason: 'Parent requested to retain advance credit for Term 1 sibling'
      },
      bursarUserContext
    );

    expect(reqRes.request.transactionType).toBe(ReversibleTransactionType.CREDIT_UTILIZATION);

    // Admin reviews and approves
    const approval = await feeUseCases.approveAndExecuteTransactionReversal(
      reqRes.request.id,
      'Approved by Headteacher',
      adminUserContext
    );

    expect(approval.success).toBe(true);
    expect(approval.reversalReceiptNumber).toMatch(/^FCUR-REV-\d{4}-\d{5}$/);

    // Credit is restored to 6,000 and arrears re-open to 3,000
    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits[0].balance).toBe(6000);

    const feePos = await feeUseCases.getLearnerFeePosition(student.id, { termId: term3Id }, bursarUserContext);
    expect(feePos.financialPosition.outstandingBalance).toBe(0); // Offset by credit in net view
    expect(feePos.financialPosition.overpaymentCredit).toBe(3000); // 6,000 credit - 3,000 arrears = 3,000 net overpaid
  });

  // ==========================================
  // SCENARIO 13: Dependent fee allocations are handled safely and presented in impact preview
  // ==========================================
  test('Scenario 13: Dependent fee allocations are flagged as blocking if credit was already utilized', async () => {
    const student = await createStudent('stud-13', 'ADM-013', 'Naomi Wanja');
    const invoice = await createInvoice('inv-13', student.id, term3Id, 'INV-013', 14000);

    // Pay 20,000 -> 6,000 credit
    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 20000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-20000-B',
      recordedByUserId: bursarUserContext.userId
    });

    // Add arrears which consumes 3,000 of the credit
    await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 3000,
        reason: 'Arrears consuming credit',
        academicYearId,
        termId: term1Id
      },
      bursarUserContext
    );

    // Now try to request reversal of the ORIGINAL 20,000 payment
    const preview = await feeUseCases.getTransactionReversalPreview(payRes.payment.receiptNumber, adminUserContext);

    expect(preview.hasBlockingDependencies).toBe(true);
    expect(preview.blockingReason).toContain('Downstream credit utilizations must be reversed first');
    expect(preview.dependentTransactions.length).toBeGreaterThan(0);
  });

  // ==========================================
  // SCENARIO 14: Concurrent approval attempts cannot reverse the same amount twice
  // ==========================================
  test('Scenario 14: Concurrent approval attempts are safely serialized and prevent duplicate reversals', async () => {
    const student = await createStudent('stud-14', 'ADM-014', 'Peter Kamau');
    const invoice = await createInvoice('inv-14', student.id, term3Id, 'INV-014', 4000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 4000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-40001-C',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Concurrency test'
      },
      bursarUserContext
    );

    // Concurrent approval execution
    const results = await Promise.allSettled([
      feeUseCases.approveAndExecuteTransactionReversal(reqRes.request.id, 'Admin A', adminUserContext),
      feeUseCases.approveAndExecuteTransactionReversal(reqRes.request.id, 'Admin B', adminUserContext)
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const inv = await feeRepo.findInvoiceById(invoice.id);
    expect(inv?.balance).toBe(4000); // Reversed only once!
  });

  // ==========================================
  // SCENARIO 15: Failed execution does not create a completed receipt and allows retry
  // ==========================================
  test('Scenario 15: Failed execution does not create a misleading completed receipt and allows safe retry', async () => {
    const student = await createStudent('stud-15', 'ADM-015', 'Rose Achieng');
    const invoice = await createInvoice('inv-15', student.id, term3Id, 'INV-015', 5000);

    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 5000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-50001-R',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Test execution failure recovery'
      },
      bursarUserContext
    );

    const originalReq = await feeRepo.findReversalRequestById(reqRes.request.id);
    originalReq!.markFailed('Simulated database connection timeout', adminUserContext.userId, 'Admin');
    await feeRepo.saveReversalRequest(originalReq!);

    // In failed state, no completed reversal receipt exists
    expect(originalReq!.reversalReceiptNumber).toBeUndefined();
    expect(originalReq!.status).toBe(TransactionReversalStatus.FAILED);

    // Retry execution succeeds
    const retryRes = await feeUseCases.retryFailedTransactionReversal(reqRes.request.id, adminUserContext);
    expect(retryRes.success).toBe(true);
    expect(retryRes.reversalReceiptNumber).toMatch(/^PAY-REV-\d{4}-\d{5}$/);
    expect(retryRes.request.status).toBe(TransactionReversalStatus.COMPLETED);
  });

  // ==========================================
  // SCENARIO 16: Unauthorized roles cannot access another learner's reversal records
  // ==========================================
  test("Scenario 16: Unauthorized parent cannot access another learner's reversal records (403 Forbidden)", async () => {
    const student = await createStudent('stud-16', 'ADM-016', 'Silvia Chepkemoi');
    await linkGuardian('g-16', 'usr-parent-1', student.id); // Linked only to Parent 1

    const invoice = await createInvoice('inv-16', student.id, term3Id, 'INV-016', 6000);
    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 6000,
      paymentMethod: PaymentMethod.CASH,
      transactionReference: 'CSH-60001-S',
      recordedByUserId: bursarUserContext.userId
    });

    const reqRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: payRes.payment.receiptNumber,
        reason: 'Wrong student receipt'
      },
      bursarUserContext
    );

    // Parent 1 (linked) can view
    const p1View = await feeUseCases.getTransactionReversalById(reqRes.request.id, parentUserContext);
    expect(p1View).toBeDefined();

    // Parent 2 (unlinked) is rejected with 403 Forbidden!
    await expect(
      feeUseCases.getTransactionReversalById(reqRes.request.id, otherParentUserContext)
    ).rejects.toThrow(ForbiddenError);
  });

  // ==========================================
  // SCENARIO 17: Section 14 Complete 15-Step Workflow Demonstration
  // ==========================================
  test('Scenario 17: Section 14 Complete 15-Step Local Workflow Demonstration', async () => {
    // 0. Setup learner linked to parent
    const student = await createStudent('stud-17', 'ADM-017', 'Victor Kiprotich');
    await linkGuardian('g-17', 'usr-parent-1', student.id);

    const invoice = await createInvoice('inv-17', student.id, term3Id, 'INV-017-DEMO', 14000);

    // Step 1: Record a KES 20,000 payment
    const paymentRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      invoiceId: invoice.id,
      amount: 20000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'DEP-DEMO-20K',
      recordedByUserId: bursarUserContext.userId,
      bankName: 'KCB Bank Kenya'
    });

    const paymentReceiptNumber = paymentRes.payment.receiptNumber;
    expect(paymentReceiptNumber).toBeDefined();

    // Step 2: Confirm the correct KES 6,000 overpayment
    const creditsStep2 = await feeRepo.findCredits({ studentId: student.id });
    expect(creditsStep2.length).toBe(1);
    expect(creditsStep2[0].balance).toBe(6000);

    // Step 3: Add KES 3,000 arrears
    await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 3000,
        reason: 'Opening Arrears Balance',
        academicYearId,
        termId: term1Id
      },
      bursarUserContext
    );

    // Step 4: Confirm automatic KES 3,000 credit utilization
    const appsStep4 = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(appsStep4.length).toBe(1);
    expect(appsStep4[0].amountApplied).toBe(3000);

    // Step 5: Confirm the utilization receipt is generated
    const fcurReceiptNumber = appsStep4[0].receiptNumber!;
    expect(fcurReceiptNumber).toMatch(/^FCUR-\d{4}-\d{5}$/);

    // Step 6: Log in as Bursar & Step 7: Submit a reversal request with a reason
    const requestRes = await feeUseCases.requestTransactionReversal(
      {
        transactionReference: fcurReceiptNumber,
        reason: 'Parent requested to preserve advance credit for Term 1 tuition fee'
      },
      bursarUserContext
    );

    expect(requestRes.success).toBe(true);
    const reversalRequestId = requestRes.request.id;

    // Step 8: Confirm the transaction and balances remain unchanged while pending
    const creditsStep8 = await feeRepo.findCredits({ studentId: student.id });
    expect(creditsStep8[0].balance).toBe(3000); // Still 3,000 while pending!

    // Step 9: Log in as Administrator & Step 10: Review the request and its financial impact
    const preview = await feeUseCases.getTransactionReversalPreview(reversalRequestId, adminUserContext);
    expect(preview).toBeDefined();
    expect(preview.originalAmount).toBe(3000);
    expect(preview.hasBlockingDependencies).toBe(false);
    expect(preview.projectedCreditBalance).toBe(6000);

    // Step 11: Approve and execute the reversal
    const approvalRes = await feeUseCases.approveAndExecuteTransactionReversal(
      reversalRequestId,
      'Approved after reviewing parent written request',
      adminUserContext
    );

    expect(approvalRes.success).toBe(true);

    // Step 12: Confirm KES 3,000 credit is restored and arrears are recalculated correctly
    const creditsStep12 = await feeRepo.findCredits({ studentId: student.id });
    expect(creditsStep12[0].balance).toBe(6000); // 3,000 restored!

    // Step 13: Confirm the reversal receipt is generated
    const reversalReceiptNumber = approvalRes.reversalReceiptNumber;
    expect(reversalReceiptNumber).toMatch(/^FCUR-REV-\d{4}-\d{5}$/);

    const revDoc = await feeUseCases.getReversalReceiptDocument(reversalReceiptNumber, adminUserContext);
    expect(revDoc.receipt.reversalReceiptNumber).toBe(reversalReceiptNumber);
    expect(revDoc.receipt.amountReversed).toBe(3000);
    expect(revDoc.receipt.mandatoryNoticeStatement).toContain('THIS DOCUMENT CONFIRMS THE REVERSAL');

    // Step 14: Verify all fee ledgers and the Parent Portal agree
    const feePosition = await feeUseCases.getLearnerFeePosition(
      student.id,
      { academicYearId, termId: term3Id },
      parentUserContext
    );
    expect(feePosition.financialPosition.outstandingBalance).toBe(0); // Offset by credit
    expect(feePosition.financialPosition.overpaymentCredit).toBe(3000); // Net overpayment 6,000 credit - 3,000 arrears

    const accounts = await feeUseCases.getStudentFeeAccounts({
      schoolId,
      academicYearId,
      termId: term3Id
    });
    const acc = accounts.accounts.find(a => a.studentId === student.id);
    expect(acc?.balance).toBe(0);
    expect(acc?.overpaymentCredit).toBe(3000);

    // Step 15: Verify the original payment and utilization receipts remain accessible
    const origPayment = await feeRepo.findPaymentByReceiptNumber(paymentReceiptNumber);
    expect(origPayment).toBeDefined();
    expect(origPayment?.amount).toBe(20000);

    const fcurDoc = await feeUseCases.getCreditUtilizationReceipt(fcurReceiptNumber, parentUserContext);
    expect(fcurDoc.receipt.receiptNumber).toBe(fcurReceiptNumber);
    expect(fcurDoc.receipt.status).toBe('REVERSED');
    expect(fcurDoc.receipt.reversalReference).toBe(reversalReceiptNumber);
  });
});
