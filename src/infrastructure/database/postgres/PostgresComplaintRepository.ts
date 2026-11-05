import { Pool } from 'pg';
import { Complaint } from '../../../core/domain/complaint/Complaint';
import {
  IComplaintRepository,
  ComplaintFilterCriteria,
  ComplaintStats
} from '../../../core/ports/repositories/IComplaintRepository';

function parseJsonSafe(val: any, defaultVal: any = []) {
  if (!val) return defaultVal;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  }
  return val;
}

function mapRowToComplaint(row: any): Complaint {
  const messages = parseJsonSafe(row.messages, []).map((m: any) => ({
    ...m,
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date()
  }));

  const auditTrail = parseJsonSafe(row.audit_trail, []).map((a: any) => ({
    ...a,
    timestamp: a.timestamp ? new Date(a.timestamp) : new Date()
  }));

  const attachments = parseJsonSafe(row.attachments, []);

  return Complaint.create(
    {
      schoolId: row.school_id,
      referenceNumber: row.reference_number || undefined,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      complainantName: row.complainant_name || undefined,
      complainantRole: row.complainant_role || undefined,
      complainantPhone: row.complainant_phone || undefined,
      complainantEmail: row.complainant_email || undefined,
      parentUserId: row.parent_user_id || undefined,
      complainantStudentId: row.complainant_student_id || undefined,
      studentId: row.student_id || row.complainant_student_id || undefined,
      studentName: row.student_name || undefined,
      admissionNumber: row.admission_number || undefined,
      gradeLevel: row.grade_level || undefined,
      assignedToUserId: row.assigned_to_user_id || undefined,
      assignedToName: row.assigned_to_name || undefined,
      assignedToRole: row.assigned_to_role || undefined,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
      assignedByUserId: row.assigned_by_user_id || undefined,
      assignedByName: row.assigned_by_name || undefined,
      reassignmentReason: row.reassignment_reason || undefined,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      acknowledgedByUserId: row.acknowledged_by_user_id || undefined,
      acknowledgedByName: row.acknowledged_by_name || undefined,
      escalatedAt: row.escalated_at ? new Date(row.escalated_at) : undefined,
      escalatedToUserId: row.escalated_to_user_id || undefined,
      escalatedToName: row.escalated_to_name || undefined,
      escalatedToRole: row.escalated_to_role || undefined,
      escalatedByUserId: row.escalated_by_user_id || undefined,
      escalatedByName: row.escalated_by_name || undefined,
      escalationReason: row.escalation_reason || undefined,
      actionTaken: row.action_taken || undefined,
      resolutionDetails: row.resolution_details || undefined,
      resolutionNotes: row.resolution_notes || undefined,
      resolvedByUserId: row.resolved_by_user_id || undefined,
      resolvedByName: row.resolved_by_name || undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
      closedByUserId: row.closed_by_user_id || undefined,
      closedByName: row.closed_by_name || undefined,
      closureNotes: row.closure_notes || undefined,
      reopenedAt: row.reopened_at ? new Date(row.reopened_at) : undefined,
      reopenedByUserId: row.reopened_by_user_id || undefined,
      reopenedByName: row.reopened_by_name || undefined,
      reopeningReason: row.reopening_reason || undefined,
      acknowledgementDeadline: row.acknowledgement_deadline ? new Date(row.acknowledgement_deadline) : undefined,
      resolutionDeadline: row.resolution_deadline ? new Date(row.resolution_deadline) : undefined,
      messages,
      auditTrail,
      attachments,
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
        id, school_id, reference_number, title, description, category, priority, status,
        complainant_name, complainant_role, complainant_phone, complainant_email,
        parent_user_id, complainant_student_id, student_id, student_name, admission_number, grade_level,
        assigned_to_user_id, assigned_to_name, assigned_to_role, assigned_at, assigned_by_user_id, assigned_by_name,
        reassignment_reason, acknowledged_at, acknowledged_by_user_id, acknowledged_by_name,
        escalated_at, escalated_to_user_id, escalated_to_name, escalated_to_role, escalated_by_user_id, escalated_by_name, escalation_reason,
        action_taken, resolution_details, resolution_notes,
        resolved_by_user_id, resolved_by_name, resolved_at,
        closed_at, closed_by_user_id, closed_by_name, closure_notes,
        reopened_at, reopened_by_user_id, reopened_by_name, reopening_reason,
        acknowledgement_deadline, resolution_deadline,
        messages, audit_trail, attachments,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35,
        $36, $37, $38,
        $39, $40, $41,
        $42, $43, $44, $45,
        $46, $47, $48, $49,
        $50, $51,
        $52, $53, $54,
        $55, $56, $57
      ) RETURNING *;
    `;

    const values = [
      complaint.id,
      complaint.schoolId,
      complaint.referenceNumber,
      complaint.title,
      complaint.description,
      complaint.category,
      complaint.priority,
      complaint.status,
      complaint.complainantName || null,
      complaint.complainantRole || null,
      complaint.complainantPhone || null,
      complaint.complainantEmail || null,
      complaint.parentUserId || null,
      complaint.complainantStudentId || null,
      complaint.studentId || null,
      complaint.studentName || null,
      complaint.admissionNumber || null,
      complaint.gradeLevel || null,
      complaint.assignedToUserId || null,
      complaint.assignedToName || null,
      complaint.assignedToRole || null,
      complaint.assignedAt || null,
      complaint.assignedByUserId || null,
      complaint.assignedByName || null,
      complaint.reassignmentReason || null,
      complaint.acknowledgedAt || null,
      complaint.acknowledgedByUserId || null,
      complaint.acknowledgedByName || null,
      complaint.escalatedAt || null,
      complaint.escalatedToUserId || null,
      complaint.escalatedToName || null,
      complaint.escalatedToRole || null,
      complaint.escalatedByUserId || null,
      complaint.escalatedByName || null,
      complaint.escalationReason || null,
      complaint.actionTaken || null,
      complaint.resolutionDetails || null,
      complaint.resolutionNotes || null,
      complaint.resolvedByUserId || null,
      complaint.resolvedByName || null,
      complaint.resolvedAt || null,
      complaint.closedAt || null,
      complaint.closedByUserId || null,
      complaint.closedByName || null,
      complaint.closureNotes || null,
      complaint.reopenedAt || null,
      complaint.reopenedByUserId || null,
      complaint.reopenedByName || null,
      complaint.reopeningReason || null,
      complaint.acknowledgementDeadline || null,
      complaint.resolutionDeadline || null,
      JSON.stringify(complaint.messages || []),
      JSON.stringify(complaint.auditTrail || []),
      JSON.stringify(complaint.attachments || []),
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

  async findByReferenceNumber(referenceNumber: string): Promise<Complaint | null> {
    const res = await this.pool.query('SELECT * FROM complaints WHERE reference_number = $1', [referenceNumber]);
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
      conditions.push(`(complainant_student_id = $${idx} OR student_id = $${idx})`);
      values.push(criteria.complainantStudentId);
      idx++;
    }
    if (criteria?.studentId) {
      conditions.push(`(student_id = $${idx} OR complainant_student_id = $${idx})`);
      values.push(criteria.studentId);
      idx++;
    }
    if (criteria?.parentUserId) {
      conditions.push(`(parent_user_id = $${idx} OR created_by_user_id = $${idx})`);
      values.push(criteria.parentUserId);
      idx++;
    }
    if (criteria?.studentGrade) {
      conditions.push(`grade_level = $${idx++}`);
      values.push(criteria.studentGrade);
    }
    if (criteria?.search) {
      conditions.push(
        `(title ILIKE $${idx} OR description ILIKE $${idx} OR complainant_name ILIKE $${idx} OR reference_number ILIKE $${idx} OR student_name ILIKE $${idx} OR admission_number ILIKE $${idx})`
      );
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
    let complaints = res.rows.map(mapRowToComplaint);

    if (criteria?.isOverdue !== undefined) {
      complaints = complaints.filter((c) => c.isOverdue === criteria.isOverdue);
    }

    return complaints;
  }

  async update(complaint: Complaint): Promise<Complaint> {
    const query = `
      UPDATE complaints SET
        school_id = $2,
        reference_number = $3,
        title = $4,
        description = $5,
        category = $6,
        priority = $7,
        status = $8,
        complainant_name = $9,
        complainant_role = $10,
        complainant_phone = $11,
        complainant_email = $12,
        parent_user_id = $13,
        complainant_student_id = $14,
        student_id = $15,
        student_name = $16,
        admission_number = $17,
        grade_level = $18,
        assigned_to_user_id = $19,
        assigned_to_name = $20,
        assigned_to_role = $21,
        assigned_at = $22,
        assigned_by_user_id = $23,
        assigned_by_name = $24,
        reassignment_reason = $25,
        acknowledged_at = $26,
        acknowledged_by_user_id = $27,
        acknowledged_by_name = $28,
        escalated_at = $29,
        escalated_to_user_id = $30,
        escalated_to_name = $31,
        escalated_to_role = $32,
        escalated_by_user_id = $33,
        escalated_by_name = $34,
        escalation_reason = $35,
        action_taken = $36,
        resolution_details = $37,
        resolution_notes = $38,
        resolved_by_user_id = $39,
        resolved_by_name = $40,
        resolved_at = $41,
        closed_at = $42,
        closed_by_user_id = $43,
        closed_by_name = $44,
        closure_notes = $45,
        reopened_at = $46,
        reopened_by_user_id = $47,
        reopened_by_name = $48,
        reopening_reason = $49,
        acknowledgement_deadline = $50,
        resolution_deadline = $51,
        messages = $52,
        audit_trail = $53,
        attachments = $54,
        created_by_user_id = $55,
        updated_at = $56
      WHERE id = $1
      RETURNING *;
    `;

    const values = [
      complaint.id,
      complaint.schoolId,
      complaint.referenceNumber,
      complaint.title,
      complaint.description,
      complaint.category,
      complaint.priority,
      complaint.status,
      complaint.complainantName || null,
      complaint.complainantRole || null,
      complaint.complainantPhone || null,
      complaint.complainantEmail || null,
      complaint.parentUserId || null,
      complaint.complainantStudentId || null,
      complaint.studentId || null,
      complaint.studentName || null,
      complaint.admissionNumber || null,
      complaint.gradeLevel || null,
      complaint.assignedToUserId || null,
      complaint.assignedToName || null,
      complaint.assignedToRole || null,
      complaint.assignedAt || null,
      complaint.assignedByUserId || null,
      complaint.assignedByName || null,
      complaint.reassignmentReason || null,
      complaint.acknowledgedAt || null,
      complaint.acknowledgedByUserId || null,
      complaint.acknowledgedByName || null,
      complaint.escalatedAt || null,
      complaint.escalatedToUserId || null,
      complaint.escalatedToName || null,
      complaint.escalatedToRole || null,
      complaint.escalatedByUserId || null,
      complaint.escalatedByName || null,
      complaint.escalationReason || null,
      complaint.actionTaken || null,
      complaint.resolutionDetails || null,
      complaint.resolutionNotes || null,
      complaint.resolvedByUserId || null,
      complaint.resolvedByName || null,
      complaint.resolvedAt || null,
      complaint.closedAt || null,
      complaint.closedByUserId || null,
      complaint.closedByName || null,
      complaint.closureNotes || null,
      complaint.reopenedAt || null,
      complaint.reopenedByUserId || null,
      complaint.reopenedByName || null,
      complaint.reopeningReason || null,
      complaint.acknowledgementDeadline || null,
      complaint.resolutionDeadline || null,
      JSON.stringify(complaint.messages || []),
      JSON.stringify(complaint.auditTrail || []),
      JSON.stringify(complaint.attachments || []),
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
    const all = await this.find(schoolId ? { schoolId } : undefined);

    const stats: ComplaintStats = {
      total: all.length,
      open: 0,
      inReview: 0,
      investigating: 0,
      resolved: 0,
      dismissed: 0,
      active: 0,
      acknowledged: 0,
      underReview: 0,
      awaitingParent: 0,
      escalated: 0,
      closed: 0,
      reopened: 0,
      overdueCount: 0,
      avgResponseTimeHours: 0,
      avgResolutionTimeHours: 0,
      resolutionRate: 0,
      byPriority: {},
      byCategory: {},
      byStatus: {},
      byGrade: {},
      byAssignee: {}
    };

    let totalResponseTimeMs = 0;
    let responseTimeCount = 0;
    let totalResolutionTimeMs = 0;
    let resolutionTimeCount = 0;
    let resolvedCount = 0;

    for (const item of all) {
      const status = item.status.toUpperCase();
      stats.byStatus![status] = (stats.byStatus![status] || 0) + 1;

      if (status === 'OPEN' || status === 'SUBMITTED') {
        stats.open++;
        stats.active!++;
      } else if (status === 'ACKNOWLEDGED') {
        stats.acknowledged!++;
        stats.active!++;
      } else if (status === 'IN_REVIEW' || status === 'UNDER_REVIEW' || status === 'INVESTIGATING') {
        stats.inReview++;
        stats.underReview!++;
        stats.active!++;
      } else if (status === 'AWAITING_PARENT_RESPONSE') {
        stats.awaitingParent!++;
        stats.active!++;
      } else if (status === 'ESCALATED') {
        stats.escalated!++;
        stats.active!++;
      } else if (status === 'RESOLVED') {
        stats.resolved++;
        resolvedCount++;
      } else if (status === 'CLOSED' || status === 'DISMISSED') {
        stats.dismissed++;
        stats.closed!++;
      } else if (status === 'REOPENED') {
        stats.reopened!++;
        stats.active!++;
      }

      if (item.isOverdue) {
        stats.overdueCount!++;
      }

      if (item.acknowledgedAt) {
        const diffMs = item.acknowledgedAt.getTime() - item.createdAt.getTime();
        if (diffMs >= 0) {
          totalResponseTimeMs += diffMs;
          responseTimeCount++;
        }
      }

      if (item.resolvedAt) {
        const diffMs = item.resolvedAt.getTime() - item.createdAt.getTime();
        if (diffMs >= 0) {
          totalResolutionTimeMs += diffMs;
          resolutionTimeCount++;
        }
      }

      const priority = item.priority.toUpperCase();
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      const category = item.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      if (item.gradeLevel) {
        stats.byGrade![item.gradeLevel] = (stats.byGrade![item.gradeLevel] || 0) + 1;
      }

      const assignee = item.assignedToName || 'Unassigned';
      stats.byAssignee![assignee] = (stats.byAssignee![assignee] || 0) + 1;
    }

    if (responseTimeCount > 0) {
      stats.avgResponseTimeHours = Number(
        (totalResponseTimeMs / (responseTimeCount * 3600000)).toFixed(1)
      );
    }
    if (resolutionTimeCount > 0) {
      stats.avgResolutionTimeHours = Number(
        (totalResolutionTimeMs / (resolutionTimeCount * 3600000)).toFixed(1)
      );
    }
    if (all.length > 0) {
      stats.resolutionRate = Number(
        ((resolvedCount / all.length) * 100).toFixed(1)
      );
    }

    return stats;
  }
}
