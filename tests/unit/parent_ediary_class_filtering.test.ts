import { EDiaryUseCases } from '../../src/application/ediary/EDiaryUseCases';
import { EDiaryEntry } from '../../src/core/domain/ediary/EDiaryEntry';
import { InMemoryEDiaryRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import {
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ForbiddenError, NotFoundError } from '../../src/core/domain/shared/Errors';

describe('Parent Portal E-Diary Integration with Child-Specific Class Filtering', () => {
  let ediaryRepo: InMemoryEDiaryRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let ediaryUseCases: EDiaryUseCases;

  const schoolId = 'school-demo-001';

  // Streams
  const streamPP1 = 'stream-pp1-a';
  const streamGrade1 = 'stream-g1-east';
  const streamGrade2 = 'stream-g2-west';
  const streamGrade3 = 'stream-g3-north';

  // Academic Period
  let year2026: AcademicYear;
  let term1: AcademicTerm;
  let term2: AcademicTerm;

  // Test Users & Students
  let teacherUser: User;
  let parentOneChildUser: User;
  let parentMultiGradeUser: User;
  let parentTwinsUser: User;
  let parentNoChildrenUser: User;
  let headteacherDualRoleUser: User;

  let childGrade1: Student;
  let childGrade2: Student;
  let childGrade3: Student;
  let twin1Grade1: Student;
  let twin2Grade1: Student;
  let edwinPP1: Student;

  beforeEach(async () => {
    ediaryRepo = new InMemoryEDiaryRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();

    // 1. Setup Academic Calendar
    year2026 = AcademicYear.create(
      {
        name: '2026',
        startDate: '2026-01-05',
        endDate: '2026-11-20',
        schoolId,
        isCurrent: true
      },
      'ay-2026'
    );
    await academicRepo.saveYear(year2026);

    term1 = AcademicTerm.create(
      {
        name: 'Term 1',
        termNumber: 1,
        startDate: '2026-01-05',
        endDate: '2026-04-10',
        academicYearId: year2026.id,
        isCurrent: false
      },
      'term-2026-t1'
    );
    await academicRepo.saveTerm(term1);

    term2 = AcademicTerm.create(
      {
        name: 'Term 2',
        termNumber: 2,
        startDate: '2026-05-04',
        endDate: '2026-08-07',
        academicYearId: year2026.id,
        isCurrent: true
      },
      'term-2026-t2'
    );
    await academicRepo.saveTerm(term2);

    // 2. Setup Teacher
    teacherUser = User.create(
      {
        email: 'teacher.joyce@smartshule.ac.ke',
        passwordHash: 'hashed_pw_01',
        firstName: 'Joyce',
        lastName: 'Muthoni',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-teacher-01'
    );
    await userRepo.save(teacherUser);

    // 3. Setup Parent with 1 Child in Grade 1
    parentOneChildUser = User.create(
      {
        email: 'parent.single@smartshule.ac.ke',
        passwordHash: 'hashed_pw_02',
        firstName: 'Grace',
        lastName: 'Wanjiku',
        phone: '+254711000111',
        role: UserRole.GUARDIAN,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-parent-single'
    );
    await userRepo.save(parentOneChildUser);

    const guardianSingle = Guardian.create(
      {
        userId: parentOneChildUser.id,
        nationalId: '11223344',
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: parentOneChildUser.phone!,
        studentIds: ['std-g1-01']
      },
      'grd-single-01'
    );
    await guardianRepo.save(guardianSingle);

    childGrade1 = Student.create(
      {
        admissionNumber: 'ADM-0101',
        firstName: 'Brian',
        lastName: 'Kamau',
        dateOfBirth: '2019-03-12',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        streamId: streamGrade1,
        classroomId: 'class-g1',
        schoolId,
        academicYearId: year2026.id,
        guardianIds: [guardianSingle.id],
        status: StudentStatus.ACTIVE
      },
      'std-g1-01'
    );
    await studentRepo.save(childGrade1);

    // 4. Setup Child in Grade 2 (Belonging to another parent)
    childGrade2 = Student.create(
      {
        admissionNumber: 'ADM-0202',
        firstName: 'David',
        lastName: 'Otieno',
        dateOfBirth: '2018-05-15',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        streamId: streamGrade2,
        classroomId: 'class-g2',
        schoolId,
        academicYearId: year2026.id,
        guardianIds: ['grd-other-parent'],
        status: StudentStatus.ACTIVE
      },
      'std-g2-02'
    );
    await studentRepo.save(childGrade2);

    // 5. Setup Parent with 2 Children in Grade 1 & Grade 3
    parentMultiGradeUser = User.create(
      {
        email: 'parent.multi@smartshule.ac.ke',
        passwordHash: 'hashed_pw_03',
        firstName: 'Peter',
        lastName: 'Kariuki',
        phone: '+254722000222',
        role: UserRole.GUARDIAN,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-parent-multi'
    );
    await userRepo.save(parentMultiGradeUser);

    const guardianMulti = Guardian.create(
      {
        userId: parentMultiGradeUser.id,
        nationalId: '22334455',
        relationship: GuardianRelationship.FATHER,
        emergencyContact: parentMultiGradeUser.phone!,
        studentIds: ['std-multi-g1', 'std-multi-g3']
      },
      'grd-multi-01'
    );
    await guardianRepo.save(guardianMulti);

    const childMultiG1 = Student.create(
      {
        admissionNumber: 'ADM-0103',
        firstName: 'Sarah',
        lastName: 'Kariuki',
        dateOfBirth: '2019-07-20',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        streamId: streamGrade1,
        classroomId: 'class-g1',
        schoolId,
        academicYearId: year2026.id,
        guardianIds: [guardianMulti.id],
        status: StudentStatus.ACTIVE
      },
      'std-multi-g1'
    );
    await studentRepo.save(childMultiG1);

    childGrade3 = Student.create(
      {
        admissionNumber: 'ADM-0301',
        firstName: 'James',
        lastName: 'Kariuki',
        dateOfBirth: '2017-09-10',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_3,
        streamId: streamGrade3,
        classroomId: 'class-g3',
        schoolId,
        academicYearId: year2026.id,
        guardianIds: [guardianMulti.id],
        status: StudentStatus.ACTIVE
      },
      'std-multi-g3'
    );
    await studentRepo.save(childGrade3);

    // 6. Setup Parent with Twins in the SAME Grade & Stream (Grade 1 East)
    parentTwinsUser = User.create(
      {
        email: 'parent.twins@smartshule.ac.ke',
        passwordHash: 'hashed_pw_04',
        firstName: 'Mercy',
        lastName: 'Chebet',
        phone: '+254733000333',
        role: UserRole.PARENT,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-parent-twins'
    );
    await userRepo.save(parentTwinsUser);

    const guardianTwins = Guardian.create(
      {
        userId: parentTwinsUser.id,
        nationalId: '33445566',
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: parentTwinsUser.phone!,
        studentIds: ['std-twin-1', 'std-twin-2']
      },
      'grd-twins-01'
    );
    await guardianRepo.save(guardianTwins);

    twin1Grade1 = Student.create(
      {
        admissionNumber: 'ADM-0104',
        firstName: 'Tim',
        lastName: 'Kiprono',
        dateOfBirth: '2019-11-05',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        streamId: streamGrade1,
        classroomId: 'class-g1',
        schoolId,
        academicYearId: year2026.id,
        guardianIds: [guardianTwins.id],
        status: StudentStatus.ACTIVE
      },
      'std-twin-1'
    );
    await studentRepo.save(twin1Grade1);

    twin2Grade1 = Student.create(
      {
        admissionNumber: 'ADM-0105',
        firstName: 'Tom',
        lastName: 'Kiprono',
        dateOfBirth: '2019-11-05',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_1,
        streamId: streamGrade1,
        classroomId: 'class-g1',
        schoolId,
        academicYearId: year2026.id,
        guardianIds: [guardianTwins.id],
        status: StudentStatus.ACTIVE
      },
      'std-twin-2'
    );
    await studentRepo.save(twin2Grade1);

    // 7. Setup Parent with NO Linked Children
    parentNoChildrenUser = User.create(
      {
        email: 'parent.none@smartshule.ac.ke',
        passwordHash: 'hashed_pw_05',
        firstName: 'Kennedy',
        lastName: 'Omondi',
        phone: '+254744000444',
        role: UserRole.PARENT,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-parent-none'
    );
    await userRepo.save(parentNoChildrenUser);

    const guardianNone = Guardian.create(
      {
        userId: parentNoChildrenUser.id,
        nationalId: '44556677',
        relationship: GuardianRelationship.FATHER,
        emergencyContact: parentNoChildrenUser.phone!,
        studentIds: []
      },
      'grd-none-01'
    );
    await guardianRepo.save(guardianNone);

    // 8. Setup Headteacher with Parent Access (Rael Nandi & Edwin Bright in PP1)
    headteacherDualRoleUser = User.create(
      {
        email: 'headteacher@smartshule.ac.ke',
        passwordHash: 'hashed_pw_06',
        firstName: 'Rael',
        lastName: 'Nandi',
        phone: '+254755000555',
        role: UserRole.HEAD_TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-pp1-07'
    );
    await userRepo.save(headteacherDualRoleUser);

    const guardianRael = Guardian.create(
      {
        userId: headteacherDualRoleUser.id,
        nationalId: '55667788',
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: headteacherDualRoleUser.phone!,
        studentIds: ['std-pp1-07']
      },
      'grd-pp1-07'
    );
    await guardianRepo.save(guardianRael);

    edwinPP1 = Student.create(
      {
        admissionNumber: 'ADM-0108',
        firstName: 'Edwin',
        lastName: 'Bright',
        dateOfBirth: '2021-02-14',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.PP1,
        streamId: streamPP1,
        classroomId: 'class-pp1',
        schoolId,
        academicYearId: year2026.id,
        guardianIds: [guardianRael.id],
        status: StudentStatus.ACTIVE
      },
      'std-pp1-07'
    );
    await studentRepo.save(edwinPP1);

    // Initialize EDiaryUseCases
    ediaryUseCases = new EDiaryUseCases(
      ediaryRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      academicRepo
    );
  });

  // =========================================================================
  // Test Suite 1: Single Child Class Isolation
  // =========================================================================
  describe('1. Single Child Class Isolation', () => {
    it('Parent with one child in Grade 1 retrieves Grade 1 entries only', async () => {
      // Teacher publishes Grade 1 entry
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Mathematics', description: 'Counting 1 to 50' }],
        teacherRemarks: 'Excellent focus today'
      });

      // Teacher publishes Grade 2 entry
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade2,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'English', description: 'Reading Chapter 4' }],
        teacherRemarks: 'Bring reading logs tomorrow'
      });

      // Parent with child in Grade 1 fetches feed
      const feed = await ediaryUseCases.getFeedForParent({
        userId: parentOneChildUser.id,
        role: UserRole.GUARDIAN
      });

      expect(feed.length).toBe(1);
      expect(feed[0].streamId).toBe(streamGrade1);
      expect(feed[0].homeworkTasks[0].learningArea).toBe('Mathematics');
      expect(feed[0].applicableStudents[0].name).toBe('Brian Kamau');
    });

    it('Parent with one child in Grade 1 cannot retrieve Grade 2 entries even if requested directly', async () => {
      // Direct student endpoint with foreign studentId
      await expect(
        ediaryUseCases.listEntriesForStudent(childGrade2.id, {
          userId: parentOneChildUser.id,
          role: UserRole.GUARDIAN
        })
      ).rejects.toThrow(ForbiddenError);

      // Direct stream endpoint with foreign streamId
      await expect(
        ediaryUseCases.listEntriesForStream(streamGrade2, '2026-11-03', {
          userId: parentOneChildUser.id,
          role: UserRole.GUARDIAN
        })
      ).rejects.toThrow(ForbiddenError);

      // Parent feed endpoint with foreign studentId filter parameter
      await expect(
        ediaryUseCases.getFeedForParent(
          { userId: parentOneChildUser.id, role: UserRole.GUARDIAN },
          { studentId: childGrade2.id }
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =========================================================================
  // Test Suite 2: Multi-Child & Multi-Grade Feed Aggregation
  // =========================================================================
  describe('2. Multi-Child & Multi-Grade Aggregation', () => {
    it('Parent with children in Grade 1 and Grade 3 retrieves entries for both', async () => {
      // Publish Grade 1 entry
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Kiswahili', description: 'Kusoma Ukurasa 12' }]
      });

      // Publish Grade 2 entry (unrelated)
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade2,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Science', description: 'Plant parts diagram' }]
      });

      // Publish Grade 3 entry
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade3,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Social Studies', description: 'Physical features of Kenya' }]
      });

      const feed = await ediaryUseCases.getFeedForParent({
        userId: parentMultiGradeUser.id,
        role: UserRole.GUARDIAN
      });

      expect(feed.length).toBe(2);
      const streamIds = feed.map(e => e.streamId);
      expect(streamIds).toContain(streamGrade1);
      expect(streamIds).toContain(streamGrade3);
      expect(streamIds).not.toContain(streamGrade2);
    });

    it('Allows filtering to a specific child while preserving strict isolation', async () => {
      // Publish Grade 1 & Grade 3
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Grade 1 Task', description: 'G1 Work' }]
      });
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade3,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Grade 3 Task', description: 'G3 Work' }]
      });

      // Filter by child in Grade 3 specifically
      const feedG3Only = await ediaryUseCases.getFeedForParent(
        { userId: parentMultiGradeUser.id, role: UserRole.GUARDIAN },
        { studentId: childGrade3.id }
      );

      expect(feedG3Only.length).toBe(1);
      expect(feedG3Only[0].streamId).toBe(streamGrade3);
      expect(feedG3Only[0].homeworkTasks[0].learningArea).toBe('Grade 3 Task');
    });
  });

  // =========================================================================
  // Test Suite 3: Sibling Deduplication in Same Class/Stream
  // =========================================================================
  describe('3. Sibling Deduplication', () => {
    it('Parent with two children in Grade 1 sees unique entries without duplicates', async () => {
      // Teacher publishes single daily diary entry for Grade 1
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [
          { learningArea: 'Creative Arts', description: 'Color the national flag' }
        ],
        teacherRemarks: 'Bring crayons tomorrow'
      });

      // Parent with twins (Tim & Tom) in Grade 1 fetches feed
      const feed = await ediaryUseCases.getFeedForParent({
        userId: parentTwinsUser.id,
        role: UserRole.PARENT
      });

      // Crucial: Must be exactly 1 entry, not duplicated!
      expect(feed.length).toBe(1);
      expect(feed[0].streamId).toBe(streamGrade1);

      // Applicable students must clearly tag BOTH siblings
      expect(feed[0].applicableStudents.length).toBe(2);
      const studentNames = feed[0].applicableStudents.map((s: any) => s.name);
      expect(studentNames).toContain('Tim Kiprono');
      expect(studentNames).toContain('Tom Kiprono');
    });
  });

  // =========================================================================
  // Test Suite 4: Parents Without Active Enrolled Children
  // =========================================================================
  describe('4. Zero/Empty Children Handling', () => {
    it('Parent with no linked children receives empty results (never error or leak)', async () => {
      // Entries exist in the school
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'General', description: 'Schoolwide announcement' }]
      });

      const feed = await ediaryUseCases.getFeedForParent({
        userId: parentNoChildrenUser.id,
        role: UserRole.PARENT
      });

      expect(feed).toEqual([]);
    });

    it('Parent of withdrawn child cannot view diary records', async () => {
      // Mark Brian Kamau as WITHDRAWN
      childGrade1.withdraw({
        withdrawalDate: '2026-11-01',
        reason: 'Relocated to another city',
        staffUserId: 'usr-admin-01'
      });
      await studentRepo.update(childGrade1);

      // Entry exists for Grade 1
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Math', description: 'Numbers' }]
      });

      // Feed should return empty
      const feed = await ediaryUseCases.getFeedForParent({
        userId: parentOneChildUser.id,
        role: UserRole.GUARDIAN
      });
      expect(feed).toEqual([]);

      // Direct student endpoint should throw ForbiddenError
      await expect(
        ediaryUseCases.listEntriesForStudent(childGrade1.id, {
          userId: parentOneChildUser.id,
          role: UserRole.GUARDIAN
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =========================================================================
  // Test Suite 5: Publication Status & Draft Isolation
  // =========================================================================
  describe('5. Draft Protection & Immediate Visibility Upon Publishing', () => {
    it('Draft entries are never returned to parents', async () => {
      // Teacher saves DRAFT entry
      const draft = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'DRAFT',
        homeworkTasks: [{ learningArea: 'Draft Task', description: 'Unpublished draft' }]
      });

      // Parent checks feed
      const feed = await ediaryUseCases.getFeedForParent({
        userId: parentOneChildUser.id,
        role: UserRole.GUARDIAN
      });
      expect(feed.length).toBe(0);

      // Teacher publishes the entry
      await ediaryUseCases.createEntry({
        id: draft.id,
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Draft Task', description: 'Now published' }]
      });

      // Parent checks feed again -> immediately visible
      const updatedFeed = await ediaryUseCases.getFeedForParent({
        userId: parentOneChildUser.id,
        role: UserRole.GUARDIAN
      });
      expect(updatedFeed.length).toBe(1);
      expect(updatedFeed[0].status).toBe('PUBLISHED');
      expect(updatedFeed[0].homeworkTasks[0].description).toBe('Now published');
    });
  });

  // =========================================================================
  // Test Suite 6: Headteacher / Staff Dual-Role Isolation
  // =========================================================================
  describe('6. Staff Dual-Role Isolation (Rael Nandi Headteacher)', () => {
    it('Headteacher with parent role sees only their child class in parent portal', async () => {
      // Entries in multiple grades
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamPP1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Language Activities', description: 'Letter sound /p/' }]
      });

      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Mathematics', description: 'Addition within 20' }]
      });

      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade3,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Social Studies', description: 'Our county' }]
      });

      // Rael Nandi queries parent feed
      const raelFeed = await ediaryUseCases.getFeedForParent({
        userId: headteacherDualRoleUser.id,
        role: UserRole.HEAD_TEACHER
      });

      // She must see ONLY Edwin's PP1 entry!
      expect(raelFeed.length).toBe(1);
      expect(raelFeed[0].streamId).toBe(streamPP1);
      expect(raelFeed[0].applicableStudents[0].name).toBe('Edwin Bright');
    });
  });

  // =========================================================================
  // Test Suite 7: Academic Year & Term Filters
  // =========================================================================
  describe('7. Academic Year and Term Filtering', () => {
    it('Filters feed properly by termId', async () => {
      // Entry in Term 1
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-03-10',
        academicYearId: year2026.id,
        termId: term1.id,
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Term 1 Math', description: 'T1 Task' }]
      });

      // Entry in Term 2
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-06-15',
        academicYearId: year2026.id,
        termId: term2.id,
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Term 2 Math', description: 'T2 Task' }]
      });

      // Request Term 2 entries only
      const term2Feed = await ediaryUseCases.getFeedForParent(
        { userId: parentOneChildUser.id, role: UserRole.GUARDIAN },
        { termId: term2.id }
      );

      expect(term2Feed.length).toBe(1);
      expect(term2Feed[0].termId).toBe(term2.id);
      expect(term2Feed[0].homeworkTasks[0].learningArea).toBe('Term 2 Math');
    });
  });

  // =========================================================================
  // Test Suite 8: Digital Parent Acknowledgement
  // =========================================================================
  describe('8. Parent Digital Acknowledgement in Feed', () => {
    it('Records parent signature and reflects acknowledged status in feed', async () => {
      const entry = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Reading', description: 'Storybook page 8' }]
      });

      // Before signing
      const feedBefore = await ediaryUseCases.getFeedForParent({
        userId: parentOneChildUser.id,
        role: UserRole.GUARDIAN
      });
      expect(feedBefore[0].isAcknowledgedByParent).toBe(false);

      // Sign entry
      await ediaryUseCases.acknowledgeEntry({
        entryId: entry.id,
        guardianUserId: parentOneChildUser.id,
        guardianName: 'Grace Wanjiku',
        parentNote: 'Completed with mother supervision'
      });

      // After signing
      const feedAfter = await ediaryUseCases.getFeedForParent({
        userId: parentOneChildUser.id,
        role: UserRole.GUARDIAN
      });
      expect(feedAfter[0].isAcknowledgedByParent).toBe(true);
      expect(feedAfter[0].parentAcknowledgements.length).toBeGreaterThanOrEqual(1);
      expect(feedAfter[0].parentAcknowledgements[0].parentNote).toBe('Completed with mother supervision');
    });

    it('Prevents parent from acknowledging entries for classes their children do not attend', async () => {
      const grade2Entry = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade2,
        teacherId: teacherUser.id,
        date: '2026-11-03',
        status: 'PUBLISHED',
        homeworkTasks: [{ learningArea: 'Science', description: 'Task' }]
      });

      await expect(
        ediaryUseCases.acknowledgeEntry({
          entryId: grade2Entry.id,
          guardianUserId: parentOneChildUser.id, // child is in Grade 1, not Grade 2!
          parentNote: 'Attempt unauthorized sign-off'
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
