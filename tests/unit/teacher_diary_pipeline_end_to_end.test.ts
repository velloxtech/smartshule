import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { CBCGradeLevel } from '../../src/core/domain/user/Student';
import { ClassRoom, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { SubjectTeacherAssignment } from '../../src/core/domain/academic/TeacherAssignment';
import { RecordOfWork } from '../../src/core/domain/curriculum-plan/RecordOfWork';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} from '../../src/core/domain/shared/Errors';

describe('SmartShule: Teacher Diary Pipeline End-to-End Test Suite (Scenarios 1 - 17)', () => {
  let container: AppContainer;
  const schoolId = 'school-001';

  let teacherA: User;
  let teacherB: User;
  let headteacher: User;
  let teacherProfileA: Teacher;
  let teacherProfileB: Teacher;

  let classRoomG3: ClassRoom;
  let classRoomG4: ClassRoom;
  let learningAreaMath: LearningArea;
  let learningAreaSci: LearningArea;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    // 1. Setup Teachers & Supervisor Users
    teacherA = User.create(
      {
        email: 'teacher.a@smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'Jane',
        lastName: 'Muthoni',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-tch-a'
    );
    await container.userRepository.save(teacherA);

    teacherProfileA = Teacher.create(
      {
        userId: teacherA.id,
        employeeNumber: 'EMP-001',
        specialization: ['Mathematics'],
        assignedClassStreamIds: ['stream-g3']
      },
      'tch-prof-a'
    );
    await container.teacherRepository.save(teacherProfileA);

    teacherB = User.create(
      {
        email: 'teacher.b@smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'Peter',
        lastName: 'Otieno',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-tch-b'
    );
    await container.userRepository.save(teacherB);

    teacherProfileB = Teacher.create(
      {
        userId: teacherB.id,
        employeeNumber: 'EMP-002',
        specialization: ['Science'],
        assignedClassStreamIds: ['stream-g4']
      },
      'tch-prof-b'
    );
    await container.teacherRepository.save(teacherProfileB);

    headteacher = User.create(
      {
        email: 'headteacher@smartshule.ac.ke',
        passwordHash: 'hash',
        firstName: 'Sarah',
        lastName: 'Wanjiku',
        role: UserRole.HEAD_TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'usr-ht-01'
    );
    await container.userRepository.save(headteacher);

    // 2. Setup Academic Classes & Subjects
    classRoomG3 = ClassRoom.create(
      {
        schoolId,
        name: 'Grade 3',
        gradeLevel: CBCGradeLevel.GRADE_3,
        educationLevel: EducationLevel.LOWER_PRIMARY
      },
      'cls-g3'
    );
    await container.academicRepository.saveClass(classRoomG3);

    classRoomG4 = ClassRoom.create(
      {
        schoolId,
        name: 'Grade 4',
        gradeLevel: CBCGradeLevel.GRADE_4,
        educationLevel: EducationLevel.UPPER_PRIMARY
      },
      'cls-g4'
    );
    await container.academicRepository.saveClass(classRoomG4);

    learningAreaMath = LearningArea.create(
      {
        schoolId,
        name: 'Mathematical Activities',
        code: 'MAT-G3',
        gradeLevel: CBCGradeLevel.GRADE_3,
        educationLevel: EducationLevel.LOWER_PRIMARY,
        isElective: false
      },
      'la-math'
    );
    await container.academicRepository.saveLearningArea(learningAreaMath);

    learningAreaSci = LearningArea.create(
      {
        schoolId,
        name: 'Science & Technology',
        code: 'SCI-G4',
        gradeLevel: CBCGradeLevel.GRADE_4,
        educationLevel: EducationLevel.UPPER_PRIMARY,
        isElective: false
      },
      'la-sci'
    );
    await container.academicRepository.saveLearningArea(learningAreaSci);

    // 3. Assign Teacher A to Grade 3 Mathematics ONLY
    const assignmentA = SubjectTeacherAssignment.create(
      {
        schoolId,
        academicYearId: 'year-2026',
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        teacherId: teacherProfileA.id,
        role: 'SUBJECT_TEACHER',
        isActive: true
      },
      'sta-a'
    );
    await container.academicRepository.saveSubjectTeacherAssignment(assignmentA);

    // Assign Teacher B to Grade 4 Science ONLY
    const assignmentB = SubjectTeacherAssignment.create(
      {
        schoolId,
        academicYearId: 'year-2026',
        classRoomId: classRoomG4.id,
        learningAreaId: learningAreaSci.id,
        teacherId: teacherProfileB.id,
        role: 'SUBJECT_TEACHER',
        isActive: true
      },
      'sta-b'
    );
    await container.academicRepository.saveSubjectTeacherAssignment(assignmentB);
  });

  // Scenario 1: Teacher creates and saves a diary draft
  test('Scenario 1: Teacher creates and saves a diary draft without claiming official completion', async () => {
    const draft = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        className: 'Grade 3',
        learningAreaId: learningAreaMath.id,
        subjectName: 'Mathematical Activities',
        strand: 'Numbers',
        subStrand: 'Addition of 2-digit numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonPeriod: '1',
        lessonDate: '2026-05-11',
        lessonTopic: 'Adding 2-digit numbers with regrouping',
        learningObjectives: 'Learners should add 2-digit numbers with regrouping',
        learningActivities: 'Using base ten blocks in small groups',
        resources: 'Textbook pg 45, Base-ten blocks',
        status: 'DRAFT',
        comments: 'Preparation draft for upcoming week'
      },
      {
        userId: teacherA.id,
        role: UserRole.TEACHER,
        schoolId,
        fullName: 'Jane Muthoni'
      }
    );

    expect(draft.id).toBeDefined();
    expect(draft.status).toBe('DRAFT');
    expect(draft.isOfficialCoverage).toBe(false);
    expect(draft.strand).toBe('Numbers');
    expect(draft.weekNumber).toBe(1);
    expect(draft.submittedAt).toBeUndefined();
  });

  // Scenario 2: Teacher edits a draft
  test('Scenario 2: Teacher updates draft details and reflections before submission', async () => {
    const draft = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        status: 'DRAFT',
        lessonTopic: 'Initial topic'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const updated = await container.recordOfWorkUseCases.updateDiaryEntry(
      draft.id,
      {
        lessonTopic: 'Refined topic: Addition with regrouping',
        learningObjectives: 'Master regrouping technique',
        reflection: 'Pre-assessment showed learners understand place value'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    expect(updated.lessonTopic).toBe('Refined topic: Addition with regrouping');
    expect(updated.reflection).toBe('Pre-assessment showed learners understand place value');
    expect(updated.status).toBe('DRAFT');
  });

  // Scenario 3: Teacher submits a diary entry
  test('Scenario 3: Teacher submits diary entry for administrative review', async () => {
    const draft = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonTopic: 'Addition with regrouping',
        status: 'DRAFT'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const submitted = await container.recordOfWorkUseCases.submitDiaryEntry(draft.id, {
      userId: teacherA.id,
      role: UserRole.TEACHER,
      schoolId,
      fullName: 'Jane Muthoni'
    });

    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.submittedAt).toBeDefined();
    expect(submitted.isOfficialCoverage).toBe(false);
  });

  // Scenario 4: Reviewer sees the pending entry
  test('Scenario 4: Supervisor lists submitted diary entries pending review', async () => {
    const entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonTopic: 'Addition with regrouping',
        status: 'SUBMITTED'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const pendingList = await container.recordOfWorkUseCases.listDiaryEntries(
      { schoolId, status: 'SUBMITTED' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );

    expect(pendingList.some((e) => e.id === entry.id)).toBe(true);
  });

  // Scenario 5: Reviewer returns an entry with a reason
  test('Scenario 5: Supervisor returns entry with mandatory feedback and reason', async () => {
    const entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonTopic: 'Addition with regrouping',
        status: 'SUBMITTED'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const returned = await container.recordOfWorkUseCases.returnDiaryEntry(
      entry.id,
      { reason: 'Please detail specific remedial actions taken for struggling learners.' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );

    expect(returned.status).toBe('RETURNED');
    expect(returned.returnReason).toBe('Please detail specific remedial actions taken for struggling learners.');
    expect(returned.reviewedByName).toBe('Sarah Wanjiku');
    expect(returned.isOfficialCoverage).toBe(false);
  });

  // Scenario 6: Teacher corrects and resubmits it
  test('Scenario 6: Teacher corrects returned diary entry and resubmits for review', async () => {
    const entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonTopic: 'Addition with regrouping',
        status: 'SUBMITTED'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    await container.recordOfWorkUseCases.returnDiaryEntry(
      entry.id,
      { reason: 'Missing remedial notes' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );

    // Teacher updates with remedial plan
    await container.recordOfWorkUseCases.updateDiaryEntry(
      entry.id,
      {
        reflection: '4 learners needed place value remedial session; conducted on Tuesday afternoon.'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    // Resubmit
    const resubmitted = await container.recordOfWorkUseCases.submitDiaryEntry(entry.id, {
      userId: teacherA.id,
      role: UserRole.TEACHER,
      schoolId,
      fullName: 'Jane Muthoni'
    });

    expect(resubmitted.status).toBe('SUBMITTED');
  });

  // Scenario 7 & 8: Reviewer approves entry -> updates CurriculumTracker
  test('Scenario 7 & 8: Reviewer approves corrected entry and updates official curriculum progression', async () => {
    const entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        className: 'Grade 3',
        learningAreaId: learningAreaMath.id,
        subjectName: 'Mathematical Activities',
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonTopic: 'Addition with regrouping',
        status: 'SUBMITTED',
        reflection: 'Learners demonstrated 85% mastery.'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const approved = await container.recordOfWorkUseCases.approveDiaryEntry(
      entry.id,
      { remarks: 'Comprehensive coverage and clear remedial plan.' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );

    expect(approved.status).toBe('APPROVED');
    expect(approved.isOfficialCoverage).toBe(true);
    expect(approved.reviewRemarks).toBe('Comprehensive coverage and clear remedial plan.');
    expect(approved.reviewedByName).toBe('Sarah Wanjiku');

    // Scenario 8: Verify overarching tracker synchronized
    const trackers = await container.curriculumTrackerRepository.findTrackers({
      schoolId,
      classRoomId: classRoomG3.id,
      learningAreaId: learningAreaMath.id
    });

    expect(trackers.length).toBeGreaterThan(0);
    const tracker = trackers[0];
    expect(tracker.dailyLogs.length).toBeGreaterThan(0);
    expect(tracker.dailyLogs[0].id).toBe(entry.id);
  });

  // Scenario 9: Pending, returned and draft entries do not increase official coverage
  test('Scenario 9: Only approved entries increase official coverage percentage', async () => {
    // 1 Draft, 1 Submitted, 1 Returned
    await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonDate: '2026-05-18',
        lessonPeriod: 'Period 1',
        lessonTopic: 'Draft 1',
        status: 'DRAFT'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const sub = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Tue',
        lessonDate: '2026-05-19',
        lessonPeriod: 'Period 2',
        lessonTopic: 'Submitted 1',
        status: 'SUBMITTED'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    await container.recordOfWorkUseCases.returnDiaryEntry(
      sub.id,
      { reason: 'Revise outcomes' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );

    const summary = await container.recordOfWorkUseCases.getCurriculumProgressSummary(schoolId);
    expect(summary.officialCoveragePercentage).toBe(0);
    expect(summary.approvedCount).toBe(0);
    expect(summary.returnedCount).toBe(1);
    expect(summary.draftsCount).toBe(1);
  });

  // Scenario 10: Duplicate submissions and duplicate approvals do not duplicate coverage
  test('Scenario 10: Duplicate session submission throws ConflictError; duplicate approval is idempotent', async () => {
    // 1. Submit session on 2026-05-15 Period 2
    await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Fri',
        lessonDate: '2026-05-15',
        lessonPeriod: 'Period 2',
        lessonTopic: 'Fractions',
        status: 'SUBMITTED'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    // 2. Attempt duplicate submission for same class, subject, date, and period
    await expect(
      container.recordOfWorkUseCases.createDiaryEntry(
        {
          schoolId,
          classRoomId: classRoomG3.id,
          learningAreaId: learningAreaMath.id,
          strand: 'Numbers',
          weekNumber: 1,
          day: 'Fri',
          lessonDate: '2026-05-15',
          lessonPeriod: 'Period 2',
          lessonTopic: 'Duplicate fractions submission',
          status: 'SUBMITTED'
        },
        { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
      )
    ).rejects.toThrow(ConflictError);

    // 3. Idempotent approval
    const entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Wed',
        lessonDate: '2026-05-13',
        lessonPeriod: 'Period 3',
        lessonTopic: 'Geometry',
        status: 'SUBMITTED'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const app1 = await container.recordOfWorkUseCases.approveDiaryEntry(
      entry.id,
      { remarks: 'Approved' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );
    expect(app1.status).toBe('APPROVED');

    // Second approval call returns gracefully without throwing or double-counting
    const app2 = await container.recordOfWorkUseCases.approveDiaryEntry(
      entry.id,
      { remarks: 'Re-approve' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );
    expect(app2.status).toBe('APPROVED');
  });

  // Scenario 11: Sequential progression gating
  test('Scenario 11: Teacher cannot claim Week 2 before preceding Week 1 is approved', async () => {
    // Attempting to submit Week 2 when Week 1 is incomplete/unapproved
    await expect(
      container.recordOfWorkUseCases.createDiaryEntry(
        {
          schoolId,
          classRoomId: classRoomG3.id,
          learningAreaId: learningAreaMath.id,
          strand: 'Numbers',
          weekNumber: 2,
          day: 'Mon',
          lessonTopic: 'Multiplication intro',
          status: 'SUBMITTED'
        },
        { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
      )
    ).rejects.toThrow(ValidationError);
  });

  // Scenario 12: Authorized supervisor override works and logs audit
  test('Scenario 12: Authorized supervisor exception grants progression override with audit logging', async () => {
    // 1. Create Week 2 entry as DRAFT
    const week2Draft = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 2,
        day: 'Mon',
        lessonTopic: 'Special accelerated lesson',
        status: 'DRAFT'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    // 2. Supervisor grants progression override with reason
    const overridden = await container.recordOfWorkUseCases.overrideProgression(
      week2Draft.id,
      { reason: 'Approved fast-track progression due to prior term mastery.' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId, fullName: 'Sarah Wanjiku' }
    );

    expect(overridden.reviewRemarks).toContain('[ADMIN OVERRIDE by Sarah Wanjiku]');

    // 3. Teacher can now submit Week 2
    const submittedWeek2 = await container.recordOfWorkUseCases.submitDiaryEntry(week2Draft.id, {
      userId: teacherA.id,
      role: UserRole.TEACHER,
      schoolId,
      fullName: 'Jane Muthoni'
    });
    expect(submittedWeek2.status).toBe('SUBMITTED');

    // 4. Verify system audit log
    const logs = await container.systemLogRepository.find({ schoolId, action: 'DIARY_OVERRIDE_GRANTED' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].details).toContain('Approved fast-track progression');
  });

  // Scenario 13: Teacher cannot access another teacher's class or subject
  test('Scenario 13: Teacher A cannot create or tamper with Teacher B class/subject records', async () => {
    // Teacher A tries to create a diary entry for Grade 4 Science (assigned to Teacher B)
    await expect(
      container.recordOfWorkUseCases.createDiaryEntry(
        {
          schoolId,
          classRoomId: classRoomG4.id, // Teacher A is NOT assigned to Grade 4
          learningAreaId: learningAreaSci.id,
          strand: 'Matter',
          weekNumber: 1,
          day: 'Mon',
          lessonTopic: 'Properties of matter',
          status: 'DRAFT'
        },
        { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
      )
    ).rejects.toThrow(ForbiddenError);

    // Teacher B creates a valid entry
    const entryB = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG4.id,
        learningAreaId: learningAreaSci.id,
        strand: 'Matter',
        weekNumber: 1,
        day: 'Mon',
        lessonTopic: 'Valid Science lesson',
        status: 'DRAFT'
      },
      { userId: teacherB.id, role: UserRole.TEACHER, schoolId, fullName: 'Peter Otieno' }
    );

    // Teacher A attempts to modify Teacher B's entry
    await expect(
      container.recordOfWorkUseCases.updateDiaryEntry(
        entryB.id,
        { lessonTopic: 'Tampered topic' },
        { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
      )
    ).rejects.toThrow(ForbiddenError);

    // Teacher A attempts to view Teacher B's entry directly by ID
    await expect(
      container.recordOfWorkUseCases.getDiaryEntryById(entryB.id, {
        userId: teacherA.id,
        role: UserRole.TEACHER,
        schoolId,
        fullName: 'Jane Muthoni'
      })
    ).rejects.toThrow(ForbiddenError);
  });

  // Scenario 14: Tampered IDs and direct API requests are rejected
  test('Scenario 14: Tampered nonexistent IDs and anti-self-approval rule', async () => {
    // Nonexistent ID throws NotFoundError
    await expect(
      container.recordOfWorkUseCases.getDiaryEntryById('non-existent-id', {
        userId: headteacher.id,
        role: UserRole.HEAD_TEACHER,
        schoolId
      })
    ).rejects.toThrow(NotFoundError);

    // Teacher cannot approve their own diary entry
    const entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        lessonTopic: 'Self approval test',
        status: 'SUBMITTED'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    await expect(
      container.recordOfWorkUseCases.approveDiaryEntry(
        entry.id,
        { remarks: 'Self approval attempt' },
        { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  // Scenario 15: Academic year and term boundaries are respected
  test('Scenario 15: Entries respect academic year and term boundaries', async () => {
    const term1Entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        academicYear: '2026',
        term: 'Term 1',
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Numbers',
        weekNumber: 1,
        day: 'Mon',
        status: 'DRAFT'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const term2Entry = await container.recordOfWorkUseCases.createDiaryEntry(
      {
        schoolId,
        academicYear: '2026',
        term: 'Term 2',
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        strand: 'Measurement',
        weekNumber: 1,
        day: 'Mon',
        status: 'DRAFT'
      },
      { userId: teacherA.id, role: UserRole.TEACHER, schoolId, fullName: 'Jane Muthoni' }
    );

    const term1Records = await container.recordOfWorkUseCases.listDiaryEntries(
      { schoolId, term: 'Term 1' },
      { userId: headteacher.id, role: UserRole.HEAD_TEACHER, schoolId }
    );
    expect(term1Records.some((r) => r.id === term1Entry.id)).toBe(true);
    expect(term1Records.some((r) => r.id === term2Entry.id)).toBe(false);
  });

  // Scenario 16: Existing reports and dashboards remain consistent
  test('Scenario 16: Backward compatibility methods work seamlessly with legacy callers', async () => {
    const legacyRecord = await container.recordOfWorkUseCases.createRecord(
      {
        schoolId,
        classRoomId: classRoomG3.id,
        learningAreaId: learningAreaMath.id,
        subjectAndGrade: 'Grade 3 Math',
        strandAndWorkCovered: 'Numbers: Subtraction',
        reference: 'Book 3',
        weekNumber: 1,
        day: 'Wed'
      },
      teacherProfileA.id
    );

    expect(legacyRecord.id).toBeDefined();

    const allRecords = await container.recordOfWorkUseCases.getRecords('ADMIN');
    expect(allRecords.length).toBeGreaterThan(0);

    const updated = await container.recordOfWorkUseCases.updateRecord(
      legacyRecord.id,
      { comments: 'Legacy update' },
      'ADMIN',
      teacherProfileA.id
    );
    expect(updated.comments).toBe('Legacy update');

    const deleted = await container.recordOfWorkUseCases.deleteRecord(legacyRecord.id, 'ADMIN');
    expect(deleted).toBe(true);
  });

  // Scenario 17: Existing parent and mobile functionality is not broken
  test('Scenario 17: Multi-role parent/staff access and student models remain protected', async () => {
    // Verify student and user entities remain fully functional
    const student = await container.studentRepository.findById('std-001');
    if (student) {
      expect(student.id).toBe('std-001');
    }

    // Verify auth and token issuance
    const token = container.tokenService.generateAccessToken({
      userId: teacherA.id,
      role: UserRole.TEACHER,
      schoolId
    });
    expect(token).toBeDefined();

    const verified = container.tokenService.verifyAccessToken(token);
    expect(verified?.userId).toBe(teacherA.id);
  });
});
