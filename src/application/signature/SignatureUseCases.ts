import crypto from 'crypto';
import { ISignatureRepository } from '../../core/ports/repositories/ISignatureRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IEmailService } from '../../core/ports/services/IEmailService';
import { DigitalSignatureProfile, SignatureType } from '../../core/domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../core/domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../core/domain/signature/DocumentSignatureRecord';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../../core/domain/shared/Errors';
import { env } from '../../infrastructure/config/env';
import { SigningPolicy, SigningPolicyProps, getDefaultSigningPolicies } from '../../core/domain/signature/SigningPolicy';
import { DocumentSigningBatch, BatchStatus } from '../../core/domain/signature/DocumentSigningBatch';
import { DocumentSigningBatchItem, BatchItemStatus } from '../../core/domain/signature/DocumentSigningBatchItem';

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

export interface PrepareBulkSigningBatchInput {
  documentType: string;
  scopeDescription: string;
  items: Array<{
    documentId: string;
    documentTitle: string;
    studentId?: string;
    studentName?: string;
    documentVersion: string;
    documentContent: string;
  }>;
}

export interface InitiateBulkSigningChallengeInput {
  batchId: string;
  batchDigest: string;
}

export interface ExecuteBulkSigningInput {
  batchId: string;
  challengeId: string;
  otpCode: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RetryFailedBatchItemsInput {
  batchId: string;
  challengeId: string;
  otpCode: string;
  ipAddress?: string;
  userAgent?: string;
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

  // ==========================================
  // POLICY & MULTI-SIGNATORY ENGINE
  // ==========================================

  /**
   * Retrieves signing policy for a document type, falling back to built-in default
   */
  public async getSigningPolicy(documentType: string): Promise<any> {
    const policy = await this.signatureRepo.findPolicyByDocumentType(documentType);
    if (policy) {
      return policy.toJSON();
    }
    const defaultPol = getDefaultSigningPolicies().find(p => p.documentType === documentType);
    if (defaultPol) {
      return defaultPol;
    }
    // Generic fallback policy
    return {
      id: `pol-${documentType.toLowerCase()}`,
      documentType,
      title: `${documentType.replace(/_/g, ' ')}`,
      description: 'Standard document signing policy',
      requiresSignature: true,
      allowedRoles: ['SUPER_ADMIN', 'HEAD_TEACHER', 'PRINCIPAL', 'BURSAR', 'TEACHER', 'CLASS_TEACHER'],
      requiredSignaturesCount: 1,
      signingOrder: 'PARALLEL',
      allowBulkSigning: true,
      placements: [
        {
          role: 'SIGNER',
          label: 'Authorized Signatory',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 120,
          yMm: 250,
          widthMm: 45,
          heightMm: 15,
          order: 1,
          isRequired: true
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * List all configured document signing policies
   */
  public async listSigningPolicies(): Promise<any[]> {
    const policies = await this.signatureRepo.listPolicies();
    return policies.map(p => p.toJSON());
  }

  /**
   * Configure or update a document signing policy (Admin only)
   */
  public async configureSigningPolicy(
    userContext: { userId: string; role: string },
    policyData: Partial<SigningPolicyProps> & { documentType: string }
  ): Promise<any> {
    const role = (userContext.role || '').toUpperCase();
    if (role !== 'SUPER_ADMIN' && role !== 'DIRECTOR' && role !== 'HEAD_TEACHER') {
      throw new ForbiddenError('Only Super Admin, Director, or Head Teacher can configure document signing policies.');
    }

    let policy = await this.signatureRepo.findPolicyByDocumentType(policyData.documentType);
    if (policy) {
      policy.updatePolicy({
        title: policyData.title,
        description: policyData.description,
        requiresSignature: policyData.requiresSignature,
        allowedRoles: policyData.allowedRoles,
        requiredSignaturesCount: policyData.requiredSignaturesCount,
        signingOrder: policyData.signingOrder,
        allowBulkSigning: policyData.allowBulkSigning,
        placements: policyData.placements
      });
    } else {
      policy = new SigningPolicy({
        id: crypto.randomUUID(),
        documentType: policyData.documentType,
        title: policyData.title || policyData.documentType,
        description: policyData.description || '',
        requiresSignature: policyData.requiresSignature ?? true,
        allowedRoles: policyData.allowedRoles || ['SUPER_ADMIN', 'HEAD_TEACHER'],
        requiredSignaturesCount: policyData.requiredSignaturesCount || 1,
        signingOrder: policyData.signingOrder || 'PARALLEL',
        allowBulkSigning: policyData.allowBulkSigning ?? false,
        placements: policyData.placements || [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await this.signatureRepo.savePolicy(policy);
    return policy.toJSON();
  }

  /**
   * List signed records with optional filtering
   */
  public async listSignatureRecords(filter?: {
    limit?: number;
    offset?: number;
    signerId?: string;
    documentId?: string;
    documentType?: string;
  }): Promise<any[]> {
    let records: DocumentSignatureRecord[] = [];
    if (filter?.documentId) {
      records = await this.signatureRepo.findSignatureRecordsByDocumentId(filter.documentId);
    } else if (filter?.signerId) {
      records = await this.signatureRepo.findSignatureRecordsBySignerId(filter.signerId);
    } else {
      records = await this.signatureRepo.listAllSignatureRecords(filter?.limit || 100, filter?.offset || 0);
    }

    if (filter?.documentType) {
      records = records.filter(r => r.documentType === filter.documentType);
    }

    return records.map(r => r.toJSON());
  }

  // ==========================================
  // BULK SIGNING ENGINE
  // ==========================================

  /**
   * Computes a cryptographic digest over a collection of document items
   */
  public computeBatchDigest(
    items: Array<{ documentId: string; documentVersion: string; documentHash: string }>
  ): string {
    const normalized = items
      .slice()
      .sort((a, b) => a.documentId.localeCompare(b.documentId))
      .map(i => `${i.documentId}:${i.documentVersion}:${i.documentHash}`)
      .join('|');

    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Stage 1: Prepares a bulk signing batch, evaluates eligibility per document
   */
  public async prepareBulkSigningBatch(
    userId: string,
    userRole: string,
    input: PrepareBulkSigningBatchInput
  ): Promise<{
    batch: any;
    items: any[];
    summary: {
      total: number;
      ready: number;
      blocked: number;
    };
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.email) {
      throw new ValidationError('A verified email address is required for document signing.');
    }

    const profile = await this.signatureRepo.findProfileByUserId(userId);
    if (!profile || !profile.isActive) {
      throw new ValidationError('No active digital signature configured. Please set up your signature in My Digital Signature.');
    }

    // Check policy permissions
    const rawPolicy = await this.getSigningPolicy(input.documentType);
    const policy = new SigningPolicy(rawPolicy);

    if (!policy.isRoleAllowed(userRole)) {
      throw new ForbiddenError(`User role "${userRole}" is not authorized to sign documents of type "${input.documentType}".`);
    }

    if (!policy.allowBulkSigning) {
      throw new ValidationError(`Bulk signing is not permitted for document type "${input.documentType}".`);
    }

    if (!input.items || input.items.length === 0) {
      throw new ValidationError('At least one document item must be supplied to create a bulk signing batch.');
    }

    const batchId = crypto.randomUUID();
    const batchItems: DocumentSigningBatchItem[] = [];

    // Evaluate each document's eligibility
    for (const item of input.items) {
      const docHash = this.computeDocumentHash(item.documentContent);
      const existingSignatures = await this.signatureRepo.findSignatureRecordsByDocumentId(item.documentId);

      let status: BatchItemStatus = 'READY';
      let failureReason: string | undefined;

      // Check if current user or role already signed
      const alreadySignedByRole = existingSignatures.some(s => {
        const sr = s.signerRole.toUpperCase();
        const ur = userRole.toUpperCase();
        return sr === ur || ((ur === 'TEACHER' || ur === 'CLASS_TEACHER') && (sr === 'TEACHER' || sr === 'CLASS_TEACHER'));
      });

      if (alreadySignedByRole) {
        status = 'BLOCKED';
        failureReason = `Already signed by role ${userRole}`;
      } else if (policy.signingOrder === 'SEQUENTIAL') {
        // Find placement for current role
        const myPlacement = policy.placements.find(p => {
          const pr = p.role.toUpperCase();
          const ur = userRole.toUpperCase();
          return pr === ur || ((ur === 'TEACHER' || ur === 'CLASS_TEACHER') && (pr === 'TEACHER' || pr === 'CLASS_TEACHER'));
        });
        if (myPlacement && myPlacement.order > 1) {
          // Check prior required signatures
          const priorRequired = policy.placements.filter(
            p => p.order < myPlacement.order && p.isRequired
          );
          for (const prior of priorRequired) {
            const hasPrior = existingSignatures.some(s => {
              const sr = s.signerRole.toUpperCase();
              const pr = prior.role.toUpperCase();
              return sr === pr || ((sr === 'TEACHER' || sr === 'CLASS_TEACHER') && (pr === 'TEACHER' || pr === 'CLASS_TEACHER'));
            });
            if (!hasPrior) {
              status = 'BLOCKED';
              failureReason = `Awaiting prior signature from ${prior.label}`;
              break;
            }
          }
        }
      }

      batchItems.push(
        new DocumentSigningBatchItem({
          id: crypto.randomUUID(),
          batchId,
          documentId: item.documentId,
          documentTitle: item.documentTitle || item.documentId,
          studentId: item.studentId,
          studentName: item.studentName,
          documentVersion: item.documentVersion || '1.0',
          documentHash: docHash,
          status,
          failureReason,
          createdAt: new Date()
        })
      );
    }

    // Compute batch digest over READY items (or all items if none ready)
    const digestCandidateItems = batchItems.filter(i => i.status === 'READY');
    const itemsForDigest = digestCandidateItems.length > 0 ? digestCandidateItems : batchItems;
    const batchDigest = this.computeBatchDigest(
      itemsForDigest.map(i => ({
        documentId: i.documentId,
        documentVersion: i.documentVersion,
        documentHash: i.documentHash
      }))
    );

    const batch = new DocumentSigningBatch({
      id: batchId,
      userId,
      signatoryRole: userRole,
      documentType: input.documentType,
      scopeDescription: input.scopeDescription,
      totalCount: batchItems.length,
      signedCount: 0,
      failedCount: 0,
      status: 'PREPARED',
      batchDigest,
      createdAt: new Date()
    });

    await this.signatureRepo.saveBatch(batch);
    await this.signatureRepo.saveBatchItems(batchItems);

    return {
      batch: batch.toJSON(),
      items: batchItems.map(i => i.toJSON()),
      summary: {
        total: batchItems.length,
        ready: batchItems.filter(i => i.status === 'READY').length,
        blocked: batchItems.filter(i => i.status === 'BLOCKED').length
      }
    };
  }

  /**
   * Stage 2: Dispatches single 6-digit OTP challenge for an entire bulk batch
   */
  public async initiateBulkSigningChallenge(
    userId: string,
    input: InitiateBulkSigningChallengeInput
  ): Promise<{
    challengeId: string;
    batchId: string;
    expiresAt: Date;
    resendAvailableInSeconds: number;
    maskedEmail: string;
    debugOtp?: string;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.email) {
      throw new ValidationError('A verified email address is required.');
    }

    const batch = await this.signatureRepo.findBatchById(input.batchId);
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    if (batch.userId !== userId) {
      throw new ForbiddenError('You are not authorized to sign this batch.');
    }

    const items = await this.signatureRepo.findBatchItems(batch.id);
    const readyItems = items.filter(i => i.status === 'READY');
    if (readyItems.length === 0) {
      throw new ValidationError('No documents in this batch are eligible/ready for signing.');
    }

    // Verify batch digest stability
    const currentDigest = this.computeBatchDigest(
      readyItems.map(i => ({
        documentId: i.documentId,
        documentVersion: i.documentVersion,
        documentHash: i.documentHash
      }))
    );

    if (currentDigest !== input.batchDigest || currentDigest !== batch.batchDigest) {
      throw new ValidationError('Batch digest mismatch: Document contents or selection changed after preparation.');
    }

    // Invalidate existing challenge on this batch
    await this.signatureRepo.invalidateChallenges(userId, batch.id);

    // Generate cryptographic OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = crypto.createHash('sha256').update(otpCode + salt).digest('hex');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const resendCooldownUntil = new Date(now.getTime() + 60 * 1000);

    const challenge = new DocumentSigningChallenge({
      id: crypto.randomUUID(),
      userId,
      documentId: batch.id,
      documentType: 'BULK_BATCH',
      documentVersion: '1.0',
      documentHash: batch.batchDigest,
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

    batch.bindChallenge(challenge.id);
    await this.signatureRepo.saveBatch(batch);

    // Send email
    await this.emailService.sendSigningOtp({
      to: user.email,
      recipientName: user.fullName || 'Authorized Signer',
      documentTitle: `Bulk Signing: ${batch.scopeDescription} (${readyItems.length} documents)`,
      documentReference: batch.id,
      documentVersion: '1.0',
      otpCode,
      expiryMinutes: 5
    });

    const isTestMode = process.env.NODE_ENV === 'test' || env.email.testMode;

    return {
      challengeId: challenge.id,
      batchId: batch.id,
      expiresAt: challenge.expiresAt,
      resendAvailableInSeconds: 60,
      maskedEmail: this.maskEmail(user.email),
      debugOtp: isTestMode ? otpCode : undefined
    };
  }

  /**
   * Stage 3: Verifies OTP and executes signing across all READY items in the batch
   */
  public async executeBulkSigning(
    userId: string,
    input: ExecuteBulkSigningInput
  ): Promise<{
    batch: any;
    items: any[];
    summary: {
      totalCount: number;
      signedCount: number;
      failedCount: number;
      status: string;
    };
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const batch = await this.signatureRepo.findBatchById(input.batchId);
    if (!batch) throw new NotFoundError('Batch not found');
    if (batch.userId !== userId) throw new ForbiddenError('You are not authorized to sign this batch.');

    const challenge = await this.signatureRepo.findChallengeById(input.challengeId);
    if (
      !challenge ||
      challenge.userId !== userId ||
      challenge.documentId !== batch.id ||
      challenge.documentType !== 'BULK_BATCH'
    ) {
      throw new ValidationError('Invalid or mismatched bulk signing authorization challenge.');
    }

    if (challenge.isConsumed) throw new ValidationError('This authorization challenge has already been used.');
    if (challenge.isExpired()) throw new ValidationError('This authorization code has expired. Please request a new code.');
    if (challenge.isRateLimited()) throw new ValidationError('Too many failed attempts. This code has been invalidated.');

    // Verify OTP code
    const isCodeValid = challenge.verifyCode(input.otpCode);
    await this.signatureRepo.saveChallenge(challenge);

    if (!isCodeValid) {
      const remaining = challenge.getRemainingAttempts();
      if (remaining === 0) {
        throw new ValidationError('Maximum attempts exceeded. This authorization challenge has been invalidated.');
      }
      throw new ValidationError(`Invalid authorization code. ${remaining} attempt(s) remaining.`);
    }

    // Mark challenge consumed
    challenge.markConsumed();
    await this.signatureRepo.saveChallenge(challenge);

    // Retrieve active signature profile
    const profile = await this.signatureRepo.findProfileByUserId(userId);
    if (!profile || !profile.isActive) {
      throw new ValidationError('User does not have an active digital signature configured.');
    }

    batch.startProcessing();
    await this.signatureRepo.saveBatch(batch);

    const items = await this.signatureRepo.findBatchItems(batch.id);

    // Execute signing on READY items
    for (const item of items) {
      if (item.status !== 'READY') continue;

      try {
        const signatureRecord = new DocumentSignatureRecord({
          id: crypto.randomUUID(),
          documentId: item.documentId,
          documentType: batch.documentType,
          documentVersion: item.documentVersion,
          documentHash: item.documentHash,
          signatureProfileId: profile.id,
          signatureProfileVersion: profile.version,
          signatureDataSnapshot: profile.signatureData,
          signatureType: profile.signatureType,
          signerUserId: user.id,
          signerName: user.fullName || 'Authorized Signer',
          signerRole: batch.signatoryRole,
          signerEmail: user.email || '',
          otpChallengeId: challenge.id,
          signedAt: new Date(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          auditMetadata: {
            batchId: batch.id,
            documentTitle: item.documentTitle,
            studentId: item.studentId,
            studentName: item.studentName
          }
        });

        await this.signatureRepo.saveSignatureRecord(signatureRecord);
        item.markSigned(signatureRecord.id);
        batch.updateCounters(1, 0);
      } catch (err: any) {
        item.markFailed(err.message || 'Signature application failed');
        batch.updateCounters(0, 1);
      }

      await this.signatureRepo.updateBatchItem(item);
    }

    batch.completeExecution();
    await this.signatureRepo.saveBatch(batch);

    return {
      batch: batch.toJSON(),
      items: items.map(i => i.toJSON()),
      summary: {
        totalCount: batch.totalCount,
        signedCount: batch.signedCount,
        failedCount: batch.failedCount,
        status: batch.status
      }
    };
  }

  /**
   * Retries signing only FAILED items in an existing batch
   */
  public async retryFailedBatchItems(
    userId: string,
    input: RetryFailedBatchItemsInput
  ): Promise<{
    batch: any;
    items: any[];
    summary: {
      totalCount: number;
      signedCount: number;
      failedCount: number;
      status: string;
    };
  }> {
    const items = await this.signatureRepo.findBatchItems(input.batchId);
    const failedItems = items.filter(i => i.status === 'FAILED');

    if (failedItems.length === 0) {
      throw new ValidationError('No failed items found in this batch to retry.');
    }

    // Reset failed items to READY
    for (const item of failedItems) {
      item.resetForRetry();
      await this.signatureRepo.updateBatchItem(item);
    }

    // Execute standard signing
    return this.executeBulkSigning(userId, {
      batchId: input.batchId,
      challengeId: input.challengeId,
      otpCode: input.otpCode,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
  }

  /**
   * Retrieves batch details and item statuses
   */
  public async getBatchDetails(userId: string, batchId: string): Promise<any> {
    const batch = await this.signatureRepo.findBatchById(batchId);
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }
    const items = await this.signatureRepo.findBatchItems(batchId);
    return {
      batch: batch.toJSON(),
      items: items.map(i => i.toJSON())
    };
  }

  /**
   * Retrieves user's bulk signing history
   */
  public async listUserBatches(userId: string): Promise<any[]> {
    const batches = await this.signatureRepo.findBatchesByUserId(userId);
    return batches.map(b => b.toJSON());
  }
}
