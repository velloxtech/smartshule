import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SchoolCalendarEditor } from '../curriculum/SchoolCalendarEditor';
import {
  selectPlanningTerm,
  rememberPlanningScope,
  rememberedPlanningScope,
} from '../../utils/planningPeriod';

export function SchoolCalendarPlanView({
  onNavigateTab,
  onOpenSettings,
}: {
  onNavigateTab: (tab: string) => void;
  onOpenSettings: () => void;
}) {
  const { user } = useAuth();
  const [years, setYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');
  const [calendar, setCalendar] = useState<any>();
  const [revision, setRevision] = useState(0);
  const [diagnostic, setDiagnostic] = useState<any>();
  const [continuity, setContinuity] = useState<any>();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');

  const selectedPeriod = useRef('');
  selectedPeriod.current = year + ':' + term;
  const generation = useRef(0);
  const query = new URLSearchParams({ academicYearId: year, termId: term }).toString();

  useEffect(() => {
    Promise.all([apiService.getAcademicYears(), apiService.getClasses()])
      .then(([y, c]) => {
        setYears(y.data || []);
        const saved = rememberedPlanningScope(user);
        setYear(
          y.data?.some((r: any) => r.id === saved.academicYearId)
            ? saved.academicYearId
            : y.data?.find((r: any) => r.isCurrent)?.id || y.data?.[0]?.id || ''
        );
        setClasses(c.data || []);
        setClassId(
          c.data?.some((r: any) => r.id === saved.classRoomId)
            ? saved.classRoomId
            : c.data?.[0]?.id || ''
        );
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!year) return;
    let live = true;
    setTerm('');
    setCalendar(undefined);
    apiService
      .getTerms(year)
      .then((r) => {
        if (live) {
          setTerms(r.data || []);
          const saved = rememberedPlanningScope(user);
          setTerm(
            r.data?.some((t: any) => t.id === saved.termId)
              ? saved.termId
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

  const load = async () => {
    const key = year + ':' + term;
    if (!year || !term || selectedPeriod.current !== key) return;
    const request = ++generation.current;
    const [cal, d, c] = await Promise.all([
      apiService.planning(`calendar?${query}`),
      apiService.planning(`setup-context?${query}`),
      apiService.planning(`continuity?${query}`),
    ]);
    if (request !== generation.current || selectedPeriod.current !== key) return;
    setCalendar(
      cal.data?.data || {
        startDate: terms.find((t) => t.id === term)?.startDate,
        endDate: terms.find((t) => t.id === term)?.endDate,
        teachingDays: [1, 2, 3, 4, 5],
        exceptions: [],
        published: false,
      }
    );
    setRevision(cal.data?.revision || 0);
    setDiagnostic(d.data);
    setContinuity(c.data);
  };

  useEffect(() => {
    const key = year + ':' + term;
    setCalendar(undefined);
    setError('');
    load().catch((e) => {
      if (selectedPeriod.current === key) setError(e.message);
    });
  }, [year, term]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = (published: boolean) =>
    act(async () => {
      await apiService.planning(`calendar?${query}`, {
        method: 'PUT',
        body: JSON.stringify({
          revision,
          calendar: { ...calendar, guidedWorkflow: true, published },
        }),
      });
      setMessage(
        published
          ? 'School Calendar Plan published. Set up the timetable next.'
          : 'Calendar draft saved.'
      );
    });

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      {/* Maroon Hero Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-950 via-rose-900 to-red-950 p-6 text-white shadow-md sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-100 ring-1 ring-inset ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Step 1 · Academic Planning
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              School Calendar Plan
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-rose-100/90">
              Start here: choose the school period, publish teaching days and excluded dates, then proceed to set up the timetable.
            </p>
          </div>

          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-rose-100 ring-1 ring-inset ring-white/15 sm:flex">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
        </div>
      </header>

      {/* Feedback Banners */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 shadow-sm"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="font-medium">{error}</p>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900 shadow-sm"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <p className="font-medium">{message}</p>
        </div>
      )}

      {/* Top Full-Width Card: Planning Period & Scope */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
          <span className="h-2 w-2 rounded-full bg-rose-900" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Planning Period & Scope
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Academic Year
            </span>
            <select
              className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm font-medium text-stone-900 transition focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10 disabled:opacity-60"
              disabled={busy}
              value={year}
              onChange={(e) => {
                setTerm('');
                setCalendar(undefined);
                setYear(e.target.value);
              }}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isCurrent ? ' · Operational' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Term
            </span>
            <select
              className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm font-medium text-stone-900 transition focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10 disabled:opacity-60"
              disabled={busy}
              value={term}
              onChange={(e) => {
                setCalendar(undefined);
                setTerm(e.target.value);
              }}
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Class for Exclusions
            </span>
            <select
              className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm font-medium text-stone-900 transition focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Diagnostic Warning Banner */}
      {diagnostic?.disagreement && (
        <section
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 shadow-sm"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="flex-1 space-y-2 text-sm text-amber-950">
              <h2 className="font-bold">
                The operational year and current term disagree
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-900">
                <span>
                  <strong className="font-semibold">Operational year:</strong>{' '}
                  {diagnostic.currentYear?.name || 'Not selected'}
                </span>
                <span>
                  <strong className="font-semibold">Flagged current term:</strong>{' '}
                  {diagnostic.flaggedTerms
                    .map((t: any) => `${t.name} (${t.yearName})`)
                    .join(', ') || 'Not selected'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-amber-800">
                Your selected planning period above is separate. Future planning does not activate the future year.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="ui-button inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-4 py-2 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100/60"
                >
                  Correct Academic Year & Term Settings
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Missing Terms Notice */}
      {year && !terms.length && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-amber-950">
              No terms are configured for this academic year. The administrator must add the actual term dates before publishing a calendar.
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="ui-button shrink-0 rounded-xl bg-rose-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-950"
            >
              Open Academic Year & Term Settings
            </button>
          </div>
        </section>
      )}

      {/* Side-by-Side Row: Term Calendar Editor + Portal Start & Prior-Term Work */}
      {(calendar || continuity) && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Card: Term Calendar Editor */}
          {calendar && (
            <div
              className={`rounded-2xl border border-stone-200 bg-white p-1 shadow-sm ${
                continuity ? 'lg:col-span-7' : 'lg:col-span-12'
              }`}
            >
              <SchoolCalendarEditor
                calendar={calendar}
                setCalendar={setCalendar}
                user={user}
                terms={terms}
                term={term}
                setTerms={setTerms}
                load={load}
                classId={classId}
                busy={busy}
                saveCalendar={save}
                onTimetable={() => {
                  rememberPlanningScope(user, {
                    academicYearId: year,
                    termId: term,
                    classRoomId: classId,
                  });
                  onNavigateTab('timetable');
                }}
              />
            </div>
          )}

          {/* Right Card: Portal Start & Prior-Term Work */}
          {continuity && (
            <section
              className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${
                calendar ? 'lg:col-span-5' : 'lg:col-span-12'
              }`}
            >
              <div className="flex items-center gap-2 border-b border-stone-200 bg-rose-950/[0.03] px-6 py-4">
                <span className="h-2 w-2 rounded-full bg-rose-900" />
                <h2 className="text-base font-bold text-stone-900">
                  Portal Start & Prior-Term Work
                </h2>
              </div>

              <div className="space-y-4 p-6">
                <p className="text-sm leading-relaxed text-stone-700">
                  {continuity.message}
                </p>

                {!continuity.start &&
                  !continuity.approvedPreviousSchemes &&
                  !continuity.hasEarlierApprovedHistory && (
                    <div className="rounded-xl border border-rose-900/15 bg-rose-950/[0.02] p-4">
                      <p className="text-xs leading-relaxed text-stone-600">
                        Use this only for the school’s first term using the Grace Seeds School portal—even if it is Term 2 or Term 3. No previous schemes will be invented.
                      </p>

                      <label className="mt-3.5 block">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                          Reason for the school audit history
                        </span>
                        <textarea
                          rows={3}
                          placeholder="Enter audit note (minimum 5 characters)..."
                          className="ui-field mt-1.5 block w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-rose-900 focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>

                      <div className="mt-4">
                        <button
                          type="button"
                          disabled={busy || reason.trim().length < 5}
                          onClick={() =>
                            act(async () => {
                              await apiService.planning(`start?${query}`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  decision: 'FIRST_TERM',
                                  reason,
                                  revision: 0,
                                }),
                              });
                              setMessage(
                                'First term in the Grace Seeds School portal recorded. Teachers can build plans from published curriculum.'
                              );
                            })
                          }
                          className="ui-button ui-button-primary inline-flex w-full items-center justify-center rounded-xl bg-rose-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-950 focus:outline-none focus:ring-4 focus:ring-rose-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Start First Term in Grace Seeds School Portal
                        </button>
                      </div>
                    </div>
                  )}

                {continuity.start && (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 ring-1 ring-inset ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    Recorded by the administrator on{' '}
                    {new Date(continuity.start.decidedAt).toLocaleDateString()}. History is retained.
                  </div>
                )}

                <div className="border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('curriculum-tracker')}
                    className="ui-button inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-900/25 bg-rose-950/[0.04] px-4 py-2.5 text-xs font-semibold text-rose-950 transition hover:bg-rose-900 hover:text-white"
                  >
                    <span>Review class planning and missing prior records</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}