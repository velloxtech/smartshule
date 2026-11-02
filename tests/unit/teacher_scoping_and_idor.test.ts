import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { ClassTeacherAssignment, SubjectTeacherAssignment } from '../../src/core/domain/academic/TeacherAssignment';
import { ForbiddenError } from '../../src/core/domain/shared/Errors';
import { PerformanceLevel, AssessmentMethod } from '../../src/core/domain/cbc/CbcAssessment';

describe('Phase 5: Teacher Scoping, IDOR Prevention, and Sensitive Data Protection', () => {
  let container: AppContainer;
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-1';

  let g3Class: ClassRoom;
  let g3StreamEast: Stream;
  let g7Class: ClassRoom;
  let g7StreamAlpha: Stream;

  let teacherUserG3: User;
  let teacherG3: Teacher;

  let teacherUserG7Sci: User;
  let teacherG7Sci: Teacher;

  let g3Student: Student;
  let g7Student: Student;

  let guardianUser: User;
  let guardian: Guardian;

  let mathLA: LearningArea;
  let sciLA: LearningArea;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    // 1. Classes & Streams
    g3Class = ClassRoom.create({
      schoolId,
      name: 'Grade 3',
      gradeLevel: CBCGradeLevel.GRADE_3,
      educationLevel: EducationLevel.LOWER_PRIMARY
    }, 'class-g3');
    await container.academicRepository.saveClass(g3Class);

    g3StreamEast = Stream.create({ classRoomId: g3Class.id, name: 'East', capacity: 40 }, 'stream-g3-east');
    await container.academicRepository.saveStream(g3StreamEast);

    g7Class = ClassRoom.create({
      schoolId,
      name: 'Grade 7',
      gradeLevel: CBCGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL
    }, 'class-g7');
    await container.academicRepository.saveClass(g7Class);

    g7StreamAlpha = Stream.create({ classRoomId: g7Class.id, name: 'Alpha', capacity: 40 }, 'stream-g7-alpha');
    await container.academicRepository.saveStream(g7StreamAlpha);

    // 2. Learning Areas
    mathLA = LearningArea.create({
      schoolId,
      name: 'Mathematical Activities',
      code: 'MAT',
      gradeLevel: CBCGradeLevel.GRADE_3,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      isElective: false
    }, 'la-mat');
    await container.academicRepository.saveLearningArea(mathLA);

    sciLA = LearningArea.create({
      schoolId,
      name: 'Integrated Science',
      code: 'SCI',
      gradeLevel: CBCGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL,
      isElective: false
    }, 'la-sci');
    await container.academicRepository.saveLearningArea(sciLA);

    // 3. Teachers
    // Teacher 1: Grade 3 Class Teacher (Lower Primary)
    teacherUserG3 = User.create({
      email: 'tr.g3@school.com',
      passwordHash: 'hash',
      firstName: 'Faith',
      lastName: 'Mutua',
      role: UserRole.TEACHER,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-tr-g3');
    await container.userRepository.save(teacherUserG3);

    teacherG3 = Teacher.create({
      userId: teacherUserG3.id,
      employeeNumber: 'EMP-G3-01',
      specialization: ['Primary All Subjects'],
      assignedClassStreamIds: [g3StreamEast.id]
    }, 'tch-g3');
    await container.teacherRepository.save(teacherG3);

    const ctaG3 = ClassTeacherAssignment.create({
      schoolId,
      academicYearId,
      classRoomId: g3Class.id,
      streamId: g3StreamEast.id,
      teacherId: teacherG3.id,
      isActive: true
    }, 'cta-g3');
    await container.academicRepository.saveClassTeacherAssignment(ctaG3);

    // Teacher 2: Grade 7 Science Subject Teacher (Junior Secondary)
    teacherUserG7Sci = User.create({
      email: 'tr.g7sci@school.com',
      passwordHash: 'hash',
      firstName: 'Paul',
      lastName: 'Kariuki',
      role: UserRole.TEACHER,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-tr-g7sci');
    await container.userRepository.save(teacherUserG7Sci);

    teacherG7Sci = Teacher.create({
      userId: teacherUserG7Sci.id,
      employeeNumber: 'EMP-G7-SCI',
      specialization: ['Integrated Science'],
      assignedClassStreamIds: []
    }, 'tch-g7sci');
    await container.teacherRepository.save(teacherG7Sci);

    const staG7Sci = SubjectTeacherAssignment.create({
      schoolId,
      academicYearId,
      classRoomId: g7Class.id,
      streamId: g7StreamAlpha.id,
      learningAreaId: sciLA.id,
      teacherId: teacherG7Sci.id,
      role: 'SUBJECT_TEACHER',
      isActive: true
    }, 'sta-g7sci');
    await container.academicRepository.saveSubjectTeacherAssignment(staG7Sci);

    // 4. Guardian
    guardianUser = User.create({
      email: 'guardian@mail.com',
      passwordHash: 'hash',
      firstName: 'John',
      lastName: 'Chebet',
      role: UserRole.GUARDIAN,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-guard-1');
    await container.userRepository.save(guardianUser);

    guardian = Guardian.create({
      userId: guardianUser.id,
      relationship: GuardianRelationship.FATHER,
      emergencyContact: '+254711223344',
      nationalId: '12345678',
      studentIds: []
    }, 'guard-1');
    await container.guardianRepository.save(guardian);

    // 5. Students
    g3Student = Student.create({
      schoolId,
      firstName: 'Achieng',
      lastName: 'Chebet',
      admissionNumber: 'ADM-G3-100',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_3,
      classroomId: g3Class.id,
      streamId: g3StreamEast.id,
      dateOfBirth: '2016-01-01',
      academicYearId,
      guardianIds: [guardian.id],
      status: StudentStatus.ACTIVE
    }, 'student-g3-100');
    await container.studentRepository.save(g3Student);

    g7Student = Student.create({
      schoolId,
      firstName: 'Brian',
      lastName: 'Otieno',
      admissionNumber: 'ADM-G7-200',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_7,
      classroomId: g7Class.id,
      streamId: g7StreamAlpha.id,
      dateOfBirth: '2012-05-05',
      academicYearId,
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'student-g7-200');
    await container.studentRepository.save(g7Student);
  });

  test('1. Teacher lists students: only receives students in assigned classes/streams', async () => {
    const g3TeacherStudents = await container.studentUseCases.listStudents({
      schoolId,
      requestingUser: { userId: teacherUserG3.id, role: UserRole.TEACHER, email: 'tr.g3@school.com' }
    });

    expect(g3TeacherStudents.some(s => s.id === g3Student.id)).toBe(true);
    expect(g3TeacherStudents.some(s => s.id === g7Student.id)).toBe(false);
  });

  test('2. IDOR Prevention: Teacher cannot inspect student from an unassigned class', async () => {
    await expect(
      container.studentUseCases.getStudentById(
        g7Student.id,
        { userId: teacherUserG3.id, role: UserRole.TEACHER, email: 'tr.g3@school.com' }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  test('3. Data Privacy: Subject teacher cannot see guardian National ID or Fee Balance', async () => {
    const result = await container.studentUseCases.getStudentById(
      g7Student.id,
      { userId: teacherUserG7Sci.id, role: UserRole.TEACHER, email: 'tr.g7sci@school.com' }
    );

    expect(result.feeBalance).toBeNull();
    if (result.guardian) {
      expect(result.guardian.nationalId).toBeUndefined();
    }
  });

  test('4. Lower primary class teacher can enter marks for all learning areas in their class', async () => {
    const formative = await container.CBCUseCases.recordFormativeAssessment(
      {
        studentId: g3Student.id,
        learningAreaId: mathLA.id,
        subStrandId: 'sub-strand-core',
        academicYearId,
        termId,
        assessmentMethod: AssessmentMethod.OBSERVATION,
        performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
        specificOutcomeTested: 'Count numbers up to 1000'
      },
      { userId: teacherUserG3.id, role: UserRole.TEACHER, email: 'tr.g3@school.com' }
    );

    expect(formative).toBeDefined();
    expect(formative.performanceLevel).toBe(PerformanceLevel.EXCEEDING_EXPECTATIONS);
  });

  test('5. Junior school teacher cannot enter marks for subjects they are not assigned to', async () => {
    await expect(
      container.CBCUseCases.recordFormativeAssessment(
        {
          studentId: g7Student.id,
          learningAreaId: mathLA.id,
          subStrandId: 'sub-strand-core',
          academicYearId,
          termId,
          assessmentMethod: AssessmentMethod.WRITTEN_TEST,
          performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
          specificOutcomeTested: 'Solve algebraic expressions'
        },
        { userId: teacherUserG7Sci.id, role: UserRole.TEACHER, email: 'tr.g7sci@school.com' }
      )
    ).rejects.toThrow(ForbiddenError);
  });

  test('6. Cross-class broadsheet access is blocked for teachers', async () => {
    await expect(
      container.broadsheetUseCases.getStreamBroadsheet(
        { streamId: g7StreamAlpha.id },
        { userId: teacherUserG3.id, role: UserRole.TEACHER, email: 'tr.g3@school.com' }
      )
    ).rejects.toThrow(ForbiddenError);
  });
});
