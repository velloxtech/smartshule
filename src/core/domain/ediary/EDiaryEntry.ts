import { Entity } from '../shared/Entity';

export interface EDiaryHomeworkTask {
  learningArea: string;
  description: string;
  dueDate: string;
}

export interface EDiaryAcknowledgement {
  guardianId: string;
  guardianName: string;
  studentId: string;
  signedAt: string;
  note?: string;
  guardianUserId?: string;
  parentNote?: string;
}

export interface EDiaryEntryProps {
  schoolId: string;
  classRoomId?: string;
  streamId: string;
  studentId?: string; // Optional: specific student or entire stream
  teacherId: string;
  teacherName?: string;
  academicYearId?: string;
  termId?: string;
  date: string; // YYYY-MM-DD
  title: string;
  homework: string;
  homeworkTasks: EDiaryHomeworkTask[];
  teacherRemarks?: string;
  requirementsTomorrow?: string;
  tomorrowRequirements: string[];
  acknowledgements: EDiaryAcknowledgement[];
  status?: 'DRAFT' | 'PUBLISHED';
}

export class EDiaryEntry extends Entity<EDiaryEntryProps> {
  public static create(
    props: EDiaryEntryProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): EDiaryEntry {
    const homeworkTasks = Array.isArray(props.homeworkTasks) ? props.homeworkTasks : [];
    let homework = props.homework;
    if (!homework && homeworkTasks.length > 0) {
      homework = homeworkTasks.map(t => `${t.learningArea}: ${t.description}`).join('; ');
    }

    let tomorrowRequirements = Array.isArray(props.tomorrowRequirements) ? props.tomorrowRequirements : [];
    let requirementsTomorrow = props.requirementsTomorrow;
    if (!requirementsTomorrow && tomorrowRequirements.length > 0) {
      requirementsTomorrow = tomorrowRequirements.join(', ');
    } else if (requirementsTomorrow && tomorrowRequirements.length === 0) {
      tomorrowRequirements = requirementsTomorrow.split(',').map(s => s.trim()).filter(Boolean);
    }

    const title = props.title || `Daily Homework & Class Activities (${props.date})`;
    const status = props.status || 'PUBLISHED';
    const acknowledgements = Array.isArray(props.acknowledgements) ? props.acknowledgements : [];

    return new EDiaryEntry(
      {
        ...props,
        title,
        homework: homework || '',
        homeworkTasks,
        requirementsTomorrow: requirementsTomorrow || '',
        tomorrowRequirements,
        acknowledgements,
        status
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get classRoomId(): string | undefined {
    return this._props.classRoomId;
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

  public get academicYearId(): string | undefined {
    return this._props.academicYearId;
  }

  public get termId(): string | undefined {
    return this._props.termId;
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

  public get homeworkTasks(): EDiaryHomeworkTask[] {
    return this._props.homeworkTasks;
  }

  public get teacherRemarks(): string | undefined {
    return this._props.teacherRemarks;
  }

  public get requirementsTomorrow(): string | undefined {
    return this._props.requirementsTomorrow;
  }

  public get tomorrowRequirements(): string[] {
    return this._props.tomorrowRequirements;
  }

  public get acknowledgements(): EDiaryAcknowledgement[] {
    return this._props.acknowledgements;
  }

  public get status(): 'DRAFT' | 'PUBLISHED' {
    return this._props.status || 'PUBLISHED';
  }

  public setStatus(status: 'DRAFT' | 'PUBLISHED'): void {
    this._props.status = status;
    this.touch();
  }

  public updateContent(updates: Partial<EDiaryEntryProps>): void {
    if (updates.title !== undefined) this._props.title = updates.title;
    if (updates.homeworkTasks !== undefined) {
      this._props.homeworkTasks = updates.homeworkTasks;
      if (updates.homeworkTasks.length > 0) {
        this._props.homework = updates.homeworkTasks.map(t => `${t.learningArea}: ${t.description}`).join('; ');
      }
    }
    if (updates.homework !== undefined) this._props.homework = updates.homework;
    if (updates.teacherRemarks !== undefined) this._props.teacherRemarks = updates.teacherRemarks;
    if (updates.tomorrowRequirements !== undefined) {
      this._props.tomorrowRequirements = updates.tomorrowRequirements;
      this._props.requirementsTomorrow = updates.tomorrowRequirements.join(', ');
    }
    if (updates.requirementsTomorrow !== undefined) {
      this._props.requirementsTomorrow = updates.requirementsTomorrow;
      if (!updates.tomorrowRequirements) {
        this._props.tomorrowRequirements = updates.requirementsTomorrow.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (updates.status !== undefined) this._props.status = updates.status;
    if (updates.teacherName !== undefined) this._props.teacherName = updates.teacherName;
    if (updates.classRoomId !== undefined) this._props.classRoomId = updates.classRoomId;
    if (updates.academicYearId !== undefined) this._props.academicYearId = updates.academicYearId;
    if (updates.termId !== undefined) this._props.termId = updates.termId;
    this.touch();
  }

  public addAcknowledgement(ack: EDiaryAcknowledgement): void {
    const existingIndex = this._props.acknowledgements.findIndex(
      a => (ack.studentId && a.studentId === ack.studentId) ||
           (ack.guardianUserId && (a.guardianUserId === ack.guardianUserId || a.guardianId === ack.guardianUserId)) ||
           (a.guardianId === ack.guardianId)
    );
    if (existingIndex >= 0) {
      this._props.acknowledgements[existingIndex] = {
        ...this._props.acknowledgements[existingIndex],
        ...ack
      };
    } else {
      this._props.acknowledgements.push(ack);
    }
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      classRoomId: this.classRoomId || '',
      streamId: this.streamId,
      studentId: this.studentId,
      teacherId: this.teacherId,
      teacherUserId: this.teacherId,
      teacherName: this.teacherName,
      academicYearId: this.academicYearId,
      termId: this.termId,
      date: this.date,
      title: this.title,
      homework: this.homework,
      homeworkTasks: this.homeworkTasks,
      teacherRemarks: this.teacherRemarks,
      requirementsTomorrow: this.requirementsTomorrow,
      tomorrowRequirements: this.tomorrowRequirements,
      acknowledgements: this.acknowledgements,
      parentAcknowledgements: this.acknowledgements.map(a => ({
        guardianUserId: a.guardianUserId || a.guardianId,
        guardianName: a.guardianName,
        signedAt: a.signedAt,
        parentNote: a.parentNote || a.note
      })),
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
