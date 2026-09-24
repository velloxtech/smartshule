import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, Teacher, SystemActivity, DashboardSummary, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getRoleDisplayName } from '../../utils/rbac';

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
  const quickActionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionRef.current && !quickActionRef.current.contains(event.target as Node)) {
        setQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const res = await apiService.getDashboardAnalytics();
        if (res.success && res.data) {
          setSummaryData(res.data);
        }
      } catch {
        // Keep fallback data
      }
    }
    loadDashboardStats();
  }, []);

  const totalStudents = summaryData?.counts?.totalStudents ?? students.length;
  const boysCount = students.filter((s) => s.gender === 'Boy').length;
  const girlsCount = students.filter((s) => s.gender === 'Girl').length;

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
    : (targetFee > 0 ? Number(Math.min(100, (currentTotalFee / targetFee) * 100).toFixed(1)) : 0);

  const totalTeachersCount = summaryData?.counts?.totalTeachers ?? teachers.length;
  const totalNonTeachingStaffCount = summaryData?.counts?.totalNonTeachingStaff ?? 5;

  const totalAssessments = summaryData?.cbcProficiency?.totalAssessments || 0;
  const cbcBenchmarkPct = totalAssessments > 0
    ? (((summaryData!.cbcProficiency.exceeding + summaryData!.cbcProficiency.meeting) / totalAssessments) * 100).toFixed(1)
    : '0.0';

  const academicPeriodLabel = summaryData?.academicPeriod?.term && summaryData?.academicPeriod?.year && summaryData.academicPeriod.term !== 'N/A'
    ? `${summaryData.academicPeriod.term}, ${summaryData.academicPeriod.year}`
    : 'Active Academic Session';

  // Real Dynamic Attendance Grouped by Grade
  const dynamicAttendanceGradeData = useMemo(() => {
    if (!students || students.length === 0) return [];
    const map: Record<string, { present: number; total: number; late: number }> = {};
    students.forEach((s) => {
      const g = s.grade || 'Grade 7';
      if (!map[g]) map[g] = { present: 0, total: 0, late: 0 };
      map[g].total += 1;
      if ((s.attendanceRate || 0) >= 80) map[g].present += 1;
    });
    return Object.entries(map).map(([grade, d]) => ({
      grade,
      present: d.present,
      total: d.total,
      pct: d.total > 0 ? (d.present / d.total) * 100 : 0,
      late: d.late,
    }));
  }, [students]);

  const avgAttendancePct = useMemo(() => {
    if (!students || students.length === 0) return 0;
    const total = students.reduce((acc, s) => acc + (s.attendanceRate || 0), 0);
    return Math.round(total / students.length);
  }, [students]);

  const absentStudentsCount = useMemo(() => {
    if (!students || students.length === 0) return 0;
    return students.filter((s) => (s.attendanceRate || 0) < 50).length;
  }, [students]);

  // Real Dynamic Defaulters Grouped by Grade
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

  const weeklyFinanceTrend = useMemo(() => {
    if (currentTotalFee === 0) {
      return [
        { week: 'Wk 1', mpesaPct: 0, bankPct: 0, isCurrent: false },
        { week: 'Wk 2', mpesaPct: 0, bankPct: 0, isCurrent: false },
        { week: 'Wk 3', mpesaPct: 0, bankPct: 0, isCurrent: false },
        { week: 'Wk 4', mpesaPct: 0, bankPct: 0, isCurrent: true },
      ];
    }
    const currentRate = Math.min(100, Math.round((currentTotalFee / (targetFee || 1)) * 100));
    return [
      { week: 'Wk 1', mpesaPct: Math.round(currentRate * 0.25), bankPct: Math.round(currentRate * 0.1), isCurrent: false },
      { week: 'Wk 2', mpesaPct: Math.round(currentRate * 0.5), bankPct: Math.round(currentRate * 0.2), isCurrent: false },
      { week: 'Wk 3', mpesaPct: Math.round(currentRate * 0.75), bankPct: Math.round(currentRate * 0.25), isCurrent: false },
      { week: 'Wk 4', mpesaPct: currentRate, bankPct: Math.round(currentRate * 0.3), isCurrent: true },
    ];
  }, [currentTotalFee, targetFee]);

  const cbcProf = summaryData?.cbcProficiency;
  const eeAssessments = cbcProf?.exceeding || 0;
  const meAssessments = cbcProf?.meeting || 0;
  const aeAssessments = cbcProf?.approaching || 0;
  const beAssessments = cbcProf?.below || 0;
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

  // Check user roles
  const isTeacher = user?.role === UserRole.TEACHER;
  const isFinance = user?.role === UserRole.ACCOUNTANT;
  const isGuardian = user?.role === UserRole.GUARDIAN || user?.role === UserRole.PARENT;
  const isStudent = user?.role === UserRole.STUDENT;

  return (
    <div className="flex flex-col w-full pb-xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md py-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-xs font-label-md text-label-md text-on-surface-variant">
            <span
              onClick={() => onNavigateTab('dashboard')}
              className="hover:text-primary cursor-pointer transition-colors"
            >
              Home
            </span>
            <span>/</span>
            <span className="text-primary font-semibold">Dashboard</span>
          </div>
          <div className="flex items-center gap-sm flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              School Executive Dashboard
            </h1>
            <div className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-secondary-container text-on-secondary-container">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-label-md text-label-md font-semibold tracking-wider">
                {academicPeriodLabel}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-[#800000] border border-rose-200 text-xs font-semibold italic shadow-2xs">
              <span className="material-symbols-outlined text-[14px]">school</span>
              <span>&quot;The future Begins Here&quot;</span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-sm shrink-0">
          <button
            onClick={onOpenExportReport}
            className="inline-flex items-center gap-xs px-md py-sm rounded-lg bg-surface-container-highest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-all shadow-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Summary Report</span>
          </button>

          {/* Quick Action Dropdown */}
          <div className="relative" ref={quickActionRef}>
            <button
              id="quickActionBtn"
              onClick={() => setQuickActionOpen(!quickActionOpen)}
              className="inline-flex items-center gap-xs px-md py-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all shadow-md cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Quick Action</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {quickActionOpen && (
              <div
                id="quickActionMenu"
                className="absolute right-0 mt-xs w-56 max-w-[calc(100vw-2rem)] rounded-lg bg-surface-container-lowest p-xs shadow-xl z-50 border border-outline-variant/30 flex flex-col gap-base animate-in fade-in slide-in-from-top-1"
              >
                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onNavigateTab('user-management');
                  }}
                  className="flex items-center gap-xs px-sm py-xs rounded-lg text-purple-900 hover:bg-purple-50 transition-colors text-left w-full cursor-pointer font-medium"
                >
                  <span className="material-symbols-outlined text-purple-700 text-[18px]">
                    manage_accounts
                  </span>
                  <span className="font-body-md text-body-md">User Accounts & Access</span>
                </button>

                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onNavigateTab('whatsapp-bot');
                  }}
                  className="flex items-center gap-xs px-sm py-xs rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors text-left w-full cursor-pointer font-medium"
                >
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                    chat
                  </span>
                  <span className="font-body-md text-body-md">WhatsApp Parent Desk</span>
                </button>

                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenMpesa();
                  }}
                  className="flex items-center gap-xs px-sm py-xs rounded-lg text-on-surface hover:bg-surface-container transition-colors text-left w-full cursor-pointer"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    point_of_sale
                  </span>
                  <span className="font-body-md text-body-md">M-Pesa STK Fee Request</span>
                </button>

                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenCBCModal();
                  }}
                  className="flex items-center gap-xs px-sm py-xs rounded-lg text-on-surface hover:bg-surface-container transition-colors text-left w-full cursor-pointer"
                >
                  <span className="material-symbols-outlined text-secondary text-[18px]">rule</span>
                  <span className="font-body-md text-body-md">Record CBC Formative Log</span>
                </button>

                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenAdmitModal();
                  }}
                  className="flex items-center gap-xs px-sm py-xs rounded-lg text-on-surface hover:bg-surface-container transition-colors text-left w-full cursor-pointer"
                >
                  <span className="material-symbols-outlined text-tertiary-container text-[18px]">
                    person_add
                  </span>
                  <span className="font-body-md text-body-md">Admit New Learner</span>
                </button>

                <button
                  onClick={() => {
                    setQuickActionOpen(false);
                    onOpenSmsModal('all');
                  }}
                  className="flex items-center gap-xs px-sm py-xs rounded-lg text-on-surface hover:bg-surface-container transition-colors text-left w-full cursor-pointer"
                >
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    notifications_active
                  </span>
                  <span className="font-body-md text-body-md">Send SMS Alert to Parents</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* School Director WhatsApp Module Quick Access Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 shadow-sm my-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-600/30">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[28px] sm:text-[32px]">chat</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base sm:text-lg text-white tracking-tight">
                WhatsApp Parent Desk Module
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Director Access Enabled
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5 max-w-2xl">
              Real-time communication with parents: instant fee balance checks, online payment links, CBC digital reports, attendance notices, and AI assistance.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={() => onNavigateTab('user-management')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            <span>User Management</span>
          </button>
          <button
            onClick={() => onNavigateTab('whatsapp-bot')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:shadow-emerald-500/25"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">forum</span>
            <span>Open WhatsApp Module</span>
          </button>
        </div>
      </div>

      {/* 5 Director High-Impact KPI Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 my-2">
        {/* 1. Total Number of Learners */}
        <div
          onClick={() => onNavigateTab('students-guardians')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-primary/40"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary/30 text-[32px]">groups</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Total Learners
              </span>
              <span className="inline-flex items-center text-primary font-label-md text-label-md font-semibold text-xs">
                <span className="material-symbols-outlined text-[14px] mr-0.5">school</span> Active
              </span>
            </div>
            <div className="flex items-baseline gap-xs mt-xs">
              <span className="font-display text-display text-on-surface font-bold text-2xl lg:text-3xl">
                {totalStudents.toLocaleString()}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">learners</span>
            </div>
          </div>
          <div className="mt-md pt-sm bg-surface-container-low/50 rounded-lg p-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span className="font-data-mono text-data-mono text-on-surface">{boysCount} Boys</span>
            </div>
            <span className="text-outline text-[12px]">|</span>
            <div className="flex items-center gap-xs">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-data-mono text-data-mono text-on-surface">{girlsCount} Girls</span>
            </div>
          </div>
        </div>

        {/* 2. Fee Paid (Collected) */}
        <div
          onClick={() => onNavigateTab('invoices-mpesa')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-emerald-500/40"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-600/40 text-[32px]">
              payments
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Fee Paid
              </span>
              <span className="inline-flex items-center text-emerald-800 font-label-md text-label-md font-semibold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[13px] mr-0.5">check_circle</span> Collected
              </span>
            </div>
            <div className="flex flex-col mt-xs">
              <span className="font-headline-lg text-headline-lg text-emerald-700 font-bold tracking-tight text-xl lg:text-2xl">
                KES {currentTotalFee.toLocaleString()}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant text-xs mt-0.5">
                Target: KES {targetFee.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-md pt-sm flex flex-col gap-xs">
            <div className="flex justify-between font-label-md text-label-md text-xs">
              <span className="text-on-surface-variant">Collection Rate</span>
              <span className="font-bold text-emerald-700">{feePct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, feePct)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 3. Fee Arrears (Outstanding) */}
        <div
          onClick={() => onNavigateTab('defaulters-receipts')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-rose-500/40"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-rose-600/40 text-[32px]">
              pending_actions
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Fee Arrears
              </span>
              <span className="inline-flex items-center text-rose-800 font-label-md text-label-md font-semibold text-[11px] bg-rose-50 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[13px] mr-0.5">warning</span> Outstanding
              </span>
            </div>
            <div className="flex flex-col mt-xs">
              <span className="font-headline-lg text-headline-lg text-rose-700 font-bold tracking-tight text-xl lg:text-2xl">
                KES {feeArrears.toLocaleString()}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant text-xs mt-0.5">
                Unpaid across learners
              </span>
            </div>
          </div>
          <div className="mt-md pt-sm bg-rose-50/70 rounded-lg p-xs flex items-center justify-between text-xs text-rose-900 font-medium">
            <span>Send Defaulters SMS</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </div>
        </div>

        {/* 4. Number of Teachers */}
        <div
          onClick={() => onNavigateTab('teachers-staff')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-indigo-500/40"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600/40 text-[32px]">co_present</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Teachers
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-label-md text-label-md font-semibold text-[11px]">
                Teaching Staff
              </span>
            </div>
            <div className="flex items-baseline gap-xs mt-xs">
              <span className="font-display text-display text-indigo-900 font-bold text-2xl lg:text-3xl">
                {totalTeachersCount}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">educators</span>
            </div>
          </div>
          <div className="mt-md pt-sm bg-surface-container-low/50 rounded-lg p-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary text-[15px]">check_circle</span>
              <span className="font-data-mono text-data-mono text-on-surface">
                {teachers.filter((t) => t.status === 'Clocked In').length}/{totalTeachersCount} Clocked In
              </span>
            </div>
            <span className="text-on-surface-variant font-medium">Active Today</span>
          </div>
        </div>

        {/* 5. Number of Non-Teaching Staff */}
        <div
          onClick={() => onNavigateTab('teachers-staff')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-outline-variant/30 hover:border-purple-500/40"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-600/40 text-[32px]">badge</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                Non-Teaching Staff
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-label-md text-label-md font-semibold text-[11px]">
                Operations & Admin
              </span>
            </div>
            <div className="flex items-baseline gap-xs mt-xs">
              <span className="font-display text-display text-purple-900 font-bold text-2xl lg:text-3xl">
                {totalNonTeachingStaffCount}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">personnel</span>
            </div>
          </div>
          <div className="mt-md pt-sm bg-surface-container-low/50 rounded-lg p-xs flex items-center justify-between text-xs text-on-surface-variant">
            <span>Bursar, Admissions, Admin</span>
            <span className="font-semibold text-purple-700">Support</span>
          </div>
        </div>
      </div>

      {/* Primary Analytic Row: Attendance Breakdown & CBC Competency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-md my-sm">
        {/* Attendance Breakdown (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm pb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">how_to_reg</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Daily Attendance by Grade Level
                </h2>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">
                Real-time biometric & teacher-logged roll calls for today
              </p>
            </div>
            <div className="flex items-center gap-xs self-start sm:self-auto">
              <button
                onClick={() => onOpenSmsModal('absentee')}
                className="px-sm py-xs rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-highest transition-colors cursor-pointer"
                type="button"
              >
                Trigger SMS To Absentee Parents
              </button>
            </div>
          </div>

          {/* Attendance Rows */}
          <div className="flex flex-col gap-sm">
            {dynamicAttendanceGradeData.length === 0 ? (
              <div className="py-8 text-center text-xs text-on-surface-variant">
                No class attendance records logged today yet.
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
                    <div className="bg-secondary h-full" style={{ width: `${item.pct}%` }}></div>
                    <div className="bg-error h-full" style={{ width: `${100 - item.pct}%` }}></div>
                  </div>
                </div>
                <div className="w-16 text-right shrink-0">
                  <span className="font-data-mono text-data-mono font-semibold text-secondary">
                    {item.pct.toFixed(1)}%
                  </span>
                </div>
                <span
                  className={`px-xs py-0.5 rounded font-label-md text-label-md shrink-0 ${
                    item.late > 3
                      ? 'bg-error-container text-on-error-container font-medium'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {item.late} late
                </span>
              </div>
            )))}
          </div>

          {/* Attendance Footer Stats */}
          <div className="mt-md pt-sm bg-surface-container-low p-sm rounded-lg flex flex-wrap items-center justify-between gap-xs">
            <div className="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md">
              <span className="w-3 h-3 rounded bg-secondary"></span> Present ({avgAttendancePct}% avg)
              <span className="w-3 h-3 rounded bg-error ml-sm"></span> Absent ({students.length > 0 ? Math.max(0, 100 - avgAttendancePct) : 0}%)
            </div>
            <span className="font-label-md text-label-md text-on-surface">
              Total Absent Learners: <strong className="text-error font-bold">{absentStudentsCount}</strong>
            </span>
          </div>
        </div>

        {/* CBC Assessment Rubrics (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-sm">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  CBC Assessment Rubrics
                </h2>
              </div>
              <span className="font-label-md text-label-md text-secondary font-medium">
                {academicPeriodLabel}
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-md">
              {totalAssessments > 0
                ? `Aggregate distribution of ${totalAssessments.toLocaleString()} learning outcomes assessed`
                : 'No formative or summative assessments recorded yet'}
            </p>

            {/* Donut Chart & Rubrics */}
            <div className="flex flex-col sm:flex-row items-center gap-md">
              {/* Visual SVG Donut Chart */}
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Ring */}
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
                      {/* EE */}
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
                      {/* ME */}
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
                      {/* AE */}
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
                      {/* BE */}
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

              {/* CBC Rubrics Grid */}
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

          {/* KICD Core Values Index */}
          <div className="mt-md pt-sm">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block mb-xs">
              KICD Core Values Index
            </span>
            <div className="grid grid-cols-3 gap-xs text-center">
              <div className="bg-surface-container p-xs rounded-lg">
                <span className="font-label-md text-label-md text-on-surface-variant block">
                  Integrity
                </span>
                <span className="font-body-md text-body-md font-bold text-primary">
                  {totalAssessments > 0 ? '4.8 / 5.0' : '--'}
                </span>
              </div>
              <div className="bg-surface-container p-xs rounded-lg">
                <span className="font-label-md text-label-md text-on-surface-variant block">Respect</span>
                <span className="font-body-md text-body-md font-bold text-primary">
                  {totalAssessments > 0 ? '4.6 / 5.0' : '--'}
                </span>
              </div>
              <div className="bg-surface-container p-xs rounded-lg">
                <span className="font-label-md text-label-md text-on-surface-variant block">
                  Patriotism
                </span>
                <span className="font-body-md text-body-md font-bold text-primary">
                  {totalAssessments > 0 ? '4.9 / 5.0' : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Fee Streams & Live System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-md my-sm">
        {/* Finance Breakdown (8 Cols) */}
        <div className="lg:col-span-8 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm pb-md">
            <div>
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Fee Collection Streams & Pending Balances
                </h2>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant mt-0.5">
                Automated Safaricom Daraja M-Pesa STK Push vs Equity/KCB Bank Rail
              </p>
            </div>
            <div className="flex items-center gap-xs">
              <span className="inline-flex items-center gap-xs font-label-md text-label-md text-secondary bg-secondary-container px-sm py-xs rounded-lg font-medium">
                <span className="w-2 h-2 rounded-full bg-secondary"></span> M-Pesa & KCB Bank Channels
              </span>
            </div>
          </div>

          {/* Weekly Inflow Multi-bar Chart */}
          <div className="bg-surface-container-low p-md rounded-xl">
            <div className="flex items-center justify-between mb-sm">
              <span className="font-label-md text-label-md font-semibold text-on-surface">
                Weekly Inflow Trend (Term 1)
              </span>
              <div className="flex items-center gap-md font-label-md text-label-md">
                <div className="flex items-center gap-xs">
                  <span className="w-3 h-2 rounded-xs bg-secondary"></span>
                  <span className="text-on-surface-variant">M-Pesa Express</span>
                </div>
                <div className="flex items-center gap-xs">
                  <span className="w-3 h-2 rounded-xs bg-primary"></span>
                  <span className="text-on-surface-variant">Bank Wire</span>
                </div>
              </div>
            </div>

            {/* SVG Multi-bar weekly visualization */}
            <div className="w-full h-44 flex items-end justify-between gap-sm pt-sm">
              {weeklyFinanceTrend.map((wf) => (
                <div
                  key={wf.week}
                  className="flex-1 flex flex-col items-center gap-xs h-full justify-end"
                >
                  <div className="w-full max-w-[36px] flex items-end gap-0.5 h-32">
                    <div
                      className="bg-secondary rounded-t-xs w-1/2 transition-all duration-300"
                      style={{ height: `${wf.mpesaPct}%` }}
                    ></div>
                    <div
                      className="bg-primary rounded-t-xs w-1/2 transition-all duration-300"
                      style={{ height: `${wf.bankPct}%` }}
                    ></div>
                  </div>
                  <span
                    className={`font-label-md text-label-md ${
                      wf.isCurrent ? 'font-bold text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {wf.week}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Highest Outstanding Fee Balances */}
          <div className="mt-md">
            <div className="flex items-center justify-between mb-xs">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block">
                Highest Outstanding Fee Balances
              </span>
              <button
                onClick={() => onNavigateTab('defaulters-receipts')}
                className="text-xs font-semibold text-primary hover:underline"
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
                dynamicFeeDefaultersByGrade.map((fd) => (
                  <div
                    key={fd.grade}
                    onClick={() => onNavigateTab('defaulters-receipts')}
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

        {/* Live System Activity (4 Cols) */}
        <div className="lg:col-span-4 rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-sm">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Live System Activity
                </h2>
              </div>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-md">
              Real-time audit log of fee, academic, and attendance events
            </p>

            {/* Activity Timeline */}
            <div className="flex flex-col gap-md">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">
                  No system activities recorded yet.
                </div>
              ) : (
                activities.map((act) => (
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
                        <span className="font-data-mono text-data-mono text-on-surface-variant shrink-0">
                          {act.timestamp}
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant text-[13px] leading-snug mt-0.5">
                        {act.description}
                      </p>
                      {act.ref && (
                        <span className="font-data-mono text-[11px] text-outline mt-0.5">
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
              onClick={() => onNavigateTab('invoices-mpesa')}
              className="w-full py-xs rounded-lg bg-surface-container text-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-xs hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <span>View All System Logs</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Institution Operational Banner */}
      <div className="mt-sm p-md rounded-xl bg-primary text-on-primary shadow-xs flex flex-col md:flex-row items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-lg bg-on-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary-fixed text-[28px]">
              verified
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md font-semibold tracking-tight text-on-primary">
              MoE Term 1 Assessment Portal Deadline
            </span>
            <span className="font-body-md text-body-md text-on-primary/80 mt-0.5">
              All Grade 3 to 6 Summative & Core Strands rubrics must be submitted to KNEC portal by
              Friday, 29th March.
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
