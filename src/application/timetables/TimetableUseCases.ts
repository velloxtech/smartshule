import { ITimetableRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { Timetable, TimetableSlot, DayOfWeek } from '../../core/domain/timetable/Timetable';
import { IdGenerator, NotFoundError, ConflictError, ValidationError } from '../../core/domain/shared/Errors';

export interface CreateTimetableDTO {
  schoolId: string;
  academicYearId: string;
  termId: string;
  classRoomId: string;
  streamId: string;
  slots?: TimetableSlot[];
}

export interface AddSlotDTO {
  timetableId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
  learningAreaId?: string;
  teacherId?: string;
  roomName?: string;
  isBreak?: boolean;
  isLunch?: boolean;
  label?: string;
}

export class TimetableUseCases {
  constructor(
    private readonly timetableRepository: ITimetableRepository,
    private readonly academicRepository: IAcademicRepository,
    private readonly teacherRepository: ITeacherRepository
  ) {}

  public async createTimetable(dto: CreateTimetableDTO) {
    const existing = await this.timetableRepository.findByStream(dto.streamId, dto.termId);
    if (existing) {
      return existing.toJSON();
    }

    const timetable = Timetable.create(
      {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        classRoomId: dto.classRoomId,
        streamId: dto.streamId,
        slots: dto.slots || [],
        isActive: true
      },
      IdGenerator.generate()
    );

    await this.timetableRepository.save(timetable);
    return timetable.toJSON();
  }

  public async addOrUpdateSlot(dto: AddSlotDTO) {
    const timetable = await this.timetableRepository.findById(dto.timetableId);
    if (!timetable) throw new NotFoundError('Timetable', dto.timetableId);

    // Conflict Check 1: Check if teacher is already booked elsewhere at that day & period
    if (dto.teacherId && !dto.isBreak && !dto.isLunch) {
      const teacherSlots = await this.timetableRepository.findByTeacher(dto.teacherId, timetable.termId);
      const conflict = teacherSlots.find(
        s => s.dayOfWeek === dto.dayOfWeek && s.periodNumber === dto.periodNumber && s.streamId !== timetable.streamId
      );
      if (conflict) {
        throw new ConflictError(
          `Teacher is already booked in another class on ${dto.dayOfWeek}, Period ${dto.periodNumber}.`
        );
      }
    }

    let learningAreaName = dto.label;
    if (dto.learningAreaId) {
      const area = await this.academicRepository.findLearningAreaById(dto.learningAreaId);
      if (area) learningAreaName = area.name;
    }

    let teacherName: string | undefined;
    if (dto.teacherId) {
      const teacher = await this.teacherRepository.findById(dto.teacherId);
      if (teacher) {
        teacherName = `Teacher (${teacher.employeeNumber})`;
      }
    }

    const slot: TimetableSlot = {
      id: IdGenerator.generate(),
      dayOfWeek: dto.dayOfWeek,
      periodNumber: dto.periodNumber,
      startTime: dto.startTime,
      endTime: dto.endTime,
      learningAreaId: dto.learningAreaId,
      learningAreaName,
      teacherId: dto.teacherId,
      teacherName,
      roomName: dto.roomName,
      isBreak: dto.isBreak ?? false,
      isLunch: dto.isLunch ?? false,
      label: dto.label
    };

    timetable.addOrUpdateSlot(slot);
    await this.timetableRepository.update(timetable);
    return timetable.toJSON();
  }

  public async getStreamTimetable(streamId: string, termId: string) {
    const timetable = await this.timetableRepository.findByStream(streamId, termId);
    if (!timetable) throw new NotFoundError('Timetable for this stream');
    return timetable.toJSON();
  }

  public async getTeacherTimetable(teacherId: string, termId: string) {
    const slots = await this.timetableRepository.findByTeacher(teacherId, termId);
    return slots;
  }
}
