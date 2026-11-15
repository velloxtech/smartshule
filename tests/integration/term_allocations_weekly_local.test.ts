import request from 'supertest';
import { Strand,SubStrand } from '../../src/core/domain/cbc/CbcAssessment';
import { Pool,PoolClient } from 'pg';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { PostgresCBCAssessmentRepository,PostgresAcademicRepository,PostgresTeacherRepository,PostgresStudentRepository,PostgresUserRepository,PostgresSchemeOfWorkRepository,PostgresLessonPlanRepository,PostgresTimetableRepository,PostgresAttendanceRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
import { PostgresRecordOfWorkRepository } from '../../src/infrastructure/database/postgres/PostgresRecordOfWorkRepository';
import { PostgresCurriculumTrackerRepository } from '../../src/infrastructure/database/postgres/PostgresCurriculumTrackerRepository';
import { PostgresPlanningRepository } from '../../src/application/planning/PlanningRepository';
import { AcademicYear,AcademicTerm } from '../../src/core/domain/academic/AcademicYear';
import { ClassRoom,Stream,LearningArea,EducationLevel } from '../../src/core/domain/academic/ClassRoom';
import { ClassTeacherAssignment,SubjectTeacherAssignment } from '../../src/core/domain/academic/TeacherAssignment';
import { Teacher } from '../../src/core/domain/user/Teacher';
import { User,UserRole,UserStatus } from '../../src/core/domain/user/User';
import { Student,CBCGradeLevel,StudentGender,StudentStatus } from '../../src/core/domain/user/Student';
import { SchemeOfWork,SchemeStatus } from '../../src/core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../../src/core/domain/curriculum-plan/LessonPlan';
import { Timetable } from '../../src/core/domain/timetable/Timetable';
import { ClinicVisit } from '../../src/core/domain/health/ClinicVisit';
import { DisciplineIncident } from '../../src/core/domain/discipline/DisciplineIncident';
import { CurriculumTracker } from '../../src/core/domain/curriculum-tracker/CurriculumTracker';
const url=process.env.INVESTIGATION_DATABASE_URL;
if(url&&(!['localhost','127.0.0.1'].includes(new URL(url).hostname)||new URL(url).pathname!=='/smartshule_investigation'))throw new Error('This suite requires the isolated local investigation database.');
(url?describe:describe.skip)('Assignment authorization and calendar-driven whole-term planning (PostgreSQL)',()=>{
 let pool:Pool,client:PoolClient,c:AppContainer,app:any;
 const year='planning-year-2025',term='planning-term-2025-t3',schoolId='school-001',class2='planning-grade2',class3='planning-grade3',streamA='planning-g2-a',streamB='planning-g2-b',math='planning-g2-math',english='planning-g2-eng';
 const admin={userId:'planning-admin',role:UserRole.SUPER_ADMIN,schoolId},teacher={userId:'planning-teacher',role:UserRole.TEACHER,schoolId},subject={userId:'planning-subject',role:UserRole.TEACHER,schoolId},other={userId:'planning-other',role:UserRole.TEACHER,schoolId};
 const scope={schoolId,academicYearId:year,termId:term,classRoomId:class2,streamId:streamA,learningAreaId:math};
 const calendar={startDate:'2025-11-05',endDate:'2026-01-09',teachingDays:[1,2,3,4,5],published:true,exceptions:[{date:'2025-11-05',kind:'HOLIDAY' as const,reason:'School opening non-teaching day'}]};
 const query=(extra:any={})=>new URLSearchParams({...scope,...extra}).toString();
 const auth=(a:any)=>`Bearer ${c.tokenService.generateAccessToken(a)}`;
 const entry=(slot:any)=>({slotId:slot.id,weekNumber:slot.weekNumber,lessonNumber:slot.lessonNumber,strandTitle:'Numbers',subStrandTitle:'Fractions',specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:['How do fractions compare?'],learningExperiences:['Compare paper models'],learningResources:['Paper circles'],assessmentMethods:['Observe comparison']});
 const scheme=(entries:any[],owner=teacher.userId,area=math,cls=class2,id='')=>SchemeOfWork.create({teacherId:owner,learningAreaId:area,classRoomId:cls,streamId:cls===class2?streamA:undefined,academicYearId:year,termId:term,title:'Whole-term fixture',entries,status:SchemeStatus.DRAFT},id||'planning-scheme-'+Math.random());
 beforeAll(async()=>{
  pool=new Pool({connectionString:url});client=await pool.connect();await client.query('BEGIN');
  const connection=client as unknown as Pool;
  c=new AppContainer({CBCAssessmentRepository:new PostgresCBCAssessmentRepository(connection),academicRepository:new PostgresAcademicRepository(connection),teacherRepository:new PostgresTeacherRepository(connection),studentRepository:new PostgresStudentRepository(connection),userRepository:new PostgresUserRepository(connection),schemeOfWorkRepository:new PostgresSchemeOfWorkRepository(connection),lessonPlanRepository:new PostgresLessonPlanRepository(connection),timetableRepository:new PostgresTimetableRepository(connection),attendanceRepository:new PostgresAttendanceRepository(connection),recordOfWorkRepository:new PostgresRecordOfWorkRepository(connection),curriculumTrackerRepository:new PostgresCurriculumTrackerRepository(connection),planningRepository:new PostgresPlanningRepository(connection)});
  await client.query('UPDATE academic_years SET is_current=false');await client.query('UPDATE academic_terms SET is_current=false');
  await c.academicRepository.saveYear(AcademicYear.create({schoolId,name:'Planning fixture 2025',startDate:'2025-01-01',endDate:'2026-01-31',isCurrent:true},year));
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:year,termNumber:3,name:'Term 3',startDate:calendar.startDate,endDate:calendar.endDate,isCurrent:true},term));
  for(const [id,grade] of [[class2,CBCGradeLevel.GRADE_2],[class3,CBCGradeLevel.GRADE_3]] as const)await c.academicRepository.saveClass(ClassRoom.create({schoolId,name:id,gradeLevel:grade,educationLevel:EducationLevel.LOWER_PRIMARY},id));
  for(const id of [streamA,streamB])await c.academicRepository.saveStream(Stream.create({classRoomId:class2,name:id,capacity:30},id));
  for(const [id,grade] of [[math,CBCGradeLevel.GRADE_2],[english,CBCGradeLevel.GRADE_2],['planning-g3-math',CBCGradeLevel.GRADE_3]] as const)await c.academicRepository.saveLearningArea(LearningArea.create({schoolId,name:id,code:id,gradeLevel:grade,educationLevel:EducationLevel.LOWER_PRIMARY,isElective:false},id));
  for(const a of [admin,teacher,subject,other]){
   await c.userRepository.save(User.create({email:a.userId+'@local.invalid',passwordHash:'local-test-only',firstName:'Local',lastName:'Fixture',role:a.role,status:UserStatus.ACTIVE,schoolId},a.userId));
   if(a.role===UserRole.TEACHER)await c.teacherRepository.save(Teacher.create({userId:a.userId,employeeNumber:a.userId,specialization:[],assignedClassStreamIds:[]},a.userId+'-profile'));
  }
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({schoolId,academicYearId:year,classRoomId:class2,teacherId:teacher.userId+'-profile',isActive:true,effectiveFrom:'2025-01-01'},'planning-class-assignment'));
  for(const a of [subject,other])await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({schoolId,academicYearId:year,classRoomId:class2,streamId:streamA,learningAreaId:math,teacherId:a.userId+'-profile',role:'SUBJECT_TEACHER',isActive:true,effectiveFrom:'2025-01-01'},a.userId+'-assignment'));
  for(const [id,cls,stream,grade] of [['planning-student2',class2,streamA,CBCGradeLevel.GRADE_2],['planning-student2b',class2,streamB,CBCGradeLevel.GRADE_2],['planning-student3',class3,undefined,CBCGradeLevel.GRADE_3]] as const)await c.studentRepository.save(Student.create({schoolId,academicYearId:year,admissionNumber:id,firstName:'Anonymized',lastName:'Fixture',gradeLevel:grade,classroomId:cls,streamId:stream,dateOfBirth:'2018-01-01',gender:StudentGender.FEMALE,status:StudentStatus.ACTIVE,guardianIds:[]},id));
  const slots=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].flatMap(day=>[{id:day+'-math',dayOfWeek:day,periodNumber:1,startTime:'09:00',endTime:'09:40',learningAreaId:math,isBreak:false,isLunch:false},{id:day+'-eng',dayOfWeek:day,periodNumber:2,startTime:'10:00',endTime:'10:40',learningAreaId:english,isBreak:false,isLunch:false}]);
  await c.timetableRepository.save(Timetable.create({schoolId,academicYearId:year,termId:term,classRoomId:class2,streamId:streamA,isActive:true,slots},'planning-timetable'));
  await c.schemeOfWorkRepository.save(scheme([],teacher.userId,'planning-g3-math',class3,'planning-g3-owned'));
  await c.schemeOfWorkRepository.save(scheme([],other.userId,math,class2,'planning-other-private'));
  await c.schemeOfWorkRepository.save(scheme([],subject.userId,english,class2,'planning-other-area'));
  const plan=LessonPlan.create({teacherId:teacher.userId,classRoomId:class3,learningAreaId:'planning-g3-math',lessonDate:'2025-11-06',durationMinutes:40,strand:'Numbers',subStrand:'Fractions',specificLearningOutcomes:['Compare'],keyInquiryQuestions:['How?'],coreCompetenciesAddressed:[],valuesAddressed:[],learningResources:['Paper'],steps:[]},'planning-g3-plan');await c.lessonPlanRepository.save(plan);
  await c.lessonPlanRepository.save(LessonPlan.create({...plan.toJSON(),classRoomId:class2,streamId:streamA,learningAreaId:math},'planning-unlinked-plan'));
  await c.recordOfWorkRepository.create({id:'planning-g3-record',schoolId,teacherId:teacher.userId,academicYearId:year,termId:term,classRoomId:class3,learningAreaId:'planning-g3-math',lessonDate:'2025-11-06',weekNumber:1,day:'Thu',subjectAndGrade:'Grade 3 Maths',strandAndWorkCovered:'Numbers',reference:'Fixture',status:'DRAFT'} as any);
  await c.curriculumTrackerRepository.save(CurriculumTracker.create({schoolId,teacherId:teacher.userId,teacherName:'Fixture',classRoomId:class3,className:'Grade 3',learningAreaId:'planning-g3-math',subjectName:'Maths',academicYear:year,term,totalWeeks:10,items:[],status:'ACTIVE'} as any,'planning-g3-tracker'));
  for(const [id,area]of [['allocation-numbers',math],['allocation-measures',math],['allocation-english',english]]){
   await c.CBCAssessmentRepository.saveStrand(Strand.create({learningAreaId:area,gradeLevel:CBCGradeLevel.GRADE_2,code:id,title:id},id));
   for(const suffix of ['a','b'])await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({strandId:id,code:id+suffix,title:id+' '+suffix,specificLearningOutcomes:['Compare equal parts'],suggestedExperiences:['Use paper models']},id+'-'+suffix));
  }
  await c.CBCAssessmentRepository.saveStrand(Strand.create({learningAreaId:english,gradeLevel:CBCGradeLevel.GRADE_2,code:math,title:'Foreign subject strand'},'allocation-foreign-code'));
  await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({strandId:'allocation-foreign-code',code:'foreign-sub',title:'Foreign content',specificLearningOutcomes:['Different learning area']},'allocation-foreign-sub'));
  await c.calendarPlanning.saveCalendar(admin,scope,calendar,0);
  await c.calendarPlanning.saveSequence(admin,scope,{enabled:true,learningAreaIds:[math,english]},0);
  app=createExpressApp(c);
 },30000);
 afterAll(async()=>{if(client){await client.query('ROLLBACK');client.release();}if(pool)await pool.end();});
 let planId:string,revision=0;
 const allocation=(lessons:number,slotIds?:string[])=>[{subStrandId:'allocation-numbers-a',lessons,slotIds,specificLearningOutcomes:['Compare equal fractions'],keyInquiryQuestions:['How can we compare?'],learningExperiences:['Compare paper models'],learningResources:['Paper'],assessmentMethods:['Observe explanations']}];
 const put=async(lessons:number,slotIds?:string[])=>request(app).put('/api/v1/curriculum/planning/allocations?'+query()).set('Authorization',auth(teacher)).send({schemeId:planId,revision,allocations:allocation(lessons,slotIds)});
 it('requires a published calendar and matching class timetable before drafting',async()=>{
  await c.calendarPlanning.saveCalendar(admin,scope,{...calendar,published:false},1);
  expect((await put(46)).status).toBe(409);
  await c.calendarPlanning.saveCalendar(admin,scope,calendar,2);
  const missing=await request(app).put('/api/v1/curriculum/planning/allocations?'+query({streamId:streamB})).set('Authorization',auth(teacher)).send({revision:0,allocations:allocation(46)});expect(missing.status).toBe(409);
 });
 it('saves below and above capacity without inventing teaching periods; catalogue coverage may be a subset',async()=>{
  expect((await request(app).get('/api/v1/curriculum/planning/catalogue?'+query({learningAreaId:english})).set('Authorization',auth(teacher))).status).toBe(409);
  const catalogue=(await request(app).get('/api/v1/curriculum/planning/catalogue?'+query()).set('Authorization',auth(teacher))).body.data;
  expect(catalogue).toHaveLength(2);expect(catalogue.find((s:any)=>s.id==='allocation-numbers').subStrands[0].suggestedExperiences).toEqual(['Use paper models']);
  const foreign=await request(app).put('/api/v1/curriculum/planning/allocations?'+query()).set('Authorization',auth(teacher)).send({revision:0,allocations:[{subStrandId:'allocation-foreign-sub',lessons:47}]});expect(foreign.status).toBe(400);
  const below=await put(46);expect(below.status).toBe(200);planId=below.body.data.scheme.id;revision=below.body.data.scheme.planningState.revision;
  expect(below.body.data.progress).toMatchObject({allocatedLessons:46,availableSlots:47,remaining:1,includedStrands:1,availableStrands:2,includedSubStrands:1,availableSubStrands:4});
  expect((await request(app).post('/api/v1/curriculum/schemes/'+planId+'/finalize?'+query()).set('Authorization',auth(teacher)).send({revision})).status).toBe(400);
  const above=await put(48);expect(above.status).toBe(200);revision=above.body.data.scheme.planningState.revision;expect(above.body.data.progress.excess).toBe(1);
  expect((await c.calendarPlanning.slots(teacher,scope)).slots).toHaveLength(47);
  expect((await request(app).post('/api/v1/curriculum/schemes/'+planId+'/finalize?'+query()).set('Authorization',auth(teacher)).send({revision})).status).toBe(400);
 });
 it('rejects duplicate and cancelled slot assignments even with matching counts',async()=>{
  const ids=(await c.calendarPlanning.slots(teacher,scope)).slots.map(s=>s.id);
  let r=await put(47,[...ids.slice(0,46),ids[0]]);expect(r.status).toBe(200);revision=r.body.data.scheme.planningState.revision;
  let finalized=await request(app).post('/api/v1/curriculum/schemes/'+planId+'/finalize?'+query()).set('Authorization',auth(teacher)).send({revision});expect(finalized.status).toBe(400);expect(finalized.body.message).toMatch(/Duplicate|cancelled/);
  r=await put(47,[...ids.slice(0,46),'2025-11-05:p1']);revision=r.body.data.scheme.planningState.revision;
  finalized=await request(app).post('/api/v1/curriculum/schemes/'+planId+'/finalize?'+query()).set('Authorization',auth(teacher)).send({revision});expect(finalized.status).toBe(400);
 });
 it('rejects incomplete lesson content despite an exact allocation count',async()=>{
  const incomplete=allocation(47);incomplete[0].assessmentMethods=[];
  const r=await request(app).put('/api/v1/curriculum/planning/allocations?'+query()).set('Authorization',auth(teacher)).send({schemeId:planId,revision,allocations:incomplete});expect(r.status).toBe(200);revision=r.body.data.scheme.planningState.revision;
  const finalized=await request(app).post('/api/v1/curriculum/schemes/'+planId+'/finalize?'+query()).set('Authorization',auth(teacher)).send({revision});expect(finalized.status).toBe(400);expect(finalized.body.message).toContain('content');
 });
 it('combines multiple curriculum sub-strands into shared slots without double-counting lessons',async()=>{
  const merged:any[]=allocation(47);merged[0].combinedSubStrandIds=['allocation-numbers-b'];
  const response=await request(app).put('/api/v1/curriculum/planning/allocations?'+query()).set('Authorization',auth(teacher)).send({schemeId:planId,revision,allocations:merged});expect(response.status).toBe(200);revision=response.body.data.scheme.planningState.revision;
  expect(response.body.data.progress).toMatchObject({includedSubStrands:2,allocatedLessons:47,availableSlots:47});
  const finalized=await c.termAllocations.finalize(teacher,planId,revision);revision++;
  expect(finalized.validation.complete).toBe(true);expect(finalized.scheme.entries.filter(e=>!e.archivedAt)).toHaveLength(47);expect(finalized.scheme.entries[0].combinedSubStrandIds).toEqual(['allocation-numbers-b']);
  expect(finalized.scheme.entries[0].subStrandTitle).toContain('allocation-numbers a + allocation-numbers b');
  const weekly=await c.termAllocations.weekly(teacher,planId);expect(weekly.weeks.reduce((n,w)=>n+w.lessons.length,0)).toBe(47);
  await c.termAllocations.reopen(teacher,planId,revision,'Separate shared lessons for the next allocation draft');revision++;
 });
 it('locks an exact valid subset plan, blocks all allocation edits and unlocks the next learning area',async()=>{
  const r=await put(47);revision=r.body.data.scheme.planningState.revision;
  const locked=await request(app).post('/api/v1/curriculum/schemes/'+planId+'/finalize?'+query()).set('Authorization',auth(teacher)).send({revision});expect(locked.status).toBe(200);revision=locked.body.data.scheme.planningState.revision;
  expect(locked.body.data.savedPlanLocked).toBe(true);expect(locked.body.data.validation.complete).toBe(true);expect(locked.body.data.progress.includedSubStrands).toBe(1);
  expect((await put(46)).status).toBe(409);
  const first=(await c.schemeOfWorkRepository.findById(planId))!.entries[0];
  expect((await request(app).put('/api/v1/curriculum/schemes/'+planId+'/entries/'+first.id+'?'+query()).set('Authorization',auth(teacher)).send(entry((await c.calendarPlanning.slots(teacher,scope)).slots[0]))).status).toBe(400);
  await expect(c.curriculumUseCases.deleteScheme(planId,teacher)).rejects.toThrow(/Reopen|reopen/);
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).resolves.toBeUndefined();
 });
 it('prevents a parallel legacy scheme or ownership alias from bypassing the saved-area lock',async()=>{
  const current=(await c.schemeOfWorkRepository.findById(planId))!;const legacy=scheme(current.entries.filter(e=>!e.archivedAt).map(e=>({...e,id:'legacy-'+e.id})),teacher.userId+'-profile',math,class2,'planning-parallel');legacy.submit();await c.schemeOfWorkRepository.save(legacy);
  expect((await request(app).post('/api/v1/curriculum/schemes').set('Authorization',auth(teacher)).send({...scope,teacherId:teacher.userId,title:'Bypass attempt',entries:[]})).status).toBe(400);
  const response=await request(app).put('/api/v1/curriculum/planning/allocations?'+query()).set('Authorization',auth(teacher)).send({schemeId:'planning-parallel',revision:0,allocations:allocation(47)});expect(response.status).toBe(400);
  await expect(c.curriculumUseCases.addEntryToScheme('planning-parallel',entry((await c.calendarPlanning.slots(teacher,scope)).slots[0]),teacher)).rejects.toThrow('Locked');
  expect((await request(app).get('/api/v1/curriculum/planning/catalogue?'+query({learningAreaId:english})).set('Authorization',auth(teacher))).status).toBe(200);
  expect((await request(app).get('/api/v1/curriculum/planning/catalogue?'+query({learningAreaId:english})).set('Authorization',auth(subject))).status).toBe(403);
 });
 let lessonId:string;
 it('weekly cards follow shortened/full weeks and independently track planning, teaching and reflection while locked',async()=>{
  let weekly=(await request(app).get('/api/v1/curriculum/schemes/'+planId+'/weekly?'+query()).set('Authorization',auth(teacher))).body.data;
  expect(weekly.weeks[0]).toMatchObject({startDate:'2025-11-06',endDate:'2025-11-07'});expect(weekly.weeks[0].lessons.map((l:any)=>l.date)).toEqual(['2025-11-06','2025-11-07']);expect(weekly.weeks[1].lessons.map((l:any)=>l.lessonNumber)).toEqual([1,2,3,4,5]);
  const first=weekly.weeks[0].lessons[0];expect(first.statuses).toEqual({planned:false,taught:false,reflection:false});
  const p=await c.curriculumUseCases.createLessonPlan({teacherId:teacher.userId,classRoomId:class2,streamId:streamA,learningAreaId:math,schemeOfWorkEntryId:first.entry.id,lessonDate:first.date,durationMinutes:40,strand:first.entry.strandTitle,subStrand:first.entry.subStrandTitle,specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:['How?'],coreCompetenciesAddressed:[],valuesAddressed:[],learningResources:['Paper'],steps:[{stepNumber:1,stepTitle:'Development',durationMinutes:40,teacherActivities:'Demonstrate paper models',learnerActivities:'Compare equal parts'}]},teacher);lessonId=p.id;
  weekly=await c.termAllocations.weekly(teacher,planId);expect(weekly.weeks[0].lessons[0].statuses).toEqual({planned:true,taught:false,reflection:false});
  const reflected=await request(app).put('/api/v1/curriculum/lesson-plans/'+lessonId+'/reflection?'+query()).set('Authorization',auth(teacher)).send({reflection:'Learners explained the equal parts.'});expect(reflected.status).toBe(200);
  weekly=await c.termAllocations.weekly(teacher,planId);expect(weekly.weeks[0].lessons[0].statuses).toEqual({planned:true,taught:false,reflection:true});
  const taught=await request(app).post('/api/v1/curriculum/planning/record-taught?'+query()).set('Authorization',auth(teacher)).send({lessonPlanId:lessonId,notes:'Compared paper models and explained equal fractions.'});expect(taught.status).toBe(200);
  weekly=await c.termAllocations.weekly(teacher,planId);expect(weekly.weeks[0].lessons[0].statuses).toEqual({planned:true,taught:true,reflection:true});
  await c.curriculumUseCases.updateLessonPlanReflection(lessonId,'',teacher);
  weekly=await c.termAllocations.weekly(teacher,planId);expect(weekly.weeks[0].lessons[0].statuses).toEqual({planned:true,taught:true,reflection:false});
 });
 it('exports real PDF and Word through the same authorization, and denies Grade 3 and another owner',async()=>{
  for(const format of ['pdf','doc']){
   const exported=await request(app).get('/api/v1/curriculum/schemes/'+planId+'/weekly/export?'+query({format})).set('Authorization',auth(teacher));expect(exported.status).toBe(200);expect(exported.headers['content-type']).toContain(format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
   for(const id of ['planning-g3-owned','planning-other-private'])expect((await request(app).get('/api/v1/curriculum/schemes/'+id+'/weekly/export?'+query({format})).set('Authorization',auth(teacher))).status).toBe(403);
  }
  expect((await request(app).get('/api/v1/curriculum/schemes/'+planId+'/weekly?'+query()).set('Authorization',auth(subject))).status).toBe(403);
 });
 it('requires explicit authorized reopen with reason, records history and relocks the next area',async()=>{
  expect((await request(app).post('/api/v1/curriculum/schemes/'+planId+'/reopen?'+query()).set('Authorization',auth(other)).send({revision,reason:'Not my plan'})).status).toBe(403);
  const opened=await request(app).post('/api/v1/curriculum/schemes/'+planId+'/reopen?'+query()).set('Authorization',auth(teacher)).send({revision,reason:'Rebalance term allocations'});expect(opened.status).toBe(200);revision=opened.body.data.scheme.planningState.revision;
  expect(opened.body.data.savedPlanLocked).toBe(false);expect(opened.body.data.scheme.planningState.history.at(-1)).toMatchObject({action:'REOPENED',actorId:teacher.userId,reason:'Rebalance term allocations'});
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).rejects.toThrow('Locked');
  const oldRevision=revision;const draft=await put(47);revision=draft.body.data.scheme.planningState.revision;
  expect((await request(app).post('/api/v1/curriculum/schemes/'+planId+'/finalize?'+query()).set('Authorization',auth(teacher)).send({revision:oldRevision})).status).toBe(409);
  await c.termAllocations.finalize(teacher,planId,revision);revision++;
 });
 it('flags calendar changes after locking without deleting linked taught records; supports multiple periods',async()=>{
  const old=(await c.schemeOfWorkRepository.findById(planId))!;const ids=old.entries.map(e=>e.id);
  await c.calendarPlanning.saveCalendar(admin,scope,{...calendar,exceptions:[...calendar.exceptions,{date:'2025-11-06',kind:'ACTIVITY',reason:'Morning cancelled',periodNumbers:[1]}]},(await c.calendarPlanning.calendar(admin,scope))!.revision);
  const changed=await c.termAllocations.describe(teacher,(await c.schemeOfWorkRepository.findById(planId))!);expect(changed.scheduleChanged).toBe(true);expect(changed.savedPlanLocked).toBe(true);expect(changed.progress.availableSlots).toBe(46);expect(changed.validation.conflicts.length).toBeGreaterThan(0);
  expect((await c.schemeOfWorkRepository.findById(planId))!.entries.map(e=>e.id)).toEqual(ids);
  const taught=await c.recordOfWorkRepository.find({schoolId});expect(taught.some(r=>r.toJSON().planningLink?.lessonPlanId===lessonId)).toBe(true);
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).rejects.toThrow('Locked');
  expect((await put(46)).status).toBe(409);
  await c.termAllocations.reopen(teacher,planId,revision,'Reschedule after calendar cancellation');revision++;
  const revised=await put(46);expect(revised.status).toBe(200);revision=revised.body.data.scheme.planningState.revision;
  const finalized=await c.termAllocations.finalize(teacher,planId,revision);revision++;
  expect(finalized.progress.allocatedLessons).toBe(46);expect(finalized.validation.complete).toBe(true);
  expect(finalized.scheme.entries.find(e=>e.id===old.entries[0].id)?.archivedAt).toBeTruthy();
  expect((await c.lessonPlanRepository.findById(lessonId))!.toJSON().lessonDate).toBe('2025-11-06');
  const timetable=(await c.timetableRepository.findById('planning-timetable'))!;timetable.addOrUpdateSlot({id:'monday-second',dayOfWeek:'MONDAY',periodNumber:3,startTime:'13:00',endTime:'13:40',learningAreaId:math,isBreak:false,isLunch:false});await c.timetableRepository.update(timetable);
  const weekly=await c.termAllocations.weekly(teacher,planId);expect(weekly.weeks[1].lessons.filter((l:any)=>l.date==='2025-11-10').map((l:any)=>l.lessonNumber)).toEqual([1,2]);
 });
});
