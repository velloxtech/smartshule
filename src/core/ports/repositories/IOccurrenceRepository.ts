import {
  OccurrenceRecord,
  OccurrenceCategory,
  OccurrenceSeverity,
  OccurrenceStatus
} from '../../domain/occurrence/OccurrenceRecord';

export interface OccurrenceFilterCriteria {
  schoolId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  category?: OccurrenceCategory;
  severity?: OccurrenceSeverity;
  status?: OccurrenceStatus;
  teacherId?: string;
  studentId?: string;
  search?: string;
}

export interface IOccurrenceRepository {
  findById(id: string): Promise<OccurrenceRecord | null>;
  findByOccurrenceNumber(occurrenceNumber: string, schoolId?: string): Promise<OccurrenceRecord | null>;
  findOccurrences(filters: OccurrenceFilterCriteria): Promise<OccurrenceRecord[]>;
  save(record: OccurrenceRecord): Promise<void>;
  update(record: OccurrenceRecord): Promise<void>;
  delete(id: string): Promise<void>;
  countBySchoolAndDate(schoolId: string, date: string): Promise<number>;
}
