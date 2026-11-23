import { SchemeApprovalActions } from '../curriculum/SchemeApprovalActions';
import { canReviewCurriculum, canPrepareCurriculum } from '../../utils/curriculumPermissions';
import React, { useState, useEffect } from 'react';
import {apiService} from '../../services/api';
import {SchemeOfWorkDocument} from '../curriculum/SchemeOfWorkDocument';
import { SchemeOfWork, SchemeEntry } from '../../types';
import { SubStrandSchemePlanner } from '../curriculum/SubStrandSchemePlanner';
import { useAuth } from '../../context/AuthContext';

interface ViewSchemeModalProps {
  scheme: SchemeOfWork | null;
  context?: {school?: any; classes?: any[]; areas?: any[]};
  onClose: () => void;
  onDownloadPDF?: (scheme: SchemeOfWork) => void;
  onSubmitForReview?: (schemeId: string) => void;
  onRefresh?: () => Promise<void>;
  onNavigateTab?: (tab: string) => void;
}

export const ViewSchemeModal: React.FC<ViewSchemeModalProps> = ({
  scheme,
  context,
  onClose,
  onDownloadPDF,
  onSubmitForReview,
  onRefresh = async () => {},
  onNavigateTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState<{year?: string; term?: string}>({});
  useEffect(() => {
    setEditing(false); setPeriod({}); let live = true;
    if (scheme) Promise.all([apiService.getAcademicYears(), apiService.getAcademicTermsByYear(scheme.academicYearId)])
      .then(([years, terms]) => {if(live) setPeriod({year:years.data?.find(y=>y.id===scheme.academicYearId)?.name,term:terms.data?.find(t=>t.id===scheme.termId)?.name});})
      .catch(() => {});
    return () => {live=false;};
  }, [scheme?.id]);

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('ALL');
  const [focusedEntry, setFocusedEntry] = useState<SchemeEntry | null>(null);
  const { user } = useAuth();
  const [weeklyDirty, setWeeklyDirty] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(0);
  const authorizedReviewer = canReviewCurriculum(user?.role);
  const close = () => { if (weeklyDirty && !window.confirm('Discard unsaved lesson details? Saved lessons will be retained.')) return; onClose(); };
  if (!scheme) return null;
  const canEditScheme = Boolean(scheme.planningState && canPrepareCurriculum(user?.role));

  const inlinePlanner = editing && canEditScheme;

  const entries: SchemeEntry[] = scheme.entries || [];
  const activeEntries = entries.filter((entry) => !entry.archivedAt);
  const allocatedLessons = scheme.planningState?.allocations?.reduce((sum, item) => sum + (Number(item.lessons) || 0), 0) || 0;
  const allocationDraft = Boolean(scheme.planningState && activeEntries.length === 0);
  const yearLabel = scheme.academicYearId?.match(/\d{4}/)?.[0] || scheme.academicYearId;
  const termNumber = scheme.termId?.match(/(?:term)?[-_ ]?\d{4}[-_ ]?t?([1-3])$/i)?.[1]
    || scheme.termId?.match(/(?:term|t)[-_ ]?([1-3])$/i)?.[1];
  const termLabel = `${termNumber ? `Term ${termNumber}` : scheme.termId} · ${yearLabel}`;

  const uniqueWeeks = Array.from(new Set(entries.map((e) => e.weekNumber))).sort(
    (a, b) => a - b
  );

  const filteredEntries = entries.filter((e) => {
    if (selectedWeekFilter !== 'ALL' && e.weekNumber !== Number(selectedWeekFilter)) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchesStrand = e.strandTitle?.toLowerCase().includes(q);
      const matchesSubStrand = e.subStrandTitle?.toLowerCase().includes(q);
      const matchesOutcome = e.specificLearningOutcomes?.some((o) =>
        o.toLowerCase().includes(q)
      );
      const matchesInquiry = e.keyInquiryQuestions?.some((k) =>
        k.toLowerCase().includes(q)
      );
      if (!matchesStrand && !matchesSubStrand && !matchesOutcome && !matchesInquiry) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="bg-primary text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">calendar_month</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  Scheme of Work Dossier
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    scheme.status === 'APPROVED'
                      ? 'bg-emerald-400 text-emerald-950 font-bold'
                      : scheme.status === 'SUBMITTED'
                      ? 'bg-amber-300 text-amber-950 font-bold'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {scheme.status}
                </span>
              </div>
              <h2 className="text-base md:text-lg font-black text-white mt-0.5 truncate max-w-2xl">
                {scheme.title}
              </h2>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Metadata & Controls Bar */}
        <div className="bg-surface border-b border-slate-200 p-4 shrink-0 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Academic Term</span>
              <span className="font-black text-slate-900">{termLabel}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">{allocationDraft ? 'Initial estimate' : 'Teaching sessions'}</span>
              <span className="font-black text-slate-900">{allocationDraft ? allocatedLessons : (scheme.totalLessons || activeEntries.length)} {allocationDraft ? 'estimated' : 'planned'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Curriculum Standard</span>
              <span className="font-black text-slate-900">KICD / CBC Framework</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Entries Loaded</span>
              <span className="font-black text-slate-900">{activeEntries.length} Lesson Units</span>
            </div>
          </div>

          <div className={`flex items-center gap-2 ${!editing || inlinePlanner ? 'hidden' : ''}`}>
            {/* Week Filter */}
            <select
              value={selectedWeekFilter}
              onChange={(e) => setSelectedWeekFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-surface text-slate-700 font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="ALL">All Weeks ({uniqueWeeks.length})</option>
              {uniqueWeeks.map((w) => (
                <option key={w} value={w.toString()}>
                  Week {w}
                </option>
              ))}
            </select>

            {/* Keyword Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Search strand or outcome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-surface focus:ring-2 focus:ring-primary outline-none w-48"
              />
            </div>
          </div>
        </div>

        {/* HOD / Supervisor Endorsement Banner */}
        {scheme.reviewRemarks && (
          <div className="bg-amber-50/80 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-amber-700 text-base">verified</span>
            <div>
              <span className="font-black">HOD / Head Teacher Review Remarks: </span>
              <span className="italic">"{scheme.reviewRemarks}"</span>
            </div>
          </div>
        )}

        {authorizedReviewer && <div className="shrink-0 max-h-[42vh] overflow-y-auto border-b border-outline-variant/30 p-4"><SchemeApprovalActions scheme={scheme} onReviewed={async () => { await onRefresh(); setReviewVersion(value => value + 1); }} /></div>}
        {/* Modal Body: Full Interactive Scheme Matrix */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 text-xs">
          {!editing ? <SchemeOfWorkDocument scheme={scheme} school={context?.school} schoolName={context?.school?.name} className={context?.classes?.find(c=>c.id===scheme.classRoomId)?.name} areaName={context?.areas?.find(a=>a.id===scheme.learningAreaId)?.name} termName={period.term || (termNumber ? `Term ${termNumber}` : undefined)} yearName={period.year || scheme.academicYearId?.match(/\d{4}/)?.[0]} /> : inlinePlanner ? <div key={`${scheme.id}:${reviewVersion}`}><SubStrandSchemePlanner showReviewActions={false} embedded onDirtyChange={setWeeklyDirty} scope={{ academicYearId: scheme.academicYearId, termId: scheme.termId, classRoomId: scheme.classRoomId, streamId: scheme.streamId, learningAreaId: scheme.learningAreaId }} area={{ name: scheme.title, schemeId: scheme.id, scheme }} className="Selected class" streamName={scheme.streamId || 'Whole class'} termName={termLabel} yearName={yearLabel} onRefresh={onRefresh} onNavigateTab={onNavigateTab} /></div> : filteredEntries.length === 0 && allocationDraft ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-950">
              <span className="material-symbols-outlined text-4xl mb-2">edit_calendar</span>
              <h3 className="font-bold">Term draft saved · {allocatedLessons} lessons allocated</h3>
              <p className="mt-2 text-sm">The allocations are saved, but the scheduled week and lesson entries have not been generated yet. Continue the term scheme, complete the required learning outcomes, learning experiences and assessment methods, then finalize it after the term calendar and timetable are ready.</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">event_busy</span>
              <p className="font-bold">No scheme entries match your current search / week filter.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/90 text-slate-700 font-black border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 w-16 text-center">Wk/Les</th>
                      <th className="py-3 px-3 w-48">Strand & Sub-Strand</th>
                      <th className="py-3 px-4 min-w-[220px]">Specific Learning Outcomes</th>
                      <th className="py-3 px-3 min-w-[160px]">Key Inquiry Questions</th>
                      <th className="py-3 px-4 min-w-[200px]">Learning Experiences / Activities</th>
                      <th className="py-3 px-3 w-36">Learning Resources</th>
                      <th className="py-3 px-3 w-36">Assessment Methods</th>
                      <th className="py-3 px-3 w-36">Reflection / Remarks</th>
                      <th className="py-3 px-3 w-16 text-center">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredEntries.map((e, idx) => (
                      <tr key={idx} className="hover:bg-surface/80 transition-colors align-top">
                        {/* Week / Lesson */}
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-900 bg-surface/50">
                          <div className="text-xs text-primary">W{e.weekNumber}</div>
                          <div className="text-[10px] text-slate-500 font-normal">L{e.lessonNumber}</div>
                        </td>

                        {/* Strand & Sub-Strand */}
                        <td className="py-3 px-3">
                          <div className="font-black text-slate-900 text-xs">{e.strandTitle}</div>
                          <div className="text-[11px] text-slate-600 italic mt-0.5">{e.subStrandTitle}</div>
                        </td>

                        {/* Specific Learning Outcomes */}
                        <td className="py-3 px-4">
                          <ul className="list-disc list-inside space-y-1 text-slate-800 leading-relaxed">
                            {e.specificLearningOutcomes?.map((outcome, oIdx) => (
                              <li key={oIdx}>{outcome}</li>
                            ))}
                          </ul>
                        </td>

                        {/* Key Inquiry Questions */}
                        <td className="py-3 px-3 text-slate-700 italic leading-relaxed">
                          {e.keyInquiryQuestions?.map((q, qIdx) => (
                            <div key={qIdx} className="mb-1">
                              • {q}
                            </div>
                          ))}
                        </td>

                        {/* Learning Experiences / Activities */}
                        <td className="py-3 px-4 text-slate-700 leading-relaxed">
                          {e.learningExperiences && e.learningExperiences.length > 0 ? (
                            <ul className="list-disc list-inside space-y-0.5">
                              {e.learningExperiences.map((act, aIdx) => (
                                <li key={aIdx}>{act}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Not recorded</span>
                          )}
                        </td>

                        {/* Learning Resources */}
                        <td className="py-3 px-3 text-slate-600">
                          {e.learningResources?.join(', ') || 'Not recorded'}
                        </td>

                        {/* Assessment Methods */}
                        <td className="py-3 px-3">
                          <span className="inline-block bg-primary-fixed text-on-primary-fixed border border-primary px-2 py-0.5 rounded text-[10px] font-bold">
                            {e.assessmentMethods?.join(', ') || 'Not recorded'}
                          </span>
                        </td>

                        {/* Reflection / Remarks */}
                        <td className="py-3 px-3 text-slate-500 italic text-[11px]">
                          {e.reflection || 'Not recorded'}
                        </td>

                        {/* View Button */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setFocusedEntry(e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-rose-50 transition-colors cursor-pointer"
                            title="View single lesson entry details"
                          >
                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="bg-surface border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            Scheme of Work · {context?.school?.name || 'School'}
          </div>

          <div className="flex items-center gap-2">
            {canEditScheme && <button type="button" className="ui-button" onClick={()=>{if(weeklyDirty&&!window.confirm('Discard unsaved lesson details?'))return;setWeeklyDirty(false);setEditing(!editing);}}>{editing?'View document':'Edit scheme'}</button>}
            {onDownloadPDF && activeEntries.length > 0 && (
              <button
                type="button"
                onClick={() => onDownloadPDF(scheme)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download Official PDF</span>
              </button>
            )}

            {!canEditScheme && scheme.status === 'DRAFT' && activeEntries.length > 0 && onSubmitForReview && (
              <button
                type="button"
                onClick={() => {
                  onSubmitForReview(scheme.id);
                  onClose();
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>Submit for Review</span>
              </button>
            )}



            <button
              type="button"
              onClick={close}
              className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-surface-container-low transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Focused Single Scheme Entry Modal */}
        {focusedEntry && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="bg-primary text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded">
                    Week {focusedEntry.weekNumber} · Lesson {focusedEntry.lessonNumber}
                  </span>
                  <h3 className="text-sm font-black text-white mt-1">
                    {focusedEntry.strandTitle} &mdash; <span className="font-semibold text-rose-100">{focusedEntry.subStrandTitle}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setFocusedEntry(null)}
                  className="text-rose-200 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-5 space-y-3.5 overflow-y-auto text-xs text-slate-700">
                <div>
                  <span className="font-black text-slate-900 uppercase text-[11px] block mb-1">Specific Learning Outcomes:</span>
                  <ul className="list-disc list-inside space-y-1 p-3 bg-rose-50/40 border border-rose-100 rounded-xl">
                    {focusedEntry.specificLearningOutcomes?.map((o, idx) => (
                      <li key={idx} className="leading-relaxed">{o}</li>
                    ))}
                  </ul>
                </div>

                {focusedEntry.keyInquiryQuestions && focusedEntry.keyInquiryQuestions.length > 0 && (
                  <div>
                    <span className="font-black text-slate-900 uppercase text-[11px] block mb-1">Key Inquiry Questions:</span>
                    <div className="p-3 bg-surface border border-slate-200 rounded-xl italic space-y-1">
                      {focusedEntry.keyInquiryQuestions.map((q, idx) => (
                        <div key={idx}>• {q}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-black text-slate-900 uppercase text-[11px] block mb-1">Learning Experiences & Activities:</span>
                  <div className="p-3 bg-surface border border-slate-200 rounded-xl">
                    {focusedEntry.learningExperiences && focusedEntry.learningExperiences.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {focusedEntry.learningExperiences.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400 italic">Not recorded</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-surface border border-slate-200 rounded-xl">
                    <span className="font-black text-slate-900 uppercase text-[10px] block mb-0.5">Resources:</span>
                    <p className="text-[11px] text-slate-600">{focusedEntry.learningResources?.join(', ') || 'Not recorded'}</p>
                  </div>
                  <div className="p-3 bg-surface border border-slate-200 rounded-xl">
                    <span className="font-black text-slate-900 uppercase text-[10px] block mb-0.5">Assessment:</span>
                    <p className="text-[11px] text-slate-600">{focusedEntry.assessmentMethods?.join(', ') || 'Not recorded'}</p>
                  </div>
                </div>

                {focusedEntry.reflection && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
                    <span className="font-black uppercase text-[10px] block mb-0.5">Teacher Reflection / Remarks:</span>
                    <p className="italic text-xs">"{focusedEntry.reflection}"</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-surface border-t border-slate-200 text-right">
                <button
                  type="button"
                  onClick={() => setFocusedEntry(null)}
                  className="px-4 py-1.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
