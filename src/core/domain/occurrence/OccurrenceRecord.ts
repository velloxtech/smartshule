import { Entity } from '../shared/Entity';

export type OccurrenceCategory =
  | 'DISCIPLINARY'
  | 'ACCIDENT_INJURY'
  | 'MEDICAL_ILLNESS'
  | 'PROPERTY_DAMAGE_LOSS'
  | 'SECURITY_SAFETY'
  | 'ACADEMIC_CLASSROOM'
  | 'COMMENDATION_GOOD_DEED'
  | 'GENERAL';

export type OccurrenceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OccurrenceStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';

export interface OccurrenceRecordProps {
  schoolId: string;
  occurrenceNumber: string; // e.g. "OB-20261013-001"
  title: string;
  description: string;
  category: OccurrenceCategory;
  severity: OccurrenceSeverity;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:30 AM" or "14:15"
  location: string;
  reportedByTeacherId: string;
  reportedByTeacherName: string;
  reportedByRole?: string;
  studentIds?: string[];
  studentNames?: string[];
  witnesses?: string;
  immediateActionTaken?: string;
  status: OccurrenceStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  parentNotified: boolean;
  parentNotificationMethod?: 'SMS' | 'PHONE_CALL' | 'IN_PERSON' | 'NONE';
}

export class OccurrenceRecord extends Entity<OccurrenceRecordProps> {
  public static create(
    props: OccurrenceRecordProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): OccurrenceRecord {
    return new OccurrenceRecord(
      {
        ...props,
        studentIds: props.studentIds || [],
        studentNames: props.studentNames || [],
        status: props.status || 'OPEN',
        parentNotified: props.parentNotified ?? false,
        parentNotificationMethod: props.parentNotificationMethod || 'NONE'
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get occurrenceNumber(): string {
    return this._props.occurrenceNumber;
  }

  public get title(): string {
    return this._props.title;
  }

  public get description(): string {
    return this._props.description;
  }

  public get category(): OccurrenceCategory {
    return this._props.category;
  }

  public get severity(): OccurrenceSeverity {
    return this._props.severity;
  }

  public get date(): string {
    return this._props.date;
  }

  public get time(): string {
    return this._props.time;
  }

  public get location(): string {
    return this._props.location;
  }

  public get reportedByTeacherId(): string {
    return this._props.reportedByTeacherId;
  }

  public get reportedByTeacherName(): string {
    return this._props.reportedByTeacherName;
  }

  public get reportedByRole(): string | undefined {
    return this._props.reportedByRole;
  }

  public get studentIds(): string[] {
    return this._props.studentIds || [];
  }

  public get studentNames(): string[] {
    return this._props.studentNames || [];
  }

  public get witnesses(): string | undefined {
    return this._props.witnesses;
  }

  public get immediateActionTaken(): string | undefined {
    return this._props.immediateActionTaken;
  }

  public get status(): OccurrenceStatus {
    return this._props.status;
  }

  public get resolutionNotes(): string | undefined {
    return this._props.resolutionNotes;
  }

  public get resolvedBy(): string | undefined {
    return this._props.resolvedBy;
  }

  public get resolvedAt(): Date | undefined {
    return this._props.resolvedAt;
  }

  public get parentNotified(): boolean {
    return this._props.parentNotified;
  }

  public get parentNotificationMethod(): string | undefined {
    return this._props.parentNotificationMethod;
  }

  public updateStatus(
    status: OccurrenceStatus,
    resolutionNotes?: string,
    resolvedBy?: string
  ): void {
    this._props.status = status;
    if (resolutionNotes) {
      this._props.resolutionNotes = this._props.resolutionNotes
        ? `${this._props.resolutionNotes}\n${resolutionNotes}`
        : resolutionNotes;
    }
    if (resolvedBy) {
      this._props.resolvedBy = resolvedBy;
    }
    if (status === 'RESOLVED' || status === 'ESCALATED') {
      this._props.resolvedAt = new Date();
    }
    this.touch();
  }

  public markParentNotified(method: 'SMS' | 'PHONE_CALL' | 'IN_PERSON' = 'SMS'): void {
    this._props.parentNotified = true;
    this._props.parentNotificationMethod = method;
    this.touch();
  }

  public updateDetails(updates: Partial<OccurrenceRecordProps>): void {
    Object.assign(this._props, updates);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      occurrenceNumber: this.occurrenceNumber,
      title: this.title,
      description: this.description,
      category: this.category,
      severity: this.severity,
      date: this.date,
      time: this.time,
      location: this.location,
      reportedByTeacherId: this.reportedByTeacherId,
      reportedByTeacherName: this.reportedByTeacherName,
      reportedByRole: this.reportedByRole,
      studentIds: this.studentIds,
      studentNames: this.studentNames,
      witnesses: this.witnesses,
      immediateActionTaken: this.immediateActionTaken,
      status: this.status,
      resolutionNotes: this.resolutionNotes,
      resolvedBy: this.resolvedBy,
      resolvedAt: this.resolvedAt ? this.resolvedAt.toISOString() : undefined,
      parentNotified: this.parentNotified,
      parentNotificationMethod: this.parentNotificationMethod,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
