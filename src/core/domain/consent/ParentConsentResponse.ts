import { Entity } from '../shared/Entity';

export type ConsentDecision = 'CONSENTED' | 'DECLINED';
export type ConsentSignatureType = 'DRAWN' | 'TYPED' | 'UPLOADED' | 'SAVED_PROFILE';

export interface ParentConsentResponseProps {
  schoolId: string;
  consentRequestId: string;
  consentVersion: number;
  studentId: string;
  parentUserId: string;
  parentGuardianId?: string;
  parentName: string;
  parentRelationship?: string;
  parentNationalId?: string;
  parentPhone?: string;
  decision: ConsentDecision;
  notes?: string;
  signatureType: ConsentSignatureType;
  signatureData?: string;
  signatureHash?: string;
  ipAddress?: string;
  userAgent?: string;
  submittedAt: Date;
  previousResponseId?: string;
  isLatest: boolean;
}

export class ParentConsentResponse extends Entity<ParentConsentResponseProps> {
  public static create(
    props: Partial<ParentConsentResponseProps> & {
      schoolId: string;
      consentRequestId: string;
      studentId: string;
      parentUserId: string;
      parentName: string;
      decision: ConsentDecision;
    },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): ParentConsentResponse {
    return new ParentConsentResponse(
      {
        schoolId: props.schoolId,
        consentRequestId: props.consentRequestId,
        consentVersion: props.consentVersion || 1,
        studentId: props.studentId,
        parentUserId: props.parentUserId,
        parentGuardianId: props.parentGuardianId,
        parentName: props.parentName,
        parentRelationship: props.parentRelationship || 'PARENT',
        parentNationalId: props.parentNationalId,
        parentPhone: props.parentPhone,
        decision: props.decision,
        notes: props.notes,
        signatureType: props.signatureType || 'DRAWN',
        signatureData: props.signatureData,
        signatureHash: props.signatureHash,
        ipAddress: props.ipAddress,
        userAgent: props.userAgent,
        submittedAt: props.submittedAt || new Date(),
        previousResponseId: props.previousResponseId,
        isLatest: props.isLatest !== undefined ? props.isLatest : true,
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get consentRequestId(): string { return this._props.consentRequestId; }
  public get consentVersion(): number { return this._props.consentVersion; }
  public get studentId(): string { return this._props.studentId; }
  public get parentUserId(): string { return this._props.parentUserId; }
  public get parentGuardianId(): string | undefined { return this._props.parentGuardianId; }
  public get parentName(): string { return this._props.parentName; }
  public get parentRelationship(): string | undefined { return this._props.parentRelationship; }
  public get parentNationalId(): string | undefined { return this._props.parentNationalId; }
  public get parentPhone(): string | undefined { return this._props.parentPhone; }
  public get decision(): ConsentDecision { return this._props.decision; }
  public get notes(): string | undefined { return this._props.notes; }
  public get signatureType(): ConsentSignatureType { return this._props.signatureType; }
  public get signatureData(): string | undefined { return this._props.signatureData; }
  public get signatureHash(): string | undefined { return this._props.signatureHash; }
  public get ipAddress(): string | undefined { return this._props.ipAddress; }
  public get userAgent(): string | undefined { return this._props.userAgent; }
  public get submittedAt(): Date { return this._props.submittedAt; }
  public get previousResponseId(): string | undefined { return this._props.previousResponseId; }
  public get isLatest(): boolean { return this._props.isLatest; }

  public markSuperseded(): void {
    this._props.isLatest = false;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      consentRequestId: this.consentRequestId,
      consentVersion: this.consentVersion,
      studentId: this.studentId,
      parentUserId: this.parentUserId,
      parentGuardianId: this.parentGuardianId,
      parentName: this.parentName,
      parentRelationship: this.parentRelationship,
      parentNationalId: this.parentNationalId,
      parentPhone: this.parentPhone,
      decision: this.decision,
      notes: this.notes,
      signatureType: this.signatureType,
      signatureData: this.signatureData,
      signatureHash: this.signatureHash,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      submittedAt: this.submittedAt.toISOString(),
      previousResponseId: this.previousResponseId,
      isLatest: this.isLatest,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
