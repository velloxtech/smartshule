import { Entity } from '../shared/Entity';

export type SystemLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export type SystemLogCategory =
  | 'AUTH'
  | 'FINANCE'
  | 'STUDENTS'
  | 'ACADEMICS'
  | 'SYSTEM'
  | 'COMPLAINTS'
  | 'COMMUNICATION';

export type SystemLogStatus = 'SUCCESS' | 'FAILED';

export interface SystemLogProps {
  schoolId: string;
  timestamp: Date;
  level: SystemLogLevel;
  category: SystemLogCategory;
  action: string;
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;
  status: SystemLogStatus;
  details: string;
  metadata?: Record<string, any>;
}

export class SystemLog extends Entity<SystemLogProps> {
  public static create(
    props: {
      schoolId?: string;
      timestamp?: Date;
      level?: SystemLogLevel;
      category?: SystemLogCategory;
      action: string;
      actorUserId?: string;
      actorEmail?: string;
      actorRole?: string;
      ipAddress?: string;
      status?: SystemLogStatus;
      details: string;
      metadata?: Record<string, any>;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): SystemLog {
    return new SystemLog(
      {
        schoolId: props.schoolId || 'school-001',
        timestamp: props.timestamp || new Date(),
        level: props.level || 'INFO',
        category: props.category || 'SYSTEM',
        action: props.action,
        actorUserId: props.actorUserId,
        actorEmail: props.actorEmail,
        actorRole: props.actorRole,
        ipAddress: props.ipAddress,
        status: props.status || 'SUCCESS',
        details: props.details,
        metadata: props.metadata || {}
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get timestamp(): Date {
    return this._props.timestamp;
  }

  public get level(): SystemLogLevel {
    return this._props.level;
  }

  public get category(): SystemLogCategory {
    return this._props.category;
  }

  public get action(): string {
    return this._props.action;
  }

  public get actorUserId(): string | undefined {
    return this._props.actorUserId;
  }

  public get actorEmail(): string | undefined {
    return this._props.actorEmail;
  }

  public get actorRole(): string | undefined {
    return this._props.actorRole;
  }

  public get ipAddress(): string | undefined {
    return this._props.ipAddress;
  }

  public get status(): SystemLogStatus {
    return this._props.status;
  }

  public get details(): string {
    return this._props.details;
  }

  public get metadata(): Record<string, any> | undefined {
    return this._props.metadata;
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      timestamp: this.timestamp.toISOString(),
      level: this.level,
      category: this.category,
      action: this.action,
      actorUserId: this.actorUserId,
      actorEmail: this.actorEmail,
      actorRole: this.actorRole,
      ipAddress: this.ipAddress,
      status: this.status,
      details: this.details,
      metadata: this.metadata || {},
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
