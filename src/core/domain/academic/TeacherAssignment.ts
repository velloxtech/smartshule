import { Entity } from '../shared/Entity';

export interface ClassTeacherAssignmentProps {
  schoolId: string;
  academicYearId: string;
  classRoomId: string;
  streamId?: string;
  teacherId: string;
  assignedByUserId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
}

export class ClassTeacherAssignment extends Entity<ClassTeacherAssignmentProps> {
  public static create(
    props: ClassTeacherAssignmentProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): ClassTeacherAssignment {
    return new ClassTeacherAssignment(
      {
        ...props,
        effectiveFrom: props.effectiveFrom || new Date().toISOString().split('T')[0],
        isActive: props.isActive !== undefined ? props.isActive : true
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get classRoomId(): string {
    return this._props.classRoomId;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get assignedByUserId(): string | undefined {
    return this._props.assignedByUserId;
  }

  public get effectiveFrom(): string | undefined {
    return this._props.effectiveFrom;
  }

  public get effectiveTo(): string | undefined {
    return this._props.effectiveTo;
  }

  public get isActive(): boolean {
    return this._props.isActive;
  }

  public deactivate(effectiveTo?: string): void {
    this._props.isActive = false;
    this._props.effectiveTo = effectiveTo || new Date().toISOString().split('T')[0];
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      classRoomId: this.classRoomId,
      streamId: this.streamId,
      teacherId: this.teacherId,
      assignedByUserId: this.assignedByUserId,
      effectiveFrom: this.effectiveFrom,
      effectiveTo: this.effectiveTo,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export type SubjectTeacherRole = 'SUBJECT_LEAD' | 'SUBJECT_TEACHER' | 'ASSESSMENT_APPROVER';

export interface SubjectTeacherAssignmentProps {
  schoolId: string;
  academicYearId: string;
  classRoomId?: string;
  streamId?: string;
  learningAreaId: string;
  teacherId: string;
  role: SubjectTeacherRole;
  assignedByUserId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
}

export class SubjectTeacherAssignment extends Entity<SubjectTeacherAssignmentProps> {
  public static create(
    props: SubjectTeacherAssignmentProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): SubjectTeacherAssignment {
    return new SubjectTeacherAssignment(
      {
        ...props,
        role: props.role || 'SUBJECT_LEAD',
        effectiveFrom: props.effectiveFrom || new Date().toISOString().split('T')[0],
        isActive: props.isActive !== undefined ? props.isActive : true
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get classRoomId(): string | undefined {
    return this._props.classRoomId;
  }

  public get streamId(): string | undefined {
    return this._props.streamId;
  }

  public get learningAreaId(): string {
    return this._props.learningAreaId;
  }

  public get teacherId(): string {
    return this._props.teacherId;
  }

  public get role(): SubjectTeacherRole {
    return this._props.role;
  }

  public get assignedByUserId(): string | undefined {
    return this._props.assignedByUserId;
  }

  public get effectiveFrom(): string | undefined {
    return this._props.effectiveFrom;
  }

  public get effectiveTo(): string | undefined {
    return this._props.effectiveTo;
  }

  public get isActive(): boolean {
    return this._props.isActive;
  }

  public deactivate(effectiveTo?: string): void {
    this._props.isActive = false;
    this._props.effectiveTo = effectiveTo || new Date().toISOString().split('T')[0];
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      classRoomId: this.classRoomId,
      streamId: this.streamId,
      learningAreaId: this.learningAreaId,
      teacherId: this.teacherId,
      role: this.role,
      assignedByUserId: this.assignedByUserId,
      effectiveFrom: this.effectiveFrom,
      effectiveTo: this.effectiveTo,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
