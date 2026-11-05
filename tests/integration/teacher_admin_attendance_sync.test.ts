import request from 'supertest';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { setupTestFixtures, setupTestRoleAccounts } from '../helpers/testFixtures';
import { ClassRoom, Stream, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { AttendanceStatus, AttendanceType } from '../../src/core/domain/attendance/Attendance';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { UserRole } from '../../src/core/domain/user/User';
import { ClassTeacherAssignment } from '../../src/core/domain/academic/TeacherAssignment';

describe('Teacher Roll Call / Attendance Marking Integration with Admin Dashboard', () => {
  let container: AppContainer;
  let app: any;
  let teacherToken: string;
  let adminToken: string;

  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-1';
  const testDate = '2026-11-04';

  let grade4Class: ClassRoom;
  let grade4StreamEast: Stream;
  let grade5Class: ClassRoom;
  let student1: Student;
  let student2: Student;
  let student3: Student;
  let student4: Student;
  let studentG5: Student;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);
    await setupTestRoleAccounts(container);
    app = createExpressApp(container);

    // 1. Create Classrooms & Streams
    grade4Class = ClassRoom.create(
      {
        schoolId,
        name: 'Grade 4',
        gradeLevel: CBCGradeLevel.GRADE_4,
        educationLevel: EducationLevel.UPPER_PRIMARY
      },
      'class-g4'
    );
    await container.academicRepository.saveClass(grade4Class);

    grade4StreamEast = Stream.create(
      {
        classRoomId: grade4Class.id,
        name: 'Stream East',
        capacity: 40
      },
      'stream-g4-east'
    );
    await container.academicRepository.saveStream(grade4StreamEast);

    grade5Class = ClassRoom.create(
      {
        schoolId,
        name: 'Grade 5',
        gradeLevel: CBCGradeLevel.GRADE_5,
        educationLevel: EducationLevel.UPPER_PRIMARY
      },
      'class-g5'
    );
    await container.academicRepository.saveClass(grade5Class);

    // 2. Create Students for Grade 4 East
    student1 = Student.create(
      {
        schoolId,
        firstName: 'Emmanuel',
        lastName: 'Mutua',
        admissionNumber: 'ADM-G4-001',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        classroomId: grade4Class.id,
        streamId: grade4StreamEast.id,
        dateOfBirth: '2015-01-01',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g4-001'
    );

    student2 = Student.create(
      {
        schoolId,
        firstName: 'Faith',
        lastName: 'Chebet',
        admissionNumber: 'ADM-G4-002',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        classroomId: grade4Class.id,
        streamId: grade4StreamEast.id,
        dateOfBirth: '2015-02-02',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g4-002'
    );

    student3 = Student.create(
      {
        schoolId,
        firstName: 'Brian',
        lastName: 'Omondi',
        admissionNumber: 'ADM-G4-003',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        classroomId: grade4Class.id,
        streamId: grade4StreamEast.id,
        dateOfBirth: '2015-03-03',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g4-003'
    );

    student4 = Student.create(
      {
        schoolId,
        firstName: 'Mercy',
        lastName: 'Nyambura',
        admissionNumber: 'ADM-G4-004',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_4,
        classroomId: grade4Class.id,
        streamId: grade4StreamEast.id,
        dateOfBirth: '2015-04-04',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g4-004'
    );

    studentG5 = Student.create(
      {
        schoolId,
        firstName: 'Daniel',
        lastName: 'Kimani',
        admissionNumber: 'ADM-G5-001',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_5,
        classroomId: grade5Class.id,
        dateOfBirth: '2014-05-05',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g5-001'
    );

    await container.studentRepository.save(student1);
    await container.studentRepository.save(student2);
    await container.studentRepository.save(student3);
    await container.studentRepository.save(student4);
    await container.studentRepository.save(studentG5);

    // 3. Assign Teacher to Grade 4 East
    const teacherUser = await container.userRepository.findByEmail('teacher@smartshule.ac.ke');
    if (teacherUser) {
      let teacherProfile = await container.teacherRepository.findByUserId(teacherUser.id);
      if (teacherProfile) {
        teacherProfile.assignStream(grade4StreamEast.id);
        await container.teacherRepository.update(teacherProfile);
      } else {
        teacherProfile = Teacher.create(
          {
            userId: teacherUser.id,
            tscNumber: 'TSC-123456',
            employeeNumber: 'EMP-001',
            specialization: ['Mathematics'],
            assignedClassStreamIds: [grade4StreamEast.id]
          },
          'tch-profile-001'
        );
        await container.teacherRepository.save(teacherProfile);
      }

      const cta = ClassTeacherAssignment.create(
        {
          schoolId,
          teacherId: teacherProfile.id,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          isActive: true
        },
        'cta-g4-east'
      );
      await container.academicRepository.saveClassTeacherAssignment(cta);
    }

    // 4. Log in as Teacher
    const teacherLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'teacher@smartshule.ac.ke',
      password: 'Teacher@123'
    });
    expect(teacherLogin.status).toBe(200);
    teacherToken = teacherLogin.body.data.accessToken;

    // 5. Log in as Admin
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@smartshule.ac.ke',
      password: 'Admin@123'
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;
  });

  describe('Complete Teacher -> Backend -> Admin Dashboard Workflow', () => {
    it('1. Teacher marks roll call: 2 Present, 1 Late, 1 Absent', async () => {
      const markRes = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          termId,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'tch-profile-001',
          entries: [
            { studentId: student1.id, status: AttendanceStatus.PRESENT, remarks: 'On time' },
            { studentId: student2.id, status: AttendanceStatus.PRESENT, remarks: 'On time' },
            { studentId: student3.id, status: AttendanceStatus.LATE, remarks: 'Traffic delay' },
            { studentId: student4.id, status: AttendanceStatus.ABSENT, remarks: 'Flu symptoms' }
          ]
        });

      expect(markRes.status).toBe(200);
      expect(markRes.body.success).toBe(true);
      expect(markRes.body.data).toBeDefined();
      expect(markRes.body.data.entries.length).toBe(4);
      expect(markRes.body.data.summary.present).toBe(2);
      expect(markRes.body.data.summary.late).toBe(1);
      expect(markRes.body.data.summary.absent).toBe(1);
      expect(markRes.body.data.summary.attendancePercentage).toBe(75); // (2 Present + 1 Late) / 4 = 75%
    });

    it('2. Admin dashboard immediately reflects the teacher roll call records', async () => {
      // Step A: Mark roll call as teacher
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          termId,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'tch-profile-001',
          entries: [
            { studentId: student1.id, status: AttendanceStatus.PRESENT },
            { studentId: student2.id, status: AttendanceStatus.PRESENT },
            { studentId: student3.id, status: AttendanceStatus.LATE },
            { studentId: student4.id, status: AttendanceStatus.ABSENT, remarks: 'Unexcused' }
          ]
        });

      // Step B: Admin fetches dashboard analytics for that date
      const adminDashRes = await request(app)
        .get(`/api/v1/analytics/dashboard?date=${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminDashRes.status).toBe(200);
      const attSummary = adminDashRes.body.data.attendanceSummary;
      expect(attSummary).toBeDefined();
      expect(attSummary.hasData).toBe(true);
      expect(attSummary.totalMarked).toBe(4);
      expect(attSummary.present).toBe(3); // 2 Present + 1 Late
      expect(attSummary.late).toBe(1);
      expect(attSummary.absent).toBe(1);
      expect(attSummary.presentPercentage).toBe(75);
      expect(attSummary.completedRegisters).toBe(1);

      // Absent learners list must include Mercy Nyambura
      expect(attSummary.absentLearnersList.length).toBe(1);
      expect(attSummary.absentLearnersList[0].studentId).toBe(student4.id);
      expect(attSummary.absentLearnersList[0].studentName).toBe('Mercy Nyambura');

      // Step C: Admin fetches attendance report endpoint used by Dashboard KPI
      const reportRes = await request(app)
        .get(`/api/v1/attendance/report?date=${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reportRes.status).toBe(200);
      expect(reportRes.body.data.totalRegisters).toBe(1);
      expect(reportRes.body.data.aggregateStats.present).toBe(2);
      expect(reportRes.body.data.aggregateStats.late).toBe(1);
      expect(reportRes.body.data.aggregateStats.absent).toBe(1);
      expect(reportRes.body.data.aggregateStats.overallAttendanceRate).toBe(75);
    });

    it('3. Admin updates student attendance and Teacher sees the updated result', async () => {
      // Step A: Teacher marks student4 as ABSENT
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          termId,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'tch-profile-001',
          entries: [
            { studentId: student1.id, status: AttendanceStatus.PRESENT },
            { studentId: student2.id, status: AttendanceStatus.PRESENT },
            { studentId: student3.id, status: AttendanceStatus.LATE },
            { studentId: student4.id, status: AttendanceStatus.ABSENT, remarks: 'Reported sick' }
          ]
        });

      // Step B: Admin reviews and excuses student4's absence with doctor note
      const adminUpdateRes = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          termId,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'usr-admin-01',
          entries: [
            { studentId: student1.id, status: AttendanceStatus.PRESENT },
            { studentId: student2.id, status: AttendanceStatus.PRESENT },
            { studentId: student3.id, status: AttendanceStatus.LATE },
            { studentId: student4.id, status: AttendanceStatus.EXCUSED, remarks: 'Doctor certificate provided to principal' }
          ]
        });

      expect(adminUpdateRes.status).toBe(200);

      // Step C: Teacher loads daily register for Grade 4 East and sees EXCUSED status
      const teacherGetRes = await request(app)
        .get(`/api/v1/attendance/daily?streamId=${grade4StreamEast.id}&date=${testDate}&classRoomId=${grade4Class.id}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(teacherGetRes.status).toBe(200);
      const student4Entry = teacherGetRes.body.data.entries.find((e: any) => e.studentId === student4.id);
      expect(student4Entry).toBeDefined();
      expect(student4Entry.status).toBe(AttendanceStatus.EXCUSED);
      expect(student4Entry.remarks).toContain('Doctor certificate');

      // Step D: Admin dashboard reflects the correction
      const adminDashRes = await request(app)
        .get(`/api/v1/analytics/dashboard?date=${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminDashRes.status).toBe(200);
      expect(adminDashRes.body.data.attendanceSummary.absent).toBe(0);
      expect(adminDashRes.body.data.attendanceSummary.excused).toBe(1);
    });

    it('4. Submitting attendance multiple times does not produce duplicate registers', async () => {
      // Submit 1
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          termId,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'tch-profile-001',
          entries: [
            { studentId: student1.id, status: AttendanceStatus.PRESENT },
            { studentId: student2.id, status: AttendanceStatus.PRESENT }
          ]
        });

      // Submit 2 (e.g. user re-clicks or edits)
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          termId,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'tch-profile-001',
          entries: [
            { studentId: student1.id, status: AttendanceStatus.PRESENT },
            { studentId: student2.id, status: AttendanceStatus.LATE }
          ]
        });

      // Verify report returns exactly 1 register, not 2
      const reportRes = await request(app)
        .get(`/api/v1/attendance/report?date=${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reportRes.status).toBe(200);
      expect(reportRes.body.data.totalRegisters).toBe(1);
      expect(reportRes.body.data.registers.length).toBe(1);
      expect(reportRes.body.data.aggregateStats.totalCheckins).toBe(2);
    });

    it('5. Handles multiple classes and dates independently with accurate summaries', async () => {
      // Mark Grade 4 on Nov 4
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId,
          classRoomId: grade4Class.id,
          streamId: grade4StreamEast.id,
          academicYearId,
          termId,
          date: '2026-11-04',
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'usr-admin-01',
          entries: [
            { studentId: student1.id, status: AttendanceStatus.PRESENT },
            { studentId: student2.id, status: AttendanceStatus.PRESENT }
          ]
        });

      // Mark Grade 5 (single cohort, no stream) on Nov 4
      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          schoolId,
          classRoomId: grade5Class.id,
          academicYearId,
          termId,
          date: '2026-11-04',
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'usr-admin-01',
          entries: [
            { studentG5Id: studentG5.id, studentId: studentG5.id, status: AttendanceStatus.ABSENT, remarks: 'Sick leave' }
          ]
        });

      // Query dashboard for Nov 4
      const dashNov4 = await request(app)
        .get('/api/v1/analytics/dashboard?date=2026-11-04')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashNov4.status).toBe(200);
      expect(dashNov4.body.data.attendanceSummary.totalMarked).toBe(3);
      expect(dashNov4.body.data.attendanceSummary.present).toBe(2);
      expect(dashNov4.body.data.attendanceSummary.absent).toBe(1);
      expect(dashNov4.body.data.attendanceSummary.completedRegisters).toBe(2);

      // Query dashboard for Nov 5 (unmarked date)
      const dashNov5 = await request(app)
        .get('/api/v1/analytics/dashboard?date=2026-11-05')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashNov5.status).toBe(200);
      expect(dashNov5.body.data.attendanceSummary.hasData).toBe(false);
      expect(dashNov5.body.data.attendanceSummary.totalMarked).toBe(0);
      expect(dashNov5.body.data.attendanceSummary.presentPercentage).toBeNull();
    });

    it('6. Enforces role-based permissions: teacher cannot mark unassigned class', async () => {
      // Teacher attempts to mark Grade 5 (not assigned to them)
      const res = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          schoolId,
          classRoomId: grade5Class.id,
          academicYearId,
          termId,
          date: testDate,
          type: AttendanceType.DAILY_MORNING,
          markedByTeacherId: 'tch-profile-001',
          entries: [
            { studentId: studentG5.id, status: AttendanceStatus.PRESENT }
          ]
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });
});
