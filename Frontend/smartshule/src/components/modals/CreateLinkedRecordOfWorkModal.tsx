import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';

type LessonOption = { id:string; areaId:string; areaName:string; date:string; weekNumber:number; lessonNumber:number; periodNumber:number; strandTitle?:string; subStrandTitle?:string; lessonPlan:any };

export function CreateLinkedRecordOfWorkModal({onClose,onCreated}:{onClose:()=>void;onCreated:(record:any)=>void}) {
  const [year,setYear]=useState<any>();
  const [term,setTerm]=useState<any>();
  const [classes,setClasses]=useState<any[]>([]);
  const [classId,setClassId]=useState('');
  const [streamId,setStreamId]=useState('');
  const [lessons,setLessons]=useState<LessonOption[]>([]);
  const [lessonId,setLessonId]=useState('');
  const [notes,setNotes]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const selectedClass=classes.find(c=>c.id===classId);
  const streams=selectedClass?.planningStreams||[];
  const selectedLesson=lessons.find(l=>l.id===lessonId);
  const query=useMemo(()=>{const params=new URLSearchParams();if(year?.id)params.set('academicYearId',year.id);if(term?.id)params.set('termId',term.id);if(classId)params.set('classRoomId',classId);if(streamId)params.set('streamId',streamId);return params.toString();},[year?.id,term?.id,classId,streamId]);

  useEffect(()=>{
    let live=true;
    (async()=>{
      setLoading(true);setError('');
      try{
        const context=(await apiService.getCurrentContext()).data;
        if(!context?.currentYear||!context.currentTerm)throw new Error('There is no active academic year and term.');
        const ctxYear=context.currentYear,ctxTerm=context.currentTerm;
        const options=await apiService.planning(`options?${new URLSearchParams({academicYearId:ctxYear.id,termId:ctxTerm.id})}`);
        const available=options.data||[];
        if(!live)return;
        setYear(ctxYear);setTerm(ctxTerm);setClasses(available);
        const first=available[0];setClassId(first?.id||'');setStreamId(first?.planningStreams?.[0]?.id||'');
        if(!available.length)setError('No active class or subject assignment is available for this term.');
      }catch(e:any){if(live)setError(e.message||'Could not load your assigned teaching context.');}
      finally{if(live)setLoading(false);}
    })();
    return()=>{live=false;};
  },[]);

  useEffect(()=>{
    let live=true;
    if(!year?.id||!term?.id||!classId){setLessons([]);setLessonId('');return;}
    setLoading(true);setError('');setLessons([]);setLessonId('');
    (async()=>{
      try{
        const workspace=(await apiService.planning(`workspace?${query}`)).data;
        const assigned=(workspace?.areas||[]).filter((area:any)=>area.canPlan&&area.scheme?.status==='APPROVED'&&area.schemeId);
        const weeks=await Promise.all(assigned.map(async(area:any)=>{
          const result=await apiService.schemePlanning(`${area.schemeId}/weekly?${query}`);
          return (result.data?.weeks||[]).flatMap((week:any)=>week.lessons||[]).filter((lesson:any)=>lesson.lessonPlan?.status==='APPROVED'&&!lesson.recordOfWorkStatus).map((lesson:any)=>({
            id:lesson.lessonPlan.id,areaId:area.learningAreaId,areaName:area.name,date:lesson.date,weekNumber:lesson.weekNumber,lessonNumber:lesson.lessonNumber,periodNumber:lesson.periodNumber,strandTitle:lesson.entry?.strandTitle,subStrandTitle:lesson.entry?.subStrandTitle,lessonPlan:lesson.lessonPlan
          }));
        }));
        if(!live)return;
        const available=weeks.flat().filter((lesson:LessonOption)=>lesson.date<=new Date().toISOString().slice(0,10)).sort((a:LessonOption,b:LessonOption)=>b.date.localeCompare(a.date)||b.periodNumber-a.periodNumber);
        setLessons(available);setLessonId(available[0]?.id||'');
        if(!assigned.length)setError('No approved scheme is ready for your assigned subjects yet.');
        else if(!available.length)setError('No past approved lesson is waiting for a Record of Work. Open the scheduled lesson after teaching and save its Record of Work there.');
      }catch(e:any){if(live)setError(e.message||'Could not load approved lessons for this class and stream.');}
      finally{if(live)setLoading(false);}
    })();
    return()=>{live=false;};
  },[year?.id,term?.id,classId,streamId,query]);

  const save=async()=>{
    if(!selectedLesson||notes.trim().length<3)return;
    setSaving(true);setError('');
    try{
      const result=await apiService.planning(`record-taught?${query}`,{method:'POST',body:JSON.stringify({lessonPlanId:selectedLesson.id,notes:notes.trim()})});
      onCreated(result.data);
    }catch(e:any){setError(e.message||'Could not save the Record of Work.');}
    finally{setSaving(false);}
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="linked-record-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
      <header className="flex items-center justify-between border-b bg-rose-50 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-primary">After class</p><h2 id="linked-record-title" className="mt-1 text-lg font-bold text-on-surface">Record work from a lesson</h2><p className="mt-1 text-sm text-on-surface-variant">Choose an approved lesson and describe what you covered.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-on-surface-variant hover:bg-white" aria-label="Close"><span className="material-symbols-outlined">close</span></button></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {error&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        {loading?<p role="status" className="rounded-xl bg-surface p-4 text-sm text-on-surface-variant">Loading your assigned lessons…</p>:<>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-on-surface-variant">Class<select className="mt-1 w-full rounded-lg border p-2.5 text-sm" value={classId} onChange={e=>{const next=classes.find(c=>c.id===e.target.value);setClassId(e.target.value);setStreamId(next?.planningStreams?.[0]?.id||'');}}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-on-surface-variant">Stream<select className="mt-1 w-full rounded-lg border p-2.5 text-sm" value={streamId} onChange={e=>setStreamId(e.target.value)}>{streams.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <div className="text-xs font-semibold text-on-surface-variant">Period<div className="mt-1 rounded-lg border bg-surface p-2.5 text-sm text-on-surface-variant">{term?.name} · {year?.name}</div></div>
          </div>
          <label className="block text-xs font-semibold text-on-surface-variant">Approved lesson<select className="mt-1 w-full rounded-lg border p-2.5 text-sm" value={lessonId} onChange={e=>setLessonId(e.target.value)}>{lessons.map(l=><option key={l.id} value={l.id}>{l.date} · Week {l.weekNumber}, Lesson {l.lessonNumber} · {l.areaName} · {l.subStrandTitle||l.strandTitle}</option>)}</select></label>
          {selectedLesson&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><strong>{selectedLesson.areaName}</strong><p>{selectedLesson.strandTitle} · {selectedLesson.subStrandTitle}</p></div>}
          <label className="block text-sm font-semibold text-on-surface">What did you actually teach?<textarea className="mt-2 min-h-32 w-full rounded-xl border p-3 text-sm font-normal" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Record the learning activities and content completed in class."/></label>
        </>}
      </div>
      <footer className="flex justify-end gap-2 border-t bg-surface p-4"><button type="button" onClick={onClose} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={save} disabled={loading||saving||!selectedLesson||notes.trim().length<3} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?'Saving…':'Save Record of Work draft'}</button></footer>
    </section>
  </div>;
}
