import { ISignatureRepository } from '../../../core/ports/repositories/ISignatureRepository';
import { DigitalSignatureProfile } from '../../../core/domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../../core/domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../../core/domain/signature/DocumentSignatureRecord';
import { SigningPolicy, getDefaultSigningPolicies } from '../../../core/domain/signature/SigningPolicy';
import { DocumentSigningBatch } from '../../../core/domain/signature/DocumentSigningBatch';
import { DocumentSigningBatchItem } from '../../../core/domain/signature/DocumentSigningBatchItem';

export class InMemorySignatureRepository implements ISignatureRepository {
  private profilesByUser: Map<string, DigitalSignatureProfile> = new Map();
  private challengesById: Map<string, DocumentSigningChallenge> = new Map();
  private signatureRecordsById: Map<string, DocumentSignatureRecord> = new Map();
  private policiesByDocType: Map<string, SigningPolicy> = new Map();
  private batchesById: Map<string, DocumentSigningBatch> = new Map();
  private batchItemsByBatchId: Map<string, DocumentSigningBatchItem[]> = new Map();

  constructor() {
    // Pre-populate with default policies
    const defaults = getDefaultSigningPolicies();
    for (const p of defaults) {
      this.policiesByDocType.set(p.documentType, new SigningPolicy(p));
    }
  }

  // Profiles
  public async findProfileByUserId(userId: string): Promise<DigitalSignatureProfile | null> {
    return this.profilesByUser.get(userId) || null;
  }

  public async saveProfile(profile: DigitalSignatureProfile): Promise<DigitalSignatureProfile> {
    this.profilesByUser.set(profile.userId, profile);
    return profile;
  }

  // Challenges
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

  // Signed Records
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

  public async listAllSignatureRecords(limit = 100, offset = 0): Promise<DocumentSignatureRecord[]> {
    return Array.from(this.signatureRecordsById.values())
      .sort((a, b) => b.signedAt.getTime() - a.signedAt.getTime())
      .slice(offset, offset + limit);
  }

  // Policies
  public async findPolicyByDocumentType(documentType: string): Promise<SigningPolicy | null> {
    return this.policiesByDocType.get(documentType) || null;
  }

  public async savePolicy(policy: SigningPolicy): Promise<SigningPolicy> {
    this.policiesByDocType.set(policy.documentType, policy);
    return policy;
  }

  public async listPolicies(): Promise<SigningPolicy[]> {
    return Array.from(this.policiesByDocType.values());
  }

  // Batches
  public async saveBatch(batch: DocumentSigningBatch): Promise<DocumentSigningBatch> {
    this.batchesById.set(batch.id, batch);
    return batch;
  }

  public async findBatchById(batchId: string): Promise<DocumentSigningBatch | null> {
    return this.batchesById.get(batchId) || null;
  }

  public async findBatchesByUserId(userId: string): Promise<DocumentSigningBatch[]> {
    return Array.from(this.batchesById.values())
      .filter(b => b.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async listAllBatches(): Promise<DocumentSigningBatch[]> {
    return Array.from(this.batchesById.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async saveBatchItems(items: DocumentSigningBatchItem[]): Promise<void> {
    if (items.length === 0) return;
    const batchId = items[0].batchId;
    const existing = this.batchItemsByBatchId.get(batchId) || [];
    const itemMap = new Map<string, DocumentSigningBatchItem>();
    for (const it of existing) itemMap.set(it.id, it);
    for (const it of items) itemMap.set(it.id, it);
    this.batchItemsByBatchId.set(batchId, Array.from(itemMap.values()));
  }

  public async updateBatchItem(item: DocumentSigningBatchItem): Promise<void> {
    const list = this.batchItemsByBatchId.get(item.batchId) || [];
    const idx = list.findIndex(it => it.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.batchItemsByBatchId.set(item.batchId, list);
  }

  public async findBatchItems(batchId: string): Promise<DocumentSigningBatchItem[]> {
    return this.batchItemsByBatchId.get(batchId) || [];
  }
}
