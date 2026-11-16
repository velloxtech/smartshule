import {AppContainer} from '../../infrastructure/container';
import {AcademicActor,TeachingScope,sameTerm} from '../shared/TeacherAssignmentAccess';
import {ConflictError,ValidationError,ForbiddenError} from '../../core/domain/shared/Errors';
/** Governance uses revisioned planning documents; no historical schemes are synthesized. */
export class PlanningWorkflowService {
 constructor(private c:AppContainer){}
 private startKey(a:AcademicActor){return `smartshule-start:${a.schoolId}`;}
 private async periods(a:AcademicActor){const years=await this.c.academicRepository.findAllYears(a.schoolId);return (await Promise.all(years.map(async y=>(await this.c.academicRepository.findTermsByYear(y.id)).map(t=>({...t.toJSON(),yearName:y.name}))))).flat();}
 async continuity(a:AcademicActor,s:TeachingScope){
  const {year,term}=await this.c.assignmentAccess.context(a,s);
  if(s.classRoomId)await this.c.assignmentAccess.assert(a,s);
  const start=await this.c.planningRepository.get(this.startKey(a));
  const periods=await this.periods(a);
  const prior=periods.filter(t=>t.startDate<term.startDate).sort((x,y)=>y.startDate.localeCompare(x.startDate)||x.id.localeCompare(y.id))[0];
  const schoolClasses=new Set((await this.c.academicRepository.findAllClasses(a.schoolId)).map(c=>c.id));
  const allPriorRows=prior?(await this.c.schemeOfWorkRepository.findAll({academicYearId:prior.academicYearId})).filter(r=>schoolClasses.has(r.classRoomId)&&sameTerm(r.termId,prior.id)):[];
  const olderIds=new Set(periods.filter(t=>t.startDate<term.startDate).map(t=>`${t.academicYearId}:${t.id.replace(/-t([1-3])$/,'-$1')}`));
  const schoolHasPrior=(await this.c.schemeOfWorkRepository.findAll()).some(r=>schoolClasses.has(r.classRoomId)&&olderIds.has(`${r.academicYearId}:${r.termId.replace(/-t([1-3])$/,'-$1')}`)&&(r.status==='APPROVED'||Boolean(r.planningState?.approvedEntryIds?.length)));
  const rows=allPriorRows.filter(r=>(!s.classRoomId||r.classRoomId===s.classRoomId)&&(!s.learningAreaId||r.learningAreaId===s.learningAreaId)&&(!s.classRoomId||(r.streamId||'')===(s.streamId||'')));
  const approved=rows.filter(r=>r.status==='APPROVED'||r.planningState?.approvedEntryIds?.length);
  const work=prior?await this.c.recordOfWorkRepository.find({schoolId:a.schoolId,academicYearId:prior.academicYearId}):[];
  const unfinished=approved.flatMap(r=>r.entries.filter(e=>!e.archivedAt&&(!r.planningState?.approvedEntryIds||r.planningState.approvedEntryIds.includes(e.id))).filter(e=>!work.some(w=>{const d=w.toJSON();return d.status==='APPROVED'&&d.isOfficialCoverage&&(!d.reflectionData?.teachingStatus||d.reflectionData.teachingStatus==='COMPLETED')&&d.planningLink?.schemeId===r.id&&d.planningLink?.schemeEntryId===e.id;})).map(e=>({sourceSchemeId:r.id,sourceEntryId:e.id,subStrandId:e.subStrandId,strandTitle:e.strandTitle,subStrandTitle:e.subStrandTitle,specificLearningOutcomes:e.specificLearningOutcomes})));
  const first=Boolean(start?.data.academicYearId===year.id&&sameTerm(start.data.termId,term.id));
  const resolution=await this.c.planningRepository.get(this.c.calendarPlanning.key('prior-resolution',a,s)+`:${s.classRoomId||'*'}:${s.streamId||'*'}:${s.learningAreaId||'*'}`);
  const priorPending=Boolean(prior&&prior.endDate>=new Date().toISOString().slice(0,10)&&term.startDate>new Date().toISOString().slice(0,10)&&(start||schoolHasPrior));
  const status=first?'FIRST_TERM':approved.length?'PRIOR_APPROVED':resolution?'RESOLVED':priorPending?'PRIOR_PENDING':(start||schoolHasPrior)?'MISSING_PRIOR':'NEEDS_FIRST_TERM_DECISION';
  return {status,hasEarlierApprovedHistory:schoolHasPrior,start:start?.data,previousPeriod:prior,approvedPreviousSchemes:approved.length,unfinishedEntries:unfinished,resolution:resolution?.data,canPlan:first||Boolean(approved.length)||Boolean(resolution)||priorPending,message:first?'First term in the Grace Seeds School portal confirmed. Build from published curriculum.':approved.length?'Review unfinished work from the approved previous scheme.':resolution?'Missing prior records reviewed by the administrator. Build from published curriculum.':priorPending?'The previous term is not finished yet. Prepare future plans now; review its unfinished work again before teaching starts.':(start||schoolHasPrior)?`No approved previous scheme was found${prior?` for ${prior.name}`:''}. Ask the administrator to restore/approve the real prior scheme or record a missing-records decision.`:'Ask the administrator to confirm Start First Term in Grace Seeds School Portal for this period. Any numbered term can be the first term.'};
 }
 async decide(a:AcademicActor,s:TeachingScope,decision:'FIRST_TERM'|'MISSING_PRIOR',reason:string,revision:number){
  await this.c.calendarPlanning.admin(a,s);if(reason.trim().length<5)throw new ValidationError('Explain this decision for the school audit history.');
  const state=await this.continuity(a,s);if(state.approvedPreviousSchemes||(decision==='FIRST_TERM'&&state.hasEarlierApprovedHistory))throw new ConflictError('An approved previous scheme exists. Review and carry forward its unfinished work.');
  const {year,term}=await this.c.assignmentAccess.context(a,s);
  const key=decision==='FIRST_TERM'?this.startKey(a):this.c.calendarPlanning.key('prior-resolution',a,s)+`:${s.classRoomId||'*'}:${s.streamId||'*'}:${s.learningAreaId||'*'}`;
  if(decision==='FIRST_TERM'&&await this.c.planningRepository.get(key))throw new ConflictError('The school already has a recorded first term. Resolve missing prior records instead.');
  if(decision==='MISSING_PRIOR'&&(!s.classRoomId||!s.learningAreaId||state.status!=='MISSING_PRIOR'))throw new ValidationError('Select the affected class, stream and learning area after recording the school’s first term.');
  const doc={key,schoolId:a.schoolId!,kind:'SEQUENCE' as const,revision:revision+1,data:{type:decision,academicYearId:year.id,termId:term.id,reason:reason.trim(),decidedBy:a.userId,decidedAt:new Date().toISOString(),classRoomId:s.classRoomId,streamId:s.streamId,learningAreaId:s.learningAreaId}};
  await this.c.planningRepository.save(doc,revision);return doc;
 }
 async carryForward(a:AcademicActor,s:TeachingScope,entryIds:string[],revision:number){
  await this.c.assignmentAccess.assertSubjectTeaching(a,s);const prior=await this.continuity(a,s);
  if(prior.status!=='PRIOR_APPROVED')throw new ValidationError('An approved previous scheme is required for carry-forward.');
  const selected=prior.unfinishedEntries.filter(e=>entryIds.includes(e.sourceEntryId));
  if(!selected.length||new Set(entryIds).size!==selected.length)throw new ValidationError('Select unfinished entries from the approved previous scheme.');
  const existing=await this.c.termAllocations.find(a,s);const allocations:any[]=structuredClone(existing?.planningState?.allocations||[]);
  const catalogue=await this.c.termAllocations.catalogue(a,s);
  for(const e of selected){
   const matches=catalogue.flatMap(st=>st.subStrands.filter(sub=>sub.id===e.subStrandId||(!e.subStrandId&&st.title===e.strandTitle&&sub.title===e.subStrandTitle)));
   if(matches.length!==1)throw new ValidationError('The old sub-strand cannot be matched uniquely to published curriculum. Ask the administrator to review it; no history was changed.');
   let row=allocations.find(r=>r.subStrandId===matches[0].id);
   if(!row){row={subStrandId:matches[0].id,lessons:0,carriedFrom:[]};allocations.push(row);}
   row.carriedFrom=row.carriedFrom||[];
   if(!row.carriedFrom.some((r:any)=>r.schemeId===e.sourceSchemeId&&r.entryId===e.sourceEntryId)){row.lessons+=1;row.carriedFrom.push({schemeId:e.sourceSchemeId,entryId:e.sourceEntryId});}
  }
  return this.c.termAllocations.saveDraft(a,s,allocations,revision,existing?.id);
 }
 async readiness(a:AcademicActor,s:TeachingScope){
  await this.c.assignmentAccess.assert(a,s);const calendar=await this.c.calendarPlanning.calendar(a,s);const continuity=await this.continuity(a,s);
  const schedule=await this.c.calendarPlanning.draftSchedule(a,s);const scheme=await this.c.termAllocations.find(a,s);
  const weekly=scheme&&!schedule.setupRequired?await this.c.termAllocations.weekly(a,scheme.id):null;
  const lessons=weekly?.weeks.flatMap((w:any)=>w.lessons)||[];const approved=(e:any)=>scheme?.planningState?.approvedEntryIds?scheme.planningState.approvedEntryIds.includes(e?.id):scheme?.status==='APPROVED';
  let assignmentReady=true;try{await this.c.assignmentAccess.assertSubjectTeaching(a,s);}catch(e){if(!(e instanceof ForbiddenError))throw e;assignmentReady=false;}
  const catalogue=await this.c.CBCAssessmentRepository.findStrandsByLearningArea(s.learningAreaId!);
  const publishedSubs=(await Promise.all(catalogue.map(st=>this.c.CBCAssessmentRepository.findSubStrandsByStrand(st.id)))).flat();
  let action={label:'Create Coverage Plan',tab:'curriculum-tracker',owner:'Teacher'};
  if(!assignmentReady)action={label:'Ask the administrator to assign you this learning area for the selected class, stream and period',tab:'',owner:'Administrator'};
  else if(!calendar?.data.published)action={label:'Ask the administrator to publish the School Calendar Plan',tab:'',owner:'Administrator'};
  else if(schedule.setupRequired)action={label:schedule.setupRequired,tab:'',owner:'Administrator / timetable coordinator'};
  else if(!publishedSubs.some(sub=>sub.specificLearningOutcomes.length))action={label:'Ask the curriculum administrator to publish this learning area’s strands, sub-strands and outcomes',tab:'',owner:'Curriculum administrator'};
  else if(!continuity.canPlan)action={label:continuity.message,tab:'',owner:'Administrator'};
  else if(scheme?.planningState?.coverageReviewStatus==='REJECTED'||scheme?.status==='REJECTED')action={label:'Review Admin Comments',tab:scheme?.planningState?.coverageReviewStatus==='REJECTED'?'curriculum-tracker':'scheme-of-work-builder',owner:'Teacher'};
  else if(lessons.some((l:any)=>approved(l.entry)&&!l.recordOfWorkStatus&&l.date<=new Date().toISOString().slice(0,10)))action={label:'Record Work',tab:'records-of-work',owner:'Teacher'};
  else if(lessons.some((l:any)=>approved(l.entry)&&!l.lessonPlan&&!l.recordOfWorkStatus))action={label:'Create Lesson Plan',tab:'lesson-plans',owner:'Teacher'};
  else if(lessons.some((l:any)=>l.recordOfWorkStatus==='SUBMITTED')&&lessons.filter((l:any)=>approved(l.entry)).every((l:any)=>l.recordOfWorkStatus))action={label:'Records awaiting admin review — view reported progress',tab:'records-of-work',owner:'Administrator'};
  else if(lessons.length&&lessons.every((l:any)=>l.statuses.taught))action={label:'View confirmed syllabus coverage',tab:'curriculum-tracker',owner:'Teacher'};
  else if(scheme?.status==='SUBMITTED'&&!scheme.planningState?.approvedEntryIds?.length)action={label:'Scheme awaiting admin review',tab:'scheme-of-work-builder',owner:'Administrator'};
  else if(scheme?.planningState?.coverageReviewStatus==='APPROVED')action={label:scheme.status==='SUBMITTED'?'Continue approved lessons — scheme review pending':'Continue Scheme of Work',tab:'scheme-of-work-builder',owner:'Teacher'};
  else if(scheme)action={label:scheme.planningState?.coverageReviewStatus==='SUBMITTED'?'Coverage awaiting admin review':'Continue Draft',tab:'curriculum-tracker',owner:scheme.planningState?.coverageReviewStatus==='SUBMITTED'?'Administrator':'Teacher'};
  return {assignmentReady,calendarPublished:Boolean(calendar?.data.published),timetableReady:!schedule.setupRequired,setupRequired:schedule.setupRequired,continuity,nextAction:action,reported:lessons.filter((l:any)=>l.statuses.reported).length,confirmed:lessons.filter((l:any)=>l.statuses.taught).length};
 }
}
