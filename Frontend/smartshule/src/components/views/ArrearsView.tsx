import React, { useState, useEffect, useMemo } from 'react';
import { Student, UserRole, ArrearsSummaryData } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FeeStatementModal } from '../modals/FeeStatementModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';

interface ArrearsViewProps {
  students: Student[];
  onRefreshStudents?: () => void | Promise<void>;
  onOpenMpesaWithStudent?: (student: Student) => void;
  onOpenSmsModal?: (target?: 'absentee' | 'fee' | 'all') => void;
}

export const ArrearsView: React.FC<ArrearsViewProps> = ({
  students = [],
  onRefreshStudents,
  onOpenMpesaWithStudent,
  onOpenSmsModal,
}) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'directory' | 'batch_grid'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedStream, setSelectedStream] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Has_Arrears' | 'Cleared' | 'High_Arrears' | 'Sponsored'>('All');
  const [sortBy, setSortBy] = useState<'arrears_desc' | 'arrears_asc' | 'name' | 'adm'>('arrears_desc');

  // Arrears API Summary Data
  const [arrearsSummary, setArrearsSummary] = useState<ArrearsSummaryData | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddArrearModalOpen, setIsAddArrearModalOpen] = useState(false);
  const [selectedStudentForArrear, setSelectedStudentForArrear] = useState<Student | null>(null);
  const [statementStudent, setStatementStudent] = useState<{ id: string; name: string } | null>(null);
  const [paymentModalStudent, setPaymentModalStudent] = useState<Student | null>(null);

  // Single Arrear Form state
  const [formStudentId, setFormStudentId] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formMode, setFormMode] = useState<'SET' | 'ADD'>('ADD');
  const [formReason, setFormReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [formYear, setFormYear] = useState('year-2026');
  const [formTerm, setFormTerm] = useState('term-2026-t1');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Batch Entry State
  const [batchGrade, setBatchGrade] = useState('Grade 1');
  const [batchStream, setBatchStream] = useState('All');
  const [batchReason, setBatchReason] = useState('Opening Fee Arrears / Prior Balance');
  const [batchValues, setBatchValues] = useState<Record<string, number>>({});
  const [batchSavingId, setBatchSavingId] = useState<string | null>(null);
  const [isSavingAllBatch, setIsSavingAllBatch] = useState(false);
  const [savedRowIds, setSavedRowIds] = useState<Record<string, boolean>>({});

  // Load Arrears Summary from backend
  const loadSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await apiService.getArrearsSummary();
      if (res.success && res.data) {
        setArrearsSummary(res.data);
      }
    } catch {
      // Fallback to local students calculation
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  // Distinct Grades & Streams
  const grades = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.grade) set.add(s.grade);
    });
    return Array.from(set).sort();
  }, [students]);

  const streams = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.stream && s.stream !== '--') set.add(s.stream);
    });
    return Array.from(set).sort();
  }, [students]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalLearners = students.length;
    const learnersWithArrears = students.filter((s) => (s.feeBalance || 0) > 0);
    const totalArrearsAmount = learnersWithArrears.reduce((sum, s) => sum + (s.feeBalance || 0), 0);
    const averageArrear =
      learnersWithArrears.length > 0 ? Math.round(totalArrearsAmount / learnersWithArrears.length) : 0;
    const maxArrear = learnersWithArrears.reduce(
      (max, s) => Math.max(max, s.feeBalance || 0),
      0
    );

    return {
      totalLearners,
      defaultersCount: arrearsSummary?.totalLearnersWithArrears ?? learnersWithArrears.length,
      totalArrears: arrearsSummary?.totalOutstandingArrears ?? totalArrearsAmount,
      averageArrear: arrearsSummary?.averageArrear ?? averageArrear,
      maxArrear: arrearsSummary?.maxSingleArrear ?? maxArrear,
      collectionEfficiency:
        totalLearners > 0
          ? Math.round(((totalLearners - learnersWithArrears.length) / totalLearners) * 100)
          : 100,
    };
  }, [students, arrearsSummary]);

  // Filtered Students for Directory View
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = s.name.toLowerCase().includes(q);
          const matchesAdm = s.admNo.toLowerCase().includes(q);
          const matchesPhone = s.guardianPhone?.toLowerCase().includes(q);
          const matchesUpi = s.upi?.toLowerCase().includes(q);
          const matchesScholarship =
            (s.isSponsored ? 'scholarship sponsored 100%' : '').includes(q) ||
            (s.sponsorship?.benefactorName?.toLowerCase().includes(q) ?? false);
          if (!matchesName && !matchesAdm && !matchesPhone && !matchesUpi && !matchesScholarship) {
            return false;
          }
        }

        // Grade filter
        if (selectedGrade !== 'All' && s.grade !== selectedGrade) {
          return false;
        }

        // Stream filter
        if (selectedStream !== 'All' && s.stream !== selectedStream) {
          return false;
        }

        // Status filter
        const balance = s.feeBalance || 0;
        if (statusFilter === 'Sponsored' && !s.isSponsored) return false;
        if (statusFilter === 'Has_Arrears' && (balance <= 0 || s.isSponsored)) return false;
        if (statusFilter === 'Cleared' && (balance > 0 || s.isSponsored)) return false;
        if (statusFilter === 'High_Arrears' && (balance < 10000 || s.isSponsored)) return false;

        return true;
      })
      .sort((a, b) => {
        const balA = a.feeBalance || 0;
        const balB = b.feeBalance || 0;
        if (sortBy === 'arrears_desc') return balB - balA;
        if (sortBy === 'arrears_asc') return balA - balB;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'adm') return a.admNo.localeCompare(b.admNo);
        return 0;
      });
  }, [students, searchQuery, selectedGrade, selectedStream, statusFilter, sortBy]);

  // Students for Class Batch Grid
  const batchStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (batchGrade && s.grade !== batchGrade) return false;
        if (batchStream !== 'All' && s.stream !== batchStream) return false;
        return true;
      })
      .sort((a, b) => a.admNo.localeCompare(b.admNo));
  }, [students, batchGrade, batchStream]);

  // Open Add Arrear Modal for a specific student
  const handleOpenAddForStudent = (student: Student) => {
    setSelectedStudentForArrear(student);
    setFormStudentId(student.id);
    setFormAmount('');
    setFormMode('ADD');
    setFormReason('');
    setCustomReason('');
    setFormDueDate('');
    setFormNotes('');
    setIsAddArrearModalOpen(true);
  };

  // Open Add Arrear Modal blank (to select student)
  const handleOpenAddGeneral = () => {
    setSelectedStudentForArrear(null);
    setFormStudentId('');
    setFormAmount('');
    setFormMode('ADD');
    setFormReason('');
    setCustomReason('');
    setFormDueDate('');
    setFormNotes('');
    setIsAddArrearModalOpen(true);
  };

  // Submit Single Arrear Form
  const handleSubmitSingleArrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId) {
      setFeedback({ type: 'error', message: 'Please select a learner.' });
      return;
    }
    const targetStudent = students.find((s) => s.id === formStudentId) || selectedStudentForArrear;
    if (targetStudent?.isSponsored) {
      setFeedback({
        type: 'error',
        message: `Cannot charge fee arrears: Learner ${targetStudent.name} is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and is exempt from all fee charges.`,
      });
      return;
    }
    const amountNum = Number(formAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid non-negative arrears amount.' });
      return;
    }

    const effectiveReason = formReason === 'Custom Reason' ? customReason.trim() : formReason;
    if (!effectiveReason) {
      setFeedback({ type: 'error', message: 'Please provide a reason or category for the arrears.' });
      return;
    }

    setIsSubmittingSingle(true);
    setFeedback(null);
    try {
      const res = await apiService.addManualArrear({
        studentId: formStudentId,
        amount: amountNum,
        mode: formMode,
        reason: effectiveReason,
        academicYearId: formYear,
        termId: formTerm,
        dueDate: formDueDate,
        notes: formNotes,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Arrears of KES ${amountNum.toLocaleString()} recorded successfully!`,
        });
        setIsAddArrearModalOpen(false);
        if (onRefreshStudents) {
          await onRefreshStudents();
        }
        await loadSummary();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to record fee arrears. Please try again.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error occurred while recording manual arrears.',
      });
    } finally {
      setIsSubmittingSingle(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // Save single row in batch grid
  const handleSaveBatchRow = async (student: Student) => {
    const rawVal = batchValues[student.id];
    const amount = rawVal !== undefined ? rawVal : (student.feeBalance || 0);

    setBatchSavingId(student.id);
    try {
      const res = await apiService.addManualArrear({
        studentId: student.id,
        amount,
        mode: 'SET',
        reason: batchReason,
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
      });

      if (res.success) {
        setSavedRowIds((prev) => ({ ...prev, [student.id]: true }));
        if (onRefreshStudents) {
          await onRefreshStudents();
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Failed for ${student.name}: ${err.message}` });
    } finally {
      setBatchSavingId(null);
    }
  };

  // Save all changed rows in batch grid
  const handleSaveAllBatch = async () => {
    if (batchStudents.length === 0) return;
    setIsSavingAllBatch(true);
    setFeedback(null);

    const entries = batchStudents.map((s) => ({
      studentId: s.id,
      amount: batchValues[s.id] !== undefined ? batchValues[s.id] : (s.feeBalance || 0),
      reason: batchReason,
      mode: 'SET' as const,
    }));

    try {
      const res = await apiService.batchAddManualArrears({
        entries,
        academicYearId: 'year-2026',
        termId: 'term-2026-t1',
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Successfully updated arrears for ${res.data?.updatedCount || entries.length} learners in ${batchGrade}!`,
        });
        const allSaved: Record<string, boolean> = {};
        batchStudents.forEach((s) => (allSaved[s.id] = true));
        setSavedRowIds(allSaved);
        if (onRefreshStudents) {
          await onRefreshStudents();
        }
        await loadSummary();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to save batch arrears.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Batch save encountered an error.' });
    } finally {
      setIsSavingAllBatch(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const rows = [
      ['Admission No', 'Student Name', 'Grade', 'Stream', 'Guardian Name', 'Guardian Phone', 'Current Arrears (KES)'],
      ...filteredStudents.map((s) => [
        s.admNo,
        `"${s.name.replace(/"/g, '""')}"`,
        s.grade,
        s.stream || '--',
        `"${(s.guardianName || '--').replace(/"/g, '""')}"`,
        s.guardianPhone || '--',
        s.feeBalance || 0,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Grace_Seeds_School_Arrears_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewWindow = () => {
    window.open(`${window.location.origin}${window.location.pathname}#/arrears`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedStudentObj = useMemo(() => {
    return students.find((s) => s.id === formStudentId) || selectedStudentForArrear;
  }, [students, formStudentId, selectedStudentForArrear]);

  // Projected new balance in modal preview
  const projectedBalance = useMemo(() => {
    if (!selectedStudentObj) return 0;
    const current = selectedStudentObj.feeBalance || 0;
    const inputVal = Number(formAmount) || 0;
    if (formMode === 'SET') return inputVal;
    return current + inputVal;
  }, [selectedStudentObj, formAmount, formMode]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Fee Arrears</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1 flex items-center gap-3">
            <span>Student Fee Arrears</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
              Standalone Ledger
            </span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manually add, adjust, and bulk-populate fee arrears and carried-forward opening balances for every student
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="bg-surface-container-high p-1 rounded-xl flex items-center border border-outline-variant/30 text-xs font-semibold">
            <button
              onClick={() => setViewMode('directory')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'directory'
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_list</span>
              <span>Learners Directory</span>
            </button>
            <button
              onClick={() => setViewMode('batch_grid')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'batch_grid'
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span>Class Quick-Fill</span>
            </button>
          </div>

          <button
            onClick={handleOpenAddGeneral}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/95 text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Add Learner Arrear</span>
          </button>

          {onOpenSmsModal && (
            <button
              onClick={() => onOpenSmsModal('fee')}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Broadcast Arrears Reminder SMS"
            >
              <span className="material-symbols-outlined text-[17px]">sms</span>
              <span>SMS Defaulters</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Export CSV Arrears Roster"
          >
            <span className="material-symbols-outlined text-[17px]">download</span>
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Print Official Arrears Audit Roster"
          >
            <span className="material-symbols-outlined text-[17px]">print</span>
            <span>Print</span>
          </button>

          <button
            onClick={handleOpenInNewWindow}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Open Arrears Standalone View in New Tab"
          >
            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
            <span>New Tab</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 text-inherit cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Arrears */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Total Outstanding Arrears
            </span>
            <div className="text-2xl font-black font-data-mono text-error mt-1">
              KES {stats.totalArrears.toLocaleString()}
            </div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">
              Active ledger balance owed
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">assignment_late</span>
          </div>
        </div>

        {/* Card 2: Learners with Arrears */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Learners in Arrears
            </span>
            <div className="text-2xl font-black font-data-mono text-amber-700 mt-1">
              {stats.defaultersCount} / {stats.totalLearners}
            </div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">
              {stats.totalLearners > 0
                ? `${Math.round((stats.defaultersCount / stats.totalLearners) * 100)}% of enrolled students`
                : '0%'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
        </div>

        {/* Card 3: Average Arrears */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Average Arrear Balance
            </span>
            <div className="text-2xl font-black font-data-mono text-on-surface mt-1">
              KES {stats.averageArrear.toLocaleString()}
            </div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">
              Per learner with arrears
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-container/40 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">functions</span>
          </div>
        </div>

        {/* Card 4: Highest Single Arrear */}
        <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Highest Single Arrear
            </span>
            <div className="text-2xl font-black font-data-mono text-rose-700 mt-1">
              KES {stats.maxArrear.toLocaleString()}
            </div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">
              Priority follow-up
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">priority_high</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE A: LEARNERS DIRECTORY */}
      {viewMode === 'directory' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/30">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by learner name, adm #, guardian phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Grade Filter */}
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs text-on-surface focus:outline-hidden focus:border-primary font-medium"
              >
                <option value="All">All Grades & Classes</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Stream Filter */}
              {streams.length > 0 && (
                <select
                  value={selectedStream}
                  onChange={(e) => setSelectedStream(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs text-on-surface focus:outline-hidden focus:border-primary font-medium"
                >
                  <option value="All">All Streams</option>
                  {streams.map((str) => (
                    <option key={str} value={str}>
                      {str}
                    </option>
                  ))}
                </select>
              )}

              {/* Arrear Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs text-on-surface focus:outline-hidden focus:border-primary font-medium"
              >
                <option value="All">All Balance Statuses</option>
                <option value="Has_Arrears">Has Fee Arrears (&gt; KES 0)</option>
                <option value="High_Arrears">High Arrears (&gt; KES 10,000)</option>
                <option value="Cleared">Cleared (KES 0)</option>
                <option value="Sponsored">100% Scholarship / Sponsored</option>
              </select>
            </div>

            {/* Sort Dropdown & Count */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-on-surface-variant font-medium">
                Showing <strong className="text-on-surface">{filteredStudents.length}</strong> of {students.length}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-xs text-on-surface focus:outline-hidden focus:border-primary font-medium"
              >
                <option value="arrears_desc">Sort: Highest Arrears</option>
                <option value="arrears_asc">Sort: Lowest Arrears</option>
                <option value="name">Sort: Learner Name (A-Z)</option>
                <option value="adm">Sort: Admission No</option>
              </select>
            </div>
          </div>

          {/* Learners Arrears Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4">Learner Details</th>
                  <th className="py-3 px-4">Class & Stream</th>
                  <th className="py-3 px-4">Guardian Contact</th>
                  <th className="py-3 px-4 text-right">Current Arrears / Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[36px] text-outline">search_off</span>
                        <p className="font-semibold text-sm">No learners found matching criteria</p>
                        <p className="text-xs text-outline">Try adjusting your filters or search keywords</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const balance = student.feeBalance || 0;
                    const hasArrears = balance > 0;
                    const isHigh = balance >= 10000;

                    return (
                      <tr key={student.id} className="hover:bg-surface-container-low/30 transition-colors">
                        {/* Learner */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 text-xs">
                              {student.name.charAt(0)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-on-surface truncate">
                                  {student.name}
                                </span>
                                {student.isSponsored && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#7a1228]/10 text-primary border border-[#7a1228]/25" title="Student is under institutional scholarship scheme">
                                    <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                                    <span>Scholarship</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                                <span className="font-mono">Adm: {student.admNo}</span>
                                {student.upi && student.upi !== '--' && (
                                  <span className="text-[10px] text-outline font-mono">UPI: {student.upi}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Class */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface">{student.grade}</span>
                            <span className="text-[11px] text-on-surface-variant">
                              {student.stream && student.stream !== '--' ? `Stream: ${student.stream}` : 'No Stream'}
                            </span>
                          </div>
                        </td>

                        {/* Guardian */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface">
                              {student.guardianName || '--'}
                            </span>
                            <span className="text-[11px] text-on-surface-variant font-mono">
                              {student.guardianPhone || '--'}
                            </span>
                          </div>
                        </td>

                        {/* Arrears Balance */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span
                              className={`font-black font-data-mono text-sm ${
                                student.isSponsored
                                  ? 'text-[#7a1228]'
                                  : isHigh
                                  ? 'text-rose-700'
                                  : hasArrears
                                  ? 'text-amber-800'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {student.isSponsored ? 'KES 0 (Waived)' : `KES ${balance.toLocaleString()}`}
                            </span>
                            <span className="text-[10px] text-outline">
                              {student.isSponsored ? '100% Scholarship Subsidized' : `Billed: KES ${(student.totalFee || balance).toLocaleString()}`}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {student.isSponsored ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#7a1228] text-white shadow-2xs" title="100% Scholarship · Cannot be charged fee arrears">
                              <span className="material-symbols-outlined text-[12px]">lock</span>
                              Charge Exempt
                            </span>
                          ) : isHigh ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                              High Arrears
                            </span>
                          ) : hasArrears ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              Arrears Due
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Cleared
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Add / Adjust Arrear */}
                            {student.isSponsored ? (
                              <span
                                className="px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant/70 font-bold text-xs flex items-center gap-1 cursor-not-allowed opacity-80"
                                title="Learner is under 100% Institutional Scholarship and cannot be charged fee arrears"
                              >
                                <span className="material-symbols-outlined text-[15px]">lock</span>
                                <span>Exempt</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenAddForStudent(student)}
                                className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Set or Add Fee Arrears"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                                <span>Adjust</span>
                              </button>
                            )}

                            {/* View Statement */}
                            <button
                              onClick={() =>
                                setStatementStudent({ id: student.id, name: student.name })
                              }
                              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                              title="Official Fee Statement Ledger"
                            >
                              <span className="material-symbols-outlined text-[17px]">receipt_long</span>
                            </button>

                            {/* Record Payment */}
                            {!student.isSponsored && (
                              <button
                                onClick={() => setPaymentModalStudent(student)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                                title="Record Direct Payment Receipt"
                              >
                                <span className="material-symbols-outlined text-[17px]">payments</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE B: CLASS QUICK-FILL / BATCH SPREADSHEET */}
      {viewMode === 'batch_grid' && (
        <div className="space-y-4">
          <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Target Class
                </label>
                <select
                  value={batchGrade}
                  onChange={(e) => setBatchGrade(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold focus:outline-hidden focus:border-primary"
                >
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {streams.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                    Stream
                  </label>
                  <select
                    value={batchStream}
                    onChange={(e) => setBatchStream(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold focus:outline-hidden focus:border-primary"
                  >
                    <option value="All">All Streams</option>
                    {streams.map((str) => (
                      <option key={str} value={str}>
                        {str}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex-1 min-w-[220px]">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Arrear Description / Reason
                </label>
                <select
                  value={batchReason}
                  onChange={(e) => setBatchReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface font-semibold focus:outline-hidden focus:border-primary"
                >
                  <option value="Opening Fee Arrears / Prior Balance">Opening Fee Arrears / Prior Balance</option>
                  <option value="Term 3 2025 Balance Carried Forward">Term 3 2025 Balance Carried Forward</option>
                  <option value="Term 2 2025 Balance Carried Forward">Term 2 2025 Balance Carried Forward</option>
                  <option value="Previous School Unpaid Balance">Previous School Unpaid Balance</option>
                  <option value="Transport & Bus Service Arrears">Transport & Bus Service Arrears</option>
                  <option value="Meals & Lunch Program Arrears">Meals & Lunch Program Arrears</option>
                  <option value="Manual Bursar Adjustment">Manual Bursar Adjustment</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end">
              <button
                onClick={handleSaveAllBatch}
                disabled={isSavingAllBatch || batchStudents.length === 0}
                className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/95 text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingAllBatch ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    <span>Saving All Learners...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Save All {batchStudents.length} Learners</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Fill Grid Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="p-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between text-xs text-primary font-medium">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Tip: Type the arrear amount for each student and press <kbd className="bg-white px-1.5 py-0.5 rounded border text-[10px] font-mono">Tab</kbd> to jump down the list. Click &quot;Save&quot; per row or &quot;Save All&quot; at the top.
              </span>
              <span>{batchStudents.length} learners in roster</span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-surface-container-low text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Adm #</th>
                    <th className="py-2.5 px-4">Learner Name</th>
                    <th className="py-2.5 px-4">Stream</th>
                    <th className="py-2.5 px-4 text-right">Current Ledger Balance</th>
                    <th className="py-2.5 px-4 w-48 text-right">New Arrear (KES)</th>
                    <th className="py-2.5 px-4 text-center">Row Status</th>
                    <th className="py-2.5 px-4 text-right">Quick Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
                  {batchStudents.map((st, idx) => {
                    const currentBal = st.feeBalance || 0;
                    const enteredVal = batchValues[st.id] !== undefined ? batchValues[st.id] : currentBal;
                    const isSavingThis = batchSavingId === st.id;
                    const isSaved = savedRowIds[st.id];

                    return (
                      <tr key={st.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="py-2.5 px-4 text-outline font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-on-surface">
                          {st.admNo}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-on-surface">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{st.name}</span>
                            {st.isSponsored && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#7a1228]/10 text-primary border border-[#7a1228]/25" title="Student is under institutional scholarship scheme">
                                <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                                <span>Scholarship</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-on-surface-variant">{st.stream || '--'}</td>
                        <td className="py-2.5 px-4 text-right font-data-mono font-semibold text-on-surface">
                          KES {currentBal.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {st.isSponsored ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant/70 font-mono font-bold text-xs"
                              title="100% Scholarship - Cannot be charged arrears"
                            >
                              <span className="material-symbols-outlined text-[13px]">lock</span>
                              KES 0 (Exempt)
                            </span>
                          ) : (
                            <div className="relative inline-flex items-center">
                              <span className="absolute left-2.5 text-[11px] font-bold text-outline">
                                KES
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={enteredVal === 0 && batchValues[st.id] === undefined ? '' : enteredVal}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setBatchValues((prev) => ({ ...prev, [st.id]: val }));
                                  setSavedRowIds((prev) => ({ ...prev, [st.id]: false }));
                                }}
                                className="w-36 pl-10 pr-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/50 text-right font-data-mono font-bold text-xs focus:outline-hidden focus:border-primary focus:bg-white"
                              />
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {st.isSponsored ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                              Exempt
                            </span>
                          ) : isSaved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                              Saved
                            </span>
                          ) : (
                            <span className="text-[11px] text-outline font-medium">Pending Save</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleSaveBatchRow(st)}
                            disabled={isSavingThis || st.isSponsored}
                            className="px-2.5 py-1 rounded-lg bg-primary text-white hover:bg-primary/95 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            title={st.isSponsored ? 'Learner is under 100% Scholarship and cannot be charged' : undefined}
                          >
                            {isSavingThis ? '...' : st.isSponsored ? 'Locked' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / ADJUST INDIVIDUAL ARREAR */}
      {isAddArrearModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">assignment_late</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                    Record Manual Fee Arrears
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Add or update fee arrears balance for a learner
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddArrearModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitSingleArrear} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Select Learner */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Learner *
                </label>
                {selectedStudentForArrear ? (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-on-surface text-sm">
                          {selectedStudentForArrear.name}
                        </span>
                        {selectedStudentForArrear.isSponsored && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#7a1228] text-white">
                            <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                            <span>100% Scholarship</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        Adm: <span className="font-mono">{selectedStudentForArrear.admNo}</span> · {selectedStudentForArrear.grade}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {selectedStudentForArrear.isSponsored ? 'KES 0 (Waived)' : `Current Bal: KES ${(selectedStudentForArrear.feeBalance || 0).toLocaleString()}`}
                    </span>
                  </div>
                ) : (
                  <select
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface font-semibold focus:outline-hidden focus:border-primary"
                  >
                    <option value="">Select a learner...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Adm: {s.admNo}) - {s.grade} {s.isSponsored ? '[100% Scholarship]' : `[Bal: KES ${(s.feeBalance || 0).toLocaleString()}]`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedStudentObj?.isSponsored && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5 shadow-2xs">
                  <span className="material-symbols-outlined text-[#7a1228] text-[20px] shrink-0 mt-0.5">lock</span>
                  <div className="text-xs">
                    <span className="font-extrabold text-[#7a1228]">Charge-Exempt Learner:</span> This learner is enrolled under the school&apos;s 100% Institutional Scholarship Scheme ({selectedStudentObj.sponsorship?.benefactorName || 'Institutional Sponsorship'}). The system recognizes them as fully subsidized and strictly blocks charging or adding fee arrears.
                  </div>
                </div>
              )}

              {/* Mode Selection Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Arrears Application Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormMode('SET')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formMode === 'SET'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <div className="text-xs font-bold">Set / Replace Exact Arrear</div>
                    <div className="text-[10px] text-on-surface-variant font-normal mt-0.5">
                      Sets student total arrears balance to this exact figure
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode('ADD')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formMode === 'ADD'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                        : 'border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <div className="text-xs font-bold">Add to Existing Balance</div>
                    <div className="text-[10px] text-on-surface-variant font-normal mt-0.5">
                      Adds this amount on top of current arrears
                    </div>
                  </button>
                </div>
              </div>

              {/* Arrears Amount */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Arrears Amount (KES) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">
                    KES
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 8500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-sm font-data-mono font-bold text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>

                {/* Quick amount chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-outline">Quick Presets:</span>
                  {[1000, 2500, 5000, 10000, 15000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormAmount(amt)}
                      className="px-2 py-0.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-[10px] font-mono text-on-surface border border-outline-variant/30 cursor-pointer"
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormAmount(0)}
                    className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono cursor-pointer"
                  >
                    Clear (0)
                  </button>
                </div>
              </div>

              {/* Arrear Reason / Category Presets */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Reason / Source of Arrears *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Opening Fee Arrears / Prior Balance',
                    'Term 3 2025 Balance Carried Forward',
                    'Previous School Unpaid Balance',
                    'Transport & Bus Service Arrears',
                    'Custom Reason',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormReason(r)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        formReason === r
                          ? 'bg-primary text-white border-primary shadow-2xs font-bold'
                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-outline'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {formReason === 'Custom Reason' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter specific custom reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface focus:outline-hidden focus:border-primary mt-1"
                  />
                )}
              </div>

              {/* Term & Year Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                    Academic Year
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface font-semibold focus:outline-hidden focus:border-primary"
                  >
                    <option value="year-2026">2026 Academic Year</option>
                    <option value="year-2025">2025 (Prior Year)</option>
                    <option value="year-2024">2024 (Prior Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                    Academic Term
                  </label>
                  <select
                    value={formTerm}
                    onChange={(e) => setFormTerm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface font-semibold focus:outline-hidden focus:border-primary"
                  >
                    <option value="term-2026-t1">Term 1 (Current)</option>
                    <option value="term-2026-t2">Term 2</option>
                    <option value="term-2026-t3">Term 3</option>
                    <option value="ALL">Annual / Opening Balance</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface font-semibold focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                    Bursar Notes / Slip #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ledger folio #42"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* Balance Projection Box */}
              {selectedStudentObj && (
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                      Resulting Learner Balance
                    </span>
                    <div className="text-base font-black font-data-mono text-error mt-0.5">
                      KES {projectedBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-on-surface-variant">
                    <div>Current: KES {(selectedStudentObj.feeBalance || 0).toLocaleString()}</div>
                    <div className="font-semibold text-primary">
                      {formMode === 'SET' ? 'Mode: Exact Override' : `+ KES ${(Number(formAmount) || 0).toLocaleString()}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsAddArrearModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSingle || !!selectedStudentObj?.isSponsored}
                  className="px-5 py-2 rounded-xl bg-primary text-white hover:bg-primary/95 text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingSingle ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Saving Arrears...</span>
                    </>
                  ) : selectedStudentObj?.isSponsored ? (
                    <>
                      <span className="material-symbols-outlined text-[17px]">lock</span>
                      <span>Cannot Charge · Learner Is Exempt</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[17px]">save</span>
                      <span>Save Fee Arrears</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FEE STATEMENT MODAL */}
      {statementStudent && (
        <FeeStatementModal
          studentId={statementStudent.id}
          studentName={statementStudent.name}
          onClose={() => setStatementStudent(null)}
        />
      )}

      {/* MODAL: RECORD PAYMENT MODAL */}
      {paymentModalStudent && (
        <RecordPaymentModal
          isOpen={true}
          onClose={() => setPaymentModalStudent(null)}
          students={students}
          initialStudent={paymentModalStudent}
          onPaymentRecorded={async () => {
            setPaymentModalStudent(null);
            if (onRefreshStudents) {
              await onRefreshStudents();
            }
            await loadSummary();
          }}
        />
      )}
    </div>
  );
};
