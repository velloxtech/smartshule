import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Deleted Students API Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // Login as Admin
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    adminToken = adminLoginRes.body.data.accessToken;

    // Login as Teacher
    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sarah.mwangi@smartshule.ac.ke', password: 'Teacher@123' });
    teacherToken = teacherLoginRes.body.data.accessToken;
  });

  it('DELETE /api/v1/students/:id deletes student, archives in deleted_students, and returns cleared pending work summary', async () => {
    const res = await request(app)
      .delete('/api/v1/students/student-001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Relocated to Mombasa' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Student deleted successfully and archived with all linked records');
    expect(res.body.data.deletedStudent).toBeDefined();
    expect(res.body.data.deletedStudent.studentId).toBe('student-001');
    expect(res.body.data.deletedStudent.admissionNumber).toBe('ADM-2026-001');
    expect(res.body.data.deletedStudent.reason).toBe('Relocated to Mombasa');
    expect(res.body.data.pendingWorkCleared).toBeDefined();

    // Verify student is gone from active list
    const getRes = await request(app)
      .get('/api/v1/students/student-001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);
  });

  it('GET /api/v1/students/deleted lists archived students for authorized admin', async () => {
    const res = await request(app)
      .get('/api/v1/students/deleted')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const deleted = res.body.data[0];
    expect(deleted.studentId).toBe('student-001');
    expect(deleted.admissionNumber).toBe('ADM-2026-001');
    expect(deleted.linkedData).toBeDefined();
    expect(deleted.pendingWorkCleared).toBeDefined();
  });

  it('GET /api/v1/students/deleted/:id retrieves specific archived student details', async () => {
    // First get deleted list to find the record ID
    const listRes = await request(app)
      .get('/api/v1/students/deleted')
      .set('Authorization', `Bearer ${adminToken}`);
    const archiveId = listRes.body.data[0].id;

    const res = await request(app)
      .get(`/api/v1/students/deleted/${archiveId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(archiveId);
    expect(res.body.data.studentId).toBe('student-001');
    expect(res.body.data.linkedData.invoices).toBeDefined();
  });

  it('POST /api/v1/students/deleted/:id/restore restores learner back to active roster', async () => {
    const listRes = await request(app)
      .get('/api/v1/students/deleted')
      .set('Authorization', `Bearer ${adminToken}`);
    const archiveId = listRes.body.data[0].id;

    const res = await request(app)
      .post(`/api/v1/students/deleted/${archiveId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('restored successfully');
    expect(res.body.data.id).toBe('student-001');

    // Verify student is back in active list
    const activeRes = await request(app)
      .get('/api/v1/students/student-001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data.admissionNumber).toBe('ADM-2026-001');

    // Verify deleted archive table no longer has the record
    const emptyListRes = await request(app)
      .get('/api/v1/students/deleted')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(emptyListRes.body.data).toHaveLength(0);
  });

  it('blocks unauthorized users (e.g. general teachers) from viewing deleted archive', async () => {
    const res = await request(app)
      .get('/api/v1/students/deleted')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(403);
  });
});
