import {MemoryDocumentRegistry} from '../../src/application/documents/DocumentRegistry';

describe('Permanent document serial registry',()=>{
 it('reuses a serial for identical content and preserves prior versions after changes',async()=>{
  const registry=new MemoryDocumentRegistry();
  const original={id:'scheme-1',title:'Grade 3',status:'DRAFT',entries:[{outcomes:['Read']}]};
  const first=await registry.issue('school-a','SCHEME_OF_WORK',original);
  const repeated=await registry.issue('school-a','SCHEME_OF_WORK',{entries:original.entries,status:'DRAFT',id:'scheme-1',title:'Grade 3',documentSerial:first.serial});
  expect(repeated.serial).toBe(first.serial);
  const approved=await registry.issue('school-a','SCHEME_OF_WORK',{...original,status:'APPROVED'});
  expect(approved.serial).not.toBe(first.serial);
  expect((await registry.find('school-a',first.serial))?.snapshot.status).toBe('DRAFT');
  first.snapshot.entries[0].outcomes.push('Tampered');
  expect((await registry.find('school-a',first.serial))?.snapshot.entries[0].outcomes).toEqual(['Read']);
  expect(await registry.find('school-b',first.serial)).toBeNull();
  expect(await registry.find('school-a','SS-FORGED')).toBeNull();
  expect(await registry.list('school-a')).toHaveLength(2);
 });
});

describe('Compact mixed document serials',()=>{
 it('issues exactly three letters and six digits without punctuation',async()=>{
  const registry=new MemoryDocumentRegistry();
  const issued=await Promise.all(Array.from({length:100},(_,index)=>registry.issue('school-a','REPORT_CARD',{id:`report-${index}`})));
  for(const row of issued){expect(row.serial).toHaveLength(9);expect(row.serial.match(/[A-Z]/g)).toHaveLength(3);expect(row.serial.match(/[0-9]/g)).toHaveLength(6);expect(row.serial).toMatch(/^[A-Z0-9]+$/);}
  expect(new Set(issued.map(row=>row.serial)).size).toBe(100);
 });
 it('retries collisions and preserves each document’s assigned short serial',async()=>{
  const candidates=['1A00B0C01','1A00B0C01','2D00E0F02'];
  const registry=new MemoryDocumentRegistry(()=>candidates.shift()!);
  const first=await registry.issue('school-a','REPORT_CARD',{id:'first'});
  const second=await registry.issue('school-a','REPORT_CARD',{id:'second'});
  expect(first.serial).toBe('1A00B0C01');expect(second.serial).toBe('2D00E0F02');
  expect((await registry.issue('school-a','REPORT_CARD',{id:'first'})).serial).toBe(first.serial);
  expect((await registry.find('school-a',second.serial))?.documentId).toBe('second');
 });
});
