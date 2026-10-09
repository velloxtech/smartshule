import { Entity } from '../shared/Entity';

export interface StudentMedicalProfileProps {
  studentId: string;
  studentName?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'UNKNOWN';
  allergies: string[];
  chronicConditions: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insurancePolicyNumber?: string;
  immunizationUpToDate: boolean;
  notes?: string;
}

export class StudentMedicalProfile extends Entity<StudentMedicalProfileProps> {
  public static create(props: StudentMedicalProfileProps, id: string, createdAt?: Date, updatedAt?: Date): StudentMedicalProfile {
    return new StudentMedicalProfile(props, id, createdAt, updatedAt);
  }

  public get studentId(): string { return this._props.studentId; }
  public get allergies(): string[] { return this._props.allergies; }
  public get chronicConditions(): string[] { return this._props.chronicConditions; }

  public updateProfile(updates: Partial<StudentMedicalProfileProps>): void {
    Object.assign(this._props, updates);
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

export interface ClinicVisitProps {
  schoolId: string;
  studentId: string;
  studentName: string;
  gradeLevel?: string;
  visitDate: string; // ISO date YYYY-MM-DD
  visitTime: string; // e.g. "10:30 AM"
  symptoms: string[];
  temperatureCelsius?: number;
  treatmentAdministered: string;
  medicationDispensed?: string;
  nurseRemarks: string;
  parentNotified: boolean;
  status: 'RESOLVED' | 'UNDER_OBSERVATION' | 'REFERRED_TO_HOSPITAL';
  referredHospitalName?: string;
}

export class ClinicVisit extends Entity<ClinicVisitProps> {
  public static create(props: ClinicVisitProps, id: string, createdAt?: Date, updatedAt?: Date): ClinicVisit {
    return new ClinicVisit(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string { return this._props.schoolId; }
  public get studentId(): string { return this._props.studentId; }
  public get studentName(): string { return this._props.studentName; }
  public get visitDate(): string { return this._props.visitDate; }
  public get status(): 'RESOLVED' | 'UNDER_OBSERVATION' | 'REFERRED_TO_HOSPITAL' { return this._props.status; }

  public resolve(): void {
    this._props.status = 'RESOLVED';
    this.touch();
  }

  public referHospital(hospitalName: string): void {
    this._props.status = 'REFERRED_TO_HOSPITAL';
    this._props.referredHospitalName = hospitalName;
    this.touch();
  }

  public markParentNotified(): void {
    this._props.parentNotified = true;
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
