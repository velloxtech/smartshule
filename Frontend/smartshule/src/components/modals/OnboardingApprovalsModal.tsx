import React, { useState, useEffect } from 'react';
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

interface OnboardingApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmitLearner?: (newLearner: any, rawBackendData?: any) => void | Promise<void>;
  onRefreshStudents?: () => void | Promise<void>;
}

export const OnboardingApprovalsModal: React.FC<OnboardingApprovalsModalProps> = ({
  isOpen,
  onClose,
  onAdmitLearner,
  onRefreshStudents,
}) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AdmittedLearnerOnboarding[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
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

  const [classes, setClasses] = useState<any[]>([]);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);

  const isAuthorized = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
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
    if (isOpen) {
      loadData();
      setFeedback(null);
      setSelectedApp(null);
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredApps = applications.filter((app) => {
    if (filterStatus === 'ALL') return true;
    return app.status === filterStatus;
  });

  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;

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
      authorizeBilling: true,
      admissionFee: 1500,
      guardian: {
        firstName: app.parentName.trim().split(' ')[0] || app.parentName.trim(),
        lastName: app.parentName.trim().split(' ').slice(1).join(' ') || app.parentName.trim(),
        email: app.parentEmail?.trim() && app.parentEmail.includes('@') ? app.parentEmail.trim() : undefined,
        phone: cleanParentPhone,
        nationalId: app.parentNationalId?.trim() || undefined,
        relationship: guardianRel,
        emergencyContact: cleanEmergencyPhone,
        occupation: app.parentOccupation?.trim() || 'Parent / Guardian',
      },
    };

    return { rawBackend, CBCGrade, matchedClass, cleanParentPhone, cleanEmergencyPhone, guardianRel };
  };

  const handleApprove = async (app: AdmittedLearnerOnboarding) => {
    if (!isAuthorized) {
      setFeedback({
        type: 'error',
        message: 'Approval Permission Required: Only Admissions, Headteacher, or School Director can ratify onboarding.',
      });
      return;
    }

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
            lastName: app.parentName.trim().split(' ').slice(1).join(' ') || app.parentName.trim(),
            email: app.parentEmail,
            phone: cleanParentPhone,
            nationalId: app.parentNationalId,
            relationship: guardianRel,
            emergencyContact: cleanEmergencyPhone,
            occupation: app.parentOccupation,
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
        message: `Learner ${app.firstName} ${app.lastName} successfully enrolled into database (Adm #${assignedNumber}) and official Admission Letter email dispatched to ${app.parentEmail}.`,
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
          medicalConditions: app.medicalConditions || undefined,
          specialNeeds: app.specialNeeds !== 'None' ? app.specialNeeds : undefined,
          guardian: {
            firstName: app.parentName.trim().split(' ')[0] || app.parentName.trim(),
            lastName: app.parentName.trim().split(' ').slice(1).join(' ') || app.parentName.trim(),
            email: app.parentEmail,
            phone: cleanParentPhone,
            nationalId: app.parentNationalId,
            relationship: guardianRel,
            emergencyContact: cleanEmergencyPhone,
            occupation: app.parentOccupation,
          },
        };

        await onAdmitLearner(studentPayload, rawBackend);
      }

      await onRefreshStudents?.();
      loadData();
      setFeedback({
        type: 'success',
        message: `Successfully synchronized ${app.firstName} ${app.lastName} into active database & Learners Directory (Adm #${assignedNumber}).`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to sync learner into database.',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  Admitted Learner Onboarding Approvals
                </h3>
                {pendingCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 animate-pulse">
                    {pendingCount} Pending Review
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Review submitted dossiers, assign admission numbers, enrol into database, and dispatch automated admission letters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`p-4 mx-6 mt-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                : 'bg-rose-50 text-rose-950 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {feedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="px-6 py-3 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 bg-surface">
          <div className="flex gap-2">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === status
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {status === 'ALL'
                  ? `All Applications (${applications.length})`
                  : status === 'PENDING'
                  ? `Pending Approval (${pendingCount})`
                  : status === 'APPROVED'
                  ? `Approved (${applications.filter((a) => a.status === 'APPROVED').length})`
                  : `Revision Required (${applications.filter((a) => a.status === 'REJECTED').length})`}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh Queue</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredApps.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2">inbox</span>
              <p className="font-bold text-sm">No onboarding applications in this queue</p>
              <p className="text-xs mt-1">Parents submit their details via the Admitted Learner Onboarding portal.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredApps.map((app) => (
                <div
                  key={app.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    app.status === 'PENDING'
                      ? 'bg-surface border-amber-300 shadow-xs hover:border-amber-400'
                      : app.status === 'APPROVED'
                      ? 'bg-surface border-emerald-200'
                      : 'bg-surface border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                        {app.trackingCode}
                      </span>
                      <h4 className="font-bold text-base text-on-surface mt-1">
                        {app.firstName} {app.middleName} {app.lastName}
                      </h4>
                      <p className="text-xs text-primary font-semibold">
                        {app.targetGrade} · {app.entryTerm}
                      </p>
                    </div>

                    <div>
                      {app.status === 'PENDING' ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
                          Pending Review
                        </span>
                      ) : app.status === 'APPROVED' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-200">
                          Approved ({app.assignedAdmNo})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-bold border border-rose-200">
                          Revision Required
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-xl mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase block text-outline">Tracking Code:</span>
                      <span className="font-mono font-bold text-primary">{app.trackingCode}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase block text-outline">Date of Birth:</span>
                      <span>{app.dob} ({app.gender})</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase block text-outline">Parent / Guardian:</span>
                      <span className="font-semibold text-on-surface">{app.parentName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase block text-outline">Phone / WhatsApp:</span>
                      <span className="font-mono">{app.parentPhone}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold uppercase block text-outline">Parent Email:</span>
                      <span className="font-semibold text-on-surface">{app.parentEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-outline-variant/20">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApp(app);
                        setCustomAdmNo(app.assignedAdmNo || getNextPureAdmNo(app));
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>View Dossier & Emails</span>
                    </button>

                    {app.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowRejectModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApp(app);
                            setCustomAdmNo(app.assignedAdmNo || getNextPureAdmNo(app));
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Review & Ratify</span>
                        </button>
                      </div>
                    ) : app.status === 'APPROVED' ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSyncToDatabase(app)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Ensure this approved learner is properly registered in PostgreSQL database and active student directory"
                      >
                        <span className="material-symbols-outlined text-[15px] text-blue-700">sync</span>
                        <span>Sync to DB</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedApp && !showRejectModal && (
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

                <div>
                  <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">4. Co-Curricular & Talent Electives</h5>
                  <div className="bg-surface-container-low p-4 rounded-xl text-xs">
                    <span className="text-outline block mb-1">Elected Clubs & Activities:</span>
                    <span className="font-semibold">{selectedApp.clubPreferences?.join(', ') || 'General CBC Activities'}</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-primary text-xs uppercase tracking-wider mb-2">
                    5. Automated Email Correspondence History
                  </h5>
                  <div className="space-y-2">
                    {selectedApp.emailsSent && selectedApp.emailsSent.length > 0 ? (
                      selectedApp.emailsSent.map((eml) => (
                        <div key={eml.id} className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">mail</span>
                                <span>{eml.type === 'ADMISSION_APPROVED' ? 'Official Admission Letter' : 'Onboarding Tracking Receipt'}</span>
                              </span>
                              <span className="text-[10px] text-outline font-mono">To: {eml.to}</span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant truncate max-w-md">{eml.subject}</p>
                            <span className="text-[10px] text-outline">{new Date(eml.sentAt).toLocaleString()}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewingEmail(eml)}
                            className="px-3 py-1 rounded-lg bg-surface hover:bg-surface-container text-xs font-semibold text-primary border border-outline-variant/30 cursor-pointer"
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
                        <label className="block text-xs font-bold text-emerald-900 mb-1">Assigned Admission Number (Numbers Only) *</label>
                        <p className="text-[10px] text-emerald-800/80 mb-1.5">Use numbers only (no words or letters) so it is easy for children to memorize.</p>
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
                  <span className="material-symbols-outlined text-sm">close</span>
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
      </div>
    </div>
  );
};
