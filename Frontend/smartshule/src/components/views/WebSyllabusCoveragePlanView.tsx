import {DeleteCurriculumPlanButton} from '../curriculum/DeleteCurriculumPlanButton';
import {WeeklyMonitoringRegister} from '../curriculum/WeeklyMonitoringRegister';
import {PlanningRoadmap} from '../curriculum/PlanningRoadmap';
import {selectPlanningTerm,rememberPlanningScope,rememberedPlanningScope} from '../../utils/planningPeriod';
import { ClassCoverageSummary } from '../curriculum/ClassCoverageSummary';
import { SubStrandSchemePlanner } from '../curriculum/SubStrandSchemePlanner';
import { TermCoveragePlanner } from '../curriculum/TermCoveragePlanner';
import React,{useEffect,useState,useRef} from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const input='ui-field';
export function WebSyllabusCoveragePlanView({onNavigateTab,mode='coverage'}:{onNavigateTab?:(tab:string)=>void;mode?:'coverage'|'scheme-builder'|'monitoring'}){
 const Planner=mode==='scheme-builder'?SubStrandSchemePlanner:TermCoveragePlanner;
 const {user}=useAuth();const admin=['SUPER_ADMIN','ADMIN','SCHOOL_ADMIN','HEAD_TEACHER','DEPUTY_HEAD_TEACHER'].includes(user?.role || '');
 const workspaceRequest=useRef(0);
 const [optionsLoaded,setOptionsLoaded]=useState(false);
 const selectedContext=useRef('');
 const [years,setYears]=useState<any[]>([]),[terms,setTerms]=useState<any[]>([]),[classes,setClasses]=useState<any[]>([]);
 const [year,setYear]=useState(''),[term,setTerm]=useState(''),[classId,setClassId]=useState(''),[stream,setStream]=useState('');
 const [workspace,setWorkspace]=useState<any>(),[areaId,setAreaId]=useState(''),[calendar,setCalendar]=useState<any>();
 const [sequence,setSequence]=useState<string[]>([]),[sequential,setSequential]=useState(false),[sequenceRevision,setSequenceRevision]=useState(0);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [screen,setScreen]=useState<'areas'|'plan'|'coverage'>('areas');
 const [planDirty,setPlanDirty]=useState(false);
 const [planStep,setPlanStep]=useState<'allocation'|'weekly'>('allocation');
 const leavePlan=()=>{if(planDirty&&!window.confirm('Discard unsaved allocation edits? Your saved work will be retained.'))return;setPlanDirty(false);setScreen('areas');};
 const [coverageMode,setCoverageMode]=useState<'subjects'|'class'>('subjects');
 const [filter,setFilter]=useState<'ready'|'all'>('all');
 const [loading,setLoading]=useState(false);
 const query=(extra:any={})=>new URLSearchParams(Object.fromEntries(Object.entries({academicYearId:year,termId:term,classRoomId:classId,streamId:stream,...extra}).filter(([,v])=>v!==''&&v!==undefined).map(([k,v])=>[k,String(v)]))).toString();
 const call=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();}catch(e:any){setError(e.message || 'The request could not be completed.');}finally{setBusy(false);}};
 useEffect(()=>{apiService.getAcademicYears().then(r=>{setYears(r.data||[]);setYear(r.data?.some(y=>y.id===rememberedPlanningScope(user).academicYearId)?rememberedPlanningScope(user).academicYearId:r.data?.find(y=>y.isCurrent)?.id || r.data?.[0]?.id || '');}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(!year)return;let live=true;setScreen('areas');setTerm('');apiService.getTerms(year).then(r=>{if(live){setTerms(r.data||[]);setTerm(r.data?.some(t=>t.id===rememberedPlanningScope(user).termId)?rememberedPlanningScope(user).termId:selectPlanningTerm(r.data||[]));}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[year]);
 useEffect(()=>{setCalendar(undefined);if(!year||!term)return;let cancelled=false;setOptionsLoaded(false);setClasses([]);setClassId('');setStream('');setWorkspace(undefined);setError('');
  Promise.allSettled([apiService.planning(`options?${query({classRoomId:'',streamId:''})}`),apiService.planning(`calendar?${query({classRoomId:'',streamId:''})}`)]).then(([options,cal])=>{
   if(cancelled)return;
   if(options.status==='fulfilled'){setClasses(options.value.data||[]);const saved=rememberedPlanningScope(user);const selected=options.value.data?.find((c:any)=>c.id===saved.classRoomId)||options.value.data?.[0];setClassId(selected?.id||'');setStream(selected?.planningStreams?.some((r:any)=>r.id===saved.streamId)?saved.streamId:selected?.planningStreams?.[0]?.id||'');setOptionsLoaded(true);}else setError((options.reason?.message||'Unable to load teaching assignments.')+(!admin?' Ask the administrator to check your teacher account, academic period and assignments.':''));
   if(cal.status==='fulfilled'){const t=terms.find(t=>t.id===term);setCalendar(cal.value.data?.data||{startDate:t?.startDate?.slice(0,10),endDate:t?.endDate?.slice(0,10),teachingDays:[1,2,3,4,5],exceptions:[],published:false});}else{setCalendar(null);setError(cal.reason?.message||'Unable to load the term calendar.');}
  });return()=>{cancelled=true;};
 },[year,term]);

 const contextKey=[year,term,classId,stream].join(':');selectedContext.current=contextKey;
 const load=async()=>{
  if(!year||!term||!classId||selectedContext.current!==contextKey)return;
  const generation=++workspaceRequest.current;
  const current=()=>generation===workspaceRequest.current&&selectedContext.current===contextKey;
  setLoading(true);setError('');
  try{
   const r=await apiService.planning(`workspace?${query()}`);
   if(!current())return;
   setWorkspace(r.data);
   setCoverageMode(old=>old==='class'&&r.data.canViewClass?'class':admin||r.data.areas.some((a:any)=>a.canPlan)?'subjects':r.data.canViewClass?'class':'subjects');
   const eligible=r.data.areas.filter((a:any)=>admin||a.canPlan);
   const choices=eligible.length?eligible:r.data.areas;
   const saved=rememberedPlanningScope(user);
   setAreaId(old=>choices.some((a:any)=>a.learningAreaId===old)?old:choices.find((a:any)=>a.learningAreaId===saved.learningAreaId)?.learningAreaId||choices[0]?.learningAreaId||'');
   setSequence(r.data.sequence?.data.learningAreaIds || r.data.areas.map((a:any)=>a.learningAreaId));
   setSequential(r.data.sequence?.data.enabled || false);setSequenceRevision(r.data.sequence?.revision || 0);
  }catch(e:any){
   if(!current())return;
   setError(e.message||'Unable to load your learning areas. Please try again.');
   throw e;
  }finally{if(current())setLoading(false);}
 };
 useEffect(()=>{++workspaceRequest.current;setWorkspace(undefined);setScreen('areas');load().catch(()=>{});return()=>{++workspaceRequest.current;};},[year,term,classId,stream]);
 useEffect(()=>{if(workspace?.academicYearId===year&&workspace?.termId===term&&year&&term&&classId&&areaId)rememberPlanningScope(user,{academicYearId:year,termId:term,classRoomId:classId,streamId:stream,learningAreaId:areaId});},[year,term,classId,stream,areaId,workspace]);
 const area=workspace?.areas?.find((a:any)=>a.learningAreaId===areaId);
 const cls=classes.find(c=>c.id===classId);
 const visibleAreas=(admin||(mode==='monitoring'&&coverageMode==='class')?workspace?.areas:workspace?.areas?.filter((a:any)=>a.canPlan))||[];
 const ready=visibleAreas.filter((a:any)=>!a.setupRequired);
 const needsSetup=visibleAreas.length-ready.length;
 const choose=(a:any)=>{if(mode==='monitoring'&&coverageMode==='class'){setAreaId(a.learningAreaId);setScreen('coverage');return;}if((mode!=='monitoring'&&a.locked)||(!admin&&!a.canPlan))return;setAreaId(a.learningAreaId);setScreen('plan');};
 const status=(a:any)=>coverageMode==='class'&&a.coverage?.length?a.coverage[0].status:a.setupRequired?(a.canPlan?'Draft planning available':'Schedule pending'):a.locked?'Sequence locked':a.scheme?.planningState?.locked?'Locked & saved':a.scheme?.planningState?'Draft':'Not started';
 const allocated=(a:any)=>coverageMode==='class'?a.coverage?.reduce((n:number,row:any)=>n+row.allocatedLessons,0)||0:a.scheme?.planningState?.allocations?.reduce((n:number,x:any)=>n+x.lessons,0)??a.filled??0;
 return <div className="mx-auto max-w-7xl space-y-6 min-w-0 text-on-surface" data-presentation="web">
 <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-maroon-light p-6 text-white shadow-md sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-rose-100">Curriculum planning</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{mode==='scheme-builder'?'Term Scheme of Work':mode==='monitoring'?'Weekly Syllabus Monitoring Register':'Syllabus Coverage Planning'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-rose-50">{mode==='scheme-builder'?'Use saved syllabus coverage to plan sub-strands at the children’s pace, submit completed sessions for review, then create lesson plans from approved scheme lessons.':mode==='monitoring'?'Review reported and verified teaching, catch-up plans and leadership checks.':'Allocate the term syllabus and submit the coverage plan for leadership review.'}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold">{years.find(y=>y.id===year)?.name||'Academic year'} · {terms.find(t=>t.id===term)?.name||'Choose term'}</span>{mode==='scheme-builder'&&<button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-rose-50" onClick={()=>onNavigateTab?.('syllabus-coverage-plan')}>Open Syllabus Planning</button>}</div></div></header>
 {admin&&screen==='areas'&&<section aria-label="School calendar status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-surface-container-lowest p-4"><div><h2 className="font-bold text-primary">School Calendar Plan <span className="ml-2 text-xs font-medium text-on-surface-variant">{calendar===undefined?'Checking calendar…':calendar===null?'Unavailable':calendar.published?'Published':'Not published'}</span></h2><p className="mt-1 text-xs text-on-surface-variant">{years.find(y=>y.id===year)?.name||'Choose academic year'} · {terms.find(t=>t.id===term)?.name||'Choose term'} · Manage teaching days, holidays and events on the calendar page.</p></div><button className="ui-button ui-button-primary" disabled={!year||!term} onClick={()=>{rememberPlanningScope(user,{academicYearId:year,termId:term,classRoomId:classId,streamId:stream});onNavigateTab?.('school-calendar-plan');}}>Open School Calendar Plan</button></section>}

 {!admin&&optionsLoaded&&!classes.length&&<p role="alert" className="rounded-xl bg-amber-50 p-4">No class/stream assignment is active for this selected year and term. Ask the administrator to assign your class or subject with the correct effective dates; you cannot configure these duties yourself.</p>}
 {year&&!terms.length&&<p role="status" className="rounded-xl bg-amber-50 p-4">No term is available for this year yet. Ask the administrator to configure the academic terms and publish the School Calendar Plan.</p>}
 {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}{optionsLoaded&&classId&&<button className="ui-button ml-3" disabled={loading||busy} onClick={()=>call(load)}>Retry loading</button>}</div>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm">{message}</p>}
 {screen==='areas'&&<section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6" aria-label="Planning context"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-wider text-primary">Step 1</p><h2 className="mt-1 text-lg font-semibold text-on-surface">Choose your teaching context</h2><p className="mt-1 text-sm text-on-surface-variant">Select the term and class you are planning for. Only active assignments are available.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
 <label className="text-xs font-semibold text-on-surface-variant">Academic year<select aria-label="Planning academic year" className={input+' mt-2'} value={year} onChange={e=>{setTerm('');setYear(e.target.value);}}>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
 <label className="text-xs font-semibold text-on-surface-variant">Term<select aria-label="Term" className={input+' mt-2'} value={term} onChange={e=>setTerm(e.target.value)}>{terms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
 <label className="text-xs font-semibold text-on-surface-variant">Class<select aria-label="Planning class" className={input+' mt-2'} value={classId} onChange={e=>{setClassId(e.target.value);setStream(classes.find(c=>c.id===e.target.value)?.planningStreams?.[0]?.id||'');}}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="text-xs font-semibold text-on-surface-variant">Stream<select aria-label="Planning stream" className={input+' mt-2'} value={stream} onChange={e=>setStream(e.target.value)}>{cls?.planningStreams.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 </div></section>}
 {optionsLoaded&&!classes.length&&year&&term&&!loading&&<p className="rounded-xl border bg-surface-container-lowest p-5 text-sm text-on-surface-variant">No active planning assignment is available for this period. Ask an administrator to configure your assignments.</p>}


 {mode==='monitoring'&&screen==='areas'&&!admin&&<nav aria-label="Teaching responsibility" className="flex flex-wrap gap-2"><button className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold" aria-pressed={coverageMode==='subjects'} onClick={()=>setCoverageMode('subjects')}>My subjects ({workspace?.areas?.filter((a:any)=>a.canPlan).length||0})</button>{workspace?.canViewClass&&<button className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold" aria-pressed={coverageMode==='class'} onClick={()=>setCoverageMode('class')}>My class coverage</button>}</nav>}
 {screen==='areas'&&visibleAreas.length>0&&<label className="block rounded-xl border bg-white p-4 font-semibold">Learning area for the next action<select className="ui-field mt-2" value={areaId} onChange={e=>setAreaId(e.target.value)}>{visibleAreas.map((a:any)=><option key={a.learningAreaId} value={a.learningAreaId}>{a.name}</option>)}</select></label>}
 {mode==='coverage'&&screen==='areas'&&area&&<PlanningRoadmap scope={{academicYearId:year,termId:term,classRoomId:classId,streamId:stream||undefined,learningAreaId:areaId}} label={`${cls?.name||''} · ${cls?.planningStreams?.find((s:any)=>s.id===stream)?.name||'Whole class'} · ${area.name} · ${terms.find(t=>t.id===term)?.name||''} · ${years.find(y=>y.id===year)?.name||''}`} admin={admin} onNavigate={onNavigateTab} onOpenCoverage={()=>choose(area)} onRefresh={load}/>}
 {screen==='areas'&&<section className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm" aria-label="Assigned learning areas">
 <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/30 p-5"><div><h2 className="text-lg font-semibold text-on-surface">{coverageMode==='class'?'My class coverage':'My subjects'}</h2><p className="mt-1 text-sm text-on-surface-variant">{cls?.name||'Choose a class'} · {cls?.planningStreams?.find((s:any)=>s.id===stream)?.name||'Whole class'}</p></div><div className="flex gap-1 rounded-lg bg-surface-container-low p-1"><button aria-pressed={filter==='ready'} className={`rounded-md px-3 py-2 text-xs font-semibold ${filter==='ready'?'bg-white text-primary shadow-sm':'text-on-surface-variant'}`} onClick={()=>setFilter('ready')}>Scheduled ({ready.length})</button><button aria-pressed={filter==='all'} className={`rounded-md px-3 py-2 text-xs font-semibold ${filter==='all'?'bg-white text-primary shadow-sm':'text-on-surface-variant'}`} onClick={()=>setFilter('all')}>All subjects ({visibleAreas.length})</button></div></div>
 {loading?<p role="status" className="p-8 text-sm text-on-surface-variant">Loading your learning areas…</p>:<div className="divide-y divide-slate-100">{(filter==='ready'?ready:visibleAreas).map((a:any)=><article key={a.learningAreaId} className="grid grid-cols-1 gap-4 p-5 transition hover:bg-surface/70 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_130px_150px_140px] lg:items-center"><div><h3 className="text-base font-semibold text-on-surface">{a.name}</h3>{a.lockReason&&<p className="mt-1 max-w-xl text-xs leading-5 text-amber-700">{a.lockReason}</p>}{a.setupRequired&&<p className="mt-1 max-w-xl text-xs leading-5 text-on-surface-variant">{a.setupRequired}</p>}</div><div className="text-sm text-on-surface-variant"><strong className="text-on-surface">{a.required??'—'}</strong> planned lessons<br/><span className="text-xs">{allocated(a)} allocated</span></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${a.locked?'bg-amber-50 text-amber-800':a.scheme?.planningState?.locked?'bg-emerald-50 text-emerald-800':'bg-surface-container-low text-on-surface-variant'}`}>{status(a)}</span><button disabled={coverageMode!=='class' && ((mode!=='monitoring'&&a.locked) || (!admin && !a.canPlan))} onClick={()=>choose(a)} className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:bg-surface-container-low disabled:text-slate-400">{coverageMode==='class'?'View coverage':mode==='monitoring'?'View register':a.scheme?'Open plan':'Start planning'}</button><DeleteCurriculumPlanButton schemeId={a.schemeId} disabled={loading||busy} onDeleted={load}/></article>)}{!ready.length&&filter==='ready'&&workspace&&<div className="p-8 text-center"><h3 className="font-semibold text-on-surface">No learning areas ready yet</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-on-surface-variant">Choose a learning area under All subjects to plan your syllabus. Scheme weeks can be prepared before calendar and timetable setup.</p><button className="mt-4 text-sm font-semibold text-primary" onClick={()=>setFilter('all')}>View setup details</button></div>}</div>}
 {needsSetup>0&&filter==='ready'&&<div className="flex items-center justify-between gap-4 border-t border-outline-variant/30 bg-surface px-5 py-4 text-xs text-on-surface-variant"><span>{needsSetup} assigned learning areas need calendar or timetable setup.</span><button className="font-semibold text-primary" onClick={()=>setFilter('all')}>View details</button></div>}
 </section>}
 {screen==='plan'&&area&&(admin||area.canPlan)&&(mode==='monitoring'||!area.locked)&&<><button className="text-sm font-semibold text-primary" onClick={leavePlan}>← Change learning area</button>{mode==='monitoring'?<WeeklyMonitoringRegister schemeId={area.schemeId} scope={{academicYearId:year,termId:term,classRoomId:classId,streamId:stream||undefined,learningAreaId:areaId}} onNavigateTab={onNavigateTab}/>:<Planner onNavigateTab={onNavigateTab} presentation="web" onDirtyChange={setPlanDirty} onViewChange={setPlanStep} scope={{academicYearId:year,termId:term,classRoomId:classId,streamId:stream||undefined,learningAreaId:areaId}} area={area} yearName={years.find(y=>y.id===year)?.name||''} className={cls?.name||''} streamName={cls?.planningStreams?.find((s:any)=>s.id===stream)?.name||'Whole class'} termName={terms.find(t=>t.id===term)?.name||''} onRefresh={load}/>}</>}
 {screen==='coverage'&&area&&workspace?.canViewClass&&<><button className="text-sm font-semibold text-primary" onClick={leavePlan}>← Back to my class</button><ClassCoverageSummary area={area} className={cls?.name||''} streamName={cls?.planningStreams?.find((s:any)=>s.id===stream)?.name||'Whole class'}/>{area.canPlan&&!area.locked&&<button className="rounded-lg bg-primary px-4 py-2 text-white" onClick={()=>{setCoverageMode('subjects');setScreen('plan');}}>{mode==='monitoring'?'Open my subject register':'Open my subject plan'}</button>}</>}
 {mode==='coverage'&&admin&&screen==='areas'&&workspace&&<details className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-xs"><summary className="font-bold cursor-pointer">Learning-area sequence</summary><p className="my-2 text-sm">This is not a previous-term requirement. Leave it off for familiarisation unless the academic head requires this optional order.</p><label><input type="checkbox" checked={sequential} onChange={e=>setSequential(e.target.checked)}/> Optional: finish the preceding learning area before planning the next learning area (same term)</label>
 {sequence.map((id,i)=><div key={id} className="flex flex-wrap items-center gap-3 my-2"><span>{i+1}. {workspace.areas.find((a:any)=>a.learningAreaId===id)?.name||id}</span><button className="ui-button" disabled={!i} onClick={()=>setSequence(s=>{const n=[...s];[n[i-1],n[i]]=[n[i],n[i-1]];return n;})}>Move up</button><button className="ui-button" disabled={i===sequence.length-1} onClick={()=>setSequence(s=>{const n=[...s];[n[i+1],n[i]]=[n[i],n[i+1]];return n;})}>Move down</button></div>)}
 <button className="ui-button" disabled={busy} onClick={()=>call(async()=>{await apiService.planning(`sequence?${query()}`,{method:'PUT',body:JSON.stringify({revision:sequenceRevision,enabled:sequential,learningAreaIds:sequence})});await load();setMessage('Planning sequence saved.');})}>Save sequence</button></details>}
 {mode!=='monitoring'&&screen==='areas'&&<div className="border-t border-outline-variant/30 pt-4 flex flex-wrap items-center justify-between gap-2">
   <p className="text-xs text-on-surface-variant">After teaching is recorded and reviewed, check the weekly register in Coverage Tracking.</p>
   <button className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1" onClick={()=>onNavigateTab?.('curriculum-tracker')}>
     <span>Open Coverage Tracking</span>
     <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
   </button>
 </div>}

 </div>;
}
