import {SchoolCalendarPlanView} from './components/views/SchoolCalendarPlanView';
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { TabType, Student, Teacher, SystemActivity, AssessmentRecord, FeeTransaction, UserRole } from './types';
import { apiService, captureApiRequestScope } from './services/api';
import { useAuth } from './context/AuthContext';
import { isTabPermitted } from './utils/rbac';
import { resolveStreamName, resolveGradeName, resolveTeacherAssignedClasses } from './utils/formatters';
import { ViewLoadingSkeleton } from './components/common/ViewLoadingSkeleton';

// Public & Auth Views (Immediate eager loading)
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';

// Route-Level Code Splitting (Lazy loaded views)
const SuperAdminDashboardView = lazy(() => import('./components/views/SuperAdminDashboardView').then(m => ({ default: m.SuperAdminDashboardView })));
const HeadTeacherDashboardView = lazy(() => import('./components/views/HeadTeacherDashboardView').then(m => ({ default: m.HeadTeacherDashboardView })));
const DeputyDashboardView = lazy(() => import('./components/views/DeputyDashboardView').then(m => ({ default: m.DeputyDashboardView })));
const AdmissionsDashboardView = lazy(() => import('./components/views/AdmissionsDashboardView').then(m => ({ default: m.AdmissionsDashboardView })));
const AdmissionsEnrolmentHubView = lazy(() => import('./components/views/AdmissionsEnrolmentHubView').then(m => ({ default: m.AdmissionsEnrolmentHubView })));
const BursarDashboardView = lazy(() => import('./components/views/BursarDashboardView').then(m => ({ default: m.BursarDashboardView })));
const TeacherDashboardView = lazy(() => import('./components/views/TeacherDashboardView').then(m => ({ default: m.TeacherDashboardView })));
const ParentDashboardView = lazy(() => import('./components/views/ParentDashboardView').then(m => ({ default: m.ParentDashboardView })));
const StudentsView = lazy(() => import('./components/views/StudentsView').then(m => ({ default: m.StudentsView })));
const OnboardQueueView = lazy(() => import('./components/views/OnboardQueueView').then(m => ({ default: m.OnboardQueueView })));
const SlotApplicationsView = lazy(() => import('./components/views/SlotApplicationsView').then(m => ({ default: m.SlotApplicationsView })));
const TeachersView = lazy(() => import('./components/views/TeachersView').then(m => ({ default: m.TeachersView })));
const GeofenceView = lazy(() => import('./components/views/GeofenceView').then(m => ({ default: m.GeofenceView })));
const ClassesView = lazy(() => import('./components/views/ClassesView').then(m => ({ default: m.ClassesView })));
const LearningAreasView = lazy(() => import('./components/views/LearningAreasView').then(m => ({ default: m.LearningAreasView })));
const AssessmentsView = lazy(() => import('./components/views/AssessmentsView').then(m => ({ default: m.AssessmentsView })));
const FormativeAssessmentsView = lazy(() => import('./components/views/FormativeAssessmentsView').then(m => ({ default: m.FormativeAssessmentsView })));
const SummativeAssessmentsView = lazy(() => import('./components/views/SummativeAssessmentsView').then(m => ({ default: m.SummativeAssessmentsView })));
const StrandsView = lazy(() => import('./components/views/StrandsView').then(m => ({ default: m.StrandsView })));
const ReportCardsView = lazy(() => import('./components/views/ReportCardsView').then(m => ({ default: m.ReportCardsView })));
const CompetencyAnalyticsView = lazy(() => import('./components/views/CompetencyAnalyticsView').then(m => ({ default: m.CompetencyAnalyticsView })));
const SchemesOfWorkView = lazy(() => import('./components/views/SchemesView').then(m => ({ default: m.SchemesOfWorkView })));
const LessonPlansView = lazy(() => import('./components/views/SchemesView').then(m => ({ default: m.LessonPlansView })));
const TimetableView = lazy(() => import('./components/views/TimetableView').then(m => ({ default: m.TimetableView })));
const AttendanceRegisterView = lazy(() => import('./components/views/AttendanceRegisterView').then(m => ({ default: m.AttendanceRegisterView })));
const FeeStructureView = lazy(() => import('./components/views/FeeStructureView').then(m => ({ default: m.FeeStructureView })));
const InvoicesMpesaView = lazy(() => import('./components/views/InvoicesMpesaView').then(m => ({ default: m.InvoicesMpesaView })));
const CashFlowLedgerView = lazy(() => import('./components/views/CashFlowLedgerView').then(m => ({ default: m.CashFlowLedgerView })));
const ExpensesView = lazy(() => import('./components/views/ExpensesView').then(m => ({ default: m.ExpensesView })));
const FinancialReportsView = lazy(() => import('./components/views/FinancialReportsView').then(m => ({ default: m.FinancialReportsView })));
const EDiaryView = lazy(() => import('./components/views/EDiaryView').then(m => ({ default: m.EDiaryView })));
const VisualCBCView = lazy(() => import('./components/views/VisualCBCView').then(m => ({ default: m.VisualCBCView })));
const WhatsAppBotView = lazy(() => import('./components/views/WhatsAppBotView').then(m => ({ default: m.WhatsAppBotView })));
const UserManagementView = lazy(() => import('./components/views/UserManagementView').then(m => ({ default: m.UserManagementView })));
const RecordsOfWorkView = lazy(() => import('./components/views/RecordsOfWorkView'));
const SystemLogsView = lazy(() => import('./components/views/SystemLogsView').then(m => ({ default: m.SystemLogsView })));
const ConcernsView = lazy(() => import('./components/views/ConcernsView').then(m => ({ default: m.ConcernsView })));
const LunchFeeManagementView = lazy(() => import('./components/views/LunchFeeManagementView').then(m => ({ default: m.LunchFeeManagementView })));
const ParentProfileView = lazy(() => import('./components/views/ParentProfileView').then(m => ({ default: m.ParentProfileView })));
const StudentFeeCheckerView = lazy(() => import('./components/views/StudentFeeCheckerView').then(m => ({ default: m.StudentFeeCheckerView })));
const ArrearsView = lazy(() => import('./components/views/ArrearsView').then(m => ({ default: m.ArrearsView })));
const ForwardedPaymentsView = lazy(() => import('./components/views/ForwardedPaymentsView').then(m => ({ default: m.ForwardedPaymentsView })));
const ArchivedRecordsView = lazy(() => import('./components/views/ArchivedRecordsView').then(m => ({ default: m.ArchivedRecordsView })));
const StandaloneArchivedRecordsPage = lazy(() => import('./components/views/StandaloneArchivedRecordsPage').then(m => ({ default: m.StandaloneArchivedRecordsPage })));
const LibraryView = lazy(() => import('./components/views/LibraryView').then(m => ({ default: m.LibraryView })));
const AnnouncementsView = lazy(() => import('./components/views/AnnouncementsView').then(m => ({ default: m.AnnouncementsView })));
const PayrollManagementView = lazy(() => import('./components/views/PayrollManagementView').then(m => ({ default: m.PayrollManagementView })));
const ClinicManagementView = lazy(() => import('./components/views/ClinicManagementView').then(m => ({ default: m.ClinicManagementView })));
const InventoryManagementView = lazy(() => import('./components/views/InventoryManagementView').then(m => ({ default: m.InventoryManagementView })));
const DisciplineClubsView = lazy(() => import('./components/views/DisciplineClubsView').then(m => ({ default: m.DisciplineClubsView })));
const MasterBroadsheetView = lazy(() => import('./components/views/MasterBroadsheetView').then(m => ({ default: m.MasterBroadsheetView })));
const OccurrenceBookView = lazy(() => import('./components/views/OccurrenceBookView').then(m => ({ default: m.OccurrenceBookView })));
const CoverageTrackingView = lazy(() => import('./components/views/SyllabusCoveragePlanView').then(m => ({ default: m.CoverageTrackingView })));
const SyllabusCoveragePlanView = lazy(() => import('./components/views/SyllabusCoveragePlanView').then(m => ({default:m.SyllabusCoveragePlanView})));
const SchemeOfWorkBuilderView = lazy(() => import('./components/views/SyllabusCoveragePlanView').then(m => ({ default: m.SchemeOfWorkBuilderView })));
const FeeDeadlineBannerManagementView = lazy(() => import('./components/views/FeeDeadlineBannerManagementView').then(m => ({ default: m.FeeDeadlineBannerManagementView })));
const SponsoredStudentsView = lazy(() => import('./components/views/SponsoredStudentsView').then(m => ({ default: m.SponsoredStudentsView })));
const MyDigitalSignatureView = lazy(() => import('./components/views/MyDigitalSignatureView').then(m => ({ default: m.MyDigitalSignatureView })));
const DocumentSigningCenterView = lazy(() => import('./components/views/DocumentSigningCenterView').then(m => ({ default: m.DocumentSigningCenterView })));
const TeacherProfileView = lazy(() => import('./components/views/TeacherProfileView').then(m => ({ default: m.TeacherProfileView })));
const ParentConsentView = lazy(() => import('./components/views/ParentConsentView').then(m => ({ default: m.ParentConsentView })));
const AdminConsentManagementView = lazy(() => import('./components/views/AdminConsentManagementView').then(m => ({ default: m.AdminConsentManagementView })));
const TeacherSalaryAcknowledgementView = lazy(() => import('./components/views/TeacherSalaryAcknowledgementView').then(m => ({ default: m.TeacherSalaryAcknowledgementView })));

const StaffMessagesView = lazy(() => import('./components/views/StaffMessagesView').then(m => ({default:m.StaffMessagesView})));

// Modals
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { ForwardPaymentModal } from './components/modals/ForwardPaymentModal';
import { CBCFormativeModal } from './components/modals/CBCFormativeModal';
import { AdmitLearnerModal } from './components/modals/AdmitLearnerModal';
import { SendSmsModal } from './components/modals/SendSmsModal';
import { ExportReportModal } from './components/modals/ExportReportModal';
import { OnboardTeacherModal } from './components/modals/OnboardTeacherModal';
import { UploadMarksModal } from './components/modals/UploadMarksModal';
import { CreateLessonPlanModal } from './components/modals/CreateLessonPlanModal';
import { CreateSchemeModal } from './components/modals/CreateSchemeModal';
import { AcademicTermsModal } from './components/modals/AcademicTermsModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { ChangePasswordPage } from './components/auth/ChangePasswordPage';
import { BiometricDevicesModal } from './components/modals/BiometricDevicesModal';
import { LegalModal, LegalTabType } from './components/legal/LegalModal';
import { CookieBanner } from './components/legal/CookieBanner';

export default function App() {
  const { user, isAuthenticated, isLoading, error: authError, activeViewMode, isStaffWithChildren, updateUser, logout } = useAuth();
  const effectiveRole = (isStaffWithChildren && activeViewMode === 'PARENT') ? UserRole.PARENT : user?.role;
  const isGuardian = effectiveRole === UserRole.GUARDIAN || effectiveRole === UserRole.PARENT;
  const dataScopeKey = `${user?.id}:${user?.schoolId}:${effectiveRole}`;
  const activeDataScope = useRef(dataScopeKey);
  activeDataScope.current = dataScopeKey;
  const [loadedDataScope,setLoadedDataScope] = useState(dataScopeKey);
  const [appView, setAppView] = useState<'landing' | 'login' | 'portal' | 'archive'>('landing');
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCompact, setIsSidebarCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem('smartshule_sidebar_compact') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCompact = () => {
    setIsSidebarCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smartshule_sidebar_compact', String(next));
      } catch {}
      return next;
    });
  };
  const [currentTerm, setCurrentTerm] = useState('Term 3 - 2026');
  const [academicTermsModalOpen, setAcademicTermsModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTabType>('terms');

  const handleOpenLegalModal = (tab: LegalTabType = 'terms') => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };


  // Core Dynamic Data (Live from backend or user actions - initialized empty)
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [totalCollectedFee, setTotalCollectedFee] = useState(0);

  // Modal Visibility States
  const [onboardTeacherModalOpen, setOnboardTeacherModalOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [forwardPaymentModalOpen, setForwardPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | undefined>(undefined);

  const [CBCModalOpen, setCBCModalOpen] = useState(false);
  const [selectedStudentForCBC, setSelectedStudentForCBC] = useState<Student | undefined>(undefined);

  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsTarget, setSmsTarget] = useState<'absentee' | 'fee' | 'all'>('all');

  const [exportReportModalOpen, setExportReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | undefined>(undefined);
  const [uploadMarksModalOpen, setUploadMarksModalOpen] = useState(false);
  const [uploadMarksInitialStudent, setUploadMarksInitialStudent] = useState<Student | undefined>(undefined);
  const [uploadMarksInitialType, setUploadMarksInitialType] = useState<'SUMMATIVE' | 'FORMATIVE'>('SUMMATIVE');
  const [marksRefreshTrigger, setMarksRefreshTrigger] = useState(0);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);
  const [createLessonPlanModalOpen, setCreateLessonPlanModalOpen] = useState(false);
  const [createSchemeModalOpen, setCreateSchemeModalOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Native Capacitor Status Bar, Splash Screen & Network Handling
  useEffect(() => {
    let networkListener: any = null;
    const initNativeFeatures = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#7b1c35' });
      } catch {}
      try {
        await SplashScreen.hide();
      } catch {}
      try {
        networkListener = await Network.addListener('networkStatusChange', (status) => {
          if (!status.connected) {
            showToast('Network disconnected. Check your internet connection.', 'error');
          } else {
            showToast('Network connection restored.', 'success');
          }
        });
      } catch {}
    };

    initNativeFeatures();

    return () => {
      if (networkListener) {
        networkListener.remove?.();
      }
    };
  }, [showToast]);

  // Native Android Hardware Back Button Navigation Handling
  useEffect(() => {
    let backListener: any = null;
    const setupBackHandler = async () => {
      try {
        backListener = await CapApp.addListener('backButton', () => {
          // 1. Close open modal dialogs
          if (changePasswordModalOpen) { setChangePasswordModalOpen(false); return; }
          if (legalModalOpen) { setLegalModalOpen(false); return; }
          if (academicTermsModalOpen) { setAcademicTermsModalOpen(false); return; }
          if (onboardTeacherModalOpen) { setOnboardTeacherModalOpen(false); return; }
          if (recordPaymentModalOpen) { setRecordPaymentModalOpen(false); return; }
          if (forwardPaymentModalOpen) { setForwardPaymentModalOpen(false); return; }
          if (CBCModalOpen) { setCBCModalOpen(false); return; }
          if (admitModalOpen) { setAdmitModalOpen(false); return; }
          if (smsModalOpen) { setSmsModalOpen(false); return; }
          if (exportReportModalOpen) { setExportReportModalOpen(false); return; }
          if (uploadMarksModalOpen) { setUploadMarksModalOpen(false); return; }
          if (createLessonPlanModalOpen) { setCreateLessonPlanModalOpen(false); return; }
          if (createSchemeModalOpen) { setCreateSchemeModalOpen(false); return; }

          // 2. Close mobile drawer sidebar
          if (mobileSidebarOpen) {
            setMobileSidebarOpen(false);
            return;
          }

          // 3. Return to Dashboard if inside portal on a sub-tab
          if (appView === 'portal' && currentTab !== 'dashboard') {
            setCurrentTab('dashboard');
            return;
          }

          // 4. Return to landing from login or archive
          if (appView === 'login' || appView === 'archive') {
            setAppView('landing');
            return;
          }

          // 5. Exit application if on root screen
          CapApp.exitApp();
        });
      } catch {}
    };

    setupBackHandler();

    return () => {
      if (backListener) {
        backListener.remove?.();
      }
    };
  }, [
    changePasswordModalOpen,
    legalModalOpen,
    academicTermsModalOpen,
    onboardTeacherModalOpen,
    recordPaymentModalOpen,
    forwardPaymentModalOpen,
    CBCModalOpen,
    admitModalOpen,
    smsModalOpen,
    exportReportModalOpen,
    uploadMarksModalOpen,
    createLessonPlanModalOpen,
    createSchemeModalOpen,
    mobileSidebarOpen,
    appView,
    currentTab,
  ]);

  // Synchronize view state with authentication status
  useEffect(() => {
    if (isAuthenticated) {
      setAppView('portal');
    } else if (authError) {
      setAppView('login');
    }
  }, [isAuthenticated, authError]);

  useEffect(()=>{
    setLoadedDataScope(dataScopeKey);
    setStudents([]);setTeachers([]);setTransactions([]);setAssessments([]);setActivities([]);setTotalCollectedFee(0);
    setRecordPaymentModalOpen(false);setForwardPaymentModalOpen(false);setOnboardTeacherModalOpen(false);
  },[effectiveRole,user?.id,user?.schoolId]);

  // Role-Based Tab Guard: if active tab is forbidden for this role, bounce to dashboard
  useEffect(() => {
    if (effectiveRole && !isTabPermitted(currentTab, effectiveRole)) {
      setCurrentTab('dashboard');
    }
  }, [effectiveRole, currentTab]);

  // Refresh students and attached fee balances
  const refreshStudentsAndFees = useCallback(async () => {
    const isCurrentScope = captureApiRequestScope();
    const requestScope=activeDataScope.current;
    const commitStudents: typeof setStudents = value => {if(isCurrentScope()&&activeDataScope.current===requestScope)setStudents(value);};

    try {
      const isParentOnly = effectiveRole === UserRole.PARENT || effectiveRole === UserRole.GUARDIAN;
      if (isParentOnly) {
        const portalRes = await apiService.getGuardianPortalData().catch(() => null);
        if (portalRes?.data?.children && Array.isArray(portalRes.data.children)) {
          const mappedChildren: Student[] = portalRes.data.children.map((c: any) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            admNo: c.admissionNumber || 'N/A',
            upi: c.upiNumber || '--',
            nemis: c.upiNumber || '--',
            grade: resolveGradeName(c.gradeLevel || c.grade),
            stream: resolveStreamName(c.streamId, c.stream?.name || c.streamName || c.stream),
            gender: c.gender === 'FEMALE' || c.gender === 'Girl' ? 'Girl' : 'Boy',
            feeBalance: c.fee?.balance ?? 0,
            totalFee: c.fee?.totalBilled ?? 0,
            isChargeExempt: Boolean(c.isChargeExempt),
            fee: c.fee,
            attendanceRate: c.attendance?.attendanceRate ?? 100,
            guardianName: portalRes.data.guardian?.user
              ? `${portalRes.data.guardian.user.firstName} ${portalRes.data.guardian.user.lastName}`
              : (user?.name || 'Parent'),
            guardianPhone: user?.phone || '+254777000777',
            medicalConditions: c.medicalConditions || 'None',
            emergencyContact: portalRes.data.guardian?.emergencyContact || user?.phone || '+254777000777',
            streamId: c.streamId,
            classroomId: c.classroomId,
            academicYearId: c.academicYearId,
            status: c.status || 'Active',
            profilePhotoUrl: c.profilePhotoUrl,
            dateOfBirth: c.dateOfBirth,
            specialNeeds: c.specialNeeds,
          }));
          commitStudents(mappedChildren);
        } else {
          commitStudents([]);
        }
        return;
      }

      const canAccessFinance = [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.SCHOOL_ADMIN,
        UserRole.BURSAR,
        UserRole.ACCOUNTANT,
      ].includes(effectiveRole as any);

      const [studentData, defaultersRes, invoicesRes] = await Promise.all([
        apiService.getStudents().catch(() => null),
        canAccessFinance ? apiService.getDefaulters().catch(() => null) : Promise.resolve(null),
        canAccessFinance ? apiService.getInvoices().catch(() => null) : Promise.resolve(null),
      ]);

      const feeMap = new Map<string, { balance: number; billed: number; hasInvoices: boolean }>();

      if (invoicesRes?.data && Array.isArray(invoicesRes.data)) {
        invoicesRes.data.forEach((inv: any) => {
          const current = feeMap.get(inv.studentId) || { balance: 0, billed: 0, hasInvoices: true };
          // CARRIED_FORWARD or CANCELLED invoices should not overwrite active balance
          const invBalance = inv.status === 'CARRIED_FORWARD' || inv.status === 'CANCELLED' ? 0 : (Number(inv.balance) || 0);
          const invBilled = inv.status === 'CARRIED_FORWARD' ? 0 : (Number(inv.amountPayable) || Number(inv.amountBilled) || 0);

          feeMap.set(inv.studentId, {
            balance: current.balance + invBalance,
            billed: current.billed + invBilled,
            hasInvoices: true,
          });
        });
      }

      if (defaultersRes?.data?.defaulters && Array.isArray(defaultersRes.data.defaulters)) {
        defaultersRes.data.defaulters.forEach((d: any) => {
          const current = feeMap.get(d.studentId);
          if (!current || (current.balance === 0 && Number(d.balance) > 0)) {
            feeMap.set(d.studentId, {
              balance: Number(d.balance) || 0,
              billed: Math.max(current?.billed || 0, Number(d.amountPayable) || Number(d.balance) || 0),
              hasInvoices: true,
            });
          }
        });
      }

      if (studentData?.data && Array.isArray(studentData.data)) {
        const mappedStudents: Student[] = studentData.data.map((st: any) => {
          const fee = feeMap.get(st.id);
          const hasInvoices = fee !== undefined ? fee.hasInvoices : Boolean(st.hasInvoices);
          const feeBalance = fee !== undefined ? fee.balance : (Number(st.feeBalance) || 0);
          const totalFee = fee !== undefined ? fee.billed : (Number(st.totalFee) || 0);
          const isSponsored = Boolean(st.isSponsored || st.sponsorship);
          const isUnbilled = !isSponsored && !hasInvoices && feeBalance === 0;
          const fullName =
            st.name ||
            st.fullName ||
            `${st.firstName || ''} ${st.lastName || ''}`.trim() ||
            'Learner';
          return {
            id: st.id,
            admNo: st.admissionNumber || st.admNo || 'N/A',
            admissionNumber: st.admissionNumber || st.admNo,
            upi: st.upiNumber || st.upi || '--',
            nemis: st.upiNumber || st.nemis || '--',
            name: fullName,
            gender: st.gender === 'FEMALE' || st.gender === 'Girl' ? 'Girl' : 'Boy',
            grade: resolveGradeName(st.grade || st.gradeLevel),
            gradeLevel: st.gradeLevel || st.grade,
            stream: resolveStreamName(st.streamId, st.stream?.name || st.streamName || st.stream),
            streamId: st.streamId,
            classroomId: st.classroomId,
            guardianName:
              st.guardian && (st.guardian.firstName || st.guardian.lastName)
                ? `${st.guardian.firstName || ''} ${st.guardian.lastName || ''}`.trim()
                : (st.guardianName || st.emergencyContactName || '--'),
            guardianPhone: st.guardian?.phone || st.guardianPhone || st.emergencyContactPhone || '--',
            feeBalance,
            totalFee,
            hasInvoices,
            isUnbilled,
            priorArrears: Number(st.priorArrears) || 0,
            totalPaid: Number(st.totalPaid) || 0,
            creditBalance: Number(st.creditBalance) || 0,
            totalDue: Number(st.totalDue) || 0,
            arrearsDue: Number(st.arrearsDue) || 0,
            isSponsored,
            sponsorship: st.sponsorship || null,
            attendanceRate: st.attendanceRate ?? 0,
            CBCRating: st.CBCRating || '--',
            status: st.status === 'ACTIVE' || st.status === 'Active' ? 'Active' : (st.status || 'Active'),
            profilePhotoUrl: st.profilePhotoUrl,
            dateOfBirth: st.dateOfBirth,
            medicalConditions: st.medicalConditions,
            specialNeeds: st.specialNeeds,
          };
        });
        commitStudents(mappedStudents);
      } else {
        commitStudents([]);
      }
    } catch {
      commitStudents([]);
    }
  }, [user,effectiveRole]);

  // Sync with Backend API on Mount & Auth State Changes
  useEffect(() => {
    let cancelled = false;
    const isCurrentScope = captureApiRequestScope();
    const isStale = () => cancelled || !isCurrentScope();
    const guarded = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) => (value: React.SetStateAction<T>) => {if(!isStale())setter(value);};
    const safeSetAssessments = guarded(setAssessments);
    const safeSetBackendConnected = guarded(setBackendConnected);
    const safeSetCurrentContext = guarded(setCurrentContext);
    const safeSetCurrentTerm = guarded(setCurrentTerm);
    const safeSetSchool = guarded(setSchool);
    const safeSetStudents = guarded(setStudents);
    const safeSetTeachers = guarded(setTeachers);
    const safeSetTotalCollectedFee = guarded(setTotalCollectedFee);
    const safeSetTransactions = guarded(setTransactions);

    async function syncBackend() {
      const isUp = await apiService.checkHealth();
      if (isStale()) return;
      safeSetBackendConnected(isUp);
      if (isUp && isAuthenticated) {
        const isFinanceOnly = effectiveRole === UserRole.BURSAR || effectiveRole === UserRole.ACCOUNTANT;
        const isParentOnly = effectiveRole === UserRole.PARENT || effectiveRole === UserRole.GUARDIAN;

        try {
          const [ctxRes, schRes] = await Promise.all([
            apiService.getCurrentContext().catch(() => null),
            apiService.getSchool().catch(() => null),
          ]);
          if (isStale()) return;
          if (ctxRes?.data) {
            safeSetCurrentContext(ctxRes.data);
            if (ctxRes.data.currentTerm?.name) {
              safeSetCurrentTerm(ctxRes.data.currentTerm.name);
            }
          }
          if (schRes?.data) safeSetSchool(schRes.data);

          if (isParentOnly) {
            try {
              const portalRes = await apiService.getGuardianPortalData().catch(() => null);
              if (portalRes?.data?.children && Array.isArray(portalRes.data.children)) {
                const mappedChildren: Student[] = portalRes.data.children.map((c: any) => ({
                  id: c.id,
                  name: `${c.firstName} ${c.lastName}`,
                  admNo: c.admissionNumber,
                  upi: c.upiNumber || '',
                  grade: c.gradeLevel ? c.gradeLevel.replace('_', ' ') : 'Grade 7',
                  stream: c.streamId || 'Stream A',
                  gender: c.gender || 'Other',
                  feeBalance: c.fee?.balance ?? 0,
                  totalFee: c.fee?.totalBilled ?? 0,
                  isChargeExempt: Boolean(c.isChargeExempt),
                  fee: c.fee,
                  attendanceRate: c.attendance?.attendanceRate ?? 100,
                  guardianName: portalRes.data.guardian?.user ? `${portalRes.data.guardian.user.firstName} ${portalRes.data.guardian.user.lastName}` : (user?.name || 'Parent'),
                  guardianPhone: user?.phone || '+254777000777',
                  medicalConditions: c.medicalConditions || 'None',
                  emergencyContact: portalRes.data.guardian?.emergencyContact || user?.phone || '+254777000777',
                  streamId: c.streamId,
                  classroomId: c.classroomId,
                  academicYearId: c.academicYearId,
                }));
                safeSetStudents(mappedChildren);
              } else {
                safeSetStudents([]);
              }
            } catch {
              safeSetStudents([]);
            }
          } else {
            await refreshStudentsAndFees();
          }
        } catch {
          safeSetStudents([]);
        }

        if (isStale()) return;
        if (!isFinanceOnly && !isParentOnly) {
          try {
            const teacherData = await apiService.getTeachers().catch(() => null);
            if (teacherData?.data && Array.isArray(teacherData.data)) {
              const mappedTeachers: Teacher[] = teacherData.data.map((t: any) => ({
                id: t.id,
                name: t.user ? `${t.user.firstName} ${t.user.lastName}` : `Teacher ${t.tscNumber || ''}`,
                role: t.user?.role === 'TEACHER' ? 'Teacher / Educator' : (t.user?.role ? t.user.role.replace(/_/g, ' ') : 'Subject Teacher'),
                tscNumber: t.tscNumber || 'Not Issued / Pending',
                employeeNumber: t.employeeNumber || '--',
                assignedClass: resolveTeacherAssignedClasses(t.assignedClassStreamIds),
                phone: t.user?.phone || '--',
                email: t.user?.email || '--',
                learningAreas: t.specialization || ['CBC Core'],
                status: t.status || 'Active',
                clockInTime: t.clockInTime || '--',
              }));
              safeSetTeachers(mappedTeachers);
            } else {
              safeSetTeachers([]);
            }
          } catch {
            safeSetTeachers([]);
          }
        }

        if (isStale()) return;
        if (!isFinanceOnly) {
          try {
            const formativesRes = await apiService.listFormatives().catch(() => null);
            if (formativesRes?.data && Array.isArray(formativesRes.data)) {
              const mappedAssessments: AssessmentRecord[] = formativesRes.data.map((f: any) => ({
                id: f.id,
                studentId: f.studentId,
                studentName: f.studentName || 'Learner',
                admNo: f.admissionNumber || '',
                grade: f.gradeLevel ? f.gradeLevel.replace('_', ' ') : 'CBC Class',
                learningArea: f.learningAreaName || f.learningAreaId || 'CBC Learning Area',
                strand: f.strandName || f.strandId || f.subStrandId || 'Strand',
                subStrand: f.subStrandTitle || f.specificOutcomeTested || 'Sub-strand',
                rating: f.performanceLevel as any,
                evidence: f.evidenceNotes || f.teacherRemarks || 'Formative observation',
                recordedBy: f.teacherName || 'CBC Educator',
                date: f.assessmentDate,
                targetedCompetencies: f.targetedCompetencies,
                valuesObserved: f.valuesObserved,
              }));
              safeSetAssessments(mappedAssessments);
            } else {
              safeSetAssessments([]);
            }
          } catch {
            safeSetAssessments([]);
          }
        }
        if (isStale()) return;
        if (isParentOnly) {
          try {
            const paymentsRes = await apiService.getPayments().catch(() => null);
            if (paymentsRes?.data && Array.isArray(paymentsRes.data) && paymentsRes.data.length > 0) {
              const mappedTxs: FeeTransaction[] = paymentsRes.data.map((p: any) => ({
                id: p.id,
                ref: p.receiptNumber || p.transactionReference || p.id,
                studentName: p.studentName || 'Learner',
                admNo: p.admissionNumber || '',
                grade: p.gradeLevel ? p.gradeLevel.replace('_', ' ') : '',
                amount: p.amount,
                channel: p.paymentMethod === 'CASH' ? 'Cash Office'
                       : p.paymentMethod === 'BANK_DEPOSIT' ? 'Bank Deposit'
                       : p.paymentMethod === 'MPESA' ? 'M-Pesa Express'
                       : p.paymentMethod === 'BANK_TRANSFER' ? 'Bank Wire / EFT'
                       : p.paymentMethod === 'CHEQUE' ? 'Banker\'s Cheque'
                       : (p.paymentMethod || 'Bank Wire'),
                date: p.paymentDate || 'Today',
                status: p.status === 'COMPLETED' ? 'Settled' : p.status,
              }));
              safeSetTransactions(mappedTxs);
              const parentPaid = mappedTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
              safeSetTotalCollectedFee(parentPaid);
            }
          } catch {
            // Keep defaults
          }
        } else {
          try {
            const [analyticsData, paymentsRes] = await Promise.all([
              user?.role === UserRole.TEACHER ? Promise.resolve(null) : apiService.getDashboardAnalytics().catch(() => null),
              user?.role === UserRole.TEACHER ? Promise.resolve(null) : apiService.getPayments().catch(() => null),
            ]);
            if (analyticsData?.data?.finance?.totalCollected) {
              safeSetTotalCollectedFee(analyticsData.data.finance.totalCollected);
            }
            if (paymentsRes?.data && Array.isArray(paymentsRes.data) && paymentsRes.data.length > 0) {
              const mappedTxs: FeeTransaction[] = paymentsRes.data.map((p: any) => ({
                id: p.id,
                ref: p.receiptNumber || p.transactionReference || p.id,
                studentName: p.studentName || 'Learner',
                admNo: p.admissionNumber || '',
                grade: p.gradeLevel ? p.gradeLevel.replace('_', ' ') : '',
                amount: p.amount,
                channel: p.paymentMethod === 'CASH' ? 'Cash Office'
                       : p.paymentMethod === 'BANK_DEPOSIT' ? 'Bank Deposit'
                       : p.paymentMethod === 'MPESA' ? 'M-Pesa Express'
                       : p.paymentMethod === 'BANK_TRANSFER' ? 'Bank Wire / EFT'
                       : p.paymentMethod === 'CHEQUE' ? 'Banker\'s Cheque'
                       : (p.paymentMethod || 'Bank Wire'),
                date: p.paymentDate || 'Today',
                status: p.status === 'COMPLETED' ? 'Settled' : p.status,
              }));
              safeSetTransactions(mappedTxs);
            }
          } catch {
            // Keep default 0
          }
        }
      }
    }
    syncBackend();
    return () => {cancelled=true;};
  }, [isAuthenticated,effectiveRole,user?.id,user?.schoolId]);

  // Quick Action / Deep Link Triggers
  const handleOpenPayment = (student?: Student) => {
    const targetStudent = student || (students && students.length > 0 ? students[0] : undefined);
    setSelectedStudentForPayment(targetStudent);
    if (isGuardian) {
      setForwardPaymentModalOpen(true);
    } else {
      setRecordPaymentModalOpen(true);
    }
  };

  const handleOpenMpesa = (student?: Student) => {
    handleOpenPayment(student);
  };

  const handleOpenKcbBuni = (student?: Student) => {
    handleOpenPayment(student);
  };

  const handleOpenCBC = (student?: Student) => {
    setSelectedStudentForCBC(student || (students && students.length > 0 ? students[0] : undefined));
    setCBCModalOpen(true);
  };

  const handleOpenSms = (target: any = 'all') => {
    const validTarget = target === 'absentee' || target === 'fee' ? target : 'all';
    setSmsTarget(validTarget);
    setSmsModalOpen(true);
  };

  const handleViewReportCard = (student: Student) => {
    setSelectedStudentForReport(student);
    setCurrentTab('report-cards');
  };

  const handlePaymentRecorded = () => {
    refreshStudentsAndFees();
    setRecordPaymentModalOpen(false);
    setSelectedStudentForPayment(undefined);
  };

  const handleForwardPaymentSuccess = () => {
    refreshStudentsAndFees();
    setForwardPaymentModalOpen(false);
    setSelectedStudentForPayment(undefined);
  };

  // CBC Formative Assessment Save Handler
  const handleSaveAssessment = (assessment: Omit<AssessmentRecord, 'id' | 'date'>) => {
    const newRecord: AssessmentRecord = {
      ...assessment,
      id: `ass-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    setAssessments([newRecord, ...assessments]);

    // Save to Backend API
    const levelMap: Record<string, string> = {
      EE: 'EE',
      ME: 'ME',
      AE: 'AE',
      BE: 'BE',
    };
    const activeTeacherId = user?.id || '';
    const activeTermId = currentContext?.currentTerm?.id || '';
    const activeYearId = currentContext?.currentYear?.id || '';

    apiService
      .recordFormativeAssessment({
        studentId: assessment.studentId,
        teacherId: (assessment as any).teacherId || activeTeacherId,
        learningAreaId: (assessment as any).learningAreaId || '',
        subStrandId: (assessment as any).subStrandId || '',
        termId: (assessment as any).termId || activeTermId,
        academicYearId: (assessment as any).academicYearId || activeYearId,
        assessmentDate: new Date().toISOString().split('T')[0],
        assessmentMethod: 'OBSERVATION',
        performanceLevel: levelMap[assessment.rating] || 'ME',
        specificOutcomeTested: `${assessment.strand} - ${assessment.subStrand}`,
        teacherRemarks: assessment.evidence || 'Demonstrated proficiency in core competency.',
        evidenceNotes: assessment.evidence,
      })
      .catch(() => {});

    // Update student's CBC rating in state
    setStudents((prev) =>
      prev.map((s) =>
        s.id === assessment.studentId
          ? { ...s, CBCRating: assessment.rating }
          : s
      )
    );

    // Add activity
    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'report',
      icon: 'rule',
      title: `CBC Formative Rubric Recorded: ${assessment.rating}`,
      description: `${assessment.studentName} · ${assessment.learningArea} (${assessment.strand})`,
      timestamp: 'Just now',
      badgeColor: 'bg-primary text-white',
    };
    setActivities([newAct, ...activities]);
  };

  // Learner Admission Handler
  const handleAdmitStudent = async (newStudent: any, rawBackendData?: any) => {
    let studentWithId: Student = {
      ...newStudent,
      id: newStudent.id || `std-${Date.now()}`,
    };

    // If for any reason it wasn't registered yet, register it
    if (rawBackendData && (!newStudent.id || newStudent.id.startsWith('std-onb-') || newStudent.id.startsWith('std-temp-'))) {
      try {
        const res = await apiService.registerStudent(rawBackendData);
        if (res?.success && res.data) {
          studentWithId = {
            ...studentWithId,
            id: res.data.id,
            admNo: res.data.admissionNumber || studentWithId.admNo,
          };
        }
      } catch (err) {
        console.error('Failed to register student on backend:', err);
      }
    }

    setStudents((prev) => [
      studentWithId,
      ...prev.filter((s) => s.id !== studentWithId.id && s.admNo !== studentWithId.admNo)
    ]);

    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'nemis',
      icon: 'person_add',
      title: `Learner Admitted: ${studentWithId.name}`,
      description: `Adm #${studentWithId.admNo} · ${studentWithId.grade}${studentWithId.stream ? ` (${studentWithId.stream})` : ''} · ${studentWithId.upi && studentWithId.upi !== '--' ? `UPI: ${studentWithId.upi}` : 'NEMIS: Pending'}`,
      timestamp: 'Just now',
      badgeColor: 'bg-warning-container text-white',
    };
    setActivities((prev) => [newAct, ...prev]);

    // Refresh state to ensure fee ledgers and student directories are completely up to date
    await refreshStudentsAndFees();
  };

  // Onboard New Teacher / Staff Handler
  const handleTeacherCreated = (newTeacherData: any) => {
    const assigned =
      newTeacherData.assignedClassName ||
      resolveTeacherAssignedClasses(newTeacherData.assignedClassStreamIds);

    const roleName = newTeacherData.role
      ? newTeacherData.role === 'TEACHER'
        ? 'Teacher / Educator'
        : newTeacherData.role.replace(/_/g, ' ')
      : newTeacherData.user?.role
      ? newTeacherData.user.role.replace(/_/g, ' ')
      : 'Staff Member';

    const newT: Teacher = {
      id: newTeacherData.id || `tch-${Date.now()}`,
      name: newTeacherData.user
        ? `${newTeacherData.user.firstName} ${newTeacherData.user.lastName}`
        : `${newTeacherData.firstName || 'Teacher'} ${newTeacherData.lastName || 'Staff'}`,
      role: roleName,
      tscNumber: newTeacherData.tscNumber || 'Not Issued / Pending',
      employeeNumber: newTeacherData.employeeNumber || '01',
      assignedClass: assigned,
      phone: newTeacherData.user?.phone || newTeacherData.phone || '--',
      email: newTeacherData.user?.email || newTeacherData.email || 'staff@smartshule.ac.ke',
      learningAreas: newTeacherData.specialization?.length ? newTeacherData.specialization : ['General'],
      status: 'Clocked In',
      clockInTime: '08:00 AM',
    };
    setTeachers((prev) => [newT, ...prev.filter((t) => t.id !== newT.id)]);

    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'report',
      icon: 'person_add',
      title: `Staff Onboarded: ${newT.name}`,
      description: `Role: ${newT.role} · Emp #: ${newT.employeeNumber} · TSC: ${newT.tscNumber} · Class: ${newT.assignedClass}`,
      timestamp: 'Just now',
      badgeColor: 'bg-success text-white',
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Teacher Clock-In Toggle
  const handleToggleClockIn = (teacherId: string) => {
    setTeachers((prev) =>
      prev.map((t) => {
        if (t.id === teacherId) {
          const isClocked = t.status === 'Clocked In';
          return {
            ...t,
            status: isClocked ? 'Absent (Permit)' : 'Clocked In',
            clockInTime: isClocked ? undefined : '07:45 AM',
          };
        }
        return t;
      })
    );
  };

  // Listen for standalone hash navigation e.g. #/archive or #/archived-records or ?view=archive
  useEffect(() => {
    const checkHashRoute = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      if (!isAuthenticated && (search.includes('view=reset-password') || search.includes('token=') || hash.includes('reset-password'))) {
        setAppView('login');
        return;
      }
      if (hash === '#/geofencing' || hash === '#/geofence' || search.includes('view=geofencing')) {
        if (isAuthenticated) {
          setCurrentTab('geofencing');
          if (appView !== 'portal') setAppView('portal');
        }
      } else if (hash === '#/archive' || hash === '#/archived-records' || search.includes('view=archive')) {
        if (isAuthenticated) {
          const isPermitted = user?.role && [
            UserRole.SUPER_ADMIN,
            UserRole.ADMIN,
            UserRole.SCHOOL_ADMIN,
          ].includes(user.role);
          if (isPermitted) {
            setAppView('archive');
          } else {
            setAppView('portal');
          }
        }
      } else if (hash === '#/arrears' || hash === '#/fee-arrears' || search.includes('view=arrears')) {
        if (isAuthenticated) {
          if (user?.role && isTabPermitted('arrears', user.role)) {
            setCurrentTab('arrears');
            if (appView !== 'portal') setAppView('portal');
          } else {
            setCurrentTab('dashboard');
            if (appView !== 'portal') setAppView('portal');
          }
        }
      } else if (hash === '#/forwarded-payments' || hash === '#/forwarded' || search.includes('view=forwarded')) {
        if (isAuthenticated) {
          if (user?.role && isTabPermitted('forwarded-payments', user.role)) {
            setCurrentTab('forwarded-payments');
            if (appView !== 'portal') setAppView('portal');
          } else {
            setCurrentTab('dashboard');
            if (appView !== 'portal') setAppView('portal');
          }
        }
      } else if (appView === 'archive' && !hash && !search.includes('view=archive')) {
        setAppView('portal');
      }
    };
    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, [isAuthenticated, user, appView]);

  // Super Admin Purge Demo Data Handler
  const handlePurgeDemo = async () => {
    if (!window.confirm('Are you sure you want to purge all demo data? This will clear test students, test teachers, and test ledger records.')) {
      return;
    }
    try {
      const res = await apiService.purgeAllData();
      if (res.success) {
        alert('Demo data successfully purged.');
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to purge demo data');
    }
  };

  // Render Public Landing Page
  if (appView === 'landing') {
    return (
      <>
        <LandingPage
          onNavigateLogin={() => setAppView('login')}
          isAuthenticated={isAuthenticated}
          onNavigatePortal={() => setAppView('portal')}
          onOpenLegalModal={handleOpenLegalModal}
        />
        <CookieBanner onOpenPreferences={() => handleOpenLegalModal('cookies')} />
        <LegalModal
          isOpen={legalModalOpen}
          onClose={() => setLegalModalOpen(false)}
          initialTab={legalModalTab}
        />
      </>
    );
  }

  // Render Single Dedicated Login Page
  if (appView === 'login') {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialResetToken = urlParams?.get('token') || urlParams?.get('resetCode') || undefined;
    const initialResetEmail = urlParams?.get('email') || undefined;

    return (
      <>
        <LoginPage
          onSuccess={() => setAppView('portal')}
          onNavigateLanding={() => setAppView('landing')}
          onOpenLegalModal={handleOpenLegalModal}
          initialResetToken={initialResetToken}
          initialResetEmail={initialResetEmail}
        />
        <CookieBanner onOpenPreferences={() => handleOpenLegalModal('cookies')} />
        <LegalModal
          isOpen={legalModalOpen}
          onClose={() => setLegalModalOpen(false)}
          initialTab={legalModalTab}
        />
      </>
    );
  }

  // Dedicated Mandatory Change Password Page (when admin resets user password or temporary credentials)
  if (isAuthenticated && user?.mustChangePassword) {
    return (
      <>
        <ChangePasswordPage
          user={user}
          onSuccess={() => {
            updateUser({ mustChangePassword: false });
          }}
          onLogout={logout}
          onOpenLegalModal={handleOpenLegalModal}
        />
        <LegalModal
          isOpen={legalModalOpen}
          onClose={() => setLegalModalOpen(false)}
          initialTab={legalModalTab}
        />
      </>
    );
  }

  // Render Standalone Archived Records Page
  if (appView === 'archive') {
    return (
      <StandaloneArchivedRecordsPage
        onBackToPortal={() => {
          setAppView('portal');
          if (window.location.hash === '#/archive' || window.location.hash === '#/archived-records') {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
          }
        }}
        onRefreshStudents={refreshStudentsAndFees}
      />
    );
  }

  // Fallback: If not authenticated, ensure landing view
  if (!isAuthenticated && !isLoading) {
    return (
      <>
        <LandingPage
          onNavigateLogin={() => setAppView('login')}
          isAuthenticated={false}
          onNavigatePortal={() => setAppView('portal')}
          onOpenLegalModal={handleOpenLegalModal}
        />
        <CookieBanner onOpenPreferences={() => handleOpenLegalModal('cookies')} />
        <LegalModal
          isOpen={legalModalOpen}
          onClose={() => setLegalModalOpen(false)}
          initialTab={legalModalTab}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased text-on-surface">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'archived-records') {
            setAppView('archive');
            window.location.hash = '/archive';
            setMobileSidebarOpen(false);
            return;
          }
          if (tab === 'arrears') {
            window.location.hash = '/arrears';
          } else if (window.location.hash === '#/arrears' || window.location.hash === '#/fee-arrears') {
            window.history.pushState(null, '', window.location.pathname + window.location.search);
          }
          setCurrentTab(tab);
          setMobileSidebarOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNavigateLanding={() => setAppView('landing')}
        onOpenLegalModal={handleOpenLegalModal}
        isCompact={isSidebarCompact}
        onToggleCompact={handleToggleSidebarCompact}
      />

      {/* Main Content Viewport (offset by sidebar width on desktop) */}
      <div className={`print:pl-0 print:m-0 print:w-full flex flex-col flex-1 min-w-0 bg-surface transition-all duration-200 ${
        isSidebarCompact ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        {/* Top Operational Header: Pure Maroon (#800000) */}
        <Header
          onToggleMobile={() => setMobileSidebarOpen(true)}
          currentTerm={currentTerm}
          onChangeTerm={setCurrentTerm}
          students={loadedDataScope===dataScopeKey?students:[]}
          teachers={loadedDataScope===dataScopeKey?teachers:[]}
          backendConnected={backendConnected}
          onNavigateLanding={() => setAppView('landing')}
          onNavigateTab={(tab) => setCurrentTab(tab as any)}
          onOpenAcademicTermsModal={() => setAcademicTermsModalOpen(true)}
          onOpenChangePasswordModal={() => setChangePasswordModalOpen(true)}
          onOpenBiometricModal={() => setBiometricModalOpen(true)}
          academicContext={currentContext}
          onSelectStudent={(student) => {
            handleViewReportCard(student);
          }}
          onOpenQuickAction={(action) => {
            if (action === 'mpesa') handleOpenMpesa();
            if (action === 'CBC') handleOpenCBC();
            if (action === 'admit') setAdmitModalOpen(true);
            if (action === 'sms') handleOpenSms('all');
          }}
        />



        {/* Dynamic Route Content with Suspense Loading Skeleton */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 pb-12 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">
          <Suspense key={`${user?.id}:${effectiveRole}`} fallback={<ViewLoadingSkeleton />}>
          {isTabPermitted(currentTab,effectiveRole) && <>
          {currentTab === 'dashboard' && (
            (() => {
              if (isStaffWithChildren && activeViewMode === 'PARENT') {
                return (
                  <ParentDashboardView
                    onOpenMpesaWithStudent={(student) => handleOpenKcbBuni(student)}
                    onOpenKcbBuniWithStudent={(student) => handleOpenKcbBuni(student)}
                    onViewReportCard={(student) => handleViewReportCard(student)}
                    onNavigateTab={(tab) => setCurrentTab(tab as any)}
                  />
                );
              }
              switch (user?.role) {
                case UserRole.SUPER_ADMIN:
                  return (
                    <SuperAdminDashboardView
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                      onOpenPurgeDemo={handlePurgeDemo}
                    />
                  );
                case UserRole.HEAD_TEACHER:
                  return (
                    <HeadTeacherDashboardView
                      students={loadedDataScope===dataScopeKey?students:[]}
                      teachers={loadedDataScope===dataScopeKey?teachers:[]}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                      onOpenUploadMarks={() => {
                        setUploadMarksInitialStudent(undefined);
                        setUploadMarksInitialType('SUMMATIVE');
                        setUploadMarksModalOpen(true);
                      }}
                    />
                  );
                case UserRole.DEPUTY_HEAD_TEACHER:
                  return (
                    <DeputyDashboardView
                      teachers={loadedDataScope===dataScopeKey?teachers:[]}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                    />
                  );
                case UserRole.ADMISSIONS:
                  return (
                    <AdmissionsDashboardView
                      students={loadedDataScope===dataScopeKey?students:[]}
                      teachers={loadedDataScope===dataScopeKey?teachers:[]}
                      onOpenAdmitModal={() => setAdmitModalOpen(true)}
                      onOpenOnboardTeacher={() => setOnboardTeacherModalOpen(true)}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                    />
                  );
                case UserRole.BURSAR:
                case UserRole.ACCOUNTANT:
                  return (
                    <BursarDashboardView
                      totalCollectedFee={totalCollectedFee}
                      onOpenMpesa={() => handleOpenMpesa()}
                      onOpenSmsModal={handleOpenSms}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                    />
                  );
                case UserRole.TEACHER:
                  return (
                    <TeacherDashboardView
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                      onOpenUploadMarks={(student) => {
                        const st = (student && typeof student === 'object' && 'id' in student && typeof (student as any).id === 'string') ? student : undefined;
                        setUploadMarksInitialStudent(st);
                        setUploadMarksInitialType('SUMMATIVE');
                        setUploadMarksModalOpen(true);
                      }}
                      onOpenNewLessonPlan={() => setCurrentTab('lesson-plans')}
                      onOpenNewScheme={() => setCurrentTab('scheme-of-work-builder')}
                      refreshTrigger={marksRefreshTrigger}
                    />
                  );
                case UserRole.PARENT:
                case UserRole.GUARDIAN:
                  return (
                    <ParentDashboardView
                      onOpenMpesaWithStudent={(student) => handleOpenKcbBuni(student)}
                      onOpenKcbBuniWithStudent={(student) => handleOpenKcbBuni(student)}
                      onViewReportCard={(student) => handleViewReportCard(student)}
                      onNavigateTab={(tab) => setCurrentTab(tab as any)}
                    />
                  );
                case UserRole.ADMIN:
                case UserRole.SCHOOL_ADMIN:
                default:
                  return (
                    <DashboardView
                      students={loadedDataScope===dataScopeKey?students:[]}
                      teachers={loadedDataScope===dataScopeKey?teachers:[]}
                      activities={loadedDataScope===dataScopeKey?activities:[]}
                      totalCollectedFee={totalCollectedFee}
                      onOpenMpesa={() => handleOpenMpesa()}
                      onOpenCBCModal={() => handleOpenCBC()}
                      onOpenAdmitModal={() => setAdmitModalOpen(true)}
                      onOpenSmsModal={handleOpenSms}
                      onOpenExportReport={() => setExportReportModalOpen(true)}
                      onOpenUploadMarks={() => {
                        setUploadMarksInitialStudent(undefined);
                        setUploadMarksInitialType('SUMMATIVE');
                        setUploadMarksModalOpen(true);
                      }}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                    />
                  );
              }
            })()
          )}

          {currentTab === 'students-guardians' && (
            user?.role === UserRole.BURSAR || user?.role === UserRole.ACCOUNTANT ? (
              <div className="p-8 my-8 text-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 max-w-lg mx-auto">
                <span className="material-symbols-outlined text-[48px] text-primary">account_balance_wallet</span>
                <h3 className="text-base font-bold">Finance Department Access Isolation</h3>
                <p className="text-xs text-amber-800">
                  The finance department is strictly isolated to fee structures, invoices, student accounts, cash flow ledgers, and expenses.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setCurrentTab('student-fee-search')}
                    className="px-4 py-2 rounded-xl bg-primary-container text-white font-bold text-xs hover:bg-primary-container transition-colors cursor-pointer"
                  >
                    Fee Collection & Accounts
                  </button>
                  <button
                    onClick={() => setCurrentTab('cashflow-ledger')}
                    className="px-4 py-2 rounded-xl bg-primary-fixed text-on-primary-fixed border border-primary font-bold text-xs hover:bg-primary-fixed-dim transition-colors cursor-pointer"
                  >
                    Cash Flow Ledger
                  </button>
                </div>
              </div>
            ) : (
              <StudentsView
                students={loadedDataScope===dataScopeKey?students:[]}
                onOpenMpesaWithStudent={handleOpenMpesa}
                onOpenCBCWithStudent={handleOpenCBC}
                onOpenAdmitModal={() => setAdmitModalOpen(true)}
                onViewReportCard={handleViewReportCard}
                onRefreshStudents={refreshStudentsAndFees}
                onNavigateStandaloneArchive={() => {
                  setAppView('archive');
                  window.location.hash = '/archive';
                }}
                onAdmitLearner={handleAdmitStudent}
                onUpdateStudent={(updated) =>
                  setStudents((prev) =>
                    prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
                  )
                }
                onDeleteStudent={(deletedId) =>
                  setStudents((prev) => prev.filter((s) => s.id !== deletedId))
                }
              />
            )
          )}

          {currentTab === 'admit-learner' && (
            <AdmitLearnerModal
              isPage={true}
              isOpen={true}
              onClose={() => setCurrentTab('admissions-dashboard')}
              onAdmit={handleAdmitStudent}
              existingStudents={students}
              onNavigateTab={(tab) => setCurrentTab(tab as any)}
            />
          )}

          {currentTab === 'onboard-staff' && (
            <OnboardTeacherModal
              isPage={true}
              isOpen={true}
              onClose={() => setCurrentTab('staff-directory')}
              onTeacherCreated={handleTeacherCreated}
              existingTeachers={teachers}
              onNavigateTab={(tab) => setCurrentTab(tab as any)}
            />
          )}

          {[
            'admissions-dashboard',
            'new-applications',
            'slot-applications',
            'onboard-queue',
            'application-review',
            'admission-assessments',
            'admission-decisions',
            'admission-offers',
            'admission-enrolment',
            'admission-reports',
            'admission-settings',
          ].includes(currentTab) && (
            <AdmissionsEnrolmentHubView
              currentSubTab={currentTab}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              students={loadedDataScope===dataScopeKey?students:[]}
              teachers={loadedDataScope===dataScopeKey?teachers:[]}
              onAdmitLearner={handleAdmitStudent}
              onRefreshStudents={refreshStudentsAndFees}
              onOpenAdmitModal={() => setCurrentTab('admit-learner')}
              onOpenOnboardTeacher={() => setCurrentTab('onboard-staff')}
            />
          )}

          {[
            'staff-directory',
            'teachers-staff',
            'teaching-staff',
            'non-teaching-staff',
            'staff-verifications',
            'teachers',
          ].includes(currentTab) && (
            <TeachersView
              teachers={loadedDataScope===dataScopeKey?teachers:[]}
              initialCategory={
                currentTab === 'teachers-staff' || currentTab === 'teaching-staff'
                  ? 'TEACHING'
                  : currentTab === 'non-teaching-staff'
                  ? 'NON_TEACHING'
                  : 'ALL'
              }
              initialTab={currentTab === 'staff-verifications' ? 'corrections' : 'roster'}
              onToggleClockIn={handleToggleClockIn}
              onNavigateTab={(tab) => setCurrentTab(tab as any)}
              onOpenOnboardTeacher={
                user?.role && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS].includes(user.role)
                  ? () => setCurrentTab('onboard-staff')
                  : undefined
              }
              onDeleteTeacher={(deletedId) =>
                setTeachers((prev) => prev.filter((t) => t.id !== deletedId))
              }
              onTeacherUpdated={(updatedTeacher) =>
                setTeachers((prev) =>
                  prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t))
                )
              }
              onAssignTeacher={(teacherId, assignedLabel) =>
                setTeachers((prev) =>
                  prev.map((t) => (t.id === teacherId ? { ...t, assignedClass: assignedLabel } : t))
                )
              }
            />
          )}

          {currentTab === 'geofencing' && (
            <GeofenceView onNavigateTab={(tab) => setCurrentTab(tab as any)} />
          )}

          {currentTab === 'classes-streams' && <ClassesView />}

          {currentTab === 'learning-areas' && <LearningAreasView onNavigateTab={tab=>setCurrentTab(tab as any)} />}

          {(currentTab === 'assessments' || currentTab === 'formative-assessments') && (
            <FormativeAssessmentsView
              assessments={loadedDataScope===dataScopeKey?assessments:[]}
              students={loadedDataScope===dataScopeKey?students:[]}
              onOpenNewAssessment={() => {
                setUploadMarksInitialType('FORMATIVE');
                setUploadMarksModalOpen(true);
              }}
              onDeleteAssessment={(deletedId) =>
                setAssessments((prev) => prev.filter((a) => a.id !== deletedId))
              }
              onNavigateTab={(tab) => setCurrentTab(tab as any)}
            />
          )}

          {currentTab === 'summative-assessments' && (
            <SummativeAssessmentsView
              students={loadedDataScope===dataScopeKey?students:[]}
              refreshTrigger={marksRefreshTrigger}
              onOpenUploadMarks={() => {
                setUploadMarksInitialType('SUMMATIVE');
                setUploadMarksModalOpen(true);
              }}
              onNavigateTab={(tab) => setCurrentTab(tab as any)}
            />
          )}

          {currentTab === 'competencies-strands' && <StrandsView />}

          {currentTab === 'report-cards' && (
            <ReportCardsView
              students={loadedDataScope===dataScopeKey?students:[]}
              selectedStudent={selectedStudentForReport}
            />
          )}

          {currentTab === 'CBC-analytics' && <CompetencyAnalyticsView />}
          {currentTab === 'broadsheets' && <MasterBroadsheetView />}

          {currentTab === 'schemes-lesson-plans' && <SchemesOfWorkView onNavigateTab={tab=>setCurrentTab(tab as any)} />}
          {currentTab === 'lesson-plans' && <LessonPlansView onNavigateTab={tab=>setCurrentTab(tab as any)} />}

          {currentTab === 'records-of-work' && (
            <RecordsOfWorkView onNavigateTab={(tab) => setCurrentTab(tab as any)} />
          )}

          {currentTab === 'school-calendar-plan' && <SchoolCalendarPlanView onNavigateTab={tab=>setCurrentTab(tab as any)} onOpenSettings={()=>setAcademicTermsModalOpen(true)}/>}
          {currentTab === 'timetable' && <TimetableView />}

          {currentTab === 'library' && <LibraryView />}

          {currentTab === 'attendance-register' && (
            <AttendanceRegisterView onOpenSmsModal={handleOpenSms} />
          )}

          {currentTab === 'fee-structure' && <FeeStructureView />}

          {currentTab === 'invoices-mpesa' && (
            <InvoicesMpesaView
              transactions={loadedDataScope===dataScopeKey?transactions:[]}
              totalCollected={loadedDataScope===dataScopeKey?totalCollectedFee:0}
              students={loadedDataScope===dataScopeKey?students:[]}
              onOpenMpesaModal={() => handleOpenMpesa()}
              onNavigateTab={(tab) => setCurrentTab(tab as any)}
            />
          )}

          {(currentTab === 'arrears' || (currentTab as string) === 'defaulters-receipts') && (
            <ArrearsView
              students={loadedDataScope===dataScopeKey?students:[]}
              onRefreshStudents={refreshStudentsAndFees}
              onOpenMpesaWithStudent={handleOpenMpesa}
              onOpenSmsModal={handleOpenSms}
            />
          )}

          {currentTab === 'forwarded-payments' && (
            user?.role && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.BURSAR, UserRole.ACCOUNTANT].includes(user.role) ? (
              <ForwardedPaymentsView
                students={loadedDataScope===dataScopeKey?students:[]}
                onRefreshStudents={refreshStudentsAndFees}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : (
              <div className="p-8 my-8 text-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3 max-w-lg mx-auto">
                <span className="material-symbols-outlined text-[48px] text-rose-700">lock</span>
                <h3 className="text-base font-bold">Access Restricted</h3>
                <p className="text-xs text-rose-800">
                  Parent forwarded payment verification is restricted to administrative and accounting personnel only.
                </p>
              </div>
            )
          )}

          {currentTab === 'student-fee-search' && (
            <StudentFeeCheckerView
              students={loadedDataScope===dataScopeKey?students:[]}
              onRefreshStudents={refreshStudentsAndFees}
            />
          )}

          {currentTab === 'cashflow-ledger' && <CashFlowLedgerView />}
          {currentTab === 'expenses-management' && <ExpensesView />}
          {currentTab === 'financial-reports' && <FinancialReportsView />}
          {currentTab === 'payroll' && <PayrollManagementView />}

          {currentTab === 'ediary' && <EDiaryView />}

          {currentTab === 'staff-messages' && <StaffMessagesView />}
          {currentTab === 'announcements' && <AnnouncementsView />}

          {currentTab === 'visual-CBC' && <VisualCBCView />}

          {currentTab === 'whatsapp-bot' && (
            user?.role && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN].includes(user.role) ? (
              <WhatsAppBotView />
            ) : (
              <div className="p-8 my-8 text-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3 max-w-lg mx-auto">
                <span className="material-symbols-outlined text-[48px] text-rose-700">security</span>
                <h3 className="text-base font-bold">Admin Privileges Required</h3>
                <p className="text-xs text-rose-800">
                  The WhatsApp communication interface is strictly restricted to School Administrators. It is not available to other departments.
                </p>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-4 py-2 rounded-xl bg-rose-800 text-white font-bold text-xs hover:bg-rose-900 transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}

          {currentTab === 'user-management' && (
            <UserManagementView
              onNavigateTab={(tab) => {
                if (tab === 'archived-records') {
                  setAppView('archive');
                  window.location.hash = '/archive';
                } else {
                  setCurrentTab(tab as any);
                }
              }}
            />
          )}

          {currentTab === 'archived-records' && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-2xl mx-auto my-12">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[36px]">inventory_2</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Enterprise Archive & Compliance Vault</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  The archived accounts and preserved records repository is configured as a standalone application workspace for optimal screen space and compliance printing.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAppView('archive');
                    window.location.hash = '/archive';
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                  <span>Open Standalone Archive Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/archive`, '_blank')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  <span>New Window</span>
                </button>
              </div>
            </div>
          )}

          {currentTab === 'system-logs' && <SystemLogsView />}
          {currentTab === 'fee-deadline-banner' && <FeeDeadlineBannerManagementView />}
          {currentTab === 'sponsored-students' && <SponsoredStudentsView />}
          {currentTab === 'document-signing' && <DocumentSigningCenterView />}
          {currentTab === 'digital-signature' && <MyDigitalSignatureView />}
          {currentTab === 'teacher-profile' && <TeacherProfileView />}
          {currentTab === 'salary-acknowledgement' && <TeacherSalaryAcknowledgementView />}
          {(currentTab === 'concerns' || currentTab === 'complaints') && <ConcernsView />}
          {currentTab === 'lunch-fee-management' && <LunchFeeManagementView />}
          {currentTab === 'parent-profile' && (
            <ParentProfileView onNavigateTab={(tab) => setCurrentTab(tab as any)} />
          )}
          {currentTab === 'parent-consent' && <ParentConsentView />}
          {currentTab === 'consent-management' && <AdminConsentManagementView />}

          {currentTab === 'clinic' && <ClinicManagementView />}
          {currentTab === 'discipline' && <DisciplineClubsView />}
          {currentTab === 'inventory' && <InventoryManagementView />}
          {currentTab === 'occurrence-records' && <OccurrenceBookView />}
          {currentTab === 'syllabus-coverage-plan' && <SyllabusCoveragePlanView onNavigateTab={tab=>setCurrentTab(tab as any)} />}
          {currentTab === 'curriculum-tracker' && <CoverageTrackingView onNavigateTab={tab=>setCurrentTab(tab as any)} />}
          {currentTab === 'scheme-of-work-builder' && (
            <SchemeOfWorkBuilderView onNavigateTab={(tab) => setCurrentTab(tab as any)} />
          )}
          </>}
          </Suspense>
        </main>

        {/* Global Portal Footer: Pure Maroon (#800000) & Vellox Tech Watermark */}
        <footer className="mt-auto py-3.5 px-6 bg-primary border-t border-primary-container text-center text-xs text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Live"></span>
            <span className="font-semibold text-white">
              {user?.schoolName || 'Grace Seeds School'} · School Management System
            </span>
            {currentContext?.currentTerm && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-rose-100 border border-white/15">
                <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                {currentContext.currentTerm.name} ({currentContext.currentTerm.status || 'Active'})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-rose-200">
            <span>Powered by</span>
            <span className="font-bold text-white tracking-wide">Vellox Tech</span>
            <span className="text-white/40">|</span>
            <span className="text-[11px] text-emerald-300 font-mono">System Online</span>
          </div>
        </footer>
      </div>

      {/* Global Interactive Operational Modals */}
      <OnboardTeacherModal
        isOpen={onboardTeacherModalOpen && !isGuardian}
        onClose={() => setOnboardTeacherModalOpen(false)}
        onTeacherCreated={handleTeacherCreated}
        existingTeachers={teachers}
      />

      <RecordPaymentModal
        isOpen={recordPaymentModalOpen && !isGuardian && loadedDataScope===dataScopeKey}
        onClose={() => {
          setRecordPaymentModalOpen(false);
          setSelectedStudentForPayment(undefined);
        }}
        students={loadedDataScope===dataScopeKey?students:[]}
        initialStudent={selectedStudentForPayment}
        onPaymentRecorded={handlePaymentRecorded}
        onArrearRecorded={refreshStudentsAndFees}
        onRefreshStudents={refreshStudentsAndFees}
      />

      <ForwardPaymentModal
        isOpen={forwardPaymentModalOpen}
        onClose={() => {
          setForwardPaymentModalOpen(false);
          setSelectedStudentForPayment(undefined);
        }}
        students={loadedDataScope===dataScopeKey?students:[]}
        initialStudent={selectedStudentForPayment}
        onSubmitted={handleForwardPaymentSuccess}
      />

      <CBCFormativeModal
        isOpen={CBCModalOpen}
        onClose={() => setCBCModalOpen(false)}
        students={loadedDataScope===dataScopeKey?students:[]}
        initialStudent={selectedStudentForCBC}
        onSave={handleSaveAssessment}
      />

      <AdmitLearnerModal
        isOpen={admitModalOpen}
        onClose={() => setAdmitModalOpen(false)}
        onAdmit={handleAdmitStudent}
        existingStudents={students}
      />

      <SendSmsModal
        isOpen={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        defaultTarget={smsTarget}
      />

      <ExportReportModal
        isOpen={exportReportModalOpen}
        onClose={() => setExportReportModalOpen(false)}
      />

      <UploadMarksModal
        isOpen={uploadMarksModalOpen}
        onClose={() => {
          setUploadMarksModalOpen(false);
          setUploadMarksInitialStudent(undefined);
        }}
        onMarksUploaded={(msg) => {
          setMarksRefreshTrigger((prev) => prev + 1);
          refreshStudentsAndFees();
          showToast(msg || 'Marks uploaded successfully', 'success');
        }}
        initialStudent={uploadMarksInitialStudent}
        initialAssessmentType={uploadMarksInitialType}
      />

      {toastNotification && (
        <div className="fixed top-5 right-5 z-[9999] max-w-md bg-white border border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">check_circle</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black text-slate-900 uppercase tracking-wider">Marks Notification</div>
            <div className="text-xs font-semibold text-emerald-800 break-words mt-0.5">
              {toastNotification.message}
            </div>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-surface-container-low transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <CreateLessonPlanModal
        isOpen={createLessonPlanModalOpen}
        onClose={() => setCreateLessonPlanModalOpen(false)}
        onPlanCreated={() => {}}
      />

      <CreateSchemeModal
        isOpen={createSchemeModalOpen}
        onClose={() => setCreateSchemeModalOpen(false)}
        onSchemeCreated={() => {}}
      />

      <AcademicTermsModal
        isOpen={academicTermsModalOpen}
        onClose={() => setAcademicTermsModalOpen(false)}
        academicContext={currentContext}
        onTermUpdated={() => {
          // Re-sync academic context from backend
          apiService.getCurrentContext().then((res) => {
            if (res.success && res.data) {
              setCurrentContext(res.data);
              if (res.data.currentTerm?.name) {
                setCurrentTerm(res.data.currentTerm.name);
              }
            }
          });
        }}
        canManageTerms={
          user?.role === UserRole.SUPER_ADMIN ||
          user?.role === UserRole.ADMIN ||
          user?.role === UserRole.SCHOOL_ADMIN ||
          user?.role === UserRole.HEAD_TEACHER
        }
        userRole={user?.role}
      />

      
      <BiometricDevicesModal
        isOpen={biometricModalOpen}
        onClose={() => setBiometricModalOpen(false)}
      />

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        isForced={false}
        onClose={() => setChangePasswordModalOpen(false)}
        onSuccessCallback={() => {
          setChangePasswordModalOpen(false);
        }}
      />

      {/* Global Regulatory & Legal Compliance Modals */}
      <CookieBanner onOpenPreferences={() => handleOpenLegalModal('cookies')} />
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}
