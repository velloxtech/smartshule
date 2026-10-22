import { InvoiceStatus, PaymentMethod, PaymentStatus, StudentInvoice } from '../../src/core/domain/finance/Fee';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
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

describe('Parent Forwarded Payment Verification and Arrears Persistence Tests', () => {
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
  let arrearsInvoice: StudentInvoice;
  let currentTermInvoice: StudentInvoice;

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
        admissionNumber: 'ADM-2026-088',
        firstName: 'Faith',
        lastName: 'Achieng',
        dateOfBirth: '2016-08-15',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        streamId: 'stream-4b',
        schoolId,
        academicYearId,
        guardianIds: ['guard-088'],
        status: StudentStatus.ACTIVE,
      },
      'std-088'
    );
    await studentRepo.save(testStudent);

    // Create test guardian and user
    const guardianUser = User.create(
      {
        email: 'parent.achieng@gmail.com',
        phone: '+254722334455',
        firstName: 'Grace',
        lastName: 'Achieng',
        role: UserRole.GUARDIAN,
        passwordHash: 'hashed_pw',
        schoolId,
        status: UserStatus.ACTIVE,
      },
      'user-guard-088'
    );
    await userRepo.save(guardianUser);

    const guardian = Guardian.create(
      {
        userId: guardianUser.id,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '+254722334455',
        studentIds: [testStudent.id],
      },
      'guard-088'
    );
    await guardianRepo.save(guardian);

    // 1. Create a prior manual Arrears Invoice (KES 6,000)
    arrearsInvoice = StudentInvoice.create(
      {
        schoolId,
        studentId: testStudent.id,
        feeStructureId: 'fs-001',
        academicYearId: 'year-2025',
        termId: 'term-2025-t3',
        invoiceNumber: 'INV-ARR-001',
        amountBilled: 6000,
        discountAmount: 0,
        amountPayable: 6000,
        amountPaid: 0,
        balance: 6000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2025-12-31',
        items: [
          {
            id: 'arr-item-1',
            name: 'Manual Prior Fee Arrears',
            amount: 6000,
            category: 'OTHER',
            isOptional: false,
          },
        ],
      },
      'inv-arr-001'
    );
    await feeRepo.saveInvoice(arrearsInvoice);

    // 2. Create Current Term Invoice (KES 14,000)
    currentTermInvoice = StudentInvoice.create(
      {
        schoolId,
        studentId: testStudent.id,
        feeStructureId: 'fs-001',
        academicYearId,
        termId,
        invoiceNumber: 'INV-2026-088',
        amountBilled: 14000,
        discountAmount: 0,
        amountPayable: 14000,
        amountPaid: 0,
        balance: 14000,
        status: InvoiceStatus.UNPAID,
        dueDate: '2026-04-10',
        items: [
          {
            id: 'item-tuition',
            name: 'Term 1 Tuition Fee',
            amount: 14000,
            category: 'TUITION',
            isOptional: false,
          },
        ],
      },
      'inv-2026-088'
    );
    await feeRepo.saveInvoice(currentTermInvoice);
  });

  describe('1. Parent Forwarding Payment Message', () => {
    it('saves forwarded transaction as PENDING with FWD- tracking number and notifies parent via SMS', async () => {
      const smsMessage = 'SH81KL90ZX Confirmed. Ksh 10,000 paid to KCB Paybill 522533 for Faith Achieng ADM-2026-088 on 15/2/26 at 10:30 AM.';

      const result = await feeUseCases.forwardPaymentTransaction({
        schoolId,
        studentId: testStudent.id,
        invoiceId: currentTermInvoice.id,
        amount: 10000,
        transactionReference: 'SH81KL90ZX',
        paymentMethod: PaymentMethod.MPESA,
        smsMessage,
        paymentDate: '2026-02-15',
      });

      expect(result.success).toBe(true);
      expect(result.payment).toBeDefined();
      expect(result.payment.status).toBe(PaymentStatus.PENDING);
      expect(result.payment.receiptNumber).toMatch(/^FWD-2026-\d+/);
      expect(result.payment.transactionReference).toBe('SH81KL90ZX');
      expect(result.payment.amount).toBe(10000);
      expect(result.payment.notes).toContain(smsMessage);

      // Verify acknowledgement SMS sent
      expect(smsSent.length).toBe(1);
      expect(smsSent[0].phone).toBe('+254722334455');
      expect(smsSent[0].message).toContain('SH81KL90ZX');
      expect(smsSent[0].message).toContain('forwarded to the school accounts office');
    });

    it('retrieves forwarded transactions queue for administrative audit', async () => {
      await feeUseCases.forwardPaymentTransaction({
        schoolId,
        studentId: testStudent.id,
        invoiceId: currentTermInvoice.id,
        amount: 10000,
        transactionReference: 'TX-FWD-999',
        paymentMethod: PaymentMethod.MPESA,
        smsMessage: 'Test SMS 999',
      });

      const list = await feeUseCases.getForwardedTransactions(schoolId);

      expect(list.length).toBeGreaterThanOrEqual(1);
      const target = list.find((t) => t.transactionReference === 'TX-FWD-999');
      expect(target).toBeDefined();
      expect(target?.status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('2. Bursar 1-Click Verification of Forwarded Payment', () => {
    it('approves and credits forwarded payment to ledger with official REC- receipt and updates invoices', async () => {
      const fwd = await feeUseCases.forwardPaymentTransaction({
        schoolId,
        studentId: testStudent.id,
        invoiceId: currentTermInvoice.id,
        amount: 10000,
        transactionReference: 'SH88VERIF01',
        paymentMethod: PaymentMethod.MPESA,
        smsMessage: 'SH88VERIF01 Confirmed. Ksh 10,000 paid to SmartShule.',
      });

      smsSent = [];

      const verified = await feeUseCases.verifyForwardedTransaction(
        fwd.payment.id,
        'APPROVE',
        undefined,
        { userId: 'usr-bursar-01', schoolId, role: UserRole.BURSAR }
      );

      expect(verified.success).toBe(true);
      expect(verified.payment.status).toBe(PaymentStatus.COMPLETED);
      expect(verified.payment.receiptNumber).toMatch(/^REC-2026-\d+/);

      // Current term invoice balance should be 14,000 - 10,000 = 4,000
      const updatedInv = await feeRepo.findInvoiceById(currentTermInvoice.id);
      expect(updatedInv?.amountPaid).toBe(10000);
      expect(updatedInv?.balance).toBe(4000);
      expect(updatedInv?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

      // Total balance must include 6,000 arrears + 4,000 current = 10,000
      expect(verified.remainingBalance).toBe(10000);

      // Verify SMS receipt confirms verification
      expect(smsSent.length).toBe(1);
      expect(smsSent[0].phone).toBe('+254722334455');
      expect(smsSent[0].message).toContain('SH88VERIF01');
      expect(smsSent[0].message).toContain('REC-');
      expect(smsSent[0].message).toContain('New balance: KES 10,000.');
    });

    it('rejects fraudulent or invalid forwarded transaction without touching invoice balance', async () => {
      const fwd = await feeUseCases.forwardPaymentTransaction({
        schoolId,
        studentId: testStudent.id,
        invoiceId: currentTermInvoice.id,
        amount: 5000,
        transactionReference: 'FAKE-CODE-404',
        paymentMethod: PaymentMethod.MPESA,
        smsMessage: 'FAKE-CODE-404 Confirmed fake message.',
      });

      const res = await feeUseCases.verifyForwardedTransaction(
        fwd.payment.id,
        'REJECT',
        'Reference not found on M-Pesa statement',
        { userId: 'usr-bursar-01', schoolId, role: UserRole.BURSAR }
      );

      expect(res.success).toBe(true);
      expect(res.payment.status).toBe(PaymentStatus.FAILED);

      // Invoice balance must remain untouched (14,000)
      const inv = await feeRepo.findInvoiceById(currentTermInvoice.id);
      expect(inv?.amountPaid).toBe(0);
      expect(inv?.balance).toBe(14000);
    });
  });

  describe('3. Arrears Balance Persistence When Payments Are Recorded', () => {
    it('correctly keeps arrears balance visible and sends true total balance when admin enters payment', async () => {
      // Learner owes 6,000 Arrears + 14,000 Current Term = 20,000 total.
      // Admin records a manual payment of 14,000 against the Current Term Invoice.
      const paymentResult = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: currentTermInvoice.id,
        amount: 14000,
        paymentMethod: PaymentMethod.BANK_DEPOSIT,
        bankName: 'KCB Bank Kenya',
        slipNumber: 'SLIP-778899',
        recordedByUserId: 'usr-bursar-01',
      });

      // Current term invoice is fully paid
      expect(paymentResult.updatedInvoice.balance).toBe(0);
      expect(paymentResult.updatedInvoice.status).toBe(InvoiceStatus.PAID);

      // BUT the student's true total balance is STILL 6,000 (arrears invoice is unpaid)!
      expect(paymentResult.studentTotalBalance).toBe(6000);
      expect(paymentResult.hasArrears).toBe(true);

      // Check Fee Statement: arrears must be present and total balance must be 6,000
      const statement = await feeUseCases.getStudentFeeStatement(testStudent.id);

      expect(statement.summary.currentBalance).toBe(6000);
      expect(statement.summary.arrearsBalance).toBe(6000);
      expect(statement.summary.totalBilled).toBe(20000);
      expect(statement.summary.totalPaid).toBe(14000);

      // SMS sent to guardian must report the TRUE remaining balance (KES 6000), NOT KES 0!
      expect(smsSent.length).toBe(1);
      expect(smsSent[0].phone).toBe('+254722334455');
      expect(smsSent[0].message).toContain('New balance: KES 6,000');
    });
  });
});
