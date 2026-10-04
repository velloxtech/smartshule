import { Timetable, DayOfWeek } from '../../domain/timetable/Timetable';
import { AttendanceRegister, AttendanceType } from '../../domain/attendance/Attendance';

export interface ITimetableRepository {
  findById(id: string): Promise<Timetable | null>;
  findByStream(streamId: string, termId?: string): Promise<Timetable | null>;
  findByClass(classRoomId: string, termId?: string): Promise<Timetable[]>;
  findByTeacher(teacherId: string, termId?: string): Promise<{
    id?: string;
    timetableId?: string;
    classRoomId?: string;
    streamId?: string;
    dayOfWeek: DayOfWeek | string;
    periodNumber: number;
    learningAreaName?: string;
    learningAreaId?: string;
    roomName?: string;
    startTime: string;
    endTime: string;
    isBreak?: boolean;
    isLunch?: boolean;
    label?: string;
    teacherName?: string;
  }[]>;
  save(timetable: Timetable): Promise<void>;
  update(timetable: Timetable): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface AttendanceFilterCriteria {
  schoolId?: string;
  classRoomId?: string;
  streamId?: string;
  termId?: string;
  academicYearId?: string;
  startDate?: string;
  endDate?: string;
  type?: AttendanceType;
}

export interface IAttendanceRepository {
  findRegisterById(id: string): Promise<AttendanceRegister | null>;
  findRegister(streamId: string, date: string, type: AttendanceType, classRoomId?: string): Promise<AttendanceRegister | null>;
  findRegisters(filters: AttendanceFilterCriteria): Promise<AttendanceRegister[]>;
  saveRegister(register: AttendanceRegister): Promise<void>;
  updateRegister(register: AttendanceRegister): Promise<void>;
  findRegistersByStudent?(studentId: string): Promise<AttendanceRegister[]>;
  removeStudentFromRegisters(studentId: string): Promise<void>;
}
