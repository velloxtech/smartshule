import React from 'react';
import { CurriculumTrackerWeekItem, WeekCoverageStatus } from '../../types';

interface ViewTrackerWeekModalProps {
  week: CurriculumTrackerWeekItem | null;
  trackerSubject?: string;
  trackerClass?: string;
  onClose: () => void;
  onEditPlan?: (week: CurriculumTrackerWeekItem) => void;
}

export const ViewTrackerWeekModal: React.FC<ViewTrackerWeekModalProps> = ({
  week,
  trackerSubject,
  trackerClass,
  onClose,
  onEditPlan,
}) => {
  if (!week) return null;

  const isCovered = week.isCovered || week.status === 'APPROVED' || week.status === 'COVERED';

  const getStatusBadge = (status: WeekCoverageStatus, covered: boolean) => {
    if (covered || status === 'APPROVED' || status === 'COVERED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
          <span className="material-symbols-outlined text-[15px] text-emerald-700">verified</span>
          <span>Coverage Approved</span>
        </span>
      );
    }
    if (status === 'SUBMITTED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-xs">
          <span className="material-symbols-outlined text-[15px] text-amber-700">hourglass_top</span>
          <span>Pending Supervisory Approval</span>
        </span>
      );
    }
    if (status === 'RETURNED') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5 shadow-xs">
          <span className="material-symbols-outlined text-[15px] text-rose-700">replay</span>
          <span>Returned for Revision</span>
        </span>
      );
    }
    if (status === 'IN_PROGRESS') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1.5 shadow-xs">
          <span className="material-symbols-outlined text-[15px] text-blue-700">pending</span>
          <span>In Progress</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 shadow-xs">
        <span className="material-symbols-outlined text-[15px] text-slate-500">calendar_today</span>
        <span>Scheduled / Ready</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-[#7a1228] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-rose-100">visibility</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  Week {week.weekNumber} Syllabus Progression
                </span>
                {trackerSubject && trackerClass && (
                  <span className="text-[11px] text-rose-100 font-bold">
                    {trackerSubject} · {trackerClass}
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                {week.strand} &mdash; <span className="font-semibold text-rose-100">{week.subStrand}</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
          
          {/* Status & Coverage Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Current Status:</span>
              {getStatusBadge(week.status, isCovered)}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div>
                <span className="text-slate-400">Planned Lessons:</span>{' '}
                <strong className="text-slate-800">{week.plannedLessons || 5}</strong>
              </div>
              {week.lessonsTaught !== undefined && (
                <div>
                  <span className="text-slate-400">Lessons Taught:</span>{' '}
                  <strong className="text-slate-800">{week.lessonsTaught}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Specific Learning Outcomes */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[#7a1228] text-base">target</span>
              Specific Learning Outcomes:
            </div>
            <div className="p-3.5 bg-rose-50/40 border border-rose-100 rounded-xl text-slate-800 leading-relaxed text-xs font-medium">
              {week.learningOutcomes || 'No specific outcomes detailed for this week.'}
            </div>
          </div>

          {/* Suggested Activities & Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 font-black text-slate-800 text-[11px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-slate-600 text-sm">psychology</span>
                Learning Activities:
              </div>
              <p className="text-slate-700 text-xs leading-relaxed">
                {week.suggestedActivities || 'Teacher-guided instructional activities, learner tasks, and collaborative inquiry.'}
              </p>
            </div>

            <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 font-black text-slate-800 text-[11px] uppercase tracking-wider">
                <span className="material-symbols-outlined text-slate-600 text-sm">menu_book</span>
                Curriculum Resources:
              </div>
              <p className="text-slate-700 text-xs leading-relaxed">
                {week.resources || 'Standard KICD approved textbooks, audio-visual aids, and chart references.'}
              </p>
            </div>
          </div>

          {/* Teacher Commentary */}
          {week.teacherComment && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-amber-700 text-base">comment</span>
                Teacher Reflection & Coverage Notes:
              </div>
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-950 leading-relaxed text-xs">
                "{week.teacherComment}"
                {week.confirmedByTeacherName && (
                  <div className="mt-1.5 text-[10px] text-amber-800 font-bold">
                    &mdash; Confirmed by {week.confirmedByTeacherName}
                    {week.coveredAt && ` on ${new Date(week.coveredAt).toLocaleDateString('en-GB')}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supervisor / HOD Remarks */}
          {week.hodRemarks && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-emerald-900 text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-emerald-700 text-base">verified</span>
                Headteacher / Supervisor Remarks:
              </div>
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-950 leading-relaxed text-xs font-semibold">
                "{week.hodRemarks}"
              </div>
            </div>
          )}

          {/* Target Dates & Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <div>
              Target Timeline: <strong className="text-slate-700">{week.targetDate || `Term 1 · Week ${week.weekNumber}`}</strong>
            </div>
            <div className="text-right">
              {week.coveredAt ? (
                <>Covered Date: <strong className="text-slate-700">{new Date(week.coveredAt).toLocaleDateString('en-GB')}</strong></>
              ) : (
                <span className="text-amber-700 font-semibold">Not yet stamped as covered</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            Close
          </button>
          {onEditPlan && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditPlan(week);
              }}
              className="px-4 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-bold hover:bg-[#901530] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Week Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
