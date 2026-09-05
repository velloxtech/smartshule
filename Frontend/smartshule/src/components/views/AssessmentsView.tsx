import React, { useState } from 'react';
import { AssessmentRecord, CBCRubric } from '../../types';

interface AssessmentsViewProps {
  assessments: AssessmentRecord[];
  onOpenNewAssessment: () => void;
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  assessments,
  onOpenNewAssessment,
}) => {
  const [selectedRating, setSelectedRating] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  const filtered = assessments.filter((a) => {
    const matchesRating = selectedRating === 'All' || a.rating === selectedRating;
    const matchesSubject = selectedSubject === 'All' || a.learningArea === selectedSubject;
    return matchesRating && matchesSubject;
  });

  const getRatingBadge = (rating: CBCRubric) => {
    switch (rating) {
      case 'EE':
        return <span className="px-2.5 py-1 rounded bg-secondary text-white text-xs font-bold">EE · Exceeding Expectations</span>;
      case 'ME':
        return <span className="px-2.5 py-1 rounded bg-primary text-white text-xs font-bold">ME · Meeting Expectations</span>;
      case 'AE':
        return <span className="px-2.5 py-1 rounded bg-amber-700 text-white text-xs font-bold">AE · Approaching Expectations</span>;
      case 'BE':
        return <span className="px-2.5 py-1 rounded bg-error text-white text-xs font-bold">BE · Below Expectations</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>CBC Competencies</span>
            <span>/</span>
            <span className="text-primary font-semibold">Assessments (Form/Summ)</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            CBC Continuous Assessment Register
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Formative observations, competency rubrics, learning evidence, and KNEC readiness
          </p>
        </div>

        <button
          onClick={onOpenNewAssessment}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-container text-sm font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">rule</span>
          <span>Record Formative Rubric</span>
        </button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant uppercase font-semibold">Exceeding (EE)</span>
            <div className="text-2xl font-bold text-secondary font-data-mono mt-1">34.0%</div>
          </div>
          <span className="w-8 h-8 rounded-full bg-secondary-container text-secondary flex items-center justify-center font-bold">
            EE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant uppercase font-semibold">Meeting (ME)</span>
            <div className="text-2xl font-bold text-primary font-data-mono mt-1">52.0%</div>
          </div>
          <span className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold">
            ME
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant uppercase font-semibold">Approaching (AE)</span>
            <div className="text-2xl font-bold text-amber-700 font-data-mono mt-1">11.0%</div>
          </div>
          <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            AE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant uppercase font-semibold">Below (BE)</span>
            <div className="text-2xl font-bold text-error font-data-mono mt-1">3.0%</div>
          </div>
          <span className="w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center font-bold">
            BE
          </span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">Filter By Rubric:</span>
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface"
          >
            <option value="All">All Rubric Levels</option>
            <option value="EE">EE - Exceeding</option>
            <option value="ME">ME - Meeting</option>
            <option value="AE">AE - Approaching</option>
            <option value="BE">BE - Below</option>
          </select>
        </div>

        <div className="text-xs font-medium text-on-surface-variant">
          Showing {filtered.length} recorded formative logs
        </div>
      </div>

      {/* Assessment Records List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-base text-on-surface">{item.studentName}</span>
                <span className="font-data-mono text-xs text-outline font-medium">
                  (Adm #{item.admNo} · {item.grade})
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-semibold text-primary">
                  {item.learningArea}
                </span>
              </div>

              <div className="text-xs text-on-surface">
                <span className="text-on-surface-variant font-medium">Strand:</span>{' '}
                <strong className="text-primary">{item.strand}</strong> · Sub-strand: {item.subStrand}
              </div>

              <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-2.5 rounded-lg border-l-2 border-primary/50">
                "{item.evidence}"
              </p>

              <div className="flex items-center gap-4 text-[11px] text-outline pt-1">
                <span>Evaluator: <strong>{item.recordedBy}</strong></span>
                <span>Date: <strong>{item.date}</strong></span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col md:items-end gap-2">
              {getRatingBadge(item.rating)}
              <span className="text-[11px] text-secondary font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">cloud_done</span> KNEC Synced
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
