import {AppContainer} from '../../infrastructure/container';
import {AcademicActor} from '../shared/TeacherAssignmentAccess';
import {ConflictError,ForbiddenError,ValidationError,IdGenerator} from '../../core/domain/shared/Errors';
export type CurriculumChangeKind='STRAND'|'SUBSTRAND';
/** Pending changes are revisioned governance documents, never published catalog rows. */
export class CurriculumProposalService {
 constructor(private c:AppContainer){}
 private key(a:AcademicActor,area:string){return `curriculum-proposals:${a.schoolId}:${area}`;}
 private async area(a:AcademicActor,kind:CurriculumChangeKind,payload:any){
  const strand=kind==='SUBSTRAND'?await this.c.CBCAssessmentRepository.findStrandById(payload.strandId):null;
  const id=kind==='STRAND'?payload.learningAreaId:strand?.learningAreaId;
  if(!id)throw new ValidationError('Select a published learning area and strand.');
  const area=await this.c.academicRepository.findLearningAreaById(id);if(!area||area.schoolId!==a.schoolId)throw new ForbiddenError('School access denied.');return area;
 }
 async propose(a:AcademicActor,kind:CurriculumChangeKind,payload:any,targetId?:string){
  const area=await this.area(a,kind,payload);await this.c.assignmentAccess.assertSubjectEditor(a,area.id,area.gradeLevel);
  const key=this.key(a,area.id);const prior=await this.c.planningRepository.get(key);
  const pending=prior?.data.proposals.find((p:any)=>p.status==='SUBMITTED'&&p.proposedBy===a.userId&&p.kind===kind&&p.targetId===targetId&&JSON.stringify(p.payload)===JSON.stringify(payload));
  if(pending)return {...payload,id:pending.id,reviewStatus:'SUBMITTED',proposalId:pending.id};
  const existing=targetId?(kind==='STRAND'?await this.c.CBCAssessmentRepository.findStrandById(targetId):await this.c.CBCAssessmentRepository.findSubStrandById(targetId)):null;
  const proposal={id:IdGenerator.generate(),kind,payload,targetId,baseUpdatedAt:existing?.updatedAt.toISOString(),status:'SUBMITTED',proposedBy:a.userId,proposedAt:new Date().toISOString()};
  await this.c.planningRepository.save({key,schoolId:a.schoolId!,kind:'SEQUENCE',revision:(prior?.revision||0)+1,data:{type:'CURRICULUM_PROPOSALS',proposals:[...(prior?.data.proposals||[]),proposal]}},prior?.revision||0);
  return {...payload,id:proposal.id,reviewStatus:'SUBMITTED',proposalId:proposal.id};
 }
 async list(a:AcademicActor,areaId:string){const area=await this.c.academicRepository.findLearningAreaById(areaId);if(!area||area.schoolId!==a.schoolId)throw new ForbiddenError('School access denied.');
  if(a.role==='TEACHER')await this.c.assignmentAccess.assertSubjectEditor(a,areaId,area.gradeLevel);
  else if(!['ADMIN','SCHOOL_ADMIN','SUPER_ADMIN','HEAD_TEACHER','DEPUTY_HEAD_TEACHER'].includes(a.role))throw new ForbiddenError('Curriculum review access denied.');
  const doc=await this.c.planningRepository.get(this.key(a,areaId));return {revision:doc?.revision||0,proposals:(doc?.data.proposals||[]).filter((p:any)=>a.role!=='TEACHER'||p.proposedBy===a.userId)};
 }
 async review(a:AcademicActor,areaId:string,id:string,revision:number,approved:boolean,remarks:string){
  if(!['ADMIN','SCHOOL_ADMIN','SUPER_ADMIN','HEAD_TEACHER','DEPUTY_HEAD_TEACHER'].includes(a.role))throw new ForbiddenError('Only school leadership can publish curriculum proposals.');
  await this.list(a,areaId);const key=this.key(a,areaId);const doc=await this.c.planningRepository.get(key);if(!doc||doc.revision!==revision)throw new ConflictError('Curriculum review changed; reload before saving.');
  const p=doc.data.proposals.find((p:any)=>p.id===id);if(!p||p.status!=='SUBMITTED')throw new ValidationError('Only submitted proposals can be reviewed.');if(!remarks.trim())throw new ValidationError('Add review comments.');
  const area=await this.area(a,p.kind,p.payload);if(area.id!==areaId)throw new ValidationError('Proposal scope does not match.');
  if(p.targetId){const existing=p.kind==='STRAND'?await this.c.CBCAssessmentRepository.findStrandById(p.targetId):await this.c.CBCAssessmentRepository.findSubStrandById(p.targetId);if(existing?.updatedAt.toISOString()!==p.baseUpdatedAt)throw new ConflictError('Published curriculum changed. Return this proposal and request a fresh revision.');}
  // Reserve the review with CAS before publishing, so duplicate reviewers cannot publish twice.
  const processing={...doc,revision:revision+1,data:{...doc.data,proposals:doc.data.proposals.map((r:any)=>r.id===id?{...r,status:approved?'PUBLISHING':'RETURNED',reviewedBy:a.userId,reviewedAt:new Date().toISOString(),remarks}:r)}};
  await this.c.planningRepository.save(processing,revision);
  if(!approved)return this.list(a,areaId);
  try{
   const actor:any=a;let published:any;
   if(p.kind==='STRAND')published=p.targetId?await this.c.CBCUseCases.updateStrand(p.targetId,p.payload,actor):await this.c.CBCUseCases.createStrand(p.payload,actor);
   else published=p.targetId?await this.c.CBCUseCases.updateSubStrand(p.targetId,p.payload,actor):await this.c.CBCUseCases.createSubStrand(p.payload,actor);
   for(let attempt=0;attempt<5;attempt++){
    const current=await this.c.planningRepository.get(key);if(!current)throw new ConflictError('Reload curriculum review.');
    try{await this.c.planningRepository.save({...current,revision:current.revision+1,data:{...current.data,proposals:current.data.proposals.map((r:any)=>r.id===id?{...r,status:'APPROVED',publishedId:published.id}:r)}},current.revision);break;}
    catch(e){if(!(e instanceof ConflictError)||attempt===4)throw e;}
   }
  }catch(e){await this.c.planningRepository.save({...processing,revision:revision+2,data:{...processing.data,proposals:processing.data.proposals.map((r:any)=>r.id===id?{...r,status:'RETURNED',remarks:'Publication failed or conflicted; review the published catalog before proposing again.'}:r)}},revision+1).catch(()=>{});throw e;}
  return this.list(a,areaId);
 }
}
