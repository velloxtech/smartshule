import { Entity } from '../shared/Entity';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  SICK = 'SICK'
}

export enum AttendanceType {
  DAILY_MORNING = 'DAILY_MORNING',
  DAILY_AFTERNOON = 'DAILY_AFTERNOON',
  LESSON = 'LESSON'
}

export interface StudentAttendanceEntry {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  status: AttendanceStatus;
  remarks?: string;
  parentNotified: boolean;
}

export interface AttendanceRegisterProps {
  schoolId: string;
  classRoomId: string;
  streamId: string;
  academicYearId: string;
  termId: string;
  date: string; // YYYY-MM-DD
  type: AttendanceType;
  lessonId?: string;
  markedByTeacherId: string;
  entries: StudentAttendanceEntry[];
}

export class AttendanceRegister extends Entity<AttendanceRegisterProps> {
  public static create(props: AttendanceRegisterProps, id: string, createdAt?: Date, updatedAt?: Date): AttendanceRegister {
    return new AttendanceRegister(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get classRoomId(): string {
    return this._props.classRoomId;
  }

  public get streamId(): string {
    return this._props.streamId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get date(): string {
    return this._props.date;
  }

  public get type(): AttendanceType {
    return this._props.type;
  }

  public get markedByTeacherId(): string {
    return this._props.markedByTeacherId;
  }

  public get entries(): StudentAttendanceEntry[] {
    return this._props.entries;
  }

  public get summary() {
    const total = this._props.entries.length;
    const present = this._props.entries.filter(e => e.status === AttendanceStatus.PRESENT).length;
    const absent = this._props.entries.filter(e => e.status === AttendanceStatus.ABSENT).length;
    const late = this._props.entries.filter(e => e.status === AttendanceStatus.LATE).length;
    const excused = this._props.entries.filter(e => e.status === AttendanceStatus.EXCUSED).length;
    const sick = this._props.entries.filter(e => e.status === AttendanceStatus.SICK).length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      sick,
      attendancePercentage: total > 0 ? Math.round(((present + late) / total) * 100) : 100
    };
  }

  public markEntry(entry: StudentAttendanceEntry): void {
    const idx = this._props.entries.findIndex(e => e.studentId === entry.studentId);
    if (idx >= 0) {
      this._props.entries[idx] = entry;
    } else {
      this._props.entries.push(entry);
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      classRoomId: this.classRoomId,
      streamId: this.streamId,
      academicYearId: this.academicYearId,
      termId: this.termId,
      date: this.date,
      type: this.type,
      lessonId: this._props.lessonId,
      markedByTeacherId: this.markedByTeacherId,
      summary: this.summary,
      entries: this.entries,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
