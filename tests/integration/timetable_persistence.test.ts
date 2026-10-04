import request from 'supertest';
import { Express } from 'express';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures } from '../helpers/testFixtures';

describe('Timetable Active Persistence Integration Tests', () => {
  let app: Express;
  let container: AppContainer;
  let adminToken: string;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    app = createExpressApp(container);

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });

    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;
  });

  it('should actively save timetable grid with periods, days, and slots to database and retrieve them', async () => {
    const classRoomId = 'test-class-' + Date.now();
    const periodsPayload = [
      { periodNumber: 1, name: 'Morning Literacy', startTime: '08:00', endTime: '08:45', isBreak: false, isLunch: false },
      { periodNumber: 2, name: 'Numeracy Foundations', startTime: '08:45', endTime: '09:30', isBreak: false, isLunch: false },
      { periodNumber: 3, name: 'Morning Break', startTime: '09:30', endTime: '10:00', isBreak: true, isLunch: false },
      { periodNumber: 4, name: 'Environmental Activities', startTime: '10:00', endTime: '10:45', isBreak: false, isLunch: false },
    ];
    const daysPayload = [
      { dayOfWeek: 'MONDAY', label: 'Monday', isEnabled: true },
      { dayOfWeek: 'TUESDAY', label: 'Tuesday', isEnabled: true },
      { dayOfWeek: 'WEDNESDAY', label: 'Wednesday', isEnabled: true },
    ];
    const slotsPayload = [
      {
        id: 'slot-1',
        dayOfWeek: 'MONDAY',
        periodNumber: 1,
        startTime: '08:00',
        endTime: '08:45',
        learningAreaName: 'Language Activities',
        teacherName: 'Mdm. Grace',
        roomName: 'PP1 Blue Room',
        isBreak: false,
        isLunch: false,
      },
      {
        id: 'slot-2',
        dayOfWeek: 'MONDAY',
        periodNumber: 3,
        startTime: '09:30',
        endTime: '10:00',
        isBreak: true,
        isLunch: false,
        label: 'Mid-Morning Milk & Break',
      }
    ];

    // Act: Save grid actively
    const saveRes = await request(app)
      .post('/api/v1/timetables/grid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
        classRoomId,
        periods: periodsPayload,
        days: daysPayload,
        slots: slotsPayload,
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);
    expect(saveRes.body.data).toBeDefined();
    expect(saveRes.body.data.periods.length).toBe(4);
    expect(saveRes.body.data.days.length).toBe(3);
    expect(saveRes.body.data.slots.length).toBe(2);

    const savedId = saveRes.body.data.id;

    // Assert: Retrieve by class with exact term
    const getRes = await request(app)
      .get(`/api/v1/timetables/stream?classRoomId=${classRoomId}&termId=term-2026-t1`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.id).toBe(savedId);
    expect(getRes.body.data.periods[0].name).toBe('Morning Literacy');
    expect(getRes.body.data.days[0].label).toBe('Monday');
    expect(getRes.body.data.slots[0].learningAreaName).toBe('Language Activities');

    // Assert: Retrieve by class WITHOUT termId (fallback matching)
    const getNoTermRes = await request(app)
      .get(`/api/v1/timetables/stream?classRoomId=${classRoomId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getNoTermRes.status).toBe(200);
    expect(getNoTermRes.body.success).toBe(true);
    expect(getNoTermRes.body.data.id).toBe(savedId);

    // Delete a slot
    const deleteRes = await request(app)
      .delete(`/api/v1/timetables/${savedId}/slots/slot-1`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data.slots.length).toBe(1);
  });

  it('should revoke scheduling when a teacher is assigned to two classes at a go', async () => {
    const classRoom1 = 'clash-class-1-' + Date.now();
    const classRoom2 = 'clash-class-2-' + Date.now();
    const sharedTeacherId = 'teacher-clash-test-01';
    const termId = 'term-2026-t1';

    // 1. Assign teacher to Class 1 on MONDAY Period 2
    const slot1Res = await request(app)
      .post('/api/v1/timetables/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId,
        classRoomId: classRoom1,
        dayOfWeek: 'MONDAY',
        periodNumber: 2,
        startTime: '08:45',
        endTime: '09:30',
        learningAreaName: 'Mathematics',
        teacherId: sharedTeacherId,
        teacherName: 'Tr. Kennedy',
        roomName: 'Grade 4 Room'
      });

    expect(slot1Res.status).toBe(200);
    expect(slot1Res.body.success).toBe(true);

    // 2. Attempt to assign same teacher to Class 2 on MONDAY Period 2 via addSlot -> MUST be revoked with 409
    const clashSlotRes = await request(app)
      .post('/api/v1/timetables/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId,
        classRoomId: classRoom2,
        dayOfWeek: 'MONDAY',
        periodNumber: 2,
        startTime: '08:45',
        endTime: '09:30',
        learningAreaName: 'Integrated Science',
        teacherId: sharedTeacherId,
        teacherName: 'Tr. Kennedy',
        roomName: 'Grade 5 Room'
      });

    expect(clashSlotRes.status).toBe(409);
    expect(clashSlotRes.body.success).toBe(false);
    expect(clashSlotRes.body.message).toMatch(/Clash|already scheduled/i);

    // 3. Attempt to assign same teacher to Class 2 on MONDAY Period 2 via saveGrid -> MUST be revoked with 409
    const clashGridRes = await request(app)
      .post('/api/v1/timetables/grid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId,
        classRoomId: classRoom2,
        periods: [
          { periodNumber: 1, name: 'P1', startTime: '08:00', endTime: '08:45', isBreak: false, isLunch: false },
          { periodNumber: 2, name: 'P2', startTime: '08:45', endTime: '09:30', isBreak: false, isLunch: false },
        ],
        days: [{ dayOfWeek: 'MONDAY', label: 'Monday', isEnabled: true }],
        slots: [
          {
            id: 'slot-clash-grid',
            dayOfWeek: 'MONDAY',
            periodNumber: 2,
            startTime: '08:45',
            endTime: '09:30',
            learningAreaName: 'Integrated Science',
            teacherId: sharedTeacherId,
            teacherName: 'Tr. Kennedy',
            roomName: 'Grade 5 Room',
            isBreak: false,
            isLunch: false,
          }
        ]
      });

    expect(clashGridRes.status).toBe(409);
    expect(clashGridRes.body.success).toBe(false);
    expect(clashGridRes.body.message).toMatch(/Clash|already scheduled/i);
  });
});
