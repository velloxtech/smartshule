import { Pool } from 'pg';
import {
  SystemLog,
  SystemLogLevel,
  SystemLogCategory,
  SystemLogStatus
} from '../../../core/domain/system-log/SystemLog';
import {
  ISystemLogRepository,
  SystemLogFilterCriteria,
  SystemLogStats
} from '../../../core/ports/repositories/ISystemLogRepository';

function mapRowToSystemLog(row: any): SystemLog {
  let metadata = row.metadata;
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = {};
    }
  }

  return SystemLog.create(
    {
      schoolId: row.school_id,
      timestamp: new Date(row.timestamp),
      level: row.level as SystemLogLevel,
      category: row.category as SystemLogCategory,
      action: row.action,
      actorUserId: row.actor_user_id || undefined,
      actorEmail: row.actor_email || undefined,
      actorRole: row.actor_role || undefined,
      ipAddress: row.ip_address || undefined,
      status: row.status as SystemLogStatus,
      details: row.details,
      metadata: metadata || {}
    },
    row.id,
    new Date(row.created_at),
    new Date(row.updated_at)
  );
}

export class PostgresSystemLogRepository implements ISystemLogRepository {
  constructor(private readonly pool: Pool) {}

  async create(log: SystemLog): Promise<SystemLog> {
    const query = `
      INSERT INTO system_logs (
        id, school_id, timestamp, level, category, action,
        actor_user_id, actor_email, actor_role, ip_address,
        status, details, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      ) RETURNING *;
    `;

    const values = [
      log.id,
      log.schoolId,
      log.timestamp,
      log.level,
      log.category,
      log.action,
      log.actorUserId || null,
      log.actorEmail || null,
      log.actorRole || null,
      log.ipAddress || null,
      log.status,
      log.details,
      JSON.stringify(log.metadata || {}),
      log.createdAt,
      log.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return mapRowToSystemLog(res.rows[0]);
  }

  async findById(id: string): Promise<SystemLog | null> {
    const res = await this.pool.query('SELECT * FROM system_logs WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRowToSystemLog(res.rows[0]);
  }

  private buildWhereClause(criteria?: SystemLogFilterCriteria): { clause: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (criteria?.schoolId) {
      conditions.push(`school_id = $${idx++}`);
      values.push(criteria.schoolId);
    }
    if (criteria?.level) {
      conditions.push(`UPPER(level) = UPPER($${idx++})`);
      values.push(criteria.level);
    }
    if (criteria?.category) {
      conditions.push(`UPPER(category) = UPPER($${idx++})`);
      values.push(criteria.category);
    }
    if (criteria?.action) {
      conditions.push(`action ILIKE $${idx++}`);
      values.push(`%${criteria.action}%`);
    }
    if (criteria?.actorUserId) {
      conditions.push(`actor_user_id = $${idx++}`);
      values.push(criteria.actorUserId);
    }
    if (criteria?.actorEmail) {
      conditions.push(`actor_email ILIKE $${idx++}`);
      values.push(`%${criteria.actorEmail}%`);
    }
    if (criteria?.status) {
      conditions.push(`UPPER(status) = UPPER($${idx++})`);
      values.push(criteria.status);
    }
    if (criteria?.search) {
      conditions.push(`(
        action ILIKE $${idx} OR
        details ILIKE $${idx} OR
        actor_email ILIKE $${idx} OR
        actor_role ILIKE $${idx} OR
        ip_address ILIKE $${idx}
      )`);
      values.push(`%${criteria.search}%`);
      idx++;
    }
    if (criteria?.startDate) {
      conditions.push(`timestamp >= $${idx++}`);
      values.push(new Date(criteria.startDate));
    }
    if (criteria?.endDate) {
      conditions.push(`timestamp <= $${idx++}`);
      values.push(new Date(criteria.endDate));
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, values };
  }

  async find(criteria?: SystemLogFilterCriteria): Promise<SystemLog[]> {
    const { clause, values } = this.buildWhereClause(criteria);
    let query = `SELECT * FROM system_logs ${clause} ORDER BY timestamp DESC`;

    const limit = criteria?.limit;
    const offset = criteria?.offset;

    if (limit !== undefined && limit > 0) {
      query += ` LIMIT ${parseInt(limit as any, 10)}`;
    }
    if (offset !== undefined && offset > 0) {
      query += ` OFFSET ${parseInt(offset as any, 10)}`;
    }

    const res = await this.pool.query(query, values);
    return res.rows.map(mapRowToSystemLog);
  }

  async count(criteria?: SystemLogFilterCriteria): Promise<number> {
    const { clause, values } = this.buildWhereClause(criteria);
    const query = `SELECT COUNT(*) as total FROM system_logs ${clause}`;
    const res = await this.pool.query(query, values);
    return parseInt(res.rows[0].total, 10) || 0;
  }

  async getStats(schoolId?: string): Promise<SystemLogStats> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (schoolId) {
      conditions.push(`school_id = $${idx++}`);
      values.push(schoolId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRes = await this.pool.query(
      `SELECT COUNT(*) as total FROM system_logs ${where}`,
      values
    );
    const total = parseInt(totalRes.rows[0]?.total || '0', 10);

    const levelRes = await this.pool.query(
      `SELECT level, COUNT(*) as count FROM system_logs ${where} GROUP BY level`,
      values
    );
    const byLevel: Record<string, number> = {};
    levelRes.rows.forEach((r: any) => {
      byLevel[r.level] = parseInt(r.count, 10);
    });

    const catRes = await this.pool.query(
      `SELECT category, COUNT(*) as count FROM system_logs ${where} GROUP BY category`,
      values
    );
    const byCategory: Record<string, number> = {};
    catRes.rows.forEach((r: any) => {
      byCategory[r.category] = parseInt(r.count, 10);
    });

    const statusRes = await this.pool.query(
      `SELECT status, COUNT(*) as count FROM system_logs ${where} GROUP BY status`,
      values
    );
    const byStatus: Record<string, number> = {};
    statusRes.rows.forEach((r: any) => {
      byStatus[r.status] = parseInt(r.count, 10);
    });

    // Recent failures within the last 7 days
    const recentFailuresRes = await this.pool.query(
      `SELECT COUNT(*) as failures FROM system_logs 
       ${where ? `${where} AND` : 'WHERE'} status = 'FAILED' 
       AND timestamp >= NOW() - INTERVAL '7 days'`,
      values
    );
    const recentFailures = parseInt(recentFailuresRes.rows[0]?.failures || '0', 10);

    return {
      total,
      byLevel,
      byCategory,
      byStatus,
      recentFailures
    };
  }

  async deleteOldLogs(olderThan: Date): Promise<number> {
    const res = await this.pool.query('DELETE FROM system_logs WHERE timestamp < $1', [olderThan]);
    return res.rowCount || 0;
  }
}
