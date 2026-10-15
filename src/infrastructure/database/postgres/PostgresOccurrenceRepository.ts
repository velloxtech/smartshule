import { Pool } from 'pg';
import { OccurrenceRecord, OccurrenceCategory, OccurrenceSeverity, OccurrenceStatus } from '../../../core/domain/occurrence/OccurrenceRecord';
import { IOccurrenceRepository, OccurrenceFilterCriteria } from '../../../core/ports/repositories/IOccurrenceRepository';

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRowToOccurrence(row: any): OccurrenceRecord {
  return OccurrenceRecord.create(
    {
      schoolId: row.school_id,
      occurrenceNumber: row.occurrence_number,
      title: row.title,
      description: row.description,
      category: row.category as OccurrenceCategory,
      severity: row.severity as OccurrenceSeverity,
      date: row.date,
      time: row.time,
      location: row.location,
      reportedByTeacherId: row.reported_by_teacher_id,
      reportedByTeacherName: row.reported_by_teacher_name,
      reportedByRole: row.reported_by_role || undefined,
      studentIds: parseJsonArray(row.student_ids),
      studentNames: parseJsonArray(row.student_names),
      witnesses: row.witnesses || undefined,
      immediateActionTaken: row.immediate_action_taken || undefined,
      status: (row.status as OccurrenceStatus) || 'OPEN',
      resolutionNotes: row.resolution_notes || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      parentNotified: !!row.parent_notified,
      parentNotificationMethod: row.parent_notification_method || 'NONE'
    },
    row.id,
    row.created_at ? new Date(row.created_at) : undefined,
    row.updated_at ? new Date(row.updated_at) : undefined
  );
}

export class PostgresOccurrenceRepository implements IOccurrenceRepository {
  constructor(private readonly pool: Pool) {}

  public async findById(id: string): Promise<OccurrenceRecord | null> {
    const res = await this.pool.query('SELECT * FROM occurrence_records WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return mapRowToOccurrence(res.rows[0]);
  }

  public async findByOccurrenceNumber(occurrenceNumber: string, schoolId?: string): Promise<OccurrenceRecord | null> {
    let query = 'SELECT * FROM occurrence_records WHERE occurrence_number = $1';
    const params: any[] = [occurrenceNumber];
    if (schoolId) {
      query += ' AND school_id = $2';
      params.push(schoolId);
    }
    const res = await this.pool.query(query, params);
    if (!res.rows.length) return null;
    return mapRowToOccurrence(res.rows[0]);
  }

  public async findOccurrences(filters: OccurrenceFilterCriteria): Promise<OccurrenceRecord[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      params.push(filters.schoolId);
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
    if (filters.category) {
      conditions.push(`category = $${idx++}`);
      params.push(filters.category);
    }
    if (filters.severity) {
      conditions.push(`severity = $${idx++}`);
      params.push(filters.severity);
    }
    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.teacherId) {
      conditions.push(`reported_by_teacher_id = $${idx++}`);
      params.push(filters.teacherId);
    }
    if (filters.studentId) {
      conditions.push(`student_ids::text ILIKE $${idx++}`);
      params.push(`%"${filters.studentId}"%`);
    }
    if (filters.search) {
      conditions.push(`(
        title ILIKE $${idx} OR 
        description ILIKE $${idx} OR 
        occurrence_number ILIKE $${idx} OR 
        location ILIKE $${idx} OR 
        reported_by_teacher_name ILIKE $${idx} OR
        student_names::text ILIKE $${idx}
      )`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.pool.query(
      `SELECT * FROM occurrence_records ${whereClause} ORDER BY date DESC, created_at DESC LIMIT 500`,
      params
    );

    return res.rows.map(mapRowToOccurrence);
  }

  public async save(record: OccurrenceRecord): Promise<void> {
    const query = `
      INSERT INTO occurrence_records (
        id, school_id, occurrence_number, title, description,
        category, severity, date, time, location,
        reported_by_teacher_id, reported_by_teacher_name, reported_by_role,
        student_ids, student_names, witnesses, immediate_action_taken,
        status, resolution_notes, resolved_by, resolved_at,
        parent_notified, parent_notification_method, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        severity = EXCLUDED.severity,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        location = EXCLUDED.location,
        reported_by_role = EXCLUDED.reported_by_role,
        student_ids = EXCLUDED.student_ids,
        student_names = EXCLUDED.student_names,
        witnesses = EXCLUDED.witnesses,
        immediate_action_taken = EXCLUDED.immediate_action_taken,
        status = EXCLUDED.status,
        resolution_notes = EXCLUDED.resolution_notes,
        resolved_by = EXCLUDED.resolved_by,
        resolved_at = EXCLUDED.resolved_at,
        parent_notified = EXCLUDED.parent_notified,
        parent_notification_method = EXCLUDED.parent_notification_method,
        updated_at = NOW()
    `;

    const values = [
      record.id,
      record.schoolId,
      record.occurrenceNumber,
      record.title,
      record.description,
      record.category,
      record.severity,
      record.date,
      record.time,
      record.location,
      record.reportedByTeacherId,
      record.reportedByTeacherName,
      record.reportedByRole || null,
      JSON.stringify(record.studentIds),
      JSON.stringify(record.studentNames),
      record.witnesses || null,
      record.immediateActionTaken || null,
      record.status,
      record.resolutionNotes || null,
      record.resolvedBy || null,
      record.resolvedAt || null,
      record.parentNotified,
      record.parentNotificationMethod || 'NONE',
      record.createdAt,
      record.updatedAt
    ];

    await this.pool.query(query, values);
  }

  public async update(record: OccurrenceRecord): Promise<void> {
    await this.save(record);
  }

  public async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM occurrence_records WHERE id = $1', [id]);
  }

  public async countBySchoolAndDate(schoolId: string, date: string): Promise<number> {
    const res = await this.pool.query(
      'SELECT COUNT(*) FROM occurrence_records WHERE school_id = $1 AND date = $2',
      [schoolId, date]
    );
    return parseInt(res.rows[0].count, 10) || 0;
  }
}
