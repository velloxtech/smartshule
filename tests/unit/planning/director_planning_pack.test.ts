import {AppContainer} from '../../../src/infrastructure/container';
import {AcademicYear,AcademicTerm} from '../../../src/core/domain/academic/AcademicYear';
import {ClassRoom,LearningArea,EducationLevel} from '../../../src/core/domain/academic/ClassRoom';
import {SubjectTeacherAssignment} from '../../../src/core/domain/academic/TeacherAssignment';
import {Strand,SubStrand} from '../../../src/core/domain/cbc/CbcAssessment';
import {CBCGradeLevel} from '../../../src/core/domain/user/Student';
import {Teacher} from '../../../src/core/domain/user/Teacher';
import {User,UserRole,UserStatus} from '../../../src/core/domain/user/User';
import {Timetable} from '../../../src/core/domain/timetable/Timetable';
let c:AppContainer;
const admin={userId:'director-admin',email:'admin@example.test',schoolId:'director-school',role:UserRole.ADMIN};
const teacher={userId:'director-teacher',email:'teacher@example.test',schoolId:'director-school',role:UserRole.TEACHER};
const scope={academicYearId:'director-year',termId:'director-term3',classRoomId:'director-class',learningAreaId:'director-area'};
const content={specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:['Which is larger?'],learningExperiences:['Compare models'],learningResources:['Paper'],assessmentMethods:['Observation']};
const calendar=()=>c.calendarPlanning.saveCalendar(admin,scope,{guidedWorkflow:true,startDate:'2026-11-09',endDate:'2026-11-20',teachingDays:[1,2,3,4,5],exceptions:[],published:true},0);
const timetable=()=>c.timetableRepository.save(Timetable.create({...scope,schoolId:admin.schoolId,isActive:true,slots:[{id:'lesson',dayOfWeek:'MONDAY',periodNumber:1,startTime:'09:00',endTime:'09:35',learningAreaId:scope.learningAreaId,isBreak:false,isLunch:false}]},'director-timetable'));
const start=()=>c.planningWorkflow.decide(admin,scope,'FIRST_TERM','First term using SmartShule, starting in Term 3',0);
const save=()=>c.termAllocations.saveDraft(teacher,scope,[{subStrandId:'director-sub',lessons:2}],0);
async function approvedScheme(){await calendar();await timetable();await start();let p=await save();p=await c.termAllocations.submitCoverage(teacher,p.scheme.id,p.scheme.planningState!.revision);p=await c.termAllocations.reviewCoverage(admin,p.scheme.id,p.scheme.planningState!.revision,true,'Coverage approved');p=await c.termAllocations.prepareWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision);for(const entry of p.scheme.entries)p=await c.termAllocations.saveWeeklyLesson(teacher,p.scheme.id,entry.id,p.scheme.planningState!.revision,content);p=await c.termAllocations.submitWeekly(teacher,p.scheme.id,p.scheme.planningState!.revision);await c.curriculumUseCases.reviewScheme(p.scheme.id,admin.userId,true,'Scheme approved',admin);return (await c.termAllocations.weekly(teacher,p.scheme.id));}
beforeEach(async()=>{
 c=new AppContainer();
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

import {weeklyMonitoringRegister} from '../../../src/application/planning/WeeklyMonitoringRegister';
import {weeklyMonitoringPDF,weeklySchemePDF,weeklyMonitoringDoc} from '../../../src/infrastructure/http/exports/WeeklySchemeExport';
const planInput=(lesson:any)=>({...scope,teacherId:teacher.userId,schemeOfWorkEntryId:lesson.entry.id,lessonDate:lesson.date,lessonTime:`${lesson.startTime}-${lesson.endTime}`,strand:'Numbers',subStrand:'Fractions',...content,coreCompetenciesAddressed:[],valuesAddressed:[],steps:[{stepNumber:1,stepTitle:'Development',durationMinutes:35,teacherActivities:'Model',learnerActivities:'Compare'}]});
it('derives a 35-minute lesson from the timetable and rejects wrong durations or incomplete stages',async()=>{
 const weekly=await approvedScheme(),lesson=weekly.weeks[0].lessons[0],input=planInput(lesson);
 await expect(c.curriculumUseCases.createLessonPlan({...input,durationMinutes:40},teacher)).rejects.toThrow(/duration/);
 await expect(c.curriculumUseCases.createLessonPlan({...input,steps:[{...input.steps[0],durationMinutes:30}]},teacher)).rejects.toThrow(/stage/);
 const plan=await c.curriculumUseCases.createLessonPlan(input,teacher);expect(plan.durationMinutes).toBe(35);expect(plan.weekNumber).toBe(1);
});
it('keeps reported work separate from verified work, counts delayed teaching and deduplicates repeated outcomes',async()=>{
 const weekly=await approvedScheme();const lessons=weekly.weeks.flatMap((week:any)=>week.lessons);
 for(const lesson of lessons){
   const work=await c.recordOfWorkUseCases.createDiaryEntry({...scope,schoolId:teacher.schoolId,teacherId:teacher.userId,weekNumber:lesson.weekNumber,lessonDate:lesson===lessons[0]?'2026-11-10':lesson.date,lessonPeriod:'1',strand:'Numbers',subStrand:'Fractions',subStrandId:'director-sub',lessonTopic:'Comparing fractions',learningObjectives:content.specificLearningOutcomes.join('; '),learningActivities:'Compare fraction models',comments:'Concrete models compared',reflectionData:{teachingStatus:'COMPLETED',outcomesCovered:content.specificLearningOutcomes},status:'DRAFT',planningLink:{schemeId:weekly.scheme.id,schemeEntryId:lesson.entry.id,slotId:lesson.id}},teacher);
   await c.recordOfWorkUseCases.submitDiaryEntry(work.id,teacher);
   let progress=await c.termAllocations.weekly(teacher,weekly.scheme.id);
   expect(progress.monitoringRegister.find(row=>row.weekNumber===lesson.weekNumber)?.taughtLessons).toBe(0);
   await c.recordOfWorkUseCases.approveDiaryEntry(work.id,{remarks:'Learner work verified'},admin);
 }
 const progress=await c.termAllocations.weekly(teacher,weekly.scheme.id);
 expect(progress.monitoringRegister.map(row=>row.taughtLessons)).toEqual([1,1]);expect(progress.coverageSummary.confirmedOutcomes).toBe(1);
 expect(progress.monitoringRegister[0].hodVerification).toContain('Synthetic ADMIN');
});
it('retains all 13 term weeks, including closed weeks, and does not count partial or submitted work as complete',()=>{
 const record={status:'SUBMITTED',teacherName:'Teacher One',reflectionData:{remainingWork:'Finish division',remedialPlan:'Small group practice'}};
 const rows=weeklyMonitoringRegister([{weekNumber:1,lessons:[{entry:{strandTitle:'Numbers',subStrandTitle:'Division'},statuses:{reported:true,taught:false},recordsOfWork:[record]}]}],'2027-01-04','2027-04-04');
 expect(rows).toHaveLength(13);expect(rows[0]).toMatchObject({plannedLessons:1,reportedLessons:1,taughtLessons:0,contentNotCovered:'Numbers / Division',teacher:'Teacher One'});expect(rows[0].varianceReason).toContain('Small group practice');expect(rows[1]).toMatchObject({plannedLessons:0,noInstruction:true});
});
it('preserves zero lessons, caps excess teaching within a week and prevents forging approval through planning updates',async()=>{
 const tracker=await c.curriculumTrackerUseCases.createTracker({schoolId:admin.schoolId,teacherId:teacher.userId,learningAreaId:scope.learningAreaId,subjectName:'Mathematics',classRoomId:scope.classRoomId,className:'Grade 4',totalWeeks:2,items:[{weekNumber:1,plannedLessons:0,isCovered:true,status:'APPROVED'},{weekNumber:2,plannedLessons:5}]},admin);
 expect(tracker.items[0]).toMatchObject({plannedLessons:0,status:'PENDING',isCovered:false});
 await c.curriculumTrackerUseCases.updateWeekPlan(tracker.id,2,{isCovered:true,status:'APPROVED',plannedLessons:5},admin);
 const saved=await c.curriculumTrackerRepository.findById(tracker.id);expect(saved!.items[1].isCovered).toBe(false);
 saved!.submitWeekForApproval(2,{lessonsTaught:0,submittedByTeacherId:teacher.userId,submittedByTeacherName:'Teacher'});saved!.approveWeekCoverage(2,{approvedByUserId:admin.userId,approvedByName:'Director'});expect(saved!.getStats().approvedLessons).toBe(0);
 saved!.setWeekPlan(2,{lessonsTaught:8});expect(saved!.getStats().approvedLessons).toBe(5);
});
it('exports bounded landscape tables, repeats headers, and splits oversized PDF rows safely',()=>{
 const data:any={school:{name:'Grace Seeds School'},className:'Grade 3',learningAreaName:'Mathematical Activities',academicYearName:'2027',termName:'Term 1',monitoringRegister:[{weekNumber:1,plannedLessons:5,taughtLessons:0,contentNotCovered:'W'.repeat(6000),varianceReason:'Catch up & review <evidence>',teacher:'Teacher'}],weeks:[]};
 const pdf=weeklyMonitoringPDF(data).toString('latin1');expect(pdf).toContain('/MediaBox [0 0 842 595]');expect(pdf.match(/\/Type \/Page /g)!.length).toBeGreaterThan(1);
 for(const match of pdf.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re S/g)){expect(Number(match[1])+Number(match[3])).toBeLessThanOrEqual(814.02);expect(Number(match[2])).toBeGreaterThanOrEqual(28);}
 expect(pdf).toContain('xref');expect(weeklyMonitoringDoc(data).subarray(0,2).toString()).toBe('PK');expect(weeklySchemePDF(data).subarray(0,4).toString()).toBe('%PDF');
});

it('approving one legacy work record counts one lesson in its own stream and deleting it retracts the evidence',async()=>{
 const input={schoolId:admin.schoolId,teacherId:'director-profile',learningAreaId:scope.learningAreaId,subjectName:'Mathematics',classRoomId:scope.classRoomId,className:'Grade 4',academicYear:'2026',term:'Term 3',totalWeeks:2,items:[{weekNumber:1,plannedLessons:5}]};
 const tracker=await c.curriculumTrackerUseCases.createTracker(input,admin);
 const otherStream=await c.curriculumTrackerUseCases.createTracker({...input,streamId:'other-stream'},admin);
 const work=await c.recordOfWorkUseCases.createDiaryEntry({...scope,schoolId:teacher.schoolId,teacherId:teacher.userId,weekNumber:1,lessonDate:'2026-11-09',lessonPeriod:'1',strand:'Numbers',subStrand:'Fractions',subStrandId:'director-sub',lessonTopic:'Comparing fractions',learningObjectives:'Compare fractions',learningActivities:'Compare models',comments:'Learner models checked',reflectionData:{teachingStatus:'COMPLETED'}},teacher);
 await c.recordOfWorkUseCases.submitDiaryEntry(work.id,teacher);await c.recordOfWorkUseCases.approveDiaryEntry(work.id,{remarks:'Verified'},admin);
 let saved=(await c.curriculumTrackerRepository.findById(tracker.id))!;
 expect({teacher:work.teacherId,term:work.term,year:work.academicYear,school:work.schoolId,logs:saved.dailyLogs.length}).toEqual({teacher:'director-profile',term:'Term 3',year:'2026',school:admin.schoolId,logs:1});
 expect(saved.getStats()).toMatchObject({approvedLessons:1,coveredWeeks:0,completionPercentage:10});
 expect((await c.curriculumTrackerRepository.findById(otherStream.id))!.dailyLogs).toHaveLength(0);
 await c.recordOfWorkUseCases.deleteDiaryEntry(work.id,admin);saved=(await c.curriculumTrackerRepository.findById(tracker.id))!;
 expect(saved.getStats().approvedLessons).toBe(0);
});

// Administrators manage teaching plans without needing an employee teaching assignment.
it.each([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN].flatMap(role=>[ {role,weeklyEndpoint:false}, {role,weeklyEndpoint:true} ]))('allows $role to manage a teacher-owned curriculum workflow (weekly endpoint: $weeklyEndpoint)',async({role,weeklyEndpoint})=>{
 const manager={...admin,role};
 await calendar();await timetable();await start();
 let p=await save();
 p=await c.termAllocations.saveDraft(manager,scope,[{subStrandId:'director-sub',lessons:2}],p.scheme.planningState!.revision,p.scheme.id);
 p=await c.termAllocations.submitCoverage(manager,p.scheme.id,p.scheme.planningState!.revision);
 p=await c.termAllocations.reviewCoverage(manager,p.scheme.id,p.scheme.planningState!.revision,true,'Approved');
 p=await c.termAllocations.prepareWeekly(manager,p.scheme.id,p.scheme.planningState!.revision);
 for(const entry of p.scheme.entries)p=await c.termAllocations.saveWeeklyLesson(manager,p.scheme.id,entry.id,p.scheme.planningState!.revision,content);
 if(weeklyEndpoint) await c.termAllocations.submitWeekly(manager,p.scheme.id,p.scheme.planningState!.revision);
 else await c.curriculumUseCases.submitSchemeForReview(p.scheme.id,manager);
 await c.curriculumUseCases.reviewScheme(p.scheme.id,manager.userId,true,'Approved',manager);
 const weekly=await c.termAllocations.weekly(manager,p.scheme.id);
 expect(weekly.scheme.teacherId).toBe(teacher.userId);
 const plan=await c.curriculumUseCases.createLessonPlan({...planInput(weekly.weeks[0].lessons[0]),teacherId:manager.userId},manager);
 expect(plan.teacherId).toBe(teacher.userId);
 const submitted=await c.curriculumUseCases.submitLessonPlanForReview(plan.id,manager);
 expect(submitted.status).toBe('SUBMITTED');
 await expect(c.termAllocations.prepareWeekly({...manager,schoolId:'other-school'},p.scheme.id,weekly.scheme.planningState!.revision)).rejects.toThrow();
});

it.each([UserRole.PARENT,UserRole.ACCOUNTANT,UserRole.STUDENT])('keeps %s out of private curriculum preparation',async(role)=>{
 await calendar();await timetable();await start();const p=await save();
 const outsider={...admin,role};
 await expect(c.termAllocations.submitCoverage(outsider,p.scheme.id,p.scheme.planningState!.revision)).rejects.toThrow();
 await expect(c.termAllocations.prepareWeekly(outsider,p.scheme.id,p.scheme.planningState!.revision)).rejects.toThrow();
 await expect(c.curriculumUseCases.submitSchemeForReview(p.scheme.id,outsider)).rejects.toThrow();
});

it.each([UserRole.SUPER_ADMIN,UserRole.ADMIN,UserRole.SCHOOL_ADMIN])('allows %s to create and delete curriculum content without a teacher assignment',async(role)=>{
 const manager={...admin,role};
 const strand=await c.CBCUseCases.createStrand({learningAreaId:scope.learningAreaId,gradeLevel:CBCGradeLevel.GRADE_4,code:'ADMIN',title:'Admin curriculum'},manager);
 const sub=await c.CBCUseCases.createSubStrand({strandId:strand.id,code:'ADMIN-1',title:'Admin outcomes',specificLearningOutcomes:['Explain the model']},manager);
 await c.CBCUseCases.deleteSubStrand(sub.id,manager);
 await c.CBCUseCases.deleteStrand(strand.id,manager);
 expect(await c.CBCAssessmentRepository.findStrandById(strand.id)).toBeNull();
 await calendar();await timetable();await start();
 const coverage=await c.termAllocations.saveDraft(manager,scope,[{subStrandId:'director-sub',lessons:2}],0);
 expect(coverage.scheme.teacherId).toBe(manager.userId);
 await c.curriculumUseCases.deleteScheme(coverage.scheme.id,manager);
 expect(await c.schemeOfWorkRepository.findById(coverage.scheme.id)).toBeNull();
});

it.each([UserRole.SUPER_ADMIN,UserRole.ADMIN,UserRole.SCHOOL_ADMIN])('allows %s to remove approved teaching documents in dependency order',async(role)=>{
 const manager={...admin,role};
 const weekly=await approvedScheme(),lesson=weekly.weeks[0].lessons[0];
 const plan=await c.curriculumUseCases.createLessonPlan(planInput(lesson),manager);
 const record=await c.recordOfWorkUseCases.createDiaryEntry({...scope,schoolId:manager.schoolId,teacherId:teacher.userId,weekNumber:lesson.weekNumber,lessonDate:lesson.date,lessonPeriod:'1',strand:'Numbers',subStrand:'Fractions',lessonTopic:'Comparing fractions',learningObjectives:'Compare fractions',learningActivities:'Compare models',comments:'Models checked',status:'DRAFT',planningLink:{lessonPlanId:plan.id,schemeId:weekly.scheme.id,schemeEntryId:lesson.entry.id,slotId:lesson.id}},manager);
 await c.recordOfWorkUseCases.submitDiaryEntry(record.id,manager);
 await c.recordOfWorkUseCases.approveDiaryEntry(record.id,{remarks:'Verified'},manager);
 await expect(c.curriculumUseCases.deleteScheme(weekly.scheme.id,manager)).rejects.toThrow('Delete linked');
 await expect(c.curriculumUseCases.deleteLessonPlan(plan.id,manager)).rejects.toThrow('Delete linked');
 await expect(c.curriculumUseCases.deleteScheme(weekly.scheme.id,{...manager,schoolId:'another-school'})).rejects.toThrow();
 await c.recordOfWorkUseCases.deleteDiaryEntry(record.id,manager);
 await c.curriculumUseCases.deleteLessonPlan(plan.id,manager);
 await c.curriculumUseCases.deleteScheme(weekly.scheme.id,manager);
 expect(await c.recordOfWorkRepository.findById(record.id)).toBeNull();
 expect(await c.lessonPlanRepository.findById(plan.id)).toBeNull();
 expect(await c.schemeOfWorkRepository.findById(weekly.scheme.id)).toBeNull();
});

describe('teacher-paced scheme lesson ranges',()=>{
 let saved:any;
 beforeEach(async()=>{
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:scope.academicYearId,name:'Term 3',termNumber:3,startDate:'2026-11-09',endDate:'2026-12-18',isCurrent:true},scope.termId));
  await c.calendarPlanning.saveCalendar(admin,scope,{startDate:'2026-11-09',endDate:'2026-12-18',teachingDays:[1,2,3,4,5],exceptions:[],published:true},0);
  await c.timetableRepository.save(Timetable.create({...scope,schoolId:admin.schoolId,isActive:true,slots:['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'].map(day=>({id:day,dayOfWeek:day as any,periodNumber:1,startTime:'09:00',endTime:'09:35',learningAreaId:scope.learningAreaId,isBreak:false,isLunch:false}))},'paced-timetable'));
  for(let i=1;i<=3;i++){
   const strandId=i===1?'director-strand':`paced-strand-${i}`;
   const subId=i===1?'director-sub':`paced-sub-${i}`;
   await c.CBCAssessmentRepository.saveStrand(Strand.create({learningAreaId:scope.learningAreaId,gradeLevel:CBCGradeLevel.GRADE_4,code:`S${i}`,title:`Strand ${i}`},strandId));
   await c.CBCAssessmentRepository.saveSubStrand(SubStrand.create({strandId,code:`S${i}.1`,title:`Part ${i}`,specificLearningOutcomes:[`Outcome ${i}a`,`Outcome ${i}b`]},subId));
  }
  saved=await c.termAllocations.saveDraft(teacher,scope,[{subStrandId:'director-sub',lessons:1},{subStrandId:'paced-sub-2',lessons:1},{subStrandId:'paced-sub-3',lessons:1}],0);
  saved=await c.termAllocations.submitCoverage(teacher,saved.scheme.id,saved.scheme.planningState.revision);
  saved=await c.termAllocations.reviewCoverage(admin,saved.scheme.id,saved.scheme.planningState.revision,true,'Approved curriculum');
 });
 const allocate=async(slots:string[],outcomes=['Outcome 1a'],sub='director-sub',actor=teacher)=>{
  const current=(await c.schemeOfWorkRepository.findById(saved.scheme.id))!;
  return c.termAllocations.allocateSessions(actor,saved.scheme.id,current.planningState!.revision,sub,slots,{...content,specificLearningOutcomes:outcomes});
 };
 it('keeps all six weeks for three strands and lets one part occupy five lessons and continue next week',async()=>{
  const original=structuredClone(saved.scheme.planningState.allocations);
  const slots=saved.slots;
  let timeline=await allocate(slots.filter((slot:any)=>slot.weekNumber===1).map((slot:any)=>slot.id));
  expect(timeline.weeks).toHaveLength(6);
  expect(timeline.weeks[0].lessons.map((lesson:any)=>lesson.entry.specificLearningOutcomes)).toEqual(Array(5).fill(['Outcome 1a']));
  expect(timeline.weeks.slice(1).every((week:any)=>week.lessons.every((lesson:any)=>!lesson.entry))).toBe(true);
  timeline=await allocate(slots.filter((slot:any)=>slot.weekNumber===2).map((slot:any)=>slot.id),['Outcome 1b']);
  expect(timeline.weeks[1].lessons.every((lesson:any)=>lesson.entry.subStrandId==='director-sub')).toBe(true);
  expect(timeline.scheme.planningState!.allocations).toEqual(original);
  // Other strands can be placed late in the term without filling every earlier week.
  timeline=await allocate(slots.filter((slot:any)=>slot.weekNumber===5).slice(0,2).map((slot:any)=>slot.id),['Outcome 2a'],'paced-sub-2');
  expect(timeline.weeks[4].lessons.filter((lesson:any)=>lesson.entry)).toHaveLength(2);
  expect(timeline.weeks[2].lessons.every((lesson:any)=>!lesson.entry)).toBe(true);
  expect(timeline.weeks[5].lessons.every((lesson:any)=>!lesson.entry)).toBe(true);
 });
 it('supports lesson 2–4 only and retains a replaced draft in history',async()=>{
  const slots=saved.slots.filter((slot:any)=>slot.weekNumber===1&&slot.lessonNumber>=2&&slot.lessonNumber<=4).map((slot:any)=>slot.id);
  let timeline=await allocate(slots);
  expect(timeline.weeks[0].lessons.map((lesson:any)=>Boolean(lesson.entry))).toEqual([false,true,true,true,false]);
  const old=timeline.weeks[0].lessons[1].entry!.id;
  timeline=await allocate([slots[0]],['Outcome 1b']);
  expect(timeline.scheme.entries.find(entry=>entry.id===old)!.archivedAt).toBeTruthy();
  expect(timeline.weeks[0].lessons[1].entry!.specificLearningOutcomes).toEqual(['Outcome 1b']);
 });
 it('rejects forged slots, duplicate periods, outcomes outside the saved coverage and cross-school access',async()=>{
  const slot=saved.slots[0].id;
  await expect(allocate(['not-a-timetable-period'])).rejects.toThrow('eligible teaching periods');
  await expect(allocate([slot,slot])).rejects.toThrow('once');
  await expect(allocate([slot],['Invented outcome'])).rejects.toThrow('saved syllabus');
  await expect(allocate([slot],['Outcome 1a'],'unknown-sub')).rejects.toThrow('saved syllabus');
  await expect(allocate([slot],['Outcome 1a'],'director-sub',{...teacher,schoolId:'another-school'})).rejects.toThrow();
  await expect(c.termAllocations.allocateSessions(teacher,saved.scheme.id,0,'director-sub',[slot],content)).rejects.toThrow('reload');
  expect((await c.schemeOfWorkRepository.findById(saved.scheme.id))!.entries).toHaveLength(0);
 });
 it('retains approved sessions and lessons already linked to teaching documents',async()=>{
  let timeline=await allocate(saved.slots.filter((slot:any)=>slot.weekNumber===1).map((slot:any)=>slot.id));
  const submitted=await c.termAllocations.submitWeekly(teacher,saved.scheme.id,timeline.scheme.planningState!.revision);
  await c.curriculumUseCases.reviewScheme(saved.scheme.id,admin.userId,true,'Approved Week 1',admin);
  await expect(allocate([saved.slots[0].id])).rejects.toThrow('Approved scheme lessons');
  timeline=await allocate([saved.slots[5].id]);
  const lesson=timeline.weeks[1].lessons[0];
  const record=await c.recordOfWorkUseCases.createDiaryEntry({...scope,schoolId:teacher.schoolId,teacherId:teacher.userId,weekNumber:2,lessonDate:lesson.date,lessonPeriod:'1',strand:lesson.entry!.strandTitle,subStrand:lesson.entry!.subStrandTitle,lessonTopic:'Paced lesson',learningObjectives:'Outcome 1a',learningActivities:'Compare models',status:'DRAFT',planningLink:{schemeId:saved.scheme.id,schemeEntryId:lesson.entry!.id,slotId:lesson.id}},teacher);
  await expect(allocate([saved.slots[5].id],['Outcome 1b'])).rejects.toThrow('Record of Work');
  expect(await c.recordOfWorkRepository.findById(record.id)).not.toBeNull();
  expect((await c.schemeOfWorkRepository.findById(saved.scheme.id))!.entries.some(entry=>entry.id===lesson.entry!.id&&!entry.archivedAt)).toBe(true);
 });
 it('excludes a holiday from the week instead of fabricating a fifth lesson',async()=>{
  await c.calendarPlanning.saveCalendar(admin,scope,{startDate:'2026-11-09',endDate:'2026-12-18',teachingDays:[1,2,3,4,5],exceptions:[{date:'2026-11-11',kind:'HOLIDAY',reason:'School holiday'}],published:true},1);
  await expect(allocate(['2026-11-11:p1'])).rejects.toThrow('eligible teaching periods');
  const timeline=await c.termAllocations.weekly(teacher,saved.scheme.id);
  expect(timeline.weeks[0].lessons).toHaveLength(4);
  expect(timeline.weeks[1].lessons).toHaveLength(5);
 });
 it('submits only the selected completed lessons and retains the remaining lessons as drafts',async()=>{
  await allocate(saved.slots.filter((slot:any)=>slot.weekNumber<=2).map((slot:any)=>slot.id));
  const before=(await c.schemeOfWorkRepository.findById(saved.scheme.id))!;
  const selected=before.entries.filter(entry=>!entry.archivedAt).slice(0,2).map(entry=>entry.id);
  const submitted=await c.termAllocations.submitWeekly(teacher,saved.scheme.id,before.planningState!.revision,selected);
  expect(submitted.scheme.planningState!.submittedEntryIds).toEqual(selected);
  expect(submitted.scheme.entries.filter(entry=>!entry.archivedAt)).toHaveLength(10);
  const reviewed=await c.curriculumUseCases.reviewScheme(saved.scheme.id,admin.userId,true,'Selected lessons verified',admin);
  expect(reviewed.planningState!.approvedEntryIds).toEqual(selected);
  expect(reviewed.entries.filter(entry=>!entry.archivedAt&&!reviewed.planningState!.approvedEntryIds!.includes(entry.id))).toHaveLength(8);
 });
});

describe('schemes before school opens; daily lessons after timetable setup',()=>{
 const futureScope={...scope,academicYearId:'future-year',termId:'future-term'};
 const pacing={weeks:12,lessonsPerWeek:5};
 let plan:any;
 beforeEach(async()=>{
  await c.academicRepository.saveYear(AcademicYear.create({schoolId:teacher.schoolId,name:'2027',startDate:'2027-01-01',endDate:'2027-12-31',isCurrent:false},futureScope.academicYearId));
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:futureScope.academicYearId,name:'Term 1',termNumber:1,startDate:'2027-01-04',endDate:'2027-03-26',isCurrent:false},futureScope.termId));
  await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({...futureScope,schoolId:teacher.schoolId,teacherId:'director-profile',role:'SUBJECT_TEACHER',effectiveFrom:'2027-01-01',isActive:true},'future-duty'));
  plan=await c.termAllocations.saveDraft(teacher,futureScope,[{subStrandId:'director-sub',lessons:3}],0);
  plan=await c.termAllocations.submitCoverage(teacher,plan.scheme.id,plan.scheme.planningState.revision);
  plan=await c.termAllocations.reviewCoverage(admin,plan.scheme.id,plan.scheme.planningState.revision,true,'Approved before opening');
 });
 async function approvedBeforeOpening(){
  let weekly=await c.termAllocations.allocateSessions(teacher,plan.scheme.id,plan.scheme.planningState.revision,'director-sub',['scheme:w1:l1','scheme:w1:l2','scheme:w1:l3','scheme:w1:l4','scheme:w1:l5'],content,pacing);
  expect(weekly.weeks).toHaveLength(12);
  expect(weekly.weeks[0].lessons.every((lesson:any)=>lesson.entry&&!lesson.date)).toBe(true);
  const selected=weekly.scheme.entries.filter(entry=>!entry.archivedAt).map(entry=>entry.id);
  await c.termAllocations.submitWeekly(teacher,plan.scheme.id,weekly.scheme.planningState!.revision,selected);
  await c.curriculumUseCases.reviewScheme(plan.scheme.id,admin.userId,true,'Scheme ready before opening',admin);
  return c.termAllocations.weekly(teacher,plan.scheme.id);
 }
 it('saves and reviews syllabus estimates beyond grid capacity without a calendar or timetable',async()=>{
  const reopened=await c.termAllocations.reopen(teacher,plan.scheme.id,plan.scheme.planningState.revision,'Revise syllabus pacing before opening');
  let coverage=await c.termAllocations.saveDraft(teacher,futureScope,[{subStrandId:'director-sub',lessons:1000}],reopened.scheme.planningState!.revision,plan.scheme.id);
  expect(coverage.setupRequired).toBeUndefined();
  expect(coverage.progress.excess).toBeGreaterThan(0);
  expect(coverage.scheme.entries).toEqual([]);
  coverage=await c.termAllocations.submitCoverage(teacher,plan.scheme.id,coverage.scheme.planningState!.revision);
  coverage=await c.termAllocations.reviewCoverage(admin,plan.scheme.id,coverage.scheme.planningState!.revision,true,'Pacing estimate reviewed');
  expect(coverage.scheme.planningState!.coverageReviewStatus).toBe('APPROVED');
  expect(coverage.scheme.planningState!.allocations[0].lessons).toBe(1000);
  expect(coverage.setupRequired).toBeUndefined();
 });
 it('saves, submits and approves a future-term scheme without a calendar or timetable',async()=>{
  const weekly=await approvedBeforeOpening();
  expect(weekly.scheme.status).toBe('APPROVED');
  expect(weekly.scheme.planningState!.pacing).toEqual(pacing);
  expect(weekly.scheme.entries.filter(entry=>!entry.archivedAt)).toHaveLength(5);
  expect(weekly.timetableSlots).toHaveLength(0);
  expect(weekly.weeks.slice(1).every((week:any)=>week.lessons.every((lesson:any)=>!lesson.entry))).toBe(true);
  await expect(c.calendarPlanning.slots(teacher,futureScope)).rejects.toThrow('publish the term calendar');
 });
 it('keeps daily lesson creation tied to a valid timetable and permits its date to differ from the scheme planning week',async()=>{
  const weekly=await approvedBeforeOpening();
  const lesson=weekly.weeks[0].lessons[0];
  const input={...planInput(lesson),...futureScope,lessonDate:'2027-01-11',lessonTime:'09:00-09:35'};
  await expect(c.curriculumUseCases.createLessonPlan(input,teacher)).rejects.toThrow('publish the term calendar');
  await c.calendarPlanning.saveCalendar(admin,futureScope,{startDate:'2027-01-04',endDate:'2027-03-26',teachingDays:[1,2,3,4,5],exceptions:[],published:true},0);
  await expect(c.curriculumUseCases.createLessonPlan(input,teacher)).rejects.toThrow('active class/stream timetable');
  await c.timetableRepository.save(Timetable.create({...futureScope,schoolId:teacher.schoolId,isActive:true,slots:[{id:'future-period',dayOfWeek:'MONDAY',periodNumber:1,startTime:'09:00',endTime:'09:35',learningAreaId:scope.learningAreaId,isBreak:false,isLunch:false}]},'future-timetable'));
  await expect(c.curriculumUseCases.createLessonPlan({...input,lessonDate:'2027-01-12'},teacher)).rejects.toThrow('active timetable');
  await expect(c.curriculumUseCases.createLessonPlan({...input,durationMinutes:40},teacher)).rejects.toThrow('duration');
  const daily=await c.curriculumUseCases.createLessonPlan(input,teacher);
  expect(daily).toMatchObject({lessonDate:'2027-01-11',weekNumber:2,lessonNumber:1,durationMinutes:35});
  const unchanged=(await c.schemeOfWorkRepository.findById(plan.scheme.id))!;
  expect(unchanged.entries.find(entry=>entry.id===lesson.entry.id)).toMatchObject({weekNumber:1,lessonNumber:1,slotId:'scheme:w1:l1'});
  const refreshed=await c.termAllocations.weekly(teacher,plan.scheme.id);
  expect(refreshed.weeks).toHaveLength(12);
  expect(refreshed.weeks[0].lessons).toHaveLength(5);
  expect(refreshed.weeks[0].lessons[0].lessonPlan.id).toBe(daily.id);
  expect(refreshed.weeks[0].lessons[0].date).toBe('2027-01-11');
 });
 it('retains saved and approved lesson positions when the requested planning grid is too small',async()=>{
  const weekly=await c.termAllocations.allocateSessions(teacher,plan.scheme.id,plan.scheme.planningState.revision,'director-sub',['scheme:w12:l5'],content,pacing);
  await expect(c.termAllocations.allocateSessions(teacher,plan.scheme.id,weekly.scheme.planningState!.revision,'director-sub',['scheme:w1:l1'],content,{weeks:3,lessonsPerWeek:5})).rejects.toThrow('retain all existing');
  expect((await c.schemeOfWorkRepository.findById(plan.scheme.id))!.entries.some(entry=>entry.weekNumber===12&&entry.lessonNumber===5&&!entry.archivedAt)).toBe(true);
 });
 it('can remove an unapproved scheme draft position without any timetable',async()=>{
  const weekly=await c.termAllocations.allocateSessions(teacher,plan.scheme.id,plan.scheme.planningState.revision,'director-sub',['scheme:w1:l1','scheme:w1:l2'],content,pacing);
  const removed=weekly.scheme.entries.find(entry=>entry.lessonNumber===1)!;
  await c.curriculumUseCases.archiveCancelledEntry(plan.scheme.id,removed.id,teacher);
  const stored=(await c.schemeOfWorkRepository.findById(plan.scheme.id))!;
  expect(stored.entries.find(entry=>entry.id===removed.id)!.archivedAt).toBeTruthy();
  expect(stored.entries.filter(entry=>!entry.archivedAt)).toHaveLength(1);
  const remaining=stored.entries.find(entry=>!entry.archivedAt)!;
  await c.termAllocations.submitWeekly(teacher,plan.scheme.id,stored.planningState!.revision,[remaining.id]);
  await c.curriculumUseCases.reviewScheme(plan.scheme.id,admin.userId,true,'Remaining lesson approved',admin);
  await expect(c.curriculumUseCases.archiveCancelledEntry(plan.scheme.id,remaining.id,teacher)).rejects.toThrow();
 });
 it('retains the chosen planning grid when syllabus estimates are edited',async()=>{
  const weekly=await c.termAllocations.allocateSessions(teacher,plan.scheme.id,plan.scheme.planningState.revision,'director-sub',['scheme:w12:l5'],content,pacing);
  const reopened=await c.termAllocations.reopen(teacher,plan.scheme.id,weekly.scheme.planningState!.revision,'Revise the source pacing estimate');
  const updated=await c.termAllocations.saveDraft(teacher,futureScope,[{subStrandId:'director-sub',lessons:8}],reopened.scheme.planningState!.revision,plan.scheme.id);
  expect(updated.scheme.planningState!.pacing).toEqual(pacing);
  expect(updated.scheme.planningState!.weeklyPlanningStarted).toBe(true);
  expect(updated.scheme.entries.some(entry=>entry.weekNumber===12&&entry.lessonNumber===5&&!entry.archivedAt)).toBe(true);
 });
});
