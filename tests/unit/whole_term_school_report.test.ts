import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { UserRole } from '../../src/core/domain/user/User';
import { ClassRoom, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';

describe('Phase 9: Whole-Term Professional School Executive Report', () => {
  let container: AppContainer;
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-1';

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    const year = AcademicYear.create({
      schoolId,
      name: '2026',
      startDate: '2026-01-05',
      endDate: '2026-11-20',
      isCurrent: true
    }, academicYearId);
    await container.academicRepository.saveYear(year);

    const term = AcademicTerm.create({
      academicYearId,
      name: 'Term 1',
      termNumber: 1,
      startDate: '2026-01-05',
      endDate: '2026-04-08',
      isCurrent: true
    }, termId);
    await container.academicRepository.saveTerm(term);

    const cls = ClassRoom.create({
      schoolId,
      name: 'Grade 3',
      gradeLevel: CBCGradeLevel.GRADE_3,
      educationLevel: EducationLevel.LOWER_PRIMARY
    }, 'class-g3');
    await container.academicRepository.saveClass(cls);

    const st = Student.create({
      schoolId,
      firstName: 'Achieng',
      lastName: 'Otieno',
      admissionNumber: 'ADM-001',
      gender: StudentGender.FEMALE,
      gradeLevel: CBCGradeLevel.GRADE_3,
      classroomId: cls.id,
      dateOfBirth: '2016-01-01',
      academicYearId,
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'st-001');
    await container.studentRepository.save(st);
  });

  test('Generates whole-term report with Grace Seeds School data and no fabricated metrics', async () => {
    const report = await container.analyticsUseCases.getWholeTermReport(
      {
        schoolId,
        academicYearId,
        termId
      },
      { userId: 'user-ht', role: UserRole.HEAD_TEACHER, email: 'head@school.com' }
    );

    expect(report).toBeDefined();
    expect(report.institution.name).toBe('Grace Seeds School');
    expect(report.institution.motto).toContain('Christian Values');
    expect(report.institution.academicYear).toBe('2026');
    expect(report.institution.term).toBe('Term 1');
    expect(report.enrolment.totalEnrolled).toBeGreaterThanOrEqual(1);
    expect(report.finance.note).toContain('strictly from verified billing');
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.institution.signatories.headTeacher).toBeDefined();
    expect(report.institution.signatories.executiveDirector).toBeDefined();
  });
});
