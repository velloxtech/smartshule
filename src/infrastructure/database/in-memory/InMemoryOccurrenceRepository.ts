import {
  IOccurrenceRepository,
  OccurrenceFilterCriteria
} from '../../../core/ports/repositories/IOccurrenceRepository';
import { OccurrenceRecord } from '../../../core/domain/occurrence/OccurrenceRecord';

export class InMemoryOccurrenceRepository implements IOccurrenceRepository {
  private occurrences: Map<string, OccurrenceRecord> = new Map();

  public async findById(id: string): Promise<OccurrenceRecord | null> {
    return this.occurrences.get(id) || null;
  }

  public async findByOccurrenceNumber(
    occurrenceNumber: string,
    schoolId?: string
  ): Promise<OccurrenceRecord | null> {
    for (const item of this.occurrences.values()) {
      if (item.occurrenceNumber === occurrenceNumber) {
        if (!schoolId || item.schoolId === schoolId) {
          return item;
        }
      }
    }
    return null;
  }

  public async findOccurrences(filters: OccurrenceFilterCriteria): Promise<OccurrenceRecord[]> {
    let list = Array.from(this.occurrences.values());

    if (filters.schoolId) {
      list = list.filter(r => r.schoolId === filters.schoolId);
    }
    if (filters.date) {
      list = list.filter(r => r.date === filters.date);
    }
    if (filters.startDate) {
      list = list.filter(r => r.date >= filters.startDate!);
    }
    if (filters.endDate) {
      list = list.filter(r => r.date <= filters.endDate!);
    }
    if (filters.category) {
      list = list.filter(r => r.category === filters.category);
    }
    if (filters.severity) {
      list = list.filter(r => r.severity === filters.severity);
    }
    if (filters.status) {
      list = list.filter(r => r.status === filters.status);
    }
    if (filters.teacherId) {
      list = list.filter(r => r.reportedByTeacherId === filters.teacherId);
    }
    if (filters.studentId) {
      list = list.filter(r => r.studentIds.includes(filters.studentId!));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.occurrenceNumber.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.reportedByTeacherName.toLowerCase().includes(q) ||
          r.studentNames.some(name => name.toLowerCase().includes(q))
      );
    }

    // Sort newest first by date and creation
    return list.sort((a, b) => {
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });
  }

  public async save(record: OccurrenceRecord): Promise<void> {
    this.occurrences.set(record.id, record);
  }

  public async update(record: OccurrenceRecord): Promise<void> {
    this.occurrences.set(record.id, record);
  }

  public async delete(id: string): Promise<void> {
    this.occurrences.delete(id);
  }

  public async countBySchoolAndDate(schoolId: string, date: string): Promise<number> {
    let count = 0;
    for (const item of this.occurrences.values()) {
      if (item.schoolId === schoolId && item.date === date) {
        count++;
      }
    }
    return count;
  }
}
