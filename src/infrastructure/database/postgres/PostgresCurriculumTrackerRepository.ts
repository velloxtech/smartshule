import { Pool } from 'pg';
import {
  ICurriculumTrackerRepository,
  CurriculumTrackerFilterCriteria
} from '../../../core/ports/repositories/ICurriculumTrackerRepository';
import {
  CurriculumTracker,
  CurriculumTrackerWeekItem
} from '../../../core/domain/curriculum-tracker/CurriculumTracker';

function parseJsonItems(val: any): CurriculumTrackerWeekItem[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRowToTracker(row: any): CurriculumTracker {
  return CurriculumTracker.create(
    {
      schoolId: row.school_id,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      learningAreaId: row.learning_area_id,
      subjectName: row.subject_name,
      classRoomId: row.classroom_id,
      className: row.class_name,
      streamId: row.stream_id || undefined,
      streamName: row.stream_name || undefined,
      academicYear: row.academic_year,
      term: row.term,
      totalWeeks: row.total_weeks || 12,
      items: parseJsonItems(row.items),
      status: row.status || 'ACTIVE'
    },
    row.id,
    row.created_at ? new Date(row.created_at) : undefined,
    row.updated_at ? new Date(row.updated_at) : undefined
  );
}

export class PostgresCurriculumTrackerRepository implements ICurriculumTrackerRepository {
  constructor(private readonly pool: Pool) {}

  public async findById(id: string): Promise<CurriculumTracker | null> {
    const res = await this.pool.query('SELECT * FROM curriculum_trackers WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return mapRowToTracker(res.rows[0]);
  }

  public async findTrackers(filters: CurriculumTrackerFilterCriteria): Promise<CurriculumTracker[]> {
    let query = 'SELECT * FROM curriculum_trackers WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (filters.schoolId) {
      query += ` AND school_id = $${pIdx++}`;
      params.push(filters.schoolId);
    }
    if (filters.teacherId) {
      query += ` AND teacher_id = $${pIdx++}`;
      params.push(filters.teacherId);
    }
    if (filters.classRoomId) {
      query += ` AND classroom_id = $${pIdx++}`;
      params.push(filters.classRoomId);
    }
    if (filters.streamId) {
      query += ` AND stream_id = $${pIdx++}`;
      params.push(filters.streamId);
    }
    if (filters.learningAreaId) {
      query += ` AND learning_area_id = $${pIdx++}`;
      params.push(filters.learningAreaId);
    }
    if (filters.term) {
      query += ` AND LOWER(term) = LOWER($${pIdx++})`;
      params.push(filters.term);
    }
    if (filters.academicYear) {
      query += ` AND academic_year = $${pIdx++}`;
      params.push(filters.academicYear);
    }
    if (filters.status) {
      query += ` AND status = $${pIdx++}`;
      params.push(filters.status);
    }
    if (filters.search) {
      query += ` AND (LOWER(subject_name) LIKE $${pIdx} OR LOWER(class_name) LIKE $${pIdx} OR LOWER(teacher_name) LIKE $${pIdx})`;
      params.push(`%${filters.search.toLowerCase()}%`);
      pIdx++;
    }

    query += ' ORDER BY updated_at DESC';

    const res = await this.pool.query(query, params);
    return res.rows.map(mapRowToTracker);
  }

  public async save(tracker: CurriculumTracker): Promise<void> {
    const query = `
      INSERT INTO curriculum_trackers (
        id, school_id, teacher_id, teacher_name, learning_area_id, subject_name,
        classroom_id, class_name, stream_id, stream_name, academic_year, term,
        total_weeks, items, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        teacher_id = EXCLUDED.teacher_id,
        teacher_name = EXCLUDED.teacher_name,
        learning_area_id = EXCLUDED.learning_area_id,
        subject_name = EXCLUDED.subject_name,
        classroom_id = EXCLUDED.classroom_id,
        class_name = EXCLUDED.class_name,
        stream_id = EXCLUDED.stream_id,
        stream_name = EXCLUDED.stream_name,
        academic_year = EXCLUDED.academic_year,
        term = EXCLUDED.term,
        total_weeks = EXCLUDED.total_weeks,
        items = EXCLUDED.items,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `;

    const values = [
      tracker.id,
      tracker.schoolId,
      tracker.teacherId,
      tracker.teacherName,
      tracker.learningAreaId,
      tracker.subjectName,
      tracker.classRoomId,
      tracker.className,
      tracker.streamId || null,
      tracker.streamName || null,
      tracker.academicYear,
      tracker.term,
      tracker.totalWeeks,
      JSON.stringify(tracker.items),
      tracker.status,
      tracker.createdAt,
      tracker.updatedAt
    ];

    await this.pool.query(query, values);
  }

  public async update(tracker: CurriculumTracker): Promise<void> {
    await this.save(tracker);
  }

  public async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM curriculum_trackers WHERE id = $1', [id]);
  }
}
