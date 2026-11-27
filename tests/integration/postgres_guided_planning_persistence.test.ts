import request from 'supertest';
import {createExpressApp} from '../../src/infrastructure/http/app';
import fs from 'fs';import path from 'path';import {Pool} from 'pg';
import {AppContainer} from '../../src/infrastructure/container';
import {PostgresPlanningRepository} from '../../src/application/planning/PlanningRepository';
import {PostgresAcademicRepository,PostgresTeacherRepository,PostgresUserRepository,PostgresCBCAssessmentRepository,PostgresSchemeOfWorkRepository,PostgresLessonPlanRepository,PostgresTimetableRepository} from '../../src/infrastructure/database/postgres/PostgresRepositories';
import {PostgresRecordOfWorkRepository} from '../../src/infrastructure/database/postgres/PostgresRecordOfWorkRepository';
import {AcademicYear,AcademicTerm} from '../../src/core/domain/academic/AcademicYear';
import {ClassRoom,LearningArea,EducationLevel} from '../../src/core/domain/academic/ClassRoom';
import {Teacher} from '../../src/core/domain/user/Teacher';import {User,UserRole,UserStatus} from '../../src/core/domain/user/User';
import {SubjectTeacherAssignment} from '../../src/core/domain/academic/TeacherAssignment';import {CBCGradeLevel} from '../../src/core/domain/user/Student';
import {Strand,SubStrand} from '../../src/core/domain/cbc/CbcAssessment';import {Timetable} from '../../src/core/domain/timetable/Timetable';
const url=process.env.SMARTSHULE_REVIEW_DATABASE_URL;
(url?describe:describe.skip)('Disposable PostgreSQL guided curriculum persistence',()=>{
 let owner:Pool,pool:Pool,c:AppContainer;const schema='guided_planning_review';
 const admin={userId:'admin',schoolId:'school',role:UserRole.ADMIN},teacher={userId:'teacher',schoolId:'school',role:UserRole.TEACHER};
 const scope={academicYearId:'year',termId:'term3',classRoomId:'class',learningAreaId:'math'};
 const fresh=()=>new AppContainer({academicRepository:new PostgresAcademicRepository(pool),teacherRepository:new PostgresTeacherRepository(pool),userRepository:new PostgresUserRepository(pool),CBCAssessmentRepository:new PostgresCBCAssessmentRepository(pool),schemeOfWorkRepository:new PostgresSchemeOfWorkRepository(pool),lessonPlanRepository:new PostgresLessonPlanRepository(pool),timetableRepository:new PostgresTimetableRepository(pool),recordOfWorkRepository:new PostgresRecordOfWorkRepository(pool),planningRepository:new PostgresPlanningRepository(pool)});
 beforeAll(async()=>{
  const u=new URL(url!);if(u.hostname!=='127.0.0.1'||u.port!=='55471'||u.pathname!=='/smartshule_audit_review_20261116')throw Error('Disposable database only');owner=new Pool({connectionString:url});if((await owner.query('SHOW data_directory')).rows[0].data_directory!=='/tmp/smartshule-review-20261116/pgdata')throw Error('Wrong cluster');
  await owner.query(`CREATE SCHEMA ${schema};SET search_path=${schema}`);
  for(const file of ['postgres_teacher_assignment_reload.sql','postgres_guided_planning.sql'])await owner.query(fs.readFileSync(path.resolve(__dirname,'../fixtures',file),'utf8').replace(/public\./g,schema+'.'));
  pool=new Pool({connectionString:url,options:'-c search_path='+schema});
  await pool.query("INSERT INTO schools(id,name,code,email,phone,address,currency)VALUES('school','Synthetic','GUIDED','guided@example.test','000','Synthetic','KES')");c=fresh();
  for(const a of [admin,teacher])await c.userRepository.save(User.create({schoolId:'school',email:a.userId+'@example.test',passwordHash:'test-only',firstName:'Synthetic',lastName:a.role,role:a.role,status:UserStatus.ACTIVE},a.userId));
  await c.teacherRepository.save(Teacher.create({userId:teacher.userId,employeeNumber:'GUIDED-1',specialization:[],assignedClassStreamIds:[]},'profile'));
  await c.academicRepository.saveYear(AcademicYear.create({schoolId:'school',name:'2026',startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:true},scope.academicYearId));
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:scope.academicYearId,termNumber:3,name:'Term 3',startDate:'2026-11-09',endDate:'2026-11-20',isCurrent:true},scope.termId));
  await c.academicRepository.saveClass(ClassRoom.create({schoolId:'school',name:'Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},scope.classRoomId));
  await c.academicRepository.saveLearningArea(LearningArea.create({schoolId:'school',name:'Mathematics',code:'M',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},scope.learningAreaId));
  await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({...scope,schoolId:'school',teacherId:'profile',isActive:true,role:'SUBJECT_TEACHER',effectiveFrom:'2020-01-01'},'duty'));
  await c.CBCAssessmentRepository.saveStrand(Strand.create({learningAreaId:'math',gradeLevel:CBCGradeLevel.GRADE_4,code:'N',title:'Numbers'},'strand'));
  await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({strandId:'strand',code:'F',title:'Fractions',specificLearningOutcomes:['Compare fractions']},'sub'));
  await c.calendarPlanning.saveCalendar(admin,scope,{guidedWorkflow:true,startDate:'2026-11-09',endDate:'2026-11-20',teachingDays:[1],exceptions:[],published:true},0);
  await c.timetableRepository.save(Timetable.create({...scope,schoolId:'school',isActive:true,slots:[{id:'p1',dayOfWeek:'MONDAY',periodNumber:1,startTime:'09:00',endTime:'09:40',learningAreaId:'math',isBreak:false,isLunch:false}]},'tt'));
 });
 afterAll(async()=>{await pool?.end();if(owner){await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await owner.end();}});
 it('retains the first-use decision and calendar across a fresh database connection',async()=>{
  await c.planningWorkflow.decide(admin,scope,'FIRST_TERM','First use of SmartShule is Term 3',0);await pool.end();pool=new Pool({connectionString:url,options:'-c search_path='+schema});c=fresh();
  expect((await c.planningWorkflow.continuity(teacher,scope)).status).toBe('FIRST_TERM');expect((await c.calendarPlanning.calendar(teacher,scope))?.data.published).toBe(true);
  await expect(c.planningWorkflow.decide(admin,scope,'FIRST_TERM','Cannot overwrite school history',0)).rejects.toThrow('already has');
 });
 it('persists teacher proposals separately and publishes only after leadership review',async()=>{
  const p:any=await c.CBCUseCases.createStrand({learningAreaId:'math',gradeLevel:CBCGradeLevel.GRADE_4,code:'A',title:'Geometry'},teacher as any);
  c=fresh();expect(await c.CBCAssessmentRepository.findStrandById(p.id)).toBeNull();const q=await c.curriculumProposals.list(admin,'math');const result=await c.curriculumProposals.review(admin,'math',p.id,q.revision,true,'Validated');expect(result.proposals[0].status).toBe('APPROVED');
  expect((await c.CBCAssessmentRepository.findStrandById(result.proposals[0].publishedId))?.title).toBe('Geometry');
 });
 it('retains returned scheme comments and approval metadata after PostgreSQL reload',async()=>{
  let p=await c.termAllocations.saveDraft(teacher,scope,[{subStrandId:'sub',lessons:1}],0);p=await c.termAllocations.submitCoverage(teacher,p.scheme.id,p.scheme.planningState!.revision);p=await c.termAllocations.prepareWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision);
  const e=p.scheme.entries[0];p=await c.termAllocations.saveWeeklyLesson(teacher,p.scheme.id,e.id,p.scheme.planningState!.revision,{specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:[],learningExperiences:['Compare'],learningResources:[],assessmentMethods:['Observation']});p=await c.termAllocations.submitWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision,[e.id]);
  await c.curriculumUseCases.reviewScheme(p.scheme.id,admin.userId,false,'Add learner support activities',admin);c=fresh();const restored=await c.schemeOfWorkRepository.findById(p.scheme.id);expect(restored?.reviewRemarks).toBe('Add learner support activities');expect(restored?.toJSON().reviewedByUserId).toBe(admin.userId);expect(restored?.status).toBe('REJECTED');
 });
 it('persists work directly from an approved scheduled lesson, then confirms it only after record approval',async()=>{
  const current=(await c.termAllocations.find(teacher,scope))!;const entry=current.entries[0];
  let p=await c.termAllocations.saveWeeklyLesson(teacher,current.id,entry.id,current.planningState!.revision,{specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:[],learningExperiences:['Use models'],learningResources:[],assessmentMethods:['Observation']});
  p=await c.termAllocations.submitWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision,[entry.id]);await c.curriculumUseCases.reviewScheme(p.scheme.id,admin.userId,true,'Approved for teaching',admin);
  const app=createExpressApp(c),token=c.tokenService.generateAccessToken({...teacher,email:'teacher@example.test'});
  const response=await request(app).post('/api/v1/curriculum/planning/record-taught?'+new URLSearchParams(scope)).set('Authorization','Bearer '+token).send({schemeId:current.id,schemeEntryId:entry.id,notes:'Actual fraction comparison completed'});
  expect(response.status).toBe(200);const id=response.body.data.id;await c.recordOfWorkUseCases.submitDiaryEntry(id,teacher);c=fresh();
  const reloaded=(await c.recordOfWorkRepository.findById(id))!.toJSON();expect(reloaded.planningLink?.lessonPlanId).toBeUndefined();expect(reloaded.planningLink?.schemeEntryId).toBe(entry.id);expect(reloaded.status).toBe('SUBMITTED');
  expect((await c.termAllocations.weekly(teacher,current.id)).coverageSummary.confirmedOutcomes).toBe(0);
  await c.recordOfWorkUseCases.approveDiaryEntry(id,{remarks:'Actual outcomes verified'},admin);c=fresh();
  expect((await c.termAllocations.weekly(teacher,current.id)).coverageSummary.confirmedOutcomes).toBe(1);
 });

});
