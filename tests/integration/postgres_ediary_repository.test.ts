import { Pool } from 'pg';
import { PostgresEDiaryRepository } from '../../src/infrastructure/database/postgres/PostgresEDiaryRepository';
import { EDiaryEntry } from '../../src/core/domain/ediary/EDiaryEntry';

describe('PostgresEDiaryRepository Real PostgreSQL Integration Tests', () => {
  let pool: Pool;
  let repo: PostgresEDiaryRepository;
  const testEntryId = 'test-ediary-pg-001';
  const testStreamId = 'stream-pg-test-01';
  const testDate = '2026-11-02';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://don:1324@localhost:5432/smartshule',
    });
    repo = new PostgresEDiaryRepository(pool);
  });

  afterAll(async () => {
    // Clean up test records
    await pool.query("DELETE FROM ediary_entries WHERE id LIKE 'test-ediary-pg%'");
    await pool.end();
  });

  it('1. Successfully persists an eDiary entry to PostgreSQL ediary_entries table', async () => {
    // Clean up any pre-existing record
    await repo.delete(testEntryId);

    const entry = EDiaryEntry.create(
      {
        schoolId: 'school-001',
        classRoomId: 'class-g4',
        streamId: testStreamId,
        teacherId: 'usr-teacher-01',
        teacherName: 'Grace Muthoni',
        academicYearId: 'year-2026',
        termId: 'term-2026-t3',
        date: testDate,
        title: 'Daily Science & Math eDiary',
        homework: 'Science leaves; Math exercise',
        homeworkTasks: [
          {
            learningArea: 'Science',
            description: 'Observe leaves',
            dueDate: '2026-11-03'
          },
          {
            learningArea: 'Math',
            description: 'Page 10',
            dueDate: '2026-11-03'
          }
        ],
        teacherRemarks: 'Excellent class participation today.',
        requirementsTomorrow: 'Manila paper, Scissors',
        tomorrowRequirements: ['Manila paper', 'Scissors'],
        acknowledgements: [],
        status: 'PUBLISHED'
      },
      testEntryId
    );

    await repo.save(entry);

    // Verify row directly in PostgreSQL table
    const dbRes = await pool.query('SELECT * FROM ediary_entries WHERE id = $1', [testEntryId]);
    expect(dbRes.rows.length).toBe(1);
    const row = dbRes.rows[0];
    expect(row.stream_id).toBe(testStreamId);
    expect(row.date).toBe(testDate);
    expect(row.status).toBe('PUBLISHED');
    expect(row.teacher_name).toBe('Grace Muthoni');
    expect(Array.isArray(row.homework_tasks)).toBe(true);
    expect(row.homework_tasks.length).toBe(2);
    expect(row.tomorrow_requirements).toEqual(['Manila paper', 'Scissors']);
  });

  it('2. Retrieves persisted entry from PostgreSQL with full domain mapping', async () => {
    const loaded = await repo.findById(testEntryId);
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(testEntryId);
    expect(loaded?.homeworkTasks.length).toBe(2);
    expect(loaded?.homeworkTasks[0].learningArea).toBe('Science');
    expect(loaded?.tomorrowRequirements).toEqual(['Manila paper', 'Scissors']);
    expect(loaded?.status).toBe('PUBLISHED');

    const json = loaded!.toJSON();
    expect(json.homeworkTasks.length).toBe(2);
    expect(json.tomorrowRequirements).toEqual(['Manila paper', 'Scissors']);
    expect(json.teacherUserId).toBe('usr-teacher-01');
  });

  it('3. Finds entry by stream and date', async () => {
    const found = await repo.findByStreamAndDate(testStreamId, testDate);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(testEntryId);
    expect(found?.title).toBe('Daily Science & Math eDiary');
  });

  it('4. Updates existing entry and parent acknowledgements in PostgreSQL', async () => {
    const loaded = await repo.findById(testEntryId);
    expect(loaded).not.toBeNull();

    loaded!.addAcknowledgement({
      guardianId: 'grd-001',
      guardianUserId: 'usr-parent-01',
      guardianName: 'Mary Wanjiku',
      studentId: 'std-learner-01',
      signedAt: '2026-11-02T18:00:00.000Z',
      parentNote: 'Confirmed homework'
    });
    loaded!.updateContent({
      teacherRemarks: 'Updated teacher note for parents'
    });

    await repo.update(loaded!);

    // Re-fetch from fresh query to verify PostgreSQL persistence
    const reloaded = await repo.findById(testEntryId);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.teacherRemarks).toBe('Updated teacher note for parents');
    expect(reloaded?.acknowledgements.length).toBe(1);
    expect(reloaded?.acknowledgements[0].guardianName).toBe('Mary Wanjiku');
    expect(reloaded?.acknowledgements[0].parentNote).toBe('Confirmed homework');

    const json = reloaded!.toJSON();
    expect(json.parentAcknowledgements.length).toBe(1);
    expect(json.parentAcknowledgements[0].guardianName).toBe('Mary Wanjiku');
  });

  it('5. Successfully queries multiple streams via findByStreams in PostgreSQL', async () => {
    const entryA = EDiaryEntry.create(
      {
        schoolId: 'school-001',
        classRoomId: 'class-g1',
        streamId: 'stream-pg-multi-01',
        teacherId: 'usr-teacher-01',
        date: '2026-11-02',
        title: 'Grade 1 East Diary',
        homework: 'Read page 5',
        homeworkTasks: [{ learningArea: 'English', description: 'Read page 5', dueDate: '2026-11-03' }],
        tomorrowRequirements: [],
        acknowledgements: [],
        status: 'PUBLISHED'
      },
      'test-ediary-pg-multi-a'
    );

    const entryB = EDiaryEntry.create(
      {
        schoolId: 'school-001',
        classRoomId: 'class-g3',
        streamId: 'stream-pg-multi-02',
        teacherId: 'usr-teacher-01',
        date: '2026-11-02',
        title: 'Grade 3 North Diary',
        homework: 'Draw map',
        homeworkTasks: [{ learningArea: 'Social Studies', description: 'Draw map', dueDate: '2026-11-03' }],
        tomorrowRequirements: [],
        acknowledgements: [],
        status: 'PUBLISHED'
      },
      'test-ediary-pg-multi-b'
    );

    const draftEntry = EDiaryEntry.create(
      {
        schoolId: 'school-001',
        classRoomId: 'class-g1',
        streamId: 'stream-pg-multi-01',
        teacherId: 'usr-teacher-01',
        date: '2026-11-03',
        title: 'Draft Diary',
        homework: 'Pending draft',
        homeworkTasks: [{ learningArea: 'Math', description: 'Pending draft', dueDate: '2026-11-04' }],
        tomorrowRequirements: [],
        acknowledgements: [],
        status: 'DRAFT'
      },
      'test-ediary-pg-multi-draft'
    );

    await repo.save(entryA);
    await repo.save(entryB);
    await repo.save(draftEntry);

    const multiResults = await repo.findByStreams(
      ['stream-pg-multi-01', 'stream-pg-multi-02'],
      [],
      { status: 'PUBLISHED' }
    );

    expect(multiResults.length).toBe(2);
    const ids = multiResults.map(e => e.id);
    expect(ids).toContain('test-ediary-pg-multi-a');
    expect(ids).toContain('test-ediary-pg-multi-b');
    expect(ids).not.toContain('test-ediary-pg-multi-draft');

    // Clean up
    await repo.delete('test-ediary-pg-multi-a');
    await repo.delete('test-ediary-pg-multi-b');
    await repo.delete('test-ediary-pg-multi-draft');
  });

  it('6. Successfully deletes entry from PostgreSQL', async () => {
    await repo.delete(testEntryId);
    const deleted = await repo.findById(testEntryId);
    expect(deleted).toBeNull();

    const dbRes = await pool.query('SELECT * FROM ediary_entries WHERE id = $1', [testEntryId]);
    expect(dbRes.rows.length).toBe(0);
  });

  it('7. Persists and queries multiple distinct entries for the same stream and date without unique constraint violation', async () => {
    const entry1 = EDiaryEntry.create(
      {
        schoolId: 'school-001',
        classRoomId: 'class-g4',
        streamId: testStreamId,
        teacherId: 'usr-teacher-01',
        date: testDate,
        title: 'Morning Science Lesson',
        homework: 'Science leaves experiment',
        homeworkTasks: [{ learningArea: 'Science', description: 'Leaves experiment', dueDate: '2026-11-03' }],
        tomorrowRequirements: ['Magnifying Glass'],
        acknowledgements: [],
        status: 'PUBLISHED'
      },
      'test-ediary-pg-multi-same-day-1'
    );

    const entry2 = EDiaryEntry.create(
      {
        schoolId: 'school-001',
        classRoomId: 'class-g4',
        streamId: testStreamId,
        teacherId: 'usr-teacher-02',
        date: testDate,
        title: 'Afternoon Social Studies Lesson',
        homework: 'Physical features map',
        homeworkTasks: [{ learningArea: 'Social Studies', description: 'Physical features map', dueDate: '2026-11-03' }],
        tomorrowRequirements: ['Colored pencils'],
        acknowledgements: [],
        status: 'PUBLISHED'
      },
      'test-ediary-pg-multi-same-day-2'
    );

    // Both should save cleanly into PostgreSQL without unique constraint error
    await repo.save(entry1);
    await repo.save(entry2);

    const results = await repo.findByStream(testStreamId, testDate);
    expect(results.length).toBeGreaterThanOrEqual(2);
    const resultIds = results.map(r => r.id);
    expect(resultIds).toContain('test-ediary-pg-multi-same-day-1');
    expect(resultIds).toContain('test-ediary-pg-multi-same-day-2');

    // Also verify finding by classroomId
    const classResults = await repo.findByStreams([], [], { classRoomIds: ['class-g4'], date: testDate });
    expect(classResults.length).toBeGreaterThanOrEqual(2);

    // Clean up
    await repo.delete('test-ediary-pg-multi-same-day-1');
    await repo.delete('test-ediary-pg-multi-same-day-2');
  });
});
