import crypto from 'crypto';
import { ISignatureRepository } from '../../core/ports/repositories/ISignatureRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IEmailService } from '../../core/ports/services/IEmailService';
import { DigitalSignatureProfile, SignatureType } from '../../core/domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../core/domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../core/domain/signature/DocumentSignatureRecord';
import { ValidationError, NotFoundError } from '../../core/domain/shared/Errors';
import { env } from '../../infrastructure/config/env';

export interface SaveProfileInput {
  signatureType: SignatureType;
  signatureData: string;
  fontStyle?: string;
  consentConfirmed: boolean;
}

export interface InitiateSigningChallengeInput {
  documentId: string;
  documentType: string;
  documentVersion: string;
  documentTitle: string;
  documentContent: string;
}

export interface VerifyAndSignInput {
  challengeId: string;
  otpCode: string;
  documentId: string;
  documentType: string;
  documentVersion: string;
  documentContent: string;
  ipAddress?: string;
  userAgent?: string;
  auditMetadata?: Record<string, any>;
}

export class SignatureUseCases {
  constructor(
    private signatureRepo: ISignatureRepository,
    private userRepo: IUserRepository,
    private emailService: IEmailService
  ) {}

  /**
   * Helper to mask an email address for display (e.g. j***e@example.com)
   */
  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
  }

  /**
   * Validates image MIME type and maximum payload size (2MB)
   */
  private validateSignatureData(data: string, type: SignatureType): void {
    if (!data || typeof data !== 'string' || data.trim().length === 0) {
      throw new ValidationError('Signature data cannot be empty.');
    }

    // Size check: Base64 data cannot exceed ~2MB (2,800,000 characters)
    if (data.length > 2800000) {
      throw new ValidationError('Signature payload exceeds the maximum allowed size of 2MB.');
    }

    if (type === 'UPLOADED' || type === 'DRAWN') {
      const isDataUrl = data.startsWith('data:image/');
      const isSvg = data.startsWith('<svg') || data.startsWith('data:image/svg+xml');
      if (!isDataUrl && !isSvg) {
        throw new ValidationError('Invalid signature image format. Accepted formats: PNG, JPEG, WebP, SVG.');
      }
    }
  }

  /**
   * Computes SHA-256 hash of a document's content string
   */
  public computeDocumentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get user's current signature profile and account verification status
   */
  public async getSignatureProfile(userId: string): Promise<{
    isConfigured: boolean;
    emailVerified: boolean;
    email: string | null;
    profile?: any;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const email = user.email || null;
    const profile = await this.signatureRepo.findProfileByUserId(userId);

    return {
      isConfigured: !!(profile && profile.isActive),
      emailVerified: !!email,
      email,
      profile: profile ? profile.toJSON() : undefined
    };
  }

  /**
   * Save, update or replace a user's digital signature
   */
  public async saveSignatureProfile(userId: string, input: SaveProfileInput): Promise<any> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!input.consentConfirmed) {
      throw new ValidationError(
        'Explicit electronic signing consent is required to configure or update your digital signature.'
      );
    }

    this.validateSignatureData(input.signatureData, input.signatureType);

    let profile = await this.signatureRepo.findProfileByUserId(userId);

    if (profile) {
      profile.updateSignature(input.signatureType, input.signatureData, input.fontStyle);
    } else {
      profile = new DigitalSignatureProfile({
        id: crypto.randomUUID(),
        userId,
        signatureType: input.signatureType,
        signatureData: input.signatureData,
        fontStyle: input.fontStyle,
        consentGiven: true,
        consentGivenAt: new Date(),
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await this.signatureRepo.saveProfile(profile);
    return profile.toJSON();
  }

  /**
   * Deactivate a user's digital signature
   */
  public async deactivateSignatureProfile(userId: string): Promise<{ success: boolean }> {
    const profile = await this.signatureRepo.findProfileByUserId(userId);
    if (!profile) {
      return { success: true };
    }

    profile.deactivate();
    await this.signatureRepo.saveProfile(profile);
    return { success: true };
  }

  /**
   * Step 1 of Document Signing: Generate 6-digit OTP challenge, hash document, send email
   */
  public async initiateSigningChallenge(
    userId: string,
    input: InitiateSigningChallengeInput
  ): Promise<{
    challengeId: string;
    documentId: string;
    documentVersion: string;
    documentHash: string;
    expiresAt: Date;
    resendAvailableInSeconds: number;
    maskedEmail: string;
    debugOtp?: string;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.email) {
      throw new ValidationError(
        'You must have a verified email address registered to your account to sign documents.'
      );
    }

    // Require an active signature profile
    const profile = await this.signatureRepo.findProfileByUserId(userId);
    if (!profile || !profile.isActive) {
      throw new ValidationError(
        'No active digital signature found. Please configure your signature in My Digital Signature before signing.'
      );
    }

    // Check resend cooldown on existing active challenge
    const existingChallenge = await this.signatureRepo.findActiveChallenge(userId, input.documentId);
    if (existingChallenge && !existingChallenge.canResend()) {
      const waitSeconds = Math.ceil((existingChallenge.resendCooldownUntil.getTime() - Date.now()) / 1000);
      throw new ValidationError(`Please wait ${waitSeconds} seconds before requesting a new authorization code.`);
    }

    // Invalidate existing challenges for this user + document
    await this.signatureRepo.invalidateChallenges(userId, input.documentId);

    // Compute document integrity hash
    const documentHash = this.computeDocumentHash(input.documentContent);

    // Generate cryptographic 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(otpCode + salt).digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    const resendCooldownUntil = new Date(now.getTime() + 60 * 1000); // 60 seconds

    const challenge = new DocumentSigningChallenge({
      id: crypto.randomUUID(),
      userId,
      documentId: input.documentId,
      documentType: input.documentType,
      documentVersion: input.documentVersion,
      documentHash,
      otpHash,
      salt,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      resendCooldownUntil,
      isConsumed: false,
      createdAt: now
    });

    await this.signatureRepo.saveChallenge(challenge);

    // Dispatch branded email notification
    await this.emailService.sendSigningOtp({
      to: user.email,
      recipientName: user.fullName || 'Authorized Signer',
      documentTitle: input.documentTitle || input.documentId,
      documentReference: input.documentId,
      documentVersion: input.documentVersion,
      otpCode,
      expiryMinutes: 5
    });

    const isTestMode = process.env.NODE_ENV === 'test' || env.email.testMode;

    return {
      challengeId: challenge.id,
      documentId: challenge.documentId,
      documentVersion: challenge.documentVersion,
      documentHash,
      expiresAt: challenge.expiresAt,
      resendAvailableInSeconds: 60,
      maskedEmail: this.maskEmail(user.email),
      debugOtp: isTestMode ? otpCode : undefined
    };
  }

  /**
   * Step 2 of Document Signing: Verify 6-digit OTP, verify document hash, create immutable signature record
   */
  public async verifyAndSignDocument(
    userId: string,
    input: VerifyAndSignInput
  ): Promise<{
    success: boolean;
    signatureRecord: any;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const challenge = await this.signatureRepo.findChallengeById(input.challengeId);
    if (
      !challenge ||
      challenge.userId !== userId ||
      challenge.documentId !== input.documentId ||
      challenge.documentVersion !== input.documentVersion
    ) {
      throw new ValidationError('Invalid or mismatched signature authorization challenge.');
    }

    if (challenge.isConsumed) {
      throw new ValidationError('This authorization challenge has already been used.');
    }

    if (challenge.isExpired()) {
      throw new ValidationError('This authorization code has expired. Please request a new code.');
    }

    if (challenge.isRateLimited()) {
      throw new ValidationError(
        'Too many failed attempts. This authorization code has been invalidated for security. Please request a new one.'
      );
    }

    // Verify document content integrity against challenge hash
    const computedDocHash = this.computeDocumentHash(input.documentContent);
    if (computedDocHash !== challenge.documentHash) {
      throw new ValidationError(
        'Document integrity violation: The document content was altered after the verification challenge was issued.'
      );
    }

    // Verify OTP code
    const isCodeValid = challenge.verifyCode(input.otpCode);
    await this.signatureRepo.saveChallenge(challenge); // Save attempts count

    if (!isCodeValid) {
      const remaining = challenge.getRemainingAttempts();
      if (remaining === 0) {
        throw new ValidationError('Maximum attempts exceeded. This verification challenge has been invalidated.');
      }
      throw new ValidationError(`Invalid authorization code. ${remaining} attempt(s) remaining.`);
    }

    // Code is valid: Mark challenge consumed
    challenge.markConsumed();
    await this.signatureRepo.saveChallenge(challenge);

    // Retrieve active signature profile
    const profile = await this.signatureRepo.findProfileByUserId(userId);
    if (!profile || !profile.isActive) {
      throw new ValidationError('User does not have an active digital signature configured.');
    }

    // Create immutable signed record
    const signatureRecord = new DocumentSignatureRecord({
      id: crypto.randomUUID(),
      documentId: input.documentId,
      documentType: input.documentType,
      documentVersion: input.documentVersion,
      documentHash: computedDocHash,
      signatureProfileId: profile.id,
      signatureProfileVersion: profile.version,
      signatureDataSnapshot: profile.signatureData,
      signatureType: profile.signatureType,
      signerUserId: user.id,
      signerName: user.fullName || 'Authorized Signer',
      signerRole: user.role,
      signerEmail: user.email || '',
      otpChallengeId: challenge.id,
      signedAt: new Date(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      auditMetadata: input.auditMetadata
    });

    await this.signatureRepo.saveSignatureRecord(signatureRecord);

    return {
      success: true,
      signatureRecord: signatureRecord.toJSON()
    };
  }

  /**
   * Get all signatures applied to a document
   */
  public async getDocumentSignatures(documentId: string): Promise<any[]> {
    const records = await this.signatureRepo.findSignatureRecordsByDocumentId(documentId);
    return records.map(r => r.toJSON());
  }

  /**
   * Verify whether a signed document has been tampered with
   */
  public async verifyDocumentIntegrity(
    signatureRecordId: string,
    currentDocumentContent: string
  ): Promise<{
    isValid: boolean;
    recordedHash: string;
    currentHash: string;
    signatureRecord: any;
  }> {
    const record = await this.signatureRepo.findSignatureRecordById(signatureRecordId);
    if (!record) {
      throw new NotFoundError('Signature record not found');
    }

    const currentHash = this.computeDocumentHash(currentDocumentContent);
    const isValid = currentHash === record.documentHash;

    return {
      isValid,
      recordedHash: record.documentHash,
      currentHash,
      signatureRecord: record.toJSON()
    };
  }
}
