/**
 * SmartShule CBC Assessment System - Grace Seeds School
 * Unit Tests: Report Card Performance Comparisons & Genuine Assessment Data
 */

import { CBCAssessmentUseCases } from '../../src/application/cbc/CbcAssessmentUseCases';
import {
  InMemoryCBCAssessmentRepository,
  InMemoryStudentRepository,
  InMemoryAcademicRepository,
  InMemoryAttendanceRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { Student, CBCGradeLevel, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { PerformanceLevel } from '../../src/core/domain/cbc/CbcAssessment';

describe('CBC Report Card Multi-Term Comparisons — Real Assessment Data Enforcement', () => {
  let cbcRepo: InMemoryCBCAssessmentRepository;
  let studentRepo: InMemoryStudentRepository;
  let academicRepo: InMemoryAcademicRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let useCases: CBCAssessmentUseCases;

  const schoolId = 'school-grace-001';
  const academicYearId = 'year-2026';
  const term1Id = 'term-2026-1';
  const term2Id = 'term-2026-2';
  const term3Id = 'term-2026-3';
  const studentId = 'student-grace-001';
  const mathAreaId = 'la-math-grade3';
  const englishAreaId = 'la-eng-grade3';

  beforeEach(async () => {
    cbcRepo = new InMemoryCBCAssessmentRepository();
    studentRepo = new InMemoryStudentRepository();
    academicRepo = new InMemoryAcademicRepository();
    attendanceRepo = new InMemoryAttendanceRepository();

    useCases = new CBCAssessmentUseCases(
      cbcRepo,
      studentRepo,
      academicRepo,
      attendanceRepo
    );

    // Seed Academic Year 2026
    const year = AcademicYear.create({
      name: '2026',
      startDate: '2026-01-05',
      endDate: '2026-11-20',
      isCurrent: true,
      schoolId
    }, academicYearId);
    await academicRepo.saveYear(year);

    // Seed Academic Terms
    const term1 = AcademicTerm.create({
      academicYearId,
      termNumber: 1,
      name: 'Term 1',
      startDate: '2026-01-05',
      endDate: '2026-04-10',
      isCurrent: false
    }, term1Id);
    const term2 = AcademicTerm.create({
      academicYearId,
      termNumber: 2,
      name: 'Term 2',
      startDate: '2026-05-04',
      endDate: '2026-08-07',
      isCurrent: false
    }, term2Id);
    const term3 = AcademicTerm.create({
      academicYearId,
      termNumber: 3,
      name: 'Term 3',
      startDate: '2026-08-31',
      endDate: '2026-11-20',
      isCurrent: true
    }, term3Id);
    await academicRepo.saveTerm(term1);
    await academicRepo.saveTerm(term2);
    await academicRepo.saveTerm(term3);

    // Seed Student
    const student = Student.create({
      admissionNumber: 'GSS/2026/042',
      firstName: 'Amani',
      lastName: 'Zawadi',
      gender: StudentGender.FEMALE,
      dateOfBirth: '2018-05-12',
      gradeLevel: CBCGradeLevel.GRADE_3,
      streamId: 'stream-grade3-blue',
      guardianIds: ['guardian-001'],
      schoolId,
      academicYearId,
      status: StudentStatus.ACTIVE
    }, studentId);
    await studentRepo.save(student);

    // Seed Learning Areas
    const mathArea = LearningArea.create({
      name: 'Mathematics Activities',
      code: 'MATH',
      gradeLevel: CBCGradeLevel.GRADE_3,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      isElective: false,
      schoolId
    }, mathAreaId);
    const engArea = LearningArea.create({
      name: 'English Language Activities',
      code: 'ENG',
      gradeLevel: CBCGradeLevel.GRADE_3,
      educationLevel: EducationLevel.LOWER_PRIMARY,
      isElective: false,
      schoolId
    }, englishAreaId);
    await academicRepo.saveLearningArea(mathArea);
    await academicRepo.saveLearningArea(engArea);
  });

  describe('Scenario A: Pupil has assessment records only in Term 3', () => {
    beforeEach(async () => {
      // Record summative evaluation only in Term 3 (Score: 77%)
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term3Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        strandScores: [
          { performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, rawScore: 77, maxScore: 100 }
        ],
        teacherRemarks: 'Demonstrates solid mastery of numbers and mathematical concepts.'
      }]);
    });

    it('generates a report card where termTrends contains ONLY Term 3 (1 item)', async () => {
      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Good effort in Term 3.',
        headTeacherRemarks: 'Keep up the good progress.'
      });

      expect(report.termTrends).toBeDefined();
      expect(report.termTrends?.length).toBe(1);
      expect(report.termTrends?.[0].termNumber).toBe(3);
      expect(report.termTrends?.[0].term).toBe('Term 3');
      expect(report.termTrends?.[0].averageScore).toBe(77);
      expect(report.termTrends?.[0].status).toBe('CURRENT');

      // Verify no Term 1 or Term 2 entries were fabricated
      const hasTerm1 = report.termTrends?.some(t => t.termNumber === 1);
      const hasTerm2 = report.termTrends?.some(t => t.termNumber === 2);
      expect(hasTerm1).toBe(false);
      expect(hasTerm2).toBe(false);
    });

    it('learningAreaAssessments leaves term1Score and term2Score as undefined without inventing marks', async () => {
      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Good work.',
        headTeacherRemarks: 'Promoted.'
      });

      const mathEntry = report.learningAreaAssessments.find(a => a.learningAreaId === mathAreaId);
      expect(mathEntry).toBeDefined();
      expect(mathEntry?.score).toBe(77);
      expect(mathEntry?.term3Score).toBe(77);
      expect(mathEntry?.term1Score).toBeUndefined();
      expect(mathEntry?.term2Score).toBeUndefined();
    });

    it('getReportCard preserves real data without injecting fake currentAvg - 5 (72%) or - 2 (75%)', async () => {
      // First generate the report card
      await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Good work.',
        headTeacherRemarks: 'Promoted.'
      });

      // Now fetch it via getReportCard
      const fetched = await useCases.getReportCard(studentId, term3Id, academicYearId);

      expect(fetched.termTrends).toBeDefined();
      expect(fetched.termTrends?.length).toBe(1);
      expect(fetched.termTrends?.[0].termNumber).toBe(3);
      expect(fetched.termTrends?.[0].averageScore).toBe(77);

      // Verify Term 1 (72%) and Term 2 (75%/77%) are NOT in trends
      const t1 = fetched.termTrends?.find(t => t.termNumber === 1);
      const t2 = fetched.termTrends?.find(t => t.termNumber === 2);
      expect(t1).toBeUndefined();
      expect(t2).toBeUndefined();

      // Verify subject scores do not default to baseScore
      const fetchedMath = fetched.learningAreaAssessments?.find(a => a.learningAreaId === mathAreaId);
      expect(fetchedMath?.term1Score).toBeUndefined();
      expect(fetchedMath?.term2Score).toBeUndefined();
      expect(fetchedMath?.term3Score).toBe(77);
    });
  });

  describe('Scenario B: Pupil has marks in Term 2 and Term 3, but NO marks in Term 1', () => {
    beforeEach(async () => {
      // Term 2 assessment: 68%
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term2Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, rawScore: 68, maxScore: 100 }]
      }]);
      // Generate Term 2 report card
      await useCases.generateStudentReportCard({
        studentId,
        termId: term2Id,
        academicYearId,
        classTeacherRemarks: 'Steady progress in Term 2.',
        headTeacherRemarks: 'Well done.'
      });

      // Term 3 assessment: 76%
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term3Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, rawScore: 76, maxScore: 100 }]
      }]);
    });

    it('generates report card with exactly 2 terms in termTrends (Term 2 and Term 3)', async () => {
      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Great improvement.',
        headTeacherRemarks: 'Keep advancing.'
      });

      expect(report.termTrends?.length).toBe(2);
      const terms = report.termTrends?.map(t => t.termNumber);
      expect(terms).toEqual([2, 3]);

      const t2 = report.termTrends?.find(t => t.termNumber === 2);
      const t3 = report.termTrends?.find(t => t.termNumber === 3);
      expect(t2?.averageScore).toBe(68);
      expect(t3?.averageScore).toBe(76);

      // Verify Term 1 is strictly absent
      const t1 = report.termTrends?.find(t => t.termNumber === 1);
      expect(t1).toBeUndefined();
    });

    it('accurately resolves point growth between Term 2 and Term 3 (+8.0 pp)', async () => {
      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Great improvement.',
        headTeacherRemarks: 'Keep advancing.'
      });

      const trends = report.termTrends!;
      const pointChange = trends[trends.length - 1].averageScore - trends[0].averageScore;
      expect(pointChange).toBe(8); // 76 - 68 = +8 percentage points
    });
  });

  describe('Scenario C: Pupil has marks in Terms 1, 2, and 3', () => {
    beforeEach(async () => {
      // Term 1: 70%
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term1Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, rawScore: 70, maxScore: 100 }]
      }]);
      await useCases.generateStudentReportCard({
        studentId,
        termId: term1Id,
        academicYearId,
        classTeacherRemarks: 'Term 1 completed.',
        headTeacherRemarks: 'Good foundation.'
      });

      // Term 2: 75%
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term2Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, rawScore: 75, maxScore: 100 }]
      }]);
      await useCases.generateStudentReportCard({
        studentId,
        termId: term2Id,
        academicYearId,
        classTeacherRemarks: 'Term 2 completed.',
        headTeacherRemarks: 'Continued growth.'
      });

      // Term 3: 82%
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term3Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, rawScore: 82, maxScore: 100 }]
      }]);
    });

    it('generates report card with all 3 terms accurately populated from genuine records', async () => {
      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Excellent annual progression.',
        headTeacherRemarks: 'Promoted to Grade 4 with distinction.'
      });

      expect(report.termTrends?.length).toBe(3);
      expect(report.termTrends?.[0].averageScore).toBe(70);
      expect(report.termTrends?.[1].averageScore).toBe(75);
      expect(report.termTrends?.[2].averageScore).toBe(82);

      const mathEntry = report.learningAreaAssessments.find(a => a.learningAreaId === mathAreaId);
      expect(mathEntry?.term1Score).toBe(70);
      expect(mathEntry?.term2Score).toBe(75);
      expect(mathEntry?.term3Score).toBe(82);
    });
  });

  describe('Scenario D: Learner has no assessment records in the selected term', () => {
    it('returns empty learning area assessments and empty termTrends without fabricating scores', async () => {
      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'No marks entered yet.',
        headTeacherRemarks: 'Pending assessments.'
      });

      expect(report.learningAreaAssessments).toEqual([]);
      expect(report.termTrends).toEqual([]);
      expect(report.overallAverageScore).toBe(0);
    });
  });

  describe('Zero Score Preservation (Genuine Score of 0% vs Missing Data)', () => {
    it('preserves genuine 0% assessment score and does not convert to null/undefined or fallback to 74%', async () => {
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term3Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.BELOW_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.BELOW_EXPECTATIONS, rawScore: 0, maxScore: 100 }],
        teacherRemarks: 'Requires intensive intervention in foundational numeracy.'
      }]);

      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Needs urgent remedial attention.',
        headTeacherRemarks: 'Parent consultation scheduled.'
      });

      const mathEntry = report.learningAreaAssessments.find(a => a.learningAreaId === mathAreaId);
      expect(mathEntry).toBeDefined();
      expect(mathEntry?.score).toBe(0);
      expect(mathEntry?.term3Score).toBe(0);
      expect(mathEntry?.performanceLevel).toBe(PerformanceLevel.BELOW_EXPECTATIONS);

      // Verify termTrends reflects the genuine 0 score
      expect(report.termTrends?.length).toBe(1);
      expect(report.termTrends?.[0].averageScore).toBe(0);
    });
  });

  describe('Cross-Year Isolation', () => {
    it('strictly isolates previous academic year assessments from current academic year report card', async () => {
      const previousYearId = 'year-2025';
      const prevTerm1Id = 'term-2025-1';

      // Seed Previous Year & Term
      const prevYear = AcademicYear.create({
        name: '2025',
        startDate: '2025-01-06',
        endDate: '2025-11-21',
        isCurrent: false,
        schoolId
      }, previousYearId);
      const prevTerm = AcademicTerm.create({
        academicYearId: previousYearId,
        termNumber: 1,
        name: 'Term 1',
        startDate: '2025-01-06',
        endDate: '2025-04-11',
        isCurrent: false
      }, prevTerm1Id);
      await academicRepo.saveYear(prevYear);
      await academicRepo.saveTerm(prevTerm);

      // Record assessment in previous year (95%)
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: prevTerm1Id,
        academicYearId: previousYearId,
        overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, rawScore: 95, maxScore: 100 }]
      }]);

      // Record current year Term 3 assessment (78%)
      await useCases.recordSummativeBatch([{
        studentId,
        learningAreaId: mathAreaId,
        termId: term3Id,
        academicYearId,
        overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        strandScores: [{ performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, rawScore: 78, maxScore: 100 }]
      }]);

      // Generate current year Term 3 report card
      const report = await useCases.generateStudentReportCard({
        studentId,
        termId: term3Id,
        academicYearId,
        classTeacherRemarks: 'Term 3 review.',
        headTeacherRemarks: 'Satisfactory.'
      });

      // Previous year Term 1 (95%) must NOT be included as Term 1 in current year's trends
      expect(report.termTrends?.length).toBe(1);
      expect(report.termTrends?.[0].termNumber).toBe(3);
      expect(report.termTrends?.[0].averageScore).toBe(78);

      const mathEntry = report.learningAreaAssessments.find(a => a.learningAreaId === mathAreaId);
      expect(mathEntry?.term1Score).toBeUndefined();
      expect(mathEntry?.term3Score).toBe(78);
    });
  });

  describe('Term Performance Progression Line Graph Rules & Vector Rendering', () => {
    const buildProgressionGraph = (termsList: Array<{ termNumber: number; label: string; short: string; averageScore: number }>) => {
      if (termsList.length === 0) {
        return {
          hasData: false,
          message: 'No term assessment data recorded for this academic year.',
          connectingLines: [] as string[],
          points: [] as number[]
        };
      }

      const t1 = termsList.find(t => t.termNumber === 1);
      const t2 = termsList.find(t => t.termNumber === 2);
      const t3 = termsList.find(t => t.termNumber === 3);

      const connectingLines: string[] = [];
      if (t1 && t2) {
        connectingLines.push('T1->T2');
      }
      if (t2 && t3) {
        connectingLines.push('T2->T3');
      }

      const points: number[] = [];
      if (t1) points.push(1);
      if (t2) points.push(2);
      if (t3) points.push(3);

      return {
        hasData: true,
        isSingleTerm: termsList.length === 1,
        singleTermNotice: termsList.length === 1 ? 'Term comparison unavailable — Earlier assessment data is not recorded for this academic year.' : undefined,
        connectingLines,
        points
      };
    };

    it('Scenario 1: Single Term 3 record plots isolated point without connecting lines', () => {
      const graph = buildProgressionGraph([{ termNumber: 3, label: 'Term 3', short: 'T3', averageScore: 77 }]);
      expect(graph.hasData).toBe(true);
      expect(graph.isSingleTerm).toBe(true);
      expect(graph.points).toEqual([3]);
      expect(graph.connectingLines).toHaveLength(0);
      expect(graph.singleTermNotice).toContain('Term comparison unavailable');
    });

    it('Scenario 2: Terms 2 & 3 recorded connects ONLY 2 to 3, leaves Term 1 unrecorded', () => {
      const graph = buildProgressionGraph([
        { termNumber: 2, label: 'Term 2', short: 'T2', averageScore: 69 },
        { termNumber: 3, label: 'Term 3', short: 'T3', averageScore: 77 }
      ]);
      expect(graph.points).toEqual([2, 3]);
      expect(graph.connectingLines).toEqual(['T2->T3']);
      expect(graph.connectingLines).not.toContain('T1->T2');
    });

    it('Scenario 3: Terms 1, 2, and 3 all recorded connects consecutive segments (1->2 and 2->3)', () => {
      const graph = buildProgressionGraph([
        { termNumber: 1, label: 'Term 1', short: 'T1', averageScore: 65 },
        { termNumber: 2, label: 'Term 2', short: 'T2', averageScore: 70 },
        { termNumber: 3, label: 'Term 3', short: 'T3', averageScore: 78 }
      ]);
      expect(graph.points).toEqual([1, 2, 3]);
      expect(graph.connectingLines).toEqual(['T1->T2', 'T2->T3']);
    });

    it('Scenario 4: Terms 1 and 3 recorded with MISSING Term 2 does NOT draw a misleading line across Term 2', () => {
      const graph = buildProgressionGraph([
        { termNumber: 1, label: 'Term 1', short: 'T1', averageScore: 70 },
        { termNumber: 3, label: 'Term 3', short: 'T3', averageScore: 82 }
      ]);
      expect(graph.points).toEqual([1, 3]);
      expect(graph.connectingLines).toHaveLength(0);
    });

    it('Scenario 5: 0 terms displays clean message stating performance data is unavailable', () => {
      const graph = buildProgressionGraph([]);
      expect(graph.hasData).toBe(false);
      expect(graph.message).toBe('No term assessment data recorded for this academic year.');
    });
  });
});
