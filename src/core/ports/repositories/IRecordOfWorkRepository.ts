import { RecordOfWork } from '../../domain/curriculum-plan/RecordOfWork';

export interface IRecordOfWorkRepository {
  create(record: Partial<RecordOfWork>): Promise<RecordOfWork>;
  update(id: string, record: Partial<RecordOfWork>): Promise<RecordOfWork | null>;
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<RecordOfWork | null>;
  findByTeacherId(teacherId: string): Promise<RecordOfWork[]>;
  findAll(): Promise<RecordOfWork[]>;
}