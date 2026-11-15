import {loadDocumentSchool} from '../curriculum/SchoolDocumentHeader';
import {schemeOfWorkPDF} from '../curriculum/SchemeOfWorkDocument';
import { SchemeApprovalActions } from '../curriculum/SchemeApprovalActions';
import { canReviewCurriculum } from '../../utils/curriculumPermissions';
import { LessonPlanDocument, lessonPlansPDF } from '../curriculum/LessonPlanDocument';
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { SchemeOfWork, LessonPlan, UserRole } from '../../types';
import { CreateSchemeModal } from '../modals/CreateSchemeModal';
import { CreateLessonPlanModal } from '../modals/CreateLessonPlanModal';
import { ViewSchemeModal } from '../modals/ViewSchemeModal';
import { CurriculumSuiteSwitcher, CurriculumSuiteTab } from '../common/CurriculumSuiteSwitcher';
import { useAuth } from '../../context/AuthContext';

interface SchemesViewProps {
  onNavigateTab?: (tab: string) => void;
  initialTab?: 'schemes' | 'lesson-plans';
}

const schemePeriodLabel = (scheme: SchemeOfWork) => {
  const year = scheme.academicYearId?.match(/\d{4}/)?.[0] || scheme.academicYearId;
  const term = scheme.termId?.match(/(?:term)?[-_ ]?\d{4}[-_ ]?t?([1-3])$/i)?.[1]
    || scheme.termId?.match(/(?:term|t)[-_ ]?([1-3])$/i)?.[1];
  return `${term ? `Term ${term}` : scheme.termId} · ${year}`;
};

export const SchemesView: React.FC<SchemesViewProps> = ({ onNavigateTab, initialTab = 'schemes' }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const isApprover = canReviewCurriculum(user?.role);

  const [activeTab, setActiveTab] = useState<'schemes' | 'lesson-plans'>(initialTab);
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [planClasses, setPlanClasses] = useState<any[]>([]);
  const [planAreas, setPlanAreas] = useState<any[]>([]);
  const planContext = { school: schoolInfo, classes: planClasses, areas: planAreas, schemes, teacher: teacherProfile ? {id:teacherProfile.id,userId:teacherProfile.userId||teacherProfile.user?.id||user?.userId||user?.id,name:teacherProfile.user?`${teacherProfile.user.firstName} ${teacherProfile.user.lastName}`:user?.fullName,registrationNumber:teacherProfile.tscNumber} : {userId:user?.userId||user?.id,name:user?.fullName} };
  useEffect(() => {
    Promise.all([apiService.getSchool(), apiService.getClasses(), apiService.getLearningAreas()])
      .then(async ([school, classes, areas]) => { setSchoolInfo(await loadDocumentSchool(school.data)); setPlanClasses(classes.data || []); setPlanAreas(areas.data || []); })
      .catch(err => console.error('Lesson plan metadata could not be loaded', err));
  }, []);
  const [loading, setLoading] = useState(true);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [loadError, setLoadError] = useState('');
  const pendingReviews = schemes.filter(scheme => scheme.status === 'SUBMITTED' || scheme.planningState?.coverageReviewStatus === 'SUBMITTED');

  // Modals
  const [isCreateSchemeOpen, setIsCreateSchemeOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SchemeOfWork | null>(null);

  const downloadSchemePDF = async (scheme: SchemeOfWork) => {
    try {
      const [years, terms] = await Promise.all([apiService.getAcademicYears(), apiService.getAcademicTermsByYear(scheme.academicYearId)]);
      schemeOfWorkPDF(scheme,schoolInfo,{className:planClasses.find(c=>c.id===scheme.classRoomId)?.name,areaName:planAreas.find(a=>a.id===scheme.learningAreaId)?.name,termName:terms.data?.find(t=>t.id===scheme.termId)?.name,yearName:years.data?.find(y=>y.id===scheme.academicYearId)?.name}).save(`Scheme_${scheme.title.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
    } catch (err:any) { setLoadError(err?.message || 'Could not export the scheme document.'); }
  };

  const downloadLessonPlanPDF = async (plan: LessonPlan) => {
    lessonPlansPDF([plan], planContext).save(`Lesson_Plan_${plan.lessonDate}.pdf`);
  };

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
    setLoading(true); setLoadError('');
    try {
      const teacherFilter = isTeacher && teacherProfile?.id ? { teacherId: teacherProfile.id } : undefined;
      const [sRes, lpRes] = await Promise.all([
        apiService.getSchemes(teacherFilter),
        apiService.getLessonPlans(teacherFilter).catch(() => null),
      ]);
      if (!sRes?.success) throw new Error('Schemes could not be loaded.');
      setSchemes(sRes?.data || []);
      setLessonPlans(lpRes?.data || []);
    } catch (err: any) {
      setLoadError(err.message || 'Schemes could not be loaded. Please retry.');
      setSchemes([]);
      setLessonPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, [teacherProfile]);

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

  const handleSubmitLessonPlan = async (planId: string) => {
    try {
      await apiService.submitLessonPlan(planId);
      await loadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Error submitting lesson plan');
    }
  };

  const handleReviewLessonPlan = async (planId: string, approved: boolean) => {
    const remarks = approved
      ? 'Lesson plan reviewed and approved for teaching.'
      : window.prompt('What should the teacher revise before resubmitting?')?.trim() || '';
    if (!approved && !remarks) return;
    try {
      await apiService.reviewLessonPlan(planId, { approved, remarks });
      await loadCurriculum();
      setSelectedPlan(null);
    } catch (err: any) {
      alert(err.message || 'Error reviewing lesson plan');
    }
  };

  const handleDeleteScheme = async (schemeId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete scheme "${title}"?`)) {
      try {
        const res = await apiService.deleteScheme(schemeId);
        if (res.success) {
          setSchemes((prev) => prev.filter((s) => s.id !== schemeId));
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting scheme');
      }
    }
  };

  const handleDeleteLessonPlan = async (planId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete lesson plan "${title}"?`)) {
      try {
        const res = await apiService.deleteLessonPlan(planId);
        if (res.success) {
          setLessonPlans((prev) => prev.filter((lp) => lp.id !== planId));
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting lesson plan');
      }
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
            Teacher Schemes of Work & 40-Min CBE Lesson Plans
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
              onClick={() => onNavigateTab?.('scheme-of-work-builder')}
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

      {/* Curriculum Planning & Coverage Suite Switcher */}
      <CurriculumSuiteSwitcher
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'schemes' || tab === 'lesson-plans') {
            setActiveTab(tab);
          } else if (onNavigateTab) {
            onNavigateTab(tab);
          }
        }}
        counts={{
          schemes: schemes.length,
          lessonPlans: lessonPlans.length,
        }}
      />

      {/* Schemes View */}
      {activeTab === 'schemes' && (
        <div className="space-y-4">
          {loadError && <div role="alert" className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">{loadError}<button className="ui-button ml-3" onClick={loadCurriculum}>Retry loading schemes</button></div>}
          {isApprover && <div className="flex flex-wrap items-center gap-3"><button className="ui-button" aria-pressed={reviewOnly} onClick={() => setReviewOnly(!reviewOnly)}>{reviewOnly ? 'Show all schemes' : `Awaiting review (${pendingReviews.length})`}</button><p className="text-xs text-on-surface-variant">Review submitted coverage and completed sessions below. Drafts show why approval is not yet available.</p></div>}
          {reviewOnly && !pendingReviews.length && <p className="rounded-xl bg-surface-container-low p-4 text-sm">No submitted coverage or scheme sessions are awaiting review.</p>}
          {schemes.length > 0 ? (
            (reviewOnly ? pendingReviews : schemes).map((s) => (
              <div
                key={s.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-secondary font-data-mono bg-secondary-container px-2 py-0.5 rounded">
                      {schemePeriodLabel(s)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedScheme(s)}
                      className="font-bold text-sm text-primary hover:underline cursor-pointer flex items-center gap-1.5 text-left"
                      title="Click to view full Scheme of Work details"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#7a1228]">visibility</span>
                      <span>{s.title}</span>
                    </button>
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
                  {s.planningState && (
                    <p className="pt-1 text-xs text-slate-600">
                      Term draft: {s.planningState.allocations?.reduce((n, item) => n + (Number(item.lessons) || 0), 0) || 0} lessons allocated · {s.entries?.filter(entry => !entry.archivedAt).length || 0} scheduled lesson plans generated
                    </p>
                  )}
                  {s.status === 'DRAFT' && !s.entries?.some(entry => !entry.archivedAt) && (
                    <p className="pt-1 text-xs font-medium text-amber-800">This term draft cannot be submitted yet. Complete the term scheme and finalize its scheduled lessons first.</p>
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

                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => setSelectedScheme(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="View complete Scheme of Work details and full syllabus matrix"
                    >
                      <span className="material-symbols-outlined text-[17px]">visibility</span>
                      <span>View Details</span>
                    </button>
                    {s.entries?.some(entry => !entry.archivedAt) && <button
                      onClick={() => downloadSchemePDF(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Download official Scheme of Work as PDF"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Download PDF</span>
                    </button>}
                    {isTeacher && s.status === 'DRAFT' && s.entries?.some(entry => !entry.archivedAt) && (
                      <button
                        onClick={() => handleSubmitScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        Submit for Review
                      </button>
                    )}
                    {s.status === 'DRAFT' && !s.entries?.some(entry => !entry.archivedAt) && s.planningState && (
                      <button onClick={() => onNavigateTab?.('scheme-of-work-builder')} className="px-3 py-1.5 rounded-lg border border-[#7a1228] text-xs font-semibold text-[#7a1228]">
                        Continue term draft
                      </button>
                    )}
                    {isApprover && <SchemeApprovalActions compact scheme={s} onReviewed={loadCurriculum} />}
                    <button
                      onClick={() => handleDeleteScheme(s.id, s.title)}
                      title="Delete Scheme"
                      className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">edit_calendar</span>
              <p className="font-bold text-sm text-on-surface">No schemes of work recorded</p>
              <p className="text-xs text-outline">Click "New Scheme of Work" to create a CBE syllabus progression plan.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plans View */}
      {activeTab === 'lesson-plans' && (
        <div>
          {lessonPlans.length > 0 && <button onClick={() => lessonPlansPDF(lessonPlans, planContext).save('Lesson_Plans.pdf')} className="px-3 py-2 mb-3 bg-[#7a1228] text-white rounded-lg">Download all lesson plans (PDF)</button>}
          {lessonPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonPlans.map((lp) => (
                <div
                  key={lp.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-surface-container pb-2 flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-data-mono text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                          {lp.durationMinutes} Mins · {lp.lessonDate}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${lp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : lp.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-800 border-amber-200' : lp.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          <span className="material-symbols-outlined text-[13px]">save</span>
                          <span>{lp.status || 'DRAFT'}</span>
                        </span>
                      </div>
                      <span className="text-xs text-outline font-data-mono">
                        Roll: {lp.rollBoys ?? 0}B / {lp.rollGirls ?? 0}G
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(lp)}
                        className="font-bold text-sm text-on-surface hover:text-[#7a1228] text-left flex items-center gap-1.5 cursor-pointer"
                        title="Click to view lesson plan details"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#7a1228]">visibility</span>
                        <span>{lp.strand}</span>
                      </button>
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

                  <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadLessonPlanPDF(lp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        title="Download official 40-Minute Lesson Plan as PDF"
                      >
                        <span className="material-symbols-outlined text-[14px]">download</span>
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleDeleteLessonPlan(lp.id, lp.strand)}
                        title="Delete Lesson Plan"
                        className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Delete</span>
                      </button>

                    </div>

                    <button
                      onClick={() => setSelectedPlan(lp)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="View complete 40-Minute CBE Lesson Plan details"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>View Details</span>
                    </button>
                    {isTeacher && ['DRAFT', 'REJECTED', 'RECORDED'].includes(lp.status || 'DRAFT') && <button onClick={() => handleSubmitLessonPlan(lp.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Submit for Review</button>}
                    {isApprover && lp.status === 'SUBMITTED' && <button onClick={() => setSelectedPlan(lp)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white">Review</button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">post_add</span>
              <p className="font-bold text-sm text-on-surface">No lesson plans prepared yet</p>
              <p className="text-xs text-outline">Click "New Lesson Plan" to prepare a 40-minute CBE instructional guide.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
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
              <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${selectedPlan.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : selectedPlan.status === 'REJECTED' ? 'border-rose-200 bg-rose-50 text-rose-800' : selectedPlan.status === 'SUBMITTED' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}><span className="material-symbols-outlined text-base">{selectedPlan.status === 'APPROVED' ? 'verified' : selectedPlan.status === 'SUBMITTED' ? 'pending_actions' : selectedPlan.status === 'REJECTED' ? 'edit_note' : 'draft'}</span><span><strong>{selectedPlan.status || 'DRAFT'}.</strong> {selectedPlan.status === 'APPROVED' ? 'The lesson is approved for teaching.' : selectedPlan.status === 'SUBMITTED' ? 'Awaiting school leadership review.' : selectedPlan.status === 'REJECTED' ? `Returned for changes: ${selectedPlan.reviewRemarks || 'See reviewer comments.'}` : 'Complete the plan and submit it for review.'}</span></div>

              <LessonPlanDocument plan={selectedPlan} context={planContext} />
            </div>

            {/* Modal Review Actions Footer */}
            <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-3 py-1.5 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                {isTeacher && ['DRAFT', 'REJECTED', 'RECORDED'].includes(selectedPlan.status || 'DRAFT') && <button onClick={() => handleSubmitLessonPlan(selectedPlan.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Submit for Review</button>}
                {isApprover && selectedPlan.status === 'SUBMITTED' && <><button onClick={() => handleReviewLessonPlan(selectedPlan.id, false)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-700">Return with comments</button><button onClick={() => handleReviewLessonPlan(selectedPlan.id, true)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Approve lesson plan</button></>}
                <button
                  onClick={() => downloadLessonPlanPDF(selectedPlan)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7a1228] text-white hover:bg-[#5e0d1e] text-xs font-bold shadow-xs cursor-pointer"
                  title="Download 40-Minute Lesson Plan as PDF"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Download PDF</span>
                </button>
              </div>
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
        onNavigateTab={onNavigateTab}
      />

      {/* On-screen Scheme of Work Matrix Modal */}
      <ViewSchemeModal
        scheme={selectedScheme}
        context={planContext}
        onClose={() => setSelectedScheme(null)}
        onDownloadPDF={downloadSchemePDF}
        onSubmitForReview={handleSubmitScheme}
        onRefresh={async () => { await loadCurriculum(); if (selectedScheme) { const result = await apiService.getSchemeById(selectedScheme.id); if (result.data) setSelectedScheme(result.data); } }}
        onNavigateTab={(tab) => { setSelectedScheme(null); if (tab === 'lesson-plans') setActiveTab('lesson-plans'); else onNavigateTab?.(tab); }}
      />
    </div>
  );
};
