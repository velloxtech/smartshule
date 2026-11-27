import { DeleteCurriculumPlanButton } from '../curriculum/DeleteCurriculumPlanButton';
import { WeeklyMonitoringRegister } from '../curriculum/WeeklyMonitoringRegister';
import { PlanningRoadmap } from '../curriculum/PlanningRoadmap';
import {
  selectPlanningTerm,
  rememberPlanningScope,
  rememberedPlanningScope,
} from '../../utils/planningPeriod';
import { ClassCoverageSummary } from '../curriculum/ClassCoverageSummary';
import { SubStrandSchemePlanner } from '../curriculum/SubStrandSchemePlanner';
import { TermCoveragePlanner } from '../curriculum/TermCoveragePlanner';
import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function WebSyllabusCoveragePlanView({
  onNavigateTab,
  mode = 'coverage',
}: {
  onNavigateTab?: (tab: string) => void;
  mode?: 'coverage' | 'scheme-builder' | 'monitoring';
}) {
  const Planner = mode === 'scheme-builder' ? SubStrandSchemePlanner : TermCoveragePlanner;
  const { user } = useAuth();
  const admin = [
    'SUPER_ADMIN',
    'ADMIN',
    'SCHOOL_ADMIN',
    'HEAD_TEACHER',
    'DEPUTY_HEAD_TEACHER',
  ].includes(user?.role || '');

  const workspaceRequest = useRef(0);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const selectedContext = useRef('');
  const [years, setYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');
  const [classId, setClassId] = useState('');
  const [stream, setStream] = useState('');
  const [workspace, setWorkspace] = useState<any>();
  const [areaId, setAreaId] = useState('');
  const [sequence, setSequence] = useState<string[]>([]);
  const [sequential, setSequential] = useState(false);
  const [sequenceRevision, setSequenceRevision] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<'areas' | 'plan' | 'coverage'>('areas');
  const [planDirty, setPlanDirty] = useState(false);
  const [, setPlanStep] = useState<'allocation' | 'weekly'>('allocation');

  const leavePlan = () => {
    if (
      planDirty &&
      !window.confirm('Discard unsaved allocation edits? Your saved work will be retained.')
    )
      return;
    setPlanDirty(false);
    setScreen('areas');
  };

  const [coverageMode, setCoverageMode] = useState<'subjects' | 'class'>('subjects');
  const [filter, setFilter] = useState<'ready' | 'all'>('all');
  const [loading, setLoading] = useState(false);

  const query = (extra: any = {}) =>
    new URLSearchParams(
      Object.fromEntries(
        Object.entries({
          academicYearId: year,
          termId: term,
          classRoomId: classId,
          streamId: stream,
          ...extra,
        })
          .filter(([, v]) => v !== '' && v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();

  const call = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || 'The request could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    apiService
      .getAcademicYears()
      .then((r) => {
        setYears(r.data || []);
        const savedYear = rememberedPlanningScope(user).academicYearId;
        setYear(
          r.data?.some((y: any) => y.id === savedYear)
            ? savedYear
            : r.data?.find((y: any) => y.isCurrent)?.id || r.data?.[0]?.id || ''
        );
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!year) return;
    let live = true;
    setScreen('areas');
    setTerm('');
    apiService
      .getTerms(year)
      .then((r) => {
        if (live) {
          setTerms(r.data || []);
          const savedTerm = rememberedPlanningScope(user).termId;
          setTerm(
            r.data?.some((t: any) => t.id === savedTerm)
              ? savedTerm
              : selectPlanningTerm(r.data || [])
          );
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [year]);

  useEffect(() => {
    if (!year || !term) return;
    let cancelled = false;
    setOptionsLoaded(false);
    setClasses([]);
    setClassId('');
    setStream('');
    setWorkspace(undefined);
    setError('');

    apiService
      .planning(`options?${query({ classRoomId: '', streamId: '' })}`)
      .then((options) => {
        if (cancelled) return;
        setClasses(options.data || []);
        const saved = rememberedPlanningScope(user);
        const selected =
          options.data?.find((c: any) => c.id === saved.classRoomId) || options.data?.[0];
        setClassId(selected?.id || '');
        setStream(
          selected?.planningStreams?.some((r: any) => r.id === saved.streamId)
            ? saved.streamId
            : selected?.planningStreams?.[0]?.id || ''
        );
        setOptionsLoaded(true);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(
          (reason?.message || 'Unable to load teaching assignments.') +
            (!admin
              ? ' Ask the administrator to check your teacher account, academic period and assignments.'
              : '')
        );
      });

    return () => {
      cancelled = true;
    };
  }, [year, term]);

  const contextKey = [year, term, classId, stream].join(':');
  selectedContext.current = contextKey;

  const load = async () => {
    if (!year || !term || !classId || selectedContext.current !== contextKey) return;
    const generation = ++workspaceRequest.current;
    const current = () =>
      generation === workspaceRequest.current && selectedContext.current === contextKey;
    setLoading(true);
    setError('');
    try {
      const r = await apiService.planning(`workspace?${query()}`);
      if (!current()) return;
      setWorkspace(r.data);
      setCoverageMode((old) =>
        old === 'class' && r.data.canViewClass
          ? 'class'
          : admin || r.data.areas.some((a: any) => a.canPlan)
          ? 'subjects'
          : r.data.canViewClass
          ? 'class'
          : 'subjects'
      );
      const eligible = r.data.areas.filter((a: any) => admin || a.canPlan);
      const choices = eligible.length ? eligible : r.data.areas;
      const saved = rememberedPlanningScope(user);
      setAreaId((old) =>
        choices.some((a: any) => a.learningAreaId === old)
          ? old
          : choices.find((a: any) => a.learningAreaId === saved.learningAreaId)?.learningAreaId ||
            choices[0]?.learningAreaId ||
            ''
      );
      setSequence(
        r.data.sequence?.data.learningAreaIds ||
          r.data.areas.map((a: any) => a.learningAreaId)
      );
      setSequential(r.data.sequence?.data.enabled || false);
      setSequenceRevision(r.data.sequence?.revision || 0);
    } catch (e: any) {
      if (!current()) return;
      setError(e.message || 'Unable to load your learning areas. Please try again.');
      throw e;
    } finally {
      if (current()) setLoading(false);
    }
  };

  useEffect(() => {
    ++workspaceRequest.current;
    setWorkspace(undefined);
    setScreen('areas');
    load().catch(() => {});
    return () => {
      ++workspaceRequest.current;
    };
  }, [year, term, classId, stream]);

  useEffect(() => {
    if (
      workspace?.academicYearId === year &&
      workspace?.termId === term &&
      year &&
      term &&
      classId &&
      areaId
    ) {
      rememberPlanningScope(user, {
        academicYearId: year,
        termId: term,
        classRoomId: classId,
        streamId: stream,
        learningAreaId: areaId,
      });
    }
  }, [year, term, classId, stream, areaId, workspace]);

  const area = workspace?.areas?.find((a: any) => a.learningAreaId === areaId);
  const cls = classes.find((c) => c.id === classId);
  const visibleAreas =
    (admin || (mode === 'monitoring' && coverageMode === 'class')
      ? workspace?.areas
      : workspace?.areas?.filter((a: any) => a.canPlan)) || [];
  const ready = visibleAreas.filter((a: any) => !a.setupRequired);
  const needsSetup = visibleAreas.length - ready.length;
  const displayedAreas = filter === 'ready' ? ready : visibleAreas;

  const choose = (a: any) => {
    if (mode === 'monitoring' && coverageMode === 'class') {
      setAreaId(a.learningAreaId);
      setScreen('coverage');
      return;
    }
    if ((mode !== 'monitoring' && a.locked) || (!admin && !a.canPlan)) return;
    setAreaId(a.learningAreaId);
    setScreen('plan');
  };

  const status = (a: any) =>
    coverageMode === 'class' && a.coverage?.length
      ? a.coverage[0].status
      : a.setupRequired
      ? a.canPlan
        ? 'Draft planning available'
        : 'Schedule pending'
      : a.locked
      ? 'Sequence locked'
      : a.scheme?.planningState?.locked
      ? 'Locked & saved'
      : a.scheme?.planningState
      ? 'Draft'
      : 'Not started';

  const allocated = (a: any) =>
    coverageMode === 'class'
      ? a.coverage?.reduce((n: number, row: any) => n + row.allocatedLessons, 0) || 0
      : a.scheme?.planningState?.allocations?.reduce((n: number, x: any) => n + x.lessons, 0) ??
        a.filled ??
        0;

  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 min-w-0 text-stone-900"
      data-presentation="web"
    >
      {/* Maroon Hero Header */}
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-950 via-rose-900 to-red-950 p-6 text-white shadow-md sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-200">
              Curriculum Planning
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {mode === 'scheme-builder'
                ? 'Term Scheme of Work'
                : mode === 'monitoring'
                ? 'Weekly Syllabus Monitoring Register'
                : 'Syllabus Coverage Planning'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-100/90">
              {mode === 'scheme-builder'
                ? 'Use saved syllabus coverage to plan sub-strands at the children’s pace, submit completed sessions for review, then create lesson plans from approved scheme lessons.'
                : mode === 'monitoring'
                ? 'Review reported and verified teaching, catch-up plans and leadership checks.'
                : 'Allocate and save the term syllabus, then continue to Scheme of Work.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-rose-50">
              {years.find((y) => y.id === year)?.name || 'Academic year'} ·{' '}
              {terms.find((t) => t.id === term)?.name || 'Choose term'}
            </span>
            {mode === 'scheme-builder' && (
              <button
                className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-rose-950 shadow-xs transition hover:bg-rose-50 cursor-pointer"
                onClick={() => onNavigateTab?.('syllabus-coverage-plan')}
              >
                Open Syllabus Planning
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Alerts & Status Banners */}
      {!admin && optionsLoaded && !classes.length && (
        <p
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          No class/stream assignment is active for this selected year and term. Ask the
          administrator to assign your class or subject with the correct effective dates; you
          cannot configure these duties yourself.
        </p>
      )}

      {year && !terms.length && (
        <p
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          No term is available for this year yet. Ask the administrator to configure the academic
          terms and publish the School Calendar Plan.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          {optionsLoaded && classId && (
            <button
              className="ui-button shrink-0"
              disabled={loading || busy}
              onClick={() => call(load)}
            >
              Retry loading
            </button>
          )}
        </div>
      )}

      {message && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900"
        >
          {message}
        </p>
      )}

      {/* Step 1: Teaching Context Card */}
      {screen === 'areas' && (
        <section
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6"
          aria-label="Planning context"
        >
          <div className="mb-4 border-b border-stone-100 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-900">Step 1</p>
            <h2 className="mt-0.5 text-lg font-bold text-stone-900">
              Choose your teaching context
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Select the term and class you are planning for. Only active assignments are available.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Academic year
              <select
                aria-label="Planning academic year"
                className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-sm font-medium text-stone-900 focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                value={year}
                onChange={(e) => {
                  setTerm('');
                  setYear(e.target.value);
                }}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Term
              <select
                aria-label="Term"
                className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-sm font-medium text-stone-900 focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Class
              <select
                aria-label="Planning class"
                className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-sm font-medium text-stone-900 focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setStream(
                    classes.find((c) => c.id === e.target.value)?.planningStreams?.[0]?.id || ''
                  );
                }}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Stream
              <select
                aria-label="Planning stream"
                className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3 py-2 text-sm font-medium text-stone-900 focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                value={stream}
                onChange={(e) => setStream(e.target.value)}
              >
                {cls?.planningStreams.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {optionsLoaded && !classes.length && year && term && !loading && (
        <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
          No active planning assignment is available for this period. Ask an administrator to
          configure your assignments.
        </p>
      )}

      {/* Monitoring View Mode Toggle */}
      {mode === 'monitoring' && screen === 'areas' && !admin && (
        <nav aria-label="Teaching responsibility" className="flex flex-wrap gap-2">
          <button
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition cursor-pointer ${
              coverageMode === 'subjects'
                ? 'border-rose-900 bg-rose-900 text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
            aria-pressed={coverageMode === 'subjects'}
            onClick={() => setCoverageMode('subjects')}
          >
            My subjects ({workspace?.areas?.filter((a: any) => a.canPlan).length || 0})
          </button>
          {workspace?.canViewClass && (
            <button
              className={`rounded-xl border px-4 py-2 text-xs font-bold transition cursor-pointer ${
                coverageMode === 'class'
                  ? 'border-rose-900 bg-rose-900 text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
              aria-pressed={coverageMode === 'class'}
              onClick={() => setCoverageMode('class')}
            >
              My class coverage
            </button>
          )}
        </nav>
      )}

      {mode === 'coverage' && screen === 'areas' && area && (
        <PlanningRoadmap
          scope={{
            academicYearId: year,
            termId: term,
            classRoomId: classId,
            streamId: stream || undefined,
            learningAreaId: areaId,
          }}
          label={`${cls?.name || ''} · ${
            cls?.planningStreams?.find((s: any) => s.id === stream)?.name || 'Whole class'
          } · ${area.name} · ${terms.find((t) => t.id === term)?.name || ''} · ${
            years.find((y) => y.id === year)?.name || ''
          }`}
          admin={admin}
          onNavigate={onNavigateTab}
          onOpenCoverage={() => choose(area)}
          onRefresh={load}
        />
      )}

      {/* Assigned Learning Areas — Compact 2-Per-Row Cards */}
      {screen === 'areas' && (
        <section
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs"
          aria-label="Assigned learning areas"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-rose-950/[0.02] p-5">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {coverageMode === 'class' ? 'My class coverage' : 'My subjects'}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                {cls?.name || 'Choose a class'} ·{' '}
                {cls?.planningStreams?.find((s: any) => s.id === stream)?.name || 'Whole class'}
              </p>
            </div>

            <div className="flex gap-1 rounded-xl bg-stone-100 p-1">
              <button
                aria-pressed={filter === 'ready'}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  filter === 'ready'
                    ? 'bg-white text-rose-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                onClick={() => setFilter('ready')}
              >
                Scheduled ({ready.length})
              </button>
              <button
                aria-pressed={filter === 'all'}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-rose-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                onClick={() => setFilter('all')}
              >
                All subjects ({visibleAreas.length})
              </button>
            </div>
          </div>

          {loading ? (
            <p role="status" className="p-8 text-center text-sm text-stone-500">
              Loading your learning areas…
            </p>
          ) : (
            <div className="p-5">
              {displayedAreas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedAreas.map((a: any) => {
                    const isDisabled =
                      coverageMode !== 'class' &&
                      ((mode !== 'monitoring' && a.locked) || (!admin && !a.canPlan));

                    return (
                      <article
                        key={a.learningAreaId}
                        className="min-w-0 flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-xs hover:border-rose-900/35 transition-colors space-y-3"
                      >
                        <div className="space-y-2">
                          {/* Card Header: Subject Name & Status Badge */}
                          <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2">
                            <h3 className="text-sm font-bold text-stone-900 leading-snug">
                              {a.name}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                a.locked
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : a.scheme?.planningState?.locked
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {status(a)}
                            </span>
                          </div>

                          {/* Compact Lesson Allocation Strip */}
                          <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-xs">
                            <span className="text-stone-600">
                              <strong className="font-bold text-stone-900">
                                {a.required ?? '—'}
                              </strong>{' '}
                              planned lessons
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-rose-950 bg-rose-950/10 px-2 py-0.5 rounded">
                              {allocated(a)} allocated
                            </span>
                          </div>

                          {/* Optional Lock / Setup Notices */}
                          {a.lockReason && (
                            <p className="text-[11px] leading-relaxed text-amber-800 bg-amber-50/70 rounded-lg px-2.5 py-1.5">
                              {a.lockReason}
                            </p>
                          )}
                          {a.setupRequired && (
                            <p className="text-[11px] leading-relaxed text-stone-500">
                              {a.setupRequired}
                            </p>
                          )}
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                          <button
                            disabled={isDisabled}
                            onClick={() => choose(a)}
                            className="inline-flex items-center justify-center rounded-lg bg-rose-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-950 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {coverageMode === 'class'
                              ? 'View coverage'
                              : mode === 'monitoring'
                              ? 'View register'
                              : a.scheme
                              ? 'Open plan'
                              : 'Start planning'}
                          </button>

                          <DeleteCurriculumPlanButton
                            schemeId={a.schemeId}
                            disabled={loading || busy}
                            onDeleted={load}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                filter === 'ready' &&
                workspace && (
                  <div className="p-6 text-center">
                    <h3 className="font-bold text-sm text-stone-900">
                      No learning areas ready yet
                    </h3>
                    <p className="mx-auto mt-1.5 max-w-lg text-xs leading-5 text-stone-500">
                      Choose a learning area under All subjects to plan your syllabus. Scheme
                      weeks can be prepared before calendar and timetable setup.
                    </p>
                    <button
                      className="mt-3 text-xs font-bold text-rose-900 hover:underline cursor-pointer"
                      onClick={() => setFilter('all')}
                    >
                      View setup details
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {needsSetup > 0 && filter === 'ready' && (
            <div className="flex items-center justify-between gap-4 border-t border-stone-200 bg-stone-50/70 px-5 py-3.5 text-xs text-stone-600">
              <span>{needsSetup} assigned learning areas need calendar or timetable setup.</span>
              <button
                className="font-bold text-rose-900 hover:underline cursor-pointer"
                onClick={() => setFilter('all')}
              >
                View details
              </button>
            </div>
          )}
        </section>
      )}

      {/* Plan Screen */}
      {screen === 'plan' &&
        area &&
        (admin || area.canPlan) &&
        (mode === 'monitoring' || !area.locked) && (
          <>
            <button
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-900 hover:underline cursor-pointer"
              onClick={leavePlan}
            >
              ← Change learning area
            </button>
            {mode === 'monitoring' ? (
              <WeeklyMonitoringRegister
                schemeId={area.schemeId}
                scope={{
                  academicYearId: year,
                  termId: term,
                  classRoomId: classId,
                  streamId: stream || undefined,
                  learningAreaId: areaId,
                }}
                onNavigateTab={onNavigateTab}
              />
            ) : (
              <Planner
                onNavigateTab={onNavigateTab}
                presentation="web"
                onDirtyChange={setPlanDirty}
                onViewChange={setPlanStep}
                scope={{
                  academicYearId: year,
                  termId: term,
                  classRoomId: classId,
                  streamId: stream || undefined,
                  learningAreaId: areaId,
                }}
                area={area}
                yearName={years.find((y) => y.id === year)?.name || ''}
                className={cls?.name || ''}
                streamName={
                  cls?.planningStreams?.find((s: any) => s.id === stream)?.name || 'Whole class'
                }
                termName={terms.find((t) => t.id === term)?.name || ''}
                onRefresh={load}
              />
            )}
          </>
        )}

      {/* Class Coverage Summary Screen */}
      {screen === 'coverage' && area && workspace?.canViewClass && (
        <>
          <button
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-900 hover:underline cursor-pointer"
            onClick={leavePlan}
          >
            ← Back to my class
          </button>
          <ClassCoverageSummary
            area={area}
            className={cls?.name || ''}
            streamName={
              cls?.planningStreams?.find((s: any) => s.id === stream)?.name || 'Whole class'
            }
          />
          {area.canPlan && !area.locked && (
            <button
              className="rounded-xl bg-rose-900 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-950 cursor-pointer"
              onClick={() => {
                setCoverageMode('subjects');
                setScreen('plan');
              }}
            >
              {mode === 'monitoring' ? 'Open my subject register' : 'Open my subject plan'}
            </button>
          )}
        </>
      )}

      {/* Admin Sequence Drawer */}
      {mode === 'coverage' && admin && screen === 'areas' && workspace && (
        <details className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <summary className="text-sm font-bold text-stone-900 cursor-pointer">
            Learning-area sequence
          </summary>
          <p className="my-2 text-xs text-stone-600">
            This is not a previous-term requirement. Leave it off for familiarisation unless the
            academic head requires this optional order.
          </p>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-800">
            <input
              type="checkbox"
              checked={sequential}
              onChange={(e) => setSequential(e.target.checked)}
              className="accent-rose-900"
            />
            Optional: finish the preceding learning area before planning the next learning area
            (same term)
          </label>
          <div className="mt-3 space-y-2">
            {sequence.map((id, i) => (
              <div
                key={id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs"
              >
                <span className="font-medium text-stone-800">
                  {i + 1}. {workspace.areas.find((a: any) => a.learningAreaId === id)?.name || id}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    className="ui-button"
                    disabled={!i}
                    onClick={() =>
                      setSequence((s) => {
                        const n = [...s];
                        [n[i - 1], n[i]] = [n[i], n[i - 1]];
                        return n;
                      })
                    }
                  >
                    Move up
                  </button>
                  <button
                    className="ui-button"
                    disabled={i === sequence.length - 1}
                    onClick={() =>
                      setSequence((s) => {
                        const n = [...s];
                        [n[i + 1], n[i]] = [n[i], n[i + 1]];
                        return n;
                      })
                    }
                  >
                    Move down
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 rounded-xl bg-rose-900 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-950 disabled:opacity-50 cursor-pointer"
            disabled={busy}
            onClick={() =>
              call(async () => {
                await apiService.planning(`sequence?${query()}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    revision: sequenceRevision,
                    enabled: sequential,
                    learningAreaIds: sequence,
                  }),
                });
                await load();
                setMessage('Planning sequence saved.');
              })
            }
          >
            Save sequence
          </button>
        </details>
      )}

      {/* Bottom Coverage Tracking Link */}
      {mode !== 'monitoring' && screen === 'areas' && (
        <div className="border-t border-stone-200 pt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-500">
            After teaching is recorded and reviewed, check the weekly register in Coverage Tracking.
          </p>
          <button
            className="text-xs font-bold text-rose-900 hover:underline cursor-pointer flex items-center gap-1"
            onClick={() => onNavigateTab?.('curriculum-tracker')}
          >
            <span>Open Coverage Tracking</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}