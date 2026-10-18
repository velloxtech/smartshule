import React, { useState, useEffect, useMemo } from 'react';
import { onboardingService, AdmittedLearnerOnboarding, OnboardingEmailLog } from '../../services/onboardingService';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { formatKenyanPhone } from '../../utils/kenyanConstitution';
import { generateNextSequentialNumber } from '../../utils/sequenceGenerator';

export const normalizeToCBCGradeLevel = (gradeStr: string): string => {
  const g = (gradeStr || '').trim().toUpperCase();
  if (g.includes('PLAYGROUP')) return 'PLAYGROUP';
  if (g.includes('PP1') || g.includes('PRE-PRIMARY 1')) return 'PP1';
  if (g.includes('PP2') || g.includes('PRE-PRIMARY 2')) return 'PP2';
  if (g.includes('GRADE 1') || g === 'GRADE_1' || g === 'G1') return 'GRADE_1';
  if (g.includes('GRADE 2') || g === 'GRADE_2' || g === 'G2') return 'GRADE_2';
  if (g.includes('GRADE 3') || g === 'GRADE_3' || g === 'G3') return 'GRADE_3';
  if (g.includes('GRADE 4') || g === 'GRADE_4' || g === 'G4') return 'GRADE_4';
  if (g.includes('GRADE 5') || g === 'GRADE_5' || g === 'G5') return 'GRADE_5';
  if (g.includes('GRADE 6') || g === 'GRADE_6' || g === 'G6') return 'GRADE_6';
  if (g.includes('GRADE 7') || g === 'GRADE_7' || g === 'G7') return 'GRADE_7';
  if (g.includes('GRADE 8') || g === 'GRADE_8' || g === 'G8') return 'GRADE_8';
  if (g.includes('GRADE 9') || g === 'GRADE_9' || g === 'G9') return 'GRADE_9';
  return 'GRADE_1';
};

export const normalizeToGuardianRelationship = (
  relStr: string
): 'MOTHER' | 'FATHER' | 'LEGAL_GUARDIAN' | 'SPONSOR' | 'OTHER' => {
  const r = (relStr || '').trim().toUpperCase();
  if (r.includes('MOTHER')) return 'MOTHER';
  if (r.includes('FATHER')) return 'FATHER';
  if (r.includes('LEGAL') || r.includes('GUARDIAN')) return 'LEGAL_GUARDIAN';
  if (r.includes('SPONSOR')) return 'SPONSOR';
  return 'OTHER';
};

export interface OnboardQueueViewProps {
  onAdmitLearner?: (newLearner: any, rawBackendData?: any) => void | Promise<void>;
  onRefreshStudents?: () => void | Promise<void>;
  onNavigateTab?: (tab: any) => void;
}

export const OnboardQueueView: React.FC<OnboardQueueViewProps> = ({
  onAdmitLearner,
  onRefreshStudents,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AdmittedLearnerOnboarding[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AdmittedLearnerOnboarding | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [streamAssignment, setStreamAssignment] = useState('East');
  const [customAdmNo, setCustomAdmNo] = useState('');
  const [existingStudentAdmNos, setExistingStudentAdmNos] = useState<string[]>([]);
  const [approvalNotes, setApprovalNotes] = useState('Dossier verified and approved for CBC admission.');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [viewingEmail, setViewingEmail] = useState<OnboardingEmailLog | null>(null);

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

  const [classes, setClasses] = useState<any[]>([]);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);

  const isAuthorized = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.DEPUTY_HEAD_TEACHER,
    UserRole.ADMISSIONS,
  ].includes(user?.role as UserRole);

  const loadData = () => {
    setApplications(onboardingService.getOnboardings());
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

    apiService
      .getStudents()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setExistingStudentAdmNos(res.data.map((s: any) => s.admissionNumber || s.admNo));
        }
      })
      .catch(() => {});

    Promise.all([
      apiService.getClasses().catch(() => null),
      apiService.getCurrentContext().catch(() => null),
      apiService.getSchool().catch(() => null),
    ]).then(([clsRes, ctxRes, schRes]) => {
      if (clsRes?.success && Array.isArray(clsRes.data)) setClasses(clsRes.data);
      if (ctxRes?.success && ctxRes.data) setCurrentContext(ctxRes.data);
      if (schRes?.success && schRes.data) setSchoolProfile(schRes.data);
    });
  }, []);

  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (filterStatus !== 'ALL' && app.status !== filterStatus) return false;
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
  }, [applications, filterStatus, searchQuery]);

  const preparePayloads = (app: AdmittedLearnerOnboarding, assignedAdmNo: string) => {
    const CBCGrade = normalizeToCBCGradeLevel(app.targetGrade);
    const matchedClass =
      classes.find(
        (c) => c.gradeLevel === CBCGrade || c.name?.toLowerCase().includes(CBCGrade.toLowerCase())
      ) || classes[0];

    const matchedStream = matchedClass?.streams?.find(
      (s: any) =>
        s.name?.toLowerCase() === streamAssignment.toLowerCase() ||
        s.id === streamAssignment
    );

    const cleanParentPhone = formatKenyanPhone(app.parentPhone);
    const cleanEmergencyPhone = formatKenyanPhone(app.emergencyContactPhone || app.parentPhone);
    const guardianRel = normalizeToGuardianRelationship(app.parentRelationship);
    const validDob = app.dob && /^\d{4}-\d{2}-\d{2}$/.test(app.dob) ? app.dob : '2020-01-01';

    const rawBackend = {
      admissionNumber: assignedAdmNo,
      upiNumber: app.nemisUpi?.trim() || undefined,
      firstName: app.firstName.trim(),
      middleName: app.middleName?.trim() || undefined,
      lastName: app.lastName.trim(),
      dateOfBirth: validDob,
      gender: (app.gender === 'Boy' ? 'MALE' : 'FEMALE') as any,
      gradeLevel: CBCGrade,
      classroomId: matchedClass?.id,
      streamId: matchedStream?.id,
      schoolId: user?.schoolId || schoolProfile?.id || matchedClass?.schoolId || 'school-001',
      academicYearId: currentContext?.currentYear?.id || 'year-2026',
      termId: currentContext?.currentTerm?.id || 'term-2026-t1',
      medicalConditions: app.medicalConditions?.trim() || undefined,
      specialNeeds: app.specialNeeds && app.specialNeeds !== 'None' ? app.specialNeeds : undefined,
      emergencyContactName: app.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: cleanEmergencyPhone,
      admissionFee: 1500,
      guardian: {
        firstName: app.parentName.trim().split(' ')[0] || app.parentName.trim(),
        lastName: app.parentName.trim().split(' ').slice(1).join(' ') || 'Guardian',
        email: app.parentEmail.trim().toLowerCase(),
        phoneNumber: cleanParentPhone,
        relationship: guardianRel,
        nationalId: app.parentNationalId?.trim() || undefined,
      },
    };

    return { rawBackend, CBCGrade, matchedClass, cleanParentPhone, cleanEmergencyPhone, guardianRel };
  };

  const handleApprove = async (app: AdmittedLearnerOnboarding) => {
    try {
      setIsProcessing(true);
      setFeedback(null);

      const reviewerName = user?.name || user?.email || 'School Administrator';
      const reviewerRole =
        user?.role === UserRole.HEAD_TEACHER
          ? 'Headteacher'
          : user?.role === UserRole.SUPER_ADMIN
          ? 'School Director'
          : 'Admissions Officer';

      const generatedAdmNo =
        (customAdmNo.trim() && /^\d+$/.test(customAdmNo.trim()) ? customAdmNo.trim() : null) ||
        getNextPureAdmNo(app);

      const { rawBackend, CBCGrade, matchedClass, cleanParentPhone, cleanEmergencyPhone, guardianRel } = preparePayloads(app, generatedAdmNo);

      let savedStudent: any = null;
      try {
        const regRes = await apiService.registerStudent(rawBackend);
        if (regRes?.success && regRes.data) {
          savedStudent = regRes.data;
        } else {
          throw new Error((regRes as any)?.error?.message || (regRes as any)?.message || 'Database registration failed.');
        }
      } catch (regErr: any) {
        throw new Error(`Failed to enrol learner into database: ${regErr.message || regErr}`);
      }

      const assignedNumber = savedStudent.admissionNumber || generatedAdmNo;

      onboardingService.approveOnboarding(
        app.id,
        reviewerName,
        reviewerRole,
        assignedNumber,
        streamAssignment,
        approvalNotes
      );

      if (onAdmitLearner) {
        const studentPayload = {
          id: savedStudent.id,
          admNo: assignedNumber,
          admissionNumber: assignedNumber,
          upi: savedStudent.upiNumber || app.nemisUpi || '--',
          upiNumber: savedStudent.upiNumber || app.nemisUpi || undefined,
          nemis: savedStudent.upiNumber || app.nemisUpi || '--',
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
          feeBalance: savedStudent.invoice?.balance ?? 0,
          totalFee: savedStudent.invoice?.amountPayable ?? 0,
          attendanceRate: 100,
          CBCRating: 'ME' as const,
          status: 'Active' as const,
          dateOfBirth: app.dob,
          medicalConditions: app.medicalConditions || undefined,
          specialNeeds: app.specialNeeds !== 'None' ? app.specialNeeds : undefined,
          guardian: {
            firstName: app.parentName.trim().split(' ')[0] || app.parentName.trim(),
            lastName: app.parentName.trim().split(' ').slice(1).join(' ') || 'Guardian',
            email: app.parentEmail.trim().toLowerCase(),
            phoneNumber: cleanParentPhone,
            relationship: guardianRel,
            nationalId: app.parentNationalId?.trim() || undefined,
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
        message: `Learner ${app.firstName} ${app.lastName} successfully enrolled into database with Admission No: ${assignedNumber}! Official admission ratification email dispatched to ${app.parentEmail}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to approve onboarding application.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToDatabase = async (app: AdmittedLearnerOnboarding) => {
    try {
      setIsProcessing(true);
      setFeedback(null);

      const targetAdmNo =
        (app.assignedAdmNo && /^\d+$/.test(app.assignedAdmNo.trim()) ? app.assignedAdmNo.trim() : null) ||
        getNextPureAdmNo(app);

      const { rawBackend, CBCGrade, matchedClass, cleanParentPhone, cleanEmergencyPhone, guardianRel } = preparePayloads(app, targetAdmNo);

      let savedStudent: any = null;
      try {
        const regRes = await apiService.registerStudent(rawBackend);
        if (regRes?.success && regRes.data) {
          savedStudent = regRes.data;
        } else {
          throw new Error((regRes as any)?.error?.message || (regRes as any)?.message || 'Database registration failed.');
        }
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('already exists')) {
          await onRefreshStudents?.();
          setFeedback({
            type: 'success',
            message: `Learner ${app.firstName} ${app.lastName} (Adm #${targetAdmNo}) is already saved in the database. Active student directory updated.`,
          });
          return;
        }
        throw err;
      }

      const assignedNumber = savedStudent.admissionNumber || targetAdmNo;

      if (onAdmitLearner) {
        const studentPayload = {
          id: savedStudent.id,
          admNo: assignedNumber,
          admissionNumber: assignedNumber,
          upi: savedStudent.upiNumber || app.nemisUpi || '--',
          upiNumber: savedStudent.upiNumber || app.nemisUpi || undefined,
          nemis: savedStudent.upiNumber || app.nemisUpi || '--',
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
          feeBalance: savedStudent.invoice?.balance ?? 0,
          totalFee: savedStudent.invoice?.amountPayable ?? 0,
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
      setFeedback({
        type: 'success',
        message: `Successfully synchronized ${app.firstName} ${app.lastName} to institutional database.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to sync learner to database.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    if (!selectedApp) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason for requesting revision or declining.');
      return;
    }

    const reviewerName = user?.name || user?.email || 'School Administrator';
    const reviewerRole = user?.role === UserRole.HEAD_TEACHER ? 'Headteacher' : 'Director / Admissions';

    onboardingService.rejectOnboarding(selectedApp.id, reviewerName, reviewerRole, rejectReason);
    loadData();
    setShowRejectModal(false);
    setSelectedApp(null);
    setRejectReason('');
    setFeedback({
      type: 'success',
      message: `Revision request dispatched to parent (${selectedApp.parentEmail}) for tracking code ${selectedApp.trackingCode}.`,
    });
  };

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
      setStepTitle('CBC Diagnostic Placement & Readiness Evaluation');
      setStepNotes('Diagnostic learning evaluation session for CBC placement and developmental progress check.');
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

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-amber-900 to-[#5a1226] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Admitted Learner Desk
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Portal Live & Listening
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <span>Learner Onboard Queue & Ratifications</span>
            </h1>
            <p className="mt-1 text-sm text-amber-100 max-w-xl">
              Review submitted learner biodata, verify guardian KYC details, assign pure numeric admission numbers, and dispatch official admission letters.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer backdrop-blur-xs"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Refresh Queue</span>
            </button>
            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('slot-applications')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                  <span>Slot Applications</span>
                </button>
                <button
                  onClick={() => onNavigateTab('students-guardians')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#5a1226] hover:bg-amber-50 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  <span>Active Learners Directory</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Pending Review</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-amber-950">{pendingCount}</span>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting Ratification</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Approved & Enrolled</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-emerald-950">{approvedCount}</span>
            <span className="text-[11px] text-emerald-700 font-medium">Matriculated to DB</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Revision Required</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-rose-950">{rejectedCount}</span>
            <span className="text-[11px] text-rose-700 font-medium">Feedback Dispatched</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Submissions</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-data-mono text-on-surface">{applications.length}</span>
            <span className="text-[11px] text-on-surface-variant font-medium">Lifetime Dossiers</span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
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
      <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => {
            const count =
              status === 'ALL'
                ? applications.length
                : status === 'PENDING'
                ? pendingCount
                : status === 'APPROVED'
                ? approvedCount
                : rejectedCount;
            const isSelected = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#5a1226] text-white shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span>
                  {status === 'ALL'
                    ? 'All'
                    : status === 'PENDING'
                    ? 'Pending Review'
                    : status === 'APPROVED'
                    ? 'Approved'
                    : 'Revisions'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/60 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learner, tracking, phone..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-primary focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Applications Cards Grid */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-outline-variant/30">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px]">inbox</span>
          </div>
          <h3 className="font-bold text-base text-on-surface">No onboarding applications found</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No submissions match your active search keyword. Try clearing the search query.'
              : 'Parents submit their admission details via the Admitted Learner Onboarding portal.'}
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
                    {app.status === 'PENDING' ? 'Pending Review' : app.status}
                  </span>
                </div>

                <h4 className="font-bold text-base text-on-surface">
                  {app.firstName} {app.middleName ? app.middleName + ' ' : ''}{app.lastName}
                </h4>
                <p className="text-xs font-semibold text-[#5a1226] mt-0.5">
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
                        <span>Step 02 Interaction:</span>
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
                        : 'bg-white text-[#5a1226] border-[#5a1226]/30 hover:bg-[#5a1226]/5'
                    }`}
                    title="Schedule school tour or readiness assessment"
                  >
                    <span className="material-symbols-outlined text-[15px] text-amber-800">calendar_month</span>
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
                      <span>Ratify</span>
                    </button>
                  </div>
                ) : app.status === 'APPROVED' ? (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleSyncToDatabase(app)}
                    className="px-2.5 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">sync</span>
                    <span>Re-sync DB</span>
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Dossier Inspector Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
              <div>
                <h4 className="font-bold text-lg text-on-surface">
                  Onboarding Dossier: {selectedApp.firstName} {selectedApp.lastName}
                </h4>
                <p className="text-xs text-on-surface-variant font-mono">
                  Tracking: {selectedApp.trackingCode} · Level: {selectedApp.targetGrade} ({selectedApp.entryTerm})
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
              <div>
                <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">1. Learner Identity</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-xl text-xs">
                  <div><span className="text-outline block">Full Name:</span><span className="font-bold">{selectedApp.firstName} {selectedApp.middleName} {selectedApp.lastName}</span></div>
                  <div><span className="text-outline block">Gender:</span><span>{selectedApp.gender}</span></div>
                  <div><span className="text-outline block">Date of Birth:</span><span>{selectedApp.dob}</span></div>
                  <div><span className="text-outline block">Birth Certificate No:</span><span className="font-mono">{selectedApp.birthCertNo}</span></div>
                  <div><span className="text-outline block">NEMIS UPI:</span><span className="font-mono">{selectedApp.nemisUpi || 'Pending'}</span></div>
                  <div><span className="text-outline block">County / Sub-County:</span><span>{selectedApp.county}, {selectedApp.subCounty}</span></div>
                  <div className="col-span-2 sm:col-span-3"><span className="text-outline block">Previous School:</span><span>{selectedApp.previousSchool || 'None (First School)'}</span></div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">2. Medical & Health Profile</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-xl text-xs">
                  <div><span className="text-outline block">Special Educational Needs:</span><span>{selectedApp.specialNeeds || 'None'}</span></div>
                  <div><span className="text-outline block">Dietary Restrictions:</span><span>{selectedApp.dietaryRequirements || 'None'}</span></div>
                  <div><span className="text-outline block">Preferred Emergency Clinic:</span><span>{selectedApp.emergencyClinic || 'School Health Bay'}</span></div>
                  <div className="col-span-2 sm:col-span-3"><span className="text-outline block">Known Medical Conditions / Allergies:</span><span className="font-semibold text-rose-800">{selectedApp.medicalConditions || 'None reported'}</span></div>
                </div>
              </div>

              <div>
                <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">3. Primary Guardian KYC & Emergency Contact</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-xl text-xs">
                  <div><span className="text-outline block">Primary Guardian:</span><span className="font-bold">{selectedApp.parentName} ({selectedApp.parentRelationship})</span></div>
                  <div><span className="text-outline block">National ID / Passport:</span><span className="font-mono">{selectedApp.parentNationalId}</span></div>
                  <div><span className="text-outline block">Phone Number:</span><span className="font-mono font-bold text-primary">{selectedApp.parentPhone}</span></div>
                  <div><span className="text-outline block">Email Address:</span><span className="font-semibold">{selectedApp.parentEmail}</span></div>
                  <div><span className="text-outline block">Occupation:</span><span>{selectedApp.parentOccupation || 'Not provided'}</span></div>
                  <div><span className="text-outline block">Physical Address:</span><span>{selectedApp.residentialAddress}</span></div>
                  <div className="col-span-2 sm:col-span-3 border-t border-outline-variant/30 pt-2">
                    <span className="text-outline block">Secondary Emergency Contact:</span>
                    <span className="font-semibold">{selectedApp.emergencyContactName} ({selectedApp.emergencyContactRelationship}) · {selectedApp.emergencyContactPhone}</span>
                  </div>
                </div>
              </div>

              {/* Step 02: Learner Interaction & School Tour Scheduling */}
              <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-amber-800">event_available</span>
                    <div>
                      <h5 className="font-bold text-amber-950 text-xs uppercase tracking-wider">
                        Step 02: Learner Interaction & School Tour Scheduling
                      </h5>
                      <p className="text-[11px] text-amber-900/80">
                        Schedule CBC readiness evaluation, guided school tour, or document verification.
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
                    No school tour or CBC placement interaction has been scheduled yet for this applicant. Click &quot;Schedule Step 02&quot; above to arrange an appointment and dispatch an automatic email invitation to {selectedApp.parentEmail}.
                  </p>
                )}
              </div>

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

              {selectedApp.status === 'PENDING' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <h5 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    Administrative Ratification & Database Enrolment
                  </h5>
                  <p className="text-xs text-emerald-950">
                    Approving will register the pupil file directly into the <strong>PostgreSQL database</strong>, create active billing & guardian accounts, and automatically dispatch an <strong>Official Admission Letter email</strong> to <strong>{selectedApp.parentEmail}</strong>.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 mb-1">
                        Assigned Admission Number (Numbers Only) *
                      </label>
                      <p className="text-[10px] text-emerald-800/80 mb-1.5">
                        Use numbers only (no words or letters) so it is easy for children to memorize.
                      </p>
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
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-blue-900 text-xs uppercase tracking-wider">
                      Approved Learner Status
                    </h5>
                    <p className="text-xs text-blue-950 mt-0.5">
                      Assigned Admission Number: <strong>{selectedApp.assignedAdmNo || 'Pending'}</strong>.
                      Reviewed by {selectedApp.reviewedBy} ({selectedApp.reviewerRole}).
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleSyncToDatabase(selectedApp)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    <span>Sync to DB</span>
                  </button>
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
                    onClick={() => handleApprove(selectedApp)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>{isProcessing ? 'Enrolling & Sending Email...' : 'Approve, Enrol & Send Email'}</span>
                  </button>
                </div>
              )}
            </div>
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
            <h4 className="font-bold text-base text-rose-900 mb-2">Request Revision / Decline Onboarding</h4>
            <p className="text-xs text-on-surface-variant mb-4">
              Provide instructions for learner {selectedApp.firstName} {selectedApp.lastName} (Tracking: {selectedApp.trackingCode}). An update email will be dispatched to {selectedApp.parentEmail}.
            </p>
            <textarea
              rows={3}
              required
              placeholder="e.g. Birth certificate number provided is unreadable. Please re-check or contact the admissions office."
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
                          ? 'border-[#5a1226] bg-[#5a1226]/5 text-[#5a1226] font-bold shadow-2xs'
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
                          className="mt-0.5 text-[#5a1226] focus:ring-[#5a1226]"
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
    </div>
  );
};
export default OnboardQueueView;
