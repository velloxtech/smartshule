import React from 'react';
import { CurriculumTrackerDailyLog, EnrichedDailyLog } from '../../types';

interface ViewDailyLogModalProps {
  log: CurriculumTrackerDailyLog | EnrichedDailyLog | null;
  onClose: () => void;
  onEdit?: (log: CurriculumTrackerDailyLog) => void;
}

export const ViewDailyLogModal: React.FC<ViewDailyLogModalProps> = ({
  log,
  onClose,
  onEdit,
}) => {
  if (!log) return null;

  const reflection = log.reflection;
  const endorsement = log.endorsement;
  const enriched = log as EnrichedDailyLog;

  const getComprehensionBadge = (level?: string) => {
    switch (level) {
      case 'EXCELLENT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">Excellent (Over 80%)</span>;
      case 'GOOD':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">Good (65% - 79%)</span>;
      case 'AVERAGE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">Average (50% - 64%)</span>;
      case 'NEEDS_REMEDIATION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">Needs Remediation (&lt; 50%)</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">Satisfactory</span>;
    }
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
                  Daily Lesson Log & Reflection
                </span>
                <span className="text-[11px] text-rose-100 font-bold">
                  {log.date} {log.dayOfWeek && `(${log.dayOfWeek})`} · Wk {log.weekNumber || 1}
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                {enriched.subjectName ? `${enriched.subjectName} · ${enriched.className}` : `${log.strand} &mdash; ${log.subStrand}`}
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
          
          {/* Timeline & Teacher Metadata Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Date</span>
              <strong className="text-slate-800 text-xs">{log.date}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Period</span>
              <strong className="text-slate-800 text-xs">{log.lessonPeriod || 'Period 1'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Delivery Status</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                {log.status}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black block">Teacher</span>
              <strong className="text-slate-800 text-xs truncate block" title={log.loggedByTeacherName}>
                {log.loggedByTeacherName || 'Class Teacher'}
              </strong>
            </div>
          </div>

          {/* Curriculum Coverage Focus */}
          <div className="space-y-2 p-3.5 bg-rose-50/40 border border-rose-100 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="font-black text-[#7a1228] uppercase text-[11px] tracking-wider">
                {log.strand} &mdash; {log.subStrand}
              </span>
            </div>
            <div>
              <strong className="text-slate-800 text-xs block mb-0.5">Outcomes Delivered:</strong>
              <p className="text-slate-700 leading-relaxed text-xs">{log.learningOutcomesTaught}</p>
            </div>
            {log.activitiesConducted && (
              <div className="pt-1 border-t border-rose-100">
                <strong className="text-slate-800 text-xs block mb-0.5">Activities Conducted:</strong>
                <p className="text-slate-700 leading-relaxed text-xs">{log.activitiesConducted}</p>
              </div>
            )}
            {log.resourcesUsed && (
              <div className="pt-1 border-t border-rose-100 text-[11px] text-slate-600">
                <strong>Resources:</strong> {log.resourcesUsed}
              </div>
            )}
          </div>

          {/* Comprehensive 5-Point Teacher Self-Reflection */}
          {reflection && (
            <div className="space-y-3 p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-1.5 font-black text-amber-950 text-xs uppercase tracking-wider">
                  <span className="material-symbols-outlined text-amber-700 text-base">psychology</span>
                  Teacher Self-Reflection Dossier
                </div>
                {getComprehensionBadge(reflection.comprehensionLevel)}
              </div>

              {reflection.whatWentWell && (
                <div>
                  <span className="font-bold text-amber-900 block text-xs">What Went Well / Pedagogical Success:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed text-xs">{reflection.whatWentWell}</p>
                </div>
              )}

              {reflection.challenges && (
                <div>
                  <span className="font-bold text-amber-900 block text-xs">Challenges / Learner Gaps Encountered:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed text-xs">{reflection.challenges}</p>
                </div>
              )}

              {reflection.remedialPlan && (
                <div>
                  <span className="font-bold text-amber-900 block text-xs">Remedial Action Plan:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed text-xs">{reflection.remedialPlan}</p>
                </div>
              )}

              {reflection.nextSteps && (
                <div>
                  <span className="font-bold text-amber-900 block text-xs">Next Pedagogical Steps:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed text-xs">{reflection.nextSteps}</p>
                </div>
              )}
            </div>
          )}

          {/* Leadership / Supervisory Endorsement */}
          {endorsement ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-emerald-900 text-xs uppercase tracking-wider">
                  <span className="material-symbols-outlined text-emerald-700 text-base">verified</span>
                  Leadership Supervisory Endorsement
                </div>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Official Stamp
                </span>
              </div>
              <p className="text-emerald-950 font-medium italic text-xs">"{endorsement.remarks}"</p>
              <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-emerald-200 flex justify-between">
                <span>Endorsed by: <strong>{endorsement.endorsedByName} ({endorsement.role})</strong></span>
                <span>{new Date(endorsement.endorsedAt).toLocaleString('en-GB')}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs italic">
              Awaiting supervisor / Head Teacher leadership endorsement.
            </div>
          )}
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
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(log);
              }}
              className="px-4 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-bold hover:bg-[#901530] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Log</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
