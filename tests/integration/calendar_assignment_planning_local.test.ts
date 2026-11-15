import request from 'supertest';
import { Pool,PoolClient } from 'pg';
import { AppContainer } from '../../src/infrastructure/container';
import { createExpressApp } from '../../src/infrastructure/http/app';
import { PostgresAcademicRepository,PostgresTeacherRepository,PostgresStudentRepository,PostgresUserRepository,PostgresSchemeOfWorkRepository,PostgresLessonPlanRepository,PostgresTimetableRepository,PostgresAttendanceRepository } from '../../src/infrastructure/database/postgres/PostgresRepositories';
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
  c=new AppContainer({academicRepository:new PostgresAcademicRepository(connection),teacherRepository:new PostgresTeacherRepository(connection),studentRepository:new PostgresStudentRepository(connection),userRepository:new PostgresUserRepository(connection),schemeOfWorkRepository:new PostgresSchemeOfWorkRepository(connection),lessonPlanRepository:new PostgresLessonPlanRepository(connection),timetableRepository:new PostgresTimetableRepository(connection),attendanceRepository:new PostgresAttendanceRepository(connection),recordOfWorkRepository:new PostgresRecordOfWorkRepository(connection),curriculumTrackerRepository:new PostgresCurriculumTrackerRepository(connection),planningRepository:new PostgresPlanningRepository(connection)});
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
  app=createExpressApp(c);
 },30000);
 afterAll(async()=>{if(client){await client.query('ROLLBACK');client.release();}if(pool)await pool.end();});
 it('returns Grade 4 learners and all class subjects from an active class assignment without a legacy stream cache',async()=>{
  const cls='planning-grade4', area='planning-g4-math', eng='planning-g4-eng', userId='planning-g4-teacher';
  await c.academicRepository.saveClass(ClassRoom.create({schoolId,name:'Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},cls));
  for(const id of ['planning-g4-a','planning-g4-b'])await c.academicRepository.saveStream(Stream.create({classRoomId:cls,name:id,capacity:30},id));
  for(const id of [area,eng])await c.academicRepository.saveLearningArea(LearningArea.create({schoolId,name:id,code:id,gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},id));
  await c.userRepository.save(User.create({email:userId+'@local.invalid',passwordHash:'fixture',firstName:'Fixture',lastName:'Teacher',role:UserRole.TEACHER,status:UserStatus.ACTIVE,schoolId},userId));
  await c.teacherRepository.save(Teacher.create({userId,employeeNumber:userId,specialization:[],assignedClassStreamIds:[]},userId+'-profile'));
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({schoolId,academicYearId:year,classRoomId:cls,teacherId:userId+'-profile',isActive:true,effectiveFrom:'2025-01-01'},'planning-g4-assignment'));
  // Another teacher teaching Maths must not hide it from the class teacher's overview.
  await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({schoolId,academicYearId:year,classRoomId:cls,streamId:'planning-g4-a',learningAreaId:area,teacherId:other.userId+'-profile',role:'SUBJECT_TEACHER',isActive:true,effectiveFrom:'2025-01-01'},'planning-g4-subject'));
  await c.studentRepository.save(Student.create({schoolId,academicYearId:year,admissionNumber:'planning-g4-learner',firstName:'Anonymous',lastName:'Learner',gradeLevel:CBCGradeLevel.GRADE_4,classroomId:cls,streamId:'planning-g4-a',dateOfBirth:'2016-01-01',gender:StudentGender.FEMALE,status:StudentStatus.ACTIVE,guardianIds:[]},'planning-g4-learner'));
  const actor={userId,role:UserRole.TEACHER,schoolId};
  const url='/api/v1/academics/teacher/authorized-context?academicYearId='+year+'&termId='+term;
  const r=await request(app).get(url).set('Authorization',auth(actor));expect(r.status).toBe(200);
  expect(r.body.data.assignedClasses.map((x:any)=>x.id)).toEqual([cls]);
  expect(r.body.data.assignedClasses[0].wholeClass).toBe(true);
  expect(r.body.data.assignedClasses[0].streams).toHaveLength(2);
  expect(r.body.data.authorizedSubjectsByClass[cls].map((x:any)=>x.id)).toEqual(expect.arrayContaining([eng,area]));
  expect(r.body.data.authorizedSubjectsByClass[cls].every((x:any)=>x.gradeLevel==='GRADE_4')).toBe(true);
  const learners=await request(app).get('/api/v1/students?classroomId='+cls+'&academicYearId='+year+'&termId='+term).set('Authorization',auth(actor));
  expect(learners.status).toBe(200);expect(learners.body.data.map((x:any)=>x.id)).toEqual(['planning-g4-learner']);
  expect((await request(app).get('/api/v1/students/planning-g4-learner').set('Authorization',auth(actor))).status).toBe(200);
  expect((await request(app).get('/api/v1/students/planning-student3').set('Authorization',auth(actor))).status).toBe(403);
  expect((await request(app).get('/api/v1/attendance/daily?streamId=planning-g4-a&date=2025-11-06').set('Authorization',auth(actor))).status).toBe(200);
  expect((await request(app).get('/api/v1/attendance/daily?streamId='+streamA+'&date=2025-11-06').set('Authorization',auth(actor))).status).toBe(403);
  const limited=await request(app).get(url).set('Authorization',auth(other));expect(limited.status).toBe(200);
  const grade4=limited.body.data.assignedClasses.find((x:any)=>x.id===cls);
  expect(grade4.wholeClass).toBe(false);expect(grade4.streams.map((x:any)=>x.id)).toEqual(['planning-g4-a']);
  expect(grade4.subjectsByStream['planning-g4-a'].map((x:any)=>x.id)).toEqual([area]);
  expect(grade4.subjectsByStream['']).toBeUndefined();
  // Expired assignments and stale legacy cache must not restore access.
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({schoolId,academicYearId:year,classRoomId:class3,teacherId:userId+'-profile',isActive:true,effectiveFrom:'2025-01-01',effectiveTo:'2025-06-01'},'planning-g4-expired'));
  await c.teacherRepository.save(Teacher.create({userId,employeeNumber:userId,specialization:[],assignedClassStreamIds:[streamB]},userId+'-profile'));
  const after=await request(app).get(url).set('Authorization',auth(actor));expect(after.status).toBe(200);expect(after.body.data.assignedClasses.map((x:any)=>x.id)).toEqual([cls]);
  expect((await request(app).get(url.replace(term,'invalid-term')).set('Authorization',auth(actor))).status).toBe(403);
 });
 it('reflects an administrator assignment in the next teacher request and revokes it on reassignment',async()=>{
  const cls='planning-admin-class',stream='planning-admin-stream';
  await c.academicRepository.saveClass(ClassRoom.create({schoolId,name:'Admin assigned Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},cls));
  await c.academicRepository.saveStream(Stream.create({classRoomId:cls,name:'A',capacity:30},stream));
  const contextUrl='/api/v1/academics/teacher/authorized-context?academicYearId='+year+'&termId='+term;
  const before=await request(app).get(contextUrl).set('Authorization',auth(other));expect(before.body.data.assignedClasses.some((x:any)=>x.id===cls)).toBe(false);
  const payload={schoolId,academicYearId:year,classRoomId:cls,streamId:stream,teacherId:other.userId+'-profile',effectiveFrom:'2025-11-06'};
  const saved=await request(app).post('/api/v1/academics/class-teacher').set('Authorization',auth(admin)).send(payload);expect(saved.status).toBe(201);expect(saved.body.data.academicYearId).toBe(year);
  const after=await request(app).get(contextUrl).set('Authorization',auth(other));expect(after.status).toBe(200);expect(after.body.data.assignedClasses.find((x:any)=>x.id===cls).streams.map((x:any)=>x.id)).toEqual([stream]);
  const second=await request(app).post('/api/v1/academics/class-teacher').set('Authorization',auth(admin)).send({...payload,teacherId:subject.userId+'-profile'});expect(second.status).toBe(201);
  const revoked=await request(app).get(contextUrl).set('Authorization',auth(other));expect(revoked.body.data.assignedClasses.some((x:any)=>x.id===cls)).toBe(false);
  expect((await c.academicRepository.findClassTeacherAssignments({classRoomId:cls,academicYearId:year})).some(a=>!a.isActive&&a.teacherId===other.userId+'-profile')).toBe(true);
  // Clean up this test's assignment so later subject-only cases remain subject-only.
  const active=await c.academicRepository.findClassTeacherAssignments({classRoomId:cls,isActive:true});for(const a of active){a.deactivate('2025-11-07');await c.academicRepository.saveClassTeacherAssignment(a);}
 });
 it('reproduces the original repositories returning Grade 3 work, then denies lists, direct IDs, filters and exports',async()=>{
  expect((await c.schemeOfWorkRepository.findById('planning-g3-owned'))?.classRoomId).toBe(class3);
  for(const path of ['/curriculum/schemes/planning-g3-owned','/curriculum/schemes/planning-g3-owned/export','/curriculum/schemes/planning-g3-owned/print','/curriculum/lesson-plans/planning-g3-plan','/curriculum/lesson-plans/planning-g3-plan/export'])expect((await request(app).get('/api/v1'+path+'?'+query()).set('Authorization',auth(teacher))).status).toBe(403);
  const list=await request(app).get('/api/v1/curriculum/schemes?'+query({learningAreaId:''})).set('Authorization',auth(teacher));expect(list.status).toBe(200);expect(list.body.data.some((r:any)=>r.classRoomId===class3)).toBe(false);
  expect((await request(app).get('/api/v1/curriculum/schemes?'+query({classRoomId:class3,learningAreaId:'planning-g3-math'})).set('Authorization',auth(teacher))).status).toBe(403);
  expect((await request(app).post('/api/v1/curriculum/schemes').set('Authorization',auth(teacher)).send({...scope,classRoomId:class3,learningAreaId:'planning-g3-math',teacherId:teacher.userId,title:'Forbidden',entries:[]})).status).toBe(403);
 });
 it('denies another teacher’s records, another learning area and an unassigned stream while allowing learners for teaching',async()=>{
  for(const id of ['planning-other-private','planning-other-area'])expect((await request(app).get(`/api/v1/curriculum/schemes/${id}?${query()}`).set('Authorization',auth(subject))).status).toBe(403);
  expect((await request(app).get('/api/v1/curriculum/lesson-plans/planning-unlinked-plan?'+query()).set('Authorization',auth(teacher))).status).toBe(403);
  expect((await request(app).get('/api/v1/curriculum/lesson-plans/planning-unlinked-plan?'+query()).set('Authorization',auth(admin))).status).toBe(200);
  expect((await request(app).get('/api/v1/students/planning-student3?'+query()).set('Authorization',auth(teacher))).status).toBe(403);
  expect((await request(app).get('/api/v1/students/planning-student2b?'+query()).set('Authorization',auth(subject))).status).toBe(403);
  expect((await request(app).get('/api/v1/students/planning-student2?'+query()).set('Authorization',auth(subject))).status).toBe(200);
  expect((await request(app).get('/api/v1/curriculum/schemes/planning-other-private?'+query()).set('Authorization',auth(admin))).status).toBe(200);
 });
 it('protects coverage and teaching records on reads, edits, mixed-case paths and searches',async()=>{
  for(const path of ['/curriculum/records-of-work/planning-g3-record','/CuRRiCuLUm/records-of-work/planning-g3-record','/curriculum-tracker/planning-g3-tracker','/syllabus-coverage/planning-g3-tracker'])expect((await request(app).get('/api/v1'+path+'?'+query()).set('Authorization',auth(teacher))).status).toBe(403);
  expect((await request(app).put('/api/v1/curriculum/records-of-work/planning-g3-record?'+query()).set('Authorization',auth(teacher)).send({lessonTopic:'Tampered'})).status).toBe(403);
  expect((await c.recordOfWorkRepository.findById('planning-g3-record'))!.toJSON().lessonTopic).not.toBe('Tampered');
  const searched=await request(app).get('/api/v1/students?'+query({search:'Anonymized'})).set('Authorization',auth(subject));expect(searched.status).toBe(200);expect(searched.body.data.every((s:any)=>s.classroomId===class2&&s.streamId===streamA)).toBe(true);
  await expect(c.assignmentAccess.assert({...teacher,schoolId:'another-school'},scope)).rejects.toThrow('School');
 });
 it('scopes aggregate data and blocks linked learner records before mutations',async()=>{
  await c.clinicRepository.saveVisit(ClinicVisit.create({schoolId,studentId:'planning-student3',studentName:'Fixture',visitDate:'2025-11-06',visitTime:'09:00',symptoms:['Fixture'],treatmentAdministered:'Fixture',nurseRemarks:'Fixture',parentNotified:false,status:'UNDER_OBSERVATION'},'planning-clinic3'));
  await c.disciplineRepository.saveIncident(DisciplineIncident.create({schoolId,studentId:'planning-student3',studentName:'Fixture',date:'2025-11-06',incidentType:'INFRACTION_WARNING',CBCCoreValue:'RESPECT',title:'Fixture',description:'Fixture',actionTaken:'Fixture',points:-1,loggedByTeacherName:'Fixture',parentInformed:false},'planning-incident3'));
  for(const path of ['/attendance/student/planning-student3','/ediary/student/planning-student3','/clinic/visits/planning-clinic3','/clinic/profile/planning-student3','/discipline/student/planning-student3','/curriculum/schemes/%70lanning-g3-owned'])expect((await request(app).get('/api/v1'+path+'?'+query()).set('Authorization',auth(teacher))).status).toBe(403);
  expect((await request(app).patch('/api/v1/clinic/visits/planning-clinic3/status?'+query()).set('Authorization',auth(teacher)).send({status:'RESOLVED'})).status).toBe(403);
  expect((await request(app).post('/api/v1/discipline/incidents/planning-incident3/parent-informed?'+query()).set('Authorization',auth(teacher)).send({})).status).toBe(403);
  expect((await request(app).get('/api/v1/ediary/stream/'+streamB+'?'+query()).set('Authorization',auth(subject))).status).toBe(403);
  const summaries=[['/curriculum/records-of-work/summary','totalLessons'],['/curriculum-tracker/summary','totalTrackers'],['/clinic/stats','totalVisitsHistory'],['/discipline/stats','totalIncidents']];
  for(const [path,key] of summaries){const r=await request(app).get('/api/v1'+path+'?'+query()).set('Authorization',auth(teacher));expect(r.status).toBe(200);expect(r.body.data[key]).toBe(0);}
  expect((await c.clinicRepository.findVisitById('planning-clinic3'))!.toJSON().status).toBe('UNDER_OBSERVATION');
  for(const path of ['/analytics/dashboard','/analytics/reports/whole-term'])expect((await request(app).get('/api/v1'+path+'?'+query()).set('Authorization',auth(teacher))).status).toBe(403);
 });
 it('requires a published administrator calendar and an active timetable',async()=>{
  await expect(c.calendarPlanning.slots(teacher,scope)).rejects.toThrow('publish');
  expect((await request(app).put('/api/v1/curriculum/planning/calendar?'+query()).set('Authorization',auth(teacher)).send({revision:0,calendar})).status).toBe(403);
  await c.calendarPlanning.saveCalendar(admin,scope,{...calendar,published:false},0);
  await expect(c.calendarPlanning.slots(teacher,scope)).rejects.toThrow('publish');
  await c.calendarPlanning.saveCalendar(admin,scope,calendar,1);
  await expect(c.calendarPlanning.slots(teacher,{...scope,streamId:streamB})).rejects.toThrow('timetable');
 });
 it('derives 47 slots, the partial first week and weekly lesson numbering from the timetable',async()=>{
  const result=await c.calendarPlanning.slots(teacher,scope);expect(result.slots).toHaveLength(47);
  expect((await c.calendarPlanning.slots(teacher,{...scope,termId:term.replace(/-t3$/,'-3')})).slots).toEqual(result.slots);
  const httpSlots=await request(app).get('/api/v1/curriculum/planning/slots?'+query()).set('Authorization',auth(teacher));expect(httpSlots.status).toBe(200);expect(httpSlots.body.data.slots).toHaveLength(47);
  const workspace=await request(app).get('/api/v1/curriculum/planning/workspace?'+query()).set('Authorization',auth(teacher));expect(workspace.status).toBe(200);expect(workspace.body.data.areas.find((a:any)=>a.learningAreaId===math).slots).toHaveLength(47);
  expect(result.slots.filter(s=>s.weekNumber===1).map(s=>[s.date,s.lessonNumber])).toEqual([['2025-11-06',1],['2025-11-07',2]]);
  expect(result.slots.filter(s=>s.weekNumber===2).map(s=>[s.date,s.lessonNumber])).toEqual([['2025-11-10',1],['2025-11-11',2],['2025-11-12',3],['2025-11-13',4],['2025-11-14',5]]);
 });
 let completeId:string;
 it('allows 46-entry drafts, rejects 46/48 completion, duplicate slots and out-of-calendar entries; accepts exactly 47',async()=>{
  const slots=(await c.calendarPlanning.slots(teacher,scope)).slots;
  const draft=await c.curriculumUseCases.createSchemeOfWork({...scope,teacherId:teacher.userId,title:'47-slot term',entries:slots.slice(0,46).map(entry)},teacher);completeId=draft.id;
  await expect(c.curriculumUseCases.submitSchemeForReview(draft.id,teacher)).rejects.toThrow('exactly 47');
  await expect(c.curriculumUseCases.addEntryToScheme(draft.id,entry(slots[0]),teacher)).rejects.toThrow('conflicts');
  await expect(c.curriculumUseCases.addEntryToScheme(draft.id,{...entry(slots[0]),slotId:'2025-11-05:p1'},teacher)).rejects.toThrow('conflicts');
  await c.curriculumUseCases.addEntryToScheme(draft.id,entry(slots[46]),teacher);
  const fortyEight=scheme([...slots.map((s,i)=>({...entry(s),id:'e'+i})),{...entry(slots[0]),id:'extra'}],teacher.userId,math,class2,'planning-48');await c.schemeOfWorkRepository.save(fortyEight);
  await expect(c.curriculumUseCases.submitSchemeForReview(fortyEight.id,teacher)).rejects.toThrow('exactly 47');
  expect((await c.curriculumUseCases.submitSchemeForReview(draft.id,teacher)).status).toBe('SUBMITTED');
 });
 it('enforces sequencing on direct APIs and unlocks only after the preceding scheme validates',async()=>{
  await c.calendarPlanning.saveSequence(admin,scope,{enabled:true,learningAreaIds:[english,math]},0);
  expect((await request(app).get('/api/v1/curriculum/schemes/'+completeId+'?'+query()).set('Authorization',auth(teacher))).status).toBe(409);
  await expect(c.calendarPlanning.slots(subject,{...scope,learningAreaId:english})).rejects.toThrow('assignment');
  await c.calendarPlanning.saveSequence(admin,scope,{enabled:true,learningAreaIds:[math,english]},1);
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).resolves.toBeUndefined();
  const first=await c.schemeOfWorkRepository.findById(completeId);first!.reject(admin.userId,'Needs completion');await c.schemeOfWorkRepository.update(first!);
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).rejects.toThrow('Locked');
  await c.curriculumUseCases.submitSchemeForReview(completeId,teacher);
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).resolves.toBeUndefined();
 });
 let planId:string,taughtId:string;
 it('links lesson plans to eligible schemed dates and rejects a cancelled date',async()=>{
  const source=await c.schemeOfWorkRepository.findById(completeId);const e=source!.entries[0];
  const body={teacherId:teacher.userId,schemeOfWorkEntryId:e.id,classRoomId:class2,streamId:streamA,learningAreaId:math,lessonDate:'2025-11-06',durationMinutes:40,strand:'Numbers',subStrand:'Fractions',specificLearningOutcomes:['Compare'],keyInquiryQuestions:['How?'],coreCompetenciesAddressed:[],valuesAddressed:[],learningResources:['Paper'],steps:[]};
  await expect(c.curriculumUseCases.createLessonPlan({...body,lessonDate:'2025-11-05'},teacher)).rejects.toThrow('cancelled');
  const plan=await c.curriculumUseCases.createLessonPlan(body,teacher);planId=plan.id;expect(plan.schemeOfWorkEntryId).toBe(e.id);
  const taught=await request(app).post('/api/v1/curriculum/planning/record-taught?'+query()).set('Authorization',auth(teacher)).send({lessonPlanId:plan.id,notes:'Learners compared paper models and explained the equal parts.'});
  expect(taught.status).toBe(200);taughtId=taught.body.data.id;
  expect(taught.body.data.planningLink).toMatchObject({lessonPlanId:plan.id,schemeId:completeId,schemeEntryId:e.id,slotId:'2025-11-06:p1'});
  const record=(await c.recordOfWorkRepository.findById(taughtId))!;record.approve(admin.userId,'Local administrator','Verified taught');await c.recordOfWorkRepository.update(taughtId,record);

 });
 it('calendar exceptions may target one class/period and calendar changes preserve content and flag rescheduling',async()=>{
  await c.calendarPlanning.saveCalendar(admin,scope,{...calendar,exceptions:[...calendar.exceptions,{date:'2025-11-06',kind:'ACTIVITY',reason:'Period 1 cancelled',classRoomIds:[class2],periodNumbers:[1]}]},2);
  const result=await c.calendarPlanning.inspect(teacher,scope,(await c.schemeOfWorkRepository.findById(completeId))!.entries);
  expect(result.required).toBe(46);expect(result.conflicts).toHaveLength(2);expect(result.conflicts.map(c=>c.slotId)).toEqual(['2025-11-06:p1','2025-11-07:p1']);expect(result.complete).toBe(false);
  expect((await c.schemeOfWorkRepository.findById(completeId))!.entries).toHaveLength(47);
  expect((await c.lessonPlanRepository.findById(planId))!.toJSON().lessonDate).toBe('2025-11-06');
  expect((await c.recordOfWorkRepository.findById(taughtId))!.toJSON()).toMatchObject({status:'APPROVED',lessonDate:'2025-11-06',planningLink:{lessonPlanId:planId}});
  expect((await c.curriculumUseCases.listLessonPlans({classRoomId:class2},teacher)).map(p=>p.id)).toContain(planId);
  const work=await request(app).get('/api/v1/curriculum/planning/workspace?'+query()).set('Authorization',auth(teacher));expect(work.status).toBe(200);expect(work.body.data.lessonPlans).toEqual(expect.arrayContaining([expect.objectContaining({id:planId,needsRescheduling:true})]));

  expect((await c.calendarPlanning.slots(teacher,{...scope,learningAreaId:english})).slots).toHaveLength(47);
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).rejects.toThrow('Locked');
  const original=(await c.schemeOfWorkRepository.findById(completeId))!;
  const cancelled=original.entries.find(e=>e.slotId==='2025-11-06:p1')!;
  await c.curriculumUseCases.archiveCancelledEntry(completeId,cancelled.id,teacher);
  const friday=(await c.calendarPlanning.slots(teacher,scope)).slots.find(s=>s.date==='2025-11-07')!;
  await c.curriculumUseCases.updateSchemeEntry(completeId,original.entries.find(e=>e.slotId===friday.id)!.id,entry(friday),teacher);
  expect((await c.curriculumUseCases.submitSchemeForReview(completeId,teacher)).entries).toHaveLength(47);
  expect((await c.schemeOfWorkRepository.findById(completeId))!.entries.find(e=>e.id===cancelled.id)!.archivedAt).toBeTruthy();
  expect((await c.recordOfWorkRepository.findById(taughtId))!.toJSON().planningLink?.schemeEntryId).toBe(cancelled.id);
  await expect(c.calendarPlanning.assertUnlocked(teacher,{...scope,learningAreaId:english})).resolves.toBeUndefined();
 });
 it('selectors omit unassigned grades, learning areas and streams, and deactivation revokes the next request',async()=>{
  const options=await request(app).get('/api/v1/curriculum/planning/options?'+query()).set('Authorization',auth(subject));expect(options.status).toBe(200);expect(options.body.data.map((x:any)=>x.id)).toEqual([class2]);expect(options.body.data[0].planningStreams.map((x:any)=>x.id)).toEqual([streamA]);
  const areas=await request(app).get('/api/v1/academics/learning-areas?'+query()).set('Authorization',auth(subject));expect(areas.status).toBe(200);expect(areas.body.data.map((a:any)=>a.id)).toEqual([math]);
  const assignments=await c.academicRepository.findSubjectTeacherAssignments({teacherId:subject.userId+'-profile'});assignments[0].deactivate('2025-11-10');await c.academicRepository.saveSubjectTeacherAssignment(assignments[0]);
  await expect(c.assignmentAccess.assert(subject,scope)).rejects.toThrow('assignment');
 });
 it('supports multiple periods per day, partial-day cancellations and class-specific exceptions',async()=>{
  const tt=(await c.timetableRepository.findById('planning-timetable'))!;
  tt.addOrUpdateSlot({id:'extra-monday',dayOfWeek:'MONDAY',periodNumber:3,startTime:'13:00',endTime:'13:40',learningAreaId:math,isBreak:false,isLunch:false});await c.timetableRepository.update(tt);
  await c.calendarPlanning.saveCalendar(admin,scope,{...calendar,exceptions:[...calendar.exceptions,{date:'2025-11-06',kind:'ACTIVITY',reason:'Other class only',classRoomIds:[class3],periodNumbers:[1]},{date:'2025-11-07',kind:'ACTIVITY',reason:'Partial morning cancellation',startTime:'09:10',endTime:'09:30'}]},3);
  const maths=(await c.calendarPlanning.slots(teacher,scope)).slots;
  expect(maths).toHaveLength(55);expect(maths.filter(s=>s.date==='2025-11-10').map(s=>s.lessonNumber)).toEqual([1,2]);
  expect(maths.some(s=>s.date==='2025-11-06')).toBe(true);expect(maths.some(s=>s.date==='2025-11-07')).toBe(false);
  expect((await c.calendarPlanning.slots(teacher,{...scope,learningAreaId:english})).slots).toHaveLength(47);
  await expect(c.calendarPlanning.saveCalendar(admin,scope,calendar,3)).rejects.toThrow('changed');
 });

});
