import React, {useEffect, useRef, useState} from 'react';
import {apiService, captureApiRequestScope} from '../../services/api';
import {isCompleteSchemeEntry} from '../../utils/curriculumPermissions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSchemeCreated: (scheme: any) => void | Promise<void>;
}
const fields = {keyInquiryQuestions:'Key inquiry questions',learningExperiences:'Learning experiences',learningResources:'Learning resources',assessmentMethods:'Assessment methods'};
type Content = Record<keyof typeof fields,string>;
const emptyContent = ():Content => ({keyInquiryQuestions:'',learningExperiences:'',learningResources:'',assessmentMethods:''});
const periodLabel=(scheme:any)=>{
  const term=scheme.termId?.match(/(?:term)?[-_ ]?\d{4}[-_ ]?t?([1-3])$/i)?.[1]||scheme.termId?.match(/(?:term|t)[-_ ]?([1-3])$/i)?.[1];
  return `${term?`Term ${term}`:'Saved term'} · ${scheme.academicYearId?.match(/\d{4}/)?.[0]||'Saved academic year'}`;
};

/** Allocate actual teaching periods from saved syllabus content, without week/strand coupling. */
export function CreateSchemeModal({isOpen,onClose,onSchemeCreated}:Props){
  const [sources,setSources]=useState<any[]>([]),[classes,setClasses]=useState<any[]>([]),[areas,setAreas]=useState<any[]>([]);
  const [streams,setStreams]=useState<any[]>([]);
  const [sourceId,setSourceId]=useState(''),[description,setDescription]=useState<any>(),[weekly,setWeekly]=useState<any>();
  const [partId,setPartId]=useState(''),[outcomes,setOutcomes]=useState<string[]>([]),[content,setContent]=useState<Content>(emptyContent);
  const [week,setWeek]=useState(0),[firstLesson,setFirstLesson]=useState(1),[lastLesson,setLastLesson]=useState(1);
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [reviewSelection,setReviewSelection]=useState<string[]>([]);
  const saveInProgress=useRef(false);
  const scheme=weekly?.scheme||description?.scheme;
  const approved=new Set<string>(scheme?.planningState?.approvedEntryIds||[]);
  const protectedLesson=(lesson:any)=>Boolean(approved.has(lesson.entry?.id)||lesson.lessonPlan||lesson.recordOfWorkStatus||lesson.recordsOfWork?.length);
  const sourceLabel=(row:any)=>`${areas.find(area=>area.id===row.learningAreaId)?.name||'Saved learning area'} · ${classes.find(cls=>cls.id===row.classRoomId)?.name||row.title}${row.streamId?` · ${streams.find(stream=>stream.id===row.streamId)?.name||'Saved stream'}`:' · Whole class'} · ${periodLabel(row)}`;
  const curriculum=(description?.catalogue||[]).flatMap((strand:any)=>strand.subStrands.map((sub:any)=>({strand,sub})));
  const parts=(scheme?.planningState?.allocations||[]).filter((allocation:any)=>allocation.lessons>0).map((allocation:any)=>{
    const items=[allocation.subStrandId,...(allocation.combinedSubStrandIds||[])].map(id=>curriculum.find((item:any)=>item.sub.id===id)).filter(Boolean);
    return {allocation,items,label:items.map((item:any)=>`${item.strand.title} / ${item.sub.title}`).join(' + ')};
  });
  const part=parts.find((item:any)=>item.allocation.subStrandId===partId);
  const allowedOutcomes=[...new Set<string>((part?.allocation.specificLearningOutcomes?.length?part.allocation.specificLearningOutcomes:part?.items.flatMap((item:any)=>item.sub.specificLearningOutcomes)||[]).map((text:string)=>text.trim()).filter(Boolean))];
  const weeks:any[]=weekly?.weeks||[];
  const selectedWeek=weeks.find(row=>row.weekNumber===week);
  const range:any[]=(selectedWeek?.lessons||[]).filter((lesson:any)=>lesson.lessonNumber>=firstLesson&&lesson.lessonNumber<=lastLesson);
  const hasProtected=range.some(protectedLesson);
  const readOnly=Boolean(scheme&&!['DRAFT','REJECTED'].includes(scheme.status)&&!(scheme.status==='APPROVED'&&scheme.planningState?.approvedEntryIds));
  const readyEntries=(scheme?.entries||[]).filter((entry:any)=>!approved.has(entry.id)&&isCompleteSchemeEntry(entry));
  const selectedForReview=readyEntries.filter((entry:any)=>reviewSelection.includes(entry.id));
  const canSubmit=Boolean(scheme?.planningState?.coverageReviewStatus==='APPROVED'&&!readOnly&&selectedForReview.length);
  const selectWeek=(row:any,ids:Set<string>=approved)=>{
    setWeek(row?.weekNumber||0);
    const lessons:any[]=row?.lessons||[];
    const blocked=(lesson:any)=>ids.has(lesson.entry?.id)||lesson.lessonPlan||lesson.recordOfWorkStatus||lesson.recordsOfWork?.length;
    const first=lessons.findIndex(lesson=>!blocked(lesson));
    const available:any[]=[];
    for(const lesson of first<0?lessons.slice(0,1):lessons.slice(first)){if(blocked(lesson)&&available.length)break;available.push(lesson);}
    setFirstLesson(available[0]?.lessonNumber||1);setLastLesson(available[available.length-1]?.lessonNumber||1);
  };

  useEffect(()=>{
    if(!isOpen)return;
    let live=true;const current=captureApiRequestScope();
    setLoading(true);setError('');setNotice('');setSources([]);setSourceId('');setDescription(undefined);setWeekly(undefined);setStreams([]);
    Promise.all([apiService.getSchemes(),apiService.getClasses(),apiService.getLearningAreas(),apiService.getCurrentContext()]).then(async([schemes,cls,subjects,context])=>{
      if(!live||!current())return;
      if(!schemes.success||!cls.success||!subjects.success)throw new Error('The saved syllabus list could not be loaded.');
      const available=(schemes.data||[]).filter((row:any)=>row.planningState?.allocations?.some((allocation:any)=>allocation.lessons>0));
      available.sort((a:any,b:any)=>Number(b.termId===context.data?.currentTerm?.id)-Number(a.termId===context.data?.currentTerm?.id));
      const streamClasses=[...new Set<string>(available.filter((row:any)=>row.streamId).map((row:any)=>row.classRoomId))];
      const namedStreams=await Promise.all(streamClasses.map(classId=>apiService.getStreamsByClass(classId).then(result=>result.data||[]).catch(()=>[])));
      if(!live||!current())return;
      setStreams(namedStreams.flat());setSources(available);setClasses(cls.data||[]);setAreas(subjects.data||[]);
      const editable=available.find((row:any)=>['DRAFT','REJECTED'].includes(row.status)||(row.status==='APPROVED'&&row.planningState?.approvedEntryIds));
      setSourceId(editable?.id||available[0]?.id||'');
    }).catch(reason=>{if(live&&current())setError(reason.message||'Could not load saved syllabus coverage.');}).finally(()=>{if(live&&current())setLoading(false);});
    return()=>{live=false;};
  },[isOpen,attempt]);

  useEffect(()=>{
    if(!isOpen||!sourceId)return;
    let live=true;const current=captureApiRequestScope();
    setLoading(true);setError('');setNotice('');setDescription(undefined);setWeekly(undefined);setPartId('');setOutcomes([]);setReviewSelection([]);
    Promise.all([apiService.schemePlanning(`${sourceId}/allocations`),apiService.schemePlanning(`${sourceId}/weekly`)]).then(([saved,timeline])=>{
      if(!live||!current())return;
      setDescription(saved.data);setWeekly(timeline.data);
      setPartId(saved.data.scheme.planningState?.allocations?.find((allocation:any)=>allocation.lessons>0)?.subStrandId||'');
      const ids=new Set<string>(timeline.data.scheme.planningState?.approvedEntryIds||[]);
      const first=timeline.data.weeks.find((row:any)=>row.lessons.some((lesson:any)=>!ids.has(lesson.entry?.id)&&!lesson.lessonPlan&&!lesson.recordOfWorkStatus))||timeline.data.weeks[0];
      selectWeek(first,ids);
    }).catch(reason=>{if(live&&current())setError(reason.message||'Could not load saved coverage and timetable periods.');}).finally(()=>{if(live&&current())setLoading(false);});
    return()=>{live=false;};
  },[isOpen,sourceId]);

  useEffect(()=>{
    if(!description||!partId)return;
    const allocation=description.scheme.planningState.allocations.find((row:any)=>row.subStrandId===partId);
    const selected=[partId,...(allocation?.combinedSubStrandIds||[])].map(id=>curriculum.find((item:any)=>item.sub.id===id)).filter(Boolean);
    setOutcomes((allocation?.specificLearningOutcomes?.length?allocation.specificLearningOutcomes:selected.flatMap((item:any)=>item.sub.specificLearningOutcomes)).map((text:string)=>text.trim()).filter(Boolean));
    setContent(Object.fromEntries(Object.keys(fields).map(key=>[key,(allocation?.[key]||(key==='learningExperiences'?selected.flatMap((item:any)=>item.sub.suggestedExperiences||[]):[])).join('\n')])) as Content);
  },[partId,description]);

  const close=()=>{if(!saveInProgress.current)onClose();};
  useEffect(()=>{
    if(!isOpen)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}};
    window.addEventListener('keydown',escape,true);
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{window.removeEventListener('keydown',escape,true);document.body.style.overflow=previous;};
  },[isOpen,onClose]);

  const save=async()=>{
    if(saveInProgress.current||loading||!scheme||scheme.id!==sourceId||!part||!range.length||!outcomes.length||hasProtected||readOnly)return;
    if(range.some(lesson=>lesson.entry)&&!window.confirm('Replace the draft allocation in these lessons? The previous draft will be retained in history. Approved lessons and teaching records cannot be replaced.'))return;
    saveInProgress.current=true;setSaving(true);setError('');setNotice('');
    try{
      const response=await apiService.schemePlanning(`${sourceId}/sessions/allocate`,{method:'POST',body:JSON.stringify({revision:scheme.planningState.revision,subStrandId:partId,slotIds:range.map(lesson=>lesson.id),specificLearningOutcomes:outcomes,...Object.fromEntries(Object.keys(fields).map(key=>[key,content[key as keyof Content].split('\n').map(text=>text.trim()).filter(Boolean)]))})});
      setWeekly(response.data);setSources(old=>old.map(row=>row.id===sourceId?response.data.scheme:row));
      const currentEntries=response.data.scheme.entries.filter((entry:any)=>!entry.archivedAt);
      setReviewSelection(old=>old.filter(id=>currentEntries.some((entry:any)=>entry.id===id)));
      setNotice(`Saved Week ${week}, lessons ${firstLesson}–${lastLesson}. Continue this strand in any later week, or select another part. Unallocated lessons remain open.`);
      try{await onSchemeCreated(response.data.scheme);}catch{setNotice('Your lesson allocation was saved. Refresh the schemes list after closing this modal.');}
    }catch(reason:any){setError(reason.message||'Could not save the lesson allocation.');}
    finally{saveInProgress.current=false;setSaving(false);}
  };

  const submitSelected=async()=>{
    if(saveInProgress.current||loading||!scheme||scheme.id!==sourceId||!canSubmit)return;
    saveInProgress.current=true;setSaving(true);setError('');setNotice('');
    try{
      const response=await apiService.schemePlanning(`${sourceId}/weekly/submit`,{method:'POST',body:JSON.stringify({revision:scheme.planningState.revision,entryIds:selectedForReview.map((entry:any)=>entry.id)})});
      const updated=response.data.scheme;
      setWeekly(old=>({...old,scheme:updated}));setSources(old=>old.map(row=>row.id===sourceId?updated:row));setReviewSelection([]);
      setNotice(`Submitted ${selectedForReview.length} selected lessons for school leadership review. The remaining saved lessons are retained as drafts.`);
      try{await onSchemeCreated(updated);}catch{setNotice('Your selected lessons were submitted. Refresh the schemes list after closing this modal.');}
    }catch(reason:any){setError(reason.message||'The selected lessons could not be submitted.');}
    finally{saveInProgress.current=false;setSaving(false);}
  };

  if(!isOpen)return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-5" onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="create-scheme-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl">
      <header className="flex items-start justify-between gap-4 border-b border-outline-variant/30 p-4 sm:p-5"><div><h2 id="create-scheme-title" className="text-xl font-bold">New Scheme of Work</h2><p className="mt-1 text-sm text-on-surface-variant">Load a planned syllabus, then decide what to teach in each timetable lesson. A strand can span several weeks.</p></div><button type="button" className="ui-button" disabled={saving} onClick={close} aria-label="Close scheme creator">✕</button></header>
      <div className="space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}<button className="ui-button ml-2" disabled={saving} onClick={()=>setAttempt(value=>value+1)}>Reload saved plans</button></div>}
        {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
        <label className="block text-sm font-semibold">Planned syllabus<select className="ui-field mt-2 w-full" value={sourceId} disabled={loading||saving} onChange={event=>setSourceId(event.target.value)}><option value="">Choose saved syllabus coverage</option>{sources.map(row=><option key={row.id} value={row.id}>{sourceLabel(row)} · {row.planningState.coverageReviewStatus||'DRAFT'}</option>)}</select></label>
        {loading?<p role="status" className="rounded-xl bg-surface p-4 text-sm">Loading saved curriculum and timetable lessons…</p>:!sources.length?<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No saved syllabus coverage with lesson allocations is available. Save the syllabus under Syllabus Planning first, then return here. This modal does not create or replace syllabus coverage.</p>:scheme&&<>
          {readOnly&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">This scheme is awaiting review or locked. Use an editable draft, or ask leadership to return it before changing its lessons.</p>}
          <p className="text-sm text-on-surface-variant">{sourceLabel(scheme)} · Syllabus: <strong>{scheme.planningState.coverageReviewStatus||'DRAFT'}</strong>. Draft lessons can be saved now; syllabus approval is required before submitting them for review.</p>
          <label className="block text-sm font-semibold">Strand / sub-strand from the planned syllabus<select className="ui-field mt-2 w-full" value={partId} disabled={saving||readOnly} onChange={event=>{setPartId(event.target.value);setNotice('');}}>{parts.map((item:any)=><option key={item.allocation.subStrandId} value={item.allocation.subStrandId}>{item.label||'Saved curriculum item'}</option>)}</select></label>
          <fieldset className="space-y-2 rounded-xl border border-outline-variant/30 p-4" disabled={saving||readOnly}><legend className="px-1 text-sm font-semibold">Which part will these lessons cover?</legend><p className="text-xs text-on-surface-variant">Select the saved outcomes for this lesson range. Cover other outcomes in later lessons or weeks.</p>{allowedOutcomes.map(outcome=><label key={outcome} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={outcomes.includes(outcome)} onChange={event=>setOutcomes(old=>event.target.checked?[...old,outcome]:old.filter(value=>value!==outcome))}/><span>{outcome}</span></label>)}{!allowedOutcomes.length&&<p className="text-sm text-amber-800">This syllabus item has no published outcomes. Ask the curriculum administrator to complete it.</p>}</fieldset>
          <fieldset disabled={saving||readOnly} className="space-y-3 rounded-xl border border-outline-variant/30 p-4"><legend className="px-1 text-sm font-semibold">Allocate timetable lessons</legend>
            <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Teaching week<select className="ui-field mt-1 w-full" value={week} onChange={event=>selectWeek(weeks.find(row=>row.weekNumber===Number(event.target.value)))}>{weeks.map(row=><option key={row.weekNumber} value={row.weekNumber}>Week {row.weekNumber} · {row.lessons.length} lessons</option>)}</select></label><label className="text-sm">From lesson<select className="ui-field mt-1 w-full" value={firstLesson} onChange={event=>{const value=Number(event.target.value);setFirstLesson(value);if(lastLesson<value)setLastLesson(value);}}>{selectedWeek?.lessons.map((lesson:any)=><option key={lesson.id} value={lesson.lessonNumber}>Lesson {lesson.lessonNumber} · {lesson.date}</option>)}</select></label><label className="text-sm">Through lesson<select className="ui-field mt-1 w-full" value={lastLesson} onChange={event=>setLastLesson(Number(event.target.value))}>{selectedWeek?.lessons.filter((lesson:any)=>lesson.lessonNumber>=firstLesson).map((lesson:any)=><option key={lesson.id} value={lesson.lessonNumber}>Lesson {lesson.lessonNumber} · {lesson.date}</option>)}</select></label></div>
            <p className="text-sm">Week {week} has <strong>{selectedWeek?.lessons.length||0} actual subject lessons</strong>. Selected: <strong>{range.length} lessons</strong> ({range[0]?.date} – {range[range.length-1]?.date}).</p>
            <p className="text-xs text-on-surface-variant">For five lessons a week, choose lessons 1–5 to spend the whole week on this part. Choose the same strand next week if more time is needed. Holidays and cancelled periods are excluded.</p>
            {hasProtected&&<p role="alert" className="text-sm text-amber-900">This range includes an approved lesson or linked teaching document. Select other periods; existing teaching history is retained.</p>}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">{Object.entries(fields).map(([key,label])=><label key={key} className="text-sm font-semibold">{label}<textarea className="ui-field mt-1 min-h-24 w-full font-normal" disabled={saving||readOnly} value={content[key as keyof Content]} onChange={event=>setContent(old=>({...old,[key]:event.target.value}))}/></label>)}</div>
          <button type="button" className="ui-button ui-button-primary" disabled={loading||saving||readOnly||scheme.id!==sourceId||!range.length||!outcomes.length||hasProtected} onClick={save}>{saving?'Saving lessons…':`Allocate ${range.length} lessons · Week ${week}`}</button>
          <section aria-label="Term lesson allocations" className="space-y-2"><h3 className="font-bold">Whole-term lesson map</h3>
            <div className="space-y-2 rounded-xl border border-outline-variant/30 bg-surface p-3">
              <p className="text-sm font-semibold">Select saved lessons to submit for review</p>
              <p className="text-xs text-on-surface-variant">A lesson needs outcomes, learning experiences and assessment methods before it can be selected. Unsaved form changes are not submitted.</p>
              <div className="flex flex-wrap gap-2"><button type="button" className="ui-button" disabled={saving||readOnly||!readyEntries.some((entry:any)=>entry.weekNumber===week)} onClick={()=>setReviewSelection(old=>[...new Set([...old,...readyEntries.filter((entry:any)=>entry.weekNumber===week).map((entry:any)=>entry.id)])])}>Select completed Week {week} lessons</button><button type="button" className="ui-button" disabled={saving||!reviewSelection.length} onClick={()=>setReviewSelection([])}>Clear selection</button></div>
              {scheme.planningState.coverageReviewStatus!=='APPROVED'&&<p className="text-xs text-amber-900">The saved syllabus coverage must be approved before scheme lessons can be submitted.</p>}
            </div><p className="text-xs text-on-surface-variant">Weeks stay available until the end of the timetable. The number of strands does not determine the number of weeks.</p>{weeks.map(row=><details key={row.weekNumber} className="rounded-xl border border-outline-variant/30 p-3" open={row.weekNumber===week}><summary className="cursor-pointer text-sm font-semibold">Week {row.weekNumber} · {row.startDate} – {row.endDate} · {row.lessons.filter((lesson:any)=>lesson.entry).length}/{row.lessons.length} lessons allocated</summary><ul className="mt-2 divide-y divide-outline-variant/20">{row.lessons.map((lesson:any)=><li key={lesson.id} className="py-2 text-sm"><label className="flex items-start gap-2"><input type="checkbox" className="mt-1" aria-label={`Select Week ${row.weekNumber} lesson ${lesson.lessonNumber} for review`} disabled={saving||readOnly||!lesson.entry||approved.has(lesson.entry.id)||!isCompleteSchemeEntry(lesson.entry)} checked={Boolean(lesson.entry&&reviewSelection.includes(lesson.entry.id))} onChange={event=>setReviewSelection(old=>event.target.checked?[...new Set([...old,lesson.entry.id])]:old.filter(id=>id!==lesson.entry.id))}/><span><strong>Lesson {lesson.lessonNumber}</strong> · {lesson.date}</span></label> · {lesson.startTime}–{lesson.endTime}<p className="mt-1">{lesson.entry?`${lesson.entry.strandTitle} / ${lesson.entry.subStrandTitle}`:'Not allocated — available for later planning'}</p>{lesson.entry?.specificLearningOutcomes?.length>0&&<p className="mt-1 text-xs text-on-surface-variant">{lesson.entry.specificLearningOutcomes.join('; ')}</p>}{protectedLesson(lesson)&&<span className="text-xs text-emerald-800">Approved or linked teaching history retained</span>}</li>)}</ul></details>)}</section>
        </>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 p-4"><p role="status" className="text-sm">{selectedForReview.length} completed lessons selected</p><div className="flex flex-wrap gap-2"><button type="button" className="ui-button" disabled={saving} onClick={close}>Done</button><button type="button" className="ui-button ui-button-primary" disabled={loading||saving||scheme?.id!==sourceId||!canSubmit} onClick={submitSelected}>{saving?'Please wait…':`Submit selected lessons for review (${selectedForReview.length})`}</button></div></footer>
    </section>
  </div>;
}
