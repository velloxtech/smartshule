import React from 'react';

type Step = 'class' | 'subject' | 'coverage';

interface SelectionProps {
  step: Step;
  setStep: (s: Step) => void;
  years?: any[];
  terms?: any[];
  year?: string;
  setYear?: (id: string) => void;
  term?: string;
  setTerm?: (id: string) => void;
  classes: any[];
  classId: string;
  setClassId: (id: string) => void;
  stream?: string;
  setStream: (id: string) => void;
  visibleAreas: any[];
  areaId: string;
  setAreaId: (id: string) => void;
  loading: boolean;
  error: string;
}

export const SyllabusCoverageSelection: React.FC<SelectionProps> = ({
  step,
  setStep,
  classes,
  classId,
  setClassId,
  setStream,
  visibleAreas,
  areaId,
  setAreaId,
  loading,
  error,
}) => {
  if (step === 'coverage') return null;

  const selectedClass = classes.find((c) => c.id === classId);
  const isClassStep = step === 'class';

  return (
    <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
            {isClassStep ? 'Step 1 of 2' : 'Step 2 of 2'}
          </span>
          <h2 className="mt-0.5 text-xl font-bold text-stone-900">
            {isClassStep ? 'Select Class' : 'Select Subject'}
          </h2>
        </div>

        {!isClassStep && (
          <div className="flex items-center gap-3">
            {selectedClass && (
              <span className="rounded-full bg-rose-950/10 px-3 py-1 text-xs font-semibold text-rose-950">
                {selectedClass.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => setStep('class')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 transition hover:border-rose-900/30 hover:bg-rose-950/5 hover:text-rose-950"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              All Classes
            </button>
          </div>
        )}
      </div>

      {/* Feedback States */}
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-stone-500">
          Loading {isClassStep ? 'classes' : 'subjects'}…
        </p>
      ) : isClassStep ? (
        classes.length === 0 ? (
          <p className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">
            No classes available.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => {
              const active = c.id === classId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClassId(c.id);
                    setStream(c.planningStreams?.[0]?.id || '');
                    setStep('subject');
                  }}
                  className={`group flex items-center justify-between rounded-xl border p-5 text-left transition ${
                    active
                      ? 'border-rose-900 bg-rose-950/[0.04] ring-1 ring-rose-900/20'
                      : 'border-stone-200 bg-white hover:border-rose-900/40 hover:bg-stone-50/70'
                  }`}
                >
                  <div>
                    <strong className="block text-base font-bold text-stone-900 group-hover:text-rose-950">
                      {c.name}
                    </strong>
                    <p className="mt-1 text-xs text-stone-500">
                      {c.gradeLevel ? `${c.gradeLevel} · ` : ''}
                      {c.planningStreams?.length ?? 0} subject(s)
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        )
      ) : visibleAreas.length === 0 ? (
        <p className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">
          No subjects assigned to this class.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAreas.map((a) => {
            const active = a.learningAreaId === areaId;
            return (
              <button
                key={a.learningAreaId}
                type="button"
                onClick={() => {
                  setAreaId(a.learningAreaId);
                  setStep('coverage');
                }}
                className={`group flex items-center justify-between rounded-xl border p-5 text-left transition ${
                  active
                    ? 'border-rose-900 bg-rose-950/[0.04] ring-1 ring-rose-900/20'
                    : 'border-stone-200 bg-white hover:border-rose-900/40 hover:bg-stone-50/70'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-base font-bold text-stone-900 group-hover:text-rose-950">
                      {a.name}
                    </strong>
                    {a.code && (
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-stone-600">
                        {a.code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {a.teacher?.name || 'Unassigned'}
                  </p>
                </div>
                <svg
                  className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};