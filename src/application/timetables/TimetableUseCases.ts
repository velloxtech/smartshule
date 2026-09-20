import { ITimetableRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { Timetable, TimetableSlot, DayOfWeek } from '../../core/domain/timetable/Timetable';
import { IdGenerator, NotFoundError, ConflictError, ValidationError } from '../../core/domain/shared/Errors';

export interface CreateTimetableDTO {
  schoolId?: string;
  academicYearId?: string;
  termId: string;
  classRoomId: string;
  streamId?: string;
  slots?: TimetableSlot[];
}

export interface AddSlotDTO {
  timetableId?: string;
  classRoomId?: string;
  streamId?: string;
  termId?: string;
  schoolId?: string;
  academicYearId?: string;
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
    let existing = dto.streamId ? await this.timetableRepository.findByStream(dto.streamId, dto.termId) : null;
    if (!existing && dto.classRoomId) {
      const classTimetables = await this.timetableRepository.findByClass(dto.classRoomId, dto.termId);
      if (classTimetables.length > 0) existing = classTimetables[0];
    }
    if (existing) {
      return existing.toJSON();
    }

    const timetable = Timetable.create(
      {
        schoolId: dto.schoolId || 'school-001',
        academicYearId: dto.academicYearId || 'year-2026',
        termId: dto.termId,
        classRoomId: dto.classRoomId,
        streamId: dto.streamId || '',
        slots: dto.slots || [],
        isActive: true
      },
      IdGenerator.generate()
    );

    await this.timetableRepository.save(timetable);
    return timetable.toJSON();
  }

  public async addOrUpdateSlot(dto: AddSlotDTO) {
    let timetable = dto.timetableId ? await this.timetableRepository.findById(dto.timetableId) : null;
    if (!timetable && dto.streamId && dto.termId) {
      timetable = await this.timetableRepository.findByStream(dto.streamId, dto.termId);
    }
    if (!timetable && dto.classRoomId && dto.termId) {
      const classTimetables = await this.timetableRepository.findByClass(dto.classRoomId, dto.termId);
      if (classTimetables && classTimetables.length > 0) {
        timetable = classTimetables[0];
      }
    }
    if (!timetable) {
      // Auto-create timetable
      const schoolId = dto.schoolId || 'school-001';
      const academicYearId = dto.academicYearId || 'year-2026';
      const termId = dto.termId || 'term-2026-t1';
      let classRoomId = dto.classRoomId || dto.timetableId?.replace('timetable-', '');
      const classes = await this.academicRepository.findAllClasses(schoolId);
      const foundClass = classes.find(c => c.id === classRoomId);
      if (foundClass) {
        classRoomId = foundClass.id;
      } else if (classes.length > 0) {
        classRoomId = classes[0].id;
      } else {
        classRoomId = 'class-001';
      }
      timetable = Timetable.create(
        {
          schoolId,
          academicYearId,
          termId,
          classRoomId,
          streamId: dto.streamId || '',
          slots: [],
          isActive: true
        },
        dto.timetableId && !dto.timetableId.startsWith('timetable-') ? dto.timetableId : IdGenerator.generate()
      );
      await this.timetableRepository.save(timetable);
    }

    // Conflict Check 1: Check if teacher is already booked elsewhere at that day & period
    if (dto.teacherId && !dto.isBreak && !dto.isLunch) {
      const teacherSlots = await this.timetableRepository.findByTeacher(dto.teacherId, timetable.termId);
      const conflict = teacherSlots.find(
        s => s.dayOfWeek === dto.dayOfWeek && s.periodNumber === dto.periodNumber && s.streamId && timetable.streamId && s.streamId !== timetable.streamId
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

  public async saveTimetableGrid(dto: {
    timetableId?: string;
    streamId?: string;
    termId?: string;
    schoolId?: string;
    academicYearId?: string;
    classRoomId?: string;
    periods?: any[];
    days?: any[];
    slots: TimetableSlot[];
  }) {
    let timetable = null;

    if (dto.timetableId) {
      timetable = await this.timetableRepository.findById(dto.timetableId);
    }
    if (!timetable && dto.streamId && dto.termId) {
      timetable = await this.timetableRepository.findByStream(dto.streamId, dto.termId);
    }
    if (!timetable && dto.classRoomId && dto.termId) {
      const classTimetables = await this.timetableRepository.findByClass(dto.classRoomId, dto.termId);
      if (classTimetables && classTimetables.length > 0) {
        timetable = classTimetables[0];
      }
    }

    if (timetable) {
      timetable.updateGrid(dto.periods, dto.days, dto.slots);
      await this.timetableRepository.update(timetable);
      return timetable.toJSON();
    }

    const schoolId = dto.schoolId || 'school-001';
    const academicYearId = dto.academicYearId || 'year-2026';
    const termId = dto.termId || 'term-2026-t1';
    const classRoomId = dto.classRoomId;

    if (!classRoomId) {
      throw new ValidationError('classRoomId is required to create a new timetable.');
    }

    // Create new timetable if not exists
    const newTimetable = Timetable.create(
      {
        schoolId,
        academicYearId,
        termId,
        classRoomId,
        streamId: dto.streamId || '',
        slots: dto.slots || [],
        periods: dto.periods,
        days: dto.days,
        isActive: true
      },
      IdGenerator.generate()
    );

    await this.timetableRepository.save(newTimetable);
    return newTimetable.toJSON();
  }

  public async deleteSlot(timetableId: string, slotId: string) {
    const timetable = await this.timetableRepository.findById(timetableId);
    if (!timetable) throw new NotFoundError('Timetable', timetableId);

    timetable.removeSlot(slotId);
    await this.timetableRepository.update(timetable);
    return timetable.toJSON();
  }

  public async getStreamTimetable(streamIdOrClassId?: string, termId?: string, classRoomId?: string) {
    let timetable = null;
    if (streamIdOrClassId) {
      timetable = await this.timetableRepository.findByStream(streamIdOrClassId, termId || '');
    }
    if (!timetable) {
      const targetClass = classRoomId || streamIdOrClassId;
      if (targetClass) {
        const classTimetables = await this.timetableRepository.findByClass(targetClass, termId || '');
        if (classTimetables && classTimetables.length > 0) {
          timetable = classTimetables[0];
        }
      }
    }
    if (!timetable) throw new NotFoundError('Timetable for this class or stream');
    return timetable.toJSON();
  }

  public async getTeacherTimetable(teacherId: string, termId: string) {
    const slots = await this.timetableRepository.findByTeacher(teacherId, termId);
    return slots;
  }
}
