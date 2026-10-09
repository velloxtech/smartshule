import { Entity } from '../shared/Entity';

export interface CoCurricularClubProps {
  schoolId: string;
  clubName: string;
  category: 'SCOUTS_GIRLGUIDES' | 'RED_CROSS' | 'DEBATE_DRAMA' | 'STEM_ROBOTICS' | 'SPORTS_ATHLETICS' | 'MUSIC_BAND' | 'ENVIRONMENTAL';
  patronTeacherId: string;
  patronTeacherName: string;
  meetingDay: string; // e.g. "Wednesday 03:30 PM"
  memberStudentIds: string[];
  description?: string;
}

export class CoCurricularClub extends Entity<CoCurricularClubProps> {
  public static create(props: CoCurricularClubProps, id: string, createdAt?: Date, updatedAt?: Date): CoCurricularClub {
    return new CoCurricularClub(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get clubName(): string { return this._props.clubName; }
  public get category(): string { return this._props.category; }
  public get memberStudentIds(): string[] { return this._props.memberStudentIds; }

  public addMember(studentId: string): void {
    if (!this._props.memberStudentIds.includes(studentId)) {
      this._props.memberStudentIds.push(studentId);
      this.touch();
    }
  }

  public removeMember(studentId: string): void {
    this._props.memberStudentIds = this._props.memberStudentIds.filter(id => id !== studentId);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      memberCount: this._props.memberStudentIds.length,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export interface DisciplineIncidentProps {
  schoolId: string;
  studentId: string;
  studentName: string;
  gradeLevel?: string;
  date: string;
  incidentType: 'MERIT_COMMENDATION' | 'INFRACTION_WARNING' | 'COUNSELING_REFERRAL';
  cbcCoreValue: 'LOVE' | 'RESPECT' | 'RESPONSIBILITY' | 'INTEGRITY' | 'PEACE' | 'PATRIOTISM' | 'UNITY';
  title: string;
  description: string;
  actionTaken: string;
  points: number; // e.g. +5 for merit, -5 for infraction
  loggedByTeacherName: string;
  parentInformed: boolean;
}

export class DisciplineIncident extends Entity<DisciplineIncidentProps> {
  public static create(props: DisciplineIncidentProps, id: string, createdAt?: Date, updatedAt?: Date): DisciplineIncident {
    return new DisciplineIncident(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get studentId(): string { return this._props.studentId; }
  public get incidentType(): string { return this._props.incidentType; }
  public get points(): number { return this._props.points; }

  public markParentInformed(): void {
    this._props.parentInformed = true;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      ...this._props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
