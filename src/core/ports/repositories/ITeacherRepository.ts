import { Teacher } from '../../domain/user/Teacher';
import { Guardian } from '../../domain/user/Guardian';

export interface ITeacherRepository {
  findById(id: string): Promise<Teacher | null>;
  findByUserId(userId: string): Promise<Teacher | null>;
  findByEmployeeNumber(empNumber: string): Promise<Teacher | null>;
  findAll(): Promise<Teacher[]>;
  save(teacher: Teacher): Promise<void>;
  update(teacher: Teacher): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IGuardianRepository {
  findById(id: string): Promise<Guardian | null>;
  findByUserId(userId: string): Promise<Guardian | null>;
  findByStudentId(studentId: string): Promise<Guardian[]>;
  findByPhone?(phone: string): Promise<Guardian | null>;
  findAll(): Promise<Guardian[]>;
  save(guardian: Guardian): Promise<void>;
  update(guardian: Guardian): Promise<void>;
  delete(id: string): Promise<void>;
}
