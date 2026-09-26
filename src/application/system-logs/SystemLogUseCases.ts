import {
  SystemLog,
  SystemLogLevel,
  SystemLogCategory,
  SystemLogStatus
} from '../../core/domain/system-log/SystemLog';
import {
  ISystemLogRepository,
  SystemLogFilterCriteria,
  SystemLogStats
} from '../../core/ports/repositories/ISystemLogRepository';
import { randomUUID } from 'crypto';

export interface CreateSystemLogInput {
  schoolId?: string;
  timestamp?: Date;
  level?: SystemLogLevel;
  category: SystemLogCategory;
  action: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;
  status?: SystemLogStatus;
  details: string;
  metadata?: Record<string, any>;
}

export interface ListLogsResult {
  logs: SystemLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SystemLogUseCases {
  constructor(private readonly repository: ISystemLogRepository) {}

  public async log(input: CreateSystemLogInput): Promise<SystemLog> {
    const id = `log-${Date.now()}-${randomUUID().substring(0, 8)}`;
    const log = SystemLog.create(
      {
        schoolId: input.schoolId || 'school-001',
        timestamp: input.timestamp || new Date(),
        level: input.level || 'INFO',
        category: input.category,
        action: input.action,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail,
        actorRole: input.actorRole,
        ipAddress: input.ipAddress,
        status: input.status || 'SUCCESS',
        details: input.details,
        metadata: input.metadata || {}
      },
      id
    );

    return this.repository.create(log);
  }

  public async listLogs(
    criteria: SystemLogFilterCriteria,
    page: number = 1,
    limit: number = 25
  ): Promise<ListLogsResult> {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const [logs, total] = await Promise.all([
      this.repository.find({
        ...criteria,
        limit: safeLimit,
        offset
      }),
      this.repository.count(criteria)
    ]);

    return {
      logs,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1
    };
  }

  public async getLogById(id: string): Promise<SystemLog | null> {
    return this.repository.findById(id);
  }

  public async getStats(schoolId?: string): Promise<SystemLogStats> {
    return this.repository.getStats(schoolId);
  }

  public async exportLogsCsv(criteria?: SystemLogFilterCriteria): Promise<string> {
    // Fetch logs up to 10,000 for export
    const logs = await this.repository.find({
      ...criteria,
      limit: 10000,
      offset: 0
    });

    const headers = [
      'Log ID',
      'Timestamp (UTC)',
      'Level',
      'Category',
      'Action',
      'Actor Email',
      'Actor Role',
      'IP Address',
      'Status',
      'Details',
      'Metadata'
    ];

    const escapeCsvField = (value: any): string => {
      if (value === null || value === undefined) return '""';
      let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Double up any quotes inside the field
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map((log) => [
      escapeCsvField(log.id),
      escapeCsvField(log.timestamp.toISOString()),
      escapeCsvField(log.level),
      escapeCsvField(log.category),
      escapeCsvField(log.action),
      escapeCsvField(log.actorEmail || 'System'),
      escapeCsvField(log.actorRole || '--'),
      escapeCsvField(log.ipAddress || '--'),
      escapeCsvField(log.status),
      escapeCsvField(log.details),
      escapeCsvField(log.metadata || {})
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}
