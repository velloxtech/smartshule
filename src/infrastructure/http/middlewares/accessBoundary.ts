import {Response,NextFunction} from 'express';
import {AppContainer} from '../../container';
import {AuthenticatedRequest} from './authMiddleware';
import {ForbiddenError,UnauthorizedError} from '../../../core/domain/shared/Errors';
import {UserRole,BILLING_AUTHORIZED_ROLES} from '../../../core/domain/user/User';

const parentRoles = [UserRole.PARENT,UserRole.GUARDIAN];
const financeReaders = [...BILLING_AUTHORIZED_ROLES,UserRole.HEAD_TEACHER,UserRole.DEPUTY_HEAD_TEACHER,UserRole.ADMISSIONS];
const publicBankPaths = new Set(['/kcb-buni/callback','/kcb-buni/validate','/kcb-buni/confirm','/mpesa/callback','/kcb-buni/config']);

/** Module boundaries complement record-level checks; missing/new parent routes fail closed. */
export function createAccessBoundary(c:AppContainer) {
  return async(req:AuthenticatedRequest,res:Response,next:NextFunction)=>{
    try {
      const actor=req.user;if(!actor)return next();
      const path=req.path.replace(/\/$/,'').toLowerCase()||'/';
      if(actor.schoolId){
        for(const value of [req.query.schoolId,req.body?.schoolId]) {
          if(value!==undefined&&value!==actor.schoolId)throw new ForbiddenError('School access denied.');
        }
      }
      if(actor.schoolId) Object.defineProperty(req,'query',{value:{...req.query,schoolId:actor.schoolId},configurable:true,writable:true});
      const ownStudent = async(id:unknown) => {
        if(id===undefined)return;
        if(typeof id!=='string'||!id)throw new ForbiddenError('Invalid learner scope.');
        const learner=await c.studentRepository.findById(id);
        if(learner&&learner.schoolId!==actor.schoolId)throw new ForbiddenError('School access denied.');
      };
      await ownStudent(req.query.studentId);await ownStudent(req.body?.studentId);
      if(Array.isArray(req.body?.studentIds))for(const id of req.body.studentIds)await ownStudent(id);
      const resourceParts=req.path.split('/').filter(Boolean).map(part=>decodeURIComponent(part));
      if(resourceParts[0]?.toLowerCase()==='students'&&resourceParts[1]&&!['guardian','guardians','deleted','assessment-roster','promote-bulk','link-guardian'].includes(resourceParts[1].toLowerCase()))await ownStudent(resourceParts[1]);
      const assertClass=async(id:unknown)=>{
        if(typeof id!=='string'||!id)return;
        const row=await c.academicRepository.findClassById(id);
        if(row&&row.schoolId!==actor.schoolId)throw new ForbiddenError('Class school access denied.');
      };
      const assertYear=async(id:unknown)=>{
        if(typeof id!=='string'||!id)return;
        const row=await c.academicRepository.findYearById(id);
        if(row&&row.schoolId!==actor.schoolId)throw new ForbiddenError('Academic year school access denied.');
      };
      for(const source of [req.query,req.body||{}]){
        await assertClass(source.classRoomId||source.classroomId);
        await assertYear(source.academicYearId);
        if(typeof source.streamId==='string'&&source.streamId){const stream=await c.academicRepository.findStreamById(source.streamId);if(stream)await assertClass(stream.classRoomId);}
        if(typeof source.termId==='string'&&source.termId){const term=await c.academicRepository.findTermById(source.termId);if(term)await assertYear(term.academicYearId);}
      }
      if(resourceParts[0]?.toLowerCase()==='academics'){
        if(resourceParts[1]?.toLowerCase()==='terms'&&resourceParts[2]==='by-year')await assertYear(resourceParts[3]);
        if(resourceParts[1]?.toLowerCase()==='streams'&&resourceParts[2]==='by-class')await assertClass(resourceParts[3]);
      }
      if(actor.role===UserRole.STUDENT){
        if(req.method==='GET'&&/^\/(auth\/profile|academics\/(school|context|years|terms|learning-areas)|announcements(?:\/[^/]+)?|library\/books(?:\/[^/]+)?)$/.test(path))return next();
        if(req.method==='POST'&&path==='/auth/change-password')return next();
        throw new ForbiddenError('This function is restricted to authorized staff or guardians.');
      }
      if(actor.role===UserRole.CURRICULUM_TEACHER){
        const read=req.method==='GET';
        const allowed=(read&&/^\/(curriculum(?:\/|$)|documents(?:\/|$)|academics\/(school|context|years|terms|classes|streams|learning-areas)(?:\/|$)|cbc\/(strands|sub-strands)(?:\/|$)|auth\/profile$)/.test(path)) ||
          (req.method==='POST'&&/^\/curriculum\/(schemes\/[^/]+\/(review|weekly\/review)|records-of-work\/[^/]+\/(approve|return))$/.test(path)) ||
          (req.method==='POST'&&path==='/auth/change-password');
        if(!allowed)throw new ForbiddenError('Curriculum teachers can only view curriculum documents and approve schemes and records of work.');
        return next();
      }
      if(!parentRoles.includes(actor.role))return next();
      const read=req.method==='GET';
      const allowed =
        /^\/auth\/(profile|change-password|webauthn\/credentials(?:\/[^/]+)?|webauthn\/register\/(options|verify))$/.test(path) ||
        (read&&/^\/academics\/(school|context|years|terms(?:\/by-year\/[^/]+)?|classes|streams\/by-class\/[^/]+|learning-areas)$/.test(path)) ||
        /^\/finance(?:\/|$)/.test(path) ||
        /^\/students\/guardian\/me$/.test(path) ||
        (['GET','PUT'].includes(req.method)&&/^\/students\/(?:guardian\/students\/)?[^/]+$/.test(path)&&!['/students/deleted','/students/assessment-roster'].includes(path)) ||
        (read&&path==='/students') ||
        (read&&/^\/cbc\/(formative|summative|report-cards|analytics|strands\/by-learning-area\/[^/]+|sub-strands\/by-strand\/[^/]+)$/.test(path)) ||
        (read&&/^\/attendance\/student\/[^/]+$/.test(path)) ||
        (read&&path==='/timetables/stream') ||
        (read&&/^\/ediary\/(parent-feed|student\/[^/]+)$/.test(path)) ||
        (req.method==='POST'&&/^\/ediary\/[^/]+\/acknowledge$/.test(path)) ||
        (['GET','POST'].includes(req.method)&&/^\/media\/(help-requests|progress-photos|upload)$/.test(path)) ||
        (read&&/^\/lunch\/(enrollments(?:\/[^/]+)?|my-children)$/.test(path)) ||
        (read&&/^\/announcements(?:\/[^/]+)?$/.test(path)) ||
        /^\/(concerns|complaints)(?:\/|$)/.test(path) ||
        /^\/parent-consents\/(my-consents|respond)$/.test(path);
      if(!allowed)throw new ForbiddenError('This function is not available in the parent portal.');
      const academicScope=/^\/(cbc|attendance|ediary|timetables|media)(?:\/|$)/.test(path);
      const children = await c.feeUseCases.getLinkedStudentIdsForUser(actor.userId,academicScope?'academics':undefined);
      const deniedFinance=new Set((await c.studentRepository.findParentPermissions?.(actor.userId)||[]).filter(p=>!p.canViewFinances).map(p=>p.studentId));
      if(deniedFinance.size){
        const financialFields=new Set(['fee','feeBalance','creditBalance','totalFee','totalBilled','totalPaid','outstandingBalance','payments','invoices','sponsorship','isSponsored','isChargeExempt','lunch']);
        const redact=(value:any,inherited?:string):any=>{
          if(!value||typeof value!=='object'||value instanceof Date)return value;
          if(Array.isArray(value))return value.map(row=>redact(row,inherited));
          const row=typeof value.toJSON==='function'?value.toJSON():value;
          const learner=typeof row.studentId==='string'?row.studentId:deniedFinance.has(row.id)?row.id:inherited;
          return Object.fromEntries(Object.entries(row).map(([key,item])=>[key,learner&&deniedFinance.has(learner)&&financialFields.has(key)?null:redact(item,learner)]));
        };
        const json=res.json.bind(res);res.json=((body:any)=>json(redact(body))) as typeof res.json;
      }
      const assertChild = (id:unknown) => {if(id!==undefined && (typeof id!=='string'||!children.includes(id)))throw new ForbiddenError('Access denied: this learner is not linked to your account.');};
      assertChild(req.query.studentId);assertChild(req.body?.studentId);
      if(Array.isArray(req.body?.studentIds))req.body.studentIds.forEach(assertChild);
      const parts=req.path.split('/').filter(Boolean).map(part=>decodeURIComponent(part));
      if(parts[0]?.toLowerCase()==='students'&&parts.length===2&&parts[1]!=='guardian')assertChild(parts[1]);
      if(['attendance','ediary'].includes(parts[0]?.toLowerCase())&&parts[1]==='student')assertChild(parts[2]);
      if(path==='/timetables/stream'){
        const rows=await c.studentRepository.findByIds(children);
        const streamId=req.query.streamId;
        const classId=req.query.classRoomId||(typeof streamId==='string'?(await c.academicRepository.findStreamById(streamId))?.classRoomId:undefined);
        if(!rows.some(student=>student.schoolId===actor.schoolId&&student.classroomId===classId&&(!streamId||student.streamId===streamId)))throw new ForbiddenError('Only your children’s class timetables are available.');
      }

      next();
    }catch(error){next(error);}
  };
}

/** Verify IDs before any finance handler can return data or perform a mutation. */
export function createFinanceAccessBoundary(c:AppContainer) {
  return async(req:AuthenticatedRequest,res:Response,next:NextFunction)=>{
    try {
      const segments=req.path.split('/').filter(Boolean).map(part=>decodeURIComponent(part));
      const path=('/'+segments.join('/')).toLowerCase().replace(/\/$/,'')||'/';
      if(publicBankPaths.has(path))return next();
      const actor=req.user;if(!actor)throw new UnauthorizedError();
      if(!actor.schoolId)throw new ForbiddenError('A school-scoped account is required.');
      res.setHeader('Cache-Control','private, no-store');
      const isParent=parentRoles.includes(actor.role);
      if(!isParent&&!financeReaders.includes(actor.role)&&path!=='/fee-banner')throw new ForbiddenError('Finance access denied.');
      if(isParent){
        const read=req.method==='GET';
        const allowed = (read&&/^(\/invoices(?:\/[^/]+)?|\/payments|\/payments\/[^/]+\/receipt|\/payments\/forwarded|\/summary|\/fee-banner|\/statements\/[^/]+|\/students\/[^/]+\/(fee-position|payment-preview|credit-receipts)|\/credits\/[^/]+|\/credit-receipts(?:\/[^/]+(?:\/pdf)?)?|\/kcb-buni\/status\/[^/]+)$/.test(path)) ||
          (req.method==='POST'&&['/payments/preview-allocation','/payments/forward-transaction','/kcb-buni/stk-push','/mpesa/stk-push'].includes(path));
        if(!allowed)throw new ForbiddenError('Only your children’s fee records and payment actions are available in the parent portal.');
      }
      const query={...req.query};
      for(const value of [query.schoolId,req.body?.schoolId])if(value!==undefined&&value!==actor.schoolId)throw new ForbiddenError('School access denied.');
      Object.defineProperty(req,'query',{value:{...query,schoolId:actor.schoolId},configurable:true,writable:true});
      if(req.body && typeof req.body==='object' && !Array.isArray(req.body)) req.body.schoolId=actor.schoolId;
      const children=isParent?await c.feeUseCases.getLinkedStudentIdsForUser(actor.userId,'finance'):null;
      const student=async(id:unknown)=>{
        if(id===undefined)return;
        if(typeof id!=='string'||!id)throw new ForbiddenError('Invalid learner finance scope.');
        const row=await c.studentRepository.findById(id);
        if(!row||row.schoolId!==actor.schoolId||(children&&!children.includes(id)))throw new ForbiddenError('Learner finance access denied.');
      };
      const record=async(row:{schoolId?:string;studentId?:string}|null)=>{
        if(!row)return;
        if(row.schoolId&&row.schoolId!==actor.schoolId)throw new ForbiddenError('School finance access denied.');
        if(row.studentId)await student(row.studentId);
      };
      await student(query.studentId);await student(req.body?.studentId);
      if(Array.isArray(req.body?.studentIds))for(const id of req.body.studentIds)await student(id);
      segments[0]=segments[0]?.toLowerCase();
      if(['forwarded','apply','bulk','generate','individual','forward-transaction','preview-allocation','init-graceseed','request'].includes(segments[1]?.toLowerCase()))segments[1]=segments[1].toLowerCase();
      if(['students','statements'].includes(segments[0])&&segments[1])await student(segments[1]);
      if(segments[0]==='credits'&&segments[1]&&segments[1]!=='apply')await student(segments[1]);
      const invoice=async(id:unknown)=>{if(typeof id==='string'&&id){const row=await c.feeRepository.findInvoiceById(id);if(row)await record(row);else await student(id);}};
      await invoice(req.body?.invoiceId);
      if(segments[0]==='invoices'&&segments[1]&&!['bulk','generate','individual'].includes(segments[1]))await invoice(segments[1]);
      if(segments[0]==='payments'&&segments[1]&&!['forwarded','forward-transaction','preview-allocation'].includes(segments[1]))await record(await c.feeRepository.findPaymentById(segments[1]));
      if(segments[0]==='payments'&&segments[1]==='forwarded'&&segments[2])await record(await c.feeRepository.findPaymentById(segments[2]));
      if(segments[0]==='structures'&&segments[1]&&segments[1]!=='init-graceseed')await record(await c.feeRepository.findFeeStructureById(segments[1]));
      if(segments[0]==='expenses'&&segments[1])await record(await c.feeRepository.findExpenseById(segments[1]));
      if(segments[0]==='income'&&segments[1])await record(await c.feeRepository.findOtherIncomeById(segments[1]));
      if(segments[0]==='credit-receipts'&&segments[1])for(const app of await c.feeRepository.findCreditApplications({receiptNumber:segments[1]}))await record(app);
      if(segments[0]==='reversals'&&segments[1]&&segments[1]!=='request')await record(await c.feeRepository.findReversalRequestById(segments[1])||await c.feeRepository.findReversalRequestByReference(segments[1]));
      if(req.body?.approvalId)await record(await c.financialApprovalRepository.findById(req.body.approvalId));
      const validatePayload=async(value:unknown,depth=0):Promise<void>=>{
        if(!value||typeof value!=='object'||depth>12)return;
        for(const [key,item] of Object.entries(value)){
          if(key==='schoolId'&&item!==actor.schoolId)throw new ForbiddenError('School access denied.');
          if(key==='studentId')await student(item);
          if(key==='invoiceId')await invoice(item);
          if(item&&typeof item==='object')await validatePayload(item,depth+1);
        }
      };
      await validatePayload(req.body);
      if(req.body?.creditId)await record(await c.feeRepository.findCreditById(req.body.creditId));
      if(req.body?.transactionId){
        await record(await c.feeRepository.findPaymentById(req.body.transactionId));
        if(c.feeRepository.findCreditApplicationById)await record(await c.feeRepository.findCreditApplicationById(req.body.transactionId));
      }
      next();
    }catch(error){next(error);}
  };
}
