import { Request, Response, NextFunction } from 'express';
import { AppContainer } from '../../container';
import { AcademicActor, TeachingScope, TeacherAssignmentAccess, sameTerm } from '../../../application/shared/TeacherAssignmentAccess';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../core/domain/shared/Errors';

/** Shared transport guard for every class-scoped route, including direct IDs and exports.
 * It complements use-case checks; client filters and repository filters are never authorization. */
export function teacherAssignmentGuard(c:AppContainer){return async(req:Request,res:Response,next:NextFunction)=>{
 const actor=(req as any).user as AcademicActor;
 if(!actor || actor.role!=='TEACHER')return next();
 try{
  if(req.query.schoolId && req.query.schoolId!==actor.schoolId)throw new ForbiddenError('School access denied.');
  const path=req.originalUrl.split('?')[0].replace(/^\/api\/v1/i,'');const segments=path.split('/').filter(Boolean).map(s=>decodeURIComponent(s));segments[0]=segments[0]?.toLowerCase();if(['curriculum','cbc'].includes(segments[0]))segments[1]=segments[1]?.toLowerCase();
  // Period selectors must be readable before a teaching period has been resolved.
  // Otherwise a missing current flag prevents the teacher from selecting a valid year.
  // These exact GET routes expose only school-scoped period metadata, not teaching data.
  if(req.method==='GET' && segments[0]==='academics' && (
    (segments.length===2 && ['years','terms'].includes(segments[1])) ||
    (segments.length===4 && segments[1]==='terms' && segments[2]==='by-year')
  )) {
    if(!actor.schoolId)throw new ForbiddenError('A school-scoped account is required.');
    if(segments.length===4){
      const requestedYear=await c.academicRepository.findYearById(segments[3]);
      if(!requestedYear || requestedYear.schoolId!==actor.schoolId)throw new ForbiddenError('Academic year access denied.');
    }
    return next();
  }
  // BroadsheetUseCases calculates subject-limited totals and aggregates per stream.
  // Generic response filtering cannot safely recalculate those derived values.
  if(segments[0]==='broadsheets'&&segments[1]==='stream')return next();
  // Timetable reads enforce self-only / class-teacher access in TimetableUseCases.
  // Generic subject filtering must not authorize a complete subject-only class grid.
  // Timetable mutations are restricted to leadership by their route role guards.
  if(segments[0]==='timetables')return next();
  // This self-service portal resolves children from the authenticated guardian identity.
  // Staff can have children outside their teaching assignments; applying teaching scope
  // here would hide their own family. The endpoint accepts no alternate parent identity.
  if (segments[0] === 'students' && segments[1] === 'guardian' && segments[2] === 'me') return next();
  // This endpoint independently enforces school/subject-editor access and returns only
  // the teacher’s own pending proposals. Proposals have no teaching cohort yet.
  if(segments[0]==='curriculum'&&segments[1]==='planning'&&segments[2]==='curriculum-proposals')return next();
  const privateWork=/^\/(curriculum(?:\/|$)|curriculum-trackers?(?:\/|$)|syllabus-coverage)/i.test(path);
  const access=new TeacherAssignmentAccess(c.academicRepository,c.teacherRepository);
  const years=await c.academicRepository.findAllYears(actor.schoolId);
  const batchPeriod = Array.isArray(req.body?.assessments) ? req.body.assessments[0] : undefined;
  const selectedYear=String(req.query.academicYearId || req.query.academicYear || req.query.yearId || req.body?.academicYearId || req.body?.academicYear || batchPeriod?.academicYearId || '') || (await c.academicRepository.findCurrentYear(actor.schoolId))?.id || '';
  const year=years.find(y=>y.id===selectedYear||y.name===selectedYear);
  if(!year)throw new ForbiddenError('Select a school academic year.');
  const terms=await c.academicRepository.findTermsByYear(year.id);
  const selectedTerm=String(req.query.termId || req.query.term || req.body?.termId || req.body?.term || batchPeriod?.termId || '') || (await c.academicRepository.findCurrentTerm(year.id))?.id || '';
  const resolveTerm=(value:string)=>terms.find(t=>sameTerm(t.id,value)||t.name.toLowerCase()===value.toLowerCase()||String(t.termNumber)===value.replace(/^term[-_ ]*/i,''));
  const term=resolveTerm(selectedTerm);if(!term)throw new ForbiddenError('Select a valid academic term.');
  if (Array.isArray(req.body?.assessments) && req.body.assessments.some((row:any) =>
    (row.academicYearId && row.academicYearId !== year.id && row.academicYearId !== year.name) ||
    (row.termId && resolveTerm(String(row.termId))?.id !== term.id))) {
    throw new ValidationError('A marks batch must use one academic year and term.');
  }
  const ownProfile=await c.teacherRepository.findByUserId(actor.userId);
  const ownIds=[actor.userId,ownProfile?.id];
  const studentCache=new Map<string,Promise<any>>();
  const studentById=(id:string)=>{if(!studentCache.has(id))studentCache.set(id,c.studentRepository.findById(id));return studentCache.get(id)!;};
  const catalogClasses=segments[0]==='academics'?await c.academicRepository.findAllClasses(actor.schoolId):[];
  const catalogAreas=segments[0]==='academics'?await c.academicRepository.findAllLearningAreas({schoolId:actor.schoolId}):[];
  const memo=new Map<string,Promise<boolean>>();
  const normalize=async(value:any):Promise<TeachingScope>=>{
   const v=typeof value?.toJSON==='function'?value.toJSON():value;
   if(v.borrowerType==='STUDENT')v.studentId=v.borrowerId;
   const y=v.academicYearId || v.academicYear;const recordYear=y?years.find(r=>r.id===y||r.name===String(y)):year;
   let recordTerm=v.termId || v.term;
   if(recordTerm){const possible=recordYear?.id===year.id?terms:await c.academicRepository.findTermsByYear(recordYear?.id || '');recordTerm=possible.find(t=>sameTerm(t.id,String(recordTerm))||t.name.toLowerCase()===String(recordTerm).toLowerCase()||String(t.termNumber)===String(recordTerm).replace(/^term[-_ ]*/i,''))?.id || '__invalid__';}
   let scope:TeachingScope={schoolId:v.schoolId || actor.schoolId,classRoomId:v.classRoomId || v.classroomId || v.classId,streamId:['all','All','ALL',''].includes(v.streamId)?undefined:v.streamId,learningAreaId:v.learningAreaId,academicYearId:recordYear?.id || '__invalid__',termId:recordTerm || term.id,teacherId:v.teacherId,lessonDate:v.lessonDate || v.date};
   if(!scope.classRoomId&&scope.streamId)scope.classRoomId=(await c.academicRepository.findStreamById(scope.streamId))?.classRoomId;
   if(v.studentId || v.learnerId){const student=await studentById(v.studentId || v.learnerId);if(!student)throw new ForbiddenError('Learner access denied.');scope={...scope,schoolId:student.schoolId,classRoomId:student.classroomId,streamId:student.streamId};}
   if(!scope.classRoomId && !scope.streamId && scope.learningAreaId){
    const area=await c.academicRepository.findLearningAreaById(scope.learningAreaId);
    if(!area)throw new ForbiddenError('Learning area access denied.');
    const classes=await c.academicRepository.findAllClasses(actor.schoolId);let found=false;
    for(const cls of classes.filter(x=>x.gradeLevel===area.gradeLevel)){
     const streams=await c.academicRepository.findStreamsByClass(cls.id);
     for(const stream of [undefined,...streams]){const candidate={...scope,classRoomId:cls.id,streamId:stream?.id};if(await access.can(actor,candidate,privateWork)){scope=candidate;found=true;break;}}
     if(found)break;
    }
    if(!found)throw new ForbiddenError('No active assignment permits this learning area.');
   }
   return scope;
  };
  const directoryOnly=segments[0]==='students'&&segments[1]!=='assessment-roster';
  const permitted=(scope:TeachingScope,own=privateWork)=>{const key=JSON.stringify([scope,own]);if(!memo.has(key))memo.set(key,directoryOnly?access.canClassTeacher(actor,scope):access.can(actor,scope,own));return memo.get(key)!;};
  const check=async(v:any,own=privateWork)=>{v=typeof v?.toJSON==='function'?v.toJSON():v;
   if(own&&v.id&&!v.teacherId)throw new ForbiddenError('This private record needs verified teacher ownership.');
   if(v.schoolId&&v.schoolId!==actor.schoolId)throw new ForbiddenError('School access denied.');
   if(v.studentIds?.length){for(const id of v.studentIds)await access.assert(actor,await normalize({studentId:id}),false);return normalize(v);}
   if(v.reportedByTeacherId&&!ownIds.includes(v.reportedByTeacherId))throw new ForbiddenError('An unlinked occurrence belongs to its reporting teacher.');
   if(v.borrowerType&&v.borrowerType!=='STUDENT'&&!ownIds.includes(v.borrowerId))throw new ForbiddenError('Borrower access denied.');
   if(v.reportedByTeacherId || (v.borrowerType&&v.borrowerType!=='STUDENT'))return normalize(v);
   const scope=await normalize(v);await access.assert(actor,scope,own);if(directoryOnly&&!await access.canClassTeacher(actor,scope))throw new ForbiddenError('Learners and guardians require a class-teacher assignment.');return scope;};
  (req as any).canAccessTeachingRecord=async(v:any)=>{try{await check(v,privateWork);const scope=await normalize(v);if(req.query.classRoomId&&scope.classRoomId!==req.query.classRoomId)return false;if(req.query.streamId&&scope.streamId!==req.query.streamId)return false;return scope.academicYearId===year.id&&sameTerm(scope.termId || '',term.id);}catch(e){if(e instanceof ForbiddenError)return false;throw e;}};
  (req as any).teachingContext={academicYearId:year.id,termId:term.id};
  let resource:any;
  if(segments[0]==='curriculum'&&segments[2]){
   if(segments[1]==='schemes')resource=await c.schemeOfWorkRepository.findById(segments[2]);
   if(segments[1]==='lesson-plans'){resource=await c.lessonPlanRepository.findById(segments[2]);if(resource){const source=(await c.schemeOfWorkRepository.findAll()).find(s=>s.entries.some(e=>e.id===resource.toJSON().schemeOfWorkEntryId));resource={...resource.toJSON(),academicYearId:source?.academicYearId,termId:source?.termId};}}
   if(segments[1]==='records-of-work'&&!['summary'].includes(segments[2]))resource=await c.recordOfWorkRepository.findById(segments[2]);
  }
  if(/^curriculum-trackers?$|^syllabus-coverage$/.test(segments[0])&&segments[1]&&!['summary','daily-logs'].includes(segments[1]))resource=await c.curriculumTrackerRepository.findById(segments[1]);
  if(segments[0]==='academics'){
   if(segments[1]==='terms'&&segments[2]==='by-year'&&segments[3]){const y=await c.academicRepository.findYearById(segments[3]);if(!y||y.schoolId!==actor.schoolId)throw new ForbiddenError('Academic year access denied.');}
   if(segments[1]==='years'&&segments[2]){const y=await c.academicRepository.findYearById(segments[2]);if(y&&y.schoolId!==actor.schoolId)throw new ForbiddenError('Academic year access denied.');}
   if(segments[1]==='learning-areas'&&segments[2]){const area=await c.academicRepository.findLearningAreaById(segments[2]);if(area)resource={...area.toJSON(),learningAreaId:area.id};}
  }
  if(segments[0]==='students')for(const id of segments.slice(1,3)){const student=await c.studentRepository.findById(id);if(student){resource={...student.toJSON(),academicYearId:year.id};break;}}
  if(segments[0]==='attendance')for(const id of segments.slice(1,3)){const r=await c.attendanceRepository.findRegisterById(id);if(r){resource=r;break;}}
  if(segments[0]==='timetables'&&req.body?.timetableId)resource=await c.timetableRepository.findById(req.body.timetableId);
  if(segments[0]==='timetables'&&segments[1])resource=await c.timetableRepository.findById(segments[1]) || resource;
  if(segments[0]==='cbc'&&segments[1]==='strands'&&segments[2]){
   if(segments[2]==='by-learning-area'&&segments[3])await check({learningAreaId:segments[3]},false);
   else resource=await c.CBCAssessmentRepository.findStrandById(segments[2]) || resource;
  }
  if(segments[0]==='cbc'&&segments[1]==='sub-strands'&&segments[2]){
   const strandId=segments[2]==='by-strand'?segments[3]:(await c.CBCAssessmentRepository.findSubStrandById(segments[2]))?.strandId;
   if(strandId)resource=await c.CBCAssessmentRepository.findStrandById(strandId) || resource;
  }
  if(segments[0]==='cbc'&&segments[2]){if(segments[1]==='summative')resource=await c.CBCAssessmentRepository.findSummativeById(segments[2]);if(segments[1]==='formative')resource=await c.CBCAssessmentRepository.findFormativeById(segments[2]);}
  if(segments[0]==='ediary'&&segments[1]&&typeof (c.ediaryRepository as any).findById==='function')resource=await c.ediaryRepository.findById(segments[1]);
  if(segments[0]==='curriculum'&&segments[1]==='planning'&&segments[2]==='record-taught'&&req.body.lessonPlanId)resource=await c.curriculumUseCases.getLessonPlanById(req.body.lessonPlanId,actor);
  if(segments[0]==='clinic'&&segments[1]==='profile'&&segments[2])await check({studentId:segments[2]},false);
  if(segments[0]==='clinic'&&segments[1]==='visits'&&segments[2])resource=await c.clinicRepository.findVisitById(segments[2]);
  if(segments[0]==='discipline'&&segments[1]==='incidents'&&segments[2])resource=await c.disciplineRepository.findIncidentById(segments[2]);
  if(segments[0]==='discipline'&&segments[1]==='student'&&segments[2])await check({studentId:segments[2]},false);
  if(segments[0]==='discipline'&&segments.includes('members')&&segments[4])await check({studentId:segments[4]},false);
  if(segments[0]==='library'&&segments[1]==='loans'&&segments[2]&&segments[2]!=='issue')resource=await c.libraryRepository.findLoanById(segments[2]);
  if(['occurrences','occurrence-book'].includes(segments[0])&&segments[1]&&!['stats','daily-summary'].includes(segments[1]))resource=await c.occurrenceRepository.findById(segments[1]);
  if(segments[0]==='media'&&segments[1]==='help-requests'&&segments[2])resource=await c.mediaRepository.findHelpRequestById(segments[2]);
  if(segments[0]==='media'&&segments[1]==='progress-photos'&&segments[2])resource=await c.mediaRepository.findProgressPhotoById(segments[2]);
  if(['attendance','ediary'].includes(segments[0])&&segments[1]==='student'&&segments[2])await check({studentId:segments[2]},false);
  if(segments[0]==='ediary'&&segments[1]==='stream'&&segments[2])await check({streamId:segments[2]},false);
  if(segments[0]==='cbc'&&req.body?.strandId){const strand=await c.CBCAssessmentRepository.findStrandById(req.body.strandId);if(!strand)throw new ForbiddenError('Strand access denied.');await check(strand,false);}
  if(resource)await check(resource);
  if(segments[0]==='attendance'&&segments.includes('entries')){const i=segments.indexOf('entries');if(segments[i+1])await check({studentId:segments[i+1]},false);}
  if(req.query.gradeLevel&&!req.query.classRoomId&&!req.query.streamId){const classes=await c.academicRepository.findAllClasses(actor.schoolId);let allowed=false;for(const cls of classes.filter(x=>x.gradeLevel===req.query.gradeLevel)){const streams=await c.academicRepository.findStreamsByClass(cls.id);for(const stream of [undefined,...streams])if(await access.can(actor,{schoolId:actor.schoolId,classRoomId:cls.id,streamId:stream?.id,academicYearId:year.id,termId:term.id}))allowed=true;}if(!allowed)throw new ForbiddenError('Grade access denied.');}
  const queryScope=await normalize(req.query);
  if(queryScope.classRoomId || queryScope.streamId || queryScope.learningAreaId)await check(req.query,false);
  for(const id of [req.query.studentId,req.query.learnerId].filter(Boolean))await check({studentId:id},false);
  if(actor.role==='TEACHER'&&/(?:export|print)/i.test(path)&&!resource&&!queryScope.classRoomId&&!queryScope.streamId)throw new ForbiddenError('Select an assigned class/stream before requesting this summary or export.');
  if(!['GET','HEAD'].includes(req.method)){
   const bodies=Array.isArray(req.body?.assessments)?req.body.assessments:[req.body];
   for(const body of bodies){if(!body)continue;const merged={...(resource?(typeof resource.toJSON==='function'?resource.toJSON():resource):{}),...body};
    if(merged.studentIds?.length || merged.reportedByTeacherId || merged.borrowerType)await check(merged,false);
    if(merged.memberStudentIds)for(const studentId of merged.memberStudentIds)await check({studentId},false);
    if(merged.classRoomId||merged.classroomId||merged.streamId||merged.studentId||merged.learningAreaId){await check(merged,privateWork || Boolean(merged.teacherId));}
    else if(actor.role==='TEACHER'&&privateWork&&!resource&&!(segments[1]==='planning'))throw new ForbiddenError('A class and learning area are required.');
    if(segments[0]==='curriculum'&&segments[1]==='records-of-work'&&req.method==='POST'&&!resource&&!body.planningLink)throw new ValidationError('Create a record from an approved scheduled scheme lesson. A detailed lesson plan is optional.');
    if(body.planningLink||resource?.toJSON?.().planningLink){
      const link=body.planningLink||resource.toJSON().planningLink;
      const existing=(resource?.toJSON?resource.toJSON():resource)?.planningLink;
      if(existing && body.planningLink && ['lessonPlanId','schemeId','schemeEntryId','slotId'].some(key=>existing[key]!==body.planningLink[key]))throw new ValidationError('Existing teaching links are immutable.');
      const plan=link.lessonPlanId?await c.curriculumUseCases.getLessonPlanById(link.lessonPlanId,actor):null;
      const scheme=await c.curriculumUseCases.getSchemeById(link.schemeId,actor);
      const entry=scheme.entries.find(e=>e.id===link.schemeEntryId);
      if(entry&&body.reflectionData?.outcomesCovered?.some((o:string)=>!entry.specificLearningOutcomes.includes(o)))throw new ValidationError('Covered outcomes must come from the approved scheme lesson.');
      if(!entry || entry.archivedAt || (scheme.planningState?.approvedEntryIds?!scheme.planningState.approvedEntryIds.includes(entry.id):scheme.status!=='APPROVED') || (plan&&plan.schemeOfWorkEntryId!==entry.id) || entry.slotId!==link.slotId || merged.classRoomId!==scheme.classRoomId || merged.learningAreaId!==scheme.learningAreaId || (merged.streamId || '')!==(scheme.streamId || '') || merged.academicYearId!==scheme.academicYearId || !sameTerm(merged.termId||'',scheme.termId) || (entry.scheduledDate&&merged.lessonDate<entry.scheduledDate))throw new ValidationError('Teaching record, scheme and lesson plan must refer to the same slot.');
    }
    for(const slot of [...(body.slots || []),...(body.slot?[body.slot]:[])])if(slot.learningAreaId)await check({...merged,learningAreaId:slot.learningAreaId},false);
    for(const entry of body.entries || [])if(entry.studentId)await check({studentId:entry.studentId},false);
   }
  }
  const original=res.json.bind(res);
  const filter=async(value:any,inherited:any={},root=false):Promise<any>=>{
   if(value===null||typeof value!=='object')return value;
   if(value instanceof Date)return value.toJSON();
   if(Array.isArray(value)){const rows=await Promise.all(value.map(v=>filter(v,inherited)));return rows.filter(v=>v!==undefined);}
   let v=typeof value.toJSON==='function'?value.toJSON():value;
   if(v.schoolId&&v.schoolId!==actor.schoolId)return undefined;
   if(v.studentIds || v.reportedByTeacherId || v.borrowerType){try{await check(v,false);}catch(e){if(e instanceof ForbiddenError)return undefined;throw e;}}
   if(v.memberStudentIds){const ids=[];for(const studentId of v.memberStudentIds)if(await permitted(await normalize({studentId}),false))ids.push(studentId);v={...v,memberStudentIds:ids,memberCount:ids.length};}
   let scopeData={...inherited,...v};
   // Resource selectors have generic IDs; translate these without trusting a grade label.
   if(segments[0]==='academics'){
    if(v.id&&catalogClasses.some(x=>x.id===v.id)){
      const streams=await c.academicRepository.findStreamsByClass(v.id);let allowed=false;
      for(const stream of [undefined,...streams])if(await permitted({schoolId:actor.schoolId,classRoomId:v.id,streamId:stream?.id,academicYearId:year.id,termId:term.id},false))allowed=true;
      if(!allowed)return undefined;return v;
    }
    if(segments[1]==='streams'&&v.id&&v.classRoomId)scopeData={...scopeData,streamId:v.id};
    if(v.id&&catalogAreas.some(a=>a.id===v.id)){const classes=catalogClasses;let allowed=false;for(const cls of classes.filter(x=>x.gradeLevel===v.gradeLevel)) {const streams=await c.academicRepository.findStreamsByClass(cls.id);for(const stream of [undefined,...streams])if(await permitted({schoolId:actor.schoolId,classRoomId:cls.id,streamId:stream?.id,learningAreaId:v.id,academicYearId:year.id,termId:term.id},false))allowed=true;}if(!allowed)return undefined;return v;}
   }
   if(segments[0]==='students'&&v.id&&v.admissionNumber)scopeData={...scopeData,academicYearId:year.id};
   if(scopeData.borrowerType==='STUDENT')scopeData.studentId=scopeData.borrowerId;
   const scoped=scopeData.classRoomId||scopeData.classroomId||scopeData.classId||scopeData.studentId||scopeData.learnerId||scopeData.streamId||scopeData.learningAreaId;
   if(scoped){try{if(privateWork&&Object.prototype.hasOwnProperty.call(v,'teacherId')&&!v.teacherId)throw new ForbiddenError('Verified ownership is required.');const scope=await normalize(scopeData);if(!await permitted(scope))return undefined;if(actor.role==='TEACHER'&&scope.academicYearId!==year.id)return undefined;if(actor.role==='TEACHER'&&scope.termId&&!sameTerm(scope.termId,term.id))return undefined;}catch(e){if(e instanceof ForbiddenError)return undefined;throw e;}}
   const out:any={};for(const [key,child]of Object.entries(v)){if(child&&typeof child==='object'){const clean=await filter(child,scoped?scopeData:inherited);if(clean!==undefined)out[key]=clean;}else out[key]=child;}
   if(Array.isArray(out.data)){if(typeof out.count==='number')out.count=out.data.length;if(typeof out.total==='number')out.total=out.data.length;}
   return out;
  };
  (res as any).json=(body:any)=>{filter(body,{},true).then(clean=>{if(clean===undefined)throw new ForbiddenError('Record access denied.');if(body?.data&&typeof body.data==='object'&&!Array.isArray(body.data)&&clean?.data===undefined)throw new ForbiddenError('Record access denied.');original(clean);}).catch(next);return res;};
  next();
 }catch(error){next(error);}
};}
