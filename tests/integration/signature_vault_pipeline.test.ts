/**
 * SmartShule CBC Management System - Grace Seeds School
 * Phase B: Complete Digital Signature Vault & OTP Pipeline Integration Tests
 */

import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';

describe('Phase B: Digital Signature Vault & OTP Pipeline Integration Tests', () => {
  let app: any;
  let container: AppContainer;
  let testUser: User;
  let authToken: string;

  const validTestDocument = JSON.stringify({
    title: 'Grade 8 Term 3 Official Broadsheet',
    academicYear: '2026',
    term: 'Term 3',
    schoolId: 'school-001',
    timestamp: '2026-10-25T12:00:00Z',
    records: [
      { studentId: 'GS-001', studentName: 'Kelvin Mutua', averageScore: 84.5 }
    ]
  });

  beforeAll(async () => {
    container = new AppContainer();
    app = createExpressApp(container);

    // Create a staff user for testing
    const passwordHash = await container.passwordHasher.hash('StrongPass123!');
    testUser = new User(
      {
        email: 'deputy.academic@smartshule.ac.ke',
        passwordHash,
        firstName: 'John',
        lastName: 'Otieno',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'user-deputy-001'
    );
    await container.userRepository.save(testUser);

    // Obtain authentication JWT
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'deputy.academic@smartshule.ac.ke',
        password: 'StrongPass123!'
      });

    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.data.accessToken;
    expect(authToken).toBeDefined();
  });

  describe('1. Signature Profile Status and Prerequisites', () => {
    it('returns unconfigured status when user has not yet set up a signature', async () => {
      const res = await request(app)
        .get('/api/v1/signatures/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isConfigured).toBe(false);
      expect(res.body.data.emailVerified).toBe(true);
      expect(res.body.data.email).toBe('deputy.academic@smartshule.ac.ke');
    });

    it('rejects initiating a signing challenge if user has no configured signature', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/challenge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId: 'DOC-BROADSHEET-2026-T3',
          documentType: 'BROADSHEET',
          documentVersion: 'v1.0',
          documentTitle: 'Grade 8 Term 3 Official Broadsheet',
          documentContent: validTestDocument
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No active digital signature found');
    });
  });

  describe('2. Configuring Signature in Vault with Consent', () => {
    it('rejects saving a signature profile when electronic signing consent is false', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureType: 'DRAWN',
          signatureData: 'data:image/png;base64,sample-signature-data',
          consentConfirmed: false
        });

      expect(res.status).toBe(400);
    });

    it('successfully configures drawn digital signature with explicit electronic consent', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureType: 'DRAWN',
          signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          consentConfirmed: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signatureType).toBe('DRAWN');
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.version).toBe(1);
    });

    it('confirms signature is now configured and active in GET /me', async () => {
      const res = await request(app)
        .get('/api/v1/signatures/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isConfigured).toBe(true);
      expect(res.body.data.profile.version).toBe(1);
    });
  });

  describe('3. Initiating Document Signing Challenge with 6-Digit Email OTP', () => {
    let challengeId: string;
    let generatedOtp: string;

    it('initiates challenge, sends 6-digit OTP email, returns masked email and cooldown', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/challenge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId: 'DOC-BROADSHEET-2026-T3',
          documentType: 'BROADSHEET',
          documentVersion: 'v1.0',
          documentTitle: 'Grade 8 Term 3 Official Broadsheet',
          documentContent: validTestDocument
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.challengeId).toBeDefined();
      expect(res.body.data.documentHash).toBeDefined();
      expect(res.body.data.maskedEmail).toContain('@smartshule.ac.ke');
      expect(res.body.data.debugOtp).toMatch(/^\d{6}$/);

      challengeId = res.body.data.challengeId;
      generatedOtp = res.body.data.debugOtp;
    });

    it('enforces 60-second cooldown preventing immediate resend spam', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/challenge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId: 'DOC-BROADSHEET-2026-T3',
          documentType: 'BROADSHEET',
          documentVersion: 'v1.0',
          documentTitle: 'Grade 8 Term 3 Official Broadsheet',
          documentContent: validTestDocument
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Please wait');
      expect(res.body.message).toContain('seconds before requesting a new authorization code');
    });

    it('rejects verification if document content has been tampered with', async () => {
      const tamperedDocument = JSON.stringify({
        title: 'Grade 8 Term 3 Official Broadsheet - FORGED',
        academicYear: '2026',
        term: 'Term 3',
        schoolId: 'school-001',
        timestamp: '2026-10-25T12:00:00Z',
        records: [
          { studentId: 'GS-001', studentName: 'Kelvin Mutua', averageScore: 99.9 }
        ]
      });

      const res = await request(app)
        .post('/api/v1/signatures/verify-and-sign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId,
          otpCode: generatedOtp,
          documentId: 'DOC-BROADSHEET-2026-T3',
          documentType: 'BROADSHEET',
          documentVersion: 'v1.0',
          documentContent: tamperedDocument // Tampered!
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Document integrity violation');
    });

    it('rejects incorrect OTP code and decrements remaining attempts', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/verify-and-sign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId,
          otpCode: '000000',
          documentId: 'DOC-BROADSHEET-2026-T3',
          documentType: 'BROADSHEET',
          documentVersion: 'v1.0',
          documentContent: validTestDocument
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid authorization code');
      expect(res.body.message).toContain('attempt(s) remaining');
    });

    it('applies signature successfully when correct OTP is provided', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/verify-and-sign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId,
          otpCode: generatedOtp,
          documentId: 'DOC-BROADSHEET-2026-T3',
          documentType: 'BROADSHEET',
          documentVersion: 'v1.0',
          documentContent: validTestDocument,
          auditMetadata: { clientPlatform: 'SmartShule Web Portal', session: 'test-session-1' }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signatureRecord.documentId).toBe('DOC-BROADSHEET-2026-T3');
      expect(res.body.data.signatureRecord.signerName).toBe('John Otieno');
      expect(res.body.data.signatureRecord.signerEmail).toBe('deputy.academic@smartshule.ac.ke');
      expect(res.body.data.signatureRecord.otpChallengeId).toBe(challengeId);
      expect(res.body.data.signatureRecord.signedAt).toBeDefined();
    });

    it('prevents replay attack using the same challenge after consumption', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/verify-and-sign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          challengeId,
          otpCode: generatedOtp,
          documentId: 'DOC-BROADSHEET-2026-T3',
          documentType: 'BROADSHEET',
          documentVersion: 'v1.0',
          documentContent: validTestDocument
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been used');
    });
  });

  describe('4. Historical Signatures and Vault Isolation', () => {
    it('retrieves signed records for the document via GET /records/:documentId', async () => {
      const res = await request(app)
        .get('/api/v1/signatures/records/DOC-BROADSHEET-2026-T3')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].documentId).toBe('DOC-BROADSHEET-2026-T3');
      expect(res.body.data[0].signatureProfileVersion).toBe(1);
    });

    it('verifies that replacing a signature does not corrupt past signed document records', async () => {
      // User updates signature to a TYPED cursive style
      const updateRes = await request(app)
        .post('/api/v1/signatures/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureType: 'TYPED',
          signatureData: 'data:image/svg+xml;utf8,<svg><text>John Otieno</text></svg>',
          fontStyle: 'Great Vibes',
          consentConfirmed: true
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.version).toBe(2);

      // Verify historical record still points to version 1 with original snapshot
      const recordsRes = await request(app)
        .get('/api/v1/signatures/records/DOC-BROADSHEET-2026-T3')
        .set('Authorization', `Bearer ${authToken}`);

      expect(recordsRes.status).toBe(200);
      expect(recordsRes.body.data[0].signatureProfileVersion).toBe(1);
      expect(recordsRes.body.data[0].signatureType).toBe('DRAWN');
    });

    it('verifies document integrity check endpoint detects intact documents', async () => {
      const recordsRes = await request(app)
        .get('/api/v1/signatures/records/DOC-BROADSHEET-2026-T3')
        .set('Authorization', `Bearer ${authToken}`);

      const recordId = recordsRes.body.data[0].id;

      const verifyRes = await request(app)
        .post('/api/v1/signatures/verify-document')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureRecordId: recordId,
          documentContent: validTestDocument
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
    });
  });
});
