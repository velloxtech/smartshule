import { EDiaryEntry } from '../../domain/ediary/EDiaryEntry';

export interface EDiaryFilterCriteria {
  schoolId?: string;
  classRoomId?: string;
  classRoomIds?: string[];
  streamId?: string;
  streamIds?: string[];
  studentId?: string;
  studentIds?: string[];
  teacherId?: string;
  academicYearId?: string;
  termId?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  limit?: number;
}

export interface IEDiaryRepository {
  save(entry: EDiaryEntry): Promise<void>;
  update(entry: EDiaryEntry): Promise<void>;
  findById(id: string): Promise<EDiaryEntry | null>;
  findEntries(filters: EDiaryFilterCriteria): Promise<EDiaryEntry[]>;
  findByStudent(studentId: string, streamId?: string, limit?: number): Promise<EDiaryEntry[]>;
  findByStream(streamId: string, date?: string, status?: 'DRAFT' | 'PUBLISHED'): Promise<EDiaryEntry[]>;
  findByStreamAndDate(streamId: string, date: string, studentId?: string): Promise<EDiaryEntry | null>;
  findByStreams(
    streamIds: string[],
    studentIds?: string[],
    options?: {
      classRoomIds?: string[];
      academicYearId?: string;
      termId?: string;
      startDate?: string;
      endDate?: string;
      date?: string;
      status?: 'DRAFT' | 'PUBLISHED';
      limit?: number;
    }
  ): Promise<EDiaryEntry[]>;
  delete(id: string): Promise<void>;
}
