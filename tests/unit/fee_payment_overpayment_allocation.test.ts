import {
  FeeStructure,
  PaymentMethod,
  PaymentStatus,
  StudentInvoice,
  InvoiceStatus,
  StudentFeeCredit
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
import { FeePaymentAllocationService } from '../../src/core/domain/finance/FeePaymentAllocationService';
import { ValidationError } from '../../src/core/domain/shared/Errors';

describe('Strict Overpayment Eligibility & Payment Allocation Tests (Scenarios 1 - 14)', () => {
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
        dateOfBirth: '2019-05-15',
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

  const createInvoice = async (
    id: string,
    studentId: string,
    termId: string,
    invoiceNumber: string,
    amount: number,
    options?: { isArrear?: boolean; items?: any[] }
  ): Promise<StudentInvoice> => {
    const isManualArrear = options?.isArrear || invoiceNumber.includes('ARR');
    const items = options?.items || [
      {
        id: `item-${id}`,
        name: isManualArrear ? 'Manual Arrears Balance' : 'Term Tuition Fee',
        amount,
        category: isManualArrear ? 'OTHER' : 'TUITION',
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

  // --------------------------------------------------------------------------
  // Scenario 1: Arrears and current fees both outstanding
  // Arrears: 2,000 | Current: 5,000 | Payment: 8,000 -> 2,000 / 5,000 / 1,000
  // --------------------------------------------------------------------------
  test('Scenario 1: Arrears and current fees both outstanding (Pay 8,000 -> 2,000 arrears, 5,000 current, 1,000 overpayment)', async () => {
    const student = await createStudent('std-01', '0101', 'Alice Wanjiku');
    await createInvoice('inv-arr-01', student.id, term2Id, 'INV-ARR-01', 2000, { isArrear: true });
    await createInvoice('inv-cur-01', student.id, term3Id, 'INV-2026-01', 5000);

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 8000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-1'
    });

    expect(result.allocation.arrearsPaid).toBe(2000);
    expect(result.allocation.currentFeesPaid).toBe(5000);
    expect(result.allocation.overpaymentAmount).toBe(1000);
    expect(result.allocation.remainingArrears).toBe(0);
    expect(result.allocation.remainingCurrentFees).toBe(0);
    expect(result.allocation.isEligibleForOverpayment).toBe(true);

    // Verify invoice balances
    const arrInv = await feeRepo.findInvoiceById('inv-arr-01');
    const curInv = await feeRepo.findInvoiceById('inv-cur-01');
    expect(arrInv?.balance).toBe(0);
    expect(curInv?.balance).toBe(0);

    // Verify fee credit created
    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits.length).toBe(1);
    expect(credits[0].amount).toBe(1000);
    expect(credits[0].balance).toBe(1000);
    expect(credits[0].status).toBe('AVAILABLE');
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Payment partially clears arrears
  // Arrears: 2,000 | Current: 5,000 | Payment: 1,500 -> 1,500 / 0 / 0
  // --------------------------------------------------------------------------
  test('Scenario 2: Payment partially clears arrears (Pay 1,500 -> 1,500 arrears, 0 current, 0 overpayment)', async () => {
    const student = await createStudent('std-02', '0102', 'Brian Ochieng');
    await createInvoice('inv-arr-02', student.id, term2Id, 'INV-ARR-02', 2000, { isArrear: true });
    await createInvoice('inv-cur-02', student.id, term3Id, 'INV-2026-02', 5000);

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 1500,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-2'
    });

    expect(result.allocation.arrearsPaid).toBe(1500);
    expect(result.allocation.currentFeesPaid).toBe(0);
    expect(result.allocation.overpaymentAmount).toBe(0);
    expect(result.allocation.remainingArrears).toBe(500);
    expect(result.allocation.remainingCurrentFees).toBe(5000);
    expect(result.allocation.isEligibleForOverpayment).toBe(false);

    // Arrears invoice balance reduced to 500, current remains untouched
    const arrInv = await feeRepo.findInvoiceById('inv-arr-02');
    const curInv = await feeRepo.findInvoiceById('inv-cur-02');
    expect(arrInv?.balance).toBe(500);
    expect(curInv?.balance).toBe(5000);

    // Zero credit created
    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Payment clears arrears but only partially pays current fees
  // Arrears: 2,000 | Current: 5,000 | Payment: 3,000 -> 2,000 / 1,000 / 0
  // --------------------------------------------------------------------------
  test('Scenario 3: Payment clears arrears but only partially pays current fees (Pay 3,000 -> 2,000 arrears, 1,000 current, 0 overpayment)', async () => {
    const student = await createStudent('std-03', '0103', 'Catherine Mutua');
    await createInvoice('inv-arr-03', student.id, term2Id, 'INV-ARR-03', 2000, { isArrear: true });
    await createInvoice('inv-cur-03', student.id, term3Id, 'INV-2026-03', 5000);

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 3000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-3'
    });

    expect(result.allocation.arrearsPaid).toBe(2000);
    expect(result.allocation.currentFeesPaid).toBe(1000);
    expect(result.allocation.overpaymentAmount).toBe(0);
    expect(result.allocation.remainingArrears).toBe(0);
    expect(result.allocation.remainingCurrentFees).toBe(4000);
    expect(result.allocation.isEligibleForOverpayment).toBe(false);

    const arrInv = await feeRepo.findInvoiceById('inv-arr-03');
    const curInv = await feeRepo.findInvoiceById('inv-cur-03');
    expect(arrInv?.balance).toBe(0);
    expect(curInv?.balance).toBe(4000);

    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Payment fully clears arrears and current fees with money remaining
  // Arrears: 2,000 | Current: 5,000 | Payment: 10,000 -> 2,000 / 5,000 / 3,000
  // --------------------------------------------------------------------------
  test('Scenario 4: Payment fully clears obligations with surplus (Pay 10,000 -> 2,000 arrears, 5,000 current, 3,000 overpayment)', async () => {
    const student = await createStudent('std-04', '0104', 'David Kiprono');
    await createInvoice('inv-arr-04', student.id, term2Id, 'INV-ARR-04', 2000, { isArrear: true });
    await createInvoice('inv-cur-04', student.id, term3Id, 'INV-2026-04', 5000);

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 10000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-4'
    });

    expect(result.allocation.arrearsPaid).toBe(2000);
    expect(result.allocation.currentFeesPaid).toBe(5000);
    expect(result.allocation.overpaymentAmount).toBe(3000);
    expect(result.allocation.isEligibleForOverpayment).toBe(true);

    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits.length).toBe(1);
    expect(credits[0].balance).toBe(3000);
    expect(credits[0].status).toBe('AVAILABLE');
  });

  // --------------------------------------------------------------------------
  // Scenario 5: No arrears but current fees outstanding
  // Case 5A: Arrears: 0 | Current: 5,000 | Pay: 7,000 -> 0 / 5,000 / 2,000
  // Case 5B: Arrears: 0 | Current: 5,000 | Pay: 2,000 -> 0 / 2,000 / 0
  // --------------------------------------------------------------------------
  test('Scenario 5A: No arrears, pay exceeds current fees (Pay 7,000 -> 0 arrears, 5,000 current, 2,000 overpayment)', async () => {
    const student = await createStudent('std-05a', '0105', 'Edwin Bright');
    await createInvoice('inv-cur-05a', student.id, term3Id, 'INV-2026-05A', 5000);

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 7000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-5A'
    });

    expect(result.allocation.arrearsPaid).toBe(0);
    expect(result.allocation.currentFeesPaid).toBe(5000);
    expect(result.allocation.overpaymentAmount).toBe(2000);
    expect(result.allocation.isEligibleForOverpayment).toBe(true);
  });

  test('Scenario 5B: No arrears, pay partial current fees (Pay 2,000 -> 0 arrears, 2,000 current, 0 overpayment)', async () => {
    const student = await createStudent('std-05b', '0106', 'Faith Cherono');
    await createInvoice('inv-cur-05b', student.id, term3Id, 'INV-2026-05B', 5000);

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 2000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-5B'
    });

    expect(result.allocation.arrearsPaid).toBe(0);
    expect(result.allocation.currentFeesPaid).toBe(2000);
    expect(result.allocation.overpaymentAmount).toBe(0);
    expect(result.allocation.remainingCurrentFees).toBe(3000);
    expect(result.allocation.isEligibleForOverpayment).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Arrears outstanding but no current-term billed fees
  // Arrears: 2,000 | Current: 0 | Payment: 3,000 -> 2,000 / 0 / 1,000
  // --------------------------------------------------------------------------
  test('Scenario 6: Arrears outstanding with no current term fees (Pay 3,000 -> 2,000 arrears, 0 current, 1,000 overpayment)', async () => {
    const student = await createStudent('std-06', '0107', 'George Omondi');
    await createInvoice('inv-arr-06', student.id, term2Id, 'INV-ARR-06', 2000, { isArrear: true });

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 3000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-6'
    });

    expect(result.allocation.arrearsPaid).toBe(2000);
    expect(result.allocation.currentFeesPaid).toBe(0);
    expect(result.allocation.overpaymentAmount).toBe(1000);
    expect(result.allocation.isEligibleForOverpayment).toBe(true);

    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits[0].balance).toBe(1000);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: No arrears and no current-term billed fees (advance payment)
  // Arrears: 0 | Current: 0 | Payment: 3,000 -> 0 / 0 / 3,000
  // --------------------------------------------------------------------------
  test('Scenario 7: Zero fee obligations / Advance payment (Pay 3,000 -> 0 arrears, 0 current, 3,000 overpayment)', async () => {
    const student = await createStudent('std-07', '0108', 'Helen Achieng');

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 3000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-7'
    });

    expect(result.allocation.arrearsPaid).toBe(0);
    expect(result.allocation.currentFeesPaid).toBe(0);
    expect(result.allocation.overpaymentAmount).toBe(3000);
    expect(result.allocation.isEligibleForOverpayment).toBe(true);

    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits[0].amount).toBe(3000);
    expect(credits[0].balance).toBe(3000);
    expect(credits[0].status).toBe('AVAILABLE');
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Exact payment amount with no remainder
  // Arrears: 2,000 | Current: 5,000 | Payment: 7,000 -> 2,000 / 5,000 / 0
  // --------------------------------------------------------------------------
  test('Scenario 8: Exact payment amount with zero remainder (Pay 7,000 -> 2,000 arrears, 5,000 current, 0 overpayment)', async () => {
    const student = await createStudent('std-08', '0109', 'Ian Wekesa');
    await createInvoice('inv-arr-08', student.id, term2Id, 'INV-ARR-08', 2000, { isArrear: true });
    await createInvoice('inv-cur-08', student.id, term3Id, 'INV-2026-08', 5000);

    const result = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 7000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-8'
    });

    expect(result.allocation.arrearsPaid).toBe(2000);
    expect(result.allocation.currentFeesPaid).toBe(5000);
    expect(result.allocation.overpaymentAmount).toBe(0);
    expect(result.allocation.remainingArrears).toBe(0);
    expect(result.allocation.remainingCurrentFees).toBe(0);
    expect(result.allocation.isEligibleForOverpayment).toBe(true);
    expect(result.studentTotalBalance).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Existing overpayment credit applied according to policy
  // --------------------------------------------------------------------------
  test('Scenario 9: Existing overpayment credit automatically applied when new invoice is generated', async () => {
    const student = await createStudent('std-09', '0110', 'Joyce Chebet');

    // Setup Fee Structure for Grade 1
    const fs = FeeStructure.create(
      {
        schoolId,
        title: 'Grade 1 Fee Structure 2026',
        gradeLevel: CBCGradeLevel.GRADE_1,
        academicYearId,
        termId: term3Id,
        items: [{ id: 'it-1', name: 'Tuition Fee', amount: 6000, category: 'TUITION', isOptional: false }],
        dueDate: '2026-09-30'
      },
      'fs-g1'
    );
    await feeRepo.saveFeeStructure(fs);

    // Student had Term 1 invoice of 2,000 and overpaid 3,500 (yielding 1,500 advance credit)
    const t1Inv = await createInvoice('inv-term1-09', student.id, term1Id, 'INV-TERM1-09', 2000);

    const payT1 = await feeUseCases.recordPayment({
      schoolId,
      invoiceId: t1Inv.id,
      studentId: student.id,
      amount: 3500,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-9-CREDIT'
    });

    expect(payT1.allocation.overpaymentAmount).toBe(1500);

    const creditsBefore = await feeRepo.findCredits({ studentId: student.id });
    expect(creditsBefore.length).toBe(1);
    expect(creditsBefore[0].balance).toBe(1500);

    // Generate new term invoice
    const invRes = await feeUseCases.generateInvoices({
      schoolId,
      academicYearId,
      termId: term3Id,
      studentId: student.id,
      gradeLevel: CBCGradeLevel.GRADE_1
    }, bursarUserContext);

    expect(invRes.invoices.length).toBe(1);
    const newInvoice = await feeRepo.findInvoiceById(invRes.invoices[0].id);

    // Invoice balance should be reduced from 6,000 by 1,500 -> 4,500
    expect(newInvoice?.amountPayable).toBe(6000);
    expect(newInvoice?.balance).toBe(4500);

    // Credit record balance should be 0 and status FULLY_USED
    const creditsAfter = await feeRepo.findCredits({ studentId: student.id });
    expect(creditsAfter[0].balance).toBe(0);
    expect(creditsAfter[0].status).toBe('FULLY_USED');

    // Audit application record saved
    const applications = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(applications.length).toBe(1);
    expect(applications[0].amountApplied).toBe(1500);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Multiple payments in succession
  // Pay 1: 1,000 -> Arrears 1,000 | Pay 2: 2,000 -> Arrears 1,000, Current 1,000 | Pay 3: 5,000 -> Current 4,000, Overpayment 1,000
  // --------------------------------------------------------------------------
  test('Scenario 10: Multiple payments in succession settle obligations chronologically', async () => {
    const student = await createStudent('std-10', '0111', 'Kevin Mwangi');
    await createInvoice('inv-arr-10', student.id, term2Id, 'INV-ARR-10', 2000, { isArrear: true });
    await createInvoice('inv-cur-10', student.id, term3Id, 'INV-2026-10', 5000);

    // Payment 1: 1,000 (partially clears arrears)
    const p1 = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 1000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-10-P1'
    });
    expect(p1.allocation.arrearsPaid).toBe(1000);
    expect(p1.allocation.currentFeesPaid).toBe(0);
    expect(p1.allocation.overpaymentAmount).toBe(0);
    expect(p1.allocation.remainingArrears).toBe(1000);

    // Payment 2: 2,000 (clears remaining arrears 1,000 and pays 1,000 of current fees)
    const p2 = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 2000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-10-P2'
    });
    expect(p2.allocation.arrearsPaid).toBe(1000);
    expect(p2.allocation.currentFeesPaid).toBe(1000);
    expect(p2.allocation.overpaymentAmount).toBe(0);
    expect(p2.allocation.remainingArrears).toBe(0);
    expect(p2.allocation.remainingCurrentFees).toBe(4000);

    // Payment 3: 5,000 (clears remaining current fees 4,000 and generates 1,000 overpayment)
    const p3 = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 5000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-10-P3'
    });
    expect(p3.allocation.arrearsPaid).toBe(0);
    expect(p3.allocation.currentFeesPaid).toBe(4000);
    expect(p3.allocation.overpaymentAmount).toBe(1000);
    expect(p3.allocation.isEligibleForOverpayment).toBe(true);

    const position = await feeUseCases.calculateAuthoritativeFeePosition(student.id);
    expect(position.outstandingBalance).toBe(0);
    expect(position.netCreditBalance).toBe(1000);
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Payment reversal and correction
  // --------------------------------------------------------------------------
  test('Scenario 11: Payment reversal restores invoice balances and cancels unapplied overpayment credit', async () => {
    const student = await createStudent('std-11', '0112', 'Lucy Njeri');
    await createInvoice('inv-arr-11', student.id, term2Id, 'INV-ARR-11', 2000, { isArrear: true });
    await createInvoice('inv-cur-11', student.id, term3Id, 'INV-2026-11', 5000);

    // Record payment of 8,000 (2,000 arrears, 5,000 current, 1,000 credit)
    const paymentRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 8000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-SCENARIO-11'
    });

    const paymentId = paymentRes.payment.id;
    let credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits.length).toBe(1);
    expect(credits[0].balance).toBe(1000);

    // Bursar direct reversal execution is blocked (403 Forbidden)
    await expect(
      feeUseCases.reversePayment(
        paymentId,
        'Parent requested refund for wrong counter deposit',
        bursarUserContext
      )
    ).rejects.toThrow(/Bursars and Accountants cannot directly execute payment reversals/i);

    // Reverse the payment with Administrator authority
    const revRes = await feeUseCases.reversePayment(
      paymentId,
      'Parent requested refund for wrong counter deposit',
      adminUserContext
    );

    expect(revRes.success).toBe(true);

    // Invoices should be restored to their original unpaid balances
    const restoredArr = await feeRepo.findInvoiceById('inv-arr-11');
    const restoredCur = await feeRepo.findInvoiceById('inv-cur-11');
    expect(restoredArr?.balance).toBe(2000);
    expect(restoredCur?.balance).toBe(5000);

    // Credit must be cancelled / REVERSED
    credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits[0].status).toBe('REVERSED');
    expect(credits[0].balance).toBe(0);

    // Payment record marked REVERSED
    const pRecord = await feeRepo.findPaymentById(paymentId);
    expect(pRecord?.status).toBe(PaymentStatus.REVERSED);
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Concurrent payments serialized with advisory lock
  // --------------------------------------------------------------------------
  test('Scenario 12: Concurrent payments are serialized through lock without balance inconsistency', async () => {
    const student = await createStudent('std-12', '0113', 'Martin Otieno');
    await createInvoice('inv-arr-12', student.id, term2Id, 'INV-ARR-12', 2000, { isArrear: true });
    await createInvoice('inv-cur-12', student.id, term3Id, 'INV-2026-12', 5000);

    // Simulate two concurrent payments submitted at the exact same instant
    const p1Promise = feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 3000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-CONCURRENT-1'
    });

    const p2Promise = feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 5000,
      paymentMethod: PaymentMethod.CASH,
      recordedByUserId: bursarUserContext.userId,
      transactionReference: 'CSH-CONCURRENT-2'
    });

    const [res1, res2] = await Promise.all([p1Promise, p2Promise]);

    expect(res1.payment.status).toBe(PaymentStatus.COMPLETED);
    expect(res2.payment.status).toBe(PaymentStatus.COMPLETED);

    // Total paid = 8,000. Obligations = 7,000. Exactly 1,000 overpayment credit!
    const position = await feeUseCases.calculateAuthoritativeFeePosition(student.id);
    expect(position.outstandingBalance).toBe(0);
    expect(position.netCreditBalance).toBe(1000);

    const credits = await feeRepo.findCredits({ studentId: student.id });
    expect(credits.length).toBe(1);
    expect(credits[0].balance).toBe(1000);
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Previous-term arrears carried forward without duplication
  // --------------------------------------------------------------------------
  test('Scenario 13: Previous-term arrears carried forward into new invoice without duplication', async () => {
    const student = await createStudent('std-13', '0114', 'Naomi Muthoni');

    // Invoice with Term 1 arrears of 2,000 carried forward into Term 2 invoice
    await createInvoice('inv-cur-13', student.id, term3Id, 'INV-2026-13', 7000, {
      items: [
        { id: 'it-cf', name: 'Arrears / Previous Balance Carried Forward', amount: 2000, category: 'OTHER', isOptional: false },
        { id: 'it-tui', name: 'Term 3 Tuition', amount: 5000, category: 'TUITION', isOptional: false }
      ]
    });

    // Verify obligations recognizes previousTermArrears = 2,000 and currentTerm = 5,000
    const invoices = await feeRepo.findInvoices({ studentId: student.id });
    const obligations = FeePaymentAllocationService.calculateObligations(student.id, invoices, term3Id, academicYearId);

    expect(obligations.previousTermArrearsOutstanding).toBe(2000);
    expect(obligations.currentTermBilledFeesOutstanding).toBe(5000);
    expect(obligations.totalOutstanding).toBe(7000);

    // Pay 3,000 -> 2,000 to arrears, 1,000 to current fees, 0 overpayment
    const allocation = FeePaymentAllocationService.allocatePayment(3000, obligations);
    expect(allocation.arrearsPaid).toBe(2000);
    expect(allocation.currentFeesPaid).toBe(1000);
    expect(allocation.overpaymentAmount).toBe(0);
    expect(allocation.remainingCurrentFees).toBe(4000);
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Consistency across parent portal, receipts, statements & preview
  // --------------------------------------------------------------------------
  test('Scenario 14: Consistent figures across preview, payment receipt, and fee position', async () => {
    const student = await createStudent('std-14', '0115', 'Oscar Kipkemboi');
    await createInvoice('inv-arr-14', student.id, term2Id, 'INV-ARR-14', 2000, { isArrear: true });
    await createInvoice('inv-cur-14', student.id, term3Id, 'INV-2026-14', 5000);

    // 1. Preview allocation for 8,000
    const preview = await feeUseCases.previewPaymentAllocation({
      studentId: student.id,
      amount: 8000,
      termId: term3Id,
      academicYearId
    });

    expect(preview.arrearsPaid).toBe(2000);
    expect(preview.currentFeesPaid).toBe(5000);
    expect(preview.overpaymentAmount).toBe(1000);

    // 2. Execute actual payment of 8,000
    const paymentRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 8000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      recordedByUserId: bursarUserContext.userId,
      slipNumber: 'DEP-SCENARIO-14'
    });

    // Check payment record allocations match preview
    expect(paymentRes.payment.arrearsPaid).toBe(preview.arrearsPaid);
    expect(paymentRes.payment.currentFeesPaid).toBe(preview.currentFeesPaid);
    expect(paymentRes.payment.overpaymentAmount).toBe(preview.overpaymentAmount);

    // 3. Check fee position
    const feePosition = await feeUseCases.calculateAuthoritativeFeePosition(student.id);
    expect(feePosition.outstandingBalance).toBe(0);
    expect(feePosition.netCreditBalance).toBe(1000);
    expect(feePosition.status).toBe('OVERPAID');

    // 4. Check learner fee position (used by parent and cashier desks)
    const learnerPosition = await feeUseCases.getLearnerFeePosition(student.id);
    expect(learnerPosition.financialPosition.outstandingBalance).toBe(0);
    expect(learnerPosition.financialPosition.overpaymentCredit).toBe(1000);
  });
});
