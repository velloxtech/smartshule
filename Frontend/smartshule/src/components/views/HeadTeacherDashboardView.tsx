import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Student, Teacher, LessonPlan, SchemeOfWork } from '../../types';
import { FacultyAttendanceRosterCard } from './FacultyAttendanceRosterCard';
import { DailyAttendanceOverviewCard } from '../common/DailyAttendanceOverviewCard';

interface HeadTeacherDashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  onNavigateTab: (tabId: any) => void;
  onOpenUploadMarks?: () => void;
}

export const HeadTeacherDashboardView: React.FC<HeadTeacherDashboardViewProps> = ({
  students,
  teachers,
  onNavigateTab,
  onOpenUploadMarks,
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7a1228] via-[#5e0d1e] to-[#450a15] p-6 sm:p-8 text-white shadow-xl border border-[#5e0d1e]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white border border-white/40">
                Principal & Academic Leadership
              </span>
              <span className="flex items-center gap-1.5 text-xs text-white font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Term 1 Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Curriculum Standards & Academic Oversight
            </h1>
            <p className="mt-2 text-sm text-rose-100 font-medium max-w-xl leading-relaxed">
              Supervising instructional quality, CBE rubrics fidelity, teacher curriculum delivery pace, and institutional performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenUploadMarks && (
              <button
                onClick={onOpenUploadMarks}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs hover:bg-slate-100 shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-[#7a1228]">upload_file</span>
                <span>Upload Marks</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('schemes-lesson-plans')}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs hover:bg-slate-100 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#7a1228]">fact_check</span>
              <span>Review Lesson Plans ({pendingLessonPlans.length})</span>
            </button>
            <button
              onClick={() => onNavigateTab('teachers-staff')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/30 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Faculty Directory</span>
            </button>
            <button
              onClick={() => onNavigateTab('geofencing')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/30 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">share_location</span>
              <span>School Geofencing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Academic Daily Roll Call & Attendance Oversight */}
      <DailyAttendanceOverviewCard
        onNavigateTab={onNavigateTab}
        title="Head Teacher Daily Attendance & Roll Call Oversight"
        theme="maroon"
        showWholeTermReport={false}
      />

      {/* Academic Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Enrolled Learners */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Total Enrolled Learners</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#7a1228] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-data-mono text-slate-900">{students.length}</div>
            <div className="text-xs text-slate-800 font-bold mt-1.5">
              Active across Playgroup through Grade 9
            </div>
          </div>
        </div>

        {/* Teaching Faculty */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Teaching Faculty</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-data-mono text-slate-900">{teachers.length}</div>
            <div className="text-xs text-slate-800 font-bold mt-1.5">Certified CBE subject specialists</div>
          </div>
        </div>

        {/* Schemes of Work */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Schemes of Work</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-data-mono text-slate-900">{schemes.length}</div>
            <div className="text-xs text-emerald-900 font-bold mt-1.5">Approved for Term 1 Delivery</div>
          </div>
        </div>

        {/* Lesson Plans In Review */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">Lesson Plans In Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-data-mono text-amber-800">{pendingLessonPlans.length}</div>
            <div className="text-xs text-amber-950 font-bold mt-1.5">
              {approvedLessonPlans.length} Approved · {revisionLessonPlans.length} In Revision
            </div>
          </div>
        </div>
      </div>

      {/* Live Faculty Attendance & Geofence Clock-In Roster */}
      <FacultyAttendanceRosterCard onNavigateTab={onNavigateTab} />

      {/* Curriculum Supervision & Lesson Plans Review Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Lesson Plans Review Pipeline</h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                Direct oversight on lesson plan quality, competencies, and curriculum alignment.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('schemes-lesson-plans')}
              className="text-xs font-extrabold text-[#7a1228] hover:text-[#5e0d1e] flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Schemes</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {pendingLessonPlans.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-600 flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[36px]">verified</span>
              <span className="font-bold text-sm text-slate-900">All Lesson Plans Up to Date</span>
              <span className="font-medium text-slate-600">No pending lesson plans require review right now.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLessonPlans.slice(0, 4).map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        {plan.strand} - {plan.subStrand}
                      </span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-400 font-black">
                        Pending Review
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">
                      Date: {plan.lessonDate} · Duration: {plan.durationMinutes} mins · Outlines: {plan.specificLearningOutcomes?.length || 0} outcomes
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('schemes-lesson-plans')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#7a1228] text-white font-bold text-xs hover:bg-[#5e0d1e] transition-colors shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
                  >
                    Review Plan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Academic Quick Links & Directives */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-900 mb-1">Academic Directives</h2>
            <p className="text-xs font-semibold text-slate-700 mb-4">
              Key administrative shortcuts and oversight tools.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigateTab('CBC-analytics')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:bg-rose-50/60 hover:border-[#7a1228]/30 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">monitoring</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Competency Analytics</div>
                  <div className="text-[11px] font-semibold text-slate-700">Class proficiency & bell curve</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('report-cards')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:bg-rose-50/60 hover:border-[#7a1228]/30 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">article</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">CBE Report Cards</div>
                  <div className="text-[11px] font-semibold text-slate-700">Compile term summaries & comments</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('attendance-register')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:bg-rose-50/60 hover:border-[#7a1228]/30 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">checklist</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Daily Attendance Roster</div>
                  <div className="text-[11px] font-semibold text-slate-700">Verify roll call across streams</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('timetable')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:bg-rose-50/60 hover:border-[#7a1228]/30 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">calendar_view_week</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Master Timetable</div>
                  <div className="text-[11px] font-semibold text-slate-700">Verify teacher duty & subject allocation</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('teachers-staff')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:bg-rose-50/60 hover:border-[#7a1228]/30 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#7a1228] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">Faculty Directory</div>
                  <div className="text-[11px] font-semibold text-slate-700">View teaching staff & departmental allocations</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-xs text-slate-900 leading-relaxed font-medium">
            <span className="font-black text-slate-900">Curriculum Delivery Directives:</span> Formative rubrics for Grades 3 through 6 should be finalized 2 weeks prior to mid-term break.
          </div>
        </div>
      </div>
    </div>
  );
};
