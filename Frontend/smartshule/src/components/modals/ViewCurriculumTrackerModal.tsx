import React, { useState } from 'react';
import { CurriculumTracker, CurriculumTrackerWeekItem, CurriculumTrackerDailyLog } from '../../types';
import { ViewTrackerWeekModal } from './ViewTrackerWeekModal';
import { ViewDailyLogModal } from './ViewDailyLogModal';

interface ViewCurriculumTrackerModalProps {
  tracker: CurriculumTracker | null;
  onClose: () => void;
  onDownloadPDF?: (tracker: CurriculumTracker) => void;
}

export const ViewCurriculumTrackerModal: React.FC<ViewCurriculumTrackerModalProps> = ({
  tracker,
  onClose,
  onDownloadPDF,
}) => {
  if (!tracker) return null;

  const [activeTab, setActiveTab] = useState<'weeks' | 'dailyLogs'>('weeks');
  const [weekFilter, setWeekFilter] = useState<'ALL' | 'COVERED' | 'PENDING'>('ALL');
  const [selectedWeekDetail, setSelectedWeekDetail] = useState<CurriculumTrackerWeekItem | null>(null);
  const [selectedDailyLogDetail, setSelectedDailyLogDetail] = useState<CurriculumTrackerDailyLog | null>(null);

  const weeks: CurriculumTrackerWeekItem[] = tracker.items || (tracker as any).weeks || [];
  const stats = tracker.stats;
  const completionPct = stats?.completionPercentage ?? (
    weeks.length > 0
      ? Math.round((weeks.filter((w) => w.isCovered || w.status === 'COVERED').length / weeks.length) * 100)
      : 0
  );

  const filteredWeeks = weeks.filter((w) => {
    if (weekFilter === 'COVERED' && !w.isCovered && w.status !== 'COVERED') return false;
    if (weekFilter === 'PENDING' && (w.isCovered || w.status === 'COVERED')) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="bg-[#7a1228] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">fact_check</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  Curriculum Tracker Dossier
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                  {completionPct}% Complete
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                {tracker.subjectName} · {tracker.className} {tracker.streamName ? `(${tracker.streamName})` : ''}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Progress & Metadata Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Educator</span>
              <span className="font-black text-slate-900">{tracker.teacherName || 'Assigned Teacher'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Academic Year / Term</span>
              <span className="font-black text-slate-900">{tracker.academicYear || '2026'} · {tracker.term || 'Term 1'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Syllabus Weeks</span>
              <span className="font-black text-slate-900">{weeks.length} Weeks Scheduled</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Daily Lesson Logs</span>
              <span className="font-black text-slate-900">{tracker.dailyLogs?.length || 0} Logs Stamped</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
              <span className="text-slate-600">Overall Term Curriculum Coverage:</span>
              <span className="text-[#7a1228] font-black">{completionPct}% Completed</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#7a1228] to-emerald-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Switcher & Filters */}
        <div className="px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 bg-white">
          <div className="flex gap-4 font-bold">
            <button
              onClick={() => setActiveTab('weeks')}
              className={`py-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'weeks'
                  ? 'border-[#7a1228] text-[#7a1228]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_timeline</span>
              <span>Weekly Syllabus Plan ({weeks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('dailyLogs')}
              className={`py-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'dailyLogs'
                  ? 'border-[#7a1228] text-[#7a1228]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Daily Delivery Logs ({tracker.dailyLogs?.length || 0})</span>
            </button>
          </div>

          {activeTab === 'weeks' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Filter:</span>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value as any)}
                className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 outline-none"
              >
                <option value="ALL">All Weeks</option>
                <option value="COVERED">Covered Only</option>
                <option value="PENDING">Pending Only</option>
              </select>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-700">
          {activeTab === 'weeks' && (
            <div className="space-y-3">
              {filteredWeeks.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No week plans match the current filter.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-16 text-center">Week</th>
                        <th className="py-2.5 px-3 w-48">Strand & Sub-Strand</th>
                        <th className="py-2.5 px-4 min-w-[200px]">Planned Outcomes</th>
                        <th className="py-2.5 px-3 w-24 text-center">Lessons</th>
                        <th className="py-2.5 px-3 w-32">Status</th>
                        <th className="py-2.5 px-4 min-w-[160px]">Teacher / HOD Remarks</th>
                        <th className="py-2.5 px-3 w-16 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredWeeks.map((w) => {
                        const isWeekCovered = w.isCovered || w.status === 'COVERED';
                        return (
                          <tr key={w.id || w.weekNumber} className="hover:bg-slate-50/80 transition-colors align-top">
                            <td className="py-3 px-3 text-center font-black font-mono text-[#7a1228] bg-slate-50/50">
                              W{w.weekNumber}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 text-xs">{w.strand}</div>
                              <div className="text-[11px] text-slate-500 italic mt-0.5">{w.subStrand}</div>
                            </td>
                            <td className="py-3 px-4 leading-relaxed">
                              {w.learningOutcomes}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-black text-slate-900">{w.lessonsTaught ?? w.plannedLessons ?? 5}</span>
                              <span className="text-[10px] text-slate-400 block font-normal">/ {w.plannedLessons ?? 5} pln</span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isWeekCovered
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : w.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {isWeekCovered ? 'task_alt' : 'schedule'}
                                </span>
                                {isWeekCovered ? 'Covered' : w.status || 'Pending'}
                              </span>
                              {w.coveredAt && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {new Date(w.coveredAt).toLocaleDateString('en-GB')}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {w.teacherComment && (
                                <p className="text-[11px] text-slate-700 italic mb-1">
                                  Tr: "{w.teacherComment}"
                                </p>
                              )}
                              {w.hodRemarks && (
                                <p className="text-[11px] text-emerald-800 font-medium">
                                  HOD: "{w.hodRemarks}"
                                </p>
                              )}
                              {!w.teacherComment && !w.hodRemarks && (
                                <span className="text-slate-400 italic text-[10px]">None recorded</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedWeekDetail(w)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer"
                                title="View Week Progression Details"
                              >
                                <span className="material-symbols-outlined text-[17px]">visibility</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dailyLogs' && (
            <div className="space-y-3">
              {!tracker.dailyLogs || tracker.dailyLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">edit_off</span>
                  <p className="font-bold">No daily lesson delivery logs have been recorded on this tracker yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tracker.dailyLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDailyLogDetail(log)}
                            className="p-1 rounded-lg text-slate-500 hover:text-[#7a1228] hover:bg-white transition-colors cursor-pointer"
                            title="View Daily Lesson Log & Reflection Details"
                          >
                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                          </button>
                          <span className="font-black text-slate-900">{log.date} ({log.dayOfWeek || 'Lesson'})</span>
                          {log.lessonPeriod && (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                              {log.lessonPeriod}
                            </span>
                          )}
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {log.status || 'TAUGHT'}
                          </span>
                        </div>
                        {log.reflection?.comprehensionLevel && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Comprehension: {log.reflection.comprehensionLevel}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-800">
                        <span className="font-bold">{log.strand}</span> · <span className="italic">{log.subStrand}</span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{log.learningOutcomesTaught}</p>
                      </div>

                      {log.reflection?.whatWentWell && (
                        <div className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-800">Reflection: </span>
                          <span>{log.reflection.whatWentWell}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            KICD CBC Curriculum Tracker Dossier · Grace Seeds School
          </div>

          <div className="flex items-center gap-2">
            {onDownloadPDF && (
              <button
                type="button"
                onClick={() => onDownloadPDF(tracker)}
                className="px-4 py-2 bg-[#7a1228] text-white rounded-xl text-xs font-bold hover:bg-[#5e0d1e] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download Tracker PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Nested View Week Details Modal */}
        {selectedWeekDetail && (
          <ViewTrackerWeekModal
            week={selectedWeekDetail}
            trackerSubject={tracker.subjectName}
            trackerClass={tracker.className}
            onClose={() => setSelectedWeekDetail(null)}
          />
        )}

        {/* Nested View Daily Log Details Modal */}
        {selectedDailyLogDetail && (
          <ViewDailyLogModal
            log={selectedDailyLogDetail}
            onClose={() => setSelectedDailyLogDetail(null)}
          />
        )}
      </div>
    </div>
  );
};
