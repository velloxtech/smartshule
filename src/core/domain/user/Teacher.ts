import { Entity } from '../shared/Entity';

export interface TeacherProps {
  userId: string;
  tscNumber?: string; // Teachers Service Commission ID
  employeeNumber: string;
  specialization: string[]; // List of Learning Areas / Subjects they teach
  assignedClassStreamIds: string[]; // Restricted to a single class/stream assignment
  qualification?: string;
}

export class Teacher extends Entity<TeacherProps> {
  public static create(props: TeacherProps, id: string, createdAt?: Date, updatedAt?: Date): Teacher {
    // Enforce single-class restriction on creation if multiple were provided
    const singleStream = props.assignedClassStreamIds && props.assignedClassStreamIds.length > 0 
      ? [props.assignedClassStreamIds[0]] 
      : [];
    
    return new Teacher({
      ...props,
      assignedClassStreamIds: singleStream
    }, id, createdAt, updatedAt);
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

  /**
   * Assigns a single class/stream to the teacher, overwriting any previous assignment
   * to strictly enforce the 1-class-per-teacher rule.
   */
  public assignStream(streamId: string): void {
    if (this._props.assignedClassStreamIds.length !== 1 || this._props.assignedClassStreamIds[0] !== streamId) {
      this._props.assignedClassStreamIds = [streamId];
      this.touch();
    }
  }

  public removeStream(streamId: string): void {
    if (this._props.assignedClassStreamIds.includes(streamId)) {
      this._props.assignedClassStreamIds = [];
      this.touch();
    }
  }

  public updateSpecialization(subjects: string[]): void {
    this._props.specialization = subjects;
    this.touch();
  }

  public updateDetails(props: {
    tscNumber?: string;
    employeeNumber?: string;
    specialization?: string[];
    qualification?: string;
    assignedClassStreamIds?: string[];
  }): void {
    if (props.tscNumber !== undefined) this._props.tscNumber = props.tscNumber;
    if (props.employeeNumber !== undefined) this._props.employeeNumber = props.employeeNumber;
    if (props.specialization !== undefined) this._props.specialization = props.specialization;
    if (props.qualification !== undefined) this._props.qualification = props.qualification;
    if (props.assignedClassStreamIds !== undefined) {
      this._props.assignedClassStreamIds = props.assignedClassStreamIds.length > 0 
        ? [props.assignedClassStreamIds[0]] 
        : [];
    }
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