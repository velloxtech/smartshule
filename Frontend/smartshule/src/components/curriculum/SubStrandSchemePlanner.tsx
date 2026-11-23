import {SyllabusTeachingProgress} from './SyllabusTeachingProgress';
import {DeleteCurriculumPlanButton} from './DeleteCurriculumPlanButton';
import { SchemeApprovalActions } from './SchemeApprovalActions';
import { canReviewCurriculum, canPrepareCurriculum } from '../../utils/curriculumPermissions';
import React, { useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const fields = {
  specificLearningOutcomes: 'Specific learning outcomes',
  keyInquiryQuestions: 'Key inquiry questions',
  learningExperiences: 'Learning experiences',
  learningResources: 'Learning resources',
  assessmentMethods: 'Assessment methods',
} as const;
type Content = Record<keyof typeof fields, string>;
const completeEntry = (entry: any) => Boolean(entry && !entry.archivedAt && entry.strandTitle?.trim() && entry.subStrandTitle?.trim() && ['specificLearningOutcomes', 'learningExperiences', 'assessmentMethods'].every(key => entry[key]?.some((value: string) => value.trim())));
const contentFrom = (entry: any): Content => Object.fromEntries(Object.keys(fields).map(key => [key, (entry?.[key] || []).join('\n')])) as Content;

interface Props {
  scope: Record<string, string | undefined>;
  area: any;
  className: string;
  streamName: string;
  termName: string;
  yearName: string;
  onRefresh: () => Promise<void>;
  onNavigateTab?: (tab: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  presentation?: 'web' | 'app';
  embedded?: boolean;
  showReviewActions?: boolean;
  onViewChange?: (view: 'allocation' | 'weekly') => void;
}

export function SubStrandSchemePlanner({ scope, area, className, streamName, termName, yearName, onRefresh, onNavigateTab, onDirtyChange, onViewChange, embedded = false, showReviewActions = true }: Props) {
  const { user } = useAuth();
  const [weekly, setWeekly] = useState<any>();
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [subStrandId, setSubStrandId] = useState('');
  const [continuing, setContinuing] = useState(false);
  const [nextSlot, setNextSlot] = useState('');
  const [pacingReason, setPacingReason] = useState('');
  const [entryId, setEntryId] = useState('');
  const [content, setContent] = useState<Content>(() => contentFrom(null));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewSubStrand, setReviewSubStrand] = useState('');
  const requestId = useRef(0);
  const query = new URLSearchParams(Object.entries(scope).filter(([, value]) => value !== undefined && value !== '') as [string, string][]).toString();
  const scheme = weekly?.scheme || area.scheme;
  const canDraft = Boolean(scheme?.planningState?.allocations?.some((allocation: any) => allocation.lessons > 0));
  const approvedCoverage = scheme?.planningState?.coverageReviewStatus === 'APPROVED';
  const started = Boolean(scheme?.planningState?.weeklyPlanningStarted || scheme?.entries?.some((entry: any) => !entry.archivedAt));
  const canPrepare = canPrepareCurriculum(user?.role);
  const editable = canPrepare && canDraft && (['DRAFT', 'REJECTED'].includes(scheme?.status) || (scheme?.status === 'APPROVED' && Array.isArray(scheme?.planningState?.approvedEntryIds)));
  const canReview = canReviewCurriculum(user?.role);
  const allLessons: any[] = weekly?.weeks?.flatMap((row: any) => row.lessons) || [];
  const groups: any[] = (scheme?.planningState?.allocations || []).filter((allocation: any) => allocation.lessons > 0).map((allocation: any) => {
    const sessions = allLessons.filter(lesson => lesson.entry?.subStrandId === allocation.subStrandId);
    const curriculum = catalogue.flatMap(strand => strand.subStrands).find(sub => sub.id === allocation.subStrandId);
    return { id: allocation.subStrandId, title: sessions[0]?.entry.subStrandTitle || curriculum?.title || 'Saved sub-strand', estimate: allocation.lessons, sessions };
  });
  const currentGroup = groups.find(group => group.id === subStrandId) || groups[0];
  const lessons = currentGroup?.sessions || [];
  const selected = weekly?.weeks?.flatMap((row: any) => row.lessons).find((lesson: any) => lesson.entry?.id === entryId);
  const approvedIds: string[] = scheme?.planningState?.approvedEntryIds || [];
  const ready = (scheme?.entries || []).filter((entry: any) => !approvedIds.includes(entry.id) && completeEntry(entry) && (reviewSubStrand === 'ALL' || entry.subStrandId === (reviewSubStrand || currentGroup?.id)));
  const selectedApproved = Boolean(selected && (scheme?.planningState?.approvedEntryIds ? approvedIds.includes(entryId) : scheme?.status === 'APPROVED'));
  const entryEditable = editable && !selectedApproved;
  const continuationSlots = allLessons.filter(lesson => lesson.entry?.subStrandId !== currentGroup?.id && !approvedIds.includes(lesson.entry?.id) && !lesson.lessonPlan && !lesson.recordOfWorkStatus);
  const context = { academicYearId: scope.academicYearId!, termId: scope.termId! };

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onViewChange?.(started ? 'weekly' : 'allocation'); }, [started, onViewChange]);
  useEffect(() => {
    const current = ++requestId.current;
    setWeekly(undefined); setCatalogue([]); setSubStrandId(''); setContinuing(false); setEntryId(''); setDirty(false); setError(''); setNotice('');
    if (area.schemeId && !area.setupRequired) {
      setBusy(true);
      Promise.all([apiService.schemePlanning(`${area.schemeId}/weekly?${query}`), apiService.planning(`catalogue?${query}`)]).then(([result, curriculum]) => {
        if (requestId.current === current) { setWeekly(result.data); setCatalogue(curriculum.data || []); }
      }).catch(err => { if (requestId.current === current) setError(err.message); })
        .finally(() => { if (requestId.current === current) setBusy(false); });
    }
    return () => { requestId.current++; };
  }, [query, area.schemeId]);

  const refresh = async () => {
    const result = await apiService.schemePlanning(`${scheme.id}/weekly?${query}`);
    setWeekly(result.data);
    await onRefresh();
    return result.data;
  };
  const request = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (err: any) { setError(err.message || 'The scheme could not be saved.'); }
    finally { setBusy(false); }
  };
  const leaveEditor = () => !dirty || window.confirm('Discard unsaved scheme lesson changes? Saved scheme lessons will be retained.');
  const chooseSubStrand = (id: string) => { if (leaveEditor()) { setSubStrandId(id); setReviewSubStrand(id); setEntryId(''); setContinuing(false); setDirty(false); } };
  const chooseLesson = (lesson: any) => { if (leaveEditor()) { setEntryId(lesson.entry.id); setContent(contentFrom(lesson.entry)); setDirty(false); } };
  const saveLesson = () => request(async () => {
    const payload = Object.fromEntries(Object.keys(fields).map(key => [key, content[key as keyof Content].split('\n').map(line => line.trim()).filter(Boolean)]));
    await apiService.schemePlanning(`${scheme.id}/weekly/entries/${entryId}?${query}`, { method: 'PUT', body: JSON.stringify({ revision: scheme.planningState.revision, ...payload }) });
    setDirty(false); await refresh(); setNotice('Teaching session saved.');
  });

  return <section aria-label="Sub-strand scheme of work creation" className="space-y-5 min-w-0">
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Scheme of Work · Sub-strand planning</p>
      <h2 className="mt-1 text-xl font-bold text-on-surface">{weekly?.learningAreaName || area.name}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{weekly?.className || className} · {weekly?.streamName || streamName} · {termName} · {yearName}</p>
      <p className="mt-3 text-sm text-on-surface-variant">Plan from the saved syllabus by sub-strand, following the children’s learning pace. A sub-strand can continue across any number of teaching sessions or weeks. Submit only the completed lessons for approval; the rest of the term can remain a draft.</p>
    </div>
    <SyllabusTeachingProgress schemeId={scheme?.id||area.schemeId} scope={scope} initialData={weekly} onChanged={refresh} onNavigateTab={onNavigateTab}/>
    <DeleteCurriculumPlanButton schemeId={scheme?.id || area.schemeId} disabled={busy} onDeleted={async () => { setDirty(false); await onRefresh(); }} />
    {error && <p role="alert" className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    {showReviewActions && canReview && scheme && <SchemeApprovalActions scheme={scheme} onReviewed={async () => { await refresh(); }} />}
    {!canDraft ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p>Save at least one syllabus coverage allocation first. Scheme drafts use that saved plan.</p>
      <button className="ui-button mt-3" onClick={() => onNavigateTab?.('syllabus-coverage-plan')}>Open Syllabus Coverage</button>
    </div> : <>
      {!approvedCoverage && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p>You can complete and save scheme lessons now. The source coverage must be approved before scheme lessons can be submitted.</p>{canPrepare && ['DRAFT', 'REJECTED', undefined].includes(scheme.planningState.coverageReviewStatus) && <button className="ui-button mt-3" disabled={busy || dirty} onClick={() => request(async () => { await apiService.submitCoverageDraft(scheme.id, scheme.planningState.revision); await refresh(); setNotice('Source coverage submitted for approval. Your teaching-session drafts are retained.'); })}>Submit source coverage for approval</button>}</div>}
      <details className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
        <summary className="cursor-pointer text-sm font-semibold">Source: saved syllabus coverage · {scheme.planningState.allocations.filter((item: any) => item.lessons > 0).length} allocations</summary>
        <p className="mt-2 text-sm text-on-surface-variant">The curriculum, order and lesson allocations come from the saved coverage plan. Change them through syllabus coverage review.</p>
        <ul className="mt-3 space-y-2">{scheme.planningState.allocations.filter((item: any) => item.lessons > 0).map((item: any) => <li key={item.subStrandId} className="rounded-lg border border-outline-variant/30 bg-surface p-3 text-sm">{[item.subStrandId, ...(item.combinedSubStrandIds || [])].map(id => catalogue.flatMap(strand => strand.subStrands).find(sub => sub.id === id)?.title || 'Saved curriculum item').join(' + ')} · {item.lessons} lessons</li>)}</ul>
      </details>
      {area.setupRequired && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{area.setupRequired}</p>}
      {!started && canPrepare && <button className="ui-button ui-button-primary" disabled={busy || Boolean(area.setupRequired)} onClick={() => request(async () => {
        await apiService.schemePlanning(`${scheme.id}/weekly/prepare?${query}`, { method: 'POST', body: JSON.stringify({ revision: scheme.planningState.revision }) });
        await refresh(); setNotice('Sub-strand scheme draft created from your saved coverage. Lesson counts are pacing estimates, not completion limits.');
      })}>{embedded ? 'Add scheme lesson details' : 'Plan saved sub-strands'}</button>}
      {started && <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">Scheme status: {scheme.status}</p>
          <div className="flex flex-wrap gap-2">{(['pdf', 'doc'] as const).map(format => <button key={format} className="ui-button" disabled={busy || dirty} onClick={() => request(async () => { await apiService.downloadWeeklyScheme(scheme.id, format, context); })}>{format === 'pdf' ? 'Download PDF' : 'Download Word'}</button>)}</div>
          {editable && <button className="ui-button ui-button-primary" disabled={busy || dirty || !ready.length || !approvedCoverage} title={dirty ? 'Save the current teaching session first' : undefined} onClick={() => request(async () => {
            await apiService.schemePlanning(`${scheme.id}/weekly/submit?${query}`, { method: 'POST', body: JSON.stringify({ revision: scheme.planningState.revision, entryIds: ready.map((entry: any) => entry.id) }) });
            await refresh(); setNotice('Completed scheme lessons submitted for approval. The remaining lessons are retained as drafts.');
          })}>Submit completed lessons for review ({ready.length})</button>}

        </div>
        {editable && <label className="block text-sm font-semibold">Submission scope<select aria-label="Submission scope" className="ui-field mt-1 sm:max-w-sm" value={reviewSubStrand || currentGroup?.id || ''} onChange={event => setReviewSubStrand(event.target.value)}><option value="ALL">All completed, unapproved lessons</option>{Array.from(new Set<string>((scheme.entries || []).filter((entry: any) => !entry.archivedAt).map((entry: any) => entry.subStrandId))).map(id => <option key={id} value={id}>{scheme.entries.find((entry: any) => entry.subStrandId === id)?.subStrandTitle}</option>)}</select></label>}
        {scheme.status === 'SUBMITTED' && scheme.planningState?.submittedEntryIds && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Only {scheme.planningState.submittedEntryIds.length} selected lesson(s) are awaiting review. Other lessons remain drafts.</p>}
        {scheme.reviewRemarks && <p className="rounded-xl bg-surface-container-low p-3 text-sm">Reviewer comments: {scheme.reviewRemarks}</p>}
        <section className="space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4" aria-label="Sub-strand pacing">
          <label className="block text-sm font-semibold">Sub-strand<select aria-label="Scheme sub-strand" className="ui-field mt-1" value={currentGroup?.id || ''} disabled={busy} onChange={event => chooseSubStrand(event.target.value)}>{groups.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
          <p className="text-sm text-on-surface-variant">Keep teaching this sub-strand for as long as the children need. Sessions can span several weeks; changing weeks does not finish or lock a sub-strand.</p>
          <p className="text-sm"><strong>{currentGroup?.title}</strong> · {lessons.length} teaching sessions · {currentGroup?.estimate || 0} initially estimated · {lessons.filter((lesson: any) => lesson.statuses?.taught).length} taught</p>
          {editable && <button className="ui-button" disabled={busy || dirty} onClick={() => { setContinuing(!continuing); setNextSlot(continuationSlots[0]?.id || ''); setPacingReason(''); }}>Continue this sub-strand</button>}
          {continuing && <div className="space-y-3 border-t border-outline-variant/30 pt-3">
            {continuationSlots.length ? <><label className="block text-sm font-semibold">Next teaching session<select aria-label="Continuation teaching session" className="ui-field mt-1" value={nextSlot} onChange={event => setNextSlot(event.target.value)}>{continuationSlots.map(lesson => <option key={lesson.id} value={lesson.id}>Week {lesson.weekNumber}, Lesson {lesson.lessonNumber}{lesson.entry ? ` · Defer draft: ${lesson.entry.subStrandTitle}` : ' · Available period'}</option>)}</select></label><p className="text-xs text-on-surface-variant">Scheme lessons are planning positions, not timetable dates or completion deadlines. If this period has another draft topic, its original plan is retained in history for follow-up. Approved lessons and teaching records cannot be replaced.</p><label className="block text-sm font-semibold">Why is more time needed?<textarea aria-label="Reason for continuing sub-strand" className="ui-field mt-1" value={pacingReason} onChange={event => setPacingReason(event.target.value)} /></label><button className="ui-button ui-button-primary" disabled={busy || !nextSlot || pacingReason.trim().length < 3} onClick={() => request(async () => {
              await apiService.schemePlanning(`${scheme.id}/sessions/continue?${query}`, { method: 'POST', body: JSON.stringify({ revision: scheme.planningState.revision, subStrandId: currentGroup.id, slotId: nextSlot, reason: pacingReason }) });
              await refresh(); setContinuing(false); setNotice('Another session added for this sub-strand. Existing approved lessons and deferred draft history are retained. Submit the new session when ready.');
            })}>Add teaching session</button></> : <p className="text-sm text-amber-950">All positions are in use. Add another planning week below to continue this sub-strand; existing lessons and teaching records will be retained.</p>}
            <label className="block text-sm font-semibold">Continue into another planning week<textarea className="ui-field mt-1" aria-label="Reason for adding a planning week" value={pacingReason} onChange={event=>setPacingReason(event.target.value)} placeholder="Why do the children need more practice?"/></label><button type="button" className="ui-button ui-button-primary" disabled={busy||pacingReason.trim().length<3} onClick={()=>request(async()=>{await apiService.schemePlanning(`${scheme.id}/sessions/continue?${query}`,{method:'POST',body:JSON.stringify({revision:scheme.planningState.revision,subStrandId:currentGroup.id,reason:pacingReason})});await refresh();setContinuing(false);setNotice('Another planning week added. Continue at the children’s pace; approved history is retained.');})}>Add a week &amp; continue this sub-strand</button>
          </div>}
          {(scheme.entries || []).some((entry: any) => entry.archivedAt && entry.subStrandId === currentGroup?.id) && <details className="text-sm"><summary className="cursor-pointer font-semibold">Deferred session history</summary>{scheme.entries.filter((entry: any) => entry.archivedAt && entry.subStrandId === currentGroup?.id).map((entry: any) => <p className="mt-2" key={entry.id}>{entry.scheduledDate} · {entry.archivedReason}</p>)}</details>}
        </section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{lessons.map((lesson: any, sessionIndex: number) => <button key={lesson.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 text-left shadow-xs hover:border-primary disabled:opacity-60" disabled={busy || !lesson.entry} onClick={() => chooseLesson(lesson)}>
          <strong className="text-primary">Teaching session {sessionIndex + 1} · {lesson.date}</strong><p className="mt-1 text-xs text-on-surface-variant">Period {lesson.periodNumber} · {lesson.startTime}–{lesson.endTime}</p>
          <p className="mt-2 text-xs font-semibold">{approvedIds.includes(lesson.entry?.id) ? 'Approved lesson' : scheme.planningState?.submittedEntryIds?.includes(lesson.entry?.id) && scheme.status === 'SUBMITTED' ? 'Submitted for review' : 'Draft lesson'}</p><p className="mt-3 font-semibold">{lesson.entry?.strandTitle || 'No saved coverage allocated'}</p><p className="text-sm text-on-surface-variant">{lesson.entry?.subStrandTitle || 'Update the coverage plan through its review process.'}</p>
        </button>)}</div>
        {selected && <div className="space-y-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5">
          <div><h3 className="font-bold">{selected.entry.subStrandTitle} · Teaching session {lessons.findIndex((lesson: any) => lesson.entry?.id === entryId) + 1}</h3><p className="mt-1 text-sm">{selected.entry.strandTitle} / {selected.entry.subStrandTitle}</p></div>
          {Object.entries(fields).map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}<textarea aria-label={`Scheme ${label.toLowerCase()}`} className="ui-field mt-1 min-h-24 font-normal" disabled={!entryEditable || busy} value={content[key as keyof Content]} onChange={event => { setContent(old => ({ ...old, [key]: event.target.value })); setDirty(true); }} /></label>)}
          {entryEditable && <button className="ui-button ui-button-primary" disabled={busy || !dirty} onClick={saveLesson}>Save teaching session</button>}
          {selectedApproved && canPrepare && !selected.lessonPlan && <button className="ui-button ui-button-primary" onClick={() => onNavigateTab?.('lesson-plans')}>Continue in Lesson Plans →</button>}
          {selected.lessonPlan && <button className="ui-button" onClick={() => onNavigateTab?.('lesson-plans')}>Open lesson plans</button>}
        </div>}
      </>}
    </>}

  </section>;
}
