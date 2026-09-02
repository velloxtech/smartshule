import { Entity } from '../shared/Entity';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY'
}

export interface TimetableSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number; // 1, 2, 3...
  startTime: string; // "08:00"
  endTime: string; // "08:45"
  learningAreaId?: string;
  learningAreaName?: string;
  teacherId?: string;
  teacherName?: string;
  roomName?: string;
  isBreak: boolean;
  isLunch: boolean;
  label?: string; // "Short Break", "Lunch Break", "Games / Physical Education"
}

export interface TimetableProps {
  schoolId: string;
  academicYearId: string;
  termId: string;
  classRoomId: string;
  streamId: string;
  slots: TimetableSlot[];
  isActive: boolean;
}

export class Timetable extends Entity<TimetableProps> {
  public static create(props: TimetableProps, id: string, createdAt?: Date, updatedAt?: Date): Timetable {
    return new Timetable(props, id, createdAt, updatedAt);
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get academicYearId(): string {
    return this._props.academicYearId;
  }

  public get termId(): string {
    return this._props.termId;
  }

  public get classRoomId(): string {
    return this._props.classRoomId;
  }

  public get streamId(): string {
    return this._props.streamId;
  }

  public get slots(): TimetableSlot[] {
    return this._props.slots;
  }

  public get isActive(): boolean {
    return this._props.isActive;
  }

  public addOrUpdateSlot(slot: TimetableSlot): void {
    const existingIndex = this._props.slots.findIndex(
      s => s.dayOfWeek === slot.dayOfWeek && s.periodNumber === slot.periodNumber
    );
    if (existingIndex >= 0) {
      this._props.slots[existingIndex] = slot;
    } else {
      this._props.slots.push(slot);
    }
    this.touch();
  }

  public removeSlot(slotId: string): void {
    this._props.slots = this._props.slots.filter(s => s.id !== slotId);
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      academicYearId: this.academicYearId,
      termId: this.termId,
      classRoomId: this.classRoomId,
      streamId: this.streamId,
      slots: this.slots,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
