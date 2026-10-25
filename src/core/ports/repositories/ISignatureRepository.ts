import { DigitalSignatureProfile } from '../../domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../domain/signature/DocumentSignatureRecord';

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
}
