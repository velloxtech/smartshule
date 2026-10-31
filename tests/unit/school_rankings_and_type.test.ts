import { School } from '../../src/core/domain/academic/School';
import { CBCReportCard, PerformanceLevel } from '../../src/core/domain/cbc/CbcAssessment';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { CBCAssessmentUseCases } from '../../src/application/cbc/CbcAssessmentUseCases';
import { ICBCAssessmentRepository } from '../../src/core/ports/repositories/ICbcAssessmentRepository';
import { IStudentRepository } from '../../src/core/ports/repositories/IStudentRepository';
import { IAcademicRepository } from '../../src/core/ports/repositories/IAcademicRepository';
import { IAttendanceRepository } from '../../src/core/ports/repositories/ITimetableRepository';
import { IFeeRepository } from '../../src/core/ports/repositories/IFeeRepository';

describe('Grace Seeds School Type, Report Card, and Authoritative Rankings', () => {
  let cbcRepo: jest.Mocked<ICBCAssessmentRepository>;
  let studentRepo: jest.Mocked<IStudentRepository>;
  let academicRepo: jest.Mocked<IAcademicRepository>;
  let attRepo: jest.Mocked<IAttendanceRepository>;
  let feeRepo: jest.Mocked<IFeeRepository>;
  let cbcUseCases: CBCAssessmentUseCases;

  beforeEach(() => {
    cbcRepo = {
      findSummatives: jest.fn(),
      saveSummative: jest.fn(),
      updateSummative: jest.fn(),
      deleteSummative: jest.fn(),
      deleteSummativesByStudent: jest.fn(),
      findFormatives: jest.fn(),
      saveFormative: jest.fn(),
      updateFormative: jest.fn(),
      deleteFormative: jest.fn(),
      findReportCardById: jest.fn(),
      findReportCard: jest.fn(),
      findReportCardsByStudent: jest.fn(),
      findReportCardsByTerm: jest.fn(),
      saveReportCard: jest.fn(),
      updateReportCard: jest.fn(),
      deleteReportCardsByStudent: jest.fn(),
      findStrands: jest.fn(),
      findSubStrands: jest.fn(),
      findStrandById: jest.fn(),
      findSubStrandById: jest.fn(),
      saveStrand: jest.fn(),
      saveSubStrand: jest.fn(),
      updateStrand: jest.fn(),
      updateSubStrand: jest.fn(),
      deleteStrand: jest.fn(),
      deleteSubStrand: jest.fn(),
    } as unknown as jest.Mocked<ICBCAssessmentRepository>;

    studentRepo = {
      findById: jest.fn(),
      findByAdmissionNumber: jest.fn(),
      findByUpiNumber: jest.fn(),
      findAll: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as unknown as jest.Mocked<IStudentRepository>;

    academicRepo = {
      getSchool: jest.fn(),
      saveSchool: jest.fn(),
      updateSchool: jest.fn(),
      findAllLearningAreas: jest.fn(),
      findLearningAreaById: jest.fn(),
      findTermsByYear: jest.fn()
    } as unknown as jest.Mocked<IAcademicRepository>;

    attRepo = {
      findRegisters: jest.fn()
    } as unknown as jest.Mocked<IAttendanceRepository>;

    feeRepo = {
      findInvoices: jest.fn()
    } as unknown as jest.Mocked<IFeeRepository>;

    cbcUseCases = new CBCAssessmentUseCases(
      cbcRepo,
      studentRepo,
      academicRepo,
      attRepo,
      undefined,
      undefined,
      undefined,
      feeRepo
    );
  });

  describe('1. Grace Seeds School Configuration & Day School Behavior', () => {
    it('should correctly default school type to DAY', () => {
      const school = School.create({
        name: 'Grace Seeds School',
        code: 'GSS-001',
        email: 'schoolgraceseeds@gmail.com',
        phone: '0745436312',
        address: 'KEMRI Street, Kisian, Kisumu, Kenya',
        motto: 'The future Begins Here',
        currency: 'KES'
      }, 'school-001');

      expect(school.schoolType).toBe('DAY');
      expect(school.toJSON().schoolType).toBe('DAY');
    });

    it('should allow setting explicit DAY school type', () => {
      const school = School.create({
        name: 'Grace Seeds School',
        code: 'GSS-001',
        email: 'schoolgraceseeds@gmail.com',
        phone: '0745436312',
        address: 'KEMRI Street, Kisian, Kisumu, Kenya',
        motto: 'The future Begins Here',
        currency: 'KES',
        schoolType: 'DAY'
      }, 'school-001');

      expect(school.schoolType).toBe('DAY');
    });
  });

  describe('2. Authoritative Population & Competition Rankings', () => {
    const student1 = Student.create({
      admissionNumber: '001',
      firstName: 'Don',
      lastName: 'Hemsworth',
      dateOfBirth: '2015-05-10',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_4,
      classroomId: 'room-g4',
      streamId: 'stream-west',
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'std-don');

    const student2 = Student.create({
      admissionNumber: '002',
      firstName: 'Cynthia',
      lastName: 'Chepkemoi',
      dateOfBirth: '2015-06-15',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_4,
      classroomId: 'room-g4',
      streamId: 'stream-west',
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'std-cynthia');

    const student3 = Student.create({
      admissionNumber: '003',
      firstName: 'Brenda',
      lastName: 'Moraa',
      dateOfBirth: '2015-07-20',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_4,
      classroomId: 'room-g4',
      streamId: 'stream-west',
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'std-brenda');

    const studentEast1 = Student.create({
      admissionNumber: '004',
      firstName: 'Faith',
      lastName: 'Chebet',
      dateOfBirth: '2015-08-12',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_4,
      classroomId: 'room-g4',
      streamId: 'stream-east',
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'std-faith');

    const otherGradeStudent = Student.create({
      admissionNumber: '005',
      firstName: 'Derrick',
      lastName: 'Macharia',
      dateOfBirth: '2013-03-25',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_6,
      classroomId: 'room-g6',
      streamId: 'stream-g6',
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'std-derrick');

    const externalSchoolStudent = Student.create({
      admissionNumber: '999',
      firstName: 'Other',
      lastName: 'SchoolStudent',
      dateOfBirth: '2015-01-01',
      gender: StudentGender.MALE,
      gradeLevel: CBCGradeLevel.GRADE_4,
      classroomId: 'room-ext',
      streamId: 'stream-ext',
      schoolId: 'school-other',
      academicYearId: 'year-2026',
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'std-ext');

    it('should calculate stream, class, and overall positions with correct populations and tie handling', async () => {
      // Mock student repository finding all active learners in school-001
      const schoolStudents = [student1, student2, student3, studentEast1, otherGradeStudent];
      studentRepo.findAll.mockResolvedValue(schoolStudents);

      // Student 1 (Don) score: 695 marks, 86.88 avg, 29 pts
      // Student 2 (Cynthia) score: 695 marks (TIED with Don)
      // Student 3 (Brenda) score: 683 marks
      // Student East 1 (Faith) score: 739 marks (Higher in Class)
      // Other Grade (Derrick) score: 766 marks (Higher Overall)
      cbcRepo.findSummatives.mockResolvedValue([]);
      cbcRepo.findReportCardsByTerm.mockResolvedValue([
        CBCReportCard.create({
          studentId: 'std-cynthia',
          termId: 'term-2026-t3',
          academicYearId: 'year-2026',
          gradeLevel: CBCGradeLevel.GRADE_4,
          streamId: 'stream-west',
          learningAreaAssessments: [{ learningAreaId: 'la-1', learningAreaName: 'Math', performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, score: 695, teacherRemarks: 'Good progress' }],
          coreCompetencyAssessments: [],
          valueAssessments: [],
          attendanceDaysPresent: 60,
          attendanceDaysTotal: 60,
          classTeacherRemarks: '',
          headTeacherRemarks: '',
          overallAverageScore: 86.88,
          overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS
        }, 'rc-cynthia'),
        CBCReportCard.create({
          studentId: 'std-brenda',
          termId: 'term-2026-t3',
          academicYearId: 'year-2026',
          gradeLevel: CBCGradeLevel.GRADE_4,
          streamId: 'stream-west',
          learningAreaAssessments: [{ learningAreaId: 'la-1', learningAreaName: 'Math', performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, score: 683, teacherRemarks: 'Good progress' }],
          coreCompetencyAssessments: [],
          valueAssessments: [],
          attendanceDaysPresent: 60,
          attendanceDaysTotal: 60,
          classTeacherRemarks: '',
          headTeacherRemarks: '',
          overallAverageScore: 85.3,
          overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS
        }, 'rc-brenda'),
        CBCReportCard.create({
          studentId: 'std-faith',
          termId: 'term-2026-t3',
          academicYearId: 'year-2026',
          gradeLevel: CBCGradeLevel.GRADE_4,
          streamId: 'stream-east',
          learningAreaAssessments: [{ learningAreaId: 'la-1', learningAreaName: 'Math', performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, score: 739, teacherRemarks: 'Good progress' }],
          coreCompetencyAssessments: [],
          valueAssessments: [],
          attendanceDaysPresent: 60,
          attendanceDaysTotal: 60,
          classTeacherRemarks: '',
          headTeacherRemarks: '',
          overallAverageScore: 92.4,
          overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS
        }, 'rc-faith'),
        CBCReportCard.create({
          studentId: 'std-derrick',
          termId: 'term-2026-t3',
          academicYearId: 'year-2026',
          gradeLevel: CBCGradeLevel.GRADE_6,
          streamId: 'stream-g6',
          learningAreaAssessments: [{ learningAreaId: 'la-1', learningAreaName: 'Math', performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS, score: 766, teacherRemarks: 'Good progress' }],
          coreCompetencyAssessments: [],
          valueAssessments: [],
          attendanceDaysPresent: 60,
          attendanceDaysTotal: 60,
          classTeacherRemarks: '',
          headTeacherRemarks: '',
          overallAverageScore: 95.7,
          overallPerformanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS
        }, 'rc-derrick')
      ]);

      const rankings = await cbcUseCases.computeStudentRankings(
        student1,
        'term-2026-t3',
        'year-2026',
        695, // studentTotalScore
        86.88, // studentAvgScore
        29 // studentTotalPoints
      );

      // Stream: 3 learners in stream-west (Don, Cynthia, Brenda)
      expect(rankings.streamPopulation).toBe(3);
      // Don and Cynthia are tied with 695 marks -> Rank 1
      expect(rankings.streamPosition).toBe(1);

      // Class: 4 learners in room-g4 (Don, Cynthia, Brenda, Faith)
      expect(rankings.classPopulation).toBe(4);
      // Faith (739) is Rank 1. Don & Cynthia (695) are tied for Rank 2. Brenda (683) is Rank 4.
      expect(rankings.classPosition).toBe(2);

      // School: 5 learners in school-001 (Don, Cynthia, Brenda, Faith, Derrick)
      expect(rankings.overallPopulation).toBe(5);
      // Derrick (766) is Rank 1, Faith (739) is Rank 2, Don & Cynthia (695) are tied for Rank 3!
      expect(rankings.overallPosition).toBe(3);

      // Verify that denominator never collapsed to 1
      expect(rankings.streamPopulation).toBeGreaterThan(1);
      expect(rankings.classPopulation).toBeGreaterThan(1);
      expect(rankings.overallPopulation).toBeGreaterThan(1);
    });

    it('should never include learners from other schools in population or ranking', async () => {
      // studentRepo.findAll is called with { schoolId: student.schoolId }
      studentRepo.findAll.mockImplementation(async (filter) => {
        if (filter?.schoolId === 'school-001') {
          return [student1, student2];
        }
        return [externalSchoolStudent];
      });

      cbcRepo.findSummatives.mockResolvedValue([]);
      cbcRepo.findReportCardsByTerm.mockResolvedValue([]);

      const rankings = await cbcUseCases.computeStudentRankings(
        student1,
        'term-2026-t3',
        'year-2026',
        695,
        86.88,
        29
      );

      expect(studentRepo.findAll).toHaveBeenCalledWith({ schoolId: 'school-001' });
      expect(rankings.overallPopulation).toBe(2);
      expect(rankings.classPopulation).toBe(2);
    });
  });

  describe('3. CBC Rubric Performance Levels, Points, and Mean Grade Conversion', () => {
    // CBC 4-level scale functions matching ReportCardsView
    const getGradeAndPoints = (score: number, level?: string): { grade: string; points: number; remark: string } => {
      const norm = (level || '').toUpperCase();
      if (norm.includes('EE') || norm.includes('EXCEED') || score >= 80) {
        return { grade: 'EE', points: 4, remark: 'Exceeding Expectations' };
      }
      if (norm.includes('ME') || norm.includes('MEET') || score >= 65) {
        return { grade: 'ME', points: 3, remark: 'Meeting Expectations' };
      }
      if (norm.includes('AE') || norm.includes('APPROACH') || score >= 50) {
        return { grade: 'AE', points: 2, remark: 'Approaching Expectations' };
      }
      return { grade: 'BE', points: 1, remark: 'Below Expectations' };
    };

    const getMeanGradeFromPoints = (meanPoints: number): string => {
      if (meanPoints >= 3.5) return 'EE';
      if (meanPoints >= 2.5) return 'ME';
      if (meanPoints >= 1.5) return 'AE';
      return 'BE';
    };

    it('should assign 4 points and EE grade for scores >= 80%', () => {
      const res = getGradeAndPoints(85);
      expect(res.grade).toBe('EE');
      expect(res.points).toBe(4);
      expect(res.remark).toBe('Exceeding Expectations');
    });

    it('should assign 3 points and ME grade for scores between 65% and 79%', () => {
      const res = getGradeAndPoints(72);
      expect(res.grade).toBe('ME');
      expect(res.points).toBe(3);
      expect(res.remark).toBe('Meeting Expectations');
    });

    it('should assign 2 points and AE grade for scores between 50% and 64%', () => {
      const res = getGradeAndPoints(58);
      expect(res.grade).toBe('AE');
      expect(res.points).toBe(2);
      expect(res.remark).toBe('Approaching Expectations');
    });

    it('should assign 1 point and BE grade for scores below 50%', () => {
      const res = getGradeAndPoints(42);
      expect(res.grade).toBe('BE');
      expect(res.points).toBe(1);
      expect(res.remark).toBe('Below Expectations');
    });

    it('should correctly calculate CBC Mean Grade from Mean Points (1 to 4 scale)', () => {
      expect(getMeanGradeFromPoints(3.8)).toBe('EE');
      expect(getMeanGradeFromPoints(3.5)).toBe('EE');
      expect(getMeanGradeFromPoints(3.2)).toBe('ME');
      expect(getMeanGradeFromPoints(2.5)).toBe('ME');
      expect(getMeanGradeFromPoints(2.1)).toBe('AE');
      expect(getMeanGradeFromPoints(1.5)).toBe('AE');
      expect(getMeanGradeFromPoints(1.2)).toBe('BE');
      expect(getMeanGradeFromPoints(0.8)).toBe('BE');
    });
  });
});
