import { Entity } from '../shared/Entity';

export enum SchemeStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface SchemeOfWorkEntry {
  id: string;
  weekNumber: number;
  lessonNumber: number;
  strandId?: string;
  strandTitle: string;
  subStrandId?: string;
  subStrandTitle: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  learningExperiences: string[];
  learningResources: string[];
  assessmentMethods: string[];
  reflection?: string;
}

export interface SchemeOfWorkProps {
  teacherId: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  academicYearId: string;
  termId: string;
  title: string;
  entries: SchemeOfWorkEntry[];
  status: SchemeStatus;
  submittedAt?: Date;
  reviewedByUserId?: string;
  reviewedAt?: Date;
  reviewRemarks?: string;
}

export class SchemeOfWork extends Entity<SchemeOfWorkProps> {
  public static create(props: SchemeOfWorkProps, id: string, createdAt?: Date, updatedAt?: Date): SchemeOfWork {
    return new SchemeOfWork(props, id, createdAt, updatedAt);
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get learningAreaId(): string {
    return this._props.learningAreaId;
  }

  public get classRoomId(): string {
    return this._props.classRoomId;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get title(): string {
    return this._props.title;
  }

  public get entries(): SchemeOfWorkEntry[] {
    return this._props.entries;
  }

  public get status(): SchemeStatus {
    return this._props.status;
  }

  public get reviewRemarks(): string | undefined {
    return this._props.reviewRemarks;
  }

  public addEntry(entry: SchemeOfWorkEntry): void {
    this._props.entries.push(entry);
    this.touch();
  }

  public updateEntry(entryId: string, updated: Partial<SchemeOfWorkEntry>): void {
    const idx = this._props.entries.findIndex(e => e.id === entryId);
    if (idx !== -1) {
      this._props.entries[idx] = { ...this._props.entries[idx], ...updated };
      this.touch();
    }
  }

  public submit(): void {
    this._props.status = SchemeStatus.SUBMITTED;
    this._props.submittedAt = new Date();
    this.touch();
  }

  public approve(reviewerUserId: string, remarks?: string): void {
    this._props.status = SchemeStatus.APPROVED;
    this._props.reviewedByUserId = reviewerUserId;
    this._props.reviewedAt = new Date();
    this._props.reviewRemarks = remarks;
    this.touch();
  }

  public reject(reviewerUserId: string, remarks: string): void {
    this._props.status = SchemeStatus.REJECTED;
    this._props.reviewedByUserId = reviewerUserId;
    this._props.reviewedAt = new Date();
    this._props.reviewRemarks = remarks;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      teacherId: this.teacherId,
      learningAreaId: this.learningAreaId,
      classRoomId: this.classRoomId,
      streamId: this.streamId,
      academicYearId: this.academicYearId,
      termId: this.termId,
      title: this.title,
      entries: this.entries,
      totalLessons: this.entries.length,
      status: this.status,
      submittedAt: this._props.submittedAt,
      reviewedByUserId: this._props.reviewedByUserId,
      reviewedAt: this._props.reviewedAt,
      reviewRemarks: this._props.reviewRemarks,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
