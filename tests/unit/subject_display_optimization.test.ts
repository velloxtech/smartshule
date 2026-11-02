import { BroadsheetUseCases } from '../../src/application/academics/BroadsheetUseCases';
import { CBCAssessmentUseCases } from '../../src/application/cbc/CbcAssessmentUseCases';
import { IAcademicRepository } from '../../src/core/ports/repositories/IAcademicRepository';
import { IStudentRepository } from '../../src/core/ports/repositories/IStudentRepository';
import { ICBCAssessmentRepository } from '../../src/core/ports/repositories/ICbcAssessmentRepository';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { PerformanceLevel, CBCReportCard } from '../../src/core/domain/cbc/CbcAssessment';

describe('Subject Display Optimization & Deduplication Unit Tests', () => {
  let academicRepo: jest.Mocked<IAcademicRepository>;
  let studentRepo: jest.Mocked<IStudentRepository>;
  let CBCRepo: jest.Mocked<ICBCAssessmentRepository>;
  let broadsheetUseCases: BroadsheetUseCases;
  let cbcUseCases: CBCAssessmentUseCases;

  const mockClass: any = {
    id: 'class-g4',
    name: 'Grade 4',
    gradeLevel: CBCGradeLevel.GRADE_4,
    educationLevel: 'PRIMARY',
    schoolId: 'school-001'
  };

  const mockStream: any = {
    id: 'stream-east',
    name: 'Stream East',
    classRoomId: 'class-g4',
    capacity: 40
  };

  // Database contains Grade 4 subjects, plus a duplicate Mathematics entry with another ID, and an unassessed subject
  const mockDbLearningAreas: any[] = [
    { id: 'la-g4-math-1', name: 'Mathematics', code: 'MATH', gradeLevel: CBCGradeLevel.GRADE_4 },
    { id: 'la-g4-math-2', name: 'Mathematical Activities', code: 'MAT', gradeLevel: CBCGradeLevel.GRADE_4 }, // duplicate of Math
    { id: 'la-g4-eng', name: 'English Language', code: 'ENG', gradeLevel: CBCGradeLevel.GRADE_4 },
    { id: 'la-g4-sci', name: 'Science and Technology', code: 'SCI_TECH', gradeLevel: CBCGradeLevel.GRADE_4 },
    { id: 'la-g4-french', name: 'French Language', code: 'FRE', gradeLevel: CBCGradeLevel.GRADE_4 }, // No learner has marks in French
  ];

  const student1 = Student.create({
    admissionNumber: 'ADM-001',
    firstName: 'Joy',
    lastName: 'Achieng',
    dateOfBirth: '2014-01-01',
    gender: StudentGender.FEMALE,
    gradeLevel: CBCGradeLevel.GRADE_4,
    streamId: 'stream-east',
    schoolId: 'school-001',
    academicYearId: 'year-2026',
    guardianIds: ['g1'],
    status: StudentStatus.ACTIVE
  }, 's-001');

  const student2 = Student.create({
    admissionNumber: 'ADM-002',
    firstName: 'Peter',
    lastName: 'Omondi',
    dateOfBirth: '2014-02-01',
    gender: StudentGender.MALE,
    gradeLevel: CBCGradeLevel.GRADE_4,
    streamId: 'stream-east',
    schoolId: 'school-001',
    academicYearId: 'year-2026',
    guardianIds: ['g2'],
    status: StudentStatus.ACTIVE
  }, 's-002');

  beforeEach(() => {
    academicRepo = {
      findStreamById: jest.fn().mockResolvedValue(mockStream),
      findClassById: jest.fn().mockResolvedValue(mockClass),
      findStreamsByClass: jest.fn().mockResolvedValue([mockStream]),
      findAllStreams: jest.fn().mockResolvedValue([mockStream]),
      findAllClasses: jest.fn().mockResolvedValue([mockClass]),
      findAllLearningAreas: jest.fn().mockResolvedValue(mockDbLearningAreas),
      findLearningAreaById: jest.fn().mockImplementation((id: string) => {
        const found = mockDbLearningAreas.find(a => a.id === id);
        return Promise.resolve(found || null);
      }),
      findTermById: jest.fn().mockResolvedValue({ id: 'term-3', name: 'Term 3', termNumber: 3 } as any),
      findCurrentTerm: jest.fn().mockResolvedValue({ id: 'term-3', name: 'Term 3', termNumber: 3 } as any),
      findTermsByYear: jest.fn().mockResolvedValue([{ id: 'term-3', name: 'Term 3', termNumber: 3 }] as any),
      findYearById: jest.fn().mockResolvedValue({ id: 'year-2026', name: '2026' } as any),
      findCurrentYear: jest.fn().mockResolvedValue({ id: 'year-2026', name: '2026' } as any),
      findAllYears: jest.fn().mockResolvedValue([{ id: 'year-2026', name: '2026' }] as any),
    } as any;

    studentRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 's-001') return Promise.resolve(student1);
        if (id === 's-002') return Promise.resolve(student2);
        return Promise.resolve(null);
      }),
      findAll: jest.fn().mockResolvedValue([student1, student2]),
      findEnrolmentCount: jest.fn().mockResolvedValue(2),
    } as any;

    // Summative assessments: English and Science have marks, Math has marks under la-g4-math-1, French has NO marks
    const mockAssessments: any[] = [
      { studentId: 's-001', learningAreaId: 'la-g4-math-1', overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, strandScores: [{ rawScore: 92 }] },
      { studentId: 's-001', learningAreaId: 'la-g4-eng', overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, strandScores: [{ rawScore: 88 }] },
      { studentId: 's-001', learningAreaId: 'la-g4-sci', overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, strandScores: [{ rawScore: 75 }] },
      { studentId: 's-002', learningAreaId: 'la-g4-math-1', overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, strandScores: [{ rawScore: 78 }] },
      { studentId: 's-002', learningAreaId: 'la-g4-eng', overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, strandScores: [{ rawScore: 70 }] },
      { studentId: 's-002', learningAreaId: 'la-g4-sci', overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS, strandScores: [{ rawScore: 72 }] },
    ];

    CBCRepo = {
      findSummatives: jest.fn().mockResolvedValue(mockAssessments),
      findFormatives: jest.fn().mockResolvedValue([]),
      findReportCardsByTerm: jest.fn().mockResolvedValue([]),
      findReportCard: jest.fn().mockResolvedValue(null),
      findReportCardsByStudent: jest.fn().mockResolvedValue([]),
      saveReportCard: jest.fn().mockResolvedValue(undefined),
      updateReportCard: jest.fn().mockResolvedValue(undefined),
    } as any;

    broadsheetUseCases = new BroadsheetUseCases(academicRepo, studentRepo, CBCRepo);
    cbcUseCases = new CBCAssessmentUseCases(
      CBCRepo,
      studentRepo,
      academicRepo,
      {
        getAttendanceStats: jest.fn().mockResolvedValue({ daysPresent: 58, totalDays: 60, attendancePercentage: 96 }),
        findRegisters: jest.fn().mockResolvedValue([])
      } as any
    );
  });

  describe('Broadsheet Subject Deduplication and Priority', () => {
    it('should display only subjects in the database and have ZERO duplicates', async () => {
      const result = await broadsheetUseCases.getStreamBroadsheet({
        streamId: 'stream-east',
        termId: 'term-3',
        academicYearId: 'year-2026'
      });

      expect(result).toBeDefined();

      // Check for duplicates: math-1 and math-2 must be merged into a single subject
      const subjectNames = result.learningAreas.map(la => la.name.toLowerCase());
      const mathCount = subjectNames.filter(n => n.includes('math')).length;
      expect(mathCount).toBe(1);

      // Verify no duplicates at all in learningAreas
      const uniqueIds = new Set(result.learningAreas.map(la => la.id));
      expect(uniqueIds.size).toBe(result.learningAreas.length);
    });

    it('should display ONLY uploaded subject fields on the broadsheet when marks exist and omit un-assessed curriculum areas', async () => {
      const result = await broadsheetUseCases.getStreamBroadsheet({
        streamId: 'stream-east',
        termId: 'term-3',
        academicYearId: 'year-2026'
      });

      // In mockDbLearningAreas, French has 0 marks, while Math, Eng, Sci have marks
      const displayedIds = result.learningAreas.map(la => la.id);

      // French (unassessed) must NOT be displayed on the master broadsheet
      expect(displayedIds).not.toContain('la-g4-french');

      // The broadsheet learning areas must ONLY contain the subjects that had marks uploaded (Math, Eng, Sci)
      expect(result.learningAreas.length).toBe(3);
      for (const la of result.learningAreas) {
        const hasMarks = result.rows.some(r => r.subjects[la.id] && r.subjects[la.id].levelLabel !== '--');
        expect(hasMarks).toBe(true);
      }
    });
  });

  describe('Report Card Subject Deduplication and Priority', () => {
    it('should generate report card with no duplicates and prioritized assessed subjects', async () => {
      const rcResult = await cbcUseCases.generateStudentReportCard({
        studentId: 's-001',
        termId: 'term-3',
        academicYearId: 'year-2026',
        classTeacherRemarks: 'Good effort.',
        headTeacherRemarks: 'Keep it up.'
      });

      expect(rcResult).toBeDefined();
      const evals = rcResult.learningAreaAssessments;

      // Check that Math is only included once
      const mathEvals = evals.filter(e => e.learningAreaName.toLowerCase().includes('math'));
      expect(mathEvals.length).toBe(1);

      // Check that all subjects with marks have the highest priority (appear first)
      let foundUnassessed = false;
      for (const ev of evals) {
        const hasScore = ev.score !== undefined && ev.score !== null && ev.score > 0;
        if (!hasScore) {
          foundUnassessed = true;
        } else {
          // If we find an assessed subject AFTER an unassessed one, priority was violated
          expect(foundUnassessed).toBe(false);
        }
      }
    });

    it('should deduplicate existing report cards on getReportCard and place scored subjects first', async () => {
      // Create a report card that has duplicate Mathematics entries stored in DB
      const legacyRC = CBCReportCard.create({
        studentId: 's-001',
        termId: 'term-3',
        academicYearId: 'year-2026',
        gradeLevel: CBCGradeLevel.GRADE_4,
        streamId: 'stream-east',
        learningAreaAssessments: [
          { learningAreaId: 'la-g4-french', learningAreaName: 'French Language', code: 'FRE', score: 0, levelLabel: '--', rubricScore: 1, performanceLevel: PerformanceLevel.BELOW_EXPECTATIONS, teacherRemarks: '' },
          { learningAreaId: 'la-g4-math-1', learningAreaName: 'Mathematics', code: 'MATH', score: 92, levelLabel: 'EE', rubricScore: 4, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, teacherRemarks: 'Excellent' },
          { learningAreaId: 'la-g4-math-2', learningAreaName: 'Mathematics', code: 'MAT', score: 85, levelLabel: 'EE', rubricScore: 4, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, teacherRemarks: 'Duplicate' },
          { learningAreaId: 'la-g4-eng', learningAreaName: 'English Language', code: 'ENG', score: 88, levelLabel: 'EE', rubricScore: 4, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, teacherRemarks: 'Very Good' }
        ],
        coreCompetencyAssessments: [],
        valueAssessments: [],
        attendanceDaysPresent: 58,
        attendanceDaysTotal: 60,
        classTeacherRemarks: 'Good',
        headTeacherRemarks: 'Good',
        overallAverageScore: 90,
        overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
        classPosition: 1,
        classPopulation: 2,
        overallPosition: 1,
        overallPopulation: 2
      }, 'rc-001');

      (CBCRepo.findReportCard as jest.Mock).mockResolvedValue(legacyRC);

      const result = await cbcUseCases.getReportCard('s-001', 'term-3', 'year-2026');

      expect(result).toBeDefined();
      const evals = result.learningAreaAssessments;

      // Exactly one Mathematics entry (deduplicated)
      const mathEntries = evals.filter(e => e.learningAreaName.toLowerCase().includes('math'));
      expect(mathEntries.length).toBe(1);
      expect(mathEntries[0].score).toBe(92); // Kept higher score

      // Subjects with marks (Math, Eng) must be prioritized ahead of French (score 0)
      expect(evals[0].score).toBeGreaterThan(0);
      expect(evals[1].score).toBeGreaterThan(0);
      expect(evals[evals.length - 1].learningAreaName).toBe('French Language');
    });

    it('should correctly canonicalize Language Activities (LAN) and Pre-Primary SRE without UUID degradation', () => {
      expect(broadsheetUseCases.getSubjectCanonicalKey('LAN')).toBe('LAN');
      expect(broadsheetUseCases.getSubjectCanonicalKey('Language Activities')).toBe('LAN');
      expect(broadsheetUseCases.getSubjectCanonicalKey('la-playgroup-lan')).toBe('LAN');
      expect(broadsheetUseCases.getSubjectCanonicalKey('la-playgroup-sre')).toBe('SRE');
      expect(broadsheetUseCases.getSubjectCanonicalKey('Religious Education Activities')).toBe('CRE');
    });

    it('should map UUIDs to canonical subjects when code or name is supplied and eliminate duplicate subject rows', () => {
      // User reported UUIDs: 26890bea-195a-458a-b3d5-e384e7bc5f67 (SST), 2909b6bf-5dfd-4a4f-8551-4429d2664d63 (ENG), caf5b759-4289-4566-ba94-af0feeb5f345 (AGRI)
      const sstCanonical = broadsheetUseCases.getSubjectCanonicalKey('SST Social Studies 26890bea-195a-458a-b3d5-e384e7bc5f67');
      expect(sstCanonical).toBe('SST');

      const engCanonical = broadsheetUseCases.getSubjectCanonicalKey('ENG English Language 2909b6bf-5dfd-4a4f-8551-4429d2664d63');
      expect(engCanonical).toBe('ENG');

      const agriCanonical = broadsheetUseCases.getSubjectCanonicalKey('AGRI Agriculture & Nutrition caf5b759-4289-4566-ba94-af0feeb5f345');
      expect(agriCanonical).toBe('AGRI');
    });
  });
});
