export type BiometricDeviceType =
  | 'windows_hello'
  | 'apple_biometrics'
  | 'android_biometrics'
  | 'fido2_key'
  | 'platform_generic';

export interface BiometricCredentialProps {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string; // base64url or hex
  counter: number;
  deviceLabel: string;
  deviceType: BiometricDeviceType;
  transports: string[];
  aaguid?: string;
  backupEligible?: boolean;
  backupState?: boolean;
  createdAt?: Date;
  lastUsedAt?: Date | null;
}

export class BiometricCredential {
  public readonly id: string;
  public readonly userId: string;
  public readonly credentialId: string;
  public readonly publicKey: string;
  public counter: number;
  public readonly deviceLabel: string;
  public readonly deviceType: BiometricDeviceType;
  public readonly transports: string[];
  public readonly aaguid?: string;
  public readonly backupEligible: boolean;
  public backupState: boolean;
  public readonly createdAt: Date;
  public lastUsedAt: Date | null;

  constructor(props: BiometricCredentialProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.credentialId = props.credentialId;
    this.publicKey = props.publicKey;
    this.counter = props.counter;
    this.deviceLabel = props.deviceLabel;
    this.deviceType = props.deviceType;
    this.transports = props.transports || [];
    this.aaguid = props.aaguid;
    this.backupEligible = props.backupEligible ?? false;
    this.backupState = props.backupState ?? false;
    this.createdAt = props.createdAt || new Date();
    this.lastUsedAt = props.lastUsedAt || null;
  }

  public recordUsage(newCounter: number): void {
    this.counter = newCounter;
    this.lastUsedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      credentialId: this.credentialId,
      deviceLabel: this.deviceLabel,
      deviceType: this.deviceType,
      transports: this.transports,
      aaguid: this.aaguid,
      backupEligible: this.backupEligible,
      backupState: this.backupState,
      createdAt: this.createdAt,
      lastUsedAt: this.lastUsedAt
    };
  }
}
