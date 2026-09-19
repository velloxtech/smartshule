import { Entity } from '../shared/Entity';
import { CbcGradeLevel } from '../user/Student';

export enum EducationLevel {
  PRE_PRIMARY = 'PRE_PRIMARY',     // PP1, PP2
  LOWER_PRIMARY = 'LOWER_PRIMARY', // Grade 1-3
  UPPER_PRIMARY = 'UPPER_PRIMARY', // Grade 4-6
  JUNIOR_SCHOOL = 'JUNIOR_SCHOOL', // Grade 7-9
  SENIOR_SCHOOL = 'SENIOR_SCHOOL'  // Grade 10-12
}

export interface ClassRoomProps {
  name: string; // e.g. "Grade 7"
  gradeLevel: CbcGradeLevel;
  educationLevel: EducationLevel;
  schoolId: string;
}

export class ClassRoom extends Entity<ClassRoomProps> {
  public static create(props: ClassRoomProps, id: string, createdAt?: Date, updatedAt?: Date): ClassRoom {
    return new ClassRoom(props, id, createdAt, updatedAt);
  }

  public get name(): string {
    return this._props.name;
  }

  public get gradeLevel(): CbcGradeLevel {
    return this._props.gradeLevel;
  }

  public get educationLevel(): EducationLevel {
    return this._props.educationLevel;
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      gradeLevel: this.gradeLevel,
      educationLevel: this.educationLevel,
      schoolId: this.schoolId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export interface StreamProps {
  classRoomId: string;
  name: string; // "East", "West", "Alpha", etc.
  capacity: number;
  classTeacherId?: string;
}

export class Stream extends Entity<StreamProps> {
  public static create(props: StreamProps, id: string, createdAt?: Date, updatedAt?: Date): Stream {
    return new Stream(props, id, createdAt, updatedAt);
  }

  public get classRoomId(): string {
    return this._props.classRoomId;
  }

  public get name(): string {
    return this._props.name;
  }

  public get capacity(): number {
    return this._props.capacity;
  }

  public get classTeacherId(): string | undefined {
    return this._props.classTeacherId;
  }

  public setClassTeacher(teacherId: string | undefined): void {
    this._props.classTeacherId = teacherId;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      classRoomId: this.classRoomId,
      name: this.name,
      capacity: this.capacity,
      classTeacherId: this.classTeacherId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export interface LearningAreaProps {
  name: string; // e.g. "Integrated Science", "Mathematics", "Kiswahili"
  code: string; // e.g. "SCIE7", "MATH7"
  gradeLevel: CbcGradeLevel;
  educationLevel: EducationLevel;
  isElective: boolean;
  schoolId: string;
  teacherId?: string;
}

export class LearningArea extends Entity<LearningAreaProps> {
  public static create(props: LearningAreaProps, id: string, createdAt?: Date, updatedAt?: Date): LearningArea {
    return new LearningArea(props, id, createdAt, updatedAt);
  }

  public get name(): string {
    return this._props.name;
  }

  public get code(): string {
    return this._props.code;
  }

  public get gradeLevel(): CbcGradeLevel {
    return this._props.gradeLevel;
  }

  public get educationLevel(): EducationLevel {
    return this._props.educationLevel;
  }

  public get isElective(): boolean {
    return this._props.isElective;
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get teacherId(): string | undefined {
    return this._props.teacherId;
  }

  public setTeacher(teacherId: string | undefined): void {
    this._props.teacherId = teacherId;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      gradeLevel: this.gradeLevel,
      educationLevel: this.educationLevel,
      isElective: this.isElective,
      schoolId: this.schoolId,
      teacherId: this.teacherId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

