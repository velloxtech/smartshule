import React from 'react';

export const SchemesView: React.FC = () => {
  const schemes = [
    {
      week: 'Week 8 (Current)',
      subject: 'Mathematics - Grade 4',
      strand: 'Measurement (Mass)',
      objective: 'By the end of the lesson, the learner should be able to measure mass in kilograms using a beam balance.',
      teacher: 'Tr. David Omondi',
      status: 'In Progress',
    },
    {
      week: 'Week 8 (Current)',
      subject: 'Science & Technology - Grade 5',
      strand: 'Matter (Changes in States)',
      objective: 'Demonstrate melting, evaporation and condensation through experiential group experiments.',
      teacher: 'Tr. Grace Muthoni',
      status: 'In Progress',
    },
    {
      week: 'Week 7 (Completed)',
      subject: 'English - Grade 6',
      strand: 'Reading Comprehension',
      objective: 'Analyse passage clues to infer the author’s tone and character motivations.',
      teacher: 'Tr. Sarah Mwangi',
      status: 'Approved & Signed',
    },
    {
      week: 'Week 9 (Upcoming)',
      subject: 'Agriculture - Grade 6',
      strand: 'Soil Conservation',
      objective: 'Construct miniature trash lines and grass strips along school farm contours to prevent runoff.',
      teacher: 'Tr. Grace Muthoni',
      status: 'Pending HOD Approval',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
          <span>Home</span>
          <span>/</span>
          <span>Operations</span>
          <span>/</span>
          <span className="text-primary font-semibold">Schemes & Lesson Plans</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
          Teacher Schemes of Work & Lesson Plans
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Weekly syllabus coverage, approved learning objectives, resources, and HOD digital endorsement
        </p>
      </div>

      <div className="space-y-3">
        {schemes.map((s, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-secondary font-data-mono bg-secondary-container px-2 py-0.5 rounded">
                  {s.week}
                </span>
                <span className="font-bold text-sm text-primary">{s.subject}</span>
              </div>
              <div className="text-xs text-on-surface font-semibold">Strand: {s.strand}</div>
              <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-2 rounded">
                "{s.objective}"
              </p>
              <div className="text-[11px] text-outline">Educator: {s.teacher}</div>
            </div>

            <div className="shrink-0 flex md:flex-col items-end justify-between gap-2">
              <span
                className={`px-2.5 py-1 rounded text-xs font-bold ${
                  s.status === 'Approved & Signed'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : s.status === 'In Progress'
                    ? 'bg-primary-fixed text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {s.status}
              </span>
              <button className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-semibold text-primary hover:bg-surface-container-highest transition-colors cursor-pointer">
                View Full Plan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
