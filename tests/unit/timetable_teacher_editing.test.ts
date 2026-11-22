import {AppContainer} from '../../src/infrastructure/container';
import {AcademicYear, AcademicTerm} from '../../src/core/domain/academic/AcademicYear';
import {ClassRoom, Stream, LearningArea, EducationLevel} from '../../src/core/domain/academic/ClassRoom';
import {ClassTeacherAssignment, SubjectTeacherAssignment} from '../../src/core/domain/academic/TeacherAssignment';
import {Teacher} from '../../src/core/domain/user/Teacher';
import {CBCGradeLevel} from '../../src/core/domain/user/Student';
import {Timetable} from '../../src/core/domain/timetable/Timetable';
import {ForbiddenError, ConflictError, ValidationError} from '../../src/core/domain/shared/Errors';

const actor = {userId:'teacher-user', role:'TEACHER', schoolId:'school'};
const scope = {schoolId:'school',academicYearId:'year',termId:'term',classRoomId:'class',streamId:'alpha'};
const lesson = (id:string, teacherId='teacher', periodNumber=1, startTime='09:00', endTime='09:40') =>
  ({id,teacherId,periodNumber,startTime,endTime,dayOfWeek:'MONDAY',isBreak:false,isLunch:false});

describe('Assigned class teachers editing timetables', () => {
 let c: AppContainer;
 beforeEach(async () => {
  c = new AppContainer();
  await c.academicRepository.saveYear(AcademicYear.create({schoolId:'school',name:'2026',startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:true},'year'));
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:'year',name:'Term 1',termNumber:1,startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:true},'term'));
  await c.academicRepository.saveClass(ClassRoom.create({schoolId:'school',name:'Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},'class'));
  await c.academicRepository.saveLearningArea(LearningArea.create({schoolId:'school',name:'Science',code:'SCI',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},'science'));
  for (const id of ['alpha','west']) await c.academicRepository.saveStream(Stream.create({classRoomId:'class',name:id,capacity:30},id));
  await c.teacherRepository.save(Teacher.create({userId:actor.userId,employeeNumber:'T-1',specialization:[],assignedClassStreamIds:[]},'teacher'));
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({...scope,teacherId:'teacher',effectiveFrom:'2020-01-01',isActive:true},'duty'));
  await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({...scope,streamId:'west',teacherId:'teacher',learningAreaId:'science',role:'SUBJECT_TEACHER',effectiveFrom:'2020-01-01',isActive:true},'subject-duty'));
  await c.timetableRepository.save(Timetable.create({...scope,isActive:true,slots:[lesson('one'),lesson('two','other',2,'10:00','10:40')]},'table'));
  await c.timetableRepository.save(Timetable.create({...scope,streamId:'west',isActive:true,slots:[]},'west-table'));
 });
 it('creates a timetable, updates times, persists a swap and deletes lessons', async () => {
  expect((await c.timetableUseCases.createTimetable(scope,actor)).id).toBe('table');
  const saved = await c.timetableUseCases.addOrUpdateSlot({timetableId:'table',slotId:'one',...lesson('unused','teacher',2,'10:00','10:40')},actor);
  expect(saved.slots).toEqual(expect.arrayContaining([
   expect.objectContaining({id:'one',periodNumber:2,teacherId:'teacher',startTime:'10:00'}),
   expect.objectContaining({id:'two',periodNumber:1,teacherId:'other',startTime:'09:00'})
  ]));
  const changed = await c.timetableUseCases.saveTimetableGrid({...scope,timetableId:'table',periods:[{periodNumber:2,startTime:'11:00',endTime:'11:40'}],slots:saved.slots.map(s=>s.id==='one'?{...s,startTime:'11:00',endTime:'11:40'}:s)},actor);
  expect(changed.slots.find(s=>s.id==='one')!.startTime).toBe('11:00');
  const reloaded = await c.timetableUseCases.getStreamTimetable('alpha','term','class',actor,'year');
  expect(reloaded.periods![0].startTime).toBe('11:00');
  expect((await c.timetableUseCases.deleteSlot('table','one',actor)).slots.map(s=>s.id)).toEqual(['two']);
 });
 it('initializes a new timetable and adds a lesson in an assigned class', async () => {
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({...scope,streamId:'west',teacherId:'teacher',effectiveFrom:'2020-01-01',isActive:true},'west-duty'));
  // A new period in the same school still needs its own assignment resolution.
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:'year',name:'Term 2',termNumber:2,startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:false},'term-2'));
  const created = await c.timetableUseCases.createTimetable({...scope,termId:'term-2'},actor);
  expect(created.termId).toBe('term-2');
  const added = await c.timetableUseCases.addOrUpdateSlot({timetableId:created.id,...lesson('new')},actor);
  expect(added.slots).toHaveLength(1);
 });
 it('denies subject-only streams across all write operations', async () => {
  await expect(c.timetableUseCases.createTimetable({...scope,streamId:'west'},actor)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.timetableUseCases.saveTimetableGrid({...scope,streamId:'west',timetableId:'west-table',slots:[]},actor)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.timetableUseCases.addOrUpdateSlot({timetableId:'west-table',...lesson('new')},actor)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.timetableUseCases.deleteSlot('west-table','any',actor)).rejects.toBeInstanceOf(ForbiddenError);
 });
 it('rejects forged IDs, cross-school access and expired duties', async () => {
  await expect(c.timetableUseCases.saveTimetableGrid({...scope,timetableId:'west-table',slots:[]},actor)).rejects.toBeInstanceOf(ValidationError);
  await expect(c.timetableUseCases.saveTimetableGrid({...scope,schoolId:'foreign',slots:[]},actor)).rejects.toBeInstanceOf(ForbiddenError);
  const duties=await c.academicRepository.findClassTeacherAssignments({teacherId:'teacher'});
  duties[0].deactivate('2020-02-01');await c.academicRepository.saveClassTeacherAssignment(duties[0]);
  await expect(c.timetableUseCases.deleteSlot('table','one',actor)).rejects.toBeInstanceOf(ForbiddenError);
  expect((await c.timetableRepository.findById('table'))!.slots).toHaveLength(2);
 });
 it('rejects overlapping times across different periods and preserves both lessons on failed swaps', async () => {
  await c.timetableRepository.save(Timetable.create({...scope,streamId:'west',isActive:true,slots:[lesson('elsewhere','teacher',5,'10:10','10:50')]},'west-table'));
  await expect(c.timetableUseCases.addOrUpdateSlot({timetableId:'table',slotId:'one',...lesson('unused','teacher',2,'10:00','10:40')},actor)).rejects.toBeInstanceOf(ConflictError);
  expect((await c.timetableRepository.findById('table'))!.slots.find(s=>s.id==='one')!.periodNumber).toBe(1);
  await expect(c.timetableUseCases.saveTimetableGrid({...scope,timetableId:'table',slots:[lesson('one'),lesson('overlap','teacher',3,'09:10','09:50')]},actor)).rejects.toBeInstanceOf(ConflictError);
 });
 it('lets subject teachers edit and swap their own lessons without exposing another teacher’s lessons', async () => {
  const own = {...lesson('personal'),learningAreaId:'science'};
  const another = {...lesson('someone-else','other',2,'10:00','10:40'),learningAreaId:'science'};
  const table = (await c.timetableRepository.findById('west-table'))!;
  table.updateGrid(undefined,undefined,[own,another]);await c.timetableRepository.update(table);
  // Avoid a deliberate cross-class clash in the base fixture.
  const classTable = (await c.timetableRepository.findById('table'))!;
  classTable.updateGrid(undefined,undefined,[]);await c.timetableRepository.update(classTable);
  const updated = await c.timetableUseCases.addOrUpdateSlot({...own,timetableId:'west-table',slotId:'personal',startTime:'08:00',endTime:'08:40'},actor);
  expect(updated.slots.map(s=>s.id)).toEqual(['personal']);
  const swapped = await c.timetableUseCases.addOrUpdateSlot({...own,timetableId:'west-table',slotId:'personal',periodNumber:2,startTime:'10:00',endTime:'10:40'},actor);
  expect(swapped.slots).toHaveLength(1);expect(swapped.slots[0].periodNumber).toBe(2);
  const persisted = (await c.timetableRepository.findById('west-table'))!;
  expect(persisted.slots.find(s=>s.id==='someone-else')).toMatchObject({periodNumber:1,startTime:'08:00',teacherId:'other'});
  const schedule = await c.timetableUseCases.getTeacherTimetable('teacher','term',actor,'year');
  expect(schedule[0]).toMatchObject({id:'personal',timetableId:'west-table',teacherId:'teacher'});
 });
 it('refuses personal edits to someone else’s lesson or reassignment to another teacher', async () => {
  const table = (await c.timetableRepository.findById('west-table'))!;
  table.updateGrid(undefined,undefined,[{...lesson('personal'),learningAreaId:'science'},{...lesson('someone-else','other',2,'10:00','10:40'),learningAreaId:'science'}]);await c.timetableRepository.update(table);
  await expect(c.timetableUseCases.addOrUpdateSlot({...lesson('unused'),learningAreaId:'science',timetableId:'west-table',slotId:'someone-else'},actor)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.timetableUseCases.addOrUpdateSlot({...lesson('unused','other'),learningAreaId:'science',timetableId:'west-table',slotId:'personal'},actor)).rejects.toBeInstanceOf(ForbiddenError);
  expect((await c.timetableRepository.findById('west-table'))!.slots[0].teacherId).toBe('teacher');
 });

});
