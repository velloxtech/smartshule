import {createAccessBoundary} from '../../src/infrastructure/http/middlewares/accessBoundary';
import {UserRole} from '../../src/core/domain/user/User';
import {documentSerialization} from '../../src/infrastructure/http/middlewares/documentSerialization';
import {MemoryDocumentRegistry} from '../../src/application/documents/DocumentRegistry';

async function boundary(path:string,method='GET'){
 let error:any;
 const req:any={user:{userId:'curriculum',schoolId:'school-a',role:UserRole.CURRICULUM_TEACHER},path,method,query:{},body:{}};
 await createAccessBoundary({} as any)(req,{} as any,(e?:any)=>{error=e;});
 return error;
}
describe('Curriculum reviewer module boundary',()=>{
 it.each(['/curriculum/schemes','/curriculum/lesson-plans','/curriculum/records-of-work','/curriculum/planning/options','/academics/context','/documents/registry'])('allows document and supporting reads: %s',async path=>expect(await boundary(path)).toBeUndefined());
 it.each(['/curriculum/schemes/scheme/review','/curriculum/schemes/scheme/weekly/review','/curriculum/records-of-work/record/approve','/curriculum/records-of-work/record/return'])('allows document reviews: %s',async path=>expect(await boundary(path,'POST')).toBeUndefined());
 it.each(['/finance/payments','/auth/users','/students','/analytics/dashboard','/signatures/policies'])('blocks unrelated modules: %s',async path=>expect(await boundary(path)).toBeDefined());
 it.each([['/curriculum/schemes/id','DELETE'],['/curriculum/planning/allocations','PUT'],['/curriculum/lesson-plans/id/review','POST'],['/curriculum/schemes/id/allocations/review','POST']])('blocks non-review changes: %s',async(path,method)=>expect(await boundary(path,method)).toBeDefined());
});

describe('Server document issuance',()=>{
 const run=async(path:string,data:any,status=200)=>{
  const registry=new MemoryDocumentRegistry();
  const body=await new Promise<any>((resolve,reject)=>{
   const req:any={path,method:'GET',user:{schoolId:'school-a'}};
   const res:any={statusCode:status,json:resolve};
   documentSerialization(registry)(req,res,(error?:any)=>{if(error)reject(error);else res.json({success:status===200,data});});
  });
  return {body,registry};
 };
 it('issues curriculum serials from server responses and keeps immutable content',async()=>{
  const {body,registry}=await run('/schemes',{id:'scheme',teacherId:'teacher',title:'Science'});
  const record=await registry.find('school-a',body.data.documentSerial);expect(record?.snapshot.title).toBe('Science');expect(record?.snapshot.documentSerial).toBeUndefined();
 });
 it('issues receipts and reports through the same registry',async()=>{
  const receipt=await run('/finance/payments/payment/receipt',{receipt:{receiptNumber:'REC-1',amountPaid:100}});
  expect(receipt.body.data.receipt.documentSerial).toMatch(/^[0-9][A-Z][0-9]{2}[A-Z][0-9][A-Z][0-9]{2}$/);
  expect((await receipt.registry.list('school-a'))[0].documentType).toBe('PAYMENT_RECEIPT');
  const report=await run('/CBC/report-cards',{id:'report',studentId:'student',termId:'term'});
  expect(report.body.data.documentSerial).toMatch(/^[0-9][A-Z][0-9]{2}[A-Z][0-9][A-Z][0-9]{2}$/);
 });
 it('never serializes failed responses',async()=>{
  const {registry}=await run('/schemes',{id:'scheme',teacherId:'teacher'},403);expect(await registry.list('school-a')).toEqual([]);
 });
});
