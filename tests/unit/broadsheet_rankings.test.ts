import { BroadsheetUseCases } from '../../src/application/academics/BroadsheetUseCases';
import { IAcademicRepository } from '../../src/core/ports/repositories/IAcademicRepository';
import { IStudentRepository } from '../../src/core/ports/repositories/IStudentRepository';
import { ICbcAssessmentRepository } from '../../src/core/ports/repositories/ICbcAssessmentRepository';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';

describe('Broadsheet Comparative Analytics Unit Tests', () => {
  let academicRepo: jest.Mocked<IAcademicRepository>;
  let studentRepo: jest.Mocked<IStudentRepository>;
  let cbcRepo: jest.Mocked<ICbcAssessmentRepository>;
  let broadsheetUseCases: BroadsheetUseCases;

  const mockClass: any = {
    id: 'class-g4',
    name: 'Grade 4',
    gradeLevel: CbcGradeLevel.GRADE_4,
    educationLevel: 'PRIMARY',
    schoolId: 'sch-1'
  };

  const mockStreamEast: any = {
    id: 'stream-east',
    name: 'Stream East',
    classRoomId: 'class-g4',
    capacity: 40
  };

  const mockStreamWest: any = {
    id: 'stream-west',
    name: 'Stream West',
    classRoomId: 'class-g4',
    capacity: 40
  };

  const mockLearningAreas: any[] = [
    { id: 'math', name: 'Mathematics', code: 'MATH', gradeLevel: CbcGradeLevel.GRADE_4 },
    { id: 'eng', name: 'English Language', code: 'ENG', gradeLevel: CbcGradeLevel.GRADE_4 },
    { id: 'kisw', name: 'Kiswahili Language', code: 'KISW', gradeLevel: CbcGradeLevel.GRADE_4 }
  ];

  const studentEast1 = Student.create({
    admissionNumber: 'ADM-101',
    firstName: 'Alice',
    lastName: 'Kamau',
    dateOfBirth: '2014-01-01',
    gender: StudentGender.FEMALE,
    gradeLevel: CbcGradeLevel.GRADE_4,
    streamId: 'stream-east',
    schoolId: 'sch-1',
    academicYearId: 'year-2026',
    guardianIds: ['g1'],
    status: StudentStatus.ACTIVE
  }, 's-e1');

  const studentEast2 = Student.create({
    admissionNumber: 'ADM-102',
    firstName: 'David',
    lastName: 'Mwangi',
    dateOfBirth: '2014-02-01',
    gender: StudentGender.MALE,
    gradeLevel: CbcGradeLevel.GRADE_4,
    streamId: 'stream-east',
    schoolId: 'sch-1',
    academicYearId: 'year-2026',
    guardianIds: ['g2'],
    status: StudentStatus.ACTIVE
  }, 's-e2');

  const studentWest1 = Student.create({
    admissionNumber: 'ADM-201',
    firstName: 'Brian',
    lastName: 'Otieno',
    dateOfBirth: '2014-03-01',
    gender: StudentGender.MALE,
    gradeLevel: CbcGradeLevel.GRADE_4,
    streamId: 'stream-west',
    schoolId: 'sch-1',
    academicYearId: 'year-2026',
    guardianIds: ['g3'],
    status: StudentStatus.ACTIVE
  }, 's-w1');

  beforeEach(() => {
    academicRepo = {
      findStreamById: jest.fn().mockImplementation((id: string) => {
        if (id === 'stream-east') return Promise.resolve(mockStreamEast);
        if (id === 'stream-west') return Promise.resolve(mockStreamWest);
        return Promise.resolve(null);
      }),
      findClassById: jest.fn().mockResolvedValue(mockClass),
      findStreamsByClass: jest.fn().mockResolvedValue([mockStreamEast, mockStreamWest]),
      findAllStreams: jest.fn().mockResolvedValue([mockStreamEast, mockStreamWest]),
      findAllClasses: jest.fn().mockResolvedValue([mockClass]),
      findAllLearningAreas: jest.fn().mockResolvedValue(mockLearningAreas),
      findTermById: jest.fn().mockResolvedValue({ id: 'term-3', name: 'Term 3', termNumber: 3 } as any),
      findCurrentTerm: jest.fn().mockResolvedValue({ id: 'term-3', name: 'Term 3', termNumber: 3 } as any),
      findTermsByYear: jest.fn().mockResolvedValue([{ id: 'term-3', name: 'Term 3', termNumber: 3 }] as any),
      findYearById: jest.fn().mockResolvedValue({ id: 'year-2026', name: '2026' } as any),
      findCurrentYear: jest.fn().mockResolvedValue({ id: 'year-2026', name: '2026' } as any),
      findAllYears: jest.fn().mockResolvedValue([{ id: 'year-2026', name: '2026' }] as any),
    } as any;

    studentRepo = {
      findAll: jest.fn().mockImplementation(({ streamId }: any) => {
        if (streamId === 'stream-east') return Promise.resolve([studentEast1, studentEast2]);
        if (streamId === 'stream-west') return Promise.resolve([studentWest1]);
        return Promise.resolve([]);
      }),
    } as any;

    const mockAssessments: any[] = [
      { studentId: 's-e1', learningAreaId: 'math', overallPerformanceLevel: 'EE', strandScores: [{ rawScore: 90 }] },
      { studentId: 's-e1', learningAreaId: 'eng', overallPerformanceLevel: 'EE', strandScores: [{ rawScore: 85 }] },
      { studentId: 's-e1', learningAreaId: 'kisw', overallPerformanceLevel: 'ME', strandScores: [{ rawScore: 78 }] },
      { studentId: 's-e2', learningAreaId: 'math', overallPerformanceLevel: 'ME', strandScores: [{ rawScore: 72 }] },
      { studentId: 's-e2', learningAreaId: 'eng', overallPerformanceLevel: 'ME', strandScores: [{ rawScore: 70 }] },
      { studentId: 's-e2', learningAreaId: 'kisw', overallPerformanceLevel: 'ME', strandScores: [{ rawScore: 68 }] },
      { studentId: 's-w1', learningAreaId: 'math', overallPerformanceLevel: 'ME', strandScores: [{ rawScore: 65 }] },
      { studentId: 's-w1', learningAreaId: 'eng', overallPerformanceLevel: 'EE', strandScores: [{ rawScore: 94 }] },
      { studentId: 's-w1', learningAreaId: 'kisw', overallPerformanceLevel: 'ME', strandScores: [{ rawScore: 74 }] },
    ];

    cbcRepo = {
      findSummatives: jest.fn().mockResolvedValue(mockAssessments),
      findReportCardsByTerm: jest.fn().mockResolvedValue([]),
    } as any;

    broadsheetUseCases = new BroadsheetUseCases(academicRepo, studentRepo, cbcRepo);
  });

  it('should return broadsheet with class rankings, best class per subject, and best student per subject', async () => {
    const result = await broadsheetUseCases.getStreamBroadsheet({
      streamId: 'stream-east',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });

    expect(result).toBeDefined();
    expect(result.streamId).toBe('stream-east');
    expect(result.className).toBe('Grade 4');
    expect(result.rows.length).toBe(2);

    // 1. Verify Class Rankings
    expect(result.classRankings).toBeDefined();
    expect(result.classRankings.length).toBeGreaterThanOrEqual(2);
    expect(result.classRankings[0].rank).toBe(1);
    expect(result.classRankings[0].meanScore).toBeGreaterThanOrEqual(result.classRankings[1].meanScore);
    expect(result.classRankings[0].streamName).toBeTruthy();
    expect(result.classRankings[0].qualityPassRate).toBeGreaterThanOrEqual(0);

    // 2. Verify Best Performing Class Per Subject
    expect(result.bestClassesPerSubject).toBeDefined();
    expect(result.bestClassesPerSubject.length).toBe(3);
    result.bestClassesPerSubject.forEach(item => {
      expect(item.learningAreaName).toBeTruthy();
      expect(item.bestStreamName).toBeTruthy();
      expect(item.meanScore).toBeGreaterThan(0);
      expect(item.performanceLevel).toBeTruthy();
    });

    // 3. Verify Best Student Per Subject
    expect(result.bestStudentsPerSubject).toBeDefined();
    expect(result.bestStudentsPerSubject.length).toBe(3);
    result.bestStudentsPerSubject.forEach(champ => {
      expect(champ.learningAreaName).toBeTruthy();
      expect(champ.studentName).toBeTruthy();
      expect(champ.admissionNumber).toBeTruthy();
      expect(champ.score).toBeGreaterThan(0);
      expect(champ.performanceLevel).toBeTruthy();
    });
  });

  it('should return complete broadsheet with streamRank, classRank, points, remarks, genderStats, and subject summaries', async () => {
    const result = await broadsheetUseCases.getStreamBroadsheet({
      streamId: 'stream-east',
      termId: 'term-3',
      academicYearId: 'year-2026',
      examType: 'End of Term Examination'
    });

    expect(result).toBeDefined();
    expect(result.examType).toBe('End of Term Examination');
    expect(result.totalClassStudents).toBe(3); // 2 in East + 1 in West

    // Verify row details
    const topRow = result.rows[0];
    expect(topRow.streamRank).toBe(1);
    expect(topRow.classRank).toBeGreaterThanOrEqual(1);
    expect(topRow.totalPoints).toBeGreaterThan(0);
    expect(topRow.meanPoints).toBeGreaterThan(0);
    expect(topRow.remarks).toBeTruthy();

    // Verify subject points and subjectRank
    const mathSub = topRow.subjects['math'];
    expect(mathSub.points).toBeGreaterThanOrEqual(1);
    expect(mathSub.subjectRank).toBeGreaterThanOrEqual(1);

    // Verify subject summaries
    const mathSummary = result.subjectSummaries.find(s => s.learningAreaId === 'math');
    expect(mathSummary).toBeDefined();
    expect(mathSummary!.meanPoints).toBeGreaterThan(0);
    expect(mathSummary!.highestScore).toBeGreaterThan(0);
    expect(mathSummary!.lowestScore).toBeGreaterThan(0);
    expect(mathSummary!.passRate).toBeGreaterThanOrEqual(0);

    // Verify Gender statistics
    expect(result.genderStats).toBeDefined();
    expect(result.genderStats.boysCount).toBe(1);
    expect(result.genderStats.girlsCount).toBe(1);
    expect(result.genderStats.totalCount).toBe(2);
    expect(result.genderStats.boysMeanScore).toBeGreaterThan(0);
    expect(result.genderStats.girlsMeanScore).toBeGreaterThan(0);
    expect(result.genderStats.topBoyName).toBeTruthy();
    expect(result.genderStats.topGirlName).toBeTruthy();
  });

  it('should support All Streams (Grade Consolidated) broadsheet mode', async () => {
    const result = await broadsheetUseCases.getStreamBroadsheet({
      streamId: 'all',
      classId: 'class-g4',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });

    expect(result).toBeDefined();
    expect(result.streamId).toBe('all');
    expect(result.streamName).toContain('All Streams');
    expect(result.rows.length).toBe(3); // 2 in East + 1 in West

    // Every learner has a streamName, streamRank, and classRank
    result.rows.forEach(r => {
      expect(r.streamName).toBeTruthy();
      expect(r.streamRank).toBeGreaterThanOrEqual(1);
      expect(r.classRank).toBeGreaterThanOrEqual(1);
      expect(r.rank).toBe(r.classRank);
    });

    // Gender breakdown across all streams
    expect(result.genderStats.boysCount).toBe(2);
    expect(result.genderStats.girlsCount).toBe(1);
    expect(result.genderStats.totalCount).toBe(3);
  });
});
