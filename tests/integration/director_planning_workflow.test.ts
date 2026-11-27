import request from 'supertest';
import {AppContainer} from '../../src/infrastructure/container';
import {createExpressApp} from '../../src/infrastructure/http/app';
import {AcademicYear,AcademicTerm} from '../../src/core/domain/academic/AcademicYear';
import {ClassRoom,LearningArea,EducationLevel} from '../../src/core/domain/academic/ClassRoom';
import {SubjectTeacherAssignment} from '../../src/core/domain/academic/TeacherAssignment';
import {Strand,SubStrand} from '../../src/core/domain/cbc/CbcAssessment';
import {CBCGradeLevel} from '../../src/core/domain/user/Student';
import {Teacher} from '../../src/core/domain/user/Teacher';
import {User,UserRole,UserStatus} from '../../src/core/domain/user/User';
import {Timetable} from '../../src/core/domain/timetable/Timetable';
import {SchemeOfWork,SchemeStatus} from '../../src/core/domain/curriculum-plan/SchemeOfWork';
let c:AppContainer,app:any;
const admin={userId:'director-admin',email:'admin@example.test',schoolId:'director-school',role:UserRole.ADMIN};
const teacher={userId:'director-teacher',email:'teacher@example.test',schoolId:'director-school',role:UserRole.TEACHER};
const scope={academicYearId:'director-year',termId:'director-term3',classRoomId:'director-class',learningAreaId:'director-area'};
const content={specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:['Which is larger?'],learningExperiences:['Compare models'],learningResources:['Paper'],assessmentMethods:['Observation']};
const auth=(a=teacher)=>'Bearer '+c.tokenService.generateAccessToken(a);
const url=(path:string,s:any=scope)=>'/api/v1/curriculum/planning/'+path+'?'+new URLSearchParams(s);
const calendar=()=>c.calendarPlanning.saveCalendar(admin,scope,{guidedWorkflow:true,startDate:'2026-11-09',endDate:'2026-11-20',teachingDays:[1,2,3,4,5],exceptions:[],published:true},0);
const timetable=()=>c.timetableRepository.save(Timetable.create({...scope,schoolId:admin.schoolId,isActive:true,slots:[{id:'lesson',dayOfWeek:'MONDAY',periodNumber:1,startTime:'09:00',endTime:'09:40',learningAreaId:scope.learningAreaId,isBreak:false,isLunch:false}]},'director-timetable'));
const start=()=>c.planningWorkflow.decide(admin,scope,'FIRST_TERM','First term using SmartShule, starting in Term 3',0);
const save=()=>c.termAllocations.saveDraft(teacher,scope,[{subStrandId:'director-sub',lessons:2}],0);
async function approvedScheme(){await calendar();await timetable();await start();let p=await save();p=await c.termAllocations.submitCoverage(teacher,p.scheme.id,p.scheme.planningState!.revision);p=await c.termAllocations.prepareWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision);for(const entry of p.scheme.entries)p=await c.termAllocations.saveWeeklyLesson(teacher,p.scheme.id,entry.id,p.scheme.planningState!.revision,content);p=await c.termAllocations.submitWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision);await c.curriculumUseCases.reviewScheme(p.scheme.id,admin.userId,true,'Scheme approved',admin);return (await c.termAllocations.weekly(teacher,p.scheme.id));}
beforeEach(async()=>{
 c=new AppContainer();app=createExpressApp(c);
 await c.academicRepository.saveYear(AcademicYear.create({schoolId:admin.schoolId,name:'2026',startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:true},scope.academicYearId));
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:scope.academicYearId,name:'Term 3',termNumber:3,startDate:'2026-11-09',endDate:'2026-11-20',isCurrent:true},scope.termId));
 await c.academicRepository.saveClass(ClassRoom.create({schoolId:admin.schoolId,name:'Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},scope.classRoomId));
 await c.academicRepository.saveLearningArea(LearningArea.create({schoolId:admin.schoolId,name:'Mathematics',code:'MAT',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},scope.learningAreaId));
 for(const a of [teacher,admin])await c.userRepository.save(User.create({schoolId:a.schoolId,email:a.email,firstName:'Synthetic',lastName:a.role,passwordHash:'test-only',role:a.role,status:UserStatus.ACTIVE},a.userId));
 await c.teacherRepository.save(Teacher.create({userId:teacher.userId,employeeNumber:'DIRECTOR-1',specialization:[],assignedClassStreamIds:[]},'director-profile'));
 await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({...scope,schoolId:admin.schoolId,teacherId:'director-profile',role:'SUBJECT_TEACHER',effectiveFrom:'2020-01-01',isActive:true},'director-duty'));
 await c.CBCAssessmentRepository.saveStrand(Strand.create({learningAreaId:scope.learningAreaId,gradeLevel:CBCGradeLevel.GRADE_4,code:'N',title:'Numbers'},'director-strand'));
 await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({strandId:'director-strand',code:'F',title:'Fractions',specificLearningOutcomes:content.specificLearningOutcomes},'director-sub'));
});
it('names missing calendar and timetable, and teachers cannot configure the calendar or decide first use',async()=>{
 let r=await request(app).get(url('readiness')).set('Authorization',auth());expect(r.status).toBe(200);expect(r.body.data.nextAction.label).toBe('Create Coverage Plan');expect(r.body.data.calendarPublished).toBe(false);
 expect((await request(app).post(url('start')).set('Authorization',auth()).send({decision:'FIRST_TERM',reason:'Teacher should not decide this',revision:0})).status).toBe(403);
 await calendar();r=await request(app).get(url('readiness')).set('Authorization',auth());expect(r.body.data.timetableReady).toBe(false);expect(r.body.data.nextAction.label).toBe('Create Coverage Plan');expect(r.body.data.setupRequired).toMatch(/timetable/);
});
it('records explicit first use in Term 3 without creating placeholder schemes and preserves the first-use decision without fabricating previous schemes',async()=>{
 await calendar();await timetable();
 const result=await request(app).post(url('start',{academicYearId:scope.academicYearId,termId:scope.termId})).set('Authorization',auth(admin)).send({decision:'FIRST_TERM',reason:'School starts SmartShule in third term',revision:0});expect(result.status).toBe(200);expect(result.body.data.data.decidedBy).toBe(admin.userId);
 expect(await c.schemeOfWorkRepository.findAll()).toHaveLength(0);expect((await c.planningWorkflow.continuity(teacher,scope)).status).toBe('FIRST_TERM');expect((await save()).scheme.planningState?.allocations).toHaveLength(1);
});
it('prepares scheme lessons before calendar and timetable setup while keeping daily planning unavailable',async()=>{
 let p=await save();expect(p.setupRequired).toBeUndefined();expect(p.slots.length).toBeGreaterThan(0);expect(p.scheme.entries).toEqual([]);
 p=await c.termAllocations.submitCoverage(teacher,p.scheme.id,p.scheme.planningState!.revision);
 expect(p.scheme.planningState!.coverageReviewStatus).toBe('SAVED');
 p=await c.termAllocations.prepareWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision);
 expect(p.scheme.entries).toHaveLength(2);expect(p.scheme.entries.every(entry=>!entry.scheduledDate)).toBe(true);
 await expect(c.termAllocations.submitWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision)).rejects.toThrow('Complete at least one scheduled weekly lesson');
 await calendar();
 const state=await c.planningWorkflow.readiness(teacher,scope);
 expect(state.continuity.status).toBe('NEEDS_FIRST_TERM_DECISION');
 expect(state.continuity.canPlan).toBe(true);expect(state.continuity.requiresAdminFollowUp).toBe(true);
 expect(state.nextAction.tab).toBe('curriculum-tracker');
 expect(state.timetableReady).toBe(false);
 expect(await c.planningRepository.get(`smartshule-start:${teacher.schoolId}`)).toBeNull();
});
it('completes coverage and scheme review, uses an unapproved lesson plan, and records another session while earlier work awaits review',async()=>{
 const weekly=await approvedScheme();const lessons=weekly.weeks.flatMap((w:any)=>w.lessons);const first=lessons[0],second=lessons[1];
 const plan=await c.curriculumUseCases.createLessonPlan({...scope,teacherId:teacher.userId,schemeOfWorkEntryId:first.entry.id,lessonDate:first.date,lessonTime:`${first.startTime}-${first.endTime}`,durationMinutes:40,strand:'Numbers',subStrand:'Fractions',...content,coreCompetenciesAddressed:[],valuesAddressed:[],steps:[{stepNumber:1,stepTitle:'Development',durationMinutes:40,teacherActivities:'Model',learnerActivities:'Compare'}]},teacher);
 expect(plan.status).toBe('DRAFT');await c.curriculumUseCases.updateLessonPlanReflection(plan.id,'Learners compared fractions',teacher);
 const firstWork=await request(app).post(url('record-taught')).set('Authorization',auth()).send({lessonPlanId:plan.id,notes:'Compared concrete fraction models'});expect(firstWork.status).toBe(200);await c.recordOfWorkUseCases.submitDiaryEntry(firstWork.body.data.id,teacher);
 const secondWork=await request(app).post(url('record-taught')).set('Authorization',auth()).send({schemeId:weekly.scheme.id,schemeEntryId:second.entry.id,notes:'Compared and ordered fractions without a detailed plan'});expect(secondWork.status).toBe(200);expect(secondWork.body.data.planningLink.lessonPlanId).toBeUndefined();
 await c.recordOfWorkUseCases.submitDiaryEntry(secondWork.body.data.id,teacher);
 let progress=await c.termAllocations.weekly(teacher,weekly.scheme.id);expect(progress.weeks.flatMap((w:any)=>w.lessons).filter((l:any)=>l.statuses.reported)).toHaveLength(2);expect(progress.weeks.flatMap((w:any)=>w.lessons).filter((l:any)=>l.statuses.taught)).toHaveLength(0);
 await c.recordOfWorkUseCases.approveDiaryEntry(firstWork.body.data.id,{remarks:'Actual work confirmed'},admin);
 progress=await c.termAllocations.weekly(teacher,weekly.scheme.id);expect(progress.weeks.flatMap((w:any)=>w.lessons).filter((l:any)=>l.statuses.taught)).toHaveLength(1);
 expect((await c.recordOfWorkRepository.findById(secondWork.body.data.id))?.status).toBe('SUBMITTED');
 await c.recordOfWorkUseCases.approveDiaryEntry(secondWork.body.data.id,{remarks:'Repeated teaching evidence approved'},admin);
 expect((await c.termAllocations.weekly(teacher,weekly.scheme.id)).coverageSummary.confirmedOutcomes).toBe(1);
});
it('carries unfinished work from an approved earlier term into a draft and preserves the old scheme',async()=>{
 const previous={...scope,termId:'director-term2'};
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:scope.academicYearId,name:'Term 2',termNumber:2,startDate:'2026-05-01',endDate:'2026-08-01',isCurrent:false},previous.termId));
 await c.planningWorkflow.decide(admin,previous,'FIRST_TERM','School originally started SmartShule in Term 2',0);
 const old=SchemeOfWork.create({...previous,teacherId:teacher.userId,title:'Actual approved previous scheme',status:SchemeStatus.APPROVED,entries:[{id:'unfinished',weekNumber:1,lessonNumber:1,subStrandId:'director-sub',strandTitle:'Numbers',subStrandTitle:'Fractions',...content}]},'old-scheme');await c.schemeOfWorkRepository.save(old);const before=JSON.stringify(old.toJSON());
 await calendar();await timetable();const continuity=await c.planningWorkflow.continuity(teacher,scope);expect(continuity.status).toBe('PRIOR_APPROVED');expect(continuity.unfinishedEntries.map(e=>e.sourceEntryId)).toEqual(['unfinished']);
 const carried=await c.planningWorkflow.carryForward(teacher,scope,['unfinished'],0);expect(carried.scheme.planningState?.allocations[0].carriedFrom).toEqual([{schemeId:'old-scheme',entryId:'unfinished'}]);expect(JSON.stringify((await c.schemeOfWorkRepository.findById(old.id))!.toJSON())).toBe(before);
});
it('allows drafting with missing prior records while retaining administrator resolution and genuine history',async()=>{
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:scope.academicYearId,name:'Term 2',termNumber:2,startDate:'2026-05-01',endDate:'2026-08-01',isCurrent:false},'director-term2'));
 await c.planningWorkflow.decide(admin,{...scope,termId:'director-term2'},'FIRST_TERM','School began in Term 2',0);await calendar();await timetable();
 expect((await c.planningWorkflow.continuity(teacher,scope)).status).toBe('MISSING_PRIOR');const draft=await save();expect(draft.scheme.planningState?.coverageReviewStatus).toBe('SAVED');expect((await c.planningWorkflow.readiness(teacher,scope)).nextAction.label).toBe('Continue Scheme of Work');
 await c.planningWorkflow.decide(admin,scope,'MISSING_PRIOR','Prior paper scheme was not captured; academic head reviewed curriculum restart',0);
 expect((await c.planningWorkflow.continuity(teacher,scope)).status).toBe('RESOLVED');expect((await c.schemeOfWorkRepository.findAll()).every(s=>s.termId===scope.termId)).toBe(true);
});
it('holds teacher curriculum changes for admin approval and keeps published entries usable until reviewed',async()=>{
 const proposal:any=await c.CBCUseCases.createStrand({learningAreaId:scope.learningAreaId,gradeLevel:CBCGradeLevel.GRADE_4,code:'NEW',title:'Teacher proposed entry'},teacher);
 expect(proposal.reviewStatus).toBe('SUBMITTED');expect(await c.CBCAssessmentRepository.findStrandById(proposal.id)).toBeNull();
 const queue=await c.curriculumProposals.list(admin,scope.learningAreaId);await expect(c.curriculumProposals.review(teacher,scope.learningAreaId,proposal.id,queue.revision,true,'Teacher cannot approve')).rejects.toThrow('Only school leadership');
 const approved=await c.curriculumProposals.review(admin,scope.learningAreaId,proposal.id,queue.revision,true,'Validated against the school curriculum');expect(approved.proposals[0].status).toBe('APPROVED');expect(await c.CBCAssessmentRepository.findStrandById(approved.proposals[0].publishedId)).not.toBeNull();
});
it('rejects teacher-forged record approval and leadership review of unsubmitted drafts',async()=>{
 await expect(c.recordOfWorkUseCases.createDiaryEntry({schoolId:admin.schoolId,teacherId:'director-profile',classRoomId:scope.classRoomId,learningAreaId:scope.learningAreaId,status:'APPROVED'},teacher)).rejects.toThrow('Approval is a separate');
 const draft=await c.recordOfWorkUseCases.createDiaryEntry({schoolId:admin.schoolId,teacherId:'director-profile',classRoomId:scope.classRoomId,learningAreaId:scope.learningAreaId,lessonTopic:'Fractions',strand:'Numbers',status:'DRAFT'},teacher);
 await expect(c.recordOfWorkUseCases.approveDiaryEntry(draft.id,{},admin)).rejects.toThrow('Only submitted');
});

it('prepares 2027 timetables without changing 2026 or activating the future year',async()=>{
 await timetable();const before=JSON.stringify((await c.timetableRepository.findById('director-timetable'))!.toJSON());
 await c.academicRepository.saveYear(AcademicYear.create({schoolId:admin.schoolId,name:'2027',startDate:'2027-01-01',endDate:'2027-12-31',isCurrent:false},'director-2027'));
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:'director-2027',name:'Term 1 2027',termNumber:1,startDate:'2027-01-05',endDate:'2027-04-02',isCurrent:false},'director-2027-t1'));
 const body={schoolId:admin.schoolId,academicYearId:'director-2027',termId:'director-2027-t1',classRoomId:scope.classRoomId,slots:[]};
 const saved=await c.timetableUseCases.saveTimetableGrid(body);expect(saved.id).not.toBe('director-timetable');expect(saved.academicYearId).toBe('director-2027');
 expect(JSON.stringify((await c.timetableRepository.findById('director-timetable'))!.toJSON())).toBe(before);
 await expect(c.timetableUseCases.saveTimetableGrid({...body,timetableId:'director-timetable'})).rejects.toThrow('different class, stream or period');
 expect((await c.academicRepository.findCurrentYear(admin.schoolId))?.id).toBe(scope.academicYearId);
});

afterEach(()=>jest.useRealTimers());
it('allows assigned teachers to prepare 2027 coverage while 2026 remains operational and its records are unfinished',async()=>{
 jest.useFakeTimers({now:new Date('2026-11-16T10:00:00Z')});
 await start();await c.academicRepository.saveYear(AcademicYear.create({schoolId:admin.schoolId,name:'2027',startDate:'2027-01-01',endDate:'2027-12-31',isCurrent:false},'future-year'));
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:'future-year',termNumber:1,name:'Term 1 2027',startDate:'2027-01-05',endDate:'2027-04-02',isCurrent:false},'future-term'));
 const future={...scope,academicYearId:'future-year',termId:'future-term'};
 await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({...future,schoolId:admin.schoolId,teacherId:'director-profile',role:'SUBJECT_TEACHER',isActive:true,effectiveFrom:'2027-01-05'},'future-duty'));
 await c.calendarPlanning.saveCalendar(admin,future,{guidedWorkflow:true,startDate:'2027-01-05',endDate:'2027-04-02',teachingDays:[1,2,3,4,5],exceptions:[],published:true},0);
 const state=await c.planningWorkflow.continuity(teacher,future);expect(state.status).toBe('PRIOR_PENDING');expect(state.canPlan).toBe(true);
 const draft=await c.termAllocations.saveDraft(teacher,future,[{subStrandId:'director-sub',lessons:1}],0);expect(draft.scheme.academicYearId).toBe('future-year');expect(draft.scheme.entries).toEqual([]);expect((await c.academicRepository.findCurrentYear(admin.schoolId))?.id).toBe(scope.academicYearId);
});
it('shows both operational selections when year and flagged term disagree, without changing either',async()=>{
 await c.academicRepository.saveYear(AcademicYear.create({schoolId:admin.schoolId,name:'2027',startDate:'2027-01-01',endDate:'2027-12-31',isCurrent:false},'diagnostic-year'));
 const current=(await c.academicRepository.findTermById(scope.termId))!;current.setCurrent(false);await c.academicRepository.updateTerm(current);
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:'diagnostic-year',name:'Term 1 2027',termNumber:1,startDate:'2027-01-05',endDate:'2027-04-02',isCurrent:true},'diagnostic-term'));
 const r=await request(app).get(url('setup-context')).set('Authorization',auth(admin));expect(r.status).toBe(200);expect(r.body.data.disagreement).toBe(true);expect(r.body.data.currentYear.name).toBe('2026');expect(r.body.data.flaggedTerms[0].yearName).toBe('2027');
 expect((await c.academicRepository.findTermById(scope.termId))?.isCurrent).toBe(false);
});
it('keeps approved partial work distinct from completed coverage and permits follow-up on another scheduled session',async()=>{
 const weekly=await approvedScheme(),lessons=weekly.weeks.flatMap((w:any)=>w.lessons);
 const r=await request(app).post(url('record-taught')).set('Authorization',auth()).send({schemeId:weekly.scheme.id,schemeEntryId:lessons[0].entry.id,notes:'Children need more time with the fraction models',teachingStatus:'PARTIAL',outcomesCovered:[],remainingWork:'Continue comparing fractions next session'});expect(r.status).toBe(200);
 await c.recordOfWorkUseCases.submitDiaryEntry(r.body.data.id,teacher);await c.recordOfWorkUseCases.approveDiaryEntry(r.body.data.id,{remarks:'Partial actual work reviewed'},admin);
 const p=await c.termAllocations.weekly(teacher,weekly.scheme.id);expect(p.weeks[0].lessons[0].statuses.taught).toBe(false);expect(p.coverageSummary.confirmedOutcomes).toBe(0);
 const followup=await request(app).post(url('record-taught')).set('Authorization',auth()).send({schemeId:weekly.scheme.id,schemeEntryId:lessons[1].entry.id,notes:'Follow-up scheduled session completed'});expect(followup.status).toBe(200);
});

it('records postponement and reflection from syllabus tracking, then continues and teaches in another actual period',async()=>{
 const before=await approvedScheme();
 const first=before.weeks[0].lessons[0];
 const postponed=await request(app).post(url('record-taught')).set('Authorization',auth()).send({schemeId:before.scheme.id,schemeEntryId:first.entry.id,timetableSlotId:'2026-11-09:p1',actualDate:'2026-11-09',notes:'Children needed more concrete preparation',teachingStatus:'POSTPONED',outcomesCovered:[],remainingWork:'Continue with paper models',reflection:'Use smaller groups next time'});
 expect(postponed.status).toBe(200);
 await c.recordOfWorkUseCases.submitDiaryEntry(postponed.body.data.id,teacher);
 await c.recordOfWorkUseCases.approveDiaryEntry(postponed.body.data.id,{remarks:'Postponement acknowledged'},admin);
 let progress=await c.termAllocations.weekly(teacher,before.scheme.id);
 expect(progress.coverageSummary).toMatchObject({totalOutcomes:1,recordedOutcomes:0,confirmedOutcomes:0,confirmedPercent:0});
 expect(progress.weeks[0].lessons[0].statuses).toMatchObject({taught:false,reflection:true});
 const continuation=await request(app).post(`/api/v1/curriculum/schemes/${before.scheme.id}/sessions/continue?${new URLSearchParams(scope)}`).set('Authorization',auth()).send({revision:progress.scheme.planningState!.revision,subStrandId:'director-sub',reason:'Continue after postponement at the children’s pace'});
 expect(continuation.status).toBe(200);
 const added=continuation.body.data.scheme.entries.at(-1);
 expect(added.weekNumber).toBe(3);
 await c.termAllocations.submitWeekly(teacher,before.scheme.id,continuation.body.data.scheme.planningState.revision,[added.id]);
 await c.curriculumUseCases.reviewScheme(before.scheme.id,admin.userId,true,'Continuation approved',admin);
 const taught=await request(app).post(url('record-taught')).set('Authorization',auth()).send({schemeId:before.scheme.id,schemeEntryId:added.id,timetableSlotId:'2026-11-16:p1',actualDate:'2026-11-16',notes:'Compared paper models in smaller groups',teachingStatus:'COMPLETED',outcomesCovered:content.specificLearningOutcomes,reflection:'Concrete practice helped'});
 expect(taught.status).toBe(200);
 progress=await c.termAllocations.weekly(teacher,before.scheme.id);
 expect(progress.coverageSummary).toMatchObject({recordedOutcomes:1,confirmedOutcomes:0,recordedPercent:100});
 await c.recordOfWorkUseCases.submitDiaryEntry(taught.body.data.id,teacher);
 await c.recordOfWorkUseCases.approveDiaryEntry(taught.body.data.id,{remarks:'Learner work verified'},admin);
 progress=await c.termAllocations.weekly(teacher,before.scheme.id);
 expect(progress.coverageSummary).toMatchObject({confirmedOutcomes:1,confirmedPercent:100});
 expect(progress.scheme.entries.find((entry:any)=>entry.id===first.entry.id)).toEqual(before.scheme.entries.find((entry:any)=>entry.id===first.entry.id));
});

async function afterClassPlan(){
 const weekly=await approvedScheme();const lesson=weekly.weeks[0].lessons[0];
 const plan=await c.curriculumUseCases.createLessonPlan({...scope,teacherId:teacher.userId,schemeOfWorkEntryId:lesson.entry.id,lessonDate:lesson.date,lessonTime:`${lesson.startTime}-${lesson.endTime}`,durationMinutes:30,strand:'Numbers',subStrand:'Fractions',...content,coreCompetenciesAddressed:[],valuesAddressed:[],steps:[{stepNumber:1,stepTitle:'Development',durationMinutes:30,teacherActivities:'Model fractions',learnerActivities:'Compare paper models'}]},teacher);
 return {weekly,lesson,plan,endpoint:`/api/v1/curriculum/lesson-plans/${plan.id}/after-class`,body:{teachingStatus:'COMPLETED',actualDate:lesson.date,outcomesCovered:content.specificLearningOutcomes,notes:'Compared concrete models in small groups',reflection:'Children improved with concrete models',remainingWork:'Revisit comparisons in warm-ups'}};
}
it('saves an after-class copy, submits the plan and work once, and retains that copy after later reflection changes',async()=>{
 const {weekly,plan,endpoint,body}=await afterClassPlan();
 const result=await request(app).post(endpoint).set('Authorization',auth()).send(body);
 expect(result.status).toBe(200);
 expect(result.body.data.record.status).toBe('SUBMITTED');
 expect(result.body.data.lessonPlan).toMatchObject({status:'DRAFT',teacherSelfReflection:body.reflection});
 const copy=result.body.data.savedCopy;
 expect(copy).toMatchObject({id:plan.id,teacherSelfReflection:body.reflection,afterClassReport:{teachingStatus:'COMPLETED',notes:body.notes}});
 expect((await c.termAllocations.weekly(teacher,weekly.scheme.id)).coverageSummary).toMatchObject({reportedOutcomes:1,confirmedOutcomes:0});
 await c.curriculumUseCases.updateLessonPlanReflection(plan.id,'Later editable reflection',teacher);
 expect((await c.recordOfWorkRepository.findById(result.body.data.record.id))!.toJSON().reflectionData?.lessonPlanSnapshot).toEqual(copy);
 const retry=await request(app).post(endpoint).set('Authorization',auth()).send(body);
 expect(retry.status).toBe(200);expect(retry.body.data.record.id).toBe(result.body.data.record.id);expect(retry.body.data.savedCopy).toEqual(copy);
 expect((await c.recordOfWorkRepository.find({schoolId:admin.schoolId})).filter(r=>r.toJSON().planningLink?.lessonPlanId===plan.id)).toHaveLength(1);
 const inbox=await request(app).get('/api/v1/curriculum/records-of-work?status=SUBMITTED').set('Authorization',auth(admin));
 expect(inbox.status).toBe(200);expect(inbox.body.data.find((row:any)=>row.id===result.body.data.record.id).reflectionData.lessonPlanSnapshot).toEqual(copy);
 await c.recordOfWorkUseCases.approveDiaryEntry(result.body.data.record.id,{remarks:'Verified learner work'},admin);
 expect((await c.termAllocations.weekly(teacher,weekly.scheme.id)).coverageSummary.confirmedOutcomes).toBe(1);
 await c.recordOfWorkUseCases.updateDiaryEntry(result.body.data.record.id,{reflectionData:{remainingWork:'Administrative follow-up'}},admin);
 expect((await c.recordOfWorkRepository.findById(result.body.data.record.id))!.toJSON().reflectionData?.lessonPlanSnapshot).toEqual(copy);
});
it('submits an existing work draft with the after-class copy instead of creating another record',async()=>{
 const {plan,endpoint,body}=await afterClassPlan();
 const draft=await request(app).post(url('record-taught')).set('Authorization',auth()).send({lessonPlanId:plan.id,notes:body.notes});expect(draft.status).toBe(200);
 const result=await request(app).post(endpoint).set('Authorization',auth()).send(body);
 expect(result.status).toBe(200);expect(result.body.data.record.id).toBe(draft.body.data.id);expect(result.body.data.record.status).toBe('SUBMITTED');expect(result.body.data.savedCopy.id).toBe(plan.id);
});
it.each(['PARTIAL','POSTPONED'])('keeps %s after-class work unfinished without claiming taught outcomes',async teachingStatus=>{
 const {weekly,endpoint,body}=await afterClassPlan();
 const result=await request(app).post(endpoint).set('Authorization',auth()).send({...body,teachingStatus,outcomesCovered:[]});
 expect(result.status).toBe(200);expect(result.body.data.record.status).toBe('SUBMITTED');
 await c.recordOfWorkUseCases.approveDiaryEntry(result.body.data.record.id,{remarks:'Status acknowledged'},admin);
 const progress=await c.termAllocations.weekly(teacher,weekly.scheme.id);expect(progress.coverageSummary).toMatchObject({reportedOutcomes:0,confirmedOutcomes:0});expect(progress.weeks[0].lessons[0].statuses.taught).toBe(false);
});
it('rejects future teaching, incomplete reflections and another teacher before saving after-class evidence',async()=>{
 const {endpoint,body}=await afterClassPlan();
 expect((await request(app).post(endpoint).set('Authorization',auth()).send({...body,actualDate:'2099-01-01'})).status).toBe(400);
 expect((await request(app).post(endpoint).set('Authorization',auth()).send({...body,reflection:''})).status).toBe(400);
 const other={...teacher,userId:'other-teacher',email:'other@example.test'};
 await c.userRepository.save(User.create({schoolId:other.schoolId,email:other.email,firstName:'Other',lastName:'Teacher',passwordHash:'test-only',role:other.role,status:UserStatus.ACTIVE},other.userId));
 expect((await request(app).post(endpoint).set('Authorization',auth(other)).send(body)).status).toBe(403);
 expect(await c.recordOfWorkRepository.find({schoolId:admin.schoolId})).toHaveLength(0);
});

it('keeps the original after-class copy when an admin returns a report and the teacher resubmits a corrected copy',async()=>{
 const {endpoint,body}=await afterClassPlan();
 const first=await request(app).post(endpoint).set('Authorization',auth()).send(body);expect(first.status).toBe(200);
 await c.recordOfWorkUseCases.returnDiaryEntry(first.body.data.record.id,{reason:'Clarify the follow-up practice'},admin);
 const corrected=await request(app).post(endpoint).set('Authorization',auth()).send({...body,reflection:'Use concrete models and repeat guided practice',remainingWork:'Another guided session'});
 expect(corrected.status).toBe(200);expect(corrected.body.data.record.id).toBe(first.body.data.record.id);expect(corrected.body.data.record.status).toBe('SUBMITTED');
 expect(corrected.body.data.savedCopy.teacherSelfReflection).toBe('Use concrete models and repeat guided practice');
 expect(corrected.body.data.record.reflectionData.lessonPlanSnapshotHistory).toEqual([first.body.data.savedCopy]);
});

it('fetches optional timetable suggestions and saves manual lesson and after-class details when setup is absent',async()=>{
 const weekly=await approvedScheme();
 await c.timetableRepository.delete('director-timetable');
 await c.calendarPlanning.saveCalendar(admin,scope,{startDate:'2026-11-09',endDate:'2026-11-20',teachingDays:[1,2,3,4,5],exceptions:[],published:false},1);
 const first=weekly.weeks[0].lessons[0];
 const input={...scope,teacherId:teacher.userId,schemeOfWorkEntryId:first.entry.id,lessonDate:'2026-11-14',lessonTime:'10:00-10:25',durationMinutes:25,strand:'Numbers',subStrand:'Fractions',...content,coreCompetenciesAddressed:[],valuesAddressed:[],steps:[{stepNumber:1,stepTitle:'Practice',durationMinutes:25,teacherActivities:'Model',learnerActivities:'Compare'}]};
 const plan=await c.curriculumUseCases.createLessonPlan(input,teacher);expect(plan.lessonDate).toBe('2026-11-14');
 const result=await request(app).post(`/api/v1/curriculum/lesson-plans/${plan.id}/after-class`).set('Authorization',auth()).send({teachingStatus:'COMPLETED',actualDate:'2026-11-14',outcomesCovered:content.specificLearningOutcomes,notes:'Compared paper models in a catch-up session',reflection:'More time with models helped'});
 expect(result.status).toBe(200);expect(result.body.data.record.status).toBe('SUBMITTED');expect(result.body.data.record.planningLink.slotId).toMatch(/^manual:/);expect(result.body.data.savedCopy.lessonTime).toBe('10:00-10:25');
 const progress=await c.termAllocations.weekly(teacher,weekly.scheme.id);expect(progress.weeks[0].lessons[0].date).toBe('2026-11-14');expect(progress.coverageSummary.reportedOutcomes).toBe(1);
 await c.recordOfWorkUseCases.approveDiaryEntry(result.body.data.record.id,{remarks:'Manual teaching evidence verified'},admin);
 const workspace=await request(app).get(url('workspace')).set('Authorization',auth(admin));expect(workspace.status).toBe(200);expect(workspace.body.data.areas[0].coverage[0].lessons.find((lesson:any)=>lesson.date==='2026-11-14').statuses).toMatchObject({taught:true,reflection:true});
});
it('fetches subject timetable periods as suggestions even before the school calendar is published',async()=>{
 await timetable();
 const suggestions=await c.calendarPlanning.lessonSuggestions(teacher,scope);
 expect(suggestions.slots.map(slot=>slot.date)).toEqual(['2026-11-09','2026-11-16']);
});
