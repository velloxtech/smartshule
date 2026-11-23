import React from 'react';

interface SelectionProps {
  step: 'class' | 'subject' | 'coverage';
  setStep: (s: 'class' | 'subject' | 'coverage') => void;
  years: any[];
  terms: any[];
  year: string;
  setYear: (id: string) => void;
  term: string;
  setTerm: (id: string) => void;
  classes: any[];
  classId: string;
  setClassId: (id: string) => void;
  stream: string;
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
  years,
  terms,
  year,
  setYear,
  term,
  setTerm,
  classes,
  classId,
  setClassId,
  stream,
  setStream,
  visibleAreas,
  areaId,
  setAreaId,
  loading,
  error,
}) => {
  // Step 1 – class cards
  if (step === 'class') {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Select Class</h2>
        {loading && <p>Loading classes…</p>}
        {error && <p className="text-error">{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <button
              key={c.id}
              className={`rounded-xl border p-5 text-left shadow-sm transition hover:shadow-md ${c.id === classId ? 'border-primary bg-rose-50' : 'border-outline-variant bg-white'}`}
              onClick={() => {
                setClassId(c.id);
                setStream(c.planningStreams?.[0]?.id || '');
                setStep('subject');
              }}
            >
              <strong className="block text-base text-on-surface">{c.name}</strong>
              <p className="mt-1 text-sm text-on-surface-variant">
                {c.gradeLevel || ''} – {c.planningStreams?.length ?? 0} subject(s)
              </p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // Step 2 – subject cards
  if (step === 'subject') {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <button className="ui-button" onClick={() => setStep('class')}>Back to Classes</button>
          <span className="font-medium">Selected Class: {classes.find((c) => c.id === classId)?.name}</span>
        </div>
        <h2 className="text-xl font-semibold">Select Subject</h2>
        {loading && <p>Loading subjects…</p>}
        {error && <p className="text-error">{error}</p>}
        {visibleAreas.length === 0 && <p>No subjects assigned to this class.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAreas.map((a) => (
            <button
              key={a.learningAreaId}
              className={`rounded-xl border p-5 text-left shadow-sm transition hover:shadow-md ${a.learningAreaId === areaId ? 'border-primary bg-rose-50' : 'border-outline-variant bg-white'}`}
              onClick={() => {
                setAreaId(a.learningAreaId);
                setStep('coverage');
              }}
            >
              <strong className="block text-base text-on-surface">{a.name}</strong>
              <p className="mt-1 text-sm text-on-surface-variant">
                {a.code || ''} – {a.teacher?.name || 'Unassigned'}
              </p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // Step 3 – covered by original UI
  return null;
};
