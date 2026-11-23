import { createHash } from 'crypto';
import { IAcademicRepository } from '../../core/ports/repositories/IAcademicRepository';
import { ITimetableRepository } from '../../core/ports/repositories/ITimetableRepository';
import { ISchemeOfWorkRepository } from '../../core/ports/repositories/ISchemeOfWorkRepository';
import { AcademicActor, TeachingScope, TeacherAssignmentAccess, sameTerm } from '../shared/TeacherAssignmentAccess';
import { PlanningRepository } from './PlanningRepository';
import { ConflictError, ForbiddenError, ValidationError } from '../../core/domain/shared/Errors';
export interface CalendarException { date:string; endDate?:string; reason:string; kind:'HOLIDAY'|'CLOSURE'|'ACTIVITY'; classRoomIds?:string[]; streamIds?:string[]; periodNumbers?:number[]; startTime?:string; endTime?:string }
export interface TermCalendar { guidedWorkflow?:boolean; startDate:string; endDate:string; teachingDays:number[]; extraTeachingDates?:string[]; exceptions:CalendarException[]; published:boolean }
export interface LessonSlot { id:string; date:string; periodNumber:number; startTime:string; endTime:string; weekNumber:number; lessonNumber:number }
const iso=(d:Date)=>d.toISOString().slice(0,10);
const day=(s:string)=>new Date(s+'T00:00:00Z');
const termKey=(s:string)=>s.replace(/-t([1-3])$/,'-$1');
export class CalendarPlanningService {
 constructor(public repository:PlanningRepository, private academic:IAcademicRepository, private timetables:ITimetableRepository, private schemes:ISchemeOfWorkRepository, public access:TeacherAssignmentAccess) {}
 key(kind:string,actor:AcademicActor,s:TeachingScope) {return [kind,actor.schoolId,s.academicYearId,termKey(s.termId || ''),...(kind==='sequence'?[s.classRoomId,s.streamId || '*']:[])].join(':');}
 async admin(actor:AcademicActor,s:TeachingScope) {if(!['SUPER_ADMIN','ADMIN','SCHOOL_ADMIN','HEAD_TEACHER','DEPUTY_HEAD_TEACHER'].includes(actor.role))throw new ForbiddenError('Calendar and sequence configuration require an administrator.');await this.access.context(actor,s);}
 async calendar(actor:AcademicActor,s:TeachingScope) {const {term}=await this.access.context(actor,s);const config=await this.repository.get(this.key('calendar',actor,s));return config?{...config,data:{...config.data,startDate:term.startDate,endDate:term.endDate}}:null;}
 async saveCalendar(actor:AcademicActor,s:TeachingScope,data:TermCalendar,revision:number) {
  await this.admin(actor,s);const {term}=await this.access.context(actor,s);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(data.endDate)||!Number.isFinite(day(data.startDate).getTime())||!Number.isFinite(day(data.endDate).getTime())||iso(day(data.startDate))!==data.startDate||iso(day(data.endDate))!==data.endDate||data.startDate>data.endDate||data.startDate!==term.startDate||data.endDate!==term.endDate)throw new ValidationError('Calendar dates must match the academic term.');
  if(!data.teachingDays.length||data.teachingDays.some(n=>!Number.isInteger(n)||n<0||n>6))throw new ValidationError('Select valid teaching weekdays.');
  for(const date of data.extraTeachingDates||[]){if(date<data.startDate||date>data.endDate||!Number.isFinite(day(date).getTime())||iso(day(date))!==date)throw new ValidationError('Additional teaching dates must be valid dates within the selected term.');}
  for(const e of data.exceptions){if(!e.reason.trim()||e.date<data.startDate||(e.endDate || e.date)>data.endDate||e.date>(e.endDate || e.date)||!Number.isFinite(day(e.date).getTime())||iso(day(e.date))!==e.date||(e.endDate&&(!Number.isFinite(day(e.endDate).getTime())||iso(day(e.endDate))!==e.endDate)))throw new ValidationError('Calendar exceptions require valid term dates and a reason.');if((e.startTime&&!e.endTime)||(!e.startTime&&e.endTime)||(e.startTime&&e.endTime&&e.startTime>=e.endTime))throw new ValidationError('Activity times must form a valid interval.');for(const classRoomId of e.classRoomIds || [])await this.access.assert(actor,{...s,classRoomId,streamId:undefined,learningAreaId:undefined});for(const streamId of e.streamIds || [])await this.access.assert(actor,{...s,classRoomId:undefined,streamId,learningAreaId:undefined});}
  const doc={key:this.key('calendar',actor,s),schoolId:actor.schoolId!,kind:'CALENDAR' as const,revision:revision+1,data:{...data,publishedBy:data.published?actor.userId:undefined}};await this.repository.save(doc,revision);return doc;
 }
 async sequence(actor:AcademicActor,s:TeachingScope){await this.access.assert(actor,s);return this.repository.get(this.key('sequence',actor,s));}
 async saveSequence(actor:AcademicActor,s:TeachingScope,data:{enabled:boolean;learningAreaIds:string[]},revision:number){await this.admin(actor,s);await this.access.assert(actor,s);if(new Set(data.learningAreaIds).size!==data.learningAreaIds.length)throw new ValidationError('A sequence cannot repeat a learning area.');for(const learningAreaId of data.learningAreaIds)await this.access.assert(actor,{...s,learningAreaId});const doc={key:this.key('sequence',actor,s),schoolId:actor.schoolId!,kind:'SEQUENCE' as const,revision:revision+1,data};await this.repository.save(doc,revision);return doc;}
 async draftSchedule(actor:AcademicActor,s:TeachingScope) {
  try { return {...await this.slots(actor,s),setupRequired:undefined as string|undefined}; }
  catch(e) {
   if (!(e instanceof ConflictError) || !/^(An administrator must publish the term calendar|Set up an active class\/stream timetable|Resolve overlapping active timetables|No eligible lessons)/.test(e.message)) throw e;
   return {slots:[] as LessonSlot[],calendarRevision:0,fingerprint:'pending-schedule',setupRequired:e.message};
  }
 }
 async slots(actor:AcademicActor,s:TeachingScope,checkAccess=true) {
  if(checkAccess)await this.access.assert(actor,s);
  const {term}=await this.access.context(actor,s);
  const config=await this.repository.get(this.key('calendar',actor,s));
  if(!config?.data.published)throw new ConflictError('An administrator must publish the term calendar before planning.');
  const calendar={...config.data,startDate:term.startDate,endDate:term.endDate} as TermCalendar;
  const all=(await this.timetables.findByClass(s.classRoomId!)).filter(t=>t.schoolId===actor.schoolId&&t.academicYearId===s.academicYearId&&sameTerm(t.termId,s.termId!)&&t.isActive);
  const exact=all.filter(t=>(t.streamId || '')===(s.streamId || ''));
  const candidates=exact.length?exact:all.filter(t=>!t.streamId);
  if(candidates.length!==1)throw new ConflictError(candidates.length?'Resolve overlapping active timetables before planning.':'Set up an active class/stream timetable for this term.');
  const timetable=candidates[0];
  const days=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const anchor=day(term.startDate);anchor.setUTCDate(anchor.getUTCDate()-((anchor.getUTCDay()+6)%7));
  const result:LessonSlot[]=[];const weekCounts=new Map<number,number>();
  for(let d=day(calendar.startDate);iso(d)<=calendar.endDate;d.setUTCDate(d.getUTCDate()+1)){
   const date=iso(d);if(!calendar.teachingDays.includes(d.getUTCDay())&&!calendar.extraTeachingDates?.includes(date))continue;
   const recurring=timetable.slots.filter(p=>!p.isBreak&&!p.isLunch&&p.learningAreaId===s.learningAreaId&&String(p.dayOfWeek).toUpperCase()===days[d.getUTCDay()]&&timetable.days?.find(x=>(x.dayOfWeek || x.key)?.toUpperCase()===days[d.getUTCDay()])?.isEnabled!==false).sort((a,b)=>a.periodNumber-b.periodNumber);
   const seen=new Set<number>();
   for(const p of recurring){if(seen.has(p.periodNumber))throw new ConflictError('Timetable contains duplicate teaching periods.');seen.add(p.periodNumber);
    if(calendar.exceptions.some(e=>date>=e.date&&date<=(e.endDate || e.date)&&(!e.classRoomIds?.length||e.classRoomIds.includes(s.classRoomId!))&&(!e.streamIds?.length||e.streamIds.includes(s.streamId || ''))&&(!e.periodNumbers?.length||e.periodNumbers.includes(p.periodNumber))&&(!e.startTime || (p.startTime<e.endTime!&&p.endTime>e.startTime))))continue;
    const weekNumber=Math.floor((d.getTime()-anchor.getTime())/604800000)+1;const lessonNumber=(weekCounts.get(weekNumber)||0)+1;weekCounts.set(weekNumber,lessonNumber);result.push({id:`${date}:p${p.periodNumber}`,date,periodNumber:p.periodNumber,startTime:p.startTime,endTime:p.endTime,weekNumber,lessonNumber});
   }
  }
  if(!result.length)throw new ConflictError('No eligible lessons: assign this learning area to teaching periods in the timetable.');
  return {slots:result,calendarRevision:config.revision,fingerprint:createHash('sha256').update(JSON.stringify([config.revision,term.startDate,term.endDate,timetable.toJSON()])).digest('hex')};
 }
 validate(entries:any[],slots:LessonSlot[],complete=false){entries=entries.filter(e=>!e.archivedAt);const ids=new Set<string>();const valid=new Map(slots.map(s=>[s.id,s]));const conflicts:any[]=[];for(const e of entries){const slot=valid.get(e.slotId);if(!slot)conflicts.push({entryId:e.id,slotId:e.slotId,reason:'Slot cancelled, moved, or not linked; reschedule this entry.'});else if(e.weekNumber!==slot.weekNumber || e.lessonNumber!==slot.lessonNumber || e.scheduledDate && e.scheduledDate!==slot.date || e.scheduledStartTime && e.scheduledStartTime!==slot.startTime || e.scheduledEndTime && e.scheduledEndTime!==slot.endTime)conflicts.push({entryId:e.id,slotId:e.slotId,reason:'Timetable or lesson numbering changed; reschedule this entry.'});else if(ids.has(e.slotId))conflicts.push({entryId:e.id,slotId:e.slotId,reason:'Duplicate lesson slot.'});else if(complete&&(!e.strandTitle?.trim()||!e.subStrandTitle?.trim()||!e.specificLearningOutcomes?.some((x:string)=>x.trim())||!e.learningExperiences?.some((x:string)=>x.trim())||!e.assessmentMethods?.some((x:string)=>x.trim())))conflicts.push({entryId:e.id,slotId:e.slotId,reason:'Lesson content is incomplete.'});ids.add(e.slotId);}
  const missing=slots.filter(s=>!ids.has(s.id));return {required:slots.length,filled:entries.filter(e=>valid.has(e.slotId)).length,missing,conflicts,complete:entries.length===slots.length&&!missing.length&&!conflicts.length};
 }
 async assertUnlocked(actor:AcademicActor,s:TeachingScope){if(actor.role!=='TEACHER')return;const seq=await this.repository.get(this.key('sequence',actor,s));if(!seq?.data.enabled)return;const index=seq.data.learningAreaIds.indexOf(s.learningAreaId);if(index<0)throw new ConflictError('This learning area is not in the configured planning sequence.');if(index===0)return;const previous=seq.data.learningAreaIds[index-1];const scheduled=await this.slots(actor,{...s,learningAreaId:previous},false);const schemes=await this.schemes.findAll({classRoomId:s.classRoomId,academicYearId:s.academicYearId});const applicable=schemes.filter(r=>r.learningAreaId===previous&&sameTerm(r.termId,s.termId!)&&(r.streamId || '')===(s.streamId || ''));const managed=applicable.filter(r=>r.planningState);const complete=(managed.length?managed:applicable).some(r=>(!r.planningState||r.planningState.locked)&&['SUBMITTED','APPROVED'].includes(r.status)&&this.validate(r.planningState?.approvedEntryIds?r.entries.filter(entry=>r.planningState!.approvedEntryIds!.includes(entry.id)||(r.status==='SUBMITTED'&&r.planningState!.submittedEntryIds?.includes(entry.id))):r.entries,scheduled.slots,true).complete);if(!complete)throw new ConflictError('Learning-area sequence: finish the preceding learning area’s required scheme sessions. This is not a previous-term requirement; the administrator can change the optional sequence.');}
 async inspect(actor:AcademicActor,s:TeachingScope,entries:any[]=[]){const scheduled=await this.slots(actor,s);let lockReason:string|undefined;try{await this.assertUnlocked(actor,s);}catch(e:any){lockReason=e.message;}return {...scheduled,...this.validate(entries,scheduled.slots,true),locked:Boolean(lockReason),lockReason};}
}
