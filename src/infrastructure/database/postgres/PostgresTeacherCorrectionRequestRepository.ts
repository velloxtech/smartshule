import { Pool } from 'pg';
import { TeacherCorrectionRequest, CorrectionRequestStatus } from '../../../core/domain/user/TeacherCorrectionRequest';
import { ITeacherCorrectionRequestRepository } from '../../../core/ports/repositories/ITeacherCorrectionRequestRepository';

export class PostgresTeacherCorrectionRequestRepository implements ITeacherCorrectionRequestRepository {
  constructor(private pool: Pool) {}

  private mapRow(r: any): TeacherCorrectionRequest {
    return TeacherCorrectionRequest.create(
      {
        teacherId: r.teacher_id,
        userId: r.user_id,
        schoolId: r.school_id,
        fieldName: r.field_name,
        fieldLabel: r.field_label,
        currentValue: r.current_value,
        proposedValue: r.proposed_value,
        reason: r.reason,
        evidenceUrl: r.evidence_url,
        status: r.status as CorrectionRequestStatus,
        reviewedByUserId: r.reviewed_by_user_id,
        reviewedByName: r.reviewed_by_name,
        reviewRemarks: r.review_remarks,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at) : undefined
      },
      r.id,
      r.created_at ? new Date(r.created_at) : undefined,
      r.updated_at ? new Date(r.updated_at) : undefined
    );
  }

  public async findById(id: string): Promise<TeacherCorrectionRequest | null> {
    const res = await this.pool.query('SELECT * FROM teacher_correction_requests WHERE id = $1', [id]);
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }

  public async findByTeacherId(teacherId: string): Promise<TeacherCorrectionRequest[]> {
    const res = await this.pool.query(
      'SELECT * FROM teacher_correction_requests WHERE teacher_id = $1 ORDER BY created_at DESC',
      [teacherId]
    );
    return res.rows.map((r) => this.mapRow(r));
  }

  public async findBySchoolId(schoolId: string, status?: CorrectionRequestStatus): Promise<TeacherCorrectionRequest[]> {
    let query = 'SELECT * FROM teacher_correction_requests WHERE school_id = $1';
    const params: any[] = [schoolId];
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map((r) => this.mapRow(r));
  }

  public async findPendingByTeacherAndField(teacherId: string, fieldName: string): Promise<TeacherCorrectionRequest | null> {
    const res = await this.pool.query(
      "SELECT * FROM teacher_correction_requests WHERE teacher_id = $1 AND field_name = $2 AND status = 'PENDING' LIMIT 1",
      [teacherId, fieldName]
    );
    return res.rows.length ? this.mapRow(res.rows[0]) : null;
  }

  public async save(r: TeacherCorrectionRequest): Promise<void> {
    const q = `
      INSERT INTO teacher_correction_requests (
        id, teacher_id, user_id, school_id, field_name, field_label,
        current_value, proposed_value, reason, evidence_url, status,
        reviewed_by_user_id, reviewed_by_name, review_remarks, reviewed_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        reviewed_by_user_id = EXCLUDED.reviewed_by_user_id,
        reviewed_by_name = EXCLUDED.reviewed_by_name,
        review_remarks = EXCLUDED.review_remarks,
        reviewed_at = EXCLUDED.reviewed_at,
        updated_at = NOW()
    `;
    await this.pool.query(q, [
      r.id,
      r.teacherId,
      r.userId,
      r.schoolId,
      r.fieldName,
      r.fieldLabel,
      r.currentValue,
      r.proposedValue,
      r.reason,
      r.evidenceUrl,
      r.status,
      r.reviewedByUserId,
      r.reviewedByName,
      r.reviewRemarks,
      r.reviewedAt,
      r.createdAt,
      r.updatedAt
    ]);
  }

  public async update(r: TeacherCorrectionRequest): Promise<void> {
    await this.save(r);
  }

  public async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM teacher_correction_requests WHERE id = $1', [id]);
  }
}
