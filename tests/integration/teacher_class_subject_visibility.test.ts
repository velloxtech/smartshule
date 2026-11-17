import request from 'supertest';
import {AppContainer} from '../../src/infrastructure/container';
import {createExpressApp} from '../../src/infrastructure/http/app';
import {AcademicYear,AcademicTerm} from '../../src/core/domain/academic/AcademicYear';
import {ClassRoom,Stream,LearningArea,EducationLevel} from '../../src/core/domain/academic/ClassRoom';
import {ClassTeacherAssignment,SubjectTeacherAssignment} from '../../src/core/domain/academic/TeacherAssignment';
import {Teacher} from '../../src/core/domain/user/Teacher';
import {User,UserRole,UserStatus} from '../../src/core/domain/user/User';
import {Student,CBCGradeLevel,StudentGender,StudentStatus} from '../../src/core/domain/user/Student';
import {SummativeAssessment,PerformanceLevel} from '../../src/core/domain/cbc/CbcAssessment';

describe('Alpha class teacher and West Science-only teacher',()=>{
 let c:AppContainer,app:any;
 const actor={userId:'hybrid-user',email:'hybrid@example.test',role:UserRole.TEACHER,schoolId:'school-001'};
 const query='academicYearId=visibility-year&termId=visibility-term';
 const auth=()=>`Bearer ${c.tokenService.generateAccessToken(actor)}`;
 beforeEach(async()=>{
  c=new AppContainer();app=createExpressApp(c);
  await c.academicRepository.saveYear(AcademicYear.create({schoolId:actor.schoolId,name:'2026',startDate:'2026-01-01',endDate:'2026-12-31',isCurrent:true},'visibility-year'));
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:'visibility-year',name:'Term 3',termNumber:3,startDate:'2026-09-01',endDate:'2026-12-31',isCurrent:true},'visibility-term'));
  await c.userRepository.save(User.create({...actor,firstName:'Hybrid',lastName:'Teacher',status:UserStatus.ACTIVE,passwordHash:'test-only'},actor.userId));
  await c.teacherRepository.save(Teacher.create({userId:actor.userId,employeeNumber:'H1',specialization:[],assignedClassStreamIds:['west']},'hybrid-profile'));
  await c.academicRepository.saveClass(ClassRoom.create({schoolId:actor.schoolId,name:'Grade 4',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY},'grade4'));
  for(const id of ['alpha','west','unassigned'])await c.academicRepository.saveStream(Stream.create({classRoomId:'grade4',name:id,capacity:40},id));
  for(const id of ['math','science'])await c.academicRepository.saveLearningArea(LearningArea.create({schoolId:actor.schoolId,name:id==='math'?'Mathematics':'Science and Technology',code:id==='math'?'MATH':'SCI',gradeLevel:CBCGradeLevel.GRADE_4,educationLevel:EducationLevel.UPPER_PRIMARY,isElective:false},id));
  await c.academicRepository.saveClassTeacherAssignment(ClassTeacherAssignment.create({schoolId:actor.schoolId,academicYearId:'visibility-year',classRoomId:'grade4',streamId:'alpha',teacherId:'hybrid-profile',isActive:true,effectiveFrom:'2020-01-01'},'alpha-duty'));
  await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({schoolId:actor.schoolId,academicYearId:'visibility-year',classRoomId:'grade4',streamId:'west',learningAreaId:'science',teacherId:'hybrid-profile',role:'SUBJECT_TEACHER',isActive:true,effectiveFrom:'2020-01-01'},'west-science-duty'));
  for(const streamId of ['alpha','west','unassigned']){
   const studentId=streamId+'-student';
   await c.studentRepository.save(Student.create({schoolId:actor.schoolId,academicYearId:'visibility-year',admissionNumber:studentId,firstName:streamId,lastName:'Learner',gradeLevel:CBCGradeLevel.GRADE_4,classroomId:'grade4',streamId,dateOfBirth:'2016-01-01',gender:StudentGender.FEMALE,status:StudentStatus.ACTIVE,guardianIds:['sensitive-guardian'],medicalConditions:'private health note'},studentId));
   for(const learningAreaId of ['math','science'])await c.CBCAssessmentRepository.saveSummative(SummativeAssessment.create({studentId,learningAreaId,academicYearId:'visibility-year',termId:'visibility-term',teacherId:'another-teacher',gradeLevel:CBCGradeLevel.GRADE_4,assessmentDate:'2026-11-10',assessmentType:'END_TERM',strandScores:[{strandId:'s',strandTitle:'Test',rawScore:learningAreaId==='math'?95:60,maxScore:100,performanceLevel:PerformanceLevel.MEETING_EXPECTATIONS}],overallPerformanceLevel:PerformanceLevel.MEETING_EXPECTATIONS} as any,`${streamId}-${learningAreaId}`));
  }
 });
 it('loads school period selectors without current flags and retains saved assignments',async()=>{
  const year=(await c.academicRepository.findYearById('visibility-year'))!;year.setCurrent(false);await c.academicRepository.updateYear(year);
  const term=(await c.academicRepository.findTermById('visibility-term'))!;term.setCurrent(false);await c.academicRepository.updateTerm(term);
  await c.academicRepository.saveYear(AcademicYear.create({schoolId:'other-school',name:'2027',startDate:'2027-01-01',endDate:'2027-12-31',isCurrent:true},'other-year'));
  await c.academicRepository.saveTerm(AcademicTerm.create({academicYearId:'other-year',name:'Term 1',termNumber:1,startDate:'2027-01-01',endDate:'2027-04-01',isCurrent:true},'other-term'));
  const years=await request(app).get('/api/v1/academics/years').set('Authorization',auth());
  expect(years.status).toBe(200);expect(years.body.data.map((r:any)=>r.id)).toEqual(['visibility-year']);
  for(const path of ['/api/v1/academics/terms','/api/v1/academics/terms/by-year/visibility-year']){
   const terms=await request(app).get(path).set('Authorization',auth());expect(terms.status).toBe(200);expect(terms.body.data.map((r:any)=>r.id)).toEqual(['visibility-term']);
  }
  expect((await request(app).get('/api/v1/academics/terms/by-year/other-year').set('Authorization',auth())).status).toBe(403);
  expect((await request(app).get('/api/v1/academics/years?schoolId=other-school').set('Authorization',auth())).status).toBe(403);
  expect((await request(app).get('/api/v1/students').set('Authorization',auth())).status).toBe(403);
  const options=await request(app).get('/api/v1/curriculum/planning/options?'+query).set('Authorization',auth());
  expect(options.status).toBe(200);expect(options.body.data.some((r:any)=>r.id==='grade4')).toBe(true);
  expect((await c.academicRepository.findClassTeacherAssignments({teacherId:'hybrid-profile',schoolId:actor.schoolId,academicYearId:'visibility-year',isActive:true})).map(r=>r.id)).toEqual(['alpha-duty']);
 });
 it('lists only Alpha in Learners and Guardians and blocks West dossier by direct ID',async()=>{
  const response=await request(app).get('/api/v1/students?'+query).set('Authorization',auth());
  expect(response.status).toBe(200);expect(response.body.data.map((row:any)=>row.id)).toEqual(['alpha-student']);
  expect((await request(app).get('/api/v1/students/west-student?'+query).set('Authorization',auth())).status).toBe(403);
 });
 it('provides minimal Alpha/West roster identities without guardian, medical or fee details',async()=>{
  const response=await request(app).get('/api/v1/students/assessment-roster?'+query).set('Authorization',auth());
  expect(response.status).toBe(200);expect(response.body.data.map((row:any)=>row.id).sort()).toEqual(['alpha-student','west-student']);
  for(const row of response.body.data){expect(row).not.toHaveProperty('guardianIds');expect(row).not.toHaveProperty('medicalConditions');expect(row).not.toHaveProperty('feeBalance');expect(row).not.toHaveProperty('guardians');}
 });
 it('returns only Science and Science-derived totals for West, without school-wide comparisons',async()=>{
  const response=await request(app).get('/api/v1/broadsheets/stream?streamId=west&classId=grade4&'+query).set('Authorization',auth());
  expect(response.status).toBe(200);const result=response.body.data;
  expect(result.learningAreas.map((row:any)=>row.id)).toEqual(['science']);expect(Object.keys(result.rows[0].subjects)).toEqual(['science']);
  expect(result.rows[0].totalScore).toBe(60);expect(result.rows[0].studentId).toBe('west-student');
  expect(result.streamSections.map((row:any)=>row.streamId)).toEqual(['west']);
  expect(result.schoolTopStudents).toEqual([]);expect(result.schoolSubjectSummaries).toEqual([]);expect(result.schoolClassRankings).toEqual([]);
 });
 it('retains all subjects for Alpha and prevents access to an unassigned stream',async()=>{
  const result=await c.broadsheetUseCases.getStreamBroadsheet({streamId:'alpha',classId:'grade4',academicYearId:'visibility-year',termId:'visibility-term'},actor);
  expect(result.learningAreas.map(row=>row.id).sort()).toEqual(['math','science']);expect(Object.keys(result.rows[0].subjects).sort()).toEqual(['math','science']);
  await expect(c.broadsheetUseCases.getStreamBroadsheet({streamId:'unassigned',classId:'grade4',academicYearId:'visibility-year',termId:'visibility-term'},actor)).rejects.toThrow();
 });
 it('allows marks for Alpha subjects and West Science, blocks West Mathematics and forged cached duties',async()=>{
  await expect(c.CBCUseCases.assertTeacherAuthorizedForMarks('grade4','alpha','math','visibility-year',actor)).resolves.toBeTruthy();
  await expect(c.CBCUseCases.assertTeacherAuthorizedForMarks('grade4','west','science','visibility-year',actor)).resolves.toBeTruthy();
  await expect(c.CBCUseCases.assertTeacherAuthorizedForMarks('grade4','west','math','visibility-year',actor)).rejects.toThrow();
  await expect(c.CBCUseCases.assertTeacherAuthorizedForMarks('grade4','unassigned','science','visibility-year',actor)).rejects.toThrow();
 });
 it('returns stream-specific authorized subject selectors',async()=>{
  const result=await c.academicUseCases.getTeacherAuthorizedContext(actor,'visibility-year','visibility-term');
  const cls=result.assignedClasses.find(row=>row.id==='grade4')!;
  expect(cls.subjectsByStream?.alpha.map(row=>row.id).sort()).toEqual(['math','science']);expect(cls.subjectsByStream?.west.map(row=>row.id)).toEqual(['science']);expect(cls.streams.map(row=>row.id).sort()).toEqual(['alpha','west']);
 });
 it('filters combined streams per stream and preserves full school access for leadership',async()=>{
  const mixed=await c.broadsheetUseCases.getStreamBroadsheet({streamId:'all',classId:'grade4',academicYearId:'visibility-year',termId:'visibility-term'},actor);
  expect(mixed.streamSections?.map(row=>row.streamId).sort()).toEqual(['alpha','west']);
  expect(Object.keys(mixed.rows.find(row=>row.studentId==='west-student')!.subjects)).toEqual(['science']);
  const admin=await c.broadsheetUseCases.getStreamBroadsheet({streamId:'west',classId:'grade4',academicYearId:'visibility-year',termId:'visibility-term'},{...actor,role:UserRole.ADMIN});
  expect(Object.keys(admin.rows[0].subjects).sort()).toEqual(['math','science']);
 });
 it('denies West mathematics even when requesting a minimal roster',async()=>{
  const roster=await c.studentUseCases.listAssessmentRoster({classroomId:'grade4',streamId:'west',learningAreaId:'math',academicYearId:'visibility-year',termId:'visibility-term',requestingUser:actor});
  expect(roster).toEqual([]);
 });
 it('filters assessment reads and rejects a direct URL for another West subject',async()=>{
  const list=await request(app).get('/api/v1/CBC/summative?studentId=west-student&'+query).set('Authorization',auth());
  expect(list.status).toBe(200);expect(list.body.data.map((row:any)=>row.learningAreaId)).toEqual(['science']);
  const direct=await request(app).get('/api/v1/CBC/summative/west-math?'+query).set('Authorization',auth());
  expect(direct.status).toBe(403);
 });
 it('removes subject-only access on revocation without affecting the class-teacher duty',async()=>{
  await c.academicRepository.saveSubjectTeacherAssignment(SubjectTeacherAssignment.create({schoolId:actor.schoolId,academicYearId:'visibility-year',classRoomId:'grade4',streamId:'west',learningAreaId:'science',teacherId:'hybrid-profile',role:'SUBJECT_TEACHER',isActive:false,effectiveFrom:'2020-01-01'},'west-science-duty'));
  const roster=await c.studentUseCases.listAssessmentRoster({requestingUser:actor});expect(roster.map(row=>row.id)).toEqual(['alpha-student']);
  await expect(c.broadsheetUseCases.getStreamBroadsheet({streamId:'west',classId:'grade4',academicYearId:'visibility-year',termId:'visibility-term'},actor)).rejects.toThrow();
 });

});
