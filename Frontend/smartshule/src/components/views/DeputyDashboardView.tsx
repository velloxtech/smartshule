import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Teacher, LessonPlan } from '../../types';

interface DeputyDashboardViewProps {
  teachers: Teacher[];
  onNavigateTab: (tabId: any) => void;
}

export const DeputyDashboardView: React.FC<DeputyDashboardViewProps> = ({
  teachers,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadLessonPlans = async () => {
    setLoading(true);
    try {
      const res = await apiService.getLessonPlans();
      if (res.success && res.data) {
        setLessonPlans(res.data);
      }
    } catch (err) {
      console.warn('Failed to load lesson plans for deputy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessonPlans();
  }, []);

  const pendingPlans = lessonPlans.filter((lp) => lp.status === 'SUBMITTED');
  const approvedPlans = lessonPlans.filter((lp) => lp.status === 'APPROVED');
  const revisionPlans = lessonPlans.filter((lp) => lp.status === 'REJECTED');

  const handleQuickApprove = async (planId: string) => {
    try {
      const res = await apiService.reviewLessonPlan(planId, {
        approved: true,
        remarks: `Approved by Deputy Head Teacher (${user?.fullName || 'Deputy'})`,
      });
      if (res.success) {
        setActionMessage('Lesson plan approved successfully!');
        loadLessonPlans();
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve lesson plan');
    }
  };

  const handleQuickReject = async (planId: string) => {
    const reason = prompt('Enter feedback / revisions needed for the teacher:');
    if (!reason) return;
    try {
      const res = await apiService.reviewLessonPlan(planId, {
        approved: false,
        remarks: reason,
      });
      if (res.success) {
        setActionMessage('Revision request returned to teacher.');
        loadLessonPlans();
        setTimeout(() => setActionMessage(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to request revisions');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Deputy Head Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-blue-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Deputy Head Teacher
              </span>
              <span className="flex items-center gap-1 text-xs text-indigo-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                Curriculum & Operations Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Instructional Supervision & Lesson Plan Approvals
            </h1>
            <p className="mt-1 text-sm text-indigo-100 max-w-xl">
              Approving submitted lesson plans, managing the timetable roster, monitoring daily learner attendance, and coordinating teaching staff.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigateTab('schemes-lesson-plans')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-white/95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">rule</span>
              <span>All Lesson Plans ({pendingPlans.length} Pending)</span>
            </button>
            <button
              onClick={() => onNavigateTab('timetable')}
              className="px-4 py-2.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-800 text-white font-semibold text-xs border border-indigo-400/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
              <span>Timetable Grid</span>
            </button>
            <button
              onClick={() => onNavigateTab('user-management')}
              className="px-4 py-2.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-800 text-white font-semibold text-xs border border-indigo-400/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
              <span>Faculty & User Accounts</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting My Approval</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">pending_actions</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">{pendingPlans.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">
              Lesson plans submitted for review
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Lesson Plans</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">task_alt</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{approvedPlans.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Cleared for classroom instruction</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Revisions Requested</span>
            <span className="material-symbols-outlined text-rose-600 text-[20px]">edit_note</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">{revisionPlans.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Returned to teachers with remarks</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Active Teachers</span>
            <span className="material-symbols-outlined text-indigo-600 text-[20px]">groups</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{teachers.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">On duty across all streams</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Approval Queue */}
      <div className="p-6 rounded-2xl bg-white border border-outline-variant/30 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">Submitted Lesson Plans Awaiting Your Approval</h2>
            <p className="text-xs text-on-surface-variant">
              Approve or return with constructive feedback to ensure CBC pedagogical standards.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
            {pendingPlans.length} In Queue
          </span>
        </div>

        {pendingPlans.length === 0 ? (
          <div className="py-14 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
            <span className="font-bold text-sm text-on-surface">Queue Clear</span>
            <span>All submitted lesson plans have been reviewed and approved!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-xl border border-indigo-200/80 bg-indigo-50/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-on-surface">
                      {plan.strand} · {plan.subStrand}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300/40">
                      SUBMITTED
                    </span>
                  </div>

                  <div className="text-xs text-on-surface-variant flex flex-wrap items-center gap-3">
                    <span><strong>Date:</strong> {plan.lessonDate}</span>
                    <span><strong>Duration:</strong> {plan.durationMinutes} mins</span>
                    <span><strong>Steps:</strong> {plan.steps?.length || 0} stages</span>
                    <span><strong>Outcomes:</strong> {plan.specificLearningOutcomes?.[0] || 'Curriculum aligned'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    onClick={() => handleQuickApprove(plan.id)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleQuickReject(plan.id)}
                    className="px-3.5 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    <span>Request Revision</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deputy Operations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('user-management')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">manage_accounts</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">User Accounts</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Faculty credentials & access status
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('timetable')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">calendar_view_week</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Manage Timetable</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Inspect lesson periods, free teachers, & schedules
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('attendance-register')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">checklist</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Daily Roll Call</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Inspect attendance records and stream completion
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('classes-streams')}
          className="p-5 rounded-2xl bg-white border border-outline-variant/30 hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">meeting_room</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Classes & Streams</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              View class allocations and student distributions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
