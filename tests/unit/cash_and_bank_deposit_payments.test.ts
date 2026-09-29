import { FeeStructure, PaymentMethod, PaymentStatus, StudentInvoice } from '../../src/core/domain/finance/Fee';
import { CbcGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
import {
  InMemoryFeeRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository,
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';

describe('Cash and Manual Bank Deposit Payments Tests', () => {
  let feeRepo: InMemoryFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let feeUseCases: FeeUseCases;
  let smsSent: { phone: string; message: string }[] = [];

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-t1';

  let testStudent: Student;
  let testInvoice: StudentInvoice;

  beforeEach(async () => {
    smsSent = [];
    feeRepo = new InMemoryFeeRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();

    const mockNotificationService = {
      sendSms: async (phone: string, message: string) => {
        smsSent.push({ phone, message });
        return true;
      },
      sendBulkSms: async () => ({ success: true, successfulCount: 0, failedCount: 0, messageIds: [] }),
      sendTemplateSms: async () => true,
    };

    feeUseCases = new FeeUseCases(
      feeRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      {} as any,
      mockNotificationService as any,
      academicRepo
    );

    // Create test student
    testStudent = Student.create(
      {
        admissionNumber: 'ADM-2026-050',
        firstName: 'Kelvin',
        lastName: 'Kiprono',
        dateOfBirth: '2016-04-12',
        gender: StudentGender.MALE,
        gradeLevel: CbcGradeLevel.GRADE_4,
        streamId: 'stream-4a',
        schoolId,
        academicYearId,
        guardianIds: ['guard-001'],
        status: StudentStatus.ACTIVE,
      },
      'std-050'
    );
    await studentRepo.save(testStudent);

    // Create test guardian and user
    const guardianUser = User.create(
      {
        email: 'parent.kiprono@gmail.com',
        phone: '+254711889900',
        firstName: 'Sarah',
        lastName: 'Kiprono',
        role: UserRole.GUARDIAN,
        passwordHash: 'hashed_pw',
        schoolId,
        status: UserStatus.ACTIVE,
      },
      'user-guard-001'
    );
    await userRepo.save(guardianUser);

    const guardian = Guardian.create(
      {
        userId: guardianUser.id,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '+254711889900',
        studentIds: [testStudent.id],
      },
      'guard-001'
    );
    await guardianRepo.save(guardian);

    // Create test annual fee structure
    const feeStructure = FeeStructure.create(
      {
        schoolId,
        academicYearId,
        termId: 'ALL',
        gradeLevel: CbcGradeLevel.GRADE_4,
        title: 'Grade 4 CBC Annual Fees 2026',
        dueDate: '2026-12-31',
        items: [
          {
            id: 'item-1',
            name: 'Tuition Fee',
            amount: 40000,
            category: 'TUITION',
            isOptional: false,
            termBreakdown: { term1: 20000, term2: 12000, term3: 8000 },
          },
        ],
      },
      'fs-grade4-001'
    );
    await feeRepo.saveFeeStructure(feeStructure);

    // Create an initial invoice for Term 1 (Amount: 20,000)
    testInvoice = StudentInvoice.create(
      {
        schoolId,
        studentId: testStudent.id,
        feeStructureId: feeStructure.id,
        academicYearId,
        termId,
        invoiceNumber: 'INV-2026-T1-050',
        items: [
          {
            id: 'item-1',
            name: 'Tuition Fee (Term 1)',
            amount: 20000,
            category: 'TUITION',
            isOptional: false,
          },
        ],
        amountBilled: 20000,
        discountAmount: 0,
        amountPayable: 20000,
        amountPaid: 0,
        balance: 20000,
        status: 'UNPAID' as any,
        dueDate: '2026-03-31',
      },
      'inv-050'
    );
    await feeRepo.saveInvoice(testInvoice);
  });

  describe('1. Cash Office Payment Recording', () => {
    it('records cash payment with auto-generated reference when not provided', async () => {
      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: testInvoice.id,
        amount: 8000,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'usr-bursar-01',
        receivedFrom: 'Sarah Kiprono (Mother in person)',
        notes: 'Paid 8x 1000 KES notes at counter',
      });

      expect(result.payment).toBeDefined();
      expect(result.payment.amount).toBe(8000);
      expect(result.payment.paymentMethod).toBe(PaymentMethod.CASH);
      expect(result.payment.status).toBe(PaymentStatus.COMPLETED);
      // Auto-generated reference format: CSH-YYYY-XXXXX
      expect(result.payment.transactionReference).toMatch(/^CSH-\d{4}-\d+/);
      expect(result.payment.notes).toContain('Received From: Sarah Kiprono');
      expect(result.payment.notes).toContain('Paid 8x 1000 KES notes');

      // Check invoice balance
      expect(result.updatedInvoice.amountPaid).toBe(8000);
      expect(result.updatedInvoice.balance).toBe(12000);
      expect(result.updatedInvoice.status).toBe('PARTIALLY_PAID');

      // Verify SMS notification sent
      expect(smsSent.length).toBe(1);
      expect(smsSent[0].phone).toBe('+254711889900');
      expect(smsSent[0].message).toContain('SmartShule Receipt: Received KES 8000 via CASH');
      expect(smsSent[0].message).toContain('New balance: KES 12000');
    });

    it('records cash payment with a custom paper receipt booklet reference', async () => {
      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: testInvoice.id,
        amount: 12000,
        paymentMethod: PaymentMethod.CASH,
        transactionReference: 'BOOK-RCPT-48192',
        recordedByUserId: 'usr-bursar-01',
      });

      expect(result.payment.transactionReference).toBe('BOOK-RCPT-48192');
      expect(result.updatedInvoice.balance).toBe(8000);
    });
  });

  describe('2. Manual Bank Deposit Payment Recording', () => {
    it('records manual bank deposit with bank name, branch, slip number, and depositor', async () => {
      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: testInvoice.id,
        amount: 15000,
        paymentMethod: PaymentMethod.BANK_DEPOSIT,
        bankName: 'KCB Bank Kenya',
        bankBranch: 'Kikuyu Town Branch',
        slipNumber: 'SLIP-982103',
        depositorName: 'John Kiprono (Father)',
        paymentDate: '2026-02-15',
        recordedByUserId: 'usr-accountant-01',
        notes: 'Deposit verified against KCB portal',
      });

      expect(result.payment).toBeDefined();
      expect(result.payment.amount).toBe(15000);
      expect(result.payment.paymentMethod).toBe(PaymentMethod.BANK_DEPOSIT);
      // Auto-generated reference uses slipNumber
      expect(result.payment.transactionReference).toBe('DEP-SLIP-982103');
      expect(result.payment.paymentDate).toBe('2026-02-15');
      expect(result.payment.notes).toContain('Bank: KCB Bank Kenya');
      expect(result.payment.notes).toContain('Branch: Kikuyu Town Branch');
      expect(result.payment.notes).toContain('Slip #: SLIP-982103');
      expect(result.payment.notes).toContain('Depositor: John Kiprono');

      // Check invoice balance
      expect(result.updatedInvoice.amountPaid).toBe(15000);
      expect(result.updatedInvoice.balance).toBe(5000);

      // Verify SMS notification sent
      expect(smsSent.length).toBe(1);
      expect(smsSent[0].phone).toBe('+254711889900');
      expect(smsSent[0].message).toContain('SmartShule Receipt: Received KES 15000 via Bank Deposit (KCB Bank Kenya - Slip #SLIP-982103)');
      expect(smsSent[0].message).toContain('New balance: KES 5000');
    });

    it('settles invoice completely and transitions status to PAID', async () => {
      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: testInvoice.id,
        amount: 20000,
        paymentMethod: PaymentMethod.BANK_DEPOSIT,
        bankName: 'Equity Bank Kenya',
        slipNumber: 'EQ-829103',
        recordedByUserId: 'usr-accountant-01',
      });

      expect(result.updatedInvoice.amountPaid).toBe(20000);
      expect(result.updatedInvoice.balance).toBe(0);
      expect(result.updatedInvoice.status).toBe('PAID');
    });
  });

  describe('3. Cash Flow Ledger Recognition', () => {
    it('accurately attributes cash and bank deposit inflows in the financial ledger', async () => {
      // 1. Record cash payment
      await feeUseCases.recordPayment({
        schoolId,
        invoiceId: testInvoice.id,
        amount: 5000,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'usr-bursar-01',
      });

      // 2. Record manual bank deposit
      await feeUseCases.recordPayment({
        schoolId,
        invoiceId: testInvoice.id,
        amount: 10000,
        paymentMethod: PaymentMethod.BANK_DEPOSIT,
        bankName: 'KCB Bank Kenya',
        slipNumber: 'KCB-009281',
        recordedByUserId: 'usr-accountant-01',
      });

      const ledger = await feeUseCases.getCashFlowLedger(schoolId, {}, {
        userId: 'usr-superadmin',
        role: UserRole.SUPER_ADMIN,
        schoolId,
      });

      expect(ledger.totalMoneyIn).toBe(15000);
      // Inflow breakdown
      expect(ledger.accountBalances.pettyCash.inflows).toBe(5000);
      expect(ledger.accountBalances.bank.inflows).toBe(10000);
    });
  });
});
