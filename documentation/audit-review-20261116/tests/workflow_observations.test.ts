// These probes record CURRENT behaviour, including defects. Passing is not compliance.
// Desired acceptance after fixes is documented in SMARTSHULE_CODEBASE_AUDIT.md.
import request from 'supertest';
import {AppContainer} from '../../../src/infrastructure/container';
import {createExpressApp} from '../../../src/infrastructure/http/app';
import {AcademicYear,AcademicTerm} from '../../../src/core/domain/academic/AcademicYear';
import {ClassRoom,LearningArea,EducationLevel} from '../../../src/core/domain/academic/ClassRoom';
import {SubjectTeacherAssignment} from '../../../src/core/domain/academic/TeacherAssignment';
import {CBCGradeLevel} from '../../../src/core/domain/user/Student';
import {Teacher} from '../../../src/core/domain/user/Teacher';
import {User,UserRole,UserStatus} from '../../../src/core/domain/user/User';
import {Timetable} from '../../../src/core/domain/timetable/Timetable';
import {SchemeOfWork,SchemeStatus} from '../../../src/core/domain/curriculum-plan/SchemeOfWork';
import {CurriculumTracker} from '../../../src/core/domain/curriculum-tracker/CurriculumTracker';
let c:AppContainer,app:any,slot:any;
const teacher={userId:'review-teacher',role:UserRole.TEACHER,schoolId:'review-school',email:'teacher@example.test'};
const admin={userId:'review-admin',role:UserRole.ADMIN,schoolId:'review-school',email:'admin@example.test'};
const scope={academicYearId:'review-year',termId:'review-term',classRoomId:'review-class',learningAreaId:'review-area'};
const auth=(actor=teacher)=>'Bearer '+c.tokenService.generateAccessToken(actor);
const content={specificLearningOutcomes:['Compare fractions'],keyInquiryQuestions:['Which is larger?'],learningExperiences:['Compare models'],learningResources:['Paper'],assessmentMethods:['Observation']};
beforeEach(async()=>{
 c=new AppContainer();app=createExpressApp(c);
 await c.academicRepository.saveYear(AcademicYear.create({schoolId:'review-school',name:'2026',startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:true},scope.academicYearId));
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:scope.academicYearId,name:'Term 3',termNumber:3,startDate:'2026-11-16',endDate:'2026-11-30',isCurrent:true},scope.termId));
 await c.academicRepository.saveClass(ClassRoom.create({schoolId:'review-school',name:'Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},scope.classRoomId));
 await c.academicRepository.saveLearningArea(LearningArea.create({schoolId:'review-school',name:'Mathematics',code:'MAT',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},scope.learningAreaId));
 for(const actor of [teacher,admin])await c.userRepository.save(User.create({email:actor.email,firstName:'Synthetic',lastName:actor.role,role:actor.role,status:UserStatus.ACTIVE,schoolId:actor.schoolId,passwordHash:'test-only'},actor.userId));
 await c.teacherRepository.save(Teacher.create({userId:teacher.userId,employeeNumber:'REVIEW-1',specialization:[],assignedClassStreamIds:[]},'review-profile'));
 await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({...scope,schoolId:'review-school',teacherId:'review-profile',role:'SUBJECT_TEACHER',isActive:true,effectiveFrom:'2020-01-01'},'review-duty'));
 await c.timetableRepository.save(Timetable.create({...scope,schoolId:'review-school',isActive:true,slots:[{id:'period-1',dayOfWeek:'MONDAY',periodNumber:1,startTime:'09:00',endTime:'09:40',learningAreaId:scope.learningAreaId,isBreak:false,isLunch:false}]},'review-timetable'));
 await c.calendarPlanning.saveCalendar(admin,scope,{startDate:'2026-11-16',endDate:'2026-11-30',teachingDays:[1,2,3,4,5],exceptions:[],published:true},0);
 slot=(await c.calendarPlanning.slots(teacher,scope)).slots[0];
 await c.schemeOfWorkRepository.save(SchemeOfWork.create({...scope,teacherId:teacher.userId,title:'Review approved scheme',status:SchemeStatus.APPROVED,entries:[{id:'review-entry',slotId:slot.id,scheduledDate:slot.date,weekNumber:slot.weekNumber,lessonNumber:slot.lessonNumber,strandTitle:'Numbers',subStrandTitle:'Fractions',...content}]},'review-scheme'));
});
const makePlan=()=>c.curriculumUseCases.createLessonPlan({...scope,teacherId:teacher.userId,schemeOfWorkEntryId:'review-entry',lessonDate:slot.date,lessonTime:'09:00-09:40',durationMinutes:40,strand:'Numbers',subStrand:'Fractions',...content,coreCompetenciesAddressed:[],valuesAddressed:[],steps:[{stepNumber:1,stepTitle:'Development',durationMinutes:40,teacherActivities:'Model',learnerActivities:'Compare'}]},teacher);
const recordBody=(planId:string,status='DRAFT')=>({...scope,academicYear:'2026',term:'Term 3',teacherId:teacher.userId,lessonDate:slot.date,lessonPeriod:'1',weekNumber:slot.weekNumber,strand:'Numbers',subStrand:'Fractions',lessonTopic:'Fractions',learningActivities:'Compared models',strandAndWorkCovered:'Compared fractions',status,planningLink:{lessonPlanId:planId,schemeId:'review-scheme',schemeEntryId:'review-entry',slotId:slot.id}});

test('F04/F11 CURRENT GAP: assigned teacher creates curriculum visible immediately without publication approval',async()=>{
 const strand=await c.CBCUseCases.createStrand({learningAreaId:scope.learningAreaId,gradeLevel:CBCGradeLevel.GRADE_4,code:'REVIEW',title:'Teacher-proposed strand'},teacher);
 const found=await c.CBCUseCases.getStrandsByLearningArea(scope.learningAreaId,CBCGradeLevel.GRADE_4);
 expect(found.some(row=>row.id===strand.id)).toBe(true);expect(strand).not.toHaveProperty('approvalStatus');
});
test('F11 CURRENT GAP: a complete DRAFT lesson is saved but reflection, taught creation and planned progress require approval',async()=>{
 const plan=await makePlan();expect(plan.status).toBe('DRAFT');
 await expect(c.curriculumUseCases.updateLessonPlanReflection(plan.id,'Actual reflection',teacher)).rejects.toThrow('approved');
 const blocked=await request(app).post('/api/v1/curriculum/planning/record-taught').set('Authorization',auth()).send({...scope,lessonPlanId:plan.id,notes:'Compared models'});
 expect(blocked.status).toBe(400);expect(blocked.body.message).toContain('approved');
 const projection=await c.termAllocations.weekly(teacher,'review-scheme');expect(projection.weeks[0].lessons[0].statuses.planned).toBe(false);
});
test('F11 CURRENT BYPASS: teacher-supplied APPROVED status is accepted and marks session taught without reviewer evidence',async()=>{
 const plan=await makePlan();const result=await request(app).post('/api/v1/curriculum/records-of-work').set('Authorization',auth()).send(recordBody(plan.id,'APPROVED'));
 expect(result.status).toBe(201);expect(result.body.data.status).toBe('APPROVED');expect(result.body.data.reviewedByUserId).toBeUndefined();expect(result.body.data.isOfficialCoverage).toBe(false);
 expect((await c.termAllocations.weekly(teacher,'review-scheme')).weeks[0].lessons[0].statuses.taught).toBe(true);
});
test('F11 ordinary submitted records do not count taught; leadership approval does, but overconfirms an entire week',async()=>{
 const plan=await makePlan();const record=await c.recordOfWorkUseCases.createDiaryEntry(recordBody(plan.id,'SUBMITTED') as any,teacher);
 expect((await c.termAllocations.weekly(teacher,'review-scheme')).weeks[0].lessons[0].statuses.taught).toBe(false);
 await c.recordOfWorkUseCases.approveDiaryEntry(record.id,{remarks:'Verified one lesson'},admin);
 expect((await c.termAllocations.weekly(teacher,'review-scheme')).weeks[0].lessons[0].statuses.taught).toBe(true);
 const trackers=await c.curriculumTrackerRepository.findTrackers({schoolId:'review-school',classRoomId:scope.classRoomId,learningAreaId:scope.learningAreaId});
 expect(trackers[0].items[0].isCovered).toBe(true);expect(trackers[0].items[0].plannedLessons).toBe(4);
});
test('F11 CURRENT GAP: leadership can approve a DRAFT record without teacher submission',async()=>{
 const plan=await makePlan();const record=await c.recordOfWorkUseCases.createDiaryEntry(recordBody(plan.id) as any,teacher);
 expect(record.status).toBe('DRAFT');expect((await c.recordOfWorkUseCases.approveDiaryEntry(record.id,{},admin)).status).toBe('APPROVED');
});
test('F11 CURRENT BYPASS: teacher can directly confirm tracker coverage without approved records',async()=>{
 await c.curriculumTrackerRepository.save(CurriculumTracker.create({schoolId:'review-school',teacherId:teacher.userId,teacherName:'Review Teacher',learningAreaId:scope.learningAreaId,subjectName:'Mathematics',classRoomId:scope.classRoomId,className:'Grade 4',academicYear:'2026',term:'Term 3',totalWeeks:12,items:[],status:'ACTIVE'},'review-tracker'));
 const result=await request(app).post('/api/v1/curriculum-tracker/review-tracker/weeks/1/confirm-covered').set('Authorization',auth()).send({covered:true});
 expect(result.status).toBe(200);const tracker=await c.curriculumTrackerRepository.findById('review-tracker');expect(tracker!.items[0].status).toBe('APPROVED');expect(tracker!.items[0].isCovered).toBe(true);
 expect(await c.recordOfWorkRepository.find({schoolId:'review-school'})).toEqual([]);
});
