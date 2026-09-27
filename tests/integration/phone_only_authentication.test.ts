import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Phone-Only Authentication & Optional Email Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;
  });

  describe('1. Direct Registration without Email', () => {
    it('should successfully register a user with only a phone number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone: '0799112233',
          password: 'Password@123',
          firstName: 'John',
          lastName: 'Simiyu',
          role: 'PARENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.phone).toBe('0799112233');
      expect(res.body.data.user.email).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();

      // Test login with phone
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: '0799112233', // using the email/identifier input field
          password: 'Password@123',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.user.phone).toBe('0799112233');
    });

    it('should reject registration if neither email nor phone is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          password: 'Password@123',
          firstName: 'NoContact',
          lastName: 'User',
          role: 'PARENT',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Either.*email.*phone/i);
    });
  });

  describe('2. Learner Admission with Phone-Only Guardian', () => {
    it('should admit learner with phone-only guardian and allow guardian to login with phone & national ID', async () => {
      const guardianPhone = '0711998877';
      const guardianId = 'ID98765432';

      const admitRes = await request(app)
        .post('/api/v1/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: 'ADM-PHONE-001',
          firstName: 'Baraka',
          lastName: 'Mwas',
          dateOfBirth: '2015-05-15',
          gender: 'MALE',
          gradeLevel: 'GRADE_3',
          guardian: {
            firstName: 'Mama',
            lastName: 'Baraka',
            phone: guardianPhone,
            nationalId: guardianId,
            relationship: 'MOTHER',
            emergencyContact: guardianPhone,
            // No email provided!
          },
        });

      expect(admitRes.status).toBe(201);
      expect(admitRes.body.success).toBe(true);
      const studentId = admitRes.body.data.id;

      // Guardian should now be able to log in using their phone and national ID as default password
      const parentLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: guardianPhone,
          password: guardianId,
        });

      expect(parentLoginRes.status).toBe(200);
      expect(parentLoginRes.body.success).toBe(true);
      expect(parentLoginRes.body.data.user.role).toBe('GUARDIAN');
      expect(parentLoginRes.body.data.user.mustChangePassword).toBe(true);

      const parentToken = parentLoginRes.body.data.accessToken;

      // The logged-in parent can view their child's profile
      const viewRes = await request(app)
        .get(`/api/v1/students/${studentId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(viewRes.status).toBe(200);
      expect(viewRes.body.data.firstName).toBe('Baraka');
    });
  });

  describe('3. Teacher Onboarding with Phone-Only', () => {
    it('should onboard a teacher with phone only and allow login', async () => {
      const teacherPhone = '0722334455';
      const nationalId = 'TSC-998877';

      const onboardRes = await request(app)
        .post('/api/v1/teachers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Moses',
          lastName: 'Kiprono',
          phone: teacherPhone,
          nationalId: nationalId,
          roleTitle: 'Mathematics Teacher',
          subjectSpecialization: 'Mathematics',
          primaryGradeLevel: 'GRADE_7',
          // No email provided!
        });

      expect(onboardRes.status).toBe(201);
      expect(onboardRes.body.success).toBe(true);

      // Teacher should be able to log in using phone number and national ID as password
      const teacherLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: teacherPhone,
          password: nationalId,
        });

      expect(teacherLoginRes.status).toBe(200);
      expect(teacherLoginRes.body.success).toBe(true);
      expect(teacherLoginRes.body.data.user.role).toBe('TEACHER');
      expect(teacherLoginRes.body.data.user.phone).toBe(teacherPhone);
      expect(teacherLoginRes.body.data.user.email).toBeUndefined();
    });
  });

  describe('4. Admin User Management with Phone-Only', () => {
    it('should allow admin to create a user with phone only', async () => {
      const userPhone = '0733557799';

      const createRes = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Winfred',
          lastName: 'Mutua',
          phone: userPhone,
          role: 'ACCOUNTANT',
          password: 'InitialPassword@123',
          // No email provided!
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.phone).toBe(userPhone);

      // Login with phone
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone: userPhone,
          password: 'InitialPassword@123',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.role).toBe('ACCOUNTANT');
    });
  });

  describe('5. Password Reset via Phone / SMS Code', () => {
    it('should send SMS reset code and allow password reset using phone number', async () => {
      const phone = '0744668800';

      // Register user with phone only
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          phone,
          password: 'OldPassword@123',
          firstName: 'Peter',
          lastName: 'Otieno',
          role: 'PARENT',
        });
      expect(regRes.status).toBe(201);

      // Request password reset using phone
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          phone,
        });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(forgotRes.body.message).toMatch(/SMS/i);

      // Verify that the user has a reset code stored in the repository
      const user = await container.userRepository.findByPhone(phone);
      expect(user).toBeDefined();
      const resetCode = user?.resetPasswordToken;
      expect(resetCode).toBeDefined();

      // Reset password using the code and phone
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          phone,
          code: resetCode,
          newPassword: 'NewStrongPassword@123',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify login with old password fails
      const failedLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          phone,
          password: 'OldPassword@123',
        });
      expect(failedLogin.status).toBe(401);

      // Verify login with new password succeeds
      const successfulLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: phone,
          password: 'NewStrongPassword@123',
        });
      expect(successfulLogin.status).toBe(200);
      expect(successfulLogin.body.success).toBe(true);
    });
  });
});
