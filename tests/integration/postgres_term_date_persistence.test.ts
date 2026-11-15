import { Pool, PoolClient } from 'pg';
import { PostgresAcademicRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
import { AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { AcademicUseCases } from '../../src/application/academics/AcademicUseCases';

const url = process.env.TERM_PERSISTENCE_TEST_DATABASE_URL;
// All writes use a session-local temporary table; no application tables are changed.
(url ? describe : describe.skip)('PostgreSQL term-date persistence', () => {
  let pool: Pool;
  let client: PoolClient;
  let repository: PostgresAcademicRepository;
  beforeAll(async () => {
    pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10000 });
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`CREATE TEMP TABLE academic_terms (
      id VARCHAR(100) PRIMARY KEY, academic_year_id VARCHAR(100) NOT NULL,
      term_number INTEGER NOT NULL, name VARCHAR(100) NOT NULL,
      start_date VARCHAR(50) NOT NULL, end_date VARCHAR(50) NOT NULL,
      is_current BOOLEAN NOT NULL, created_at TIMESTAMP, updated_at TIMESTAMP
    ) ON COMMIT DROP`);
    repository = new PostgresAcademicRepository(client as unknown as Pool);
  });
  afterAll(async () => {
    if (client) { await client.query('ROLLBACK'); client.release(); }
    if (pool) await pool.end();
  });

  it('persists an ended term’s new closing date when reloaded, preserving its opening date and current flag', async () => {
    await repository.saveTerm(AcademicTerm.create({ academicYearId: 'test-year', termNumber: 3,
      name: 'Term 3', startDate: '2020-08-24', endDate: '2020-10-23', isCurrent: true }, 'closing-date-test'));
    const useCases = new AcademicUseCases(repository);
    const response = await useCases.updateAcademicTerm('closing-date-test', { endDate: '2020-11-27' });
    const reloaded = await repository.findTermById('closing-date-test');
    expect(response.endDate).toBe('2020-11-27');
    expect(reloaded?.endDate).toBe(response.endDate);
    expect(reloaded?.startDate).toBe('2020-08-24');
    expect(reloaded?.isCurrent).toBe(true);
    const terms = await repository.findTermsByYear('test-year');
    expect(terms[0].endDate).toBe('2020-11-27');
  });

  it('persists other editable term details on update too', async () => {
    const term = (await repository.findTermById('closing-date-test'))!;
    term.updateDetails({ name: 'Extended Term 3', startDate: '2020-08-25', isCurrent: false });
    await repository.updateTerm(term);
    const reloaded = await repository.findTermById(term.id);
    expect(reloaded?.name).toBe('Extended Term 3');
    expect(reloaded?.startDate).toBe('2020-08-25');
    expect(reloaded?.endDate).toBe('2020-11-27');
    expect(reloaded?.isCurrent).toBe(false);
  });
});
