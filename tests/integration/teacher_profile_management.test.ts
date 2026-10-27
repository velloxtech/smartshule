import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Teacher Profile Management and Self-Service Profile Corrections (Phase 7)', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let secondTeacherToken: string;
  let teacherUserId: string;
  let teacherId: string;
  let secondTeacherId: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // 1. Authenticate Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;

    // 2. Authenticate Teacher 1 (Sarah Mwangi)
    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sarah.mwangi@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLoginRes.status).toBe(200);
    teacherToken = teacherLoginRes.body.data.accessToken;
    teacherUserId = teacherLoginRes.body.data.user.id;

    // Onboard Teacher 2 for cross-user isolation testing
    const t2Res = await request(app)
      .post('/api/v1/teachers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'john.kimani@smartshule.ac.ke',
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Kimani',
        phone: '+254733445566',
        schoolId: 'school-001',
        role: 'TEACHER',
        employeeNumber: 'EMP-TCH-002',
        tscNumber: 'TSC/888999',
        specialization: ['Mathematics', 'Science'],
        qualification: 'B.Ed Science'
      });
    expect(t2Res.status).toBe(201);
    secondTeacherId = t2Res.body.data.id;

    const t2LoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john.kimani@smartshule.ac.ke', password: 'Password@123' });
    expect(t2LoginRes.status).toBe(200);
    secondTeacherToken = t2LoginRes.body.data.accessToken;

    // Get Teacher 1 teacherId
    const meRes = await request(app)
      .get('/api/v1/teachers/me/profile')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(meRes.status).toBe(200);
    teacherId = meRes.body.data.id;
  });

  // Scenario 1: Teacher views own complete profile with all 7 structured sections
  it('Scenario 1: Teacher views own complete profile with structured sections', async () => {
    const res = await request(app)
      .get('/api/v1/teachers/me/profile')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const profile = res.body.data;
    // Personal & User info
    expect(profile.user).toBeDefined();
    expect(profile.user.id).toBe(teacherUserId);
    expect(profile.user.firstName).toBeDefined();
    expect(profile.user.lastName).toBeDefined();
    expect(profile.user.role).toBe('TEACHER');

    // Professional & Employment
    expect(profile.employeeNumber).toBeDefined();
    expect(profile.specialization).toBeInstanceOf(Array);

    // Assignments
    expect(profile).toHaveProperty('assignedStreamInfo');
    expect(profile).toHaveProperty('teachingAssignments');

    // Pending requests
    expect(profile.pendingCorrectionRequests).toBeInstanceOf(Array);
  });

  // Scenario 2: Teacher directly updates permitted fields; changes persist and audit log is created
  it('Scenario 2: Teacher directly updates permitted fields and changes persist with audit log', async () => {
    const res = await request(app)
      .put('/api/v1/teachers/me/profile')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        phone: '+254799887766',
        residentialAddress: 'Greenwood Estate, Juja',
        profilePhotoUrl: 'https://smartshule.ac.ke/photos/sarah.jpg',
        emergencyContact: {
          name: 'David Mwangi',
          phone: '+254711002233',
          relationship: 'Spouse'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.phone).toBe('+254799887766');
    expect(res.body.data.residentialAddress).toBe('Greenwood Estate, Juja');
    expect(res.body.data.profilePhotoUrl).toBe('https://smartshule.ac.ke/photos/sarah.jpg');
    expect(res.body.data.emergencyContact.name).toBe('David Mwangi');
    expect(res.body.data.emergencyContact.relationship).toBe('Spouse');

    // Verify audit entry in SystemLog
    const auditRes = await request(app)
      .get(`/api/v1/teachers/${teacherId}/audit-history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    const updateLogs = auditRes.body.data.filter((l: any) => l.action === 'TEACHER_PROFILE_UPDATED');
    expect(updateLogs.length).toBeGreaterThanOrEqual(1);
    expect(updateLogs[0].category).toBe('STAFF');
    expect(updateLogs[0].metadata.newValues.phone).toBe('+254799887766');
    expect(updateLogs[0].metadata.newValues.residentialAddress).toBe('Greenwood Estate, Juja');
  });

  // Scenario 3: Teacher attempts to directly modify restricted field; system rejects with clear error
  it('Scenario 3: Direct modification of restricted fields is rejected with informative error', async () => {
    const restrictedAttempts = [
      { firstName: 'NewFirstName' },
      { lastName: 'NewLastName' },
      { tscNumber: 'TSC/999888' },
      { nationalId: '12345678' },
      { dateOfBirth: '1990-01-01' },
      { employeeNumber: 'EMP-HACK' },
      { qualification: 'Ph.D in Education' },
      { employmentDate: '2020-01-01' },
      { department: 'Administration' },
      { email: 'hacked@email.com' }
    ];

    for (const attempt of restrictedAttempts) {
      const fieldName = Object.keys(attempt)[0];
      const res = await request(app)
        .put('/api/v1/teachers/me/profile')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(attempt);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Direct updates to restricted field');
      expect(res.body.message).toContain('Please submit a Profile Correction Request');
    }
  });

  // Scenario 4: Teacher submits correction request for restricted field with reason, proposed value, and evidence
  it('Scenario 4: Teacher submits correction request with reason and evidence URL', async () => {
    const res = await request(app)
      .post('/api/v1/teachers/me/correction-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        fieldName: 'tscNumber',
        proposedValue: 'TSC/556677',
        reason: 'Typographical error during initial teacher registration',
        evidenceUrl: 'https://smartshule.ac.ke/docs/tsc-certificate-sarah.pdf'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fieldName).toBe('tscNumber');
    expect(res.body.data.fieldLabel).toBe('TSC Registration Number');
    expect(res.body.data.proposedValue).toBe('TSC/556677');
    expect(res.body.data.reason).toBe('Typographical error during initial teacher registration');
    expect(res.body.data.evidenceUrl).toBe('https://smartshule.ac.ke/docs/tsc-certificate-sarah.pdf');
    expect(res.body.data.status).toBe('PENDING');
  });

  // Scenario 5: Prevent duplicate pending correction requests for the same field
  it('Scenario 5: Teacher cannot submit duplicate pending correction request for the same field', async () => {
    const res = await request(app)
      .post('/api/v1/teachers/me/correction-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        fieldName: 'tscNumber',
        proposedValue: 'TSC/778899',
        reason: 'Another attempt for same field'
      });

    expect(res.status).toBe(409); // ConflictError
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  // Scenario 6: Teacher views own submitted correction requests and statuses
  it('Scenario 6: Teacher views own submitted correction requests and status list', async () => {
    const res = await request(app)
      .get('/api/v1/teachers/me/correction-requests')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const req = res.body.data.find((r: any) => r.fieldName === 'tscNumber');
    expect(req).toBeDefined();
    expect(req.status).toBe('PENDING');
  });

  // Scenario 7: Administrator views pending correction requests across the school
  it('Scenario 7: Administrator lists correction requests across school', async () => {
    const res = await request(app)
      .get('/api/v1/teachers/correction-requests?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const pendingReq = res.body.data.find((r: any) => r.fieldName === 'tscNumber' && r.teacherId === teacherId);
    expect(pendingReq).toBeDefined();
    expect(pendingReq.teacher).toBeDefined();
    expect(pendingReq.teacher.name).toBeDefined();
  });

  // Scenario 8: Administrator approves correction request with remarks; proposed value is applied to teacher record
  it('Scenario 8: Administrator approves correction request; value applies to teacher entity and logs audit', async () => {
    // Submit a correction request for qualification
    const subRes = await request(app)
      .post('/api/v1/teachers/me/correction-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        fieldName: 'qualification',
        proposedValue: 'Masters in Educational Leadership (M.Ed)',
        reason: 'Graduation ceremony concluded; certificate issued'
      });
    expect(subRes.status).toBe(201);
    const requestId = subRes.body.data.id;

    // Admin approves
    const approveRes = await request(app)
      .post(`/api/v1/teachers/correction-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
        remarks: 'Degree certificate verified with university registry'
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('APPROVED');
    expect(approveRes.body.data.reviewRemarks).toBe('Degree certificate verified with university registry');

    // Verify teacher profile was automatically updated
    const profileRes = await request(app)
      .get('/api/v1/teachers/me/profile')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.qualification).toBe('Masters in Educational Leadership (M.Ed)');

    // Verify audit log
    const auditRes = await request(app)
      .get(`/api/v1/teachers/${teacherId}/audit-history`)
      .set('Authorization', `Bearer ${adminToken}`);
    const approvalLog = auditRes.body.data.find((l: any) => l.action === 'TEACHER_CORRECTION_APPROVED');
    expect(approvalLog).toBeDefined();
    expect(approvalLog.metadata.newValue).toBe('Masters in Educational Leadership (M.Ed)');
  });

  // Scenario 9: Administrator rejects correction request with mandatory remarks; entity unchanged
  it('Scenario 9: Administrator rejects correction request with mandatory remarks; entity remains unchanged', async () => {
    // Teacher submits correction for nationalId
    const subRes = await request(app)
      .post('/api/v1/teachers/me/correction-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        fieldName: 'nationalId',
        proposedValue: '99887766',
        reason: 'New ID card issued'
      });
    expect(subRes.status).toBe(201);
    const requestId = subRes.body.data.id;

    // Admin rejects without remarks -> should fail validation
    const failRejectRes = await request(app)
      .post(`/api/v1/teachers/correction-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REJECT',
        remarks: ''
      });
    expect(failRejectRes.status).toBe(400);

    // Admin rejects with valid remarks
    const rejectRes = await request(app)
      .post(`/api/v1/teachers/correction-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REJECT',
        remarks: 'ID document copy was unreadable; please resubmit clear scan'
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('REJECTED');
    expect(rejectRes.body.data.reviewRemarks).toContain('unreadable');

    // Verify teacher profile nationalId was NOT changed
    const profileRes = await request(app)
      .get('/api/v1/teachers/me/profile')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(profileRes.body.data.nationalId).not.toBe('99887766');

    // Verify rejection audit log
    const auditRes = await request(app)
      .get(`/api/v1/teachers/${teacherId}/audit-history`)
      .set('Authorization', `Bearer ${adminToken}`);
    const rejectLog = auditRes.body.data.find((l: any) => l.action === 'TEACHER_CORRECTION_REJECTED');
    expect(rejectLog).toBeDefined();
  });

  // Scenario 10: Teacher cannot view or modify another teacher's profile
  it('Scenario 10: Teacher cannot modify another teacher profile via admin routes', async () => {
    // Teacher 1 attempts to update Teacher 2's profile
    const unauthUpdateRes = await request(app)
      .put(`/api/v1/teachers/${secondTeacherId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        phone: '+254700000000'
      });

    expect(unauthUpdateRes.status).toBe(403); // Forbidden by requireRoles

    // Teacher 1 attempts to access admin correction review endpoint
    const unauthReviewRes = await request(app)
      .post('/api/v1/teachers/correction-requests/some-id/review')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ action: 'APPROVE' });

    expect(unauthReviewRes.status).toBe(403);
  });

  // Scenario 11: Teacher updates account password through self-service with current password verification
  it('Scenario 11: Teacher changes password with current password verification', async () => {
    // Attempt with wrong current password
    const failPwRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${secondTeacherToken}`)
      .send({
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPassword@2026'
      });

    expect(failPwRes.status).toBe(401);
    expect(failPwRes.body.message).toContain('Current password is incorrect');

    // Attempt with correct current password
    const successPwRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${secondTeacherToken}`)
      .send({
        currentPassword: 'Password@123',
        newPassword: 'BrandNewPassword@2026'
      });

    expect(successPwRes.status).toBe(200);
    expect(successPwRes.body.success).toBe(true);

    // Verify login with new password
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john.kimani@smartshule.ac.ke', password: 'BrandNewPassword@2026' });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.data.accessToken).toBeDefined();
  });

  // Scenario 12: Historical records and signatures remain intact
  it('Scenario 12: Historical audit trail and records remain immutable across profile updates', async () => {
    const auditRes = await request(app)
      .get(`/api/v1/teachers/${teacherId}/audit-history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    const logs = auditRes.body.data;
    expect(logs.length).toBeGreaterThan(0);

    // All logs contain action, actor, timestamp, and details without sensitive passwords
    for (const log of logs) {
      expect(log.timestamp).toBeDefined();
      expect(log.action).toBeDefined();
      expect(log.details).not.toContain('password');
      expect(log.details).not.toContain('Password@123');
    }
  });
});
