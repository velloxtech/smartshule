import { Entity } from '../shared/Entity';

export interface TeacherProps {
  userId: string;
  tscNumber?: string; // Teachers Service Commission ID
  employeeNumber: string;
  specialization: string[]; // List of Learning Areas / Subjects they teach
  assignedClassStreamIds: string[]; // Streams they are assigned as class teacher or subject teacher
  qualification?: string;
}

export class Teacher extends Entity<TeacherProps> {
  public static create(props: TeacherProps, id: string, createdAt?: Date, updatedAt?: Date): Teacher {
    return new Teacher(props, id, createdAt, updatedAt);
  }

  public get userId(): string {
    return this._props.userId;
  }

  public get tscNumber(): string | undefined {
    return this._props.tscNumber;
  }

  public get employeeNumber(): string {
    return this._props.employeeNumber;
  }

  public get specialization(): string[] {
    return this._props.specialization;
  }

  public get assignedClassStreamIds(): string[] {
    return this._props.assignedClassStreamIds;
  }

  public get qualification(): string | undefined {
    return this._props.qualification;
  }

  public assignStream(streamId: string): void {
    if (!this._props.assignedClassStreamIds.includes(streamId)) {
      this._props.assignedClassStreamIds.push(streamId);
      this.touch();
    }
  }

  public removeStream(streamId: string): void {
    this._props.assignedClassStreamIds = this._props.assignedClassStreamIds.filter(id => id !== streamId);
    this.touch();
  }

  public updateSpecialization(subjects: string[]): void {
    this._props.specialization = subjects;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      tscNumber: this.tscNumber,
      employeeNumber: this.employeeNumber,
      specialization: this.specialization,
      assignedClassStreamIds: this.assignedClassStreamIds,
      qualification: this.qualification,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
