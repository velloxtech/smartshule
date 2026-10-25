export type SignatureType = 'DRAWN' | 'TYPED' | 'UPLOADED';

export interface DigitalSignatureProfileProps {
  id: string;
  userId: string;
  signatureType: SignatureType;
  signatureData: string; // Base64 data URL or SVG path data
  fontStyle?: string; // Font family for typed signatures (e.g. 'Dancing Script', 'Caveat')
  consentGiven: boolean;
  consentGivenAt: Date;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DigitalSignatureProfile {
  private readonly _id: string;
  private readonly _userId: string;
  private _signatureType: SignatureType;
  private _signatureData: string;
  private _fontStyle?: string;
  private _consentGiven: boolean;
  private _consentGivenAt: Date;
  private _isActive: boolean;
  private _version: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: DigitalSignatureProfileProps) {
    if (!props.id) throw new Error('Signature profile ID is required');
    if (!props.userId) throw new Error('User ID is required');
    if (!props.signatureData) throw new Error('Signature data is required');
    if (!props.consentGiven) {
      throw new Error('Explicit consent is required to configure a digital signature');
    }

    this._id = props.id;
    this._userId = props.userId;
    this._signatureType = props.signatureType;
    this._signatureData = props.signatureData;
    this._fontStyle = props.fontStyle;
    this._consentGiven = props.consentGiven;
    this._consentGivenAt = props.consentGivenAt;
    this._isActive = props.isActive;
    this._version = props.version || 1;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get signatureType(): SignatureType { return this._signatureType; }
  get signatureData(): string { return this._signatureData; }
  get fontStyle(): string | undefined { return this._fontStyle; }
  get consentGiven(): boolean { return this._consentGiven; }
  get consentGivenAt(): Date { return this._consentGivenAt; }
  get isActive(): boolean { return this._isActive; }
  get version(): number { return this._version; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  public updateSignature(
    signatureType: SignatureType,
    signatureData: string,
    fontStyle?: string
  ): void {
    if (!signatureData) throw new Error('Signature data is required');
    this._signatureType = signatureType;
    this._signatureData = signatureData;
    this._fontStyle = fontStyle;
    this._version += 1;
    this._isActive = true;
    this._consentGiven = true;
    this._consentGivenAt = new Date();
    this._updatedAt = new Date();
  }

  public deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  public toJSON(): DigitalSignatureProfileProps {
    return {
      id: this._id,
      userId: this._userId,
      signatureType: this._signatureType,
      signatureData: this._signatureData,
      fontStyle: this._fontStyle,
      consentGiven: this._consentGiven,
      consentGivenAt: this._consentGivenAt,
      isActive: this._isActive,
      version: this._version,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
