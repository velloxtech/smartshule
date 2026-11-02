import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { PerformanceLevel, AssessmentMethod, SummativeAssessment } from '../../src/core/domain/cbc/CbcAssessment';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { Guardian, GuardianRelationship } from '../../src/core/domain/user/Guardian';
import { ClassTeacherAssignment, SubjectTeacherAssignment } from '../../src/core/domain/academic/TeacherAssignment';
import { ForbiddenError, ValidationError } from '../../src/core/domain/shared/Errors';

describe('Marks Upload Portal Redesign & Subject Access Acceptance Tests (Scenarios 1-12)', () => {
  let container: AppContainer;
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-1';

  let year: AcademicYear;
  let term1: AcademicTerm;

  // Classrooms
  let g1Class: ClassRoom;
  let g2Class: ClassRoom;
  let g7Class: ClassRoom;

  // Streams
  let g1StreamEast: Stream;
  let g2StreamEast: Stream;
  let g7StreamWest: Stream;

  // Learning Areas
  let mathLA: LearningArea;
  let engLA: LearningArea;
  let kiswLA: LearningArea;
  let sciLA: LearningArea;
  let histLA: LearningArea;

  // Teachers and Users
  let tchUser1: User;
  let teacher1: Teacher; // Grade 2 Class Teacher (Lower Primary model)

  let tchUser2: User;
  let teacher2: Teacher; // Grade 7 Math Subject Teacher (Subject-Teacher model)

  let tchUser3: User;
  let teacher3: Teacher; // Grade 3 Teacher (Unrelated to Grade 7)

  let tchUserHybrid: User;
  let teacherHybrid: Teacher; // Grade 1 Class Teacher + Grade 7 Science Subject Teacher (Hybrid model)

  let adminUser: User;
  let parentUser: User;

  // Students
  let stG2_1: Student;
  let stG2_2: Student;
  let stG7_1: Student;
  let stG7_2: Student;
  let stG1_1: Student;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    // 1. Academic Session
    year = AcademicYear.create({
      schoolId,
      name: '2026',
      startDate: '2026-01-05',
      endDate: '2026-11-20',
      isCurrent: true
    }, academicYearId);
    await container.academicRepository.saveYear(year);

    term1 = AcademicTerm.create({
      academicYearId,
      name: 'Term 1',
      termNumber: 1,
      startDate: '2026-01-05',
      endDate: '2026-04-08',
      isCurrent: true
    }, termId);
    await container.academicRepository.saveTerm(term1);

    // 2. Classrooms & Streams
    g1Class = ClassRoom.create({
      name: 'Grade 1',
      gradeLevel: CBCGradeLevel.GRADE_1,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      schoolId
    }, 'cls-g1');
    await container.academicRepository.saveClass(g1Class);

    g1StreamEast = Stream.create({
      classRoomId: 'cls-g1',
      name: 'East',
      capacity: 40
    }, 'st-g1-east');
    await container.academicRepository.saveStream(g1StreamEast);

    g2Class = ClassRoom.create({
      name: 'Grade 2',
      gradeLevel: CBCGradeLevel.GRADE_2,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      schoolId
    }, 'cls-g2');
    await container.academicRepository.saveClass(g2Class);

    g2StreamEast = Stream.create({
      classRoomId: 'cls-g2',
      name: 'East',
      capacity: 40
    }, 'st-g2-east');
    await container.academicRepository.saveStream(g2StreamEast);

    g7Class = ClassRoom.create({
      name: 'Grade 7',
      gradeLevel: CBCGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL,
      schoolId
    }, 'cls-g7');
    await container.academicRepository.saveClass(g7Class);

    g7StreamWest = Stream.create({
      classRoomId: 'cls-g7',
      name: 'West',
      capacity: 40
    }, 'st-g7-west');
    await container.academicRepository.saveStream(g7StreamWest);

    // 3. Learning Areas
    mathLA = LearningArea.create({
      name: 'Mathematics',
      code: 'MATH',
      gradeLevel: CBCGradeLevel.GRADE_2,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      isElective: false,
      schoolId
    }, 'la-math');
    await container.academicRepository.saveLearningArea(mathLA);

    engLA = LearningArea.create({
      name: 'English Language',
      code: 'ENG',
      gradeLevel: CBCGradeLevel.GRADE_2,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      isElective: false,
      schoolId
    }, 'la-eng');
    await container.academicRepository.saveLearningArea(engLA);

    kiswLA = LearningArea.create({
      name: 'Kiswahili Language',
      code: 'KISW',
      gradeLevel: CBCGradeLevel.GRADE_2,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      isElective: false,
      schoolId
    }, 'la-kisw');
    await container.academicRepository.saveLearningArea(kiswLA);

    sciLA = LearningArea.create({
      name: 'Science & Technology',
      code: 'SCI',
      gradeLevel: CBCGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL,
      isElective: false,
      schoolId
    }, 'la-sci');
    await container.academicRepository.saveLearningArea(sciLA);

    histLA = LearningArea.create({
      name: 'Social Studies & History',
      code: 'SST',
      gradeLevel: CBCGradeLevel.GRADE_7,
      educationLevel: EducationLevel.JUNIOR_SCHOOL,
      isElective: false,
      schoolId
    }, 'la-hist');
    await container.academicRepository.saveLearningArea(histLA);

    // 4. Users and Teachers
    adminUser = User.create({
      email: 'admin@smartshule.com',
      passwordHash: 'hash',
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-admin');
    await container.userRepository.save(adminUser);

    parentUser = User.create({
      email: 'parent@smartshule.com',
      passwordHash: 'hash',
      firstName: 'Alice',
      lastName: 'Parent',
      role: UserRole.PARENT,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-parent');
    await container.userRepository.save(parentUser);

    // Teacher 1: Grade 2 Class Teacher (Lower Primary)
    tchUser1 = User.create({
      email: 'teacher1@school.com',
      passwordHash: 'hash',
      firstName: 'Grace',
      lastName: 'Wanjiku',
      role: UserRole.TEACHER,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-tch-1');
    await container.userRepository.save(tchUser1);

    teacher1 = Teacher.create({
      userId: 'user-tch-1',
      employeeNumber: 'EMP-001',
      specialization: ['Lower Primary'],
      assignedClassStreamIds: ['st-g2-east']
    }, 'tch-1');
    await container.teacherRepository.save(teacher1);

    const ctaG2 = ClassTeacherAssignment.create({
      schoolId,
      academicYearId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      teacherId: 'tch-1',
      effectiveFrom: '2026-01-05',
      isActive: true
    }, 'cta-g2');
    await container.academicRepository.saveClassTeacherAssignment(ctaG2);

    // Teacher 2: Grade 7 Mathematics Subject Teacher
    tchUser2 = User.create({
      email: 'teacher2@school.com',
      passwordHash: 'hash',
      firstName: 'Brian',
      lastName: 'Otieno',
      role: UserRole.TEACHER,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-tch-2');
    await container.userRepository.save(tchUser2);

    teacher2 = Teacher.create({
      userId: 'user-tch-2',
      employeeNumber: 'EMP-002',
      specialization: ['Mathematics'],
      assignedClassStreamIds: []
    }, 'tch-2');
    await container.teacherRepository.save(teacher2);

    const staG7Math = SubjectTeacherAssignment.create({
      schoolId,
      academicYearId,
      classRoomId: 'cls-g7',
      streamId: 'st-g7-west',
      learningAreaId: 'la-math',
      teacherId: 'tch-2',
      role: 'SUBJECT_LEAD',
      effectiveFrom: '2026-01-05',
      isActive: true
    }, 'sta-g7-math');
    await container.academicRepository.saveSubjectTeacherAssignment(staG7Math);

    // Teacher 3: Unrelated Teacher
    tchUser3 = User.create({
      email: 'teacher3@school.com',
      passwordHash: 'hash',
      firstName: 'Charles',
      lastName: 'Mutua',
      role: UserRole.TEACHER,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-tch-3');
    await container.userRepository.save(tchUser3);

    teacher3 = Teacher.create({
      userId: 'user-tch-3',
      employeeNumber: 'EMP-003',
      specialization: ['Music'],
      assignedClassStreamIds: []
    }, 'tch-3');
    await container.teacherRepository.save(teacher3);

    // Teacher Hybrid: Grade 1 East Class Teacher + Grade 7 West Science Subject Teacher
    tchUserHybrid = User.create({
      email: 'hybrid@school.com',
      passwordHash: 'hash',
      firstName: 'Helen',
      lastName: 'Achieng',
      role: UserRole.TEACHER,
      schoolId,
      status: UserStatus.ACTIVE
    }, 'user-tch-hybrid');
    await container.userRepository.save(tchUserHybrid);

    teacherHybrid = Teacher.create({
      userId: 'user-tch-hybrid',
      employeeNumber: 'EMP-HYBRID',
      specialization: ['Science', 'Early Years'],
      assignedClassStreamIds: ['st-g1-east']
    }, 'tch-hybrid');
    await container.teacherRepository.save(teacherHybrid);

    const ctaG1 = ClassTeacherAssignment.create({
      schoolId,
      academicYearId,
      classRoomId: 'cls-g1',
      streamId: 'st-g1-east',
      teacherId: 'tch-hybrid',
      effectiveFrom: '2026-01-05',
      isActive: true
    }, 'cta-g1');
    await container.academicRepository.saveClassTeacherAssignment(ctaG1);

    const staG7Sci = SubjectTeacherAssignment.create({
      schoolId,
      academicYearId,
      classRoomId: 'cls-g7',
      streamId: 'st-g7-west',
      learningAreaId: 'la-sci',
      teacherId: 'tch-hybrid',
      role: 'SUBJECT_LEAD',
      effectiveFrom: '2026-01-05',
      isActive: true
    }, 'sta-g7-sci');
    await container.academicRepository.saveSubjectTeacherAssignment(staG7Sci);

    // 5. Students
    stG2_1 = Student.create({
      admissionNumber: 'ADM-G2-01',
      firstName: 'Faith',
      lastName: 'Chebet',
      gender: StudentGender.FEMALE,
      dateOfBirth: '2018-03-12',
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: 'cls-g2',
      streamId: 'st-g2-east',
      academicYearId,
      guardianIds: ['user-parent'],
      schoolId,
      status: StudentStatus.ACTIVE
    }, 'st-g2-1');
    await container.studentRepository.save(stG2_1);

    stG2_2 = Student.create({
      admissionNumber: 'ADM-G2-02',
      firstName: 'Joy',
      lastName: 'Akinyi',
      gender: StudentGender.FEMALE,
      dateOfBirth: '2018-05-20',
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: 'cls-g2',
      streamId: 'st-g2-east',
      academicYearId,
      guardianIds: ['user-parent'],
      schoolId,
      status: StudentStatus.ACTIVE
    }, 'st-g2-2');
    await container.studentRepository.save(stG2_2);

    stG7_1 = Student.create({
      admissionNumber: 'ADM-G7-01',
      firstName: 'Don',
      lastName: 'Hemsworth',
      gender: StudentGender.MALE,
      dateOfBirth: '2013-08-14',
      gradeLevel: CBCGradeLevel.GRADE_7,
      classroomId: 'cls-g7',
      streamId: 'st-g7-west',
      academicYearId,
      guardianIds: ['user-parent'],
      schoolId,
      status: StudentStatus.ACTIVE
    }, 'st-g7-1');
    await container.studentRepository.save(stG7_1);

    stG7_2 = Student.create({
      admissionNumber: 'ADM-G7-02',
      firstName: 'Cynthia',
      lastName: 'Chepkemoi',
      gender: StudentGender.FEMALE,
      dateOfBirth: '2013-09-02',
      gradeLevel: CBCGradeLevel.GRADE_7,
      classroomId: 'cls-g7',
      streamId: 'st-g7-west',
      academicYearId,
      guardianIds: ['user-parent'],
      schoolId,
      status: StudentStatus.ACTIVE
    }, 'st-g7-2');
    await container.studentRepository.save(stG7_2);

    stG1_1 = Student.create({
      admissionNumber: 'ADM-G1-01',
      firstName: 'Baraka',
      lastName: 'Kibet',
      gender: StudentGender.MALE,
      dateOfBirth: '2019-01-10',
      gradeLevel: CBCGradeLevel.GRADE_1,
      classroomId: 'cls-g1',
      streamId: 'st-g1-east',
      academicYearId,
      guardianIds: ['user-parent'],
      schoolId,
      status: StudentStatus.ACTIVE
    }, 'st-g1-1');
    await container.studentRepository.save(stG1_1);
  });

  // ==========================================
  // SCENARIO 1: Class-Teacher Access to All Subjects (Lower Primary Model)
  // ==========================================
  test('Scenario 1: Class teacher in lower primary can record marks for all subjects in their class', async () => {
    const userCtx = { userId: 'user-tch-1', email: 'teacher1@school.com', role: UserRole.TEACHER, schoolId };

    // Teacher 1 records Math
    const mathRes = await container.CBCUseCases.recordSummativeAssessment({
      studentId: stG2_1.id,
      teacherId: 'tch-1',
      learningAreaId: 'la-math',
      termId,
      academicYearId,
      strandScores: [{ strandId: 'la-math', rawScore: 88, maxScore: 100, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }],
      overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      teacherRemarks: 'Excellent in numbers',
      evaluationDate: '2026-03-20'
    }, userCtx);
    expect(mathRes).toBeDefined();

    // Teacher 1 records English without separate subject teacher assignment
    const engRes = await container.CBCUseCases.recordSummativeAssessment({
      studentId: stG2_1.id,
      teacherId: 'tch-1',
      learningAreaId: 'la-eng',
      termId,
      academicYearId,
      strandScores: [{ strandId: 'la-eng', rawScore: 92, maxScore: 100, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }],
      overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      teacherRemarks: 'Fluent reading and writing',
      evaluationDate: '2026-03-20'
    }, userCtx);
    expect(engRes).toBeDefined();

    // Teacher 1 records Kiswahili
    const kiswRes = await container.CBCUseCases.recordSummativeAssessment({
      studentId: stG2_1.id,
      teacherId: 'tch-1',
      learningAreaId: 'la-kisw',
      termId,
      academicYearId,
      strandScores: [{ strandId: 'la-kisw', rawScore: 78, maxScore: 100, performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS }],
      overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
      teacherRemarks: 'Nzuri sana',
      evaluationDate: '2026-03-20'
    }, userCtx);
    expect(kiswRes).toBeDefined();
  });

  // ==========================================
  // SCENARIO 2: Subject-Teacher Scoping (Junior Secondary Model)
  // ==========================================
  test('Scenario 2: Subject teacher can access assigned subject, but is rejected for unassigned subjects', async () => {
    const userCtxTch2 = { userId: 'user-tch-2', email: 'teacher2@school.com', role: UserRole.TEACHER, schoolId };

    // Teacher 2 records Math in Grade 7 West (Authorized)
    const mathRes = await container.CBCUseCases.recordSummativeAssessment({
      studentId: stG7_1.id,
      teacherId: 'tch-2',
      learningAreaId: 'la-math',
      termId,
      academicYearId,
      strandScores: [{ strandId: 'la-math', rawScore: 84, maxScore: 100, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }],
      overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      teacherRemarks: 'Good mastery of algebra',
      evaluationDate: '2026-03-20'
    }, userCtxTch2);
    expect(mathRes).toBeDefined();

    // Teacher 2 attempts to record Science in Grade 7 West (Not assigned to Teacher 2!)
    await expect(
      container.CBCUseCases.recordSummativeAssessment({
        studentId: stG7_1.id,
        teacherId: 'tch-2',
        learningAreaId: 'la-sci',
        termId,
        academicYearId,
        strandScores: [{ strandId: 'la-sci', rawScore: 70, maxScore: 100, performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS }],
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        teacherRemarks: 'Attempting to record unassigned subject',
        evaluationDate: '2026-03-20'
      }, userCtxTch2)
    ).rejects.toThrow(ForbiddenError);
  });

  // ==========================================
  // SCENARIO 3: Dynamic Subject Scoping via getTeacherAuthorizedContext
  // ==========================================
  test('Scenario 3: Teacher authorized context returns strictly assigned classes and subjects dynamically', async () => {
    const userCtxTch2 = { userId: 'user-tch-2', email: 'teacher2@school.com', role: UserRole.TEACHER, schoolId };
    const context = await container.academicUseCases.getTeacherAuthorizedContext(userCtxTch2, academicYearId);

    expect(context.isGlobalAdmin).toBe(false);
    expect(context.teachingModel).toBe('SUBJECT_TEACHER');
    expect(context.assignedClasses.length).toBe(1);
    expect(context.assignedClasses[0].id).toBe('cls-g7');
    expect(context.assignedClasses[0].streams[0].id).toBe('st-g7-west');

    // Only Mathematics is authorized for Teacher 2 in Grade 7
    const g7Subjects = context.authorizedSubjectsByClass['cls-g7'];
    expect(g7Subjects.length).toBe(1);
    expect(g7Subjects[0].id).toBe('la-math');

    // For Global Admin, all classes and grade-appropriate subjects are returned
    const adminCtx = { userId: 'user-admin', email: 'admin@smartshule.com', role: UserRole.SUPER_ADMIN, schoolId };
    const adminContext = await container.academicUseCases.getTeacherAuthorizedContext(adminCtx, academicYearId);
    expect(adminContext.isGlobalAdmin).toBe(true);
    expect(adminContext.teachingModel).toBe('GLOBAL_ADMIN');
    expect(adminContext.assignedClasses.length).toBeGreaterThanOrEqual(3); // G1, G2, G7
  });

  // ==========================================
  // SCENARIO 4: Save, Reopen, and Verify Marks
  // ==========================================
  test('Scenario 4: Teacher commits marks upload, reopens, and verifies values persist accurately', async () => {
    const userCtx = { userId: 'user-tch-2', email: 'teacher2@school.com', role: UserRole.TEACHER, schoolId };

    const commitRes = await container.CBCUseCases.commitMarksUpload({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g7',
      streamId: 'st-g7-west',
      learningAreaId: 'la-math',
      maxScore: 100,
      rows: [
        { admissionNumber: 'ADM-G7-01', learnerName: 'Don Hemsworth', score: 95, maxScore: 100, teacherRemarks: 'Exceptional performance' },
        { admissionNumber: 'ADM-G7-02', learnerName: 'Cynthia Chepkemoi', score: 88, maxScore: 100, teacherRemarks: 'Very good accuracy' }
      ]
    }, userCtx);

    expect(commitRes.success).toBe(true);
    expect(commitRes.recordedCount).toBe(2);

    // Reopen by fetching summatives
    const summatives = await container.CBCAssessmentRepository.findSummatives({
      academicYearId,
      termId,
      learningAreaId: 'la-math'
    });

    const donMark = summatives.find((s: any) => s.studentId === stG7_1.id);
    expect(donMark).toBeDefined();
    expect(donMark!.strandScores[0].rawScore).toBe(95);
    expect(donMark!.strandScores[0].performanceLevel).toBe(PerformanceLevel.EXCEEDING_EXPECTATIONS);

    const cynthiaMark = summatives.find((s: any) => s.studentId === stG7_2.id);
    expect(cynthiaMark).toBeDefined();
    expect(cynthiaMark!.strandScores[0].rawScore).toBe(88);
  });

  // ==========================================
  // SCENARIO 5: Validation of Out-of-Range Marks (< 0 or > maxScore)
  // ==========================================
  test('Scenario 5: Negative marks or scores exceeding maxScore are rejected with ValidationError', async () => {
    const userCtx = { userId: 'user-tch-1', email: 'teacher1@school.com', role: UserRole.TEACHER, schoolId };

    // Negative score directly rejected
    await expect(
      container.CBCUseCases.recordSummativeAssessment({
        studentId: stG2_1.id,
        teacherId: 'tch-1',
        learningAreaId: 'la-math',
        termId,
        academicYearId,
        strandScores: [{ strandId: 'la-math', rawScore: -10, maxScore: 100, performanceLevel: PerformanceLevel.BELOW_EXPECTATIONS }],
        overallPerformanceLevel: PerformanceLevel.BELOW_EXPECTATIONS,
        teacherRemarks: 'Invalid score',
        evaluationDate: '2026-03-20'
      }, userCtx)
    ).rejects.toThrow(ValidationError);

    // Score > maxScore directly rejected
    await expect(
      container.CBCUseCases.recordSummativeAssessment({
        studentId: stG2_1.id,
        teacherId: 'tch-1',
        learningAreaId: 'la-math',
        termId,
        academicYearId,
        strandScores: [{ strandId: 'la-math', rawScore: 105, maxScore: 100, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }],
        overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
        teacherRemarks: 'Score over 100',
        evaluationDate: '2026-03-20'
      }, userCtx)
    ).rejects.toThrow(ValidationError);

    // CSV Pre-validation also marks them as INVALID
    const validation = await container.CBCUseCases.validateMarksUpload({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      learningAreaId: 'la-math',
      maxScore: 100,
      rows: [
        { admissionNumber: 'ADM-G2-01', score: 110, maxScore: 100 },
        { admissionNumber: 'ADM-G2-02', score: -5, maxScore: 100 }
      ]
    }, userCtx);

    expect(validation.invalidRows).toBe(2);
    expect(validation.validRows).toBe(0);
    expect(validation.errors.length).toBe(2);
  });

  // ==========================================
  // SCENARIO 6: Missing / Incomplete Marks Identification
  // ==========================================
  test('Scenario 6: Blank marks are identified as missing and safely preserved without zeroing', async () => {
    const userCtx = { userId: 'user-tch-1', email: 'teacher1@school.com', role: UserRole.TEACHER, schoolId };

    const validation = await container.CBCUseCases.validateMarksUpload({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      learningAreaId: 'la-math',
      maxScore: 100,
      rows: [
        { admissionNumber: 'ADM-G2-01', score: 85, maxScore: 100 },
        { admissionNumber: 'ADM-G2-02', score: '', maxScore: 100 } // Blank mark
      ]
    }, userCtx);

    expect(validation.validRows).toBe(1);
    expect(validation.missingRows).toBe(1);
    expect(validation.invalidRows).toBe(0);

    const commitRes = await container.CBCUseCases.commitMarksUpload({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      learningAreaId: 'la-math',
      maxScore: 100,
      rows: [
        { admissionNumber: 'ADM-G2-01', score: 85, maxScore: 100 },
        { admissionNumber: 'ADM-G2-02', score: '', maxScore: 100 }
      ]
    }, userCtx);

    expect(commitRes.recordedCount).toBe(1);
    expect(commitRes.skippedMissingCount).toBe(1);

    // Verify student 2 was NOT recorded with a zero
    const summatives = await container.CBCAssessmentRepository.findSummatives({
      academicYearId,
      termId,
      learningAreaId: 'la-math'
    });
    const st2Mark = summatives.find((s: any) => s.studentId === stG2_2.id);
    expect(st2Mark).toBeUndefined(); // Safely preserved as unassessed!
  });

  // ==========================================
  // SCENARIO 7: Direct Unauthorized API Request Rejected (403 Forbidden)
  // ==========================================
  test('Scenario 7: Direct request by unauthorized teacher is blocked with 403 Forbidden', async () => {
    const userCtxTch3 = { userId: 'user-tch-3', email: 'teacher3@school.com', role: UserRole.TEACHER, schoolId };

    // Teacher 3 attempts to commit marks for Grade 7 Math
    await expect(
      container.CBCUseCases.commitMarksUpload({
        schoolId,
        academicYearId,
        termId,
        classRoomId: 'cls-g7',
        streamId: 'st-g7-west',
        learningAreaId: 'la-math',
        maxScore: 100,
        rows: [{ admissionNumber: 'ADM-G7-01', score: 90, maxScore: 100 }]
      }, userCtxTch3)
    ).rejects.toThrow(ForbiddenError);
  });

  // ==========================================
  // SCENARIO 8: Validation Failure Prevents Commit (No Partial Success)
  // ==========================================
  test('Scenario 8: Commit is rejected if invalid rows are present, preventing corrupted data', async () => {
    const userCtx = { userId: 'user-tch-1', email: 'teacher1@school.com', role: UserRole.TEACHER, schoolId };

    await expect(
      container.CBCUseCases.commitMarksUpload({
        schoolId,
        academicYearId,
        termId,
        classRoomId: 'cls-g2',
        streamId: 'st-g2-east',
        learningAreaId: 'la-math',
        maxScore: 100,
        rows: [
          { admissionNumber: 'ADM-G2-01', score: 90, maxScore: 100 },
          { admissionNumber: 'ADM-G2-02', score: 200, maxScore: 100 } // Out of range!
        ]
      }, userCtx)
    ).rejects.toThrow(ValidationError);

    // Verify first student's mark was NOT saved due to validation block
    const summatives = await container.CBCAssessmentRepository.findSummatives({
      academicYearId,
      termId,
      learningAreaId: 'la-math'
    });
    expect(summatives.length).toBe(0);
  });

  // ==========================================
  // SCENARIO 9: Immediate Broadsheet & Report Card Consistency
  // ==========================================
  test('Scenario 9: Saved marks immediately reflect on academic broadsheet and student report card', async () => {
    const userCtx = { userId: 'user-tch-1', email: 'teacher1@school.com', role: UserRole.TEACHER, schoolId };

    // Record marks for Faith Chebet (stG2_1) and Joy Akinyi (stG2_2)
    await container.CBCUseCases.commitMarksUpload({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      learningAreaId: 'la-math',
      maxScore: 100,
      rows: [
        { admissionNumber: 'ADM-G2-01', score: 95, maxScore: 100 },
        { admissionNumber: 'ADM-G2-02', score: 75, maxScore: 100 }
      ]
    }, userCtx);

    await container.CBCUseCases.commitMarksUpload({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      learningAreaId: 'la-eng',
      maxScore: 100,
      rows: [
        { admissionNumber: 'ADM-G2-01', score: 90, maxScore: 100 },
        { admissionNumber: 'ADM-G2-02', score: 80, maxScore: 100 }
      ]
    }, userCtx);

    // Broadsheet check
    const broadsheet = await container.broadsheetUseCases.getStreamBroadsheet({
      academicYearId,
      termId,
      streamId: 'st-g2-east'
    });

    expect(broadsheet.rows.length).toBe(2);
    const faithRow = broadsheet.rows.find(r => r.studentId === stG2_1.id);
    const joyRow = broadsheet.rows.find(r => r.studentId === stG2_2.id);

    expect(faithRow).toBeDefined();
    expect(faithRow!.streamRank).toBe(1); // 95 + 90 = 185
    expect(faithRow!.totalScore).toBe(185);

    expect(joyRow).toBeDefined();
    expect(joyRow!.streamRank).toBe(2); // 75 + 80 = 155
    expect(joyRow!.totalScore).toBe(155);

    // Report Card check
    const faithReport = await container.CBCUseCases.getReportCard(stG2_1.id, termId, academicYearId);
    expect(faithReport).toBeDefined();
    expect(faithReport.streamPosition).toBe(1);
    expect(faithReport.totalMarks).toBe(185);
  });

  // ==========================================
  // SCENARIO 10: Hybrid Teaching Model Support
  // ==========================================
  test('Scenario 10: Hybrid teacher can grade all subjects for assigned class and only assigned subject for secondary class', async () => {
    const userCtxHybrid = { userId: 'user-tch-hybrid', email: 'hybrid@school.com', role: UserRole.TEACHER, schoolId };
    const context = await container.academicUseCases.getTeacherAuthorizedContext(userCtxHybrid, academicYearId);

    expect(context.teachingModel).toBe('HYBRID');
    expect(context.assignedClasses.length).toBe(2);

    // Authorized classes include G1 and G7
    const classIds = context.assignedClasses.map(c => c.id);
    expect(classIds).toContain('cls-g1');
    expect(classIds).toContain('cls-g7');

    // In G1 (Class Teacher), teacher can grade Math and English
    const g1Subjects = context.authorizedSubjectsByClass['cls-g1'];
    expect(g1Subjects.length).toBeGreaterThan(0);

    // Teacher records Math in G1 (Allowed)
    const g1Math = await container.CBCUseCases.recordSummativeAssessment({
      studentId: stG1_1.id,
      teacherId: 'tch-hybrid',
      learningAreaId: 'la-math',
      termId,
      academicYearId,
      strandScores: [{ strandId: 'la-math', rawScore: 88, maxScore: 100, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }],
      overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      teacherRemarks: 'Strong foundations in counting',
      evaluationDate: '2026-03-20'
    }, userCtxHybrid);
    expect(g1Math).toBeDefined();

    // In G7, teacher can grade Science (Allowed)
    const g7Sci = await container.CBCUseCases.recordSummativeAssessment({
      studentId: stG7_1.id,
      teacherId: 'tch-hybrid',
      learningAreaId: 'la-sci',
      termId,
      academicYearId,
      strandScores: [{ strandId: 'la-sci', rawScore: 82, maxScore: 100, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }],
      overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      teacherRemarks: 'Good experimental inquiry',
      evaluationDate: '2026-03-20'
    }, userCtxHybrid);
    expect(g7Sci).toBeDefined();

    // In G7, teacher is FORBIDDEN from grading History (Not assigned to Teacher Hybrid!)
    await expect(
      container.CBCUseCases.recordSummativeAssessment({
        studentId: stG7_1.id,
        teacherId: 'tch-hybrid',
        learningAreaId: 'la-hist',
        termId,
        academicYearId,
        strandScores: [{ strandId: 'la-hist', rawScore: 75, maxScore: 100, performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS }],
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        teacherRemarks: 'Attempting unassigned subject',
        evaluationDate: '2026-03-20'
      }, userCtxHybrid)
    ).rejects.toThrow(ForbiddenError);
  });

  // ==========================================
  // SCENARIO 11: CSV Template Generation and Duplicate Detection
  // ==========================================
  test('Scenario 11: Marks template generation and CSV upload duplicate detection function correctly', async () => {
    const userCtx = { userId: 'user-tch-1', email: 'teacher1@school.com', role: UserRole.TEACHER, schoolId };

    // Generate CSV template for Grade 2 East Math
    const template = await container.CBCUseCases.generateMarksTemplate({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      learningAreaId: 'la-math',
      maxScore: 100
    }, userCtx);

    expect(template.filename).toContain('Marksheet_Grade_2_East_MATH.csv');
    expect(template.studentsCount).toBe(2);
    expect(template.csvContent).toContain('ADM-G2-01');
    expect(template.csvContent).toContain('ADM-G2-02');

    // Duplicate detection in CSV upload
    const duplicateValidation = await container.CBCUseCases.validateMarksUpload({
      schoolId,
      academicYearId,
      termId,
      classRoomId: 'cls-g2',
      streamId: 'st-g2-east',
      learningAreaId: 'la-math',
      maxScore: 100,
      rows: [
        { admissionNumber: 'ADM-G2-01', score: 80, maxScore: 100 },
        { admissionNumber: 'ADM-G2-01', score: 85, maxScore: 100 } // Duplicate admission number!
      ]
    }, userCtx);

    expect(duplicateValidation.duplicatesCount).toBe(1);
    expect(duplicateValidation.invalidRows).toBe(1);
    expect(duplicateValidation.errors[0].error).toContain('Duplicate admission number');
  });

  // ==========================================
  // SCENARIO 12: Parent Mobile API Safety
  // ==========================================
  test('Scenario 12: Backend changes preserve parent mobile API report card access without regression', async () => {
    // Link guardian to student
    const guardian = Guardian.create({
      userId: 'user-parent',
      relationship: GuardianRelationship.MOTHER,
      emergencyContact: '0712345678',
      studentIds: [stG7_1.id]
    }, 'guard-parent-1');
    await container.guardianRepository.save(guardian);

    // Record mark for Don Hemsworth (stG7_1)
    await container.CBCUseCases.recordSummativeAssessment({
      studentId: stG7_1.id,
      teacherId: 'tch-2',
      learningAreaId: 'la-math',
      termId,
      academicYearId,
      strandScores: [{ strandId: 'la-math', rawScore: 94, maxScore: 100, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }],
      overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
      teacherRemarks: 'Excellent mastery',
      evaluationDate: '2026-03-20'
    });

    const parentCtx = { userId: 'user-parent', email: 'parent@smartshule.com', role: UserRole.PARENT, schoolId };
    const report = await container.CBCUseCases.getReportCard(stG7_1.id, termId, academicYearId, parentCtx);

    expect(report).toBeDefined();
    expect(report.studentId).toBe(stG7_1.id);
    expect(report.totalMarks).toBe(94);
    expect((report as any).isRanked).toBe(true);
  });
});
