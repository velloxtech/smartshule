import { Entity } from '../shared/Entity';

export type HelpRequestStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED';

export interface HelpRequestProps {
  schoolId: string;
  guardianId: string;
  studentId: string;
  teacherId?: string;
  subject: string;
  title: string;
  description: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  imageMetadata?: {
    format?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    processedAt?: string;
  };
  status: HelpRequestStatus;
  teacherResponse?: string;
  respondedAt?: Date;
}

export class ParentHelpRequest extends Entity<HelpRequestProps> {
  public static create(
    props: HelpRequestProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): ParentHelpRequest {
    return new ParentHelpRequest(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get guardianId(): string {
    return this._props.guardianId;
  }

  public get studentId(): string {
    return this._props.studentId;
  }

  public get teacherId(): string | undefined {
    return this._props.teacherId;
  }

  public get subject(): string {
    return this._props.subject;
  }

  public get title(): string {
    return this._props.title;
  }

  public get description(): string {
    return this._props.description;
  }

  public get imageUrl(): string | undefined {
    return this._props.imageUrl;
  }

  public get thumbnailUrl(): string | undefined {
    return this._props.thumbnailUrl;
  }

  public get imageMetadata(): HelpRequestProps['imageMetadata'] {
    return this._props.imageMetadata;
  }

  public get status(): HelpRequestStatus {
    return this._props.status;
  }

  public get teacherResponse(): string | undefined {
    return this._props.teacherResponse;
  }

  public get respondedAt(): Date | undefined {
    return this._props.respondedAt;
  }

  public respond(teacherResponse: string, teacherId?: string): void {
    this._props.teacherResponse = teacherResponse;
    if (teacherId) this._props.teacherId = teacherId;
    this._props.status = 'RESOLVED';
    this._props.respondedAt = new Date();
    this.touch();
  }

  public updateStatus(status: HelpRequestStatus): void {
    this._props.status = status;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      guardianId: this.guardianId,
      studentId: this.studentId,
      teacherId: this.teacherId,
      subject: this.subject,
      title: this.title,
      description: this.description,
      imageUrl: this.imageUrl,
      thumbnailUrl: this.thumbnailUrl,
      imageMetadata: this.imageMetadata,
      status: this.status,
      teacherResponse: this.teacherResponse,
      respondedAt: this.respondedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
