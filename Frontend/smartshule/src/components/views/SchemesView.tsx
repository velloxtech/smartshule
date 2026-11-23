import {loadDocumentSchool} from '../curriculum/SchoolDocumentHeader';
import {schemeOfWorkPDF} from '../curriculum/SchemeOfWorkDocument';
import { SchemeApprovalActions } from '../curriculum/SchemeApprovalActions';
import { canReviewCurriculum, canPrepareCurriculum } from '../../utils/curriculumPermissions';
import { LessonPlanDocument, lessonPlansPDF } from '../curriculum/LessonPlanDocument';
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { SchemeOfWork, LessonPlan, UserRole } from '../../types';
import { CreateLessonPlanModal } from '../modals/CreateLessonPlanModal';
import { CreateSchemeModal } from '../modals/CreateSchemeModal';
import { ViewSchemeModal } from '../modals/ViewSchemeModal';
import { useAuth } from '../../context/AuthContext';

interface SchemesViewProps {
  onNavigateTab?: (tab: string) => void;
  initialTab?: 'schemes' | 'lesson-plans';
  initialCreateOpen?: boolean;
}

const schemePeriodLabel = (scheme: SchemeOfWork) => {
  const year = scheme.academicYearId?.match(/\d{4}/)?.[0] || scheme.academicYearId;
  const term = scheme.termId?.match(/(?:term)?[-_ ]?\d{4}[-_ ]?t?([1-3])$/i)?.[1]
    || scheme.termId?.match(/(?:term|t)[-_ ]?([1-3])$/i)?.[1];
  return `${term ? `Term ${term}` : scheme.termId} · ${year}`;
};

export const SchemesView: React.FC<SchemesViewProps> = ({ onNavigateTab, initialTab = 'schemes', initialCreateOpen = false }) => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const isApprover = canReviewCurriculum(user?.role);

  const activeTab = initialTab;
  const navigatePlanningTab = (tab: string) => {
    if (onNavigateTab) onNavigateTab(tab === 'schemes' ? 'schemes-lesson-plans' : tab);
  };
  const [schemes, setSchemes] = useState<SchemeOfWork[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [planClasses, setPlanClasses] = useState<any[]>([]);
  const [planAreas, setPlanAreas] = useState<any[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState('');
  const [metadataAttempt, setMetadataAttempt] = useState(0);
  const [schemeSearch, setSchemeSearch] = useState('');
  const [schemeAreaFilter, setSchemeAreaFilter] = useState('');
  const [schemeClassFilter, setSchemeClassFilter] = useState('');
  const schemeAreaName = (scheme: SchemeOfWork) => planAreas.find(area => area.id === scheme.learningAreaId)?.name || (metadataLoading ? 'Loading learning area…' : 'Learning area unavailable');
  const schemeClassName = (scheme: SchemeOfWork) => planClasses.find(cls => cls.id === scheme.classRoomId)?.name || (metadataLoading ? 'Loading class…' : 'Class unavailable');
  const planContext = { school: schoolInfo, classes: planClasses, areas: planAreas, schemes, teacher: teacherProfile ? {id:teacherProfile.id,userId:teacherProfile.userId||teacherProfile.user?.id||user?.userId||user?.id,name:teacherProfile.user?`${teacherProfile.user.firstName} ${teacherProfile.user.lastName}`:user?.fullName,registrationNumber:teacherProfile.tscNumber} : {userId:user?.userId||user?.id,name:user?.fullName} };
  useEffect(() => {
    let live = true;
    setMetadataLoading(true); setMetadataError('');
    // Subject and class labels must not wait for the document logo to load.
    Promise.allSettled([
      apiService.getClasses().then(result => { if (!result.success) throw new Error('Classes unavailable'); if (live) setPlanClasses(result.data || []); }),
      apiService.getLearningAreas().then(result => { if (!result.success) throw new Error('Learning areas unavailable'); if (live) setPlanAreas(result.data || []); }),
    ]).then(results => {
      if (!live) return;
      if (results.some(result => result.status === 'rejected')) setMetadataError('Some learning area or class names could not be loaded.');
      setMetadataLoading(false);
    });
    apiService.getSchool().then(async result => {
      const school = await loadDocumentSchool(result.data);
      if (live) setSchoolInfo(school);
    }).catch(err => console.error('School document details could not be loaded', err));
    return () => { live = false; };
  }, [metadataAttempt]);
  const [loading, setLoading] = useState(true);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [loadError, setLoadError] = useState('');
  const savedSchemes = schemes.filter(scheme => !scheme.planningState || scheme.planningState.weeklyPlanningStarted || scheme.entries?.some(entry=>!entry.archivedAt));
  const pendingReviews = savedSchemes.filter(scheme => scheme.status === 'SUBMITTED');
  const reviewSchemes = reviewOnly ? pendingReviews : savedSchemes;
  const filterAreaOptions = planAreas.filter(area => reviewSchemes.some(scheme => scheme.learningAreaId === area.id));
  const filterClassOptions = planClasses.filter(cls => reviewSchemes.some(scheme => scheme.classRoomId === cls.id));
  const search = schemeSearch.trim().toLocaleLowerCase();
  const visibleSchemes = reviewSchemes.filter(scheme =>
    (!schemeAreaFilter || scheme.learningAreaId === schemeAreaFilter) &&
    (!schemeClassFilter || scheme.classRoomId === schemeClassFilter) &&
    (!search || [scheme.title, schemeAreaName(scheme), schemeClassName(scheme), schemePeriodLabel(scheme), scheme.status].join(' ').toLocaleLowerCase().includes(search)));
  const clearSchemeFilters = () => { setSchemeSearch(''); setSchemeAreaFilter(''); setSchemeClassFilter(''); };

  // Modals
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreateSchemeOpen, setIsCreateSchemeOpen] = useState(initialCreateOpen);
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
            <span>Curriculum</span>
            <span>/</span>
            <span className="text-primary font-semibold">{activeTab === 'lesson-plans' ? 'Lesson Plans' : 'Schemes of Work'}</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            {activeTab === 'lesson-plans' ? 'Lesson Plans' : 'Schemes of Work'}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {activeTab === 'lesson-plans' ? 'Prepare daily lesson activities and timing from approved scheme sessions.' : 'Create dated teaching sessions, submit schemes for review and manage saved schemes.'}
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">post_add</span>
              <span>New Lesson Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Schemes View */}
      {activeTab === 'schemes' && (
        <div className="space-y-4">
          {loadError && <div role="alert" className="rounded-xl border border-error/30 bg-error-container p-4 text-sm text-on-error-container">{loadError}<button className="ui-button ml-3" onClick={loadCurriculum}>Retry loading schemes</button></div>}
          {isApprover && <div className="flex flex-wrap items-center gap-3"><button className="ui-button" aria-pressed={reviewOnly} onClick={() => setReviewOnly(!reviewOnly)}>{reviewOnly ? 'Show all schemes' : `Awaiting review (${pendingReviews.length})`}</button><p className="text-xs text-on-surface-variant">Review submitted scheme sessions here. Syllabus coverage plans are reviewed on Syllabus Planning.</p></div>}
          {metadataError && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{metadataError}<button className="ui-button ml-2" onClick={() => setMetadataAttempt(attempt => attempt + 1)}>Retry names</button></div>}
          {savedSchemes.length > 0 && <section aria-label="Filter schemes" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs font-semibold">Search schemes<input type="search" className="ui-field mt-1 w-full" value={schemeSearch} onChange={event => setSchemeSearch(event.target.value)} placeholder="Learning area, class, title or term" /></label>
              <label className="text-xs font-semibold">Learning area<select className="ui-field mt-1 w-full" value={schemeAreaFilter} onChange={event => setSchemeAreaFilter(event.target.value)}><option value="">All learning areas</option>{filterAreaOptions.map(area => <option key={area.id} value={area.id}>{area.name}{area.gradeLevel ? ` · ${area.gradeLevel.replace(/_/g, ' ')}` : ''}</option>)}</select></label>
              <label className="text-xs font-semibold">Class<select className="ui-field mt-1 w-full" value={schemeClassFilter} onChange={event => setSchemeClassFilter(event.target.value)}><option value="">All classes</option>{filterClassOptions.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-xs text-on-surface-variant">Showing {visibleSchemes.length} of {reviewSchemes.length} {reviewOnly ? 'submitted schemes' : 'schemes'}</p>{(schemeSearch || schemeAreaFilter || schemeClassFilter) && <button className="ui-button" onClick={clearSchemeFilters}>Clear filters</button>}</div>
          </section>}
          {reviewSchemes.length > 0 && !visibleSchemes.length && <div className="rounded-xl bg-surface-container-low p-6 text-sm"><p>No schemes match your filters.</p><button className="ui-button mt-2" onClick={clearSchemeFilters}>Clear filters</button></div>}
          {reviewOnly && !pendingReviews.length && <p className="rounded-xl bg-surface-container-low p-4 text-sm">No scheme sessions are awaiting review.</p>}
          {savedSchemes.length > 0 ? (
            visibleSchemes.map((s) => {
              const previewEntry=s.entries?.filter(entry=>!entry.archivedAt).sort((a,b)=>a.weekNumber-b.weekNumber||a.lessonNumber-b.lessonNumber)[0];
              return (
              <div
                key={s.id}
                className="min-w-0 bg-surface-container-lowest rounded-xl p-4 sm:p-5 shadow-xs border border-outline-variant/30 space-y-4"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="mb-3 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Learning area</p>
                    <h2 className="break-words text-lg font-bold text-on-surface">{schemeAreaName(s)}</h2>
                    <p className="text-sm text-on-surface-variant">Class: <span className="font-semibold text-on-surface">{schemeClassName(s)}</span></p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="shrink-0 whitespace-nowrap font-bold text-xs text-success font-data-mono bg-success-container px-2 py-0.5 rounded">
                      {schemePeriodLabel(s)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedScheme(s)}
                      className="min-w-0 font-bold text-sm text-primary hover:underline cursor-pointer flex items-start gap-1.5 text-left"
                      title="Click to view full Scheme of Work details"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                      <span className="min-w-0 break-words">{s.title}</span>
                    </button>
                    <span
                      className={`shrink-0 sm:ml-auto px-2.5 py-1 rounded text-xs font-bold ${
                        s.status === 'APPROVED'
                          ? 'bg-success-container text-on-success-container'
                          : s.status === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  {previewEntry && (
                    <div className="space-y-1 pt-1">
                      <div className="text-xs text-on-surface font-semibold">
                        Week {previewEntry.weekNumber}, Lesson {previewEntry.lessonNumber}: {previewEntry.strandTitle} ({previewEntry.subStrandTitle})
                      </div>
                      <p className="text-xs text-on-surface-variant italic bg-surface-container-low p-2 rounded">
                        "{previewEntry.specificLearningOutcomes?.[0] || 'Outcome defined'}"
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-outline pt-0.5">
                        <span>Inquiry: {previewEntry.keyInquiryQuestions?.[0]}</span>
                        <span>·</span>
                        <span>Assessment: {previewEntry.assessmentMethods?.join(', ')}</span>
                      </div>
                    </div>
                  )}
                  {s.planningState && (
                    <p className="pt-1 text-xs text-slate-600">
                      {s.entries?.filter(entry => !entry.archivedAt).length || 0} timetable lessons allocated · {s.planningState.allocations?.filter(item => Number(item.lessons) > 0).length || 0} saved syllabus items · Remaining periods stay open
                    </p>
                  )}
                  {s.status === 'DRAFT' && !s.entries?.some(entry => !entry.archivedAt) && (
                    <p className="pt-1 text-xs font-medium text-amber-800">This term draft cannot be submitted yet. Complete the term scheme and finalize its scheduled lessons first.</p>
                  )}
                  {s.reviewRemarks && (
                    <div className="text-[11px] text-success font-semibold bg-success/10 p-1.5 rounded">
                      HOD / Head Teacher Remarks: {s.reviewRemarks}
                    </div>
                  )}
                </div>

                <div className="min-w-0 border-t border-outline-variant/30 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedScheme(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-container text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="View complete Scheme of Work details and full syllabus matrix"
                    >
                      <span className="material-symbols-outlined text-[17px]">visibility</span>
                      <span>View Details</span>
                    </button>
                    {s.entries?.some(entry => !entry.archivedAt) && <button
                      onClick={() => downloadSchemePDF(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-container text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Download official Scheme of Work as PDF"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Download PDF</span>
                    </button>}
                    {canPrepareCurriculum(user?.role) && ['DRAFT', 'REJECTED'].includes(s.status) && s.entries?.some(entry => !entry.archivedAt) && (
                      <button
                        onClick={() => handleSubmitScheme(s.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary-container transition-colors cursor-pointer"
                      >
                        Submit for Review
                      </button>
                    )}
                    {s.status === 'DRAFT' && !s.entries?.some(entry => !entry.archivedAt) && s.planningState && (
                      <button onClick={() => onNavigateTab?.('scheme-of-work-builder')} className="px-3 py-1.5 rounded-lg border border-primary text-xs font-semibold text-primary">
                        Continue term draft
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteScheme(s.id, s.title)}
                      title="Delete Scheme"
                      aria-label={`Delete scheme ${s.title}`}
                      className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
                {isApprover && <SchemeApprovalActions compact scheme={s} onReviewed={loadCurriculum} />}
              </div>
              );
            })
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
          {lessonPlans.length > 0 && <button onClick={() => lessonPlansPDF(lessonPlans, planContext).save('Lesson_Plans.pdf')} className="px-3 py-2 mb-3 bg-primary text-white rounded-lg">Download all lesson plans (PDF)</button>}
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
                        <span className="font-data-mono text-xs font-bold text-success bg-success-container px-2 py-0.5 rounded">
                          {lp.durationMinutes} Mins · {lp.lessonDate}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${lp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : lp.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-800 border-amber-200' : lp.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-surface text-slate-700 border-slate-200'}`}>
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
                        className="font-bold text-sm text-on-surface hover:text-primary text-left flex items-center gap-1.5 cursor-pointer"
                        title="Click to view lesson plan details"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-white hover:bg-primary-container text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        title="Download official Lesson Plan as PDF"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-container text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="View complete CBE Lesson Plan details"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>View Details</span>
                    </button>
                    <span className="text-xs text-emerald-800">Saved · ready to use; no approval required</span>

                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">post_add</span>
              <p className="font-bold text-sm text-on-surface">No lesson plans prepared yet</p>
              <p className="text-xs text-outline">Click "New Lesson Plan" to prepare a CBE instructional guide for the scheduled period.</p>
            </div>
          )}
        </div>
      )}

      {/* Lesson Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-primary text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-sm">CBC Lesson Plan</h3>
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
              <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${selectedPlan.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : selectedPlan.status === 'REJECTED' ? 'border-rose-200 bg-rose-50 text-rose-800' : selectedPlan.status === 'SUBMITTED' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-surface text-slate-700'}`}><span className="material-symbols-outlined text-base">{selectedPlan.status === 'APPROVED' ? 'verified' : selectedPlan.status === 'SUBMITTED' ? 'pending_actions' : selectedPlan.status === 'REJECTED' ? 'edit_note' : 'draft'}</span><span><strong>{selectedPlan.status || 'DRAFT'}.</strong> {selectedPlan.status === 'APPROVED' ? 'The lesson is approved for teaching.' : selectedPlan.status === 'SUBMITTED' ? 'Awaiting school leadership review.' : selectedPlan.status === 'REJECTED' ? `Returned for changes: ${selectedPlan.reviewRemarks || 'See reviewer comments.'}` : 'Complete the plan and submit it for review.'}</span></div>

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
                <span className="text-xs text-emerald-800">Saved · ready to use; no approval required</span>

                <button
                  onClick={() => downloadLessonPlanPDF(selectedPlan)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-container text-xs font-bold shadow-xs cursor-pointer"
                  title="Download Lesson Plan as PDF"
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
        onSchemeCreated={async () => { await loadCurriculum(); }}
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
        onNavigateTab={(tab) => { setSelectedScheme(null); navigatePlanningTab(tab); }}
      />
    </div>
  );
};

export function SchemesOfWorkView(props: {onNavigateTab?: (tab:string)=>void;initialCreateOpen?:boolean}) { return <SchemesView {...props} initialTab="schemes" />; }
export function LessonPlansView(props: {onNavigateTab?: (tab:string)=>void}) { return <SchemesView {...props} initialTab="lesson-plans" />; }
