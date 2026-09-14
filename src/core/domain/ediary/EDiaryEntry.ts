import { Entity } from '../shared/Entity';

export interface EDiaryAcknowledgement {
  guardianId: string;
  guardianName: string;
  studentId: string;
  signedAt: string;
  note?: string;
}

export interface EDiaryEntryProps {
  schoolId: string;
  streamId: string;
  studentId?: string; // Optional: specific student or entire stream
  teacherId: string;
  teacherName?: string;
  date: string; // YYYY-MM-DD
  title: string;
  homework: string;
  teacherRemarks?: string;
  requirementsTomorrow?: string;
  acknowledgements: EDiaryAcknowledgement[];
}

export class EDiaryEntry extends Entity<EDiaryEntryProps> {
  public static create(
    props: EDiaryEntryProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): EDiaryEntry {
    return new EDiaryEntry(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get streamId(): string {
    return this._props.streamId;
  }

  public get studentId(): string | undefined {
    return this._props.studentId;
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

  public get title(): string {
    return this._props.title;
  }

  public get homework(): string {
    return this._props.homework;
  }

  public get teacherRemarks(): string | undefined {
    return this._props.teacherRemarks;
  }

  public get requirementsTomorrow(): string | undefined {
    return this._props.requirementsTomorrow;
  }

  public get acknowledgements(): EDiaryAcknowledgement[] {
    return this._props.acknowledgements;
  }

  public addAcknowledgement(ack: EDiaryAcknowledgement): void {
    const existingIndex = this._props.acknowledgements.findIndex(
      a => a.studentId === ack.studentId && a.guardianId === ack.guardianId
    );
    if (existingIndex >= 0) {
      this._props.acknowledgements[existingIndex] = ack;
    } else {
      this._props.acknowledgements.push(ack);
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      streamId: this.streamId,
      studentId: this.studentId,
      teacherId: this.teacherId,
      teacherName: this.teacherName,
      date: this.date,
      title: this.title,
      homework: this.homework,
      teacherRemarks: this.teacherRemarks,
      requirementsTomorrow: this.requirementsTomorrow,
      acknowledgements: this.acknowledgements,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
