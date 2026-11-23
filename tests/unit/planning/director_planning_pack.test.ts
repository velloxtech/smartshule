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
