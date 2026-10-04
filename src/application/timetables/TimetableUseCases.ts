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
  dayOfWeek: DayOfWeek | string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  learningAreaId?: string;
  learningAreaName?: string;
  teacherId?: string;
  teacherName?: string;
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
    if (!timetable && dto.streamId) {
      timetable = await this.timetableRepository.findByStream(dto.streamId);
    }
    if (!timetable && dto.classRoomId) {
      const classTimetables = await this.timetableRepository.findByClass(dto.classRoomId);
      if (classTimetables && classTimetables.length > 0) {
        timetable = classTimetables[0];
      }
    }

    if (!timetable) {
      // Auto-create timetable
      const schoolId = dto.schoolId || 'school-001';
      const academicYearId = dto.academicYearId || 'year-2026';
      const termId = dto.termId || 'term-2026-t1';
      let classRoomId = dto.classRoomId || (dto.timetableId && !dto.timetableId.startsWith('timetable-') ? dto.timetableId : undefined);
      if (!classRoomId) {
        const classes = await this.academicRepository.findAllClasses(schoolId);
        if (classes.length > 0) {
          classRoomId = classes[0].id;
        } else {
          classRoomId = 'class-001';
        }
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

    // Conflict Check: Check if teacher is already booked elsewhere at that day & period
    if (dto.teacherId && !dto.isBreak && !dto.isLunch) {
      const teacherSlots = await this.timetableRepository.findByTeacher(dto.teacherId, timetable.termId);
      const conflict = teacherSlots.find(s => {
        const isSameDay = String(s.dayOfWeek).trim().toUpperCase() === String(dto.dayOfWeek).trim().toUpperCase();
        const isSamePeriod = Number(s.periodNumber) === Number(dto.periodNumber);
        if (!isSameDay || !isSamePeriod) return false;

        const isSameTimetable = (timetable.id && s.timetableId && s.timetableId === timetable.id) ||
          (s.classRoomId === timetable.classRoomId && (s.streamId || '') === (timetable.streamId || ''));

        return !isSameTimetable;
      });

      if (conflict) {
        let conflictLocation = 'another class';
        try {
          if (conflict.classRoomId) {
            const cls = await this.academicRepository.findClassById(conflict.classRoomId);
            if (cls) {
              conflictLocation = cls.name;
              if (conflict.streamId) {
                const stream = await this.academicRepository.findStreamById(conflict.streamId);
                if (stream) conflictLocation += ` (${stream.name})`;
              }
            }
          }
        } catch (_) {}
        const teacherLabel = dto.teacherName || 'Teacher';
        throw new ConflictError(
          `Revoked Clash: ${teacherLabel} is already scheduled in ${conflictLocation} on ${dto.dayOfWeek}, Period ${dto.periodNumber}. A teacher cannot have two classes simultaneously.`
        );
      }
    }

    let learningAreaName = dto.learningAreaName || dto.label;
    if (!learningAreaName && dto.learningAreaId) {
      const area = await this.academicRepository.findLearningAreaById(dto.learningAreaId);
      if (area) learningAreaName = area.name;
    }

    let teacherName: string | undefined = dto.teacherName;
    if (!teacherName && dto.teacherId) {
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
    if (!timetable && dto.streamId) {
      timetable = await this.timetableRepository.findByStream(dto.streamId);
    }
    if (!timetable && dto.classRoomId) {
      const classTimetables = await this.timetableRepository.findByClass(dto.classRoomId);
      if (classTimetables && classTimetables.length > 0) {
        timetable = classTimetables[0];
      }
    }

    // Determine target identifiers and term
    const targetClassRoomId = timetable?.classRoomId || dto.classRoomId || '';
    const targetStreamId = timetable?.streamId || dto.streamId || '';
    const targetTimetableId = timetable?.id || dto.timetableId || '';
    const effectiveTermId = timetable?.termId || dto.termId || 'term-2026-t1';

    // Conflict Check 1: Intra-grid conflict (same teacher scheduled multiple times in this grid at same day & period)
    const seenTeacherSlots = new Map<string, string>();
    for (const slot of (dto.slots || [])) {
      if (slot.teacherId && !slot.isBreak && !slot.isLunch) {
        const key = `${String(slot.dayOfWeek).trim().toUpperCase()}_${Number(slot.periodNumber)}_${slot.teacherId}`;
        if (seenTeacherSlots.has(key)) {
          const teacherLabel = slot.teacherName || 'Teacher';
          throw new ConflictError(
            `Conflict in grid: ${teacherLabel} is assigned more than once to ${slot.dayOfWeek}, Period ${slot.periodNumber}.`
          );
        }
        seenTeacherSlots.set(key, slot.id || 'slot');
      }
    }

    // Conflict Check 2: Inter-timetable conflict (is teacher booked in any other class/stream at this day & period?)
    const uniqueTeacherIds = Array.from(new Set(
      (dto.slots || [])
        .filter(s => s.teacherId && !s.isBreak && !s.isLunch)
        .map(s => s.teacherId as string)
    ));

    for (const tId of uniqueTeacherIds) {
      const existingTeacherSlots = await this.timetableRepository.findByTeacher(tId, effectiveTermId);
      const slotsForThisTeacher = (dto.slots || []).filter(
        s => s.teacherId === tId && !s.isBreak && !s.isLunch
      );

      for (const slot of slotsForThisTeacher) {
        const conflict = existingTeacherSlots.find(existing => {
          const isSameDay = String(existing.dayOfWeek).trim().toUpperCase() === String(slot.dayOfWeek).trim().toUpperCase();
          const isSamePeriod = Number(existing.periodNumber) === Number(slot.periodNumber);
          if (!isSameDay || !isSamePeriod) return false;

          const isSameTimetable = (targetTimetableId && existing.timetableId && existing.timetableId === targetTimetableId) ||
            (existing.classRoomId === targetClassRoomId && (existing.streamId || '') === (targetStreamId || ''));

          return !isSameTimetable;
        });

        if (conflict) {
          let conflictLocation = 'another class';
          try {
            if (conflict.classRoomId) {
              const cls = await this.academicRepository.findClassById(conflict.classRoomId);
              if (cls) {
                conflictLocation = cls.name;
                if (conflict.streamId) {
                  const stream = await this.academicRepository.findStreamById(conflict.streamId);
                  if (stream) conflictLocation += ` (${stream.name})`;
                }
              }
            }
          } catch (_) {}
          const teacherLabel = slot.teacherName || 'Teacher';
          throw new ConflictError(
            `Revoked Clash: ${teacherLabel} is already scheduled in ${conflictLocation} on ${slot.dayOfWeek}, Period ${slot.periodNumber}. A teacher cannot have two classes simultaneously.`
          );
        }
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
      dto.timetableId || IdGenerator.generate()
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
    if (streamIdOrClassId && streamIdOrClassId !== classRoomId) {
      timetable = await this.timetableRepository.findByStream(streamIdOrClassId, termId || '');
      if (!timetable && termId) {
        timetable = await this.timetableRepository.findByStream(streamIdOrClassId);
      }
    }
    if (!timetable) {
      const targetClass = classRoomId || streamIdOrClassId;
      if (targetClass) {
        let classTimetables = await this.timetableRepository.findByClass(targetClass, termId || '');
        if ((!classTimetables || classTimetables.length === 0) && termId) {
          classTimetables = await this.timetableRepository.findByClass(targetClass);
        }
        if (classTimetables && classTimetables.length > 0) {
          timetable = classTimetables[0];
        }
      }
    }
    if (!timetable) throw new NotFoundError('Timetable for this class or stream');
    return timetable.toJSON();
  }

  public async getTeacherTimetable(teacherId: string, termId?: string) {
    const slots = await this.timetableRepository.findByTeacher(teacherId, termId);
    return slots;
  }
}
