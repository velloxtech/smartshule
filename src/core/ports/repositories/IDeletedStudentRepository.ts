import { DeletedStudent } from '../../domain/user/DeletedStudent';

export interface DeletedStudentFilterCriteria {
  schoolId?: string;
  search?: string;
  gradeLevel?: string;
}

export interface IDeletedStudentRepository {
  save(deletedStudent: DeletedStudent): Promise<void>;
  findById(id: string): Promise<DeletedStudent | null>;
  findByStudentId(studentId: string): Promise<DeletedStudent | null>;
  findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<DeletedStudent | null>;
  findAll(filters?: DeletedStudentFilterCriteria): Promise<DeletedStudent[]>;
  delete(id: string): Promise<void>;
}
