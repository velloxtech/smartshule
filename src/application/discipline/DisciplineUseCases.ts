import { IDisciplineRepository } from '../../core/ports/repositories/IDisciplineRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { INotificationService } from '../../core/ports/services/IExternalServices';
import {
  CoCurricularClub,
  CoCurricularClubProps,
  DisciplineIncident,
  DisciplineIncidentProps
} from '../../core/domain/discipline/DisciplineIncident';
import { IdGenerator, NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

export interface LogDisciplineIncidentDTO {
  schoolId: string;
  studentId: string;
  incidentType: 'MERIT_COMMENDATION' | 'INFRACTION_WARNING' | 'COUNSELING_REFERRAL';
  cbcCoreValue: 'LOVE' | 'RESPECT' | 'RESPONSIBILITY' | 'INTEGRITY' | 'PEACE' | 'PATRIOTISM' | 'UNITY';
  title: string;
  description: string;
  actionTaken: string;
  points: number;
  loggedByTeacherName: string;
  notifyParent?: boolean;
}

export class DisciplineUseCases {
  constructor(
    private readonly disciplineRepository: IDisciplineRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly guardianRepository: IGuardianRepository,
    private readonly notificationService: INotificationService
  ) {}

  // --- Co-Curricular Clubs ---
  public async listClubs(schoolId?: string): Promise<any[]> {
    const clubs = await this.disciplineRepository.findAllClubs(schoolId);
    return clubs.map(c => c.toJSON());
  }

  public async getClubById(id: string): Promise<any> {
    const club = await this.disciplineRepository.findClubById(id);
    if (!club) throw new NotFoundError('Club record not found.');

    // Fetch member details
    const memberStudents = await this.studentRepository.findByIds(club.memberStudentIds || []);
    return {
      ...club.toJSON(),
      members: memberStudents.map(s => ({
        id: s.id,
        name: s.fullName,
        admissionNumber: s.admissionNumber,
        gradeLevel: String(s.gradeLevel)
      }))
    };
  }

  public async createClub(props: CoCurricularClubProps): Promise<any> {
    if (!props.clubName || !props.category) {
      throw new ValidationError('Club name and category are required.');
    }

    const club = CoCurricularClub.create(
      {
        ...props,
        memberStudentIds: props.memberStudentIds || []
      },
      IdGenerator.generate()
    );

    await this.disciplineRepository.saveClub(club);
    return club.toJSON();
  }

  public async addClubMember(clubId: string, studentId: string): Promise<any> {
    const club = await this.disciplineRepository.findClubById(clubId);
    if (!club) throw new NotFoundError('Club record not found.');

    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student record not found.');

    club.addMember(studentId);
    await this.disciplineRepository.updateClub(club);

    return club.toJSON();
  }

  public async removeClubMember(clubId: string, studentId: string): Promise<any> {
    const club = await this.disciplineRepository.findClubById(clubId);
    if (!club) throw new NotFoundError('Club record not found.');

    club.removeMember(studentId);
    await this.disciplineRepository.updateClub(club);

    return club.toJSON();
  }

  public async deleteClub(id: string): Promise<void> {
    const club = await this.disciplineRepository.findClubById(id);
    if (!club) throw new NotFoundError('Club record not found.');
    await this.disciplineRepository.deleteClub(id);
  }

  // --- Discipline & Merit Incidents ---
  public async logIncident(dto: LogDisciplineIncidentDTO): Promise<any> {
    const student = await this.studentRepository.findById(dto.studentId);
    if (!student) throw new NotFoundError('Student record not found.');

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    let parentInformed = false;

    if (dto.notifyParent) {
      try {
        const guardians = await this.guardianRepository.findByStudentId(dto.studentId);
        const primaryGuardian = guardians[0];
        const phone = primaryGuardian?.emergencyContact;
        if (phone) {
          const typeLabel =
            dto.incidentType === 'MERIT_COMMENDATION'
              ? 'Merit Commendation'
              : dto.incidentType === 'INFRACTION_WARNING'
              ? 'Disciplinary Notice'
              : 'Counseling & Guidance Notice';

          const msg = `SmartShule Update: ${typeLabel} recorded for ${student.fullName}. ${dto.title}. Action: ${dto.actionTaken}. CBC Core Value: ${dto.cbcCoreValue}.`;
          await this.notificationService.sendSms(phone, msg);
          parentInformed = true;
        }
      } catch (e) {
        // Continue saving record
      }
    }

    const incident = DisciplineIncident.create(
      {
        schoolId: dto.schoolId,
        studentId: dto.studentId,
        studentName: student.fullName,
        gradeLevel: String(student.gradeLevel),
        date,
        incidentType: dto.incidentType,
        cbcCoreValue: dto.cbcCoreValue,
        title: dto.title,
        description: dto.description,
        actionTaken: dto.actionTaken,
        points: dto.points,
        loggedByTeacherName: dto.loggedByTeacherName,
        parentInformed
      },
      IdGenerator.generate()
    );

    await this.disciplineRepository.saveIncident(incident);
    return incident.toJSON();
  }

  public async listIncidents(filters?: { studentId?: string; schoolId?: string; type?: string }): Promise<any[]> {
    const incidents = await this.disciplineRepository.findIncidents(filters);
    return incidents.map(i => i.toJSON());
  }

  public async markIncidentParentInformed(incidentId: string): Promise<any> {
    const incident = await this.disciplineRepository.findIncidentById(incidentId);
    if (!incident) throw new NotFoundError('Incident record not found.');

    incident.markParentInformed();
    await this.disciplineRepository.updateIncident(incident);

    return incident.toJSON();
  }

  public async getStudentDisciplineProfile(studentId: string): Promise<any> {
    const student = await this.studentRepository.findById(studentId);
    if (!student) throw new NotFoundError('Student record not found.');

    const incidents = await this.disciplineRepository.findIncidents({ studentId });
    const allClubs = await this.disciplineRepository.findAllClubs();
    const joinedClubs = allClubs.filter(c => c.memberStudentIds?.includes(studentId));

    const totalMerits = incidents
      .filter(i => i.incidentType === 'MERIT_COMMENDATION')
      .reduce((sum, i) => sum + i.points, 0);

    const totalDemerits = incidents
      .filter(i => i.incidentType === 'INFRACTION_WARNING')
      .reduce((sum, i) => sum + Math.abs(i.points), 0);

    const netScore = totalMerits - totalDemerits;

    return {
      studentId: student.id,
      studentName: student.fullName,
      gradeLevel: String(student.gradeLevel),
      netScore,
      totalMerits,
      totalDemerits,
      incidents: incidents.map(i => i.toJSON()),
      clubs: joinedClubs.map(c => ({
        id: c.id,
        clubName: c.clubName,
        category: c.category,
        meetingDay: (c.props as any).meetingDay
      }))
    };
  }

  public async getDisciplineStats(schoolId?: string) {
    const incidents = await this.disciplineRepository.findIncidents({ schoolId });
    const clubs = await this.disciplineRepository.findAllClubs(schoolId);

    const commendations = incidents.filter(i => i.incidentType === 'MERIT_COMMENDATION').length;
    const warnings = incidents.filter(i => i.incidentType === 'INFRACTION_WARNING').length;
    const counseling = incidents.filter(i => i.incidentType === 'COUNSELING_REFERRAL').length;

    return {
      totalClubs: clubs.length,
      totalIncidents: incidents.length,
      commendations,
      warnings,
      counseling
    };
  }
}
