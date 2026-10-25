/**
 * SmartShule CBC Management System - Grace Seeds School
 * Phase B: Digital Signature Vault & OTP Authorization Unit Tests
 */

import crypto from 'crypto';
import { DigitalSignatureProfile } from '../../src/core/domain/signature/DigitalSignatureProfile';
import { DocumentSigningChallenge } from '../../src/core/domain/signature/DocumentSigningChallenge';
import { DocumentSignatureRecord } from '../../src/core/domain/signature/DocumentSignatureRecord';
import { EmailTemplateEngine } from '../../src/infrastructure/services/email/EmailTemplateEngine';
import { SignatureUseCases } from '../../src/application/signature/SignatureUseCases';
import { InMemorySignatureRepository } from '../../src/infrastructure/database/in-memory/InMemorySignatureRepository';
import { InMemoryUserRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { EmailService } from '../../src/infrastructure/services/email/EmailService';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';

describe('Phase B: Digital Signature Vault & OTP Unit Tests', () => {
  describe('DigitalSignatureProfile Domain Entity', () => {
    it('requires explicit electronic signing consent to create a profile', () => {
      expect(() => {
        new DigitalSignatureProfile({
          id: 'sig-001',
          userId: 'user-001',
          signatureType: 'DRAWN',
          signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          consentGiven: false,
          consentGivenAt: new Date(),
          isActive: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }).toThrow('Explicit consent is required');
    });

    it('increments version and updates timestamp when signature is replaced', () => {
      const profile = new DigitalSignatureProfile({
        id: 'sig-001',
        userId: 'user-001',
        signatureType: 'DRAWN',
        signatureData: 'data:image/png;base64,initial-sig-data',
        consentGiven: true,
        consentGivenAt: new Date(),
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(profile.version).toBe(1);
      expect(profile.signatureType).toBe('DRAWN');

      profile.updateSignature('TYPED', 'data:image/svg+xml;utf8,<svg></svg>', 'Dancing Script');

      expect(profile.version).toBe(2);
      expect(profile.signatureType).toBe('TYPED');
      expect(profile.fontStyle).toBe('Dancing Script');
      expect(profile.isActive).toBe(true);
    });

    it('can be deactivated successfully', () => {
      const profile = new DigitalSignatureProfile({
        id: 'sig-001',
        userId: 'user-001',
        signatureType: 'UPLOADED',
        signatureData: 'data:image/png;base64,some-data',
        consentGiven: true,
        consentGivenAt: new Date(),
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(profile.isActive).toBe(true);
      profile.deactivate();
      expect(profile.isActive).toBe(false);
    });
  });

  describe('DocumentSigningChallenge Domain Entity', () => {
    const rawOtp = '748291';
    const salt = 'random-salt-1234';
    const otpHash = crypto.createHash('sha256').update(rawOtp + salt).digest('hex');

    it('verifies correct OTP code and rejects incorrect codes', () => {
      const challenge = new DocumentSigningChallenge({
        id: 'chal-001',
        userId: 'user-001',
        documentId: 'doc-report-card-101',
        documentType: 'REPORT_CARD',
        documentVersion: 'v1.0',
        documentHash: 'sha256-hash-document',
        otpHash,
        salt,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
        resendCooldownUntil: new Date(Date.now() + 60 * 1000),
        isConsumed: false,
        createdAt: new Date()
      });

      expect(challenge.verifyCode('000000')).toBe(false);
      expect(challenge.attempts).toBe(1);
      expect(challenge.getRemainingAttempts()).toBe(4);

      expect(challenge.verifyCode(rawOtp)).toBe(true);
    });

    it('enforces brute-force rate limit after 5 failed attempts', () => {
      const challenge = new DocumentSigningChallenge({
        id: 'chal-002',
        userId: 'user-001',
        documentId: 'doc-102',
        documentType: 'FEE_RECEIPT',
        documentVersion: 'v1.0',
        documentHash: 'hash',
        otpHash,
        salt,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendCooldownUntil: new Date(Date.now() + 60 * 1000),
        isConsumed: false,
        createdAt: new Date()
      });

      for (let i = 0; i < 5; i++) {
        expect(challenge.verifyCode('111111')).toBe(false);
      }

      expect(challenge.isRateLimited()).toBe(true);
      expect(challenge.getRemainingAttempts()).toBe(0);

      // Even correct OTP is now rejected because challenge is rate-limited
      expect(challenge.verifyCode(rawOtp)).toBe(false);
    });

    it('rejects expired challenges', () => {
      const expiredChallenge = new DocumentSigningChallenge({
        id: 'chal-003',
        userId: 'user-001',
        documentId: 'doc-103',
        documentType: 'BROADSHEET',
        documentVersion: 'v1.0',
        documentHash: 'hash',
        otpHash,
        salt,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        resendCooldownUntil: new Date(Date.now() - 60000),
        isConsumed: false,
        createdAt: new Date(Date.now() - 300000)
      });

      expect(expiredChallenge.isExpired()).toBe(true);
      expect(expiredChallenge.verifyCode(rawOtp)).toBe(false);
    });

    it('rejects already consumed challenges to prevent replay', () => {
      const challenge = new DocumentSigningChallenge({
        id: 'chal-004',
        userId: 'user-001',
        documentId: 'doc-104',
        documentType: 'PAYROLL_VOUCHER',
        documentVersion: 'v1.0',
        documentHash: 'hash',
        otpHash,
        salt,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendCooldownUntil: new Date(Date.now() + 60 * 1000),
        isConsumed: false,
        createdAt: new Date()
      });

      challenge.markConsumed();
      expect(challenge.isConsumed).toBe(true);
      expect(challenge.verifyCode(rawOtp)).toBe(false);
    });
  });

  describe('EmailTemplateEngine - Signing OTP Template', () => {
    it('renders branded Grace Seeds School 6-digit OTP email with all security metadata', () => {
      const rendered = EmailTemplateEngine.renderSigningOtpEmail({
        to: 'headteacher@smartshule.ac.ke',
        recipientName: 'Sister Grace Ochieng',
        documentTitle: 'Term 3 2026 Master Broadsheet',
        documentReference: 'BROADSHEET-2026-T3-G7',
        documentVersion: 'v2.1',
        otpCode: '852963',
        expiryMinutes: 5
      });

      expect(rendered.subject).toContain('852963');
      expect(rendered.subject).toContain('Grace Seeds School');
      expect(rendered.html).toContain('Sister Grace Ochieng');
      expect(rendered.html).toContain('Term 3 2026 Master Broadsheet');
      expect(rendered.html).toContain('BROADSHEET-2026-T3-G7');
      expect(rendered.html).toContain('852963');
      expect(rendered.html).toContain('Valid for 5 minutes');
      expect(rendered.html).toContain('Do not share this authorization code with anyone');
      expect(rendered.text).toContain('YOUR 6-DIGIT AUTHORIZATION CODE IS: 852963');
    });
  });

  describe('SignatureUseCases - Document Integrity & Tampering Protection', () => {
    let signatureRepo: InMemorySignatureRepository;
    let userRepo: InMemoryUserRepository;
    let emailService: EmailService;
    let useCases: SignatureUseCases;
    let testUser: User;

    beforeEach(async () => {
      signatureRepo = new InMemorySignatureRepository();
      userRepo = new InMemoryUserRepository();
      emailService = new EmailService();
      useCases = new SignatureUseCases(signatureRepo, userRepo, emailService);

      testUser = new User(
        {
          email: 'principal@smartshule.ac.ke',
          passwordHash: '$2b$10$hashed',
          firstName: 'Sister',
          lastName: 'Ochieng',
          role: UserRole.HEAD_TEACHER,
          status: UserStatus.ACTIVE,
          schoolId: 'school-001'
        },
        'user-principal-001'
      );
      await userRepo.save(testUser);

      // Save an active digital signature
      await useCases.saveSignatureProfile(testUser.id, {
        signatureType: 'DRAWN',
        signatureData: 'data:image/png;base64,signature-sample-bytes',
        consentConfirmed: true
      });
    });

    it('rejects signing when document content is modified after challenge issuance', async () => {
      const initialDoc = JSON.stringify({
        student: 'Faith Achieng',
        grade: 'Grade 7',
        totalMarks: 450,
        meanGrade: 'EE'
      });

      const challenge = await useCases.initiateSigningChallenge(testUser.id, {
        documentId: 'REPORT-101',
        documentType: 'REPORT_CARD',
        documentVersion: 'v1',
        documentTitle: 'Term 3 Report Card',
        documentContent: initialDoc
      });

      expect(challenge.challengeId).toBeDefined();
      expect(challenge.debugOtp).toBeDefined();

      const tamperedDoc = JSON.stringify({
        student: 'Faith Achieng',
        grade: 'Grade 7',
        totalMarks: 490, // Tampered marks!
        meanGrade: 'EE'
      });

      await expect(
        useCases.verifyAndSignDocument(testUser.id, {
          challengeId: challenge.challengeId,
          otpCode: challenge.debugOtp!,
          documentId: 'REPORT-101',
          documentType: 'REPORT_CARD',
          documentVersion: 'v1',
          documentContent: tamperedDoc // Mismatched content!
        })
      ).rejects.toThrow('Document integrity violation');
    });

    it('signs successfully with untampered document and creates immutable snapshot', async () => {
      const validDoc = JSON.stringify({
        student: 'Faith Achieng',
        grade: 'Grade 7',
        totalMarks: 450,
        meanGrade: 'EE'
      });

      const challenge = await useCases.initiateSigningChallenge(testUser.id, {
        documentId: 'REPORT-101',
        documentType: 'REPORT_CARD',
        documentVersion: 'v1',
        documentTitle: 'Term 3 Report Card',
        documentContent: validDoc
      });

      const signResult = await useCases.verifyAndSignDocument(testUser.id, {
        challengeId: challenge.challengeId,
        otpCode: challenge.debugOtp!,
        documentId: 'REPORT-101',
        documentType: 'REPORT_CARD',
        documentVersion: 'v1',
        documentContent: validDoc
      });

      expect(signResult.success).toBe(true);
      expect(signResult.signatureRecord.documentId).toBe('REPORT-101');
      expect(signResult.signatureRecord.signerName).toBe('Sister Ochieng');
      expect(signResult.signatureRecord.signatureDataSnapshot).toBe('data:image/png;base64,signature-sample-bytes');

      // Subsequent update to the user's profile should NOT alter the historical snapshot
      await useCases.saveSignatureProfile(testUser.id, {
        signatureType: 'TYPED',
        signatureData: 'data:image/svg+xml;new-sig',
        fontStyle: 'Dancing Script',
        consentConfirmed: true
      });

      const signatures = await useCases.getDocumentSignatures('REPORT-101');
      expect(signatures).toHaveLength(1);
      expect(signatures[0].signatureDataSnapshot).toBe('data:image/png;base64,signature-sample-bytes');
      expect(signatures[0].signatureProfileVersion).toBe(1);
    });
  });
});
