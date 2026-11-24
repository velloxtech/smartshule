import React,{useState} from 'react';
import {LessonPlan,RecordOfWork} from '../../types';
import {apiService} from '../../services/api';

export function LessonAfterClassModal({plan,record,onClose,onSaved}:{plan:LessonPlan;record?:RecordOfWork;onClose:()=>void;onSaved:()=>Promise<void>}){
  const details=record?.reflectionData as any;
  const [status,setStatus]=useState(details?.teachingStatus||'COMPLETED');
  const [date,setDate]=useState(record?.lessonDate||plan.lessonDate);
  const [covered,setCovered]=useState<string[]>(details?.outcomesCovered||plan.specificLearningOutcomes);
  const [notes,setNotes]=useState(record?.learningActivities||'');
  const [remaining,setRemaining]=useState(details?.remainingWork||'');
  const [reflection,setReflection]=useState(record?.reflection||plan.teacherSelfReflection||'');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const noTeaching=['POSTPONED','CANCELLED'].includes(status);
  const save=async()=>{
    if(status==='COMPLETED'&&plan.specificLearningOutcomes.some(outcome=>!covered.includes(outcome))){setError('Choose Partly taught when some lesson outcomes remain unfinished.');return;}
    setBusy(true);setError('');
    try{await apiService.saveLessonAfterClass(plan.id,{teachingStatus:status,actualDate:date,outcomesCovered:noTeaching?[]:covered,notes,remainingWork:remaining,reflection});await onSaved();onClose();}catch(problem:any){setError(problem.message||'Could not save the after-class report.');}finally{setBusy(false);}
  };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3"><section role="dialog" aria-modal="true" aria-labelledby="after-class-title" className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-surface-container-lowest p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 id="after-class-title" className="text-xl font-bold">After class: teaching &amp; reflection</h2><p className="text-sm">{plan.strand} / {plan.subStrand} · {plan.lessonDate} · {plan.lessonTime}</p></div><button type="button" className="ui-button" disabled={busy} onClick={onClose}>Close</button></div>
    <p className="text-sm text-on-surface-variant">Save once to record the teaching status, submit the lesson and teaching record for admin review, and keep a copy of this lesson with your report. Verified syllabus coverage updates after approval.</p>
    {error&&<p role="alert" className="rounded-lg bg-error/10 p-3 text-error">{error}</p>}
    <fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm font-semibold">Actual teaching / postponement date<input type="date" className="ui-field mt-1 w-full" max={new Date().toISOString().slice(0,10)} value={date} onChange={event=>setDate(event.target.value)}/></label>
      <label className="block text-sm font-semibold">Teaching status<select className="ui-field mt-1 w-full" value={status} onChange={event=>{setStatus(event.target.value);if(['POSTPONED','CANCELLED'].includes(event.target.value))setCovered([]);}}>{[['COMPLETED','Taught — completed'],['PARTIAL','Partly taught — continue later'],['POSTPONED','Postponed — not taught'],['CANCELLED','Cancelled — not taught']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset disabled={noTeaching}><legend className="text-sm font-semibold">Lesson outcomes actually covered</legend>{plan.specificLearningOutcomes.map(outcome=><label className="mt-2 flex gap-2 text-sm" key={outcome}><input type="checkbox" checked={!noTeaching&&covered.includes(outcome)} onChange={event=>setCovered(old=>event.target.checked?[...old,outcome]:old.filter(value=>value!==outcome))}/>{outcome}</label>)}</fieldset>
      <label className="block text-sm font-semibold">Work covered / what happened<textarea className="ui-field mt-1 w-full" value={notes} onChange={event=>setNotes(event.target.value)}/></label>
      <label className="block text-sm font-semibold">Remaining work / next steps<textarea className="ui-field mt-1 w-full" value={remaining} onChange={event=>setRemaining(event.target.value)}/></label>
      <label className="block text-sm font-semibold">After-class reflection<textarea className="ui-field mt-1 w-full" value={reflection} onChange={event=>setReflection(event.target.value)} placeholder="What went well? What will you change or practise next?"/></label>
    </fieldset>
    <button type="button" className="ui-button ui-button-primary" disabled={busy||notes.trim().length<3||reflection.trim().length<3||!date||date>new Date().toISOString().slice(0,10)} onClick={()=>void save()}>{busy?'Saving & submitting…':'Save & submit after-class report'}</button>
  </section></div>;
}
