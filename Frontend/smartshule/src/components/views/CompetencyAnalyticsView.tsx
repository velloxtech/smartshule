import React from 'react';

export const CompetencyAnalyticsView: React.FC = () => {
  const subjectAnalytics = [
    { name: 'Mathematics Activities', ee: 36, me: 50, ae: 11, be: 3 },
    { name: 'English Language', ee: 40, me: 48, ae: 10, be: 2 },
    { name: 'Kiswahili Lugha', ee: 32, me: 54, ae: 12, be: 2 },
    { name: 'Science & Technology', ee: 38, me: 49, ae: 10, be: 3 },
    { name: 'Agriculture & Nutrition', ee: 35, me: 53, ae: 9, be: 3 },
    { name: 'Creative Arts & Sports', ee: 44, me: 46, ae: 8, be: 2 },
    { name: 'Social Studies', ee: 29, me: 58, ae: 10, be: 3 },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
          <span>Home</span>
          <span>/</span>
          <span>CBC Competencies</span>
          <span>/</span>
          <span className="text-primary font-semibold">Competency Analytics</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
          CBC Performance Analytics & Strand Mastery
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Macro-level learning outcome distribution across 14,280 continuous assessment indicators
        </p>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
          <span className="text-xs text-on-surface-variant uppercase font-semibold">Overall Mastery Rate</span>
          <div className="text-3xl font-bold text-primary font-data-mono mt-1">86.0%</div>
          <span className="text-xs text-secondary font-semibold mt-1 block">EE + ME (Above KICD Target)</span>
        </div>
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
          <span className="text-xs text-on-surface-variant uppercase font-semibold">Exceeding Expectations</span>
          <div className="text-3xl font-bold text-secondary font-data-mono mt-1">34.0%</div>
          <span className="text-xs text-on-surface-variant mt-1 block">4,855 Assessed Outcomes</span>
        </div>
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
          <span className="text-xs text-on-surface-variant uppercase font-semibold">Meeting Expectations</span>
          <div className="text-3xl font-bold text-primary font-data-mono mt-1">52.0%</div>
          <span className="text-xs text-on-surface-variant mt-1 block">7,425 Assessed Outcomes</span>
        </div>
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30">
          <span className="text-xs text-on-surface-variant uppercase font-semibold">Support Needed (AE + BE)</span>
          <div className="text-3xl font-bold text-amber-700 font-data-mono mt-1">14.0%</div>
          <span className="text-xs text-error font-semibold mt-1 block">Targeted Remediation Ongoing</span>
        </div>
      </div>

      {/* Subject-by-Subject Competency Distribution */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-xs border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-on-surface">Learning Area Mastery Distribution</h3>
            <p className="text-xs text-on-surface-variant">Breakdown of EE, ME, AE, and BE rubric scores</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-secondary"></span> EE</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary"></span> ME</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-700"></span> AE</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-error"></span> BE</span>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {subjectAnalytics.map((s) => (
            <div key={s.name} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface font-semibold">{s.name}</span>
                <span className="text-secondary font-bold font-data-mono">
                  {(s.ee + s.me)}% Proficient (EE {s.ee}% · ME {s.me}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden flex">
                <div style={{ width: `${s.ee}%` }} className="bg-secondary h-full" title={`EE: ${s.ee}%`}></div>
                <div style={{ width: `${s.me}%` }} className="bg-primary h-full" title={`ME: ${s.me}%`}></div>
                <div style={{ width: `${s.ae}%` }} className="bg-amber-700 h-full" title={`AE: ${s.ae}%`}></div>
                <div style={{ width: `${s.be}%` }} className="bg-error h-full" title={`BE: ${s.be}%`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
