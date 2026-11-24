import { canPrepareCurriculum, hasAdministrativeAccess } from '../shared/AdministrativeAccess';
import { assertWeeklyCoverage, selectWeeklySubmission, weeklyReviewEntries } from '../planning/WeeklySchemePolicy';
import { AcademicActor, TeacherAssignmentAccess, TeachingScope, sameTerm } from '../shared/TeacherAssignmentAccess';
import { CalendarPlanningService } from '../planning/CalendarPlanningService';
import { IRecordOfWorkRepository } from '../../core/ports/repositories/IRecordOfWorkRepository';
import {
  ISchemeOfWorkRepository,
  ILessonPlanRepository,
  SchemeFilterCriteria,
  LessonPlanFilterCriteria
} from '../../core/ports/repositories/ISchemeOfWorkRepository';
import { ITeacherRepository } from '../../core/ports/repositories/ITeacherRepository';
import { SchemeOfWork, SchemeOfWorkEntry, SchemeStatus } from '../../core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan, LessonDevelopmentStep, LessonPlanStatus } from '../../core/domain/curriculum-plan/LessonPlan';
import { CoreCompetency, CoreValue } from '../../core/domain/cbc/CbcAssessment';
import { IdGenerator, NotFoundError, ValidationError, ForbiddenError } from '../../core/domain/shared/Errors';

export interface CreateSchemeDTO {
  teacherId: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  academicYearId: string;
  termId: string;
  title: string;
  entries?: Omit<SchemeOfWorkEntry, 'id'>[];
}

export interface CreateLessonPlanDTO {
  otherLearningAreas?: string[];
  communityServiceActivities?: string;
  nonFormalActivity?: string;
  assessmentRubric?: {criterion:string; exceeds:string; meets:string; approaching:string; below:string}[];

  weekNumber?: number;
  lessonNumber?: number;
  lessonTime?: string;
  pcis?: string[];

  teacherId: string;
  schemeOfWorkEntryId?: string;
  learningAreaId: string;
  classRoomId: string;
  streamId?: string;
  lessonDate: string;
  durationMinutes?: number;
  rollBoys?: number;
  rollGirls?: number;
  strand: string;
  subStrand: string;
  specificLearningOutcomes: string[];
  keyInquiryQuestions: string[];
  coreCompetenciesAddressed: CoreCompetency[];
  valuesAddressed: CoreValue[];
  learningExperiences?: string[];
  assessmentMethods?: string[];
  learningResources: string[];
  steps: LessonDevelopmentStep[];
  extendedActivity?: string;
  teacherSelfReflection?: string;
}

export class CurriculumPlanUseCases {
  constructor(
    private readonly schemeRepository: ISchemeOfWorkRepository,
    private readonly lessonPlanRepository: ILessonPlanRepository,
    private readonly teacherRepository?: ITeacherRepository,
    private readonly access?: TeacherAssignmentAccess,
    private readonly planning?: CalendarPlanningService,
    private readonly records?: IRecordOfWorkRepository
  ) {}

  private async authorize(record: TeachingScope, actor?: AcademicActor, lock = true) {
    if (!this.access) return;
    if (!actor) throw new ForbiddenError('Authentication required.');
    if(actor.role==='TEACHER'&&!record.teacherId)throw new ForbiddenError('This private record needs verified teacher ownership.');
    await this.access.assert(actor, record, true);
    if (lock && actor.role === 'TEACHER') await this.access.assertSubjectTeaching(actor, record);
    if (lock && this.planning) await this.planning.assertUnlocked(actor, record);
  }
  private async planScope(plan: LessonPlan) {
    const source=(await this.schemeRepository.findAll()).find(s=>s.entries.some(e=>e.id===plan.toJSON().schemeOfWorkEntryId));
    return {...plan.toJSON(),academicYearId:source?.academicYearId || '__unverified__',termId:source?.termId || '__unverified__'};
  }
  private async validateEntries(scope: TeachingScope, entries: any[], actor?: AcademicActor, complete=false, partial=false) {
    const seen=new Set<string>();
    for(const entry of entries.filter(row=>!row.archivedAt)){
      if(!Number.isSafeInteger(entry.weekNumber)||entry.weekNumber<1||entry.weekNumber>52||!Number.isSafeInteger(entry.lessonNumber)||entry.lessonNumber<1||entry.lessonNumber>50)throw new ValidationError('Scheme lessons need valid planning week and lesson numbers.');
      const position=`${entry.weekNumber}:${entry.lessonNumber}`;
      if(seen.has(position))throw new ValidationError('Each scheme week and lesson position can be allocated once.');seen.add(position);
      if(complete&&(!entry.strandTitle?.trim()||!entry.subStrandTitle?.trim()||!entry.specificLearningOutcomes?.some((value:string)=>value.trim())||!entry.learningExperiences?.some((value:string)=>value.trim())||!entry.assessmentMethods?.some((value:string)=>value.trim())))throw new ValidationError('Complete scheme outcomes, learning experiences and assessment methods before submitting.');
    }
    return entries;
  }
  // 1. Schemes of Work
  public async createSchemeOfWork(dto: CreateSchemeDTO, actor?: AcademicActor) {
    await this.authorize(dto,actor);
    await this.assertSchemeAllocationsEditable(dto);
    const validatedEntries=await this.validateEntries(dto,dto.entries || [],actor);
    if(actor?.role==='TEACHER') dto={...dto,teacherId:actor.userId};
    const formattedEntries: SchemeOfWorkEntry[] = validatedEntries.map(entry => ({
      ...entry,
      id: IdGenerator.generate()
    }));

    const scheme = SchemeOfWork.create(
      {
        teacherId: dto.teacherId,
        learningAreaId: dto.learningAreaId,
        classRoomId: dto.classRoomId,
        streamId: dto.streamId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        title: dto.title,
        entries: formattedEntries,
        status: SchemeStatus.DRAFT
      },
      IdGenerator.generate()
    );

    await this.schemeRepository.save(scheme);
    return scheme.toJSON();
  }

  public async assertSchemeAllocationsEditable(scope:TeachingScope & {planningState?:{locked:boolean}}){
    if(!this.planning)return;
    if(scope.planningState?.locked)throw new ValidationError('Plan Locked & Saved. Reopen the plan explicitly before changing allocations.');
    if(!scope.teacherId)return;
    const profile=await this.teacherRepository?.findByUserId(scope.teacherId)||await this.teacherRepository?.findById(scope.teacherId);
    const owners=[scope.teacherId,profile?.id,profile?.userId].filter(Boolean);
    const peers=await this.schemeRepository.findAll({classRoomId:scope.classRoomId,learningAreaId:scope.learningAreaId,academicYearId:scope.academicYearId});
    if(peers.some(s=>owners.includes(s.teacherId)&&(s.streamId||'')===(scope.streamId||'')&&sameTerm(s.termId,scope.termId||'')&&s.planningState?.locked))throw new ValidationError('Plan Locked & Saved. Reopen the existing whole-term plan before changing this learning area’s allocations.');
  }

  public async addEntryToScheme(schemeId: string, entry: Omit<SchemeOfWorkEntry, 'id'>, actor?: AcademicActor) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);
    await this.authorize(scheme.toJSON(),actor);
    await this.assertSchemeAllocationsEditable(scheme.toJSON());

    let fullEntry: SchemeOfWorkEntry = {
      ...entry,
      id: IdGenerator.generate()
    };

    const checked=await this.validateEntries(scheme.toJSON(),[...scheme.entries,fullEntry],actor);
    fullEntry=checked[checked.length-1];
    scheme.addEntry(fullEntry);
    await this.schemeRepository.update(scheme);
    return scheme.toJSON();
  }

  public async updateSchemeEntry(id:string,entryId:string,changes:Partial<SchemeOfWorkEntry>,actor?:AcademicActor){
    const scheme=await this.schemeRepository.findById(id);if(!scheme)throw new NotFoundError('Scheme',id);
    await this.authorize(scheme.toJSON(),actor);
    await this.assertSchemeAllocationsEditable(scheme.toJSON());
    if(!scheme.entries.some(e=>e.id===entryId))throw new NotFoundError('Scheme entry',entryId);
    const original=scheme.entries.find(e=>e.id===entryId)!;
    if(scheme.planningState?.approvedEntryIds?.includes(entryId))throw new ValidationError('This scheme lesson is already approved. Retain its approved content.');
    const edited={...original,...changes,id:entryId,scheduledDate:undefined,scheduledStartTime:undefined,scheduledEndTime:undefined};
    if(scheme.entries.some(e=>!e.archivedAt && e.id!==entryId && ((e.weekNumber===edited.weekNumber&&e.lessonNumber===edited.lessonNumber)||(Boolean(edited.slotId)&&e.slotId===edited.slotId))))throw new ValidationError('This scheme lesson position is already filled.');
    const [checked]=await this.validateEntries(scheme.toJSON(),[edited],actor);
    scheme.updateEntry(entryId,checked);await this.schemeRepository.update(scheme);return scheme.toJSON();
  }
  public async archiveCancelledEntry(id:string,entryId:string,actor?:AcademicActor){
    const scheme=await this.schemeRepository.findById(id);if(!scheme)throw new NotFoundError('Scheme',id);
    await this.authorize(scheme.toJSON(),actor);
    await this.assertSchemeAllocationsEditable(scheme.toJSON());
    const entry=scheme.entries.find(e=>e.id===entryId);if(!entry)throw new NotFoundError('Scheme entry',entryId);
    if(scheme.planningState?.approvedEntryIds?.includes(entryId)||scheme.status===SchemeStatus.APPROVED)throw new ValidationError('Approved scheme lessons must be retained.');
    const plans=await this.lessonPlanRepository.findAll({classRoomId:scheme.classRoomId});
    const records=this.records?await this.records.find({schoolId:actor?.schoolId,classRoomId:scheme.classRoomId}):[];
    if(plans.some(plan=>plan.toJSON().schemeOfWorkEntryId===entryId)||records.some(record=>record.toJSON().planningLink?.schemeEntryId===entryId))throw new ValidationError('A scheme lesson linked to a lesson plan or Record of Work must be retained.');
    scheme.updateEntry(entryId,{...entry,archivedAt:new Date().toISOString(),archivedReason:'Draft scheme lesson removed from the planning grid; history retained.'});
    await this.schemeRepository.update(scheme);return scheme.toJSON();
  }
  public async submitSchemeForReview(schemeId: string, actor?: AcademicActor) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);
    await this.authorize(scheme.toJSON(),actor);
    if (!canPrepareCurriculum(actor?.role)) throw new ForbiddenError('Only the assigned subject teacher or a school administrator can submit a scheme for review.');
    if (![SchemeStatus.DRAFT, SchemeStatus.REJECTED].includes(scheme.status)) throw new ValidationError('Only a draft or returned scheme can be submitted.');

    if (scheme.entries.length === 0) {
      throw new ValidationError(scheme.planningState
        ? 'This term draft has saved allocations but no scheduled lesson entries yet. Complete and finalize the term scheme before submitting it for review.'
        : 'Cannot submit an empty scheme of work. Add lesson entries first.');
    }

    const state=scheme.planningState;
    const selected=state?.weeklyPlanningStarted?selectWeeklySubmission(state,scheme.entries):scheme.entries;
    if(state&&(state.weeklyPlanningStarted||state.coverageReviewStatus))assertWeeklyCoverage(state,[...scheme.entries.filter(entry=>state.approvedEntryIds?.includes(entry.id)),...selected]);
    await this.validateEntries(scheme.toJSON(),selected,actor,true,Boolean(state?.weeklyPlanningStarted));
    if(state?.weeklyPlanningStarted)scheme.setPlanningState({...state,revision:state.revision+1,locked:true,submittedEntryIds:selected.map(entry=>entry.id),approvedEntryIds:state.approvedEntryIds||[],history:[...state.history,{at:new Date().toISOString(),actorId:actor!.userId,action:'FINALIZED',allocations:structuredClone(state.allocations),scheduleFingerprint:state.scheduleFingerprint}]});
    scheme.submit();
    if(state?.weeklyPlanningStarted&&this.schemeRepository.savePlanning)await this.schemeRepository.savePlanning(scheme,state.revision);
    else await this.schemeRepository.update(scheme);
    return scheme.toJSON();
  }

  public async reviewScheme(schemeId: string, reviewerUserId: string, approved: boolean, remarks: string, actor?: AcademicActor) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);
    if (!actor || !['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER'].includes(actor.role)) throw new ForbiddenError('Only school leadership can review schemes of work.');
    await this.authorize(scheme.toJSON(),actor);

    if (scheme.status !== SchemeStatus.SUBMITTED) throw new ValidationError('Only submitted schemes can be reviewed.');

    const state=scheme.planningState;
    const selected=weeklyReviewEntries(state,scheme.entries);
    if (approved && state && (state.weeklyPlanningStarted || state.coverageReviewStatus)) assertWeeklyCoverage(state,[...scheme.entries.filter(entry=>state.approvedEntryIds?.includes(entry.id)&&!selected.some(row=>row.id===entry.id)),...selected]);
    if (approved) await this.validateEntries(scheme.toJSON(),selected,actor,true,Boolean(state?.submittedEntryIds));
    if(state?.submittedEntryIds)scheme.setPlanningState({...state,revision:state.revision+1,approvedEntryIds:approved?[...new Set([...(state.approvedEntryIds||[]),...selected.map(entry=>entry.id)])]:state.approvedEntryIds||[]});
    if (approved) {
      scheme.approve(reviewerUserId, remarks);
    } else {
      scheme.reject(reviewerUserId, remarks);
    }

    if(state?.submittedEntryIds&&this.schemeRepository.savePlanning)await this.schemeRepository.savePlanning(scheme,state.revision);
    else await this.schemeRepository.update(scheme);
    return scheme.toJSON();
  }

  public async getSchemeById(schemeId: string, actor?: AcademicActor) {
    const scheme = await this.schemeRepository.findById(schemeId);
    if (!scheme) throw new NotFoundError('Scheme of Work', schemeId);
    await this.authorize(scheme.toJSON(),actor);
    return scheme.toJSON();
  }

  public async listSchemes(filters: SchemeFilterCriteria = {}, actor?: AcademicActor) {
    if(actor?.role==='TEACHER' && filters.teacherId){const profile=await this.teacherRepository?.findByUserId(actor.userId);if(![actor.userId,profile?.id].includes(filters.teacherId))throw new ForbiddenError('Cannot request another teacher’s private work.');filters={...filters,teacherId:undefined};}
    const schemes = await this.schemeRepository.findAll(filters);
    const result=[];
    for(const scheme of schemes){const row=scheme.toJSON();
      if(filters.classRoomId && row.classRoomId!==filters.classRoomId || filters.learningAreaId && row.learningAreaId!==filters.learningAreaId || filters.teacherId && row.teacherId!==filters.teacherId || filters.academicYearId && row.academicYearId!==filters.academicYearId || filters.termId && !sameTerm(row.termId,filters.termId))continue;
      if(actor?.role==='TEACHER'&&!row.teacherId)continue;
      if(this.access && (!actor || !await this.access.can(actor,row,true)))continue;
      if(actor&&this.planning){try{await this.planning.assertUnlocked(actor,row);}catch(e:any){result.push({...row,entries:[],locked:true,lockReason:e.message});continue;}}
      result.push(row);
    }
    return result;
  }

  // 2. Lesson Plans
  public async createLessonPlan(dto: CreateLessonPlanDTO, actor?: AcademicActor) {
    const scheme=(await this.schemeRepository.findAll()).find(s=>s.entries.some(e=>e.id===dto.schemeOfWorkEntryId));
    if(this.planning && !scheme)throw new ValidationError('Create lesson plans from an eligible scheme entry.');
    if(this.planning && scheme && (scheme.planningState?.approvedEntryIds ? !scheme.planningState.approvedEntryIds.includes(dto.schemeOfWorkEntryId!) : scheme.status!==SchemeStatus.APPROVED))throw new ValidationError('School leadership must approve the scheme of work lesson before lesson plans can be prepared.');
    const scope={...dto,academicYearId:scheme?.academicYearId,termId:scheme?.termId};
    await this.authorize(scope,actor);
    if(scheme && actor && this.planning){
      await this.authorize(scheme.toJSON(),actor);
      if(scheme.classRoomId!==dto.classRoomId || scheme.learningAreaId!==dto.learningAreaId || (scheme.streamId || '')!==(dto.streamId || ''))throw new ValidationError('Lesson and scheme scope must match.');
      const entry=scheme.entries.find(e=>e.id===dto.schemeOfWorkEntryId)!;
      const scheduled=await this.planning.lessonSuggestions(actor,scope);
      const {term}=await this.planning.access.context(actor,scope);
      const selectedDate=new Date(`${dto.lessonDate}T00:00:00Z`);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(dto.lessonDate)||!Number.isFinite(selectedDate.getTime())||selectedDate.toISOString().slice(0,10)!==dto.lessonDate||dto.lessonDate<term.startDate||dto.lessonDate>term.endDate)throw new ValidationError('Choose a valid lesson date within the selected academic term.');
      const time=dto.lessonTime?.trim().replace(/[–—]/g,'-');
      if(time&&!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new ValidationError('Enter lesson time as HH:MM-HH:MM.');
      if(time&&time.slice(0,5)>=time.slice(6))throw new ValidationError('Lesson end time must be after its start time.');
      const slot=scheduled.slots.find(slot=>slot.date===dto.lessonDate&&time===`${slot.startTime}-${slot.endTime}`);
      if(dto.strand.trim()!==entry.strandTitle.trim()||dto.subStrand.trim()!==entry.subStrandTitle.trim())throw new ValidationError('Lesson strand and sub-strand must match the schemed slot.');
      if(dto.specificLearningOutcomes.some(outcome=>!entry.specificLearningOutcomes.includes(outcome)))throw new ValidationError('Use outcomes from the approved scheme lesson. Submit curriculum changes through the scheme review process.');
      if(entry.archivedAt)throw new ValidationError('This scheme entry is archived. Select an eligible slot.');
      const anchor=new Date(`${term.startDate}T00:00:00Z`);anchor.setUTCDate(anchor.getUTCDate()-((anchor.getUTCDay()+6)%7));
      dto={...dto,lessonTime:time||undefined,weekNumber:slot?.weekNumber||Math.floor((selectedDate.getTime()-anchor.getTime())/604800000)+1,lessonNumber:slot?.lessonNumber||dto.lessonNumber||entry.lessonNumber};
    }
    const duration=dto.durationMinutes??dto.steps?.reduce((sum,step)=>sum+step.durationMinutes,0);
    if(!Number.isSafeInteger(duration)||(duration ?? 0)<=0||!dto.steps?.length||dto.steps.some(step=>!Number.isSafeInteger(step.durationMinutes)||step.durationMinutes<=0||!step.teacherActivities?.trim()||!step.learnerActivities?.trim())||dto.steps.reduce((sum,step)=>sum+step.durationMinutes,0)!==duration)throw new ValidationError('Complete each lesson stage and ensure stage times add up to the chosen lesson duration.');
    dto={...dto,durationMinutes:duration};
    if(actor?.role==='TEACHER')dto={...dto,teacherId:actor.userId};
    else if (hasAdministrativeAccess(actor?.role) && scheme?.teacherId) dto={...dto,teacherId:scheme.teacherId};
    const lessonPlan = LessonPlan.create(
      {
        teacherId: dto.teacherId,
        schemeOfWorkEntryId: dto.schemeOfWorkEntryId,
        learningAreaId: dto.learningAreaId,
        classRoomId: dto.classRoomId,
        streamId: dto.streamId,
        weekNumber: dto.weekNumber,
        lessonNumber: dto.lessonNumber,
        lessonTime: dto.lessonTime,
        pcis: dto.pcis,
        otherLearningAreas: dto.otherLearningAreas,
        communityServiceActivities: dto.communityServiceActivities,
        nonFormalActivity: dto.nonFormalActivity,
        assessmentRubric: dto.assessmentRubric,

        lessonDate: dto.lessonDate,
        durationMinutes: dto.durationMinutes || 40,
        rollBoys: dto.rollBoys,
        rollGirls: dto.rollGirls,
        strand: dto.strand,
        subStrand: dto.subStrand,
        status: LessonPlanStatus.DRAFT,
        specificLearningOutcomes: dto.specificLearningOutcomes,
        keyInquiryQuestions: dto.keyInquiryQuestions,
        coreCompetenciesAddressed: dto.coreCompetenciesAddressed,
        valuesAddressed: dto.valuesAddressed,
        learningExperiences: dto.learningExperiences ?? scheme?.entries.find(e => e.id === dto.schemeOfWorkEntryId)?.learningExperiences ?? [],
        assessmentMethods: dto.assessmentMethods ?? scheme?.entries.find(e => e.id === dto.schemeOfWorkEntryId)?.assessmentMethods ?? [],
        learningResources: dto.learningResources,
        steps: dto.steps,
        extendedActivity: dto.extendedActivity,
        // Post-class reflection is saved separately when the lesson has been taught.
        teacherSelfReflection: undefined
      },
      IdGenerator.generate()
    );

    await this.lessonPlanRepository.save(lessonPlan);
    return lessonPlan.toJSON();
  }

  public async updateLessonPlanReflection(lessonPlanId: string, reflection: string, actor?: AcademicActor) {
    const lessonPlan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!lessonPlan) throw new NotFoundError('Lesson Plan', lessonPlanId);
    await this.authorize(await this.planScope(lessonPlan),actor);
    // Lesson preparation and reflection need no separate administrative approval.

    lessonPlan.setReflection(reflection);
    await this.lessonPlanRepository.update(lessonPlan);
    return lessonPlan.toJSON();
  }

  public async getLessonPlanById(lessonPlanId: string, actor?: AcademicActor) {
    const plan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!plan) throw new NotFoundError('Lesson Plan', lessonPlanId);
    await this.authorize(await this.planScope(plan),actor);
    return plan.toJSON();
  }

  public async submitLessonPlanForReview(lessonPlanId: string, actor?: AcademicActor) {
    const plan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!plan) throw new NotFoundError('Lesson Plan', lessonPlanId);
    await this.authorize(await this.planScope(plan), actor);
    if (!canPrepareCurriculum(actor?.role)) throw new ForbiddenError('Only the assigned teacher or a school administrator can submit this lesson plan for review.');
    if (![LessonPlanStatus.DRAFT, LessonPlanStatus.REJECTED, LessonPlanStatus.RECORDED].includes(plan.status)) {
      throw new ValidationError('Only a draft or returned lesson plan can be submitted.');
    }
    plan.submit();
    await this.lessonPlanRepository.update(plan);
    return plan.toJSON();
  }

  public async reviewLessonPlan(lessonPlanId: string, reviewerUserId: string, approved: boolean, remarks: string, actor?: AcademicActor) {
    const plan = await this.lessonPlanRepository.findById(lessonPlanId);
    if (!plan) throw new NotFoundError('Lesson Plan', lessonPlanId);
    const reviewerRoles = ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER'];
    if (!actor || !reviewerRoles.includes(actor.role)) throw new ForbiddenError('Only school leadership can review lesson plans.');
    await this.authorize(await this.planScope(plan), actor);
    if (plan.status !== LessonPlanStatus.SUBMITTED) throw new ValidationError('Only submitted lesson plans can be reviewed.');
    if (approved) {
      const p = plan.toJSON();
      const complete = Boolean(p.strand?.trim() && p.subStrand?.trim()
        && p.specificLearningOutcomes?.some(x => x.trim())
        && p.steps?.length
        && p.steps.every(step => step.teacherActivities?.trim() && step.learnerActivities?.trim() && step.durationMinutes > 0)
        && p.steps.reduce((sum, step) => sum + step.durationMinutes, 0) === p.durationMinutes);
      if (!complete) throw new ValidationError('Complete the lesson outcomes and every teaching step before approval.');
      plan.approve(reviewerUserId, remarks);
    } else {
      if (!remarks?.trim()) throw new ValidationError('Add comments explaining what the teacher should revise.');
      plan.reject(reviewerUserId, remarks.trim());
    }
    await this.lessonPlanRepository.update(plan);
    return plan.toJSON();
  }

  public async rescheduleLessonPlan(id:string,actor?:AcademicActor){
    const original=await this.lessonPlanRepository.findById(id);if(!original)throw new NotFoundError('Lesson Plan',id);
    const scope=await this.planScope(original);await this.authorize(scope,actor);
    const scheme=(await this.schemeRepository.findAll()).find(s=>s.entries.some(e=>e.id===original.toJSON().schemeOfWorkEntryId));
    if(!scheme || !actor || !this.planning)throw new ValidationError('A linked scheme and published calendar are required.');
    const entry=scheme.entries.find(e=>e.id===original.toJSON().schemeOfWorkEntryId)!;
    const slot=(await this.planning.lessonSuggestions(actor,scheme.toJSON())).slots.find(s=>s.id===entry.slotId||(s.weekNumber===entry.weekNumber&&s.lessonNumber===entry.lessonNumber));
    // Create a copy: taught records continue to reference the original lesson and its date.
    const props={...original.toJSON(),lessonDate:slot?.date||original.toJSON().lessonDate,lessonTime:slot?`${slot.startTime}-${slot.endTime}`:original.toJSON().lessonTime,weekNumber:slot?.weekNumber||original.toJSON().weekNumber,lessonNumber:slot?.lessonNumber||original.toJSON().lessonNumber,status:LessonPlanStatus.DRAFT,submittedAt:undefined,reviewedByUserId:undefined,reviewedAt:undefined,reviewRemarks:undefined};
    const copy=LessonPlan.create(props,IdGenerator.generate());await this.lessonPlanRepository.save(copy);return copy.toJSON();
  }
  public async listLessonPlans(filters: LessonPlanFilterCriteria = {}, actor?: AcademicActor) {
    if(actor?.role==='TEACHER' && filters.teacherId){const profile=await this.teacherRepository?.findByUserId(actor.userId);if(![actor.userId,profile?.id].includes(filters.teacherId))throw new ForbiddenError('Cannot request another teacher’s private work.');filters={...filters,teacherId:undefined};}
    const plans=await this.lessonPlanRepository.findAll(filters);const result=[];
    const sources=await this.schemeRepository.findAll();
    const profile=actor?.role==='TEACHER'?await this.teacherRepository?.findByUserId(actor.userId):undefined;
    for(const plan of plans){const raw=plan.toJSON();
      if(filters.classRoomId&&raw.classRoomId!==filters.classRoomId || filters.streamId&&raw.streamId!==filters.streamId || filters.learningAreaId&&raw.learningAreaId!==filters.learningAreaId)continue;
      if(actor?.role==='TEACHER'&&![actor.userId,profile?.id].includes(raw.teacherId))continue;
      const source=sources.find(s=>s.entries.some(e=>e.id===raw.schemeOfWorkEntryId));
      const row={...raw,academicYearId:source?.academicYearId || '__unverified__',termId:source?.termId || '__unverified__'};
      if(filters.classRoomId && row.classRoomId!==filters.classRoomId || filters.streamId && row.streamId!==filters.streamId || filters.learningAreaId && row.learningAreaId!==filters.learningAreaId || filters.teacherId && row.teacherId!==filters.teacherId)continue;
      if(actor?.role==='TEACHER'&&!row.teacherId)continue;
      if(this.access && (!actor || !await this.access.can(actor,row,true)))continue;
      if(actor&&this.planning){try{await this.planning.assertUnlocked(actor,row);}catch{continue;}}
      result.push(row);
    }return result;
  }

  public async deleteScheme(id: string, requestingUser?: AcademicActor): Promise<void> {
    const scheme = await this.schemeRepository.findById(id);
    if (!scheme) throw new NotFoundError('Scheme of Work', id);
    await this.authorize(scheme.toJSON(),requestingUser,false);
    if (!hasAdministrativeAccess(requestingUser?.role)) await this.assertSchemeAllocationsEditable(scheme.toJSON());
    const entries = new Set(scheme.entries.map(entry => entry.id));
    const plans = await this.lessonPlanRepository.findAll({classRoomId: scheme.classRoomId});
    const records = this.records ? await this.records.find({schoolId: requestingUser?.schoolId, classRoomId: scheme.classRoomId}) : [];
    if (plans.some(plan => entries.has(plan.toJSON().schemeOfWorkEntryId || '')) ||
        records.some(record => record.toJSON().planningLink?.schemeId === id)) {
      throw new ValidationError('Delete linked Records of Work and lesson plans before deleting this syllabus coverage and scheme.');
    }
    if (requestingUser?.role === 'TEACHER') {
      let isOwner = scheme.teacherId === requestingUser.userId;
      if (!isOwner && this.teacherRepository) {
        const teacherProfile = await this.teacherRepository.findByUserId(requestingUser.userId);
        if (teacherProfile && scheme.teacherId === teacherProfile.id) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('You can only delete your own schemes of work.');
      }
    }
    await this.schemeRepository.delete(id);
  }

  public async deleteLessonPlan(id: string, requestingUser?: AcademicActor): Promise<void> {
    const plan = await this.lessonPlanRepository.findById(id);
    if (!plan) throw new NotFoundError('Lesson Plan', id);
    await this.authorize(await this.planScope(plan),requestingUser,false);
    const records = this.records ? await this.records.find({schoolId: requestingUser?.schoolId, classRoomId: plan.toJSON().classRoomId}) : [];
    if (records.some(record => record.toJSON().planningLink?.lessonPlanId === id)) {
      throw new ValidationError('Delete linked Records of Work before deleting this lesson plan.');
    }
    if (requestingUser?.role === 'TEACHER') {
      let isOwner = plan.teacherId === requestingUser.userId;
      if (!isOwner && this.teacherRepository) {
        const teacherProfile = await this.teacherRepository.findByUserId(requestingUser.userId);
        if (teacherProfile && plan.teacherId === teacherProfile.id) {
          isOwner = true;
        }
      }
      if (!isOwner) {
        throw new ForbiddenError('You can only delete your own lesson plans.');
      }
    }
    await this.lessonPlanRepository.delete(id);
  }
}
