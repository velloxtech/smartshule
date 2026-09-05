import React, { useState, useRef, useEffect } from 'react';
import { Student, Teacher, SystemActivity } from '../../types';
import { attendanceGradeData, weeklyFinanceTrend, feeDefaultersByGrade } from '../../data/mockData';

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
  const [quickActionOpen, setQuickActionOpen] = useState(false);
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

  const totalStudents = students.length > 10 ? 1248 + (students.length - 10) : 1248;
  const boysCount = 612 + Math.floor((students.length - 10) / 2);
  const girlsCount = totalStudents - boysCount;

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
                Term 1, 2024 · Week 8
              </span>
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
                className="absolute right-0 mt-xs w-56 rounded-lg bg-surface-container-lowest p-xs shadow-xl z-50 border border-outline-variant/30 flex flex-col gap-base animate-in fade-in slide-in-from-top-1"
              >
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

      {/* 4 High-Impact KPI Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md my-sm">
        {/* Total Enrolled Learners */}
        <div
          onClick={() => onNavigateTab('students-guardians')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary/30 text-[32px]">groups</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Total Enrolled
              </span>
              <span className="inline-flex items-center text-secondary font-label-md text-label-md font-semibold">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span> +4.2%
              </span>
            </div>
            <div className="flex items-baseline gap-xs mt-xs">
              <span className="font-display text-display text-on-surface font-bold">
                {totalStudents.toLocaleString()}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">learners</span>
            </div>
          </div>
          <div className="mt-md pt-sm bg-surface-container-low/50 rounded-lg p-xs flex items-center justify-between">
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

        {/* Teacher Attendance Today */}
        <div
          onClick={() => onNavigateTab('teachers-staff')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary/40 text-[32px]">co_present</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Teacher Presence
              </span>
              <span className="inline-flex items-center px-xs py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-md text-label-md">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-xs mt-xs">
              <span className="font-display text-display text-secondary font-bold">98.5%</span>
              <span className="font-label-md text-label-md text-on-surface-variant">present</span>
            </div>
          </div>
          <div className="mt-md pt-sm bg-surface-container-low/50 rounded-lg p-xs flex items-center justify-between">
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
              <span className="font-data-mono text-data-mono text-on-surface">42/43 Clocked in</span>
            </div>
            <span className="font-label-md text-label-md text-error font-medium">1 Absent (Permit)</span>
          </div>
        </div>

        {/* Term Fee Collection */}
        <div
          onClick={() => onNavigateTab('invoices-mpesa')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary/30 text-[32px]">
              account_balance_wallet
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Fee Collection
              </span>
              <span className="inline-flex items-center text-secondary font-label-md text-label-md font-semibold">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span> M-Pesa +18%
              </span>
            </div>
            <div className="flex flex-col mt-xs">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                KES {totalCollectedFee.toLocaleString()}
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Target: KES 11,050,000
              </span>
            </div>
          </div>
          <div className="mt-md pt-sm flex flex-col gap-xs">
            <div className="flex justify-between font-label-md text-label-md">
              <span className="text-on-surface-variant">Target Reached</span>
              <span className="font-bold text-primary">
                {((totalCollectedFee / 11050000) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalCollectedFee / 11050000) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* CBC Competency Benchmark */}
        <div
          onClick={() => onNavigateTab('assessments')}
          className="rounded-xl bg-surface-container-lowest p-md flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary/40 text-[32px]">stars</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                CBC Benchmark
              </span>
              <span className="px-xs py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-md text-label-md font-medium">
                KICD Norm
              </span>
            </div>
            <div className="flex items-baseline gap-xs mt-xs">
              <span className="font-display text-display text-primary font-bold">84.2%</span>
              <span className="font-label-md text-label-md text-secondary font-semibold">EE / ME</span>
            </div>
          </div>
          <div className="mt-md pt-sm bg-surface-container-low/50 rounded-lg p-xs flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant">
              Exceeding + Meeting
            </span>
            <span className="font-label-md text-label-md text-secondary font-semibold">
              +3.8% vs T3 2023
            </span>
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
            {attendanceGradeData.map((item) => (
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
            ))}
          </div>

          {/* Attendance Footer Stats */}
          <div className="mt-md pt-sm bg-surface-container-low p-sm rounded-lg flex flex-wrap items-center justify-between gap-xs">
            <div className="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md">
              <span className="w-3 h-3 rounded bg-secondary"></span> Present (97.1% avg)
              <span className="w-3 h-3 rounded bg-error ml-sm"></span> Absent (2.9%)
            </div>
            <span className="font-label-md text-label-md text-on-surface">
              Total Unexplained Absences: <strong className="text-error font-bold">14</strong>
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
                Term 1 Formative
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-md">
              Aggregate distribution of 14,280 learning outcomes assessed
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
                  {/* EE: 34% (circumference ~238.7, 34% = 81.1) */}
                  <circle
                    className="text-secondary"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="38"
                    stroke="currentColor"
                    strokeDasharray="81.1 238.7"
                    strokeDashoffset="0"
                    strokeWidth="12"
                  ></circle>
                  {/* ME: 52% (52% = 124.1) */}
                  <circle
                    className="text-primary"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="38"
                    stroke="currentColor"
                    strokeDasharray="124.1 238.7"
                    strokeDashoffset="-81.1"
                    strokeWidth="12"
                  ></circle>
                  {/* AE: 11% (11% = 26.2) */}
                  <circle
                    className="text-tertiary-container"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="38"
                    stroke="currentColor"
                    strokeDasharray="26.2 238.7"
                    strokeDashoffset="-205.2"
                    strokeWidth="12"
                  ></circle>
                  {/* BE: 3% (3% = 7.1) */}
                  <circle
                    className="text-error"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="38"
                    stroke="currentColor"
                    strokeDasharray="7.1 238.7"
                    strokeDashoffset="-231.4"
                    strokeWidth="12"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">86%</span>
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
                  <span className="font-data-mono text-data-mono font-bold text-secondary">34.0%</span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-primary"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Meeting (ME)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-primary">52.0%</span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-tertiary-container"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Approaching (AE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-tertiary-container">
                    11.0%
                  </span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-error"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Below (BE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-error">3.0%</span>
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
                <span className="font-body-md text-body-md font-bold text-primary">4.8 / 5.0</span>
              </div>
              <div className="bg-surface-container p-xs rounded-lg">
                <span className="font-label-md text-label-md text-on-surface-variant block">Respect</span>
                <span className="font-body-md text-body-md font-bold text-primary">4.6 / 5.0</span>
              </div>
              <div className="bg-surface-container p-xs rounded-lg">
                <span className="font-label-md text-label-md text-on-surface-variant block">
                  Patriotism
                </span>
                <span className="font-body-md text-body-md font-bold text-primary">4.9 / 5.0</span>
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
                <span className="w-2 h-2 rounded-full bg-secondary"></span> Paybill 891230 Active
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
              {feeDefaultersByGrade.map((fd) => (
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
              ))}
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
              {activities.map((act) => (
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
              ))}
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
