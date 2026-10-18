import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Curriculum Progress Tracker API Integration Tests', () => {
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

  let trackerId: string;

  it('1. Teacher initializes a Curriculum Progress Tracker for Grade 3 CRE across 12 weeks', async () => {
    const res = await request(app)
      .post('/api/v1/curriculum-tracker')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        learningAreaId: 'la-cre-001',
        subjectName: 'Christian Religious Education',
        classRoomId: 'class-grade-3',
        className: 'Grade 3',
        streamId: 'stream-east',
        streamName: 'East',
        academicYear: '2026',
        term: 'Term 3',
        totalWeeks: 12
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.items).toHaveLength(12);
    expect(res.body.data.stats.totalWeeks).toBe(12);
    expect(res.body.data.stats.coveredWeeks).toBe(0);
    expect(res.body.data.stats.completionPercentage).toBe(0);

    trackerId = res.body.data.id;
  });

  it('2. Teacher enters what is to be covered for Week 1', async () => {
    const res = await request(app)
      .put(`/api/v1/curriculum-tracker/${trackerId}/weeks/1`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        strand: 'Christian Values - Honesty',
        subStrand: 'Defined honesty and truthful living',
        learningOutcomes: 'Learner should be able to define honesty and roleplay truthful living in school and home',
        plannedLessons: 5,
        suggestedActivities: 'Reading biblical story of Samuel, small group discussions and role-playing',
        resources: 'Oxford Growing in Christ Bk 3 Pg 1-6; Flashcards'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const week1 = res.body.data.items.find((i: any) => i.weekNumber === 1);
    expect(week1).toBeDefined();
    expect(week1.strand).toBe('Christian Values - Honesty');
    expect(week1.subStrand).toBe('Defined honesty and truthful living');
    expect(week1.isCovered).toBe(false);
  });

  it('3. When teacher covers Week 1, they confirm it has been covered and leave a comment', async () => {
    const today = new Date().toISOString().split('T')[0];

    const res = await request(app)
      .post(`/api/v1/curriculum-tracker/${trackerId}/weeks/1/confirm-covered`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        covered: true,
        coveredAt: today,
        lessonsTaught: 5,
        comment: 'All 35 learners mastered the concept of honesty. Three learners gave inspiring personal examples of truthful conduct at home.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const week1 = res.body.data.items.find((i: any) => i.weekNumber === 1);
    expect(week1.isCovered).toBe(true);
    expect(week1.status).toBe('COVERED');
    expect(week1.coveredAt).toBe(today);
    expect(week1.lessonsTaught).toBe(5);
    expect(week1.teacherComment).toContain('mastered the concept of honesty');

    // Stats should reflect 1 of 12 covered (8%)
    expect(res.body.data.stats.coveredWeeks).toBe(1);
    expect(res.body.data.stats.completionPercentage).toBe(8);
    expect(res.body.data.stats.commentsCount).toBe(1);
  });

  it('4. Teacher leaves / updates a comment on Week 2', async () => {
    const res = await request(app)
      .put(`/api/v1/curriculum-tracker/${trackerId}/weeks/2/comment`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        comment: 'Week 2 preparatory notes: charts on biblical values prepared.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const week2 = res.body.data.items.find((i: any) => i.weekNumber === 2);
    expect(week2.teacherComment).toBe('Week 2 preparatory notes: charts on biblical values prepared.');
  });

  it('5. Teacher batch updates what is to be covered for Weeks 2 through 4', async () => {
    const res = await request(app)
      .put(`/api/v1/curriculum-tracker/${trackerId}/batch-weeks`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        weeks: [
          {
            weekNumber: 2,
            strand: 'Christian Values - Obedience',
            subStrand: 'Obeying parents and teachers',
            learningOutcomes: 'Learners understand the benefits of obedience from Exodus 20:12',
            plannedLessons: 5
          },
          {
            weekNumber: 3,
            strand: 'The Holy Bible',
            subStrand: 'Structure of the Bible: Old & New Testaments',
            learningOutcomes: 'Identify books of the Bible and distinguish the Testaments',
            plannedLessons: 5
          },
          {
            weekNumber: 4,
            strand: 'The Life of Jesus Christ',
            subStrand: 'Early Life and Baptism of Jesus',
            learningOutcomes: 'Describe John the Baptist baptizing Jesus in River Jordan',
            plannedLessons: 5
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const week2 = res.body.data.items.find((i: any) => i.weekNumber === 2);
    const week3 = res.body.data.items.find((i: any) => i.weekNumber === 3);
    const week4 = res.body.data.items.find((i: any) => i.weekNumber === 4);

    expect(week2.strand).toBe('Christian Values - Obedience');
    expect(week3.strand).toBe('The Holy Bible');
    expect(week4.strand).toBe('The Life of Jesus Christ');
  });

  it('6. Teacher confirms Week 2 is covered with comment and stats update to 17%', async () => {
    const res = await request(app)
      .post(`/api/v1/curriculum-tracker/${trackerId}/weeks/2/confirm-covered`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        covered: true,
        lessonsTaught: 5,
        comment: 'Learners demonstrated obedience through classroom chores. Role play was very engaging.'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.stats.coveredWeeks).toBe(2);
    expect(res.body.data.stats.completionPercentage).toBe(17);
  });

  it('7. GET /api/v1/curriculum-tracker lists trackers with progress statistics', async () => {
    const res = await request(app)
      .get('/api/v1/curriculum-tracker')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    const tracker = res.body.data.find((t: any) => t.id === trackerId);
    expect(tracker).toBeDefined();
    expect(tracker.stats.coveredWeeks).toBe(2);
  });

  it('8. GET /api/v1/curriculum-tracker/summary returns school-wide progress summary', async () => {
    const res = await request(app)
      .get('/api/v1/curriculum-tracker/summary?term=Term 3&academicYear=2026')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalTrackers).toBeGreaterThanOrEqual(1);
    expect(res.body.data.coveredWeeksAll).toBeGreaterThanOrEqual(2);
    expect(res.body.data.subjects).toBeDefined();
    expect(res.body.data.subjects.length).toBeGreaterThanOrEqual(1);
  });

  let dailyLogId: string;

  it('9. Teacher logs a daily curriculum delivery entry with a comprehensive reflection section', async () => {
    const res = await request(app)
      .post(`/api/v1/curriculum-tracker/${trackerId}/daily-logs`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        date: '2026-10-18',
        dayOfWeek: 'Monday',
        weekNumber: 2,
        lessonPeriod: 'Period 2 (08:40 - 09:20)',
        strand: 'Christian Values - Obedience',
        subStrand: 'Obeying parents and teachers in daily chores',
        learningOutcomesTaught: 'Learners role-played active obedience to teachers and parents without complaining',
        activitiesConducted: 'Learners formed pairs, acted out scenarios of parental instructions and discussed outcomes',
        resourcesUsed: 'Flashcards, Bible verses cards (Exodus 20:12)',
        status: 'TAUGHT',
        reflection: {
          comprehensionLevel: 'EXCELLENT',
          whatWentWell: 'Learners were exceptionally engaged during the pair role-play and connected scripture with home conduct.',
          challengesFaced: 'Two learners struggled with stage confidence during their presentation.',
          remedialPlan: 'Pair shy learners with encouraging buddies in tomorrow’s recitation.',
          nextSteps: 'Give 3-question reflection exercise in eDiary for home reinforcement.'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log).toBeDefined();
    expect(res.body.data.log.strand).toBe('Christian Values - Obedience');
    expect(res.body.data.log.reflection.comprehensionLevel).toBe('EXCELLENT');
    expect(res.body.data.log.reflection.whatWentWell).toContain('exceptionally engaged');
    expect(res.body.data.tracker.stats.totalDailyLogs).toBe(1);
    expect(res.body.data.tracker.stats.totalReflections).toBe(1);

    dailyLogId = res.body.data.log.id;
  });

  it('10. Teacher updates their daily log and refines remedial reflections', async () => {
    const res = await request(app)
      .put(`/api/v1/curriculum-tracker/${trackerId}/daily-logs/${dailyLogId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        activitiesConducted: 'Learners formed pairs, acted out scenarios of parental instructions and sang obedience anthem',
        reflection: {
          whatWentWell: 'Role-play and obedience anthem reinforced the lesson memorably.',
          remedialPlan: 'Buddies assigned for tomorrow; extra flashcards sent home.'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log.activitiesConducted).toContain('sang obedience anthem');
    expect(res.body.data.log.reflection.whatWentWell).toContain('obedience anthem');
    expect(res.body.data.log.reflection.remedialPlan).toContain('Buddies assigned');
    // Ensure original fields preserved
    expect(res.body.data.log.reflection.comprehensionLevel).toBe('EXCELLENT');
  });

  it('11. Headteacher and School Director can view centralized daily tracking logs across the school', async () => {
    const res = await request(app)
      .get('/api/v1/curriculum-tracker/daily-logs?date=2026-10-18')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);

    const targetLog = res.body.data.find((l: any) => l.id === dailyLogId);
    expect(targetLog).toBeDefined();
    expect(targetLog.subjectName).toBe('Christian Religious Education');
    expect(targetLog.className).toBe('Grade 3');
    expect(targetLog.reflection).toBeDefined();
    expect(targetLog.reflection.whatWentWell).toBeDefined();
  });

  it('12. Regular Teacher is forbidden from adding leadership endorsement', async () => {
    const res = await request(app)
      .post(`/api/v1/curriculum-tracker/${trackerId}/daily-logs/${dailyLogId}/endorse`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        remarks: 'Attempting to self-endorse'
      });

    expect(res.status).toBe(403);
  });

  it('13. Headteacher / School Director endorses the teacher’s daily tracking log with supervisory remarks', async () => {
    const res = await request(app)
      .post(`/api/v1/curriculum-tracker/${trackerId}/daily-logs/${dailyLogId}/endorse`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        remarks: 'Commendable use of collaborative role play and scripture integration. Approved for tomorrow’s continuation.'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log.endorsement).toBeDefined();
    expect(res.body.data.log.endorsement.remarks).toContain('Commendable use of collaborative role play');
    expect(res.body.data.log.endorsement.endorsedByRole).toBe('SUPER_ADMIN');
    expect(res.body.data.tracker.stats.totalEndorsements).toBe(1);
  });

  it('14. School Director can delete a daily log when required', async () => {
    const res = await request(app)
      .delete(`/api/v1/curriculum-tracker/${trackerId}/daily-logs/${dailyLogId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deleted
    const verifyRes = await request(app)
      .get(`/api/v1/curriculum-tracker/${trackerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verifyRes.status).toBe(200);
    const deletedLog = verifyRes.body.data.dailyLogs.find((l: any) => l.id === dailyLogId);
    expect(deletedLog).toBeUndefined();
  });
});
