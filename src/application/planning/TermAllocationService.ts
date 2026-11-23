import {SchemePacing} from './CalendarPlanningService';
import { canPrepareCurriculum } from '../shared/AdministrativeAccess';
import {weeklyMonitoringRegister} from './WeeklyMonitoringRegister';
import { assertWeeklyCoverage, selectWeeklySubmission } from './WeeklySchemePolicy';
import type { AppContainer } from '../../infrastructure/container';
import { AcademicActor, TeachingScope, sameTerm } from '../shared/TeacherAssignmentAccess';
import { SchemeOfWork, SchemeOfWorkEntry, SchemePlanningState, TermAllocation } from '../../core/domain/curriculum-plan/SchemeOfWork';
import { ConflictError, NotFoundError, ValidationError, ForbiddenError, IdGenerator } from '../../core/domain/shared/Errors';

/** Whole-term allocations and saved-plan locking. Sequence authorization remains separate. */
export class TermAllocationService {
  constructor(private c: AppContainer) {}

  async catalogue(actor:AcademicActor, scope:TeachingScope) {
    await this.c.assignmentAccess.assert(actor,scope);
    await this.c.calendarPlanning.assertUnlocked(actor,scope);
    const classroom=await this.c.academicRepository.findClassById(scope.classRoomId!);
    const strands=await this.c.CBCAssessmentRepository.findStrandsByLearningArea(scope.learningAreaId!,classroom!.gradeLevel);
    const result=[];
    for(const strand of strands.filter(s=>s.learningAreaId===scope.learningAreaId&&(!s.gradeLevel||s.gradeLevel===classroom!.gradeLevel)))result.push({...strand.toJSON(),subStrands:(await this.c.CBCAssessmentRepository.findSubStrandsByStrand(strand.id)).filter(s=>s.strandId===strand.id).map(s=>s.toJSON())});
    return result;
  }

  async get(actor:AcademicActor,id:string) {
    await this.c.curriculumUseCases.getSchemeById(id,actor); // assignment, ownership and sequence
    const scheme=await this.c.schemeOfWorkRepository.findById(id);
    if(!scheme)throw new NotFoundError('Scheme',id);
    return scheme;
  }

  async find(actor:AcademicActor,scope:TeachingScope) {
    const rows=await this.c.curriculumUseCases.listSchemes({classRoomId:scope.classRoomId,learningAreaId:scope.learningAreaId,academicYearId:scope.academicYearId,termId:scope.termId},actor);
    return rows.sort((a,b)=>Number(Boolean(b.planningState))-Number(Boolean(a.planningState))||new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()).find(s=>(s.streamId||'')===(scope.streamId||''));
  }

  private revision(scheme:SchemeOfWork,expected:number) {
    if((scheme.planningState?.revision||0)!==expected)throw new ConflictError('Planning changed; reload before saving.');
  }

  private async persist(scheme:SchemeOfWork,expected:number,expectedEntries?:SchemeOfWorkEntry[]) {
    if(this.c.schemeOfWorkRepository.savePlanning)await this.c.schemeOfWorkRepository.savePlanning(scheme,expected,expectedEntries);
    else await this.c.schemeOfWorkRepository.update(scheme);
  }

  private async checkAllocations(actor:AcademicActor,scope:TeachingScope,allocations:TermAllocation[]) {
    const catalogue=await this.catalogue(actor,scope);
    const allowed=new Set(catalogue.flatMap(s=>s.subStrands.map(sub=>sub.id)));
    const seen=new Set<string>();
    for(const a of allocations){
      for(const id of [a.subStrandId,...(a.combinedSubStrandIds||[])]){if(!allowed.has(id))throw new ValidationError('A sub-strand is not part of this learning area’s curriculum.');if(seen.has(id))throw new ValidationError('A sub-strand cannot occur in two separate or combined allocations.');seen.add(id);}
      if(!Number.isSafeInteger(a.lessons)||a.lessons<0||a.lessons>10000)throw new ValidationError('Lesson allocations must be non-negative whole numbers.');
      if(a.slotIds&&a.slotIds.length!==a.lessons)throw new ValidationError('An explicit allocation must identify every allocated lesson slot.');
      seen.add(a.subStrandId);
    }
    return catalogue;
  }

  async saveDraft(actor:AcademicActor,scope:TeachingScope,allocations:TermAllocation[],revision:number,id?:string) {
    await this.c.assignmentAccess.assertSubjectTeaching(actor,scope);
    const canonical=await this.c.assignmentAccess.context(actor,scope);scope={...scope,academicYearId:canonical.year.id,termId:canonical.term.id};
    await this.c.calendarPlanning.assertUnlocked(actor,scope);
    let scheduled=await this.c.calendarPlanning.schemeSchedule(actor,scope);
    await this.checkAllocations(actor,scope,allocations);
    let scheme:SchemeOfWork;
    const existing=id?await this.get(actor,id):await this.find(actor,scope);
    if(existing){
      scheme=await this.get(actor,existing.id);
      if(scheme.classRoomId!==scope.classRoomId||(scheme.streamId||'')!==(scope.streamId||'')||scheme.learningAreaId!==scope.learningAreaId||scheme.academicYearId!==scope.academicYearId||!sameTerm(scheme.termId,scope.termId!))throw new ValidationError('The selected plan and allocation context must match.');
    }else{
      if(revision!==0)throw new ConflictError('Planning changed; reload before saving.');
      const created=await this.c.curriculumUseCases.createSchemeOfWork({...scope,teacherId:actor.userId,title:'Whole-term Scheme of Work',entries:[]} as any,actor);
      scheme=(await this.c.schemeOfWorkRepository.findById(created.id))!;
    }
    this.revision(scheme,revision);
    if(scheme.planningState?.locked)throw new ConflictError('Plan Locked & Saved. Reopen the plan before editing allocations.');
    if(['SUBMITTED','APPROVED'].includes(scheme.planningState?.coverageReviewStatus||''))throw new ConflictError('This coverage draft is with the reviewer or approved. Wait for it to be returned before editing.');
    await this.c.curriculumUseCases.assertSchemeAllocationsEditable(scheme.toJSON());
    const before=scheme.planningState;
    if(before?.pacing)scheduled=await this.c.calendarPlanning.schemeSchedule(actor,scope,before.pacing,scheme.entries);
    allocations=allocations.map(a=>({...a,carriedFrom:a.carriedFrom||before?.allocations.find(old=>old.subStrandId===a.subStrandId)?.carriedFrom}));
    const state:SchemePlanningState={pacing:before?.pacing,weeklyPlanningStarted:before?.weeklyPlanningStarted,revision:revision+1,locked:false,allocations,scheduleFingerprint:scheduled.fingerprint,history:[...(before?.history||[]),{at:new Date().toISOString(),actorId:actor.userId,action:'DRAFT_SAVED',allocations:structuredClone(allocations),scheduleFingerprint:scheduled.fingerprint}],approvedEntryIds:before?.approvedEntryIds,coverageReviewStatus:'DRAFT',coverageReviewRemarks:undefined,coverageReviewedByUserId:undefined,coverageReviewedAt:undefined};
    scheme.setPlanningState(state);scheme.draft();
    await this.persist(scheme,revision);
    return this.describe(actor,scheme);
  }

  async submitCoverage(actor:AcademicActor,id:string,revision:number) {
    const scheme=await this.get(actor,id);this.revision(scheme,revision);
    if(!canPrepareCurriculum(actor.role))throw new ForbiddenError('Only the assigned subject teacher or a school administrator can submit a coverage draft.');
    await this.c.assignmentAccess.assertSubjectTeaching(actor,scheme.toJSON());
    const state=scheme.planningState;if(!state||!state.allocations.some(a=>a.lessons>0))throw new ValidationError('Save at least one strand allocation before submitting this coverage draft.');
    if(state.locked||['SUBMITTED','APPROVED'].includes(state.coverageReviewStatus||''))throw new ConflictError('This coverage draft cannot be submitted in its current state.');
    scheme.setPlanningState({...state,revision:revision+1,coverageReviewStatus:'SUBMITTED',coverageReviewRemarks:undefined,coverageReviewedByUserId:undefined,coverageReviewedAt:undefined});
    await this.persist(scheme,revision);return this.describe(actor,scheme);
  }

  async reviewCoverage(actor:AcademicActor,id:string,revision:number,approved:boolean,remarks:string) {
    const scheme=await this.get(actor,id);this.revision(scheme,revision);
    if(!['SUPER_ADMIN','ADMIN','SCHOOL_ADMIN','HEAD_TEACHER','DEPUTY_HEAD_TEACHER'].includes(actor.role))throw new ForbiddenError('Only school leadership can review a coverage draft.');
    const state=scheme.planningState;if(!state||state.coverageReviewStatus!=='SUBMITTED')throw new ValidationError('Only submitted coverage drafts can be reviewed.');
    if(!approved&&!remarks.trim())throw new ValidationError('Add comments explaining what the teacher should change.');
    scheme.setPlanningState({...state,revision:revision+1,coverageReviewStatus:approved?'APPROVED':'REJECTED',coverageReviewRemarks:remarks.trim(),coverageReviewedByUserId:actor.userId,coverageReviewedAt:new Date().toISOString()});
    await this.persist(scheme,revision);return this.describe(actor,scheme);
  }

  async describe(actor:AcademicActor,scheme:SchemeOfWork,pacing?:SchemePacing) {
    const catalogue=await this.catalogue(actor,scheme.toJSON());
    const schedule=await this.c.calendarPlanning.schemeSchedule(actor,scheme.toJSON(),pacing||scheme.planningState?.pacing,scheme.entries);
    const state=scheme.planningState;
    const allocations=state?.allocations||[];
    const included=new Set(allocations.filter(a=>a.lessons>0).flatMap(a=>[a.subStrandId,...(a.combinedSubStrandIds||[])]));
    const allocated=allocations.reduce((n,a)=>n+a.lessons,0);
    const validation=this.c.calendarPlanning.validate(scheme.entries,schedule.slots,true);
    return {scheme:scheme.toJSON(),catalogue,...schedule,validation,
      progress:{includedStrands:catalogue.filter(s=>s.subStrands.some(sub=>included.has(sub.id))).length,availableStrands:catalogue.length,includedSubStrands:included.size,availableSubStrands:catalogue.reduce((n,s)=>n+s.subStrands.length,0),allocatedLessons:allocated,availableSlots:schedule.slots.length,remaining:Math.max(0,schedule.slots.length-allocated),excess:Math.max(0,allocated-schedule.slots.length)},
      savedPlanLocked:state?.locked||false,scheduleChanged:Boolean(state&&state.scheduleFingerprint!==schedule.fingerprint)};
  }

  async finalize(actor:AcademicActor,id:string,revision:number) {
    return this.scheduleEntries(actor,id,revision,true);
  }

  async prepareWeekly(actor:AcademicActor,id:string,revision:number) {
    if(!canPrepareCurriculum(actor.role))throw new ForbiddenError('Only the assigned subject teacher or a school administrator can create a weekly scheme.');
    const scheme=await this.get(actor,id);this.revision(scheme,revision);
    await this.c.assignmentAccess.assertSubjectTeaching(actor,scheme.toJSON());
    if(!scheme.planningState?.allocations.some(allocation=>allocation.lessons>0))throw new ValidationError('Save at least one syllabus coverage allocation before creating a weekly draft.');
    if(scheme.planningState?.weeklyPlanningStarted)return this.describe(actor,scheme);
    if(scheme.entries.some(e=>!e.archivedAt)){
      const plans=await this.c.lessonPlanRepository.findAll({classRoomId:scheme.classRoomId,learningAreaId:scheme.learningAreaId,streamId:scheme.streamId});
      if(plans.some(plan=>scheme.entries.some(entry=>!entry.archivedAt&&entry.id===plan.toJSON().schemeOfWorkEntryId)))throw new ConflictError('This scheme has linked lesson plans. Retain its approved lessons and use the revision workflow.');
    }
    return this.scheduleEntries(actor,id,revision,false);
  }

  private async scheduleEntries(actor:AcademicActor,id:string,revision:number,submit:boolean) {
    const scheme=await this.get(actor,id);this.revision(scheme,revision);
    await this.c.assignmentAccess.assertSubjectTeaching(actor,scheme.toJSON());
    const state=scheme.planningState;
    if(!state)throw new ValidationError('Save term allocations first.');
    if(submit&&state.coverageReviewStatus!=='APPROVED')throw new ValidationError('Submit the coverage draft and wait for school leadership approval before generating the scheme of work.');
    if(state.locked)throw new ConflictError('Plan is already locked.');
    if(state.approvedEntryIds?.length)throw new ConflictError('Approved scheme lessons must be retained. Continue planning the remaining draft lessons.');
    await this.c.curriculumUseCases.assertSchemeAllocationsEditable(scheme.toJSON());
    const catalogue=await this.checkAllocations(actor,scheme.toJSON(),state.allocations);
    const scheduled=await this.c.calendarPlanning.schemeSchedule(actor,scheme.toJSON(),scheme.planningState?.pacing,scheme.entries);

    const used=new Set<string>();
    // Explicit reservations are checked before automatic placement. Matching counts alone cannot finalize.
    for(const a of state.allocations)for(const slotId of a.slotIds||[]){
      if(!scheduled.slots.some(s=>s.id===slotId)||used.has(slotId))throw new ValidationError('Duplicate or cancelled lesson slot. Resolve the allocation before locking.');
      used.add(slotId);
    }
    const free=scheduled.slots.filter(s=>!used.has(s.id));let next=0;
    const entries:SchemeOfWorkEntry[]=[];
    const allSub=catalogue.flatMap(s=>s.subStrands.map(sub=>({strand:s,sub})));
    for(const allocation of state.allocations){
      const item=allSub.find(x=>x.sub.id===allocation.subStrandId)!;
      const combined=[item,...(allocation.combinedSubStrandIds||[]).map(id=>allSub.find(x=>x.sub.id===id)!)];
      for(let i=0;i<allocation.lessons&&entries.length<scheduled.slots.length;i++){
        const slot=allocation.slotIds?scheduled.slots.find(s=>s.id===allocation.slotIds![i])!:free[next++];
        if(!slot)break; // Keep additional pacing estimates in planning state; only positions in the chosen scheme grid become planned lessons.
        const old=scheme.entries.find(e=>!e.archivedAt&&e.slotId===slot.id&&e.subStrandId===item.sub.id&&JSON.stringify([...(e.combinedSubStrandIds||[])].sort())===JSON.stringify([...(allocation.combinedSubStrandIds||[])].sort()));
        // Reuse the same entry only if it still represents the same curriculum and slot.
        entries.push({...old,id:old?.id||IdGenerator.generate(),slotId:slot.id,weekNumber:slot.weekNumber,lessonNumber:slot.lessonNumber,scheduledDate:slot.date,scheduledStartTime:slot.startTime,scheduledEndTime:slot.endTime,strandId:item.strand.id,strandTitle:[...new Set(combined.map(x=>x.strand.title))].join(' + '),subStrandId:item.sub.id,combinedSubStrandIds:allocation.combinedSubStrandIds,subStrandTitle:combined.map(x=>x.sub.title).join(' + '),specificLearningOutcomes:allocation.specificLearningOutcomes||old?.specificLearningOutcomes||combined.flatMap(x=>x.sub.specificLearningOutcomes),keyInquiryQuestions:allocation.keyInquiryQuestions||old?.keyInquiryQuestions||[],learningExperiences:allocation.learningExperiences||old?.learningExperiences||combined.flatMap(x=>x.sub.suggestedExperiences||[]),learningResources:allocation.learningResources||old?.learningResources||[],assessmentMethods:allocation.assessmentMethods||old?.assessmentMethods||[]});
      }
    }
    const validation=this.c.calendarPlanning.validate(entries,scheduled.slots,true);
    if(submit&&validation.conflicts.length)throw new ValidationError('Complete scheme outcomes, learning experiences and assessment methods before submitting.',validation);
    // Keep replaced entries and all their taught/lesson links as archived history.
    const retained=scheme.entries.filter(e=>!entries.some(n=>n.id===e.id)).map(e=>e.archivedAt?e:{...e,archivedAt:new Date().toISOString(),archivedReason:'Replaced after explicit allocation edit; historical teaching links retained.'});
    const originalEntries=structuredClone(scheme.entries);
    const newState:SchemePlanningState={...state,pacing:scheduled.pacing||state.pacing,revision:revision+1,locked:submit,weeklyPlanningStarted:true,scheduleFingerprint:scheduled.fingerprint,history:[...state.history,{at:new Date().toISOString(),actorId:actor.userId,action:submit?'FINALIZED':'WEEKLY_DRAFT_CREATED',allocations:structuredClone(state.allocations),scheduleFingerprint:scheduled.fingerprint}]};
    scheme.setPlanningState(newState,[...entries,...retained]);if(submit)scheme.submit();else scheme.draft();
    await this.persist(scheme,revision,originalEntries);return this.describe(actor,scheme);
  }

  private async editableWeekly(actor:AcademicActor,id:string,revision:number,requireApproval=true) {
    const scheme=await this.get(actor,id);this.revision(scheme,revision);
    if(!canPrepareCurriculum(actor.role))throw new ForbiddenError('Only the assigned subject teacher or a school administrator can edit or submit the weekly scheme.');
    await this.c.assignmentAccess.assertSubjectTeaching(actor,scheme.toJSON());
    if(!scheme.planningState)throw new ValidationError('Save the syllabus coverage before weekly planning.');
    if(requireApproval&&scheme.planningState.coverageReviewStatus!=='APPROVED')throw new ValidationError('The syllabus coverage must be approved before submitting scheme lessons.');
    if(!['DRAFT','REJECTED'].includes(scheme.status)&&!(scheme.status==='APPROVED'&&scheme.planningState?.approvedEntryIds))throw new ConflictError('Only draft, returned or remaining unapproved weekly lessons can be edited.');
    await this.c.calendarPlanning.assertUnlocked(actor,scheme.toJSON());
    return scheme;
  }

  async saveWeeklyLesson(actor:AcademicActor,id:string,entryId:string,revision:number,content:Pick<SchemeOfWorkEntry,'specificLearningOutcomes'|'keyInquiryQuestions'|'learningExperiences'|'learningResources'|'assessmentMethods'>) {
    const scheme=await this.editableWeekly(actor,id,revision,false);
    const entry=scheme.entries.find(e=>e.id===entryId&&!e.archivedAt);
    if(!entry)throw new NotFoundError('Weekly scheme lesson',entryId);
    if(scheme.planningState?.approvedEntryIds?.includes(entryId))throw new ConflictError('This scheme lesson is already approved. Its approved content must be retained.');
    const schedule=await this.c.calendarPlanning.schemeSchedule(actor,scheme.toJSON(),scheme.planningState?.pacing,scheme.entries);
    if(!schedule.slots.some(slot=>slot.id===entry.slotId))throw new ConflictError('This lesson slot has been cancelled. Review rescheduling first.');
    const plans=await this.c.lessonPlanRepository.findAll({classRoomId:scheme.classRoomId,learningAreaId:scheme.learningAreaId,streamId:scheme.streamId});
    if(plans.some(plan=>plan.toJSON().schemeOfWorkEntryId===entryId))throw new ConflictError('This lesson already has a lesson plan. Retain its approved scheme content and use the revision workflow.');
    const originalEntries=structuredClone(scheme.entries);
    const fields=['specificLearningOutcomes','keyInquiryQuestions','learningExperiences','learningResources','assessmentMethods'] as const;
    const changes=Object.fromEntries(fields.map(key=>[key,content[key].map(text=>text.trim()).filter(Boolean)]));
    const entries=scheme.entries.map(row=>row.id===entryId?{...row,...changes}:row);
    const state=scheme.planningState!;
    scheme.setPlanningState({...state,revision:revision+1,locked:false,weeklyPlanningStarted:true,submittedEntryIds:undefined,history:[...state.history,{at:new Date().toISOString(),actorId:actor.userId,action:'WEEKLY_LESSON_SAVED',reason:`Weekly lesson ${entryId} saved`,allocations:structuredClone(state.allocations),scheduleFingerprint:state.scheduleFingerprint}]},entries);
    scheme.draft();await this.persist(scheme,revision,originalEntries);return this.describe(actor,scheme);
  }

  /** Teachers choose real lesson periods, independently of strand order or week boundaries. */
  async allocateSessions(actor:AcademicActor,id:string,revision:number,subStrandId:string,slotIds:string[],content:Pick<SchemeOfWorkEntry,'specificLearningOutcomes'|'keyInquiryQuestions'|'learningExperiences'|'learningResources'|'assessmentMethods'>,pacing?:SchemePacing) {
    const scheme=await this.editableWeekly(actor,id,revision,false);
    const state=scheme.planningState!;
    const allocation=state.allocations.find(row=>row.subStrandId===subStrandId&&row.lessons>0);
    if(!allocation)throw new ValidationError('Select curriculum included in this saved syllabus coverage.');
    if(!slotIds.length||new Set(slotIds).size!==slotIds.length)throw new ValidationError('Select each teaching period once.');
    const [schedule,catalogue,plans,work]=await Promise.all([
      this.c.calendarPlanning.schemeSchedule(actor,scheme.toJSON(),pacing||state.pacing,scheme.entries),
      this.catalogue(actor,scheme.toJSON()),
      this.c.lessonPlanRepository.findAll({classRoomId:scheme.classRoomId,learningAreaId:scheme.learningAreaId,streamId:scheme.streamId}),
      this.c.recordOfWorkRepository.find({schoolId:actor.schoolId,academicYearId:scheme.academicYearId}),
    ]);
    const slots=slotIds.map(slotId=>schedule.slots.find(slot=>slot.id===slotId));
    if(slots.some(slot=>!slot))throw new ValidationError('Select eligible teaching periods from selected scheme planning grid.');
    const curriculum=catalogue.flatMap(strand=>strand.subStrands.map(sub=>({strand,sub})));
    const selected=[subStrandId,...(allocation.combinedSubStrandIds||[])].map(subId=>curriculum.find(item=>item.sub.id===subId));
    if(selected.some(item=>!item))throw new ValidationError('The saved curriculum is no longer available. Ask the administrator to review it.');
    const source=selected as NonNullable<typeof selected[number]>[];
    const allowedOutcomes=allocation.specificLearningOutcomes?.length?allocation.specificLearningOutcomes:source.flatMap(item=>item.sub.specificLearningOutcomes);
    const outcomes=[...new Set(content.specificLearningOutcomes.map(text=>text.trim()).filter(Boolean))];
    if(!outcomes.length||outcomes.some(outcome=>!allowedOutcomes.some(allowed=>allowed.trim()===outcome)))throw new ValidationError('Choose the outcomes for this part from the saved syllabus coverage.');
    const existing=scheme.entries.filter(entry=>!entry.archivedAt&&entry.slotId&&slotIds.includes(entry.slotId));
    const approved=new Set(state.approvedEntryIds||[]);
    if(existing.some(entry=>approved.has(entry.id)))throw new ConflictError('Approved scheme lessons cannot be replaced. Choose an unapproved teaching period.');
    if(existing.some(entry=>plans.some(plan=>plan.toJSON().schemeOfWorkEntryId===entry.id)||work.some(record=>record.toJSON().planningLink?.schemeId===id&&record.toJSON().planningLink?.schemeEntryId===entry.id)))throw new ConflictError('A selected lesson already has a lesson plan or Record of Work. Retain its history and choose another period.');
    const originalEntries=structuredClone(scheme.entries);
    const replaced=new Set(existing.map(entry=>entry.id));
    const now=new Date().toISOString();
    const entries=scheme.entries.map(entry=>replaced.has(entry.id)?{...entry,archivedAt:now,archivedReason:'Replaced by an explicit teaching-period allocation; original draft retained.'}:entry);
    const lines=(values:string[])=>values.map(value=>value.trim()).filter(Boolean);
    for(const slot of slots){
      entries.push({id:IdGenerator.generate(),slotId:slot!.id,weekNumber:slot!.weekNumber,lessonNumber:slot!.lessonNumber,scheduledDate:slot!.date,scheduledStartTime:slot!.startTime,scheduledEndTime:slot!.endTime,strandId:source[0].strand.id,strandTitle:[...new Set(source.map(item=>item.strand.title))].join(' + '),subStrandId,subStrandTitle:source.map(item=>item.sub.title).join(' + '),combinedSubStrandIds:allocation.combinedSubStrandIds,specificLearningOutcomes:outcomes,keyInquiryQuestions:lines(content.keyInquiryQuestions),learningExperiences:lines(content.learningExperiences),learningResources:lines(content.learningResources),assessmentMethods:lines(content.assessmentMethods)});
    }
    scheme.setPlanningState({...state,pacing:schedule.pacing||state.pacing,revision:revision+1,locked:false,weeklyPlanningStarted:true,submittedEntryIds:undefined,scheduleFingerprint:schedule.fingerprint,history:[...state.history,{at:now,actorId:actor.userId,action:'PACING_ADJUSTED',reason:`Allocated ${slots.length} selected teaching periods without changing source syllabus coverage.`,allocations:structuredClone(state.allocations),scheduleFingerprint:schedule.fingerprint}]},entries);
    scheme.draft();await this.persist(scheme,revision,originalEntries);
    return this.weekly(actor,id);
  }

  async continueSubStrand(actor:AcademicActor,id:string,revision:number,subStrandId:string,slotId:string,reason:string) {
    const scheme=await this.editableWeekly(actor,id,revision,false);
    if(reason.trim().length<3)throw new ValidationError('Explain why this sub-strand needs another teaching session.');
    const state=scheme.planningState!;
    const allocation=state.allocations.find(item=>item.subStrandId===subStrandId&&item.lessons>0);
    if(!allocation)throw new ValidationError('Choose a sub-strand from the saved coverage plan.');
    const scheduled=await this.c.calendarPlanning.schemeSchedule(actor,scheme.toJSON(),scheme.planningState?.pacing,scheme.entries);
    const slot=scheduled.slots.find(item=>item.id===slotId);
    if(!slot)throw new ValidationError('Choose an available scheme week and lesson position.');
    const original=scheme.entries.find(entry=>!entry.archivedAt&&entry.slotId===slotId);
    if(original?.subStrandId===subStrandId)throw new ConflictError('This session already belongs to the selected sub-strand.');
    if(original){
      if(state.approvedEntryIds?.includes(original.id))throw new ConflictError('An approved lesson cannot be replaced by a pacing change.');
      const plans=await this.c.lessonPlanRepository.findAll({classRoomId:scheme.classRoomId,learningAreaId:scheme.learningAreaId,streamId:scheme.streamId});
      const work=await this.c.recordOfWorkRepository.find({schoolId:actor.schoolId,academicYearId:scheme.academicYearId,termId:scheme.termId});
      if(plans.some(plan=>plan.toJSON().schemeOfWorkEntryId===original.id)||work.some(record=>record.toJSON().planningLink?.schemeEntryId===original.id))throw new ConflictError('A lesson with a lesson plan or record of work cannot be replaced.');
    }
    const catalogue=await this.checkAllocations(actor,scheme.toJSON(),state.allocations);
    const curriculum=catalogue.flatMap(strand=>strand.subStrands.map(sub=>({strand,sub})));
    const selected=[subStrandId,...(allocation.combinedSubStrandIds||[])].map(subId=>curriculum.find(item=>item.sub.id===subId)!);
    const source=scheme.entries.find(entry=>!entry.archivedAt&&entry.subStrandId===subStrandId);
    const entry:SchemeOfWorkEntry={id:IdGenerator.generate(),slotId:slot.id,weekNumber:slot.weekNumber,lessonNumber:slot.lessonNumber,scheduledDate:slot.date,scheduledStartTime:slot.startTime,scheduledEndTime:slot.endTime,strandId:selected[0].strand.id,subStrandId,combinedSubStrandIds:allocation.combinedSubStrandIds,strandTitle:[...new Set(selected.map(item=>item.strand.title))].join(' + '),subStrandTitle:selected.map(item=>item.sub.title).join(' + '),specificLearningOutcomes:source?.specificLearningOutcomes||allocation.specificLearningOutcomes||selected.flatMap(item=>item.sub.specificLearningOutcomes),keyInquiryQuestions:source?.keyInquiryQuestions||allocation.keyInquiryQuestions||[],learningExperiences:source?.learningExperiences||allocation.learningExperiences||[],learningResources:source?.learningResources||allocation.learningResources||[],assessmentMethods:source?.assessmentMethods||allocation.assessmentMethods||[]};
    const originalEntries=structuredClone(scheme.entries);
    const entries=scheme.entries.map(row=>row.id===original?.id?{...row,archivedAt:new Date().toISOString(),archivedReason:`Pacing adjustment: session deferred to continue ${entry.subStrandTitle}. ${reason.trim()}`} :row);
    entries.push(entry);
    scheme.setPlanningState({...state,revision:revision+1,locked:false,weeklyPlanningStarted:true,submittedEntryIds:undefined,history:[...state.history,{at:new Date().toISOString(),actorId:actor.userId,action:'PACING_ADJUSTED',reason:reason.trim(),allocations:structuredClone(state.allocations),scheduleFingerprint:scheduled.fingerprint}]},entries);
    scheme.draft();await this.persist(scheme,revision,originalEntries);return this.describe(actor,scheme);
  }

  async submitWeekly(actor:AcademicActor,id:string,revision:number,entryIds?:string[]) {
    const scheme=await this.editableWeekly(actor,id,revision);
    const schedule=await this.c.calendarPlanning.schemeSchedule(actor,scheme.toJSON(),scheme.planningState?.pacing,scheme.entries);
    if(!schedule.slots.length||!scheme.entries.some(entry=>!entry.archivedAt))throw new ValidationError('A weekly scheme needs eligible scheduled lessons before submission.');
    const selected=selectWeeklySubmission(scheme.planningState!,scheme.entries,entryIds);
    const approved=scheme.entries.filter(entry=>scheme.planningState!.approvedEntryIds?.includes(entry.id));
    assertWeeklyCoverage(scheme.planningState!,[...approved,...selected]);
    const validation=this.c.calendarPlanning.validate(selected,schedule.slots.filter(slot=>selected.some(entry=>entry.slotId===slot.id)),true);
    if(!validation.complete)throw new ValidationError('Complete the selected weekly lessons before submitting.',validation);
    const state=scheme.planningState!;
    scheme.setPlanningState({...state,revision:revision+1,locked:true,submittedEntryIds:selected.map(entry=>entry.id),approvedEntryIds:state.approvedEntryIds||[],history:[...state.history,{at:new Date().toISOString(),actorId:actor.userId,action:'FINALIZED',allocations:structuredClone(state.allocations),scheduleFingerprint:schedule.fingerprint}]});
    scheme.submit();await this.persist(scheme,revision);return this.describe(actor,scheme);
  }

  async reopen(actor:AcademicActor,id:string,revision:number,reason:string) {
    const scheme=await this.get(actor,id);this.revision(scheme,revision);
    const state=scheme.planningState;if(!state?.locked&&state?.coverageReviewStatus!=='APPROVED')throw new ConflictError('The plan is already editable.');
    await this.c.assignmentAccess.assertSubjectTeaching(actor,scheme.toJSON());
    if(!reason.trim())throw new ValidationError('Record a reason for reopening this plan.');
    scheme.setPlanningState({...state,revision:revision+1,locked:false,coverageReviewStatus:'DRAFT',coverageReviewRemarks:undefined,coverageReviewedByUserId:undefined,coverageReviewedAt:undefined,history:[...state.history,{at:new Date().toISOString(),actorId:actor.userId,action:'REOPENED',reason:reason.trim(),allocations:structuredClone(state.allocations),scheduleFingerprint:state.scheduleFingerprint}]});
    scheme.draft();await this.persist(scheme,revision);return this.describe(actor,scheme);
  }

  async weekly(actor:AcademicActor,id:string,pacing?:SchemePacing) {
    const scheme=await this.get(actor,id);
    const schedule=await this.c.calendarPlanning.schemeSchedule(actor,scheme.toJSON(),pacing||scheme.planningState?.pacing,scheme.entries);
    let actual: {slots: typeof schedule.slots}={slots:[]};
    let timetableSetupRequired:string|undefined;
    try{actual=await this.c.calendarPlanning.slots(actor,scheme.toJSON());}catch(error){if(!(error instanceof ConflictError))throw error;timetableSetupRequired=error.message;}
    const calendar=await this.c.calendarPlanning.calendar(actor,scheme.toJSON());
    const scheduledWeekdays=[...new Set(actual.slots.map(slot=>new Date(`${slot.date}T00:00:00Z`).getUTCDay()))].sort((a,b)=>a-b);
    const plans=await this.c.curriculumUseCases.listLessonPlans({classRoomId:scheme.classRoomId,streamId:scheme.streamId,learningAreaId:scheme.learningAreaId},actor);
    const work=await this.c.recordOfWorkRepository.find({schoolId:actor.schoolId,academicYearId:scheme.academicYearId,termId:scheme.termId});
    const reportedOutcomes=new Set<string>(),confirmedOutcomes=new Set<string>();
    const weeks=new Map<number,any>();
    for(const position of schedule.slots){
      const entry=scheme.entries.find(e=>!e.archivedAt&&(e.slotId===position.id||(e.weekNumber===position.weekNumber&&e.lessonNumber===position.lessonNumber)));
      const matching=plans.filter(p=>entry&&p.schemeOfWorkEntryId===entry.id).sort((a:any,b:any)=>new Date(b.updatedAt||b.createdAt||0).getTime()-new Date(a.updatedAt||a.createdAt||0).getTime());
      const plan=matching.find(p=>this.isPlanned(p))||matching[0];
      const real=(plan?actual.slots.find(slot=>slot.date===plan.lessonDate&&plan.lessonTime===`${slot.startTime}-${slot.endTime}`):undefined)||actual.slots.find(slot=>slot.id===position.id)||actual.slots.find(slot=>slot.weekNumber===position.weekNumber&&slot.lessonNumber===position.lessonNumber);
      const slot={...position,date:real?.date||'',startTime:real?.startTime||'',endTime:real?.endTime||'',timetableSlotId:real?.id};
      if(!weeks.has(slot.weekNumber))weeks.set(slot.weekNumber,{weekNumber:slot.weekNumber,startDate:slot.date,endDate:slot.date,lessons:[]});
      const linkedWork=work.map(record=>record.toJSON()).filter((r:any)=>entry&&r.classRoomId===scheme.classRoomId&&(r.streamId||'')===(scheme.streamId||'')&&r.learningAreaId===scheme.learningAreaId&&r.planningLink?.schemeId===id&&r.planningLink?.schemeEntryId===entry?.id);
      for(const record of linkedWork){
        if(!entry||!['SUBMITTED','APPROVED'].includes(record.status)||['POSTPONED','CANCELLED'].includes(record.reflectionData?.teachingStatus||''))continue;
        const covered=record.reflectionData?.outcomesCovered||(!record.reflectionData?.teachingStatus||record.reflectionData.teachingStatus==='COMPLETED'?entry.specificLearningOutcomes:[]);
        for(const outcome of covered.filter((o:string)=>entry.specificLearningOutcomes.includes(o))){const key=JSON.stringify([entry.subStrandId||entry.subStrandTitle,outcome.trim().toLowerCase()]);reportedOutcomes.add(key);if(record.status==='APPROVED'&&record.isOfficialCoverage)confirmedOutcomes.add(key);}
      }
      const taught=linkedWork.some((r:any)=>r.status==='APPROVED'&&r.isOfficialCoverage&&(!r.reflectionData?.teachingStatus||r.reflectionData.teachingStatus==='COMPLETED'));
      const reported=linkedWork.some((r:any)=>r.status==='SUBMITTED'||r.status==='APPROVED');
      const recordOfWorkStatus=linkedWork.sort((a:any,b:any)=>new Date(b.updatedAt||b.createdAt||0).getTime()-new Date(a.updatedAt||a.createdAt||0).getTime())[0]?.status;
      weeks.get(slot.weekNumber).endDate=slot.date;
      weeks.get(slot.weekNumber).lessons.push({...slot,entry,lessonPlan:plan,recordOfWorkStatus,recordsOfWork:linkedWork,statuses:{planned:matching.some(p=>this.isPlanned(p)),reported,taught,reflection:matching.some(p=>Boolean(p.teacherSelfReflection?.trim()))}});
    }
    const [school,cls,area,term,stream,year]=await Promise.all([this.c.academicRepository.getSchool(actor.schoolId!),this.c.academicRepository.findClassById(scheme.classRoomId),this.c.academicRepository.findLearningAreaById(scheme.learningAreaId),this.c.academicRepository.findTermById(scheme.termId),scheme.streamId?this.c.academicRepository.findStreamById(scheme.streamId):Promise.resolve(null),this.c.academicRepository.findYearById(scheme.academicYearId)]);
    const monitoringRegister=weeklyMonitoringRegister([...weeks.values()],term?.startDate,term?.endDate);
    return {pacing:schedule.pacing,timetableSlots:actual.slots,timetableSetupRequired,monitoringRegister,coverageSummary:{reportedOutcomes:reportedOutcomes.size,confirmedOutcomes:confirmedOutcomes.size},scheme:scheme.toJSON(),school:school?.toJSON(),className:cls?.name,streamName:stream?.name,learningAreaName:area?.name,termName:term?.name,academicYearName:year?.name,teachingDays:calendar?.data.teachingDays||[1,2,3,4,5],scheduledWeekdays,weeks:[...weeks.values()],fingerprint:schedule.fingerprint,scheduleChanged:Boolean(scheme.planningState&&scheme.planningState.scheduleFingerprint!==schedule.fingerprint)};
  }

  private isPlanned(p:any) {
    return Boolean(p.strand?.trim()&&p.subStrand?.trim()&&p.specificLearningOutcomes?.some((s:string)=>s.trim())&&p.steps?.length&&p.steps.every((s:any)=>s.teacherActivities?.trim()&&s.learnerActivities?.trim()&&s.durationMinutes>0)&&p.steps.reduce((n:number,s:any)=>n+s.durationMinutes,0)===p.durationMinutes);
  }
}
