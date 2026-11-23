import { createPlanningReadContext } from '../../../application/planning/PlanningReadContext';
import { weeklySchemeDoc, weeklySchemePDF, weeklyMonitoringDoc, weeklyMonitoringPDF } from '../exports/WeeklySchemeExport';
import { Request,Response,NextFunction } from 'express';
import { z } from 'zod';
import { AppContainer } from '../../container';
import { AcademicActor, TeachingScope, sameTerm } from '../../../application/shared/TeacherAssignmentAccess';
import { ForbiddenError, ValidationError, ConflictError } from '../../../core/domain/shared/Errors';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const calendarSchema=z.object({revision:z.number().int().min(0),calendar:z.object({guidedWorkflow:z.boolean().optional(),startDate:date,endDate:date,teachingDays:z.array(z.number().int().min(0).max(6)),extraTeachingDates:z.array(date).optional(),published:z.boolean(),exceptions:z.array(z.object({date,endDate:date.optional(),reason:z.string().min(1),kind:z.enum(['HOLIDAY','CLOSURE','ACTIVITY']),classRoomIds:z.array(z.string()).optional(),streamIds:z.array(z.string()).optional(),periodNumbers:z.array(z.number().int().positive()).optional(),startTime:z.string().regex(/^\d{2}:\d{2}$/).optional(),endTime:z.string().regex(/^\d{2}:\d{2}$/).optional()}))})});
export class CalendarPlanningController {
 constructor(private c:AppContainer){}
 scope(req:Request):TeachingScope {return {schoolId:(req as any).user.schoolId,academicYearId:String(req.query.academicYearId || ''),termId:String(req.query.termId || ''),classRoomId:req.query.classRoomId?String(req.query.classRoomId):undefined,streamId:req.query.streamId?String(req.query.streamId):undefined,learningAreaId:req.query.learningAreaId?String(req.query.learningAreaId):undefined};}
 handle=(fn:(req:Request,actor:AcademicActor)=>Promise<any>)=>async(req:Request,res:Response,next:NextFunction)=>{try{const data=await fn(req,(req as any).user);res.json({success:true,data});}catch(e){next(e);}};
 catalogue=this.handle(async(req,a)=>this.c.termAllocations.catalogue(a,this.scope(req)));
 allocation=this.handle(async(req,a)=>this.c.termAllocations.describe(a,await this.c.termAllocations.get(a,String(req.params.id))));
 saveAllocation=this.handle(async(req,a)=>{
  const strings=z.array(z.string().max(10000)).max(100);
  const body=z.object({schemeId:z.string().optional(),revision:z.number().int().min(0),allocations:z.array(z.object({subStrandId:z.string().min(1),combinedSubStrandIds:z.array(z.string().min(1)).max(100).optional(),lessons:z.number().int().min(0).max(10000),slotIds:z.array(z.string()).optional(),specificLearningOutcomes:strings.optional(),keyInquiryQuestions:strings.optional(),learningExperiences:strings.optional(),learningResources:strings.optional(),assessmentMethods:strings.optional()})).max(500)}).parse(req.body);
  return this.c.termAllocations.saveDraft(a,this.scope(req),body.allocations,body.revision,body.schemeId);
 });
 submitCoverage=this.handle(async(req,a)=>this.c.termAllocations.submitCoverage(a,String(req.params.id),z.object({revision:z.number().int().min(0)}).parse(req.body).revision));
 reviewCoverage=this.handle(async(req,a)=>{const body=z.object({revision:z.number().int().min(0),approved:z.boolean(),remarks:z.string().max(1000)}).parse(req.body);return this.c.termAllocations.reviewCoverage(a,String(req.params.id),body.revision,body.approved,body.remarks);});
 prepareWeekly=this.handle(async(req,a)=>this.c.termAllocations.prepareWeekly(a,String(req.params.id),z.object({revision:z.number().int().min(0)}).parse(req.body).revision));
 saveWeeklyLesson=this.handle(async(req,a)=>{
  const lines=z.array(z.string().max(10000)).max(100);
  const body=z.object({revision:z.number().int().min(0),specificLearningOutcomes:lines,keyInquiryQuestions:lines,learningExperiences:lines,learningResources:lines,assessmentMethods:lines}).strict().parse(req.body);
  return this.c.termAllocations.saveWeeklyLesson(a,String(req.params.id),String(req.params.entryId),body.revision,body);
 });
 continueSubStrand=this.handle(async(req,a)=>{const body=z.object({revision:z.number().int().min(0),subStrandId:z.string().min(1),slotId:z.string().min(1),reason:z.string().trim().min(3).max(1000)}).strict().parse(req.body);return this.c.termAllocations.continueSubStrand(a,String(req.params.id),body.revision,body.subStrandId,body.slotId,body.reason);});
 submitWeekly=this.handle(async(req,a)=>{const body=z.object({revision:z.number().int().min(0),entryIds:z.array(z.string().min(1)).min(1).max(500).optional()}).parse(req.body);return this.c.termAllocations.submitWeekly(a,String(req.params.id),body.revision,body.entryIds);});
 finalizeAllocation=this.handle(async(req,a)=>this.c.termAllocations.finalize(a,String(req.params.id),z.object({revision:z.number().int().min(0)}).parse(req.body).revision));
 reopenAllocation=this.handle(async(req,a)=>{const body=z.object({revision:z.number().int().min(0),reason:z.string().min(3).max(1000)}).parse(req.body);return this.c.termAllocations.reopen(a,String(req.params.id),body.revision,body.reason);});
 allocationHistory=this.handle(async(req,a)=>(await this.c.termAllocations.get(a,String(req.params.id))).planningState?.history||[]);
 weekly=this.handle(async(req,a)=>this.c.termAllocations.weekly(a,String(req.params.id)));
 reflection=this.handle(async(req,a)=>this.c.curriculumUseCases.updateLessonPlanReflection(String(req.params.id),z.object({reflection:z.string().max(10000)}).parse(req.body).reflection,a));
 exportWeekly=async(req:Request,res:Response,next:NextFunction)=>{try{
  const format=z.enum(['pdf','doc']).parse(req.query.format);
  const monitoring=z.enum(['scheme','monitoring']).default('scheme').parse(req.query.view)==='monitoring';
  const data=await this.c.termAllocations.weekly((req as any).user,String(req.params.id));
  if(!monitoring&&data.scheme.status==='APPROVED'&&data.scheme.planningState?.approvedEntryIds){const approved=new Set(data.scheme.planningState.approvedEntryIds);data.weeks=data.weeks.map(week=>({...week,lessons:week.lessons.filter((lesson:any)=>approved.has(lesson.entry?.id))})).filter(week=>week.lessons.length);}
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Content-Disposition',`attachment; filename="${monitoring?'Weekly_Syllabus_Monitoring_Register':'Schemes_of_Work'}.${format==='doc'?'docx':format}"`);
  res.type(format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(monitoring?(format==='pdf'?weeklyMonitoringPDF(data):weeklyMonitoringDoc(data)):(format==='pdf'?weeklySchemePDF(data):weeklySchemeDoc(data)));
 }catch(e){next(e);}};
 proposals=this.handle(async(req,a)=>this.c.curriculumProposals.list(a,String(req.query.learningAreaId||'')));
 reviewProposal=this.handle(async(req,a)=>{const b=z.object({id:z.string(),revision:z.number().int().min(0),approved:z.boolean(),remarks:z.string().min(1)}).parse(req.body);return this.c.curriculumProposals.review(a,String(req.query.learningAreaId||''),b.id,b.revision,b.approved,b.remarks);});
 setupContext=this.handle(async(req,a)=>{await this.c.calendarPlanning.admin(a,this.scope(req));const years=await this.c.academicRepository.findAllYears(a.schoolId);const currentYear=years.find(y=>y.isCurrent);const terms=(await Promise.all(years.map(async y=>(await this.c.academicRepository.findTermsByYear(y.id)).filter(t=>t.isCurrent).map(t=>({...t.toJSON(),yearName:y.name}))))).flat();return {currentYear:currentYear?.toJSON(),flaggedTerms:terms,disagreement:!currentYear||new Set(terms.filter(t=>t.academicYearId===currentYear.id).map(t=>t.id.replace(/-t([1-3])$/,'-$1'))).size!==1};});
 continuity=this.handle(async(req,a)=>this.c.planningWorkflow.continuity(a,this.scope(req)));
 decideStart=this.handle(async(req,a)=>{const b=z.object({decision:z.enum(['FIRST_TERM','MISSING_PRIOR']),reason:z.string().min(5),revision:z.number().int().min(0)}).parse(req.body);return this.c.planningWorkflow.decide(a,this.scope(req),b.decision,b.reason,b.revision);});
 carryForward=this.handle(async(req,a)=>{const b=z.object({entryIds:z.array(z.string()).min(1),revision:z.number().int().min(0)}).parse(req.body);return this.c.planningWorkflow.carryForward(a,this.scope(req),b.entryIds,b.revision);});
 readiness=this.handle(async(req,a)=>this.c.planningWorkflow.readiness(a,this.scope(req)));
 getCalendar=this.handle(async(req,a)=>this.c.calendarPlanning.calendar(a,this.scope(req)));
 saveCalendar=this.handle(async(req,a)=>{const body=calendarSchema.parse(req.body);return this.c.calendarPlanning.saveCalendar(a,this.scope(req),body.calendar,body.revision);});
 getSequence=this.handle(async(req,a)=>this.c.calendarPlanning.sequence(a,this.scope(req)));
 saveSequence=this.handle(async(req,a)=>{const data=z.object({revision:z.number().int().min(0),enabled:z.boolean(),learningAreaIds:z.array(z.string())}).parse(req.body);return this.c.calendarPlanning.saveSequence(a,this.scope(req),data,data.revision);});
 recordTaught=this.handle(async(req,a)=>{
  const body=z.object({lessonPlanId:z.string().optional(),schemeId:z.string().optional(),schemeEntryId:z.string().optional(),notes:z.string().trim().min(3),actualDate:date.optional(),teachingStatus:z.enum(['COMPLETED','PARTIAL','POSTPONED','CANCELLED']).default('COMPLETED'),outcomesCovered:z.array(z.string()).optional(),remainingWork:z.string().optional(),reflection:z.string().optional()}).parse(req.body);
  const plan=body.lessonPlanId?await this.c.curriculumUseCases.getLessonPlanById(body.lessonPlanId,a):null;
  const rawSource=body.schemeId?await this.c.curriculumUseCases.getSchemeById(body.schemeId,a):(await this.c.schemeOfWorkRepository.findAll()).find(s=>s.entries.some(e=>e.id===plan?.schemeOfWorkEntryId));
  if(!rawSource)throw new ValidationError('Select an approved scheduled scheme lesson.');
  const source:any=typeof (rawSource as any).toJSON==='function'?(rawSource as any).toJSON():rawSource;
  await this.c.assignmentAccess.assertSubjectTeaching(a,source);
  const entry=source.entries.find((e:any)=>e.id===(body.schemeEntryId||plan?.schemeOfWorkEntryId));
  if(!entry||entry.archivedAt||(source.planningState?.approvedEntryIds?!source.planningState.approvedEntryIds.includes(entry.id):source.status!=='APPROVED'))throw new ValidationError('Leadership must approve this scheme lesson before teaching is recorded.');
  if(plan&&plan.schemeOfWorkEntryId!==entry.id)throw new ValidationError('Lesson plan and scheme entry must match.');
  const scheduled=await this.c.calendarPlanning.slots(a,source);const slot=scheduled.slots.find(s=>s.id===entry.slotId);
  if(!slot)throw new ValidationError('Reschedule the cancelled lesson before recording new work.');
  const actualDate=body.actualDate||slot.date;
  const period=await this.c.assignmentAccess.context(a,source);
  if(actualDate<period.term.startDate||actualDate>period.term.endDate)throw new ValidationError('The actual teaching date must be within this academic term. Schedule later follow-up work in the appropriate period.');
  if(actualDate>new Date().toISOString().slice(0,10)||actualDate<slot.date)throw new ValidationError('Record actual teaching after the scheduled lesson, not in advance.');
  const covered=body.outcomesCovered||(body.teachingStatus==='COMPLETED'?entry.specificLearningOutcomes:[]);
  if(['POSTPONED','CANCELLED'].includes(body.teachingStatus)&&covered.length)throw new ValidationError('Postponed or cancelled lessons cannot claim taught outcomes.');
  if(covered.some((outcome:string)=>!entry.specificLearningOutcomes.includes(outcome)))throw new ValidationError('Covered outcomes must come from the approved scheme lesson.');
  if(body.teachingStatus==='COMPLETED'&&entry.specificLearningOutcomes.some((outcome:string)=>!covered.includes(outcome)))throw new ValidationError('Use PARTIAL when outcomes remain untaught.');
  const existing=await this.c.recordOfWorkRepository.find({schoolId:a.schoolId,academicYearId:source.academicYearId,termId:source.termId});
  if(existing.some(r=>{const d=r.toJSON();return d.planningLink?.schemeId===source.id&&d.planningLink?.schemeEntryId===entry.id&&d.status!=='RETURNED';}))throw new ConflictError('This lesson already has a work record. Continue that record or teach another scheduled lesson.');
  return this.c.recordOfWorkUseCases.createDiaryEntry({teacherId:plan?.teacherId||source.teacherId,schoolId:a.schoolId,classRoomId:source.classRoomId,streamId:source.streamId,learningAreaId:source.learningAreaId,academicYearId:source.academicYearId,termId:source.termId,weekNumber:slot.weekNumber,lessonDate:actualDate,lessonPeriod:String(slot.periodNumber),strand:entry.strandTitle,subStrand:entry.subStrandTitle,subStrandId:entry.subStrandId,lessonTopic:entry.subStrandTitle,learningObjectives:entry.specificLearningOutcomes.join('; '),learningActivities:body.notes,comments:body.notes,reflection:body.reflection,reflectionData:{teachingStatus:body.teachingStatus,outcomesCovered:covered,remainingWork:body.remainingWork},status:'DRAFT',planningLink:{lessonPlanId:plan?.id,schemeId:source.id,schemeEntryId:entry.id,slotId:slot.id}},a);
 });
 archiveEntry=this.handle(async(req,a)=>this.c.curriculumUseCases.archiveCancelledEntry(String(req.params.id),String(req.params.entryId),a));
 rescheduleLesson=this.handle(async(req,a)=>this.c.curriculumUseCases.rescheduleLessonPlan(String(req.params.id),a));
 options=this.handle(async(req,a)=>{
  const c=createPlanningReadContext(this.c);
  const s=this.scope(req);await c.assignmentAccess.context(a,s);
  const classes=await c.academicRepository.findAllClasses(a.schoolId);const result:any[]=[];
  for(const cls of classes){const streams=await c.academicRepository.findStreamsByClass(cls.id);const contexts=[];
   for(const stream of [undefined,...streams])if(await c.assignmentAccess.can(a,{...s,classRoomId:cls.id,streamId:stream?.id}))contexts.push({id:stream?.id || '',name:stream?.name || 'Whole class'});
   if(contexts.length)result.push({...cls.toJSON(),planningStreams:contexts});
  }return result;
 });
 workspace=this.handle(async(req,a)=>{
  const c=createPlanningReadContext(this.c);
  const s=this.scope(req);await c.assignmentAccess.assert(a,s);
  const cls=await c.academicRepository.findClassById(s.classRoomId!);
  const assigned=a.role==='TEACHER'?await c.assignmentAccess.assignments(a,s):null;
  const canViewClass=!assigned||assigned.classes.some(r=>r.classRoomId===s.classRoomId&&(!r.streamId||r.streamId===s.streamId));
  const classSchemes=canViewClass?(await c.schemeOfWorkRepository.findAll({classRoomId:s.classRoomId,academicYearId:s.academicYearId})).filter(r=>sameTerm(r.termId,s.termId!)&&(r.streamId||'')===(s.streamId||'')):[];
  const areas=await c.academicRepository.findAllLearningAreas({schoolId:a.schoolId,gradeLevel:cls!.gradeLevel});
  const sequence=await c.calendarPlanning.sequence(a,s);const order:string[]=sequence?.data.learningAreaIds || [];
  areas.sort((a,b)=>(order.indexOf(a.id)<0?999:order.indexOf(a.id))-(order.indexOf(b.id)<0?999:order.indexOf(b.id)));
  const schemes=await c.curriculumUseCases.listSchemes({classRoomId:s.classRoomId,academicYearId:s.academicYearId,termId:s.termId},a);const result:any[]=[];
  for(const area of areas){if(!await c.assignmentAccess.can(a,{...s,learningAreaId:area.id}))continue;
   const areaScope={...s,learningAreaId:area.id};let canPlan=true;
   try{await c.assignmentAccess.assertSubjectTeaching(a,areaScope);}catch(e){if(!(e instanceof ForbiddenError))throw e;canPlan=false;}
   const latest=new Map<string,any>();
   for(const row of classSchemes.filter(r=>r.learningAreaId===area.id).sort((x,y)=>y.updatedAt.getTime()-x.updatedAt.getTime()))if(!latest.has(row.teacherId))latest.set(row.teacherId,row);
   const coverage=[];
   for(const row of latest.values()){
    const teacher=await c.teacherRepository.findByUserId(row.teacherId)||await c.teacherRepository.findById(row.teacherId);
    const user=teacher?await c.userRepository.findById(teacher.userId):null;
    const rowData=row.toJSON();let lessons:any[]=[];
    try{
     const scheduled=await c.calendarPlanning.slots(a,rowData);
     const plans=(await c.lessonPlanRepository.findAll({classRoomId:row.classRoomId,streamId:row.streamId,learningAreaId:row.learningAreaId})).map(p=>p.toJSON());
     const work=(await c.recordOfWorkRepository.find({schoolId:a.schoolId,academicYearId:row.academicYearId,termId:row.termId})).map(r=>r.toJSON());
     lessons=scheduled.slots.map(slot=>{
      const entry=rowData.entries.find((e:any)=>!e.archivedAt&&e.slotId===slot.id);
      const matching=plans.filter((p:any)=>entry&&p.schemeOfWorkEntryId===entry.id&&p.lessonDate===slot.date&&p.lessonTime===`${slot.startTime}-${slot.endTime}`);
      const isPlanned=(p:any)=>Boolean(p.strand?.trim()&&p.subStrand?.trim()&&p.specificLearningOutcomes?.some((x:string)=>x.trim())&&p.steps?.length&&p.steps.every((step:any)=>step.teacherActivities?.trim()&&step.learnerActivities?.trim()&&step.durationMinutes>0)&&p.steps.reduce((n:number,step:any)=>n+step.durationMinutes,0)===p.durationMinutes);
      const taught=work.some((record:any)=>entry&&record.classRoomId===row.classRoomId&&(record.streamId||'')===(row.streamId||'')&&record.learningAreaId===row.learningAreaId&&record.planningLink?.schemeId===row.id&&record.planningLink?.schemeEntryId===entry?.id&&record.planningLink?.slotId===slot.id&&record.status==='APPROVED'&&record.isOfficialCoverage&&(!record.reflectionData?.teachingStatus||record.reflectionData.teachingStatus==='COMPLETED'));
      return {weekNumber:slot.weekNumber,lessonNumber:slot.lessonNumber,date:slot.date,strandTitle:entry?.strandTitle,subStrandTitle:entry?.subStrandTitle,statuses:{planned:matching.some((p:any)=>isPlanned(p)),reported:work.some((record:any)=>entry&&record.planningLink?.schemeId===row.id&&record.planningLink?.schemeEntryId===entry.id&&['SUBMITTED','APPROVED'].includes(record.status)),taught,reflection:matching.some((p:any)=>Boolean(p.teacherSelfReflection?.trim()))}};
     });
    }catch(e){if(!(e instanceof ConflictError))throw e;}
    coverage.push({teacherName:user?`${user.firstName} ${user.lastName}`:'Subject teacher',status:row.status,allocatedLessons:row.planningState?.allocations.reduce((n:number,x:any)=>n+x.lessons,0)||0,plannedLessons:row.entries.filter((e:any)=>!e.archivedAt).length,lessons});
   }
   const scheme=canPlan?schemes.sort((a,b)=>Number(Boolean(b.planningState))-Number(Boolean(a.planningState))||new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()).find(r=>r.learningAreaId===area.id&&(r.streamId || '')===(s.streamId || '')):undefined;
   const common={learningAreaId:area.id,name:area.name,canPlan,canViewClass,coverage,schemeId:scheme?.id};
   try{const status=await c.calendarPlanning.inspect(a,areaScope,scheme?.entries||[]);result.push({...common,scheme:status.locked?undefined:scheme,...status});}
   catch(e:any){if(!(e instanceof ConflictError))throw e;let locked=false,lockReason;try{await c.calendarPlanning.assertUnlocked(a,areaScope);}catch(lock:any){if(!(lock instanceof ConflictError))throw lock;locked=true;lockReason=lock.message;}result.push({...common,scheme,setupRequired:e.message,locked,lockReason});}
  }const lessonPlans=(await c.curriculumUseCases.listLessonPlans({classRoomId:s.classRoomId},a)).filter(p=>p.learningAreaId&&schemes.some(s=>s.entries.some(e=>e.id===p.schemeOfWorkEntryId)));
  const withConflicts=lessonPlans.map(plan=>{const source=schemes.find(r=>r.entries.some(e=>e.id===plan.schemeOfWorkEntryId));const entry=source?.entries.find(e=>e.id===plan.schemeOfWorkEntryId);const area=result.find(a=>a.learningAreaId===plan.learningAreaId);const slot=(area as any)?.slots?.find((s:any)=>s.id===entry?.slotId);return {...plan,needsRescheduling:!slot || slot.date!==plan.lessonDate || plan.lessonTime!==`${slot.startTime}-${slot.endTime}`};});
  return {classRoomId:s.classRoomId,streamId:s.streamId,academicYearId:s.academicYearId,termId:s.termId,areas:result,canViewClass,sequence,lessonPlans:withConflicts};
 });
 slots=this.handle(async(req,a)=>{const s=this.scope(req);await this.c.assignmentAccess.assert(a,s);await this.c.calendarPlanning.assertUnlocked(a,s);return this.c.calendarPlanning.slots(a,s);});
 validation=this.handle(async(req,a)=>{const scheme=await this.c.curriculumUseCases.getSchemeById(String(req.params.id),a);return this.c.calendarPlanning.inspect(a,scheme,scheme.entries);});
 updateEntry=this.handle(async(req,a)=>{const body=z.object({slotId:z.string(),strandTitle:z.string().min(1),subStrandTitle:z.string().min(1),specificLearningOutcomes:z.array(z.string()),keyInquiryQuestions:z.array(z.string()),learningExperiences:z.array(z.string()),learningResources:z.array(z.string()),assessmentMethods:z.array(z.string()),weekNumber:z.number().int().positive(),lessonNumber:z.number().int().positive(),reflection:z.string().optional()}).parse(req.body);return this.c.curriculumUseCases.updateSchemeEntry(String(req.params.id),String(req.params.entryId),body,a);});
}
