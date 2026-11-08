import { ParentConsentRequest } from '../../src/core/domain/consent/ParentConsentRequest';
import { ParentConsentResponse } from '../../src/core/domain/consent/ParentConsentResponse';
import { PayrollRecord } from '../../src/core/domain/payroll/PayrollRecord';
import { Student, StudentGender, StudentStatus, CBCGradeLevel } from '../../src/core/domain/user/Student';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { InMemoryParentConsentRepository } from '../../src/infrastructure/database/in-memory/InMemoryParentConsentRepository';
import { InMemoryPayrollRepository } from '../../src/infrastructure/database/in-memory/InMemoryPayrollRepository';
import {
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryTeacherRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemorySystemLogRepository } from '../../src/infrastructure/database/in-memory/InMemorySystemLogRepository';
import { InMemoryTeacherClockInRepository } from '../../src/infrastructure/database/in-memory/InMemoryTeacherClockInRepository';
import { ParentConsentUseCases } from '../../src/application/consent/ParentConsentUseCases';
import { PayrollUseCases } from '../../src/application/payroll/PayrollUseCases';
import { ForbiddenError, ValidationError, ConflictError } from '../../src/core/domain/shared/Errors';
import {
  ALL_NAV_MODULES,
  getFilteredNavModules,
  isTabPermitted
} from '../../Frontend/smartshule/src/utils/rbac';

describe('SmartShule Parental Consent & Teacher Salary Payment Acknowledgement Suite', () => {
  const schoolId = 'school-001';

  // Repositories
  let parentConsentRepo: InMemoryParentConsentRepository;
  let payrollRepo: InMemoryPayrollRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let teacherRepo: InMemoryTeacherRepository;
  let systemLogRepo: InMemorySystemLogRepository;
  let clockInRepo: InMemoryTeacherClockInRepository;

  // Use Cases
  let consentUseCases: ParentConsentUseCases;
  let payrollUseCases: PayrollUseCases;

  // Test Entities
  let parentUser: User;
  let parentGuardian: Guardian;
  let child1: Student;
  let child2: Student;
  let unrelatedStudent: Student;
  let teacherUser1: User;
  let teacher1: Teacher;
  let teacherUser2: User;
  let teacher2: Teacher;

  beforeEach(async () => {
    parentConsentRepo = new InMemoryParentConsentRepository();
    payrollRepo = new InMemoryPayrollRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    teacherRepo = new InMemoryTeacherRepository();
    systemLogRepo = new InMemorySystemLogRepository();
    clockInRepo = new InMemoryTeacherClockInRepository();

    consentUseCases = new ParentConsentUseCases(
      parentConsentRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      systemLogRepo
    );

    payrollUseCases = new PayrollUseCases(
      payrollRepo,
      teacherRepo,
      userRepo,
      clockInRepo,
      undefined, // feeRepository
      systemLogRepo
    );

    // 1. Setup Parent & 2 Children
    parentUser = User.create(
      {
        email: 'parent.mary@gmail.com',
        firstName: 'Mary',
        lastName: 'Wanjiku',
        phone: '+254711223344',
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
        schoolId,
        passwordHash: 'hashed_pw'
      },
      'usr-parent-001'
    );
    await userRepo.save(parentUser);

    parentGuardian = Guardian.create(
      {
        userId: parentUser.id,
        nationalId: '24567890',
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '+254711223344',
        studentIds: ['student-child-1', 'student-child-2']
      },
      'grd-001'
    );
    await guardianRepo.save(parentGuardian);

    child1 = Student.create(
      {
        firstName: 'Brian',
        lastName: 'Kamau',
        admissionNumber: '1001',
        dateOfBirth: '2015-05-10',
        academicYearId: 'year-2026',
        gradeLevel: CBCGradeLevel.GRADE_4,
        gender: StudentGender.MALE,
        guardianIds: [parentGuardian.id, parentUser.id],
        schoolId,
        status: StudentStatus.ACTIVE
      },
      'student-child-1'
    );
    await studentRepo.save(child1);

    child2 = Student.create(
      {
        firstName: 'Faith',
        lastName: 'Kamau',
        admissionNumber: '1002',
        dateOfBirth: '2017-08-15',
        academicYearId: 'year-2026',
        gradeLevel: CBCGradeLevel.GRADE_2,
        gender: StudentGender.FEMALE,
        guardianIds: [parentGuardian.id, parentUser.id],
        schoolId,
        status: StudentStatus.ACTIVE
      },
      'student-child-2'
    );
    await studentRepo.save(child2);

    // Unrelated learner
    unrelatedStudent = Student.create(
      {
        firstName: 'Kevin',
        lastName: 'Otieno',
        admissionNumber: '1003',
        dateOfBirth: '2015-02-14',
        academicYearId: 'year-2026',
        gradeLevel: CBCGradeLevel.GRADE_4,
        gender: StudentGender.MALE,
        guardianIds: ['grd-other-parent'],
        schoolId,
        status: StudentStatus.ACTIVE
      },
      'student-unrelated'
    );
    await studentRepo.save(unrelatedStudent);

    // 2. Setup Teachers
    teacherUser1 = User.create(
      {
        email: 'teacher.ochieng@smartshule.ac.ke',
        firstName: 'David',
        lastName: 'Ochieng',
        phone: '+254722334455',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        schoolId,
        passwordHash: 'hashed_pw'
      },
      'usr-teacher-001'
    );
    await userRepo.save(teacherUser1);

    teacher1 = Teacher.create(
      {
        userId: teacherUser1.id,
        employeeNumber: 'EMP-001',
        specialization: ['Mathematics'],
        assignedClassStreamIds: []
      },
      'tch-001'
    );
    await teacherRepo.save(teacher1);

    teacherUser2 = User.create(
      {
        email: 'teacher.njeri@smartshule.ac.ke',
        firstName: 'Grace',
        lastName: 'Njeri',
        phone: '+254733445566',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        schoolId,
        passwordHash: 'hashed_pw'
      },
      'usr-teacher-002'
    );
    await userRepo.save(teacherUser2);

    teacher2 = Teacher.create(
      {
        userId: teacherUser2.id,
        employeeNumber: 'EMP-002',
        specialization: ['Science'],
        assignedClassStreamIds: []
      },
      'tch-002'
    );
    await teacherRepo.save(teacher2);
  });

  // ========================================================
  // FEATURE 1: PARENT CONSENT PAGE
  // ========================================================
  describe('1. Parent Consent Workflow & Child Protection Security', () => {
    test('1a. Parent with multiple children sees consent requests for each child individually', async () => {
      const data = await consentUseCases.getConsentsForParent(parentUser.id, schoolId);

      expect(data.hasLinkedChildren).toBe(true);
      expect(data.children.length).toBe(2);
      expect(data.children.map(c => c.id)).toContain('student-child-1');
      expect(data.children.map(c => c.id)).toContain('student-child-2');

      // Default seeded whole-school requests should appear for both children
      const child1Consents = data.consents.filter(c => c.student.id === 'student-child-1');
      const child2Consents = data.consents.filter(c => c.student.id === 'student-child-2');

      expect(child1Consents.length).toBeGreaterThanOrEqual(1);
      expect(child2Consents.length).toBeGreaterThanOrEqual(1);
      expect(child1Consents[0].responseStatus).toBe('PENDING');
      expect(child2Consents[0].responseStatus).toBe('PENDING');
    });

    test('1b. Security Invariant: Parent attempting to sign for an unrelated learner is rejected with ForbiddenError', async () => {
      const allRequests = await parentConsentRepo.findRequestsBySchool(schoolId);
      const reqId = allRequests[0].id;

      await expect(
        consentUseCases.submitConsentResponse(parentUser.id, {
          consentRequestId: reqId,
          studentId: unrelatedStudent.id, // NOT linked to Mary Wanjiku!
          decision: 'CONSENTED',
          parentName: 'Mary Wanjiku'
        })
      ).rejects.toThrow(ForbiddenError);
    });

    test('1c. Parent submits valid consent with digital signature, generating verifiable hash and audit entry', async () => {
      const allRequests = await parentConsentRepo.findRequestsBySchool(schoolId);
      const reqId = allRequests[0].id;

      const submitResult = await consentUseCases.submitConsentResponse(parentUser.id, {
        consentRequestId: reqId,
        studentId: child1.id,
        decision: 'CONSENTED',
        notes: 'Child has mild asthma, inhaler in school bag.',
        parentName: 'Mary Wanjiku',
        parentRelationship: 'Mother',
        parentNationalId: '24567890',
        signatureType: 'DRAWN',
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
      });

      expect(submitResult.success).toBe(true);
      expect(submitResult.response.decision).toBe('CONSENTED');
      expect(submitResult.response.signatureHash).toBeDefined();
      expect(submitResult.response.studentId).toBe(child1.id);

      // Verify querying again shows child1 CONSENTED, while child2 remains PENDING
      const updated = await consentUseCases.getConsentsForParent(parentUser.id, schoolId);
      const child1Req = updated.consents.find(
        c => c.student.id === child1.id && c.consentRequestId === reqId
      );
      const child2Req = updated.consents.find(
        c => c.student.id === child2.id && c.consentRequestId === reqId
      );

      expect(child1Req?.responseStatus).toBe('CONSENTED');
      expect(child1Req?.latestResponse?.notes).toBe('Child has mild asthma, inhaler in school bag.');
      expect(child2Req?.responseStatus).toBe('PENDING');

      // Verify SystemLog audit record created
      const logs = await systemLogRepo.find();
      const consentLog = logs.find(l => l.action === 'PARENT_CONSENT_SUBMITTED');
      expect(consentLog).toBeDefined();
      expect(consentLog?.actorUserId).toBe(parentUser.id);
    });

    test('1d. Admin publishes consent for a specific grade level; only eligible learners receive it', async () => {
      // Create request targeted only to Grade 4
      const created = await consentUseCases.createConsentRequest(
        { userId: 'usr-admin', role: UserRole.ADMIN, schoolId },
        {
          title: 'Grade 4 Science Safari Excursion',
          category: 'TRIP',
          termsAndConditions: 'Excursion terms for Grade 4 only.',
          targetType: 'GRADE',
          targetClassIds: ['Grade 4'],
          isMandatory: true
        }
      );

      expect(created.id).toBeDefined();

      const parentData = await consentUseCases.getConsentsForParent(parentUser.id, schoolId);

      // Child 1 (Grade 4) should see the request
      const child1Match = parentData.consents.find(c => c.consentRequestId === created.id && c.student.id === child1.id);
      expect(child1Match).toBeDefined();

      // Child 2 (Grade 2) should NOT see the request
      const child2Match = parentData.consents.find(c => c.consentRequestId === created.id && c.student.id === child2.id);
      expect(child2Match).toBeUndefined();
    });

    test('1e. Consent versioning: updating terms bumps version and flags existing signatures as outdated without mutating history', async () => {
      const allRequests = await parentConsentRepo.findRequestsBySchool(schoolId);
      const req = allRequests[0];

      // Mary signs v1
      await consentUseCases.submitConsentResponse(parentUser.id, {
        consentRequestId: req.id,
        studentId: child1.id,
        decision: 'CONSENTED',
        parentName: 'Mary Wanjiku'
      });

      // School administrator alters consent terms
      await consentUseCases.updateConsentRequest(
        req.id,
        { userId: 'usr-admin', role: UserRole.ADMIN, schoolId },
        {
          title: req.title,
          termsAndConditions: 'NEW TERMS: Added mandatory parental transport chaperone requirement and updated indemnity clause.'
        }
      );

      // Parent queries consents: prior signed response remains v1, but status requires resubmission
      const parentData = await consentUseCases.getConsentsForParent(parentUser.id, schoolId);
      const targetConsent = parentData.consents.find(
        c => c.consentRequestId === req.id && c.student.id === child1.id
      );

      expect(targetConsent?.version).toBe(2);
      expect(targetConsent?.latestResponse?.consentVersion).toBe(1); // Old signature preserved at v1!
      expect(targetConsent?.responseStatus).toBe('OUTDATED_VERSION');
      expect(targetConsent?.requiresResubmission).toBe(true);
    });

    test('1f. Admin consent overview and detailed responses roster calculate correct counts', async () => {
      const allRequests = await parentConsentRepo.findRequestsBySchool(schoolId);
      const reqId = allRequests[0].id;

      // Submit consent for child 1
      await consentUseCases.submitConsentResponse(parentUser.id, {
        consentRequestId: reqId,
        studentId: child1.id,
        decision: 'CONSENTED',
        parentName: 'Mary Wanjiku'
      });

      // Submit decline for child 2
      await consentUseCases.submitConsentResponse(parentUser.id, {
        consentRequestId: reqId,
        studentId: child2.id,
        decision: 'DECLINED',
        parentName: 'Mary Wanjiku',
        notes: 'Family travel on excursion date.'
      });

      const rosterResult = await consentUseCases.getConsentDetailedResponses(reqId, schoolId);
      expect(rosterResult.summary.consented).toBe(1);
      expect(rosterResult.summary.declined).toBe(1);

      const child1Row = rosterResult.roster.find(r => r.studentId === child1.id);
      expect(child1Row?.status).toBe('CONSENTED');

      const child2Row = rosterResult.roster.find(r => r.studentId === child2.id);
      expect(child2Row?.status).toBe('DECLINED');
      expect(child2Row?.notes).toBe('Family travel on excursion date.');
    });
  });

  // ========================================================
  // FEATURE 2: TEACHER SALARY PAYMENT ACKNOWLEDGEMENT
  // ========================================================
  describe('2. Teacher Salary Payment Acknowledgement & Dispute Pipeline', () => {
    let paidPayroll1: PayrollRecord;
    let paidPayroll2: PayrollRecord;
    let draftPayroll: PayrollRecord;

    beforeEach(async () => {
      // Disbursed salary record for Teacher 1
      paidPayroll1 = PayrollRecord.create(
        {
          schoolId,
          teacherId: teacher1.id,
          teacherName: 'David Ochieng',
          month: '2026-10',
          basicSalary: 45000,
          houseAllowance: 8000,
          commuterAllowance: 4000,
          responsibilityAllowance: 3000,
          grossSalary: 60000,
          nssf: 2160,
          shif: 1650,
          housingLevy: 900,
          paye: 8500,
          otherDeductions: 0,
          totalDeductions: 13210,
          netSalary: 46790,
          status: 'PAID',
          amountPaid: 46790,
          balance: 0,
          paymentMethod: 'MPESA',
          paymentReference: 'QE7492ABCD',
          paidAt: new Date('2026-10-28')
        },
        'pr-001'
      );
      await payrollRepo.savePayroll(paidPayroll1);

      // Disbursed salary record for Teacher 2
      paidPayroll2 = PayrollRecord.create(
        {
          schoolId,
          teacherId: teacher2.id,
          teacherName: 'Grace Njeri',
          month: '2026-10',
          basicSalary: 50000,
          houseAllowance: 9000,
          commuterAllowance: 4000,
          responsibilityAllowance: 2000,
          grossSalary: 65000,
          nssf: 2160,
          shif: 1787,
          housingLevy: 975,
          paye: 9578,
          otherDeductions: 0,
          totalDeductions: 14500,
          netSalary: 50500,
          status: 'PAID',
          amountPaid: 50500,
          balance: 0,
          paymentMethod: 'BANK_TRANSFER',
          paymentReference: 'EFT-883920',
          paidAt: new Date('2026-10-28')
        },
        'pr-002'
      );
      await payrollRepo.savePayroll(paidPayroll2);

      // Unpaid draft record for Teacher 1
      draftPayroll = PayrollRecord.create(
        {
          schoolId,
          teacherId: teacher1.id,
          teacherName: 'David Ochieng',
          month: '2026-11',
          basicSalary: 45000,
          houseAllowance: 8000,
          commuterAllowance: 4000,
          responsibilityAllowance: 3000,
          grossSalary: 60000,
          nssf: 2160,
          shif: 1650,
          housingLevy: 900,
          paye: 8500,
          otherDeductions: 0,
          totalDeductions: 13210,
          netSalary: 46790,
          status: 'DRAFT',
          amountPaid: 0,
          balance: 46790
        },
        'pr-003'
      );
      await payrollRepo.savePayroll(draftPayroll);
    });

    test('2a. Teacher can only view their own salary records, not records of other teachers', async () => {
      const records1 = await payrollUseCases.getMySalaryRecords({
        userId: teacherUser1.id,
        role: UserRole.TEACHER,
        schoolId
      });

      expect(records1.length).toBe(2); // pr-001 and pr-003
      expect(records1.every(r => r.teacherId === teacher1.id)).toBe(true);
      expect(records1.some(r => r.id === 'pr-002')).toBe(false); // Teacher 2's record NOT visible!

      const records2 = await payrollUseCases.getMySalaryRecords({
        userId: teacherUser2.id,
        role: UserRole.TEACHER,
        schoolId
      });

      expect(records2.length).toBe(1);
      expect(records2[0].id).toBe('pr-002');
    });

    test('2b. Teacher acknowledges paid salary record with digital signature and statement', async () => {
      const ackResult = await payrollUseCases.acknowledgeSalaryReceipt(
        paidPayroll1.id,
        { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId },
        {
          statement: 'I confirm receipt of KES 46,790 via M-Pesa for October 2026.',
          method: 'DIGITAL_SIGNATURE',
          signature: 'David Ochieng',
          ipAddress: '192.168.1.50'
        }
      );

      expect(ackResult.success).toBe(true);
      expect(ackResult.acknowledgement.acknowledgementStatus).toBe('ACKNOWLEDGED');
      expect(ackResult.acknowledgement.amountAcknowledged).toBe(46790);

      const refreshed = await payrollRepo.findPayrollById(paidPayroll1.id);
      expect(refreshed?.acknowledgementStatus).toBe('ACKNOWLEDGED');
      expect(refreshed?.acknowledgedByUserId).toBe(teacherUser1.id);
      expect(refreshed?.acknowledgementStatement).toBe('I confirm receipt of KES 46,790 via M-Pesa for October 2026.');

      // Check SystemLog audit
      const logs = await systemLogRepo.find();
      const ackLog = logs.find(l => l.action === 'SALARY_RECEIPT_ACKNOWLEDGED');
      expect(ackLog).toBeDefined();
    });

    test('2c. Teacher reports discrepancy/disputes payment; status becomes UNDER_REVIEW with reason visible to admin', async () => {
      const disputeResult = await payrollUseCases.disputeSalaryPayment(
        paidPayroll1.id,
        { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId },
        {
          reason: 'M-Pesa payment reference QE7492ABCD received was for KES 40,000, not stated KES 46,790. Difference of KES 6,790 missing.'
        }
      );

      expect(disputeResult.success).toBe(true);
      expect(disputeResult.payroll.acknowledgementStatus).toBe('UNDER_REVIEW');
      expect(disputeResult.payroll.disputeReason).toContain('Difference of KES 6,790 missing');

      const refreshed = await payrollRepo.findPayrollById(paidPayroll1.id);
      expect(refreshed?.acknowledgementStatus).toBe('UNDER_REVIEW');
      expect(refreshed?.disputedAt).toBeDefined();
      expect(refreshed?.disputeReason).toContain('Difference of KES 6,790 missing');

      // Check SystemLog audit
      const logs = await systemLogRepo.find();
      const disputeLog = logs.find(l => l.action === 'SALARY_PAYMENT_DISPUTED');
      expect(disputeLog).toBeDefined();
    });

    test('2d. Unpaid or draft payroll record cannot be acknowledged as completed payment', async () => {
      await expect(
        payrollUseCases.acknowledgeSalaryReceipt(
          draftPayroll.id, // Status is DRAFT!
          { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId },
          { statement: 'Premature acknowledgement' }
        )
      ).rejects.toThrow(ValidationError);
    });

    test('2e. Duplicate acknowledgement prevention: acknowledged record cannot be acknowledged again', async () => {
      // First acknowledgement
      await payrollUseCases.acknowledgeSalaryReceipt(
        paidPayroll1.id,
        { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId },
        { statement: 'First acknowledgement' }
      );

      // Attempt second acknowledgement
      await expect(
        payrollUseCases.acknowledgeSalaryReceipt(
          paidPayroll1.id,
          { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId },
          { statement: 'Second duplicate acknowledgement' }
        )
      ).rejects.toThrow(ConflictError);
    });

    test('2f. Security Invariant: Teacher cannot acknowledge or dispute another teacher salary record', async () => {
      // Teacher 1 tries to acknowledge Teacher 2's record
      await expect(
        payrollUseCases.acknowledgeSalaryReceipt(
          paidPayroll2.id,
          { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId },
          { statement: 'Unauthorized acknowledgement' }
        )
      ).rejects.toThrow(ForbiddenError);

      // Teacher 1 tries to dispute Teacher 2's record
      await expect(
        payrollUseCases.disputeSalaryPayment(
          paidPayroll2.id,
          { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId },
          { reason: 'Unauthorized dispute' }
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ========================================================
  // FEATURE 3: RBAC NAVIGATION & TAB PERMISSIONS
  // ========================================================
  describe('3. Sidebar Navigation & RBAC Permissions', () => {
    test('3a. Parent Portal sidebar includes dedicated Parent Consent page', () => {
      const parentModules = getFilteredNavModules(UserRole.PARENT as any);
      const allItemIds = parentModules.flatMap(m => m.items.map(it => it.id));

      expect(allItemIds).toContain('parent-consent');
      expect(isTabPermitted('parent-consent', UserRole.PARENT as any)).toBe(true);

      // Parent CANNOT access admin consent records or staff payroll
      expect(isTabPermitted('consent-management', UserRole.PARENT as any)).toBe(false);
      expect(isTabPermitted('payroll', UserRole.PARENT as any)).toBe(false);
    });

    test('3b. Teacher Portal sidebar includes dedicated Salary Payment Acknowledgement page', () => {
      const teacherModules = getFilteredNavModules(UserRole.TEACHER as any);
      const allItemIds = teacherModules.flatMap(m => m.items.map(it => it.id));

      expect(allItemIds).toContain('salary-acknowledgement');
      expect(isTabPermitted('salary-acknowledgement', UserRole.TEACHER as any)).toBe(true);

      // Teacher CANNOT access admin payroll management or admin consent management
      expect(isTabPermitted('payroll', UserRole.TEACHER as any)).toBe(false);
      expect(isTabPermitted('consent-management', UserRole.TEACHER as any)).toBe(false);
    });

    test('3c. Admin Portal includes Parent Consent Records for compliance oversight', () => {
      expect(isTabPermitted('consent-management', UserRole.ADMIN as any)).toBe(true);
      expect(isTabPermitted('consent-management', UserRole.SUPER_ADMIN as any)).toBe(true);
      expect(isTabPermitted('consent-management', UserRole.HEAD_TEACHER as any)).toBe(true);
    });
  });
});
