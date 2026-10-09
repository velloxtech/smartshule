import { StudentMedicalProfile, ClinicVisit } from '../../domain/health/ClinicVisit';

export interface IClinicRepository {
  findProfileByStudentId(studentId: string): Promise<StudentMedicalProfile | null>;
  saveProfile(profile: StudentMedicalProfile): Promise<void>;
  updateProfile(profile: StudentMedicalProfile): Promise<void>;

  findVisitById(id: string): Promise<ClinicVisit | null>;
  findVisits(filters?: { studentId?: string; date?: string; schoolId?: string }): Promise<ClinicVisit[]>;
  saveVisit(visit: ClinicVisit): Promise<void>;
  updateVisit(visit: ClinicVisit): Promise<void>;
}
