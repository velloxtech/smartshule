import {AppContainer} from '../../../src/infrastructure/container';
import {CalendarPlanningController} from '../../../src/infrastructure/http/controllers/CalendarPlanningController';
import {memoizePlanningReads} from '../../../src/application/planning/PlanningReadContext';
import {AcademicYear, AcademicTerm} from '../../../src/core/domain/academic/AcademicYear';
import {ClassRoom, LearningArea, EducationLevel} from '../../../src/core/domain/academic/ClassRoom';
import {SubjectTeacherAssignment} from '../../../src/core/domain/academic/TeacherAssignment';
import {CBCGradeLevel} from '../../../src/core/domain/user/Student';
import {Teacher} from '../../../src/core/domain/user/Teacher';
import {UserRole} from '../../../src/core/domain/user/User';

const actor={schoolId:'performance-school',userId:'performance-teacher',role:UserRole.TEACHER};
const scope={academicYearId:'performance-year',termId:'performance-term',classRoomId:'performance-class'};
let c:AppContainer;
beforeEach(async()=>{
 c=new AppContainer();
 await c.academicRepository.saveYear(AcademicYear.create({schoolId:actor.schoolId,name:'2026',startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:true},scope.academicYearId));
 await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:scope.academicYearId,name:'Term 3',termNumber:3,startDate:'2026-09-01',endDate:'2026-12-01',isCurrent:true},scope.termId));
 await c.academicRepository.saveClass(ClassRoom.create({schoolId:actor.schoolId,name:'Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},scope.classRoomId));
 await c.teacherRepository.save(Teacher.create({userId:actor.userId,employeeNumber:'PERF-1',specialization:[],assignedClassStreamIds:[]},'performance-profile'));
 for(let i=0;i<4;i++){
  const learningAreaId=`performance-area-${i}`;
  await c.academicRepository.saveLearningArea(LearningArea.create({schoolId:actor.schoolId,name:`Area ${i}`,code:`A${i}`,gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},learningAreaId));
  if(i<3)await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({...scope,schoolId:actor.schoolId,teacherId:'performance-profile',learningAreaId,role:'SUBJECT_TEACHER',effectiveFrom:'2020-01-01',isActive:true},`performance-duty-${i}`));
 }
 await c.calendarPlanning.saveCalendar({...actor,role:UserRole.ADMIN},scope,{startDate:'2026-09-01',endDate:'2026-12-01',teachingDays:[1,2,3,4,5],exceptions:[],published:true},0);
});
async function request(method:'workspace'|'options',user=actor){
 let data:any;
 const next=jest.fn();
 await new CalendarPlanningController(c)[method]({query:{...scope},user} as any,{json:(value:any)=>{data=value.data;}} as any,next);
 if(next.mock.calls.length)throw next.mock.calls[0][0];
 return data;
}
it('reads the period and teacher assignments once while checking multiple subjects',async()=>{
 const year=jest.spyOn(c.academicRepository,'findYearById');
 const classes=jest.spyOn(c.academicRepository,'findClassTeacherAssignments');
 const subjects=jest.spyOn(c.academicRepository,'findSubjectTeacherAssignments');
 const profile=jest.spyOn(c.teacherRepository,'findByUserId');
 const timetable=jest.spyOn(c.timetableRepository,'findByClass');
 const result=await request('workspace');
 expect(result.areas.map((a:any)=>a.learningAreaId)).toEqual(['performance-area-0','performance-area-1','performance-area-2']);
 expect(result.areas.every((a:any)=>a.canPlan)).toBe(true);
 expect(result.areas.every((a:any)=>!a.setupRequired&&a.slots.length>0)).toBe(true);
 for(const query of [year,classes,subjects,profile,timetable])expect(query).toHaveBeenCalledTimes(1);
 // A new HTTP request gets fresh authorization data, never the earlier cache.
 await request('workspace');
 for(const query of [year,classes,subjects,profile,timetable])expect(query).toHaveBeenCalledTimes(2);
});
it('continues to reject an account without assignments and a different school',async()=>{
 await expect(request('workspace',{...actor,userId:'unassigned-user'})).rejects.toThrow('No teacher profile');
 await expect(request('workspace',{...actor,schoolId:'another-school'})).rejects.toThrow('Class access denied');
});
it('shares concurrent reads within one response and never shares them with another response',async()=>{
 const repository={findById:jest.fn(async(id:string)=>({id}))};
 const first=memoizePlanningReads(repository);
 await Promise.all([first.findById('same'),first.findById('same')]);
 expect(repository.findById).toHaveBeenCalledTimes(1);
 await first.findById('other');
 await memoizePlanningReads(repository).findById('same');
 expect(repository.findById).toHaveBeenCalledTimes(3);
});
