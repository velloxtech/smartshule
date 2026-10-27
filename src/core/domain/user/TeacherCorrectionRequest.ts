import { Entity } from '../shared/Entity';

export type CorrectionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TeacherCorrectionRequestProps {
  teacherId: string;
  userId: string;
  schoolId: string;
  fieldName: string; // e.g. 'firstName', 'lastName', 'tscNumber', 'nationalId', 'dateOfBirth', 'qualification', 'employeeNumber', 'department', 'employmentDate', 'employmentType', 'email'
  fieldLabel: string; // User-facing label e.g. 'First Name', 'TSC Registration Number'
  currentValue?: string;
  proposedValue: string;
  reason: string;
  evidenceUrl?: string;
  status: CorrectionRequestStatus;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewRemarks?: string;
  reviewedAt?: Date;
}

export class TeacherCorrectionRequest extends Entity<TeacherCorrectionRequestProps> {
  public static create(
    props: {
      teacherId: string;
      userId: string;
      schoolId: string;
      fieldName: string;
      fieldLabel?: string;
      currentValue?: string;
      proposedValue: string;
      reason: string;
      evidenceUrl?: string;
      status?: CorrectionRequestStatus;
      reviewedByUserId?: string;
      reviewedByName?: string;
      reviewRemarks?: string;
      reviewedAt?: Date;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): TeacherCorrectionRequest {
    return new TeacherCorrectionRequest(
      {
        teacherId: props.teacherId,
        userId: props.userId,
        schoolId: props.schoolId || 'school-001',
        fieldName: props.fieldName,
        fieldLabel: props.fieldLabel || props.fieldName,
        currentValue: props.currentValue,
        proposedValue: props.proposedValue,
        reason: props.reason,
        evidenceUrl: props.evidenceUrl,
        status: props.status || 'PENDING',
        reviewedByUserId: props.reviewedByUserId,
        reviewedByName: props.reviewedByName,
        reviewRemarks: props.reviewRemarks,
        reviewedAt: props.reviewedAt
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get userId(): string {
    return this._props.userId;
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get fieldName(): string {
    return this._props.fieldName;
  }

  public get fieldLabel(): string {
    return this._props.fieldLabel;
  }

  public get currentValue(): string | undefined {
    return this._props.currentValue;
  }

  public get proposedValue(): string {
    return this._props.proposedValue;
  }

  public get reason(): string {
    return this._props.reason;
  }

  public get evidenceUrl(): string | undefined {
    return this._props.evidenceUrl;
  }

  public get status(): CorrectionRequestStatus {
    return this._props.status;
  }

  public get reviewedByUserId(): string | undefined {
    return this._props.reviewedByUserId;
  }

  public get reviewedByName(): string | undefined {
    return this._props.reviewedByName;
  }

  public get reviewRemarks(): string | undefined {
    return this._props.reviewRemarks;
  }

  public get reviewedAt(): Date | undefined {
    return this._props.reviewedAt;
  }

  public approve(reviewerUserId: string, reviewerName: string, remarks?: string): void {
    this._props.status = 'APPROVED';
    this._props.reviewedByUserId = reviewerUserId;
    this._props.reviewedByName = reviewerName;
    this._props.reviewRemarks = remarks || 'Approved by administrator';
    this._props.reviewedAt = new Date();
    this.touch();
  }

  public reject(reviewerUserId: string, reviewerName: string, remarks: string): void {
    this._props.status = 'REJECTED';
    this._props.reviewedByUserId = reviewerUserId;
    this._props.reviewedByName = reviewerName;
    this._props.reviewRemarks = remarks;
    this._props.reviewedAt = new Date();
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      teacherId: this.teacherId,
      userId: this.userId,
      schoolId: this.schoolId,
      fieldName: this.fieldName,
      fieldLabel: this.fieldLabel,
      currentValue: this.currentValue,
      proposedValue: this.proposedValue,
      reason: this.reason,
      evidenceUrl: this.evidenceUrl,
      status: this.status,
      reviewedByUserId: this.reviewedByUserId,
      reviewedByName: this.reviewedByName,
      reviewRemarks: this.reviewRemarks,
      reviewedAt: this.reviewedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
