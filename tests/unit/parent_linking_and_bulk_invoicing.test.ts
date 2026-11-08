import {
  FeeStructure,
  StudentInvoice,
  InvoiceStatus,
  Payment,
  PaymentStatus
} from '../../src/core/domain/finance/Fee';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { FeeUseCases } from '../../src/application/finance/FeeUseCases';
import { StudentUseCases } from '../../src/application/students/StudentUseCases';
import { GuardianIdentityResolver } from '../../src/application/shared/GuardianIdentityResolver';
import {
  InMemoryFeeRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemoryStudentSponsorshipRepository } from '../../src/infrastructure/database/in-memory/InMemoryStudentSponsorshipRepository';
import { StudentSponsorship, SponsorshipType, SponsorshipStatus } from '../../src/core/domain/sponsorship/StudentSponsorship';

describe('Finance Automation, Parent-to-Learner Linking & Invoice Source of Truth Tests', () => {
  let feeRepo: InMemoryFeeRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let sponsorshipRepo: InMemoryStudentSponsorshipRepository;
  let feeUseCases: FeeUseCases;
  let studentUseCases: StudentUseCases;

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const term3Id = 'term-2026-t3';

  const bursarContext = {
    userId: 'usr-bursar-1',
    role: UserRole.BURSAR,
    schoolId
  };

  const adminContext = {
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
    sponsorshipRepo = new InMemoryStudentSponsorshipRepository();

    const mockNotificationService = {
      sendSms: async () => true,
      sendBulkSms: async () => ({ success: true, successfulCount: 0, failedCount: 0, messageIds: [] }),
      sendTemplateSms: async () => true,
    };

    const mockPaymentGateway = {
      initiateStkPush: async () => ({ success: true, checkoutRequestId: 'chk-1', customerMessage: 'Sent' }),
      queryTransactionStatus: async () => ({ success: true, status: 'COMPLETED' }),
    };

    const mockPasswordHasher = {
      hash: async (pw: string) => `hashed_${pw}`,
      compare: async (pw: string, hash: string) => hash === `hashed_${pw}`,
    };

    feeUseCases = new FeeUseCases(
      feeRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      mockPaymentGateway as any,
      mockNotificationService as any,
      academicRepo,
      undefined,
      sponsorshipRepo as any
    );

    studentUseCases = new StudentUseCases(
      studentRepo,
      guardianRepo,
      userRepo,
      mockPasswordHasher,
      academicRepo,
      feeRepo,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      sponsorshipRepo as any
    );

    // Seed Academic Year & Term 3
    const year = AcademicYear.create({
      schoolId,
      name: '2026 Academic Year',
      startDate: '2026-01-05',
      endDate: '2026-11-20',
      isCurrent: true
    }, academicYearId);
    await academicRepo.saveYear(year);

    const term3 = AcademicTerm.create({
      academicYearId,
      termNumber: 3,
      name: 'Term 3',
      startDate: '2026-09-01',
      endDate: '2026-11-20',
      isCurrent: true
    }, term3Id);
    await academicRepo.saveTerm(term3);

    // Seed Fee Structures for Playgroup and Grade 4
    const pgStructure = FeeStructure.create({
      schoolId,
      academicYearId,
      termId: term3Id,
      gradeLevel: CBCGradeLevel.PLAYGROUP,
      title: 'Playgroup Term 3 Fee Structure',
      items: [
        { id: 'item-pg-1', name: 'Tuition Fee', amount: 4500, category: 'TUITION', isOptional: false },
        { id: 'item-pg-2', name: 'Assessment Fee', amount: 300, category: 'ASSESSMENT', isOptional: false }
      ],
      dueDate: '2026-11-20'
    }, 'fs-pg-t3');
    await feeRepo.saveFeeStructure(pgStructure);

    const g4Structure = FeeStructure.create({
      schoolId,
      academicYearId,
      termId: term3Id,
      gradeLevel: CBCGradeLevel.GRADE_4,
      title: 'Grade 4 Term 3 Fee Structure',
      items: [
        { id: 'item-g4-1', name: 'Tuition Fee', amount: 5700, category: 'TUITION', isOptional: false },
        { id: 'item-g4-2', name: 'Assessment Fee', amount: 300, category: 'ASSESSMENT', isOptional: false }
      ],
      dueDate: '2026-11-20'
    }, 'fs-g4-t3');
    await feeRepo.saveFeeStructure(g4Structure);
  });

  // =========================================================================
  // SECTION 1: INVOICES AS SOURCE OF TRUTH (Tania Adhiambo / Unbilled Learner)
  // =========================================================================
  describe('Invoices as Single Source of Truth for Fee Balances', () => {
    it('Scenario 1: Unbilled learner (Tania Adhiambo) has 0 billed fees and UNBILLED status (NO phantom debt)', async () => {
      // Create Tania Adhiambo in Playgroup (no invoice generated yet)
      const tania = Student.create({
        schoolId,
        admissionNumber: '0141',
        firstName: 'TANIA',
        lastName: 'ADHIAMBO',
        dateOfBirth: '2021-03-15',
        gradeLevel: CBCGradeLevel.PLAYGROUP,
        gender: StudentGender.FEMALE,
        status: StudentStatus.ACTIVE,
        academicYearId,
        guardianIds: []
      }, 'student-pg-001');
      await studentRepo.save(tania);

      // 1. Fee position must reflect KES 0 billed fees (NOT KES 4,500 from fee structure!)
      const position = await feeUseCases.getLearnerFeePosition(tania.id, {
        academicYearId,
        termId: term3Id
      });

      expect(position.student.id).toBe(tania.id);
      expect(position.financialPosition.feesThisTerm).toBe(0);
      expect(position.financialPosition.previousBalance).toBe(0);
      expect(position.financialPosition.outstandingBalance).toBe(0);
      expect(position.financialPosition.status).toBe('UNBILLED');
      expect(position.financialPosition.statusLabel).toBe('Not Billed');

      // 2. Parent Portal must recognize UNBILLED rather than falsely claiming FULLY PAID
      // Attach a guardian to Tania
      const taniaGuardianUser = User.create({
        email: 'parent.tania@smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'Lameck',
        lastName: 'Parent',
        role: UserRole.GUARDIAN,
        phone: '0702447732',
        status: UserStatus.ACTIVE,
        schoolId
      }, 'user-guardian-035');
      await userRepo.save(taniaGuardianUser);

      const taniaGuardian = Guardian.create({
        userId: taniaGuardianUser.id,
        relationship: GuardianRelationship.FATHER,
        emergencyContact: '0702447732',
        studentIds: [tania.id]
      }, 'guardian-035');
      await guardianRepo.save(taniaGuardian);
      tania.addGuardian(taniaGuardian.id);
      await studentRepo.update(tania);

      const portalData = await studentUseCases.getGuardianPortalData(taniaGuardianUser.id);
      expect(portalData.students.length).toBe(1);
      const studentFee = portalData.students[0].fee;

      expect(studentFee.totalBilled).toBe(0);
      expect(studentFee.balance).toBe(0);
      expect(studentFee.hasInvoices).toBe(false);
      expect(studentFee.financialStatus).toBe('UNBILLED');
      expect(studentFee.isCleared).toBe(false); // MUST NOT be cleared / fully paid!
    });

    it('Scenario 2: Once an invoice is generated, the learner balance matches the invoice amount', async () => {
      const tania = Student.create({
        schoolId,
        admissionNumber: '0141',
        firstName: 'TANIA',
        lastName: 'ADHIAMBO',
        dateOfBirth: '2021-03-15',
        gradeLevel: CBCGradeLevel.PLAYGROUP,
        gender: StudentGender.FEMALE,
        status: StudentStatus.ACTIVE,
        academicYearId,
        guardianIds: []
      }, 'student-pg-001');
      await studentRepo.save(tania);

      // Generate invoice for Tania
      const invRes = await feeUseCases.generateInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        studentId: tania.id
      }, bursarContext);

      expect(invRes.invoices.length).toBe(1);
      expect(invRes.invoices[0].amountBilled).toBe(4800); // 4500 tuition + 300 assessment

      // Now fee position must report KES 4,800 billed and ARREARS status
      const position = await feeUseCases.getLearnerFeePosition(tania.id, {
        academicYearId,
        termId: term3Id
      });

      expect(position.financialPosition.feesThisTerm).toBe(4800);
      expect(position.financialPosition.outstandingBalance).toBe(4800);
      expect(position.financialPosition.status).toBe('ARREARS');
    });
  });

  // =========================================================================
  // SECTION 2: PARENT-TO-LEARNER LINKING & MULTI-ACCOUNT RESOLUTION (0790760008)
  // =========================================================================
  describe('Robust Parent-to-Learner Linking & Directory Workflow', () => {
    it('Scenario 3: Resolves children for parent 0790760008 across duplicate user accounts', async () => {
      // 1. Create Scarlet Achieng in Grade 4
      const scarlet = Student.create({
        schoolId,
        admissionNumber: '0012',
        firstName: 'SCARLET',
        lastName: 'ACHIENG',
        dateOfBirth: '2015-05-10',
        gradeLevel: CBCGradeLevel.GRADE_4,
        gender: StudentGender.FEMALE,
        status: StudentStatus.ACTIVE,
        academicYearId,
        guardianIds: ['guardian-g4-012']
      }, 'student-g4-012');
      await studentRepo.save(scarlet);

      // 2. Create child in Playgroup
      const playgroupChild = Student.create({
        schoolId,
        admissionNumber: '0150',
        firstName: 'JUNIOR',
        lastName: 'ALUOCH',
        dateOfBirth: '2021-08-12',
        gradeLevel: CBCGradeLevel.PLAYGROUP,
        gender: StudentGender.MALE,
        status: StudentStatus.ACTIVE,
        academicYearId,
        guardianIds: []
      }, 'student-pg-050');
      await studentRepo.save(playgroupChild);

      // 3. Duplicate User accounts for Sophy Aluoch (0790760008)
      // Account 1: user-guardian-154 (phone only, no student initially)
      const user154 = User.create({
        email: undefined,
        passwordHash: 'hash',
        firstName: 'Sophy',
        lastName: 'Aluoch',
        role: UserRole.GUARDIAN,
        phone: '0790760008',
        status: UserStatus.ACTIVE,
        schoolId
      }, 'user-guardian-154');
      await userRepo.save(user154);

      const guardian154 = Guardian.create({
        userId: user154.id,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '0790760008',
        studentIds: []
      }, 'guardian-154');
      await guardianRepo.save(guardian154);

      // Account 2: user-guardian-g4-012 (has email, linked to Scarlet)
      const userG4 = User.create({
        email: 'sophy.aluoch.g4.012@parents.smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'Sophy',
        lastName: 'Aluoch',
        role: UserRole.GUARDIAN,
        phone: '0790760008',
        status: UserStatus.ACTIVE,
        schoolId
      }, 'user-guardian-g4-012');
      await userRepo.save(userG4);

      const guardianG4 = Guardian.create({
        userId: userG4.id,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '0790760008',
        studentIds: [scarlet.id]
      }, 'guardian-g4-012');
      await guardianRepo.save(guardianG4);

      // 4. Admin searches for parent by phone '0790760008' or '+254790760008'
      const searchRes = await studentUseCases.searchParents('0790760008', schoolId);
      expect(searchRes.length).toBeGreaterThanOrEqual(1);
      const matchedParent = searchRes.find(p => p.phone === '0790760008');
      expect(matchedParent).toBeDefined();
      expect(matchedParent?.fullName).toBe('Sophy Aluoch');
      expect(matchedParent?.duplicateAccounts.length).toBeGreaterThanOrEqual(1);

      // 5. Admin links Playgroup child to Sophy Aluoch
      await studentUseCases.linkParentToLearners({
        parentUserId: user154.id,
        studentIds: [playgroupChild.id],
        relationship: 'MOTHER',
        isPrimary: true,
        requestingUser: adminContext
      });

      // 6. VERIFY: When Sophy logs in with user154 (the empty account that previously failed):
      // GuardianIdentityResolver resolves BOTH Scarlet (Grade 4) AND Junior (Playgroup)!
      const resolved154 = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
        userId: user154.id,
        userPhone: '0790760008',
        guardianRepository: guardianRepo,
        studentRepository: studentRepo,
        userRepository: userRepo
      });

      expect(resolved154.hasEnrolledChildren).toBe(true);
      expect(resolved154.studentIds).toContain(scarlet.id);
      expect(resolved154.studentIds).toContain(playgroupChild.id);
      expect(resolved154.students.length).toBe(2);

      // 7. VERIFY: Parent Portal data returns both children
      const portalData = await studentUseCases.getGuardianPortalData(user154.id);
      expect(portalData.students.length).toBe(2);
      const studentNames = portalData.students.map(s => s.fullName);
      expect(studentNames).toContain('SCARLET ACHIENG');
      expect(studentNames).toContain('JUNIOR ALUOCH');
    });

    it('Scenario 4: Allows safe unlinking without deleting student or financial history', async () => {
      const student = Student.create({
        schoolId,
        admissionNumber: '0099',
        firstName: 'SAMMY',
        lastName: 'OTIENO',
        dateOfBirth: '2016-04-18',
        gradeLevel: CBCGradeLevel.GRADE_4,
        gender: StudentGender.MALE,
        status: StudentStatus.ACTIVE,
        academicYearId,
        guardianIds: []
      }, 'student-0099');
      await studentRepo.save(student);

      const user = User.create({
        email: 'parent.sammy@smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Otieno',
        role: UserRole.GUARDIAN,
        phone: '0711223344',
        status: UserStatus.ACTIVE,
        schoolId
      }, 'user-parent-099');
      await userRepo.save(user);

      // Link
      await studentUseCases.linkParentToLearners({
        parentUserId: user.id,
        studentIds: [student.id],
        relationship: 'FATHER',
        requestingUser: adminContext
      });

      let tree = await studentUseCases.getParentFamilyTree(user.id, schoolId);
      expect(tree.children.length).toBe(1);

      // Unlink
      await studentUseCases.unlinkParentFromLearner({
        parentUserId: user.id,
        studentId: student.id,
        requestingUser: adminContext
      });

      tree = await studentUseCases.getParentFamilyTree(user.id, schoolId);
      expect(tree.children.length).toBe(0);

      // Student record still intact
      const refreshedStudent = await studentRepo.findById(student.id);
      expect(refreshedStudent).not.toBeNull();
      expect(refreshedStudent?.fullName).toBe('SAMMY OTIENO');
    });

    it('Scenario 4b: Robust parent search by National ID, partial name, and subscriber phone digits', async () => {
      // Create a parent with role PARENT and specific National ID
      const parentUser = User.create({
        email: 'grace.parent@gmail.com',
        passwordHash: 'hashed_pw',
        firstName: 'Grace',
        lastName: 'Auma',
        role: UserRole.PARENT,
        phone: '+254722123456',
        schoolId,
        status: UserStatus.ACTIVE
      }, 'usr-grace-parent');
      await userRepo.save(parentUser);

      const guardianRec = Guardian.create({
        userId: parentUser.id,
        nationalId: '32847592',
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '+254722123456',
        studentIds: []
      }, 'g-grace-1');
      await guardianRepo.save(guardianRec);

      // Search by National ID
      const resById = await studentUseCases.searchParents('32847592', schoolId);
      expect(resById.length).toBeGreaterThanOrEqual(1);
      expect(resById[0].nationalId).toBe('32847592');
      expect(resById[0].fullName).toBe('Grace Auma');

      // Search by 9-digit local phone number (0722123456 matches +254722123456)
      const resByPhone = await studentUseCases.searchParents('0722123456', schoolId);
      expect(resByPhone.length).toBeGreaterThanOrEqual(1);
      expect(resByPhone.find(p => p.userId === parentUser.id)).toBeDefined();

      // Search by partial name
      const resByName = await studentUseCases.searchParents('Grace', schoolId);
      expect(resByName.length).toBeGreaterThanOrEqual(1);
      expect(resByName.find(p => p.userId === parentUser.id)).toBeDefined();
    });

    it('Scenario 4c: createAndLinkParent registers new parent and links directly to learner', async () => {
      const learner = Student.create({
        schoolId, admissionNumber: '0999', firstName: 'BRIAN', lastName: 'ODHIAMBO', dateOfBirth: '2019-01-10',
        gradeLevel: CBCGradeLevel.GRADE_3, gender: StudentGender.MALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'st-brian-999');
      await studentRepo.save(learner);

      const res = await studentUseCases.createAndLinkParent({
        firstName: 'Kennedy',
        lastName: 'Odhiambo',
        phone: '0711998877',
        nationalId: '12345678',
        email: 'kennedy.o@gmail.com',
        relationship: 'FATHER',
        studentId: learner.id,
        isPrimary: true,
        schoolId
      });

      expect(res.success).toBe(true);
      expect(res.parent.fullName).toBe('Kennedy Odhiambo');
      expect(res.parent.nationalId).toBe('12345678');

      // Verify learner now has guardian
      const updatedLearner = await studentRepo.findById(learner.id);
      expect(updatedLearner?.guardianIds.length).toBeGreaterThanOrEqual(1);

      // Verify family tree
      const tree = await studentUseCases.getParentFamilyTree(res.parent.userId, schoolId);
      expect(tree.children.length).toBe(1);
      expect(tree.children[0].fullName).toBe('BRIAN ODHIAMBO');
    });
  });

  // =========================================================================
  // SECTION 3: AUTOMATED BULK INVOICING ENGINE
  // =========================================================================
  describe('Automated Bulk Invoicing Engine & Safeguards', () => {
    it('Scenario 5: Pre-Flight preview matches correct fee structure by cohort (ECDE vs Primary)', async () => {
      // Create 2 ECDE learners and 2 Primary learners
      const pg1 = Student.create({
        schoolId, admissionNumber: '0141', firstName: 'TANIA', lastName: 'ADHIAMBO', dateOfBirth: '2021-03-15',
        gradeLevel: CBCGradeLevel.PLAYGROUP, gender: StudentGender.FEMALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'student-pg-01');
      const pg2 = Student.create({
        schoolId, admissionNumber: '0142', firstName: 'SHERYL', lastName: 'ATIENO', dateOfBirth: '2021-06-20',
        gradeLevel: CBCGradeLevel.PLAYGROUP, gender: StudentGender.FEMALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'student-pg-02');
      const g4_1 = Student.create({
        schoolId, admissionNumber: '0012', firstName: 'SCARLET', lastName: 'ACHIENG', dateOfBirth: '2015-05-10',
        gradeLevel: CBCGradeLevel.GRADE_4, gender: StudentGender.FEMALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'student-g4-01');
      const g4_2 = Student.create({
        schoolId, admissionNumber: '0013', firstName: 'PETER', lastName: 'ODHIAMBO', dateOfBirth: '2015-08-11',
        gradeLevel: CBCGradeLevel.GRADE_4, gender: StudentGender.MALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'student-g4-02');

      await studentRepo.save(pg1);
      await studentRepo.save(pg2);
      await studentRepo.save(g4_1);
      await studentRepo.save(g4_2);

      // Preview ECDE cohort only
      const ecdePreview = await feeUseCases.previewBulkInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        scope: 'ECDE'
      }, bursarContext);

      expect(ecdePreview.summary.totalEligible).toBe(2);
      expect(ecdePreview.candidates.length).toBe(2);
      expect(ecdePreview.candidates.every(c => c.gradeLevel === 'PLAYGROUP')).toBe(true);
      expect(ecdePreview.summary.readyCount).toBe(2);
      expect(ecdePreview.summary.totalEstimatedBilling).toBe(9600); // 4,800 * 2

      // Preview Grade 4 only
      const g4Preview = await feeUseCases.previewBulkInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        scope: 'GRADE',
        targetGradeLevel: CBCGradeLevel.GRADE_4
      }, bursarContext);

      expect(g4Preview.summary.totalEligible).toBe(2);
      expect(g4Preview.candidates.every(c => c.gradeLevel === 'GRADE_4')).toBe(true);
      expect(g4Preview.summary.totalEstimatedBilling).toBe(12000); // 6,000 * 2

      // Preview Entire School
      const allPreview = await feeUseCases.previewBulkInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        scope: 'ALL'
      }, bursarContext);

      expect(allPreview.summary.totalEligible).toBe(4);
      expect(allPreview.summary.readyCount).toBe(4);
      expect(allPreview.summary.totalEstimatedBilling).toBe(21600); // 9600 + 12000
    });

    it('Scenario 6: Idempotency Protection — running bulk billing twice never creates duplicate invoices', async () => {
      const g4Student = Student.create({
        schoolId, admissionNumber: '0012', firstName: 'SCARLET', lastName: 'ACHIENG', dateOfBirth: '2015-05-10',
        gradeLevel: CBCGradeLevel.GRADE_4, gender: StudentGender.FEMALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'student-g4-01');
      await studentRepo.save(g4Student);

      // Execution 1
      const exec1 = await feeUseCases.executeBulkInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        scope: 'GRADE',
        targetGradeLevel: CBCGradeLevel.GRADE_4
      }, bursarContext);

      expect(exec1.success).toBe(true);
      expect(exec1.batchSummary.totalGenerated).toBe(1);
      expect(exec1.batchSummary.totalSkipped).toBe(0);

      const existingInvoices = await feeRepo.findInvoices({ studentId: g4Student.id });
      expect(existingInvoices.length).toBe(1);

      // Execution 2 (Same period and scope)
      const exec2 = await feeUseCases.executeBulkInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        scope: 'GRADE',
        targetGradeLevel: CBCGradeLevel.GRADE_4
      }, bursarContext);

      expect(exec2.success).toBe(true);
      expect(exec2.batchSummary.totalGenerated).toBe(0); // 0 newly generated
      expect(exec2.batchSummary.totalSkipped).toBe(1); // 1 safely skipped!

      // Verify still only 1 invoice exists in repository
      const invoicesAfterRetry = await feeRepo.findInvoices({ studentId: g4Student.id });
      expect(invoicesAfterRetry.length).toBe(1);
    });

    it('Scenario 7: 100% Scholarship learners are exempt and skipped with EXEMPT_SPONSORED status', async () => {
      const sponsoredStudent = Student.create({
        schoolId, admissionNumber: '0088', firstName: 'FAITH', lastName: 'GIVEN', dateOfBirth: '2015-09-02',
        gradeLevel: CBCGradeLevel.GRADE_4, gender: StudentGender.FEMALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'student-g4-sponsored');
      await studentRepo.save(sponsoredStudent);

      // Enroll under Institutional Scholarship
      const sponsorship = StudentSponsorship.create({
        schoolId,
        studentId: sponsoredStudent.id,
        admissionNumber: sponsoredStudent.admissionNumber,
        studentName: sponsoredStudent.fullName,
        gradeLevel: sponsoredStudent.gradeLevel,
        sponsorshipType: SponsorshipType.DIRECTOR_BENEVOLENCE,
        sponsorshipStatus: SponsorshipStatus.ACTIVE,
        coverage: {
          tuitionCovered: true,
          lunchCovered: true,
          materialsCovered: true,
          uniformCovered: true,
          activitiesCovered: true,
          percentageCovered: 100
        },
        sponsorName: 'Grace Seeds Education Trust',
        termlySubsidyAmount: 6000,
        annualSubsidyAmount: 18000,
        startDate: '2026-01-01',
        academicYearId,
        approvalReference: 'APP-REF-001',
        approvedByUserId: bursarContext.userId,
        approvedByUserName: 'Bursar Office',
        reasonNotes: 'Institutional scholarship for vulnerable student'
      }, 'sp-faith-01');
      await sponsorshipRepo.save(sponsorship);

      const preview = await feeUseCases.previewBulkInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        scope: 'GRADE',
        targetGradeLevel: CBCGradeLevel.GRADE_4
      }, bursarContext);

      expect(preview.summary.exemptSponsoredCount).toBe(1);
      expect(preview.summary.readyCount).toBe(0);
      const candidate = preview.candidates.find(c => c.studentId === sponsoredStudent.id);
      expect(candidate?.status).toBe('EXEMPT_SPONSORED');
      expect(candidate?.totalPayable).toBe(0);
    });

    it('Scenario 8: Carried forward prior unpaid arrears are properly included into new bulk invoices', async () => {
      const studentWithArrears = Student.create({
        schoolId, admissionNumber: '0077', firstName: 'KEVIN', lastName: 'MAINA', dateOfBirth: '2015-02-14',
        gradeLevel: CBCGradeLevel.GRADE_4, gender: StudentGender.MALE, status: StudentStatus.ACTIVE, academicYearId, guardianIds: []
      }, 'student-g4-arrears');
      await studentRepo.save(studentWithArrears);

      // Prior unpaid invoice from Term 2 (KES 3,500 unpaid balance)
      const priorInv = StudentInvoice.create({
        schoolId,
        studentId: studentWithArrears.id,
        feeStructureId: 'fs-g4-t2',
        academicYearId,
        termId: 'term-2026-t2',
        invoiceNumber: 'INV-2026-T2-001',
        items: [{ id: 'it-1', name: 'Term 2 Fees', amount: 6500, category: 'TUITION', isOptional: false }],
        amountBilled: 6500,
        discountAmount: 0,
        amountPayable: 6500,
        amountPaid: 3000,
        balance: 3500,
        status: InvoiceStatus.PARTIALLY_PAID,
        dueDate: '2026-08-01'
      }, 'inv-prior-t2');
      await feeRepo.saveInvoice(priorInv);

      // Execute Bulk Invoicing for Term 3 with arrears carry-forward
      const exec = await feeUseCases.executeBulkInvoices({
        schoolId,
        academicYearId,
        termId: term3Id,
        scope: 'GRADE',
        targetGradeLevel: CBCGradeLevel.GRADE_4,
        includePreviousBalance: true
      }, bursarContext);

      expect(exec.batchSummary.totalGenerated).toBe(1);

      // Verify generated invoice has base fees (6,000) + prior arrears (3,500) = KES 9,500
      const t3Invoices = await feeRepo.findInvoices({
        studentId: studentWithArrears.id,
        termId: term3Id
      });
      expect(t3Invoices.length).toBe(1);
      expect(t3Invoices[0].amountBilled).toBe(9500);
      expect(t3Invoices[0].balance).toBe(9500);

      // Prior invoice marked as CARRIED_FORWARD
      const refreshedPrior = await feeRepo.findInvoiceById(priorInv.id);
      expect(refreshedPrior?.status).toBe(InvoiceStatus.CARRIED_FORWARD);

      // Bulk billing history recorded
      const history = await feeUseCases.getBulkBillingHistory(schoolId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].scope).toBe('GRADE');
      expect(history[0].targetGradeLevel).toBe(CBCGradeLevel.GRADE_4);
      expect(history[0].totalGenerated).toBe(1);
    });
  });
});
