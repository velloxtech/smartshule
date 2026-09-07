import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { SchemeOfWork, LessonPlan } from '../../types';
import { CreateSchemeModal } from '../modals/CreateSchemeModal';
import { CreateLessonPlanModal } from '../modals/CreateLessonPlanModal';
import { useAuth } from '../../context/AuthContext';

export const SchemesView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'schemes' | 'lesson-plans'>('schemes');
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateSchemeOpen, setIsCreateSchemeOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

  const loadCurriculum = async () => {
    setLoading(true);
    try {
      const [sRes, lpRes] = await Promise.all([
        apiService.getSchemes().catch(() => null),
        apiService.getLessonPlans().catch(() => null),
      ]);
      if (sRes?.success && sRes.data) setSchemes(sRes.data);
      if (lpRes?.success && lpRes.data) setLessonPlans(lpRes.data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, []);

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
            Weekly syllabus progression, learning experiences, inquiry questions, and digital approvals
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'schemes' ? (
            <button
              onClick={() => setIsCreateSchemeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
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

      {/* Tab Switcher */}
      <div className="flex border-b border-surface-container gap-2">
        <button
          onClick={() => setActiveTab('schemes')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'schemes'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Schemes of Work ({schemes.length})
        </button>
        <button
          onClick={() => setActiveTab('lesson-plans')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'lesson-plans'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          40-Minute Lesson Plans ({lessonPlans.length})
        </button>
      </div>

      {/* Schemes View */}
      {activeTab === 'schemes' && (
        <div className="space-y-4">
          {schemes.map((s) => (
            <div
              key={s.id}
              className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
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
                    HOD Remarks: {s.reviewRemarks}
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
                  {(user?.role === 'SUPER_ADMIN' || user?.role === 'HEAD_TEACHER') && s.status !== 'APPROVED' && (
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
          ))}
        </div>
      )}

      {/* Lesson Plans View */}
      {activeTab === 'lesson-plans' && (
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

                <h3 className="font-bold text-sm text-primary mt-2">{lp.strand}</h3>
                <div className="text-xs font-semibold text-on-surface">{lp.subStrand}</div>

                <div className="mt-3 p-2.5 rounded bg-surface-container-low text-xs space-y-1">
                  <div className="font-semibold text-on-surface">Specific Outcome:</div>
                  <div className="text-on-surface-variant italic">"{lp.specificLearningOutcomes?.[0]}"</div>
                </div>

                <div className="mt-2 text-xs space-y-1">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase">Key Inquiry:</div>
                  <div className="text-on-surface font-medium">{lp.keyInquiryQuestions?.[0]}</div>
                </div>

                {lp.teacherSelfReflection && (
                  <div className="mt-2 text-[11px] text-outline italic">
                    Reflection: "{lp.teacherSelfReflection}"
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-surface-container flex items-center justify-between">
                <span className="text-[10px] text-outline font-data-mono">{lp.id}</span>
                <button
                  onClick={() => setSelectedPlan(lp)}
                  className="px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary transition-colors cursor-pointer"
                >
                  View 4-Step Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lesson Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-sm sm:text-base leading-tight">CBC 40-Min Pedagogical Steps</h3>
                <p className="text-xs text-blue-200">{selectedPlan.strand} · {selectedPlan.subStrand}</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="text-blue-200 hover:text-white cursor-pointer p-1 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs overscroll-contain">
              <div className="space-y-3">
                {selectedPlan.steps?.map((step) => (
                  <div key={step.stepNumber} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span>{step.stepTitle}</span>
                      <span className="font-data-mono text-[11px] bg-surface-container px-2 py-0.5 rounded text-on-surface">
                        {step.durationMinutes} mins
                      </span>
                    </div>
                    <div>
                      <strong className="text-on-surface">Teacher: </strong>
                      <span className="text-on-surface-variant">{step.teacherActivities}</span>
                    </div>
                    <div>
                      <strong className="text-on-surface">Learners: </strong>
                      <span className="text-on-surface-variant">{step.learnerActivities}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedPlan.extendedActivity && (
                <div className="p-3 rounded-lg bg-secondary/10 text-xs text-on-surface border border-secondary/20">
                  <strong className="text-secondary block font-bold mb-0.5">Extended / Home Activity:</strong>
                  <span>{selectedPlan.extendedActivity}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
