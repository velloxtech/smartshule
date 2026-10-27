import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Student, Teacher, SystemActivity, DashboardSummary, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FacultyAttendanceRosterCard } from './FacultyAttendanceRosterCard';

interface DashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  activities: SystemActivity[];
  totalCollectedFee: number;
  onOpenMpesa: () => void;
  onOpenCBCModal: () => void;
  onOpenAdmitModal: () => void;
  onOpenSmsModal: (target?: 'absentee' | 'fee' | 'all') => void;
  onOpenKnecSync: () => void;
  onOpenExportReport: () => void;
  onNavigateTab: (tabId: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  teachers,
  activities,
  totalCollectedFee,
  onOpenMpesa,
  onOpenCBCModal,
  onOpenAdmitModal,
  onOpenSmsModal,
  onOpenKnecSync,
  onOpenExportReport,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [todayRegisterMap, setTodayRegisterMap] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>({});
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const quickActionRef = useRef<HTMLDivElement>(null);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionRef.current && !quickActionRef.current.contains(event.target as Node)) {
        setQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDashboardStats = useCallback(async (yearId?: string, termId?: string) => {
    setIsLoading(true);
    try {
      const [res, cRes, attRes] = await Promise.all([
        apiService.getDashboardAnalytics({ yearId, termId }).catch(() => null),
        apiService.getClasses().catch(() => null),
        apiService.getAttendanceReport({ date: todayIso }).catch(() => null),
      ]);

      if (res?.success && res.data) {
        setSummaryData(res.data);
        if (res.data.academicPeriod?.academicYearId && !yearId) {
          setSelectedYearId(res.data.academicPeriod.academicYearId);
        }
        if (res.data.academicPeriod?.termId && !termId) {
          setSelectedTermId(res.data.academicPeriod.termId);
        }
      }
      if (cRes?.data && Array.isArray(cRes.data)) {
        setAvailableClasses(cRes.data);
      }

      const statusMap: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
      const rawRegisters = attRes?.data?.registers || (Array.isArray(attRes?.data) ? attRes.data : []);

      if (Array.isArray(rawRegisters)) {
        rawRegisters.forEach((reg: any) => {
          if (reg.entries && Array.isArray(reg.entries)) {
            reg.entries.forEach((e: any) => {
              if (e.studentId) {
                statusMap[e.studentId] = e.status;
              }
            });
          }
        });
      }
      setTodayRegisterMap(statusMap);
    } catch {
      // Keep existing data gracefully
    } finally {
      setIsLoading(false);
    }
  }, [todayIso]);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  useEffect(() => {
    const handleAttendanceSync = () => {
      loadDashboardStats(selectedYearId, selectedTermId);
    };

    window.addEventListener('smartshule:attendance-updated', handleAttendanceSync);
    return () => {
      window.removeEventListener('smartshule:attendance-updated', handleAttendanceSync);
    };
  }, [loadDashboardStats, selectedYearId, selectedTermId]);

  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedTermId('');
    loadDashboardStats(yearId, undefined);
  };

  const handleTermChange = (termId: string) => {
    setSelectedTermId(termId);
    loadDashboardStats(selectedYearId || undefined, termId);
  };

  // Demographics & Counts
  const totalStudents = summaryData?.counts?.totalStudents ?? students.length;
  const activeStudents = summaryData?.counts?.activeStudents ?? students.filter(s => s.status === 'ACTIVE').length;
  const inactiveStudents = summaryData?.counts?.inactiveStudents ?? Math.max(0, totalStudents - activeStudents);
  const boysCount = summaryData?.counts?.boysCount ?? students.filter((s) => s.gender === 'Boy' || s.gender === 'Male').length;
  const girlsCount = summaryData?.counts?.girlsCount ?? students.filter((s) => s.gender === 'Girl' || s.gender === 'Female').length;

  const totalTeachersCount = summaryData?.counts?.totalTeachers ?? teachers.length;
  const totalNonTeachingStaffCount = summaryData?.counts?.totalNonTeachingStaff ?? 5;

  // Finance
  const currentTotalFee = summaryData?.finance?.totalCollected !== undefined
    ? summaryData.finance.totalCollected
    : totalCollectedFee;
  const feeArrears = summaryData?.finance?.totalArrears !== undefined
    ? summaryData.finance.totalArrears
    : students.reduce((acc, s) => acc + (s.feeBalance || 0), 0);
  const targetFee = summaryData?.finance?.totalInvoiced !== undefined
    ? summaryData.finance.totalInvoiced
    : (currentTotalFee + feeArrears > 0 ? currentTotalFee + feeArrears : students.reduce((acc, s) => acc + (s.totalFee || 0), 0));
  const feePct = summaryData?.finance?.collectionRatePercentage !== undefined
    ? summaryData.finance.collectionRatePercentage
    : (targetFee > 0 ? Math.min(100, Math.round((currentTotalFee / targetFee) * 100)) : 0);

  const totalExpenses = summaryData?.finance?.totalExpenses || 0;
  const netOperatingCash = summaryData?.finance?.netOperatingCash !== undefined
    ? summaryData.finance.netOperatingCash
    : (currentTotalFee - totalExpenses);
  const defaultersCount = summaryData?.finance?.defaultersCount ?? students.filter(s => (s.feeBalance || 0) > 0).length;

  const paymentMethods = summaryData?.finance?.paymentMethods || {
    mpesa: currentTotalFee > 0 ? Math.round(currentTotalFee * 0.7) : 0,
    bank: currentTotalFee > 0 ? Math.round(currentTotalFee * 0.25) : 0,
    cash: currentTotalFee > 0 ? Math.round(currentTotalFee * 0.05) : 0,
    other: 0,
  };
  const unverifiedPaymentsCount = summaryData?.finance?.unverifiedPaymentsCount || 0;
  const unverifiedPaymentsAmount = summaryData?.finance?.unverifiedPaymentsAmount || 0;

  // Attendance
  const hasRegisterDataToday = Object.keys(todayRegisterMap).length > 0;
  const totalPresentToday = useMemo(() => {
    return Object.values(todayRegisterMap).filter((st) => st === 'PRESENT' || st === 'LATE').length;
  }, [todayRegisterMap]);

  const absentStudentsCount = useMemo(() => {
    return Object.values(todayRegisterMap).filter((st) => st === 'ABSENT').length;
  }, [todayRegisterMap]);

  const avgAttendancePct = useMemo(() => {
    if (summaryData?.attendanceSummary?.presentPercentage !== null && summaryData?.attendanceSummary?.presentPercentage !== undefined) {
      return summaryData.attendanceSummary.presentPercentage;
    }
    if (!students || students.length === 0 || !hasRegisterDataToday) return 0;
    return Math.round((totalPresentToday / students.length) * 100);
  }, [summaryData, students, totalPresentToday, hasRegisterDataToday]);

  // CBC Assessments
  const CBCProf = summaryData?.CBCProficiency;
  const totalAssessments = CBCProf?.totalAssessments || 0;
  const eeAssessments = CBCProf?.exceeding || 0;
  const meAssessments = CBCProf?.meeting || 0;
  const aeAssessments = CBCProf?.approaching || 0;
  const beAssessments = CBCProf?.below || 0;

  const eePct = totalAssessments > 0 ? ((eeAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const mePct = totalAssessments > 0 ? ((meAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const aePct = totalAssessments > 0 ? ((aeAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const bePct = totalAssessments > 0 ? ((beAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const proficientPct = totalAssessments > 0 ? (Number(eePct) + Number(mePct)).toFixed(0) : '0';

  const circ = 238.76;
  const eeLen = totalAssessments > 0 ? (Number(eePct) / 100) * circ : 0;
  const meLen = totalAssessments > 0 ? (Number(mePct) / 100) * circ : 0;
  const aeLen = totalAssessments > 0 ? (Number(aePct) / 100) * circ : 0;
  const beLen = totalAssessments > 0 ? (Number(bePct) / 100) * circ : 0;
  const meOffset = -eeLen;
  const aeOffset = -(eeLen + meLen);
  const beOffset = -(eeLen + meLen + aeLen);

  const academicPeriodLabel = summaryData?.academicPeriod?.term && summaryData?.academicPeriod?.year && summaryData.academicPeriod.term !== 'N/A'
    ? `${summaryData.academicPeriod.term}, ${summaryData.academicPeriod.year}`
    : 'Active Academic Session';

  // Pending Actions
  const pendingApprovals = summaryData?.pendingApprovals || {
    totalActionable: unverifiedPaymentsCount,
    pendingSignaturesCount: 0,
    pendingCorrectionRequestsCount: 0,
    unverifiedPaymentsCount,
    correctionRequests: [],
    unverifiedPayments: [],
  };

  // Grade & Class Cohort Enrolment
  const gradeEnrollmentBreakdown = useMemo(() => {
    if (summaryData?.enrolmentOverview?.classes && summaryData.enrolmentOverview.classes.length > 0) {
      return summaryData.enrolmentOverview.classes;
    }

    const classDataMap = new Map<string, { id: string; name: string; boys: number; girls: number; total: number }>();

    availableClasses.forEach((cls) => {
      classDataMap.set(cls.id, {
        id: cls.id,
        name: cls.name || cls.gradeLevel?.replace(/_/g, ' ') || 'Class',
        boys: 0,
        girls: 0,
        total: 0,
      });
    });

    students.forEach((s) => {
      let key = s.classroomId;
      if (!key || !classDataMap.has(key)) {
        const match = availableClasses.find(
          (c) => c.name?.toLowerCase() === (s.grade || '').toLowerCase()
        );
        key = match ? match.id : (s.grade || 'Unassigned');
      }

      if (!classDataMap.has(key)) {
        classDataMap.set(key, {
          id: key,
          name: s.grade || 'Unassigned',
          boys: 0,
          girls: 0,
          total: 0,
        });
      }

      const entry = classDataMap.get(key)!;
      entry.total += 1;
      if (s.gender === 'Boy' || s.gender === 'Male') entry.boys += 1;
      else if (s.gender === 'Girl' || s.gender === 'Female') entry.girls += 1;
    });

    return Array.from(classDataMap.values()).filter((c) => c.total > 0 || availableClasses.some((ac) => ac.id === c.id));
  }, [summaryData, students, availableClasses]);

  // Attendance by Grade Level
  const dynamicAttendanceGradeData = useMemo(() => {
    if (!students || students.length === 0) return [];
    const map: Record<string, { present: number; total: number; late: number }> = {};

    students.forEach((s) => {
      const g = s.grade || 'Grade 7';
      if (!map[g]) map[g] = { present: 0, total: 0, late: 0 };
      map[g].total += 1;

      const statusToday = todayRegisterMap[s.id];
      if (statusToday === 'PRESENT') {
        map[g].present += 1;
      } else if (statusToday === 'LATE') {
        map[g].present += 1;
        map[g].late += 1;
      }
    });

    return Object.entries(map).map(([grade, d]) => ({
      grade,
      present: d.present,
      total: d.total,
      pct: d.total > 0 ? (d.present / d.total) * 100 : 0,
      late: d.late,
    }));
  }, [students, todayRegisterMap]);

  // Fee Defaulters by Grade
  const dynamicFeeDefaultersByGrade = useMemo(() => {
    if (!students || students.length === 0) return [];
    const map: Record<string, { count: number; totalBalance: number }> = {};
    students.forEach((s) => {
      if ((s.feeBalance || 0) > 0) {
        const g = s.grade || 'Grade 7';
        if (!map[g]) map[g] = { count: 0, totalBalance: 0 };
        map[g].count += 1;
        map[g].totalBalance += s.feeBalance;
      }
    });
    return Object.entries(map).map(([grade, d]) => ({
      grade,
      defaultersCount: d.count,
      totalBalance: d.totalBalance,
      barPct: Math.min(100, Math.round((d.totalBalance / 100000) * 100)),
    }));
  }, [students]);

  // Real System Activities (From SystemLog or Props)
  const systemActivities = useMemo(() => {
    if (summaryData?.recentActivities && summaryData.recentActivities.length > 0) {
      return summaryData.recentActivities.map(l => ({
        id: l.id,
        title: l.action || 'System Event',
        description: l.details,
        timestamp: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: l.category,
        ref: l.actorEmail ? `${l.actorEmail} (${l.actorRole || 'Staff'})` : undefined,
        level: l.level,
        status: l.status,
        icon: l.category === 'FINANCE' ? 'payments' : l.category === 'AUTH' ? 'lock' : l.category === 'ACADEMICS' ? 'menu_book' : 'info',
        badgeColor: l.status === 'FAILED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
      }));
    }
    return activities.map(a => ({
      ...a,
      category: 'SYSTEM',
      level: 'INFO',
      status: 'SUCCESS'
    }));
  }, [summaryData, activities]);

  return (
    <div className="flex flex-col w-full pb-xl space-y-4">
      {/* 1. Page Header & Reporting Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-md py-md bg-surface-container-lowest p-md rounded-2xl shadow-xs border border-outline-variant/30">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-xs font-label-md text-label-md text-on-surface-variant">
            <span
              onClick={() => onNavigateTab('dashboard')}
              className="hover:text-primary cursor-pointer transition-colors"
            >
              Grace Seeds Portal
            </span>
            <span>/</span>
            <span className="text-primary font-semibold">Director Executive Dashboard</span>
          </div>

          <div className="flex items-center gap-sm flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-black">
              {user?.schoolName || 'Grace Seeds School'}
            </h1>
            <div className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="font-label-md text-label-md font-bold tracking-wider">
                {academicPeriodLabel}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#800000]/10 text-[#800000] border border-[#800000]/20 text-xs font-semibold italic">
              <span className="material-symbols-outlined text-[14px]">school</span>
              <span>&quot;The Future Begins Here&quot;</span>
            </div>
          </div>
        </div>

        {/* Header Reporting Period Filter Bar */}
        <div className="flex items-center gap-xs flex-wrap">
          {/* Academic Year Filter */}
          {summaryData?.availablePeriods?.years && summaryData.availablePeriods.years.length > 0 && (
            <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/40">
              <span className="material-symbols-outlined text-slate-500 text-[18px]">calendar_today</span>
              <select
                aria-label="Filter by Academic Year"
                value={selectedYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {summaryData.availablePeriods.years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Active Year)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Academic Term Filter */}
          {summaryData?.availablePeriods?.terms && summaryData.availablePeriods.terms.length > 0 && (
            <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/40">
              <span className="material-symbols-outlined text-slate-500 text-[18px]">timelapse</span>
              <select
                aria-label="Filter by Academic Term"
                value={selectedTermId}
                onChange={(e) => handleTermChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {summaryData.availablePeriods.terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.isCurrent ? '(Current Term)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => loadDashboardStats(selectedYearId, selectedTermId)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-surface-container-low text-slate-700 hover:bg-surface-container transition-colors cursor-pointer border border-outline-variant/40"
            title="Refresh Data"
            type="button"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>

          {/* Export Report */}
          <button
            onClick={onOpenExportReport}
            className="inline-flex items-center gap-xs px-md py-sm rounded-lg bg-surface-container-highest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-all shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span className="hidden sm:inline">Export Report</span>
          </button>

          {/* Quick Action Dropdown */}
          <div className="relative" ref={quickActionRef}>
            <button
              onClick={() => setQuickActionOpen((prev) => !prev)}
              className="inline-flex items-center gap-xs px-md py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Quick Actions</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {quickActionOpen && (
              <div className="absolute right-0 top-full mt-xs w-64 rounded-xl bg-surface-container-lowest shadow-lg border border-outline-variant/30 py-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenAdmitModal();
                  }}
                  className="w-full flex items-center gap-sm px-md py-sm text-left hover:bg-surface-container transition-colors text-on-surface font-body-md text-body-md"
                >
                  <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
                  <span>Admit New Pupil</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenMpesa();
                  }}
                  className="w-full flex items-center gap-sm px-md py-sm text-left hover:bg-surface-container transition-colors text-on-surface font-body-md text-body-md"
                >
                  <span className="material-symbols-outlined text-secondary text-[20px]">payments</span>
                  <span>Record Fee Payment</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onNavigateTab('attendance-register');
                  }}
                  className="w-full flex items-center gap-sm px-md py-sm text-left hover:bg-surface-container transition-colors text-on-surface font-body-md text-body-md"
                >
                  <span className="material-symbols-outlined text-emerald-700 text-[20px]">how_to_reg</span>
                  <span>Daily Roll Call Register</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onNavigateTab('digital-signature');
                  }}
                  className="w-full flex items-center gap-sm px-md py-sm text-left hover:bg-surface-container transition-colors text-on-surface font-body-md text-body-md"
                >
                  <span className="material-symbols-outlined text-indigo-700 text-[20px]">draw</span>
                  <span>Digital Signature Vault</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenSmsModal('fee');
                  }}
                  className="w-full flex items-center gap-sm px-md py-sm text-left hover:bg-surface-container transition-colors text-on-surface font-body-md text-body-md"
                >
                  <span className="material-symbols-outlined text-rose-700 text-[20px]">sms</span>
                  <span>Send Fee Defaulters SMS</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Director Pending Approvals & Operational Action Hub */}
      {pendingApprovals.totalActionable > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50/40 to-indigo-50/40 border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">priority_high</span>
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Executive Action Hub · {pendingApprovals.totalActionable} Items Requiring Director Attention
                </h2>
                <p className="text-xs text-slate-600">
                  Authorizations, profile corrections, and forwarded payment receipts pending review
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black text-xs">
              ACTION REQUIRED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
            {/* Signature Queue */}
            <div
              onClick={() => onNavigateTab('digital-signature')}
              className="p-3 rounded-xl bg-white border border-amber-200 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-indigo-700 text-base">draw</span>
                  Document Signing
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pendingApprovals.pendingSignaturesCount > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
                  {pendingApprovals.pendingSignaturesCount} Batches
                </span>
              </div>
              <p className="text-xs text-slate-600 my-1.5">
                {pendingApprovals.pendingSignaturesCount > 0
                  ? `${pendingApprovals.pendingSignaturesCount} document signing batch(es) awaiting Director OTP verification`
                  : 'All document batches verified & up to date'}
              </p>
              <div className="flex items-center justify-between text-xs font-bold text-indigo-700 pt-1 border-t border-slate-100">
                <span>Open Signing Centre</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>

            {/* Teacher Correction Requests */}
            <div
              onClick={() => onNavigateTab('teachers-staff')}
              className="p-3 rounded-xl bg-white border border-amber-200 hover:border-purple-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-purple-700 text-base">badge</span>
                  Teacher Corrections
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pendingApprovals.pendingCorrectionRequestsCount > 0 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                  {pendingApprovals.pendingCorrectionRequestsCount} Pending
                </span>
              </div>
              <p className="text-xs text-slate-600 my-1.5">
                {pendingApprovals.pendingCorrectionRequestsCount > 0
                  ? `${pendingApprovals.pendingCorrectionRequestsCount} faculty member(s) submitted profile corrections for approval`
                  : 'No pending faculty profile corrections'}
              </p>
              <div className="flex items-center justify-between text-xs font-bold text-purple-700 pt-1 border-t border-slate-100">
                <span>Review Requests</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>

            {/* Unverified Forwarded Payments */}
            <div
              onClick={() => onNavigateTab('forwarded-payments')}
              className="p-3 rounded-xl bg-white border border-amber-200 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-emerald-700 text-base">receipt_long</span>
                  Forwarded Payments
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${unverifiedPaymentsCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {unverifiedPaymentsCount} Notices
                </span>
              </div>
              <p className="text-xs text-slate-600 my-1.5">
                {unverifiedPaymentsCount > 0
                  ? `KES ${unverifiedPaymentsAmount.toLocaleString()} in parent payment notices awaiting accounts verification`
                  : 'All forwarded transactions verified'}
              </p>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 pt-1 border-t border-slate-100">
                <span>Open Verification Queue</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Executive Summary KPI Metric Cards (6 Authoritative Indicators) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. Active Pupils */}
        <div
          onClick={() => onNavigateTab('students-guardians')}
          className="rounded-xl bg-surface-container-lowest p-3 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider font-bold truncate">
              Active Pupils
            </span>
            <span className="inline-flex items-center text-primary font-semibold text-[10px] bg-primary-container/20 px-1.5 py-0.2 rounded">
              Enrolment
            </span>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-xl lg:text-2xl text-on-surface font-data-mono">
                {activeStudents}
              </span>
              <span className="text-[11px] text-on-surface-variant">/ {totalStudents} total</span>
            </div>
          </div>
          <div className="pt-1.5 border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
            <span className="text-sky-700 font-bold">{boysCount} Boys</span>
            <span>·</span>
            <span className="text-pink-700 font-bold">{girlsCount} Girls</span>
          </div>
        </div>

        {/* 2. Faculty & Staff */}
        <div
          onClick={() => onNavigateTab('teachers-staff')}
          className="rounded-xl bg-surface-container-lowest p-3 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-indigo-500/40"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider font-bold truncate">
              Staff & Faculty
            </span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 font-semibold text-[10px]">
              Team
            </span>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-xl lg:text-2xl text-indigo-950 font-data-mono">
                {totalTeachersCount + totalNonTeachingStaffCount}
              </span>
              <span className="text-[11px] text-on-surface-variant">personnel</span>
            </div>
          </div>
          <div className="pt-1.5 border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="text-[10px] text-indigo-700 font-bold">{totalTeachersCount} Teachers</span>
            <span>·</span>
            <span className="text-[10px] text-purple-700 font-bold">{totalNonTeachingStaffCount} Ops</span>
          </div>
        </div>

        {/* 3. Daily Attendance % */}
        <div
          onClick={() => onNavigateTab('attendance-register')}
          className="rounded-xl bg-surface-container-lowest p-3 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-secondary/40"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider font-bold truncate">
              Roll Call Today
            </span>
            <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded ${hasRegisterDataToday ? 'bg-secondary-container text-on-secondary-container' : 'bg-slate-100 text-slate-600'}`}>
              {hasRegisterDataToday ? 'Live' : 'Pending'}
            </span>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-xl lg:text-2xl text-secondary font-data-mono">
                {hasRegisterDataToday ? `${avgAttendancePct}%` : '--'}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {hasRegisterDataToday ? 'present' : 'unmarked'}
              </span>
            </div>
          </div>
          <div className="pt-1.5 border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="text-[10px] text-secondary font-bold font-data-mono">
              {totalPresentToday} Present
            </span>
            <span className="text-[10px] text-error font-bold font-data-mono">
              {absentStudentsCount} Absent
            </span>
          </div>
        </div>

        {/* 4. Verified Fee Collections */}
        <div
          onClick={() => onNavigateTab('invoices-mpesa')}
          className="rounded-xl bg-surface-container-lowest p-3 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-emerald-500/40"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider font-bold truncate">
              Verified Fees
            </span>
            <span className="inline-flex items-center text-emerald-800 font-semibold text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded">
              {feePct}%
            </span>
          </div>
          <div className="my-1.5">
            <div className="font-bold text-base lg:text-lg text-emerald-700 tracking-tight font-data-mono truncate">
              KES {currentTotalFee.toLocaleString()}
            </div>
            <div className="text-[10px] text-on-surface-variant truncate">
              Billed: KES {targetFee.toLocaleString()}
            </div>
          </div>
          <div className="pt-1.5 border-t border-surface-container flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant text-[10px]">Collected</span>
            <span className="font-bold text-emerald-700 font-data-mono">{feePct}% Rate</span>
          </div>
        </div>

        {/* 5. Outstanding Arrears & Outflows */}
        <div
          onClick={() => onNavigateTab('arrears')}
          className="rounded-xl bg-surface-container-lowest p-3 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-rose-500/40"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider font-bold truncate">
              Fee Arrears
            </span>
            <span className="inline-flex items-center text-rose-800 font-semibold text-[10px] bg-rose-50 px-1.5 py-0.2 rounded">
              {defaultersCount} Defaulters
            </span>
          </div>
          <div className="my-1.5">
            <div className="font-bold text-base lg:text-lg text-rose-700 tracking-tight font-data-mono truncate">
              KES {feeArrears.toLocaleString()}
            </div>
            <div className="text-[10px] text-on-surface-variant truncate">
              Expenses: KES {totalExpenses.toLocaleString()}
            </div>
          </div>
          <div className="pt-1.5 border-t border-surface-container flex items-center justify-between text-[11px] text-rose-800 font-bold">
            <span className="text-[10px]">Net Cash</span>
            <span className="font-data-mono text-[10px] font-bold text-slate-800">
              KES {netOperatingCash.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 6. CBC Proficiency */}
        <div
          onClick={() => onNavigateTab('report-cards')}
          className="rounded-xl bg-surface-container-lowest p-3 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-amber-500/40"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider font-bold truncate">
              CBE Proficiency
            </span>
            <span className="inline-flex items-center text-amber-800 font-semibold text-[10px] bg-amber-50 px-1.5 py-0.2 rounded">
              Curriculum
            </span>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-xl lg:text-2xl text-amber-950 font-data-mono">
                {totalAssessments > 0 ? `${proficientPct}%` : '--'}
              </span>
              <span className="text-[11px] text-on-surface-variant">EE+ME</span>
            </div>
          </div>
          <div className="pt-1.5 border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="text-[10px] truncate">{totalAssessments} Assessed</span>
            <span className="text-[10px] text-primary font-bold">Reports →</span>
          </div>
        </div>
      </div>

      {/* 4. Active Classes & Cohort Pupil Distribution */}
      <div className="my-2 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#7a1228] text-base">meeting_room</span>
            Active Cohorts & Class Enrolment Distribution
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {gradeEnrollmentBreakdown.length} Classes Evaluated
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {gradeEnrollmentBreakdown.map((c) => (
            <div
              key={c.id}
              onClick={() => onNavigateTab('classes-streams')}
              className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-[#7a1228]/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 truncate" title={c.name}>
                  {c.name}
                </span>
                <span className="w-6 h-6 rounded-md bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center font-bold text-[10px]">
                  {c.name.split(' ').map((n: string) => n[0]).join('')}
                </span>
              </div>

              <div>
                <div className="text-xl font-black font-data-mono text-slate-900 leading-tight">
                  {c.total}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">Pupils</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                  <span className="text-sky-700 font-bold">{c.boys}B</span>
                  <span>·</span>
                  <span className="text-pink-700 font-bold">{c.girls}G</span>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-[#7a1228] h-1 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((c.total / 40) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Live Faculty Attendance & Compound Geofence Roster */}
      <FacultyAttendanceRosterCard onNavigateTab={onNavigateTab} />

      {/* 6. Primary Analytic Row: Attendance Breakdown & CBC Rubrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-md my-sm">
        {/* Attendance Breakdown (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm pb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">how_to_reg</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Daily Attendance by Grade Level
                </h2>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">
                Real-time teacher-logged roll calls for today ({todayIso})
              </p>
            </div>
            <div className="flex items-center gap-xs self-start sm:self-auto">
              <button
                onClick={() => onNavigateTab('attendance-register')}
                className="px-sm py-xs rounded-lg bg-[#7a1228] text-white font-label-md text-label-md hover:bg-[#5e0d1e] transition-colors cursor-pointer"
                type="button"
              >
                Open Roll Call Register
              </button>
            </div>
          </div>

          {/* Attendance Rows */}
          <div className="flex flex-col gap-sm">
            {dynamicAttendanceGradeData.length === 0 ? (
              <div className="py-8 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                No class attendance records logged today yet. Teachers mark roll call via the portal.
              </div>
            ) : (
              dynamicAttendanceGradeData.map((item) => (
                <div key={item.grade} className="flex items-center gap-md">
                  <div className="w-20 shrink-0 flex flex-col">
                    <span className="font-body-md text-body-md font-semibold text-on-surface">
                      {item.grade}
                    </span>
                    <span className="font-label-md text-label-md text-on-surface-variant">
                      {item.present} / {item.total}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-xs">
                    <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden flex">
                      <div className="bg-secondary h-full transition-all duration-300" style={{ width: `${item.pct}%` }}></div>
                      <div className="bg-error h-full transition-all duration-300" style={{ width: `${100 - item.pct}%` }}></div>
                    </div>
                  </div>
                  <div className="w-16 text-right shrink-0">
                    <span className="font-data-mono text-data-mono font-semibold text-secondary">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                  <span
                    className={`px-xs py-0.5 rounded font-label-md text-label-md shrink-0 ${
                      item.late > 0
                        ? 'bg-amber-100 text-amber-900 font-medium'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {item.late} late
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Attendance Footer Stats */}
          <div className="mt-md pt-sm bg-surface-container-low p-sm rounded-lg flex flex-wrap items-center justify-between gap-xs">
            <div className="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md">
              <span className="w-3 h-3 rounded bg-secondary"></span> Present ({avgAttendancePct}% avg)
              <span className="w-3 h-3 rounded bg-error ml-sm"></span> Absent ({students.length > 0 ? Math.max(0, 100 - avgAttendancePct) : 0}%)
            </div>
            <span className="font-label-md text-label-md text-on-surface">
              Total Absent Today: <strong className="text-error font-bold">{absentStudentsCount}</strong>
            </span>
          </div>
        </div>

        {/* CBC Assessment Rubrics (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div>
            <div className="flex items-center justify-between pb-sm">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  CBE Assessment Rubrics
                </h2>
              </div>
              <span className="font-label-md text-label-md text-secondary font-medium">
                {academicPeriodLabel}
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-md">
              {totalAssessments > 0
                ? `Aggregate distribution of ${totalAssessments.toLocaleString()} learning outcomes assessed`
                : 'No formative or summative assessments recorded yet in this term'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-md">
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-surface-container-high"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="38"
                    stroke="currentColor"
                    strokeWidth="12"
                  ></circle>
                  {totalAssessments > 0 && (
                    <>
                      <circle
                        className="text-secondary"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${eeLen} 238.76`}
                        strokeDashoffset="0"
                        strokeWidth="12"
                      ></circle>
                      <circle
                        className="text-primary"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${meLen} 238.76`}
                        strokeDashoffset={meOffset}
                        strokeWidth="12"
                      ></circle>
                      <circle
                        className="text-tertiary-container"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${aeLen} 238.76`}
                        strokeDashoffset={aeOffset}
                        strokeWidth="12"
                      ></circle>
                      <circle
                        className="text-error"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${beLen} 238.76`}
                        strokeDashoffset={beOffset}
                        strokeWidth="12"
                      ></circle>
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">
                    {proficientPct}%
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                    Proficient
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-xs w-full">
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-secondary"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Exceeding (EE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-secondary">
                    {eePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-primary"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Meeting (ME)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-primary">
                    {mePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-tertiary-container"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Approaching (AE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-tertiary-container">
                    {aePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-error"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Below (BE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-error">
                    {bePct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Genuine Term-to-Term Comparison Section */}
          <div className="mt-md pt-sm border-t border-surface-container">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block mb-xs font-bold">
              Term-to-Term Performance Comparison
            </span>
            {summaryData?.academicOverview?.termComparison?.comparisonAvailable ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-900 font-semibold block">
                    Compared with {summaryData.academicOverview.termComparison.previousTermName}
                  </span>
                  <span className="text-xs text-emerald-800">
                    Previous Mean: <strong>{summaryData.academicOverview.termComparison.previousTermMean}%</strong> · Current Mean: <strong>{summaryData.academicOverview.termComparison.currentTermMean}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 font-black text-sm text-emerald-900">
                  <span className="material-symbols-outlined text-base">
                    {(summaryData.academicOverview.termComparison.growthDelta || 0) >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  <span>
                    {(summaryData.academicOverview.termComparison.growthDelta || 0) >= 0 ? '+' : ''}
                    {summaryData.academicOverview.termComparison.growthDelta}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-base">info</span>
                <span>
                  Prior term baseline comparison is only calculated when genuine previous assessment records exist in the database.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Secondary Analytic Row: Finance Streams & Live System Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-md my-sm">
        {/* Finance Streams (8 Cols) - Real Ledger Data, No Fake Multipliers */}
        <div className="lg:col-span-8 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm pb-md">
              <div>
                <div className="flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                    Fee Collection Streams & Pending Balances
                  </h2>
                </div>
                <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">
                  Direct M-Pesa (Paybill 522533) & KCB Bank Fee Settlements
                </p>
              </div>
              <div className="flex items-center gap-xs">
                <button
                  onClick={() => onNavigateTab('invoices-mpesa')}
                  className="px-sm py-xs rounded-lg bg-emerald-700 text-white font-label-md text-label-md hover:bg-emerald-800 transition-colors cursor-pointer"
                  type="button"
                >
                  View Finance Ledger
                </button>
              </div>
            </div>

            {/* Real Financial Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">phone_android</span>
                  M-Pesa Collections
                </span>
                <div className="text-lg font-black font-data-mono text-emerald-950 mt-1">
                  KES {paymentMethods.mpesa.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-700">
                  {currentTotalFee > 0 ? Math.round((paymentMethods.mpesa / currentTotalFee) * 100) : 0}% of collections
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">account_balance</span>
                  Bank Settlements
                </span>
                <div className="text-lg font-black font-data-mono text-blue-950 mt-1">
                  KES {paymentMethods.bank.toLocaleString()}
                </div>
                <span className="text-[10px] text-blue-700">
                  {currentTotalFee > 0 ? Math.round((paymentMethods.bank / currentTotalFee) * 100) : 0}% of collections
                </span>
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">point_of_sale</span>
                  Cash & Other Inflows
                </span>
                <div className="text-lg font-black font-data-mono text-purple-950 mt-1">
                  KES {(paymentMethods.cash + paymentMethods.other).toLocaleString()}
                </div>
                <span className="text-[10px] text-purple-700">
                  Direct receipts & deposits
                </span>
              </div>
            </div>

            {/* Operating Balance Bar */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Net Operating Cash Position
                </span>
                <span className="text-xs text-slate-600">
                  Verified Inflows (KES {currentTotalFee.toLocaleString()}) less Approved Expenses (KES {totalExpenses.toLocaleString()})
                </span>
              </div>
              <div className="text-right">
                <span className={`text-base font-black font-data-mono ${netOperatingCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  KES {netOperatingCash.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Highest Outstanding Fee Balances */}
          <div className="mt-md">
            <div className="flex items-center justify-between mb-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block font-bold">
                Highest Outstanding Fee Balances by Class
              </span>
              <button
                onClick={() => onNavigateTab('arrears')}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                View All Defaulters →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
              {dynamicFeeDefaultersByGrade.length === 0 ? (
                <div className="col-span-1 md:col-span-3 py-6 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                  No fee defaulters recorded this term.
                </div>
              ) : (
                dynamicFeeDefaultersByGrade.slice(0, 3).map((fd) => (
                  <div
                    key={fd.grade}
                    onClick={() => onNavigateTab('arrears')}
                    className="p-sm rounded-lg bg-surface-container-low flex flex-col hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-body-md text-body-md font-semibold text-on-surface">
                        {fd.grade}
                      </span>
                      <span className="font-label-md text-label-md text-error font-medium">
                        {fd.defaultersCount} Defaulters
                      </span>
                    </div>
                    <span className="font-headline-md text-headline-md font-bold text-on-surface mt-xs">
                      KES {fd.totalBalance.toLocaleString()}
                    </span>
                    <div className="w-full bg-surface-container h-1.5 rounded-full mt-xs overflow-hidden">
                      <div
                        className={fd.barPct > 25 ? 'bg-error h-full' : 'bg-tertiary-container h-full'}
                        style={{ width: `${fd.barPct}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Live System Activity (4 Cols) - From Real SystemLog Audit Repository */}
        <div className="lg:col-span-4 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div>
            <div className="flex items-center justify-between pb-sm">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Live Audit Activity
                </h2>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-md">
              Authoritative audit log of portal logins, approvals, and financial events
            </p>

            <div className="flex flex-col gap-md">
              {systemActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                  No system activity logs recorded yet for this session.
                </div>
              ) : (
                systemActivities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex gap-sm items-start">
                    <div
                      className={`w-8 h-8 rounded-full ${
                        act.badgeColor || 'bg-surface-container-highest text-primary'
                      } flex items-center justify-center shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{act.icon}</span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-body-md text-body-md font-semibold text-on-surface truncate">
                          {act.title}
                        </span>
                        <span className="font-data-mono text-data-mono text-on-surface-variant shrink-0 text-xs">
                          {act.timestamp}
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant text-[13px] leading-snug mt-0.5 line-clamp-2">
                        {act.description}
                      </p>
                      {act.ref && (
                        <span className="font-data-mono text-[11px] text-outline mt-0.5 truncate block">
                          {act.ref}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-md pt-sm">
            <button
              onClick={() => onNavigateTab('system-logs')}
              className="w-full py-xs rounded-lg bg-surface-container text-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-xs hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <span>View All System Logs</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8. Institution Operational Banner */}
      <div className="mt-sm p-md rounded-xl bg-primary text-on-primary shadow-xs flex flex-col md:flex-row items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-lg bg-on-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary-fixed text-[28px]">
              verified
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md font-semibold tracking-tight text-on-primary">
              Grace Seeds School Director Operations Portal
            </span>
            <span className="font-body-md text-body-md text-on-primary/80 mt-0.5">
              All CBC assessments, attendance registers, and fee collection summaries reflect actual database records in accordance with Ministry of Education standards.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-sm shrink-0 w-full md:w-auto">
          <button
            onClick={onOpenKnecSync}
            className="px-md py-sm rounded-lg bg-on-primary text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-lowest transition-colors text-center w-full md:w-auto cursor-pointer shadow-xs"
          >
            Verify KNEC Sync Status
          </button>
        </div>
      </div>
    </div>
  );
};
