import React, { useState, useMemo } from 'react';
import { AssessmentRecord, CBCRubric, Student, BackendLearningArea } from '../../types';
import { apiService } from '../../services/api';

interface FormativeAssessmentsViewProps {
  assessments: AssessmentRecord[];
  students?: Student[];
  learningAreas?: BackendLearningArea[];
  onOpenNewAssessment: () => void;
  onDeleteAssessment?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const FormativeAssessmentsView: React.FC<FormativeAssessmentsViewProps> = ({
  assessments,
  students = [],
  learningAreas = [],
  onOpenNewAssessment,
  onDeleteAssessment,
  onNavigateTab,
}) => {
  const [selectedRating, setSelectedRating] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAssessment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this formative assessment (CAT) record?')) {
      setDeletingId(id);
      try {
        const res = await apiService.deleteFormative(id);
        if (res.success) {
          onDeleteAssessment?.(id);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete formative assessment');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      const matchesRating = selectedRating === 'All' || a.rating === selectedRating;
      const matchesSubject = selectedSubject === 'All' || a.learningArea === selectedSubject;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.studentName.toLowerCase().includes(q) ||
        a.admNo.toLowerCase().includes(q) ||
        (a.strand && a.strand.toLowerCase().includes(q)) ||
        (a.subStrand && a.subStrand.toLowerCase().includes(q));

      return matchesRating && matchesSubject && matchesSearch;
    });
  }, [assessments, selectedRating, selectedSubject, searchQuery]);

  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => {
      if (a.learningArea) set.add(a.learningArea);
    });
    learningAreas.forEach((la) => {
      if (la.name) set.add(la.name);
    });
    return Array.from(set).sort();
  }, [assessments, learningAreas]);

  const getRatingBadge = (rating: CBCRubric) => {
    switch (rating) {
      case 'EE':
        return (
          <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold shadow-xs">
            EE · Exceeding Expectations
          </span>
        );
      case 'ME':
        return (
          <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold shadow-xs">
            ME · Meeting Expectations
          </span>
        );
      case 'AE':
        return (
          <span className="px-2.5 py-1 rounded-md bg-amber-600 text-white text-xs font-bold shadow-xs">
            AE · Approaching Expectations
          </span>
        );
      case 'BE':
        return (
          <span className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs font-bold shadow-xs">
            BE · Below Expectations
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md bg-gray-500 text-white text-xs font-bold">
            {rating}
          </span>
        );
    }
  };

  const totalCount = assessments.length;
  const eeCount = assessments.filter((a) => a.rating === 'EE').length;
  const meCount = assessments.filter((a) => a.rating === 'ME').length;
  const aeCount = assessments.filter((a) => a.rating === 'AE').length;
  const beCount = assessments.filter((a) => a.rating === 'BE').length;

  const eePct = totalCount > 0 ? `${((eeCount / totalCount) * 100).toFixed(1)}%` : '0.0%';
  const mePct = totalCount > 0 ? `${((meCount / totalCount) * 100).toFixed(1)}%` : '0.0%';
  const aePct = totalCount > 0 ? `${((aeCount / totalCount) * 100).toFixed(1)}%` : '0.0%';
  const bePct = totalCount > 0 ? `${((beCount / totalCount) * 100).toFixed(1)}%` : '0.0%';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-1">
            <span>Academics</span>
            <span>/</span>
            <span>CBC Assessment System</span>
            <span>/</span>
            <span className="text-primary font-bold">Formative Assessments</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[28px]">fact_check</span>
            <span>Formative Assessments (Continuous CATs & SBAs)</span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
            Continuous Assessment Tests (CATs), classroom observation rubrics, practical tasks, and competency evaluations recorded against KICD sub-strands.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('summative-assessments')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-[#7a1228]">military_tech</span>
              <span>Go to Summative Exams</span>
            </button>
          )}

          <button
            onClick={onOpenNewAssessment}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7a1228] hover:bg-[#5f0d1e] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Record Formative Rubric (CAT)</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Exceeding (EE)
            </span>
            <div className="text-2xl font-black text-emerald-700 font-data-mono mt-1">
              {eeCount} <span className="text-xs font-semibold text-emerald-600">({eePct})</span>
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-sm">
            EE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Meeting (ME)
            </span>
            <div className="text-2xl font-black text-blue-700 font-data-mono mt-1">
              {meCount} <span className="text-xs font-semibold text-blue-600">({mePct})</span>
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black text-sm">
            ME
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Approaching (AE)
            </span>
            <div className="text-2xl font-black text-amber-700 font-data-mono mt-1">
              {aeCount} <span className="text-xs font-semibold text-amber-600">({aePct})</span>
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black text-sm">
            AE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              Below (BE)
            </span>
            <div className="text-2xl font-black text-rose-700 font-data-mono mt-1">
              {beCount} <span className="text-xs font-semibold text-rose-600">({bePct})</span>
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-black text-sm">
            BE
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Search by learner name, adm, strand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low text-xs rounded-lg border border-outline-variant/30 text-on-surface focus:outline-primary"
            />
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
            >
              <option value="All">All Learning Areas</option>
              {uniqueSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Rubric Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Rubric:</span>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
            >
              <option value="All">All Rubric Levels</option>
              <option value="EE">EE - Exceeding Expectations</option>
              <option value="ME">ME - Meeting Expectations</option>
              <option value="AE">AE - Approaching Expectations</option>
              <option value="BE">BE - Below Expectations</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-medium text-on-surface-variant">
          Showing <strong>{filtered.length}</strong> of {assessments.length} formative CAT records
        </div>
      </div>

      {/* Assessment Records List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((item) => (
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
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-xs font-bold text-[#7a1228] border border-outline-variant/30">
                    {item.learningArea}
                  </span>
                </div>

                <div className="text-xs text-on-surface">
                  <span className="text-on-surface-variant font-medium">Strand:</span>{' '}
                  <strong className="text-primary">{item.strand}</strong> · Sub-strand:{' '}
                  <span className="font-semibold text-gray-800">{item.subStrand}</span>
                </div>

                <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-2.5 rounded-lg border-l-2 border-primary/50">
                  &quot;{item.evidence}&quot;
                </p>

                {/* Targeted Competency & Values Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {item.targetedCompetencies && item.targetedCompetencies.length > 0 && (
                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">
                      Competency: {item.targetedCompetencies.join(', ').replace(/_/g, ' ')}
                    </span>
                  )}
                  {item.valuesObserved && item.valuesObserved.length > 0 && (
                    <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md font-semibold">
                      Values: {item.valuesObserved.join(', ').replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-[11px] text-outline ml-auto">
                    Date: <strong>{item.date}</strong> · Evaluator: <strong>{item.recordedBy}</strong>
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col md:items-end gap-2.5 border-t md:border-t-0 pt-3 md:pt-0 border-outline-variant/20">
                <div className="flex items-center gap-2">
                  {getRatingBadge(item.rating)}
                  <button
                    onClick={() => handleDeleteAssessment(item.id)}
                    disabled={deletingId === item.id}
                    title="Delete Formative Assessment Record"
                    className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {deletingId === item.id ? 'sync' : 'delete'}
                    </span>
                  </button>
                </div>
                <span className="text-[11px] text-secondary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">cloud_done</span> KNEC CBA Ready
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-dashed border-outline-variant">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-3xl">fact_check</span>
            </div>
            <h3 className="text-base font-bold text-on-surface mb-1">
              No Formative Assessments (CATs) Recorded
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-4 leading-relaxed">
              {assessments.length === 0
                ? 'No continuous formative CAT rubrics have been recorded yet. Click "Record Formative Rubric (CAT)" to evaluate student mastery against KICD sub-strands.'
                : 'No formative assessment logs match the selected filter criteria.'}
            </p>
            <button
              onClick={onOpenNewAssessment}
              className="px-4 py-2 bg-[#7a1228] text-white rounded-lg text-xs font-bold hover:bg-[#5f0d1e] inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Record First Formative Rubric</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
