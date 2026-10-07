import { Entity } from '../shared/Entity';

export type TeacherClockInStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

export interface TeacherClockInProps {
  schoolId: string;
  teacherId: string;
  teacherName?: string;
  date: string; // YYYY-MM-DD
  clockInTime?: string; // e.g. "07:45 AM"
  clockOutTime?: string;
  status: TeacherClockInStatus;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  inCompound: boolean;
  accuracyMeters?: number | null;
  verifiedBy?: string;
}

export class TeacherClockIn extends Entity<TeacherClockInProps> {
  public static create(props: TeacherClockInProps, id: string, createdAt?: Date, updatedAt?: Date): TeacherClockIn {
    return new TeacherClockIn(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get teacherName(): string | undefined {
    return this._props.teacherName;
  }

  public get date(): string {
    return this._props.date;
  }

  public get clockInTime(): string | undefined {
    return this._props.clockInTime;
  }

  public get clockOutTime(): string | undefined {
    return this._props.clockOutTime;
  }

  public get status(): TeacherClockInStatus {
    return this._props.status;
  }

  public get latitude(): number | null | undefined {
    return this._props.latitude;
  }

  public get longitude(): number | null | undefined {
    return this._props.longitude;
  }

  public get distanceMeters(): number | null | undefined {
    return this._props.distanceMeters;
  }

  public get inCompound(): boolean {
    return this._props.inCompound;
  }

  public get accuracyMeters(): number | null | undefined {
    return this._props.accuracyMeters;
  }

  public get verifiedBy(): string | undefined {
    return this._props.verifiedBy;
  }

  public clockOut(timeStr: string): void {
    this._props.status = 'CLOCKED_OUT';
    this._props.clockOutTime = timeStr;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      teacherId: this.teacherId,
      teacherName: this.teacherName,
      date: this.date,
      clockInTime: this.clockInTime,
      clockOutTime: this.clockOutTime,
      status: this.status,
      latitude: this.latitude,
      longitude: this.longitude,
      distanceMeters: this.distanceMeters,
      inCompound: this.inCompound,
      accuracyMeters: this.accuracyMeters,
      verifiedBy: this.verifiedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
