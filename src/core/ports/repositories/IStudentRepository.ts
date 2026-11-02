import { Student, CBCGradeLevel } from '../../domain/user/Student';

export interface StudentFilterCriteria {
  schoolId?: string;
  gradeLevel?: CBCGradeLevel;
  classroomId?: string;
  streamId?: string;
  academicYearId?: string;
  search?: string;
  guardianId?: string;
}

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findByAdmissionNumber(admissionNumber: string, schoolId?: string): Promise<Student | null>;
  findByUpiNumber(upiNumber: string): Promise<Student | null>;
  findByGuardianId(guardianId: string): Promise<Student[]>;
  findAll(filters?: StudentFilterCriteria): Promise<Student[]>;
  findByIds(ids: string[]): Promise<Student[]>;
  save(student: Student): Promise<void>;
  update(student: Student): Promise<void>;
  delete(id: string): Promise<void>;
}
