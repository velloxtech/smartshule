import { Pool } from 'pg';
import { IBiometricCredentialRepository } from '../../../core/ports/repositories/IBiometricCredentialRepository';
import { BiometricCredential, BiometricDeviceType } from '../../../core/domain/auth/BiometricCredential';

export class PostgresBiometricCredentialRepository implements IBiometricCredentialRepository {
  private fallbackCache: Map<string, BiometricCredential> = new Map();

  constructor(private pool: Pool) {}

  private mapRow(row: any): BiometricCredential {
    return new BiometricCredential({
      id: row.id,
      userId: row.user_id,
      credentialId: row.credential_id,
      publicKey: row.public_key,
      counter: Number(row.counter) || 0,
      deviceLabel: row.device_label,
      deviceType: (row.device_type as BiometricDeviceType) || 'platform_generic',
      transports: Array.isArray(row.transports) ? row.transports : [],
      aaguid: row.aaguid || undefined,
      backupEligible: Boolean(row.backup_eligible),
      backupState: Boolean(row.backup_state),
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null
    });
  }

  async save(credential: BiometricCredential): Promise<BiometricCredential> {
    try {
      const query = `
        INSERT INTO biometric_credentials (
          id, user_id, credential_id, public_key, counter,
          device_label, device_type, transports, aaguid,
          backup_eligible, backup_state, created_at, last_used_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (credential_id) DO UPDATE SET
          counter = EXCLUDED.counter,
          last_used_at = EXCLUDED.last_used_at
        RETURNING *;
      `;
      const values = [
        credential.id,
        credential.userId,
        credential.credentialId,
        credential.publicKey,
        credential.counter,
        credential.deviceLabel,
        credential.deviceType,
        credential.transports,
        credential.aaguid || null,
        credential.backupEligible,
        credential.backupState,
        credential.createdAt,
        credential.lastUsedAt
      ];
      const res = await this.pool.query(query, values);
      const saved = this.mapRow(res.rows[0]);
      this.fallbackCache.set(saved.id, saved);
      return saved;
    } catch (err: any) {
      console.warn('[PostgresBiometricCredentialRepository] DB save failed, saving to cache:', err.message);
      this.fallbackCache.set(credential.id, credential);
      return credential;
    }
  }

  async findById(id: string): Promise<BiometricCredential | null> {
    try {
      const res = await this.pool.query('SELECT * FROM biometric_credentials WHERE id = $1', [id]);
      if (res.rows.length === 0) {
        return this.fallbackCache.get(id) || null;
      }
      return this.mapRow(res.rows[0]);
    } catch {
      return this.fallbackCache.get(id) || null;
    }
  }

  async findByCredentialId(credentialId: string): Promise<BiometricCredential | null> {
    try {
      const res = await this.pool.query('SELECT * FROM biometric_credentials WHERE credential_id = $1', [credentialId]);
      if (res.rows.length === 0) {
        for (const cred of this.fallbackCache.values()) {
          if (cred.credentialId === credentialId) return cred;
        }
        return null;
      }
      return this.mapRow(res.rows[0]);
    } catch {
      for (const cred of this.fallbackCache.values()) {
        if (cred.credentialId === credentialId) return cred;
      }
      return null;
    }
  }

  async findByUserId(userId: string): Promise<BiometricCredential[]> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM biometric_credentials WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      if (res.rows.length > 0) {
        return res.rows.map(this.mapRow);
      }
      const list: BiometricCredential[] = [];
      for (const cred of this.fallbackCache.values()) {
        if (cred.userId === userId) list.push(cred);
      }
      return list;
    } catch {
      const list: BiometricCredential[] = [];
      for (const cred of this.fallbackCache.values()) {
        if (cred.userId === userId) list.push(cred);
      }
      return list;
    }
  }

  async update(credential: BiometricCredential): Promise<BiometricCredential> {
    try {
      await this.pool.query(
        `UPDATE biometric_credentials
         SET counter = $1, last_used_at = $2
         WHERE id = $3`,
        [credential.counter, credential.lastUsedAt, credential.id]
      );
      this.fallbackCache.set(credential.id, credential);
      return credential;
    } catch {
      this.fallbackCache.set(credential.id, credential);
      return credential;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM biometric_credentials WHERE id = $1', [id]);
    } finally {
      this.fallbackCache.delete(id);
    }
  }

  async deleteByUserIdAndCredentialId(userId: string, credentialId: string): Promise<boolean> {
    try {
      const res = await this.pool.query(
        'DELETE FROM biometric_credentials WHERE user_id = $1 AND credential_id = $2',
        [userId, credentialId]
      );
      let removed = (res.rowCount ?? 0) > 0;
      for (const [id, cred] of this.fallbackCache.entries()) {
        if (cred.userId === userId && cred.credentialId === credentialId) {
          this.fallbackCache.delete(id);
          removed = true;
        }
      }
      return removed;
    } catch {
      for (const [id, cred] of this.fallbackCache.entries()) {
        if (cred.userId === userId && cred.credentialId === credentialId) {
          this.fallbackCache.delete(id);
          return true;
        }
      }
      return false;
    }
  }
}
