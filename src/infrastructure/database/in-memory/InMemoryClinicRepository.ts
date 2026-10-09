import { IClinicRepository } from '../../../core/ports/repositories/IClinicRepository';
import { StudentMedicalProfile, ClinicVisit } from '../../../core/domain/health/ClinicVisit';

export class InMemoryClinicRepository implements IClinicRepository {
  private profiles: Map<string, StudentMedicalProfile> = new Map(); // key is studentId
  private visits: Map<string, ClinicVisit> = new Map();

  public async findProfileByStudentId(studentId: string): Promise<StudentMedicalProfile | null> {
    return this.profiles.get(studentId) || null;
  }

  public async saveProfile(profile: StudentMedicalProfile): Promise<void> {
    this.profiles.set(profile.studentId, profile);
  }

  public async updateProfile(profile: StudentMedicalProfile): Promise<void> {
    this.profiles.set(profile.studentId, profile);
  }

  public async findVisitById(id: string): Promise<ClinicVisit | null> {
    return this.visits.get(id) || null;
  }

  public async findVisits(filters?: { studentId?: string; date?: string; schoolId?: string }): Promise<ClinicVisit[]> {
    let list = Array.from(this.visits.values());
    if (filters?.schoolId) {
      list = list.filter(v => v.schoolId === filters.schoolId);
    }
    if (filters?.studentId) {
      list = list.filter(v => v.studentId === filters.studentId);
    }
    if (filters?.date) {
      list = list.filter(v => v.visitDate === filters.date);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async saveVisit(visit: ClinicVisit): Promise<void> {
    this.visits.set(visit.id, visit);
  }

  public async updateVisit(visit: ClinicVisit): Promise<void> {
    this.visits.set(visit.id, visit);
  }
}
