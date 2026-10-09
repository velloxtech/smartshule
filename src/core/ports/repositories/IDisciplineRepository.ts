import { CoCurricularClub, DisciplineIncident } from '../../domain/discipline/DisciplineIncident';

export interface IDisciplineRepository {
  findClubById(id: string): Promise<CoCurricularClub | null>;
  findAllClubs(schoolId?: string): Promise<CoCurricularClub[]>;
  saveClub(club: CoCurricularClub): Promise<void>;
  updateClub(club: CoCurricularClub): Promise<void>;
  deleteClub(id: string): Promise<void>;

  findIncidentById(id: string): Promise<DisciplineIncident | null>;
  findIncidents(filters?: { studentId?: string; schoolId?: string; type?: string }): Promise<DisciplineIncident[]>;
  saveIncident(incident: DisciplineIncident): Promise<void>;
  updateIncident(incident: DisciplineIncident): Promise<void>;
  deleteIncident(id: string): Promise<void>;
}
