export type BatchStatus = 'PREPARED' | 'CHALLENGED' | 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_FAILED' | 'FAILED';

export interface DocumentSigningBatchProps {
  id: string;
  userId: string;
  signatoryRole: string;
  documentType: string;
  scopeDescription: string;
  totalCount: number;
  signedCount: number;
  failedCount: number;
  status: BatchStatus;
  batchDigest: string;
  otpChallengeId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class DocumentSigningBatch {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _signatoryRole: string;
  private readonly _documentType: string;
  private readonly _scopeDescription: string;
  private _totalCount: number;
  private _signedCount: number;
  private _failedCount: number;
  private _status: BatchStatus;
  private _batchDigest: string;
  private _otpChallengeId?: string;
  private readonly _createdAt: Date;
  private _completedAt?: Date;

  constructor(props: DocumentSigningBatchProps) {
    if (!props.id) throw new Error('Batch ID is required');
    if (!props.userId) throw new Error('User ID is required');
    if (!props.documentType) throw new Error('Document type is required');
    if (!props.batchDigest) throw new Error('Batch digest is required');

    this._id = props.id;
    this._userId = props.userId;
    this._signatoryRole = props.signatoryRole;
    this._documentType = props.documentType;
    this._scopeDescription = props.scopeDescription;
    this._totalCount = props.totalCount || 0;
    this._signedCount = props.signedCount || 0;
    this._failedCount = props.failedCount || 0;
    this._status = props.status || 'PREPARED';
    this._batchDigest = props.batchDigest;
    this._otpChallengeId = props.otpChallengeId;
    this._createdAt = props.createdAt || new Date();
    this._completedAt = props.completedAt;
  }

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get signatoryRole(): string { return this._signatoryRole; }
  get documentType(): string { return this._documentType; }
  get scopeDescription(): string { return this._scopeDescription; }
  get totalCount(): number { return this._totalCount; }
  get signedCount(): number { return this._signedCount; }
  get failedCount(): number { return this._failedCount; }
  get status(): BatchStatus { return this._status; }
  get batchDigest(): string { return this._batchDigest; }
  get otpChallengeId(): string | undefined { return this._otpChallengeId; }
  get createdAt(): Date { return this._createdAt; }
  get completedAt(): Date | undefined { return this._completedAt; }

  public bindChallenge(challengeId: string): void {
    this._otpChallengeId = challengeId;
    this._status = 'CHALLENGED';
  }

  public startProcessing(): void {
    this._status = 'PROCESSING';
  }

  public updateCounters(signedDelta: number, failedDelta: number): void {
    this._signedCount += signedDelta;
    this._failedCount += failedDelta;
  }

  public completeExecution(): void {
    this._completedAt = new Date();
    if (this._failedCount === 0 && this._signedCount > 0) {
      this._status = 'COMPLETED';
    } else if (this._signedCount > 0 && this._failedCount > 0) {
      this._status = 'PARTIALLY_FAILED';
    } else {
      this._status = 'FAILED';
    }
  }

  public toJSON(): DocumentSigningBatchProps {
    return {
      id: this._id,
      userId: this._userId,
      signatoryRole: this._signatoryRole,
      documentType: this._documentType,
      scopeDescription: this._scopeDescription,
      totalCount: this._totalCount,
      signedCount: this._signedCount,
      failedCount: this._failedCount,
      status: this._status,
      batchDigest: this._batchDigest,
      otpChallengeId: this._otpChallengeId,
      createdAt: this._createdAt,
      completedAt: this._completedAt
    };
  }
}
