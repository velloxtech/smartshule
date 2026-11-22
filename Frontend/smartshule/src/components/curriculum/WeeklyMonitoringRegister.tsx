import React,{useEffect,useState} from 'react';
import {apiService} from '../../services/api';

const headings=['Week','Planned lessons','Taught / verified','Content covered / not covered','Reason for variance / catch-up plan','Teacher','HOD verification'];
export function WeeklyMonitoringRegister({schemeId,scope,onNavigateTab}:{schemeId?:string;scope:any;onNavigateTab?:(tab:string)=>void}){
  const [data,setData]=useState<any>(),[error,setError]=useState(''),[loading,setLoading]=useState(false),[refresh,setRefresh]=useState(0);
  const query=new URLSearchParams(Object.fromEntries(Object.entries(scope).filter(([,value])=>value!==undefined&&value!=='').map(([key,value])=>[key,String(value)]))).toString();
  useEffect(()=>{let live=true;setData(undefined);setError('');if(!schemeId)return;setLoading(true);
    apiService.schemePlanning(`${encodeURIComponent(schemeId)}/weekly?${query}`).then(response=>{if(live)setData(response.data);}).catch(reason=>{if(live)setError(reason.message||'Could not load the monitoring register.');}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[schemeId,query,refresh]);
  const download=async(format:'pdf'|'doc')=>{if(!schemeId)return;setError('');try{await apiService.downloadWeeklyMonitoring(schemeId,format,scope);}catch(reason:any){setError(reason.message||'Could not download the register.');}};
  const rows:any[]=data?.monitoringRegister||[];
  const planned=rows.reduce((sum,row)=>sum+row.plannedLessons,0),taught=rows.reduce((sum,row)=>sum+row.taughtLessons,0),reported=rows.reduce((sum,row)=>sum+row.reportedLessons,0);
  return <section aria-label="Weekly syllabus monitoring register" className="space-y-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-primary">Weekly Syllabus Monitoring Register</h2><p className="mt-1 text-sm text-on-surface-variant">Update teaching records weekly. Leadership verifies them against the scheme, lesson plans, learner work and assessment evidence.</p></div><button type="button" className="ui-button" disabled={loading} onClick={()=>setRefresh(value=>value+1)}>Refresh</button></div>
    {!schemeId&&<div className="rounded-xl bg-surface p-4 text-sm"><p>No syllabus coverage plan is saved for this learning area and period.</p><button type="button" className="mt-2 font-semibold text-primary" onClick={()=>onNavigateTab?.('syllabus-coverage-plan')}>Open Syllabus Planning</button></div>}
    {error&&<p role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">{error}</p>}
    {loading&&<p role="status">Loading verified teaching records…</p>}
    {data&&<>
      <p className="text-sm font-semibold">{[data.className,data.streamName,data.learningAreaName,data.academicYearName,data.termName].filter(Boolean).join(' · ')}</p>
      <p className="rounded-xl bg-surface p-3 text-sm">{planned} scheduled lessons · {reported} reported · {taught} verified complete. {planned?Math.round(taught/planned*100):0}% of scheduled lessons verified. Remediation and repeat practice do not imply new outcomes covered.</p>
      {data.scheduleChanged&&<p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">The timetable changed. Review moved lessons before preparing or reporting further work.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className="ui-button" onClick={()=>void download('pdf')}>Download register PDF</button><button type="button" className="ui-button" onClick={()=>void download('doc')}>Download register Word</button><button type="button" className="ui-button" onClick={()=>onNavigateTab?.('records-of-work')}>Open Records of Work</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1000px] border-collapse text-left text-sm"><thead><tr>{headings.map(heading=><th key={heading} scope="col" className="border border-primary bg-primary p-2 text-white">{heading}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.weekNumber}>
        <th scope="row" className="border border-outline-variant/40 p-2 align-top">{row.weekNumber}<span className="mt-1 block text-xs font-normal">{row.startDate}–{row.endDate}</span></th>
        <td className="border border-outline-variant/40 p-2 align-top">{row.plannedLessons}</td><td className="border border-outline-variant/40 p-2 align-top">{row.taughtLessons}<span className="mt-1 block text-xs text-on-surface-variant">{row.reportedLessons} reported</span></td>
        <td className="whitespace-pre-wrap border border-outline-variant/40 p-2 align-top">{row.noInstruction?'No scheduled instruction':`Covered: ${row.contentCovered||'Not yet verified'}\nNot yet verified: ${row.contentNotCovered||'None'}`}</td>
        <td className="whitespace-pre-wrap border border-outline-variant/40 p-2 align-top">{row.varianceReason||'—'}</td><td className="whitespace-pre-wrap border border-outline-variant/40 p-2 align-top">{row.teacher||'—'}</td><td className="whitespace-pre-wrap border border-outline-variant/40 p-2 align-top">{row.hodVerification||(row.noInstruction?'Not applicable':'Awaiting verification')}</td>
      </tr>)}</tbody></table></div>
      <p className="text-xs text-on-surface-variant">This register uses the selected school calendar and timetable. Closed weeks remain visible with zero scheduled lessons. A prepared lesson or a submitted record does not count as verified teaching.</p>
    </>}
  </section>;
}
