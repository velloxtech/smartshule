/** Coverage counts unique syllabus outcomes, never elapsed weeks or repeated lessons. */
export function syllabusCoverageProgress(scheme:any,catalogue:any[],records:any[]) {
  const norm=(value:string)=>value.trim().toLowerCase();
  const curriculum=catalogue.flatMap(strand=>strand.subStrands.map((sub:any)=>({strand,sub})));
  const allocations=scheme.planningState?.allocations?.filter((item:any)=>item.lessons>0)||[];
  const groups=allocations.map((allocation:any)=>{
    const sources=[allocation.subStrandId,...(allocation.combinedSubStrandIds||[])].map(id=>curriculum.find(item=>item.sub.id===id)).filter(Boolean);
    const outcomes=[...new Map<string,string>((allocation.specificLearningOutcomes?.length?allocation.specificLearningOutcomes:sources.flatMap(item=>item.sub.specificLearningOutcomes)).filter((value:string)=>value.trim()).map((value:string)=>[norm(value),value.trim()])).values()];
    const entries=scheme.entries.filter((entry:any)=>entry.subStrandId===allocation.subStrandId);
    const evidence=records.filter(record=>record.classRoomId===scheme.classRoomId&&(record.streamId||'')===(scheme.streamId||'')&&record.learningAreaId===scheme.learningAreaId&&record.planningLink?.schemeId===scheme.id&&entries.some((entry:any)=>entry.id===record.planningLink?.schemeEntryId));
    const recorded=new Set<string>(),reported=new Set<string>(),confirmed=new Set<string>();
    for(const record of evidence){
      if(record.status==='RETURNED'||['POSTPONED','CANCELLED'].includes(record.reflectionData?.teachingStatus||''))continue;
      const entry=entries.find((item:any)=>item.id===record.planningLink.schemeEntryId);
      const covered=record.reflectionData?.outcomesCovered||(!record.reflectionData?.teachingStatus||record.reflectionData.teachingStatus==='COMPLETED'?entry.specificLearningOutcomes:[]);
      for(const value of covered){const key=norm(value);if(!outcomes.some(outcome=>norm(outcome)===key)||!entry.specificLearningOutcomes.some((outcome:string)=>norm(outcome)===key))continue;recorded.add(key);if(['SUBMITTED','APPROVED'].includes(record.status))reported.add(key);if(record.status==='APPROVED'&&record.isOfficialCoverage)confirmed.add(key);}
    }
    return {subStrandId:allocation.subStrandId,strandId:sources[0]?.strand.id,strandTitle:[...new Set(sources.map(item=>item.strand.title))].join(' + '),title:sources.map(item=>item.sub.title).join(' + ')||entries[0]?.subStrandTitle||'Saved sub-strand',totalOutcomes:outcomes.length,recordedOutcomes:recorded.size,reportedOutcomes:reported.size,confirmedOutcomes:confirmed.size,remainingOutcomes:outcomes.filter(outcome=>!confirmed.has(norm(outcome))),plannedLessons:entries.filter((entry:any)=>!entry.archivedAt).length,postponedLessons:evidence.filter(record=>record.reflectionData?.teachingStatus==='POSTPONED').length};
  });
  const sum=(key:string)=>groups.reduce((n:number,group:any)=>n+group[key],0);
  const totalOutcomes=sum('totalOutcomes'),recordedOutcomes=sum('recordedOutcomes'),reportedOutcomes=sum('reportedOutcomes'),confirmedOutcomes=sum('confirmedOutcomes');
  const percent=(count:number)=>totalOutcomes?Math.round(count*100/totalOutcomes):0;
  return {totalOutcomes,recordedOutcomes,reportedOutcomes,confirmedOutcomes,recordedPercent:percent(recordedOutcomes),confirmedPercent:percent(confirmedOutcomes),subStrands:groups};
}
