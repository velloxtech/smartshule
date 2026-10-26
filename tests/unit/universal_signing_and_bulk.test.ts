import crypto from 'crypto';
import { SignatureUseCases } from '../../src/application/signature/SignatureUseCases';
import { InMemorySignatureRepository } from '../../src/infrastructure/database/in-memory/InMemorySignatureRepository';
import { InMemoryUserRepository } from '../../src/infrastructure/database/in-memory/InMemoryRepositories';
import { EmailService } from '../../src/infrastructure/services/email/EmailService';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';
import { getDefaultSigningPolicies } from '../../src/core/domain/signature/SigningPolicy';

describe('Universal Document Signing & Bulk Signing Engine Tests', () => {
  let sigRepo: InMemorySignatureRepository;
  let userRepo: InMemoryUserRepository;
  let emailService: EmailService;
  let useCases: SignatureUseCases;

  let teacherUser: User;
  let headteacherUser: User;
  let bursarUser: User;

  beforeEach(async () => {
    sigRepo = new InMemorySignatureRepository();
    userRepo = new InMemoryUserRepository();
    emailService = new EmailService();
    useCases = new SignatureUseCases(sigRepo, userRepo, emailService);

    teacherUser = new User(
      {
        email: 'teacher.sarah@smartshule.ac.ke',
        passwordHash: '$2b$10$hashed',
        firstName: 'Sarah',
        lastName: 'Mwangi',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        schoolId: 'SCH-001'
      },
      'usr-teacher-1'
    );
    await userRepo.save(teacherUser);

    headteacherUser = new User(
      {
        email: 'headteacher@smartshule.ac.ke',
        passwordHash: '$2b$10$hashed',
        firstName: 'Dr. Julius',
        lastName: 'Omondi',
        role: UserRole.HEAD_TEACHER,
        status: UserStatus.ACTIVE,
        schoolId: 'SCH-001'
      },
      'usr-headteacher-1'
    );
    await userRepo.save(headteacherUser);

    bursarUser = new User(
      {
        email: 'bursar@smartshule.ac.ke',
        passwordHash: '$2b$10$hashed',
        firstName: 'Grace',
        lastName: 'Wanjiku',
        role: UserRole.BURSAR,
        status: UserStatus.ACTIVE,
        schoolId: 'SCH-001'
      },
      'usr-bursar-1'
    );
    await userRepo.save(bursarUser);

    // Configure signature profiles for all users
    await useCases.saveSignatureProfile(teacherUser.id, {
      signatureType: 'DRAWN',
      signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consentConfirmed: true
    });

    await useCases.saveSignatureProfile(headteacherUser.id, {
      signatureType: 'TYPED',
      signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      fontStyle: 'Dancing Script',
      consentConfirmed: true
    });

    await useCases.saveSignatureProfile(bursarUser.id, {
      signatureType: 'UPLOADED',
      signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      consentConfirmed: true
    });
  });

  describe('1. Document Policies & Defaults', () => {
    it('provides built-in default signing policies for all 8 core document types', async () => {
      const defaults = getDefaultSigningPolicies();
      expect(defaults.length).toBeGreaterThanOrEqual(8);

      const types = defaults.map(d => d.documentType);
      expect(types).toContain('REPORT_CARD');
      expect(types).toContain('BROADSHEET');
      expect(types).toContain('FEE_STATEMENT');
      expect(types).toContain('FEE_RECEIPT');
      expect(types).toContain('PAYROLL_VOUCHER');
      expect(types).toContain('PURCHASE_REQUEST');
      expect(types).toContain('ANNOUNCEMENT');
      expect(types).toContain('ATTENDANCE_REGISTER');
    });

    it('enforces RBAC on policy configuration - rejects unauthorized teacher', async () => {
      await expect(
        useCases.configureSigningPolicy(
          { userId: teacherUser.id, role: 'CLASS_TEACHER' },
          {
            documentType: 'REPORT_CARD',
            requiresSignature: false
          }
        )
      ).rejects.toThrow('Only Super Admin, Director, or Head Teacher can configure document signing policies');
    });

    it('allows Head Teacher or Super Admin to update policy placement and properties', async () => {
      const updated = await useCases.configureSigningPolicy(
        { userId: headteacherUser.id, role: 'HEAD_TEACHER' },
        {
          documentType: 'REPORT_CARD',
          title: 'Grace Seeds School CBC Summative Report Card',
          requiredSignaturesCount: 2
        }
      );
      expect(updated.title).toBe('Grace Seeds School CBC Summative Report Card');
      expect(updated.requiredSignaturesCount).toBe(2);
    });
  });

  describe('2. Sequential Signing & Multi-Signatory Validation', () => {
    it('blocks Head Teacher from signing Report Card before Class Teacher in SEQUENTIAL policy', async () => {
      // Create batch as Head Teacher for PP1 report cards
      const batchResult = await useCases.prepareBulkSigningBatch(
        headteacherUser.id,
        headteacherUser.role,
        {
          documentType: 'REPORT_CARD',
          scopeDescription: 'PP1 Report Cards Term 1 2026',
          items: [
            {
              documentId: 'RC-PP1-001',
              documentTitle: 'Liam Doe Report Card',
              studentId: 'stud-1',
              studentName: 'Liam Doe',
              documentVersion: '1.0',
              documentContent: 'Liam Doe Grade: EE, Remarks: Outstanding'
            }
          ]
        }
      );

      // In SEQUENTIAL policy, Head Teacher is order 2 and Class Teacher is order 1
      expect(batchResult.summary.ready).toBe(0);
      expect(batchResult.summary.blocked).toBe(1);
      expect(batchResult.items[0].status).toBe('BLOCKED');
      expect(batchResult.items[0].failureReason).toContain("Awaiting prior signature from Class Teacher's Signature");
    });

    it('allows Class Teacher to sign first, after which Head Teacher is unblocked', async () => {
      const docId = 'RC-PP1-002';
      const docContent = 'Emma Wanjiku Grade: EE, Remarks: Diligent pupil';

      // 1. Class Teacher signs individually or via batch
      const teacherBatch = await useCases.prepareBulkSigningBatch(
        teacherUser.id,
        teacherUser.role,
        {
          documentType: 'REPORT_CARD',
          scopeDescription: 'PP1 Class Teacher Batch',
          items: [
            {
              documentId: docId,
              documentTitle: 'Emma Wanjiku Report Card',
              studentId: 'stud-2',
              studentName: 'Emma Wanjiku',
              documentVersion: '1.0',
              documentContent: docContent
            }
          ]
        }
      );

      expect(teacherBatch.summary.ready).toBe(1);

      // Challenge & sign
      const chal = await useCases.initiateBulkSigningChallenge(teacherUser.id, {
        batchId: teacherBatch.batch.id,
        batchDigest: teacherBatch.batch.batchDigest
      });

      const otp = chal.debugOtp!;
      const exec = await useCases.executeBulkSigning(teacherUser.id, {
        batchId: teacherBatch.batch.id,
        challengeId: chal.challengeId,
        otpCode: otp
      });

      expect(exec.summary.signedCount).toBe(1);

      // 2. Now Head Teacher prepares batch for the same document
      const headBatch = await useCases.prepareBulkSigningBatch(
        headteacherUser.id,
        headteacherUser.role,
        {
          documentType: 'REPORT_CARD',
          scopeDescription: 'PP1 Head Teacher Endorsement',
          items: [
            {
              documentId: docId,
              documentTitle: 'Emma Wanjiku Report Card',
              studentId: 'stud-2',
              studentName: 'Emma Wanjiku',
              documentVersion: '1.0',
              documentContent: docContent
            }
          ]
        }
      );

      // Now Head Teacher is ready because Class Teacher signed!
      expect(headBatch.summary.ready).toBe(1);
      expect(headBatch.summary.blocked).toBe(0);
      expect(headBatch.items[0].status).toBe('READY');
    });

    it('detects if the same role already signed and marks subsequent attempts BLOCKED', async () => {
      const docId = 'RC-PP1-003';
      const docContent = 'Kevin Otieno Grade: ME';

      // Class Teacher signs
      const batch1 = await useCases.prepareBulkSigningBatch(teacherUser.id, teacherUser.role, {
        documentType: 'REPORT_CARD',
        scopeDescription: 'Batch 1',
        items: [{ documentId: docId, documentTitle: 'Kevin', documentVersion: '1.0', documentContent: docContent }]
      });

      const chal1 = await useCases.initiateBulkSigningChallenge(teacherUser.id, {
        batchId: batch1.batch.id,
        batchDigest: batch1.batch.batchDigest
      });

      await useCases.executeBulkSigning(teacherUser.id, {
        batchId: batch1.batch.id,
        challengeId: chal1.challengeId,
        otpCode: chal1.debugOtp!
      });

      // Class Teacher prepares another batch containing the same document
      const batch2 = await useCases.prepareBulkSigningBatch(teacherUser.id, teacherUser.role, {
        documentType: 'REPORT_CARD',
        scopeDescription: 'Batch 2 duplicate',
        items: [{ documentId: docId, documentTitle: 'Kevin', documentVersion: '1.0', documentContent: docContent }]
      });

      expect(batch2.summary.ready).toBe(0);
      expect(batch2.summary.blocked).toBe(1);
      expect(batch2.items[0].failureReason).toMatch(/Already signed by role (CLASS_TEACHER|TEACHER)/);
    });
  });

  describe('3. Bulk Signing Engine: Multi-Item Batch & Digest Invariants', () => {
    it('executes bulk signing for 5 documents with a single OTP verification code', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        documentId: `RC-PP1-BATCH-${i + 1}`,
        documentTitle: `Pupil ${i + 1} Report Card`,
        studentId: `stud-${i + 1}`,
        studentName: `Pupil ${i + 1}`,
        documentVersion: '1.0',
        documentContent: `Pupil ${i + 1} Term 1 2026 Summative Assessment Content`
      }));

      const prep = await useCases.prepareBulkSigningBatch(teacherUser.id, teacherUser.role, {
        documentType: 'REPORT_CARD',
        scopeDescription: 'PP1 All 5 Pupils Batch',
        items
      });

      expect(prep.summary.total).toBe(5);
      expect(prep.summary.ready).toBe(5);
      expect(prep.batch.batchDigest).toBeDefined();

      // Initiate OTP challenge
      const chal = await useCases.initiateBulkSigningChallenge(teacherUser.id, {
        batchId: prep.batch.id,
        batchDigest: prep.batch.batchDigest
      });

      expect(chal.challengeId).toBeDefined();
      expect(chal.maskedEmail).toMatch(/^t\*+h@smartshule\.ac\.ke$/);

      // Execute bulk signing
      const exec = await useCases.executeBulkSigning(teacherUser.id, {
        batchId: prep.batch.id,
        challengeId: chal.challengeId,
        otpCode: chal.debugOtp!
      });

      expect(exec.summary.totalCount).toBe(5);
      expect(exec.summary.signedCount).toBe(5);
      expect(exec.summary.failedCount).toBe(0);
      expect(exec.summary.status).toBe('COMPLETED');

      // Verify all 5 documents now have signature records in the repository
      for (const item of items) {
        const sigs = await sigRepo.findSignatureRecordsByDocumentId(item.documentId);
        expect(sigs.length).toBe(1);
        expect(sigs[0].signerUserId).toBe(teacherUser.id);
        expect(sigs[0].signerRole).toBe('TEACHER');
        expect(sigs[0].signatureDataSnapshot).toBeDefined();
      }
    });

    it('rejects bulk challenge if batch digest does not match (tamper prevention)', async () => {
      const prep = await useCases.prepareBulkSigningBatch(teacherUser.id, teacherUser.role, {
        documentType: 'REPORT_CARD',
        scopeDescription: 'PP1 Digest Test',
        items: [
          {
            documentId: 'RC-DIGEST-1',
            documentTitle: 'Pupil 1',
            documentVersion: '1.0',
            documentContent: 'Original Content'
          }
        ]
      });

      await expect(
        useCases.initiateBulkSigningChallenge(teacherUser.id, {
          batchId: prep.batch.id,
          batchDigest: 'tampered-or-altered-digest-value'
        })
      ).rejects.toThrow('Batch digest mismatch');
    });

    it('rejects execution when OTP is incorrect or expired', async () => {
      const prep = await useCases.prepareBulkSigningBatch(teacherUser.id, teacherUser.role, {
        documentType: 'REPORT_CARD',
        scopeDescription: 'PP1 OTP Test',
        items: [
          {
            documentId: 'RC-OTP-1',
            documentTitle: 'Pupil 1',
            documentVersion: '1.0',
            documentContent: 'Assessments'
          }
        ]
      });

      const chal = await useCases.initiateBulkSigningChallenge(teacherUser.id, {
        batchId: prep.batch.id,
        batchDigest: prep.batch.batchDigest
      });

      await expect(
        useCases.executeBulkSigning(teacherUser.id, {
          batchId: prep.batch.id,
          challengeId: chal.challengeId,
          otpCode: '000000'
        })
      ).rejects.toThrow('Invalid authorization code');
    });
  });

  describe('4. Partial Failure Isolation & Safe Retry', () => {
    it('isolates failed items, signs ready items, and allows retrying failed items without re-signing', async () => {
      // Prepare batch with 3 items
      const prep = await useCases.prepareBulkSigningBatch(teacherUser.id, teacherUser.role, {
        documentType: 'REPORT_CARD',
        scopeDescription: 'PP1 Partial Failure Test',
        items: [
          { documentId: 'RC-PF-1', documentTitle: 'Pupil 1', documentVersion: '1.0', documentContent: 'Content 1' },
          { documentId: 'RC-PF-2', documentTitle: 'Pupil 2', documentVersion: '1.0', documentContent: 'Content 2' },
          { documentId: 'RC-PF-3', documentTitle: 'Pupil 3', documentVersion: '1.0', documentContent: 'Content 3' }
        ]
      });

      const chal = await useCases.initiateBulkSigningChallenge(teacherUser.id, {
        batchId: prep.batch.id,
        batchDigest: prep.batch.batchDigest
      });

      // Simulate a failure on item 2 by temporarily hooking saveSignatureRecord
      const originalSave = sigRepo.saveSignatureRecord.bind(sigRepo);
      sigRepo.saveSignatureRecord = async (record) => {
        if (record.documentId === 'RC-PF-2') {
          throw new Error('Simulated disk write timeout on document 2');
        }
        return originalSave(record);
      };

      const exec = await useCases.executeBulkSigning(teacherUser.id, {
        batchId: prep.batch.id,
        challengeId: chal.challengeId,
        otpCode: chal.debugOtp!
      });

      // Restore repository
      sigRepo.saveSignatureRecord = originalSave;

      expect(exec.summary.signedCount).toBe(2);
      expect(exec.summary.failedCount).toBe(1);
      expect(exec.summary.status).toBe('PARTIALLY_FAILED');

      const item1 = exec.items.find((i: any) => i.documentId === 'RC-PF-1');
      const item2 = exec.items.find((i: any) => i.documentId === 'RC-PF-2');
      const item3 = exec.items.find((i: any) => i.documentId === 'RC-PF-3');

      expect(item1.status).toBe('SIGNED');
      expect(item2.status).toBe('FAILED');
      expect(item2.failureReason).toContain('Simulated disk write timeout');
      expect(item3.status).toBe('SIGNED');

      // Now retry the failed item using a fresh challenge
      const retryChal = new (require('../../src/core/domain/signature/DocumentSigningChallenge').DocumentSigningChallenge)({
        id: crypto.randomUUID(),
        userId: teacherUser.id,
        documentId: prep.batch.id,
        documentType: 'BULK_BATCH',
        documentVersion: '1.0',
        documentHash: prep.batch.batchDigest,
        otpHash: crypto.createHash('sha256').update('999888' + 'salt123').digest('hex'),
        salt: 'salt123',
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300000),
        resendCooldownUntil: new Date(),
        isConsumed: false,
        createdAt: new Date()
      });
      await sigRepo.saveChallenge(retryChal);

      const retryExec = await useCases.retryFailedBatchItems(teacherUser.id, {
        batchId: prep.batch.id,
        challengeId: retryChal.id,
        otpCode: '999888'
      });

      expect(retryExec.summary.failedCount).toBe(1); // was 1 failed in total batch counter
      const retriedItem2 = retryExec.items.find((i: any) => i.documentId === 'RC-PF-2');
      expect(retriedItem2.status).toBe('SIGNED');

      // Check signature records: Each of the 3 documents must have exactly 1 signature (no duplicates)
      const sig1 = await sigRepo.findSignatureRecordsByDocumentId('RC-PF-1');
      const sig2 = await sigRepo.findSignatureRecordsByDocumentId('RC-PF-2');
      const sig3 = await sigRepo.findSignatureRecordsByDocumentId('RC-PF-3');

      expect(sig1.length).toBe(1);
      expect(sig2.length).toBe(1);
      expect(sig3.length).toBe(1);
    });
  });

  describe('5. Multi-Module Document Signing Support', () => {
    it('supports signing Fee Statements for the Bursar', async () => {
      const docId = 'FEE-STMT-2026-001';
      const docContent = 'Grace Seeds School Fee Statement: Total Billed KES 45,000, Paid KES 45,000, Balance 0';

      const prep = await useCases.prepareBulkSigningBatch(bursarUser.id, bursarUser.role, {
        documentType: 'FEE_STATEMENT',
        scopeDescription: 'Term 1 Fee Statements',
        items: [{ documentId: docId, documentTitle: 'Liam Doe Fee Statement', documentVersion: '1.0', documentContent: docContent }]
      });

      expect(prep.summary.ready).toBe(1);
      const chal = await useCases.initiateBulkSigningChallenge(bursarUser.id, {
        batchId: prep.batch.id,
        batchDigest: prep.batch.batchDigest
      });

      const exec = await useCases.executeBulkSigning(bursarUser.id, {
        batchId: prep.batch.id,
        challengeId: chal.challengeId,
        otpCode: chal.debugOtp!
      });

      expect(exec.summary.signedCount).toBe(1);
      const sigs = await sigRepo.findSignatureRecordsByDocumentId(docId);
      expect(sigs.length).toBe(1);
      expect(sigs[0].signerRole).toBe('BURSAR');
      expect(sigs[0].documentType).toBe('FEE_STATEMENT');
    });

    it('rejects bulk signing for document types configured with allowBulkSigning: false (e.g. FEE_RECEIPT)', async () => {
      await expect(
        useCases.prepareBulkSigningBatch(bursarUser.id, bursarUser.role, {
          documentType: 'FEE_RECEIPT',
          scopeDescription: 'Attempted Bulk Receipts',
          items: [
            { documentId: 'REC-001', documentTitle: 'Receipt 1', documentVersion: '1.0', documentContent: 'Payment 10k' }
          ]
        })
      ).rejects.toThrow('Bulk signing is not permitted for document type "FEE_RECEIPT"');
    });

    it('rejects unauthorized roles from signing documents (e.g. Teacher signing Fee Statements)', async () => {
      await expect(
        useCases.prepareBulkSigningBatch(teacherUser.id, teacherUser.role, {
          documentType: 'FEE_STATEMENT',
          scopeDescription: 'Teacher signing fees',
          items: [
            { documentId: 'FEE-001', documentTitle: 'Fee 1', documentVersion: '1.0', documentContent: 'Fee details' }
          ]
        })
      ).rejects.toThrow(/User role "(TEACHER|CLASS_TEACHER)" is not authorized to sign documents of type "FEE_STATEMENT"/);
    });
  });
});
