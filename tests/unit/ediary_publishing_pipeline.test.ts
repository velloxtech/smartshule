import { EDiaryUseCases } from '../../src/application/ediary/EDiaryUseCases';
import { EDiaryEntry } from '../../src/core/domain/ediary/EDiaryEntry';
import { InMemoryEDiaryRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { InMemoryStudentRepository, InMemoryTeacherRepository, InMemoryGuardianRepository, InMemoryUserRepository, InMemoryAcademicRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ValidationError, ForbiddenError } from '../../src/core/domain/shared/Errors';

describe('E-Diary Module End-to-End Pipeline & Publishing Tests', () => {
  let ediaryRepo: InMemoryEDiaryRepository;
  let studentRepo: InMemoryStudentRepository;
  let guardianRepo: InMemoryGuardianRepository;
  let userRepo: InMemoryUserRepository;
  let academicRepo: InMemoryAcademicRepository;
  let ediaryUseCases: EDiaryUseCases;

  const schoolId = 'school-001';
  const streamId = 'stream-4a';
  const classRoomId = 'class-g4';
  const teacherUserId = 'usr-teacher-01';
  const parentUserId = 'usr-parent-01';
  const otherParentUserId = 'usr-parent-other';
  const studentId = 'std-learner-01';
  const otherStudentId = 'std-learner-02';

  beforeEach(async () => {
    ediaryRepo = new InMemoryEDiaryRepository();
    studentRepo = new InMemoryStudentRepository();
    guardianRepo = new InMemoryGuardianRepository();
    userRepo = new InMemoryUserRepository();
    academicRepo = new InMemoryAcademicRepository();

    // 1. Setup Academic Period
    const year = AcademicYear.create(
      {
        name: '2026',
        startDate: '2026-01-05',
        endDate: '2026-11-20',
        schoolId,
        isCurrent: true
      },
      'year-2026'
    );
    await academicRepo.saveYear(year);

    const term = AcademicTerm.create(
      {
        name: 'Term 3',
        termNumber: 3,
        startDate: '2026-09-01',
        endDate: '2026-11-20',
        academicYearId: year.id,
        isCurrent: true
      },
      'term-2026-t3'
    );
    await academicRepo.saveTerm(term);

    // 2. Setup Teacher User
    const teacherUser = User.create(
      {
        email: 'teacher.grace@smartshule.ac.ke',
        firstName: 'Grace',
        lastName: 'Muthoni',
        role: UserRole.TEACHER,
        passwordHash: 'hash',
        schoolId,
        status: UserStatus.ACTIVE
      },
      teacherUserId
    );
    await userRepo.save(teacherUser);

    // 3. Setup Parent User & Guardian Profile
    const parentUser = User.create(
      {
        email: 'parent.mary@gmail.com',
        firstName: 'Mary',
        lastName: 'Wanjiku',
        role: UserRole.GUARDIAN,
        passwordHash: 'hash',
        schoolId,
        status: UserStatus.ACTIVE
      },
      parentUserId
    );
    await userRepo.save(parentUser);

    const guardian = Guardian.create(
      {
        userId: parentUserId,
        relationship: GuardianRelationship.MOTHER,
        emergencyContact: '+254711223344',
        studentIds: [studentId]
      },
      'grd-001'
    );
    await guardianRepo.save(guardian);

    // 4. Setup Other Parent (Data Isolation)
    const otherParentUser = User.create(
      {
        email: 'other.parent@gmail.com',
        firstName: 'Peter',
        lastName: 'Otieno',
        role: UserRole.GUARDIAN,
        passwordHash: 'hash',
        schoolId,
        status: UserStatus.ACTIVE
      },
      otherParentUserId
    );
    await userRepo.save(otherParentUser);

    const otherGuardian = Guardian.create(
      {
        userId: otherParentUserId,
        relationship: GuardianRelationship.FATHER,
        emergencyContact: '+254799887766',
        studentIds: [otherStudentId]
      },
      'grd-002'
    );
    await guardianRepo.save(otherGuardian);

    // 5. Setup Students
    const student = Student.create(
      {
        admissionNumber: '0201',
        firstName: 'Kevin',
        lastName: 'Kamau',
        dateOfBirth: '2016-04-12',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        streamId,
        schoolId,
        academicYearId: year.id,
        guardianIds: ['grd-001'],
        status: StudentStatus.ACTIVE
      },
      studentId
    );
    await studentRepo.save(student);

    const otherStudent = Student.create(
      {
        admissionNumber: '0202',
        firstName: 'Brian',
        lastName: 'Otieno',
        dateOfBirth: '2016-07-20',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        streamId: 'stream-other',
        schoolId,
        academicYearId: year.id,
        guardianIds: ['grd-002'],
        status: StudentStatus.ACTIVE
      },
      otherStudentId
    );
    await studentRepo.save(otherStudent);

    // 6. Instantiate Use Cases
    ediaryUseCases = new EDiaryUseCases(
      ediaryRepo,
      studentRepo,
      guardianRepo,
      userRepo,
      academicRepo
    );
  });

  describe('1. Successful E-Diary Publishing', () => {
    it('successfully publishes a class stream eDiary entry with homeworkTasks, teacherRemarks and tomorrowRequirements', async () => {
      const result = await ediaryUseCases.createEntry({
        schoolId,
        classRoomId,
        streamId,
        date: '2026-11-02',
        homeworkTasks: [
          {
            learningArea: 'Science & Technology',
            description: 'Collect 3 different soil samples and label them A, B, and C',
            dueDate: '2026-11-03'
          },
          {
            learningArea: 'Mathematics Activities',
            description: 'Page 52 Exercise 3: Questions 1 to 8',
            dueDate: '2026-11-03'
          }
        ],
        teacherRemarks: 'Learners performed exceptionally well in the group reading session today.',
        tomorrowRequirements: ['Manila paper', 'Pair of scissors', 'Glue stick'],
        teacherId: teacherUserId
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('PUBLISHED');
      expect(result.teacherName).toBe('Grace Muthoni');
      expect(result.teacherUserId).toBe(teacherUserId);
      expect(result.homeworkTasks.length).toBe(2);
      expect(result.homeworkTasks[0].learningArea).toBe('Science & Technology');
      expect(result.tomorrowRequirements).toEqual(['Manila paper', 'Pair of scissors', 'Glue stick']);
      expect(result.requirementsTomorrow).toBe('Manila paper, Pair of scissors, Glue stick');
      expect(result.teacherRemarks).toContain('group reading session');
      // Homework summary synthesized for backward compatibility and WhatsApp
      expect(result.homework).toContain('Science & Technology: Collect 3 different soil samples');
      expect(result.academicYearId).toBe('year-2026');
      expect(result.termId).toBe('term-2026-t3');

      // Verify persistence in repository
      const saved = await ediaryRepo.findById(result.id);
      expect(saved).not.toBeNull();
      expect(saved?.streamId).toBe(streamId);
      expect(saved?.homeworkTasks.length).toBe(2);
    });

    it('supports backward-compatible legacy payload with title and string homework details', async () => {
      const result = await ediaryUseCases.createEntry({
        schoolId,
        streamId,
        date: '2026-11-02',
        title: 'Legacy Title - Daily Homework',
        homework: 'Revise Kiswahili grammar rules page 20',
        requirementsTomorrow: 'Exercise book, Blue pen',
        teacherId: teacherUserId
      });

      expect(result.title).toBe('Legacy Title - Daily Homework');
      expect(result.homework).toBe('Revise Kiswahili grammar rules page 20');
      expect(result.homeworkTasks.length).toBe(1);
      expect(result.homeworkTasks[0].description).toBe('Revise Kiswahili grammar rules page 20');
      expect(result.tomorrowRequirements).toEqual(['Exercise book', 'Blue pen']);
    });
  });

  describe('2. Validation Failures and Error Reporting', () => {
    it('rejects submissions with missing date', async () => {
      await expect(
        ediaryUseCases.createEntry({
          schoolId,
          streamId,
          date: '',
          homeworkTasks: [{ learningArea: 'Math', description: 'Page 1' }],
          teacherId: teacherUserId
        })
      ).rejects.toThrow(ValidationError);
    });

    it('rejects submissions with missing streamId', async () => {
      await expect(
        ediaryUseCases.createEntry({
          schoolId,
          streamId: '',
          date: '2026-11-02',
          homeworkTasks: [{ learningArea: 'Math', description: 'Page 1' }],
          teacherId: teacherUserId
        })
      ).rejects.toThrow(ValidationError);
    });

    it('rejects submissions when neither homework tasks, homework text, nor remarks are provided', async () => {
      await expect(
        ediaryUseCases.createEntry({
          schoolId,
          streamId,
          date: '2026-11-02',
          homeworkTasks: [],
          teacherRemarks: '',
          teacherId: teacherUserId
        })
      ).rejects.toThrow('At least one homework task or teacher remark is required');
    });
  });

  describe('3. Idempotency & Duplicate Prevention', () => {
    it('supports multiple distinct entries on the same date and updates specific entry when id is provided', async () => {
      // First submission
      const entry1 = await ediaryUseCases.createEntry({
        schoolId,
        streamId,
        date: '2026-11-02',
        title: 'Morning English',
        homeworkTasks: [{ learningArea: 'English', description: 'Read Chapter 4' }],
        teacherRemarks: 'Initial note',
        tomorrowRequirements: ['Dictionary'],
        teacherId: teacherUserId
      });

      // Second submission for the same stream & date without id creates a distinct new entry
      const entry2 = await ediaryUseCases.createEntry({
        schoolId,
        streamId,
        date: '2026-11-02',
        title: 'Afternoon Mathematics',
        homeworkTasks: [
          { learningArea: 'Mathematics', description: 'Exercise 5 page 22' }
        ],
        teacherRemarks: 'Please bring math compass tomorrow',
        tomorrowRequirements: ['Math Compass'],
        teacherId: teacherUserId
      });

      // Each new submission has its own distinct ID (never overwriting)
      expect(entry2.id).not.toBe(entry1.id);

      // Verify BOTH entries exist in the repository for this stream and date
      const allEntries = await ediaryRepo.findByStream(streamId, '2026-11-02');
      expect(allEntries.length).toBe(2);
      expect(allEntries.map((e) => e.id)).toContain(entry1.id);
      expect(allEntries.map((e) => e.id)).toContain(entry2.id);

      // Updating a specific entry in-place requires providing its explicit ID
      const updatedEntry1 = await ediaryUseCases.createEntry({
        id: entry1.id,
        schoolId,
        streamId,
        date: '2026-11-02',
        title: 'Morning English (Updated)',
        homeworkTasks: [
          { learningArea: 'English', description: 'Read Chapter 4 & 5' }
        ],
        teacherRemarks: 'Updated note for English',
        tomorrowRequirements: ['Dictionary', 'Notebook'],
        teacherId: teacherUserId
      });

      expect(updatedEntry1.id).toBe(entry1.id);
      expect(updatedEntry1.title).toBe('Morning English (Updated)');

      // Verify entry2 remained completely unaffected
      const finalEntries = await ediaryRepo.findByStream(streamId, '2026-11-02');
      expect(finalEntries.length).toBe(2);
      const retrievedEntry2 = finalEntries.find((e) => e.id === entry2.id);
      expect(retrievedEntry2?.teacherRemarks).toBe('Please bring math compass tomorrow');
    });
  });

  describe('4. Draft Saving & Subsequent Publishing Workflow', () => {
    it('allows saving an eDiary entry as DRAFT and subsequent publishing to class stream', async () => {
      // 1. Teacher saves as DRAFT
      const draft = await ediaryUseCases.createEntry({
        schoolId,
        streamId,
        date: '2026-11-05',
        homeworkTasks: [{ learningArea: 'Art & Craft', description: 'Draft task - collect leaves' }],
        teacherRemarks: 'Draft note',
        status: 'DRAFT',
        teacherId: teacherUserId
      });

      expect(draft.status).toBe('DRAFT');

      // 2. Teacher can see DRAFT entries in stream view
      const teacherStreamView = await ediaryUseCases.listEntriesForStream(streamId, '2026-11-05', {
        userId: teacherUserId,
        role: UserRole.TEACHER
      });
      expect(teacherStreamView.length).toBe(1);
      expect(teacherStreamView[0].status).toBe('DRAFT');

      // 3. Parent CANNOT see DRAFT entries (isolated from unfinished drafts)
      const parentViewBefore = await ediaryUseCases.listEntriesForStudent(studentId, {
        userId: parentUserId,
        role: UserRole.GUARDIAN
      });
      expect(parentViewBefore.some(e => e.id === draft.id)).toBe(false);

      // 4. Teacher completes and publishes the entry
      const published = await ediaryUseCases.createEntry({
        id: draft.id,
        schoolId,
        streamId,
        date: '2026-11-05',
        homeworkTasks: [
          { learningArea: 'Art & Craft', description: 'Collect 5 leaves and press them in a book' },
          { learningArea: 'Music', description: 'Practice patriotic song verse 1' }
        ],
        teacherRemarks: 'Finalized homework assignment',
        status: 'PUBLISHED',
        teacherId: teacherUserId
      });

      expect(published.status).toBe('PUBLISHED');
      expect(published.id).toBe(draft.id);

      // 5. Parent can NOW see the PUBLISHED entry
      const parentViewAfter = await ediaryUseCases.listEntriesForStudent(studentId, {
        userId: parentUserId,
        role: UserRole.GUARDIAN
      });
      const studentEntry = parentViewAfter.find(e => e.id === draft.id);
      expect(studentEntry).toBeDefined();
      expect(studentEntry?.status).toBe('PUBLISHED');
      expect(studentEntry?.homeworkTasks.length).toBe(2);
    });
  });

  describe('5. Data Isolation & Parent Authorization', () => {
    it('prevents guardians from viewing stream entries of classes their child is not enrolled in', async () => {
      // Create diary entry for stream 'stream-other'
      await ediaryUseCases.createEntry({
        schoolId,
        streamId: 'stream-other',
        date: '2026-11-02',
        homeworkTasks: [{ learningArea: 'Social Studies', description: 'Map of Kenya' }],
        teacherId: teacherUserId
      });

      // Parent Wanjiku (linked only to Kevin Kamau in stream-4a) attempts to view stream-other
      await expect(
        ediaryUseCases.listEntriesForStream('stream-other', undefined, {
          userId: parentUserId,
          role: UserRole.GUARDIAN
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('prevents guardians from accessing student entries of unlinked learners', async () => {
      // Parent Wanjiku attempts to query otherStudentId (Brian Otieno)
      await expect(
        ediaryUseCases.listEntriesForStudent(otherStudentId, {
          userId: parentUserId,
          role: UserRole.GUARDIAN
        })
      ).rejects.toThrow('Access denied: You are only permitted to view eDiary entries for your linked children');
    });

    it('allows teachers to delete only their own diary entries while admins can delete any', async () => {
      const entry = await ediaryUseCases.createEntry({
        schoolId,
        streamId,
        date: '2026-11-02',
        homeworkTasks: [{ learningArea: 'Kiswahili', description: 'Kusoma ukurasa 12' }],
        teacherId: teacherUserId
      });

      // Other teacher cannot delete
      await expect(
        ediaryUseCases.deleteEntry(entry.id, { userId: 'other-teacher', role: UserRole.TEACHER })
      ).rejects.toThrow(ForbiddenError);

      // Original teacher can delete
      await ediaryUseCases.deleteEntry(entry.id, { userId: teacherUserId, role: UserRole.TEACHER });
      const deleted = await ediaryRepo.findById(entry.id);
      expect(deleted).toBeNull();
    });
  });

  describe('6. Digital Parent Acknowledgement & Signing', () => {
    it('allows a guardian to digitally acknowledge an entry without requiring manual studentId parameter', async () => {
      const entry = await ediaryUseCases.createEntry({
        schoolId,
        streamId,
        date: '2026-11-02',
        homeworkTasks: [{ learningArea: 'CRE', description: 'Read story of David and Goliath' }],
        teacherRemarks: 'Great listening skills shown today.',
        teacherId: teacherUserId
      });

      // Guardian signs the entry without passing studentId (auto-resolved from stream enrollment)
      const ackResult = await ediaryUseCases.acknowledgeEntry({
        entryId: entry.id,
        guardianUserId: parentUserId,
        parentNote: 'Reviewed story with Kevin. Well done!'
      });

      expect(ackResult.success).toBe(true);
      expect(ackResult.entry.parentAcknowledgements.length).toBe(1);
      const ack = ackResult.entry.parentAcknowledgements[0];
      expect(ack.guardianName).toBe('Mary Wanjiku');
      expect(ack.parentNote).toBe('Reviewed story with Kevin. Well done!');
      expect(ack.signedAt).toBeDefined();

      // Verify that querying student entries reflects the signature
      const studentEntries = await ediaryUseCases.listEntriesForStudent(studentId, {
        userId: parentUserId,
        role: UserRole.GUARDIAN
      });
      const acknowledged = studentEntries.find(e => e.id === entry.id);
      expect(acknowledged?.isAcknowledgedByParent).toBe(true);
      expect(acknowledged?.parentAcknowledgement?.note).toBe('Reviewed story with Kevin. Well done!');
    });

    it('updates existing acknowledgment if guardian signs again instead of duplicating signature', async () => {
      const entry = await ediaryUseCases.createEntry({
        schoolId,
        streamId,
        date: '2026-11-02',
        homeworkTasks: [{ learningArea: 'Music', description: 'Sing verse 2' }],
        teacherId: teacherUserId
      });

      // First sign
      await ediaryUseCases.acknowledgeEntry({
        entryId: entry.id,
        guardianUserId: parentUserId,
        parentNote: 'First signature note'
      });

      // Second sign (e.g. updated parent note)
      const res2 = await ediaryUseCases.acknowledgeEntry({
        entryId: entry.id,
        guardianUserId: parentUserId,
        parentNote: 'Updated parent feedback note'
      });

      expect(res2.entry.parentAcknowledgements.length).toBe(1);
      expect(res2.entry.parentAcknowledgements[0].parentNote).toBe('Updated parent feedback note');
    });
  });
});
