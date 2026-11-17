import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Teacher, LessonPlan } from '../../types';
import { FacultyAttendanceRosterCard } from './FacultyAttendanceRosterCard';

interface DeputyDashboardViewProps {
  teachers: Teacher[];
  onNavigateTab: (tabId: any) => void;
}

export const DeputyDashboardView: React.FC<DeputyDashboardViewProps> = ({
  teachers,
  onNavigateTab,
}) => {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);

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

  const recordedPlans = lessonPlans;

  return (
    <div className="space-y-6 pb-12">
      {/* Deputy Head Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-container via-primary to-maroon-light p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Deputy Head Teacher
              </span>
              <span className="flex items-center gap-1 text-xs text-on-primary font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                Curriculum & Operations Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Instructional Supervision & Teaching Records
            </h1>
            <p className="mt-1 text-sm text-on-primary max-w-xl">
              Recording lesson plans and work covered, managing the timetable roster, and coordinating teaching staff.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigateTab('schemes-lesson-plans')}
              className="px-4 py-2.5 rounded-xl bg-white text-on-primary-fixed font-bold text-xs hover:bg-white/95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">rule</span>
              <span>Lesson Plan Records ({recordedPlans.length})</span>
            </button>
            <button
              onClick={() => onNavigateTab('timetable')}
              className="px-4 py-2.5 rounded-xl bg-primary-container/80 hover:bg-primary-container text-white font-semibold text-xs border border-primary/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
              <span>Timetable Grid</span>
            </button>
            <button
              onClick={() => onNavigateTab('teachers-staff')}
              className="px-4 py-2.5 rounded-xl bg-primary-container/80 hover:bg-primary-container text-white font-semibold text-xs border border-primary/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Faculty Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Lesson Plans in Workflow</span>
            <span className="material-symbols-outlined text-primary text-[20px]">pending_actions</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{recordedPlans.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">
              Drafted, awaiting review, and approved
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">After-class Comments</span>
            <span className="material-symbols-outlined text-primary text-[20px]">task_alt</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{recordedPlans.filter(lp => Boolean(lp.teacherSelfReflection?.trim())).length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Saved with their lesson plan</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Record of Work</span>
            <span className="material-symbols-outlined text-rose-600 text-[20px]">edit_note</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">—</div>
            <div className="text-[11px] text-on-surface-variant mt-1">Tracks what was covered after class</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Active Teachers</span>
            <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{teachers.length}</div>
            <div className="text-[11px] text-on-surface-variant mt-1">On duty across all streams</div>
          </div>
        </div>
      </div>

      {/* Live Faculty Attendance & Geofence Clock-In Roster */}
      <FacultyAttendanceRosterCard onNavigateTab={onNavigateTab} />

      {/* Lesson plan records */}
      <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-on-surface">Lesson Plans for Reference</h2>
            <p className="text-xs text-on-surface-variant">
              Lesson plans are saved teaching records. Actual work covered is entered in Records of Work.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
            {recordedPlans.length} Recorded
          </span>
        </div>

        {recordedPlans.length === 0 ? (
          <div className="py-14 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[40px]">check_circle</span>
            <span className="font-bold text-sm text-on-surface">No lesson plans recorded yet</span>
            <span>Saved lesson plans will appear here for reference.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {recordedPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-xl border border-primary/80 bg-primary-fixed/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-on-surface">
                      {plan.strand} · {plan.subStrand}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${plan.status==='APPROVED'?'bg-emerald-100 text-emerald-800 border-emerald-300':plan.status==='SUBMITTED'?'bg-amber-100 text-amber-800 border-amber-300':plan.status==='REJECTED'?'bg-rose-100 text-rose-800 border-rose-300':'bg-surface-container-low text-slate-700 border-slate-300'}`}>
                      {plan.status || 'DRAFT'}
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
                    onClick={() => onNavigateTab('schemes-lesson-plans')}
                    className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>View Records</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab('records-of-work')}
                    className="px-3.5 py-2 rounded-lg bg-white border border-primary text-primary hover:bg-primary-fixed font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    <span>Records of Work</span>
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
          onClick={() => onNavigateTab('teachers-staff')}
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">badge</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface">Faculty Directory</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Teacher profiles & department roster
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('timetable')}
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
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
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
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
          className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
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
