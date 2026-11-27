import { Entity } from '../shared/Entity';

export enum SchemeStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface SchemeOfWorkEntry {
  slotId?: string;
  archivedAt?: string;
  archivedReason?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  id: string;
  weekNumber: number;
  lessonNumber: number;
  strandId?: string;
  strandTitle: string;
  subStrandId?: string;
  combinedSubStrandIds?: string[];
  subStrandTitle: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  learningExperiences: string[];
  learningResources: string[];
  assessmentMethods: string[];
  reflection?: string;
}

export interface TermAllocation {
  carriedFrom?: {schemeId:string;entryId:string}[];
  subStrandId: string;
  combinedSubStrandIds?: string[];
  lessons: number;
  slotIds?: string[];
  specificLearningOutcomes?: string[]; keyInquiryQuestions?: string[]; learningExperiences?: string[]; learningResources?: string[]; assessmentMethods?: string[];
}
export interface PlanningChange {
  at: string; actorId: string; action: 'DRAFT_SAVED'|'FINALIZED'|'REOPENED'|'WEEKLY_DRAFT_CREATED'|'WEEKLY_LESSON_SAVED'|'PACING_ADJUSTED'; reason?: string;
  allocations: TermAllocation[]; scheduleFingerprint: string;
}
export interface SchemePlanningState {
  pacing?: {weeks:number;lessonsPerWeek:number};
  revision: number; locked: boolean; allocations: TermAllocation[];
  scheduleFingerprint: string; history: PlanningChange[];
  weeklyPlanningStarted?: boolean;
  submittedEntryIds?: string[];
  approvedEntryIds?: string[];
  coverageReviewStatus?: 'SAVED' | 'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED';
  coverageReviewRemarks?: string;
  coverageReviewedByUserId?: string;
  coverageReviewedAt?: string;
}
export interface SchemeOfWorkProps {
  planningState?: SchemePlanningState;
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

  public get planningState(): SchemePlanningState | undefined { return this._props.planningState; }
  public setPlanningState(state: SchemePlanningState, entries?: SchemeOfWorkEntry[]): void {
    this._props.planningState=state; if(entries)this._props.entries=entries; this.touch();
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

  public draft(): void { this._props.status=SchemeStatus.DRAFT; this._props.submittedAt=undefined; this.touch(); }
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
      totalLessons: this.entries.filter(e=>!e.archivedAt).length,
      planningState: this.planningState,
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
