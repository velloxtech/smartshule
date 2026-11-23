import request from 'supertest';
import {AppContainer} from '../../src/infrastructure/container';
import {createExpressApp} from '../../src/infrastructure/http/app';
import {AcademicYear,AcademicTerm} from '../../src/core/domain/academic/AcademicYear';
import {ClassRoom,Stream,LearningArea,EducationLevel} from '../../src/core/domain/academic/ClassRoom';
import {ClassTeacherAssignment,SubjectTeacherAssignment} from '../../src/core/domain/academic/TeacherAssignment';
import {Teacher} from '../../src/core/domain/user/Teacher';
import {User,UserRole,UserStatus} from '../../src/core/domain/user/User';
import {CBCGradeLevel} from '../../src/core/domain/user/Student';
import {Timetable} from '../../src/core/domain/timetable/Timetable';

describe('Teacher timetable privacy across class, subject, stream and period',()=>{
 let c:AppContainer,app:any;
 const teacher={userId:'teacher-user',email:'teacher@example.test',role:UserRole.TEACHER,schoolId:'school'};
 const other={...teacher,userId:'other-user',email:'other@example.test'};
 const admin={...teacher,userId:'admin',email:'admin@example.test',role:UserRole.ADMIN};
 const auth=(actor=teacher)=>'Bearer '+c.tokenService.generateAccessToken(actor);
 const get=(path:string,query:any={},actor=teacher)=>request(app).get('/api/v1/timetables/'+path).query({academicYearId:'year',termId:'term',...query}).set('Authorization',auth(actor));
 const slot=(id:string,teacherId='profile',learningAreaId='science')=>({id,teacherId,learningAreaId,dayOfWeek:'MONDAY',periodNumber:1,startTime:'09:00',endTime:'09:40',isBreak:false,isLunch:false});
 beforeEach(async()=>{
  c=new AppContainer();app=createExpressApp(c);
  for(const actor of [teacher,other,admin])await c.userRepository.save(User.create({schoolId:actor.schoolId,email:actor.email,passwordHash:'test-only',firstName:'Synthetic',lastName:actor.userId,role:actor.role,status:UserStatus.ACTIVE},actor.userId));
  for(const [id,userId] of [['profile',teacher.userId],['other-profile',other.userId]])await c.teacherRepository.save(Teacher.create({userId,employeeNumber:id,specialization:[],assignedClassStreamIds:[]},id));
  for(const [id,name,current] of [['year','2026',true],['future-year','2027',false]] as const){await c.academicRepository.saveYear(AcademicYear.create({schoolId:'school',name,startDate:name+'-01-01',endDate:name+'-12-31',isCurrent:current},id));await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:id,termNumber:1,name:'Term 1',startDate:name+'-01-01',endDate:name+'-12-31',isCurrent:true},id==='year'?'term':'future-term'));}
  for(const id of ['g4','g5','g6'])await c.academicRepository.saveClass(ClassRoom.create({schoolId:'school',name:id,gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},id));
  for(const id of ['alpha','west'])await c.academicRepository.saveStream(Stream.create({classRoomId:'g4',name:id,capacity:30},id));
  await c.academicRepository.saveLearningArea(LearningArea.create({schoolId:'school',name:'Science',code:'SCI',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},'science'));
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({schoolId:'school',academicYearId:'year',classRoomId:'g4',streamId:'alpha',teacherId:'profile',effectiveFrom:'2020-01-01',isActive:true},'class-duty'));
  for(const [id,classRoomId,streamId,teacherId] of [['west-duty','g4','west','profile'],['g5-duty','g5',undefined,'profile'],['other-duty','g4','west','other-profile']])await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({schoolId:'school',academicYearId:'year',classRoomId:classRoomId!,streamId,teacherId:teacherId!,learningAreaId:'science',role:'SUBJECT_TEACHER',effectiveFrom:'2020-01-01',isActive:true},id!));
  const tables=[
   Timetable.create({schoolId:'school',academicYearId:'year',termId:'term',classRoomId:'g4',streamId:'alpha',isActive:true,slots:[slot('alpha-me'),slot('alpha-other','other-profile','math')]},'alpha-table'),
   Timetable.create({schoolId:'school',academicYearId:'year',termId:'term',classRoomId:'g4',streamId:'west',isActive:true,slots:[slot('west-me'),slot('west-other','other-profile')]},'west-table'),
   Timetable.create({schoolId:'school',academicYearId:'year',termId:'term',classRoomId:'g5',isActive:true,slots:[slot('g5-me',teacher.userId),slot('g5-other','other-profile')]},'g5-table'),
   Timetable.create({schoolId:'school',academicYearId:'year',termId:'term',classRoomId:'g6',isActive:true,slots:[slot('stale-unassigned-me')]},'g6-table'),
   Timetable.create({schoolId:'foreign',academicYearId:'year',termId:'term',classRoomId:'g4',streamId:'alpha',isActive:true,slots:[slot('foreign-me')]},'foreign-table')
  ];for(const table of tables)await c.timetableRepository.save(table);
 });
 it('lists only class-teacher cohorts and never subject-only classes or sibling streams',async()=>{
  const r=await get('access-options');expect(r.status).toBe(200);expect(r.body.data.teacherId).toBe('profile');expect(r.body.data.classes.map((x:any)=>x.id)).toEqual(['g4']);expect(r.body.data.classes[0].allowsWholeClass).toBe(false);expect(r.body.data.classes[0].streams.map((x:any)=>x.id)).toEqual(['alpha']);
 });
 it('exposes class-teacher flags separately from subject teaching choices for dashboard roster decisions',async()=>{
  const r=await request(app).get('/api/v1/academics/teacher/authorized-context').query({academicYearId:'year',termId:'term'}).set('Authorization',auth());
  expect(r.status).toBe(200);const cls=r.body.data.assignedClasses.find((x:any)=>x.id==='g4');
  expect(cls.classTeacherByStream).toMatchObject({alpha:true,west:false});expect(cls.subjectsByStream.west.map((x:any)=>x.id)).toEqual(['science']);
  expect(r.body.data.assignedClasses.find((x:any)=>x.id==='g5').classTeacherByStream['']).toBe(false);
 });
 it('keeps subject-only dashboard assignments without granting learner-directory access',async()=>{
  const r=await request(app).get('/api/v1/academics/teacher/authorized-context').query({academicYearId:'year',termId:'term'}).set('Authorization',auth(other));
  expect(r.status).toBe(200);expect(r.body.data.assignedClasses[0].streams.map((x:any)=>x.id)).toEqual(['west']);expect(r.body.data.assignedClasses[0].classTeacherByStream.west).toBe(false);
  const roster=await request(app).get('/api/v1/students').query({academicYearId:'year',termId:'term',classroomId:'g4',streamId:'west'}).set('Authorization',auth(other));expect(roster.status).toBe(403);
 });
 it('shows all subjects in the assigned class stream, including other teachers',async()=>{
  const r=await get('stream',{classRoomId:'g4',streamId:'alpha'});expect(r.status).toBe(200);expect(r.body.data.slots.map((x:any)=>x.id)).toEqual(['alpha-me','alpha-other']);
 });
 it.each([{classRoomId:'g4',streamId:'west'},{classRoomId:'g5'},{classRoomId:'g6'},{classRoomId:'g4'}])('denies the full timetable for unauthorized scope %j',async scope=>{expect((await get('stream',scope)).status).toBe(403);});
 it('returns only own lessons across assigned teaching classes, supporting profile and login IDs',async()=>{
  for(const teacherId of ['profile',teacher.userId]){const r=await get('teacher',{teacherId});expect(r.status).toBe(200);expect(r.body.data.map((x:any)=>x.id).sort()).toEqual(['alpha-me','g5-me','west-me']);}
 });
 it('rejects another teacher identity even in a class-teacher cohort',async()=>{expect((await get('teacher',{teacherId:'other-profile'})).status).toBe(403);expect((await get('teacher',{teacherId:other.userId})).status).toBe(403);});
 it('lets subject-only staff see their schedule without exposing full class timetables',async()=>{
  const options=await get('access-options',{},other);expect(options.status).toBe(200);expect(options.body.data.classes).toEqual([]);
  const r=await get('teacher',{teacherId:'other-profile'},other);expect(r.status).toBe(200);expect(r.body.data.map((x:any)=>x.id)).toEqual(['west-other']);expect((await get('stream',{classRoomId:'g4',streamId:'west'},other)).status).toBe(403);
 });
 it('uses the selected academic year and refuses mismatched year/term pairs',async()=>{
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({schoolId:'school',academicYearId:'future-year',classRoomId:'g5',teacherId:'profile',effectiveFrom:'2027-01-01',isActive:true},'future-class'));
  await c.timetableRepository.save(Timetable.create({schoolId:'school',academicYearId:'future-year',termId:'future-term',classRoomId:'g5',isActive:true,slots:[slot('future-me')]},'future-table'));
  const period={academicYearId:'future-year',termId:'future-term'};
  expect((await get('access-options',period)).body.data.classes.map((x:any)=>x.id)).toEqual(['g5']);
  expect((await get('teacher',{...period,teacherId:'profile'})).body.data.map((x:any)=>x.id)).toEqual(['future-me']);
  expect((await get('stream',{...period,classRoomId:'g5'})).status).toBe(200);
  expect((await get('stream',{...period,classRoomId:'g4',streamId:'alpha'})).status).toBe(403);
  expect((await get('teacher',{academicYearId:'year',termId:'future-term',teacherId:'profile'})).status).toBe(403);
 });
 it('removes expired class duties and permits administrators to inspect other class/teacher schedules',async()=>{
  const duty=await c.academicRepository.findClassTeacherAssignments({teacherId:'profile'});duty[0].deactivate('2020-02-01');await c.academicRepository.saveClassTeacherAssignment(duty[0]);
  expect((await get('access-options')).body.data.classes).toEqual([]);expect((await get('stream',{classRoomId:'g4',streamId:'alpha'})).status).toBe(403);
  expect((await get('stream',{classRoomId:'g4',streamId:'west'},admin)).status).toBe(200);expect((await get('teacher',{teacherId:'other-profile'},admin)).status).toBe(200);
 });
 const write = (method: string, path: string, body: any = {}, actor = teacher) =>
  (request(app) as any)[method]('/api/v1/timetables/' + path).set('Authorization', auth(actor)).send(body);
 const grid = (overrides: any = {}) => ({schoolId: 'school', timetableId: 'alpha-table', classRoomId: 'g4', streamId: 'alpha', academicYearId: 'year', termId: 'term', slots: [], ...overrides});
 it.each(['post', 'put'])('allows class teachers to change times and swap lessons atomically using %s', async method => {
  // Keep the original grid consistent so clashes in other classes do not mask a swap.
  const original = await c.timetableRepository.findById('alpha-table');
  original!.updateGrid([], [], [slot('first', 'profile'), {...slot('second', 'other-profile', 'math'), periodNumber: 2, startTime: '10:00', endTime: '10:40'}]);
  await c.timetableRepository.update(original!);
  const slots = [
   {...slot('first', 'profile'), periodNumber: 2, startTime: '11:00', endTime: '11:40'},
   {...slot('second', 'other-profile', 'math'), periodNumber: 1, startTime: '12:00', endTime: '12:40'}
  ];
  const periods = slots.map(s => ({periodNumber: s.periodNumber, startTime: s.startTime, endTime: s.endTime}));
  const r = await write(method, 'grid', grid({slots, periods}));
  expect(r.status).toBe(200);
  const saved = await get('stream', {classRoomId: 'g4', streamId: 'alpha'});
  expect(saved.body.data.slots).toEqual(slots);
  expect(saved.body.data.periods).toEqual(periods);
 });
 it('allows creating an assigned timetable and adding, updating and deleting its lessons', async () => {
  const created = await write('post', '', {classRoomId: 'g4', streamId: 'alpha', academicYearId: 'year', termId: 'term'});
  expect(created.status).toBe(201);expect(created.body.data.id).toBe('alpha-table');
  const lesson = {...slot('ignored'), timetableId: 'alpha-table', dayOfWeek: 'TUESDAY', periodNumber: 3};
  const added = await write('post', 'slots', lesson);
  expect(added.status).toBe(200);expect(added.body.data.slots).toHaveLength(3);
  const changed = await write('post', 'slots', {...lesson, startTime: '11:00', endTime: '11:40'});
  expect(changed.status).toBe(200);expect(changed.body.data.slots).toHaveLength(3);
  const savedSlot = changed.body.data.slots.find((s:any) => s.dayOfWeek === 'TUESDAY');
  expect(savedSlot.startTime).toBe('11:00');
  expect((await write('delete', 'alpha-table/slots/' + savedSlot.id)).status).toBe(200);
  expect((await c.timetableRepository.findById('alpha-table'))!.slots).toHaveLength(2);
 });
 it('creates a new timetable for a class-teacher assignment in the selected future year', async () => {
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({schoolId:'school',academicYearId:'future-year',classRoomId:'g5',teacherId:'profile',effectiveFrom:'2027-01-01',isActive:true},'future-class'));
  const r = await write('post', '', {classRoomId:'g5', academicYearId:'future-year', termId:'future-term'});
  expect(r.status).toBe(201);expect(r.body.data).toMatchObject({schoolId:'school',academicYearId:'future-year',termId:'future-term',classRoomId:'g5'});
 });
 it.each([['west-table','g4','west'], ['g5-table','g5',''], ['g6-table','g6','']])('denies mutation of an unassigned or subject-only timetable %s', async (id,classRoomId,streamId) => {
  const original = (await c.timetableRepository.findById(id))!.toJSON();
  const body = grid({timetableId:id,classRoomId,streamId});
  expect((await write('post','grid',body)).status).toBe(403);
  expect((await write('put','grid',body)).status).toBe(403);
  expect((await write('post','',{classRoomId,streamId,academicYearId:'year',termId:'term'})).status).toBe(403);
  expect((await write('post','slots',{...slot('new'),...body})).status).toBe(403);
  expect((await write('delete',id+'/slots/'+original.slots[0].id)).status).toBe(403);
  expect((await c.timetableRepository.findById(id))!.toJSON()).toEqual(original);
 });
 it('denies expired assignments and foreign school IDs without changing stored lessons', async () => {
  expect((await write('post','grid',grid({schoolId:'foreign'}))).status).toBe(403);
  expect((await write('delete','foreign-table/slots/foreign-me')).status).toBe(403);
  const duties = await c.academicRepository.findClassTeacherAssignments({teacherId:'profile'});
  duties[0].deactivate('2020-02-01');await c.academicRepository.saveClassTeacherAssignment(duties[0]);
  expect((await write('post','grid',grid())).status).toBe(403);
  expect((await c.timetableRepository.findById('alpha-table'))!.slots).toHaveLength(2);
 });
 it('rejects forged timetable IDs even with an authorized class in the request', async () => {
  const r = await write('post','grid',grid({timetableId:'west-table'}));
  expect(r.status).toBe(400);
  expect((await c.timetableRepository.findById('west-table'))!.slots).toHaveLength(2);
 });
 it('swaps occupied cells through the lesson editor and rejects a swap that causes a clash', async () => {
  // Other timetables start on the same coordinates in the visibility fixtures.
  for (const id of ['west-table','g5-table','g6-table','foreign-table']) {
   const table = (await c.timetableRepository.findById(id))!;
   table.updateGrid(undefined, undefined, []);await c.timetableRepository.update(table);
  }
  const table = (await c.timetableRepository.findById('alpha-table'))!;
  table.updateGrid(undefined, undefined, [slot('first'), {...slot('second','other-profile','math'), periodNumber:2,startTime:'10:00',endTime:'10:40'}]);
  await c.timetableRepository.update(table);
  const moved = await write('post','slots',{...slot('first'),slotId:'first',timetableId:'alpha-table',periodNumber:2,startTime:'10:00',endTime:'10:40'});
  expect(moved.status).toBe(200);
  expect(moved.body.data.slots).toEqual(expect.arrayContaining([
   expect.objectContaining({id:'first',periodNumber:2,startTime:'10:00',teacherId:'profile'}),
   expect.objectContaining({id:'second',periodNumber:1,startTime:'09:00',teacherId:'other-profile'})
  ]));
  const otherTable = (await c.timetableRepository.findById('west-table'))!;
  otherTable.updateGrid(undefined, undefined, [slot('elsewhere')]);await c.timetableRepository.update(otherTable);
  const rejected = await write('post','slots',{...slot('first'),slotId:'first',timetableId:'alpha-table'});
  expect(rejected.status).toBe(409);
  expect((await c.timetableRepository.findById('alpha-table'))!.slots.find(s=>s.id==='first')!.periodNumber).toBe(2);
 });
 it('rejects overlapping lessons within the same timetable', async () => {
  const slots = [slot('one'), {...slot('two'),periodNumber:2,startTime:'09:10',endTime:'09:50'}];
  expect((await write('post','grid',grid({slots}))).status).toBe(409);
 });
 it('keeps clash detection for teacher edits, including different periods at overlapping times', async () => {
  const conflict = {...slot('clash'),periodNumber: 4,startTime:'09:10',endTime:'09:50'};
  expect((await write('post','grid',grid({slots:[conflict]}))).status).toBe(409);
  expect((await write('post','slots',{...conflict,timetableId:'alpha-table'})).status).toBe(409);
  expect((await c.timetableRepository.findById('alpha-table'))!.slots).toHaveLength(2);
 });
});
