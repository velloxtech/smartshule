import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Student, Teacher, LessonPlan, SchemeOfWork } from '../../types';

interface HeadTeacherDashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  onNavigateTab: (tabId: any) => void;
  onOpenKnecSync?: () => void;
  onOpenExportReport?: () => void;
}

export const HeadTeacherDashboardView: React.FC<HeadTeacherDashboardViewProps> = ({
  students,
  teachers,
  onNavigateTab,
  onOpenKnecSync,
  onOpenExportReport,
}) => {
  const { user } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAcademicData() {
      setLoading(true);
      try {
        const [lpRes, schRes] = await Promise.all([
          apiService.getLessonPlans().catch(() => ({ data: [] })),
          apiService.getSchemes().catch(() => ({ data: [] })),
        ]);
        setLessonPlans(lpRes?.data || []);
        setSchemes(schRes?.data || []);
      } catch (err) {
        console.warn('Error loading head teacher academic data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAcademicData();
  }, []);

  const pendingLessonPlans = lessonPlans.filter((lp) => lp.status === 'SUBMITTED');
  const approvedLessonPlans = lessonPlans.filter((lp) => lp.status === 'APPROVED');
  const revisionLessonPlans = lessonPlans.filter((lp) => lp.status === 'REJECTED');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Academic Leadership Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Principal & Academic Leadership
              </span>
              <span className="flex items-center gap-1 text-xs text-purple-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                Term 1 Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Curriculum Standards & Academic Oversight
            </h1>
            <p className="mt-1 text-sm text-purple-100 max-w-xl">
              Supervising instructional quality, CBC rubrics fidelity, teacher curriculum delivery pace, and institutional performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigateTab('schemes-lesson-plans')}
              className="px-4 py-2.5 rounded-xl bg-white text-purple-950 font-bold text-xs hover:bg-white/95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              <span>Review Lesson Plans ({pendingLessonPlans.length})</span>
            </button>
            {onOpenKnecSync && (
              <button
                onClick={onOpenKnecSync}
                className="px-4 py-2.5 rounded-xl bg-purple-800/80 hover:bg-purple-800 text-white font-semibold text-xs border border-purple-400/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">sync</span>
                <span>KNEC CBA Portal</span>
              </button>
            )}
            {onOpenExportReport && (
              <button
                onClick={onOpenExportReport}
                className="px-4 py-2.5 rounded-xl bg-purple-800/80 hover:bg-purple-800 text-white font-semibold text-xs border border-purple-400/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>MoE Report</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('user-management')}
              className="px-4 py-2.5 rounded-xl bg-purple-800/80 hover:bg-purple-800 text-white font-semibold text-xs border border-purple-400/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
              <span>User & Staff Accounts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Academic Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Total Enrolled Learners</span>
            <span className="material-symbols-outlined text-purple-700 text-[20px]">groups</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{students.length}</div>
            <div className="text-[11px] text-purple-700 font-semibold mt-1">
              Active across Playgroup through Grade 9
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Teaching Faculty</span>
            <span className="material-symbols-outlined text-indigo-700 text-[20px]">badge</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{teachers.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Certified CBC subject specialists</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Schemes of Work</span>
            <span className="material-symbols-outlined text-blue-700 text-[20px]">menu_book</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{schemes.length}</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">Approved for Term 1 Delivery</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Lesson Plans In Review</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">pending_actions</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">{pendingLessonPlans.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">
              {approvedLessonPlans.length} Approved · {revisionLessonPlans.length} In Revision
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Supervision & Lesson Plans Review Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-outline-variant/30 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-on-surface">Lesson Plans Review Pipeline</h2>
              <p className="text-xs text-on-surface-variant">
                Direct oversight on lesson plan quality and competency alignment.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('schemes-lesson-plans')}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Schemes</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {pendingLessonPlans.length === 0 ? (
            <div className="py-12 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[36px]">verified</span>
              <span className="font-semibold text-sm text-on-surface">All Lesson Plans Up to Date</span>
              <span>No pending lesson plans require review right now.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLessonPlans.slice(0, 4).map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface">
                        {plan.strand} - {plan.subStrand}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                        Pending Review
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      Date: {plan.lessonDate} · Duration: {plan.durationMinutes} mins · Outlines: {plan.specificLearningOutcomes?.length || 0} outcomes
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('schemes-lesson-plans')}
                    className="px-3 py-1.5 rounded-lg bg-purple-700 text-white font-semibold text-xs hover:bg-purple-800 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    Review Plan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Academic Quick Links & Guidance */}
        <div className="p-6 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-on-surface mb-1">Academic Directives</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Key administrative shortcuts for the principal.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigateTab('cbc-analytics')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-purple-700 text-[22px]">monitoring</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Competency Analytics</div>
                  <div className="text-[11px] text-on-surface-variant">Class proficiency & bell curve</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('report-cards')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-purple-700 text-[22px]">article</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">CBC Report Cards</div>
                  <div className="text-[11px] text-on-surface-variant">Compile term summaries & comments</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('attendance-register')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-purple-700 text-[22px]">checklist</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Daily Attendance Roster</div>
                  <div className="text-[11px] text-on-surface-variant">Verify roll call across streams</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('timetable')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-purple-700 text-[22px]">calendar_view_week</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Master Timetable</div>
                  <div className="text-[11px] text-on-surface-variant">Verify teacher duty & subject allocation</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('user-management')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-purple-700 text-[22px]">manage_accounts</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">User Accounts & Access</div>
                  <div className="text-[11px] text-on-surface-variant">Manage staff credentials & account status</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/50 text-[11px] text-purple-900 leading-relaxed">
            <span className="font-bold">KNEC CBA Guidelines:</span> Formative rubrics for Grades 3 through 6 should be finalized 2 weeks prior to mid-term break.
          </div>
        </div>
      </div>
    </div>
  );
};
