import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import { DatabaseFactory } from '../src/infrastructure/database/DatabaseFactory';
import { Timetable } from '../src/core/domain/timetable/Timetable';
import { Student, StudentGender, CbcGradeLevel, StudentStatus } from '../src/core/domain/user/Student';
import { AttendanceRegister, AttendanceType } from '../src/core/domain/attendance/Attendance';
import { SchemeOfWork } from '../src/core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../src/core/domain/curriculum-plan/LessonPlan';
import { CbcReportCard, PerformanceLevel } from '../src/core/domain/cbc/CbcAssessment';

async function testFKs() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const repos = await DatabaseFactory.createRepositories('postgres');

  console.log('Testing timetable without stream (streamId: "")...');
  try {
    const tt = Timetable.create({
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      termId: 'term-2026-t1',
      classRoomId: '12bf58d9-31e3-4135-9a9d-548b93dcee2d',
      streamId: '',
      slots: [],
      isActive: true
    }, 'tt-test-01');
    await repos.timetableRepository.save(tt);
    console.log('✅ Timetable without stream saved successfully!');
  } catch (err: any) {
    console.error('❌ Timetable save failed:', err.message);
  }

  console.log('\nTesting student without stream (streamId: "" / undefined)...');
  try {
    const st = Student.create({
      admissionNumber: 'ADM-TEST-999',
      firstName: 'Test',
      lastName: 'Student',
      dateOfBirth: '2015-01-01',
      gender: StudentGender.MALE,
      gradeLevel: CbcGradeLevel.GRADE_1,
      classroomId: '12bf58d9-31e3-4135-9a9d-548b93dcee2d',
      streamId: undefined,
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardianIds: [],
      status: StudentStatus.ACTIVE
    }, 'std-test-999');
    await repos.studentRepository.save(st);
    console.log('✅ Student without stream saved successfully!');
  } catch (err: any) {
    console.error('❌ Student save failed:', err.message);
  }

  console.log('\nTesting attendance without stream (streamId: "")...');
  try {
    const att = AttendanceRegister.create({
      schoolId: 'school-001',
      classRoomId: '12bf58d9-31e3-4135-9a9d-548b93dcee2d',
      streamId: '',
      academicYearId: 'year-2026',
      termId: 'term-2026-t1',
      date: '2026-09-19',
      type: AttendanceType.DAILY_MORNING,
      markedByTeacherId: 'tch-default-01',
      entries: []
    }, 'att-test-01');
    await repos.attendanceRepository.saveRegister(att);
    console.log('✅ Attendance without stream saved successfully!');
  } catch (err: any) {
    console.error('❌ Attendance save failed:', err.message);
  }

  console.log('\nTesting report card without stream (streamId: "")...');
  try {
    const rc = CbcReportCard.create({
      studentId: '246879c2-8e67-422e-ba0f-8e099239569a',
      termId: 'term-2026-t1',
      academicYearId: 'year-2026',
      gradeLevel: CbcGradeLevel.GRADE_1,
      streamId: '',
      learningAreaAssessments: [],
      coreCompetencyAssessments: [],
      valueAssessments: [],
      attendanceDaysPresent: 58,
      attendanceDaysTotal: 60,
      classTeacherRemarks: 'Good',
      headTeacherRemarks: 'Good',
      overallAverageScore: 3.5,
      overallPerformanceLevel: PerformanceLevel.MEETING_EXPECTATIONS
    }, 'rc-test-01');
    await repos.cbcAssessmentRepository.saveReportCard(rc);
    console.log('✅ Report card without stream saved successfully!');
  } catch (err: any) {
    console.error('❌ Report card save failed:', err.message);
  }

  // Cleanup test records
  await pool.query("DELETE FROM timetables WHERE id = 'tt-test-01'").catch(() => {});
  await pool.query("DELETE FROM students WHERE id = 'std-test-999'").catch(() => {});
  await pool.query("DELETE FROM attendance_registers WHERE id = 'att-test-01'").catch(() => {});
  await pool.query("DELETE FROM cbc_report_cards WHERE id = 'rc-test-01'").catch(() => {});
  await pool.end();
}

testFKs();
