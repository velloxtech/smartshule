import request from 'supertest';
import { Strand,SubStrand } from '../src/core/domain/cbc/CbcAssessment';
import { Pool,PoolClient } from 'pg';
import { AppContainer } from '../src/infrastructure/container';
import { createExpressApp } from '../src/infrastructure/http/app';
import { PostgresCBCAssessmentRepository,PostgresAcademicRepository,PostgresTeacherRepository,PostgresStudentRepository,PostgresUserRepository,PostgresSchemeOfWorkRepository,PostgresLessonPlanRepository,PostgresTimetableRepository,PostgresAttendanceRepository } from '../src/infrastructure/database/postgres/PostgresRepositories';
import { PostgresRecordOfWorkRepository } from '../src/infrastructure/database/postgres/PostgresRecordOfWorkRepository';
import { PostgresCurriculumTrackerRepository } from '../src/infrastructure/database/postgres/PostgresCurriculumTrackerRepository';
import { PostgresPlanningRepository } from '../src/application/planning/PlanningRepository';
import { AcademicYear,AcademicTerm } from '../src/core/domain/academic/AcademicYear';
import { ClassRoom,Stream,LearningArea,EducationLevel } from '../src/core/domain/academic/ClassRoom';
import { ClassTeacherAssignment,SubjectTeacherAssignment } from '../src/core/domain/academic/TeacherAssignment';
import { Teacher } from '../src/core/domain/user/Teacher';
import { User,UserRole,UserStatus } from '../src/core/domain/user/User';
import { Student,CBCGradeLevel,StudentGender,StudentStatus } from '../src/core/domain/user/Student';
import { SchemeOfWork,SchemeStatus } from '../src/core/domain/curriculum-plan/SchemeOfWork';
import { LessonPlan } from '../src/core/domain/curriculum-plan/LessonPlan';
import { Timetable } from '../src/core/domain/timetable/Timetable';
import { CurriculumTracker } from '../src/core/domain/curriculum-tracker/CurriculumTracker';
// Local, transaction-isolated preview fixture. Never accepts a production URL.
const url=process.env.INVESTIGATION_DATABASE_URL;
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname) || new URL(url).pathname!=='/smartshule_investigation')throw new Error('Local investigation database required.');
async function main(){
 let pool:Pool,client:PoolClient,c:AppContainer,app:any;
 const year='planning-year-2025',term='planning-term-2025-t3',schoolId='school-001',class2='planning-grade2',class3='planning-grade3',streamA='planning-g2-a',streamB='planning-g2-b',math='planning-g2-math',english='planning-g2-eng';
 const admin={userId:'planning-admin',role:UserRole.SUPER_ADMIN,schoolId},teacher={userId:'planning-teacher',role:UserRole.TEACHER,schoolId},subject={userId:'planning-subject',role:UserRole.TEACHER,schoolId},other={userId:'planning-other',role:UserRole.TEACHER,schoolId};
 const scope={schoolId,academicYearId:year,termId:term,classRoomId:class2,streamId:streamA,learningAreaId:math};
 const calendar={startDate:'2025-11-05',endDate:'2026-01-09',teachingDays:[1,2,3,4,5],published:true,exceptions:[{date:'2025-11-05',kind:'HOLIDAY' as const,reason:'School opening non-teaching day'}]};
 const query=(extra:any={})=>new URLSearchParams({...scope,...extra}).toString();
 const auth=(a:any)=>`Bearer ${c.tokenService.generateAccessToken(a)}`;
 const entry=(slot:any)=>({slotId:slot.id,weekNumber:slot.weekNumber,lessonNumber:slot.lessonNumber,strandTitle:'Numbers',subStrandTitle:'Fractions',specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:['How do fractions compare?'],learningExperiences:['Compare paper models'],learningResources:['Paper circles'],assessmentMethods:['Observe comparison']});
 const scheme=(entries:any[],owner=teacher.userId,area=math,cls=class2,id='')=>SchemeOfWork.create({teacherId:owner,learningAreaId:area,classRoomId:cls,streamId:cls===class2?streamA:undefined,academicYearId:year,termId:term,title:'Whole-term fixture',entries,status:SchemeStatus.DRAFT},id||'planning-scheme-'+Math.random());

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
  await c.recordOfWorkRepository.create({id:'planning-g3-record',schoolId,teacherId:teacher.userId,academicYearId:year,termId:term,classRoomId:class3,learningAreaId:'planning-g3-math',lessonDate:'2025-11-06',weekNumber:1,day:'Thu',subjectAndGrade:'Grade 3 Maths',strandAndWorkCovered:'Numbers',reference:'Fixture',status:'DRAFT'} as any);
  await c.curriculumTrackerRepository.save(CurriculumTracker.create({schoolId,teacherId:teacher.userId,teacherName:'Fixture',classRoomId:class3,className:'Grade 3',learningAreaId:'planning-g3-math',subjectName:'Maths',academicYear:year,term,totalWeeks:10,items:[],status:'ACTIVE'} as any,'planning-g3-tracker'));
  for(const [id,area,title]of [['allocation-numbers',math,'Numbers'],['allocation-measures',math,'Measurement'],['allocation-english',english,'Reading']]){
   await c.CBCAssessmentRepository.saveStrand(Strand.create({learningAreaId:area,gradeLevel:CBCGradeLevel.GRADE_2,code:id,title},id));
   for(const suffix of ['a','b'])await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({strandId:id,code:id+suffix,title:id==='allocation-numbers'?(suffix==='a'?'Fractions':'Whole Numbers'):(suffix==='a'?'Length':'Mass'),specificLearningOutcomes:['Compare equal parts'],suggestedExperiences:['Use paper models']},id+'-'+suffix));
  }
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

  app=createExpressApp(c);

 await c.calendarPlanning.saveCalendar(admin,scope,calendar,0);
 await c.calendarPlanning.saveSequence(admin,scope,{enabled:true,learningAreaIds:[math,english]},0);
 const server=app.listen(3021,'127.0.0.1',()=>console.log('Planning fixture ready at http://127.0.0.1:3021; all fixture changes are uncommitted.'));
 const stop=async()=>{server.close();await client.query('ROLLBACK');client.release();await pool.end();process.exit(0);};
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
