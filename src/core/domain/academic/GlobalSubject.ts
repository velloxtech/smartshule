import { Entity } from '../shared/Entity';

export interface GlobalSubjectProps {
  schoolId: string;
  code: string; // e.g. "MATH", "ENG", "KISW", "SCI"
  name: string; // e.g. "Mathematics", "English", "Kiswahili", "Science"
  department?: string; // e.g. "Mathematics", "Languages", "Sciences"
  description?: string;
}

export class GlobalSubject extends Entity<GlobalSubjectProps> {
  public static create(props: GlobalSubjectProps, id: string, createdAt?: Date, updatedAt?: Date): GlobalSubject {
    return new GlobalSubject(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get code(): string {
    return this._props.code;
  }

  public get name(): string {
    return this._props.name;
  }

  public get department(): string | undefined {
    return this._props.department;
  }

  public get description(): string | undefined {
    return this._props.description;
  }

  public updateDetails(dto: Partial<GlobalSubjectProps>): void {
    if (dto.name !== undefined) this._props.name = dto.name;
    if (dto.code !== undefined) this._props.code = dto.code;
    if (dto.department !== undefined) this._props.department = dto.department;
    if (dto.description !== undefined) this._props.description = dto.description;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      code: this.code,
      name: this.name,
      department: this.department,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
