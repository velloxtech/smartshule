import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Geofence & Teacher Clock-In API Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;

  const SCHOOL_LAT = -0.061234;
  const SCHOOL_LON = 34.721234;
  const SCHOOL_RADIUS = 250;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    // Login as Admin (School Director)
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    adminToken = adminLoginRes.body.data.accessToken;

    // Login as Teacher
    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sarah.mwangi@smartshule.ac.ke', password: 'Teacher@123' });
    teacherToken = teacherLoginRes.body.data.accessToken;

    // Initialize school geofence
    await container.academicUseCases.getSchool();
  });

  it('GET /api/v1/geofence returns active school compound configuration', async () => {
    const res = await request(app)
      .get('/api/v1/geofence')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latitude).toBeDefined();
    expect(res.body.data.longitude).toBeDefined();
    expect(res.body.data.geofenceRadius).toBeGreaterThan(0);
  });

  it('PUT /api/v1/geofence succeeds when called by School Director / Admin', async () => {
    const res = await request(app)
      .put('/api/v1/geofence')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        latitude: -0.062,
        longitude: 34.722,
        geofenceRadius: 300,
        geofenceEnabled: true
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.latitude).toBe(-0.062);
    expect(res.body.data.longitude).toBe(34.722);
    expect(res.body.data.geofenceRadius).toBe(300);
  });

  it('PUT /api/v1/geofence is blocked (403 Forbidden) when attempted by regular Teacher', async () => {
    const res = await request(app)
      .put('/api/v1/geofence')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        latitude: -0.065,
        longitude: 34.725,
        geofenceRadius: 500
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/geofence/clock-in succeeds when teacher is inside the compound', async () => {
    // 20m from current center (-0.062, 34.722)
    const insideLat = -0.06205;
    const insideLon = 34.72205;

    const res = await request(app)
      .post('/api/v1/geofence/clock-in')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        action: 'CLOCK_IN',
        latitude: insideLat,
        longitude: insideLon,
        accuracy: 4
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CLOCKED_IN');
    expect(res.body.data.inCompound).toBe(true);
    expect(res.body.data.clockInTime).toBeDefined();
  });

  it('POST /api/v1/geofence/clock-in is blocked (403 Forbidden) when teacher is outside compound', async () => {
    // Far away (~2km)
    const outsideLat = -0.080;
    const outsideLon = 34.740;

    const res = await request(app)
      .post('/api/v1/geofence/clock-in')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        action: 'CLOCK_IN',
        latitude: outsideLat,
        longitude: outsideLon,
        accuracy: 10
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('outside the school compound');
  });

  it('POST /api/v1/geofence/clock-in succeeds when teacher clocks out', async () => {
    const res = await request(app)
      .post('/api/v1/geofence/clock-in')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        action: 'CLOCK_OUT',
        latitude: -0.062,
        longitude: 34.722
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CLOCKED_OUT');
    expect(res.body.data.clockOutTime).toBeDefined();
  });

  it('GET /api/v1/geofence/today returns today record for the teacher', async () => {
    const res = await request(app)
      .get('/api/v1/geofence/today')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CLOCKED_OUT');
  });

  it('GET /api/v1/geofence/records returns faculty clock-in audit log for Admin', async () => {
    const res = await request(app)
      .get('/api/v1/geofence/records')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/geofence/roster returns full faculty daily roster for School Director & Admin', async () => {
    const res = await request(app)
      .get('/api/v1/geofence/roster')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(Array.isArray(res.body.data.roster)).toBe(true);
    expect(res.body.data.summary.totalTeachers).toBeGreaterThan(0);
  });

  it('GET /api/v1/geofence/roster is blocked (403 Forbidden) for regular Teacher', async () => {
    const res = await request(app)
      .get('/api/v1/geofence/roster')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
