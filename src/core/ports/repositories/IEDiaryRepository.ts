import { EDiaryEntry } from '../../domain/ediary/EDiaryEntry';

export interface EDiaryFilterCriteria {
  schoolId?: string;
  streamId?: string;
  studentId?: string;
  teacherId?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
}

export interface IEDiaryRepository {
  save(entry: EDiaryEntry): Promise<void>;
  update(entry: EDiaryEntry): Promise<void>;
  findById(id: string): Promise<EDiaryEntry | null>;
  findEntries(filters: EDiaryFilterCriteria): Promise<EDiaryEntry[]>;
  findByStudent(studentId: string, streamId?: string, limit?: number): Promise<EDiaryEntry[]>;
  findByStream(streamId: string, date?: string): Promise<EDiaryEntry[]>;
  delete(id: string): Promise<void>;
}
