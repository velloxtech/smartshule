import { Student, CbcGradeLevel } from '../../domain/user/Student';

export interface StudentFilterCriteria {
  schoolId?: string;
  gradeLevel?: CbcGradeLevel;
  streamId?: string;
  academicYearId?: string;
  search?: string;
}

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<Student | null>;
  findByUpiNumber(upiNumber: string): Promise<Student | null>;
  findAll(filters?: StudentFilterCriteria): Promise<Student[]>;
  findByIds(ids: string[]): Promise<Student[]>;
  save(student: Student): Promise<void>;
  update(student: Student): Promise<void>;
  delete(id: string): Promise<void>;
}
