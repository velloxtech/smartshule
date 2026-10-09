import { IDisciplineRepository } from '../../../core/ports/repositories/IDisciplineRepository';
import { CoCurricularClub, DisciplineIncident } from '../../../core/domain/discipline/DisciplineIncident';

export class InMemoryDisciplineRepository implements IDisciplineRepository {
  private clubs: Map<string, CoCurricularClub> = new Map();
  private incidents: Map<string, DisciplineIncident> = new Map();

  public async findClubById(id: string): Promise<CoCurricularClub | null> {
    return this.clubs.get(id) || null;
  }

  public async findAllClubs(schoolId?: string): Promise<CoCurricularClub[]> {
    let list = Array.from(this.clubs.values());
    if (schoolId) {
      list = list.filter(c => c.schoolId === schoolId);
    }
    return list.sort((a, b) => a.clubName.localeCompare(b.clubName));
  }

  public async saveClub(club: CoCurricularClub): Promise<void> {
    this.clubs.set(club.id, club);
  }

  public async updateClub(club: CoCurricularClub): Promise<void> {
    this.clubs.set(club.id, club);
  }

  public async deleteClub(id: string): Promise<void> {
    this.clubs.delete(id);
  }

  public async findIncidentById(id: string): Promise<DisciplineIncident | null> {
    return this.incidents.get(id) || null;
  }

  public async findIncidents(filters?: { studentId?: string; schoolId?: string; type?: string }): Promise<DisciplineIncident[]> {
    let list = Array.from(this.incidents.values());
    if (filters?.schoolId) {
      list = list.filter(i => i.schoolId === filters.schoolId);
    }
    if (filters?.studentId) {
      list = list.filter(i => i.studentId === filters.studentId);
    }
    if (filters?.type) {
      list = list.filter(i => i.incidentType === filters.type);
    }
    return list.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  public async saveIncident(incident: DisciplineIncident): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  public async updateIncident(incident: DisciplineIncident): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  public async deleteIncident(id: string): Promise<void> {
    this.incidents.delete(id);
  }
}
