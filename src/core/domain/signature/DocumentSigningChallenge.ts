import crypto from 'crypto';

export interface DocumentSigningChallengeProps {
  id: string;
  userId: string;
  documentId: string;
  documentType: string;
  documentVersion: string;
  documentHash: string; // SHA-256 of the document content
  otpHash: string; // SHA-256 of (code + salt)
  salt: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  resendCooldownUntil: Date;
  isConsumed: boolean;
  consumedAt?: Date;
  createdAt: Date;
}

export class DocumentSigningChallenge {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _documentId: string;
  private readonly _documentType: string;
  private readonly _documentVersion: string;
  private readonly _documentHash: string;
  private readonly _otpHash: string;
  private readonly _salt: string;
  private _attempts: number;
  private readonly _maxAttempts: number;
  private readonly _expiresAt: Date;
  private readonly _resendCooldownUntil: Date;
  private _isConsumed: boolean;
  private _consumedAt?: Date;
  private readonly _createdAt: Date;

  constructor(props: DocumentSigningChallengeProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._documentId = props.documentId;
    this._documentType = props.documentType;
    this._documentVersion = props.documentVersion;
    this._documentHash = props.documentHash;
    this._otpHash = props.otpHash;
    this._salt = props.salt;
    this._attempts = props.attempts || 0;
    this._maxAttempts = props.maxAttempts || 5;
    this._expiresAt = props.expiresAt;
    this._resendCooldownUntil = props.resendCooldownUntil;
    this._isConsumed = props.isConsumed || false;
    this._consumedAt = props.consumedAt;
    this._createdAt = props.createdAt;
  }

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get documentId(): string { return this._documentId; }
  get documentType(): string { return this._documentType; }
  get documentVersion(): string { return this._documentVersion; }
  get documentHash(): string { return this._documentHash; }
  get otpHash(): string { return this._otpHash; }
  get salt(): string { return this._salt; }
  get attempts(): number { return this._attempts; }
  get maxAttempts(): number { return this._maxAttempts; }
  get expiresAt(): Date { return this._expiresAt; }
  get resendCooldownUntil(): Date { return this._resendCooldownUntil; }
  get isConsumed(): boolean { return this._isConsumed; }
  get consumedAt(): Date | undefined { return this._consumedAt; }
  get createdAt(): Date { return this._createdAt; }

  public isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  public isRateLimited(): boolean {
    return this._attempts >= this._maxAttempts;
  }

  public canResend(): boolean {
    return new Date() >= this._resendCooldownUntil;
  }

  public getRemainingAttempts(): number {
    return Math.max(0, this._maxAttempts - this._attempts);
  }

  public recordFailedAttempt(): void {
    this._attempts += 1;
  }

  public verifyCode(candidateCode: string): boolean {
    if (this._isConsumed) return false;
    if (this.isExpired()) return false;
    if (this.isRateLimited()) return false;

    const candidateHash = crypto
      .createHash('sha256')
      .update(candidateCode.trim() + this._salt)
      .digest('hex');

    const isValid = candidateHash === this._otpHash;
    if (!isValid) {
      this.recordFailedAttempt();
    }
    return isValid;
  }

  public markConsumed(): void {
    this._isConsumed = true;
    this._consumedAt = new Date();
  }

  public toJSON(): DocumentSigningChallengeProps {
    return {
      id: this._id,
      userId: this._userId,
      documentId: this._documentId,
      documentType: this._documentType,
      documentVersion: this._documentVersion,
      documentHash: this._documentHash,
      otpHash: this._otpHash,
      salt: this._salt,
      attempts: this._attempts,
      maxAttempts: this._maxAttempts,
      expiresAt: this._expiresAt,
      resendCooldownUntil: this._resendCooldownUntil,
      isConsumed: this._isConsumed,
      consumedAt: this._consumedAt,
      createdAt: this._createdAt
    };
  }
}
