import { Pool } from 'pg';
import { EDiaryEntry, EDiaryHomeworkTask, EDiaryAcknowledgement } from '../../../core/domain/ediary/EDiaryEntry';
import { IEDiaryRepository, EDiaryFilterCriteria } from '../../../core/ports/repositories/IEDiaryRepository';

function parseJsonArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRowToEDiaryEntry(row: any): EDiaryEntry {
  const homeworkTasks: EDiaryHomeworkTask[] = parseJsonArray(row.homework_tasks);
  const tomorrowRequirements: string[] = parseJsonArray(row.tomorrow_requirements);
  const acknowledgements: EDiaryAcknowledgement[] = parseJsonArray(row.acknowledgements);

  return EDiaryEntry.create(
    {
      schoolId: row.school_id,
      classRoomId: row.classroom_id || undefined,
      streamId: row.stream_id,
      studentId: row.student_id || undefined,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name || undefined,
      academicYearId: row.academic_year_id || undefined,
      termId: row.term_id || undefined,
      date: row.date,
      title: row.title,
      homework: row.homework || '',
      homeworkTasks,
      teacherRemarks: row.teacher_remarks || undefined,
      requirementsTomorrow: row.requirements_tomorrow || undefined,
      tomorrowRequirements,
      acknowledgements,
      status: row.status || 'PUBLISHED'
    },
    row.id,
    row.created_at ? new Date(row.created_at) : undefined,
    row.updated_at ? new Date(row.updated_at) : undefined
  );
}

export class PostgresEDiaryRepository implements IEDiaryRepository {
  constructor(private readonly pool: Pool) {}

  public async save(entry: EDiaryEntry): Promise<void> {
    const query = `
      INSERT INTO ediary_entries (
        id, school_id, classroom_id, stream_id, student_id,
        teacher_id, teacher_name, academic_year_id, term_id,
        date, title, homework, homework_tasks, teacher_remarks,
        requirements_tomorrow, tomorrow_requirements, acknowledgements,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        homework = EXCLUDED.homework,
        homework_tasks = EXCLUDED.homework_tasks,
        teacher_remarks = EXCLUDED.teacher_remarks,
        requirements_tomorrow = EXCLUDED.requirements_tomorrow,
        tomorrow_requirements = EXCLUDED.tomorrow_requirements,
        acknowledgements = EXCLUDED.acknowledgements,
        status = EXCLUDED.status,
        classroom_id = COALESCE(EXCLUDED.classroom_id, ediary_entries.classroom_id),
        teacher_name = COALESCE(EXCLUDED.teacher_name, ediary_entries.teacher_name),
        academic_year_id = COALESCE(EXCLUDED.academic_year_id, ediary_entries.academic_year_id),
        term_id = COALESCE(EXCLUDED.term_id, ediary_entries.term_id),
        updated_at = CURRENT_TIMESTAMP;
    `;

    const values = [
      entry.id,
      entry.schoolId,
      entry.classRoomId || null,
      entry.streamId,
      entry.studentId || null,
      entry.teacherId,
      entry.teacherName || null,
      entry.academicYearId || null,
      entry.termId || null,
      entry.date,
      entry.title,
      entry.homework || null,
      JSON.stringify(entry.homeworkTasks || []),
      entry.teacherRemarks || null,
      entry.requirementsTomorrow || null,
      JSON.stringify(entry.tomorrowRequirements || []),
      JSON.stringify(entry.acknowledgements || []),
      entry.status || 'PUBLISHED',
      entry.createdAt,
      entry.updatedAt
    ];

    await this.pool.query(query, values);
  }

  public async update(entry: EDiaryEntry): Promise<void> {
    const query = `
      UPDATE ediary_entries SET
        classroom_id = $2,
        teacher_name = $3,
        academic_year_id = $4,
        term_id = $5,
        title = $6,
        homework = $7,
        homework_tasks = $8,
        teacher_remarks = $9,
        requirements_tomorrow = $10,
        tomorrow_requirements = $11,
        acknowledgements = $12,
        status = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;

    const values = [
      entry.id,
      entry.classRoomId || null,
      entry.teacherName || null,
      entry.academicYearId || null,
      entry.termId || null,
      entry.title,
      entry.homework || null,
      JSON.stringify(entry.homeworkTasks || []),
      entry.teacherRemarks || null,
      entry.requirementsTomorrow || null,
      JSON.stringify(entry.tomorrowRequirements || []),
      JSON.stringify(entry.acknowledgements || []),
      entry.status || 'PUBLISHED'
    ];

    await this.pool.query(query, values);
  }

  public async findById(id: string): Promise<EDiaryEntry | null> {
    const res = await this.pool.query('SELECT * FROM ediary_entries WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return mapRowToEDiaryEntry(res.rows[0]);
  }

  public async findByStreamAndDate(streamId: string, date: string, studentId?: string): Promise<EDiaryEntry | null> {
    let query = 'SELECT * FROM ediary_entries WHERE stream_id = $1 AND date = $2';
    const params: any[] = [streamId, date];

    if (studentId) {
      query += ' AND student_id = $3';
      params.push(studentId);
    } else {
      query += ' AND student_id IS NULL';
    }

    const res = await this.pool.query(query, params);
    if (!res.rows.length) return null;
    return mapRowToEDiaryEntry(res.rows[0]);
  }

  public async findEntries(filters: EDiaryFilterCriteria): Promise<EDiaryEntry[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      params.push(filters.schoolId);
    }
    if (filters.streamId) {
      conditions.push(`stream_id = $${idx++}`);
      params.push(filters.streamId);
    }
    if (filters.classRoomId) {
      conditions.push(`classroom_id = $${idx++}`);
      params.push(filters.classRoomId);
    }
    if (filters.studentId) {
      conditions.push(`(student_id = $${idx} OR student_id IS NULL)`);
      idx++;
      params.push(filters.studentId);
    }
    if (filters.teacherId) {
      conditions.push(`teacher_id = $${idx++}`);
      params.push(filters.teacherId);
    }
    if (filters.academicYearId) {
      conditions.push(`academic_year_id = $${idx++}`);
      params.push(filters.academicYearId);
    }
    if (filters.termId) {
      conditions.push(`term_id = $${idx++}`);
      params.push(filters.termId);
    }
    if (filters.date) {
      conditions.push(`date = $${idx++}`);
      params.push(filters.date);
    }
    if (filters.startDate) {
      conditions.push(`date >= $${idx++}`);
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`date <= $${idx++}`);
      params.push(filters.endDate);
    }
    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM ediary_entries ${whereClause} ORDER BY date DESC, created_at DESC;`;

    const res = await this.pool.query(query, params);
    return res.rows.map(mapRowToEDiaryEntry);
  }

  public async findByStudent(studentId: string, streamId?: string, limit = 20): Promise<EDiaryEntry[]> {
    let query: string;
    let params: any[];

    if (streamId) {
      query = `
        SELECT * FROM ediary_entries
        WHERE (student_id = $1 OR (stream_id = $2 AND student_id IS NULL))
        ORDER BY date DESC, created_at DESC
        LIMIT $3;
      `;
      params = [studentId, streamId, limit];
    } else {
      query = `
        SELECT * FROM ediary_entries
        WHERE student_id = $1
        ORDER BY date DESC, created_at DESC
        LIMIT $2;
      `;
      params = [studentId, limit];
    }

    const res = await this.pool.query(query, params);
    return res.rows.map(mapRowToEDiaryEntry);
  }

  public async findByStream(streamId: string, date?: string, status?: 'DRAFT' | 'PUBLISHED'): Promise<EDiaryEntry[]> {
    const conditions: string[] = ['stream_id = $1'];
    const params: any[] = [streamId];
    let idx = 2;

    if (date) {
      conditions.push(`date = $${idx++}`);
      params.push(date);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    const query = `
      SELECT * FROM ediary_entries
      WHERE ${conditions.join(' AND ')}
      ORDER BY date DESC, created_at DESC;
    `;

    const res = await this.pool.query(query, params);
    return res.rows.map(mapRowToEDiaryEntry);
  }

  public async findByStreams(
    streamIds: string[],
    studentIds: string[] = [],
    options?: {
      classRoomIds?: string[];
      academicYearId?: string;
      termId?: string;
      startDate?: string;
      endDate?: string;
      date?: string;
      status?: 'DRAFT' | 'PUBLISHED';
      limit?: number;
    }
  ): Promise<EDiaryEntry[]> {
    const hasStreams = Boolean(streamIds && streamIds.length > 0);
    const hasClassrooms = Boolean(options?.classRoomIds && options.classRoomIds.length > 0);
    const hasStudents = Boolean(studentIds && studentIds.length > 0);

    if (!hasStreams && !hasClassrooms && !hasStudents) {
      return [];
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const targetConditions: string[] = [];
    if (hasStreams) {
      if (hasStudents) {
        targetConditions.push(`(stream_id = ANY($${idx}) AND (student_id IS NULL OR student_id = ANY($${idx + 1})))`);
        params.push(streamIds);
        params.push(studentIds);
        idx += 2;
      } else {
        targetConditions.push(`(stream_id = ANY($${idx}) AND student_id IS NULL)`);
        params.push(streamIds);
        idx++;
      }
    }
    if (hasClassrooms) {
      if (hasStudents) {
        targetConditions.push(`(classroom_id = ANY($${idx}) AND (student_id IS NULL OR student_id = ANY($${idx + 1})))`);
        params.push(options!.classRoomIds);
        params.push(studentIds);
        idx += 2;
      } else {
        targetConditions.push(`(classroom_id = ANY($${idx}) AND student_id IS NULL)`);
        params.push(options!.classRoomIds);
        idx++;
      }
    }
    if (hasStudents) {
      targetConditions.push(`student_id = ANY($${idx})`);
      params.push(studentIds);
      idx++;
    }

    if (targetConditions.length > 0) {
      conditions.push(`(${targetConditions.join(' OR ')})`);
    }

    if (options?.academicYearId) {
      conditions.push(`academic_year_id = $${idx++}`);
      params.push(options.academicYearId);
    }
    if (options?.termId) {
      conditions.push(`term_id = $${idx++}`);
      params.push(options.termId);
    }
    if (options?.date) {
      conditions.push(`date = $${idx++}`);
      params.push(options.date);
    }
    if (options?.startDate) {
      conditions.push(`date >= $${idx++}`);
      params.push(options.startDate);
    }
    if (options?.endDate) {
      conditions.push(`date <= $${idx++}`);
      params.push(options.endDate);
    }
    if (options?.status) {
      conditions.push(`status = $${idx++}`);
      params.push(options.status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    let limitClause = '';
    if (options?.limit) {
      limitClause = `LIMIT $${idx++}`;
      params.push(options.limit);
    }

    const query = `
      SELECT * FROM ediary_entries
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      ${limitClause};
    `;

    const res = await this.pool.query(query, params);
    return res.rows.map(mapRowToEDiaryEntry);
  }

  public async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM ediary_entries WHERE id = $1', [id]);
  }
}
