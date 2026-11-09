import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { WholeTermSchoolReportModal } from '../modals/WholeTermSchoolReportModal';

interface DailyAttendanceOverviewCardProps {
  onNavigateTab: (tab: string) => void;
  title?: string;
  theme?: 'maroon' | 'purple';
  showWholeTermReport?: boolean;
}

interface AbsentLearner {
  registerId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  streamName?: string;
  date: string;
  status: 'ABSENT' | 'EXCUSED' | 'SICK';
  remarks: string;
  followUp?: {
    contactedAt?: string;
    contactMethod?: 'PHONE_CALL' | 'SMS' | 'WHATSAPP' | 'IN_PERSON';
    contactedByName?: string;
    guardianResponse?: string;
    resolutionStatus?: 'PENDING' | 'RESOLVED' | 'ESCALATED_TO_HEADTEACHER';
    assignedTo?: string;
    notes?: string;
  } | null;
}

export const DailyAttendanceOverviewCard: React.FC<DailyAttendanceOverviewCardProps> = ({
  onNavigateTab,
  title = 'Daily Attendance & Management Roll Call Overview',
  theme = 'maroon',
  showWholeTermReport = true
}) => {
  const { user } = useAuth();
  const isHeadTeacher = user?.role === UserRole.HEAD_TEACHER || user?.role === UserRole.DEPUTY_HEAD_TEACHER;
  const canShowWholeTermReport = showWholeTermReport && !isHeadTeacher;
  const todayIso = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    expectedLearners: 0,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    completedRegisters: 0,
    unmarkedRegisters: 0,
    totalExpectedRegisters: 0,
    unmarkedLearners: 0,
    presentPercentage: 0,
    absentLearnersList: [] as AbsentLearner[]
  });

  // Drill-down Modal State
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [selectedLearnerForFollowUp, setSelectedLearnerForFollowUp] = useState<AbsentLearner | null>(null);
  const [followUpContactMethod, setFollowUpContactMethod] = useState<'PHONE_CALL' | 'SMS' | 'WHATSAPP' | 'IN_PERSON'>('PHONE_CALL');
  const [followUpGuardianResponse, setFollowUpGuardianResponse] = useState('');
  const [followUpAssignedTo, setFollowUpAssignedTo] = useState('');
  const [followUpResolution, setFollowUpResolution] = useState<'PENDING' | 'RESOLVED' | 'ESCALATED_TO_HEADTEACHER'>('RESOLVED');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [followUpSuccessMsg, setFollowUpSuccessMsg] = useState<string | null>(null);

  // Attendance Trends & Whole-Term Report Modal States
  const [isTrendsModalOpen, setIsTrendsModalOpen] = useState(false);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [isWholeTermReportModalOpen, setIsWholeTermReportModalOpen] = useState(false);

  const loadTrends = async () => {
    setIsTrendsModalOpen(true);
    setLoadingTrends(true);
    try {
      const res = await apiService.getAttendanceTrends({ days: 14 });
      if (res.data) setTrendsData(res.data);
    } catch (err) {
      console.error('Failed to load attendance trends:', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, classesRes] = await Promise.all([
        apiService.getDashboardAnalytics({
          date: selectedDate,
          classRoomId: selectedClassId || undefined
        }).catch(() => null),
        apiService.getClasses().catch(() => null)
      ]);

      if (classesRes?.data && Array.isArray(classesRes.data)) {
        setAvailableClasses(classesRes.data);
      }

      if (analyticsRes?.data?.attendanceSummary) {
        const att = analyticsRes.data.attendanceSummary;
        setMetrics({
          expectedLearners: att.expectedLearners ?? 0,
          present: att.present ?? 0,
          late: att.late ?? 0,
          absent: att.absent ?? 0,
          excused: att.excused ?? 0,
          completedRegisters: att.completedRegisters ?? 0,
          unmarkedRegisters: att.unmarkedRegisters ?? 0,
          totalExpectedRegisters: att.totalExpectedRegisters ?? 0,
          unmarkedLearners: att.unmarkedLearners ?? 0,
          presentPercentage: att.presentPercentage ?? 0,
          absentLearnersList: att.absentLearnersList || []
        });
      }
    } catch (err) {
      console.error('Error loading daily attendance figures:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedClassId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reactive listener for when teachers save registers
  useEffect(() => {
    const handleSync = () => loadData();
    window.addEventListener('smartshule:attendance-updated', handleSync);
    return () => window.removeEventListener('smartshule:attendance-updated', handleSync);
  }, [loadData]);

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLearnerForFollowUp) return;
    setIsSavingFollowUp(true);
    try {
      await apiService.recordAttendanceFollowUp(
        selectedLearnerForFollowUp.registerId,
        selectedLearnerForFollowUp.studentId,
        {
          contactMethod: followUpContactMethod,
          guardianResponse: followUpGuardianResponse,
          assignedTo: followUpAssignedTo,
          resolutionStatus: followUpResolution,
          notes: followUpNotes
        }
      );
      setFollowUpSuccessMsg('Guardian follow-up successfully recorded and logged in database!');
      setTimeout(() => {
        setFollowUpSuccessMsg(null);
        setSelectedLearnerForFollowUp(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to record absence follow-up');
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const primaryBg = 'bg-white text-slate-900';
  const headerBtn = 'bg-[#7a1228] text-white hover:bg-[#5e0d1e]';

  return (
    <div className={`rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 ${primaryBg}`}>
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7a1228] text-2xl">verified</span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">{title}</h2>
          </div>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            Official daily roll-call tracking: expected enrollment, present, absent, late, excused, and register completion.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
            <span className="material-symbols-outlined text-slate-600 text-base">calendar_today</span>
            <input
              type="date"
              aria-label="Filter by Attendance Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs">
            <span className="material-symbols-outlined text-slate-600 text-base">meeting_room</span>
            <select
              aria-label="Filter by Class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="">All Classes (School-wide)</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-800 transition-all cursor-pointer"
            title="Refresh Attendance Stats"
            type="button"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>

          {/* Attendance Trends Button */}
          <button
            onClick={loadTrends}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-800"
            type="button"
            title="View 14-day attendance trends, chronic absentees, and unresolved follow-ups"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">trending_up</span>
            <span className="hidden sm:inline">Trends &amp; Absentees</span>
          </button>

          {/* Whole-Term Executive Report Button */}
          {canShowWholeTermReport && (
            <button
              onClick={() => setIsWholeTermReportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-800"
              type="button"
              title="Generate official printable Grace Seeds School end-of-term summary report"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
              <span className="hidden sm:inline">Whole-Term Report</span>
            </button>
          )}

          {/* Open Register Button */}
          <button
            onClick={() => onNavigateTab('attendance-register')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${headerBtn}`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
            <span>Mark Register</span>
          </button>
        </div>
      </div>

      {/* Attendance Not Yet Recorded Notification Banner */}
      {metrics.completedRegisters === 0 && metrics.present === 0 && metrics.absent === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <span className="material-symbols-outlined text-base text-amber-600">info</span>
          <span>Attendance not yet recorded for {selectedDate}. Class teachers mark roll calls through the Attendance Register portal.</span>
        </div>
      )}

      {/* Daily Figures Grid: 7 Standard Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Expected Enrolled */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Expected Enrolled</span>
          <div className="my-1">
            <span className="text-xl font-black font-data-mono text-slate-900">{metrics.expectedLearners}</span>
            <span className="text-[10px] text-slate-600 font-bold ml-1">pupils</span>
          </div>
          <span className="text-[10px] text-slate-700 font-semibold">Active roster</span>
        </div>

        {/* 2. Present Learners */}
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col justify-between">
          <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Present
          </span>
          <div className="my-1">
            <span className="text-xl font-black font-data-mono text-emerald-800">
              {metrics.completedRegisters > 0 ? metrics.present : '--'}
            </span>
            <span className="text-[10px] text-emerald-800 font-bold ml-1">in school</span>
          </div>
          <span className="text-[10px] text-emerald-900 font-bold">
            {metrics.completedRegisters > 0 ? `${metrics.presentPercentage}% attendance` : 'Not recorded'}
          </span>
        </div>

        {/* 3. Absent Learners */}
        <div
          onClick={() => metrics.absent > 0 && setIsDrillDownOpen(true)}
          className={`p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex flex-col justify-between ${metrics.absent > 0 ? 'cursor-pointer hover:bg-rose-100' : ''}`}
          title={metrics.absent > 0 ? 'Click to view absent learners drill-down' : ''}
        >
          <span className="text-[10px] font-black text-rose-900 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              Absent
            </span>
            {metrics.absent > 0 && <span className="text-[9px] text-rose-800 font-black underline">Drill down →</span>}
          </span>
          <div className="my-1">
            <span className="text-xl font-black font-data-mono text-rose-800">
              {metrics.completedRegisters > 0 ? metrics.absent : '--'}
            </span>
            <span className="text-[10px] text-rose-800 font-bold ml-1">unexcused</span>
          </div>
          <span className="text-[10px] text-rose-900 font-bold">Immediate follow-up</span>
        </div>

        {/* 4. Late Arrivals */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col justify-between">
          <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            Late Arrivals
          </span>
          <div className="my-1">
            <span className="text-xl font-black font-data-mono text-amber-800">
              {metrics.completedRegisters > 0 ? metrics.late : '--'}
            </span>
            <span className="text-[10px] text-amber-800 font-bold ml-1">arrived late</span>
          </div>
          <span className="text-[10px] text-amber-950 font-bold">Logged after bell</span>
        </div>

        {/* 5. Excused Absences */}
        <div
          onClick={() => metrics.excused > 0 && setIsDrillDownOpen(true)}
          className={`p-3.5 rounded-xl bg-blue-50 border border-blue-300 flex flex-col justify-between ${metrics.excused > 0 ? 'cursor-pointer hover:bg-blue-100' : ''}`}
          title={metrics.excused > 0 ? 'Click to view excused absences drill-down' : ''}
        >
          <span className="text-[10px] font-black text-blue-950 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              Excused
            </span>
            {metrics.excused > 0 && <span className="text-[9px] text-blue-800 font-black underline">Notes →</span>}
          </span>
          <div className="my-1">
            <span className="text-xl font-black font-data-mono text-blue-800">
              {metrics.completedRegisters > 0 ? metrics.excused : '--'}
            </span>
            <span className="text-[10px] text-blue-800 font-bold ml-1">medical / leave</span>
          </div>
          <span className="text-[10px] text-blue-950 font-bold">Documented reasons</span>
        </div>

        {/* 6. Completed Registers */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Completed Registers</span>
          <div className="my-1">
            <span className="text-xl font-black font-data-mono text-slate-900">{metrics.completedRegisters}</span>
            <span className="text-[10px] text-slate-600 font-bold ml-1">/ {metrics.totalExpectedRegisters}</span>
          </div>
          <span className="text-[10px] text-emerald-800 font-bold">
            {metrics.totalExpectedRegisters > 0 ? `${Math.round((metrics.completedRegisters / metrics.totalExpectedRegisters) * 100)}% completed` : 'All completed'}
          </span>
        </div>

        {/* 7. Unmarked Registers */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Unmarked Registers</span>
          <div className="my-1">
            <span className={`text-xl font-black font-data-mono ${metrics.unmarkedRegisters > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
              {metrics.unmarkedRegisters}
            </span>
            <span className="text-[10px] text-slate-600 font-bold ml-1">classes</span>
          </div>
          <span className={`text-[10px] font-bold ${metrics.unmarkedRegisters > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            {metrics.unmarkedRegisters > 0 ? 'Awaiting teacher submission' : 'All classes submitted'}
          </span>
        </div>
      </div>

      {/* Drill-down Button & Absentee Summary Banner */}
      {metrics.absentLearnersList.length > 0 && (
        <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-lg">error_outline</span>
            <span>
              <strong>{metrics.absentLearnersList.length} total absent/excused learner(s)</strong> recorded for {selectedDate}.
            </span>
          </div>
          <button
            onClick={() => setIsDrillDownOpen(true)}
            className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs font-bold hover:bg-surface-container text-[#7a1228] transition-colors cursor-pointer"
            type="button"
          >
            Open Absentee Drill-Down & Follow-Up Modal
          </button>
        </div>
      )}

      {/* DRILL DOWN & FOLLOW-UP MODAL */}
      {isDrillDownOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#7a1228] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">contact_phone</span>
                  Daily Absentee Register & Guardian Follow-Up Roster
                </h3>
                <p className="text-xs text-rose-100 mt-0.5">
                  Grace Seeds School · Date: {selectedDate} · Reviewing {metrics.absentLearnersList.length} Absent/Excused Records
                </p>
              </div>
              <button
                onClick={() => { setIsDrillDownOpen(false); setSelectedLearnerForFollowUp(null); }}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                title="Close modal"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body: List of absentees */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {metrics.absentLearnersList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No absentees recorded for this date.
                </div>
              ) : (
                metrics.absentLearnersList.map((learner) => (
                  <div
                    key={`${learner.registerId}-${learner.studentId}`}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">{learner.studentName}</span>
                        <span className="text-xs font-mono text-gray-500">({learner.admissionNumber || 'No Adm'})</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-800">
                          {learner.className} {learner.streamName ? `(${learner.streamName})` : ''}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${learner.status === 'ABSENT' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}`}>
                          {learner.status === 'ABSENT' ? 'Unexcused Absence' : 'Excused / Medical'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 bg-white p-2 rounded-lg border border-gray-100">
                        <strong>Reason:</strong> {learner.remarks || 'No specific explanation entered'}
                      </div>
                      {learner.followUp ? (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                          <strong>Follow-Up:</strong> Contacted via {learner.followUp.contactMethod} by {learner.followUp.contactedByName} &mdash; <em>"{learner.followUp.guardianResponse || 'Response logged'}"</em> ({learner.followUp.resolutionStatus})
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-700 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          <span>No parent contact recorded yet.</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedLearnerForFollowUp(learner);
                        setFollowUpGuardianResponse(learner.followUp?.guardianResponse || '');
                        setFollowUpContactMethod(learner.followUp?.contactMethod || 'PHONE_CALL');
                        setFollowUpResolution(learner.followUp?.resolutionStatus || 'RESOLVED');
                        setFollowUpAssignedTo(learner.followUp?.assignedTo || '');
                        setFollowUpNotes(learner.followUp?.notes || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shrink-0 flex items-center gap-1 cursor-pointer self-end sm:self-auto"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">call</span>
                      <span>{learner.followUp ? 'Update Follow-Up' : 'Record Parent Contact'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-100 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => { setIsDrillDownOpen(false); setSelectedLearnerForFollowUp(null); }}
                className="px-4 py-2 bg-gray-300 text-gray-800 font-semibold text-xs rounded-xl hover:bg-gray-400 transition-colors cursor-pointer"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP SUB-MODAL */}
      {selectedLearnerForFollowUp && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Parent Contact & Absence Follow-Up</h4>
                <p className="text-[11px] text-emerald-100">{selectedLearnerForFollowUp.studentName} ({selectedLearnerForFollowUp.className})</p>
              </div>
              <button
                onClick={() => setSelectedLearnerForFollowUp(null)}
                className="text-white hover:text-emerald-200 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="p-5 space-y-3 text-xs">
              {followUpSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  {followUpSuccessMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Method:</label>
                <select
                  value={followUpContactMethod}
                  onChange={(e: any) => setFollowUpContactMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="PHONE_CALL">Direct Phone Call</option>
                  <option value="SMS">Official SMS Notification</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="IN_PERSON">In-Person Meeting at School</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Parent / Guardian Response:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Parent confirmed learner is sick with malaria and will return on Thursday with clinic note."
                  value={followUpGuardianResponse}
                  onChange={(e) => setFollowUpGuardianResponse(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Resolution Status:</label>
                  <select
                    value={followUpResolution}
                    onChange={(e: any) => setFollowUpResolution(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="RESOLVED">Resolved (Excused)</option>
                    <option value="PENDING">Pending Further Follow-up</option>
                    <option value="ESCALATED_TO_HEADTEACHER">Escalate to Head Teacher</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Follow-Up Staff:</label>
                  <input
                    type="text"
                    placeholder="e.g. Tr. Sarah / Deputy"
                    value={followUpAssignedTo}
                    onChange={(e) => setFollowUpAssignedTo(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Internal Management Notes:</label>
                <input
                  type="text"
                  placeholder="Optional notes for administration records"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedLearnerForFollowUp(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFollowUp}
                  className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingFollowUp ? 'Saving...' : 'Save Follow-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Whole-Term School Report Modal */}
      <WholeTermSchoolReportModal
        isOpen={isWholeTermReportModalOpen}
        onClose={() => setIsWholeTermReportModalOpen(false)}
      />

      {/* Attendance Trends & Chronic Absentees Modal */}
      {isTrendsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full border border-outline-variant shadow-2xl p-6 my-auto text-on-surface space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-2xl">trending_up</span>
                <div>
                  <h3 className="text-base font-black">14-Day Attendance Trends &amp; Chronic Absenteeism Analysis</h3>
                  <p className="text-xs text-on-surface-variant">Daily roll-call patterns, persistent absences, and open guardian communications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTrendsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {loadingTrends ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-amber-700">Analyzing school attendance trends...</p>
              </div>
            ) : trendsData ? (
              <div className="space-y-5">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">14-Day Average Attendance</span>
                    <div className="text-lg font-black text-emerald-700 mt-0.5">{trendsData.summaryMetrics.averageDailyAttendanceRate}%</div>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">Total Absence Incidents</span>
                    <div className="text-lg font-black text-rose-700 mt-0.5">{trendsData.summaryMetrics.totalAbsenceIncidents}</div>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">Chronic Absentee Learners</span>
                    <div className="text-lg font-black text-amber-700 mt-0.5">{trendsData.summaryMetrics.chronicAbsenteeCount}</div>
                  </div>
                  <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase">Unresolved Follow-ups</span>
                    <div className="text-lg font-black text-purple-700 mt-0.5">{trendsData.summaryMetrics.unresolvedFollowUpsCount}</div>
                  </div>
                </div>

                {/* Chronic Absentees Table (High Priority) */}
                <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-rose-700">warning</span>
                      Chronic Absenteeism Intervention List (3+ Absences)
                    </h4>
                    <span className="text-[11px] font-bold text-rose-700">{trendsData.chronicAbsentees.length} learner(s) flagged</span>
                  </div>

                  {trendsData.chronicAbsentees.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No learners have reached the chronic absence threshold (3+ absences) in this period.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-rose-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-rose-100/70 text-rose-950 font-black text-[11px]">
                          <tr>
                            <th className="p-2.5">Learner Name</th>
                            <th className="p-2.5">Adm No</th>
                            <th className="p-2.5">Class</th>
                            <th className="p-2.5 text-center">Absences</th>
                            <th className="p-2.5">Latest Remarks</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">
                          {trendsData.chronicAbsentees.map((ca: any) => (
                            <tr key={ca.studentId} className="hover:bg-rose-50/50">
                              <td className="p-2.5 font-bold text-slate-900">{ca.studentName}</td>
                              <td className="p-2.5 font-mono text-slate-600">{ca.admissionNumber || '—'}</td>
                              <td className="p-2.5 text-slate-700">{ca.className}</td>
                              <td className="p-2.5 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                  {ca.absenceCount} days
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600 italic max-w-xs truncate">{ca.latestRemarks || 'No recorded reason'}</td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsTrendsModalOpen(false);
                                    setSelectedLearnerForFollowUp({
                                      registerId: '',
                                      studentId: ca.studentId,
                                      studentName: ca.studentName,
                                      admissionNumber: ca.admissionNumber,
                                      className: ca.className,
                                      date: ca.dates[ca.dates.length - 1] || todayIso,
                                      status: 'ABSENT',
                                      remarks: ca.latestRemarks || 'Chronic absenteeism follow-up',
                                      followUp: ca.latestFollowUp
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Follow Up
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 14-Day Daily Trends Breakdown */}
                <div className="border border-outline-variant/30 rounded-xl p-4 space-y-3 bg-surface-container-low/40">
                  <h4 className="text-xs font-black uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-slate-600">bar_chart</span>
                    Daily Attendance Percentage Progression
                  </h4>

                  <div className="overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container text-on-surface-variant font-bold text-[11px]">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-center">Present</th>
                          <th className="p-2.5 text-center">Late</th>
                          <th className="p-2.5 text-center">Absent</th>
                          <th className="p-2.5 text-center">Excused</th>
                          <th className="p-2.5 text-center">Total Marked</th>
                          <th className="p-2.5 text-right">Attendance Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20">
                        {trendsData.dailyTrends.map((d: any) => (
                          <tr key={d.date} className="hover:bg-surface-container-low">
                            <td className="p-2.5 font-bold font-mono text-slate-800">{d.date}</td>
                            <td className="p-2.5 text-center text-emerald-700 font-bold">{d.present}</td>
                            <td className="p-2.5 text-center text-amber-700 font-bold">{d.late}</td>
                            <td className="p-2.5 text-center text-rose-700 font-bold">{d.absent}</td>
                            <td className="p-2.5 text-center text-blue-700 font-bold">{d.excused}</td>
                            <td className="p-2.5 text-center font-bold text-slate-700">{d.totalMarked}</td>
                            <td className="p-2.5 text-right font-black">
                              <span className={d.attendanceRate >= 90 ? 'text-emerald-700' : d.attendanceRate >= 75 ? 'text-amber-700' : 'text-rose-700'}>
                                {d.attendanceRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
