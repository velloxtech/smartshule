import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Occurrence Record / Daily Incident Module Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;

    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sarah.mwangi@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLoginRes.status).toBe(200);
    teacherToken = teacherLoginRes.body.data.accessToken;
  });

  it('1. Teacher logs an incident that happened on that particular day', async () => {
    const today = new Date().toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/v1/occurrences')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Minor Playground Collision during Morning Break',
        description: 'Two learners collided while playing football on the lower pitch. Student sustained slight scrape on left knee.',
        category: 'ACCIDENT_INJURY',
        severity: 'LOW',
        date: today,
        time: '10:45 AM',
        location: 'Lower Football Pitch',
        reportedByRole: 'Teacher on Duty',
        reportedByTeacherName: 'Tr. Sarah Mwangi',
        studentIds: ['student-001'],
        witnesses: 'Tr. John & Class Captain',
        immediateActionTaken: 'First aid administered with antiseptic and clean dressing. Learner resumed class comfortably.',
        parentNotified: true,
        parentNotificationMethod: 'PHONE_CALL'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.occurrenceNumber).toMatch(/^OB-\d{8}-001$/);
    expect(res.body.data.title).toBe('Minor Playground Collision during Morning Break');
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.date).toBe(today);
    expect(res.body.data.severity).toBe('LOW');
    expect(res.body.data.parentNotified).toBe(true);
  });

  it('2. Teacher logs another incident with DISCIPLINARY category and auto-increments OB number', async () => {
    const today = new Date().toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/v1/occurrences')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Classroom Disruption and Refusal to Submit Assignment',
        description: 'Learner was argumentative during Grade 5 Science lesson and refused to participate in practical group activity.',
        category: 'DISCIPLINARY',
        severity: 'MEDIUM',
        date: today,
        time: '02:15 PM',
        location: 'Grade 5 East Classroom',
        reportedByRole: 'Subject Teacher',
        reportedByTeacherName: 'Tr. Sarah Mwangi',
        immediateActionTaken: 'Separated to front desk, assignment completed under supervision, referred for evening counseling.'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.occurrenceNumber).toMatch(/^OB-\d{8}-002$/);
    expect(res.body.data.category).toBe('DISCIPLINARY');
  });

  it('3. GET /api/v1/occurrences lists all logged occurrences for the school', async () => {
    const res = await request(app)
      .get('/api/v1/occurrences')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.data.length).toBe(2);
  });

  it('4. GET /api/v1/occurrences/daily-summary returns daily stats for that particular day', async () => {
    const today = new Date().toISOString().split('T')[0];

    const res = await request(app)
      .get(`/api/v1/occurrences/daily-summary?date=${today}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalIncidents).toBe(2);
    expect(res.body.data.openCount).toBe(2);
    expect(res.body.data.bySeverity.low).toBe(1);
    expect(res.body.data.bySeverity.medium).toBe(1);
    expect(res.body.data.byCategory.ACCIDENT_INJURY).toBe(1);
    expect(res.body.data.byCategory.DISCIPLINARY).toBe(1);
  });

  it('5. Updates occurrence status to RESOLVED with resolution notes', async () => {
    const listRes = await request(app)
      .get('/api/v1/occurrences')
      .set('Authorization', `Bearer ${adminToken}`);
    const firstId = listRes.body.data[0].id;

    const res = await request(app)
      .patch(`/api/v1/occurrences/${firstId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'Follow-up done with student and parents. Case closed.',
        resolvedBy: 'Deputy Head Teacher'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolvedBy).toBe('Deputy Head Teacher');
    expect(res.body.data.resolutionNotes).toContain('Follow-up done with student and parents');
  });

  it('6. Rejects creating occurrence when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/occurrences')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: '',
        category: 'INVALID_CATEGORY'
      });

    expect(res.status).toBe(400);
  });
});
