import request from 'supertest';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';
import { AttendanceStatus, AttendanceType } from '../../src/core/domain/attendance/Attendance';
import { ClassRoom, Stream, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';

describe('SMARTSHULE BUG FIXES: Daily Attendance Status and Admin Notice Board', () => {
  let app: any;
  let container: AppContainer;
  let adminToken: string;
  let teacherToken: string;
  let parentToken: string;

  const schoolId = 'school-001';
  const testDate = '2026-11-15';
  let testClass: ClassRoom;
  let testStream: Stream;

  beforeAll(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // Create a classroom and stream
    testClass = ClassRoom.create(
      {
        schoolId,
        name: 'Grade 7',
        gradeLevel: CBCGradeLevel.GRADE_7,
        educationLevel: EducationLevel.JUNIOR_SCHOOL
      },
      'class-g7'
    );
    await container.academicRepository.saveClass(testClass);

    testStream = Stream.create(
      {
        classRoomId: testClass.id,
        name: 'Stream North',
        capacity: 120
      },
      'stream-g7-north'
    );
    await container.academicRepository.saveStream(testStream);

    // 1. Admin login
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@smartshule.ac.ke', password: 'Admin@123' });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;

    // 2. Teacher login
    const teacherLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'teacher@smartshule.ac.ke', password: 'Teacher@123' });
    expect(teacherLoginRes.status).toBe(200);
    teacherToken = teacherLoginRes.body.data.accessToken;

    // 3. Parent login
    const parentLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'parent@smartshule.ac.ke', password: 'Parent@123' });
    expect(parentLoginRes.status).toBe(200);
    parentToken = parentLoginRes.body.data.accessToken;
  });

  describe('1. Daily Attendance Status Distinction & Admin Dashboard', () => {
    it('strictly distinguishes PRESENT, ABSENT, LATE, and EXCUSED without conflating them', async () => {
      // Create 100 students: 85 PRESENT, 10 ABSENT, 3 LATE, 2 EXCUSED
      const entries: Array<{ studentId: string; status: AttendanceStatus; remarks?: string }> = [];

      for (let i = 1; i <= 85; i++) {
        const student = Student.create(
          {
            schoolId,
            firstName: `LearnerP`,
            lastName: `${i}`,
            admissionNumber: `ADM-P-${i}`,
            gender: StudentGender.MALE,
            gradeLevel: CBCGradeLevel.GRADE_7,
            classroomId: testClass.id,
            streamId: testStream.id,
            dateOfBirth: '2013-01-01',
            academicYearId: 'year-2026',
            guardianIds: [],
            status: StudentStatus.ACTIVE
          },
          `pupil-p-${i}`
        );
        await container.studentRepository.save(student);
        entries.push({ studentId: student.id, status: AttendanceStatus.PRESENT });
      }

      for (let i = 1; i <= 10; i++) {
        const student = Student.create(
          {
            schoolId,
            firstName: `LearnerA`,
            lastName: `${i}`,
            admissionNumber: `ADM-A-${i}`,
            gender: StudentGender.FEMALE,
            gradeLevel: CBCGradeLevel.GRADE_7,
            classroomId: testClass.id,
            streamId: testStream.id,
            dateOfBirth: '2013-01-01',
            academicYearId: 'year-2026',
            guardianIds: [],
            status: StudentStatus.ACTIVE
          },
          `pupil-a-${i}`
        );
        await container.studentRepository.save(student);
        entries.push({ studentId: student.id, status: AttendanceStatus.ABSENT, remarks: 'Family emergency' });
      }

      for (let i = 1; i <= 3; i++) {
        const student = Student.create(
          {
            schoolId,
            firstName: `LearnerL`,
            lastName: `${i}`,
            admissionNumber: `ADM-L-${i}`,
            gender: StudentGender.MALE,
            gradeLevel: CBCGradeLevel.GRADE_7,
            classroomId: testClass.id,
            streamId: testStream.id,
            dateOfBirth: '2013-01-01',
            academicYearId: 'year-2026',
            guardianIds: [],
            status: StudentStatus.ACTIVE
          },
          `pupil-l-${i}`
        );
        await container.studentRepository.save(student);
        entries.push({ studentId: student.id, status: AttendanceStatus.LATE, remarks: 'Traffic delay' });
      }

      for (let i = 1; i <= 2; i++) {
        const student = Student.create(
          {
            schoolId,
            firstName: `LearnerE`,
            lastName: `${i}`,
            admissionNumber: `ADM-E-${i}`,
            gender: StudentGender.FEMALE,
            gradeLevel: CBCGradeLevel.GRADE_7,
            classroomId: testClass.id,
            streamId: testStream.id,
            dateOfBirth: '2013-01-01',
            academicYearId: 'year-2026',
            guardianIds: [],
            status: StudentStatus.ACTIVE
          },
          `pupil-e-${i}`
        );
        await container.studentRepository.save(student);
        entries.push({ studentId: student.id, status: AttendanceStatus.EXCUSED, remarks: 'Medical appointment' });
      }

      expect(entries.length).toBe(100);

      // Submit attendance roll call
      const markRes = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId,
          classRoomId: testClass.id,
          streamId: testStream.id,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'admin-001',
          entries
        });

      expect(markRes.status).toBe(200);
      expect(markRes.body.success).toBe(true);

      // Query Admin Dashboard Summary for testDate
      const dashboardRes = await request(app)
        .get(`/api/v1/analytics/dashboard?date=${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.body.success).toBe(true);

      const attSummary = dashboardRes.body.data.attendanceSummary;
      expect(attSummary).toBeDefined();
      expect(attSummary.hasData).toBe(true);
      expect(attSummary.date).toBe(testDate);

      // Verify exact counts as mandated by the user specification:
      // 85 PRESENT, 10 ABSENT, 3 LATE, 2 EXCUSED
      expect(attSummary.present).toBe(85);
      expect(attSummary.absent).toBe(10);
      expect(attSummary.late).toBe(3);
      expect(attSummary.excused).toBe(2);
      expect(attSummary.totalMarked).toBe(100);

      // Present percentage is calculated accurately based on 85 / 100 = 85%
      expect(attSummary.presentPercentage).toBe(85);

      // Absent learners list contains absent (10) and excused (2)
      expect(attSummary.absentLearnersList.length).toBe(12);
    });

    it('reports empty state for unrecorded dates rather than claiming 100% attendance', async () => {
      const futureDate = '2026-12-25';

      const dashboardRes = await request(app)
        .get(`/api/v1/analytics/dashboard?date=${futureDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardRes.status).toBe(200);
      const attSummary = dashboardRes.body.data.attendanceSummary;

      expect(attSummary.hasData).toBe(false);
      expect(attSummary.present).toBe(0);
      expect(attSummary.absent).toBe(0);
      expect(attSummary.late).toBe(0);
      expect(attSummary.excused).toBe(0);
      expect(attSummary.totalMarked).toBe(0);
      expect(attSummary.presentPercentage).toBeNull();
    });

    it('submitting attendance updates existing register and invalidates dashboard cache', async () => {
      const syncStudent = Student.create(
        {
          schoolId,
          firstName: 'SyncLearner',
          lastName: 'Test',
          admissionNumber: 'ADM-SYNC-001',
          gender: StudentGender.MALE,
          gradeLevel: CBCGradeLevel.GRADE_7,
          classroomId: testClass.id,
          streamId: testStream.id,
          dateOfBirth: '2013-01-01',
          academicYearId: 'year-2026',
          guardianIds: [],
          status: StudentStatus.ACTIVE
        },
        'pupil-sync-1'
      );
      await container.studentRepository.save(syncStudent);

      // Mark initial: 1 pupil ABSENT
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId,
          classRoomId: testClass.id,
          streamId: testStream.id,
          date: '2026-11-16',
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'admin-001',
          entries: [{ studentId: syncStudent.id, status: AttendanceStatus.ABSENT }]
        });

      let dashRes = await request(app)
        .get('/api/v1/analytics/dashboard?date=2026-11-16')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashRes.body.data.attendanceSummary.absent).toBe(1);
      expect(dashRes.body.data.attendanceSummary.present).toBe(0);

      // Update pupil to PRESENT
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId,
          classRoomId: testClass.id,
          streamId: testStream.id,
          date: '2026-11-16',
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'admin-001',
          entries: [{ studentId: syncStudent.id, status: AttendanceStatus.PRESENT }]
        });

      // Query dashboard immediately: must reflect 1 PRESENT, 0 ABSENT
      dashRes = await request(app)
        .get('/api/v1/analytics/dashboard?date=2026-11-16')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashRes.body.data.attendanceSummary.present).toBe(1);
      expect(dashRes.body.data.attendanceSummary.absent).toBe(0);
    });
  });

  describe('2. Notice Board – Admin Add Notice & Audience Security', () => {
    it('starts with a blank notice board by default (no hardcoded seed notices)', async () => {
      const res = await request(app)
        .get('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('rejects teachers from creating announcements (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Unauthorized Notice by Teacher',
          content: 'This should be blocked',
          category: 'GENERAL',
          priority: 'NORMAL',
          targetAudience: 'ALL'
        });

      expect(res.status).toBe(403);
    });

    it('allows administrators to create and publish official notices', async () => {
      const createRes = await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Term 3 Opening Circular',
          content: 'All learners must report on Monday 8:00 AM in full school uniform.',
          category: 'GENERAL',
          priority: 'HIGH',
          targetAudience: 'ALL',
          status: 'PUBLISHED'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.title).toBe('Term 3 Opening Circular');
      expect(createRes.body.data.status).toBe('PUBLISHED');
    });

    it('enforces audience isolation: parents only receive PARENTS or ALL notices', async () => {
      // 1. Create Teacher-only notice
      await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Staff Meeting Agenda',
          content: 'Teachers meeting at 4:00 PM in the staffroom.',
          category: 'ACADEMIC',
          priority: 'NORMAL',
          targetAudience: 'TEACHERS',
          status: 'PUBLISHED'
        });

      // 2. Create Parent-only notice
      await request(app)
        .post('/api/v1/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'PTA Annual General Meeting',
          content: 'Parents are invited to the main school hall.',
          category: 'EVENT',
          priority: 'HIGH',
          targetAudience: 'PARENTS',
          status: 'PUBLISHED'
        });

      // 3. Parent queries notices
      const parentRes = await request(app)
        .get('/api/v1/announcements')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(parentRes.status).toBe(200);
      const parentTitles = parentRes.body.data.map((n: any) => n.title);
      expect(parentTitles).toContain('PTA Annual General Meeting'); // PARENTS
      expect(parentTitles).not.toContain('Staff Meeting Agenda'); // TEACHERS - must be hidden!

      // 4. Teacher queries notices
      const teacherRes = await request(app)
        .get('/api/v1/announcements')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(teacherRes.status).toBe(200);
      const teacherTitles = teacherRes.body.data.map((n: any) => n.title);
      expect(teacherTitles).toContain('Staff Meeting Agenda'); // TEACHERS
      expect(teacherTitles).not.toContain('PTA Annual General Meeting'); // PARENTS - must be hidden!
    });
  });
});
