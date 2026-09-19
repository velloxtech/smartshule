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

  public updateDates(startDate: string, endDate: string): void {
    this._props.startDate = startDate;
    this._props.endDate = endDate;
    this.touch();
  }

  public updateDetails(details: { name?: string; startDate?: string; endDate?: string; termNumber?: number; isCurrent?: boolean }): void {
    if (details.name) this._props.name = details.name;
    if (details.startDate) this._props.startDate = details.startDate;
    if (details.endDate) this._props.endDate = details.endDate;
    if (details.termNumber !== undefined) this._props.termNumber = details.termNumber;
    if (details.isCurrent !== undefined) this._props.isCurrent = details.isCurrent;
    this.touch();
  }

  public getStatus(asOf: Date = new Date()): 'ACTIVE' | 'UPCOMING' | 'ENDED' {
    const start = new Date(this._props.startDate);
    const end = new Date(this._props.endDate);
    end.setHours(23, 59, 59, 999);
    if (asOf < start) return 'UPCOMING';
    if (asOf > end) return 'ENDED';
    return 'ACTIVE';
  }

  public getDaysRemaining(asOf: Date = new Date()): number {
    const end = new Date(this._props.endDate);
    end.setHours(23, 59, 59, 999);
    const diffTime = end.getTime() - asOf.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getCurrentWeek(asOf: Date = new Date()): number {
    const start = new Date(this._props.startDate);
    const diffTime = asOf.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    const week = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
    const totalWeeks = this.getTotalWeeks();
    return Math.min(week, totalWeeks);
  }

  public getTotalWeeks(): number {
    const start = new Date(this._props.startDate);
    const end = new Date(this._props.endDate);
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
  }

  public isEndingSoon(asOf: Date = new Date(), thresholdDays: number = 14): boolean {
    const status = this.getStatus(asOf);
    if (status !== 'ACTIVE') return false;
    const remaining = this.getDaysRemaining(asOf);
    return remaining <= thresholdDays;
  }

  public toJSON() {
    const now = new Date();
    const status = this.getStatus(now);
    const daysRemaining = this.getDaysRemaining(now);
    return {
      id: this.id,
      academicYearId: this.academicYearId,
      termNumber: this.termNumber,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      isCurrent: this.isCurrent,
      status,
      daysRemaining,
      currentWeek: this.getCurrentWeek(now),
      totalWeeks: this.getTotalWeeks(),
      isEndingSoon: this.isEndingSoon(now),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

