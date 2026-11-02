import { CBCAssessmentUseCases } from '../../src/application/cbc/CbcAssessmentUseCases';
import {
  InMemoryCBCAssessmentRepository,
  InMemoryStudentRepository,
  InMemoryAcademicRepository,
  InMemoryTeacherRepository,
  InMemoryAttendanceRepository,
  InMemorySchemeOfWorkRepository,
  InMemoryLessonPlanRepository
} from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { CBCGradeLevel, Student, StudentGender, StudentStatus } from '../../src/core/domain/user/Student';
import { Strand, SubStrand, CoreCompetency, CoreValue, PerformanceLevel, AssessmentMethod } from '../../src/core/domain/cbc/CbcAssessment';
import { CurriculumPlanUseCases } from '../../src/application/curriculum-plans/CurriculumPlanUseCases';

describe('Strand Creation and System-Wide Usage Suite', () => {
  let cbcRepo: InMemoryCBCAssessmentRepository;
  let studentRepo: InMemoryStudentRepository;
  let academicRepo: InMemoryAcademicRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let teacherRepo: InMemoryTeacherRepository;
  let schemeRepo: InMemorySchemeOfWorkRepository;
  let lessonPlanRepo: InMemoryLessonPlanRepository;
  let cbcUseCases: CBCAssessmentUseCases;
  let curriculumUseCases: CurriculumPlanUseCases;

  beforeEach(() => {
    cbcRepo = new InMemoryCBCAssessmentRepository();
    studentRepo = new InMemoryStudentRepository();
    academicRepo = new InMemoryAcademicRepository();
    attendanceRepo = new InMemoryAttendanceRepository();
    teacherRepo = new InMemoryTeacherRepository();
    schemeRepo = new InMemorySchemeOfWorkRepository();
    lessonPlanRepo = new InMemoryLessonPlanRepository();

    cbcUseCases = new CBCAssessmentUseCases(
      cbcRepo,
      studentRepo,
      academicRepo,
      attendanceRepo,
      undefined,
      undefined,
      teacherRepo
    );

    curriculumUseCases = new CurriculumPlanUseCases(
      schemeRepo,
      lessonPlanRepo,
      teacherRepo
    );
  });

  describe('1. Strand & Sub-strand Creation & Idempotency', () => {
    it('should create a new strand and sub-strand and make it queryable', async () => {
      const strand = await cbcUseCases.createStrand({
        learningAreaId: 'la-math-01',
        gradeLevel: CBCGradeLevel.GRADE_7,
        code: 'MAT-01',
        title: 'Numbers and Number Theory',
        description: 'Covers whole numbers, primes, and integer operations',
      });

      expect(strand.id).toBeDefined();
      expect(strand.title).toBe('Numbers and Number Theory');
      expect(strand.code).toBe('MAT-01');

      const subStrand = await cbcUseCases.createSubStrand({
        strandId: strand.id,
        code: 'MAT-01.1',
        title: 'Prime Factors and Square Roots',
        specificLearningOutcomes: ['Find prime factors of numbers up to 1000', 'Calculate square roots by factor method'],
      });

      expect(subStrand.id).toBeDefined();
      expect(subStrand.strandId).toBe(strand.id);
      expect(subStrand.title).toBe('Prime Factors and Square Roots');

      // Verify querying
      const fetchedStrands = await cbcUseCases.getStrandsByLearningArea('la-math-01', CBCGradeLevel.GRADE_7);
      expect(fetchedStrands.length).toBe(1);
      expect(fetchedStrands[0].title).toBe('Numbers and Number Theory');

      const fetchedSubs = await cbcRepo.findSubStrandsByStrand(strand.id);
      expect(fetchedSubs.length).toBe(1);
      expect(fetchedSubs[0].title).toBe('Prime Factors and Square Roots');
    });

    it('should be idempotent and return existing strand if duplicate code/title is provided', async () => {
      const strand1 = await cbcUseCases.createStrand({
        learningAreaId: 'la-eng-01',
        gradeLevel: CBCGradeLevel.GRADE_5,
        code: 'ENG-01',
        title: 'Listening and Speaking',
      });

      const strand2 = await cbcUseCases.createStrand({
        learningAreaId: 'la-eng-01',
        gradeLevel: CBCGradeLevel.GRADE_5,
        code: 'ENG-01',
        title: 'Listening and Speaking',
      });

      expect(strand2.id).toBe(strand1.id);
    });

    it('should be idempotent and return existing sub-strand if duplicate is submitted', async () => {
      const strand = await cbcUseCases.createStrand({
        learningAreaId: 'la-sci-01',
        gradeLevel: CBCGradeLevel.GRADE_7,
        code: 'SCI-01',
        title: 'Living Things',
      });

      const sub1 = await cbcUseCases.createSubStrand({
        strandId: strand.id,
        code: 'SCI-01.1',
        title: 'Cell Biology',
        specificLearningOutcomes: ['Identify parts of a cell'],
      });

      const sub2 = await cbcUseCases.createSubStrand({
        strandId: strand.id,
        code: 'SCI-01.1',
        title: 'Cell Biology',
        specificLearningOutcomes: ['Identify parts of a cell'],
      });

      expect(sub2.id).toBe(sub1.id);
    });
  });

  describe('2. Deduplication and Flexible Grade / Subject Retrieval', () => {
    it('should deduplicate strands with same title so zero duplicate strands are returned', async () => {
      const s1 = Strand.create({
        learningAreaId: 'la-math-01',
        gradeLevel: CBCGradeLevel.GRADE_7,
        code: 'MAT-01',
        title: 'Geometry & Measurement',
      }, 'id-1');

      const s2 = Strand.create({
        learningAreaId: 'la-math-01',
        gradeLevel: CBCGradeLevel.GRADE_7,
        code: 'MAT-02',
        title: 'Geometry & Measurement',
      }, 'id-2');

      await cbcRepo.saveStrand(s1);
      await cbcRepo.saveStrand(s2);

      const strands = await cbcRepo.findStrandsByLearningArea('la-math-01', CBCGradeLevel.GRADE_7);
      expect(strands.length).toBe(1);
      expect(strands[0].title).toBe('Geometry & Measurement');
    });

    it('should fall back to subject strands if specific grade has no strands yet, preventing empty blocking', async () => {
      const s1 = Strand.create({
        learningAreaId: 'la-agri-01',
        gradeLevel: CBCGradeLevel.GRADE_5,
        code: 'AGR-01',
        title: 'Crop Production & Soil Care',
      }, 'agri-s1');

      await cbcRepo.saveStrand(s1);

      const strands = await cbcRepo.findStrandsByLearningArea('la-agri-01', CBCGradeLevel.GRADE_6);
      expect(strands.length).toBe(1);
      expect(strands[0].title).toBe('Crop Production & Soil Care');
    });
  });

  describe('3. Formative Assessments Integration', () => {
    it('should record formative assessment using created sub-strand without error', async () => {
      const student = Student.create({
        admissionNumber: 'ADM-001',
        firstName: 'Faith',
        lastName: 'Chebet',
        gender: StudentGender.FEMALE,
        dateOfBirth: '2013-05-10',
        gradeLevel: CBCGradeLevel.GRADE_7,
        streamId: 'str-east',
        schoolId: 'sch-01',
        academicYearId: 'year-2026',
        guardianIds: [],
        status: StudentStatus.ACTIVE,
      }, 'stud-001');
      await studentRepo.save(student);

      const strand = await cbcUseCases.createStrand({
        learningAreaId: 'la-kisw-01',
        gradeLevel: CBCGradeLevel.GRADE_7,
        code: 'KIS-01',
        title: 'Kusikiliza na Kuongea',
      });

      const subStrand = await cbcUseCases.createSubStrand({
        strandId: strand.id,
        code: 'KIS-01.1',
        title: 'Mjadala na Ushairi',
        specificLearningOutcomes: ['Kutunga na kughani shairi'],
      });

      const assessment = await cbcUseCases.recordFormativeAssessment({
        studentId: student.id,
        learningAreaId: 'la-kisw-01',
        subStrandId: subStrand.id,
        teacherId: 'tch-001',
        assessmentMethod: AssessmentMethod.OBSERVATION,
        performanceLevel: PerformanceLevel.EXCEEDING_EXPECTATIONS,
        specificOutcomeTested: 'Kutunga na kughani shairi kwa ufasaha',
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.performanceLevel).toBe(PerformanceLevel.EXCEEDING_EXPECTATIONS);
      expect(assessment.subStrandId).toBe(subStrand.id);
    });

    it('should auto-provision missing sub-strands on formative upload so assessments never fail', async () => {
      const student = Student.create({
        admissionNumber: 'ADM-002',
        firstName: 'Achieng',
        lastName: 'Otieno',
        gender: StudentGender.FEMALE,
        dateOfBirth: '2013-08-20',
        gradeLevel: CBCGradeLevel.GRADE_7,
        streamId: 'str-east',
        schoolId: 'sch-01',
        academicYearId: 'year-2026',
        guardianIds: [],
        status: StudentStatus.ACTIVE,
      }, 'stud-002');
      await studentRepo.save(student);

      const assessment = await cbcUseCases.recordFormativeAssessment({
        studentId: student.id,
        learningAreaId: 'la-cre-01',
        subStrandId: 'custom-sub-morals',
        teacherId: 'tch-001',
        assessmentMethod: AssessmentMethod.OBSERVATION,
        performanceLevel: PerformanceLevel.MEETING_EXPECTATIONS,
        specificOutcomeTested: 'Christian Moral Values and Integrity',
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.performanceLevel).toBe(PerformanceLevel.MEETING_EXPECTATIONS);

      const savedSub = await cbcRepo.findSubStrandById('custom-sub-morals');
      expect(savedSub).not.toBeNull();
      expect(savedSub?.title).toBe('Christian Moral Values and Integrity');
    });
  });

  describe('4. Schemes of Work and Lesson Plans Integration', () => {
    it('should create a Scheme of Work entry seamlessly linking the created strand and sub-strand', async () => {
      const strand = await cbcUseCases.createStrand({
        learningAreaId: 'la-sst-01',
        gradeLevel: CBCGradeLevel.GRADE_7,
        code: 'SST-01',
        title: 'Physical Environment & Map Reading',
      });

      const subStrand = await cbcUseCases.createSubStrand({
        strandId: strand.id,
        code: 'SST-01.1',
        title: 'Scale and Direction on Topographical Maps',
        specificLearningOutcomes: ['Calculate ground distance from a 1:50000 map scale'],
      });

      const scheme = await curriculumUseCases.createSchemeOfWork({
        teacherId: 'tch-001',
        learningAreaId: 'la-sst-01',
        classRoomId: 'cls-grade7',
        academicYearId: 'year-2026',
        termId: 'term-1',
        title: 'Grade 7 Social Studies Term 1 Scheme',
        entries: [
          {
            weekNumber: 1,
            lessonNumber: 1,
            strandId: strand.id,
            strandTitle: strand.title,
            subStrandId: subStrand.id,
            subStrandTitle: subStrand.title,
            specificLearningOutcomes: subStrand.specificLearningOutcomes,
            keyInquiryQuestions: ['How is scale used to measure physical land distance?'],
            learningExperiences: ['Measure map lines using a string and ruler'],
            learningResources: ['Topographical maps, rulers, strings'],
            assessmentMethods: ['Observation', 'Practical exercise'],
          },
        ],
      });

      expect(scheme.id).toBeDefined();
      expect(scheme.entries.length).toBe(1);
      expect(scheme.entries[0].strandTitle).toBe('Physical Environment & Map Reading');
      expect(scheme.entries[0].subStrandTitle).toBe('Scale and Direction on Topographical Maps');
    });

    it('should create a Lesson Plan linking the created strand and sub-strand', async () => {
      const strand = await cbcUseCases.createStrand({
        learningAreaId: 'la-arts-01',
        gradeLevel: CBCGradeLevel.GRADE_7,
        code: 'ARTS-01',
        title: 'Visual Arts and Crafts',
      });

      const subStrand = await cbcUseCases.createSubStrand({
        strandId: strand.id,
        code: 'ARTS-01.1',
        title: 'Color Mixing and Still Life Painting',
        specificLearningOutcomes: ['Mix secondary and tertiary colors accurately'],
      });

      const lessonPlan = await curriculumUseCases.createLessonPlan({
        teacherId: 'tch-001',
        learningAreaId: 'la-arts-01',
        classRoomId: 'cls-grade7',
        lessonDate: '2026-11-02',
        durationMinutes: 40,
        strand: strand.title,
        subStrand: subStrand.title,
        specificLearningOutcomes: subStrand.specificLearningOutcomes,
        keyInquiryQuestions: ['How do primary colors combine to create contrast?'],
        coreCompetenciesAddressed: [CoreCompetency.CREATIVITY_AND_IMAGINATION, CoreCompetency.CRITICAL_THINKING_AND_PROBLEM_SOLVING],
        valuesAddressed: [CoreValue.UNITY, CoreValue.RESPECT],
        learningResources: ['Watercolors, brushes, mixing palettes'],
        steps: [
          { stepNumber: 1, stepTitle: 'Introduction', durationMinutes: 5, teacherActivities: 'Demonstrates color wheel', learnerActivities: 'Observe and note secondary colors' },
          { stepNumber: 2, stepTitle: 'Practical Exercise', durationMinutes: 30, teacherActivities: 'Guides color mixing', learnerActivities: 'Paint still life using blended shades' },
          { stepNumber: 3, stepTitle: 'Conclusion', durationMinutes: 5, teacherActivities: 'Reviews student work', learnerActivities: 'Display artwork for peer review' },
        ],
      });

      expect(lessonPlan.id).toBeDefined();
      expect(lessonPlan.strand).toBe('Visual Arts and Crafts');
      expect(lessonPlan.subStrand).toBe('Color Mixing and Still Life Painting');
    });
  });
});
