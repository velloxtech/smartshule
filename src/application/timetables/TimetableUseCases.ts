import {sameTerm, AcademicActor, TeachingScope, TeacherAssignmentAccess, matchesTeachingCohort} from '../shared/TeacherAssignmentAccess';
import { ITimetableRepository } from '../../core/ports/repositories/ITimetableRepository';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { Timetable, TimetableSlot, DayOfWeek } from '../../core/domain/timetable/Timetable';
import { IdGenerator, NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';

export interface CreateTimetableDTO {
  schoolId?: string;
  academicYearId?: string;
  termId: string;
  classRoomId: string;
  streamId?: string;
  slots?: TimetableSlot[];
}

export interface AddSlotDTO {
  slotId?: string;
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

  private async assertCanEdit(actor: AcademicActor | undefined, scope: TeachingScope) {
    if (!actor) return; // Internal callers retain their existing contract.
    if (!['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER', 'TEACHER'].includes(actor.role)) {
      throw new ForbiddenError('Timetable editing access denied.');
    }
    const access = new TeacherAssignmentAccess(this.academicRepository, this.teacherRepository);
    await access.assert(actor, scope);
    if (actor.role === 'TEACHER' && !await access.canClassTeacher(actor, scope)) {
      throw new ForbiddenError('Only an active class teacher can edit this class or stream timetable.');
    }
  }

  private async personalSlotEditor(dto: AddSlotDTO, timetable: Timetable | null, scope: TeachingScope, actor?: AcademicActor): Promise<string[] | null> {
    if (!actor || actor.role !== 'TEACHER') {
      await this.assertCanEdit(actor, scope);
      return null;
    }
    const access = new TeacherAssignmentAccess(this.academicRepository, this.teacherRepository);
    if (await access.canClassTeacher(actor, scope)) return null;
    const assigned = await access.assignments(actor, scope);
    const ownIds = [actor.userId, assigned.teacher.id];
    const source = timetable?.slots.find(slot => slot.id === dto.slotId);
    if (!source?.teacherId || !ownIds.includes(source.teacherId)
      || !dto.teacherId || !ownIds.includes(dto.teacherId)
      || dto.isBreak || dto.isLunch || !source.learningAreaId || !dto.learningAreaId) {
      throw new ForbiddenError('You can only edit your own assigned teaching lessons.');
    }
    await access.assert(actor, {...scope, learningAreaId: source.learningAreaId});
    await access.assert(actor, {...scope, learningAreaId: dto.learningAreaId});
    return ownIds;
  }

  private actorScope<T extends {schoolId?: string}>(dto: T, actor?: AcademicActor): T {
    if (actor && (!actor.schoolId || (dto.schoolId && dto.schoolId !== actor.schoolId))) {
      throw new ForbiddenError('School access denied.');
    }
    return {...dto, schoolId: actor?.schoolId || dto.schoolId};
  }

  private slotsOverlap(a: Pick<TimetableSlot, 'dayOfWeek' | 'periodNumber' | 'startTime' | 'endTime'>, b: Pick<TimetableSlot, 'dayOfWeek' | 'periodNumber' | 'startTime' | 'endTime'>) {
    if (String(a.dayOfWeek).trim().toUpperCase() !== String(b.dayOfWeek).trim().toUpperCase()) return false;
    if ([a.startTime, a.endTime, b.startTime, b.endTime].every(t => /^\d{2}:\d{2}$/.test(t || ''))) {
      return a.startTime < b.endTime && b.startTime < a.endTime;
    }
    return Number(a.periodNumber) === Number(b.periodNumber);
  }

  public async createTimetable(dto: CreateTimetableDTO, actor?: AcademicActor) {
    const {timetable: existing, ...scope} = await this.resolveTimetableScope(this.actorScope(dto, actor));
    await this.assertCanEdit(actor, scope);
    if (existing) return existing.toJSON();
    dto = {...dto, ...scope};
    const yearId = scope.academicYearId;

    const timetable = Timetable.create(
      {
        schoolId: dto.schoolId || 'school-001',
        academicYearId: yearId,
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

  public async addOrUpdateSlot(dto: AddSlotDTO, actor?: AcademicActor) {
    const {timetable:found,...scope}=await this.resolveTimetableScope(this.actorScope(dto, actor));
    const personalEditorIds = await this.personalSlotEditor(dto, found, scope, actor);
    let timetable=found;dto={...dto,...scope};

    if (!timetable) {
      // Auto-create timetable
      const schoolId = dto.schoolId || 'school-001';
      let academicYearId = dto.academicYearId;
      if (!academicYearId && this.academicRepository) {
        const curYear = await this.academicRepository.findCurrentYear(schoolId);
        academicYearId = curYear?.id;
      }
      if (!academicYearId) {
        academicYearId = `year-${new Date().getFullYear()}`;
      }
      let termId = dto.termId;
      if (!termId && this.academicRepository) {
        const curTerm = await this.academicRepository.findCurrentTerm(academicYearId);
        termId = curTerm?.id;
      }
      if (!termId) {
        termId = `term-${academicYearId}-t1`;
      }
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
    if (!dto.slotId && dto.teacherId && !dto.isBreak && !dto.isLunch) {
      const teacherSlots = await this.timetableRepository.findByTeacher(dto.teacherId, timetable.termId);
      const conflict = teacherSlots.find(s => {
        if (!this.slotsOverlap(s, {...dto, dayOfWeek: dto.dayOfWeek})) return false;

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

    if (dto.slotId) {
      const source = timetable.slots.find(s => s.id === dto.slotId);
      if (!source) throw new NotFoundError('Timetable slot', dto.slotId);
      const target = timetable.slots.find(s => s.dayOfWeek === slot.dayOfWeek && s.periodNumber === slot.periodNumber);
      // Moving onto an occupied cell exchanges lessons in one validated save.
      const slots = timetable.slots.flatMap(existing => {
        if (existing.id === source.id) return [{...slot, id: source.id}];
        if (target && existing.id === target.id) return [{...existing,
          dayOfWeek: source.dayOfWeek, periodNumber: source.periodNumber,
          startTime: source.startTime, endTime: source.endTime}];
        return [existing];
      });
      // Personal edits are authorized above against the persisted source lesson.
      const saved = await this.saveTimetableGrid({...scope, timetableId: timetable.id, slots}, personalEditorIds ? undefined : actor);
      return personalEditorIds ? {...saved, slots: saved.slots.filter(s => s.teacherId && personalEditorIds.includes(s.teacherId))} : saved;
    }

    timetable.addOrUpdateSlot(slot);
    await this.timetableRepository.update(timetable);
    return timetable.toJSON();
  }

  private async resolveTimetableScope(dto:{timetableId?:string;schoolId?:string;academicYearId?:string;termId?:string;classRoomId?:string;streamId?:string}) {
    let timetable = dto.timetableId?await this.timetableRepository.findById(dto.timetableId):null;
    const schoolIdForScope=dto.schoolId||timetable?.schoolId||'school-001';
    const yearIdForScope=dto.academicYearId||timetable?.academicYearId||(await this.academicRepository.findCurrentYear(schoolIdForScope))?.id;
    const yearForScope=yearIdForScope?await this.academicRepository.findYearById(yearIdForScope):null;
    let termForScope=dto.termId?await this.academicRepository.findTermById(dto.termId):timetable?.termId?await this.academicRepository.findTermById(timetable.termId):await this.academicRepository.findCurrentTerm(yearIdForScope);
    if(!termForScope&&dto.termId&&yearIdForScope)termForScope=(await this.academicRepository.findTermsByYear(yearIdForScope)).find(t=>sameTerm(t.id,dto.termId!))||null;
    if(!yearForScope||yearForScope.schoolId!==schoolIdForScope||!termForScope||termForScope.academicYearId!==yearForScope.id)throw new ValidationError('Select a valid school academic year and term before saving the timetable.');
    const streamForScope=dto.streamId?await this.academicRepository.findStreamById(dto.streamId):null;
    const classIdForScope=dto.classRoomId||timetable?.classRoomId||streamForScope?.classRoomId;
    const classForScope=classIdForScope?await this.academicRepository.findClassById(classIdForScope):null;
    if(!classForScope||classForScope.schoolId!==schoolIdForScope||(dto.streamId&&(!streamForScope||streamForScope.classRoomId!==classForScope.id)))throw new ValidationError('Select a class and stream belonging to this school.');
    const streamIdForScope=dto.streamId!==undefined?dto.streamId:timetable?.streamId;
    if(timetable&&(timetable.schoolId!==schoolIdForScope||timetable.academicYearId!==yearForScope.id||!sameTerm(timetable.termId,termForScope.id)||timetable.classRoomId!==classForScope.id||(timetable.streamId||'')!==(streamIdForScope||'')))throw new ValidationError('The selected timetable belongs to a different class, stream or period. Reload the correct timetable before saving.');
    if(!timetable){const matches=await this.timetableRepository.findByClass(classForScope.id,termForScope.id);timetable=matches.find(t=>t.schoolId===schoolIdForScope&&t.academicYearId===yearForScope.id&&(t.streamId||'')===(streamIdForScope||''))||null;}
    return {timetable,schoolId:schoolIdForScope,academicYearId:yearForScope.id,termId:termForScope.id,classRoomId:classForScope.id,streamId:streamIdForScope};
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
  }, actor?: AcademicActor) {
    const {timetable:found,...scope}=await this.resolveTimetableScope(this.actorScope(dto, actor));
    await this.assertCanEdit(actor, scope);
    let timetable=found;dto={...dto,...scope};
    const targetClassRoomId=scope.classRoomId,targetStreamId=scope.streamId||'',targetTimetableId=timetable?.id||'',effectiveTermId=scope.termId;

    // Check the final grid so moves and swaps are validated together.
    const seenTeacherSlots = new Map<string, TimetableSlot[]>();
    for (const slot of dto.slots || []) {
      if (!slot.teacherId || slot.isBreak || slot.isLunch) continue;
      const seen = seenTeacherSlots.get(slot.teacherId) || [];
      if (seen.some(existing => this.slotsOverlap(existing, slot))) {
        throw new ConflictError(`Conflict in grid: ${slot.teacherName || 'Teacher'} has overlapping lessons on ${slot.dayOfWeek}.`);
      }
      seen.push(slot);
      seenTeacherSlots.set(slot.teacherId, seen);
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
          if (!this.slotsOverlap(existing, slot)) return false;

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
    let academicYearId = dto.academicYearId;
    if (!academicYearId && this.academicRepository) {
      const curYear = await this.academicRepository.findCurrentYear(schoolId);
      academicYearId = curYear?.id;
    }
    if (!academicYearId) {
      academicYearId = `year-${new Date().getFullYear()}`;
    }
    let termId = dto.termId;
    if (!termId && this.academicRepository) {
      const curTerm = await this.academicRepository.findCurrentTerm(academicYearId);
      termId = curTerm?.id;
    }
    if (!termId) {
      termId = `term-${academicYearId}-t1`;
    }
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

  public async deleteSlot(timetableId: string, slotId: string, actor?: AcademicActor) {
    const timetable = await this.timetableRepository.findById(timetableId);
    if (!timetable) throw new NotFoundError('Timetable', timetableId);

    await this.assertCanEdit(actor, timetable.toJSON());
    timetable.removeSlot(slotId);
    await this.timetableRepository.update(timetable);
    return timetable.toJSON();
  }

  private async readPeriod(actor:AcademicActor,termId?:string,academicYearId?:string){
    if(!actor.schoolId)throw new ForbiddenError('A school-scoped account is required.');
    let yearId=academicYearId;
    if(!yearId&&termId){for(const year of await this.academicRepository.findAllYears(actor.schoolId)){if((await this.academicRepository.findTermsByYear(year.id)).some(t=>sameTerm(t.id,termId))){yearId=year.id;break;}}}
    return new TeacherAssignmentAccess(this.academicRepository,this.teacherRepository).context(actor,{academicYearId:yearId,termId});
  }

  public async getTeacherTimetableAccess(actor:AcademicActor,scope:TeachingScope={}){
    if(actor.role!=='TEACHER')throw new ForbiddenError('Teacher timetable access is for the signed-in teacher.');
    const period=await this.readPeriod(actor,scope.termId,scope.academicYearId);
    const assigned=await new TeacherAssignmentAccess(this.academicRepository,this.teacherRepository).assignments(actor,{academicYearId:period.year.id,termId:period.term.id});
    const classes=[];
    for(const cls of await this.academicRepository.findAllClasses(actor.schoolId)){
      const duties=assigned.classes.filter(a=>a.classRoomId===cls.id||(!a.classRoomId&&Boolean(a.streamId)));
      const streams=(await this.academicRepository.findStreamsByClass(cls.id)).filter(s=>duties.some(a=>matchesTeachingCohort(a,cls.id,s.id)));
      const allowsWholeClass=duties.some(a=>a.classRoomId===cls.id&&!a.streamId);
      if(allowsWholeClass||streams.length)classes.push({...cls.toJSON(),streams:streams.map(s=>s.toJSON()),allowsWholeClass});
    }
    return {teacherId:assigned.teacher.id,academicYearId:period.year.id,termId:period.term.id,classes};
  }

  public async getStreamTimetable(streamIdOrClassId?: string, termId?: string, classRoomId?: string,actor?:AcademicActor,academicYearId?:string) {
    const stream=streamIdOrClassId?await this.academicRepository.findStreamById(streamIdOrClassId):null;
    const targetClass=classRoomId||stream?.classRoomId||streamIdOrClassId;
    const requestedStream=stream&&streamIdOrClassId!==classRoomId?stream.id:undefined;
    if(stream&&classRoomId&&stream.classRoomId!==classRoomId)throw new ValidationError('The stream does not belong to the selected class.');
    if(classRoomId&&streamIdOrClassId&&streamIdOrClassId!==classRoomId&&!stream)throw new ValidationError('The selected stream does not exist.');
    const period=actor&&(actor.role==='TEACHER'||termId||academicYearId)?await this.readPeriod(actor,termId,academicYearId):undefined;
    if(actor){
      const cls=targetClass?await this.academicRepository.findClassById(targetClass):null;
      if(!cls||cls.schoolId!==actor.schoolId)throw new ForbiddenError('Class timetable access denied.');
      if(actor.role==='TEACHER'&&!await new TeacherAssignmentAccess(this.academicRepository,this.teacherRepository).canClassTeacher(actor,{classRoomId:targetClass,streamId:requestedStream,academicYearId:period!.year.id,termId:period!.term.id}))throw new ForbiddenError('The full class timetable requires an active class-teacher assignment. Use My Teaching Timetable for your subject lessons.');
    }
    const rows=targetClass?(await this.timetableRepository.findByClass(targetClass)).filter(t=>(!termId||sameTerm(t.termId,termId))&&(!period||(t.schoolId===actor!.schoolId&&t.academicYearId===period.year.id&&sameTerm(t.termId,period.term.id)))):[];
    const timetable=(requestedStream?rows.find(t=>t.streamId===requestedStream):undefined)||rows.find(t=>!t.streamId)||null;
    if (!timetable) throw new NotFoundError('Timetable for this class or stream');
    return timetable.toJSON();
  }

  public async getTeacherTimetable(teacherId: string, termId?: string,actor?:AcademicActor,academicYearId?:string) {
    if(!actor)return this.timetableRepository.findByTeacher(teacherId,termId);
    const period=await this.readPeriod(actor,termId,academicYearId);
    const access=new TeacherAssignmentAccess(this.academicRepository,this.teacherRepository);
    const assigned=actor.role==='TEACHER'?await access.assignments(actor,{academicYearId:period.year.id,termId:period.term.id}):null;
    if(assigned&&teacherId&&![actor.userId,assigned.teacher.id].includes(teacherId))throw new ForbiddenError('Teachers can only view their own teaching timetable.');
    const ids=assigned?[assigned.teacher.id,actor.userId]:[teacherId];
    if(!ids[0])throw new ValidationError('Choose a teacher.');
    const terms=[period.term.id,period.term.id.includes('-t')?period.term.id.replace(/-t([1-3])$/,'-$1'):period.term.id.replace(/-([1-3])$/,'-t$1')];
    const candidates=(await Promise.all([...new Set(ids)].flatMap(id=>[...new Set(terms)].map(term=>this.timetableRepository.findByTeacher(id,term))))).flat();
    const parents=new Map<string,Timetable|null>(),seen=new Set<string>(),slots=[];
    for(const slot of candidates){
      if(!slot.timetableId)continue;
      if(!parents.has(slot.timetableId))parents.set(slot.timetableId,await this.timetableRepository.findById(slot.timetableId));
      const table=parents.get(slot.timetableId);
      if(!table||table.schoolId!==actor.schoolId||table.academicYearId!==period.year.id||!sameTerm(table.termId,period.term.id))continue;
      if(assigned&&!assigned.classes.some(a=>matchesTeachingCohort(a,table.classRoomId,table.streamId))&&!assigned.subjects.some(a=>matchesTeachingCohort(a,table.classRoomId,table.streamId)&&a.learningAreaId===slot.learningAreaId))continue;
      const key=JSON.stringify([slot.timetableId,slot.id||[slot.dayOfWeek,slot.periodNumber]]);if(seen.has(key))continue;seen.add(key);
      const classroom = await this.academicRepository.findClassById(table.classRoomId);
      const stream = table.streamId ? await this.academicRepository.findStreamById(table.streamId) : null;
      slots.push({...slot, teacherId: table.slots.find(s => s.id === slot.id)?.teacherId, className: classroom?.name, streamName: stream?.name});
    }
    return slots;
  }
}
