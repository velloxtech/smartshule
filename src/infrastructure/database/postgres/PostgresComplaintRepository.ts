import { Pool } from 'pg';
import { Complaint } from '../../../core/domain/complaint/Complaint';
import {
  IComplaintRepository,
  ComplaintFilterCriteria,
  ComplaintStats
} from '../../../core/ports/repositories/IComplaintRepository';

function mapRowToComplaint(row: any): Complaint {
  return Complaint.create(
    {
      schoolId: row.school_id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      complainantName: row.complainant_name || undefined,
      complainantRole: row.complainant_role || undefined,
      complainantPhone: row.complainant_phone || undefined,
      complainantEmail: row.complainant_email || undefined,
      complainantStudentId: row.complainant_student_id || undefined,
      assignedToUserId: row.assigned_to_user_id || undefined,
      resolutionNotes: row.resolution_notes || undefined,
      resolvedByUserId: row.resolved_by_user_id || undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      createdByUserId: row.created_by_user_id || undefined
    },
    row.id,
    new Date(row.created_at),
    new Date(row.updated_at)
  );
}

export class PostgresComplaintRepository implements IComplaintRepository {
  constructor(private readonly pool: Pool) {}

  async create(complaint: Complaint): Promise<Complaint> {
    const query = `
      INSERT INTO complaints (
        id, school_id, title, description, category, priority, status,
        complainant_name, complainant_role, complainant_phone, complainant_email,
        complainant_student_id, assigned_to_user_id, resolution_notes,
        resolved_by_user_id, resolved_at, created_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17, $18, $19
      ) RETURNING *;
    `;

    const values = [
      complaint.id,
      complaint.schoolId,
      complaint.title,
      complaint.description,
      complaint.category,
      complaint.priority,
      complaint.status,
      complaint.complainantName || null,
      complaint.complainantRole || null,
      complaint.complainantPhone || null,
      complaint.complainantEmail || null,
      complaint.complainantStudentId || null,
      complaint.assignedToUserId || null,
      complaint.resolutionNotes || null,
      complaint.resolvedByUserId || null,
      complaint.resolvedAt || null,
      complaint.createdByUserId || null,
      complaint.createdAt,
      complaint.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return mapRowToComplaint(res.rows[0]);
  }

  async findById(id: string): Promise<Complaint | null> {
    const res = await this.pool.query('SELECT * FROM complaints WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRowToComplaint(res.rows[0]);
  }

  async find(criteria?: ComplaintFilterCriteria): Promise<Complaint[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (criteria?.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      values.push(criteria.schoolId);
    }
    if (criteria?.status) {
      conditions.push(`UPPER(status) = UPPER($${idx++})`);
      values.push(criteria.status);
    }
    if (criteria?.category) {
      conditions.push(`UPPER(category) = UPPER($${idx++})`);
      values.push(criteria.category);
    }
    if (criteria?.priority) {
      conditions.push(`UPPER(priority) = UPPER($${idx++})`);
      values.push(criteria.priority);
    }
    if (criteria?.assignedToUserId) {
      conditions.push(`assigned_to_user_id = $${idx++}`);
      values.push(criteria.assignedToUserId);
    }
    if (criteria?.complainantRole) {
      conditions.push(`UPPER(complainant_role) = UPPER($${idx++})`);
      values.push(criteria.complainantRole);
    }
    if (criteria?.complainantStudentId) {
      conditions.push(`complainant_student_id = $${idx++}`);
      values.push(criteria.complainantStudentId);
    }
    if (criteria?.search) {
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR complainant_name ILIKE $${idx})`);
      values.push(`%${criteria.search}%`);
      idx++;
    }
    if (criteria?.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      values.push(new Date(criteria.startDate));
    }
    if (criteria?.endDate) {
      conditions.push(`created_at <= $${idx++}`);
      values.push(new Date(criteria.endDate));
    }

    let sql = 'SELECT * FROM complaints';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    if (criteria?.limit) {
      sql += ` LIMIT $${idx++}`;
      values.push(criteria.limit);
    }
    if (criteria?.offset) {
      sql += ` OFFSET $${idx++}`;
      values.push(criteria.offset);
    }

    const res = await this.pool.query(sql, values);
    return res.rows.map(mapRowToComplaint);
  }

  async update(complaint: Complaint): Promise<Complaint> {
    const query = `
      UPDATE complaints SET
        school_id = $2,
        title = $3,
        description = $4,
        category = $5,
        priority = $6,
        status = $7,
        complainant_name = $8,
        complainant_role = $9,
        complainant_phone = $10,
        complainant_email = $11,
        complainant_student_id = $12,
        assigned_to_user_id = $13,
        resolution_notes = $14,
        resolved_by_user_id = $15,
        resolved_at = $16,
        created_by_user_id = $17,
        updated_at = $18
      WHERE id = $1
      RETURNING *;
    `;

    const values = [
      complaint.id,
      complaint.schoolId,
      complaint.title,
      complaint.description,
      complaint.category,
      complaint.priority,
      complaint.status,
      complaint.complainantName || null,
      complaint.complainantRole || null,
      complaint.complainantPhone || null,
      complaint.complainantEmail || null,
      complaint.complainantStudentId || null,
      complaint.assignedToUserId || null,
      complaint.resolutionNotes || null,
      complaint.resolvedByUserId || null,
      complaint.resolvedAt || null,
      complaint.createdByUserId || null,
      complaint.updatedAt
    ];

    const res = await this.pool.query(query, values);
    if (res.rows.length === 0) {
      throw new Error(`Complaint ${complaint.id} not found for update`);
    }
    return mapRowToComplaint(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM complaints WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async getStats(schoolId?: string): Promise<ComplaintStats> {
    let baseSql = 'SELECT status, priority, category FROM complaints';
    const values: any[] = [];
    if (schoolId) {
      baseSql += ' WHERE school_id = $1';
      values.push(schoolId);
    }

    const res = await this.pool.query(baseSql, values);

    const stats: ComplaintStats = {
      total: res.rows.length,
      open: 0,
      inReview: 0,
      investigating: 0,
      resolved: 0,
      dismissed: 0,
      byPriority: {},
      byCategory: {}
    };

    for (const row of res.rows) {
      const status = (row.status || '').toUpperCase();
      if (status === 'OPEN') stats.open++;
      else if (status === 'IN_REVIEW') stats.inReview++;
      else if (status === 'INVESTIGATING') stats.investigating++;
      else if (status === 'RESOLVED') stats.resolved++;
      else if (status === 'DISMISSED') stats.dismissed++;

      const priority = (row.priority || '').toUpperCase();
      if (priority) {
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
      }

      const category = (row.category || '').toUpperCase();
      if (category) {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      }
    }

    return stats;
  }
}
