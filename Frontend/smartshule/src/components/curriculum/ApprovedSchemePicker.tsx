import React, { useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/api';
import { SchemeOfWork, ClassRoom, BackendLearningArea, LessonPlanSourceEntry } from '../../types';
import { isApprovedSchemeEntry } from '../../utils/curriculumPermissions';

interface Props {
  onSelect: (source: LessonPlanSourceEntry) => void;
  onOpenSchemes?: () => void;
}

const periodLabel = (scheme: SchemeOfWork) => {
  const year = scheme.academicYearId.match(/\d{4}/)?.[0];
  const term = scheme.termId.match(/(?:term|t)[-_ ]?(?:\d{4}[-_]?)?([1-3])$/i)?.[1];
  return [term ? `Term ${term}` : 'Academic term', year].filter(Boolean).join(' · ');
};

export function ApprovedSchemePicker({ onSelect, onOpenSchemes }: Props) {
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [areas, setAreas] = useState<BackendLearningArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [schedule, setSchedule] = useState<any>();
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [search, setSearch] = useState('');
  const [subStrand, setSubStrand] = useState('');
  const [reload, setReload] = useState(0);
  const [entryId,setEntryId]=useState(''),[periodId,setPeriodId]=useState('');
  const generation = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    Promise.all([
      apiService.getSchemes(),
      apiService.getClasses().catch(() => null),
      apiService.getLearningAreas().catch(() => null),
    ]).then(([plans, classOptions, areaOptions]) => {
      if (cancelled) return;
      if (!plans.success || !Array.isArray(plans.data)) throw new Error('Approved schemes could not be loaded.');
      setSchemes(plans.data.filter(scheme => scheme.entries?.some(entry => isApprovedSchemeEntry(scheme, entry))));
      setClasses(classOptions?.data || []); setAreas(areaOptions?.data || []);
    }).catch(err => { if (!cancelled) setError(err.message || 'Approved schemes could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; generation.current++; };
  }, [reload]);

  const chooseScheme = async (scheme: SchemeOfWork) => {
    const request = ++generation.current;
    setSelectedId(scheme.id); setEntryId(''); setPeriodId(''); setSchedule(undefined); setSubStrand(''); setSessionError(''); setLoadingSessions(true);
    const query = new URLSearchParams({ academicYearId: scheme.academicYearId, termId: scheme.termId }).toString();
    try {
      // Read the current timetable and approval scope again; never trust stale list dates.
      const result = await apiService.schemePlanning(`${scheme.id}/weekly?${query}`);
      if (!result.success || !result.data?.scheme || !Array.isArray(result.data.weeks)) throw new Error('Approved teaching sessions could not be loaded.');
      if (generation.current === request) setSchedule(result.data);
    } catch (err: any) { if (generation.current === request) setSessionError(err.message || 'Approved teaching sessions could not be loaded.'); }
    finally { if (generation.current === request) setLoadingSessions(false); }
  };

  const current = schemes.find(scheme => scheme.id === selectedId);
  const sessions: any[] = schedule?.weeks?.flatMap((week: any) => week.lessons || []).filter((session: any) =>
    session.entry && isApprovedSchemeEntry(schedule.scheme, session.entry)) || [];
  const visible = schemes.filter(scheme => [scheme.title, classes.find(row => row.id === scheme.classRoomId)?.name, areas.find(row => row.id === scheme.learningAreaId)?.name, periodLabel(scheme), ...scheme.entries.filter(entry => isApprovedSchemeEntry(scheme, entry)).map(entry => entry.subStrandTitle)].join(' ').toLowerCase().includes(search.trim().toLowerCase()));

  const chosenSession=sessions.find(session=>session.entry.id===entryId);
  const actualPeriods:any[]=schedule?.timetableSlots||[];
  const chosenPeriod=actualPeriods.find(period=>period.id===periodId);
  const selectSession = () => {
    const session=chosenSession,period=chosenPeriod;
    if(!session)return;
    const scheme = schedule.scheme as SchemeOfWork;
    if (session.lessonPlan || !isApprovedSchemeEntry(scheme, session.entry)) return;
    onSelect({
      ...session.entry,
      schemeOfWorkEntryId: session.entry.id,
      classRoomId: scheme.classRoomId,
      streamId: scheme.streamId,
      learningAreaId: scheme.learningAreaId,
      academicYearId: scheme.academicYearId,
      termId: scheme.termId,
      lessonDate: period?.date||schedule.termStartDate||'',
      lessonTime: period?`${period.startTime}-${period.endTime}`:'',
      weekNumber: period?.weekNumber||session.weekNumber,
      lessonNumber: period?.lessonNumber||session.lessonNumber,
      className: schedule.className,
      streamName: schedule.streamName,
      learningAreaName: schedule.learningAreaName,
      schemeTitle: scheme.title,
    });
  };

  return <section aria-label="Approved scheme picker" className="space-y-5">
    <div><h3 className="text-lg font-bold text-on-surface">Choose an approved scheme</h3><p className="mt-1 text-sm text-on-surface-variant">Select a scheme, then an approved teaching session to fill in the lesson-plan form here. Sessions stay grouped by sub-strand across dates.</p></div>
    {loading ? <p role="status" className="text-sm">Loading approved schemes…</p> : error ? <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-on-error-container">{error}<button type="button" className="ui-button mt-3" onClick={() => setReload(value => value + 1)}>Retry approved schemes</button></div> : !schemes.length ? <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 text-sm"><p>No approved scheme sessions are available yet. Submit completed scheme sessions for school leadership approval first.</p>{onOpenSchemes && <button type="button" className="ui-button mt-3" onClick={onOpenSchemes}>Open Schemes of Work</button>}</div> : <>
      <label className="block text-xs font-semibold text-on-surface-variant">Find a scheme<input aria-label="Search approved schemes" className="ui-field mt-1" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search scheme, class, learning area or sub-strand" /></label>
      <div className="grid gap-3 sm:grid-cols-2">{visible.map(scheme => <button type="button" key={scheme.id} aria-pressed={selectedId === scheme.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 text-left shadow-xs hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary-fixed" onClick={() => chooseScheme(scheme)}>
        <strong className="block text-sm text-primary">{scheme.title}</strong>
        <p className="mt-1 text-sm text-on-surface">{classes.find(row => row.id === scheme.classRoomId)?.name || 'Assigned class'} · {areas.find(row => row.id === scheme.learningAreaId)?.name || 'Scheme learning area'}</p>
        <p className="mt-2 text-xs text-on-surface-variant">{periodLabel(scheme)} · {scheme.entries.filter(entry => isApprovedSchemeEntry(scheme, entry)).length} approved scheme entries</p>
      </button>)}</div>
      {!visible.length && <p className="text-sm text-on-surface-variant">No approved schemes match your search.</p>}
      {current && <section aria-label="Approved teaching sessions" className="space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
        <h4 className="font-bold">{schedule?.learningAreaName || current.title} · Approved teaching sessions</h4><p className="text-xs text-on-surface-variant">Choose approved scheme content. Fetch a suggested timetable period or enter your own date, time and duration in the lesson form. Sessions with an existing lesson plan are marked below.</p>
        {loadingSessions ? <p role="status" className="text-sm">Loading current teaching sessions…</p> : sessionError ? <div role="alert" className="text-sm text-on-error-container">{sessionError}<button type="button" className="ui-button mt-2" onClick={() => chooseScheme(current)}>Retry teaching sessions</button></div> : !sessions.length ? <p className="text-sm text-on-surface-variant">No approved scheme lessons are available. Open the scheme to review its approval status.</p> : <>
          <p className="text-xs text-on-surface-variant">{schedule?.className} {schedule?.streamName ? `· ${schedule.streamName}` : ''}</p>
          <label className="block text-xs font-semibold text-on-surface-variant">Sub-strand<select aria-label="Approved session sub-strand" className="ui-field mt-1" value={subStrand} onChange={event => setSubStrand(event.target.value)}><option value="">All approved sub-strands</option>{Array.from(new Set<string>(sessions.map(session => session.entry.subStrandId || session.entry.subStrandTitle))).map(id => <option key={id} value={id}>{sessions.find(session => (session.entry.subStrandId || session.entry.subStrandTitle) === id)?.entry.subStrandTitle}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2">{sessions.filter(session => !subStrand || (session.entry.subStrandId || session.entry.subStrandTitle) === subStrand).map(session => <button type="button" key={session.entry.id} disabled={Boolean(session.lessonPlan)} className="rounded-xl border border-outline-variant/30 bg-surface p-4 text-left hover:border-primary disabled:cursor-not-allowed disabled:opacity-60" onClick={() => {setEntryId(session.entry.id);setPeriodId('');}}>
            <strong className="text-sm text-primary">{session.entry.subStrandTitle}</strong><p className="mt-1 text-xs text-on-surface-variant">{session.entry.strandTitle}</p><p className="mt-2 text-sm">Scheme Week {session.weekNumber} · Lesson {session.lessonNumber}</p><span className="mt-3 block text-xs font-semibold">{session.lessonPlan ? 'Lesson plan already exists' : session.entry.id===entryId ? 'Selected scheme content' : 'Select scheme content'}</span>
          </button>)}</div>
          {chosenSession&&<div className="space-y-3 rounded-xl border border-primary/30 bg-surface p-4">
            <p className="text-sm font-semibold">Daily lesson: {chosenSession.entry.subStrandTitle}</p>
            {actualPeriods.length?<label className="block text-sm">Suggested timetable date and period (optional)<select className="ui-field mt-1 w-full" value={periodId} onChange={event=>setPeriodId(event.target.value)}><option value="">I will enter the lesson details myself</option>{actualPeriods.map(period=><option key={period.id} value={period.id}>{period.date} · {period.startTime}–{period.endTime}</option>)}</select></label>:<p className="text-sm text-on-surface-variant">No matching timetable suggestions were found. Enter the date, time and duration in the lesson form.</p>}
            <button type="button" className="ui-button ui-button-primary" onClick={selectSession}>{chosenPeriod?'Use content & suggested period':'Use content & enter teaching details'}</button>
          </div>}
        </>}
      </section>}
    </>}
  </section>;
}
