import { Pool, PoolClient } from 'pg';
import { AppContainer } from '../../src/infrastructure/container';
import { PostgresSchemeOfWorkRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
import { AcademicYear, AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ClassRoom, LearningArea, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { SubjectTeacherAssignment } from '../../src/core/domain/academic/TeacherAssignment';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { CBCGradeLevel } from '../../src/core/domain/user/Student';

const url = process.env.SUBJECT_PLANNING_TEST_DATABASE_URL;
(url ? describe : describe.skip)('PostgreSQL subject draft before scheduling', () => {
  let pool: Pool;
  let client: PoolClient;
  beforeAll(async () => {
    pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 });
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE schemes_of_work (LIKE public.schemes_of_work INCLUDING ALL) ON COMMIT DROP');
  });
  afterAll(async () => {
    if (client) { await client.query('ROLLBACK'); client.release(); }
    if (pool) await pool.end();
  });
  it('persists and reloads allocations without inventing scheduled lesson entries', async () => {
    const repository = new PostgresSchemeOfWorkRepository(client as unknown as Pool);
    const c = new AppContainer({ schemeOfWorkRepository: repository });
    const scope = { schoolId: 'draft-school', academicYearId: 'draft-year', termId: 'draft-term', classRoomId: 'draft-class', learningAreaId: 'draft-math' };
    const actor = { userId: 'draft-user', role: 'TEACHER', schoolId: scope.schoolId };
    await c.academicRepository.saveYear(AcademicYear.create({ schoolId: scope.schoolId, name: '2026', startDate: '2026-01-01', endDate: '2026-12-31', isCurrent: true }, scope.academicYearId));
    await c.academicRepository.saveTerm(AcademicTerm.create({ academicYearId: scope.academicYearId, name: 'Term 3', termNumber: 3, startDate: '2026-08-24', endDate: '2026-12-30', isCurrent: true }, scope.termId));
    await c.academicRepository.saveClass(ClassRoom.create({ schoolId: scope.schoolId, name: 'Grade 4', gradeLevel: CBCGradeLevel.GRADE_4, educationLevel: EducationLevel.UPPER_PRIMARY }, scope.classRoomId));
    await c.academicRepository.saveLearningArea(LearningArea.create({ schoolId: scope.schoolId, name: 'Mathematics', code: 'MATH', gradeLevel: CBCGradeLevel.GRADE_4, educationLevel: EducationLevel.UPPER_PRIMARY, isElective: false }, scope.learningAreaId));
    await c.teacherRepository.save(Teacher.create({ userId: actor.userId, employeeNumber: 'DRAFT', specialization: [], assignedClassStreamIds: [] }, 'draft-teacher'));
    await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({ ...scope, teacherId: 'draft-teacher', role: 'SUBJECT_TEACHER', effectiveFrom: '2026-01-01', isActive: true }, 'draft-duty'));
    const strand = await c.CBCUseCases.createStrand({ learningAreaId: scope.learningAreaId, gradeLevel: CBCGradeLevel.GRADE_4, title: 'Algebra', code: 'MAT-01' });
    const sub = await c.CBCUseCases.createSubStrand({ strandId: strand.id, code: 'MAT-01.1', title: 'Expressions', specificLearningOutcomes: ['Form expressions'] });
    const saved = await c.termAllocations.saveDraft(actor, scope, [{ subStrandId: sub.id, lessons: 3 }], 0);
    const reloaded = await new PostgresSchemeOfWorkRepository(client as unknown as Pool).findById(saved.scheme.id);
    expect(reloaded?.planningState?.allocations).toEqual([{ subStrandId: sub.id, lessons: 3 }]);
    expect(reloaded?.entries).toEqual([]);
    const resumed = await c.termAllocations.describe(actor, (await c.termAllocations.get(actor, saved.scheme.id))!);
    expect(resumed.setupRequired).toContain('publish the term calendar');
    expect(resumed.slots).toEqual([]);
    expect(resumed.progress.allocatedLessons).toBe(3);
    await expect(c.termAllocations.finalize(actor, saved.scheme.id, 1)).rejects.toThrow('publish the term calendar');
  });
});
