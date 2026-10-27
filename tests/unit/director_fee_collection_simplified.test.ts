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

describe('Director & Cashier Simplified Fee Management Unit Tests', () => {
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

    // 1. Setup Academic Context
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

    // 2. Setup Cashier User
    const cashierUser = User.create(
      {
        email: 'bursar@smartshule.ac.ke',
        passwordHash: 'hash123',
        firstName: 'Jane',
        lastName: 'Wambui',
        role: UserRole.BURSAR,
        status: UserStatus.ACTIVE,
        schoolId
      },
      'usr-cashier-01'
    );
    await userRepo.save(cashierUser);

    // 3. Setup Grade 1 Term 3 Fee Structure (KSh 4,500)
    const feeStructure = FeeStructure.create(
      {
        schoolId,
        academicYearId,
        termId: term3Id,
        gradeLevel: CBCGradeLevel.GRADE_1,
        title: 'Grade 1 Term 3 Schedule',
        dueDate: '2026-10-31',
        items: [
          { id: 'it-tuition', name: 'Tuition Fee', amount: 3000, isOptional: false, category: 'TUITION' },
          { id: 'it-activity', name: 'Activity & Sports', amount: 1000, isOptional: false, category: 'ACTIVITY' },
          { id: 'it-exam', name: 'Assessment Material', amount: 500, isOptional: false, category: 'ASSESSMENT' }
        ]
      },
      'fs-grade-1-t3'
    );
    await feeRepo.saveFeeStructure(feeStructure);
  });

  describe('1. Learner Fee Position Calculation (Prompt Specification)', () => {
    it('calculates exact financial position for Tania: Fees KSh 4,500 + Previous KSh 1,000 - Paid KSh 4,000 = KSh 1,500', async () => {
      // Setup Learner: Tania Moraa
      const tania = Student.create(
        {
          admissionNumber: 'PP1-001',
          firstName: 'Tania',
          lastName: 'Moraa',
          dateOfBirth: '2021-04-10',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-tania-01'
      );
      await studentRepo.save(tania);

      // Prior Term 2 Invoice with KSh 1,000 outstanding balance
      const priorInvoice = StudentInvoice.create(
        {
          schoolId,
          studentId: tania.id,
          feeStructureId: 'fs-g1-t2',
          academicYearId,
          termId: term2Id,
          invoiceNumber: 'INV-2026-001',
          items: [{ id: 'it-prev', name: 'Tuition Fee', amount: 4000, isOptional: false, category: 'TUITION' }],
          amountBilled: 4000,
          discountAmount: 0,
          amountPayable: 4000,
          amountPaid: 3000,
          balance: 1000,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: '2026-08-01'
        },
        'inv-prior-001'
      );
      await feeRepo.saveInvoice(priorInvoice);

      // Current Term 3 Invoice: KSh 4,500 billed, KSh 4,000 paid
      const currentInvoice = StudentInvoice.create(
        {
          schoolId,
          studentId: tania.id,
          feeStructureId: 'fs-grade-1-t3',
          academicYearId,
          termId: term3Id,
          invoiceNumber: 'INV-2026-002',
          items: [
            { id: 'it-t', name: 'Tuition Fee', amount: 3000, isOptional: false, category: 'TUITION' },
            { id: 'it-a', name: 'Activity & Sports', amount: 1000, isOptional: false, category: 'ACTIVITY' },
            { id: 'it-e', name: 'Assessment Material', amount: 500, isOptional: false, category: 'ASSESSMENT' }
          ],
          amountBilled: 4500,
          discountAmount: 0,
          amountPayable: 4500,
          amountPaid: 4000,
          balance: 500,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: '2026-10-31'
        },
        'inv-current-002'
      );
      await feeRepo.saveInvoice(currentInvoice);

      // Call authoritative fee position endpoint
      const position = await feeUseCases.getLearnerFeePosition(tania.id, { termId: term3Id });

      expect(position).toBeDefined();
      expect(position.student.fullName).toBe('Tania Moraa');
      expect(position.student.admissionNumber).toBe('PP1-001');

      // Four Prominent Summary Cards verification:
      expect(position.financialPosition.feesThisTerm).toBe(4500);
      expect(position.financialPosition.previousBalance).toBe(1000);
      expect(position.financialPosition.totalPaid).toBe(4000);
      expect(position.financialPosition.outstandingBalance).toBe(1500);
      expect(position.financialPosition.status).toBe('PARTIAL');
      expect(position.financialPosition.formula).toBe('KSh 4,500 + KSh 1,000 - KSh 4,000 = KSh 1,500');
    });

    it('does NOT charge a fictitious previous balance to a learner without arrears', async () => {
      // Setup Learner without arrears: Kevin Omondi
      const kevin = Student.create(
        {
          admissionNumber: 'ADM-2026-002',
          firstName: 'Kevin',
          lastName: 'Omondi',
          dateOfBirth: '2020-05-15',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-kevin-02'
      );
      await studentRepo.save(kevin);

      // Prior Term 2 was fully paid (balance = 0)
      const priorInvoice = StudentInvoice.create(
        {
          schoolId,
          studentId: kevin.id,
          feeStructureId: 'fs-g1-t2',
          academicYearId,
          termId: term2Id,
          invoiceNumber: 'INV-2026-003',
          items: [{ id: 'it-prev', name: 'Tuition Fee', amount: 4000, isOptional: false, category: 'TUITION' }],
          amountBilled: 4000,
          discountAmount: 0,
          amountPayable: 4000,
          amountPaid: 4000,
          balance: 0,
          status: InvoiceStatus.PAID,
          dueDate: '2026-08-01'
        },
        'inv-prior-002'
      );
      await feeRepo.saveInvoice(priorInvoice);

      // Current Term 3 Invoice: KSh 4,500 billed, KSh 4,000 paid
      const currentInvoice = StudentInvoice.create(
        {
          schoolId,
          studentId: kevin.id,
          feeStructureId: 'fs-grade-1-t3',
          academicYearId,
          termId: term3Id,
          invoiceNumber: 'INV-2026-004',
          items: [{ id: 'it-t', name: 'Tuition Fee', amount: 4500, isOptional: false, category: 'TUITION' }],
          amountBilled: 4500,
          discountAmount: 0,
          amountPayable: 4500,
          amountPaid: 4000,
          balance: 500,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: '2026-10-31'
        },
        'inv-current-003'
      );
      await feeRepo.saveInvoice(currentInvoice);

      const position = await feeUseCases.getLearnerFeePosition(kevin.id, { termId: term3Id });

      // Previous balance must be 0, not fictitious charge
      expect(position.financialPosition.feesThisTerm).toBe(4500);
      expect(position.financialPosition.previousBalance).toBe(0);
      expect(position.financialPosition.totalPaid).toBe(4000);
      expect(position.financialPosition.outstandingBalance).toBe(500);
    });
  });

  describe('2. Fast Cash, M-Pesa, and Bank Deposit Payment Processing', () => {
    it('records a Cash payment without requiring external reference and issues official receipt', async () => {
      const student = Student.create(
        {
          admissionNumber: 'ADM-2026-003',
          firstName: 'Amina',
          lastName: 'Hassan',
          dateOfBirth: '2020-03-12',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-amina-03'
      );
      await studentRepo.save(student);

      const invoice = StudentInvoice.create(
        {
          schoolId,
          studentId: student.id,
          feeStructureId: 'fs-grade-1-t3',
          academicYearId,
          termId: term3Id,
          invoiceNumber: 'INV-2026-005',
          items: [{ id: 'it-t', name: 'Tuition Fee', amount: 2000, isOptional: false, category: 'TUITION' }],
          amountBilled: 2000,
          discountAmount: 0,
          amountPayable: 2000,
          amountPaid: 0,
          balance: 2000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-31'
        },
        'inv-amina-01'
      );
      await feeRepo.saveInvoice(invoice);

      // Cashier records cash payment directly for learner without manual reference
      const res = await feeUseCases.recordPayment({
        schoolId,
        studentId: student.id,
        invoiceId: invoice.id,
        amount: 2000,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'usr-cashier-01'
      });

      expect(res.payment).toBeDefined();
      expect(res.payment.paymentMethod).toBe(PaymentMethod.CASH);
      expect(res.payment.transactionReference).toMatch(/^CSH-\d{4}-\d+/);
      expect(res.receipt).toBeDefined();
      expect(res.receipt.receiptNumber).toMatch(/^REC-\d{4}-\d+/);
      expect(res.studentTotalBalance).toBe(0);

      // Verify invoice updated to PAID
      const updatedInv = await feeRepo.findInvoiceById(invoice.id);
      expect(updatedInv?.status).toBe(InvoiceStatus.PAID);
      expect(updatedInv?.balance).toBe(0);
    });

    it('requires transaction reference for M-Pesa payments and prevents duplicate transactions', async () => {
      const student = Student.create(
        {
          admissionNumber: 'ADM-2026-004',
          firstName: 'David',
          lastName: 'Mwangi',
          dateOfBirth: '2020-07-21',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-david-04'
      );
      await studentRepo.save(student);

      const invoice = StudentInvoice.create(
        {
          schoolId,
          studentId: student.id,
          feeStructureId: 'fs-grade-1-t3',
          academicYearId,
          termId: term3Id,
          invoiceNumber: 'INV-2026-006',
          items: [{ id: 'it-t', name: 'Tuition Fee', amount: 3000, isOptional: false, category: 'TUITION' }],
          amountBilled: 3000,
          discountAmount: 0,
          amountPayable: 3000,
          amountPaid: 0,
          balance: 3000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-31'
        },
        'inv-david-01'
      );
      await feeRepo.saveInvoice(invoice);

      // 1. Omitting M-Pesa reference should throw ValidationError
      await expect(
        feeUseCases.recordPayment({
          schoolId,
          studentId: student.id,
          invoiceId: invoice.id,
          amount: 1500,
          paymentMethod: PaymentMethod.MPESA,
          transactionReference: '',
          recordedByUserId: 'usr-cashier-01'
        })
      ).rejects.toThrow(/M-Pesa transaction reference.*is required/i);

      // 2. Successful M-Pesa payment with reference QHJ8921KL
      const mpesaRes = await feeUseCases.recordPayment({
        schoolId,
        studentId: student.id,
        invoiceId: invoice.id,
        amount: 1500,
        paymentMethod: PaymentMethod.MPESA,
        transactionReference: 'QHJ8921KL',
        mpesaPhoneNumber: '0712345678',
        recordedByUserId: 'usr-cashier-01'
      });

      expect(mpesaRes.payment.transactionReference).toBe('QHJ8921KL');
      expect(mpesaRes.studentTotalBalance).toBe(1500);

      // 3. Duplicate submission with identical code QHJ8921KL must throw ConflictError
      await expect(
        feeUseCases.recordPayment({
          schoolId,
          studentId: student.id,
          invoiceId: invoice.id,
          amount: 1500,
          paymentMethod: PaymentMethod.MPESA,
          transactionReference: 'QHJ8921KL',
          recordedByUserId: 'usr-cashier-01'
        })
      ).rejects.toThrow(/already been registered/i);
    });

    it('records Bank Deposit with bank details and slip number', async () => {
      const student = Student.create(
        {
          admissionNumber: 'ADM-2026-005',
          firstName: 'Faith',
          lastName: 'Chebet',
          dateOfBirth: '2020-09-09',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-faith-05'
      );
      await studentRepo.save(student);

      const invoice = StudentInvoice.create(
        {
          schoolId,
          studentId: student.id,
          feeStructureId: 'fs-grade-1-t3',
          academicYearId,
          termId: term3Id,
          invoiceNumber: 'INV-2026-007',
          items: [{ id: 'it-t', name: 'Tuition Fee', amount: 3000, isOptional: false, category: 'TUITION' }],
          amountBilled: 3000,
          discountAmount: 0,
          amountPayable: 3000,
          amountPaid: 0,
          balance: 3000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-31'
        },
        'inv-faith-01'
      );
      await feeRepo.saveInvoice(invoice);

      const depositRes = await feeUseCases.recordPayment({
        schoolId,
        studentId: student.id,
        invoiceId: invoice.id,
        amount: 3000,
        paymentMethod: PaymentMethod.BANK_DEPOSIT,
        bankName: 'KCB Bank Kenya',
        slipNumber: 'DEP-883921',
        recordedByUserId: 'usr-cashier-01'
      });

      expect(depositRes.payment.paymentMethod).toBe(PaymentMethod.BANK_DEPOSIT);
      expect(depositRes.payment.notes).toContain('Bank: KCB Bank Kenya');
      expect(depositRes.payment.notes).toContain('Slip #: DEP-883921');
      expect(depositRes.studentTotalBalance).toBe(0);
    });
  });

  describe('3. Invoicing with Optional Previous Balance Policy', () => {
    it('omits previous balance in generated invoice when includePreviousBalance is false', async () => {
      const student = Student.create(
        {
          admissionNumber: 'ADM-2026-006',
          firstName: 'Brian',
          lastName: 'Kiprono',
          dateOfBirth: '2020-01-20',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-brian-06'
      );
      await studentRepo.save(student);

      // Prior invoice with KSh 1,200 balance
      const priorInvoice = StudentInvoice.create(
        {
          schoolId,
          studentId: student.id,
          feeStructureId: 'fs-g1-t1',
          academicYearId,
          termId: term1Id,
          invoiceNumber: 'INV-2026-008',
          items: [{ id: 'it-t', name: 'Tuition Fee', amount: 3000, isOptional: false, category: 'TUITION' }],
          amountBilled: 3000,
          discountAmount: 0,
          amountPayable: 3000,
          amountPaid: 1800,
          balance: 1200,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: '2026-04-01'
        },
        'inv-brian-prior'
      );
      await feeRepo.saveInvoice(priorInvoice);

      // Generate Term 3 invoice with includePreviousBalance = false
      const result = await feeUseCases.generateInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        studentId: student.id,
        gradeLevel: CBCGradeLevel.GRADE_1,
        includePreviousBalance: false
      });

      expect(result.invoices.length).toBe(1);
      const generated = result.invoices[0];
      // Total amount should be exactly term fee (4500), not adding 1200 arrears
      expect(generated.amountBilled).toBe(4500);
      expect(generated.items.some((it: any) => it.name.includes('Arrears') || it.name.includes('Previous Balance'))).toBe(false);

      // Prior invoice should remain untouched (not marked CARRIED_FORWARD)
      const priorReload = await feeRepo.findInvoiceById(priorInvoice.id);
      expect(priorReload?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    });

    it('brings forward previous arrears when includePreviousBalance is true and prevents double counting', async () => {
      const student = Student.create(
        {
          admissionNumber: 'ADM-2026-007',
          firstName: 'Grace',
          lastName: 'Mumbi',
          dateOfBirth: '2020-02-14',
          gender: StudentGender.FEMALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-grace-07'
      );
      await studentRepo.save(student);

      // Prior invoice with KSh 1,500 balance
      const priorInvoice = StudentInvoice.create(
        {
          schoolId,
          studentId: student.id,
          feeStructureId: 'fs-g1-t1',
          academicYearId,
          termId: term1Id,
          invoiceNumber: 'INV-2026-009',
          items: [{ id: 'it-t', name: 'Tuition Fee', amount: 3000, isOptional: false, category: 'TUITION' }],
          amountBilled: 3000,
          discountAmount: 0,
          amountPayable: 3000,
          amountPaid: 1500,
          balance: 1500,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: '2026-04-01'
        },
        'inv-grace-prior'
      );
      await feeRepo.saveInvoice(priorInvoice);

      // Generate Term 3 invoice with includePreviousBalance = true
      const result = await feeUseCases.generateInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        studentId: student.id,
        gradeLevel: CBCGradeLevel.GRADE_1,
        includePreviousBalance: true
      });

      expect(result.invoices.length).toBe(1);
      const generated = result.invoices[0];
      // 4500 term fee + 1500 arrears = 6000
      expect(generated.amountBilled).toBe(6000);
      expect(generated.items.some((it: any) => it.name.includes('Arrears'))).toBe(true);

      // Prior invoice should be marked CARRIED_FORWARD to prevent duplicate counting
      const priorReload = await feeRepo.findInvoiceById(priorInvoice.id);
      expect(priorReload?.status).toBe(InvoiceStatus.CARRIED_FORWARD);
    });
  });

  describe('4. Advance Overpayment Credit Ledger Preservation', () => {
    it('creates traceable StudentFeeCredit when payment exceeds invoice liability', async () => {
      const student = Student.create(
        {
          admissionNumber: 'ADM-2026-008',
          firstName: 'Samuel',
          lastName: 'Otieno',
          dateOfBirth: '2020-04-18',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'std-samuel-08'
      );
      await studentRepo.save(student);

      const invoice = StudentInvoice.create(
        {
          schoolId,
          studentId: student.id,
          feeStructureId: 'fs-grade-1-t3',
          academicYearId,
          termId: term3Id,
          invoiceNumber: 'INV-2026-010',
          items: [{ id: 'it-t', name: 'Tuition Fee', amount: 3000, isOptional: false, category: 'TUITION' }],
          amountBilled: 3000,
          discountAmount: 0,
          amountPayable: 3000,
          amountPaid: 0,
          balance: 3000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-31'
        },
        'inv-samuel-01'
      );
      await feeRepo.saveInvoice(invoice);

      // Parent pays KSh 5,000 for a KSh 3,000 invoice (KSh 2,000 advance overpayment)
      const res = await feeUseCases.recordPayment({
        schoolId,
        studentId: student.id,
        invoiceId: invoice.id,
        amount: 5000,
        paymentMethod: PaymentMethod.MPESA,
        transactionReference: 'QHJ998877A',
        recordedByUserId: 'usr-cashier-01'
      });

      expect(res.payment).toBeDefined();
      expect(res.studentTotalBalance).toBe(-2000);
      expect(res.overpaymentAmount).toBe(2000);

      // Verify traceable credit was saved in fee credit ledger
      const credits = await feeRepo.findCredits({ studentId: student.id });
      expect(credits.length).toBe(1);
      expect(credits[0].balance).toBe(2000);
      expect(credits[0].status).toBe('AVAILABLE');
    });
  });
});
