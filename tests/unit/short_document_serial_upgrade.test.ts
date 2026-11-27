import {PostgresDocumentRegistry} from '../../src/infrastructure/database/postgres/PostgresDocumentRegistry';
import {serializeDocument} from '../../src/application/documents/DocumentRegistry';

describe('Permanent short aliases for existing document serials',()=>{
 it('keeps the original printed serial valid and resolves the new short serial to the same record',async()=>{
  const original=serializeDocument('school-a','REPORT_CARD',{id:'report-1',title:'Original report'});
  const aliases=new Map<string,string>();
  const query=jest.fn(async(sql:string,params:string[])=>{
   if(sql.startsWith('SELECT r.*'))return {rows:params[0]==='school-a'&&(params[1]===original.serial||aliases.get(params[1])===original.serial)?[{payload:original,issued_at:original.issuedAt}]:[]};
   if(sql.startsWith('SELECT serial'))return {rows:[...aliases].filter(([,source])=>source===params[0]).map(([serial])=>({serial}))};
   if(sql.startsWith('INSERT INTO document_serial_aliases')){aliases.set(params[0],params[1]);return {rows:[{serial:params[0]}]};}
   throw new Error(`Unexpected database write: ${sql}`);
  });
  const registry=new PostgresDocumentRegistry({query} as any,()=> '4G82S1S60');
  const viaOld=await registry.find('school-a',original.serial);
  const viaShort=await registry.find('school-a','4G82S1S60');
  expect(viaOld?.serial).toBe('4G82S1S60');expect(viaShort).toEqual(viaOld);
  expect(viaShort?.snapshot).toEqual(original.snapshot);
  expect(await registry.find('school-b','4G82S1S60')).toBeNull();
  expect(query.mock.calls.filter(([sql])=>sql.startsWith('INSERT'))).toHaveLength(1);
 });
 it('retries a short-code conflict rather than assigning a duplicate serial',async()=>{
  const original=serializeDocument('school-a','REPORT_CARD',{id:'report-1'});
  let inserted=false;
  const query=jest.fn(async(sql:string,params:string[])=>{
   if(sql.startsWith('SELECT r.*'))return {rows:[{payload:original,issued_at:original.issuedAt}]};
   if(sql.startsWith('SELECT serial'))return {rows:inserted?[{serial:'2D00E0F02'}]:[]};
   if(sql.startsWith('INSERT')){if(params[0]==='1A00B0C01')return {rows:[]};inserted=true;return {rows:[{serial:params[0]}]};}
   throw new Error(sql);
  });
  const candidates=['1A00B0C01','2D00E0F02'];
  const registry=new PostgresDocumentRegistry({query} as any,()=>candidates.shift()!);
  expect((await registry.find('school-a',original.serial))?.serial).toBe('2D00E0F02');
 });
});
