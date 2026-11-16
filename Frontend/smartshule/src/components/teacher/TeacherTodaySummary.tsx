import React,{useEffect,useState} from 'react';
import {apiService} from '../../services/api';
import type {TeacherAuthorizedClass} from '../../services/api';
import type {TimetableSlot} from '../../types';
import {teacherTodaySchedule} from '../../utils/teacherTodaySchedule';

interface Props {
  slots:TimetableSlot[];
  classes:TeacherAuthorizedClass[];
  context:any;
  loading:boolean;
  error?:string;
  unavailable?:boolean;
  onNavigate:(tab:string)=>void;
}

export function TeacherTodaySummary({slots,classes,context,loading,error,unavailable,onNavigate}:Props){
  const schedule=teacherTodaySchedule(slots,new Date(),context?.currentTerm);
  const next=schedule.upcoming[0]||schedule.today[schedule.today.length-1];
  const [progress,setProgress]=useState<any>(null);
  const query=next?.classRoomId&&next.learningAreaId&&context?.currentYear?.id&&context?.currentTerm?.id?new URLSearchParams({academicYearId:context.currentYear.id,termId:context.currentTerm.id,classRoomId:next.classRoomId,learningAreaId:next.learningAreaId,...(next.streamId?{streamId:next.streamId}:{})}).toString():'';
  useEffect(()=>{
    let live=true;setProgress(null);
    if(query&&!loading)apiService.planning(`readiness?${query}`).then(r=>{if(live)setProgress(r.data);}).catch(()=>{});
    return()=>{live=false;};
  },[query,loading]);
  const action=progress?.nextAction?.owner==='Teacher'&&progress.nextAction.tab?progress.nextAction:{label:'View my timetable',tab:'timetable'};
  return <section aria-label="My teaching today" className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">My teaching today</h2><p className="text-xs text-on-surface-variant">{new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',weekday:'long',day:'numeric',month:'short'}).format(new Date())}{context?.currentTerm?.name?` · ${context.currentTerm.name}`:''}</p></div>
      <button disabled={loading} className="ui-button ui-button-primary" onClick={()=>onNavigate(action.tab)}>{action.label}</button>
    </div>
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {loading?<p role="status" className="mt-3 text-sm text-on-surface-variant">Loading today's teaching schedule…</p>:<>
      {schedule.upcoming.length>0?<ul className="mt-3 grid gap-2 sm:grid-cols-3">{schedule.upcoming.slice(0,3).map((slot,index)=>{
        const cls=classes.find(c=>c.id===slot.classRoomId),stream=cls?.streams.find(s=>s.id===slot.streamId);
        return <li key={`${slot.timetableId||''}:${slot.id||index}`} className="min-w-0 rounded-lg bg-surface-container-low px-3 py-2 text-sm"><p className="font-semibold">{slot.startTime}–{slot.endTime} · {slot.learningAreaName||'Assigned lesson'}</p><p className="text-xs text-on-surface-variant">{cls?.name||'Assigned class'}{stream?` · ${stream.name}`:''}</p></li>;
      })}</ul>:<p className="mt-3 text-sm text-on-surface-variant">{unavailable?'Your timetable could not be loaded. Open My Timetable or refresh the page to try again.':!context?.currentTerm?'Ask the administrator to confirm the active school term.':!schedule.inTerm?'No teaching scheduled in the active term today.':schedule.today.length?'Today’s timetable lessons have finished.':'No lessons scheduled for today.'}</p>}
      {schedule.upcoming.length>3&&<p className="mt-2 text-xs text-on-surface-variant">{schedule.upcoming.length-3} more lessons on your timetable today.</p>}
      {progress?.nextAction?.owner&&progress.nextAction.owner!=='Teacher'&&<p className="mt-3 text-xs text-on-surface-variant">{progress.nextAction.label}</p>}
    </>}
  </section>;
}
