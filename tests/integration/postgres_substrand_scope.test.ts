import { Pool, PoolClient } from 'pg';
import { PostgresCBCAssessmentRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
import { Strand, SubStrand } from '../../src/core/domain/cbc/CbcAssessment';
import { CBCGradeLevel } from '../../src/core/domain/user/Student';

const url = process.env.STRAND_SCOPE_TEST_DATABASE_URL;
(url ? describe : describe.skip)('PostgreSQL exact sub-strand parent scope', () => {
  let pool: Pool;
  let client: PoolClient;
  let repository: PostgresCBCAssessmentRepository;
  beforeAll(async () => {
    pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 });
    client = await pool.connect();
    await client.query('BEGIN');
    // Private temporary tables shadow the real tables; all fixture writes roll back.
    await client.query(`CREATE TEMP TABLE strands (
      id TEXT PRIMARY KEY, learning_area_id TEXT, grade_level TEXT, code TEXT,
      title TEXT, description TEXT, created_at TIMESTAMP, updated_at TIMESTAMP
    ) ON COMMIT DROP;
    CREATE TEMP TABLE sub_strands (
      id TEXT PRIMARY KEY, strand_id TEXT, code TEXT, title TEXT,
      specific_learning_outcomes JSONB, suggested_experiences JSONB,
      created_at TIMESTAMP, updated_at TIMESTAMP
    ) ON COMMIT DROP`);
    repository = new PostgresCBCAssessmentRepository(client as unknown as Pool);
  });
  afterAll(async () => {
    if (client) { await client.query('ROLLBACK'); client.release(); }
    if (pool) await pool.end();
  });
  it('never borrows sub-strands from matching codes or titles in other learning areas or grades', async () => {
    for (const [id, area, grade, code] of [
      ['own', 'math-g4', CBCGradeLevel.GRADE_4, 'MAT-01'],
      ['other-grade', 'math-g5', CBCGradeLevel.GRADE_5, 'MAT-01'],
      ['other-subject', 'english-g4', CBCGradeLevel.GRADE_4, 'ENG-01']
    ]) {
      await repository.saveStrand(Strand.create({ learningAreaId: area, gradeLevel: grade as CBCGradeLevel, code, title: 'Numbers' }, id));
      await repository.saveSubStrand(SubStrand.create({ strandId: id, code: '1.1', title: `${id} sub-strand`, specificLearningOutcomes: ['Identify concepts'] }, `${id}-sub`));
    }
    expect((await repository.findSubStrandsByStrand('own')).map(s => s.id)).toEqual(['own-sub']);
    expect(await repository.findSubStrandsByStrand('MAT-01')).toEqual([]);
    await repository.deleteSubStrand('own-sub');
    expect(await repository.findSubStrandsByStrand('own')).toEqual([]);
    expect((await repository.findSubStrandsByStrand('other-grade')).map(s => s.id)).toEqual(['other-grade-sub']);
    expect((await repository.findSubStrandsByStrand('other-subject')).map(s => s.id)).toEqual(['other-subject-sub']);
  });
});
