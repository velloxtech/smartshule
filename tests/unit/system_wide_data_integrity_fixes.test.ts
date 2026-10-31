import {
  PaymentMethod,
  PaymentStatus,
  StudentInvoice,
  InvoiceStatus,
  Payment
} from '../../src/core/domain/finance/Fee';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ClassRoom, Stream, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { PayrollRecord } from '../../src/core/domain/payroll/PayrollRecord';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
import { FinancialApprovalUseCases } from '../../src/application/finance/FinancialApprovalUseCases';
import { PayrollUseCases } from '../../src/application/payroll/PayrollUseCases';
import { BroadsheetUseCases } from '../../src/application/academics/BroadsheetUseCases';
import { AcademicUseCases } from '../../src/application/academics/AcademicUseCases';
import { TeacherUseCases } from '../../src/application/teachers/TeacherUseCases';
import {
  InMemoryFeeRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository,
  InMemoryCBCAssessmentRepository,
  InMemoryFinancialApprovalRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemoryPayrollRepository } from '../../src/infrastructure/database/in-memory/InMemoryPayrollRepository';
import { InMemoryTeacherRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemorySystemLogRepository } from '../../src/infrastructure/database/in-memory/InMemorySystemLogRepository';

describe('System-Wide Bug Fix and Data Integrity Verification (Issues 1 - 5)', () => {
  const schoolId = 'school-grace-seeds';
  const academicYearId = 'year-2026';
  const term1Id = 'term-2026-t1';

  let feeRepo: InMemoryFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let cbcRepo: InMemoryCBCAssessmentRepository;
  let approvalRepo: InMemoryFinancialApprovalRepository;
  let payrollRepo: InMemoryPayrollRepository;
  let teacherRepo: InMemoryTeacherRepository;
  let systemLogRepo: InMemorySystemLogRepository;

  let feeUseCases: FeeUseCases;
  let approvalUseCases: FinancialApprovalUseCases;
  let payrollUseCases: PayrollUseCases;
  let broadsheetUseCases: BroadsheetUseCases;
  let academicUseCases: AcademicUseCases;
  let teacherUseCases: TeacherUseCases;

  let mockSms: jest.Mock;
  let mockEmail: jest.Mock;

  beforeEach(async () => {
    feeRepo = new InMemoryFeeRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();
    cbcRepo = new InMemoryCBCAssessmentRepository();
    approvalRepo = new InMemoryFinancialApprovalRepository();
    payrollRepo = new InMemoryPayrollRepository();
    teacherRepo = new InMemoryTeacherRepository();
    systemLogRepo = new InMemorySystemLogRepository();

    mockSms = jest.fn().mockResolvedValue({ success: true, messageId: 'sms-001' });
    mockEmail = jest.fn().mockResolvedValue({ success: true, messageId: 'email-001' });

    const notificationService: any = {
      sendSms: mockSms,
      sendEmail: mockEmail
    };

    const paymentGateway: any = {
      initiateStkPush: jest.fn().mockResolvedValue({ success: true }),
      queryTransactionStatus: jest.fn().mockResolvedValue({ success: true })
    };

    feeUseCases = new FeeUseCases(
      feeRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      paymentGateway,
      notificationService,
      academicRepo
    );

    approvalUseCases = new FinancialApprovalUseCases(
      approvalRepo,
      userRepo,
      feeRepo,
      notificationService,
      payrollRepo,
      systemLogRepo
    );

    payrollUseCases = new PayrollUseCases(
      payrollRepo,
      teacherRepo,
      userRepo,
      undefined as any,
      feeRepo,
      systemLogRepo
    );

    broadsheetUseCases = new BroadsheetUseCases(
      academicRepo,
      studentRepo,
      cbcRepo
    );

    academicUseCases = new AcademicUseCases(
      academicRepo,
      teacherRepo,
      userRepo,
      systemLogRepo
    );

    teacherUseCases = new TeacherUseCases(
      teacherRepo,
      userRepo,
      { hash: async (p: string) => p, compare: async () => true } as any,
      undefined as any,
      systemLogRepo,
      academicRepo
    );

    // Seed Academic Year & Term
    const year = AcademicYear.create({ schoolId, name: '2026', startDate: '2026-01-01', endDate: '2026-12-31', isCurrent: true }, academicYearId);
    await academicRepo.saveYear(year);
    const term = AcademicTerm.create({ academicYearId, name: 'Term 1', termNumber: 1, startDate: '2026-01-05', endDate: '2026-04-10', isCurrent: true }, term1Id);
    await academicRepo.saveTerm(term);

    // Seed Admin & Cashier Users
    await userRepo.save(User.create({
      schoolId,
      email: 'admin@graceseeds.ac.ke',
      passwordHash: 'hash',
      firstName: 'Director',
      lastName: 'Grace',
      role: UserRole.SUPER_ADMIN,
      phone: '+254712345678',
      status: UserStatus.ACTIVE
    }, 'usr-admin-001'));

    await userRepo.save(User.create({
      schoolId,
      email: 'cashier@graceseeds.ac.ke',
      passwordHash: 'hash',
      firstName: 'Cashier',
      lastName: 'One',
      role: UserRole.BURSAR,
      phone: '+254722000111',
      status: UserStatus.ACTIVE
    }, 'usr-cashier-001'));
  });

  // =========================================================================
  // ISSUE 1: FEE OVERPAYMENT AND CONFLICTING BALANCES
  // =========================================================================
  describe('Issue 1: Fee Overpayment and Contradictory Balances', () => {
    let studentId: string;
    let invoiceId: string;

    beforeEach(async () => {
      studentId = 'std-learner-001';
      const student = Student.create({
        admissionNumber: 'GS-2026-001',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '2018-05-10',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        schoolId,
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      }, studentId);
      await studentRepo.save(student);

      // Create invoice: KES 15,000 billed, KES 10,500 previously paid -> KES 4,500 outstanding
      invoiceId = 'inv-001';
      const invoice = StudentInvoice.create({
        schoolId,
        studentId,
        feeStructureId: 'fee-struct-001',
        academicYearId,
        termId: term1Id,
        invoiceNumber: 'INV-2026-001',
        items: [{ id: 'item-1', name: 'Tuition Fee', amount: 15000, isOptional: false, category: 'TUITION' as any }],
        amountBilled: 15000,
        discountAmount: 0,
        amountPayable: 15000,
        amountPaid: 10500,
        balance: 4500,
        status: InvoiceStatus.PARTIALLY_PAID,
        dueDate: '2026-02-28'
      }, invoiceId);
      await feeRepo.saveInvoice(invoice);
    });

    test('1. Authoritative fee position never displays both positive credit and positive outstanding balance', async () => {
      const pos = await feeUseCases.calculateAuthoritativeFeePosition(studentId);
      expect(pos.outstandingBalance).toBe(4500);
      expect(pos.netCreditBalance).toBe(0);
      expect(pos.maxAcceptedPayment).toBe(4500);
    });

    test('2. Payment below outstanding balance succeeds and updates balance accurately', async () => {
      const res = await feeUseCases.recordPayment({
        schoolId,
        invoiceId,
        studentId,
        amount: 2000,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'usr-cashier-001'
      });

      expect(res.payment.amount).toBe(2000);
      expect(res.studentTotalBalance).toBe(2500);
      expect(res.creditBalance).toBe(0);

      const updatedInv = await feeRepo.findInvoiceById(invoiceId);
      expect(updatedInv?.balance).toBe(2500);
      expect(updatedInv?.amountPaid).toBe(12500);
    });

    test('3. Payment equal to outstanding balance succeeds and clears the account', async () => {
      const res = await feeUseCases.recordPayment({
        schoolId,
        invoiceId,
        studentId,
        amount: 4500,
        paymentMethod: PaymentMethod.CASH,
        recordedByUserId: 'usr-cashier-001'
      });

      expect(res.studentTotalBalance).toBe(0);
      expect(res.creditBalance).toBe(0);
      const updatedInv = await feeRepo.findInvoiceById(invoiceId);
      expect(updatedInv?.balance).toBe(0);
      expect(updatedInv?.status).toBe(InvoiceStatus.PAID);
    });

    test('4. Payment exceeding outstanding balance is strictly rejected with authoritative error message', async () => {
      // Cashier attempts to enter KES 9,000 when only KES 4,500 is outstanding
      await expect(
        feeUseCases.recordPayment({
          schoolId,
          invoiceId,
          studentId,
          amount: 9000,
          paymentMethod: PaymentMethod.CASH,
          recordedByUserId: 'usr-cashier-001'
        })
      ).rejects.toThrow(
        'Payment exceeds the outstanding balance of KES 4,500. Please enter an amount equal to or less than the outstanding balance.'
      );
    });

    test('5. Rejected payment creates NO payment record, receipt, or fee credit in database', async () => {
      try {
        await feeUseCases.recordPayment({
          schoolId,
          invoiceId,
          studentId,
          amount: 9000,
          paymentMethod: PaymentMethod.CASH,
          recordedByUserId: 'usr-cashier-001'
        });
      } catch {
        // Expected rejection
      }

      const allPayments = await feeRepo.findPayments({ studentId });
      expect(allPayments.length).toBe(0);

      const allCredits = await feeRepo.findCredits({ studentId });
      expect(allCredits.length).toBe(0);

      const unchangedInv = await feeRepo.findInvoiceById(invoiceId);
      expect(unchangedInv?.balance).toBe(4500);
    });

    test('6. Negative and zero payment amounts are rejected immediately', async () => {
      await expect(
        feeUseCases.recordPayment({
          schoolId,
          invoiceId,
          amount: -500,
          paymentMethod: PaymentMethod.CASH,
          recordedByUserId: 'usr-cashier-001'
        })
      ).rejects.toThrow('Payment amount must be greater than zero.');

      await expect(
        feeUseCases.recordPayment({
          schoolId,
          invoiceId,
          amount: 0,
          paymentMethod: PaymentMethod.CASH,
          recordedByUserId: 'usr-cashier-001'
        })
      ).rejects.toThrow('Payment amount must be greater than zero.');
    });
  });

  // =========================================================================
  // ISSUE 2: APPROVAL CODES FOR FINANCIAL CORRECTIONS AND DELETIONS
  // =========================================================================
  describe('Issue 2: Approval Codes Workflow for Financial Changes', () => {
    let paymentId: string;
    let invoiceId: string;

    beforeEach(async () => {
      invoiceId = 'inv-appr-001';
      const invoice = StudentInvoice.create({
        schoolId,
        studentId: 'std-appr-001',
        feeStructureId: 'fee-struct-001',
        academicYearId,
        termId: term1Id,
        invoiceNumber: 'INV-APPR-001',
        items: [{ id: 'item-2', name: 'Tuition Fee', amount: 10000, isOptional: false, category: 'TUITION' as any }],
        amountBilled: 10000,
        discountAmount: 0,
        amountPayable: 10000,
        amountPaid: 6000,
        balance: 4000,
        status: InvoiceStatus.PARTIALLY_PAID,
        dueDate: '2026-02-28'
      }, invoiceId);
      await feeRepo.saveInvoice(invoice);

      paymentId = 'pay-appr-001';
      const payment = Payment.create({
        schoolId,
        invoiceId,
        studentId: 'std-appr-001',
        receiptNumber: 'REC-2026-0001',
        amount: 6000,
        paymentMethod: PaymentMethod.BANK_DEPOSIT,
        transactionReference: 'DEP-889900',
        paymentDate: '2026-01-20',
        recordedByUserId: 'usr-cashier-001',
        status: PaymentStatus.COMPLETED,
        notes: 'Bank deposit receipt'
      }, paymentId);
      await feeRepo.savePayment(payment);
    });

    test('1. Financial modification request generates 5-minute single-use OTP sent to administrator', async () => {
      const res = await approvalUseCases.requestApproval({
        schoolId,
        actionType: 'PAYMENT_REVERSAL',
        targetRecordType: 'PAYMENT',
        targetRecordId: paymentId,
        reason: 'Wrong bank slip entered by mistake',
        preferredChannel: 'SMS'
      }, {
        userId: 'usr-cashier-001',
        role: UserRole.BURSAR,
        name: 'Cashier One'
      });

      expect(res.success).toBe(true);
      expect(res.requestId).toBeDefined();
      expect(res.channel).toBe('SMS');
      expect(res.destinationMasked).toContain('***');
      expect(mockSms).toHaveBeenCalled();

      // Extract the OTP code dispatched to SMS to test verification
      const smsMessage = mockSms.mock.calls[0][1];
      const codeMatch = smsMessage.match(/\b\d{6}\b/);
      expect(codeMatch).not.toBeNull();
    });

    test('2. Self-approval is strictly prevented (requester cannot approve own request)', async () => {
      const reqRes = await approvalUseCases.requestApproval({
        schoolId,
        actionType: 'PAYMENT_REVERSAL',
        targetRecordType: 'PAYMENT',
        targetRecordId: paymentId,
        reason: 'Duplicate payment record',
        preferredChannel: 'SMS'
      }, {
        userId: 'usr-admin-001',
        role: UserRole.SUPER_ADMIN,
        name: 'Director Grace'
      });

      const smsMessage = mockSms.mock.calls[0][1];
      const code = smsMessage.match(/\b\d{6}\b/)[0];

      await expect(
        approvalUseCases.verifyAndExecute({
          requestId: reqRes.requestId,
          code
        }, {
          userId: 'usr-admin-001', // Same user attempting to approve
          role: UserRole.SUPER_ADMIN,
          name: 'Director Grace'
        })
      ).rejects.toThrow(
        'Users cannot approve their own financial correction or deletion requests. Another authorized administrator must verify and approve.'
      );
    });

    test('3. Invalid OTP code decrements attempts and rejects after 3 failed attempts', async () => {
      const reqRes = await approvalUseCases.requestApproval({
        schoolId,
        actionType: 'PAYMENT_REVERSAL',
        targetRecordType: 'PAYMENT',
        targetRecordId: paymentId,
        reason: 'Bank transfer bounce',
        preferredChannel: 'SMS'
      }, {
        userId: 'usr-cashier-001',
        role: UserRole.BURSAR
      });

      // Attempt 1: wrong code
      await expect(
        approvalUseCases.verifyAndExecute({ requestId: reqRes.requestId, code: '000000' }, { userId: 'usr-admin-001', role: UserRole.SUPER_ADMIN })
      ).rejects.toThrow('Invalid approval code. 2 attempt(s) remaining.');

      // Attempt 2: wrong code
      await expect(
        approvalUseCases.verifyAndExecute({ requestId: reqRes.requestId, code: '111111' }, { userId: 'usr-admin-001', role: UserRole.SUPER_ADMIN })
      ).rejects.toThrow('Invalid approval code. 1 attempt(s) remaining.');

      // Attempt 3: wrong code -> cancelled
      await expect(
        approvalUseCases.verifyAndExecute({ requestId: reqRes.requestId, code: '222222' }, { userId: 'usr-admin-001', role: UserRole.SUPER_ADMIN })
      ).rejects.toThrow('Maximum verification attempts (3) exceeded. This approval request has been cancelled.');

      const req = await approvalRepo.findById(reqRes.requestId);
      expect(req?.status).toBe('REJECTED');
    });

    test('4. Successful verification applies the reversal and preserves audit history', async () => {
      const reqRes = await approvalUseCases.requestApproval({
        schoolId,
        actionType: 'PAYMENT_REVERSAL',
        targetRecordType: 'PAYMENT',
        targetRecordId: paymentId,
        reason: 'Payment entered under wrong student account',
        preferredChannel: 'SMS'
      }, {
        userId: 'usr-cashier-001',
        role: UserRole.BURSAR,
        name: 'Cashier One'
      });

      const smsMessage = mockSms.mock.calls[0][1];
      const validCode = smsMessage.match(/\b\d{6}\b/)[0];

      const execRes = await approvalUseCases.verifyAndExecute({
        requestId: reqRes.requestId,
        code: validCode
      }, {
        userId: 'usr-admin-001',
        role: UserRole.SUPER_ADMIN,
        name: 'Director Grace'
      });

      expect(execRes.success).toBe(true);

      // Payment is marked as REVERSED / FAILED, not physically deleted
      const paymentInDb = await feeRepo.findPaymentById(paymentId);
      expect(paymentInDb).not.toBeNull();
      expect(paymentInDb?.status).toBe(PaymentStatus.FAILED);
      expect(paymentInDb?.notes).toContain('REVERSED via Approval');

      // Invoice balance is restored to 10,000
      const invoiceInDb = await feeRepo.findInvoiceById(invoiceId);
      expect(invoiceInDb?.balance).toBe(10000);
      expect(invoiceInDb?.amountPaid).toBe(0);

      // Duplicate execution of the same approval request is rejected
      await expect(
        approvalUseCases.verifyAndExecute({
          requestId: reqRes.requestId,
          code: validCode
        }, {
          userId: 'usr-admin-001',
          role: UserRole.SUPER_ADMIN
        })
      ).rejects.toThrow('This financial approval request has already been executed.');
    });
  });

  // =========================================================================
  // ISSUE 3: DIGITAL SALARY ACKNOWLEDGEMENT BY TEACHERS
  // =========================================================================
  describe('Issue 3: Digital Salary Acknowledgement by Teachers', () => {
    let teacherUserId: string;
    let teacherId: string;
    let otherTeacherUserId: string;
    let otherTeacherId: string;
    let paidPayrollId: string;
    let unpaidPayrollId: string;

    beforeEach(async () => {
      teacherUserId = 'usr-teacher-001';
      teacherId = 'tch-001';
      await userRepo.save(User.create({
        schoolId,
        email: 'teacher1@graceseeds.ac.ke',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Mwangi',
        role: UserRole.TEACHER,
        phone: '+254711223344',
        status: UserStatus.ACTIVE
      }, teacherUserId));

      const teacher = Teacher.create({
        userId: teacherUserId,
        employeeNumber: 'EMP-001',
        tscNumber: 'TSC-12345',
        specialization: ['Mathematics'],
        assignedClassStreamIds: [],
        qualification: 'B.Ed Science'
      }, teacherId);
      await teacherRepo.save(teacher);

      otherTeacherUserId = 'usr-teacher-002';
      otherTeacherId = 'tch-002';
      await userRepo.save(User.create({
        schoolId,
        email: 'teacher2@graceseeds.ac.ke',
        passwordHash: 'hash',
        firstName: 'Sarah',
        lastName: 'Otieno',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE
      }, otherTeacherUserId));

      const otherTeacher = Teacher.create({
        userId: otherTeacherUserId,
        employeeNumber: 'EMP-002',
        tscNumber: 'TSC-67890',
        specialization: ['English'],
        assignedClassStreamIds: []
      }, otherTeacherId);
      await teacherRepo.save(otherTeacher);

      // Create a PAID payroll record for John Mwangi
      paidPayrollId = 'pr-paid-001';
      const paidPayroll = PayrollRecord.create({
        schoolId,
        teacherId,
        teacherName: 'John Mwangi',
        month: '2026-01',
        basicSalary: 45000,
        houseAllowance: 10000,
        commuterAllowance: 4000,
        responsibilityAllowance: 0,
        grossSalary: 59000,
        nssf: 2160,
        shif: 1623,
        housingLevy: 885,
        paye: 8200,
        otherDeductions: 0,
        totalDeductions: 12868,
        netSalary: 46132,
        amountPaid: 46132,
        balance: 0,
        status: 'PAID',
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'SAL-KCB-2026-01',
        paidAt: new Date('2026-01-30')
      }, paidPayrollId);
      await payrollRepo.savePayroll(paidPayroll);

      // Create an UNPAID / DRAFT payroll record for John Mwangi
      unpaidPayrollId = 'pr-unpaid-002';
      const unpaidPayroll = PayrollRecord.create({
        schoolId,
        teacherId,
        teacherName: 'John Mwangi',
        month: '2026-02',
        basicSalary: 45000,
        houseAllowance: 10000,
        commuterAllowance: 4000,
        responsibilityAllowance: 0,
        grossSalary: 59000,
        nssf: 2160,
        shif: 1623,
        housingLevy: 885,
        paye: 8200,
        otherDeductions: 0,
        totalDeductions: 12868,
        netSalary: 46132,
        amountPaid: 0,
        balance: 46132,
        status: 'APPROVED'
      }, unpaidPayrollId);
      await payrollRepo.savePayroll(unpaidPayroll);
    });

    test('1. Teachers can see only their own salary records', async () => {
      const records = await payrollUseCases.getMySalaryRecords({
        userId: teacherUserId,
        role: UserRole.TEACHER
      });

      expect(records.length).toBe(2);
      expect(records.every(r => r.teacherId === teacherId)).toBe(true);

      const otherRecords = await payrollUseCases.getMySalaryRecords({
        userId: otherTeacherUserId,
        role: UserRole.TEACHER
      });
      expect(otherRecords.length).toBe(0);
    });

    test('2. Unpaid salary records cannot be acknowledged', async () => {
      await expect(
        payrollUseCases.acknowledgeSalaryReceipt(unpaidPayrollId, {
          userId: teacherUserId,
          role: UserRole.TEACHER
        }, {
          statement: 'I confirm receipt',
          signature: 'John Mwangi'
        })
      ).rejects.toThrow('Cannot acknowledge salary for 2026-02: Payment has not been recorded by the school');
    });

    test('3. Cross-teacher acknowledgement is strictly blocked (cannot acknowledge another teacher’s salary)', async () => {
      await expect(
        payrollUseCases.acknowledgeSalaryReceipt(paidPayrollId, {
          userId: otherTeacherUserId, // Sarah attempting to acknowledge John's salary
          role: UserRole.TEACHER
        }, {
          signature: 'Sarah Otieno'
        })
      ).rejects.toThrow('Access denied: You are not authorized to view or acknowledge salary records belonging to another staff member.');
    });

    test('4. Valid digital acknowledgement records timestamp, statement, method, and signature', async () => {
      const res = await payrollUseCases.acknowledgeSalaryReceipt(paidPayrollId, {
        userId: teacherUserId,
        role: UserRole.TEACHER
      }, {
        statement: 'I, John Mwangi, hereby acknowledge receipt of KES 46,132 for January 2026.',
        method: 'PORTAL_AUTH',
        signature: 'John Mwangi',
        ipAddress: '192.168.1.50'
      });

      expect(res.success).toBe(true);
      expect(res.acknowledgement.acknowledgementStatus).toBe('ACKNOWLEDGED');
      expect(res.acknowledgement.acknowledgedByUserId).toBe(teacherUserId);
      expect(res.acknowledgement.statement).toContain('John Mwangi');

      // Verify persistence in repository
      const updated = await payrollRepo.findPayrollById(paidPayrollId);
      expect(updated?.acknowledgementStatus).toBe('ACKNOWLEDGED');
      expect(updated?.acknowledgedAt).toBeDefined();
      expect(updated?.acknowledgementSignature).toBe('John Mwangi');
    });

    test('5. Duplicate salary acknowledgement is prevented', async () => {
      // First acknowledgement succeeds
      await payrollUseCases.acknowledgeSalaryReceipt(paidPayrollId, {
        userId: teacherUserId,
        role: UserRole.TEACHER
      }, {
        signature: 'John Mwangi'
      });

      // Second acknowledgement attempt fails with ConflictError
      await expect(
        payrollUseCases.acknowledgeSalaryReceipt(paidPayrollId, {
          userId: teacherUserId,
          role: UserRole.TEACHER
        }, {
          signature: 'John Mwangi'
        })
      ).rejects.toThrow('already been acknowledged');
    });
  });

  // =========================================================================
  // ISSUE 4: DETERMINISTIC ASSESSMENT RANKINGS (STANDARD COMPETITION 1224)
  // =========================================================================
  describe('Issue 4: Summative Assessment Marks and Deterministic Rankings', () => {
    let classId: string;
    let streamId: string;

    beforeEach(async () => {
      classId = 'cls-grade1';
      streamId = 'str-grade1-red';
      const classroom = ClassRoom.create({
        schoolId,
        name: 'Grade 1',
        gradeLevel: CBCGradeLevel.GRADE_1,
        educationLevel: EducationLevel.LOWER_PRIMARY
      }, classId);
      await academicRepo.saveClass(classroom);

      const stream = Stream.create({
        classRoomId: classId,
        name: 'Red',
        capacity: 40
      }, streamId);
      await academicRepo.saveStream(stream);

      // Create Learning Area
      const math = { id: 'la-math', name: 'Mathematics', gradeLevel: CBCGradeLevel.GRADE_1, schoolId };
      const eng = { id: 'la-eng', name: 'English Language', gradeLevel: CBCGradeLevel.GRADE_1, schoolId };
      await academicRepo.saveLearningArea(math as any);
      await academicRepo.saveLearningArea(eng as any);

      // Seed 4 learners
      // Student 1 & 2 will have IDENTICAL scores to verify tied ranking policy
      const students = [
        { id: 'st-01', admNo: 'ADM-001', name: 'Alice A', math: 80, eng: 80 }, // Total: 160
        { id: 'st-02', admNo: 'ADM-002', name: 'Bob B',   math: 80, eng: 80 }, // Total: 160 (Tied for rank 1)
        { id: 'st-03', admNo: 'ADM-003', name: 'Charlie', math: 70, eng: 70 }, // Total: 140 (Rank 3)
        { id: 'st-04', admNo: 'ADM-004', name: 'David D', math: 60, eng: 60 }, // Total: 120 (Rank 4)
      ];

      for (const st of students) {
        const student = Student.create({
          admissionNumber: st.admNo,
          firstName: st.name,
          lastName: 'Learner',
          dateOfBirth: '2018-01-01',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_1,
          classroomId: classId,
          streamId,
          schoolId,
          academicYearId,
          guardianIds: [],
          status: StudentStatus.ACTIVE
        }, st.id);
        await studentRepo.save(student);

        // Save summative assessments
        await cbcRepo.saveSummative({
          id: `sum-math-${st.id}`,
          studentId: st.id,
          learningAreaId: 'la-math',
          termId: term1Id,
          academicYearId,
          overallPerformanceLevel: st.math >= 80 ? 'EXCEEDING_EXPECTATIONS' : 'MEETING_EXPECTATIONS',
          strandScores: [{ strandId: 's1', rawScore: st.math, score: st.math, maxScore: 100 }],
          teacherRemarks: 'Good'
        } as any);

        await cbcRepo.saveSummative({
          id: `sum-eng-${st.id}`,
          studentId: st.id,
          learningAreaId: 'la-eng',
          termId: term1Id,
          academicYearId,
          overallPerformanceLevel: st.eng >= 80 ? 'EXCEEDING_EXPECTATIONS' : 'MEETING_EXPECTATIONS',
          strandScores: [{ strandId: 's2', rawScore: st.eng, score: st.eng, maxScore: 100 }],
          teacherRemarks: 'Good'
        } as any);
      }
    });

    test('1. Standard competition ranking assigns equal ranks to tied learners ("1, 1, 3, 4")', async () => {
      const broadsheet = await broadsheetUseCases.getStreamBroadsheet({
        streamId,
        termId: term1Id,
        academicYearId
      });

      expect(broadsheet.rows.length).toBe(4);

      // Student 1 & Student 2 tied with totalScore 160
      expect(broadsheet.rows[0].totalScore).toBe(160);
      expect(broadsheet.rows[1].totalScore).toBe(160);
      expect(broadsheet.rows[0].rank).toBe(1);
      expect(broadsheet.rows[1].rank).toBe(1);

      // Next student (Charlie) must receive rank 3 (reflecting 2 students ahead)
      expect(broadsheet.rows[2].totalScore).toBe(140);
      expect(broadsheet.rows[2].rank).toBe(3);

      // Fourth student (David) receives rank 4
      expect(broadsheet.rows[3].totalScore).toBe(120);
      expect(broadsheet.rows[3].rank).toBe(4);
    });

    test('2. Rankings remain 100% deterministic and reproducible across multiple runs', async () => {
      const run1 = await broadsheetUseCases.getStreamBroadsheet({ streamId, termId: term1Id, academicYearId });
      const run2 = await broadsheetUseCases.getStreamBroadsheet({ streamId, termId: term1Id, academicYearId });
      const run3 = await broadsheetUseCases.getStreamBroadsheet({ streamId, termId: term1Id, academicYearId });

      expect(run1.rows.map(r => ({ id: r.studentId, rank: r.rank }))).toEqual(
        run2.rows.map(r => ({ id: r.studentId, rank: r.rank }))
      );
      expect(run2.rows.map(r => ({ id: r.studentId, rank: r.rank }))).toEqual(
        run3.rows.map(r => ({ id: r.studentId, rank: r.rank }))
      );
    });
  });

  // =========================================================================
  // ISSUE 5: TEACHER CLASS ASSIGNMENTS PERSISTENCE
  // =========================================================================
  describe('Issue 5: Teacher Class and Stream Assignments Persistence', () => {
    let teacherId: string;
    let otherTeacherId: string;
    let classId: string;
    let streamAId: string;
    let streamBId: string;

    beforeEach(async () => {
      classId = 'cls-grade2';
      streamAId = 'str-grade2-blue';
      streamBId = 'str-grade2-green';

      const classroom = ClassRoom.create({ schoolId, name: 'Grade 2', gradeLevel: CBCGradeLevel.GRADE_2, educationLevel: EducationLevel.LOWER_PRIMARY }, classId);
      await academicRepo.saveClass(classroom);

      const streamA = Stream.create({ classRoomId: classId, name: 'Blue', capacity: 30 }, streamAId);
      const streamB = Stream.create({ classRoomId: classId, name: 'Green', capacity: 30 }, streamBId);
      await academicRepo.saveStream(streamA);
      await academicRepo.saveStream(streamB);

      teacherId = 'tch-assign-01';
      otherTeacherId = 'tch-assign-02';

      await userRepo.save(User.create({ schoolId, email: 't1@school.org', passwordHash: 'hash', firstName: 'Teacher', lastName: 'One', role: UserRole.TEACHER, status: UserStatus.ACTIVE }, 'usr-t1'));
      await userRepo.save(User.create({ schoolId, email: 't2@school.org', passwordHash: 'hash', firstName: 'Teacher', lastName: 'Two', role: UserRole.TEACHER, status: UserStatus.ACTIVE }, 'usr-t2'));

      await teacherRepo.save(Teacher.create({ userId: 'usr-t1', employeeNumber: 'T001', specialization: [], assignedClassStreamIds: [] }, teacherId));
      await teacherRepo.save(Teacher.create({ userId: 'usr-t2', employeeNumber: 'T002', specialization: [], assignedClassStreamIds: [] }, otherTeacherId));
    });

    test('1. Assigning teacher to stream persists across all three persistence layers', async () => {
      await teacherUseCases.assignStream({
        teacherId,
        streamId: streamAId
      });

      // Layer 1: teachers.assigned_class_stream_ids
      const updatedTeacher = await teacherRepo.findById(teacherId);
      expect(updatedTeacher?.assignedClassStreamIds).toContain(streamAId);

      // Layer 2: streams.class_teacher_id
      const updatedStream = await academicRepo.findStreamById(streamAId);
      expect(updatedStream?.classTeacherId).toBe(teacherId);

      // Layer 3: class_teacher_assignments table
      const activeAssignments = await academicRepo.findClassTeacherAssignments({
        schoolId,
        classRoomId: classId,
        streamId: streamAId,
        isActive: true
      });
      expect(activeAssignments.length).toBe(1);
      expect(activeAssignments[0].teacherId).toBe(teacherId);
    });

    test('2. Updating one stream assignment does NOT clear or affect other teachers on different streams', async () => {
      // Assign Teacher 1 to Stream Blue
      await teacherUseCases.assignStream({ teacherId, streamId: streamAId });

      // Assign Teacher 2 to Stream Green
      await teacherUseCases.assignStream({ teacherId: otherTeacherId, streamId: streamBId });

      // Verify Teacher 1 on Stream Blue is still active and intact
      const streamAAssignments = await academicRepo.findClassTeacherAssignments({
        schoolId,
        classRoomId: classId,
        streamId: streamAId,
        isActive: true
      });
      expect(streamAAssignments.length).toBe(1);
      expect(streamAAssignments[0].teacherId).toBe(teacherId);

      // Verify Teacher 2 on Stream Green is active and intact
      const streamBAssignments = await academicRepo.findClassTeacherAssignments({
        schoolId,
        classRoomId: classId,
        streamId: streamBId,
        isActive: true
      });
      expect(streamBAssignments.length).toBe(1);
      expect(streamBAssignments[0].teacherId).toBe(otherTeacherId);
    });
  });
});
