import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { SchemeOfWork, LessonPlan, UserRole } from '../../types';
import { CreateSchemeModal } from '../modals/CreateSchemeModal';
import { CreateLessonPlanModal } from '../modals/CreateLessonPlanModal';
import { useAuth } from '../../context/AuthContext';

export const SchemesView: React.FC = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const isApprover = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.HEAD_TEACHER || user?.role === UserRole.SCHOOL_ADMIN;

  const [activeTab, setActiveTab] = useState<'schemes' | 'lesson-plans'>('schemes');
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateSchemeOpen, setIsCreateSchemeOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

  useEffect(() => {
    async function initTeacher() {
      if (isTeacher) {
        try {
          const res = await apiService.getMyTeacherProfile();
          if (res?.data) {
            setTeacherProfile(res.data);
          }
        } catch {
          // Continue
        }
      }
    }
    initTeacher();
  }, [isTeacher]);

  const loadCurriculum = async () => {
    setLoading(true);
    try {
      const teacherFilter = isTeacher && teacherProfile?.id ? { teacherId: teacherProfile.id } : undefined;
      const [sRes, lpRes] = await Promise.all([
        apiService.getSchemes(teacherFilter).catch(() => null),
        apiService.getLessonPlans(teacherFilter).catch(() => null),
      ]);
      setSchemes(sRes?.data || []);
      setLessonPlans(lpRes?.data || []);
    } catch {
      setSchemes([]);
      setLessonPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, [teacherProfile]);

  const handleApproveScheme = async (schemeId: string) => {
    try {
      const res = await apiService.reviewScheme(schemeId, {
        approved: true,
        remarks: 'Approved by Head Teacher. Well-aligned with CBC learning outcomes.',
      });
      if (res.success) {
        loadCurriculum();
      }
    } catch (err: any) {
      alert(err.message || 'Error approving scheme');
    }
  };

  const handleSubmitScheme = async (schemeId: string) => {
    try {
      const res = await apiService.submitScheme(schemeId);
      if (res.success) {
        loadCurriculum();
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting scheme');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Operations</span>
            <span>/</span>
            <span className="text-primary font-semibold">Schemes & Lesson Plans</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Teacher Schemes of Work & 40-Min CBC Lesson Plans
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isTeacher
              ? 'Your personalized curriculum work plans, weekly syllabus progression, and instructional designs'
              : 'Weekly syllabus progression, learning experiences, inquiry questions, and digital approvals'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'schemes' ? (
            <button
              onClick={() => setIsCreateSchemeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7a1228] text-white rounded-lg hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Scheme of Work</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCreatePlanOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">post_add</span>
              <span>New Lesson Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-container gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('schemes')}
          className={`pb-3 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'schemes'
              ? 'text-[#7a1228] border-b-2 border-[#7a1228]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span>Schemes of Work ({schemes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('lesson-plans')}
          className={`pb-3 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'lesson-plans'
              ? 'text-[#7a1228] border-b-2 border-[#7a1228]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          <span>40-Min Lesson Plans ({lessonPlans.length})</span>
        </button>
      </div>

      {/* Schemes View */}
      {activeTab === 'schemes' && (
        <div className="space-y-4">
          {schemes.length > 0 ? (
            schemes.map((s) => (
              <div
                key={s.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-secondary font-data-mono bg-secondary-container px-2 py-0.5 rounded">
                      Term 1 · 2026
                    </span>
                    <span className="font-bold text-sm text-primary">{s.title}</span>
                  </div>

                  {s.entries && s.entries[0] && (
                    <div className="space-y-1 pt-1">
                      <div className="text-xs text-on-surface font-semibold">
                        Week {s.entries[0].weekNumber}, Lesson {s.entries[0].lessonNumber}: {s.entries[0].strandTitle} ({s.entries[0].subStrandTitle})
                      </div>
                      <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-2 rounded">
                        "{s.entries[0].specificLearningOutcomes?.[0] || 'Outcome defined'}"
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-outline pt-0.5">
                        <span>Inquiry: {s.entries[0].keyInquiryQuestions?.[0]}</span>
                        <span>·</span>
                        <span>Assessment: {s.entries[0].assessmentMethods?.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {s.reviewRemarks && (
                    <div className="text-[11px] text-secondary font-semibold bg-secondary/10 p-1.5 rounded">
                      HOD / Head Teacher Remarks: {s.reviewRemarks}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex md:flex-col items-end justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      s.status === 'APPROVED'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : s.status === 'SUBMITTED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {s.status}
                  </span>

                  <div className="flex gap-2">
                    {s.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        Submit for Review
                      </button>
                    )}
                    {isApprover && s.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleApproveScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-white hover:bg-secondary-container transition-colors cursor-pointer"
                      >
                        Approve & Endorse
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">edit_calendar</span>
              <p className="font-bold text-sm text-on-surface">No schemes of work recorded</p>
              <p className="text-xs text-outline">Click "New Scheme of Work" to create a CBC syllabus progression plan.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plans View */}
      {activeTab === 'lesson-plans' && (
        <div>
          {lessonPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonPlans.map((lp) => (
                <div
                  key={lp.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-surface-container pb-2">
                      <span className="font-data-mono text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                        {lp.durationMinutes} Mins · {lp.lessonDate}
                      </span>
                      <span className="text-xs text-outline font-data-mono">
                        Roll: {lp.rollBoys || 20}B / {lp.rollGirls || 18}G
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <h3 className="font-bold text-sm text-on-surface">{lp.strand}</h3>
                      <p className="text-xs text-primary font-medium">Sub-strand: {lp.subStrand}</p>
                    </div>

                    <div className="mt-3 p-3 rounded-lg bg-surface-container-low text-xs space-y-1.5">
                      <div className="font-semibold text-on-surface">Specific Learning Outcome:</div>
                      <p className="text-on-surface-variant italic">
                        "{lp.specificLearningOutcomes?.[0] || 'Outcome defined'}"
                      </p>
                    </div>

                    <div className="mt-2 text-[11px] text-on-surface-variant flex flex-wrap gap-2">
                      <span>Inquiry: {lp.keyInquiryQuestions?.[0]}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between">
                    <span className="text-[10px] text-outline font-data-mono">{lp.id}</span>
                    <button
                      onClick={() => setSelectedPlan(lp)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View 40-Min Plan</span>
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">post_add</span>
              <p className="font-bold text-sm text-on-surface">No lesson plans prepared yet</p>
              <p className="text-xs text-outline">Click "New Lesson Plan" to prepare a 40-minute CBC instructional guide.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-sm">CBC 40-Minute Lesson Plan</h3>
                <p className="text-xs text-rose-100">{selectedPlan.strand} · {selectedPlan.subStrand}</p>
              </div>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-rose-100 hover:text-white cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface-container-low font-data-mono">
                <div>Duration: <strong>{selectedPlan.durationMinutes} Minutes</strong></div>
                <div>Date: <strong>{selectedPlan.lessonDate}</strong></div>
              </div>

              <div>
                <div className="font-bold text-primary mb-0.5 uppercase">Learning Outcomes:</div>
                <ul className="list-disc list-inside space-y-1 text-on-surface">
                  {selectedPlan.specificLearningOutcomes?.map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-bold text-primary mb-0.5 uppercase">Instructional Steps:</div>
                <div className="space-y-1.5">
                  {selectedPlan.steps?.map((step) => (
                    <div key={step.stepNumber} className="p-2 rounded bg-surface-container-low">
                      <div className="font-semibold text-secondary">{step.stepTitle}</div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        Teacher: {step.teacherActivities}
                      </div>
                      <div className="text-[11px] text-on-surface mt-0.5">
                        Learner: {step.learnerActivities}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPlan.teacherSelfReflection && (
                <div className="p-2.5 rounded-lg bg-secondary/10 border border-secondary/20">
                  <div className="font-bold text-secondary text-[11px]">Teacher Self-Reflection:</div>
                  <div className="text-xs text-on-surface italic mt-0.5">{selectedPlan.teacherSelfReflection}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateSchemeModal
        isOpen={isCreateSchemeOpen}
        onClose={() => setIsCreateSchemeOpen(false)}
        onSchemeCreated={() => loadCurriculum()}
      />

      <CreateLessonPlanModal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        onPlanCreated={() => loadCurriculum()}
      />
    </div>
  );
};
