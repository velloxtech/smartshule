import { AppContainer } from '../../src/infrastructure/container';
import { setupTestFixtures } from '../helpers/testFixtures';
import { Student, StudentGender, CBCGradeLevel, StudentStatus } from '../../src/core/domain/user/Student';
import { UserRole } from '../../src/core/domain/user/User';
import { ClassRoom, Stream, EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { AttendanceStatus, AttendanceType } from '../../src/core/domain/attendance/Attendance';

describe('Phase 2 & 8: Attendance Register Persistence, Dashboards, and Follow-Up', () => {
  let container: AppContainer;
  const schoolId = 'school-001';
  const academicYearId = 'year-2026';
  const termId = 'term-2026-1';
  const today = '2026-11-01';

  let grade3Class: ClassRoom;
  let grade3StreamEast: Stream;
  let student1: Student;
  let student2: Student;
  let student3: Student;

  beforeEach(async () => {
    container = new AppContainer();
    await setupTestFixtures(container);

    grade3Class = ClassRoom.create(
      {
        schoolId,
        name: 'Grade 3',
        gradeLevel: CBCGradeLevel.GRADE_3,
        educationLevel: EducationLevel.LOWER_PRIMARY
      },
      'class-grade-3'
    );
    await container.academicRepository.saveClass(grade3Class);

    grade3StreamEast = Stream.create(
      {
        classRoomId: grade3Class.id,
        name: 'East',
        capacity: 40
      },
      'stream-g3-east'
    );
    await container.academicRepository.saveStream(grade3StreamEast);

    student1 = Student.create(
      {
        schoolId,
        firstName: 'Faith',
        lastName: 'Chebet',
        admissionNumber: 'ADM-G3-001',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_3,
        classroomId: grade3Class.id,
        streamId: grade3StreamEast.id,
        dateOfBirth: '2016-01-01',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g3-001'
    );

    student2 = Student.create(
      {
        schoolId,
        firstName: 'Festus',
        lastName: 'Kibet',
        admissionNumber: 'ADM-G3-002',
        gender: StudentGender.MALE,
        gradeLevel: CBCGradeLevel.GRADE_3,
        classroomId: grade3Class.id,
        streamId: grade3StreamEast.id,
        dateOfBirth: '2016-02-02',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g3-002'
    );

    student3 = Student.create(
      {
        schoolId,
        firstName: 'Mercy',
        lastName: 'Nyambura',
        admissionNumber: 'ADM-G3-003',
        gender: StudentGender.FEMALE,
        gradeLevel: CBCGradeLevel.GRADE_3,
        classroomId: grade3Class.id,
        streamId: grade3StreamEast.id,
        dateOfBirth: '2016-03-03',
        academicYearId,
        guardianIds: [],
        status: StudentStatus.ACTIVE
      },
      'student-g3-003'
    );

    await container.studentRepository.save(student1);
    await container.studentRepository.save(student2);
    await container.studentRepository.save(student3);
  });

  test('1. Teacher marks Grade 3 register: faith present, festus absent, mercy excused', async () => {
    const register = await container.attendanceUseCases.markAttendance({
      schoolId,
      classRoomId: grade3Class.id,
      streamId: grade3StreamEast.id,
      academicYearId,
      termId,
      date: today,
      type: AttendanceType.DAILY_MORNING,
      markedByTeacherId: 'tch-001',
      entries: [
        { studentId: student1.id, status: AttendanceStatus.PRESENT },
        { studentId: student2.id, status: AttendanceStatus.ABSENT, remarks: 'Reported severe headache' },
        { studentId: student3.id, status: AttendanceStatus.EXCUSED, remarks: 'Family bereavement' }
      ]
    });

    expect(register).toBeDefined();
    expect(register.entries.length).toBe(3);

    // 2. Dashboard summary query for today reflects absent and excused learners accurately
    const dashboard = await container.analyticsUseCases.getSchoolDashboardSummary({
      schoolId,
      date: today,
      academicYearId,
      termId
    });

    expect(dashboard.attendanceSummary).toBeDefined();
    expect(dashboard.attendanceSummary.present).toBe(1);
    expect(dashboard.attendanceSummary.absent).toBe(1);
    expect(dashboard.attendanceSummary.excused).toBe(1);
    expect(dashboard.attendanceSummary.totalMarked).toBe(3);
    expect(dashboard.attendanceSummary.completedRegisters).toBe(1);

    // Absent learners list must include Festus Kibet with recorded remark
    const absentLearner = dashboard.attendanceSummary.absentLearnersList.find(
      (a: any) => a.studentId === student2.id
    );
    expect(absentLearner).toBeDefined();
    expect(absentLearner.remarks).toBe('Reported severe headache');
  });

  test('3. Absence follow-up recording logs parent contact and resolution', async () => {
    const register = await container.attendanceUseCases.markAttendance({
      schoolId,
      classRoomId: grade3Class.id,
      streamId: grade3StreamEast.id,
      academicYearId,
      termId,
      date: today,
      type: AttendanceType.DAILY_MORNING,
      markedByTeacherId: 'tch-001',
      entries: [
        { studentId: student2.id, status: AttendanceStatus.ABSENT, remarks: 'Fever reported' }
      ]
    });

    const updatedRegister = await container.attendanceUseCases.recordAbsenceFollowUp(
      register.id,
      student2.id,
      {
        contactMethod: 'PHONE_CALL',
        guardianResponse: 'Parent confirmed Festus visited clinic and will return Tuesday.',
        assignedTo: 'Tr. Sarah',
        resolutionStatus: 'RESOLVED',
        notes: 'Medical note expected on resumption'
      },
      { userId: 'user-head-1', role: UserRole.HEAD_TEACHER }
    );

    expect(updatedRegister).toBeDefined();
    const entry = updatedRegister.entries.find((e: any) => e.studentId === student2.id);
    expect(entry?.followUp).toBeDefined();
    expect(entry?.followUp?.contactMethod).toBe('PHONE_CALL');
    expect(entry?.followUp?.resolutionStatus).toBe('RESOLVED');
    expect(entry?.followUp?.guardianResponse).toContain('visited clinic');
  });

  test('4. Attendance trends identifies chronic absenteeism (3+ absences)', async () => {
    const dates = ['2026-10-28', '2026-10-29', '2026-10-30'];
    for (const d of dates) {
      await container.attendanceUseCases.markAttendance({
        schoolId,
        classRoomId: grade3Class.id,
        streamId: grade3StreamEast.id,
        academicYearId,
        termId,
        date: d,
        type: AttendanceType.DAILY_MORNING,
        markedByTeacherId: 'tch-001',
        entries: [
          { studentId: student1.id, status: AttendanceStatus.PRESENT },
          { studentId: student2.id, status: AttendanceStatus.ABSENT, remarks: 'Unwell' }
        ]
      });
    }

    const trends = await container.analyticsUseCases.getAttendanceTrends({
      schoolId,
      academicYearId,
      termId,
      days: 14
    });

    expect(trends.summaryMetrics.chronicAbsenteeCount).toBe(1);
    expect(trends.chronicAbsentees[0].studentId).toBe(student2.id);
    expect(trends.chronicAbsentees[0].absenceCount).toBe(3);
    expect(trends.dailyTrends.length).toBe(3);
  });
});
