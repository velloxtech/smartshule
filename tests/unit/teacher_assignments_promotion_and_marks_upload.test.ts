import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { PerformanceLevel } from '../../src/core/domain/cbc/CbcAssessment';
import { ForbiddenError, ValidationError } from '../../src/core/domain/shared/Errors';

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
          { userId: teacherUser1.id, email: teacherUser1.email!, role: UserRole.TEACHER }
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
          { userId: teacherUser3.id, role: UserRole.TEACHER }
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
        { userId: teacherUser2.id, role: UserRole.TEACHER }
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
        { userId: teacherUser1.id, role: UserRole.TEACHER }
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
