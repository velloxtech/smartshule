export interface DocumentSignatureRecordProps {
  id: string;
  documentId: string;
  documentType: string;
  documentVersion: string;
  documentHash: string; // SHA-256 of the document content at signing
  signatureProfileId: string;
  signatureProfileVersion: number;
  signatureDataSnapshot: string; // Immutable copy of the signature at signing time
  signatureType: string;
  signerUserId: string;
  signerName: string;
  signerRole: string;
  signerEmail: string;
  otpChallengeId: string;
  signedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  auditMetadata?: Record<string, any>;
}

export class DocumentSignatureRecord {
  private readonly _id: string;
  private readonly _documentId: string;
  private readonly _documentType: string;
  private readonly _documentVersion: string;
  private readonly _documentHash: string;
  private readonly _signatureProfileId: string;
  private readonly _signatureProfileVersion: number;
  private readonly _signatureDataSnapshot: string;
  private readonly _signatureType: string;
  private readonly _signerUserId: string;
  private readonly _signerName: string;
  private readonly _signerRole: string;
  private readonly _signerEmail: string;
  private readonly _otpChallengeId: string;
  private readonly _signedAt: Date;
  private readonly _ipAddress?: string;
  private readonly _userAgent?: string;
  private readonly _auditMetadata?: Record<string, any>;

  constructor(props: DocumentSignatureRecordProps) {
    if (!props.id) throw new Error('Signature record ID is required');
    if (!props.documentId) throw new Error('Document ID is required');
    if (!props.documentHash) throw new Error('Document hash is required');
    if (!props.signerUserId) throw new Error('Signer user ID is required');

    this._id = props.id;
    this._documentId = props.documentId;
    this._documentType = props.documentType;
    this._documentVersion = props.documentVersion;
    this._documentHash = props.documentHash;
    this._signatureProfileId = props.signatureProfileId;
    this._signatureProfileVersion = props.signatureProfileVersion;
    this._signatureDataSnapshot = props.signatureDataSnapshot;
    this._signatureType = props.signatureType;
    this._signerUserId = props.signerUserId;
    this._signerName = props.signerName;
    this._signerRole = props.signerRole;
    this._signerEmail = props.signerEmail;
    this._otpChallengeId = props.otpChallengeId;
    this._signedAt = props.signedAt;
    this._ipAddress = props.ipAddress;
    this._userAgent = props.userAgent;
    this._auditMetadata = props.auditMetadata;
  }

  get id(): string { return this._id; }
  get documentId(): string { return this._documentId; }
  get documentType(): string { return this._documentType; }
  get documentVersion(): string { return this._documentVersion; }
  get documentHash(): string { return this._documentHash; }
  get signatureProfileId(): string { return this._signatureProfileId; }
  get signatureProfileVersion(): number { return this._signatureProfileVersion; }
  get signatureDataSnapshot(): string { return this._signatureDataSnapshot; }
  get signatureType(): string { return this._signatureType; }
  get signerUserId(): string { return this._signerUserId; }
  get signerName(): string { return this._signerName; }
  get signerRole(): string { return this._signerRole; }
  get signerEmail(): string { return this._signerEmail; }
  get otpChallengeId(): string { return this._otpChallengeId; }
  get signedAt(): Date { return this._signedAt; }
  get ipAddress(): string | undefined { return this._ipAddress; }
  get userAgent(): string | undefined { return this._userAgent; }
  get auditMetadata(): Record<string, any> | undefined { return this._auditMetadata; }

  public toJSON(): DocumentSignatureRecordProps {
    return {
      id: this._id,
      documentId: this._documentId,
      documentType: this._documentType,
      documentVersion: this._documentVersion,
      documentHash: this._documentHash,
      signatureProfileId: this._signatureProfileId,
      signatureProfileVersion: this._signatureProfileVersion,
      signatureDataSnapshot: this._signatureDataSnapshot,
      signatureType: this._signatureType,
      signerUserId: this._signerUserId,
      signerName: this._signerName,
      signerRole: this._signerRole,
      signerEmail: this._signerEmail,
      otpChallengeId: this._otpChallengeId,
      signedAt: this._signedAt,
      ipAddress: this._ipAddress,
      userAgent: this._userAgent,
      auditMetadata: this._auditMetadata
    };
  }
}
