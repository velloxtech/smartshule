import React, { useState, useEffect, useMemo } from 'react';
import {
  onboardingService,
  AdmittedLearnerOnboarding,
  OnboardingEmailLog,
  ScheduledStepDetails,
} from '../../services/onboardingService';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { formatKenyanPhone } from '../../utils/kenyanConstitution';
import { generateNextSequentialNumber } from '../../utils/sequenceGenerator';
import {
  normalizeToCBCGradeLevel,
  normalizeToGuardianRelationship,
} from './OnboardQueueView';

export interface SlotApplicationsViewProps {
  onAdmitLearner?: (newLearner: any, rawBackendData?: any) => void | Promise<void>;
  onRefreshStudents?: () => void | Promise<void>;
  onNavigateTab?: (tab: any) => void;
}

export const SlotApplicationsView: React.FC<SlotApplicationsViewProps> = ({
  onAdmitLearner,
  onRefreshStudents,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AdmittedLearnerOnboarding[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'SCHEDULED' | 'APPROVED' | 'REJECTED'>('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'agenda'>('cards');

  const [selectedApp, setSelectedApp] = useState<AdmittedLearnerOnboarding | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Scheduling State
  const [schedulingApp, setSchedulingApp] = useState<AdmittedLearnerOnboarding | null>(null);
  const [stepType, setStepType] = useState<
    'SCHOOL_TOUR' | 'READINESS_ASSESSMENT' | 'DOCUMENT_VERIFICATION' | 'INTERVIEW_MEETING'
  >('SCHOOL_TOUR');
  const [stepTitle, setStepTitle] = useState('School Tour & Learner Readiness Interaction');
  const [stepDate, setStepDate] = useState('');
  const [stepTime, setStepTime] = useState('10:00 AM');
  const [stepVenue, setStepVenue] = useState('Grace Seeds School Admissions Office, Kisian, Kisumu');
  const [officerInCharge, setOfficerInCharge] = useState('');
  const [stepNotes, setStepNotes] = useState('');

  // Ratification / Enrolment State
  const [customAdmNo, setCustomAdmNo] = useState('');
  const [streamAssignment, setStreamAssignment] = useState('East');
  const [existingStudentAdmNos, setExistingStudentAdmNos] = useState<string[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Email Viewer Modal State
  const [viewingEmail, setViewingEmail] = useState<OnboardingEmailLog | null>(null);

  const loadData = () => {
    setApplications(onboardingService.getSlotApplications());
  };

  const getNextPureAdmNo = (app?: AdmittedLearnerOnboarding | null) => {
    if (app?.assignedAdmNo && /^\d+$/.test(app.assignedAdmNo.trim())) {
      return app.assignedAdmNo.trim();
    }
    const allKnown = [
      ...existingStudentAdmNos,
      ...applications.map((a) => a.assignedAdmNo).filter((id): id is string => Boolean(id)),
    ];
    return generateNextSequentialNumber(allKnown);
  };

  useEffect(() => {
    loadData();
    onboardingService.fetchEmailConfig().catch(() => {});

    const handleUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('smartshule_onboarding_updated', handleUpdate);
    }

    apiService
      .getStudents()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setExistingStudentAdmNos(res.data.map((s: any) => s.admissionNumber || s.admNo));
        }
      })
      .catch(() => {});

    apiService
      .getClasses()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) setClasses(res.data);
      })
      .catch(() => {});

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartshule_onboarding_updated', handleUpdate);
      }
    };
  }, []);

  // Stats calculation
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const scheduledCount = applications.filter((a) => a.scheduledStep).length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (filterStatus === 'PENDING' && app.status !== 'PENDING') return false;
      if (filterStatus === 'SCHEDULED' && !app.scheduledStep) return false;
      if (filterStatus === 'APPROVED' && app.status !== 'APPROVED') return false;
      if (filterStatus === 'REJECTED' && app.status !== 'REJECTED') return false;

      if (gradeFilter !== 'ALL') {
        const appGrade = app.targetGrade.toLowerCase();
        if (!appGrade.includes(gradeFilter.toLowerCase())) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fullName = `${app.firstName} ${app.middleName || ''} ${app.lastName}`.toLowerCase();
      return (
        fullName.includes(q) ||
        app.trackingCode.toLowerCase().includes(q) ||
        app.parentName.toLowerCase().includes(q) ||
        app.parentPhone.includes(q) ||
        app.parentEmail.toLowerCase().includes(q) ||
        app.targetGrade.toLowerCase().includes(q) ||
        (app.assignedAdmNo && app.assignedAdmNo.toLowerCase().includes(q))
      );
    });
  }, [applications, filterStatus, gradeFilter, searchQuery]);

  // Agenda view: applications with scheduled steps sorted by date
  const scheduledAgenda = useMemo(() => {
    return applications
      .filter((app): app is AdmittedLearnerOnboarding & { scheduledStep: ScheduledStepDetails } =>
        Boolean(app.scheduledStep)
      )
      .sort((a, b) => {
        const dateA = new Date(`${a.scheduledStep.date} ${a.scheduledStep.time}`).getTime() || 0;
        const dateB = new Date(`${b.scheduledStep.date} ${b.scheduledStep.time}`).getTime() || 0;
        return dateA - dateB;
      });
  }, [applications]);

  const openScheduleModal = (app: AdmittedLearnerOnboarding) => {
    setSchedulingApp(app);
    if (app.scheduledStep) {
      setStepType(app.scheduledStep.stepType);
      setStepTitle(app.scheduledStep.stepTitle);
      setStepDate(app.scheduledStep.date);
      setStepTime(app.scheduledStep.time);
      setStepVenue(app.scheduledStep.venue);
      setOfficerInCharge(app.scheduledStep.officerInCharge || user?.name || 'Admissions Directorate');
      setStepNotes(app.scheduledStep.notes || '');
    } else {
      setStepType('SCHOOL_TOUR');
      setStepTitle('School Tour & Learner Readiness Interaction');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStepDate(tomorrow.toISOString().split('T')[0]);
      setStepTime('10:00 AM');
      setStepVenue('Grace Seeds School Admissions Office, Kisian, Kisumu');
      setOfficerInCharge(user?.name ? `${user.name} (${user.role})` : 'Grace Seeds School Admissions Team');
      setStepNotes('Please come accompanied by the child and carry a copy of the clinic immunization card or birth certificate.');
    }
  };

  const handleStepTypeChange = (
    newType: 'SCHOOL_TOUR' | 'READINESS_ASSESSMENT' | 'DOCUMENT_VERIFICATION' | 'INTERVIEW_MEETING'
  ) => {
    setStepType(newType);
    if (newType === 'SCHOOL_TOUR') {
      setStepTitle('School Tour & Learner Readiness Interaction');
      setStepNotes('Please come accompanied by the child for a guided school walkthrough and early learning readiness interaction.');
    } else if (newType === 'READINESS_ASSESSMENT') {
      setStepTitle('CBE Diagnostic Placement & Readiness Evaluation');
      setStepNotes('Diagnostic learning evaluation session for CBE placement and developmental progress check.');
    } else if (newType === 'DOCUMENT_VERIFICATION') {
      setStepTitle('Original Document Verification & Learner KYC Review');
      setStepNotes('Please present original birth certificate, clinic card, and previous school academic progress report.');
    } else {
      setStepTitle('Admissions Directorate Placement Interview');
      setStepNotes('Meeting with school leadership to finalize learner enrolment requirements and orientation.');
    }
  };

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingApp) return;
    if (!stepDate) {
      alert('Please choose a valid appointment date.');
      return;
    }

    const res = onboardingService.scheduleStep(schedulingApp.id, {
      stepType,
      stepTitle,
      date: stepDate,
      time: stepTime,
      venue: stepVenue,
      officerInCharge,
      notes: stepNotes,
      scheduledBy: user?.name || user?.email || 'Admissions Desk',
    });

    if (res) {
      setFeedback({
        type: 'success',
        message: `Appointment scheduled successfully for ${schedulingApp.firstName} ${schedulingApp.lastName} (${stepTitle} on ${stepDate} at ${stepTime}). Formal confirmation email dispatched to ${schedulingApp.parentEmail}.`,
      });
      loadData();
      if (selectedApp?.id === schedulingApp.id) {
        setSelectedApp(res.record);
      }
      setSchedulingApp(null);
    }
  };

  const handleApproveAndEnrol = async (app: AdmittedLearnerOnboarding) => {
    const assignedNumber =
      (customAdmNo && customAdmNo.trim()) ||
      (app.assignedAdmNo && /^\d+$/.test(app.assignedAdmNo.trim()) ? app.assignedAdmNo.trim() : null) ||
      getNextPureAdmNo(app);

    if (!assignedNumber || !/^\d+$/.test(assignedNumber)) {
      alert('Admission number must consist of numbers only (e.g. 01, 02) so children can easily memorize it.');
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const reviewerName = user?.name || user?.email || 'Admissions Director';
      const reviewerRole = user?.role === UserRole.HEAD_TEACHER ? 'Headteacher' : 'Director / Admissions';

      const res = onboardingService.approveOnboarding(
        app.id,
        reviewerName,
        reviewerRole,
        assignedNumber,
        streamAssignment,
        'Learner documents verified and officially ratified for admission.'
      );

      if (!res) throw new Error('Could not approve admission slot application.');

      // Also register into database
      const CBCGrade = normalizeToCBCGradeLevel(app.targetGrade);
      const matchedClass =
        classes.find(
          (c) => c.gradeLevel === CBCGrade || c.name?.toLowerCase().includes(CBCGrade.toLowerCase())
        ) || classes[0];

      const cleanParentPhone = formatKenyanPhone(app.parentPhone);
      const guardianRel = normalizeToGuardianRelationship(app.parentRelationship);
      const validDob = app.dob && /^\d{4}-\d{2}-\d{2}$/.test(app.dob) ? app.dob : '2020-01-01';

      const rawBackend = {
        admissionNumber: assignedNumber,
        upiNumber: app.nemisUpi?.trim() || undefined,
        firstName: app.firstName.trim(),
        middleName: app.middleName?.trim() || undefined,
        lastName: app.lastName.trim(),
        gender: (app.gender === 'Boy' ? 'MALE' : 'FEMALE') as any,
        dateOfBirth: validDob,
        gradeLevel: CBCGrade,
        classroomId: matchedClass?.id,
        classId: matchedClass?.id,
        streamId: matchedClass?.streams?.[0]?.id,
        schoolId: user?.schoolId || matchedClass?.schoolId || 'school-001',
        academicYearId: `year-${new Date().getFullYear()}`,
        county: app.county || 'Kisumu',
        subCounty: app.subCounty || 'Kisumu West',
        medicalConditions: app.medicalConditions || undefined,
        specialNeeds: app.specialNeeds !== 'None' ? app.specialNeeds : undefined,
        emergencyContactName: app.parentName.trim(),
        emergencyContactPhone: cleanParentPhone,
        status: 'ACTIVE',
        guardian: {
          firstName: app.parentName.trim().split(' ')[0] || app.parentName.trim(),
          lastName: app.parentName.trim().split(' ').slice(1).join(' ') || 'Guardian',
          phoneNumber: cleanParentPhone,
          phone: cleanParentPhone,
          emergencyContact: cleanParentPhone,
          email: app.parentEmail.trim().toLowerCase(),
          nationalId: app.parentNationalId?.trim() || undefined,
          relationship: guardianRel,
        },
      };

      try {
        await apiService.registerStudent(rawBackend);
      } catch (err: any) {
        console.warn('Backend sync warning (handled):', err?.message || err);
      }

      if (onAdmitLearner) {
        const studentPayload = {
          admNo: assignedNumber,
          admissionNumber: assignedNumber,
          name: `${app.firstName} ${app.middleName ? app.middleName + ' ' : ''}${app.lastName}`.trim(),
          firstName: app.firstName,
          middleName: app.middleName || '',
          lastName: app.lastName,
          gender: app.gender === 'Boy' ? ('Boy' as const) : ('Girl' as const),
          grade: matchedClass?.name || CBCGrade.replace('_', ' '),
          gradeLevel: CBCGrade,
          stream: streamAssignment,
          guardianName: app.parentName,
          guardianPhone: cleanParentPhone,
          feeBalance: 0,
          totalFee: 0,
          attendanceRate: 100,
          CBCRating: 'ME' as const,
          status: 'Active' as const,
          dateOfBirth: app.dob,
          guardian: {
            firstName: app.parentName.trim().split(' ')[0] || app.parentName.trim(),
            lastName: app.parentName.trim().split(' ').slice(1).join(' ') || 'Guardian',
            email: app.parentEmail.trim().toLowerCase(),
            phoneNumber: cleanParentPhone,
            relationship: guardianRel,
          },
        };
        await onAdmitLearner(studentPayload, rawBackend);
      }

      await onRefreshStudents?.();
      loadData();
      setSelectedApp(null);
      setCustomAdmNo('');
      setFeedback({
        type: 'success',
        message: `Learner ${app.firstName} ${app.lastName} successfully enrolled with numeric Admission No: ${assignedNumber}! Official admission ratification letter dispatched to ${app.parentEmail}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to complete admission ratification.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    if (!selectedApp) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason or clarification instructions for the parent.');
      return;
    }

    const reviewerName = user?.name || user?.email || 'Admissions Administrator';
    const reviewerRole = user?.role === UserRole.HEAD_TEACHER ? 'Headteacher' : 'Director / Admissions';

    onboardingService.rejectOnboarding(selectedApp.id, reviewerName, reviewerRole, rejectReason);
    loadData();
    setShowRejectModal(false);
    setSelectedApp(null);
    setRejectReason('');
    setFeedback({
      type: 'success',
      message: `Feedback & revision request dispatched to parent (${selectedApp.parentEmail}) for application ${selectedApp.trackingCode}.`,
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-[#103b2b] to-[#5a1226] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Admissions Directorate
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Slot Requests & Scheduling Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Admission Slot Applications & Step Scheduling
            </h1>
            <p className="mt-1 text-sm text-emerald-100 max-w-xl">
              Manage prospective slot applications submitted by new parents, schedule school tours and child readiness evaluations, and ratify admission placements.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <div className="inline-flex rounded-xl bg-white/10 p-1 border border-white/20 backdrop-blur-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span>Applications Grid</span>
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'agenda'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>Visits Agenda ({scheduledCount})</span>
              </button>
            </div>

            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh</span>
            </button>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('onboard-queue')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#5a1226] hover:bg-amber-50 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                <span>Onboard Queue</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">New Slot Requests</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-amber-950">{pendingCount}</span>
            <span className="text-[11px] text-amber-700 font-medium">Pending Review</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-blue-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">Tours & Interactions</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-blue-950">{scheduledCount}</span>
            <span className="text-[11px] text-blue-700 font-medium">Scheduled Step 02</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Offers Ratified</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-emerald-950">{approvedCount}</span>
            <span className="text-[11px] text-emerald-700 font-medium">Matriculated / Placed</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Submissions</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-on-surface">{totalCount}</span>
            <span className="text-[11px] text-on-surface-variant font-medium">Prospective Learners</span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
              : 'bg-rose-50 text-rose-950 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'ALL' as const, label: 'All Requests', count: totalCount },
            { id: 'PENDING' as const, label: 'Pending Action', count: pendingCount },
            { id: 'SCHEDULED' as const, label: 'Scheduled Visits', count: scheduledCount },
            { id: 'APPROVED' as const, label: 'Offers Ratified', count: approvedCount },
            { id: 'REJECTED' as const, label: 'Revisions', count: rejectedCount },
          ].map((status) => {
            const isSelected = filterStatus === status.id;
            return (
              <button
                key={status.id}
                onClick={() => setFilterStatus(status.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#103b2b] text-white shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span>{status.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  {status.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grade Filter & Search Input */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="w-full sm:w-40 bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-primary"
          >
            <option value="ALL">All CBE Grades</option>
            <option value="Playgroup">Playgroup</option>
            <option value="PP1">PP1 (Pre-Primary 1)</option>
            <option value="PP2">PP2 (Pre-Primary 2)</option>
            <option value="Grade 1">Grade 1</option>
            <option value="Grade 2">Grade 2</option>
            <option value="Grade 3">Grade 3</option>
            <option value="Grade 4">Grade 4</option>
            <option value="Grade 5">Grade 5</option>
            <option value="Grade 6">Grade 6</option>
          </select>

          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2 text-on-surface-variant/60 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search learner, tracking, phone..."
              className="w-full pl-9 pr-8 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Agenda / Visits Calendar */}
      {viewMode === 'agenda' ? (
        <div className="bg-white rounded-2xl border border-outline-variant/30 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
            <div>
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-800 text-[22px]">calendar_month</span>
                <span>Scheduled School Visits & Child Readiness Interactions</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Timeline of upcoming parent appointments, diagnostic evaluations, and school walkthroughs.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-900 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {scheduledAgenda.length} Confirmed Appointments
            </span>
          </div>

          {scheduledAgenda.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-[40px] text-outline mb-2">event_busy</span>
              <p className="font-bold text-sm">No scheduled visits on the calendar yet</p>
              <p className="text-xs mt-1">Switch to the Applications Grid to schedule school tours for pending applicants.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledAgenda.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                      <span className="text-[10px] font-bold uppercase">
                        {new Date(app.scheduledStep.date).toLocaleString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-base font-black leading-tight">
                        {new Date(app.scheduledStep.date).getDate() || app.scheduledStep.date.slice(-2)}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">
                          {app.firstName} {app.lastName}
                        </span>
                        <span className="text-[10px] font-mono bg-surface-container px-2 py-0.2 rounded font-bold text-on-surface-variant">
                          {app.trackingCode}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900">
                          {app.targetGrade}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-amber-950 mt-1 flex items-center gap-2">
                        <span>⏰ {app.scheduledStep.time}</span>
                        <span>•</span>
                        <span>{app.scheduledStep.stepTitle}</span>
                      </div>

                      <div className="text-[11px] text-on-surface-variant mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Parent: <strong>{app.parentName}</strong> ({app.parentPhone})</span>
                        <span>Venue: {app.scheduledStep.venue}</span>
                        {app.scheduledStep.officerInCharge && (
                          <span>Host: <em>{app.scheduledStep.officerInCharge}</em></span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <button
                      onClick={() => openScheduleModal(app)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit_calendar</span>
                      <span>Reschedule</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setCustomAdmNo(app.assignedAdmNo || getNextPureAdmNo(app));
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">verified</span>
                      <span>Review & Ratify</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: Applications Cards Grid */
        filteredApps.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-outline-variant/30">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px]">inbox</span>
            </div>
            <h3 className="font-bold text-base text-on-surface">No slot applications found</h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No prospective applications match your search query.'
                : 'New parent submissions from the landing page will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between bg-white shadow-xs hover:shadow-md ${
                  app.status === 'PENDING'
                    ? 'border-amber-300 hover:border-amber-500'
                    : app.status === 'APPROVED'
                    ? 'border-emerald-200 hover:border-emerald-400'
                    : 'border-rose-200 hover:border-rose-400'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/20">
                      {app.trackingCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        app.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : app.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {app.status === 'PENDING' ? 'Pending Action' : app.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-on-surface">
                    {app.firstName} {app.middleName ? app.middleName + ' ' : ''}{app.lastName}
                  </h4>
                  <p className="text-xs font-semibold text-[#103b2b] mt-0.5">
                    {app.targetGrade} · {app.entryTerm}
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-outline-variant/20 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="text-[11px]">Primary Guardian:</span>
                      <span className="font-semibold text-on-surface">{app.parentName}</span>
                    </div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="text-[11px]">Contact Phone:</span>
                      <span className="font-mono text-on-surface font-medium">{app.parentPhone}</span>
                    </div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span className="text-[11px]">Parent Email:</span>
                      <span className="text-on-surface truncate max-w-[170px]" title={app.parentEmail}>
                        {app.parentEmail}
                      </span>
                    </div>
                    {app.assignedAdmNo && (
                      <div className="flex items-center justify-between text-emerald-900 bg-emerald-50 px-2 py-1 rounded-md font-medium">
                        <span className="text-[11px]">Assigned Adm No:</span>
                        <span className="font-mono font-bold">{app.assignedAdmNo}</span>
                      </div>
                    )}

                    {/* Scheduled Step Badge */}
                    {app.scheduledStep ? (
                      <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-300 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-amber-950 truncate flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px] text-amber-800">event</span>
                            <span>{app.scheduledStep.stepTitle}</span>
                          </span>
                          <span className="text-[9px] uppercase font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.2 rounded shrink-0">
                            Scheduled
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-900 flex items-center gap-2 font-medium">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {app.scheduledStep.date}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {app.scheduledStep.time}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 p-1.5 bg-surface-container-low rounded-lg flex items-center justify-between text-[11px] text-on-surface-variant">
                        <span className="flex items-center gap-1 text-on-surface-variant/80">
                          <span className="material-symbols-outlined text-[13px]">event_busy</span>
                          <span>Step 02 Tour / Assessment:</span>
                        </span>
                        <span className="font-semibold text-amber-800">Not Scheduled Yet</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApp(app);
                        setCustomAdmNo(app.assignedAdmNo || getNextPureAdmNo(app));
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Dossier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openScheduleModal(app)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border ${
                        app.scheduledStep
                          ? 'bg-amber-100/80 text-amber-900 border-amber-300 hover:bg-amber-200'
                          : 'bg-white text-emerald-950 border-emerald-300 hover:bg-emerald-50'
                      }`}
                      title="Schedule school tour or readiness assessment"
                    >
                      <span className="material-symbols-outlined text-[15px] text-emerald-800">calendar_month</span>
                      <span>{app.scheduledStep ? 'Reschedule' : 'Schedule Step'}</span>
                    </button>
                  </div>

                  {app.status === 'PENDING' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApp(app);
                          setShowRejectModal(true);
                        }}
                        className="px-2 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApp(app);
                          setCustomAdmNo(app.assignedAdmNo || getNextPureAdmNo(app));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        <span>Ratify Offer</span>
                      </button>
                    </div>
                  ) : app.status === 'APPROVED' ? (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      <span>Admitted</span>
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Detailed Dossier Inspector Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
              <div>
                <h4 className="font-bold text-lg text-on-surface">
                  Slot Application Dossier: {selectedApp.firstName} {selectedApp.lastName}
                </h4>
                <p className="text-xs text-on-surface-variant font-mono">
                  Tracking: {selectedApp.trackingCode} · Target: {selectedApp.targetGrade} ({selectedApp.entryTerm})
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {/* Learner Identity */}
              <div>
                <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">1. Learner Identity</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-xl text-xs">
                  <div><span className="text-outline block">Full Name:</span><span className="font-bold">{selectedApp.firstName} {selectedApp.middleName} {selectedApp.lastName}</span></div>
                  <div><span className="text-outline block">Gender:</span><span>{selectedApp.gender}</span></div>
                  <div><span className="text-outline block">Date of Birth:</span><span>{selectedApp.dob || 'Not provided'}</span></div>
                  <div><span className="text-outline block">NEMIS UPI:</span><span className="font-mono">{selectedApp.nemisUpi || 'Pending'}</span></div>
                  <div><span className="text-outline block">Previous School:</span><span>{selectedApp.previousSchool || 'First School'}</span></div>
                  <div><span className="text-outline block">Target CBE Level:</span><span className="font-bold text-emerald-900">{selectedApp.targetGrade}</span></div>
                </div>
              </div>

              {/* Health Notes */}
              <div>
                <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">2. Medical & Dietary Notes</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-xl text-xs">
                  <div><span className="text-outline block">Dietary Restrictions:</span><span>{selectedApp.dietaryRequirements || 'None'}</span></div>
                  <div><span className="text-outline block">Special Needs:</span><span>{selectedApp.specialNeeds || 'None'}</span></div>
                  <div className="col-span-2 sm:col-span-3"><span className="text-outline block">Medical Conditions:</span><span className="font-semibold text-rose-800">{selectedApp.medicalConditions || 'None reported'}</span></div>
                </div>
              </div>

              {/* Primary Guardian KYC */}
              <div>
                <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">3. Primary Guardian KYC</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-xl text-xs">
                  <div><span className="text-outline block">Primary Guardian:</span><span className="font-bold">{selectedApp.parentName} ({selectedApp.parentRelationship})</span></div>
                  <div><span className="text-outline block">Phone Number:</span><span className="font-mono font-bold text-primary">{selectedApp.parentPhone}</span></div>
                  <div><span className="text-outline block">Email Address:</span><span className="font-semibold">{selectedApp.parentEmail}</span></div>
                  <div><span className="text-outline block">National ID / Passport:</span><span className="font-mono">{selectedApp.parentNationalId || 'Pending'}</span></div>
                  <div><span className="text-outline block">Residential Area:</span><span>{selectedApp.residentialAddress}</span></div>
                  <div><span className="text-outline block">Emergency Contact:</span><span>{selectedApp.emergencyContactPhone || selectedApp.parentPhone}</span></div>
                </div>
              </div>

              {/* Step 02: Admission Interaction Scheduling Section */}
              <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-amber-800">event_available</span>
                    <div>
                      <h5 className="font-bold text-amber-950 text-xs uppercase tracking-wider">
                        Step 02: Learner Interaction & School Tour Scheduling
                      </h5>
                      <p className="text-[11px] text-amber-900/80">
                        Schedule CBE readiness evaluation, guided school tour, or document verification.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openScheduleModal(selectedApp)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0 self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                    <span>{selectedApp.scheduledStep ? 'Reschedule Appointment' : 'Schedule Step 02'}</span>
                  </button>
                </div>

                {selectedApp.scheduledStep ? (
                  <div className="bg-white/90 border border-amber-200 rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-950">
                        {selectedApp.scheduledStep.stepTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Confirmed Appointment
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-on-surface">
                      <div>
                        <span className="text-on-surface-variant block text-[11px]">Appointment Date:</span>
                        <span className="font-bold text-amber-950 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {selectedApp.scheduledStep.date}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block text-[11px]">Appointment Time:</span>
                        <span className="font-bold text-amber-950 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {selectedApp.scheduledStep.time}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-on-surface-variant block text-[11px]">Venue:</span>
                        <span>{selectedApp.scheduledStep.venue}</span>
                      </div>
                      {selectedApp.scheduledStep.officerInCharge && (
                        <div>
                          <span className="text-on-surface-variant block text-[11px]">Officer In-Charge:</span>
                          <span>{selectedApp.scheduledStep.officerInCharge}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-on-surface-variant block text-[11px]">Scheduled By:</span>
                        <span>{selectedApp.scheduledStep.scheduledBy}</span>
                      </div>
                      {selectedApp.scheduledStep.notes && (
                        <div className="sm:col-span-2 p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                          <span className="font-bold block text-[10px] uppercase text-amber-950 mb-0.5">Parent Guidance Notes:</span>
                          <p>{selectedApp.scheduledStep.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-900/80 italic">
                    No school tour or CBE placement interaction has been scheduled yet for this applicant. Click &quot;Schedule Step 02&quot; above to arrange an appointment and dispatch an automatic email invitation to {selectedApp.parentEmail}.
                  </p>
                )}
              </div>

              {/* Emails Sent Log */}
              <div>
                <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">4. Outbound Notification Emails Log</h5>
                <div className="space-y-2">
                  {selectedApp.emailsSent && selectedApp.emailsSent.length > 0 ? (
                    selectedApp.emailsSent.map((email) => (
                      <div
                        key={email.id}
                        className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/20 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-on-surface block">{email.subject}</span>
                          <span className="text-[11px] text-on-surface-variant font-mono">
                            To: {email.to} · {new Date(email.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewingEmail(email)}
                          className="px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
                        >
                          Read Email
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-outline italic">No emails logged yet.</p>
                  )}
                </div>
              </div>

              {/* Ratification Panel */}
              {selectedApp.status === 'PENDING' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    Administrative Ratification & Learning Slot Offer
                  </h5>
                  <p className="text-xs text-emerald-950">
                    Ratifying will officially approve learning placement, assign a pure numeric admission number (e.g. 01, 02), matriculate the pupil into the database, and dispatch an official <strong>Admission Offer Notification</strong> to <strong>{selectedApp.parentEmail}</strong>.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">
                        Assigned Admission Number (Pure Numbers Only) *
                      </label>
                      <input
                        type="text"
                        required
                        value={customAdmNo}
                        onChange={(e) => setCustomAdmNo(e.target.value)}
                        placeholder="e.g. 01, 02"
                        className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-950 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">Class Stream *</label>
                      <select
                        value={streamAssignment}
                        onChange={(e) => setStreamAssignment(e.target.value)}
                        className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="Simba">Simba Stream</option>
                        <option value="Chui">Chui Stream</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : selectedApp.status === 'APPROVED' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950">
                  <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider mb-1">
                    Slot Approved & Learner Enrolled
                  </h5>
                  <p>
                    Admission Number: <strong>{selectedApp.assignedAdmNo || 'Pending'}</strong> • Reviewed by {selectedApp.reviewedBy} ({selectedApp.reviewerRole}).
                  </p>
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Close
              </button>

              {selectedApp.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Request Revision / Decline
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleApproveAndEnrol(selectedApp)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>{isProcessing ? 'Enrolling & Sending Email...' : 'Ratify Offer & Enrol'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Step / Admission Interaction Modal */}
      {schedulingApp && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-amber-300 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-amber-800">event_available</span>
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    Schedule Admission Step / Interaction
                  </h4>
                  <p className="text-[11px] text-amber-900/80 font-mono">
                    Candidate: {schedulingApp.firstName} {schedulingApp.lastName} ({schedulingApp.trackingCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingApp(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Interaction Step Type */}
              <div>
                <label className="block font-bold text-on-surface uppercase tracking-wider text-[11px] mb-1.5">
                  Admission Journey Step Type *
                </label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    {
                      type: 'SCHOOL_TOUR' as const,
                      title: 'School Tour & Learner Readiness Interaction',
                      desc: 'Guided tour & play-based readiness interaction (Recommended for Early Years)',
                    },
                    {
                      type: 'READINESS_ASSESSMENT' as const,
                      title: 'CBC Diagnostic Placement Evaluation',
                      desc: 'Diagnostic assessment for Primary grade placement',
                    },
                    {
                      type: 'DOCUMENT_VERIFICATION' as const,
                      title: 'Document Verification & Enrolment Consultation',
                      desc: 'In-person verification of birth cert & academic reports',
                    },
                    {
                      type: 'INTERVIEW_MEETING' as const,
                      title: 'Admissions Directorate Placement Interview',
                      desc: 'Executive meeting with Headteacher or Director',
                    },
                  ].map((item) => (
                    <label
                      key={item.type}
                      className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                        stepType === item.type
                          ? 'border-[#103b2b] bg-[#103b2b]/5 text-[#103b2b] font-bold shadow-2xs'
                          : 'border-outline-variant/30 hover:bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="stepType"
                          value={item.type}
                          checked={stepType === item.type}
                          onChange={() => handleStepTypeChange(item.type)}
                          className="mt-0.5 text-[#103b2b] focus:ring-[#103b2b]"
                        />
                        <span className="text-xs leading-snug">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant/80 mt-1 pl-5 font-normal">
                        {item.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Title Customization */}
              <div>
                <label className="block font-bold text-on-surface text-[11px] mb-1">
                  Appointment Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={stepTitle}
                  onChange={(e) => setStepTitle(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface text-[11px] mb-1">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={stepDate}
                    onChange={(e) => setStepDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface text-[11px] mb-1">
                    Appointment Time *
                  </label>
                  <select
                    value={stepTime}
                    onChange={(e) => setStepTime(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="08:30 AM">08:30 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Venue & Officer */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface text-[11px] mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={stepVenue}
                    onChange={(e) => setStepVenue(e.target.value)}
                    placeholder="e.g. Grace Seeds School Admissions Office, Kisian, Kisumu"
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface text-[11px] mb-1">
                    Host / Officer In-Charge
                  </label>
                  <input
                    type="text"
                    value={officerInCharge}
                    onChange={(e) => setOfficerInCharge(e.target.value)}
                    placeholder="e.g. Admissions Director / Lead Teacher"
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Instructions / Guidance Notes */}
              <div>
                <label className="block font-bold text-on-surface text-[11px] mb-1">
                  Guidance & Preparation Notes for Parent
                </label>
                <textarea
                  rows={2}
                  value={stepNotes}
                  onChange={(e) => setStepNotes(e.target.value)}
                  placeholder="e.g. Please bring the child and copy of clinic immunization card."
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-800 shrink-0 mt-0.5">mail</span>
                <span>Saving this schedule will record the appointment and immediately dispatch a formal confirmation email with appointment details to parent <strong>{schedulingApp.parentEmail}</strong>.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setSchedulingApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Confirm Schedule & Dispatch Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Email Modal */}
      {viewingEmail && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">mail</span>
                <h4 className="font-bold text-sm text-on-surface">Outbound Institutional Email</h4>
              </div>
              <button
                onClick={() => setViewingEmail(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4 bg-surface-container-lowest border-b border-outline-variant/20 text-xs space-y-1">
              <div><strong>To:</strong> {viewingEmail.to} ({viewingEmail.recipientName})</div>
              <div><strong>From:</strong> {viewingEmail.from || onboardingService.getEmailSender()}</div>
              <div><strong>Subject:</strong> {viewingEmail.subject}</div>
              <div><strong>Sent:</strong> {new Date(viewingEmail.sentAt).toLocaleString()}</div>
            </div>
            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs whitespace-pre-wrap text-on-surface bg-surface leading-relaxed">
              {viewingEmail.body}
            </div>
            <div className="p-3 border-t border-outline-variant/20 flex justify-end bg-surface-container-low">
              <button
                onClick={() => setViewingEmail(null)}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection / Revision Request Modal */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 shadow-2xl border border-rose-200">
            <h4 className="font-bold text-base text-rose-900 mb-2">Request Revision / Decline Slot Application</h4>
            <p className="text-xs text-on-surface-variant mb-4">
              Provide feedback for applicant {selectedApp.firstName} {selectedApp.lastName} (Tracking: {selectedApp.trackingCode}). An email will be dispatched to {selectedApp.parentEmail}.
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Please clarify previous school records or contact the admissions office."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 text-xs focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm & Notify Parent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlotApplicationsView;
