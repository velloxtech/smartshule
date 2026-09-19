import React, { useState, useEffect } from 'react';
import { AcademicTerm, AcademicContext } from '../../types';
import { apiService } from '../../services/api';

interface AcademicTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicContext: AcademicContext | null;
  onTermUpdated: () => void;
  canManageTerms?: boolean;
}

export const AcademicTermsModal: React.FC<AcademicTermsModalProps> = ({
  isOpen,
  onClose,
  academicContext,
  onTermUpdated,
  canManageTerms = true,
}) => {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editable dates map: termId -> { startDate, endDate }
  const [editDates, setEditDates] = useState<Record<string, { startDate: string; endDate: string; name: string }>>({});

  useEffect(() => {
    if (isOpen) {
      loadTerms();
    }
  }, [isOpen, academicContext]);

  const loadTerms = async () => {
    setLoading(true);
    try {
      const res = await apiService.getTerms();
      if (res.success && res.data) {
        setTerms(res.data);
        const map: Record<string, { startDate: string; endDate: string; name: string }> = {};
        res.data.forEach((t) => {
          map[t.id] = {
            startDate: t.startDate ? t.startDate.split('T')[0] : '',
            endDate: t.endDate ? t.endDate.split('T')[0] : '',
            name: t.name || '',
          };
        });
        setEditDates(map);
      }
    } catch (err: any) {
      console.error('Failed to load terms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (termId: string, field: 'startDate' | 'endDate' | 'name', value: string) => {
    setEditDates((prev) => ({
      ...prev,
      [termId]: {
        ...prev[termId],
        [field]: value,
      },
    }));
  };

  const handleSaveTermDates = async (termId: string) => {
    const dates = editDates[termId];
    if (!dates || !dates.startDate || !dates.endDate) {
      setFeedback({ type: 'error', message: 'Please provide both start and end dates.' });
      return;
    }
    if (dates.startDate >= dates.endDate) {
      setFeedback({ type: 'error', message: 'Term end date must be after the start date.' });
      return;
    }

    setSavingId(termId);
    setFeedback(null);
    try {
      const res = await apiService.updateTerm(termId, {
        startDate: dates.startDate,
        endDate: dates.endDate,
        name: dates.name,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Term dates updated successfully.' });
        await loadTerms();
        onTermUpdated();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to update term.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating term.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleActivateTerm = async (termId: string) => {
    setSavingId(termId);
    setFeedback(null);
    try {
      const res = await apiService.activateTerm(termId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Active academic term set successfully.' });
        await loadTerms();
        onTermUpdated();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to activate term.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error activating term.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleTransitionTerm = async () => {
    if (!confirm('Are you sure you want to conclude the current term and transition the school system to the next academic term?')) {
      return;
    }

    setTransitioning(true);
    setFeedback(null);
    try {
      const res = await apiService.transitionTerm();
      if (res.success) {
        setFeedback({ type: 'success', message: `Successfully transitioned to ${res.data?.name || 'next term'}!` });
        await loadTerms();
        onTermUpdated();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to transition term.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error transitioning term.' });
    } finally {
      setTransitioning(false);
    }
  };

  if (!isOpen) return null;

  const currentTerm = academicContext?.currentTerm || terms.find((t) => t.isCurrent);
  const notice = academicContext?.termNotice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-3xl rounded-2xl bg-[#F8F5F5] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header: Pure Maroon */}
        <div className="bg-[#800000] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <span className="material-symbols-outlined text-[24px]">event_available</span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Academic Terms & Session Lifecycle</h2>
              <p className="text-xs text-rose-100">
                Manage term start and end boundaries, monitor session progress, and automate term closures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {feedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current Term Overview Card */}
          {currentTerm && (
            <div className="rounded-xl p-5 border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active Term Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      currentTerm.status === 'ENDED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : currentTerm.isEndingSoon
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentTerm.status === 'ENDED'
                          ? 'bg-rose-600'
                          : currentTerm.isEndingSoon
                          ? 'bg-amber-600'
                          : 'bg-emerald-500'
                      }`}
                    ></span>
                    {currentTerm.status === 'ENDED'
                      ? 'TERM CONCLUDED / ENDED'
                      : currentTerm.isEndingSoon
                      ? 'ENDING SOON'
                      : 'IN ACTIVE SESSION'}
                  </span>
                </div>

                {canManageTerms && (
                  <button
                    onClick={handleTransitionTerm}
                    disabled={transitioning}
                    className="px-4 py-2 bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">fast_forward</span>
                    <span>{transitioning ? 'Advancing Term...' : 'Conclude & Advance to Next Term'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-[#F8F5F5] border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Session Name</span>
                  <span className="font-bold text-slate-900">{currentTerm.name}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8F5F5] border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Session Dates</span>
                  <span className="font-semibold text-slate-800">
                    {currentTerm.startDate ? new Date(currentTerm.startDate).toLocaleDateString('en-GB') : '—'} –{' '}
                    {currentTerm.endDate ? new Date(currentTerm.endDate).toLocaleDateString('en-GB') : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8F5F5] border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Timeline Progress</span>
                  <span className="font-bold text-[#800000]">
                    {currentTerm.daysRemaining !== undefined && currentTerm.daysRemaining > 0
                      ? `${currentTerm.daysRemaining} days remaining (Wk ${currentTerm.currentWeek || 1}/${currentTerm.totalWeeks || 9})`
                      : 'Session completed'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              {currentTerm.totalWeeks && currentTerm.currentWeek && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Term Start ({currentTerm.startDate?.split('T')[0]})</span>
                    <span>Term Closing ({currentTerm.endDate?.split('T')[0]})</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#800000] h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, Math.round((currentTerm.currentWeek / currentTerm.totalWeeks) * 100))
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {notice && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-rose-700">info</span>
                  <span>{notice.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Term Schedules List & Editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#800000]">date_range</span>
                <span>Configured Academic Terms</span>
              </h3>
              <span className="text-xs text-slate-500">Updates sync school registers & fee structures</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading term configurations...</div>
            ) : terms.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No terms configured yet.</div>
            ) : (
              <div className="space-y-3">
                {terms.map((term) => {
                  const edit = editDates[term.id] || {
                    startDate: term.startDate ? term.startDate.split('T')[0] : '',
                    endDate: term.endDate ? term.endDate.split('T')[0] : '',
                    name: term.name || '',
                  };
                  const isCurrent = term.isCurrent;
                  const isSaving = savingId === term.id;

                  return (
                    <div
                      key={term.id}
                      className={`p-4 rounded-xl border bg-white shadow-xs transition-all ${
                        isCurrent
                          ? 'border-[#800000] ring-1 ring-[#800000]/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={edit.name}
                            onChange={(e) => handleDateChange(term.id, 'name', e.target.value)}
                            disabled={!canManageTerms}
                            className="font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-[#800000] focus:outline-none px-1"
                          />
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#800000] text-white uppercase tracking-wider">
                              CURRENT ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              term.status === 'ENDED'
                                ? 'bg-slate-100 text-slate-600'
                                : term.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {term.status || 'SCHEDULED'}
                          </span>
                          {!isCurrent && canManageTerms && (
                            <button
                              onClick={() => handleActivateTerm(term.id)}
                              disabled={isSaving}
                              className="px-2.5 py-1 text-xs font-semibold text-[#800000] hover:bg-rose-50 rounded-lg border border-[#800000]/30 transition-colors cursor-pointer"
                            >
                              Set as Active
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Term Opening / Start Date
                          </label>
                          <input
                            type="date"
                            value={edit.startDate}
                            onChange={(e) => handleDateChange(term.id, 'startDate', e.target.value)}
                            disabled={!canManageTerms}
                            className="w-full px-3 py-1.5 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Term Closing / End Date
                          </label>
                          <input
                            type="date"
                            value={edit.endDate}
                            onChange={(e) => handleDateChange(term.id, 'endDate', e.target.value)}
                            disabled={!canManageTerms}
                            className="w-full px-3 py-1.5 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                          />
                        </div>

                        {canManageTerms && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSaveTermDates(term.id)}
                              disabled={isSaving}
                              className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[15px]">save</span>
                              <span>{isSaving ? 'Saving...' : 'Save Dates'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Pure Maroon */}
        <div className="bg-[#800000] text-white px-6 py-3 flex items-center justify-between shrink-0 text-xs border-t border-[#660000]">
          <div className="flex items-center gap-2 text-rose-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Academic Term Calendar Bridge Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
