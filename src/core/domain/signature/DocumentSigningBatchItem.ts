export type BatchItemStatus = 'READY' | 'SIGNED' | 'BLOCKED' | 'FAILED';

export interface DocumentSigningBatchItemProps {
  id: string;
  batchId: string;
  documentId: string;
  documentTitle: string;
  studentId?: string;
  studentName?: string;
  documentVersion: string;
  documentHash: string;
  status: BatchItemStatus;
  failureReason?: string;
  signatureRecordId?: string;
  signedAt?: Date;
  createdAt: Date;
}

export class DocumentSigningBatchItem {
  private readonly _id: string;
  private readonly _batchId: string;
  private readonly _documentId: string;
  private readonly _documentTitle: string;
  private readonly _studentId?: string;
  private readonly _studentName?: string;
  private readonly _documentVersion: string;
  private readonly _documentHash: string;
  private _status: BatchItemStatus;
  private _failureReason?: string;
  private _signatureRecordId?: string;
  private _signedAt?: Date;
  private readonly _createdAt: Date;

  constructor(props: DocumentSigningBatchItemProps) {
    if (!props.id) throw new Error('Batch item ID is required');
    if (!props.batchId) throw new Error('Batch ID is required');
    if (!props.documentId) throw new Error('Document ID is required');
    if (!props.documentHash) throw new Error('Document hash is required');

    this._id = props.id;
    this._batchId = props.batchId;
    this._documentId = props.documentId;
    this._documentTitle = props.documentTitle || props.documentId;
    this._studentId = props.studentId;
    this._studentName = props.studentName;
    this._documentVersion = props.documentVersion || '1.0';
    this._documentHash = props.documentHash;
    this._status = props.status || 'READY';
    this._failureReason = props.failureReason;
    this._signatureRecordId = props.signatureRecordId;
    this._signedAt = props.signedAt;
    this._createdAt = props.createdAt || new Date();
  }

  get id(): string { return this._id; }
  get batchId(): string { return this._batchId; }
  get documentId(): string { return this._documentId; }
  get documentTitle(): string { return this._documentTitle; }
  get studentId(): string | undefined { return this._studentId; }
  get studentName(): string | undefined { return this._studentName; }
  get documentVersion(): string { return this._documentVersion; }
  get documentHash(): string { return this._documentHash; }
  get status(): BatchItemStatus { return this._status; }
  get failureReason(): string | undefined { return this._failureReason; }
  get signatureRecordId(): string | undefined { return this._signatureRecordId; }
  get signedAt(): Date | undefined { return this._signedAt; }
  get createdAt(): Date { return this._createdAt; }

  public markSigned(signatureRecordId: string): void {
    this._status = 'SIGNED';
    this._signatureRecordId = signatureRecordId;
    this._signedAt = new Date();
    this._failureReason = undefined;
  }

  public markFailed(reason: string): void {
    this._status = 'FAILED';
    this._failureReason = reason;
  }

  public markBlocked(reason: string): void {
    this._status = 'BLOCKED';
    this._failureReason = reason;
  }

  public resetForRetry(): void {
    if (this._status === 'FAILED' || this._status === 'BLOCKED') {
      this._status = 'READY';
      this._failureReason = undefined;
    }
  }

  public toJSON(): DocumentSigningBatchItemProps {
    return {
      id: this._id,
      batchId: this._batchId,
      documentId: this._documentId,
      documentTitle: this._documentTitle,
      studentId: this._studentId,
      studentName: this._studentName,
      documentVersion: this._documentVersion,
      documentHash: this._documentHash,
      status: this._status,
      failureReason: this._failureReason,
      signatureRecordId: this._signatureRecordId,
      signedAt: this._signedAt,
      createdAt: this._createdAt
    };
  }
}
