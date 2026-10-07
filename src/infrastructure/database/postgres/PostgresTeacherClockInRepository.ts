import { Pool } from 'pg';
import { ITeacherClockInRepository, ClockInFilterCriteria } from '../../../core/ports/repositories/ITeacherClockInRepository';
import { TeacherClockIn, TeacherClockInStatus } from '../../../core/domain/attendance/TeacherClockIn';

export class PostgresTeacherClockInRepository implements ITeacherClockInRepository {
  constructor(private pool: Pool) {}

  private mapRow(r: any): TeacherClockIn {
    return TeacherClockIn.create(
      {
        schoolId: r.school_id,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        date: r.date,
        clockInTime: r.clock_in_time,
        clockOutTime: r.clock_out_time,
        status: (r.status as TeacherClockInStatus) || 'CLOCKED_IN',
        latitude: r.latitude != null ? parseFloat(r.latitude) : null,
        longitude: r.longitude != null ? parseFloat(r.longitude) : null,
        distanceMeters: r.distance_meters != null ? parseFloat(r.distance_meters) : null,
        inCompound: r.in_compound !== false,
        accuracyMeters: r.accuracy_meters != null ? parseFloat(r.accuracy_meters) : null,
        verifiedBy: r.verified_by
      },
      r.id,
      r.created_at,
      r.updated_at
    );
  }

  public async findById(id: string): Promise<TeacherClockIn | null> {
    const res = await this.pool.query('SELECT * FROM teacher_clockins WHERE id = $1', [id]);
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findTodayRecord(teacherId: string, date: string): Promise<TeacherClockIn | null> {
    const res = await this.pool.query(
      'SELECT * FROM teacher_clockins WHERE teacher_id = $1 AND date = $2 ORDER BY created_at DESC LIMIT 1',
      [teacherId, date]
    );
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  public async findRecords(filters: ClockInFilterCriteria): Promise<TeacherClockIn[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      params.push(filters.schoolId);
    }
    if (filters.teacherId) {
      conditions.push(`teacher_id = $${idx++}`);
      params.push(filters.teacherId);
    }
    if (filters.date) {
      conditions.push(`date = $${idx++}`);
      params.push(filters.date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.pool.query(
      `SELECT * FROM teacher_clockins ${whereClause} ORDER BY created_at DESC LIMIT 100`,
      params
    );
    return res.rows.map(r => this.mapRow(r));
  }

  public async save(record: TeacherClockIn): Promise<void> {
    const q = `
      INSERT INTO teacher_clockins (
        id, school_id, teacher_id, teacher_name, date,
        clock_in_time, clock_out_time, status, latitude, longitude,
        distance_meters, in_compound, accuracy_meters, verified_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        clock_out_time = EXCLUDED.clock_out_time,
        status = EXCLUDED.status,
        updated_at = NOW()
    `;
    await this.pool.query(q, [
      record.id,
      record.schoolId,
      record.teacherId,
      record.teacherName,
      record.date,
      record.clockInTime,
      record.clockOutTime,
      record.status,
      record.latitude,
      record.longitude,
      record.distanceMeters,
      record.inCompound,
      record.accuracyMeters,
      record.verifiedBy || 'GPS_GEOFENCE',
      record.createdAt,
      record.updatedAt
    ]);
  }

  public async update(record: TeacherClockIn): Promise<void> {
    await this.save(record);
  }
}
