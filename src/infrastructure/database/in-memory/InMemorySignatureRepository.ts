import { ISignatureRepository } from '../../../core/ports/repositories/ISignatureRepository';
import { DigitalSignatureProfile } from '../../../core/domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../../core/domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../../core/domain/signature/DocumentSignatureRecord';

export class InMemorySignatureRepository implements ISignatureRepository {
  private profilesByUser: Map<string, DigitalSignatureProfile> = new Map();
  private challengesById: Map<string, DocumentSigningChallenge> = new Map();
  private signatureRecordsById: Map<string, DocumentSignatureRecord> = new Map();

  public async findProfileByUserId(userId: string): Promise<DigitalSignatureProfile | null> {
    return this.profilesByUser.get(userId) || null;
  }

  public async saveProfile(profile: DigitalSignatureProfile): Promise<DigitalSignatureProfile> {
    this.profilesByUser.set(profile.userId, profile);
    return profile;
  }

  public async findChallengeById(challengeId: string): Promise<DocumentSigningChallenge | null> {
    return this.challengesById.get(challengeId) || null;
  }

  public async findActiveChallenge(userId: string, documentId: string): Promise<DocumentSigningChallenge | null> {
    const now = new Date();
    for (const challenge of this.challengesById.values()) {
      if (
        challenge.userId === userId &&
        challenge.documentId === documentId &&
        !challenge.isConsumed &&
        challenge.expiresAt > now
      ) {
        return challenge;
      }
    }
    return null;
  }

  public async saveChallenge(challenge: DocumentSigningChallenge): Promise<DocumentSigningChallenge> {
    this.challengesById.set(challenge.id, challenge);
    return challenge;
  }

  public async invalidateChallenges(userId: string, documentId: string): Promise<void> {
    for (const challenge of this.challengesById.values()) {
      if (challenge.userId === userId && challenge.documentId === documentId) {
        challenge.markConsumed();
      }
    }
  }

  public async saveSignatureRecord(record: DocumentSignatureRecord): Promise<DocumentSignatureRecord> {
    this.signatureRecordsById.set(record.id, record);
    return record;
  }

  public async findSignatureRecordsByDocumentId(documentId: string): Promise<DocumentSignatureRecord[]> {
    return Array.from(this.signatureRecordsById.values())
      .filter(r => r.documentId === documentId)
      .sort((a, b) => a.signedAt.getTime() - b.signedAt.getTime());
  }

  public async findSignatureRecordById(recordId: string): Promise<DocumentSignatureRecord | null> {
    return this.signatureRecordsById.get(recordId) || null;
  }

  public async findSignatureRecordsBySignerId(userId: string): Promise<DocumentSignatureRecord[]> {
    return Array.from(this.signatureRecordsById.values())
      .filter(r => r.signerUserId === userId)
      .sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime());
  }
}
