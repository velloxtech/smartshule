import React,{useState} from 'react';
import {apiService} from '../../services/api';

export function RecordTeachingSessionModal({data,lesson,onClose,onSaved}:{data:any;lesson:any;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [existing,setExisting]=useState<any>(lesson.recordsOfWork?.[0]);
  const [status,setStatus]=useState(existing?.reflectionData?.teachingStatus||'COMPLETED');
  const [date,setDate]=useState(existing?.lessonDate||lesson.date||'');
  const [slotId,setSlotId]=useState(lesson.timetableSlotId||'');
  const [notes,setNotes]=useState(existing?.learningActivities||existing?.comments||'');
  const [reflection,setReflection]=useState(existing?.reflection||'');
  const [remaining,setRemaining]=useState(existing?.reflectionData?.remainingWork||'');
  const [covered,setCovered]=useState<string[]>(existing?.reflectionData?.outcomesCovered||lesson.entry.specificLearningOutcomes||[]);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const noTeaching=['POSTPONED','CANCELLED'].includes(status);
  const today=new Date().toISOString().slice(0,10);
  const editable=!existing||['DRAFT','RETURNED'].includes(existing.status);
  const save=async(submit:boolean)=>{
    if(status==='COMPLETED'&&lesson.entry.specificLearningOutcomes.some((outcome:string)=>!covered.includes(outcome))){setError('Choose Partly taught when outcomes still need teaching.');return;}
    setBusy(true);setError('');
    try{
      const values={teachingStatus:status,outcomesCovered:noTeaching?[]:covered,remainingWork:remaining};
      let id=existing?.id;
      if(id)await apiService.updateRecordOfWork(id,{learningActivities:notes,comments:notes,reflection,reflectionData:{...existing.reflectionData,...values}});
      else{
        const query=new URLSearchParams({academicYearId:data.scheme.academicYearId,termId:data.scheme.termId});
        const result=await apiService.planning(`record-taught?${query}`,{method:'POST',body:JSON.stringify({schemeId:data.scheme.id,schemeEntryId:lesson.entry.id,lessonPlanId:lesson.lessonPlan?.id,timetableSlotId:slotId||undefined,actualDate:date,notes,reflection,...values})});
        id=result.data.id;setExisting(result.data);
      }
      if(submit)await apiService.submitRecordOfWork(id);
      await onSaved();onClose();
    }catch(reason:any){setError(reason.message||'Could not save teaching progress.');}finally{setBusy(false);}
  };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3"><section role="dialog" aria-modal="true" aria-labelledby="teaching-record-title" className="min-w-0 max-h-[92vh] w-full [overflow-wrap:anywhere] max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-surface-container-lowest p-5">
    <div className="flex justify-between gap-3"><div className="min-w-0 flex-1"><h2 id="teaching-record-title" className="text-xl font-bold">Record teaching &amp; reflection</h2><p className="text-sm">{data.learningAreaName} · {lesson.entry.strandTitle} / {lesson.entry.subStrandTitle}</p></div><button type="button" className="ui-button min-w-0 max-w-full whitespace-normal text-center" disabled={busy} onClick={onClose}>Close</button></div>
    <p className="text-sm text-on-surface-variant">Record what happened in this session. A postponed lesson leaves its outcomes unfinished; continue the sub-strand in another session when the children are ready.</p>
    {error&&<p role="alert" className="rounded-xl bg-error/10 p-3 text-error">{error}</p>}
    {!editable&&<p role="status">This record is {existing.status.toLowerCase()}. View it in Records of Work; submitted and approved evidence is retained.</p>}
    <fieldset disabled={busy||!editable} className="min-w-0 space-y-4">
      {!existing&&!lesson.lessonPlan&&<label className="block text-sm font-semibold">Timetable suggestion (optional)<select className="ui-field mt-1 min-w-0 max-w-full" value={slotId} onChange={event=>{setSlotId(event.target.value);const slot=data.timetableSlots.find((item:any)=>item.id===event.target.value);if(slot)setDate(slot.date);}}><option value="">Use my entered teaching date</option>{(data.timetableSlots||[]).filter((slot:any)=>slot.date<=today).map((slot:any)=><option key={slot.id} value={slot.id}>{slot.date} · {slot.startTime}–{slot.endTime}</option>)}</select></label>}
      <label className="block text-sm font-semibold">Teaching / postponement date<input type="date" className="ui-field mt-1 min-w-0 max-w-full" value={date} max={today} disabled={Boolean(existing)} onChange={event=>setDate(event.target.value)}/></label>
      <label className="block text-sm font-semibold">Teaching status<select className="ui-field mt-1 min-w-0 max-w-full" value={status} onChange={event=>{setStatus(event.target.value);if(['POSTPONED','CANCELLED'].includes(event.target.value))setCovered([]);}}>{[['COMPLETED','Taught — completed'],['PARTIAL','Partly taught — continue later'],['POSTPONED','Postponed — not taught'],['CANCELLED','Cancelled — not taught']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset className="min-w-0" disabled={noTeaching}><legend className="text-sm font-semibold">Outcomes actually covered</legend>{lesson.entry.specificLearningOutcomes.map((outcome:string)=><label className="mt-2 flex items-start gap-2 text-sm" key={outcome}><input className="mt-1 shrink-0" type="checkbox" checked={!noTeaching&&covered.includes(outcome)} onChange={event=>setCovered(old=>event.target.checked?[...old,outcome]:old.filter(value=>value!==outcome))}/><span className="min-w-0 flex-1">{outcome}</span></label>)}</fieldset>
      <label className="block text-sm font-semibold">What happened / work covered<textarea className="ui-field mt-1 min-w-0 max-w-full" value={notes} onChange={event=>setNotes(event.target.value)}/></label>
      <label className="block text-sm font-semibold">Remaining work / next session<textarea className="ui-field mt-1 min-w-0 max-w-full" value={remaining} onChange={event=>setRemaining(event.target.value)}/></label>
      <label className="block text-sm font-semibold">Teacher reflection<textarea className="ui-field mt-1 min-w-0 max-w-full" value={reflection} onChange={event=>setReflection(event.target.value)} placeholder="What went well? Where do the children need more practice?"/></label>
    </fieldset>
    {editable&&<div className="flex flex-wrap justify-end gap-2"><button type="button" className="ui-button min-w-0 max-w-full whitespace-normal text-center" disabled={busy||notes.trim().length<3||!date} onClick={()=>void save(false)}>Save progress draft</button><button type="button" className="ui-button min-w-0 max-w-full whitespace-normal text-center ui-button-primary" disabled={busy||notes.trim().length<3||!date} onClick={()=>void save(true)}>{busy?'Saving…':'Save & submit for review'}</button></div>}
  </section></div>;
}
