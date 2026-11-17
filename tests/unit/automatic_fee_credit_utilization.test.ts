import {
  FeeStructure,
  PaymentMethod,
  PaymentStatus,
  StudentInvoice,
  InvoiceStatus,
  StudentFeeCredit,
  FeeCreditApplication,
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

describe('SmartShule — Automatic Fee Credit / Overpayment Utilization (Scenarios 1 - 17)', () => {
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
        notes: `Test advance credit deposit for student ${studentId}`
      },
      id
    );
    await feeRepo.saveCredit(credit);
    return credit;
  };

  // --------------------------------------------------------------------------
  // Scenario 1: Outstanding fees KES 5,000 & credit KES 3,000 -> apply KES 3,000
  // --------------------------------------------------------------------------
  test('Scenario 1: Outstanding fees KES 5,000 & credit KES 3,000 -> apply KES 3,000', async () => {
    const student = await createStudent('std-01', 'ADM-01', 'Alice Wanjiku');
    const inv = await createInvoice('inv-01', student.id, term3Id, 'INV-2026-01', 5000);
    const cred = await createCredit('cred-01', student.id, 3000);

    const result = await feeUseCases.autoReconcileStudentFeeCredits(student.id, {
      requestingUser: bursarUserContext
    });

    expect(result).not.toBeNull();
    expect(result!.creditApplied).toBe(3000);
    expect(result!.remainingOutstanding).toBe(2000);
    expect(result!.remainingCredit).toBe(0);

    // Verify invoice balance
    const updatedInv = await feeRepo.findInvoiceById(inv.id);
    expect(updatedInv?.balance).toBe(2000);
    expect(updatedInv?.amountPaid).toBe(3000);
    expect(updatedInv?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

    // Verify credit state
    const updatedCred = await feeRepo.findCreditById(cred.id);
    expect(updatedCred?.balance).toBe(0);
    expect(updatedCred?.amountUsed).toBe(3000);
    expect(updatedCred?.status).toBe('FULLY_USED');

    // Verify audit application record
    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(1);
    expect(apps[0].amountApplied).toBe(3000);
    expect(apps[0].remainingCredit).toBe(0);
    expect(apps[0].remainingFeeBalance).toBe(2000);
    expect(apps[0].isSystemGenerated).toBe(true);
    expect(apps[0].applicationReference).toMatch(/^FCU-2026-/);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Outstanding fees KES 5,000 & credit KES 7,000 -> apply KES 5,000, retain KES 2,000
  // --------------------------------------------------------------------------
  test('Scenario 2: Outstanding fees KES 5,000 & credit KES 7,000 -> apply KES 5,000, retain KES 2,000', async () => {
    const student = await createStudent('std-02', 'ADM-02', 'Brian Ochieng');
    const inv = await createInvoice('inv-02', student.id, term3Id, 'INV-2026-02', 5000);
    const cred = await createCredit('cred-02', student.id, 7000);

    const result = await feeUseCases.autoReconcileStudentFeeCredits(student.id);

    expect(result).not.toBeNull();
    expect(result!.creditApplied).toBe(5000);
    expect(result!.remainingOutstanding).toBe(0);
    expect(result!.remainingCredit).toBe(2000);

    const updatedInv = await feeRepo.findInvoiceById(inv.id);
    expect(updatedInv?.balance).toBe(0);
    expect(updatedInv?.amountPaid).toBe(5000);
    expect(updatedInv?.status).toBe(InvoiceStatus.PAID);

    const updatedCred = await feeRepo.findCreditById(cred.id);
    expect(updatedCred?.balance).toBe(2000);
    expect(updatedCred?.amountUsed).toBe(5000);
    expect(updatedCred?.status).toBe('PARTIALLY_USED');
  });

  // --------------------------------------------------------------------------
  // Scenario 3: No outstanding fees -> retain all credit
  // --------------------------------------------------------------------------
  test('Scenario 3: No outstanding fees -> retain all credit (no credit applied)', async () => {
    const student = await createStudent('std-03', 'ADM-03', 'Catherine Mwangi');
    const cred = await createCredit('cred-03', student.id, 4000);

    const result = await feeUseCases.autoReconcileStudentFeeCredits(student.id);

    // No reconciliation needed since student has zero outstanding fees
    expect(result).toBeNull();

    const updatedCred = await feeRepo.findCreditById(cred.id);
    expect(updatedCred?.balance).toBe(4000);
    expect(updatedCred?.amountUsed).toBe(0);
    expect(updatedCred?.status).toBe('AVAILABLE');

    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 4: No available credit -> leave fees outstanding
  // --------------------------------------------------------------------------
  test('Scenario 4: No available credit -> leave fees outstanding without errors', async () => {
    const student = await createStudent('std-04', 'ADM-04', 'Daniel Kiprono');
    const inv = await createInvoice('inv-04', student.id, term3Id, 'INV-2026-04', 6000);

    const result = await feeUseCases.autoReconcileStudentFeeCredits(student.id);

    // No reconciliation needed since student has zero available credit
    expect(result).toBeNull();

    const updatedInv = await feeRepo.findInvoiceById(inv.id);
    expect(updatedInv?.balance).toBe(6000);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Previous-term arrears & current fees -> apply to arrears first, then current fees
  // Prior Arrears: 4,000 | Current Term: 6,000 | Credit: 5,000 -> 4,000 to arrears, 1,000 to current fees
  // --------------------------------------------------------------------------
  test('Scenario 5: Priority order — clears prior arrears first, remaining to current term fees', async () => {
    const student = await createStudent('std-05', 'ADM-05', 'Esther Nyambura');
    const arrInv = await createInvoice('inv-arr-05', student.id, term2Id, 'INV-ARR-05', 4000, { isArrear: true });
    const curInv = await createInvoice('inv-cur-05', student.id, term3Id, 'INV-CUR-05', 6000);
    await createCredit('cred-05', student.id, 5000);

    const result = await feeUseCases.autoReconcileStudentFeeCredits(student.id);

    expect(result).not.toBeNull();
    expect(result!.creditApplied).toBe(5000);
    expect(result!.arrearsSettled).toBe(4000);
    expect(result!.currentFeesSettled).toBe(1000);
    expect(result!.remainingOutstanding).toBe(5000); // 10,000 - 5,000

    // Arrears invoice must be completely settled first (0 balance)
    const updatedArr = await feeRepo.findInvoiceById(arrInv.id);
    expect(updatedArr?.balance).toBe(0);
    expect(updatedArr?.amountPaid).toBe(4000);
    expect(updatedArr?.status).toBe(InvoiceStatus.PAID);

    // Current invoice receives the remaining 1,000 (balance 5,000)
    const updatedCur = await feeRepo.findInvoiceById(curInv.id);
    expect(updatedCur?.balance).toBe(5000);
    expect(updatedCur?.amountPaid).toBe(1000);
    expect(updatedCur?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

    // Applications audit trail records each allocation
    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(2);
    expect(apps[0].invoiceId).toBe(arrInv.id);
    expect(apps[0].amountApplied).toBe(4000);
    expect(apps[1].invoiceId).toBe(curInv.id);
    expect(apps[1].amountApplied).toBe(1000);
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Newly created invoice automatically triggers credit application
  // --------------------------------------------------------------------------
  test('Scenario 6: Newly created invoice automatically triggers credit application', async () => {
    const student = await createStudent('std-06', 'ADM-06', 'Faith Muthoni');
    await createCredit('cred-06', student.id, 2500);

    // Create an individual invoice through FeeUseCases (Trigger B)
    const res = await feeUseCases.createIndividualInvoice({
      studentId: student.id,
      academicYearId,
      termId: term3Id,
      schoolId,
      items: [{ name: 'Tuition Fee', amount: 5000, category: 'TUITION' as any, isOptional: false }],
      dueDate: '2026-10-31'
    }, bursarUserContext);

    expect(res.invoice).toBeDefined();
    // After automatic reconciliation triggered during invoice creation:
    const inv = await feeRepo.findInvoiceById(res.invoice.id);
    expect(inv?.amountPaid).toBe(2500);
    expect(inv?.balance).toBe(2500);

    const cred = await feeRepo.findCreditById('cred-06');
    expect(cred?.balance).toBe(0);
    expect(cred?.status).toBe('FULLY_USED');
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Newly recorded overpayment automatically triggers credit application
  // --------------------------------------------------------------------------
  test('Scenario 7: Newly recorded overpayment triggers credit application when unpaid invoices exist', async () => {
    const student = await createStudent('std-07', 'ADM-07', 'George Kariuki');
    const inv = await createInvoice('inv-07', student.id, term3Id, 'INV-2026-07', 3000);

    // Student makes a payment of 5,000 (which leaves 2,000 as overpayment)
    const payRes = await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 5000,
      paymentMethod: PaymentMethod.MPESA,
      transactionReference: 'MPS-AUTO-7',
      recordedByUserId: bursarUserContext.userId
    });

    expect(payRes.allocation.currentFeesPaid).toBe(3000);
    expect(payRes.allocation.overpaymentAmount).toBe(2000);

    // Verify invoice is settled
    const updatedInv = await feeRepo.findInvoiceById(inv.id);
    expect(updatedInv?.balance).toBe(0);

    // Create a 2nd invoice later of 1,500
    const inv2 = await createInvoice('inv-07-b', student.id, term3Id, 'INV-2026-07-B', 1500);

    // Reconcile
    const recon = await feeUseCases.autoReconcileStudentFeeCredits(student.id);
    expect(recon).not.toBeNull();
    expect(recon!.creditApplied).toBe(1500);
    expect(recon!.remainingCredit).toBe(500);

    const updatedInv2 = await feeRepo.findInvoiceById(inv2.id);
    expect(updatedInv2?.balance).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Fee adjustments trigger correct reconciliation
  // --------------------------------------------------------------------------
  test('Scenario 8: Fee adjustment (adding manual arrear) triggers credit reconciliation', async () => {
    const student = await createStudent('std-08', 'ADM-08', 'Hellen Achieng');
    await createCredit('cred-08', student.id, 2000);

    // Adding manual arrears triggers automatic reconciliation immediately (Trigger D)
    const res = await feeUseCases.addOrUpdateManualArrear(
      {
        studentId: student.id,
        amount: 3500,
        mode: 'ADD',
        academicYearId,
        termId: term3Id,
        notes: 'Library lost book fine'
      },
      bursarUserContext
    );

    expect(res.success).toBe(true);

    // The manual arrear invoice should immediately be offset by KES 2,000
    const inv = await feeRepo.findInvoiceById(res.invoiceId);
    expect(inv?.amountPaid).toBe(2000);
    expect(inv?.balance).toBe(1500);

    const cred = await feeRepo.findCreditById('cred-08');
    expect(cred?.balance).toBe(0);
    expect(cred?.status).toBe('FULLY_USED');
  });

  // --------------------------------------------------------------------------
  // Scenario 9: New-term arrears carry-forward triggers reconciliation
  // --------------------------------------------------------------------------
  test('Scenario 9: New-term arrears carried forward triggers reconciliation with credit', async () => {
    const student = await createStudent('std-09', 'ADM-09', 'Ian Mutua');
    // Learner had an unpaid invoice in Term 2
    await createInvoice('inv-t2-09', student.id, term2Id, 'INV-T2-09', 3000);
    // Learner acquires credit of 1,500
    await createCredit('cred-09', student.id, 1500);

    // Automatic reconciliation processes prior term arrears
    const recon = await feeUseCases.autoReconcileStudentFeeCredits(student.id);
    expect(recon).not.toBeNull();
    expect(recon!.creditApplied).toBe(1500);
    expect(recon!.remainingOutstanding).toBe(1500);

    const t2Inv = await feeRepo.findInvoiceById('inv-t2-09');
    expect(t2Inv?.balance).toBe(1500);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: Existing accounts are reconciled when feature is activated (batch reconciliation)
  // --------------------------------------------------------------------------
  test('Scenario 10: Batch activation reconciles all student accounts with available credit and outstanding balances', async () => {
    // Student 1: Fees 4,000, Credit 1,500
    const s1 = await createStudent('std-10-a', 'ADM-10-A', 'John Kamau');
    await createInvoice('inv-10-a', s1.id, term3Id, 'INV-10-A', 4000);
    await createCredit('cred-10-a', s1.id, 1500);

    // Student 2: Fees 2,000, Credit 3,000
    const s2 = await createStudent('std-10-b', 'ADM-10-B', 'Joy Chebet');
    await createInvoice('inv-10-b', s2.id, term3Id, 'INV-10-B', 2000);
    await createCredit('cred-10-b', s2.id, 3000);

    // Student 3: Fees 0, Credit 5,000 (no reconciliation needed)
    const s3 = await createStudent('std-10-c', 'ADM-10-C', 'Kevin Otieno');
    await createCredit('cred-10-c', s3.id, 5000);

    // Trigger batch reconciliation across school
    const batchRes = await feeUseCases.reconcileAllStudentCredits({ schoolId });

    expect(batchRes.reconciledCount).toBe(2);
    expect(batchRes.totalCreditApplied).toBe(3500); // 1,500 + 2,000

    const invA = await feeRepo.findInvoiceById('inv-10-a');
    expect(invA?.balance).toBe(2500);

    const invB = await feeRepo.findInvoiceById('inv-10-b');
    expect(invB?.balance).toBe(0);

    const credC = await feeRepo.findCreditById('cred-10-c');
    expect(credC?.balance).toBe(5000);
  });

  // --------------------------------------------------------------------------
  // Scenario 11: Repeated reconciliation does not duplicate applications (idempotency)
  // --------------------------------------------------------------------------
  test('Scenario 11: Idempotency — repeated reconciliation produces zero extra deductions or duplicates', async () => {
    const student = await createStudent('std-11', 'ADM-11', 'Lucy Njeri');
    const inv = await createInvoice('inv-11', student.id, term3Id, 'INV-2026-11', 5000);
    await createCredit('cred-11', student.id, 2000);

    // First reconciliation
    const firstRun = await feeUseCases.autoReconcileStudentFeeCredits(student.id);
    expect(firstRun).not.toBeNull();
    expect(firstRun!.creditApplied).toBe(2000);

    // Second run immediately after (no credit left, returns null)
    const secondRun = await feeUseCases.autoReconcileStudentFeeCredits(student.id);
    expect(secondRun).toBeNull();

    // Third run
    const thirdRun = await feeUseCases.autoReconcileStudentFeeCredits(student.id);
    expect(thirdRun).toBeNull();

    // Verify balances stayed exactly at 3,000
    const updatedInv = await feeRepo.findInvoiceById(inv.id);
    expect(updatedInv?.balance).toBe(3000);
    expect(updatedInv?.amountPaid).toBe(2000);

    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Concurrent payment and billing requests cannot double-spend credit
  // --------------------------------------------------------------------------
  test('Scenario 12: Concurrency safety — parallel reconciliations do not double-spend credit', async () => {
    const student = await createStudent('std-12', 'ADM-12', 'Michael Koech');
    const inv = await createInvoice('inv-12', student.id, term3Id, 'INV-2026-12', 4000);
    await createCredit('cred-12', student.id, 2000);

    // Fire 3 simultaneous reconciliation requests for the same student
    const [res1, res2, res3] = await Promise.all([
      feeUseCases.autoReconcileStudentFeeCredits(student.id),
      feeUseCases.autoReconcileStudentFeeCredits(student.id),
      feeUseCases.autoReconcileStudentFeeCredits(student.id)
    ]);

    const totalAppliedAcrossAll = (res1?.creditApplied || 0) + (res2?.creditApplied || 0) + (res3?.creditApplied || 0);
    expect(totalAppliedAcrossAll).toBe(2000);

    const updatedInv = await feeRepo.findInvoiceById(inv.id);
    expect(updatedInv?.balance).toBe(2000);
    expect(updatedInv?.amountPaid).toBe(2000);

    const cred = await feeRepo.findCreditById('cred-12');
    expect(cred?.balance).toBe(0);
    expect(cred?.amountUsed).toBe(2000);
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Failed transactions roll back correctly & log failure status
  // --------------------------------------------------------------------------
  test('Scenario 13: Error handling — simulated database error logs failure and can be retried', async () => {
    const student = await createStudent('std-13', 'ADM-13', 'Nancy Wambui');
    await createInvoice('inv-13', student.id, term3Id, 'INV-2026-13', 3000);
    await createCredit('cred-13', student.id, 1000);

    // Mock feeRepo.updateInvoice to fail once
    const originalUpdateInvoice = feeRepo.updateInvoice.bind(feeRepo);
    let failOnce = true;
    feeRepo.updateInvoice = async (inv: StudentInvoice) => {
      if (failOnce) {
        failOnce = false;
        throw new Error('Database temporary connection failure');
      }
      return originalUpdateInvoice(inv);
    };

    const failedResult = await feeUseCases.autoReconcileStudentFeeCredits(student.id);
    expect(failedResult).toBeNull();

    // Status should report the failure
    const status = feeUseCases.getReconciliationStatus();
    expect(status.activeFailuresCount).toBeGreaterThan(0);
    expect(status.activeFailures.some((f: any) => f.studentId === student.id)).toBe(true);

    // Retry failed reconciliations
    const retryResult = await feeUseCases.retryFailedReconciliations();
    expect(retryResult.retriedCount).toBeGreaterThanOrEqual(1);

    const updatedInv = await feeRepo.findInvoiceById('inv-13');
    expect(updatedInv?.balance).toBe(2000);
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Reversals and corrections preserve audit trail
  // --------------------------------------------------------------------------
  test('Scenario 14: Credit reversal updates status to REVERSED while preserving historical applications', async () => {
    const student = await createStudent('std-14', 'ADM-14', 'Oliver Kipkorir');
    await createInvoice('inv-14', student.id, term3Id, 'INV-2026-14', 5000);
    const cred = await createCredit('cred-14', student.id, 3000);

    // Apply credit
    await feeUseCases.autoReconcileStudentFeeCredits(student.id);

    // Reverse the credit
    cred.reverse();
    await feeRepo.saveCredit(cred);

    const reversedCred = await feeRepo.findCreditById('cred-14');
    expect(reversedCred?.status).toBe('REVERSED');
    expect(reversedCred?.balance).toBe(0);

    // The historical FeeCreditApplication records remain intact for accounting integrity
    const apps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(apps.length).toBe(1);
    expect(apps[0].amountApplied).toBe(3000);
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Parent Portal and Finance Portal show identical authoritative balances
  // --------------------------------------------------------------------------
  test('Scenario 15: Exact balance consistency between Finance Portal and Parent Portal', async () => {
    const student = await createStudent('std-15', 'ADM-15', 'Priscilla Njoki');
    await createInvoice('inv-t2-15', student.id, term2Id, 'INV-T2-15', 3000, { isArrear: true });
    await createInvoice('inv-t3-15', student.id, term3Id, 'INV-T3-15', 7000);
    await createCredit('cred-15', student.id, 4000);

    // Link a parent guardian
    const guardianUser = User.create(
      {
        email: 'parent.njoki@example.com',
        passwordHash: 'hash',
        role: UserRole.GUARDIAN,
        status: UserStatus.ACTIVE,
        firstName: 'Mary',
        lastName: 'Njoki',
        phone: '+254711223344',
        schoolId
      },
      'usr-parent-15'
    );
    await userRepo.save(guardianUser);

    const guardian = Guardian.create(
      {
        userId: guardianUser.id,
        nationalId: '12345678',
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '+254711223344',
        studentIds: [student.id]
      },
      'grd-15'
    );
    await guardianRepo.save(guardian);

    // Run auto-reconciliation
    await feeUseCases.autoReconcileStudentFeeCredits(student.id);

    // Finance Portal authoritative balance
    const financeAccounts = await feeUseCases.getStudentFeeAccounts({ schoolId, termId: term3Id });
    const financeAccount = financeAccounts.accounts.find((a: any) => a.studentId === student.id);

    // Parent Portal authoritative data
    const parentPortalData = await studentUseCases.getGuardianPortalData(guardianUser.id);
    const childFee = parentPortalData.children[0].fee;

    // Both portals must report exact identical figures
    expect(financeAccount).toBeDefined();
    expect(financeAccount!.balance).toBe(6000); // 10,000 - 4,000
    expect(childFee.balance).toBe(6000);
    expect(childFee.totalOutstanding).toBe(6000);

    // Prior arrears was 3,000, completely settled by 3,000 of the credit
    expect(childFee.previousTermArrears).toBe(0);
    // Current term was 7,000, reduced by 1,000 credit -> 6,000
    expect(childFee.currentTermBilledFees).toBe(6000);

    // Available credit is now 0 in both
    expect((financeAccount as any).overpayment || 0).toBe(0);
    expect(childFee.availableCredit).toBe(0);
    expect(childFee.totalCreditApplied).toBe(4000);
  });

  // --------------------------------------------------------------------------
  // Scenario 16: Financial reports do not double-count original payments and internal credit applications
  // --------------------------------------------------------------------------
  test('Scenario 16: Revenue reports distinguish fresh cash from internal fee credit applications', async () => {
    const student = await createStudent('std-16', 'ADM-16', 'Quentin Kipchoge');
    await createInvoice('inv-16', student.id, term3Id, 'INV-2026-16', 5000);

    // Fresh cash payment of 8,000 arrives (5,000 clears invoice, 3,000 becomes credit)
    await feeUseCases.recordPayment({
      schoolId,
      studentId: student.id,
      amount: 8000,
      paymentMethod: PaymentMethod.BANK_DEPOSIT,
      transactionReference: 'BNK-FRESH-16',
      recordedByUserId: bursarUserContext.userId
    });

    // Later, a new invoice arrives for 2,000
    await createInvoice('inv-16-new', student.id, term3Id, 'INV-2026-16-NEW', 2000);

    // Credit of 2,000 is automatically applied
    await feeUseCases.autoReconcileStudentFeeCredits(student.id);

    // Check payments repository: ONLY the 8,000 real bank deposit payment exists
    const payments = await feeRepo.findPayments({ studentId: student.id });
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(8000);
    expect(payments[0].transactionReference).toBe('BNK-FRESH-16');

    // Credit application of 2,000 is stored separately in fee_credit_applications
    const creditApps = await feeRepo.findCreditApplications({ studentId: student.id });
    expect(creditApps.length).toBe(1);
    expect(creditApps[0].amountApplied).toBe(2000);

    // Summing payments does NOT double count the 2,000 internal credit application
    const totalCashCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    expect(totalCashCollected).toBe(8000);
  });

  // --------------------------------------------------------------------------
  // Scenario 17: A learner's credit cannot be used to settle another learner's fees
  // --------------------------------------------------------------------------
  test('Scenario 17: Strict student isolation — student credit cannot settle another student fees', async () => {
    // Student A has 4,000 credit and 0 fees
    const studentA = await createStudent('std-17-a', 'ADM-17-A', 'Rachel Mutua');
    await createCredit('cred-17-a', studentA.id, 4000);

    // Student B has 5,000 fees and 0 credit
    const studentB = await createStudent('std-17-b', 'ADM-17-B', 'Samuel Gitau');
    const invB = await createInvoice('inv-17-b', studentB.id, term3Id, 'INV-2026-17-B', 5000);

    // Reconcile Student B (has 0 credit -> returns null)
    const resB = await feeUseCases.autoReconcileStudentFeeCredits(studentB.id);
    expect(resB).toBeNull();

    // Reconcile all students in school
    await feeUseCases.reconcileAllStudentCredits({ schoolId });

    // Student B's fees remain completely unpaid
    const updatedInvB = await feeRepo.findInvoiceById(invB.id);
    expect(updatedInvB?.balance).toBe(5000);
    expect(updatedInvB?.amountPaid).toBe(0);

    // Student A's credit remains completely intact
    const credA = await feeRepo.findCreditById('cred-17-a');
    expect(credA?.balance).toBe(4000);
    expect(credA?.amountUsed).toBe(0);
  });
});
