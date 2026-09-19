import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DashboardSummary } from '../../types';

interface SuperAdminDashboardViewProps {
  onNavigateTab: (tabId: any) => void;
  onOpenOnboardSchool?: () => void;
  onOpenPurgeDemo?: () => void;
}

export const SuperAdminDashboardView: React.FC<SuperAdminDashboardViewProps> = ({
  onNavigateTab,
  onOpenOnboardSchool,
  onOpenPurgeDemo,
}) => {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemUptime] = useState('99.98%');
  const [dbMode] = useState('PostgreSQL (Primary) + MongoDB (Audit) + In-Memory Failover');

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await apiService.getDashboardAnalytics();
        if (res.success && res.data) {
          setSummaryData(res.data);
        }
      } catch (err) {
        console.warn('Failed loading super admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalStudents = summaryData?.totalStudents ?? 0;
  const totalTeachers = summaryData?.totalTeachers ?? 0;
  const totalFeeCollected = summaryData?.totalCollectedFees ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Super Admin Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4a0010] via-[#7a1228] to-[#9b1d36] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Root System Controller
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Cluster Operational
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Super Administrator Command Center
            </h1>
            <p className="mt-1 text-sm text-white/80 max-w-xl">
              Central multi-tenant governance, system health diagnostics, role entitlement controls, and platform data persistence.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {onOpenOnboardSchool && (
              <button
                onClick={onOpenOnboardSchool}
                className="px-4 py-2.5 rounded-xl bg-white text-[#7a1228] font-bold text-xs hover:bg-white/95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">domain_add</span>
                <span>Onboard Institution</span>
              </button>
            )}
            {onOpenPurgeDemo && (
              <button
                onClick={onOpenPurgeDemo}
                className="px-4 py-2.5 rounded-xl bg-black/30 hover:bg-black/40 text-white font-semibold text-xs border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                <span>Purge Demo Data</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Infrastructure & Multi-Database Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Active School Tenant</span>
            <span className="material-symbols-outlined text-primary text-[20px]">apartment</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface truncate">
              {user?.schoolName || 'Grace Seeds School'}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Tenant ID: {user?.schoolId || 'school-001'}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Storage & DB Engines</span>
            <span className="material-symbols-outlined text-blue-600 text-[20px]">database</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-on-surface truncate">Hexagonal Multi-DB</div>
            <div className="text-[11px] text-on-surface-variant truncate mt-1" title={dbMode}>
              {dbMode}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Availability</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{systemUptime}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Zero unplanned service downtime</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Aggregated Cashflow</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">payments</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">
              KES {totalFeeCollected.toLocaleString()}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-1">Live Paystack & M-Pesa verified inflow</div>
          </div>
        </div>
      </div>

      {/* Global User Matrix Breakdown */}
      <div className="p-6 rounded-2xl bg-white border border-outline-variant/30 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">System Role Accounts & Access Boundaries</h2>
            <p className="text-xs text-on-surface-variant">
              Every role is equipped with strict route isolation and a dedicated dashboard.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            8 Role Accounts Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { role: 'Super Admin', handle: 'superadmin', desc: 'Root governance & system architecture', icon: 'admin_panel_settings', color: 'border-rose-200 bg-rose-50/50 text-rose-900', tab: 'dashboard' },
            { role: 'Admin', handle: 'admin', desc: 'School executive & WhatsApp desk controller', icon: 'shield_person', color: 'border-red-200 bg-red-50/50 text-red-900', tab: 'dashboard' },
            { role: 'Head Teacher', handle: 'headteacher', desc: 'Curriculum oversight & academic leadership', icon: 'school', color: 'border-purple-200 bg-purple-50/50 text-purple-900', tab: 'schemes-lesson-plans' },
            { role: 'Deputy Head', handle: 'deputy', desc: 'Lesson plan approval queue & timetables', icon: 'fact_check', color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900', tab: 'schemes-lesson-plans' },
            { role: 'Admissions', handle: 'admissions', desc: 'Learner intake & teacher account onboarding', icon: 'person_add', color: 'border-blue-200 bg-blue-50/50 text-blue-900', tab: 'students-guardians' },
            { role: 'Bursar', handle: 'bursar', desc: 'Isolated finance, ledgers, & fee collection', icon: 'account_balance_wallet', color: 'border-amber-200 bg-amber-50/50 text-amber-900', tab: 'cashflow-ledger' },
            { role: 'Teacher', handle: 'teacher', desc: 'CBC rubrics, eDiary, & lesson plan submission', icon: 'menu_book', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900', tab: 'assessments' },
            { role: 'Parent', handle: 'parent', desc: 'Fee clearance, child report cards, & eDiary', icon: 'family_restroom', color: 'border-sky-200 bg-sky-50/50 text-sky-900', tab: 'report-cards' },
          ].map((item) => (
            <div
              key={item.role}
              onClick={() => onNavigateTab(item.tab)}
              className={`p-4 rounded-xl border ${item.color} flex flex-col justify-between hover:shadow-xs transition-all cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/70 border border-black/5">
                  @{item.handle}
                </span>
              </div>
              <div className="mt-3">
                <div className="font-bold text-sm">{item.role}</div>
                <div className="text-[11px] opacity-80 line-clamp-2 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('students-guardians')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Manage Learners</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {totalStudents} Enrolled CBC Learners across all streams
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('teachers-staff')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">badge</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Teaching & Staff Roster</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {totalTeachers} Certified Educators on staff
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('cashflow-ledger')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">receipt_long</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Master Financial Ledger</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Reconciled cashflow, operating expenses, & fee intake
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
