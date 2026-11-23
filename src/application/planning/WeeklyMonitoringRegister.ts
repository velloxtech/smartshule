/** Monitoring is derived from persisted teaching evidence; preparation alone is not coverage. */
export function weeklyMonitoringRegister(weeks:any[],termStart?:string,termEnd?:string) {
  const day=(value:string)=>new Date(`${value}T00:00:00Z`);
  const date=(value:Date)=>value.toISOString().slice(0,10);
  const anchor=termStart?day(termStart):undefined;
  if(anchor)anchor.setUTCDate(anchor.getUTCDate()-((anchor.getUTCDay()+6)%7));
  const last=anchor&&termEnd?Math.floor((day(termEnd).getTime()-anchor.getTime())/604800000)+1:Math.max(0,...weeks.map(week=>week.weekNumber));
  return Array.from({length:Math.max(0,last)},(_,index)=>{
    const weekNumber=index+1;
    const week=weeks.find(row=>row.weekNumber===weekNumber);
    const lessons:any[]=week?.lessons||[];
    const confirmed=lessons.filter(lesson=>lesson.statuses?.taught);
    const pending=lessons.filter(lesson=>!lesson.statuses?.taught);
    const evidence=lessons.flatMap(lesson=>(lesson.recordsOfWork||[]).filter((record:any)=>['SUBMITTED','APPROVED'].includes(record.status)));
    const unique=(values:any[])=>[...new Set(values.filter(Boolean))].join('\n');
    const label=(lesson:any)=>[lesson.entry?.strandTitle,lesson.entry?.subStrandTitle].filter(Boolean).join(' / ');
    const approved=evidence.filter((record:any)=>record.status==='APPROVED'&&record.isOfficialCoverage);
    const start=anchor?new Date(anchor.getTime()+index*604800000):undefined;
    const end=start?new Date(start.getTime()+6*86400000):undefined;
    return {weekNumber,startDate:start?termStart&&date(start)<termStart?termStart:date(start):week?.startDate,endDate:end?termEnd&&date(end)>termEnd?termEnd:date(end):week?.endDate,
      plannedLessons:lessons.length,reportedLessons:lessons.filter(lesson=>lesson.statuses?.reported).length,taughtLessons:confirmed.length,
      contentCovered:unique(confirmed.map(label)),contentNotCovered:unique(pending.map(label)),
      varianceReason:unique(evidence.flatMap((record:any)=>[record.reflectionData?.remainingWork,record.reflectionData?.remedialPlan,record.reflectionData?.challengesFaced])),
      teacher:unique(evidence.map((record:any)=>record.teacherName)),
      hodVerification:unique(approved.map((record:any)=>[record.reviewedByName,record.reviewedAt?new Date(record.reviewedAt).toISOString().slice(0,10):undefined].filter(Boolean).join(' · '))),
      noInstruction:lessons.length===0};
  });
}
