import { InvoiceStatus, PaymentMethod, PaymentStatus, StudentInvoice } from '../../src/core/domain/finance/Fee';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
import { StudentUseCases } from '../../src/application/students/StudentUseCases';
import {
  InMemoryFeeRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository,
  InMemoryCBCAssessmentRepository,
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';

describe('Exact Payment and Arrears Precision Tests (1 Shilling Precision)', () => {
  let feeRepo: InMemoryFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let cbcRepo: InMemoryCBCAssessmentRepository;
  let feeUseCases: FeeUseCases;
  let studentUseCases: StudentUseCases;
  let smsSent: { phone: string; message: string }[] = [];

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-t1';

  let testStudent: Student;
  let guardianUser: User;
  let guardian: Guardian;

  beforeEach(async () => {
    smsSent = [];
    feeRepo = new InMemoryFeeRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();
    cbcRepo = new InMemoryCBCAssessmentRepository();

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

    studentUseCases = new StudentUseCases(
      studentRepo,
      guardianRepo,
      userRepo,
      { hash: async (p: string) => p, compare: async (p: string, h: string) => p === h } as any,
      academicRepo,
      feeRepo,
      cbcRepo
    );

    // Create test student
    testStudent = Student.create(
      {
        admissionNumber: 'GSS-2026-001',
        firstName: 'Daniel',
        lastName: 'Otieno',
        dateOfBirth: '2019-05-10',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.PP1,
        schoolId,
        academicYearId,
        guardianIds: ['grd-grace-001'],
        status: StudentStatus.ACTIVE,
      },
      'std-daniel-001'
    );
    await studentRepo.save(testStudent);

    // Create guardian user and entity
    guardianUser = User.create(
      {
        email: 'guardian.daniel@example.com',
        phone: '0711999888',
        passwordHash: 'hashed_pw',
        role: UserRole.PARENT,
        firstName: 'Grace',
        lastName: 'Otieno',
        status: UserStatus.ACTIVE,
        schoolId,
      },
      'usr-grace-001'
    );
    await userRepo.save(guardianUser);

    guardian = Guardian.create(
      {
        userId: guardianUser.id,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '0711999888',
        studentIds: [testStudent.id],
      },
      'grd-grace-001'
    );
    await guardianRepo.save(guardian);
  });

  describe('1. Exact 1 Shilling Payment & Balance Correspondence', () => {
    it('should deduct exactly 1 shilling from 15,000 balance leaving 14,999 balance and PARTIALLY_PAID status', async () => {
      const inv = StudentInvoice.create(
        {
          schoolId,
          studentId: testStudent.id,
          feeStructureId: 'fee-struct-01',
          academicYearId,
          termId,
          invoiceNumber: 'INV-2026-001',
          items: [{ id: 'item-1', name: 'Tuition Fee', amount: 15000, category: 'TUITION', isOptional: false }],
          amountBilled: 15000,
          discountAmount: 0,
          amountPayable: 15000,
          amountPaid: 0,
          balance: 15000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-30',
        },
        'inv-001'
      );
      await feeRepo.saveInvoice(inv);

      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: inv.id,
        amount: 1,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'bursar-01',
      });

      expect(result.payment.amount).toBe(1);
      expect(result.updatedInvoice.amountPaid).toBe(1);
      expect(result.updatedInvoice.balance).toBe(14999);
      expect(result.updatedInvoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(result.studentTotalBalance).toBe(14999);

      // Verify fee statement corresponds exactly
      const statement = await feeUseCases.getStudentFeeStatement(testStudent.id);
      expect(statement.summary.totalBilled).toBe(15000);
      expect(statement.summary.totalPaid).toBe(1);
      expect(statement.summary.currentBalance).toBe(14999);
    });

    it('should clear an exact 1 shilling balance to 0 and transition status to PAID', async () => {
      const inv = StudentInvoice.create(
        {
          schoolId,
          studentId: testStudent.id,
          feeStructureId: 'fee-struct-01',
          academicYearId,
          termId,
          invoiceNumber: 'INV-2026-002',
          items: [{ id: 'item-1', name: 'Activity Fee', amount: 1, category: 'ACTIVITY', isOptional: false }],
          amountBilled: 1,
          discountAmount: 0,
          amountPayable: 1,
          amountPaid: 0,
          balance: 1,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-30',
        },
        'inv-002'
      );
      await feeRepo.saveInvoice(inv);

      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: inv.id,
        amount: 1,
        paymentMethod: PaymentMethod.MPESA,
        transactionReference: 'QHG819201A',
        recordedByUserId: 'bursar-01',
      });

      expect(result.payment.amount).toBe(1);
      expect(result.updatedInvoice.amountPaid).toBe(1);
      expect(result.updatedInvoice.balance).toBe(0);
      expect(result.updatedInvoice.status).toBe(InvoiceStatus.PAID);
      expect(result.studentTotalBalance).toBe(0);
      expect(result.hasArrears).toBe(false);
    });
  });

  describe('2. Multi-Invoice Cascade Without Over-crediting', () => {
    it('should allocate 1 shilling across fractional balances without inflating amountPaid', async () => {
      // Invoice 1 has 0.40 KES balance remaining (10,000 payable, 9,999.60 already paid)
      const inv1 = StudentInvoice.create(
        {
          schoolId,
          studentId: testStudent.id,
          feeStructureId: 'fee-struct-01',
          academicYearId,
          termId,
          invoiceNumber: 'INV-2026-003A',
          items: [{ id: 'item-1', name: 'Term 1 Levy', amount: 10000, category: 'TUITION', isOptional: false }],
          amountBilled: 10000,
          discountAmount: 0,
          amountPayable: 10000,
          amountPaid: 9999.6,
          balance: 0.4,
          status: InvoiceStatus.PARTIALLY_PAID,
          dueDate: '2026-10-30',
        },
        'inv-003A'
      );
      await feeRepo.saveInvoice(inv1);

      // Invoice 2 has 1,000 KES balance
      const inv2 = StudentInvoice.create(
        {
          schoolId,
          studentId: testStudent.id,
          feeStructureId: 'fee-struct-02',
          academicYearId,
          termId,
          invoiceNumber: 'INV-2026-003B',
          items: [{ id: 'item-2', name: 'Term 2 Levy', amount: 1000, category: 'TUITION', isOptional: false }],
          amountBilled: 1000,
          discountAmount: 0,
          amountPayable: 1000,
          amountPaid: 0,
          balance: 1000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-30',
        },
        'inv-003B'
      );
      await feeRepo.saveInvoice(inv2);

      // Pay 1 shilling targeted at inv1
      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: inv1.id,
        amount: 1,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'bursar-01',
      });

      expect(result.payment.amount).toBe(1);

      // inv1 should take exactly 0.40 and transition to PAID
      const updatedInv1 = await feeRepo.findInvoiceById('inv-003A');
      expect(updatedInv1?.amountPaid).toBe(10000);
      expect(updatedInv1?.balance).toBe(0);
      expect(updatedInv1?.status).toBe(InvoiceStatus.PAID);

      // inv2 should receive the remaining 0.60
      const updatedInv2 = await feeRepo.findInvoiceById('inv-003B');
      expect(updatedInv2?.amountPaid).toBe(0.6);
      expect(updatedInv2?.balance).toBe(999.4);
      expect(updatedInv2?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

      // Total student balance should be exactly 999.40 KES
      expect(result.studentTotalBalance).toBe(999.4);

      // Statement verification
      const statement = await feeUseCases.getStudentFeeStatement(testStudent.id);
      expect(statement.summary.currentBalance).toBe(999.4);
    });
  });

  describe('3. Arrears Tracking and Precision with 1 Shilling Payment', () => {
    it('should report exact manual arrears without duplicate counting, and reduce by 1 shilling on payment', async () => {
      // Create manual arrears invoice of 4,000 KES
      const arrearsInv = StudentInvoice.create(
        {
          schoolId,
          studentId: testStudent.id,
          feeStructureId: 'MANUAL_ARREARS',
          academicYearId,
          termId,
          invoiceNumber: 'INV-ARR-2026-001',
          items: [{ id: 'item-arr-1', name: 'Prior Fee Arrears Carried Forward', amount: 4000, category: 'OTHER', isOptional: false }],
          amountBilled: 4000,
          discountAmount: 0,
          amountPayable: 4000,
          amountPaid: 0,
          balance: 4000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-30',
        },
        'inv-arr-001'
      );
      await feeRepo.saveInvoice(arrearsInv);

      // Before payment, check statement arrears
      const statementBefore = await feeUseCases.getStudentFeeStatement(testStudent.id);
      expect(statementBefore.summary.currentBalance).toBe(4000);
      expect(statementBefore.summary.arrearsBalance).toBe(4000);

      // Check guardian portal arrears before payment
      const portalBefore = await studentUseCases.getGuardianPortalData('usr-grace-001');
      expect(portalBefore.children[0].fee.balance).toBe(4000);
      expect(portalBefore.children[0].fee.arrearsAmount).toBe(4000);

      // Pay 1 shilling against the arrears invoice
      const result = await feeUseCases.recordPayment({
        schoolId,
        invoiceId: arrearsInv.id,
        amount: 1,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'bursar-01',
      });

      expect(result.payment.amount).toBe(1);
      expect(result.updatedInvoice.balance).toBe(3999);
      expect(result.studentTotalBalance).toBe(3999);

      // After payment: statement must report exactly 3,999 balance and 3,999 arrears
      const statementAfter = await feeUseCases.getStudentFeeStatement(testStudent.id);
      expect(statementAfter.summary.totalPaid).toBe(1);
      expect(statementAfter.summary.currentBalance).toBe(3999);
      expect(statementAfter.summary.arrearsBalance).toBe(3999);

      // After payment: guardian portal must report exactly 3,999 balance and 3,999 arrears
      const portalAfter = await studentUseCases.getGuardianPortalData('usr-grace-001');
      expect(portalAfter.children[0].fee.totalPaid).toBe(1);
      expect(portalAfter.children[0].fee.balance).toBe(3999);
      expect(portalAfter.children[0].fee.arrearsAmount).toBe(3999);
    });

    it('should cap line-item arrears at invoice balance when partially paid', async () => {
      // Invoice has 500 KES prior arrears and 1,000 KES tuition (total 1,500 KES)
      const inv = StudentInvoice.create(
        {
          schoolId,
          studentId: testStudent.id,
          feeStructureId: 'fee-struct-comb',
          academicYearId,
          termId,
          invoiceNumber: 'INV-2026-COMB',
          items: [
            { id: 'item-arr', name: 'Prior Term Arrears Carried Forward', amount: 500, category: 'OTHER', isOptional: false },
            { id: 'item-tui', name: 'Term 1 Tuition', amount: 1000, category: 'TUITION', isOptional: false },
          ],
          amountBilled: 1500,
          discountAmount: 0,
          amountPayable: 1500,
          amountPaid: 0,
          balance: 1500,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-30',
        },
        'inv-comb'
      );
      await feeRepo.saveInvoice(inv);

      // Pay 1,200 KES (which pays all tuition and 200 of arrears)
      await feeUseCases.recordPayment({
        schoolId,
        invoiceId: inv.id,
        amount: 1200,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'bursar-01',
      });

      // Remaining invoice balance is 300 KES.
      // Arrears balance must NOT be 500 KES (phantom); it must be capped at the remaining balance of 300 KES.
      const statement = await feeUseCases.getStudentFeeStatement(testStudent.id);
      expect(statement.summary.currentBalance).toBe(300);
      expect(statement.summary.arrearsBalance).toBe(300);

      // Now pay 1 shilling
      await feeUseCases.recordPayment({
        schoolId,
        invoiceId: inv.id,
        amount: 1,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'bursar-01',
      });

      const statement2 = await feeUseCases.getStudentFeeStatement(testStudent.id);
      expect(statement2.summary.currentBalance).toBe(299);
      expect(statement2.summary.arrearsBalance).toBe(299);
    });
  });

  describe('4. Forwarded Payment 1 Shilling Verification', () => {
    it('should forward 1 shilling notice and credit exactly 1 shilling upon bursar verification', async () => {
      const inv = StudentInvoice.create(
        {
          schoolId,
          studentId: testStudent.id,
          feeStructureId: 'fee-struct-01',
          academicYearId,
          termId,
          invoiceNumber: 'INV-2026-FWD',
          items: [{ id: 'item-1', name: 'Tuition', amount: 5000, category: 'TUITION', isOptional: false }],
          amountBilled: 5000,
          discountAmount: 0,
          amountPayable: 5000,
          amountPaid: 0,
          balance: 5000,
          status: InvoiceStatus.UNPAID,
          dueDate: '2026-10-30',
        },
        'inv-fwd'
      );
      await feeRepo.saveInvoice(inv);

      // Parent forwards 1 shilling confirmation
      const fwdResult = await feeUseCases.forwardPaymentTransaction(
        {
          studentId: testStudent.id,
          amount: 1,
          paymentMethod: PaymentMethod.MPESA,
          transactionReference: 'QK18920199',
          smsMessage: 'Confirmed. Ksh1.00 paid to Grace Seeds School. Ref: QK18920199',
        },
        { userId: guardianUser.id, role: UserRole.PARENT, schoolId }
      );

      expect(fwdResult.success).toBe(true);
      expect(fwdResult.payment.amount).toBe(1);
      expect(fwdResult.payment.status).toBe(PaymentStatus.PENDING);

      // Prior to approval, invoice balance remains 5000
      const invBeforeApproval = await feeRepo.findInvoiceById('inv-fwd');
      expect(invBeforeApproval?.balance).toBe(5000);

      // Bursar approves 1 shilling forwarded transaction
      const verifyResult = await feeUseCases.verifyForwardedTransaction(
        fwdResult.payment.id,
        'APPROVE',
        undefined,
        { userId: 'bursar-01', role: UserRole.BURSAR, schoolId }
      );

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.payment.status).toBe(PaymentStatus.COMPLETED);

      // Invoice balance must be exactly 4,999
      const invAfterApproval = await feeRepo.findInvoiceById('inv-fwd');
      expect(invAfterApproval?.amountPaid).toBe(1);
      expect(invAfterApproval?.balance).toBe(4999);
      expect(invAfterApproval?.status).toBe(InvoiceStatus.PARTIALLY_PAID);

      const statement = await feeUseCases.getStudentFeeStatement(testStudent.id);
      expect(statement.summary.totalPaid).toBe(1);
      expect(statement.summary.currentBalance).toBe(4999);
    });
  });

  describe('5. Lunch Fee 1 Shilling Payment Precision', () => {
    it('should deduct exactly 1 shilling from lunch fee balance and update paymentStatus', async () => {
      const { LunchEnrollment, LunchEnrollmentStatus, LunchPaymentStatus } = require('../../src/core/domain/finance/LunchEnrollment');
      const enrollment = LunchEnrollment.create(
        {
          schoolId,
          studentId: testStudent.id,
          academicYearId,
          termId,
          planName: 'Standard Lunch',
          amount: 6000,
          status: LunchEnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
        },
        'lunch-enr-01'
      );

      expect(enrollment.balance).toBe(6000);

      enrollment.recordPayment({
        id: 'lunch-pay-01',
        lunchEnrollmentId: enrollment.id,
        studentId: testStudent.id,
        schoolId,
        amount: 1,
        receiptNumber: 'LNCH-001',
        paymentMethod: PaymentMethod.CASH,
        transactionReference: 'TXN-LUNCH-1',
        paymentDate: '2026-10-18',
        recordedByUserId: 'bursar-01',
        createdAt: new Date(),
      });

      expect(enrollment.amountPaid).toBe(1);
      expect(enrollment.balance).toBe(5999);
      expect(enrollment.paymentStatus).toBe(LunchPaymentStatus.PARTIAL);
    });
  });
});
