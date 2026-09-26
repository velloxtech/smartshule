import React, { useState, useEffect, useCallback } from 'react';
import { TabType, Student, Teacher, SystemActivity, AssessmentRecord, FeeTransaction, UserRole } from './types';
import { apiService } from './services/api';
import { useAuth } from './context/AuthContext';
import { isTabPermitted } from './utils/rbac';

// Public & Auth Views
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';
import { SuperAdminDashboardView } from './components/views/SuperAdminDashboardView';
import { HeadTeacherDashboardView } from './components/views/HeadTeacherDashboardView';
import { DeputyDashboardView } from './components/views/DeputyDashboardView';
import { AdmissionsDashboardView } from './components/views/AdmissionsDashboardView';
import { BursarDashboardView } from './components/views/BursarDashboardView';
import { TeacherDashboardView } from './components/views/TeacherDashboardView';
import { ParentDashboardView } from './components/views/ParentDashboardView';
import { StudentsView } from './components/views/StudentsView';
import { TeachersView } from './components/views/TeachersView';
import { ClassesView } from './components/views/ClassesView';
import { LearningAreasView } from './components/views/LearningAreasView';
import { AssessmentsView } from './components/views/AssessmentsView';
import { StrandsView } from './components/views/StrandsView';
import { ReportCardsView } from './components/views/ReportCardsView';
import { CompetencyAnalyticsView } from './components/views/CompetencyAnalyticsView';
import { SchemesView } from './components/views/SchemesView';
import { TimetableView } from './components/views/TimetableView';
import { AttendanceRegisterView } from './components/views/AttendanceRegisterView';
import { FeeStructureView } from './components/views/FeeStructureView';
import { InvoicesMpesaView } from './components/views/InvoicesMpesaView';
import { DefaultersView } from './components/views/DefaultersView';
import { CashFlowLedgerView } from './components/views/CashFlowLedgerView';
import { ExpensesView } from './components/views/ExpensesView';
import { CapitationIncomeView } from './components/views/CapitationIncomeView';
import { FinancialReportsView } from './components/views/FinancialReportsView';
import { EDiaryView } from './components/views/EDiaryView';
import { VisualCBCView } from './components/views/VisualCBCView';
import { WhatsAppBotView } from './components/views/WhatsAppBotView';
import { UserManagementView } from './components/views/UserManagementView';
import RecordsOfWorkView from './components/views/RecordsOfWorkView';
import { SystemLogsView } from './components/views/SystemLogsView';

// Modals
import { MpesaStkModal } from './components/modals/MpesaStkModal';
import { KcbBuniPaymentModal } from './components/modals/KcbBuniPaymentModal';
import { CBCFormativeModal } from './components/modals/CBCFormativeModal';
import { AdmitLearnerModal } from './components/modals/AdmitLearnerModal';
import { SendSmsModal } from './components/modals/SendSmsModal';
import { KnecSyncModal } from './components/modals/KnecSyncModal';
import { ExportReportModal } from './components/modals/ExportReportModal';
import { OnboardTeacherModal } from './components/modals/OnboardTeacherModal';
import { UploadMarksModal } from './components/modals/UploadMarksModal';
import { CreateLessonPlanModal } from './components/modals/CreateLessonPlanModal';
import { CreateSchemeModal } from './components/modals/CreateSchemeModal';
import { AcademicTermsModal } from './components/modals/AcademicTermsModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';

export default function App() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [appView, setAppView] = useState<'landing' | 'login' | 'portal'>('landing');
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState('Term 3 - 2026');
  const [academicTermsModalOpen, setAcademicTermsModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);


  // Core Dynamic Data (Live from backend or user actions - initialized empty)
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [totalCollectedFee, setTotalCollectedFee] = useState(0);

  // Modal Visibility States
  const [onboardTeacherModalOpen, setOnboardTeacherModalOpen] = useState(false);
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);
  const [selectedStudentForMpesa, setSelectedStudentForMpesa] = useState<Student | undefined>(undefined);
  const [kcbBuniModalOpen, setKcbBuniModalOpen] = useState(false);
  const [selectedStudentForKcbBuni, setSelectedStudentForKcbBuni] = useState<Student | undefined>(undefined);

  const [cbcModalOpen, setCbcModalOpen] = useState(false);
  const [selectedStudentForCbc, setSelectedStudentForCbc] = useState<Student | undefined>(undefined);

  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsTarget, setSmsTarget] = useState<'absentee' | 'fee' | 'all'>('all');

  const [knecSyncModalOpen, setKnecSyncModalOpen] = useState(false);
  const [exportReportModalOpen, setExportReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | undefined>(undefined);
  const [uploadMarksModalOpen, setUploadMarksModalOpen] = useState(false);
  const [uploadMarksInitialStudent, setUploadMarksInitialStudent] = useState<Student | undefined>(undefined);
  const [createLessonPlanModalOpen, setCreateLessonPlanModalOpen] = useState(false);
  const [createSchemeModalOpen, setCreateSchemeModalOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  // Synchronize view state with authentication status
  useEffect(() => {
    if (isAuthenticated) {
      setAppView('portal');
    }
  }, [isAuthenticated]);

  // Role-Based Tab Guard: if active tab is forbidden for this role, bounce to dashboard
  useEffect(() => {
    if (user && !isTabPermitted(currentTab, user.role)) {
      setCurrentTab('dashboard');
    }
  }, [user, currentTab]);

  // Refresh students and attached fee balances
  const refreshStudentsAndFees = useCallback(async () => {
    try {
      const [studentData, defaultersRes, invoicesRes] = await Promise.all([
        apiService.getStudents().catch(() => null),
        apiService.getDefaulters().catch(() => null),
        apiService.getInvoices().catch(() => null),
      ]);

      const feeMap = new Map<string, { balance: number; billed: number }>();

      if (invoicesRes?.data && Array.isArray(invoicesRes.data)) {
        invoicesRes.data.forEach((inv: any) => {
          feeMap.set(inv.studentId, { balance: inv.balance ?? 0, billed: inv.amountPayable ?? 0 });
        });
      }

      if (defaultersRes?.data?.defaulters && Array.isArray(defaultersRes.data.defaulters)) {
        defaultersRes.data.defaulters.forEach((d: any) => {
          if (!feeMap.has(d.studentId) || (feeMap.get(d.studentId)?.balance === 0 && d.balance > 0)) {
            feeMap.set(d.studentId, { balance: d.balance || 0, billed: d.amountPayable || 0 });
          }
        });
      }

      if (studentData?.data && Array.isArray(studentData.data)) {
        const mappedStudents: Student[] = studentData.data.map((st: any) => {
          const fee = feeMap.get(st.id) || { balance: 0, billed: 0 };
          const fullName =
            st.name ||
            st.fullName ||
            `${st.firstName || ''} ${st.lastName || ''}`.trim() ||
            'Learner';
          return {
            id: st.id,
            admNo: st.admissionNumber || st.admNo || 'N/A',
            upi: st.upiNumber || st.upi || '--',
            nemis: st.upiNumber || st.nemis || '--',
            name: fullName,
            gender: st.gender === 'FEMALE' || st.gender === 'Girl' ? 'Girl' : 'Boy',
            grade: st.grade || (st.gradeLevel ? st.gradeLevel.replace(/_/g, ' ') : 'Grade --'),
            stream: st.stream?.name || st.streamName || (st.streamId ? `Stream ${st.streamId.slice(0, 6)}` : ''),
            guardianName:
              st.guardian && (st.guardian.firstName || st.guardian.lastName)
                ? `${st.guardian.firstName || ''} ${st.guardian.lastName || ''}`.trim()
                : (st.guardianName || st.emergencyContactName || '--'),
            guardianPhone: st.guardian?.phone || st.guardianPhone || st.emergencyContactPhone || '--',
            feeBalance: fee.balance,
            totalFee: fee.billed,
            attendanceRate: st.attendanceRate ?? 0,
            cbcRating: st.cbcRating || '--',
            status: st.status === 'ACTIVE' || st.status === 'Active' ? 'Active' : (st.status || 'Active'),
            profilePhotoUrl: st.profilePhotoUrl,
            dateOfBirth: st.dateOfBirth,
            medicalConditions: st.medicalConditions,
            specialNeeds: st.specialNeeds,
          };
        });
        setStudents(mappedStudents);
      } else {
        setStudents([]);
      }
    } catch {
      setStudents([]);
    }
  }, []);

  // Sync with Backend API on Mount & Auth State Changes
  useEffect(() => {
    async function syncBackend() {
      const isUp = await apiService.checkHealth();
      setBackendConnected(isUp);
      if (isUp && isAuthenticated) {
        const isFinanceOnly = user?.role === UserRole.BURSAR || user?.role === UserRole.ACCOUNTANT;
        const isParentOnly = user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN;

        try {
          const [ctxRes, schRes] = await Promise.all([
            apiService.getCurrentContext().catch(() => null),
            apiService.getSchool().catch(() => null),
          ]);
          if (ctxRes?.data) {
            setCurrentContext(ctxRes.data);
            if (ctxRes.data.currentTerm?.name) {
              setCurrentTerm(ctxRes.data.currentTerm.name);
            }
          }
          if (schRes?.data) setSchool(schRes.data);

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
                  attendanceRate: c.attendance?.attendanceRate ?? 100,
                  guardianName: portalRes.data.guardian?.user ? `${portalRes.data.guardian.user.firstName} ${portalRes.data.guardian.user.lastName}` : (user?.name || 'Parent'),
                  guardianPhone: user?.phone || '+254777000777',
                  medicalConditions: c.medicalConditions || 'None',
                  emergencyContact: portalRes.data.guardian?.emergencyContact || user?.phone || '+254777000777',
                  streamId: c.streamId,
                  classroomId: c.classroomId,
                  academicYearId: c.academicYearId,
                }));
                setStudents(mappedChildren);
              } else {
                setStudents([]);
              }
            } catch {
              setStudents([]);
            }
          } else if (!isFinanceOnly) {
            await refreshStudentsAndFees();
          }
        } catch {
          setStudents([]);
        }

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
                assignedClass: t.assignedClassStreamIds?.length ? t.assignedClassStreamIds.join(', ') : 'Unassigned',
                phone: t.user?.phone || '--',
                email: t.user?.email || '--',
                learningAreas: t.specialization || ['CBC Core'],
                status: t.status || 'Active',
                clockInTime: t.clockInTime || '--',
              }));
              setTeachers(mappedTeachers);
            } else {
              setTeachers([]);
            }
          } catch {
            setTeachers([]);
          }

          try {
            const formativesRes = await apiService.listFormatives().catch(() => null);
            if (formativesRes?.data && Array.isArray(formativesRes.data)) {
              const mappedAssessments: AssessmentRecord[] = formativesRes.data.map((f: any) => ({
                id: f.id,
                studentId: f.studentId,
                studentName: f.studentName || 'Learner',
                admNo: f.admissionNumber || '',
                grade: f.gradeLevel ? f.gradeLevel.replace('_', ' ') : 'Grade 7',
                learningArea: f.learningAreaId || 'CBC Learning Area',
                strand: f.strandId || f.subStrandId || 'Strand',
                subStrand: f.specificOutcomeTested || 'Sub-strand',
                rating: f.performanceLevel as any,
                evidence: f.evidenceNotes || f.teacherRemarks || 'Formative observation',
                recordedBy: 'CBC Educator',
                date: f.assessmentDate,
                targetedCompetencies: f.targetedCompetencies,
                valuesObserved: f.valuesObserved,
              }));
              setAssessments(mappedAssessments);
            } else {
              setAssessments([]);
            }
          } catch {
            setAssessments([]);
          }
        }
        try {
          const [analyticsData, paymentsRes] = await Promise.all([
            apiService.getDashboardAnalytics().catch(() => null),
            apiService.getPayments().catch(() => null),
          ]);
          if (analyticsData?.data?.finance?.totalCollected) {
            setTotalCollectedFee(analyticsData.data.finance.totalCollected);
          }
          if (paymentsRes?.data && Array.isArray(paymentsRes.data) && paymentsRes.data.length > 0) {
            const mappedTxs: FeeTransaction[] = paymentsRes.data.map((p: any) => ({
              id: p.id,
              ref: p.receiptNumber || p.transactionReference || p.id,
              studentName: p.studentName || 'Learner',
              admNo: p.admissionNumber || '',
              grade: p.gradeLevel ? p.gradeLevel.replace('_', ' ') : '',
              amount: p.amount,
              channel: p.paymentMethod === 'MPESA' ? 'M-Pesa Express' : (p.paymentMethod || 'Bank Wire'),
              date: p.paymentDate || 'Today',
              status: p.status === 'COMPLETED' ? 'Settled' : p.status,
            }));
            setTransactions(mappedTxs);
          }
        } catch {
          // Keep default 0
        }
      }
    }
    syncBackend();
  }, [isAuthenticated]);

  // Quick Action / Deep Link Triggers
  const handleOpenMpesa = (student?: Student) => {
    setSelectedStudentForMpesa(student || (students && students.length > 0 ? students[0] : undefined));
    setMpesaModalOpen(true);
  };

  const handleOpenKcbBuni = (student?: Student) => {
    setSelectedStudentForKcbBuni(student || (students && students.length > 0 ? students[0] : undefined));
    setKcbBuniModalOpen(true);
  };

  const handleOpenCbc = (student?: Student) => {
    setSelectedStudentForCbc(student || (students && students.length > 0 ? students[0] : undefined));
    setCbcModalOpen(true);
  };

  const handleOpenSms = (target: 'absentee' | 'fee' | 'all' = 'all') => {
    setSmsTarget(target);
    setSmsModalOpen(true);
  };

  const handleViewReportCard = (student: Student) => {
    setSelectedStudentForReport(student);
    setCurrentTab('report-cards');
  };

  // M-Pesa Payment Success Handler
  const handleMpesaSuccess = (phone: string, amount: number, studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const newTx: FeeTransaction = {
      id: `tx-${Date.now()}`,
      ref: `SLK${Math.floor(10000000 + Math.random() * 90000000)}`,
      studentName: student?.name || 'Enrolled Learner',
      admNo: student?.admNo || '--',
      grade: student?.grade || '--',
      amount,
      channel: 'M-Pesa Express',
      phone,
      timestamp: 'Just now',
      status: 'Completed',
    };

    setTransactions([newTx, ...transactions]);
    setTotalCollectedFee((prev) => prev + amount);

    // Update student fee balance
    if (student) {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? { ...s, feeBalance: Math.max(0, s.feeBalance - amount) }
            : s
        )
      );
    }

    // Trigger Backend M-Pesa STK Push Endpoint
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0')
      ? `254${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('254')
      ? cleanPhone
      : `254${cleanPhone}`;
    if (studentId) {
      apiService.getInvoices({ studentId }).then((invRes) => {
        const invId = invRes.data?.[0]?.id || studentId;
        return apiService.initiateMpesaStkPush(invId, formattedPhone);
      }).catch(() => {});
    }

    // Add activity
    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'mpesa',
      icon: 'payments',
      title: `M-Pesa STK Inflow: KES ${amount.toLocaleString()}`,
      description: `${student?.name || 'Learner'} (Adm #${student?.admNo || ''}) · Paid via ${phone}`,
      timestamp: 'Just now',
      ref: newTx.ref,
      badgeColor: 'bg-secondary text-white',
    };
    setActivities([newAct, ...activities]);
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
          ? { ...s, cbcRating: assessment.rating }
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
    const studentWithId: Student = {
      ...newStudent,
      id: newStudent.id || `std-${Date.now()}`,
    };

    setStudents((prev) => [
      studentWithId,
      ...prev.filter((s) => s.id !== studentWithId.id && s.admNo !== studentWithId.admNo)
    ]);

    // If for any reason it wasn't registered yet, register it
    if (!newStudent.id || newStudent.id.startsWith('std-')) {
      try {
        if (rawBackendData) {
          const res = await apiService.registerStudent(rawBackendData);
          if (res?.success && res.data) {
            setStudents((prev) =>
              prev.map((s) => (s.admNo === studentWithId.admNo ? { ...s, id: res.data.id } : s))
            );
          }
        }
      } catch (err) {
        console.error('Failed to register student on backend:', err);
      }
    }

    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'nemis',
      icon: 'person_add',
      title: `Learner Admitted: ${studentWithId.name}`,
      description: `Adm #${studentWithId.admNo} · ${studentWithId.grade}${studentWithId.stream ? ` (${studentWithId.stream})` : ''} · ${studentWithId.upi && studentWithId.upi !== '--' ? `UPI: ${studentWithId.upi}` : 'NEMIS: Pending'}`,
      timestamp: 'Just now',
      badgeColor: 'bg-tertiary-container text-white',
    };
    setActivities((prev) => [newAct, ...prev]);

    // Refresh state to ensure fee ledgers and student directories are completely up to date
    refreshStudentsAndFees();
  };

  // Onboard New Teacher / Staff Handler
  const handleTeacherCreated = (newTeacherData: any) => {
    const assigned =
      newTeacherData.assignedClassName ||
      (newTeacherData.assignedClassStreamIds?.length
        ? newTeacherData.assignedClassStreamIds.join(', ')
        : 'Unassigned');

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
    setTeachers((prev) => [newT, ...prev]);

    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'report',
      icon: 'person_add',
      title: `Staff Onboarded: ${newT.name}`,
      description: `Role: ${newT.role} · Emp #: ${newT.employeeNumber} · TSC: ${newT.tscNumber} · Class: ${newT.assignedClass}`,
      timestamp: 'Just now',
      badgeColor: 'bg-secondary text-white',
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

  // Guard unpermitted tab access
  useEffect(() => {
    if (user && currentTab !== 'dashboard' && !isTabPermitted(currentTab, user.role)) {
      setCurrentTab('dashboard');
    }
  }, [user, currentTab]);

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
      <LandingPage
        onNavigateLogin={() => setAppView('login')}
        isAuthenticated={isAuthenticated}
        onNavigatePortal={() => setAppView('portal')}
      />
    );
  }

  // Render Single Dedicated Login Page
  if (appView === 'login') {
    return (
      <LoginPage
        onSuccess={() => setAppView('portal')}
        onNavigateLanding={() => setAppView('landing')}
      />
    );
  }

  // Fallback: If not authenticated, ensure landing view
  if (!isAuthenticated && !isLoading) {
    return (
      <LandingPage
        onNavigateLogin={() => setAppView('login')}
        isAuthenticated={false}
        onNavigatePortal={() => setAppView('portal')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased text-on-surface">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setMobileSidebarOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNavigateLanding={() => setAppView('landing')}
      />

      {/* Main Content Viewport (offset by sidebar width on desktop) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Operational Header: Pure Maroon (#800000) */}
        <Header
          onToggleMobile={() => setMobileSidebarOpen(true)}
          currentTerm={currentTerm}
          onChangeTerm={setCurrentTerm}
          students={students}
          teachers={teachers}
          backendConnected={backendConnected}
          onNavigateLanding={() => setAppView('landing')}
          onOpenAcademicTermsModal={() => setAcademicTermsModalOpen(true)}
          onOpenChangePasswordModal={() => setChangePasswordModalOpen(true)}
          academicContext={currentContext}
          onSelectStudent={(student) => {
            handleViewReportCard(student);
          }}
          onOpenQuickAction={(action) => {
            if (action === 'mpesa') handleOpenMpesa();
            if (action === 'cbc') handleOpenCbc();
            if (action === 'admit') setAdmitModalOpen(true);
            if (action === 'sms') handleOpenSms('all');
          }}
        />

        {/* Term Lifecycle Notice Banner */}
        {currentContext?.termNotice && (
          <div
            className={`px-4 sm:px-6 lg:px-8 py-2 text-xs flex items-center justify-between shadow-xs ${
              currentContext.termNotice.type === 'TERM_ENDED'
                ? 'bg-[#550000] text-rose-100 border-b border-[#770000]'
                : currentContext.termNotice.type === 'ENDING_SOON'
                ? 'bg-[#660000] text-amber-100 border-b border-[#880000]'
                : 'bg-[#770000] text-white/90 border-b border-[#990000]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {currentContext.termNotice.type === 'TERM_ENDED'
                  ? 'event_busy'
                  : currentContext.termNotice.type === 'ENDING_SOON'
                  ? 'hourglass_top'
                  : 'date_range'}
              </span>
              <span className="font-semibold">{currentContext.termNotice.message}</span>
            </div>
            {(user?.role === UserRole.SUPER_ADMIN ||
              user?.role === UserRole.ADMIN ||
              user?.role === UserRole.SCHOOL_ADMIN ||
              user?.role === UserRole.HEAD_TEACHER) && (
              <button
                onClick={() => setAcademicTermsModalOpen(true)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors cursor-pointer text-[11px] shrink-0 border border-white/20"
              >
                {currentContext.termNotice.type === 'TERM_ENDED'
                  ? 'Transition Term'
                  : 'Term Schedule'}
              </button>
            )}
          </div>
        )}

        {/* Dynamic Route Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            (() => {
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
                      students={students}
                      teachers={teachers}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                      onOpenKnecSync={() => setKnecSyncModalOpen(true)}
                      onOpenExportReport={() => setExportReportModalOpen(true)}
                    />
                  );
                case UserRole.DEPUTY_HEAD_TEACHER:
                  return (
                    <DeputyDashboardView
                      teachers={teachers}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                    />
                  );
                case UserRole.ADMISSIONS:
                  return (
                    <AdmissionsDashboardView
                      students={students}
                      teachers={teachers}
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
                        setUploadMarksInitialStudent(student);
                        setUploadMarksModalOpen(true);
                      }}
                      onOpenNewLessonPlan={() => setCreateLessonPlanModalOpen(true)}
                      onOpenNewScheme={() => setCreateSchemeModalOpen(true)}
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
                      students={students}
                      teachers={teachers}
                      activities={activities}
                      totalCollectedFee={totalCollectedFee}
                      onOpenMpesa={() => handleOpenMpesa()}
                      onOpenCBCModal={() => handleOpenCbc()}
                      onOpenAdmitModal={() => setAdmitModalOpen(true)}
                      onOpenSmsModal={handleOpenSms}
                      onOpenKnecSync={() => setKnecSyncModalOpen(true)}
                      onOpenExportReport={() => setExportReportModalOpen(true)}
                      onNavigateTab={(tab) => setCurrentTab(tab)}
                    />
                  );
              }
            })()
          )}

          {currentTab === 'students-guardians' && (
            user?.role === UserRole.BURSAR || user?.role === UserRole.ACCOUNTANT ? (
              <div className="p-8 my-8 text-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-3 max-w-lg mx-auto">
                <span className="material-symbols-outlined text-[48px] text-amber-700">account_balance_wallet</span>
                <h3 className="text-base font-bold">Finance Department Access Isolation</h3>
                <p className="text-xs text-amber-800">
                  The finance department is strictly isolated to fee structures, invoices, cash flow ledgers, and expenses.
                </p>
                <button
                  onClick={() => setCurrentTab('cashflow-ledger')}
                  className="px-4 py-2 rounded-xl bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 transition-colors cursor-pointer"
                >
                  Go to Cash Flow Ledger
                </button>
              </div>
            ) : (
              <StudentsView
                students={students}
                onOpenMpesaWithStudent={handleOpenMpesa}
                onOpenCBCWithStudent={handleOpenCbc}
                onOpenAdmitModal={() => setAdmitModalOpen(true)}
                onViewReportCard={handleViewReportCard}
                onRefreshStudents={refreshStudentsAndFees}
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

          {currentTab === 'teachers-staff' && (
            <TeachersView
              teachers={teachers}
              onToggleClockIn={handleToggleClockIn}
              onOpenOnboardTeacher={
                user?.role && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN, UserRole.HEAD_TEACHER, UserRole.ADMISSIONS].includes(user.role)
                  ? () => setOnboardTeacherModalOpen(true)
                  : undefined
              }
              onDeleteTeacher={(deletedId) =>
                setTeachers((prev) => prev.filter((t) => t.id !== deletedId))
              }
              onAssignTeacher={(teacherId, assignedLabel) =>
                setTeachers((prev) =>
                  prev.map((t) => (t.id === teacherId ? { ...t, assignedClass: assignedLabel } : t))
                )
              }
            />
          )}

          {currentTab === 'classes-streams' && <ClassesView />}

          {currentTab === 'learning-areas' && <LearningAreasView />}

          {currentTab === 'assessments' && (
            <AssessmentsView
              assessments={assessments}
              onOpenNewAssessment={() => handleOpenCbc()}
              onDeleteAssessment={(deletedId) =>
                setAssessments((prev) => prev.filter((a) => a.id !== deletedId))
              }
            />
          )}

          {currentTab === 'competencies-strands' && <StrandsView />}

          {currentTab === 'report-cards' && (
            <ReportCardsView
              students={students}
              selectedStudent={selectedStudentForReport}
            />
          )}

          {currentTab === 'cbc-analytics' && <CompetencyAnalyticsView />}

          {currentTab === 'schemes-lesson-plans' && <SchemesView />}

          {currentTab === 'records-of-work' && <RecordsOfWorkView />}

          {currentTab === 'timetable' && <TimetableView />}

          {currentTab === 'attendance-register' && (
            <AttendanceRegisterView onOpenSmsModal={handleOpenSms} />
          )}

          {currentTab === 'fee-structure' && <FeeStructureView />}

          {currentTab === 'invoices-mpesa' && (
            <InvoicesMpesaView
              transactions={transactions}
              totalCollected={totalCollectedFee}
              students={students}
              onOpenMpesaModal={() => handleOpenMpesa()}
            />
          )}

          {currentTab === 'defaulters-receipts' && (
            <DefaultersView
              students={students}
              onOpenMpesaWithStudent={handleOpenMpesa}
              onOpenSmsModal={handleOpenSms}
            />
          )}

          {currentTab === 'cashflow-ledger' && <CashFlowLedgerView />}
          {currentTab === 'expenses-management' && <ExpensesView />}
          {currentTab === 'capitation-income' && <CapitationIncomeView />}
          {currentTab === 'financial-reports' && <FinancialReportsView />}

          {currentTab === 'ediary' && <EDiaryView />}

          {currentTab === 'visual-cbc' && <VisualCBCView />}

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
            <UserManagementView onNavigateTab={(tab) => setCurrentTab(tab as any)} />
          )}

          {currentTab === 'system-logs' && <SystemLogsView />}
        </main>

        {/* Global Portal Footer: Pure Maroon (#800000) & Vellox Tech Watermark */}
        <footer className="mt-auto py-3.5 px-6 bg-[#800000] border-t border-[#660000] text-center text-xs text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
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
        isOpen={onboardTeacherModalOpen}
        onClose={() => setOnboardTeacherModalOpen(false)}
        onTeacherCreated={handleTeacherCreated}
        existingTeachers={teachers}
      />

      <KcbBuniPaymentModal
        isOpen={kcbBuniModalOpen}
        onClose={() => setKcbBuniModalOpen(false)}
        students={students}
        initialStudent={selectedStudentForKcbBuni}
        onPaymentSuccess={(tx) => {
          const newTx: FeeTransaction = {
            id: `tx-${Date.now()}`,
            ref: tx.reference || tx.receiptNumber,
            studentName: tx.studentName,
            admNo: tx.admNo,
            grade: 'Grade Level',
            amount: tx.amount,
            channel: tx.channel || 'KCB Buni Paybill 522123',
            phone: '+254700000000',
            timestamp: 'Just now',
            status: 'Completed',
          };
          setTransactions((prev) => [newTx, ...prev]);
          setTotalCollectedFee((prev) => prev + tx.amount);
          setKcbBuniModalOpen(false);
        }}
      />

      <MpesaStkModal
        isOpen={mpesaModalOpen}
        onClose={() => setMpesaModalOpen(false)}
        students={students}
        initialStudent={selectedStudentForMpesa}
        onSuccess={handleMpesaSuccess}
      />

      <CBCFormativeModal
        isOpen={cbcModalOpen}
        onClose={() => setCbcModalOpen(false)}
        students={students}
        initialStudent={selectedStudentForCbc}
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

      <KnecSyncModal
        isOpen={knecSyncModalOpen}
        onClose={() => setKnecSyncModalOpen(false)}
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
        onMarksUploaded={() => {}}
        initialStudent={uploadMarksInitialStudent}
      />

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
      />

      <ChangePasswordModal
        isOpen={changePasswordModalOpen || Boolean(user?.mustChangePassword)}
        isForced={Boolean(user?.mustChangePassword)}
        onClose={() => {
          if (!user?.mustChangePassword) {
            setChangePasswordModalOpen(false);
          }
        }}
        onSuccessCallback={() => {
          setChangePasswordModalOpen(false);
        }}
      />
    </div>
  );
}