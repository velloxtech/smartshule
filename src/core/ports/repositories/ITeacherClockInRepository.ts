import { TeacherClockIn } from '../../domain/attendance/TeacherClockIn';

export interface ClockInFilterCriteria {
  schoolId?: string;
  teacherId?: string;
  date?: string;
}

export interface ITeacherClockInRepository {
  findById(id: string): Promise<TeacherClockIn | null>;
  findTodayRecord(teacherId: string, date: string): Promise<TeacherClockIn | null>;
  findRecords(filters: ClockInFilterCriteria): Promise<TeacherClockIn[]>;
  save(record: TeacherClockIn): Promise<void>;
  update(record: TeacherClockIn): Promise<void>;
}
