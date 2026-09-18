import React, { useState, useEffect } from 'react';
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

// Modals
import { MpesaStkModal } from './components/modals/MpesaStkModal';
import { PaystackCheckoutModal } from './components/modals/PaystackCheckoutModal';
import { CBCFormativeModal } from './components/modals/CBCFormativeModal';
import { AdmitLearnerModal } from './components/modals/AdmitLearnerModal';
import { SendSmsModal } from './components/modals/SendSmsModal';
import { KnecSyncModal } from './components/modals/KnecSyncModal';
import { ExportReportModal } from './components/modals/ExportReportModal';
import { OnboardTeacherModal } from './components/modals/OnboardTeacherModal';
import { OnboardSchoolModal } from './components/modals/OnboardSchoolModal';
import { UploadMarksModal } from './components/modals/UploadMarksModal';
import { CreateLessonPlanModal } from './components/modals/CreateLessonPlanModal';
import { CreateSchemeModal } from './components/modals/CreateSchemeModal';

export default function App() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [appView, setAppView] = useState<'landing' | 'login' | 'portal'>('landing');
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState('Term 3 - 2026');

  // Core Dynamic Data (Live from backend or user actions - initialized empty)
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activities, setActivities] = useState<SystemActivity[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [totalCollectedFee, setTotalCollectedFee] = useState(0);

  // Modal Visibility States
  const [onboardTeacherModalOpen, setOnboardTeacherModalOpen] = useState(false);
  const [onboardSchoolModalOpen, setOnboardSchoolModalOpen] = useState(false);
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);
  const [selectedStudentForMpesa, setSelectedStudentForMpesa] = useState<Student | undefined>(undefined);
  const [paystackModalOpen, setPaystackModalOpen] = useState(false);
  const [selectedStudentForPaystack, setSelectedStudentForPaystack] = useState<Student | undefined>(undefined);

  const [cbcModalOpen, setCbcModalOpen] = useState(false);
  const [selectedStudentForCbc, setSelectedStudentForCbc] = useState<Student | undefined>(undefined);

  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsTarget, setSmsTarget] = useState<'absentee' | 'fee' | 'all'>('all');

  const [knecSyncModalOpen, setKnecSyncModalOpen] = useState(false);
  const [exportReportModalOpen, setExportReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | undefined>(undefined);
  const [uploadMarksModalOpen, setUploadMarksModalOpen] = useState(false);
  const [createLessonPlanModalOpen, setCreateLessonPlanModalOpen] = useState(false);
  const [createSchemeModalOpen, setCreateSchemeModalOpen] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

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

  // Sync with Backend API on Mount & Auth State Changes
  useEffect(() => {
    async function syncBackend() {
      const isUp = await apiService.checkHealth();
      setBackendConnected(isUp);
      if (isUp && isAuthenticated) {
        try {
          const [studentData, defaultersRes] = await Promise.all([
            apiService.getStudents().catch(() => null),
            apiService.getDefaulters().catch(() => null),
          ]);

          const feeMap = new Map<string, { balance: number; billed: number }>();
          if (defaultersRes?.data?.defaulters && Array.isArray(defaultersRes.data.defaulters)) {
            defaultersRes.data.defaulters.forEach((d: any) => {
              feeMap.set(d.studentId, { balance: d.balance || 0, billed: d.amountPayable || 0 });
            });
          }

          if (studentData?.data && Array.isArray(studentData.data)) {
            const mappedStudents: Student[] = studentData.data.map((st: any) => {
              const fee = feeMap.get(st.id) || { balance: 0, billed: 0 };
              return {
                id: st.id,
                admNo: st.admissionNumber,
                upi: st.upiNumber || 'NEMIS-PENDING',
                nemis: st.upiNumber || 'NEMIS-PENDING',
                name: `${st.firstName} ${st.lastName}`,
                gender: st.gender === 'FEMALE' ? 'Girl' : 'Boy',
                grade: st.gradeLevel ? st.gradeLevel.replace('_', ' ') : 'PP1',
                stream: st.streamId ? st.streamId.replace(/^stream-[^-]+-/, '').toUpperCase() : '',
                guardianName: st.guardian ? `${st.guardian.firstName} ${st.guardian.lastName}` : 'Guardian',
                guardianPhone: st.guardian?.phone || '+254700000000',
                feeBalance: fee.balance,
                totalFee: fee.billed,
                attendanceRate: 98,
                cbcRating: 'ME',
                status: st.status === 'ACTIVE' ? 'Active' : st.status,
              };
            });
            setStudents(mappedStudents);
          } else {
            setStudents([]);
          }
        } catch {
          setStudents([]);
        }
        try {
          const teacherData = await apiService.getTeachers();
          if (teacherData?.data && Array.isArray(teacherData.data)) {
            const mappedTeachers: Teacher[] = teacherData.data.map((t: any) => ({
              id: t.id,
              name: t.user ? `${t.user.firstName} ${t.user.lastName}` : `Teacher ${t.tscNumber || ''}`,
              role: 'Subject Teacher',
              tscNumber: t.tscNumber || 'TSC-PENDING',
              assignedClass: t.assignedClassStreamIds?.length ? t.assignedClassStreamIds.join(', ') : 'Unassigned',
              phone: t.user?.phone || '+254700000000',
              email: t.user?.email || 'teacher@smartshule.ac.ke',
              learningAreas: t.specialization || ['CBC Core'],
              status: 'Clocked In',
              clockInTime: '07:45 AM',
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

  const handleOpenPaystack = (student?: Student) => {
    setSelectedStudentForPaystack(student || (students && students.length > 0 ? students[0] : undefined));
    setPaystackModalOpen(true);
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
    apiService.initiateMpesaStkPush('inv-2026-001', formattedPhone).catch(() => {});

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
    apiService
      .recordFormativeAssessment({
        studentId: assessment.studentId,
        teacherId: 'teacher-001',
        learningAreaId: 'la-sci-001',
        subStrandId: 'sub-strand-001',
        termId: 'term-2026-1',
        academicYearId: 'year-2026',
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
  const handleAdmitStudent = (newStudent: Omit<Student, 'id'>, rawBackendData?: any) => {
    const created: Student = {
      ...newStudent,
      id: `std-${Date.now()}`,
    };
    setStudents((prev) => [created, ...prev]);

    // Save to Backend API
    if (rawBackendData) {
      apiService.registerStudent(rawBackendData).catch(() => {});
    } else {
      const parts = (newStudent.name || 'Learner Student').split(' ');
      const first = parts[0] || 'Learner';
      const last = parts.slice(1).join(' ') || 'Student';
      apiService
        .registerStudent({
          admissionNumber: newStudent.admNo || `ADM-${Date.now()}`,
          upiNumber: newStudent.upi,
          firstName: first,
          lastName: last,
          dateOfBirth: '2014-01-01',
          gender: 'MALE',
          gradeLevel: 'GRADE_7',
          streamId: 'stream-g7-east',
          schoolId: 'school-001',
          academicYearId: 'year-2026',
        })
        .catch(() => {});
    }

    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'nemis',
      icon: 'person_add',
      title: `Learner Admitted: ${created.name}`,
      description: `Adm #${created.admNo} · ${created.grade} (${created.stream}) · UPI: ${created.upi}`,
      timestamp: 'Just now',
      badgeColor: 'bg-tertiary-container text-white',
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Onboard New Teacher Handler
  const handleTeacherCreated = (newTeacherData: any) => {
    const newT: Teacher = {
      id: newTeacherData.id || `tch-${Date.now()}`,
      name: newTeacherData.user
        ? `${newTeacherData.user.firstName} ${newTeacherData.user.lastName}`
        : `${newTeacherData.firstName || 'Teacher'} ${newTeacherData.lastName || 'Staff'}`,
      role: 'Subject Teacher',
      tscNumber: newTeacherData.tscNumber || 'TSC-NEW',
      assignedClass: 'Grade 7 East',
      phone: newTeacherData.user?.phone || '+254711000000',
      email: newTeacherData.user?.email || 'teacher@smartshule.ac.ke',
      learningAreas: newTeacherData.specialization || ['CBC Core'],
      status: 'Clocked In',
      clockInTime: '08:00 AM',
    };
    setTeachers((prev) => [newT, ...prev]);

    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'report',
      icon: 'person_add',
      title: `Teacher Onboarded: ${newT.name}`,
      description: `TSC #${newT.tscNumber} · Areas: ${newT.learningAreas.join(', ')}`,
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

  // Render Public Landing Page
  if (appView === 'landing') {
    return (
      <>
        <LandingPage
          onNavigateLogin={() => setAppView('login')}
          isAuthenticated={isAuthenticated}
          onNavigatePortal={() => setAppView('portal')}
          onOpenOnboardSchool={() => setOnboardSchoolModalOpen(true)}
        />
        <OnboardSchoolModal
          isOpen={onboardSchoolModalOpen}
          onClose={() => setOnboardSchoolModalOpen(false)}
          onSchoolOnboarded={(schoolData) => {
            const newAct: SystemActivity = {
              id: `act-${Date.now()}`,
              type: 'report',
              icon: 'account_balance',
              title: `School Configured: ${schoolData.name}`,
              description: `MoE #${schoolData.moeRegistrationNo || schoolData.code} · ${schoolData.county || 'Nairobi'} County`,
              timestamp: 'Just now',
              badgeColor: 'bg-emerald-600 text-white',
            };
            setActivities((prev) => [newAct, ...prev]);
          }}
        />
      </>
    );
  }

  // Render Single Dedicated Login Page
  if (appView === 'login') {
    return (
      <>
        <LoginPage
          onSuccess={() => setAppView('portal')}
          onNavigateLanding={() => setAppView('landing')}
          onOpenOnboardSchool={() => setOnboardSchoolModalOpen(true)}
        />
        <OnboardSchoolModal
          isOpen={onboardSchoolModalOpen}
          onClose={() => setOnboardSchoolModalOpen(false)}
          onSchoolOnboarded={(schoolData) => {
            const newAct: SystemActivity = {
              id: `act-${Date.now()}`,
              type: 'report',
              icon: 'account_balance',
              title: `School Configured: ${schoolData.name}`,
              description: `MoE #${schoolData.moeRegistrationNo || schoolData.code} · ${schoolData.county || 'Nairobi'} County`,
              timestamp: 'Just now',
              badgeColor: 'bg-emerald-600 text-white',
            };
            setActivities((prev) => [newAct, ...prev]);
          }}
        />
      </>
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
          onOpenOnboardSchool={() => setOnboardSchoolModalOpen(true)}
        />
        <OnboardSchoolModal
          isOpen={onboardSchoolModalOpen}
          onClose={() => setOnboardSchoolModalOpen(false)}
          onSchoolOnboarded={(schoolData) => {
            const newAct: SystemActivity = {
              id: `act-${Date.now()}`,
              type: 'report',
              icon: 'account_balance',
              title: `School Configured: ${schoolData.name}`,
              description: `MoE #${schoolData.moeRegistrationNo || schoolData.code} · ${schoolData.county || 'Nairobi'} County`,
              timestamp: 'Just now',
              badgeColor: 'bg-emerald-600 text-white',
            };
            setActivities((prev) => [newAct, ...prev]);
          }}
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
        {/* Top Operational Header */}
        <Header
          onToggleMobile={() => setMobileSidebarOpen(true)}
          currentTerm={currentTerm}
          onChangeTerm={setCurrentTerm}
          students={students}
          teachers={teachers}
          backendConnected={backendConnected}
          onNavigateLanding={() => setAppView('landing')}
          onOpenOnboardSchool={() => setOnboardSchoolModalOpen(true)}
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

        {/* Dynamic Route Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            user?.role === UserRole.TEACHER ? (
              <TeacherDashboardView
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenUploadMarks={() => setUploadMarksModalOpen(true)}
                onOpenNewLessonPlan={() => setCreateLessonPlanModalOpen(true)}
                onOpenNewScheme={() => setCreateSchemeModalOpen(true)}
              />
            ) : user?.role === UserRole.GUARDIAN ? (
              <ParentDashboardView
                onOpenMpesaWithStudent={(student) => handleOpenPaystack(student)}
                onOpenPaystackWithStudent={(student) => handleOpenPaystack(student)}
                onViewReportCard={(student) => handleViewReportCard(student)}
                onNavigateTab={(tab) => setCurrentTab(tab as any)}
              />
            ) : (
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
            )
          )}

          {currentTab === 'students-guardians' && (
            <StudentsView
              students={students}
              onOpenMpesaWithStudent={handleOpenMpesa}
              onOpenCBCWithStudent={handleOpenCbc}
              onOpenAdmitModal={() => setAdmitModalOpen(true)}
              onViewReportCard={handleViewReportCard}
              onUpdateStudent={(updated) =>
                setStudents((prev) =>
                  prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
                )
              }
              onDeleteStudent={(deletedId) =>
                setStudents((prev) => prev.filter((s) => s.id !== deletedId))
              }
            />
          )}

          {currentTab === 'teachers-staff' && (
            <TeachersView
              teachers={teachers}
              onToggleClockIn={handleToggleClockIn}
              onOpenOnboardTeacher={() => setOnboardTeacherModalOpen(true)}
              onDeleteTeacher={(deletedId) =>
                setTeachers((prev) => prev.filter((t) => t.id !== deletedId))
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

          {currentTab === 'whatsapp-bot' && <WhatsAppBotView />}
        </main>

        {/* Global Portal Footer & Vellox Tech Watermark */}
        <footer className="mt-auto py-4 px-6 border-t border-outline-variant/20 text-center text-xs text-on-surface-variant flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-on-surface">
            {user?.schoolName || 'SmartShule CBC'} · School Management System
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span>Powered by</span>
            <span className="font-bold text-primary tracking-wide">Vellox Tech</span>
          </div>
        </footer>
      </div>

      {/* Global Interactive Operational Modals */}
      <OnboardSchoolModal
        isOpen={onboardSchoolModalOpen}
        onClose={() => setOnboardSchoolModalOpen(false)}
        onSchoolOnboarded={(schoolData) => {
          const newAct: SystemActivity = {
            id: `act-${Date.now()}`,
            type: 'report',
            icon: 'account_balance',
            title: `School Configured: ${schoolData.name}`,
            description: `MoE #${schoolData.moeRegistrationNo || schoolData.code} · ${schoolData.county || 'Nairobi'} County`,
            timestamp: 'Just now',
            badgeColor: 'bg-emerald-600 text-white',
          };
          setActivities((prev) => [newAct, ...prev]);
        }}
      />

      <OnboardTeacherModal
        isOpen={onboardTeacherModalOpen}
        onClose={() => setOnboardTeacherModalOpen(false)}
        onTeacherCreated={handleTeacherCreated}
      />

      <PaystackCheckoutModal
        isOpen={paystackModalOpen}
        onClose={() => setPaystackModalOpen(false)}
        students={students}
        initialStudent={selectedStudentForPaystack}
        onPaymentSuccess={(tx) => {
          const newTx: FeeTransaction = {
            id: `tx-${Date.now()}`,
            ref: tx.reference || tx.receiptNumber,
            studentName: tx.studentName,
            admNo: tx.admNo,
            grade: 'Grade Level',
            amount: tx.amount,
            channel: tx.channel || 'Paystack Bank',
            phone: '+254700000000',
            timestamp: 'Just now',
            status: 'Completed',
          };
          setTransactions((prev) => [newTx, ...prev]);
          setTotalCollectedFee((prev) => prev + tx.amount);
          setPaystackModalOpen(false);
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
        onClose={() => setUploadMarksModalOpen(false)}
        onMarksUploaded={() => {}}
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
    </div>
  );
}
