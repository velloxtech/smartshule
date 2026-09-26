import { SystemLog, SystemLogLevel, SystemLogCategory, SystemLogStatus } from '../../domain/system-log/SystemLog';

export interface SystemLogFilterCriteria {
  schoolId?: string;
  level?: SystemLogLevel | string;
  category?: SystemLogCategory | string;
  action?: string;
  actorUserId?: string;
  actorEmail?: string;
  status?: SystemLogStatus | string;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number;
  offset?: number;
}

export interface SystemLogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  recentFailures: number;
}

export interface ISystemLogRepository {
  create(log: SystemLog): Promise<SystemLog>;
  findById(id: string): Promise<SystemLog | null>;
  find(criteria?: SystemLogFilterCriteria): Promise<SystemLog[]>;
  count(criteria?: SystemLogFilterCriteria): Promise<number>;
  getStats(schoolId?: string): Promise<SystemLogStats>;
  deleteOldLogs?(olderThan: Date): Promise<number>;
}
