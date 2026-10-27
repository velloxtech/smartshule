import { DigitalSignatureProfile } from '../../domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../domain/signature/DocumentSignatureRecord';
import { SigningPolicy } from '../../domain/signature/SigningPolicy';
import { DocumentSigningBatch } from '../../domain/signature/DocumentSigningBatch';
import { DocumentSigningBatchItem } from '../../domain/signature/DocumentSigningBatchItem';

export interface ISignatureRepository {
  // Profiles
  findProfileByUserId(userId: string): Promise<DigitalSignatureProfile | null>;
  saveProfile(profile: DigitalSignatureProfile): Promise<DigitalSignatureProfile>;
  
  // Challenges
  findChallengeById(challengeId: string): Promise<DocumentSigningChallenge | null>;
  findActiveChallenge(userId: string, documentId: string): Promise<DocumentSigningChallenge | null>;
  saveChallenge(challenge: DocumentSigningChallenge): Promise<DocumentSigningChallenge>;
  invalidateChallenges(userId: string, documentId: string): Promise<void>;

  // Signed Records
  saveSignatureRecord(record: DocumentSignatureRecord): Promise<DocumentSignatureRecord>;
  findSignatureRecordsByDocumentId(documentId: string): Promise<DocumentSignatureRecord[]>;
  findSignatureRecordById(recordId: string): Promise<DocumentSignatureRecord | null>;
  findSignatureRecordsBySignerId(userId: string): Promise<DocumentSignatureRecord[]>;
  listAllSignatureRecords(limit?: number, offset?: number): Promise<DocumentSignatureRecord[]>;

  // Policies
  findPolicyByDocumentType(documentType: string): Promise<SigningPolicy | null>;
  savePolicy(policy: SigningPolicy): Promise<SigningPolicy>;
  listPolicies(): Promise<SigningPolicy[]>;

  // Bulk Batches
  saveBatch(batch: DocumentSigningBatch): Promise<DocumentSigningBatch>;
  findBatchById(batchId: string): Promise<DocumentSigningBatch | null>;
  findBatchesByUserId(userId: string): Promise<DocumentSigningBatch[]>;
  listAllBatches?(): Promise<DocumentSigningBatch[]>;
  saveBatchItems(items: DocumentSigningBatchItem[]): Promise<void>;
  updateBatchItem(item: DocumentSigningBatchItem): Promise<void>;
  findBatchItems(batchId: string): Promise<DocumentSigningBatchItem[]>;
}
