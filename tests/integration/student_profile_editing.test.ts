import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';

describe('Student Profile & Phone Number Editing (Admin & Parent sides)', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let parentToken: string;
  let otherParentToken: string;

  let testStudentId: string;
  let testAdmissionNumber: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // 2. Parent login (linked to student-001 by default fixture)
    const parentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;

    // 3. Register a second parent (not linked to testStudent)
    const otherParentReg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'other.parent@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PARENT',
        phone: '+254700112233'
      });
    expect(otherParentReg.status).toBe(201);
    otherParentToken = otherParentReg.body.data.accessToken;

    // 4. Register a student via Admin with initial guardian phone
    const studentRes = await request(app)
      .post('/api/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        admissionNumber: 'ADM-EDIT-001',
        firstName: 'Kelvin',
        lastName: 'Wanyama',
        dateOfBirth: '2013-08-20',
        gender: 'MALE',
        gradeLevel: 'GRADE_7',
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        guardian: {
          firstName: 'Joseph',
          lastName: 'Wanyama',
          email: 'joseph.wanyama@test.com',
          phone: '+254711998877',
          relationship: 'FATHER',
          emergencyContact: '+254711998877'
        }
      });
    expect(studentRes.status).toBe(201);
    testStudentId = studentRes.body.data.id;
    testAdmissionNumber = studentRes.body.data.admissionNumber;

    // Link demo parent account to testStudent as well so parent can edit
    const linkRes = await request(app)
      .post('/api/v1/students/link-guardian')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: testStudentId,
        guardianId: 'usr-parent-01'
      });
    expect(linkRes.status).toBe(200);
  });

  describe('1. Admin Side Student Profile & Phone Editing', () => {
    it('allows Admin to update student name, medical details, and guardian phone number', async () => {
      const updatedPhone = '+254722334455';
      const updatedEmergency = '+254733445566';

      const res = await request(app)
        .put(`/api/v1/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Kelvin',
          middleName: 'Barasa',
          lastName: 'Wanyama',
          medicalConditions: 'Mild Asthma (has inhaler)',
          specialNeeds: 'Visual seating accommodation',
          guardianPhone: updatedPhone,
          emergencyContact: updatedEmergency,
          guardianName: 'Joseph Barasa Wanyama'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.middleName).toBe('Barasa');
      expect(res.body.data.medicalConditions).toBe('Mild Asthma (has inhaler)');
      expect(res.body.data.specialNeeds).toBe('Visual seating accommodation');
      expect(res.body.data.guardianPhone).toBe(updatedPhone);

      // Verify persistence via GET /students/:id
      const getRes = await request(app)
        .get(`/api/v1/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.fullName).toContain('Kelvin Barasa Wanyama');
      expect(getRes.body.data.guardianPhone || getRes.body.data.guardians?.[0]?.emergencyContact).toBeDefined();
    });
  });

  describe('2. Parent Side Student Profile & Phone Editing', () => {
    it('allows authenticated Parent to edit their registered child profile and update changed phone numbers', async () => {
      const parentNewPhone = '+254799001122';
      const parentNewEmergency = '+254788112233';

      const res = await request(app)
        .put(`/api/v1/students/${testStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Kelvin',
          lastName: 'Wanyama',
          dateOfBirth: '2013-08-22',
          medicalConditions: 'Peanut allergy; Mild Asthma',
          guardianPhone: parentNewPhone,
          emergencyContact: parentNewEmergency
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dateOfBirth).toBe('2013-08-22');
      expect(res.body.data.medicalConditions).toBe('Peanut allergy; Mild Asthma');
      expect(res.body.data.guardianPhone).toBe(parentNewPhone);
    });

    it('allows Parent to update via guardian alias route /api/v1/students/guardian/students/:id', async () => {
      const aliasPhone = '+254712999888';

      const res = await request(app)
        .put(`/api/v1/students/guardian/students/${testStudentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          guardianPhone: aliasPhone
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.guardianPhone).toBe(aliasPhone);
    });

    it('rejects Parent attempting to edit another parent child with 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/api/v1/students/${testStudentId}`)
        .set('Authorization', `Bearer ${otherParentToken}`)
        .send({
          firstName: 'Hacked',
          guardianPhone: '+254700000000'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('3. Validation & Security Controls', () => {
    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .put(`/api/v1/students/${testStudentId}`)
        .send({ firstName: 'Anonymous' });

      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent student ID', async () => {
      const res = await request(app)
        .put('/api/v1/students/student-non-existent-999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });
});
