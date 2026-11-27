import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolveReportDocumentSerial,isValidReportDocumentSerial} from '../src/utils/reportDocumentSerial.ts';
import type {CBCReportCardData} from '../src/types';
const serial='4G82S1S60';
const scope={studentId:'learner-a',termId:'term-3',academicYearId:'year-2026'};
const report=(changes:Partial<CBCReportCardData>={})=>({id:'report-a',...scope,documentSerial:serial,learningAreaAssessments:[],...changes} as CBCReportCardData);
test('print and PDF preparation reuse the registered serial for the selected report',async()=>{
 const data=report();assert.equal(await resolveReportDocumentSerial(data,scope,async()=>{throw new Error('Unexpected fetch');}),data);
});
test('a report without a serial is fetched from the server before export',async()=>{
 let requests=0;const data=await resolveReportDocumentSerial(report({documentSerial:undefined}),scope,async()=>{requests++;return {success:true,data:report()};});
 assert.equal(requests,1);assert.equal(data.documentSerial,serial);
});
test('switching learner, term or year cannot reuse the previous report serial',async()=>{
 for(const changes of [{studentId:'learner-b'},{termId:'term-2'},{academicYearId:'year-2025'}]){
  let fetched=false;await resolveReportDocumentSerial(report(changes),scope,async()=>{fetched=true;return {success:true,data:report()};});assert.equal(fetched,true);
 }
});
test('export fails when the server cannot provide a registered serial for the selected report',async()=>{
 for(const response of [{success:false},{success:true,data:report({documentSerial:undefined})},{success:true,data:report({studentId:'other'})},{success:true,data:report({documentSerial:'<script>forged</script>'})}]){
  await assert.rejects(resolveReportDocumentSerial(null,scope,async()=>response),/document serial could not be issued/);
 }
});

test('accepts short mixed serials and previously issued legacy serials',()=>{
 for(const serial of ['4G8S2S1','4G82S1S6','4G82S1S60','SS-12345678-1234-1234-1234-123456789ABC'])assert.equal(isValidReportDocumentSerial(serial),true);
 for(const serial of ['4G8S2S','4G82S1S600','123456789','ABCDEFGHI','4G82S1S60!'])assert.equal(isValidReportDocumentSerial(serial),false);
});
