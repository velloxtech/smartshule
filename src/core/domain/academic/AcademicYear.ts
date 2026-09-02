import { Entity } from '../shared/Entity';

export interface AcademicYearProps {
  name: string; // e.g. "2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
  schoolId: string;
}

export class AcademicYear extends Entity<AcademicYearProps> {
  public static create(props: AcademicYearProps, id: string, createdAt?: Date, updatedAt?: Date): AcademicYear {
    return new AcademicYear(props, id, createdAt, updatedAt);
  }

  public get name(): string {
    return this._props.name;
  }

  public get startDate(): string {
    return this._props.startDate;
  }

  public get endDate(): string {
    return this._props.endDate;
  }

  public get isCurrent(): boolean {
    return this._props.isCurrent;
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public setCurrent(isCurrent: boolean): void {
    this._props.isCurrent = isCurrent;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      isCurrent: this.isCurrent,
      schoolId: this.schoolId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export interface AcademicTermProps {
  academicYearId: string;
  termNumber: number; // 1, 2, 3
  name: string; // "Term 1", "Term 2", "Term 3"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrent: boolean;
}

export class AcademicTerm extends Entity<AcademicTermProps> {
  public static create(props: AcademicTermProps, id: string, createdAt?: Date, updatedAt?: Date): AcademicTerm {
    return new AcademicTerm(props, id, createdAt, updatedAt);
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get termNumber(): number {
    return this._props.termNumber;
  }

  public get name(): string {
    return this._props.name;
  }

  public get startDate(): string {
    return this._props.startDate;
  }

  public get endDate(): string {
    return this._props.endDate;
  }

  public get isCurrent(): boolean {
    return this._props.isCurrent;
  }

  public setCurrent(isCurrent: boolean): void {
    this._props.isCurrent = isCurrent;
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      academicYearId: this.academicYearId,
      termNumber: this.termNumber,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      isCurrent: this.isCurrent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
