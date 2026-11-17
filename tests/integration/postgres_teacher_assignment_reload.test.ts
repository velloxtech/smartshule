import fs from 'fs';
import path from 'path';
import {Pool} from 'pg';
import request from 'supertest';
import {AcademicUseCases} from '../../src/application/academics/AcademicUseCases';
import {TeacherAssignmentAccess} from '../../src/application/shared/TeacherAssignmentAccess';
import {PostgresAcademicRepository,PostgresTeacherRepository,PostgresUserRepository} from '../../src/infrastructure/database/postgres/PostgresRepositories';
import {AppContainer} from '../../src/infrastructure/container';
import {createExpressApp} from '../../src/infrastructure/http/app';
import {UserRole} from '../../src/core/domain/user/User';
const url=process.env.SMARTSHULE_REVIEW_DATABASE_URL;
(url?describe:describe.skip)('PostgreSQL teacher assignment reload after a period transition',()=>{
 let owner:Pool,pool:Pool;
 const schema='teacher_assignment_reload_review';
 const admin={userId:'admin',role:UserRole.ADMIN,schoolId:'school',email:'admin@example.test'};
 const teacher={userId:'teacher-user',role:UserRole.TEACHER,schoolId:'school',email:'teacher@example.test'};
 const fresh=()=>new AcademicUseCases(new PostgresAcademicRepository(pool),new PostgresTeacherRepository(pool),new PostgresUserRepository(pool));
 const app=()=>{const c=new AppContainer({academicRepository:new PostgresAcademicRepository(pool),teacherRepository:new PostgresTeacherRepository(pool),userRepository:new PostgresUserRepository(pool)});return {api:createExpressApp(c),token:c.tokenService.generateAccessToken(teacher)};};
 beforeAll(async()=>{
  const target=new URL(url!);if(target.hostname!=='127.0.0.1'||target.port!=='55471'||target.pathname!=='/smartshule_audit_review_20261116')throw Error('Disposable review database required');
  owner=new Pool({connectionString:url});if((await owner.query('SHOW data_directory')).rows[0].data_directory!=='/tmp/smartshule-review-20261116/pgdata')throw Error('Wrong disposable cluster');
  await owner.query(`CREATE SCHEMA ${schema}`);
  await owner.query(`SET search_path=${schema}`);
  await owner.query(fs.readFileSync(path.resolve(__dirname,'../fixtures/postgres_teacher_assignment_reload.sql'),'utf8').replace(/public\./g,schema+'.'));
  pool=new Pool({connectionString:url,options:'-c search_path='+schema});
  await pool.query(`INSERT INTO schools(id,name,code,email,phone,address,currency)VALUES('school','Synthetic','RELOAD','reload@example.test','000','Synthetic','KES');
   INSERT INTO users(id,email,password_hash,first_name,last_name,role,status,school_id)VALUES('admin','admin@example.test','test-only','Review','Admin','ADMIN','ACTIVE','school'),('teacher-user','teacher@example.test','test-only','Review','Teacher','TEACHER','ACTIVE','school');
   INSERT INTO teachers(id,user_id,employee_number,assigned_class_stream_ids)VALUES('teacher-profile','teacher-user','RELOAD-1','[]');
   INSERT INTO academic_years(id,name,start_date,end_date,is_current,school_id)VALUES('year-2026','2026','2026-01-01','2026-12-31',true,'school'),('year-2027','2027','2027-01-01','2027-12-31',false,'school');
   INSERT INTO academic_terms(id,academic_year_id,term_number,name,start_date,end_date,is_current)VALUES('2026-t2','year-2026',2,'Term 2','2026-05-01','2026-08-01',false),('2026-t3','year-2026',3,'Term 3','2026-08-24','2026-11-16',false),('2027-t1','year-2027',1,'Term 1','2027-01-05','2027-04-02',true);
   INSERT INTO classrooms(id,name,grade_level,education_level,school_id)VALUES('class4','Grade 4','GRADE_4','UPPER_PRIMARY','school');
   INSERT INTO streams(id,classroom_id,name,capacity)VALUES('alpha','class4','Alpha',40),('west','class4','West',40);
   INSERT INTO global_subjects(id,school_id,code,name)VALUES('science-global','school','SCI','Science');
   INSERT INTO learning_areas(id,name,code,grade_level,education_level,is_elective,school_id,global_subject_id)VALUES('science','Science','SCI','GRADE_4','UPPER_PRIMARY',false,'school','science-global'),('math','Mathematics','MAT','GRADE_4','UPPER_PRIMARY',false,'school',null);`);
 });
 afterAll(async()=>{await pool?.end();if(owner){await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await owner.end();}});
 it('scopes lookup to the requested year and uses a read-only fallback without changing flags',async()=>{
  const r=new PostgresAcademicRepository(pool);
  expect((await r.findCurrentTerm('year-2026'))?.id).toBe('2026-t3');
  expect((await r.findCurrentTerm('year-2027'))?.id).toBe('2027-t1');
  expect(await r.findCurrentTerm('unknown-year')).toBeNull();
  expect((await pool.query("SELECT id FROM academic_terms WHERE is_current=true")).rows).toEqual([{id:'2027-t1'}]);
 });
 it('saved class and subject duties remain visible after closing the connection pool and using a fresh portal session',async()=>{
  const writer=fresh();
  await writer.assignClassTeacher({schoolId:'school',academicYearId:'year-2026',classRoomId:'class4',streamId:'alpha',teacherId:'teacher-profile',effectiveFrom:'2026-11-16'},admin);
  await writer.assignSubjectTeacher({schoolId:'school',academicYearId:'year-2026',classRoomId:'class4',streamId:'west',learningAreaId:'science',teacherId:'teacher-profile',role:'SUBJECT_TEACHER',effectiveFrom:'2026-11-16'},admin);
  await pool.end();pool=new Pool({connectionString:url,options:'-c search_path='+schema});
  const session=app();const response=await request(session.api).get('/api/v1/academics/teacher/authorized-context').set('Authorization','Bearer '+session.token);
  expect(response.status).toBe(200);
  const cls=response.body.data.assignedClasses.find((c:any)=>c.id==='class4');
  expect(cls.streams.map((s:any)=>s.id).sort()).toEqual(['alpha','west']);
  expect(cls.subjectsByStream.alpha.map((s:any)=>s.id).sort()).toEqual(['math','science']);
  expect(cls.subjectsByStream.west.map((s:any)=>s.id)).toEqual(['science']);
  expect(response.body.data.editableLearningAreaIds).toEqual(['science']);
  const access=new TeacherAssignmentAccess(new PostgresAcademicRepository(pool),new PostgresTeacherRepository(pool));
  expect(await access.canClassTeacher(teacher,{classRoomId:'class4',streamId:'alpha'})).toBe(true);
  expect(await access.canClassTeacher(teacher,{classRoomId:'class4',streamId:'west'})).toBe(false);
  expect(await access.can(teacher,{classRoomId:'class4',streamId:'west',learningAreaId:'math'})).toBe(false);
 });
 it('does not hide newly saved duties after term end, and retains future-start/historical restrictions',async()=>{
  const access=new TeacherAssignmentAccess(new PostgresAcademicRepository(pool),new PostgresTeacherRepository(pool));
  // These fixtures intentionally have an ended term, simulating an uncompleted rollover.
  await pool.query("UPDATE academic_terms SET end_date='2026-11-01' WHERE id='2026-t3'");
  expect((await access.assignments(teacher)).classes).toHaveLength(1);
  expect((await access.assignments(teacher,{academicYearId:'year-2026',termId:'2026-t3'})).subjects).toHaveLength(1);
  expect((await access.assignments(teacher,{academicYearId:'year-2026',termId:'2026-t2'})).classes).toHaveLength(0);
  await pool.query("UPDATE subject_teacher_assignments SET effective_from='2099-01-01'");
  expect((await access.assignments(teacher)).subjects).toHaveLength(0);
  await pool.query("UPDATE subject_teacher_assignments SET effective_from='2026-11-16'");
 });
 it('honors an explicitly selected current-year term ahead of the read-only fallback',async()=>{
  await pool.query("UPDATE academic_terms SET is_current=true WHERE id='2026-t2'");
  expect((await new PostgresAcademicRepository(pool).findCurrentTerm('year-2026'))?.id).toBe('2026-t2');
 });
});
