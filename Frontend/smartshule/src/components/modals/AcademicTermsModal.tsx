import React, { useState, useEffect } from 'react';
import { AcademicTerm, AcademicYear, AcademicContext, UserRole, isTermInitializationAuthorized } from '../../types';
import { apiService } from '../../services/api';

interface AcademicTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicContext: AcademicContext | null;
  onTermUpdated: () => void;
  canManageTerms?: boolean;
  userRole?: string;
}

export const AcademicTermsModal: React.FC<AcademicTermsModalProps> = ({
  isOpen,
  onClose,
  academicContext,
  onTermUpdated,
  canManageTerms = true,
  userRole,
}) => {
  const isAuthorizedToManage = canManageTerms && (!userRole || isTermInitializationAuthorized(userRole));
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dedicated Initialize New Term Modal state
  const [showInitModal, setShowInitModal] = useState(false);
  const [initStep, setInitStep] = useState<'CONFIG' | 'CONFIRM' | 'SUCCESS'>('CONFIG');
  const [initializingTerm, setInitializingTerm] = useState(false);
  const [initializedTermData, setInitializedTermData] = useState<AcademicTerm | null>(null);
  const [initForm, setInitForm] = useState({
    academicYearId: '',
    termNumber: 1,
    name: 'Term 1',
    startDate: '',
    endDate: '',
    isCurrent: true,
  });

  // Editable dates map: termId -> { startDate, endDate, name, termNumber }
  const [editDates, setEditDates] = useState<
    Record<string, { startDate: string; endDate: string; name: string; termNumber: number }>
  >({});

  // Create Term state
  const [showCreateTermForm, setShowCreateTermForm] = useState(false);
  const [creatingTerm, setCreatingTerm] = useState(false);
  const [newTerm, setNewTerm] = useState({
    academicYearId: '',
    termNumber: 1,
    name: 'Term 1',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  // Create Year state
  const [showCreateYearForm, setShowCreateYearForm] = useState(false);
  const [creatingYear, setCreatingYear] = useState(false);
  const [newYear, setNewYear] = useState({
    name: new Date().getFullYear().toString(),
    startDate: `${new Date().getFullYear()}-01-05`,
    endDate: `${new Date().getFullYear()}-11-20`,
    isCurrent: true,
  });

  // Reopening Notification state for School Admin
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyingTermId, setNotifyingTermId] = useState<string>('');
  const [notifyOpeningDate, setNotifyOpeningDate] = useState<string>('');
  const [notifyReportingTime, setNotifyReportingTime] = useState<string>('7:45 AM');
  const [notifyCustomNotes, setNotifyCustomNotes] = useState<string>(
    '1. Reporting Time: All learners are expected in school promptly by 7:45 AM for morning assembly.\n' +
    '2. School Uniform & Grooming: Full official standard uniform, clean black polished leather shoes, and PE sports kit on scheduled activity days.\n' +
    '3. CBC Materials & Stationery: Ensure all CBC strand workbooks, exercise books, and stationery items are clearly labelled with the learner\'s full name.\n' +
    '4. Transport & Bus Routes: Morning school buses will commence routes at 6:15 AM sharp. Parents dropping learners directly are requested to use Gate 2.\n' +
    '5. Fee Clearance: Kindly finalize term fees or obtain financial clearance via M-Pesa Paybill 247247 prior to the first day of school.'
  );
  const [notifySendSms, setNotifySendSms] = useState<boolean>(true);
  const [notifyBroadcasting, setNotifyBroadcasting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setShowCreateTermForm(false);
      setShowCreateYearForm(false);
      loadYearsAndTerms();
    }
  }, [isOpen, academicContext, selectedYearId]);

  const loadYearsAndTerms = async () => {
    setLoading(true);
    try {
      // 1. Fetch Academic Years
      const yearsRes = await apiService.getYears();
      let fetchedYears: AcademicYear[] = [];
      if (yearsRes.success && yearsRes.data) {
        fetchedYears = yearsRes.data;
        setYears(fetchedYears);
      }

      // 2. Fetch Terms (all or filtered by selected year)
      const yearToFetch = selectedYearId !== 'ALL' ? selectedYearId : undefined;
      const termsRes = await apiService.getTerms(yearToFetch);
      if (termsRes.success && termsRes.data) {
        setTerms(termsRes.data);
        const map: Record<string, { startDate: string; endDate: string; name: string; termNumber: number }> = {};
        termsRes.data.forEach((t) => {
          map[t.id] = {
            startDate: t.startDate ? t.startDate.split('T')[0] : '',
            endDate: t.endDate ? t.endDate.split('T')[0] : '',
            name: t.name || '',
            termNumber: t.termNumber || 1,
          };
        });
        setEditDates(map);
      }

      // Pre-fill default year in newTerm if available
      const activeYear = fetchedYears.find((y) => y.isCurrent) || fetchedYears[0];
      if (activeYear && !newTerm.academicYearId) {
        setNewTerm((prev) => ({ ...prev, academicYearId: activeYear.id }));
      }
    } catch (err: any) {
      console.error('Failed to load terms or years:', err);
      setFeedback({ type: 'error', message: 'Failed to load academic terms and years. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (
    termId: string,
    field: 'startDate' | 'endDate' | 'name' | 'termNumber',
    value: string | number
  ) => {
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
    if (!dates || !dates.startDate || !dates.endDate || !dates.name) {
      setFeedback({ type: 'error', message: 'Please provide term name, start date, and end date.' });
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
        termNumber: Number(dates.termNumber),
      });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Term details updated successfully.' });
        await loadYearsAndTerms();
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
        await loadYearsAndTerms();
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
    if (
      !confirm(
        'Are you sure you want to conclude the current term and transition the school system to the next academic term?'
      )
    ) {
      return;
    }

    setTransitioning(true);
    setFeedback(null);
    try {
      const res = await apiService.transitionTerm();
      if (res.success) {
        setFeedback({ type: 'success', message: `Successfully transitioned to ${res.data?.name || 'next term'}!` });
        await loadYearsAndTerms();
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

  const handleProceedToConfirmInit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initForm.academicYearId) {
      setFeedback({ type: 'error', message: 'Please select an academic year.' });
      return;
    }
    if (!initForm.name || !initForm.startDate || !initForm.endDate) {
      setFeedback({ type: 'error', message: 'Please fill in all term fields.' });
      return;
    }
    if (initForm.startDate >= initForm.endDate) {
      setFeedback({ type: 'error', message: 'Term end date must be strictly after the start date.' });
      return;
    }
    const year = years.find((y) => y.id === initForm.academicYearId);
    if (year?.startDate && year?.endDate) {
      const yStart = year.startDate.split('T')[0];
      const yEnd = year.endDate.split('T')[0];
      if (initForm.startDate > yEnd || initForm.endDate < yStart) {
        setFeedback({
          type: 'error',
          message: `Term dates (${initForm.startDate} to ${initForm.endDate}) must align with Academic Year ${year.name} (${yStart} to ${yEnd}).`,
        });
        return;
      }
    }

    const existing = terms.find(
      (t) =>
        t.academicYearId === initForm.academicYearId &&
        (t.termNumber === Number(initForm.termNumber) ||
          t.name.trim().toLowerCase() === initForm.name.trim().toLowerCase())
    );
    if (existing) {
      setFeedback({
        type: 'error',
        message: `Term ${initForm.termNumber} ("${initForm.name}") has already been initialized for this academic year (Duplicate prevented).`,
      });
      return;
    }

    setFeedback(null);
    setInitStep('CONFIRM');
  };

  const handleConfirmInitializeTerm = async () => {
    setInitializingTerm(true);
    setFeedback(null);
    try {
      const res = await apiService.initializeTerm({
        academicYearId: initForm.academicYearId,
        termNumber: Number(initForm.termNumber),
        name: initForm.name.trim(),
        startDate: initForm.startDate,
        endDate: initForm.endDate,
        isCurrent: initForm.isCurrent,
      });

      if (res.success && res.data) {
        setInitializedTermData(res.data);
        setInitStep('SUCCESS');
        await loadYearsAndTerms();
        onTermUpdated();
      } else {
        setFeedback({
          type: 'error',
          message: res.error?.message || 'Failed to initialize academic term.',
        });
        setInitStep('CONFIG');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error initializing academic term.',
      });
      setInitStep('CONFIG');
    } finally {
      setInitializingTerm(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.academicYearId) {
      setFeedback({ type: 'error', message: 'Please select an academic year for the term.' });
      return;
    }
    if (!newTerm.name || !newTerm.startDate || !newTerm.endDate) {
      setFeedback({ type: 'error', message: 'Please fill in all term fields.' });
      return;
    }
    if (newTerm.startDate >= newTerm.endDate) {
      setFeedback({ type: 'error', message: 'End date must be after start date.' });
      return;
    }

    setCreatingTerm(true);
    setFeedback(null);
    try {
      const res = await apiService.createTerm({
        academicYearId: newTerm.academicYearId,
        termNumber: Number(newTerm.termNumber),
        name: newTerm.name,
        startDate: newTerm.startDate,
        endDate: newTerm.endDate,
        isCurrent: newTerm.isCurrent,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Term "${newTerm.name}" created successfully!` });
        setShowCreateTermForm(false);
        setNewTerm({
          academicYearId: newTerm.academicYearId,
          termNumber: Math.min(3, newTerm.termNumber + 1),
          name: `Term ${Math.min(3, newTerm.termNumber + 1)}`,
          startDate: '',
          endDate: '',
          isCurrent: false,
        });
        await loadYearsAndTerms();
        onTermUpdated();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to create academic term.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating academic term.' });
    } finally {
      setCreatingTerm(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear.name || !newYear.startDate || !newYear.endDate) {
      setFeedback({ type: 'error', message: 'Please fill in all year fields.' });
      return;
    }
    if (newYear.startDate >= newYear.endDate) {
      setFeedback({ type: 'error', message: 'End date must be after start date.' });
      return;
    }

    setCreatingYear(true);
    setFeedback(null);
    const schoolId = academicContext?.schoolId || academicContext?.currentYear?.schoolId || 'school-001';
    try {
      const res = await apiService.createYear({
        name: newYear.name,
        startDate: newYear.startDate,
        endDate: newYear.endDate,
        isCurrent: newYear.isCurrent,
        schoolId,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Academic Year ${newYear.name} created successfully!` });
        setShowCreateYearForm(false);
        const createdYear = res.data;
        if (createdYear) {
          setNewTerm((prev) => ({
            ...prev,
            academicYearId: createdYear.id,
            name: `Term 1 - ${createdYear.name}`,
            startDate: createdYear.startDate,
          }));
        }
        await loadYearsAndTerms();
        onTermUpdated();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to create academic year.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating academic year.' });
    } finally {
      setCreatingYear(false);
    }
  };

  const openReopenNotificationModal = (termId?: string) => {
    const targetTerm = termId
      ? terms.find((t) => t.id === termId)
      : terms.find((t) => t.status === 'UPCOMING') || terms.find((t) => t.isCurrent) || terms[0];

    if (targetTerm) {
      setNotifyingTermId(targetTerm.id);
      const sDate = targetTerm.startDate ? targetTerm.startDate.split('T')[0] : '';
      setNotifyOpeningDate(sDate);
    } else if (terms.length > 0) {
      setNotifyingTermId(terms[0].id);
      setNotifyOpeningDate(terms[0].startDate ? terms[0].startDate.split('T')[0] : '');
    }
    setShowNotifyModal(true);
  };

  const handleBroadcastReopeningNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = terms.find((t) => t.id === notifyingTermId) || terms[0];
    if (!term) {
      setFeedback({ type: 'error', message: 'Please select an academic term.' });
      return;
    }
    if (!notifyOpeningDate) {
      setFeedback({ type: 'error', message: 'Please specify the school opening date.' });
      return;
    }

    setNotifyBroadcasting(true);
    setFeedback(null);

    const termYear = years.find((y) => y.id === term.academicYearId);
    const yearLabel = termYear ? ` ${termYear.name}` : '';
    const formattedDate = new Date(notifyOpeningDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const announcementTitle = `📢 Official School Reopening Notice - ${term.name}${yearLabel}`;
    const announcementContent = `Dear Parents and Guardians,

Grace Seeds School warmly announces the official reopening and reporting directives for ${term.name}${yearLabel}.

📅 Official School Reopening Date: ${formattedDate}
⏰ Learner Reporting Time: ${notifyReportingTime}

Reporting Guidelines & Directives:
${notifyCustomNotes}

We look forward to an enriching, inspiring, and fruitful academic session with our learners.

Warm regards,
Office of the Head Teacher / School Administration
Grace Seeds School
KEMRI Road, Kisian, Kisumu
Tel: 0745 436312 | Email: schoolgraceseeds@gmail.com`;

    try {
      const res = await apiService.createAnnouncement({
        title: announcementTitle,
        content: announcementContent,
        category: 'GENERAL',
        priority: 'HIGH',
        targetAudience: 'PARENTS',
        isPinned: true,
        sendSmsBroadcast: notifySendSms,
        sendWhatsAppBroadcast: false,
        authorName: 'School Administration',
        authorRole: 'HEAD_TEACHER',
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `School Reopening Notice for ${term.name} has been successfully broadcast to all parents${notifySendSms ? ' (with instant SMS alerts dispatched)' : ''}!`,
        });
        setShowNotifyModal(false);
      } else {
        setFeedback({
          type: 'error',
          message: res.error?.message || 'Failed to broadcast reopening notification.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error broadcasting reopening notification.',
      });
    } finally {
      setNotifyBroadcasting(false);
    }
  };

  if (!isOpen) return null;

  const currentTerm = academicContext?.currentTerm || terms.find((t) => t.isCurrent);
  const notice = academicContext?.termNotice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl bg-[#F8F5F5] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header: Pure Maroon */}
        <div className="bg-[#800000] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <span className="material-symbols-outlined text-[24px]">event_available</span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Academic Terms & Session Lifecycle</h2>
              <p className="text-xs text-rose-100">
                Configure term dates, manage active session progression, and set up academic calendars
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
          {/* Feedback Message */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  {feedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* Current Active Term Overview Banner */}
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

              {/* Progress Bar */}
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

          {/* Academic Year Filter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#800000]">calendar_today</span>
                <span>Academic Year:</span>
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000] font-semibold text-slate-800"
              >
                <option value="ALL">All Academic Years</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Current Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {isAuthorizedToManage ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const activeY = years.find((y) => y.isCurrent) || years[0];
                    setInitForm({
                      academicYearId: activeY ? activeY.id : '',
                      termNumber: 1,
                      name: activeY ? `Term 1 - ${activeY.name}` : 'Term 1',
                      startDate: activeY ? activeY.startDate.split('T')[0] : '',
                      endDate: '',
                      isCurrent: true,
                    });
                    setInitStep('CONFIG');
                    setShowInitModal(true);
                  }}
                  className="px-4 py-2 bg-[#800000] hover:bg-[#600000] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-[#800000]/20 hover:ring-[#800000]/40"
                  title="Initialize a new academic term (Restricted to Super Admin, Admin, and Headteacher)"
                >
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>Initialize New Term</span>
                </button>

                <button
                  onClick={() => {
                    setShowCreateYearForm(true);
                    setShowCreateTermForm(false);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>+ New Academic Year</span>
                </button>

                <button
                  onClick={() => openReopenNotificationModal()}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Broadcast official school reopening date and directives to all parents"
                >
                  <span className="material-symbols-outlined text-[16px]">campaign</span>
                  <span>📢 Broadcast School Opening Date</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
                <span>Term initialization is restricted to Super Admin, Admin, and Headteacher.</span>
              </div>
            )}
          </div>

          {/* Inline Form: Create Academic Year */}
          {showCreateYearForm && (
            <form
              onSubmit={handleCreateYear}
              className="p-4 rounded-xl border border-rose-300 bg-rose-50/60 shadow-xs space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#800000] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                  <span>Create New Academic Year</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateYearForm(false)}
                  className="text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Year Name (e.g. 2026)</label>
                  <input
                    type="text"
                    required
                    value={newYear.name}
                    onChange={(e) => setNewYear({ ...newYear, name: e.target.value })}
                    placeholder="2026"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Year Opening Date</label>
                  <input
                    type="date"
                    required
                    value={newYear.startDate}
                    onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Year Closing Date</label>
                  <input
                    type="date"
                    required
                    value={newYear.endDate}
                    onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newYear.isCurrent}
                    onChange={(e) => setNewYear({ ...newYear, isCurrent: e.target.checked })}
                    className="rounded text-[#800000] focus:ring-[#800000]"
                  />
                  <span>Set as Current Active Academic Year</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateYearForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingYear}
                    className="px-4 py-1.5 bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{creatingYear ? 'Saving Year...' : 'Save Academic Year'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Inline Form: Create Academic Term */}
          {showCreateTermForm && (
            <form
              onSubmit={handleCreateTerm}
              className="p-4 rounded-xl border border-rose-300 bg-rose-50/60 shadow-xs space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#800000] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                  <span>Create New Academic Term</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateTermForm(false)}
                  className="text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    required
                    value={newTerm.academicYearId}
                    onChange={(e) => setNewTerm({ ...newTerm, academicYearId: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  >
                    <option value="" disabled>
                      -- Select Academic Year --
                    </option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.isCurrent ? '(Active Year)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Term Number</label>
                  <select
                    value={newTerm.termNumber}
                    onChange={(e) =>
                      setNewTerm({
                        ...newTerm,
                        termNumber: Number(e.target.value),
                        name: `Term ${e.target.value}`,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Term Display Name</label>
                  <input
                    type="text"
                    required
                    value={newTerm.name}
                    onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                    placeholder="Term 1 - 2026"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Term Opening Date</label>
                  <input
                    type="date"
                    required
                    value={newTerm.startDate}
                    onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Term Closing Date</label>
                  <input
                    type="date"
                    required
                    value={newTerm.endDate}
                    onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                  />
                </div>

                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTerm.isCurrent}
                      onChange={(e) => setNewTerm({ ...newTerm, isCurrent: e.target.checked })}
                      className="rounded text-[#800000] focus:ring-[#800000]"
                    />
                    <span>Set as Active Term</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
                <button
                  type="button"
                  onClick={() => setShowCreateTermForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTerm}
                  className="px-4 py-1.5 bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{creatingTerm ? 'Creating Term...' : 'Create Academic Term'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Configured Academic Terms List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#800000]">date_range</span>
                <span>Configured Academic Terms</span>
              </h3>
              <span className="text-xs text-slate-500">Updates sync school registers & fee structures</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[28px] animate-spin text-[#800000]">progress_activity</span>
                <span>Loading term configurations...</span>
              </div>
            ) : terms.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-[36px] text-slate-300">event_busy</span>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">No terms configured yet</p>
                  <p className="text-slate-500">Create an academic year or add terms above to get started.</p>
                </div>
                {canManageTerms && (
                  <button
                    onClick={() => {
                      if (years.length === 0) {
                        setShowCreateYearForm(true);
                      } else {
                        setShowCreateTermForm(true);
                      }
                    }}
                    className="px-4 py-2 bg-[#800000] text-white font-bold rounded-xl text-xs hover:bg-[#660000] transition-colors cursor-pointer"
                  >
                    + Create First Term
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {terms.map((term) => {
                  const edit = editDates[term.id] || {
                    startDate: term.startDate ? term.startDate.split('T')[0] : '',
                    endDate: term.endDate ? term.endDate.split('T')[0] : '',
                    name: term.name || '',
                    termNumber: term.termNumber || 1,
                  };
                  const isCurrent = term.isCurrent;
                  const isSaving = savingId === term.id;
                  const termYear = years.find((y) => y.id === term.academicYearId);

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
                            placeholder="Term Name"
                          />
                          {termYear && (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              Year {termYear.name}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#800000] text-white uppercase tracking-wider">
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
                          {canManageTerms && (
                            <button
                              onClick={() => openReopenNotificationModal(term.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Broadcast reopening notice & directives to parents for this term"
                            >
                              <span className="material-symbols-outlined text-[14px]">campaign</span>
                              <span>Notify Parents</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Term Number
                          </label>
                          <select
                            value={edit.termNumber}
                            onChange={(e) => handleDateChange(term.id, 'termNumber', Number(e.target.value))}
                            disabled={!canManageTerms}
                            className="w-full px-3 py-1.5 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                          >
                            <option value={1}>Term 1</option>
                            <option value={2}>Term 2</option>
                            <option value={3}>Term 3</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Opening / Start Date
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
                            Closing / End Date
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
                              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
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

        {/* Reopening Notification Modal for School Admin */}
        {showNotifyModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header */}
              <div className="bg-[#800000] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20 shrink-0">
                    <span className="material-symbols-outlined text-[24px]">campaign</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">Broadcast School Opening Notice</h3>
                    <p className="text-xs text-rose-100">Official Grace Seeds School Parent Reopening Directives</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifyModal(false)}
                  className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleBroadcastReopeningNotice} className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Academic Term Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Academic Term
                    </label>
                    <select
                      value={notifyingTermId}
                      onChange={(e) => {
                        const tId = e.target.value;
                        setNotifyingTermId(tId);
                        const sel = terms.find((t) => t.id === tId);
                        if (sel?.startDate) {
                          setNotifyOpeningDate(sel.startDate.split('T')[0]);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000] font-semibold text-slate-800"
                    >
                      {terms.map((t) => {
                        const y = years.find((yr) => yr.id === t.academicYearId);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} {y ? `(${y.name})` : ''} {t.isCurrent ? '· Active' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Learner Reporting Time
                    </label>
                    <input
                      type="text"
                      required
                      value={notifyReportingTime}
                      onChange={(e) => setNotifyReportingTime(e.target.value)}
                      placeholder="7:45 AM"
                      className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000]"
                    />
                  </div>
                </div>

                {/* Reopening Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official School Reopening / Reporting Date
                  </label>
                  <input
                    type="date"
                    required
                    value={notifyOpeningDate}
                    onChange={(e) => setNotifyOpeningDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000] font-bold text-[#800000]"
                  />
                  {notifyOpeningDate && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-emerald-700">event</span>
                      <span>
                        Reopening on:{' '}
                        <strong className="text-slate-800">
                          {new Date(notifyOpeningDate).toLocaleDateString('en-GB', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                    </p>
                  )}
                </div>

                {/* Directives & Reminders */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reporting Directives &amp; Guidelines for Parents
                  </label>
                  <textarea
                    rows={4}
                    value={notifyCustomNotes}
                    onChange={(e) => setNotifyCustomNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800000] font-mono leading-relaxed"
                    placeholder="Enter directives for uniform, books, bus routes, fees..."
                  />
                </div>

                {/* Broadcast Channels */}
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                    Distribution Channels:
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="rounded text-[#800000] focus:ring-[#800000] h-4 w-4"
                    />
                    <span>Publish Official High-Priority Notice to Parent Portal Board (Pinned)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={notifySendSms}
                      onChange={(e) => setNotifySendSms(e.target.checked)}
                      className="rounded text-[#800000] focus:ring-[#800000] h-4 w-4"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-[#800000]">sms</span>
                      <span>Dispatch Instant SMS Alert to Registered Parent Contact Numbers</span>
                    </span>
                  </label>
                </div>

                {/* Live Preview Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Live Announcement Preview:
                  </span>
                  <div className="font-bold text-[#800000] text-xs">
                    📢 Official School Reopening Notice -{' '}
                    {(terms.find((t) => t.id === notifyingTermId) || terms[0])?.name || 'Term'}
                  </div>
                  <div className="text-[11px] text-slate-600 line-clamp-3">
                    Dear Parents and Guardians, Grace Seeds School will officially reopen on{' '}
                    {notifyOpeningDate
                      ? new Date(notifyOpeningDate).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '[Opening Date]'}{' '}
                    by {notifyReportingTime}. Full directives have been published to your parent dashboard.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowNotifyModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={notifyBroadcasting || !notifyOpeningDate}
                    className="px-5 py-2 bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {notifyBroadcasting ? 'progress_activity' : 'send'}
                    </span>
                    <span>
                      {notifyBroadcasting ? 'Broadcasting Notice...' : '📢 Broadcast Notice to Parents'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dedicated Initialize New Term Modal with Confirmation Step and Post-Success Details */}
        {showInitModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-[#800000] text-white px-5 py-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px]">verified_user</span>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight">Initialize New Academic Term</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-semibold">
                        SUPER ADMIN • ADMIN • HEADTEACHER ONLY
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowInitModal(false);
                    setInitStep('CONFIG');
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Step 1: Configuration */}
              {initStep === 'CONFIG' && (
                <form onSubmit={handleProceedToConfirmInit} className="p-5 overflow-y-auto space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0">shield</span>
                    <div>
                      <span className="font-bold block text-amber-950">Safe Session Initialization & Historical Preservation:</span>
                      <span>
                        Previous terms' examination marks, report cards, fee transactions, receipts, and student attendance records are preserved completely and will remain fully accessible in historical ledgers.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Academic Year <span className="text-rose-600">*</span>
                      </label>
                      <select
                        required
                        value={initForm.academicYearId}
                        onChange={(e) => {
                          const yId = e.target.value;
                          const foundY = years.find((y) => y.id === yId);
                          setInitForm({
                            ...initForm,
                            academicYearId: yId,
                            name: foundY ? `Term ${initForm.termNumber} - ${foundY.name}` : `Term ${initForm.termNumber}`,
                          });
                        }}
                        className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#800000] font-semibold text-slate-800"
                      >
                        <option value="" disabled>-- Select Academic Year --</option>
                        {years.map((y) => (
                          <option key={y.id} value={y.id}>
                            Academic Year {y.name} {y.isCurrent ? '(Current Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Term Number <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={initForm.termNumber}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          const foundY = years.find((y) => y.id === initForm.academicYearId);
                          setInitForm({
                            ...initForm,
                            termNumber: num,
                            name: foundY ? `Term ${num} - ${foundY.name}` : `Term ${num}`,
                          });
                        }}
                        className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#800000] font-semibold text-slate-800"
                      >
                        <option value={1}>Term 1</option>
                        <option value={2}>Term 2</option>
                        <option value={3}>Term 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Term Display Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={initForm.name}
                        onChange={(e) => setInitForm({ ...initForm, name: e.target.value })}
                        placeholder="Term 1 - 2026"
                        className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#800000] font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Term Start Date <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={initForm.startDate}
                        onChange={(e) => setInitForm({ ...initForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#800000] font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Term Closing Date <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={initForm.endDate}
                        onChange={(e) => setInitForm({ ...initForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-[#F8F5F5] border border-slate-300 rounded-xl focus:ring-1 focus:ring-[#800000] font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={initForm.isCurrent}
                        onChange={(e) => setInitForm({ ...initForm, isCurrent: e.target.checked })}
                        className="rounded text-[#800000] focus:ring-[#800000]"
                      />
                      <span>Set as Current Active Session for Grace Seeds School</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowInitModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#800000] hover:bg-[#600000] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Proceed to Confirmation</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Confirmation Step */}
              {initStep === 'CONFIRM' && (
                <div className="p-5 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#800000] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Review Term Initialization Details</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Academic Year:</span>
                        <span className="font-bold text-slate-900">
                          {years.find((y) => y.id === initForm.academicYearId)?.name || 'Selected Year'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Session Name:</span>
                        <span className="font-bold text-slate-900">{initForm.name} (Term {initForm.termNumber})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Start Date:</span>
                        <span className="font-semibold text-slate-800">{initForm.startDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Closing Date:</span>
                        <span className="font-semibold text-slate-800">{initForm.endDate}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Active Term Status:</span>
                        <span className="font-bold text-emerald-700">
                          {initForm.isCurrent ? 'Will become current active session' : 'Will be created as upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-rose-700 shrink-0">warning</span>
                    <span>
                      Please confirm that these dates and term sequence are authorized by school management. An audit log capturing your identity, role, and client network will be permanently registered.
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setInitStep('CONFIG')}
                      disabled={initializingTerm}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmInitializeTerm}
                      disabled={initializingTerm}
                      className="px-5 py-2.5 bg-[#800000] hover:bg-[#600000] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {initializingTerm ? 'progress_activity' : 'check_circle'}
                      </span>
                      <span>{initializingTerm ? 'Initializing Term...' : 'Confirm & Initialize Term'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Success Screen with Created Term Details */}
              {initStep === 'SUCCESS' && (
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[32px]">check_circle</span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900">Academic Term Initialized Successfully!</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      The new academic term is now live for Grace Seeds School with full historical preservation.
                    </p>
                  </div>

                  {initializedTermData && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500 font-semibold">Term Name:</span>
                        <span className="font-bold text-slate-900">{initializedTermData.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500 font-semibold">Term Number:</span>
                        <span className="font-bold text-slate-900">Term {initializedTermData.termNumber}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500 font-semibold">Term ID:</span>
                        <span className="font-mono text-slate-700">{initializedTermData.id}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="text-slate-500 font-semibold">Duration:</span>
                        <span className="font-semibold text-slate-800">
                          {initializedTermData.startDate ? initializedTermData.startDate.split('T')[0] : '—'} to{' '}
                          {initializedTermData.endDate ? initializedTermData.endDate.split('T')[0] : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Active Session Status:</span>
                        <span className="font-bold text-emerald-700">
                          {initializedTermData.isCurrent ? 'ACTIVE / CURRENT SESSION' : 'UPCOMING'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInitModal(false);
                        setInitStep('CONFIG');
                      }}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInitModal(false);
                        setInitStep('CONFIG');
                        if (initializedTermData) {
                          openReopenNotificationModal(initializedTermData.id);
                        }
                      }}
                      className="px-5 py-2.5 bg-[#800000] hover:bg-[#600000] text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">campaign</span>
                      <span>📢 Broadcast School Reopening Notice</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
