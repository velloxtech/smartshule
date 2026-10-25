/**
 * SmartShule CBC Management System - Grace Seeds School
 * Integration Tests for Forgot-Password Pipeline, Token Verification, and Account Enumeration Resistance
 */

import request from 'supertest';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { User, UserRole, UserStatus } from '../../src/core/domain/user/User';

describe('Phase A: Complete Forgot-Password Pipeline Integration Tests', () => {
  let app: any;
  let container: AppContainer;

  const testUserEmail = 'recovery.tester@smartshule.ac.ke';
  const initialPassword = 'OriginalPassword@2026';

  beforeAll(async () => {
    container = await AppContainer.create();
    app = createExpressApp(container);

    // Seed test user
    const existing = await container.userRepository.findByEmail(testUserEmail);
    if (!existing) {
      const passwordHash = await container.passwordHasher.hash(initialPassword);
      const user = User.create({
        email: testUserEmail,
        passwordHash,
        firstName: 'Recovery',
        lastName: 'Tester',
        role: UserRole.TEACHER,
        status: UserStatus.ACTIVE,
        phone: '0712345678',
      }, 'test-recovery-user-001');
      await container.userRepository.save(user);
    }
  });

  beforeEach(() => {
    container.emailService.clearSentEmails();
  });

  describe('1. Account Enumeration Resistance', () => {
    it('returns equivalent 200 OK generic responses for both existing and non-existent accounts', async () => {
      // 1. Non-existent account
      const unknownRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent.ghost.account@graceseeds.ac.ke' });

      expect(unknownRes.status).toBe(200);
      expect(unknownRes.body.success).toBe(true);
      expect(unknownRes.body.message).toMatch(/If an account is associated with this identifier/i);

      // 2. Existing account
      const knownRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(knownRes.status).toBe(200);
      expect(knownRes.body.success).toBe(true);
      expect(knownRes.body.message).toMatch(/password reset/i);
    });
  });

  describe('2. Dual Token Generation & Email Dispatch', () => {
    it('generates cryptographic token, sends branded email with reset link and code', async () => {
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      expect(forgotRes.status).toBe(200);
      const numericCode = forgotRes.body.debugCode;
      const hexToken = forgotRes.body.debugToken;

      expect(numericCode).toBeDefined();
      expect(numericCode).toMatch(/^\d{6}$/);
      expect(hexToken).toBeDefined();
      expect(hexToken.length).toBe(64); // 32-byte hex

      // Verify email was captured in emailService ledger
      const lastEmail = container.emailService.getLastSentEmail();
      expect(lastEmail).not.toBeNull();
      expect(lastEmail?.to).toBe(testUserEmail);
      expect(lastEmail?.subject).toContain('Password Reset Verification');
      expect(lastEmail?.subject).toContain(numericCode);

      // Check email content contains school branding, code, and secure link
      expect(lastEmail?.html).toContain('Grace Seeds School');
      expect(lastEmail?.html).toContain(numericCode);
      expect(lastEmail?.html).toContain(hexToken);
      expect(lastEmail?.text).toContain(numericCode);
      expect(lastEmail?.text).toContain(hexToken);
    });
  });

  describe('3. Token Verification Endpoint (/api/v1/auth/verify-reset-token)', () => {
    it('validates active tokens and rejects invalid or nonexistent tokens', async () => {
      // Request fresh token
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      const hexToken = forgotRes.body.debugToken;
      const numericCode = forgotRes.body.debugCode;

      // 1. Verify with valid hex token
      const validHexRes = await request(app)
        .get(`/api/v1/auth/verify-reset-token?email=${testUserEmail}&token=${hexToken}`);

      expect(validHexRes.status).toBe(200);
      expect(validHexRes.body.valid).toBe(true);

      // 2. Verify with valid numeric code
      const validCodeRes = await request(app)
        .get(`/api/v1/auth/verify-reset-token?email=${testUserEmail}&token=${numericCode}`);

      expect(validCodeRes.status).toBe(200);
      expect(validCodeRes.body.valid).toBe(true);

      // 3. Verify with invalid token
      const invalidRes = await request(app)
        .get(`/api/v1/auth/verify-reset-token?email=${testUserEmail}&token=invalid-fake-token`);

      expect(invalidRes.status).toBe(200);
      expect(invalidRes.body.valid).toBe(false);
      expect(invalidRes.body.message).toMatch(/Invalid verification code or token/i);
    });
  });

  describe('4. Password Reset Execution & Single-Use Invalidation', () => {
    it('allows password reset via secure hex token and dispatches confirmation alert', async () => {
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      const hexToken = forgotRes.body.debugToken;
      const newPassword = 'BrandNewSecurePassword@2026';

      container.emailService.clearSentEmails();

      // Submit password reset with hex token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testUserEmail,
          token: hexToken,
          newPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.message).toMatch(/successfully reset/i);

      // Verify security confirmation email was dispatched
      const confirmationEmail = container.emailService.getLastSentEmail();
      expect(confirmationEmail).not.toBeNull();
      expect(confirmationEmail?.subject).toContain('Security Alert: Your Password Has Been Changed');
      expect(confirmationEmail?.to).toBe(testUserEmail);

      // Verify old password no longer works
      const oldLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: initialPassword,
        });
      expect(oldLoginRes.status).toBe(401);

      // Verify new password works
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: newPassword,
        });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.data.accessToken).toBeDefined();

      // Verify token is single-use: repeating with the same token must fail
      const repeatRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testUserEmail,
          token: hexToken,
          newPassword: 'AnotherPassword@123',
        });
      expect(repeatRes.status).toBe(401);
    });

    it('allows password reset via 6-digit numeric verification code', async () => {
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      const numericCode = forgotRes.body.debugCode;
      const newerPassword = 'CodeResetPassword@2026';

      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testUserEmail,
          resetCode: numericCode,
          newPassword: newerPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUserEmail,
          password: newerPassword,
        });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('5. Brute-Force Rate Limiting on Verification Attempts', () => {
    it('invalidates reset token after 5 failed verification attempts', async () => {
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUserEmail });

      const validCode = forgotRes.body.debugCode;

      // 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        const failRes = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({
            email: testUserEmail,
            resetCode: `99900${i}`,
            newPassword: 'Password@123',
          });
        expect(failRes.status).toBe(401);
        expect(failRes.body.message).toMatch(/Invalid verification code/i);
      }

      // 5th failed attempt triggers lockdown
      const fifthRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testUserEmail,
          resetCode: '999005',
          newPassword: 'Password@123',
        });
      expect(fifthRes.status).toBe(401);
      expect(fifthRes.body.message).toMatch(/Too many failed verification attempts.*invalidated/i);

      // Now attempting with validCode must fail
      const poisonedRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testUserEmail,
          resetCode: validCode,
          newPassword: 'Password@123',
        });
      expect(poisonedRes.status).toBe(401);
    });
  });
});
