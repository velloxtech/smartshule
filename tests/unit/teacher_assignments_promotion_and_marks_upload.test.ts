import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { PerformanceLevel } from '../../src/core/domain/cbc/CbcAssessment';
import { ForbiddenError, ValidationError } from '../../src/core/domain/shared/Errors';
import { TeacherAssignmentAccess } from '../../src/application/shared/TeacherAssignmentAccess';
import { teacherAssignmentGuard } from '../../src/infrastructure/http/middlewares/teacherAssignmentGuard';
import { CBCAssessmentController } from '../../src/infrastructure/http/controllers/CbcAssessmentController';
import { Timetable } from '../../src/core/domain/timetable/Timetable';
import { CalendarPlanningController } from '../../src/infrastructure/http/controllers/CalendarPlanningController';

async function publishProposal(container: AppContainer, areaId: string, result: any, schoolId: string): Promise<any> {
 if(!result.proposalId)return result;
 const actor={userId:'curriculum-reviewer',role:UserRole.ADMIN,schoolId};
 const queue=await container.curriculumProposals.list(actor,areaId);
 const reviewed=await container.curriculumProposals.review(actor,areaId,result.proposalId,queue.revision,true,'Validated curriculum for the assigned learning area');
 const p=reviewed.proposals.find((p:any)=>p.id===result.proposalId);
 return {...result,id:p.publishedId};
}

describe('Teacher Assignments, Class Promotion Continuity, and Marks Upload Pipeline', () => {
  let container: AppContainer;
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-1';

  let adminUser: User;
  let teacherUser1: User;
  let teacherUser2: User;
  let teacherUser3: User;
  let teacher1: Teacher;
  let teacher2: Teacher;
  let teacher3: Teacher;
  let g7Class: ClassRoom;
  let g7StreamA: Stream;
  let g8Class: ClassRoom;
  let g8StreamA: Stream;
  let mathSubject: LearningArea;
  let engSubject: LearningArea;
  let student1: Student;
  let student2: Student;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    // 2. Setup Users & Teachers
    adminUser = User.create(
      {
        email: 'admin@school.com',
        passwordHash: 'hash',
        firstName: 'Principal',
        lastName: 'Otieno',
        role: UserRole.HEAD_TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'user-admin-1'
    );
    await container.userRepository.save(adminUser);

    teacherUser1 = User.create(
      {
        email: 'teacher1@school.com',
        passwordHash: 'hash',
        firstName: 'Grace',
        lastName: 'Achieng',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'user-tch-1'
    );
    await container.userRepository.save(teacherUser1);

    teacher1 = Teacher.create(
      {
        userId: 'user-tch-1',
        employeeNumber: 'EMP-001',
        tscNumber: 'TSC-1001',
        specialization: ['Mathematics', 'Science'],
        assignedClassStreamIds: []
      },
      'teacher-1'
    );
    await container.teacherRepository.save(teacher1);

    teacherUser2 = User.create(
      {
        email: 'teacher2@school.com',
        passwordHash: 'hash',
        firstName: 'David',
        lastName: 'Kamau',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'user-tch-2'
    );
    await container.userRepository.save(teacherUser2);

    teacher2 = Teacher.create(
      {
        userId: 'user-tch-2',
        employeeNumber: 'EMP-002',
        tscNumber: 'TSC-1002',
        specialization: ['English', 'Social Studies'],
        assignedClassStreamIds: []
      },
      'teacher-2'
    );
    await container.teacherRepository.save(teacher2);

    teacherUser3 = User.create(
      {
        email: 'teacher3@school.com',
        passwordHash: 'hash',
        firstName: 'Faith',
        lastName: 'Mutua',
        role: UserRole.TEACHER,
        schoolId,
        status: UserStatus.ACTIVE
      },
      'user-tch-3'
    );
    await container.userRepository.save(teacherUser3);

    teacher3 = Teacher.create(
      {
        userId: 'user-tch-3',
        employeeNumber: 'EMP-003',
        tscNumber: 'TSC-1003',
        specialization: ['Creative Arts'],
        assignedClassStreamIds: []
      },
      'teacher-3'
    );
    await container.teacherRepository.save(teacher3);

    // 3. Setup Classrooms & Streams
    g7Class = ClassRoom.create(
      {
        name: 'Grade 7',
        gradeLevel: CBCGradeLevel.GRADE_7,
        educationLevel: EducationLevel.JUNIOR_SCHOOL,
        schoolId
      },
      'class-g7'
    );
    await container.academicRepository.saveClass(g7Class);

    g7StreamA = Stream.create(
      {
        classRoomId: 'class-g7',
        name: 'A',
        capacity: 45
      },
      'stream-g7-a'
    );
    await container.academicRepository.saveStream(g7StreamA);

    g8Class = ClassRoom.create(
      {
        name: 'Grade 8',
        gradeLevel: CBCGradeLevel.GRADE_8,
        educationLevel: EducationLevel.JUNIOR_SCHOOL,
        schoolId
      },
      'class-g8'
    );
    await container.academicRepository.saveClass(g8Class);

    g8StreamA = Stream.create(
      {
        classRoomId: 'class-g8',
        name: 'A',
        capacity: 45
      },
      'stream-g8-a'
    );
    await container.academicRepository.saveStream(g8StreamA);

    // 4. Setup Subjects / Learning Areas
    mathSubject = LearningArea.create(
      {
        name: 'Mathematics',
        code: 'MATH',
        gradeLevel: CBCGradeLevel.GRADE_7,
        educationLevel: EducationLevel.JUNIOR_SCHOOL,
        isElective: false,
        schoolId
      },
      'la-math'
    );
    await container.academicRepository.saveLearningArea(mathSubject);

    engSubject = LearningArea.create(
      {
        name: 'English Language',
        code: 'ENG',
        gradeLevel: CBCGradeLevel.GRADE_7,
        educationLevel: EducationLevel.JUNIOR_SCHOOL,
        isElective: false,
        schoolId
      },
      'la-eng'
    );
    await container.academicRepository.saveLearningArea(engSubject);

    // 5. Setup Students in Grade 7 Stream A
    student1 = Student.create(
      {
        admissionNumber: 'G7-001',
        firstName: 'Brian',
        lastName: 'Ochieng',
        dateOfBirth: '2013-05-10',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_7,
        classroomId: 'class-g7',
        streamId: 'stream-g7-a',
        guardianIds: [],
        schoolId,
        academicYearId,
        status: StudentStatus.ACTIVE
      },
      'student-1'
    );
    await container.studentRepository.save(student1);

    student2 = Student.create(
      {
        admissionNumber: 'G7-002',
        firstName: 'Alice',
        lastName: 'Wambui',
        dateOfBirth: '2013-08-22',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_7,
        classroomId: 'class-g7',
        streamId: 'stream-g7-a',
        guardianIds: [],
        schoolId,
        academicYearId,
        status: StudentStatus.ACTIVE
      },
      'student-2'
    );
    await container.studentRepository.save(student2);
  });

  // ==========================================
  // PART 1: CLASS-TEACHER ASSIGNMENT & REASSIGNMENT
  // ==========================================
  describe('Part 1: Class-Teacher Assignment & Reassignment', () => {
    it('extends a term and its published teaching calendar without losing existing lesson dates or exceptions', async () => {
      const extensionTerm = termId;
      await container.academicRepository.saveTerm(AcademicTerm.create({ academicYearId, name: 'Term 1', termNumber: 1, startDate: '2026-11-02', endDate: '2026-11-06', isCurrent: false }, extensionTerm));
      const actor = { userId: adminUser.id, role: adminUser.role, schoolId, email: adminUser.email! };
      const scope = { schoolId, academicYearId, termId: extensionTerm, classRoomId: 'class-g7', learningAreaId: 'la-math' };
      await container.timetableRepository.save(Timetable.create({ schoolId, academicYearId, termId: extensionTerm, classRoomId: 'class-g7', isActive: true, slots: [{ id: 'monday-math', dayOfWeek: 'MONDAY', periodNumber: 1, startTime: '08:00', endTime: '08:40', learningAreaId: 'la-math', isBreak: false, isLunch: false }] }, 'extension-timetable'));
      await container.calendarPlanning.saveCalendar(actor, scope, { startDate: '2026-11-02', endDate: '2026-11-06', teachingDays: [1,2,3,4,5], exceptions: [{ date: '2026-11-03', kind: 'ACTIVITY', reason: 'School activity' }], published: true }, 0);
      const before = await container.calendarPlanning.slots(actor, scope);
      const updated = await container.academicUseCases.updateAcademicTerm(extensionTerm, { endDate: '2026-11-20' }, actor);
      expect(updated.startDate).toBe('2026-11-02');
      expect(updated.endDate).toBe('2026-11-20');
      const calendar = await container.calendarPlanning.calendar(actor, scope);
      expect(calendar?.data.endDate).toBe('2026-11-20');
      expect(calendar?.data.published).toBe(true);
      expect(calendar?.data.exceptions).toHaveLength(1);
      const after = await container.calendarPlanning.slots(actor, scope);
      expect(after.slots.map(s => s.date)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
      expect(after.slots[0].id).toBe(before.slots[0].id);
      expect(after.fingerprint).not.toBe(before.fingerprint);
      for (const endDate of ['2026-11-01', '2026-11-02', '2026-02-30']) await expect(container.academicUseCases.updateAcademicTerm(extensionTerm, { endDate }, actor)).rejects.toThrow(ValidationError);
      await expect(container.academicUseCases.updateAcademicTerm(extensionTerm, { endDate: '2026-11-27' }, { ...actor, schoolId: 'other-school' })).rejects.toThrow(ForbiddenError);
      await expect(container.academicUseCases.updateAcademicTerm(extensionTerm, { endDate: '2026-11-27' }, { ...actor, role: UserRole.TEACHER, schoolId })).rejects.toThrow(ForbiddenError);
      expect((await container.academicRepository.findTermById(extensionTerm))?.endDate).toBe('2026-11-20');
    });

    it('transfers a teacher to another class with one active duty and preserves history', async () => {
      const actor = { userId: adminUser.id, email: adminUser.email!, role: adminUser.role };
      const base = { schoolId, academicYearId, teacherId: 'teacher-1', effectiveFrom: '2026-01-05' };
      await container.academicUseCases.assignClassTeacher({ ...base, classRoomId: 'class-g7', streamId: 'stream-g7-a' }, actor);
      const moved = await container.academicUseCases.assignClassTeacher({ ...base, classRoomId: 'class-g8', streamId: 'stream-g8-a', effectiveFrom: '2026-03-01' }, actor);
      // Repeating the same assignment must remain idempotent.
      const repeated = await container.academicUseCases.assignClassTeacher({ ...base, classRoomId: 'class-g8', streamId: 'stream-g8-a' }, actor);
      expect(repeated.id).toBe(moved.id);
      const history = await container.academicRepository.findClassTeacherAssignments({ schoolId, academicYearId, teacherId: 'teacher-1' });
      expect(history.filter(a => a.isActive).map(a => a.id)).toEqual([moved.id]);
      expect(history.find(a => a.classRoomId === 'class-g7')?.effectiveTo).toBe('2026-03-01');
      expect((await container.academicRepository.findStreamById('stream-g7-a'))?.classTeacherId).toBeUndefined();
      expect((await container.academicRepository.findStreamById('stream-g8-a'))?.classTeacherId).toBe('teacher-1');
      expect((await container.teacherRepository.findById('teacher-1'))?.assignedClassStreamIds).toEqual(['stream-g8-a']);
    });

    it('enforces the same transfer rule through the legacy stream assignment endpoint', async () => {
      await container.teacherUseCases.assignStream({ teacherId: 'teacher-1', streamId: 'stream-g7-a' });
      await container.teacherUseCases.assignStream({ teacherId: 'teacher-1', streamId: 'stream-g8-a' });
      const active = await container.academicRepository.findClassTeacherAssignments({ schoolId, academicYearId, teacherId: 'teacher-1', isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].streamId).toBe('stream-g8-a');
      expect((await container.academicRepository.findStreamById('stream-g7-a'))?.classTeacherId).toBeUndefined();
    });

    it('transfers duty when creating a stream with a teacher and when switching to class-wide duty', async () => {
      await container.teacherUseCases.assignStream({ teacherId: 'teacher-1', streamId: 'stream-g7-a' });
      const stream = await container.academicUseCases.createStream({ classRoomId: 'class-g8', name: 'New', capacity: 30, classTeacherId: 'teacher-1' });
      expect(stream.classTeacherId).toBe('teacher-1');
      let active = await container.academicRepository.findClassTeacherAssignments({ schoolId, academicYearId, teacherId: 'teacher-1', isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].streamId).toBe(stream.id);
      await container.academicUseCases.assignClassTeacher({ schoolId, academicYearId, teacherId: 'teacher-1', classRoomId: 'class-g8' });
      active = await container.academicRepository.findClassTeacherAssignments({ schoolId, academicYearId, teacherId: 'teacher-1', isActive: true });
      expect(active).toHaveLength(1);
      expect(active[0].streamId).toBeUndefined();
      expect((await container.academicRepository.findStreamById(stream.id))?.classTeacherId).toBeUndefined();
      expect((await container.teacherRepository.findById('teacher-1'))?.assignedClassStreamIds).toEqual([]);
    });

    it('should assign a teacher as active class teacher for a stream and academic year', async () => {
      const assignment = await container.academicUseCases.assignClassTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          teacherId: 'teacher-1',
          effectiveFrom: '2026-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      expect(assignment).toBeDefined();
      expect(assignment.teacherId).toBe('teacher-1');
      expect(assignment.isActive).toBe(true);
      expect(assignment.effectiveFrom).toBe('2026-01-05');

      // Verify stream was synchronized
      const stream = await container.academicRepository.findStreamById('stream-g7-a');
      expect(stream?.classTeacherId).toBe('teacher-1');

      // Verify teacher was synchronized
      const teacher = await container.teacherRepository.findById('teacher-1');
      expect(teacher?.assignedClassStreamIds).toContain('stream-g7-a');
    });

    it('should safely reassign class teacher: deactivates old assignment with effectiveTo, preserves history, and activates new', async () => {
      // 1. Initial assignment: Teacher 1
      await container.academicUseCases.assignClassTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          teacherId: 'teacher-1',
          effectiveFrom: '2026-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      // 2. Reassignment: Teacher 2 replaces Teacher 1 on 2026-03-01
      const newAssignment = await container.academicUseCases.assignClassTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          teacherId: 'teacher-2',
          effectiveFrom: '2026-03-01',
          reason: 'Mid-term educator transition'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      expect(newAssignment.teacherId).toBe('teacher-2');
      expect(newAssignment.isActive).toBe(true);

      // 3. Query all assignments for this stream (both active and historical)
      const allAssignments = await container.academicRepository.findClassTeacherAssignments({
        schoolId,
        academicYearId,
        classRoomId: 'class-g7',
        streamId: 'stream-g7-a'
      });

      expect(allAssignments.length).toBe(2);

      // Teacher 1 assignment is now inactive with effectiveTo recorded
      const oldAssignment = allAssignments.find(a => a.teacherId === 'teacher-1');
      expect(oldAssignment?.isActive).toBe(false);
      expect(oldAssignment?.effectiveTo).toBe('2026-03-01');

      // Teacher 2 assignment is active
      const activeAssignment = allAssignments.find(a => a.teacherId === 'teacher-2');
      expect(activeAssignment?.isActive).toBe(true);

      // Stream updated to Teacher 2
      const stream = await container.academicRepository.findStreamById('stream-g7-a');
      expect(stream?.classTeacherId).toBe('teacher-2');
    });

    it('should reject class teacher assignment from unauthorized roles', async () => {
      await expect(
        container.academicUseCases.assignClassTeacher(
          {
            schoolId,
            academicYearId,
            classRoomId: 'class-g7',
            streamId: 'stream-g7-a',
            teacherId: 'teacher-1'
          },
          { userId: teacherUser1.id, email: teacherUser1.email!, role: UserRole.TEACHER, schoolId }
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should enrich teacher profile with active and historical class teacher assignments', async () => {
      await container.academicUseCases.assignClassTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          teacherId: 'teacher-1',
          effectiveFrom: '2026-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      const profile = await container.teacherUseCases.getMyTeacherProfile('user-tch-1');
      expect(profile.classTeacherAssignments).toBeDefined();
      expect(profile.classTeacherAssignments.length).toBe(1);
      expect(profile.classTeacherAssignments[0].className).toBe('Grade 7');
      expect(profile.classTeacherAssignments[0].streamName).toBe('A');
    });
  });

  // ==========================================
  // PART 2: PROMOTION & TEACHER CONTINUITY
  // ==========================================
  describe('Part 2: Promotion & Teacher Continuity Modes', () => {
    beforeEach(async () => {
      // Assign Teacher 1 to Grade 7 Stream A
      await container.academicUseCases.assignClassTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          teacherId: 'teacher-1',
          effectiveFrom: '2026-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      // Assign Teacher 2 to Grade 8 Stream A for year 2027
      const year2027 = AcademicYear.create(
        {
          schoolId,
          name: '2027',
          startDate: '2027-01-05',
          endDate: '2027-11-20',
          isCurrent: false
        },
        'year-2027'
      );
      await container.academicRepository.saveYear(year2027);

      await container.academicUseCases.assignClassTeacher(
        {
          schoolId,
          academicYearId: 'year-2027',
          classRoomId: 'class-g8',
          streamId: 'stream-g8-a',
          teacherId: 'teacher-2',
          effectiveFrom: '2027-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );
    });

    it('FOLLOW_COHORT mode: moves the cohort class teacher to the destination grade upon promotion', async () => {
      // Promote student 1 with FOLLOW_COHORT
      await container.studentUseCases.promoteStudent(student1.id, {
        targetGradeLevel: CBCGradeLevel.GRADE_8,
        targetClassroomId: 'class-g8',
        targetStreamId: 'stream-g8-a',
        targetAcademicYearId: 'year-2027',
        teacherContinuityMode: 'FOLLOW_COHORT'
      });

      // Destination Grade 8 Stream A should now have Teacher 1 as active class teacher
      const activeAssignments = await container.academicRepository.findClassTeacherAssignments({
        schoolId,
        academicYearId: 'year-2027',
        classRoomId: 'class-g8',
        streamId: 'stream-g8-a',
        isActive: true
      });

      expect(activeAssignments.length).toBe(1);
      expect(activeAssignments[0].teacherId).toBe('teacher-1');

      // The previous destination teacher (Teacher 2) was safely deactivated
      const pastAssignments = await container.academicRepository.findClassTeacherAssignments({
        schoolId,
        academicYearId: 'year-2027',
        classRoomId: 'class-g8',
        streamId: 'stream-g8-a',
        isActive: false
      });
      expect(pastAssignments.some(a => a.teacherId === 'teacher-2')).toBe(true);
    });

    it('DESTINATION_DEFAULT mode: keeps the existing destination class teacher upon promotion', async () => {
      await container.studentUseCases.promoteStudent(student2.id, {
        targetGradeLevel: CBCGradeLevel.GRADE_8,
        targetClassroomId: 'class-g8',
        targetStreamId: 'stream-g8-a',
        targetAcademicYearId: 'year-2027',
        teacherContinuityMode: 'DESTINATION_DEFAULT'
      });

      const activeAssignments = await container.academicRepository.findClassTeacherAssignments({
        schoolId,
        academicYearId: 'year-2027',
        classRoomId: 'class-g8',
        streamId: 'stream-g8-a',
        isActive: true
      });

      expect(activeAssignments.length).toBe(1);
      expect(activeAssignments[0].teacherId).toBe('teacher-2');
    });

    it('LEAVE_PENDING mode: leaves destination class teacher unassigned for administrator review', async () => {
      await container.studentUseCases.promoteStudent(student1.id, {
        targetGradeLevel: CBCGradeLevel.GRADE_8,
        targetClassroomId: 'class-g8',
        targetStreamId: 'stream-g8-a',
        targetAcademicYearId: 'year-2027',
        teacherContinuityMode: 'LEAVE_PENDING'
      });

      const activeAssignments = await container.academicRepository.findClassTeacherAssignments({
        schoolId,
        academicYearId: 'year-2027',
        classRoomId: 'class-g8',
        streamId: 'stream-g8-a',
        isActive: true
      });

      expect(activeAssignments.length).toBe(0);
    });
  });

  // ==========================================
  // PART 3: SUBJECT LEADERSHIP ASSIGNMENTS
  // ==========================================
  describe('Part 3: Subject Leadership & Subject Teacher Assignments', () => {
    it('lets subject teachers save drafts before scheduling while class teachers see coverage summaries without editing', async () => {
      const subjectActor = { userId: teacherUser3.id, role: UserRole.TEACHER, schoolId };
      const classActor = { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId };
      const scope = { schoolId, academicYearId, termId, classRoomId: 'class-g7', streamId: 'stream-g7-a', learningAreaId: 'la-math' };
      await container.academicUseCases.assignClassTeacher({ schoolId, academicYearId, classRoomId: 'class-g7', streamId: 'stream-g7-a', teacherId: teacher1.id, effectiveFrom: '2026-01-05' });
      const duty = await container.academicUseCases.assignSubjectTeacher({ ...scope, teacherId: teacher3.id, role: 'SUBJECT_TEACHER', effectiveFrom: '2026-01-05' });
      const strand = await container.CBCUseCases.createStrand({ learningAreaId: 'la-math', gradeLevel: CBCGradeLevel.GRADE_7, code: 'MAT1', title: 'Numbers' });
      const sub = await container.CBCUseCases.createSubStrand({ strandId: strand.id, code: 'MAT1.1', title: 'Fractions', specificLearningOutcomes: ['Compare fractions'] });
      const saved = await container.termAllocations.saveDraft(subjectActor, scope, [{ subStrandId: sub.id, lessons: 2 }], 0);
      expect(saved.setupRequired).toContain('publish the term calendar');
      expect(saved.slots).toEqual([]);
      expect(saved.scheme.planningState?.allocations[0].lessons).toBe(2);
      expect(saved.scheme.entries).toEqual([]);
      await expect(container.termAllocations.finalize(subjectActor, saved.scheme.id, 1)).rejects.toThrow('wait for school leadership approval');
      await expect(container.termAllocations.saveDraft(classActor, scope, [], 0)).rejects.toThrow(ForbiddenError);
      await expect(container.termAllocations.saveDraft(subjectActor, { ...scope, learningAreaId: 'la-eng' }, [], 0)).rejects.toThrow(ForbiddenError);
      const workspace = (actor: typeof subjectActor) => new Promise<any>((resolve, reject) => {
        const req: any = { user: actor, method: 'GET', originalUrl: '/api/v1/curriculum/planning/workspace', query: { academicYearId, termId, classRoomId: scope.classRoomId, streamId: scope.streamId }, params: {}, body: {} };
        const res: any = { status: () => res, json: resolve };
        const controller = new CalendarPlanningController(container);
        teacherAssignmentGuard(container)(req, res, error => { if (error) reject(error); else controller.workspace(req, res, reject); }).catch(reject);
      });
      const subjectView = (await workspace(subjectActor)).data;
      expect(subjectView.canViewClass).toBe(false);
      expect(subjectView.areas).toHaveLength(1);
      expect(subjectView.areas[0]).toMatchObject({ learningAreaId: 'la-math', canPlan: true, locked: false });
      const classView = (await workspace(classActor)).data;
      expect(classView.canViewClass).toBe(true);
      const math = classView.areas.find((a: any) => a.learningAreaId === 'la-math');
      expect(math.canPlan).toBe(false);
      expect(math.coverage).toEqual([expect.objectContaining({ allocatedLessons: 2, plannedLessons: 0, status: 'DRAFT' })]);
      expect(math.scheme).toBeUndefined();
      expect(math.schemeId).toBeUndefined();
      expect(JSON.stringify(math.coverage)).not.toContain('specificLearningOutcomes');
      await container.academicUseCases.assignSubjectTeacher({ ...scope, learningAreaId: 'la-eng', teacherId: teacher1.id, role: 'SUBJECT_TEACHER', effectiveFrom: '2026-01-05' });
      const hybridView = (await workspace(classActor)).data;
      expect(hybridView.areas.find((a: any) => a.learningAreaId === 'la-eng').canPlan).toBe(true);
      expect(hybridView.areas.find((a: any) => a.learningAreaId === 'la-math').canPlan).toBe(false);
      await container.academicUseCases.deactivateSubjectTeacherAssignment(duty.id);
      await expect(container.termAllocations.saveDraft(subjectActor, scope, [], 1, saved.scheme.id)).rejects.toThrow(ForbiddenError);
    });

    it('returns the assigned subject strand through the HTTP guard when another subject already uses its code', async () => {
      await container.academicUseCases.assignSubjectTeacher({ schoolId, academicYearId, classRoomId: 'class-g7', learningAreaId: 'la-math', teacherId: 'teacher-3', role: 'SUBJECT_TEACHER', effectiveFrom: '2026-01-05' });
      const foreign = await container.CBCUseCases.createStrand({ learningAreaId: 'la-eng', gradeLevel: CBCGradeLevel.GRADE_8, code: 'MAT-01', title: 'Numbers' });
      const request: any = { user: { userId: teacherUser3.id, role: UserRole.TEACHER, schoolId }, method: 'POST', originalUrl: '/api/v1/CBC/strands', query: {}, params: {}, body: { learningAreaId: 'la-math', gradeLevel: CBCGradeLevel.GRADE_7, code: 'MAT-01', title: 'Algebra' } };
      const save = () => new Promise<any>((resolve, reject) => {
        const response: any = { status: () => response, json: resolve };
        const controller = new CBCAssessmentController(container.CBCUseCases);
        teacherAssignmentGuard(container)(request, response, error => {
          if (error) reject(error);
          else controller.createStrand(request, response, reject);
        }).catch(reject);
      });
      let result = await save();
      expect(result.success).toBe(true);
      expect(result.data.learningAreaId).toBe('la-math');
      expect(result.data.gradeLevel).toBe(CBCGradeLevel.GRADE_7);
      expect(result.data.title).toBe('Algebra');
      expect(result.data.id).not.toBe(foreign.id);
      expect((await save()).data.id).toBe(result.data.id);
      result.data=await publishProposal(container,'la-math',result.data,schoolId);
      expect(await container.CBCUseCases.getStrandsByLearningArea('la-math', CBCGradeLevel.GRADE_7)).toHaveLength(1);
      expect(await container.CBCUseCases.getStrandsByLearningArea('la-math', CBCGradeLevel.GRADE_4)).toHaveLength(0);
      const planningScope = { schoolId, academicYearId, termId, classRoomId: 'class-g7', learningAreaId: 'la-math' };
      const initialCatalogue = await container.termAllocations.catalogue(request.user, planningScope);
      expect(initialCatalogue.map(s => s.id)).toEqual([result.data.id]);
      expect(initialCatalogue[0].subStrands).toEqual([]);
      let sub = await container.CBCUseCases.createSubStrand({ strandId: result.data.id, code: 'MAT-01.1', title: 'Expressions', specificLearningOutcomes: ['Form algebraic expressions'] }, request.user);
      sub=await publishProposal(container,'la-math',sub,schoolId);
      const refreshedCatalogue = await container.termAllocations.catalogue(request.user, planningScope);
      expect(refreshedCatalogue[0].subStrands).toEqual([expect.objectContaining({ id: sub.id, title: 'Expressions', specificLearningOutcomes: ['Form algebraic expressions'] })]);
      const edit=await container.CBCUseCases.updateSubStrand(sub.id, { title: 'Algebraic expressions' }, request.user);
      await publishProposal(container,'la-math',edit,schoolId);
      expect((await container.termAllocations.catalogue(request.user, planningScope))[0].subStrands[0].title).toBe('Algebraic expressions');
      const foreignSub = await container.CBCUseCases.createSubStrand({ strandId: foreign.id, code: 'MAT-01.1', title: 'Foreign topic', specificLearningOutcomes: ['Other subject outcome'] });
      const remove = (id: string) => new Promise<any>((resolve, reject) => {
        const req: any = { ...request, method: 'DELETE', originalUrl: `/api/v1/CBC/sub-strands/${id}`, params: { id }, body: {} };
        const res: any = { status: () => res, json: resolve };
        const controller = new CBCAssessmentController(container.CBCUseCases);
        teacherAssignmentGuard(container)(req, res, error => {
          if (error) reject(error);
          else controller.deleteSubStrand(req, res, reject);
        }).catch(reject);
      });
      await expect(remove(foreignSub.id)).rejects.toThrow(ForbiddenError);
      await expect(remove(sub.id)).rejects.toThrow(ForbiddenError);
      expect(await container.CBCAssessmentRepository.findSubStrandById(sub.id)).not.toBeNull();
      expect(await container.CBCAssessmentRepository.findSubStrandById(foreignSub.id)).not.toBeNull();
    });

    it('allows class teachers to read other subjects while limiting all strand mutations to their explicit subject', async () => {
      const actor = { userId: teacherUser3.id, role: UserRole.TEACHER, schoolId };
      await container.academicUseCases.assignClassTeacher({ schoolId, academicYearId, classRoomId: 'class-g7', streamId: 'stream-g7-a', teacherId: 'teacher-3', effectiveFrom: '2026-01-05' });
      await container.academicUseCases.assignSubjectTeacher({ schoolId, academicYearId, classRoomId: 'class-g7', learningAreaId: 'la-math', teacherId: 'teacher-3', role: 'SUBJECT_TEACHER', effectiveFrom: '2026-01-05' });
      const english = await container.CBCUseCases.createStrand({ learningAreaId: 'la-eng', gradeLevel: CBCGradeLevel.GRADE_7, code: 'ENG1', title: 'Reading' });
      const englishSub = await container.CBCUseCases.createSubStrand({ strandId: english.id, code: 'ENG1.1', title: 'Fluency', specificLearningOutcomes: ['Read clearly'] });
      const mathProposal = await container.CBCUseCases.createStrand({ learningAreaId: 'la-math', gradeLevel: CBCGradeLevel.GRADE_7, code: 'M1', title: 'Numbers' }, actor);
      const math=await publishProposal(container,'la-math',mathProposal,schoolId);
      const subProposal = await container.CBCUseCases.createSubStrand({ strandId: math.id, code: 'M1.1', title: 'Fractions', specificLearningOutcomes: ['Compare fractions'] }, actor);
      const sub=await publishProposal(container,'la-math',subProposal,schoolId);
      const access = new TeacherAssignmentAccess(container.academicRepository, container.teacherRepository);
      expect(await access.can(actor, { academicYearId, termId, classRoomId: 'class-g7', streamId: 'stream-g7-a', learningAreaId: 'la-eng' })).toBe(true);
      expect(await container.CBCUseCases.getStrandsByLearningArea('la-eng')).toHaveLength(1);
      expect(await container.CBCUseCases.getSubStrandsByStrand(english.id)).toHaveLength(1);
      const context = await container.academicUseCases.getTeacherAuthorizedContext({ ...actor, email: teacherUser3.email! });
      expect(context.editableLearningAreaIds).toEqual(['la-math']);

      const attempts = [
        () => container.CBCUseCases.createStrand({ learningAreaId: 'la-eng', gradeLevel: CBCGradeLevel.GRADE_7, code: 'ENG1', title: 'Reading' }, actor),
        () => container.CBCUseCases.updateStrand(english.id, { title: 'Changed' }, actor),
        () => container.CBCUseCases.deleteStrand(english.id, actor),
        () => container.CBCUseCases.createSubStrand({ strandId: english.id, code: 'ENG2', title: 'Writing', specificLearningOutcomes: ['Write clearly'] }, actor),
        () => container.CBCUseCases.updateSubStrand(englishSub.id, { title: 'Changed' }, actor),
        () => container.CBCUseCases.deleteSubStrand(englishSub.id, actor),
        // Both the source and destination must be editable when moving content.
        () => container.CBCUseCases.updateStrand(math.id, { learningAreaId: 'la-eng' }, actor),
        () => container.CBCUseCases.updateStrand(english.id, { learningAreaId: 'la-math' }, actor),
        () => container.CBCUseCases.updateSubStrand(sub.id, { strandId: english.id }, actor),
        () => container.CBCUseCases.updateSubStrand(englishSub.id, { strandId: math.id }, actor),
        () => container.CBCUseCases.createStrand({ learningAreaId: 'la-math', gradeLevel: CBCGradeLevel.GRADE_8, code: 'M8', title: 'Wrong grade' }, actor)
      ];
      for (const attempt of attempts) await expect(attempt()).rejects.toThrow(ForbiddenError);
      await container.CBCUseCases.updateStrand(math.id, { title: 'Number concepts' }, actor);
      await container.CBCUseCases.updateSubStrand(sub.id, { title: 'Comparing fractions' }, actor);
      await expect(container.CBCUseCases.deleteSubStrand(sub.id, actor)).rejects.toThrow(ForbiddenError);
      await expect(container.CBCUseCases.deleteStrand(math.id, actor)).rejects.toThrow(ForbiddenError);
      expect((await container.CBCUseCases.getStrandsByLearningArea('la-eng'))[0].title).toBe('Reading');
      expect((await container.CBCUseCases.getSubStrandsByStrand(english.id))[0].title).toBe('Fluency');
    });

    it('requires a current subject duty even for class teachers and respects revocation, future duties and approver-only roles', async () => {
      const actor = { userId: teacherUser3.id, role: UserRole.TEACHER, schoolId };
      const access = new TeacherAssignmentAccess(container.academicRepository, container.teacherRepository);
      await container.academicUseCases.assignClassTeacher({ schoolId, academicYearId, classRoomId: 'class-g7', teacherId: 'teacher-3' });
      await expect(access.assertSubjectEditor(actor, 'la-math')).rejects.toThrow(ForbiddenError);
      const base = { schoolId, academicYearId, classRoomId: 'class-g7', learningAreaId: 'la-math', teacherId: 'teacher-3', effectiveFrom: '2026-01-05' };
      await container.academicUseCases.assignSubjectTeacher({ ...base, role: 'ASSESSMENT_APPROVER' });
      await container.academicUseCases.assignSubjectTeacher({ ...base, role: 'SUBJECT_TEACHER', effectiveFrom: '2099-01-01' });
      expect(await access.editableLearningAreaIds(actor)).toEqual([]);
      const lead = await container.academicUseCases.assignSubjectTeacher({ ...base, role: 'SUBJECT_LEAD' });
      await expect(access.assertSubjectEditor(actor, 'la-math')).resolves.toBeUndefined();
      await expect(access.assertSubjectEditor({ ...actor, schoolId: 'other-school' }, 'la-math')).rejects.toThrow(ForbiddenError);
      await container.academicUseCases.deactivateSubjectTeacherAssignment(lead.id);
      expect(await access.editableLearningAreaIds(actor)).toEqual([]);
    });

    it('grants subject-scoped teaching access without changing class-teacher duty and revokes it on removal', async () => {
      const admin = { userId: adminUser.id, email: adminUser.email!, role: adminUser.role, schoolId };
      await container.academicUseCases.assignClassTeacher({ schoolId, academicYearId, classRoomId: 'class-g8', streamId: 'stream-g8-a', teacherId: 'teacher-3', effectiveFrom: '2026-01-05' }, admin);
      const dto = { schoolId, academicYearId, classRoomId: 'class-g7', streamId: 'stream-g7-a', learningAreaId: 'la-math', teacherId: 'teacher-3', role: 'SUBJECT_TEACHER' as const, effectiveFrom: '2026-01-05' };
      const assigned = await container.academicUseCases.assignSubjectTeacher(dto, admin);
      expect((await container.academicUseCases.assignSubjectTeacher(dto, admin)).id).toBe(assigned.id);
      const access = new TeacherAssignmentAccess(container.academicRepository, container.teacherRepository);
      const actor = { userId: teacherUser3.id, role: UserRole.TEACHER, schoolId };
      const scope = { ...dto, termId, teacherId: teacherUser3.id };
      expect(await access.can(actor, scope, true)).toBe(true);
      expect(await access.can(actor, { ...scope, learningAreaId: 'la-eng' }, true)).toBe(false);
      expect(await access.can(actor, { ...scope, streamId: undefined }, true)).toBe(false);
      const context = await container.academicUseCases.getTeacherAuthorizedContext({ ...actor, email: teacherUser3.email! }, academicYearId, termId);
      expect(context.assignedClasses.find(c => c.id === 'class-g7')?.streams.map(s => s.id)).toEqual(['stream-g7-a']);
      expect(context.authorizedSubjectsByClass['class-g7'].map(a => a.id)).toEqual(['la-math']);
      const duties = await container.academicRepository.findClassTeacherAssignments({ teacherId: 'teacher-3', isActive: true });
      expect(duties).toHaveLength(1);
      expect(duties[0].classRoomId).toBe('class-g8');
      await container.academicUseCases.deactivateSubjectTeacherAssignment(assigned.id, undefined, admin);
      expect(await access.can(actor, scope, true)).toBe(false);
    });

    it('rejects missing class, mismatched grade/stream, foreign school and invalid year without saving', async () => {
      const admin = { userId: adminUser.id, email: adminUser.email!, role: adminUser.role, schoolId };
      const dto = { schoolId, academicYearId, classRoomId: 'class-g7', learningAreaId: 'la-math', teacherId: 'teacher-3', role: 'SUBJECT_TEACHER' as const };
      for (const change of [{ classRoomId: undefined }, { classRoomId: 'class-g8' }, { streamId: 'stream-g8-a' }, { schoolId: 'other-school' }, { academicYearId: 'missing-year' }]) {
        await expect(container.academicUseCases.assignSubjectTeacher({ ...dto, ...change }, admin)).rejects.toThrow();
      }
      expect(await container.academicRepository.findSubjectTeacherAssignments({ teacherId: 'teacher-3' })).toHaveLength(0);
    });

    it('keeps class-wide and stream subject leads independent when replacing a lead', async () => {
      const base = { schoolId, academicYearId, classRoomId: 'class-g7', learningAreaId: 'la-math', teacherId: 'teacher-1', role: 'SUBJECT_LEAD' as const };
      const streamLead = await container.academicUseCases.assignSubjectTeacher({ ...base, streamId: 'stream-g7-a' });
      await container.academicUseCases.assignSubjectTeacher(base);
      await container.academicUseCases.assignSubjectTeacher({ ...base, teacherId: 'teacher-2' });
      const active = await container.academicRepository.findSubjectTeacherAssignments({ learningAreaId: 'la-math', isActive: true });
      expect(active).toHaveLength(2);
      expect(active.some(a => a.id === streamLead.id)).toBe(true);
    });

    it('should assign a lead teacher for a learning area and preserve history on reassignment', async () => {
      // 1. Initial assignment: Teacher 1 as Subject Lead for Math
      const leadAssignment = await container.academicUseCases.assignSubjectTeacher(
        {
          schoolId,
          academicYearId,
          learningAreaId: 'la-math',
          teacherId: 'teacher-1',
          role: 'SUBJECT_LEAD',
          effectiveFrom: '2026-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      expect(leadAssignment.role).toBe('SUBJECT_LEAD');
      expect(leadAssignment.isActive).toBe(true);

      // 2. Reassign: Teacher 2 replaces Teacher 1 as Subject Lead
      const newLead = await container.academicUseCases.assignSubjectTeacher(
        {
          schoolId,
          academicYearId,
          learningAreaId: 'la-math',
          teacherId: 'teacher-2',
          role: 'SUBJECT_LEAD',
          effectiveFrom: '2026-03-01'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      expect(newLead.teacherId).toBe('teacher-2');
      expect(newLead.isActive).toBe(true);

      // 3. Verify historical record for Teacher 1 was safely preserved as inactive
      const allMathAssignments = await container.academicRepository.findSubjectTeacherAssignments({
        schoolId,
        academicYearId,
        learningAreaId: 'la-math'
      });

      expect(allMathAssignments.length).toBe(2);
      const oldLead = allMathAssignments.find(a => a.teacherId === 'teacher-1');
      expect(oldLead?.isActive).toBe(false);
      expect(oldLead?.effectiveTo).toBe('2026-03-01');
    });

    it('should assign a subject teacher for a specific classroom without conflicting with subject lead', async () => {
      // Lead teacher for whole school
      await container.academicUseCases.assignSubjectTeacher(
        {
          schoolId,
          academicYearId,
          learningAreaId: 'la-math',
          teacherId: 'teacher-1',
          role: 'SUBJECT_LEAD'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      // Subject teacher for Grade 7 Stream A
      const subjectTeacher = await container.academicUseCases.assignSubjectTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          learningAreaId: 'la-math',
          teacherId: 'teacher-3',
          role: 'SUBJECT_TEACHER'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      expect(subjectTeacher.role).toBe('SUBJECT_TEACHER');
      expect(subjectTeacher.isActive).toBe(true);

      const list = await container.academicUseCases.listSubjectTeacherAssignments({
        schoolId,
        academicYearId,
        learningAreaId: 'la-math',
        isActive: true
      });

      expect(list.length).toBe(2);
    });
  });

  // ==========================================
  // PART 4: MARKS UPLOAD PIPELINE
  // ==========================================
  describe('Part 4: Marks Upload Pipeline', () => {
    beforeEach(async () => {
      // Assign Teacher 1 as Class Teacher for Grade 7 Stream A
      await container.academicUseCases.assignClassTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          teacherId: 'teacher-1',
          effectiveFrom: '2026-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );

      // Assign Teacher 2 as Subject Teacher for Math in Grade 7 Stream A
      await container.academicUseCases.assignSubjectTeacher(
        {
          schoolId,
          academicYearId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          learningAreaId: 'la-math',
          teacherId: 'teacher-2',
          role: 'SUBJECT_TEACHER',
          effectiveFrom: '2026-01-05'
        },
        { userId: adminUser.id, email: adminUser.email!, role: adminUser.role }
      );
    });

    it('4.1 Generate Marksheet Template pre-populated with active enrolled learners', async () => {
      const template = await container.CBCUseCases.generateMarksTemplate(
        {
          schoolId,
          academicYearId,
          termId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          learningAreaId: 'la-math',
          maxScore: 100
        },
        { userId: adminUser.id, role: UserRole.HEAD_TEACHER }
      );

      expect(template.studentsCount).toBe(2);
      expect(template.csvContent).toContain('Admission Number,Learner Name,Score,Max Score,Performance Level,Teacher Remarks');
      expect(template.csvContent).toContain('G7-001');
      expect(template.csvContent).toContain('G7-002');
      expect(template.csvContent).toContain('Brian Ochieng');
      expect(template.csvContent).toContain('Alice Wambui');
    });

    it('4.2 Validate Upload: preserves missing marks (does NOT convert to 0), validates score ranges and flags duplicates', async () => {
      const validation = await container.CBCUseCases.validateMarksUpload(
        {
          schoolId,
          academicYearId,
          termId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          learningAreaId: 'la-math',
          maxScore: 100,
          rows: [
            { admissionNumber: 'G7-001', score: '88', maxScore: 100, teacherRemarks: 'Excellent' }, // Valid: score 88 -> EE
            { admissionNumber: 'G7-002', score: '', maxScore: 100 },                                // Blank: preserved as MISSING!
            { admissionNumber: 'G7-999', score: '50', maxScore: 100 },                              // Invalid: not enrolled
            { admissionNumber: 'G7-001', score: '75', maxScore: 100 }                               // Invalid: duplicate in file
          ]
        },
        { userId: adminUser.id, role: UserRole.HEAD_TEACHER }
      );

      expect(validation.totalRows).toBe(4);
      expect(validation.validRows).toBe(1); // Only G7-001 first row
      expect(validation.missingRows).toBe(1); // G7-002 blank mark preserved
      expect(validation.invalidRows).toBe(2); // G7-999 not enrolled + duplicate G7-001
      expect(validation.duplicatesCount).toBe(1);

      // Verify blank mark status is MISSING, not 0
      const missingRow = validation.previewRows.find(r => r.admissionNumber === 'G7-002');
      expect(missingRow?.status).toBe('MISSING');
      expect(missingRow?.score).toBeUndefined();
    });

    it('4.3 Enforce Backend Authorization: only assigned teacher or admin can submit marks', async () => {
      // Teacher 3 is NOT assigned to Grade 7 Math (neither class teacher nor subject teacher)
      await expect(
        container.CBCUseCases.validateMarksUpload(
          {
            schoolId,
            academicYearId,
            termId,
            classRoomId: 'class-g7',
            streamId: 'stream-g7-a',
            learningAreaId: 'la-math',
            maxScore: 100,
            rows: [{ admissionNumber: 'G7-001', score: '80' }]
          },
          { userId: teacherUser3.id, role: UserRole.TEACHER, schoolId }
        )
      ).rejects.toThrow(ForbiddenError);

      // Teacher 2 (assigned subject teacher) IS authorized
      const teacher2Validation = await container.CBCUseCases.validateMarksUpload(
        {
          schoolId,
          academicYearId,
          termId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          learningAreaId: 'la-math',
          maxScore: 100,
          rows: [{ admissionNumber: 'G7-001', score: '80' }]
        },
        { userId: teacherUser2.id, role: UserRole.TEACHER, schoolId }
      );
      expect(teacher2Validation.validRows).toBe(1);

      // Teacher 1 (assigned class teacher) IS authorized
      const teacher1Validation = await container.CBCUseCases.validateMarksUpload(
        {
          schoolId,
          academicYearId,
          termId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          learningAreaId: 'la-math',
          maxScore: 100,
          rows: [{ admissionNumber: 'G7-001', score: '80' }]
        },
        { userId: teacherUser1.id, role: UserRole.TEACHER, schoolId }
      );
      expect(teacher1Validation.validRows).toBe(1);
    });

    it('4.4 Transactional Commit: persists marks into summative_assessments and reflects in reports', async () => {
      const commitRes = await container.CBCUseCases.commitMarksUpload(
        {
          schoolId,
          academicYearId,
          termId,
          classRoomId: 'class-g7',
          streamId: 'stream-g7-a',
          learningAreaId: 'la-math',
          maxScore: 100,
          rows: [
            { admissionNumber: 'G7-001', score: '88', maxScore: 100, teacherRemarks: 'High conceptual clarity' },
            { admissionNumber: 'G7-002', score: '', maxScore: 100 } // Blank preserved as missing
          ]
        },
        { userId: adminUser.id, role: UserRole.HEAD_TEACHER }
      );

      expect(commitRes.success).toBe(true);
      expect(commitRes.recordedCount).toBe(1);
      expect(commitRes.skippedMissingCount).toBe(1);

      // Verify assessment was persisted in repository
      const assessments = await container.CBCAssessmentRepository.findSummatives({
        studentId: student1.id,
        learningAreaId: 'la-math',
        termId,
        academicYearId
      });

      expect(assessments.length).toBe(1);
      expect(assessments[0].overallPerformanceLevel).toBe(PerformanceLevel.EXCEEDING_EXPECTATIONS);
      expect(assessments[0].strandScores[0].rawScore).toBe(88);
      expect(assessments[0].strandScores[0].maxScore).toBe(100);

      // Verify student 2 has NO 0-mark created
      const student2Assessments = await container.CBCAssessmentRepository.findSummatives({
        studentId: student2.id,
        learningAreaId: 'la-math',
        termId,
        academicYearId
      });
      expect(student2Assessments.length).toBe(0);
    });
  });
});
