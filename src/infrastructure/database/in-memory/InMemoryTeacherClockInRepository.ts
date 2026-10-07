import { ITeacherClockInRepository, ClockInFilterCriteria } from '../../../core/ports/repositories/ITeacherClockInRepository';
import { TeacherClockIn } from '../../../core/domain/attendance/TeacherClockIn';

export class InMemoryTeacherClockInRepository implements ITeacherClockInRepository {
  private records: Map<string, TeacherClockIn> = new Map();

  public async findById(id: string): Promise<TeacherClockIn | null> {
    return this.records.get(id) || null;
  }

  public async findTodayRecord(teacherId: string, date: string): Promise<TeacherClockIn | null> {
    for (const record of this.records.values()) {
      if (record.teacherId === teacherId && record.date === date) {
        return record;
      }
    }
    return null;
  }

  public async findRecords(filters: ClockInFilterCriteria): Promise<TeacherClockIn[]> {
    let result = Array.from(this.records.values());

    if (filters.schoolId) {
      result = result.filter(r => r.schoolId === filters.schoolId);
    }
    if (filters.teacherId) {
      result = result.filter(r => r.teacherId === filters.teacherId);
    }
    if (filters.date) {
      result = result.filter(r => r.date === filters.date);
    }

    return result.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async save(record: TeacherClockIn): Promise<void> {
    this.records.set(record.id, record);
  }

  public async update(record: TeacherClockIn): Promise<void> {
    this.records.set(record.id, record);
  }
}
