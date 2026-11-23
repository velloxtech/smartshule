import {syllabusCoverageProgress} from '../../../src/application/planning/SyllabusCoverageProgress';

const catalogue=[{id:'strand',title:'Numbers',subStrands:[{id:'sub',title:'Number concept',specificLearningOutcomes:['Count objects','Compare groups','Write numbers']},{id:'next',title:'Place value',specificLearningOutcomes:['Identify tens']}]}];
const entry={id:'entry',subStrandId:'sub',specificLearningOutcomes:['Count objects','Compare groups']};
const scheme={id:'scheme',classRoomId:'class',learningAreaId:'area',entries:[entry,{...entry,id:'repeat'},{id:'next-entry',subStrandId:'next',specificLearningOutcomes:['Identify tens']}],planningState:{allocations:[{subStrandId:'sub',lessons:1},{subStrandId:'next',lessons:1}]}};
const record=(overrides:any={})=>({id:'record',classRoomId:'class',learningAreaId:'area',status:'APPROVED',isOfficialCoverage:true,planningLink:{schemeId:'scheme',schemeEntryId:'entry'},reflectionData:{teachingStatus:'PARTIAL',outcomesCovered:['Count objects']},...overrides});
it('measures unique curriculum outcomes rather than planned weeks or repeated lessons',()=>{
 const summary=syllabusCoverageProgress(scheme,catalogue,[record(),record({planningLink:{schemeId:'scheme',schemeEntryId:'repeat'}})]);
 expect(summary).toMatchObject({totalOutcomes:4,recordedOutcomes:1,confirmedOutcomes:1,confirmedPercent:25});
 expect(summary.subStrands[0].remainingOutcomes).toEqual(['Compare groups','Write numbers']);
 expect(summary.subStrands[1].confirmedOutcomes).toBe(0);
});
it('separates saved, submitted and verified coverage and excludes postponed, cancelled and returned claims',()=>{
 const draft=record({status:'DRAFT',isOfficialCoverage:false});
 expect(syllabusCoverageProgress(scheme,catalogue,[draft])).toMatchObject({recordedOutcomes:1,reportedOutcomes:0,confirmedOutcomes:0});
 expect(syllabusCoverageProgress(scheme,catalogue,[{...draft,status:'SUBMITTED'}])).toMatchObject({recordedOutcomes:1,reportedOutcomes:1,confirmedOutcomes:0});
 for(const teachingStatus of ['POSTPONED','CANCELLED'])expect(syllabusCoverageProgress(scheme,catalogue,[record({reflectionData:{teachingStatus,outcomesCovered:['Count objects']}})]).confirmedOutcomes).toBe(0);
 expect(syllabusCoverageProgress(scheme,catalogue,[record({status:'RETURNED'})]).recordedOutcomes).toBe(0);
});
it('ignores evidence for another scheme, class, stream or area and rejects outcomes outside the source lesson',()=>{
 const wrong=[record({classRoomId:'other'}),record({streamId:'other'}),record({learningAreaId:'other'}),record({planningLink:{schemeId:'other',schemeEntryId:'entry'}}),record({reflectionData:{teachingStatus:'PARTIAL',outcomesCovered:['Write numbers','Invented outcome']}})];
 expect(syllabusCoverageProgress(scheme,catalogue,wrong).confirmedOutcomes).toBe(0);
});
it('retains genuine evidence for an archived entry and supports combined sub-strands and empty plans',()=>{
 const changed={...scheme,entries:[{...entry,archivedAt:'2026-11-01'}]};
 expect(syllabusCoverageProgress(changed,catalogue,[record()]).confirmedOutcomes).toBe(1);
 const combined={...scheme,planningState:{allocations:[{subStrandId:'sub',combinedSubStrandIds:['next'],lessons:2}]}};
 expect(syllabusCoverageProgress(combined,catalogue,[]).totalOutcomes).toBe(4);
 expect(syllabusCoverageProgress({...scheme,planningState:{allocations:[]}},catalogue,[])).toMatchObject({totalOutcomes:0,confirmedPercent:0});
});
