import React,{useEffect,useState} from 'react';
import {apiService} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import {canPrepareCurriculum,isApprovedSchemeEntry} from '../../utils/curriculumPermissions';
import {CoverageProgressBar} from './CoverageProgressBar';
import {RecordTeachingSessionModal} from '../modals/RecordTeachingSessionModal';

export function SyllabusTeachingProgress({schemeId,scope,initialData,onChanged,onNavigateTab}:{schemeId?:string;scope:any;initialData?:any;onChanged?:()=>Promise<void>;onNavigateTab?:(tab:string)=>void}){
  const {user}=useAuth();
  const [data,setData]=useState<any>(initialData),[error,setError]=useState(''),[loading,setLoading]=useState(false),[session,setSession]=useState<any>(),[selectedSub,setSelectedSub]=useState('');
  const query=new URLSearchParams(Object.entries(scope).filter(([,value])=>value!==undefined&&value!=='').map(([key,value])=>[key,String(value)])).toString();
  const load=async()=>{if(!schemeId)return;setLoading(true);setError('');try{const result=await apiService.schemePlanning(`${schemeId}/weekly?${query}`);setData(result.data);}catch(reason:any){setError(reason.message||'Could not load syllabus progress.');}finally{setLoading(false);}};
  useEffect(()=>{let live=true;setData(initialData);setSession(undefined);setSelectedSub('');setError('');if(!schemeId)return;if(initialData)return;setLoading(true);apiService.schemePlanning(`${schemeId}/weekly?${query}`).then(result=>{if(live)setData(result.data);}).catch(reason=>{if(live)setError(reason.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[schemeId,query,initialData]);
  if(!schemeId)return null;
  const continueSub=async(sub:any)=>{
    const reason=window.prompt(`Why does ${sub.title} need another week of practice?`)?.trim();
    if(!reason)return;
    if(reason.length<3){setError('Add a short reason for the continuation.');return;}
    setLoading(true);setError('');
    try{await apiService.schemePlanning(`${schemeId}/sessions/continue?${query}`,{method:'POST',body:JSON.stringify({revision:data.scheme.planningState.revision,subStrandId:sub.subStrandId,reason})});await load();await onChanged?.();}catch(problem:any){setError(problem.message||'Could not continue this sub-strand.');}finally{setLoading(false);}
  };
  const summary=data?.coverageSummary;
  const lessons:any[]=data?.weeks?.flatMap((week:any)=>week.lessons).filter((lesson:any)=>lesson.entry)||[];
  const shown=lessons.filter(lesson=>!selectedSub||lesson.entry.subStrandId===selectedSub);
  const canRecord=canPrepareCurriculum(user?.role);
  return <section aria-label="Syllabus teaching progress" className="space-y-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Teaching progress &amp; reflection</h3><p className="mt-1 text-sm text-on-surface-variant">Mark taught, partly taught or postponed below. Continue the same strand or sub-strand across as many sessions and weeks as the children need.</p></div><button type="button" className="ui-button" disabled={loading} onClick={()=>void load()}>Refresh progress</button></div>
    {error&&<p role="alert" className="text-sm text-error">{error}</p>}{loading&&<p role="status">Loading teaching progress…</p>}
    {summary&&<>
      <CoverageProgressBar confirmed={summary.recordedOutcomes} total={summary.totalOutcomes} label="Teacher-recorded syllabus coverage" unit="outcomes"/>
      <CoverageProgressBar confirmed={summary.confirmedOutcomes} total={summary.totalOutcomes} label="Verified syllabus coverage" unit="outcomes"/>
      <p className="text-xs text-on-surface-variant">Coverage measures unique outcomes in this saved syllabus. Draft records appear in teacher-recorded progress; {summary.reportedOutcomes} outcomes have been submitted or approved. Only approved evidence counts as verified. Repeated practice, postponed sessions and elapsed weeks do not increase coverage.</p>
      <div className="space-y-3">{summary.subStrands.map((sub:any)=><article key={sub.subStrandId} className="rounded-xl border border-outline-variant/30 p-3"><h4 className="font-semibold">{sub.strandTitle} / {sub.title}</h4><CoverageProgressBar confirmed={sub.confirmedOutcomes} total={sub.totalOutcomes} label={`${sub.title} verified coverage`} unit="outcomes"/><p className="mt-2 text-xs text-on-surface-variant">{sub.recordedOutcomes} outcomes recorded · {sub.plannedLessons} planned sessions · {sub.postponedLessons} postponed</p>{sub.remainingOutcomes.length>0&&<details className="mt-2 text-sm"><summary className="cursor-pointer">Outcomes still awaiting verified coverage ({sub.remainingOutcomes.length})</summary><ul className="mt-2 list-disc pl-5">{sub.remainingOutcomes.map((outcome:string)=><li key={outcome}>{outcome}</li>)}</ul></details>}{canRecord&&data.scheme.planningState&&(['DRAFT','REJECTED'].includes(data.scheme.status)||(data.scheme.status==='APPROVED'&&Array.isArray(data.scheme.planningState.approvedEntryIds)))&&<button type="button" className="ui-button mt-3" disabled={loading} onClick={()=>void continueSub(sub)}>Continue this sub-strand in another week</button>}</article>)}</div>
    </>}
    <details open className="space-y-3"><summary className="cursor-pointer font-semibold">Teaching sessions — record or review progress</summary>
      <label className="block text-sm">Filter sub-strand<select className="ui-field mt-1 w-full sm:max-w-md" value={selectedSub} onChange={event=>setSelectedSub(event.target.value)}><option value="">All sub-strands</option>{summary?.subStrands.map((sub:any)=><option key={sub.subStrandId} value={sub.subStrandId}>{sub.title}</option>)}</select></label>
      <div className="max-h-[32rem] space-y-3 overflow-y-auto">{shown.map(lesson=>{
        const record=lesson.recordsOfWork?.[0];const approved=isApprovedSchemeEntry(data.scheme,lesson.entry);
        const teachingStatus=record?.reflectionData?.teachingStatus;
        const statusLabel=({COMPLETED:'Taught',PARTIAL:'Partly taught — continue',POSTPONED:'Postponed — continue',CANCELLED:'Cancelled'} as Record<string,string>)[teachingStatus]||'Not recorded';
        return <article key={lesson.entry.id} className="rounded-xl border border-outline-variant/30 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Scheme Week {lesson.weekNumber}, Lesson {lesson.lessonNumber} · {lesson.entry.subStrandTitle}</p><p className="mt-1 text-xs">{lesson.date?`${lesson.date} · ${lesson.startTime}–${lesson.endTime}`:'Choose an actual teaching period when recording'} · {statusLabel}{record?` · ${record.status.toLowerCase()}`:''}</p></div>{canRecord&&approved?<button type="button" className="ui-button" onClick={()=>setSession(lesson)}>{record?['DRAFT','RETURNED'].includes(record.status)?'Edit progress & reflection':'View teaching record':'Record taught / postponed'}</button>:<span className="text-xs text-on-surface-variant">{approved?'Teaching record':'Scheme lesson awaiting approval'}</span>}</div>{record?.reflection&&<p className="mt-2 text-sm">Reflection: {record.reflection}</p>}{record?.reflectionData?.remainingWork&&<p className="mt-1 text-sm">Follow-up: {record.reflectionData.remainingWork}</p>}</article>;
      })}</div>{!shown.length&&<p className="text-sm">No scheme sessions have been planned for this selection yet.</p>}
    </details>
    <div className="flex flex-wrap gap-2">{onNavigateTab&&<><button type="button" className="ui-button" onClick={()=>onNavigateTab('records-of-work')}>Open Records of Work</button><button type="button" className="ui-button" onClick={()=>onNavigateTab('scheme-of-work-builder')}>Continue strand / sub-strand in schemes</button></>}</div>
    {session&&data&&<RecordTeachingSessionModal data={data} lesson={session} onClose={()=>setSession(undefined)} onSaved={async()=>{await load();await onChanged?.();}}/>}
  </section>;
}
