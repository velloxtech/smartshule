import {requirePaymentWebhook} from '../../../src/infrastructure/http/middlewares/paymentWebhookAuth';
import {AppContainer} from '../../../src/infrastructure/container';
import {User,UserRole,UserStatus} from '../../../src/core/domain/user/User';
import {Guardian,GuardianRelationship} from '../../../src/core/domain/user/Guardian';
import {Student,StudentGender,StudentStatus,CBCGradeLevel} from '../../../src/core/domain/user/Student';
import {StudentInvoice,Payment,InvoiceStatus,PaymentStatus,PaymentMethod} from '../../../src/core/domain/finance/Fee';
import {createAccessBoundary,createFinanceAccessBoundary} from '../../../src/infrastructure/http/middlewares/accessBoundary';
import {createAuthMiddleware} from '../../../src/infrastructure/http/middlewares/authMiddleware';
import {GuardianIdentityResolver} from '../../../src/application/shared/GuardianIdentityResolver';
import {ForbiddenError,UnauthorizedError} from '../../../src/core/domain/shared/Errors';

const parent={userId:'parent',role:UserRole.PARENT,schoolId:'school'};
const staff={userId:'staff',role:UserRole.BURSAR,schoolId:'school'};
const teacher={userId:'teacher',role:UserRole.TEACHER,schoolId:'school'};
const orphan={userId:'orphan',role:UserRole.PARENT,schoolId:'school'};
const tokenData=(actor:any)=>({...actor,email:actor.userId+'@example.test'});

describe('School, parent-view and finance authorization boundaries',()=>{
 let c:AppContainer;
 beforeEach(async()=>{
  c=new AppContainer();
  for(const actor of [parent,staff,teacher,orphan])await c.userRepository.save(User.create({schoolId:actor.schoolId,firstName:actor.userId,lastName:'Synthetic',role:actor.role,status:UserStatus.ACTIVE,passwordHash:'test',phone:actor.userId==='parent'?'+254700000001':undefined},actor.userId));
  await c.guardianRepository.save(Guardian.create({userId:'parent',relationship:GuardianRelationship.MOTHER,nationalId:'test',emergencyContact:'+254700000001',studentIds:['own','unowned']},'guardian'));
  await c.guardianRepository.save(Guardian.create({userId:'staff',relationship:GuardianRelationship.FATHER,nationalId:'staff',emergencyContact:'+254700000002',studentIds:['staff-child']},'staff-guardian'));
  for(const [id,schoolId,guardianIds] of [['own','school',['guardian']],['other','school',['other-guardian']],['unowned','school',[]],['foreign','foreign',['guardian']],['staff-child','school',['staff-guardian']]] as const){
   await c.studentRepository.save(Student.create({schoolId,firstName:id,lastName:'Synthetic',admissionNumber:id,dateOfBirth:'2015-01-01',gender:StudentGender.MALE,gradeLevel:CBCGradeLevel.GRADE_4,classroomId:id==='own'?'own-class':'other-class',academicYearId:'year',guardianIds:[...guardianIds],status:StudentStatus.ACTIVE},id));
   await c.feeRepository.saveInvoice(StudentInvoice.create({schoolId,studentId:id,feeStructureId:'structure',academicYearId:'year',termId:'term',invoiceNumber:'INV-'+id,items:[],amountBilled:1000,discountAmount:0,amountPayable:1000,amountPaid:100,balance:900,status:InvoiceStatus.PARTIALLY_PAID,dueDate:'2026-12-01'},'invoice-'+id));
   await c.feeRepository.savePayment(Payment.create({schoolId,studentId:id,invoiceId:'invoice-'+id,receiptNumber:'RCT-'+id,amount:100,paymentMethod:PaymentMethod.CASH,transactionReference:'REF-'+id,paymentDate:'2026-11-22',recordedByUserId:'staff',status:PaymentStatus.COMPLETED},'payment-'+id));
  }
 });
 const run=async(handler:any,path:string,actor:any=parent,method='GET',query:any={},body:any={})=>{
  const req:any={path,user:actor,method,query,body,headers:{}};const next=jest.fn();
  const res:any={setHeader:jest.fn(),json:jest.fn((body:any)=>body)};
  await handler(req,res,next);return {error:next.mock.calls[0]?.[0],req,res};
 };
 it('uses learner-side links and never adopts cached or cross-school children',async()=>{
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('parent')).toEqual(['own']);
  expect((await c.studentRepository.findById('unowned'))!.guardianIds).toEqual([]);
 });
 it('does not infer ownership from a matching phone, demo name or missing guardian profile',async()=>{
  await c.userRepository.save(User.create({schoolId:'school',firstName:'Orphan',lastName:'Synthetic',email:'parent@smartshule.ac.ke',phone:'+254700000001',passwordHash:'test',role:UserRole.PARENT,status:UserStatus.ACTIVE},'usr-parent-01'));
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('usr-parent-01')).toEqual([]);
  expect((await c.guardianRepository.findById('guardian'))!.userId).toBe('parent');
 });
 it('returns only the parent’s own invoices, payments and summary',async()=>{
  expect((await c.feeUseCases.listInvoices({requestingUser:parent})).map(x=>x.studentId)).toEqual(['own']);
  expect((await c.feeUseCases.listPayments({requestingUser:parent})).map(x=>x.studentId)).toEqual(['own']);
  expect(await c.feeUseCases.getFinanceSummary(undefined,parent)).toMatchObject({isParentView:true,childrenCount:1,totalCollected:100,totalBalance:900});
  expect(await c.feeUseCases.listPayments({requestingUser:orphan})).toEqual([]);
  expect(await c.feeUseCases.getFinanceSummary(undefined,orphan)).toMatchObject({totalCollected:0,childrenCount:0});
 });
 it('denies direct receipt and invoice IDs for other children or schools',async()=>{
  for(const child of ['other','foreign','unowned']){
   await expect(c.feeUseCases.getPaymentReceipt('payment-'+child,parent)).rejects.toBeInstanceOf(ForbiddenError);
   await expect(c.feeUseCases.getInvoiceDetails('invoice-'+child,parent)).rejects.toBeInstanceOf(ForbiddenError);
   await expect(c.feeUseCases.getStudentCredits(child,parent)).rejects.toBeInstanceOf(ForbiddenError);
  }
 });
 it('limits school staff finance lists by their school even without a client school filter',async()=>{
  const payments=await c.feeUseCases.listPayments({requestingUser:staff});
  expect(payments.map(p=>p.studentId)).not.toContain('foreign');
  await expect(c.feeUseCases.listPayments({schoolId:'foreign',requestingUser:staff})).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.feeUseCases.getPaymentReceipt('payment-foreign',staff)).rejects.toBeInstanceOf(ForbiddenError);
  await expect(c.feeUseCases.getFinanceSummary(undefined,teacher)).rejects.toBeInstanceOf(ForbiddenError);
 });
 it.each(['/structures','/student-accounts','/reversals','/defaulters','/expenses','/income','/cashflow-ledger','/arrears/summary','/approvals/pending'])('blocks parent access to finance administration %s',async path=>{
  expect((await run(createFinanceAccessBoundary(c),path)).error).toBeInstanceOf(ForbiddenError);
 });
 it.each(['/teachers','/analytics/dashboard','/students/deleted','/clinic/visits','/inventory','/discipline/incidents','/curriculum/planning/catalogue','/staff-messages/contacts','/system-logs'])('blocks parent access to staff modules %s',async path=>{
  expect((await run(createAccessBoundary(c),path)).error).toBeInstanceOf(ForbiddenError);
 });
 it('verifies receipt IDs before handlers and cannot be bypassed with casing or encoded IDs',async()=>{
  const guard=createFinanceAccessBoundary(c);
  expect((await run(guard,'/payments/payment-own/receipt')).error).toBeUndefined();
  for(const path of ['/payments/payment-other/receipt','/PAYMENTS/payment%2Dother/receipt','/payments/payment-foreign/receipt'])expect((await run(guard,path)).error).toBeInstanceOf(ForbiddenError);
 });
 it('checks submitted invoice IDs, nested payloads and staff tenant boundaries before writes',async()=>{
  const guard=createFinanceAccessBoundary(c);
  expect((await run(guard,'/kcb-buni/stk-push',parent,'POST',{}, {invoiceId:'invoice-other'})).error).toBeInstanceOf(ForbiddenError);
  expect((await run(guard,'/approvals/request',staff,'POST',{}, {payload:{studentId:'foreign'}})).error).toBeInstanceOf(ForbiddenError);
  expect((await run(guard,'/payments',staff,'GET',{schoolId:'foreign'})).error).toBeInstanceOf(ForbiddenError);
  const own=await run(guard,'/payments',staff);expect(own.error).toBeUndefined();expect(own.req.query.schoolId).toBe('school');
 });
 it('only exposes a parent’s own class timetable and child attendance IDs',async()=>{
  const guard=createAccessBoundary(c);
  expect((await run(guard,'/timetables/stream',parent,'GET',{classRoomId:'own-class'})).error).toBeUndefined();
  expect((await run(guard,'/timetables/stream',parent,'GET',{classRoomId:'other-class'})).error).toBeInstanceOf(ForbiddenError);
  expect((await run(guard,'/attendance/student/other')).error).toBeInstanceOf(ForbiddenError);
 });
 it('reduces staff tokens to parent authority only when Parent View is selected',async()=>{
  const middleware=createAuthMiddleware(c.tokenService,c.userRepository);
  const req:any={headers:{authorization:'Bearer '+c.tokenService.generateAccessToken(tokenData(staff)),'x-portal-view':'PARENT'}};
  const next=jest.fn();await middleware(req,{} as any,next);expect(next.mock.calls[0]?.[0]).toBeUndefined();expect(req.user.role).toBe(UserRole.PARENT);
  expect((await c.feeUseCases.listPayments({requestingUser:req.user})).map(p=>p.studentId)).toEqual(['staff-child']);
  const ordinary:any={headers:{authorization:'Bearer '+c.tokenService.generateAccessToken(tokenData(parent)),'x-portal-view':'STAFF'}};
  await middleware(ordinary,{} as any,jest.fn());expect(ordinary.user.role).toBe(UserRole.PARENT);
 });
 it('rejects deleted, inactive and role-changed accounts despite a previously issued token',async()=>{
  const middleware=createAuthMiddleware(c.tokenService,c.userRepository);
  const token=c.tokenService.generateAccessToken(tokenData(staff));
  await c.userRepository.delete('staff');
  const next=jest.fn();await middleware({headers:{authorization:'Bearer '+token}} as any,{} as any,next);
  expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  await c.userRepository.save(User.create({schoolId:'school',firstName:'Changed',lastName:'Role',role:UserRole.PARENT,status:UserStatus.ACTIVE,passwordHash:'test'},'staff'));
  const changed=jest.fn();await middleware({headers:{authorization:'Bearer '+token}} as any,{} as any,changed);
  expect(changed.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
 });
 it('blocks public teacher registration after a school administrator exists',async()=>{
  await c.userRepository.save(User.create({schoolId:'school',firstName:'School',lastName:'Admin',role:UserRole.SCHOOL_ADMIN,status:UserStatus.ACTIVE,passwordHash:'test'},'school-admin'));
  await expect(c.authUseCases.register({firstName:'Unapproved',lastName:'Teacher',email:'unapproved@example.test',password:'Password123!',role:UserRole.TEACHER,schoolId:'school'})).rejects.toBeInstanceOf(ForbiddenError);
 });
 it('rejects suspended accounts even when the token signature remains valid',async()=>{
  const token=c.tokenService.generateAccessToken(tokenData(staff));
  await c.userRepository.save(User.create({schoolId:'school',firstName:'Suspended',lastName:'Staff',role:UserRole.BURSAR,status:UserStatus.SUSPENDED,passwordHash:'test'},'staff'));
  const next=jest.fn();await createAuthMiddleware(c.tokenService,c.userRepository)({headers:{authorization:'Bearer '+token}} as any,{} as any,next);
  expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
 });

 it('honors finance restrictions without removing the family’s academic access',async()=>{
  await c.studentRepository.saveParentPermissions!('parent','own','school',{canViewFinances:false,canViewAcademics:true});
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('parent')).toEqual(['own']);
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('parent','academics')).toEqual(['own']);
  expect(await c.feeUseCases.listPayments({requestingUser:parent})).toEqual([]);
  await expect(c.feeUseCases.getPaymentReceipt('payment-own',parent)).rejects.toBeInstanceOf(ForbiddenError);
  const portal=await c.studentUseCases.getGuardianPortalData('parent');
  expect(portal.children[0].fee).toBeNull();expect(portal.children[0].feeBalance).toBeNull();
 });
 it('persists explicit normalized links and honors academic restrictions',async()=>{
  await c.studentRepository.saveParentPermissions!('parent','unowned','school',{canViewFinances:true,canViewAcademics:false});
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('parent')).toContain('unowned');
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('parent','finance')).toContain('unowned');
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('parent','academics')).not.toContain('unowned');
  const denied=await run(createAccessBoundary(c),'/attendance/student/unowned');
  expect(denied.error).toBeInstanceOf(ForbiddenError);
 });

 it('revokes both normalized and legacy user-ID links when a child is unlinked',async()=>{
  const admin={userId:'administrator',role:UserRole.ADMIN,schoolId:'school'};
  await c.studentRepository.saveParentPermissions!('parent','own','school',{canViewFinances:true,canViewAcademics:true});
  const learner=(await c.studentRepository.findById('own'))!;learner.addGuardian('parent');await c.studentRepository.update(learner);
  await c.studentUseCases.unlinkParentFromLearner({parentUserId:'parent',studentId:'own',requestingUser:admin});
  expect(await c.feeUseCases.getLinkedStudentIdsForUser('parent')).toEqual([]);
  await expect(c.feeUseCases.getPaymentReceipt('payment-own',parent)).rejects.toBeInstanceOf(ForbiddenError);
 });

 it('redacts finance fields from learner profile responses when finance access is disabled',async()=>{
  await c.studentRepository.saveParentPermissions!('parent','own','school',{canViewFinances:false,canViewAcademics:true});
  const guarded=await run(createAccessBoundary(c),'/students/own');
  expect(guarded.error).toBeUndefined();
  const result=guarded.res.json({data:{id:'own',firstName:'Own learner',feeBalance:900,fee:{payments:[{amount:100}]},CBC:{progress:50}}});
  expect(result.data).toEqual({id:'own',firstName:'Own learner',feeBalance:null,fee:null,CBC:{progress:50}});
 });

 it('rejects forged bank callbacks and fails closed when callback authentication is not configured',()=>{
  const previous=process.env.PAYMENT_WEBHOOK_TOKEN;
  try{
   delete process.env.PAYMENT_WEBHOOK_TOKEN;
   const json=jest.fn(),res:any={status:jest.fn().mockReturnThis(),json};const missing=jest.fn();
   requirePaymentWebhook({headers:{}} as any,res,missing);expect(res.status).toHaveBeenCalledWith(503);expect(missing).not.toHaveBeenCalled();
   process.env.PAYMENT_WEBHOOK_TOKEN='synthetic-test-token';
   const invalid=jest.fn();requirePaymentWebhook({headers:{'x-payment-webhook-token':'forged'}} as any,res,invalid);expect(invalid.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
   const valid=jest.fn();requirePaymentWebhook({headers:{'x-payment-webhook-token':'synthetic-test-token'}} as any,res,valid);expect(valid).toHaveBeenCalledWith();
  }finally{if(previous===undefined)delete process.env.PAYMENT_WEBHOOK_TOKEN;else process.env.PAYMENT_WEBHOOK_TOKEN=previous;}
 });

});
