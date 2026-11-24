import assert from 'node:assert/strict';
import {test} from 'node:test';
import {teachingProgressChecks} from '../src/utils/teachingProgress.ts';
const states=(input:Parameters<typeof teachingProgressChecks>[0])=>teachingProgressChecks(input).map(c=>c.partial?'mixed':c.checked);
test('a saved plan is planned without claiming it was taught or reflected on',()=>{
 assert.deepEqual(states({lessonPlan:{id:'fixture-plan'}}),[true,false,false]);
 assert.deepEqual(states({lessonPlan:{id:'fixture-plan'},statuses:{planned:false}}),[false,false,false]);
});
test('completed reporting and reflection update separately from admin verification',()=>{
 const checks=teachingProgressChecks({lessonPlan:{id:'fixture-plan'},record:{status:'SUBMITTED',reflection:'Children engaged well.',reflectionData:{teachingStatus:'COMPLETED'}}});
 assert.deepEqual(checks.map(c=>c.checked),[true,true,true]);assert.equal(checks[1].detail,'Reported — awaiting review');
 assert.equal(teachingProgressChecks({record:{status:'APPROVED',isOfficialCoverage:true,reflectionData:{teachingStatus:'COMPLETED'}}})[1].detail,'Verified by admin');
});
test('partial and postponed sessions never claim complete teaching',()=>{
 assert.deepEqual(states({record:{status:'SUBMITTED',reflection:'Continue next week.',reflectionData:{teachingStatus:'PARTIAL'}}}),[false,'mixed',true]);
 for(const teachingStatus of ['POSTPONED','CANCELLED'])assert.deepEqual(states({lessonPlan:{id:'fixture-plan'},record:{status:'APPROVED',reflection:'Reschedule.',reflectionData:{teachingStatus}}}),[true,false,true]);
});
test('returned evidence cannot revive a completed saved report',()=>{
 assert.deepEqual(states({lessonPlan:{id:'fixture-plan',afterClassReport:{teachingStatus:'COMPLETED'}},record:{status:'RETURNED',reflectionData:{teachingStatus:'COMPLETED'}}}),[true,false,false]);
});
test('saved after-class copies and structured reflections count without requiring a timetable',()=>{
 assert.deepEqual(states({lessonPlan:{id:'fixture-plan',afterClassReport:{teachingStatus:'COMPLETED'},teacherSelfReflection:'Practise again.'}}),[true,true,true]);
 assert.equal(states({record:{reflectionData:{whatWentWell:'Good participation.'}}})[2],true);
 assert.equal(states({lessonPlan:{teacherSelfReflection:'  '},record:{reflection:'\n'}})[2],false);
});
