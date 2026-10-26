/**
 * SmartShule CBC Management System - Grace Seeds School
 * Universal Document Signing & Bulk Approval Pipeline Integration Tests
 */

import request from 'supertest';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { AppContainer } from '../../src/infrastructure/container';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';

describe('Universal Document Signing & Bulk Approval Pipeline Integration Tests', () => {
  let app: any;
  let container: AppContainer;

  let headteacherToken: string;
  let teacherToken: string;
  let bursarToken: string;

  let headteacherUser: User;
  let teacherUser: User;
  let bursarUser: User;

  beforeAll(async () => {
    container = new AppContainer();
    app = createExpressApp(container);

    const passwordHash = await container.passwordHasher.hash('StrongPass123!');

    // 1. Create Head Teacher (Dr. Julius Omondi)
    headteacherUser = new User(
      {
        email: 'headteacher.pipeline@smartshule.ac.ke',
        passwordHash,
        firstName: 'Julius',
        lastName: 'Omondi',
        role: UserRole.HEAD_TEACHER,
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-head-pipe'
    );
    await container.userRepository.save(headteacherUser);

    // 2. Create Class Teacher (Sarah Mwangi)
    teacherUser = new User(
      {
        email: 'teacher.pipeline@smartshule.ac.ke',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Mwangi',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-teacher-pipe'
    );
    await container.userRepository.save(teacherUser);

    // 3. Create Bursar (Grace Wanjiku)
    bursarUser = new User(
      {
        email: 'bursar.pipeline@smartshule.ac.ke',
        passwordHash,
        firstName: 'Grace',
        lastName: 'Wanjiku',
        role: UserRole.BURSAR,
        status: UserStatus.ACTIVE,
        schoolId: 'school-001'
      },
      'usr-bursar-pipe'
    );
    await container.userRepository.save(bursarUser);

    // Login each user
    const headRes = await request(app).post('/api/v1/auth/login').send({
      email: 'headteacher.pipeline@smartshule.ac.ke',
      password: 'StrongPass123!'
    });
    headteacherToken = headRes.body.data.accessToken;

    const teacherRes = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher.pipeline@smartshule.ac.ke',
      password: 'StrongPass123!'
    });
    teacherToken = teacherRes.body.data.accessToken;

    const bursarRes = await request(app).post('/api/v1/auth/login').send({
      email: 'bursar.pipeline@smartshule.ac.ke',
      password: 'StrongPass123!'
    });
    bursarToken = bursarRes.body.data.accessToken;

    // Configure digital signatures for all three users
    const sampleSig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await request(app)
      .post('/api/v1/signatures/me')
      .set('Authorization', `Bearer ${headteacherToken}`)
      .send({ signatureType: 'TYPED', signatureData: sampleSig, fontStyle: 'Caveat', consentConfirmed: true });

    await request(app)
      .post('/api/v1/signatures/me')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ signatureType: 'DRAWN', signatureData: sampleSig, consentConfirmed: true });

    await request(app)
      .post('/api/v1/signatures/me')
      .set('Authorization', `Bearer ${bursarToken}`)
      .send({ signatureType: 'UPLOADED', signatureData: sampleSig, consentConfirmed: true });
  });

  describe('1. Policies API Endpoints', () => {
    it('GET /api/v1/signatures/policies returns list of default document signing policies', async () => {
      const res = await request(app)
        .get('/api/v1/signatures/policies')
        .set('Authorization', `Bearer ${headteacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(8);

      const docTypes = res.body.data.map((p: any) => p.documentType);
      expect(docTypes).toContain('REPORT_CARD');
      expect(docTypes).toContain('BROADSHEET');
      expect(docTypes).toContain('FEE_STATEMENT');
      expect(docTypes).toContain('PAYROLL_VOUCHER');
    });

    it('GET /api/v1/signatures/policies/:documentType returns policy details with placements', async () => {
      const res = await request(app)
        .get('/api/v1/signatures/policies/REPORT_CARD')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.documentType).toBe('REPORT_CARD');
      expect(res.body.data.signingOrder).toBe('SEQUENTIAL');
      expect(res.body.data.placements.length).toBe(2);
    });

    it('POST /api/v1/signatures/policies updates policy when called by authorized Head Teacher', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/policies')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          documentType: 'REPORT_CARD',
          title: 'Grace Seeds School CBC Report Dossier',
          requiredSignaturesCount: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Grace Seeds School CBC Report Dossier');
    });

    it('POST /api/v1/signatures/policies denies unauthorized non-admin staff', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/policies')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          documentType: 'REPORT_CARD',
          title: 'Unauthorized Update'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('2. Bulk Signing Pipeline: 10 PP1 Learners Batch', () => {
    let preparedBatchId: string;
    let batchDigest: string;
    let challengeId: string;
    let otpCode: string;

    const samplePupils = Array.from({ length: 10 }, (_, i) => ({
      documentId: `PP1-DOC-${i + 1}`,
      documentTitle: `Learner ${i + 1} Assessment Report`,
      studentId: `std-${i + 1}`,
      studentName: `Learner ${i + 1}`,
      documentVersion: '1.0',
      documentContent: `Assessment details for learner ${i + 1} Term 1 2026: Exceeding Expectations in all CBC strands.`
    }));

    it('Step 1: Class Teacher prepares bulk batch for 10 PP1 pupils', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/bulk/prepare')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          documentType: 'REPORT_CARD',
          scopeDescription: 'PP1 Term 1 2026 Report Cards (10 pupils)',
          items: samplePupils
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total).toBe(10);
      expect(res.body.data.summary.ready).toBe(10);
      expect(res.body.data.summary.blocked).toBe(0);

      preparedBatchId = res.body.data.batch.id;
      batchDigest = res.body.data.batch.batchDigest;
      expect(preparedBatchId).toBeDefined();
      expect(batchDigest).toBeDefined();
    });

    it('Step 2: Class Teacher initiates 6-digit email OTP challenge for the batch', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/bulk/challenge')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          batchId: preparedBatchId,
          batchDigest
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.challengeId).toBeDefined();
      expect(res.body.data.maskedEmail).toMatch(/^t\*+e@smartshule\.ac\.ke$/);

      challengeId = res.body.data.challengeId;
      otpCode = res.body.data.debugOtp;
      expect(otpCode).toBeDefined();
      expect(otpCode.length).toBe(6);
    });

    it('Step 3: Class Teacher submits OTP code to execute bulk signing across all 10 pupils', async () => {
      const res = await request(app)
        .post('/api/v1/signatures/bulk/execute')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          batchId: preparedBatchId,
          challengeId,
          otpCode
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalCount).toBe(10);
      expect(res.body.data.summary.signedCount).toBe(10);
      expect(res.body.data.summary.failedCount).toBe(0);
      expect(res.body.data.summary.status).toBe('COMPLETED');
    });

    it('Step 4: Retrieves batch details and checks all 10 items marked SIGNED with signatureRecordId', async () => {
      const res = await request(app)
        .get(`/api/v1/signatures/bulk/batches/${preparedBatchId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batch.status).toBe('COMPLETED');
      expect(res.body.data.items.length).toBe(10);

      for (const item of res.body.data.items) {
        expect(item.status).toBe('SIGNED');
        expect(item.signatureRecordId).toBeDefined();
        expect(item.signedAt).toBeDefined();
      }
    });

    it('Step 5: Sequential second signatory (Head Teacher) is now unblocked and can endorse all 10', async () => {
      // Head Teacher prepares batch for the same 10 pupils
      const prepRes = await request(app)
        .post('/api/v1/signatures/bulk/prepare')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          documentType: 'REPORT_CARD',
          scopeDescription: 'PP1 Term 1 2026 Head Teacher Endorsements',
          items: samplePupils
        });

      expect(prepRes.status).toBe(200);
      // Because Class Teacher has signed, all 10 are now READY for Head Teacher!
      expect(prepRes.body.data.summary.ready).toBe(10);
      expect(prepRes.body.data.summary.blocked).toBe(0);

      const headBatchId = prepRes.body.data.batch.id;
      const headDigest = prepRes.body.data.batch.batchDigest;

      // Initiate OTP for Head Teacher
      const chalRes = await request(app)
        .post('/api/v1/signatures/bulk/challenge')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          batchId: headBatchId,
          batchDigest: headDigest
        });

      expect(chalRes.status).toBe(200);
      const headOtp = chalRes.body.data.debugOtp;

      // Execute bulk signing
      const execRes = await request(app)
        .post('/api/v1/signatures/bulk/execute')
        .set('Authorization', `Bearer ${headteacherToken}`)
        .send({
          batchId: headBatchId,
          challengeId: chalRes.body.data.challengeId,
          otpCode: headOtp
        });

      expect(execRes.status).toBe(200);
      expect(execRes.body.data.summary.signedCount).toBe(10);

      // Verify document PP1-DOC-1 now has BOTH signatures (Class Teacher and Head Teacher)
      const docSigsRes = await request(app)
        .get('/api/v1/signatures/records/PP1-DOC-1')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(docSigsRes.status).toBe(200);
      expect(docSigsRes.body.data.length).toBe(2);
      expect(docSigsRes.body.data[0].signerRole).toBe('TEACHER');
      expect(docSigsRes.body.data[1].signerRole).toBe('HEAD_TEACHER');
    });
  });

  describe('3. Signature Archive & Integrity Verification', () => {
    it('GET /api/v1/signatures/records lists all signed document records with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/v1/signatures/records?limit=20&documentType=REPORT_CARD')
        .set('Authorization', `Bearer ${headteacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    });

    it('GET /api/v1/signatures/bulk/batches lists user batch history', async () => {
      const res = await request(app)
        .get('/api/v1/signatures/bulk/batches')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
