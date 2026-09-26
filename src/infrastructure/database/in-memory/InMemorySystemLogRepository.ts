import { SystemLog } from '../../../core/domain/system-log/SystemLog';
import {
  ISystemLogRepository,
  SystemLogFilterCriteria,
  SystemLogStats
} from '../../../core/ports/repositories/ISystemLogRepository';

export class InMemorySystemLogRepository implements ISystemLogRepository {
  private logs: Map<string, SystemLog> = new Map();

  async create(log: SystemLog): Promise<SystemLog> {
    this.logs.set(log.id, log);
    return log;
  }

  async findById(id: string): Promise<SystemLog | null> {
    return this.logs.get(id) || null;
  }

  private filterList(criteria?: SystemLogFilterCriteria): SystemLog[] {
    let result = Array.from(this.logs.values());

    if (criteria) {
      if (criteria.schoolId) {
        result = result.filter((l) => l.schoolId === criteria.schoolId);
      }
      if (criteria.level) {
        const lvl = criteria.level.toUpperCase();
        result = result.filter((l) => l.level.toUpperCase() === lvl);
      }
      if (criteria.category) {
        const cat = criteria.category.toUpperCase();
        result = result.filter((l) => l.category.toUpperCase() === cat);
      }
      if (criteria.action) {
        const act = criteria.action.toLowerCase();
        result = result.filter((l) => l.action.toLowerCase().includes(act));
      }
      if (criteria.actorUserId) {
        result = result.filter((l) => l.actorUserId === criteria.actorUserId);
      }
      if (criteria.actorEmail) {
        const email = criteria.actorEmail.toLowerCase();
        result = result.filter((l) => l.actorEmail?.toLowerCase().includes(email));
      }
      if (criteria.status) {
        const st = criteria.status.toUpperCase();
        result = result.filter((l) => l.status.toUpperCase() === st);
      }
      if (criteria.search) {
        const q = criteria.search.toLowerCase().trim();
        result = result.filter(
          (l) =>
            l.action.toLowerCase().includes(q) ||
            l.details.toLowerCase().includes(q) ||
            (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
            (l.actorRole && l.actorRole.toLowerCase().includes(q)) ||
            (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
            (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(q))
        );
      }
      if (criteria.startDate) {
        const start = new Date(criteria.startDate).getTime();
        result = result.filter((l) => l.timestamp.getTime() >= start);
      }
      if (criteria.endDate) {
        const end = new Date(criteria.endDate).getTime();
        result = result.filter((l) => l.timestamp.getTime() <= end);
      }
    }

    // Sort newest first by timestamp
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return result;
  }

  async find(criteria?: SystemLogFilterCriteria): Promise<SystemLog[]> {
    let result = this.filterList(criteria);

    if (criteria?.offset !== undefined && criteria.offset > 0) {
      result = result.slice(criteria.offset);
    }
    if (criteria?.limit !== undefined && criteria.limit > 0) {
      result = result.slice(0, criteria.limit);
    }

    return result;
  }

  async count(criteria?: SystemLogFilterCriteria): Promise<number> {
    return this.filterList(criteria).length;
  }

  async getStats(schoolId?: string): Promise<SystemLogStats> {
    let list = Array.from(this.logs.values());
    if (schoolId) {
      list = list.filter((l) => l.schoolId === schoolId);
    }

    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let recentFailures = 0;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const log of list) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;

      if (log.status === 'FAILED' && log.timestamp.getTime() >= sevenDaysAgo) {
        recentFailures++;
      }
    }

    return {
      total: list.length,
      byLevel,
      byCategory,
      byStatus,
      recentFailures
    };
  }

  async deleteOldLogs(olderThan: Date): Promise<number> {
    const threshold = olderThan.getTime();
    let count = 0;
    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp.getTime() < threshold) {
        this.logs.delete(id);
        count++;
      }
    }
    return count;
  }
}
