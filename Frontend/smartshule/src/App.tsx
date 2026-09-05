import React, { useState, useEffect } from 'react';
import { TabType, Student, Teacher, SystemActivity, AssessmentRecord, FeeTransaction } from './types';
import { apiService } from './services/api';
import {
  initialStudents,
  initialTeachers,
  initialSystemActivity,
  initialAssessments,
  initialTransactions,
} from './data/mockData';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';
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

// Modals
import { MpesaStkModal } from './components/modals/MpesaStkModal';
import { CBCFormativeModal } from './components/modals/CBCFormativeModal';
import { AdmitLearnerModal } from './components/modals/AdmitLearnerModal';
import { SendSmsModal } from './components/modals/SendSmsModal';
import { KnecSyncModal } from './components/modals/KnecSyncModal';
import { ExportReportModal } from './components/modals/ExportReportModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState('Term 1 - 2024');

  // Core Dynamic Data
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [activities, setActivities] = useState<SystemActivity[]>(initialSystemActivity);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(initialAssessments);
  const [transactions, setTransactions] = useState<FeeTransaction[]>(initialTransactions);
  const [totalCollectedFee, setTotalCollectedFee] = useState(8420000);

  // Modal Visibility States
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false);
  const [selectedStudentForMpesa, setSelectedStudentForMpesa] = useState<Student | undefined>(undefined);

  const [cbcModalOpen, setCbcModalOpen] = useState(false);
  const [selectedStudentForCbc, setSelectedStudentForCbc] = useState<Student | undefined>(undefined);

  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsTarget, setSmsTarget] = useState<'absentee' | 'fee' | 'all'>('all');

  const [knecSyncModalOpen, setKnecSyncModalOpen] = useState(false);
  const [exportReportModalOpen, setExportReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | undefined>(undefined);
  const [backendConnected, setBackendConnected] = useState(false);

  // Sync with Backend API on Mount
  useEffect(() => {
    async function syncBackend() {
      const isUp = await apiService.checkHealth();
      setBackendConnected(isUp);
      if (isUp) {
        try {
          const studentData = await apiService.getStudents();
          if (studentData?.students?.length) {
            setStudents(studentData.students);
          }
        } catch {
          // Fallback to local state
        }
      }
    }
    syncBackend();
  }, []);

  // Quick Action / Deep Link Triggers
  const handleOpenMpesa = (student?: Student) => {
    setSelectedStudentForMpesa(student || (students && students.length > 0 ? students[0] : undefined));
    setMpesaModalOpen(true);
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
      studentName: student?.name || 'Hillside Learner',
      admNo: student?.admNo || 'HA-2023-000',
      grade: student?.grade || 'Grade 1',
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
    apiService.initiateMpesaStkPush(phone, amount, studentId).catch(() => {});

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
    apiService.recordFormativeAssessment(assessment).catch(() => {});

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
  const handleAdmitStudent = (newStudent: Omit<Student, 'id'>) => {
    const created: Student = {
      ...newStudent,
      id: `std-${Date.now()}`,
    };
    setStudents([created, ...students]);

    // Save to Backend API
    apiService.registerStudent(created).catch(() => {});

    const newAct: SystemActivity = {
      id: `act-${Date.now()}`,
      type: 'nemis',
      icon: 'person_add',
      title: `Learner Admitted: ${created.name}`,
      description: `Adm #${created.admNo} · ${created.grade} (${created.stream}) · UPI: ${created.upi}`,
      timestamp: 'Just now',
      badgeColor: 'bg-tertiary-container text-white',
    };
    setActivities([newAct, ...activities]);
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
          )}

          {currentTab === 'students-guardians' && (
            <StudentsView
              students={students}
              onOpenMpesaWithStudent={handleOpenMpesa}
              onOpenCBCWithStudent={handleOpenCbc}
              onOpenAdmitModal={() => setAdmitModalOpen(true)}
              onViewReportCard={handleViewReportCard}
            />
          )}

          {currentTab === 'teachers-staff' && (
            <TeachersView teachers={teachers} onToggleClockIn={handleToggleClockIn} />
          )}

          {currentTab === 'classes-streams' && <ClassesView />}

          {currentTab === 'learning-areas' && <LearningAreasView />}

          {currentTab === 'assessments' && (
            <AssessmentsView
              assessments={assessments}
              onOpenNewAssessment={() => handleOpenCbc()}
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
        </main>
      </div>

      {/* Global Interactive Operational Modals */}
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
    </div>
  );
}
