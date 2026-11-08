import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Student, Teacher, TabType, UserRole } from '../../types';
import { onboardingService, AdmittedLearnerOnboarding, OnboardingEmailLog } from '../../services/onboardingService';
import { apiService } from '../../services/api';
import { generateNextSequentialNumber, generateNextAdmissionNumber, formatAdmissionNumber } from '../../utils/sequenceGenerator';
import { normalizeToCBCGradeLevel, normalizeToGuardianRelationship } from './OnboardQueueView';
import { formatKenyanPhone } from '../../utils/kenyanConstitution';
import { AdmissionsDashboardView } from './AdmissionsDashboardView';
import { SlotApplicationsView } from './SlotApplicationsView';
import { OnboardQueueView } from './OnboardQueueView';
import { StationeryRequirementsModal } from '../modals/StationeryRequirementsModal';
import { AdmitLearnerModal } from '../modals/AdmitLearnerModal';

interface AdmissionsEnrolmentHubViewProps {
  currentSubTab: TabType;
  onNavigateTab: (tab: TabType) => void;
  students: Student[];
  teachers: Teacher[];
  onAdmitLearner: (newStudent: any, rawBackendData?: any) => void | Promise<void>;
  onRefreshStudents: () => void | Promise<void>;
  onOpenAdmitModal: () => void;
  onOpenOnboardTeacher: () => void;
}

export const AdmissionsEnrolmentHubView: React.FC<AdmissionsEnrolmentHubViewProps> = ({
  currentSubTab,
  onNavigateTab,
  students,
  teachers,
  onAdmitLearner,
  onRefreshStudents,
  onOpenAdmitModal,
  onOpenOnboardTeacher,
}) => {
  const { user } = useAuth();
  const [onboardings, setOnboardings] = useState<AdmittedLearnerOnboarding[]>([]);
  const [slotApplications, setSlotApplications] = useState<AdmittedLearnerOnboarding[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isStationeryModalOpen, setIsStationeryModalOpen] = useState(false);

  // New Application Form State
  const [newAppFirstName, setNewAppFirstName] = useState('');
  const [newAppLastName, setNewAppLastName] = useState('');
  const [newAppGender, setNewAppGender] = useState<'Boy' | 'Girl'>('Boy');
  const [newAppDob, setNewAppDob] = useState('2021-05-15');
  const [newAppGrade, setNewAppGrade] = useState('PLAYGROUP');
  const [newAppTerm, setNewAppTerm] = useState('Term 1 - 2027');
  const [newAppBirthCert, setNewAppBirthCert] = useState('');
  const [newAppNemis, setNewAppNemis] = useState('');
  const [newAppPrevSchool, setNewAppPrevSchool] = useState('');
  const [newAppParentName, setNewAppParentName] = useState('');
  const [newAppParentRelationship, setNewAppParentRelationship] = useState('MOTHER');
  const [newAppParentPhone, setNewAppParentPhone] = useState('');
  const [newAppParentEmail, setNewAppParentEmail] = useState('');
  const [newAppParentId, setNewAppParentId] = useState('');
  const [newAppAddress, setNewAppAddress] = useState('Kisumu, Kenya');
  const [newAppSpecialNeeds, setNewAppSpecialNeeds] = useState('None');
  const [isSubmittingNewApp, setIsSubmittingNewApp] = useState(false);

  // Decision Modal State
  const [decisionApp, setDecisionApp] = useState<AdmittedLearnerOnboarding | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [decisionNotes, setDecisionNotes] = useState('');

  // Assessment Scoring State
  const [assessingApp, setAssessingApp] = useState<AdmittedLearnerOnboarding | null>(null);
  const [assessmentScore, setAssessmentScore] = useState<'EXCEEDS' | 'MEETS' | 'APPROACHING' | 'BELOW'>('MEETS');
  const [assessmentComments, setAssessmentComments] = useState('Candidate demonstrated strong developmental and social readiness.');

  // Enrolment Desk State
  const [enrollingApp, setEnrollingApp] = useState<AdmittedLearnerOnboarding | null>(null);
  const [assignedAdmNo, setAssignedAdmNo] = useState('');
  const [assignedStream, setAssignedStream] = useState('East');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Offer Letter Preview Modal State
  const [previewOfferApp, setPreviewOfferApp] = useState<AdmittedLearnerOnboarding | null>(null);

  const loadData = () => {
    setOnboardings(onboardingService.getOnboardings());
    setSlotApplications(onboardingService.getSlotApplications());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('smartshule_onboarding_updated', handleUpdate);
    return () => window.removeEventListener('smartshule_onboarding_updated', handleUpdate);
  }, []);

  const allApplications = useMemo(() => {
    return [...slotApplications, ...onboardings];
  }, [slotApplications, onboardings]);

  const pendingApplications = useMemo(() => {
    return allApplications.filter(a => a.status === 'PENDING');
  }, [allApplications]);

  const approvedApplications = useMemo(() => {
    return allApplications.filter(a => a.status === 'APPROVED');
  }, [allApplications]);

  const handleCreateNewApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppFirstName || !newAppLastName || !newAppParentPhone) {
      setFeedback({ type: 'error', message: 'First name, last name, and parent phone are required.' });
      return;
    }

    setIsSubmittingNewApp(true);
    try {
      const created = onboardingService.createOnboarding({
        firstName: newAppFirstName.trim(),
        lastName: newAppLastName.trim(),
        gender: newAppGender,
        dob: newAppDob,
        targetGrade: newAppGrade,
        entryTerm: newAppTerm,
        birthCertNo: newAppBirthCert.trim() || undefined,
        nemisUpi: newAppNemis.trim() || undefined,
        previousSchool: newAppPrevSchool.trim() || undefined,
        parentName: newAppParentName.trim() || 'Parent/Guardian',
        parentRelationship: newAppParentRelationship,
        parentPhone: newAppParentPhone.trim(),
        parentEmail: newAppParentEmail.trim() || 'parent@graceseeds.sc.ke',
        parentNationalId: newAppParentId.trim() || undefined,
        residentialAddress: newAppAddress.trim() || undefined,
        specialNeeds: newAppSpecialNeeds.trim() || undefined,
        applicationType: 'ONBOARDING_DOSSIER',
      });

      setFeedback({
        type: 'success',
        message: `Application submitted successfully! Tracking Code: ${created.record.trackingCode}`,
      });

      // Clear form
      setNewAppFirstName('');
      setNewAppLastName('');
      setNewAppParentPhone('');
      setNewAppParentName('');
      setNewAppParentEmail('');
      loadData();
      onNavigateTab('application-review');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to submit application.' });
    } finally {
      setIsSubmittingNewApp(false);
    }
  };

  const handleRecordDecision = () => {
    if (!decisionApp) return;
    try {
      onboardingService.updateStatus(decisionApp.id, decisionAction, {
        reviewerName: user?.fullName || 'Admissions Director',
        reviewerRole: user?.role ? String(user.role).replace(/_/g, ' ') : 'Admissions Officer',
        notes: decisionNotes || (decisionAction === 'APPROVED' ? 'Application officially accepted.' : 'Application declined.'),
      });

      setFeedback({
        type: 'success',
        message: `Application ${decisionApp.trackingCode} has been marked as ${decisionAction}.`,
      });
      setDecisionApp(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to record decision.' });
    }
  };

  const handleRecordAssessment = () => {
    if (!assessingApp) return;
    try {
      onboardingService.scheduleStep(assessingApp.id, {
        stepType: 'READINESS_ASSESSMENT',
        stepTitle: `CBC Readiness Interaction - Level: ${assessmentScore}`,
        date: new Date().toISOString().split('T')[0],
        time: '11:00 AM',
        venue: 'Admissions Office / Early Years Classroom',
        officerInCharge: user?.fullName || 'Admissions Evaluator',
        notes: `Outcome: ${assessmentScore} Proficient. Remarks: ${assessmentComments}`,
        scheduledBy: user?.fullName || 'Admissions Evaluator',
      });

      setFeedback({
        type: 'success',
        message: `Assessment outcome recorded for ${assessingApp.firstName} ${assessingApp.lastName}.`,
      });
      setAssessingApp(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to record assessment.' });
    }
  };

  const handleCompleteEnrolment = async (app: AdmittedLearnerOnboarding) => {
    setEnrollingApp(app);
    // Suggest next 4-digit pure sequential admission number
    const existingNos = students.map(s => s.admNo || (s as any).admissionNumber).filter(Boolean);
    const nextNo = generateNextAdmissionNumber(existingNos);
    setAssignedAdmNo(nextNo);
  };

  const handleConfirmEnrolment = async () => {
    if (!enrollingApp) return;
    if (!assignedAdmNo.trim()) {
      setFeedback({ type: 'error', message: 'Admission number is required for enrolment.' });
      return;
    }

    const formattedAdm = formatAdmissionNumber(assignedAdmNo.trim());

    // Duplicate check across existing learners
    const isDuplicate = students.some(
      s => (s.admNo && s.admNo.trim() === formattedAdm) ||
           ((s as any).admissionNumber && (s as any).admissionNumber.trim() === formattedAdm)
    );
    if (isDuplicate) {
      setFeedback({
        type: 'error',
        message: `Admission number #${formattedAdm} is already assigned to an existing learner! Please enter a unique number.`,
      });
      return;
    }

    setIsEnrolling(true);
    try {
      const cleanParentPhone = formatKenyanPhone(enrollingApp.parentPhone);
      const cleanEmergency = formatKenyanPhone(enrollingApp.emergencyContactPhone || enrollingApp.parentPhone);
      const cbcGrade = normalizeToCBCGradeLevel(enrollingApp.targetGrade);
      const guardianRel = normalizeToGuardianRelationship(enrollingApp.parentRelationship);
      const validDob = enrollingApp.dob && /^\d{4}-\d{2}-\d{2}$/.test(enrollingApp.dob) ? enrollingApp.dob : '2020-01-01';

      const rawBackend = {
        admissionNumber: formattedAdm,
        upiNumber: enrollingApp.nemisUpi?.trim() || undefined,
        firstName: enrollingApp.firstName.trim(),
        middleName: enrollingApp.middleName?.trim() || undefined,
        lastName: enrollingApp.lastName.trim(),
        dateOfBirth: validDob,
        gender: (enrollingApp.gender === 'Boy' ? 'MALE' : 'FEMALE') as any,
        gradeLevel: cbcGrade as any,
        schoolId: user?.schoolId || 'school-001',
        medicalConditions: enrollingApp.medicalConditions?.trim() || undefined,
        specialNeeds: enrollingApp.specialNeeds && enrollingApp.specialNeeds !== 'None' ? enrollingApp.specialNeeds : undefined,
        emergencyContactName: enrollingApp.emergencyContactName?.trim() || undefined,
        emergencyContactPhone: cleanEmergency,
        admissionFee: 1500,
        guardian: {
          firstName: enrollingApp.parentName.trim().split(' ')[0] || enrollingApp.parentName.trim(),
          lastName: enrollingApp.parentName.trim().split(' ').slice(1).join(' ') || 'Guardian',
          email: enrollingApp.parentEmail.trim().toLowerCase(),
          phoneNumber: cleanParentPhone,
          phone: cleanParentPhone,
          relationship: guardianRel,
          emergencyContact: cleanEmergency,
          nationalId: enrollingApp.parentNationalId?.trim() || undefined,
        },
      };

      let savedStudent: any = null;
      try {
        const regRes = await apiService.registerStudent(rawBackend);
        if (regRes?.success && regRes.data) {
          savedStudent = regRes.data;
        }
      } catch (backendErr: any) {
        console.warn('[Enrolment Desk] Direct backend register notice:', backendErr?.message);
      }

      const fallbackPayload = {
        id: savedStudent?.id,
        firstName: enrollingApp.firstName,
        lastName: enrollingApp.lastName,
        name: `${enrollingApp.firstName} ${enrollingApp.lastName}`,
        admissionNumber: formattedAdm,
        admNo: formattedAdm,
        grade: enrollingApp.targetGrade,
        gradeLevel: cbcGrade,
        gender: enrollingApp.gender === 'Boy' ? 'MALE' : 'FEMALE',
        dateOfBirth: validDob,
        birthCertificateNumber: enrollingApp.birthCertNo,
        upiNumber: enrollingApp.nemisUpi,
        upi: enrollingApp.nemisUpi || '--',
        guardianName: enrollingApp.parentName,
        guardianPhone: cleanParentPhone,
        guardianEmail: enrollingApp.parentEmail,
        emergencyContact: cleanEmergency,
        medicalConditions: enrollingApp.medicalConditions || 'None',
        stream: assignedStream,
        streamName: assignedStream,
        status: 'ACTIVE',
      };

      await onAdmitLearner(savedStudent || fallbackPayload, rawBackend);

      // Approve in onboarding service and dispatch formal confirmation email
      const reviewerName = user?.fullName || user?.name || 'School Registrar';
      const reviewerRole = user?.role ? String(user.role).replace(/_/g, ' ') : 'Registrar';
      onboardingService.approveOnboarding(
        enrollingApp.id,
        reviewerName,
        reviewerRole,
        formattedAdm,
        assignedStream,
        `Matriculated successfully into ${enrollingApp.targetGrade} (${assignedStream} Stream).`
      );

      await onRefreshStudents();
      loadData();
      setFeedback({
        type: 'success',
        message: `Learner ${enrollingApp.firstName} ${enrollingApp.lastName} successfully enrolled as Adm #${formattedAdm}! Available under Academics & Learners.`,
      });
      setEnrollingApp(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to complete learner enrolment.' });
    } finally {
      setIsEnrolling(false);
    }
  };

  // Pipeline workflow steps
  const PIPELINE_STEPS = [
    { id: 'admissions-dashboard', label: 'Admissions Dashboard', icon: 'dashboard' },
    { id: 'admit-learner', label: 'Admit New Learner', icon: 'person_add' },
    { id: 'slot-applications', label: 'Slot Applications', icon: 'event_available', count: slotApplications.filter(s => s.status === 'PENDING').length },
    { id: 'onboard-queue', label: 'Onboard Queue', icon: 'how_to_reg', count: onboardings.filter(o => o.status === 'PENDING').length },
    { id: 'application-review', label: 'Application Review', icon: 'rate_review', count: pendingApplications.length },
    { id: 'admission-reports', label: 'Admission Reports', icon: 'analytics' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Admissions Module Banner & Interactive Workflow Stepper */}
      <div className="rounded-2xl bg-gradient-to-r from-[#7a1228] via-[#800000] to-[#550000] p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px] text-white">how_to_reg</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Admissions & Enrolment Management
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs text-rose-200">2027 Intake Open</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1">
                Learner Admissions & Enrolment Pipeline
              </h1>
              <p className="text-xs text-rose-100 max-w-xl">
                Prospective learner intake, application reviews, interviews, readiness assessments, offer letters, and official student registration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('new-applications')}
              className="px-3.5 py-2 rounded-xl bg-white text-[#7a1228] font-bold text-xs shadow-md hover:bg-rose-50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>New Intake Form</span>
            </button>
            <button
              onClick={() => setIsStationeryModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>Requirements</span>
            </button>
          </div>
        </div>

        {/* Workflow Pipeline Breadcrumbs */}
        <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = currentSubTab === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => onNavigateTab(step.id as TabType)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#7a1228] font-bold shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{step.icon}</span>
                  <span>{step.label}</span>
                  {typeof step.count === 'number' && step.count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-[#7a1228] text-white' : 'bg-emerald-400 text-emerald-950'
                    }`}>
                      {step.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
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
            className="text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 1. Sub-Tab: Admissions Dashboard */}
      {currentSubTab === 'admissions-dashboard' && (
        <AdmissionsDashboardView
          students={students}
          teachers={teachers}
          onOpenAdmitModal={onOpenAdmitModal}
          onOpenOnboardTeacher={onOpenOnboardTeacher}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* 2. Sub-Tab: Admit New Learner (Dedicated Full-Page Modal Reuse) */}
      {currentSubTab === 'admit-learner' && (
        <AdmitLearnerModal
          isPage={true}
          isOpen={true}
          onClose={() => onNavigateTab('admissions-dashboard')}
          onAdmit={onAdmitLearner}
          existingStudents={students}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* 2. Sub-Tab: New Applications */}
      {currentSubTab === 'new-applications' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Intake Stage 01</span>
            <h2 className="text-xl font-bold text-slate-900">Direct Learner Application Entry</h2>
            <p className="text-xs text-slate-500 mt-1">
              Record walk-in, phone, or direct prospective student admission applications for Grace Seeds School.
            </p>
          </div>

          <form onSubmit={handleCreateNewApplication} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Learner First Name *</label>
                <input
                  type="text"
                  required
                  value={newAppFirstName}
                  onChange={(e) => setNewAppFirstName(e.target.value)}
                  placeholder="e.g. Liam"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Learner Last Name *</label>
                <input
                  type="text"
                  required
                  value={newAppLastName}
                  onChange={(e) => setNewAppLastName(e.target.value)}
                  placeholder="e.g. Otieno"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                <select
                  value={newAppGender}
                  onChange={(e) => setNewAppGender(e.target.value as 'Boy' | 'Girl')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                >
                  <option value="Boy">Boy</option>
                  <option value="Girl">Girl</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={newAppDob}
                  onChange={(e) => setNewAppDob(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target CBC Grade *</label>
                <select
                  value={newAppGrade}
                  onChange={(e) => setNewAppGrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                >
                  <option value="PLAYGROUP">Playgroup (Age 2-3)</option>
                  <option value="PP1">Pre-Primary 1 (PP1 - Age 4)</option>
                  <option value="PP2">Pre-Primary 2 (PP2 - Age 5)</option>
                  <option value="GRADE_1">Grade 1</option>
                  <option value="GRADE_2">Grade 2</option>
                  <option value="GRADE_3">Grade 3</option>
                  <option value="GRADE_4">Grade 4</option>
                  <option value="GRADE_5">Grade 5</option>
                  <option value="GRADE_6">Grade 6</option>
                  <option value="GRADE_7">Grade 7 (Junior School)</option>
                  <option value="GRADE_8">Grade 8</option>
                  <option value="GRADE_9">Grade 9</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entry Term *</label>
                <input
                  type="text"
                  value={newAppTerm}
                  onChange={(e) => setNewAppTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Birth Certificate No.</label>
                <input
                  type="text"
                  value={newAppBirthCert}
                  onChange={(e) => setNewAppBirthCert(e.target.value)}
                  placeholder="e.g. BC-2021-9988"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NEMIS / UPI (If transferring)</label>
                <input
                  type="text"
                  value={newAppNemis}
                  onChange={(e) => setNewAppNemis(e.target.value)}
                  placeholder="e.g. ABC1234XYZ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Previous School (Optional)</label>
                <input
                  type="text"
                  value={newAppPrevSchool}
                  onChange={(e) => setNewAppPrevSchool(e.target.value)}
                  placeholder="e.g. Sunrise Academy"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">Parent / Guardian Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newAppParentName}
                    onChange={(e) => setNewAppParentName(e.target.value)}
                    placeholder="e.g. Grace Aluoch"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relationship *</label>
                  <select
                    value={newAppParentRelationship}
                    onChange={(e) => setNewAppParentRelationship(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                  >
                    <option value="MOTHER">Mother</option>
                    <option value="FATHER">Father</option>
                    <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                    <option value="SPONSOR">Sponsor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Kenyan) *</label>
                  <input
                    type="tel"
                    required
                    value={newAppParentPhone}
                    onChange={(e) => setNewAppParentPhone(e.target.value)}
                    placeholder="e.g. 07XXXXXXXX"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent Email</label>
                  <input
                    type="email"
                    value={newAppParentEmail}
                    onChange={(e) => setNewAppParentEmail(e.target.value)}
                    placeholder="e.g. parent@example.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">National ID No.</label>
                  <input
                    type="text"
                    value={newAppParentId}
                    onChange={(e) => setNewAppParentId(e.target.value)}
                    placeholder="e.g. 12345678"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={newAppAddress}
                    onChange={(e) => setNewAppAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigateTab('admissions-dashboard')}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingNewApp}
                className="px-6 py-2.5 bg-[#800000] hover:bg-[#600000] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{isSubmittingNewApp ? 'Submitting...' : 'Register Applicant Dossier'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Sub-Tab: Slot Applications */}
      {currentSubTab === 'slot-applications' && (
        <SlotApplicationsView
          onAdmitLearner={onAdmitLearner}
          onRefreshStudents={onRefreshStudents}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* 4. Sub-Tab: Onboard Queue */}
      {currentSubTab === 'onboard-queue' && (
        <OnboardQueueView
          onAdmitLearner={onAdmitLearner}
          onRefreshStudents={onRefreshStudents}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* 5. Sub-Tab: Application Review */}
      {currentSubTab === 'application-review' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Intake Stage 02</span>
              <h2 className="text-xl font-bold text-slate-900">Application Review Workbench</h2>
              <p className="text-xs text-slate-500 mt-1">
                Verify birth certificates, guardian identity, previous academic clearance, and developmental notes before scheduling assessments.
              </p>
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 self-start sm:self-auto">
              {pendingApplications.length} Dossiers Pending Review
            </div>
          </div>

          {pendingApplications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-[48px] text-slate-300">task_alt</span>
              <p className="text-sm font-bold text-slate-700 mt-2">All Applications Reviewed</p>
              <p className="text-xs text-slate-400 mt-1">There are no pending applications in the review queue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                    <th className="py-3 px-3">Tracking Code</th>
                    <th className="py-3 px-3">Applicant Name</th>
                    <th className="py-3 px-3">Grade Applied</th>
                    <th className="py-3 px-3">Parent / Contact</th>
                    <th className="py-3 px-3">Documents Status</th>
                    <th className="py-3 px-3">Submitted</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{app.trackingCode}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {app.firstName} {app.lastName}
                        <span className="block text-[10px] text-slate-500 font-normal">{app.gender} · DOB: {app.dob}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7a1228]/10 text-[#7a1228]">
                          {app.targetGrade}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">{app.parentName}</span>
                        <span className="block text-[10px] text-slate-500">{app.parentPhone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          {app.birthCertNo ? 'Verified' : 'Pending Upload'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{new Date(app.submittedAt).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setAssessingApp(app);
                            onNavigateTab('admission-assessments');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] cursor-pointer"
                        >
                          Schedule Assessment
                        </button>
                        <button
                          onClick={() => {
                            setDecisionApp(app);
                            setDecisionAction('APPROVED');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] cursor-pointer"
                        >
                          Decide
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Sub-Tab: Applicant Interviews / Assessments */}
      {currentSubTab === 'admission-assessments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Intake Stage 03</span>
            <h2 className="text-xl font-bold text-slate-900">Applicant Interviews & Learner Readiness Assessments</h2>
            <p className="text-xs text-slate-500 mt-1">
              Conduct age-appropriate readiness interactions, evaluate developmental milestones, and record interviewer ratings.
            </p>
          </div>

          {assessingApp && (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-indigo-950">
                    Evaluating Applicant: {assessingApp.firstName} {assessingApp.lastName} ({assessingApp.targetGrade})
                  </h3>
                  <p className="text-xs text-indigo-800">Tracking Code: {assessingApp.trackingCode}</p>
                </div>
                <button onClick={() => setAssessingApp(null)} className="text-xs font-bold text-indigo-700 hover:underline">
                  Close Form
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 mb-1">CBE Readiness Rating</label>
                  <select
                    value={assessmentScore}
                    onChange={(e) => setAssessmentScore(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl outline-none"
                  >
                    <option value="EXCEEDS">Exceeding Expectations (EE) - Highly Prepared</option>
                    <option value="MEETS">Meeting Expectations (ME) - Ready for Cohort</option>
                    <option value="APPROACHING">Approaching Expectations (AE) - Extra Guidance Recommended</option>
                    <option value="BELOW">Below Expectations (BE) - Early Years Support Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-900 mb-1">Evaluator Notes & Observations</label>
                  <input
                    type="text"
                    value={assessmentComments}
                    onChange={(e) => setAssessmentComments(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleRecordAssessment}
                  className="px-4 py-2 bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-900 cursor-pointer"
                >
                  Save Assessment & Advance to Decisions
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <th className="py-3 px-3">Applicant</th>
                  <th className="py-3 px-3">Grade Applied</th>
                  <th className="py-3 px-3">Interview / Tour Step</th>
                  <th className="py-3 px-3">Date & Venue</th>
                  <th className="py-3 px-3">Evaluator Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {app.firstName} {app.lastName}
                      <span className="block text-[10px] text-slate-500 font-mono">{app.trackingCode}</span>
                    </td>
                    <td className="py-3 px-3">{app.targetGrade}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {app.scheduledStep?.stepTitle || 'Readiness Interaction'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {app.scheduledStep?.date || 'Scheduled on Intake Day'} · {app.scheduledStep?.time || '10:00 AM'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status === 'APPROVED' ? 'Assessed & Approved' : 'Ready for Assessment'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setAssessingApp(app);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer"
                      >
                        Record Scores
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Sub-Tab: Admission Decisions */}
      {currentSubTab === 'admission-decisions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Intake Stage 04</span>
            <h2 className="text-xl font-bold text-slate-900">Admission Decisions Board</h2>
            <p className="text-xs text-slate-500 mt-1">
              Render official admission determinations: Acceptance, Waitlist, or Decline based on class capacity and assessment outcomes.
            </p>
          </div>

          {decisionApp && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 max-w-lg mx-auto">
              <h3 className="text-sm font-bold text-slate-900">
                Record Decision for {decisionApp.firstName} {decisionApp.lastName}
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Decision</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionAction('APPROVED')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                      decisionAction === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Approve (Offer Admission)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionAction('REJECTED')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                      decisionAction === 'REJECTED' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Decline / Waitlist
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Notes / Remarks</label>
                <input
                  type="text"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="e.g. Assessment passed, space available in Stream East."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionApp(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecordDecision}
                  className="px-4 py-1.5 bg-[#800000] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#600000] cursor-pointer"
                >
                  Confirm Decision
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <th className="py-3 px-3">Applicant</th>
                  <th className="py-3 px-3">Target Grade</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Decision Notes</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {app.firstName} {app.lastName}
                      <span className="block text-[10px] text-slate-500 font-mono">{app.trackingCode}</span>
                    </td>
                    <td className="py-3 px-3">{app.targetGrade}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {app.reviewNotes || '--'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setDecisionApp(app);
                          setDecisionAction('APPROVED');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setDecisionApp(app);
                          setDecisionAction('REJECTED');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[11px] cursor-pointer"
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. Sub-Tab: Offer Letters */}
      {currentSubTab === 'admission-offers' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Intake Stage 05</span>
            <h2 className="text-xl font-bold text-slate-900">Official Admission Offer Letters</h2>
            <p className="text-xs text-slate-500 mt-1">
              Issue formal admission letters with attached fee schedules, reporting dates, uniform guidelines, and orientation notices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedApplications.map((app) => (
              <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Offer Generated
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{app.trackingCode}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-2">{app.firstName} {app.lastName}</h4>
                  <p className="text-xs text-slate-600">Grade Placed: <strong>{app.targetGrade}</strong></p>
                  <p className="text-xs text-slate-600">Parent: {app.parentName} ({app.parentPhone})</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {app.emailsSent?.length || 1} Email Notice Logged
                  </span>
                  <button
                    onClick={() => setPreviewOfferApp(app)}
                    className="px-3 py-1 rounded-lg bg-[#800000] text-white text-xs font-bold hover:bg-[#600000] cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    <span>Preview Letter</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. Sub-Tab: Enrolment & Registration */}
      {currentSubTab === 'admission-enrolment' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Intake Stage 06</span>
            <h2 className="text-xl font-bold text-slate-900">Enrolment & Student Matriculation Desk</h2>
            <p className="text-xs text-slate-500 mt-1">
              Officially matriculate accepted applicants into active registered learners. Once enrolled, they appear in <strong>Academics & Learners</strong>.
            </p>
          </div>

          {enrollingApp && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4 max-w-lg mx-auto">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Final Registration</span>
                <h3 className="text-base font-bold text-emerald-950">
                  Enrolling: {enrollingApp.firstName} {enrollingApp.lastName}
                </h3>
                <p className="text-xs text-emerald-800">Target Cohort: {enrollingApp.targetGrade} · Parent: {enrollingApp.parentName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Assign Admission Number *</label>
                  <input
                    type="text"
                    required
                    value={assignedAdmNo}
                    onChange={(e) => setAssignedAdmNo(e.target.value)}
                    placeholder="e.g. 0013"
                    className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl font-mono font-bold outline-none"
                  />
                  <span className="text-[10px] text-emerald-700">Auto-suggested pure integer sequence</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Assign Stream</label>
                  <select
                    value={assignedStream}
                    onChange={(e) => setAssignedStream(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl outline-none"
                  >
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="Main">Main Stream</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                <button
                  type="button"
                  onClick={() => setEnrollingApp(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isEnrolling}
                  onClick={handleConfirmEnrolment}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                  <span>{isEnrolling ? 'Registering...' : 'Matriculate & Create Learner Record'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <th className="py-3 px-3">Applicant Name</th>
                  <th className="py-3 px-3">Grade</th>
                  <th className="py-3 px-3">Parent Details</th>
                  <th className="py-3 px-3">Decision</th>
                  <th className="py-3 px-3">Admission Number</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvedApplications.map((app) => {
                  const isAlreadyEnrolled = students.some(
                    s => s.admNo.trim() === (app.assignedAdmNo || '').trim() && (app.assignedAdmNo || '').trim().length > 0
                  );
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {app.firstName} {app.lastName}
                        <span className="block text-[10px] text-slate-500 font-mono">{app.trackingCode}</span>
                      </td>
                      <td className="py-3 px-3">{app.targetGrade}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold">{app.parentName}</span>
                        <span className="block text-[10px] text-slate-500">{app.parentPhone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          APPROVED
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {app.assignedAdmNo || 'Pending Assignment'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isAlreadyEnrolled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Registered in Academics
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCompleteEnrolment(app)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <span className="material-symbols-outlined text-[14px]">badge</span>
                            <span>Complete Enrolment</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10. Sub-Tab: Admission Reports */}
      {currentSubTab === 'admission-reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Admissions Analytics</span>
            <h2 className="text-xl font-bold text-slate-900">Intake Reports & Enrolment Metrics</h2>
            <p className="text-xs text-slate-500 mt-1">
              Conversion rates, classroom capacity utilization, and intake demographics across all entry streams.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Applications</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{allApplications.length}</div>
              <span className="text-[11px] text-slate-500">Slot & Dossier submissions</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-bold text-amber-800 uppercase">Under Review</span>
              <div className="text-2xl font-black text-amber-950 mt-1">{pendingApplications.length}</div>
              <span className="text-[11px] text-amber-700">Awaiting interview / decision</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-800 uppercase">Approved Offers</span>
              <div className="text-2xl font-black text-emerald-950 mt-1">{approvedApplications.length}</div>
              <span className="text-[11px] text-emerald-700">Qualified for enrolment</span>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="text-xs font-bold text-indigo-800 uppercase">Conversion Rate</span>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {allApplications.length > 0
                  ? `${Math.round((approvedApplications.length / allApplications.length) * 100)}%`
                  : '100%'}
              </div>
              <span className="text-[11px] text-indigo-700">Application to offer conversion</span>
            </div>
          </div>
        </div>
      )}

      {/* 11. Sub-Tab: Admissions Settings */}
      {currentSubTab === 'admission-settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">System Preferences</span>
            <h2 className="text-xl font-bold text-slate-900">Admissions & Intake Settings</h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure class capacity caps, admissions office contacts, and requirement checklists.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs uppercase text-slate-800">Class Intake Capacity Policy</h4>
              <p className="text-xs text-slate-600">
                Grace Seeds School caps classroom sizes at <strong>15–18 pupils</strong> for Playgroup through Grade 6 to preserve teacher-pupil intimacy and CBE competency assessment quality.
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold text-slate-700">Current Average Class Size: 14.2 Learners</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs uppercase text-slate-800">Stationery & Requirements List</h4>
              <p className="text-xs text-slate-600">
                Manage the required documents, uniforms, stationery packages, and medical disclosures handed to parents upon acceptance.
              </p>
              <button
                onClick={() => setIsStationeryModalOpen(true)}
                className="px-4 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-xl hover:bg-[#600000] cursor-pointer"
              >
                View & Edit 2027 Requirements List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Letter Preview Modal */}
      {previewOfferApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-cover rounded-lg" onError={(e) => (e.target as any).style.display = 'none'} />
                <div>
                  <h3 className="font-bold text-base text-slate-900">Grace Seeds School</h3>
                  <p className="text-xs text-slate-500">Kisian, Kisumu · admissions@graceseeds.sc.ke</p>
                </div>
              </div>
              <button onClick={() => setPreviewOfferApp(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-800 leading-relaxed font-serif">
              <div className="text-right text-slate-500 font-mono">
                Date: {new Date().toLocaleDateString()}
              </div>

              <div>
                <p><strong>To the Parent/Guardian of:</strong></p>
                <p className="text-sm font-bold text-slate-900">{previewOfferApp.firstName} {previewOfferApp.lastName}</p>
                <p>{previewOfferApp.parentName} · {previewOfferApp.parentPhone}</p>
              </div>

              <div className="py-2 border-y border-slate-200 font-sans text-center">
                <h4 className="font-bold text-sm text-[#7a1228] uppercase">
                  RE: PROVISIONAL OFFER OF ADMISSION ({previewOfferApp.targetGrade})
                </h4>
                <p className="text-[11px] text-slate-500">Reference: {previewOfferApp.trackingCode}</p>
              </div>

              <p>
                We are pleased to inform you that following your application and successful review,
                <strong> {previewOfferApp.firstName} {previewOfferApp.lastName}</strong> has been offered a place in
                <strong> {previewOfferApp.targetGrade}</strong> at Grace Seeds School for the upcoming academic period.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 font-sans">
                <p className="font-bold text-slate-800">Conditions of Enrolment:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  <li>Payment of the commitment and initial term tuition fee according to the fee structure.</li>
                  <li>Submission of official birth certificate copy and previous academic report.</li>
                  <li>Completion of student health & medical clearance questionnaire.</li>
                </ul>
              </div>

              <p>
                Please report to the School Admissions Office to complete formal student matriculation.
                Welcome to the Grace Seeds School family!
              </p>

              <div className="pt-6 flex justify-between items-end font-sans">
                <div>
                  <p className="font-bold text-slate-900">Mr. Dan Ooko</p>
                  <p className="text-[11px] text-slate-500">Head of Admissions & Registration</p>
                </div>
                <div className="px-3 py-1 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] uppercase border border-emerald-200">
                  Official Seal Verified
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Print Letter
              </button>
              <button
                onClick={() => setPreviewOfferApp(null)}
                className="px-4 py-2 bg-[#800000] hover:bg-[#600000] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stationery Requirements Modal */}
      <StationeryRequirementsModal
        isOpen={isStationeryModalOpen}
        onClose={() => setIsStationeryModalOpen(false)}
      />
    </div>
  );
};
