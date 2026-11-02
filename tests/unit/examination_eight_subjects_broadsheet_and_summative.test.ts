import { BroadsheetUseCases } from '../../src/application/academics/BroadsheetUseCases';
import { CBCAssessmentUseCases } from '../../src/application/cbc/CbcAssessmentUseCases';
import { IAcademicRepository } from '../../src/core/ports/repositories/IAcademicRepository';
import { IStudentRepository } from '../../src/core/ports/repositories/IStudentRepository';
import { ICBCAssessmentRepository } from '../../src/core/ports/repositories/ICbcAssessmentRepository';
import { ITeacherRepository } from '../../src/core/ports/repositories/ITeacherRepository';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { PerformanceLevel, SummativeAssessment } from '../../src/core/domain/cbc/CbcAssessment';
import { ValidationError } from '../../src/core/domain/shared/Errors';

describe('Critical Bug Fix: All Uploaded Examination Subjects Display (Tests A-H)', () => {
  let academicRepo: jest.Mocked<IAcademicRepository>;
  let studentRepo: jest.Mocked<IStudentRepository>;
  let CBCRepo: jest.Mocked<ICBCAssessmentRepository>;
  let teacherRepo: jest.Mocked<ITeacherRepository>;
  let broadsheetUseCases: BroadsheetUseCases;
  let cbcUseCases: CBCAssessmentUseCases;

  const mockClass: any = {
    id: 'class-g1',
    name: 'Grade 1',
    gradeLevel: CBCGradeLevel.GRADE_1,
    educationLevel: 'PRIMARY',
    schoolId: 'school-001'
  };

  const mockStream: any = {
    id: 'stream-g1-main',
    name: 'Grade 1 Main',
    classRoomId: 'class-g1',
    capacity: 40
  };

  // 10 subjects: 4 defined with Grade 1 gradeLevel, 4 defined under other grades/school-wide, and 2 unassessed
  const mockLearningAreas: any[] = [
    { id: 'la-mat', name: 'Mathematical Activities', code: 'MAT', gradeLevel: CBCGradeLevel.GRADE_1 },
    { id: 'la-kis', name: 'Kiswahili Language Activities', code: 'KIS', gradeLevel: CBCGradeLevel.GRADE_1 },
    { id: 'la-env', name: 'Environmental Activities', code: 'ENV', gradeLevel: CBCGradeLevel.GRADE_1 },
    { id: 'la-crea', name: 'Creative Activities', code: 'CREA', gradeLevel: CBCGradeLevel.GRADE_1 },
    // These 4 were uploaded by teachers for the examination, but their DB learning_area has a different gradeLevel
    { id: 'uuid-eng-001', name: 'English Language', code: 'ENG', gradeLevel: CBCGradeLevel.GRADE_5 },
    { id: 'uuid-sre-002', name: 'Religious Education Activities', code: 'SRE', gradeLevel: 'PLAYGROUP' },
    { id: 'uuid-sst-003', name: 'Social Studies', code: 'SST', gradeLevel: CBCGradeLevel.GRADE_7 },
    { id: 'uuid-agri-004', name: 'Agriculture & Nutrition', code: 'AGRI', gradeLevel: CBCGradeLevel.GRADE_5 },
    // 9th and 10th subjects for > 8 subjects testing
    { id: 'uuid-art-005', name: 'Creative Arts & Sports', code: 'ARTS', gradeLevel: CBCGradeLevel.GRADE_6 },
    { id: 'uuid-fre-006', name: 'French Language', code: 'FRE', gradeLevel: CBCGradeLevel.GRADE_4 },
  ];

  const student1 = Student.create({
    admissionNumber: '1001',
    firstName: 'Felix',
    lastName: 'Otieno',
    dateOfBirth: '2018-01-01',
    gender: StudentGender.MALE,
    gradeLevel: CBCGradeLevel.GRADE_1,
    streamId: 'stream-g1-main',
    schoolId: 'school-001',
    academicYearId: 'year-2026',
    guardianIds: ['g1'],
    status: StudentStatus.ACTIVE
  }, 's-001');

  const student2 = Student.create({
    admissionNumber: '1002',
    firstName: 'Mercy',
    lastName: 'Atieno',
    dateOfBirth: '2018-02-01',
    gender: StudentGender.FEMALE,
    gradeLevel: CBCGradeLevel.GRADE_1,
    streamId: 'stream-g1-main',
    schoolId: 'school-001',
    academicYearId: 'year-2026',
    guardianIds: ['g2'],
    status: StudentStatus.ACTIVE
  }, 's-002');

  let savedSummatives: any[] = [];

  beforeEach(() => {
    savedSummatives = [];

    academicRepo = {
      findStreamById: jest.fn().mockResolvedValue(mockStream),
      findClassById: jest.fn().mockResolvedValue(mockClass),
      findStreamsByClass: jest.fn().mockResolvedValue([mockStream]),
      findAllStreams: jest.fn().mockResolvedValue([mockStream]),
      findAllClasses: jest.fn().mockResolvedValue([mockClass]),
      findAllLearningAreas: jest.fn().mockResolvedValue(mockLearningAreas),
      findLearningAreaById: jest.fn().mockImplementation((id: string) => {
        const found = mockLearningAreas.find(a => a.id === id);
        return Promise.resolve(found || null);
      }),
      findTermById: jest.fn().mockImplementation((id: string) => Promise.resolve({
        id,
        name: id.includes('1') ? 'Term 1' : 'Term 3',
        termNumber: id.includes('1') ? 1 : 3
      } as any)),
      findCurrentTerm: jest.fn().mockResolvedValue({ id: 'term-3', name: 'Term 3', termNumber: 3 } as any),
      findTermsByYear: jest.fn().mockResolvedValue([
        { id: 'term-1', name: 'Term 1', termNumber: 1 },
        { id: 'term-3', name: 'Term 3', termNumber: 3 }
      ] as any),
      findYearById: jest.fn().mockResolvedValue({ id: 'year-2026', name: '2026' } as any),
      findCurrentYear: jest.fn().mockResolvedValue({ id: 'year-2026', name: '2026' } as any),
      findAllYears: jest.fn().mockResolvedValue([{ id: 'year-2026', name: '2026' }] as any),
      findClassTeacherAssignments: jest.fn().mockResolvedValue([{ classRoomId: 'class-g1', isActive: true }] as any),
      findSubjectTeacherAssignments: jest.fn().mockResolvedValue([]),
    } as any;

    studentRepo = {
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === 's-001') return Promise.resolve(student1);
        if (id === 's-002') return Promise.resolve(student2);
        return Promise.resolve(null);
      }),
      findAll: jest.fn().mockImplementation((query?: any) => {
        if (query?.classroomId === 'class-g1' || query?.gradeLevel === CBCGradeLevel.GRADE_1) {
          return Promise.resolve([student1, student2]);
        }
        return Promise.resolve([student1, student2]);
      }),
      findEnrolmentCount: jest.fn().mockResolvedValue(2),
    } as any;

    CBCRepo = {
      findSummatives: jest.fn().mockImplementation((query: any) => {
        let list = [...savedSummatives];
        if (query.termId) list = list.filter(s => s.termId === query.termId);
        if (query.academicYearId) list = list.filter(s => s.academicYearId === query.academicYearId);
        if (query.studentId) list = list.filter(s => s.studentId === query.studentId);
        if (query.learningAreaId) list = list.filter(s => s.learningAreaId === query.learningAreaId);
        return Promise.resolve(list);
      }),
      saveSummative: jest.fn().mockImplementation((assessment: any) => {
        const json = typeof assessment.toJSON === 'function' ? assessment.toJSON() : assessment;
        const idx = savedSummatives.findIndex(s => s.id === json.id || (s.studentId === json.studentId && s.learningAreaId === json.learningAreaId && s.termId === json.termId));
        if (idx >= 0) {
          savedSummatives[idx] = json;
        } else {
          savedSummatives.push(json);
        }
        return Promise.resolve();
      }),
      findFormatives: jest.fn().mockResolvedValue([]),
      findReportCardsByTerm: jest.fn().mockResolvedValue([]),
      findReportCard: jest.fn().mockResolvedValue(null),
      findReportCardsByStudent: jest.fn().mockResolvedValue([]),
      saveReportCard: jest.fn().mockResolvedValue(undefined),
      updateReportCard: jest.fn().mockResolvedValue(undefined),
      findStrandById: jest.fn().mockResolvedValue(null),
    } as any;

    teacherRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'tch-001', userId: 'u-tch-1', assignedClassStreamIds: ['class-g1'] } as any),
      findByUserId: jest.fn().mockResolvedValue({ id: 'tch-001', userId: 'u-tch-1', assignedClassStreamIds: ['class-g1'] } as any),
    } as any;

    broadsheetUseCases = new BroadsheetUseCases(academicRepo, studentRepo, CBCRepo, teacherRepo);
    cbcUseCases = new CBCAssessmentUseCases(
      CBCRepo,
      studentRepo,
      academicRepo,
      {
        getAttendanceStats: jest.fn().mockResolvedValue({ daysPresent: 58, totalDays: 60, attendancePercentage: 96 }),
        findRegisters: jest.fn().mockResolvedValue([])
      } as any,
      undefined,
      undefined,
      teacherRepo
    );
  });

  const uploadEightSubjects = async () => {
    // 8 distinct subjects with marks
    const eightSubjects = [
      { id: 'la-mat', score: 93, level: PerformanceLevel.EXCEEDING_EXPECTATIONS },
      { id: 'la-kis', score: 100, level: PerformanceLevel.EXCEEDING_EXPECTATIONS },
      { id: 'la-env', score: 98, level: PerformanceLevel.EXCEEDING_EXPECTATIONS },
      { id: 'la-crea', score: 65, level: PerformanceLevel.MEETING_EXPECTATIONS },
      { id: 'uuid-eng-001', score: 90, level: PerformanceLevel.EXCEEDING_EXPECTATIONS },
      { id: 'uuid-sre-002', score: 90, level: PerformanceLevel.EXCEEDING_EXPECTATIONS },
      { id: 'uuid-sst-003', score: 100, level: PerformanceLevel.EXCEEDING_EXPECTATIONS },
      { id: 'uuid-agri-004', score: 76, level: PerformanceLevel.MEETING_EXPECTATIONS },
    ];

    for (const sub of eightSubjects) {
      await cbcUseCases.commitMarksUpload({
        academicYearId: 'year-2026',
        termId: 'term-3',
        classRoomId: 'class-g1',
        learningAreaId: sub.id,
        maxScore: 100,
        rows: [
          { admissionNumber: '1001', score: sub.score, performanceLevel: sub.level }
        ]
      }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);
    }
  };

  test('Test A — Eight subjects: Upload marks for eight subjects in one examination, all eight appear in summative and broadsheet', async () => {
    await uploadEightSubjects();

    // Verify all 8 are saved in repository
    expect(savedSummatives.length).toBe(8);

    // Verify summative assessment query retrieves all 8
    const summatives = await cbcUseCases.listSummativeAssessments({
      studentId: 's-001',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });
    expect(summatives.length).toBe(8);

    // Verify academic broadsheet displays all 8 subjects
    const broadsheet = await broadsheetUseCases.getStreamBroadsheet({
      classId: 'class-g1',
      streamId: 'all',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });

    expect(broadsheet.learningAreas.length).toBe(8);
    const displayedNames = broadsheet.learningAreas.map(la => la.name.toLowerCase());
    expect(displayedNames).toContain('mathematics');
    expect(displayedNames).toContain('kiswahili language');
    expect(displayedNames).toContain('environmental activities');
    expect(displayedNames).toContain('creative activities');
    expect(displayedNames).toContain('english language');
    expect(displayedNames.some(n => n.includes('religious education'))).toBe(true);
    expect(displayedNames).toContain('social studies');
    expect(displayedNames).toContain('agriculture & nutrition');

    // Verify student total and evaluated count includes all 8 subjects
    const row = broadsheet.rows.find(r => r.studentId === 's-001');
    expect(row).toBeDefined();
    expect(row!.evaluatedCount).toBe(8);
    expect(row!.totalScore).toBe(93 + 100 + 98 + 65 + 90 + 90 + 100 + 76); // 712
    expect(row!.averageScore).toBe(89);
  });

  test('Test B — More than eight subjects: Does not silently truncate when an assessment contains 10 subjects', async () => {
    await uploadEightSubjects();

    // Upload 9th and 10th subjects
    await cbcUseCases.commitMarksUpload({
      academicYearId: 'year-2026',
      termId: 'term-3',
      classRoomId: 'class-g1',
      learningAreaId: 'uuid-art-005',
      maxScore: 100,
      rows: [{ admissionNumber: '1001', score: 85, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }]
    }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);

    await cbcUseCases.commitMarksUpload({
      academicYearId: 'year-2026',
      termId: 'term-3',
      classRoomId: 'class-g1',
      learningAreaId: 'uuid-fre-006',
      maxScore: 100,
      rows: [{ admissionNumber: '1001', score: 80, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS }]
    }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);

    expect(savedSummatives.length).toBe(10);

    const broadsheet = await broadsheetUseCases.getStreamBroadsheet({
      classId: 'class-g1',
      streamId: 'all',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });

    // All 10 subjects must appear without arbitrary limits or truncation
    expect(broadsheet.learningAreas.length).toBe(10);
    const row = broadsheet.rows.find(r => r.studentId === 's-001');
    expect(row!.evaluatedCount).toBe(10);
    expect(row!.totalScore).toBe(712 + 85 + 80); // 877
  });

  test('Test C — Multiple learners: Every eligible learner marks are associated with the correct subject', async () => {
    // Upload Math and English for Student 1 and Student 2 with distinct scores
    await cbcUseCases.commitMarksUpload({
      academicYearId: 'year-2026',
      termId: 'term-3',
      classRoomId: 'class-g1',
      learningAreaId: 'la-mat',
      maxScore: 100,
      rows: [
        { admissionNumber: '1001', score: 95, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS },
        { admissionNumber: '1002', score: 70, performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS }
      ]
    }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);

    await cbcUseCases.commitMarksUpload({
      academicYearId: 'year-2026',
      termId: 'term-3',
      classRoomId: 'class-g1',
      learningAreaId: 'uuid-eng-001',
      maxScore: 100,
      rows: [
        { admissionNumber: '1001', score: 88, performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS },
        { admissionNumber: '1002', score: 62, performanceLevel: PerformanceLevel.APPROACHING_EXPECTATIONS }
      ]
    }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);

    const broadsheet = await broadsheetUseCases.getStreamBroadsheet({
      classId: 'class-g1',
      streamId: 'all',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });

    const s1Row = broadsheet.rows.find(r => r.studentId === 's-001');
    const s2Row = broadsheet.rows.find(r => r.studentId === 's-002');

    expect(s1Row).toBeDefined();
    expect(s2Row).toBeDefined();
    expect(s1Row!.totalScore).toBe(95 + 88); // 183
    expect(s2Row!.totalScore).toBe(70 + 62); // 132
    expect(s1Row!.rank).toBe(1);
    expect(s2Row!.rank).toBe(2);
  });

  test('Test D — Partial upload failure: Rejects invalid rows with validation error and supports safe retry', async () => {
    // Simulate invalid mark (> 100)
    await expect(
      cbcUseCases.commitMarksUpload({
        academicYearId: 'year-2026',
        termId: 'term-3',
        classRoomId: 'class-g1',
        learningAreaId: 'la-mat',
        maxScore: 100,
        rows: [
          { admissionNumber: '1001', score: 105 } // Invalid score > 100
        ]
      }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any)
    ).rejects.toThrow(ValidationError);

    // No corrupted records saved
    expect(savedSummatives.length).toBe(0);

    // Safe retry with corrected mark succeeds
    const retryRes = await cbcUseCases.commitMarksUpload({
      academicYearId: 'year-2026',
      termId: 'term-3',
      classRoomId: 'class-g1',
      learningAreaId: 'la-mat',
      maxScore: 100,
      rows: [
        { admissionNumber: '1001', score: 95 }
      ]
    }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);

    expect(retryRes.recordedCount).toBe(1);
    expect(savedSummatives.length).toBe(1);
  });

  test('Test E — Duplicate submission: Retrying a previously successful upload updates without duplicate records', async () => {
    // First upload
    await cbcUseCases.commitMarksUpload({
      academicYearId: 'year-2026',
      termId: 'term-3',
      classRoomId: 'class-g1',
      learningAreaId: 'la-mat',
      maxScore: 100,
      rows: [{ admissionNumber: '1001', score: 85 }]
    }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);

    expect(savedSummatives.length).toBe(1);

    // Re-upload same subject and learner with updated mark
    const secondUpload = await cbcUseCases.commitMarksUpload({
      academicYearId: 'year-2026',
      termId: 'term-3',
      classRoomId: 'class-g1',
      learningAreaId: 'la-mat',
      maxScore: 100,
      rows: [{ admissionNumber: '1001', score: 92 }]
    }, { userId: 'u-tch-1', role: 'TEACHER', schoolId: 'school-001' } as any);

    expect(secondUpload.updatedCount).toBe(1);
    expect(savedSummatives.length).toBe(1); // Zero duplicates created
    expect(savedSummatives[0].strandScores[0].rawScore).toBe(92);
  });

  test('Test F — Academic context: Subjects and marks are isolated by class, academic year, and term', async () => {
    await uploadEightSubjects(); // Uploaded for term-3, year-2026

    // Query for different term (term-1)
    const term1Broadsheet = await broadsheetUseCases.getStreamBroadsheet({
      classId: 'class-g1',
      streamId: 'all',
      termId: 'term-1',
      academicYearId: 'year-2026'
    });

    // Must be completely empty of marks for term 1
    const t1Row = term1Broadsheet.rows.find(r => r.studentId === 's-001');
    expect(t1Row?.totalScore || 0).toBe(0);
    expect(t1Row?.evaluatedCount || 0).toBe(0);

    // Query for term 3 returns all 8
    const term3Broadsheet = await broadsheetUseCases.getStreamBroadsheet({
      classId: 'class-g1',
      streamId: 'all',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });
    expect(term3Broadsheet.learningAreas.length).toBe(8);
  });

  test('Test G — Cross-module consistency: Same saved assessment results are reflected in summative, broadsheet, and report cards', async () => {
    await uploadEightSubjects();

    // 1. Summative API returns 8
    const summatives = await cbcUseCases.listSummativeAssessments({
      studentId: 's-001',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });
    expect(summatives.length).toBe(8);

    // 2. Broadsheet returns 8 with mean 89%
    const broadsheet = await broadsheetUseCases.getStreamBroadsheet({
      classId: 'class-g1',
      streamId: 'all',
      termId: 'term-3',
      academicYearId: 'year-2026'
    });
    expect(broadsheet.learningAreas.length).toBe(8);
    const bRow = broadsheet.rows.find(r => r.studentId === 's-001')!;
    expect(bRow.averageScore).toBe(89);

    // 3. Report Card returns 8 with matching scores
    const rc = await cbcUseCases.generateStudentReportCard({
      studentId: 's-001',
      termId: 'term-3',
      academicYearId: 'year-2026',
      classTeacherRemarks: 'Outstanding.',
      headTeacherRemarks: 'Well done.'
    });
    expect(rc.learningAreaAssessments.length).toBe(8);
    const rcAvg = Math.round(rc.learningAreaAssessments.reduce((sum, a) => sum + (a.score || 0), 0) / 8);
    expect(rcAvg).toBe(89);
  });

  test('Test H — Existing functionality: Preserves teacher permissions and CBC criteria without regression', async () => {
    // Subject teacher not assigned to Math in class-g1 cannot upload Math marks
    teacherRepo.findByUserId.mockResolvedValueOnce({
      id: 'tch-other',
      userId: 'u-tch-other',
      assignedClassStreamIds: ['class-other']
    } as any);

    academicRepo.findClassTeacherAssignments.mockResolvedValueOnce([]);
    academicRepo.findSubjectTeacherAssignments.mockResolvedValueOnce([]);

    await expect(
      cbcUseCases.commitMarksUpload({
        academicYearId: 'year-2026',
        termId: 'term-3',
        classRoomId: 'class-g1',
        learningAreaId: 'la-mat',
        maxScore: 100,
        rows: [{ admissionNumber: '1001', score: 85 }]
      }, { userId: 'u-tch-other', role: 'TEACHER', schoolId: 'school-001' } as any)
    ).rejects.toThrow();
  });
});
