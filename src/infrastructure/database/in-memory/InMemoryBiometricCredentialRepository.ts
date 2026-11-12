import { IBiometricCredentialRepository } from '../../../core/ports/repositories/IBiometricCredentialRepository';
import { BiometricCredential } from '../../../core/domain/auth/BiometricCredential';

export class InMemoryBiometricCredentialRepository implements IBiometricCredentialRepository {
  private credentials: Map<string, BiometricCredential> = new Map();

  async save(credential: BiometricCredential): Promise<BiometricCredential> {
    this.credentials.set(credential.id, credential);
    return credential;
  }

  async findById(id: string): Promise<BiometricCredential | null> {
    return this.credentials.get(id) || null;
  }

  async findByCredentialId(credentialId: string): Promise<BiometricCredential | null> {
    for (const cred of this.credentials.values()) {
      if (cred.credentialId === credentialId) {
        return cred;
      }
    }
    return null;
  }

  async findByUserId(userId: string): Promise<BiometricCredential[]> {
    const list: BiometricCredential[] = [];
    for (const cred of this.credentials.values()) {
      if (cred.userId === userId) {
        list.push(cred);
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(credential: BiometricCredential): Promise<BiometricCredential> {
    this.credentials.set(credential.id, credential);
    return credential;
  }

  async delete(id: string): Promise<void> {
    this.credentials.delete(id);
  }

  async deleteByUserIdAndCredentialId(userId: string, credentialId: string): Promise<boolean> {
    for (const [id, cred] of this.credentials.entries()) {
      if (cred.userId === userId && cred.credentialId === credentialId) {
        this.credentials.delete(id);
        return true;
      }
    }
    return false;
  }
}
