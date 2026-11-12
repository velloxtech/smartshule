import { BiometricCredential } from '../../domain/auth/BiometricCredential';

export interface IBiometricCredentialRepository {
  save(credential: BiometricCredential): Promise<BiometricCredential>;
  findById(id: string): Promise<BiometricCredential | null>;
  findByCredentialId(credentialId: string): Promise<BiometricCredential | null>;
  findByUserId(userId: string): Promise<BiometricCredential[]>;
  update(credential: BiometricCredential): Promise<BiometricCredential>;
  delete(id: string): Promise<void>;
  deleteByUserIdAndCredentialId(userId: string, credentialId: string): Promise<boolean>;
}
