import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { ClassRoom, Stream, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { PerformanceLevel, AssessmentMethod, SummativeAssessment } from '../../src/core/domain/cbc/CbcAssessment';

describe('Phase 4: Report Card Class Position and Ranking Regression Tests (Tests A-G)', () => {
  let container: AppContainer;
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-1';

  let year: AcademicYear;
  let term1: AcademicTerm;
  let term2: AcademicTerm;

  let g1Class: ClassRoom;
  let g2Class: ClassRoom;
  let g2StreamEast: Stream;
  let g2StreamWest: Stream;

  let mathLA: LearningArea;
  let engLA: LearningArea;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    // Academic Year 2026
    year = AcademicYear.create({
      schoolId,
      name: '2026',
      startDate: '2026-01-05',
      endDate: '2026-11-20',
      isCurrent: true
    }, academicYearId);
    await container.academicRepository.saveYear(year);

    // Term 1
    term1 = AcademicTerm.create({
      academicYearId,
      name: 'Term 1',
      termNumber: 1,
      startDate: '2026-01-05',
      endDate: '2026-04-08',
      isCurrent: true
    }, termId);
    await container.academicRepository.saveTerm(term1);

    // Term 2
    term2 = AcademicTerm.create({
      academicYearId,
      name: 'Term 2',
      termNumber: 2,
      startDate: '2026-05-04',
      endDate: '2026-08-07',
      isCurrent: false
    }, 'term-2026-2');
    await container.academicRepository.saveTerm(term2);

    // Grade 1 Class (Single learner cohort)
    g1Class = ClassRoom.create({
      schoolId,
      name: 'Grade 1',
      gradeLevel: CBCGradeLevel.GRADE_1,
      educationLevel: EducationLevel.LOWER_PRIMARY
    }, 'class-g1');
    await container.academicRepository.saveClass(g1Class);

    // Grade 2 Class (Multi-stream cohort)
    g2Class = ClassRoom.create({
      schoolId,
      name: 'Grade 2',
      gradeLevel: CBCGradeLevel.GRADE_2,
      educationLevel: EducationLevel.LOWER_PRIMARY
    }, 'class-g2');
    await container.academicRepository.saveClass(g2Class);

    g2StreamEast = Stream.create({
      classRoomId: g2Class.id,
      name: 'Stream East',
      capacity: 35
    }, 'stream-g2-east');
    await container.academicRepository.saveStream(g2StreamEast);

    g2StreamWest = Stream.create({
      classRoomId: g2Class.id,
      name: 'Stream West',
      capacity: 35
    }, 'stream-g2-west');
    await container.academicRepository.saveStream(g2StreamWest);

    // Learning Areas
    mathLA = LearningArea.create({
      schoolId,
      name: 'Mathematics',
      code: 'MAT',
      educationLevel: EducationLevel.LOWER_PRIMARY,
      gradeLevel: CBCGradeLevel.GRADE_2,
      isElective: false
    }, 'la-math');
    await container.academicRepository.saveLearningArea(mathLA);

    engLA = LearningArea.create({
      schoolId,
      name: 'English Language',
      code: 'ENG',
      educationLevel: EducationLevel.LOWER_PRIMARY,
      gradeLevel: CBCGradeLevel.GRADE_2,
      isElective: false
    }, 'la-eng');
    await container.academicRepository.saveLearningArea(engLA);
  });

  const createSummative = async (
    studentId: string,
    learningAreaId: string,
    score: number,
    tId: string = termId,
    yId: string = academicYearId
  ) => {
    const level = score >= 80 ? PerformanceLevel.EXCEEDING_EXPECTATIONS
      : score >= 65 ? PerformanceLevel.MEETING_EXPECTATIONS
      : score >= 50 ? PerformanceLevel.APPROACHING_EXPECTATIONS
      : PerformanceLevel.BELOW_EXPECTATIONS;

    const sm = SummativeAssessment.create({
      studentId,
      teacherId: 'teacher-001',
      learningAreaId,
      termId: tId,
      academicYearId: yId,
      strandScores: [
        {
          strandId: 'strand-1',
          strandTitle: 'Strand 1',
          performanceLevel: level,
          rawScore: score,
          maxScore: 100
        }
      ],
      overallPerformanceLevel: level,
      teacherRemarks: 'Good attempt',
      evaluationDate: '2026-03-25'
    }, `summ-${studentId}-${learningAreaId}-${tId}`);

    await container.CBCAssessmentRepository.saveSummative(sm);
    return sm;
  };

  /**
   * TEST A: Different grades (Grade 1 with 1 learner vs Grade 2 with 20 learners).
   * Grade 1 learner is ranked 1 out of 1, never 9 out of 11 or 20.
   * Grade 2 learners are ranked out of 20, never combined with Grade 1.
   */
  test('Test A: Grade 1 (1 learner) vs Grade 2 (20 learners) are strictly isolated with correct denominators', async () => {
    // 1. Create 1 learner in Grade 1
    const g1Learner = Student.create({
      admissionNumber: 'G1-001',
      firstName: 'Faith',
      lastName: 'Chebet',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_1,
      classroomId: g1Class.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2019-03-12',
      status: StudentStatus.ACTIVE
    }, 'student-g1-01');
    await container.studentRepository.save(g1Learner);
    await createSummative(g1Learner.id, mathLA.id, 85);
    await createSummative(g1Learner.id, engLA.id, 90);

    // 2. Create 20 learners in Grade 2 (10 in East, 10 in West)
    const g2Learners: Student[] = [];
    for (let i = 1; i <= 20; i++) {
      const streamId = i <= 10 ? g2StreamEast.id : g2StreamWest.id;
      const s = Student.create({
        admissionNumber: `G2-${String(i).padStart(3, '0')}`,
        firstName: `G2Learner${i}`,
        lastName: `Test`,
        gender: i % 2 === 0 ? StudentGender.FEMALE : StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        classroomId: g2Class.id,
        streamId,
        schoolId,
        academicYearId,
        guardianIds: [],
        dateOfBirth: '2018-05-10',
        status: StudentStatus.ACTIVE
      }, `student-g2-${i}`);
      await container.studentRepository.save(s);
      g2Learners.push(s);

      // Score ranges from 95 down to 55
      const score = Math.max(50, 95 - (i * 2));
      await createSummative(s.id, mathLA.id, score);
      await createSummative(s.id, engLA.id, score);
    }

    // Evaluate Grade 1 learner report card
    const g1Report = await container.CBCUseCases.getReportCard(g1Learner.id, termId, academicYearId);
    expect(g1Report).toBeDefined();
    // Denominator must be strictly 1, position must be 1 (never 9 out of 11, never 9 out of 20)
    expect(g1Report.classPopulation).toBe(1);
    expect(g1Report.streamPopulation).toBe(1);
    expect(g1Report.classPosition).toBe(1);
    expect(g1Report.streamPosition).toBe(1);

    // Broadsheet for Grade 1
    const g1Broadsheet = await container.broadsheetUseCases.getStreamBroadsheet({
      streamId: 'all',
      classId: g1Class.id,
      termId,
      academicYearId
    });
    expect(g1Broadsheet.totalStudents).toBe(1);
    expect(g1Broadsheet.totalClassStudents).toBe(1);
    expect(g1Broadsheet.rows.length).toBe(1);
    expect(g1Broadsheet.rows[0].rank).toBe(1);
    expect(g1Broadsheet.rows[0].classRank).toBe(1);

    // Evaluate Grade 2 broadsheet
    const g2Broadsheet = await container.broadsheetUseCases.getStreamBroadsheet({
      streamId: 'all',
      classId: g2Class.id,
      termId,
      academicYearId
    });
    expect(g2Broadsheet.totalClassStudents).toBe(20);
    expect(g2Broadsheet.rows.length).toBe(20);

    // Verify Grade 1 learner is NOT in Grade 2 broadsheet
    const foundG1InG2 = g2Broadsheet.rows.find(r => r.studentId === g1Learner.id);
    expect(foundG1InG2).toBeUndefined();

    // Verify Grade 2 first learner report card
    const g2FirstReport = await container.CBCUseCases.getReportCard(g2Learners[0].id, termId, academicYearId);
    expect(g2FirstReport.classPopulation).toBe(20);
    expect(g2FirstReport.streamPopulation).toBe(10);
    expect(g2FirstReport.classPosition).toBe(1);
  });

  /**
   * TEST B: Broadsheet/report card position agreement.
   * If broadsheet lists a student at position 7 out of 18, report card displays 7 out of 18.
   */
  test('Test B: Broadsheet and report card agree on position and population for the same cohort', async () => {
    // Create 18 learners in Grade 2 Stream East
    const learners: Student[] = [];
    for (let i = 1; i <= 18; i++) {
      const s = Student.create({
        admissionNumber: `ADM-18-${String(i).padStart(3, '0')}`,
        firstName: `Peer${i}`,
        lastName: `Score${100 - i * 2}`,
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        classroomId: g2Class.id,
        streamId: g2StreamEast.id,
        schoolId,
        academicYearId,
        guardianIds: [],
        dateOfBirth: '2018-02-14',
        status: StudentStatus.ACTIVE
      }, `student-b-${i}`);
      await container.studentRepository.save(s);
      learners.push(s);

      // Decreasing total marks: #1 has 100, #7 has 88, #18 has 66
      const score = 100 - (i * 2);
      await createSummative(s.id, mathLA.id, score);
      await createSummative(s.id, engLA.id, score);
    }

    // Seventh student:
    const targetStudent = learners[6]; // index 6 is the 7th learner

    // Fetch Stream East broadsheet
    const bs = await container.broadsheetUseCases.getStreamBroadsheet({
      streamId: g2StreamEast.id,
      termId,
      academicYearId
    });

    const bsTargetRow = bs.rows.find(r => r.studentId === targetStudent.id);
    expect(bsTargetRow).toBeDefined();
    expect(bsTargetRow!.streamRank).toBe(7);
    expect(bs.totalStudents).toBe(18);

    // Fetch Target Student report card
    const rc = await container.CBCUseCases.getReportCard(targetStudent.id, termId, academicYearId);
    expect(rc).toBeDefined();
    expect(rc.streamPosition).toBe(7);
    expect(rc.streamPopulation).toBe(18);
    expect(rc.classPosition).toBe(7);

    // Verify 100% agreement
    expect(rc.streamPosition).toBe(bsTargetRow!.streamRank);
    expect(rc.streamPopulation).toBe(bs.totalStudents);
  });

  /**
   * TEST C: Accurate class total (denominator).
   * Denominator must represent only the comparison group (never hardcoded 11, never 0, never combined grades).
   */
  test('Test C: Accurate class total denominator reflects only the specific comparison group', async () => {
    // Cohort of exactly 5 learners in Grade 2 Stream West
    const streamWestLearners: Student[] = [];
    for (let i = 1; i <= 5; i++) {
      const s = Student.create({
        admissionNumber: `WST-0${i}`,
        firstName: `WestLearner${i}`,
        lastName: `Cohort`,
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        classroomId: g2Class.id,
        streamId: g2StreamWest.id,
        schoolId,
        academicYearId,
        guardianIds: [],
        dateOfBirth: '2018-07-20',
        status: StudentStatus.ACTIVE
      }, `student-c-${i}`);
      await container.studentRepository.save(s);
      streamWestLearners.push(s);
      await createSummative(s.id, mathLA.id, 70 + i);
    }

    const rc = await container.CBCUseCases.getReportCard(streamWestLearners[0].id, termId, academicYearId);
    // Denominator for stream must be exactly 5, NOT 11, NOT 0, NOT 18
    expect(rc.streamPopulation).toBe(5);
    expect(rc.streamPopulation).not.toBe(11);
    expect(rc.streamPopulation).not.toBe(0);
  });

  /**
   * TEST D: Tied scores under standard competition ranking.
   * If two learners tie for 1st place (500 pts each), both are 1st, and the next learner is 3rd (1, 1, 3).
   * If three learners tie for 4th place, next is 7th (4, 4, 4, 7).
   */
  test('Test D: Standard competition ranking assigns identical ranks to ties and skips subsequent positions', async () => {
    // 7 learners in Stream East
    const tiedLearners: Student[] = [];
    for (let i = 1; i <= 7; i++) {
      const s = Student.create({
        admissionNumber: `TIE-${i}`,
        firstName: `Learner${i}`,
        lastName: `TieTest`,
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        classroomId: g2Class.id,
        streamId: g2StreamEast.id,
        schoolId,
        academicYearId,
        guardianIds: [],
        dateOfBirth: '2018-01-01',
        status: StudentStatus.ACTIVE
      }, `student-d-${i}`);
      await container.studentRepository.save(s);
      tiedLearners.push(s);
    }

    // Learner 1 & 2 tie for 1st place with 90 marks
    await createSummative(tiedLearners[0].id, mathLA.id, 90);
    await createSummative(tiedLearners[1].id, mathLA.id, 90);

    // Learner 3 comes 3rd with 85 marks
    await createSummative(tiedLearners[2].id, mathLA.id, 85);

    // Learner 4, 5, 6 tie for 4th place with 75 marks
    await createSummative(tiedLearners[3].id, mathLA.id, 75);
    await createSummative(tiedLearners[4].id, mathLA.id, 75);
    await createSummative(tiedLearners[5].id, mathLA.id, 75);

    // Learner 7 comes 7th with 60 marks
    await createSummative(tiedLearners[6].id, mathLA.id, 60);

    const bs = await container.broadsheetUseCases.getStreamBroadsheet({
      streamId: g2StreamEast.id,
      termId,
      academicYearId
    });

    const getRank = (studentId: string) => bs.rows.find(r => r.studentId === studentId)?.streamRank;

    // Competition ranks: 1, 1, 3, 4, 4, 4, 7
    expect(getRank(tiedLearners[0].id)).toBe(1);
    expect(getRank(tiedLearners[1].id)).toBe(1);
    expect(getRank(tiedLearners[2].id)).toBe(3); // Skipped 2
    expect(getRank(tiedLearners[3].id)).toBe(4);
    expect(getRank(tiedLearners[4].id)).toBe(4);
    expect(getRank(tiedLearners[5].id)).toBe(4);
    expect(getRank(tiedLearners[6].id)).toBe(7); // Skipped 5 and 6

    // Verify report card reflects same standard competition ranks
    const rc1 = await container.CBCUseCases.getReportCard(tiedLearners[0].id, termId, academicYearId);
    const rc2 = await container.CBCUseCases.getReportCard(tiedLearners[1].id, termId, academicYearId);
    const rc3 = await container.CBCUseCases.getReportCard(tiedLearners[2].id, termId, academicYearId);
    const rc7 = await container.CBCUseCases.getReportCard(tiedLearners[6].id, termId, academicYearId);

    expect(rc1.streamPosition).toBe(1);
    expect(rc2.streamPosition).toBe(1);
    expect(rc3.streamPosition).toBe(3);
    expect(rc7.streamPosition).toBe(7);
  });

  /**
   * TEST E: Incomplete results handling (Pending / Not ranked).
   * A student lacking valid assessments must NOT receive rank 1 or a fake position.
   */
  test('Test E: Learners with incomplete/no marks are marked as unranked/pending, not rank 1', async () => {
    // 3 learners: 2 have marks, 1 has no marks entered
    const s1 = Student.create({
      admissionNumber: 'INC-01',
      firstName: 'Evaluated1',
      lastName: 'Passed',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: g2Class.id,
      streamId: g2StreamEast.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2018-04-11',
      status: StudentStatus.ACTIVE
    }, 'student-e-1');
    await container.studentRepository.save(s1);
    await createSummative(s1.id, mathLA.id, 80);

    const s2 = Student.create({
      admissionNumber: 'INC-02',
      firstName: 'Evaluated2',
      lastName: 'Passed',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: g2Class.id,
      streamId: g2StreamEast.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2018-04-12',
      status: StudentStatus.ACTIVE
    }, 'student-e-2');
    await container.studentRepository.save(s2);
    await createSummative(s2.id, mathLA.id, 70);

    const sIncomplete = Student.create({
      admissionNumber: 'INC-03',
      firstName: 'NoMarksYet',
      lastName: 'Pending',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: g2Class.id,
      streamId: g2StreamEast.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2018-04-13',
      status: StudentStatus.ACTIVE
    }, 'student-e-3');
    await container.studentRepository.save(sIncomplete);
    // No summatives created for sIncomplete

    const bs = await container.broadsheetUseCases.getStreamBroadsheet({
      streamId: g2StreamEast.id,
      termId,
      academicYearId
    });

    const incRow = bs.rows.find(r => r.studentId === sIncomplete.id);
    expect(incRow).toBeDefined();
    // Must be rank 0 / unranked, never 1
    expect(incRow!.streamRank).toBe(0);
    expect(incRow!.rank).toBe(0);
    expect(incRow!.isPending).toBe(true);

    // Report card must be unranked
    const rc = await container.CBCUseCases.getReportCard(sIncomplete.id, termId, academicYearId);
    expect(rc.streamPosition).toBeUndefined();
    expect(rc.classPosition).toBeUndefined();
    expect((rc as any).isRanked).toBe(false);
  });

  /**
   * TEST F: Multi-stream vs grade-level ranking.
   * If student is 1st in Stream East (out of 10), but 2nd overall in the Grade (out of 20),
   * streamPosition = 1 out of 10 and classPosition = 2 out of 20.
   */
  test('Test F: Multi-stream cohort distinguishes stream rank from whole-grade class rank', async () => {
    // Stream East: 5 learners. Top student in East scores 88.
    const eastTop = Student.create({
      admissionNumber: 'F-EAST-TOP',
      firstName: 'EastChampion',
      lastName: 'Gold',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: g2Class.id,
      streamId: g2StreamEast.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2018-09-01',
      status: StudentStatus.ACTIVE
    }, 'student-f-east-top');
    await container.studentRepository.save(eastTop);
    await createSummative(eastTop.id, mathLA.id, 88);

    for (let i = 2; i <= 5; i++) {
      const s = Student.create({
        admissionNumber: `F-EAST-${i}`,
        firstName: `EastPeer${i}`,
        lastName: `Peer`,
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        classroomId: g2Class.id,
        streamId: g2StreamEast.id,
        schoolId,
        academicYearId,
        guardianIds: [],
        dateOfBirth: '2018-09-02',
        status: StudentStatus.ACTIVE
      }, `student-f-east-${i}`);
      await container.studentRepository.save(s);
      await createSummative(s.id, mathLA.id, 80 - i);
    }

    // Stream West: 5 learners. Top student in West scores 96 (overall grade champion!).
    const westTop = Student.create({
      admissionNumber: 'F-WEST-TOP',
      firstName: 'WestChampion',
      lastName: 'Platinum',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: g2Class.id,
      streamId: g2StreamWest.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2018-09-01',
      status: StudentStatus.ACTIVE
    }, 'student-f-west-top');
    await container.studentRepository.save(westTop);
    await createSummative(westTop.id, mathLA.id, 96);

    for (let i = 2; i <= 5; i++) {
      const s = Student.create({
        admissionNumber: `F-WEST-${i}`,
        firstName: `WestPeer${i}`,
        lastName: `Peer`,
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_2,
        classroomId: g2Class.id,
        streamId: g2StreamWest.id,
        schoolId,
        academicYearId,
        guardianIds: [],
        dateOfBirth: '2018-09-02',
        status: StudentStatus.ACTIVE
      }, `student-f-west-${i}`);
      await container.studentRepository.save(s);
      await createSummative(s.id, mathLA.id, 75 - i);
    }

    // Check East Champion report card:
    const eastRc = await container.CBCUseCases.getReportCard(eastTop.id, termId, academicYearId);
    // 1st in Stream East (out of 5)
    expect(eastRc.streamPosition).toBe(1);
    expect(eastRc.streamPopulation).toBe(5);
    // 2nd across entire Grade 2 (out of 10), behind West Champion
    expect(eastRc.classPosition).toBe(2);
    expect(eastRc.classPopulation).toBe(10);

    // Check West Champion report card:
    const westRc = await container.CBCUseCases.getReportCard(westTop.id, termId, academicYearId);
    // 1st in Stream West (out of 5)
    expect(westRc.streamPosition).toBe(1);
    expect(westRc.streamPopulation).toBe(5);
    // 1st across entire Grade 2 (out of 10)
    expect(westRc.classPosition).toBe(1);
    expect(westRc.classPopulation).toBe(10);
  });

  /**
   * TEST G: Term and year isolation.
   * Term 2 marks do not impact Term 1 ranks or class populations.
   */
  test('Test G: Term and academic year isolation prevents cross-term rank pollution', async () => {
    const s1 = Student.create({
      admissionNumber: 'ISO-01',
      firstName: 'Term1Winner',
      lastName: 'A',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: g2Class.id,
      streamId: g2StreamEast.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2018-01-01',
      status: StudentStatus.ACTIVE
    }, 'student-g-1');
    await container.studentRepository.save(s1);

    const s2 = Student.create({
      admissionNumber: 'ISO-02',
      firstName: 'Term2Winner',
      lastName: 'B',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_2,
      classroomId: g2Class.id,
      streamId: g2StreamEast.id,
      schoolId,
      academicYearId,
      guardianIds: [],
      dateOfBirth: '2018-01-02',
      status: StudentStatus.ACTIVE
    }, 'student-g-2');
    await container.studentRepository.save(s2);

    // In Term 1: s1 scores 90, s2 scores 70
    await createSummative(s1.id, mathLA.id, 90, term1.id, academicYearId);
    await createSummative(s2.id, mathLA.id, 70, term1.id, academicYearId);

    // In Term 2: s2 scores 95, s1 scores 60
    await createSummative(s1.id, mathLA.id, 60, term2.id, academicYearId);
    await createSummative(s2.id, mathLA.id, 95, term2.id, academicYearId);

    // Verify Term 1: s1 is 1st, s2 is 2nd
    const t1Rc1 = await container.CBCUseCases.getReportCard(s1.id, term1.id, academicYearId);
    const t1Rc2 = await container.CBCUseCases.getReportCard(s2.id, term1.id, academicYearId);
    expect(t1Rc1.streamPosition).toBe(1);
    expect(t1Rc2.streamPosition).toBe(2);

    // Verify Term 2: s2 is 1st, s1 is 2nd
    const t2Rc1 = await container.CBCUseCases.getReportCard(s1.id, term2.id, academicYearId);
    const t2Rc2 = await container.CBCUseCases.getReportCard(s2.id, term2.id, academicYearId);
    expect(t2Rc2.streamPosition).toBe(1);
    expect(t2Rc1.streamPosition).toBe(2);
  });
});
