import { EDiaryUseCases } from '../../src/application/ediary/EDiaryUseCases';
import { EDiaryEntry } from '../../src/core/domain/ediary/EDiaryEntry';
import {
  InMemoryEDiaryRepository,
  InMemoryStudentRepository,
  InMemoryGuardianRepository,
  InMemoryUserRepository,
  InMemoryAcademicRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';

describe('Multiple E-Diary Entries Preservation and Parent Portal Display Test Suite', () => {
  let ediaryRepo: InMemoryEDiaryRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let ediaryUseCases: EDiaryUseCases;

  const schoolId = 'school-demo-001';
  const targetDate = '2026-11-02';

  // Streams & Classrooms
  const classPP1 = 'class-pp1';
  const streamPP1 = 'stream-pp1-a';

  const classGrade1 = 'class-g1';
  const streamGrade1 = 'stream-g1-east';

  const classGrade2 = 'class-g2';
  const streamGrade2 = 'stream-g2-west';

  // Academic Period
  let year2026: AcademicYear;
  let term3: AcademicTerm;

  // Users
  let teacherUser: User;
  let teacher2User: User;
  let parentUser: User;
  let parentTwinUser: User;

  // Students
  let childPP1: Student;
  let childGrade1: Student;
  let twin1Grade2: Student;
  let twin2Grade2: Student;
  let childNoStream: Student;

  beforeEach(async () => {
    ediaryRepo = new InMemoryEDiaryRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();

    // 1. Setup Academic Period
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

    term3 = AcademicTerm.create(
      {
        name: 'Term 3',
        termNumber: 3,
        startDate: '2026-09-01',
        endDate: '2026-11-20',
        academicYearId: 'ay-2026',
        isCurrent: true
      },
      'term-2026-t3'
    );
    await academicRepo.saveTerm(term3);

    // 2. Setup Teachers
    teacherUser = User.create(
      {
        email: 'teacher.science@school.org',
        firstName: 'Grace',
        lastName: 'Muthoni',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE,
        passwordHash: 'hash-pwd-001'
      },
      'usr-teacher-01'
    );
    await userRepo.save(teacherUser);

    teacher2User = User.create(
      {
        email: 'teacher.math@school.org',
        firstName: 'David',
        lastName: 'Otieno',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE,
        passwordHash: 'hash-pwd-002'
      },
      'usr-teacher-02'
    );
    await userRepo.save(teacher2User);

    // 3. Setup Parents & Children
    // Parent 1: Has childPP1 and childGrade1
    parentUser = User.create(
      {
        email: 'parent.mary@example.com',
        firstName: 'Mary',
        lastName: 'Wanjiku',
        role: UserRole.GUARDIAN,
        schoolId,
        status: UserStatus.ACTIVE,
        passwordHash: 'hash-pwd-003'
      },
      'usr-parent-01'
    );
    await userRepo.save(parentUser);

    const guardian1 = Guardian.create(
      {
        userId: 'usr-parent-01',
        relationship: GuardianRelationship.MOTHER,
        studentIds: ['std-pp1-01', 'std-g1-01', 'std-nostream-01'],
        emergencyContact: '+254711000111'
      },
      'grd-001'
    );
    await guardianRepo.save(guardian1);

    childPP1 = Student.create(
      {
        schoolId,
        firstName: 'Edwin',
        lastName: 'Bright',
        admissionNumber: '0108',
        gradeLevel: CBCGradeLevel.PP1,
        streamId: streamPP1,
        classroomId: classPP1,
        gender: StudentGender.MALE,
        guardianIds: ['grd-001'],
        status: StudentStatus.ACTIVE,
        dateOfBirth: '2021-02-14',
        academicYearId: year2026.id
      },
      'std-pp1-01'
    );
    await studentRepo.save(childPP1);

    childGrade1 = Student.create(
      {
        schoolId,
        firstName: 'Faith',
        lastName: 'Bright',
        admissionNumber: '0109',
        gradeLevel: CBCGradeLevel.GRADE_1,
        streamId: streamGrade1,
        classroomId: classGrade1,
        gender: StudentGender.FEMALE,
        guardianIds: ['grd-001'],
        status: StudentStatus.ACTIVE,
        dateOfBirth: '2019-06-10',
        academicYearId: year2026.id
      },
      'std-g1-01'
    );
    await studentRepo.save(childGrade1);

    // Child with classroomId but empty streamId
    childNoStream = Student.create(
      {
        schoolId,
        firstName: 'Samuel',
        lastName: 'Bright',
        admissionNumber: '0110',
        gradeLevel: CBCGradeLevel.PP1,
        streamId: '', // Empty streamId, only classroom assigned
        classroomId: classPP1,
        gender: StudentGender.MALE,
        guardianIds: ['grd-001'],
        status: StudentStatus.ACTIVE,
        dateOfBirth: '2021-08-20',
        academicYearId: year2026.id
      },
      'std-nostream-01'
    );
    await studentRepo.save(childNoStream);

    // Parent 2: Has twins in Grade 2 West
    parentTwinUser = User.create(
      {
        email: 'parent.twins@example.com',
        firstName: 'James',
        lastName: 'Kamau',
        role: UserRole.GUARDIAN,
        schoolId,
        status: UserStatus.ACTIVE,
        passwordHash: 'hash-pwd-004'
      },
      'usr-parent-twins'
    );
    await userRepo.save(parentTwinUser);

    const guardianTwin = Guardian.create(
      {
        userId: 'usr-parent-twins',
        relationship: GuardianRelationship.FATHER,
        studentIds: ['std-twin-01', 'std-twin-02'],
        emergencyContact: '+254722000222'
      },
      'grd-twins'
    );
    await guardianRepo.save(guardianTwin);

    twin1Grade2 = Student.create(
      {
        schoolId,
        firstName: 'Brian',
        lastName: 'Kamau',
        admissionNumber: '0201',
        gradeLevel: CBCGradeLevel.GRADE_2,
        streamId: streamGrade2,
        classroomId: classGrade2,
        gender: StudentGender.MALE,
        guardianIds: ['grd-twins'],
        status: StudentStatus.ACTIVE,
        dateOfBirth: '2018-04-12',
        academicYearId: year2026.id
      },
      'std-twin-01'
    );
    await studentRepo.save(twin1Grade2);

    twin2Grade2 = Student.create(
      {
        schoolId,
        firstName: 'Brenda',
        lastName: 'Kamau',
        admissionNumber: '0202',
        gradeLevel: CBCGradeLevel.GRADE_2,
        streamId: streamGrade2,
        classroomId: classGrade2,
        gender: StudentGender.FEMALE,
        guardianIds: ['grd-twins'],
        status: StudentStatus.ACTIVE,
        dateOfBirth: '2018-04-12',
        academicYearId: year2026.id
      },
      'std-twin-02'
    );
    await studentRepo.save(twin2Grade2);

    // 4. Instantiate UseCases
    ediaryUseCases = new EDiaryUseCases(
      ediaryRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      academicRepo
    );
  });

  describe('Part 1: Multiple Entries Preservation & Persistence', () => {
    it('1. Persists multiple entries for the same stream and date with distinct unique IDs', async () => {
      // First entry: Morning Mathematics
      const entry1 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Morning Mathematics - Addition & Subtraction',
        homeworkTasks: [
          { learningArea: 'Mathematics', description: 'Complete Exercise 3 on page 14' }
        ],
        tomorrowRequirements: ['Ruler', 'Pencil'],
        teacherRemarks: 'Great attention shown by all learners.',
        teacherId: 'usr-teacher-01'
      });

      // Second entry: Afternoon Environmental Activities
      const entry2 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Afternoon Environmental Activities - Plant Parts',
        homeworkTasks: [
          { learningArea: 'Environmental', description: 'Collect 3 different fallen leaves' }
        ],
        tomorrowRequirements: ['Clean empty yoghurt cup for potting'],
        teacherRemarks: 'We will plant seeds tomorrow.',
        teacherId: 'usr-teacher-02'
      });

      // Assert distinct IDs
      expect(entry1.id).toBeDefined();
      expect(entry2.id).toBeDefined();
      expect(entry1.id).not.toBe(entry2.id);

      // Verify both entries exist independently in repository
      const allEntries = await ediaryRepo.findByStream(streamGrade1, targetDate);
      expect(allEntries.length).toBe(2);

      const titles = allEntries.map((e) => e.title);
      expect(titles).toContain('Morning Mathematics - Addition & Subtraction');
      expect(titles).toContain('Afternoon Environmental Activities - Plant Parts');
    });

    it('2. Editing entry 1 updates only entry 1 without touching entry 2 or creating duplicates', async () => {
      const entry1 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Entry 1 Original Title',
        homeworkTasks: [{ learningArea: 'English', description: 'Original task 1' }],
        teacherId: 'usr-teacher-01'
      });

      const entry2 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Entry 2 Original Title',
        homeworkTasks: [{ learningArea: 'Kiswahili', description: 'Kusoma ukurasa 10' }],
        teacherId: 'usr-teacher-02'
      });

      // Edit Entry 1 by explicitly providing its ID
      const updatedEntry1 = await ediaryUseCases.createEntry({
        id: entry1.id,
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Entry 1 REVISED Title',
        homeworkTasks: [
          { learningArea: 'English', description: 'Revised: read chapters 1 and 2' }
        ],
        teacherRemarks: 'Revised homework scope',
        teacherId: 'usr-teacher-01'
      });

      expect(updatedEntry1.id).toBe(entry1.id);
      expect(updatedEntry1.title).toBe('Entry 1 REVISED Title');

      // Check repository: still exactly 2 entries, entry 2 unchanged
      const allEntries = await ediaryRepo.findByStream(streamGrade1, targetDate);
      expect(allEntries.length).toBe(2);

      const foundEntry2 = allEntries.find((e) => e.id === entry2.id);
      expect(foundEntry2).toBeDefined();
      expect(foundEntry2?.title).toBe('Entry 2 Original Title');
      expect(foundEntry2?.homeworkTasks[0].description).toBe('Kusoma ukurasa 10');
    });

    it('3. Can publish entry 1 while entry 2 remains DRAFT', async () => {
      const entry1Published = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Published Lesson',
        homeworkTasks: [{ learningArea: 'CRE', description: 'Story of Creation summary' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      const entry2Draft = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Draft Lesson (Work in Progress)',
        homeworkTasks: [{ learningArea: 'Music', description: 'Sing stanza 1' }],
        status: 'DRAFT',
        teacherId: 'usr-teacher-01'
      });

      expect(entry1Published.status).toBe('PUBLISHED');
      expect(entry2Draft.status).toBe('DRAFT');

      const all = await ediaryRepo.findByStream(streamGrade1, targetDate);
      expect(all.length).toBe(2);

      const published = all.filter((e) => e.status === 'PUBLISHED');
      const drafts = all.filter((e) => e.status === 'DRAFT');
      expect(published.length).toBe(1);
      expect(drafts.length).toBe(1);
      expect(published[0].id).toBe(entry1Published.id);
      expect(drafts[0].id).toBe(entry2Draft.id);
    });

    it('4. Repeated publishing calls on the same entry update status idempotently without duplicating', async () => {
      const draft = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Draft to Publish',
        homeworkTasks: [{ learningArea: 'Art', description: 'Color the circle' }],
        status: 'DRAFT',
        teacherId: 'usr-teacher-01'
      });

      // First publish
      const pub1 = await ediaryUseCases.createEntry({
        id: draft.id,
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Draft to Publish',
        homeworkTasks: [{ learningArea: 'Art', description: 'Color the circle' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });
      expect(pub1.status).toBe('PUBLISHED');

      // Second publish retry (e.g. user double-clicked publish)
      const pub2 = await ediaryUseCases.createEntry({
        id: draft.id,
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Draft to Publish',
        homeworkTasks: [{ learningArea: 'Art', description: 'Color the circle' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });
      expect(pub2.status).toBe('PUBLISHED');
      expect(pub2.id).toBe(draft.id);

      // Verify still only 1 entry in repository
      const all = await ediaryRepo.findByStream(streamGrade1, targetDate);
      expect(all.length).toBe(1);
    });

    it('5. Deleting an entry removes only that entry while others remain', async () => {
      const e1 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        date: targetDate,
        title: 'Entry To Keep',
        homeworkTasks: [{ learningArea: 'Math', description: 'Page 5' }],
        teacherId: 'usr-teacher-01'
      });

      const e2 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        date: targetDate,
        title: 'Entry To Delete',
        homeworkTasks: [{ learningArea: 'Science', description: 'Page 6' }],
        teacherId: 'usr-teacher-01'
      });

      await ediaryUseCases.deleteEntry(e2.id, {
        userId: 'usr-teacher-01',
        role: UserRole.TEACHER
      });

      const remaining = await ediaryRepo.findByStream(streamGrade1, targetDate);
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(e1.id);
      expect(remaining[0].title).toBe('Entry To Keep');
    });
  });

  describe('Part 2: Parent Portal Display & Child-Specific Filtering', () => {
    it('6. Parent sees all published entries for their child on that date', async () => {
      // Create 2 published entries for Grade 1
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Grade 1 Morning Math',
        homeworkTasks: [{ learningArea: 'Math', description: 'Numbers 1 to 50' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Grade 1 Afternoon English',
        homeworkTasks: [{ learningArea: 'English', description: 'Phonics sounds' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-02'
      });

      // Filter feed for Parent 1 (Faith is in Grade 1)
      const feed = await ediaryUseCases.getFeedForParent(
        { userId: parentUser.id, role: UserRole.GUARDIAN },
        { studentId: childGrade1.id, date: targetDate }
      );

      expect(feed.length).toBe(2);
      const titles = feed.map((f: any) => f.title);
      expect(titles).toContain('Grade 1 Morning Math');
      expect(titles).toContain('Grade 1 Afternoon English');
    });

    it('7. Multi-grade parent combined feed aggregates entries across all linked children', async () => {
      // 1 entry for PP1 (Edwin)
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamPP1,
        classRoomId: classPP1,
        date: targetDate,
        title: 'PP1 Shapes & Patterns',
        homeworkTasks: [{ learningArea: 'Mathematical Activities', description: 'Draw 3 circles' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      // 1 entry for Grade 1 (Faith)
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Grade 1 Reading Fun',
        homeworkTasks: [{ learningArea: 'Literacy', description: 'Read pages 4-6' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-02'
      });

      // 1 entry for Grade 2 (Unrelated to Parent 1)
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade2,
        classRoomId: classGrade2,
        date: targetDate,
        title: 'Grade 2 Science Project',
        homeworkTasks: [{ learningArea: 'Science', description: 'Build a weather vane' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      // Query parent combined feed (no studentId filter)
      const parentFeed = await ediaryUseCases.getFeedForParent(
        { userId: parentUser.id, role: UserRole.GUARDIAN },
        { date: targetDate }
      );

      // Parent 1 has children in PP1 and Grade 1, NOT Grade 2
      expect(parentFeed.length).toBe(2);
      const titles = parentFeed.map((e: any) => e.title);
      expect(titles).toContain('PP1 Shapes & Patterns');
      expect(titles).toContain('Grade 1 Reading Fun');
      expect(titles).not.toContain('Grade 2 Science Project');
    });

    it('8. Learner with null/empty streamId matches entries via classroomId', async () => {
      // Entry published with streamId = '' but classRoomId = classPP1
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: '',
        classRoomId: classPP1,
        date: targetDate,
        title: 'PP1 Classroom-Wide Entry',
        homeworkTasks: [{ learningArea: 'Creative Arts', description: 'Color the apple' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      // Query feed for childNoStream (Samuel has streamId = '', classroomId = classPP1)
      const feed = await ediaryUseCases.getFeedForParent(
        { userId: parentUser.id, role: UserRole.GUARDIAN },
        { studentId: childNoStream.id, date: targetDate }
      );

      expect(feed.length).toBe(1);
      expect(feed[0].title).toBe('PP1 Classroom-Wide Entry');
      expect(feed[0].applicableStudents?.map((s: any) => s.id)).toContain(childNoStream.id);
    });

    it('9. Twins in the same class: entries are not duplicated in feed; both children tagged in applicableStudents', async () => {
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade2,
        classRoomId: classGrade2,
        date: targetDate,
        title: 'Grade 2 West Homework',
        homeworkTasks: [{ learningArea: 'Hygiene', description: 'Wash hands chart' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      // Parent Twin has 2 children (Brian & Brenda) in streamGrade2
      const twinFeed = await ediaryUseCases.getFeedForParent(
        { userId: parentTwinUser.id, role: UserRole.GUARDIAN },
        { date: targetDate }
      );

      expect(twinFeed.length).toBe(1);
      expect(twinFeed[0].title).toBe('Grade 2 West Homework');
      expect(twinFeed[0].applicableStudents?.length).toBe(2);
      const studentNames = twinFeed[0].applicableStudents?.map((s: any) => s.name);
      expect(studentNames).toContain('Brian Kamau');
      expect(studentNames).toContain('Brenda Kamau');
    });

    it('10. Draft entries are never leaked to Parent Portal', async () => {
      // 1 published entry
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Published Homework',
        homeworkTasks: [{ learningArea: 'English', description: 'Read page 1' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      // 1 draft entry for the same class
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Unpublished Homework Draft',
        homeworkTasks: [{ learningArea: 'English', description: 'Secret draft task' }],
        status: 'DRAFT',
        teacherId: 'usr-teacher-01'
      });

      const parentFeed = await ediaryUseCases.getFeedForParent(
        { userId: parentUser.id, role: UserRole.GUARDIAN },
        { studentId: childGrade1.id, date: targetDate }
      );

      expect(parentFeed.length).toBe(1);
      expect(parentFeed[0].title).toBe('Published Homework');
      expect(parentFeed[0].status).toBe('PUBLISHED');
    });

    it('11. Parent digital sign-off records acknowledgement against the specific entry and student', async () => {
      const entry1 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Homework 1',
        homeworkTasks: [{ learningArea: 'Math', description: 'Task 1' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-01'
      });

      const entry2 = await ediaryUseCases.createEntry({
        schoolId,
        streamId: streamGrade1,
        classRoomId: classGrade1,
        date: targetDate,
        title: 'Homework 2',
        homeworkTasks: [{ learningArea: 'English', description: 'Task 2' }],
        status: 'PUBLISHED',
        teacherId: 'usr-teacher-02'
      });

      // Parent acknowledges entry 1 only
      await ediaryUseCases.acknowledgeEntry({
        entryId: entry1.id,
        guardianUserId: parentUser.id,
        guardianName: 'Mary Wanjiku',
        studentId: childGrade1.id,
        parentNote: 'Reviewed and completed math exercises with Faith.'
      });

      // Check Parent Feed
      const feed = await ediaryUseCases.getFeedForParent(
        { userId: parentUser.id, role: UserRole.GUARDIAN },
        { studentId: childGrade1.id, date: targetDate }
      );

      const feedEntry1 = feed.find((e: any) => e.id === entry1.id);
      const feedEntry2 = feed.find((e: any) => e.id === entry2.id);

      expect(feedEntry1?.isAcknowledgedByParent).toBe(true);
      expect(feedEntry1?.parentAcknowledgement?.parentNote).toBe(
        'Reviewed and completed math exercises with Faith.'
      );

      // Entry 2 is not signed
      expect(feedEntry2?.isAcknowledgedByParent).toBe(false);
      expect(feedEntry2?.parentAcknowledgement).toBeFalsy();
    });
  });
});
