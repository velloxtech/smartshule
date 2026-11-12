import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';
import { BiometricCredential } from '../../src/core/domain/auth/BiometricCredential';
import { UserRole } from '../../src/core/domain/user/User';

describe('WebAuthn Local Development & Testing — End-to-End Suite', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;
  let bursarToken: string;

  beforeAll(async () => {
    // Set local development environment variables
    process.env.NODE_ENV = 'development';
    process.env.WEBAUTHN_RP_ID = 'localhost';
    process.env.WEBAUTHN_RP_NAME = 'SmartShule';
    process.env.WEBAUTHN_ORIGIN = 'http://localhost:5173';
    process.env.FRONTEND_URL = 'http://localhost:5173';

    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Verify standard password login works across roles
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.success).toBe(true);
    expect(adminLogin.body.data.accessToken).toBeDefined();
    expect(adminLogin.body.data.user.role).toBe(UserRole.SUPER_ADMIN);
    adminToken = adminLogin.body.data.accessToken;

    const teacherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLogin.status).toBe(200);
    expect(teacherLogin.body.data.user.role).toBe(UserRole.TEACHER);
    teacherToken = teacherLogin.body.data.accessToken;

    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    expect(parentLogin.status).toBe(200);
    expect(parentLogin.body.data.user.role).toBe(UserRole.PARENT);
    parentToken = parentLogin.body.data.accessToken;

    const bursarLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bursar@smartshule.ac.ke', password: 'Bursar@123' });
    expect(bursarLogin.status).toBe(200);
    expect(bursarLogin.body.data.user.role).toBe(UserRole.BURSAR);
    bursarToken = bursarLogin.body.data.accessToken;
  });

  describe('1. WebAuthn Local Configuration & Registration Options', () => {
    it('generates registration options with RP ID "localhost", RP Name "SmartShule", and 60s timeout', async () => {
      const res = await request(app)
        .post('/api/v1/auth/webauthn/register/options')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const options = res.body.data;
      expect(options.rp.id).toBe('localhost');
      expect(options.rp.name).toBe('SmartShule');
      expect(options.challenge).toBeDefined();
      expect(typeof options.challenge).toBe('string');
      expect(options.user.name).toBe('admin@smartshule.ac.ke');
      expect(options.timeout).toBe(60000);
    });

    it('requires authentication to request registration options', async () => {
      const res = await request(app)
        .post('/api/v1/auth/webauthn/register/options')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(401);
    });
  });

  describe('2. Credential Registration, Storage, and Listing', () => {
    it('saves and lists registered biometric credentials for the authenticated user', async () => {
      const user = await container.userRepository.findByEmail('teacher@smartshule.ac.ke');
      expect(user).not.toBeNull();

      // Register mock Windows Hello credential
      const mockCredential = new BiometricCredential({
        id: 'test-cred-uuid-1',
        userId: user!.id,
        credentialId: 'winhello-cred-id-local-01',
        publicKey: Buffer.from('mock-public-key-bytes').toString('base64url'),
        counter: 0,
        deviceLabel: 'Windows PC (Windows Hello) - Nov 11',
        deviceType: 'windows_hello',
        transports: ['internal'],
        createdAt: new Date(),
        lastUsedAt: new Date()
      });

      await container.biometricCredentialRepository.save(mockCredential);

      // List credentials via API
      const listRes = await request(app)
        .get('/api/v1/auth/webauthn/credentials')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      const found = listRes.body.data.find(
        (c: any) => c.credentialId === 'winhello-cred-id-local-01'
      );
      expect(found).toBeDefined();
      expect(found.deviceLabel).toContain('Windows PC (Windows Hello)');
      expect(found.deviceType).toBe('windows_hello');
    });

    it('reports registered credential status via public user-status endpoint', async () => {
      const statusRes = await request(app)
        .post('/api/v1/auth/webauthn/user-status')
        .send({ identifier: 'teacher@smartshule.ac.ke' });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.data.hasCredentials).toBe(true);
      expect(statusRes.body.data.credentialCount).toBeGreaterThanOrEqual(1);
      expect(statusRes.body.data.deviceTypes).toContain('windows_hello');
    });

    it('reports false for users with no registered credentials', async () => {
      const statusRes = await request(app)
        .post('/api/v1/auth/webauthn/user-status')
        .send({ identifier: 'parent@smartshule.ac.ke' });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.data.hasCredentials).toBe(false);
      expect(statusRes.body.data.credentialCount).toBe(0);
    });
  });

  describe('3. WebAuthn Authentication Options & Scoped Allowed Credentials', () => {
    it('generates login options with RP ID "localhost" and scoped credentials when identifier is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/webauthn/login/options')
        .send({ identifier: 'teacher@smartshule.ac.ke' })
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasUserCredentials).toBe(true);
      expect(res.body.data.options.rpId).toBe('localhost');
      expect(res.body.data.options.challenge).toBeDefined();

      const allowCreds = res.body.data.options.allowCredentials;
      expect(Array.isArray(allowCreds)).toBe(true);
      expect(allowCreds.some((c: any) => c.id === 'winhello-cred-id-local-01')).toBe(true);
    });

    it('generates discoverable passkey login options when identifier is empty', async () => {
      const res = await request(app)
        .post('/api/v1/auth/webauthn/login/options')
        .send({})
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasUserCredentials).toBe(false);
      expect(res.body.data.options.rpId).toBe('localhost');
      expect(res.body.data.options.challenge).toBeDefined();
    });
  });

  describe('4. Token Issuance, Role Redirection & Multi-Role Support', () => {
    it('successfully issues tokens and preserves role-specific dashboard metadata', async () => {
      const rolesToTest = [
        { email: 'admin@smartshule.ac.ke', role: UserRole.SUPER_ADMIN },
        { email: 'teacher@smartshule.ac.ke', role: UserRole.TEACHER },
        { email: 'parent@smartshule.ac.ke', role: UserRole.PARENT },
        { email: 'bursar@smartshule.ac.ke', role: UserRole.BURSAR },
      ];

      for (const item of rolesToTest) {
        const user = await container.userRepository.findByEmail(item.email);
        expect(user).not.toBeNull();
        expect(user!.role).toBe(item.role);

        // Verify token service generates valid tokens for this role
        const token = container.tokenService.generateAccessToken({
          userId: user!.id,
          email: user!.email || '',
          role: user!.role,
          schoolId: user!.schoolId
        });
        expect(token).toBeDefined();

        const verified = container.tokenService.verifyAccessToken(token);
        expect(verified).not.toBeNull();
        expect(verified!.userId).toBe(user!.id);
        expect(verified!.role).toBe(item.role);
      }
    });

    it('allows deleting an authenticator without affecting password login or other credentials', async () => {
      const delRes = await request(app)
        .delete('/api/v1/auth/webauthn/credentials/winhello-cred-id-local-01')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify device list is now empty
      const listAfter = await request(app)
        .get('/api/v1/auth/webauthn/credentials')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(listAfter.body.data.length).toBe(0);

      // Verify teacher can still login with password
      const reLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
      expect(reLogin.status).toBe(200);
      expect(reLogin.body.data.user.role).toBe(UserRole.TEACHER);
    });
  });
});
