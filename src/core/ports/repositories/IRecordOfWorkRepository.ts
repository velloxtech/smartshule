import { RecordOfWork, RecordOfWorkStatus } from '../../domain/curriculum-plan/RecordOfWork';

export interface RecordOfWorkFilterCriteria {
  schoolId?: string;
  teacherId?: string;
  classRoomId?: string;
  streamId?: string;
  learningAreaId?: string;
  academicYearId?: string;
  academicYear?: string;
  termId?: string;
  term?: string;
  weekNumber?: number;
  status?: RecordOfWorkStatus | 'ALL';
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface IRecordOfWorkRepository {
  create(record: Partial<RecordOfWork> | RecordOfWork): Promise<RecordOfWork>;
  update(id: string, record: Partial<RecordOfWork> | RecordOfWork): Promise<RecordOfWork | null>;
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<RecordOfWork | null>;
  findByTeacherId(teacherId: string): Promise<RecordOfWork[]>;
  findAll(filters?: RecordOfWorkFilterCriteria): Promise<RecordOfWork[]>;
  find(filters: RecordOfWorkFilterCriteria): Promise<RecordOfWork[]>;
  findBySession(schoolId: string, classRoomId: string, learningAreaId: string, lessonDate: string, lessonPeriod: string): Promise<RecordOfWork | null>;
}
