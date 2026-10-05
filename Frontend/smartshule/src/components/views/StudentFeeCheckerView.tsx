import React, { useState, useEffect, useMemo } from 'react';
import { Student, StudentInvoice, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { KcbBuniPaymentModal } from '../modals/KcbBuniPaymentModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';

interface StudentFeeCheckerViewProps {
  students: Student[];
  onRefreshStudents?: () => void | Promise<void>;
  initialStudentId?: string;
}

export const StudentFeeCheckerView: React.FC<StudentFeeCheckerViewProps> = ({
  students = [],
  onRefreshStudents,
  initialStudentId,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Has_Balance' | 'Cleared'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'balance_desc' | 'balance_asc' | 'adm'>('balance_desc');

  // Selected student for detailed fee inspection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [statementData, setStatementData] = useState<any | null>(null);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'statement'>('invoices');

  // Modals
  const [isKcbModalOpen, setIsKcbModalOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [smsSentSuccess, setSmsSentSuccess] = useState<string | null>(null);

  // Hanging Invoice Deletion state
  const isGuardian = user?.role === UserRole.GUARDIAN || user?.role === UserRole.PARENT;
  const canManageInvoices = !isGuardian;
  const [invoiceToDelete, setInvoiceToDelete] = useState<StudentInvoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const isHangingInvoice = (inv: StudentInvoice): boolean => {
    const paid = Number(inv.amountPaid) || 0;
    return paid === 0 && inv.status !== 'PAID' && inv.status !== 'PARTIALLY_PAID';
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    setDeleteError(null);
    try {
      const res = await apiService.deleteInvoice(invoiceToDelete.id);
      if (res?.success === false) {
        throw new Error(res.message || 'Failed to delete invoice');
      }
      setDeleteSuccess(`Invoice #${invoiceToDelete.invoiceNumber} deleted successfully.`);
      setInvoiceToDelete(null);
      if (selectedStudent) {
        const statementRes = await apiService.getFeeStatement(selectedStudent.id).catch(() => null);
        if (statementRes?.success && statementRes.data) {
          setStatementData(statementRes.data);
        }
      }
      if (onRefreshStudents) {
        await onRefreshStudents();
      }
      setTimeout(() => setDeleteSuccess(null), 4000);
    } catch (err: any) {
      console.error('Delete invoice error:', err);
      setDeleteError(err?.message || 'Failed to delete invoice. Please try again.');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  // Initialize selected student if initialStudentId is provided or on first mount
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const found = students.find((s) => s.id === initialStudentId);
      if (found) setSelectedStudent(found);
    }
  }, [initialStudentId, students]);

  // Load detailed fee statement whenever a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setStatementData(null);
      return;
    }

    let isMounted = true;
    setIsLoadingStatement(true);
    setStatementError(null);

    apiService
      .getFeeStatement(selectedStudent.id)
      .then((res) => {
        if (isMounted) {
          if (res?.success && res.data) {
            setStatementData(res.data);
          } else {
            setStatementData(null);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Could not load detailed statement, using student summary:', err);
          setStatementError('Could not fetch real-time invoice breakdown. Showing basic balance data.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingStatement(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStudent?.id]);

  // Distinct grades for filtering
  const distinctGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach((s) => {
      if (s.grade) grades.add(s.grade);
    });
    return Array.from(grades).sort();
  }, [students]);

  // Filtered & sorted student list
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        // Text Search across multiple fields
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const nameMatch = s.name.toLowerCase().includes(query);
          const admMatch = (s.admNo || '').toLowerCase().includes(query);
          const upiMatch = (s.upi || '').toLowerCase().includes(query);
          const nemisMatch = (s.nemis || '').toLowerCase().includes(query);
          const gradeMatch = (s.grade || '').toLowerCase().includes(query);
          const streamMatch = (s.stream || '').toLowerCase().includes(query);
          const guardianNameMatch = (s.guardianName || '').toLowerCase().includes(query);
          const guardianPhoneMatch = (s.guardianPhone || '').replace(/\s+/g, '').includes(query);

          if (
            !nameMatch &&
            !admMatch &&
            !upiMatch &&
            !nemisMatch &&
            !gradeMatch &&
            !streamMatch &&
            !guardianNameMatch &&
            !guardianPhoneMatch
          ) {
            return false;
          }
        }

        // Grade Filter
        if (selectedGrade !== 'All' && s.grade !== selectedGrade) {
          return false;
        }

        // Status Filter
        if (selectedStatus === 'Has_Balance' && (s.feeBalance || 0) <= 0) {
          return false;
        }
        if (selectedStatus === 'Cleared' && ((s.feeBalance || 0) > 0 || (s.totalFee || 0) <= 0)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'adm') return (a.admNo || '').localeCompare(b.admNo || '');
        if (sortBy === 'balance_desc') return (b.feeBalance || 0) - (a.feeBalance || 0);
        if (sortBy === 'balance_asc') return (a.feeBalance || 0) - (b.feeBalance || 0);
        return 0;
      });
  }, [students, searchQuery, selectedGrade, selectedStatus, sortBy]);

  // Overall School Statistics
  const overallStats = useMemo(() => {
    const totalStudents = students.length;
    const withBalance = students.filter((s) => (s.feeBalance || 0) > 0);
    const totalOutstanding = students.reduce((acc, s) => acc + (s.feeBalance || 0), 0);
    const totalBilled = students.reduce((acc, s) => acc + (s.totalFee || 0), 0);
    const totalCollected = Math.max(0, totalBilled - totalOutstanding);
    return {
      totalStudents,
      defaultersCount: withBalance.length,
      totalOutstanding,
      totalBilled,
      totalCollected,
    };
  }, [students]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePaymentSuccess = async () => {
    setIsKcbModalOpen(false);
    setIsRecordPaymentOpen(false);
    if (onRefreshStudents) {
      await onRefreshStudents();
    }
    // Re-fetch current statement
    if (selectedStudent) {
      apiService.getFeeStatement(selectedStudent.id).then((res) => {
        if (res?.success && res.data) setStatementData(res.data);
      });
    }
  };

  const studentGradeStr = selectedStudent?.grade || (selectedStudent as any)?.gradeLevel || '';
  const kcbAccountRef = selectedStudent?.name
    ? `8048859#${selectedStudent.name}${studentGradeStr ? ' ' + studentGradeStr : ''}`.trim()
    : `8048859#${selectedStudent?.admNo || ''}`;

  // Current balance calculated from statement or student summary
  const currentBilled = statementData?.summary?.totalBilled ?? selectedStudent?.totalFee ?? 0;
  const currentPaid = statementData?.summary?.totalPaid ?? Math.max(0, (selectedStudent?.totalFee || 0) - (selectedStudent?.feeBalance || 0));
  const currentBalance = statementData?.summary?.currentBalance ?? selectedStudent?.feeBalance ?? 0;
  const isCleared = currentBilled > 0 && currentBalance <= 0;
  const isPendingInvoice = currentBilled <= 0 && currentBalance <= 0;

  const invoicesList: StudentInvoice[] = statementData?.invoices || [];
  const paymentsList: any[] = statementData?.payments || [];

  return (
    <div className="space-y-6 pb-16 font-body">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance &amp; Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Student Fee Checker</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Student Fee Checker &amp; Ledger
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              KCB Paybill 522533
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Instant search across any learner in the institution to check term invoices, fee payments, live arrears, and official KCB Buni account codes.
          </p>
        </div>

        {/* Global Action Shortcut */}
        {selectedStudent && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsKcbModalOpen(true)}
              className="px-3.5 py-2 bg-[#006a40] hover:bg-[#005a36] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
              <span>Pay via KCB Buni</span>
            </button>
            <button
              onClick={() => setIsRecordPaymentOpen(true)}
              className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_card</span>
              <span>Record Payment</span>
            </button>
          </div>
        )}
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
            Total Learners
          </span>
          <div className="text-xl font-bold font-data-mono text-on-surface mt-1">
            {overallStats.totalStudents.toLocaleString()}
          </div>
          <span className="text-[10px] text-on-surface-variant mt-0.5 block">Active School Registry</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
            With Balances
          </span>
          <div className="text-xl font-bold font-data-mono text-error mt-1">
            {overallStats.defaultersCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-error font-medium mt-0.5 block">Pending Fee Settling</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
            Total Outstanding
          </span>
          <div className="text-xl font-bold font-data-mono text-primary mt-1">
            KES {overallStats.totalOutstanding.toLocaleString()}
          </div>
          <span className="text-[10px] text-primary/80 mt-0.5 block">Institutional Receivables</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
            KCB Buni Shortcode
          </span>
          <div className="text-xl font-bold font-data-mono text-[#006a40] mt-1">
            522533
          </div>
          <span className="text-[10px] text-[#006a40] font-semibold mt-0.5 block">Acc: 8048859#Child Grade</span>
        </div>
      </div>

      {/* Main Search Bar & Filter Controls */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Real-Time Search Input */}
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-primary text-[20px]">
              person_search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by learner name, admission no (e.g. ADM-2026-001), UPI, grade, stream, or guardian phone..."
              className="w-full pl-11 pr-10 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-primary focus:ring-1 focus:ring-primary shadow-xs"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-1 text-on-surface-variant hover:text-on-surface rounded-full cursor-pointer"
                title="Clear Search"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Filter: Grade */}
          <div className="w-full md:w-44">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full py-2.5 px-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
            >
              <option value="All">All Grades</option>
              {distinctGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Balance Status */}
          <div className="w-full md:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
            >
              <option value="All">All Fee Statuses</option>
              <option value="Has_Balance">Has Arrears / Balance</option>
              <option value="Cleared">Fully Cleared (KES 0)</option>
            </select>
          </div>

          {/* Filter: Sort By */}
          <div className="w-full md:w-44">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface focus:outline-primary cursor-pointer"
            >
              <option value="balance_desc">Highest Balance First</option>
              <option value="balance_asc">Lowest Balance First</option>
              <option value="name">Name (A-Z)</option>
              <option value="adm">Admission No</option>
            </select>
          </div>
        </div>

        {/* Results Count & Quick Reset */}
        <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">
              Showing {filteredStudents.length} of {students.length} learner(s)
            </span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium text-[11px]">
                Matching &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          {(searchQuery || selectedGrade !== 'All' || selectedStatus !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGrade('All');
                setSelectedStatus('All');
              }}
              className="text-primary hover:underline text-[11px] font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Content: Student Quick Selector + Detailed Fee Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side (Col 1-4): Student Quick List */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden flex flex-col max-h-[820px]">
          <div className="p-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">group</span>
              <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">
                Matching Learners ({filteredStudents.length})
              </h3>
            </div>
            {selectedStudent && (
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-[11px] text-on-surface-variant hover:text-primary cursor-pointer"
              >
                Clear Selected
              </button>
            )}
          </div>

          <div className="overflow-y-auto divide-y divide-outline-variant/15 flex-1 overscroll-contain">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant space-y-2">
                <span className="material-symbols-outlined text-[36px] text-outline opacity-60">search_off</span>
                <p>No learners found matching your search query.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGrade('All');
                    setSelectedStatus('All');
                  }}
                  className="px-3 py-1 bg-surface-container text-primary font-bold text-xs rounded-lg hover:bg-surface-container-high"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isSelected = selectedStudent?.id === st.id;
                const hasBal = (st.feeBalance || 0) > 0;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStudent(st)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-surface-container-low/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-outline-variant/30">
                        {st.profilePhotoUrl ? (
                          <img src={st.profilePhotoUrl} alt={st.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{st.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-xs text-on-surface truncate leading-tight">
                          {st.name}
                        </div>
                        <div className="text-[11px] text-on-surface-variant font-data-mono flex items-center gap-1.5 mt-0.5">
                          <span>{st.admNo}</span>
                          <span>·</span>
                          <span className="text-primary font-semibold">{st.grade}</span>
                        </div>
                        {st.guardianPhone && st.guardianPhone !== '--' && (
                          <div className="text-[10px] text-on-surface-variant/80 truncate mt-0.5">
                            Parent: {st.guardianPhone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Balance Pill */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-extrabold font-data-mono ${
                          hasBal ? 'text-error' : 'text-emerald-700'
                        }`}
                      >
                        {hasBal ? `KES ${st.feeBalance.toLocaleString()}` : 'KES 0'}
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider mt-0.5 ${
                          hasBal
                            ? 'bg-error-container/40 text-error'
                            : (st.totalFee || 0) > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {hasBal ? 'Balance' : (st.totalFee || 0) > 0 ? 'Cleared' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side (Col 5-12): Detailed Student Ledger Inspection */}
        <div className="lg:col-span-8">
          {selectedStudent ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Learner Identity & KCB Account Card */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#7a1228] via-[#8c1730] to-[#5a0b1d] text-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-base shrink-0 overflow-hidden shadow-inner text-white">
                      {selectedStudent.profilePhotoUrl ? (
                        <img
                          src={selectedStudent.profilePhotoUrl}
                          alt={selectedStudent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{selectedStudent.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold leading-tight">{selectedStudent.name}</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                          {selectedStudent.status || 'Active'}
                        </span>
                      </div>
                      <div className="text-xs text-rose-100 font-data-mono flex flex-wrap items-center gap-2 mt-1">
                        <span>Adm: <strong className="text-white">{selectedStudent.admNo}</strong></span>
                        <span>·</span>
                        <span>Grade: <strong className="text-white">{selectedStudent.grade}</strong></span>
                        {selectedStudent.stream && (
                          <>
                            <span>·</span>
                            <span>Stream: <strong className="text-white">{selectedStudent.stream}</strong></span>
                          </>
                        )}
                        {selectedStudent.upi && selectedStudent.upi !== '--' && (
                          <>
                            <span>·</span>
                            <span>UPI: <strong className="text-white">{selectedStudent.upi}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guardian Call / Message shortcuts */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {selectedStudent.guardianPhone && selectedStudent.guardianPhone !== '--' && (
                      <a
                        href={`tel:${selectedStudent.guardianPhone}`}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Call Guardian"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        <span>{selectedStudent.guardianPhone}</span>
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Close learner view"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                </div>

                {/* 4 Financial Health Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-surface-container-low/50 border-b border-outline-variant/20">
                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
                      Total Invoiced
                    </span>
                    <div className="text-base sm:text-lg font-bold font-data-mono text-on-surface mt-1">
                      KES {currentBilled.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-0.5 block">Approved Fee Schedule</span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
                      Total Fees Paid
                    </span>
                    <div className="text-base sm:text-lg font-bold font-data-mono text-emerald-700 mt-1">
                      KES {currentPaid.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-emerald-800 mt-0.5 block">Reconciled Credits</span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
                      Outstanding Balance
                    </span>
                    <div
                      className={`text-base sm:text-lg font-extrabold font-data-mono mt-1 ${
                        isCleared ? 'text-emerald-700' : 'text-error'
                      }`}
                    >
                      KES {currentBalance.toLocaleString()}
                    </div>
                    <span
                      className={`text-[10px] font-semibold mt-0.5 block ${
                        isCleared ? 'text-emerald-700' : 'text-error'
                      }`}
                    >
                      {isCleared ? 'Nil Balance (All Clear)' : 'Fee Arrears Due'}
                    </span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider block">
                      Ledger Status
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          isCleared ? 'text-emerald-600' : isPendingInvoice ? 'text-slate-500' : 'text-amber-600'
                        }`}
                      >
                        {isCleared ? 'verified' : isPendingInvoice ? 'receipt_long' : 'pending_actions'}
                      </span>
                      <span className="font-bold text-xs text-on-surface">
                        {isCleared ? 'Cleared' : isPendingInvoice ? 'Pending Invoicing' : 'Pending Payment'}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-0.5 block">
                      {isCleared ? 'Eligible for Term Exams' : isPendingInvoice ? 'No Invoice Issued' : 'Requires Clearance'}
                    </span>
                  </div>
                </div>

                {/* KCB Paybill 522533 Official Payment Code Banner */}
                <div className="p-4 bg-emerald-50/80 border-b border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#006a40] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[22px]">account_balance</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950 text-sm">
                          KCB Buni Paybill: <span className="font-data-mono text-[#006a40]">522533</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy('522533', 'paybill')}
                          className="px-2 py-0.5 bg-emerald-200/80 hover:bg-emerald-300 text-emerald-900 rounded text-[11px] font-bold cursor-pointer"
                        >
                          {copiedField === 'paybill' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="text-[11px] text-emerald-900 flex items-center gap-2 mt-0.5">
                        <span>Account Number:</span>
                        <strong className="font-data-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">
                          {kcbAccountRef}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(kcbAccountRef, 'account')}
                          className="px-2 py-0.5 bg-emerald-200/80 hover:bg-emerald-300 text-emerald-900 rounded text-[11px] font-bold cursor-pointer"
                        >
                          {copiedField === 'account' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsKcbModalOpen(true)}
                      className="px-3.5 py-2 bg-[#006a40] hover:bg-[#005a36] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
                      <span>Push STK Prompt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRecordPaymentOpen(true)}
                      className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                      <span>Record Payment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Print Official Statement"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs: Invoices / Payment Receipts / Statement */}
                <div className="flex border-b border-outline-variant/30 bg-surface-container-low px-4 pt-2 gap-2 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('invoices')}
                    className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'invoices'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    <span>Billed Invoices ({invoicesList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'payments'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    <span>Payment Receipts ({paymentsList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('statement')}
                    className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'statement'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">description</span>
                    <span>Official Statement Document</span>
                  </button>
                </div>

                {/* Tab Content Body */}
                <div className="p-5">
                  {isLoadingStatement ? (
                    <div className="py-12 text-center text-xs text-on-surface-variant space-y-2">
                      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto"></div>
                      <p>Loading real-time fee statement and ledger...</p>
                    </div>
                  ) : statementError ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-700">warning</span>
                      <span>{statementError}</span>
                    </div>
                  ) : (
                    <>
                      {/* TAB 1: INVOICES BREAKDOWN */}
                      {activeTab === 'invoices' && (
                        <div className="space-y-4">
                          {deleteSuccess && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                                <span>{deleteSuccess}</span>
                              </div>
                              <button onClick={() => setDeleteSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          )}
                          {deleteError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
                                <span>{deleteError}</span>
                              </div>
                              <button onClick={() => setDeleteError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          )}
                          {invoicesList.length === 0 ? (
                            <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl border border-outline-variant/20">
                              <span className="material-symbols-outlined text-[32px] text-outline opacity-60 mb-1">
                                receipt
                              </span>
                              <p className="font-semibold text-on-surface">No invoices currently billed for this learner.</p>
                              <p className="mt-1">Invoices are automatically generated when fee structures are synced.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {invoicesList.map((inv) => {
                                const isExpanded = expandedInvoiceId === inv.id;
                                const invBal = inv.balance || 0;
                                const isInvPaid = invBal <= 0;
                                return (
                                  <div
                                    key={inv.id}
                                    className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xs transition-all"
                                  >
                                    <div
                                      onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                      className="p-3.5 bg-surface-container-low/60 hover:bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            isInvPaid
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-primary/10 text-primary'
                                          }`}
                                        >
                                          <span className="material-symbols-outlined text-[20px]">
                                            {isInvPaid ? 'check_circle' : 'receipt'}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs font-data-mono text-primary">
                                              #{inv.invoiceNumber}
                                            </span>
                                            <span
                                              className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                                                isInvPaid
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : 'bg-amber-100 text-amber-900'
                                              }`}
                                            >
                                              {inv.status}
                                            </span>
                                            {canManageInvoices && isHangingInvoice(inv) && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteError(null);
                                                  setInvoiceToDelete(inv);
                                                }}
                                                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                title="Delete Unsettled Hanging Invoice (0 Payments)"
                                              >
                                                <span className="material-symbols-outlined text-[13px]">delete</span>
                                                <span>Delete</span>
                                              </button>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-on-surface-variant mt-0.5">
                                            Due Date: {inv.dueDate || 'End of Term'} · {inv.items?.length || 0} line items
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-data-mono">
                                        <div className="text-right">
                                          <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">
                                            Billed
                                          </span>
                                          <span className="font-bold text-on-surface">
                                            KES {(inv.amountPayable || inv.amountBilled || 0).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">
                                            Paid
                                          </span>
                                          <span className="font-bold text-emerald-700">
                                            KES {(inv.amountPaid || 0).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] text-on-surface-variant uppercase font-semibold block">
                                            Balance
                                          </span>
                                          <span className={`font-extrabold ${isInvPaid ? 'text-emerald-700' : 'text-error'}`}>
                                            KES {invBal.toLocaleString()}
                                          </span>
                                        </div>
                                        <span className="material-symbols-outlined text-[18px] text-outline">
                                          {isExpanded ? 'expand_less' : 'expand_more'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Expanded Line Items Table */}
                                    {isExpanded && (
                                      <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/20 space-y-3">
                                        <div className="font-bold text-xs text-on-surface uppercase tracking-wider flex items-center justify-between">
                                          <span>Invoice Item Breakdown</span>
                                          <div className="flex items-center gap-2">
                                            {canManageInvoices && isHangingInvoice(inv) && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteError(null);
                                                  setInvoiceToDelete(inv);
                                                }}
                                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                                title="Delete Unsettled Hanging Invoice (0 Payments)"
                                              >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                <span>Delete Hanging Invoice</span>
                                              </button>
                                            )}
                                            <span className="text-[11px] font-normal text-on-surface-variant font-sans">
                                              Items: {inv.items?.length || 0}
                                            </span>
                                          </div>
                                        </div>
                                        {inv.items && inv.items.length > 0 ? (
                                          <div className="overflow-x-auto rounded-lg border border-outline-variant/30">
                                            <table className="w-full text-left text-xs">
                                              <thead className="bg-surface-container-low text-on-surface-variant font-semibold">
                                                <tr>
                                                  <th className="p-2.5">Item Name</th>
                                                  <th className="p-2.5">Category</th>
                                                  <th className="p-2.5 text-right">Amount (KES)</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-outline-variant/20 font-data-mono">
                                                {inv.items.map((it: any, idx: number) => (
                                                  <tr key={idx} className="hover:bg-surface-container-low/50">
                                                    <td className="p-2.5 font-medium text-on-surface font-sans">
                                                      {it.name}
                                                    </td>
                                                    <td className="p-2.5 text-on-surface-variant text-[11px] font-sans">
                                                      {it.category || 'Tuition / Statutory'}
                                                    </td>
                                                    <td className="p-2.5 text-right font-bold text-on-surface">
                                                      KES {(it.amount || 0).toLocaleString()}
                                                    </td>
                                                  </tr>
                                                ))}
                                                <tr className="bg-surface-container font-bold text-on-surface">
                                                  <td colSpan={2} className="p-2.5 text-right font-sans">
                                                    Total Invoice Amount:
                                                  </td>
                                                  <td className="p-2.5 text-right text-primary">
                                                    KES {(inv.amountPayable || inv.amountBilled || 0).toLocaleString()}
                                                  </td>
                                                </tr>
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-on-surface-variant italic">
                                            Consolidated standard term fee invoice.
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 2: PAYMENT RECEIPTS HISTORY */}
                      {activeTab === 'payments' && (
                        <div className="space-y-4">
                          {paymentsList.length === 0 ? (
                            <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl border border-outline-variant/20">
                              <span className="material-symbols-outlined text-[32px] text-outline opacity-60 mb-1">
                                credit_card_off
                              </span>
                              <p className="font-semibold text-on-surface">No payments recorded yet for this learner.</p>
                              <p className="mt-1">
                                Payments can be recorded manually or received instantly via KCB Paybill 522533.
                              </p>
                              <div className="pt-3">
                                <button
                                  type="button"
                                  onClick={() => setIsRecordPaymentOpen(true)}
                                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                                >
                                  Record First Payment
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest shadow-2xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-outline-variant/30">
                                  <tr>
                                    <th className="p-3">Receipt Code</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Channel / Method</th>
                                    <th className="p-3">Reference / Slip</th>
                                    <th className="p-3 text-right">Amount Paid</th>
                                    <th className="p-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/20 font-data-mono">
                                  {paymentsList.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-surface-container-low/50">
                                      <td className="p-3 font-bold text-primary">
                                        {p.receiptNumber || `REC-${idx + 1000}`}
                                      </td>
                                      <td className="p-3 text-on-surface-variant text-[11px]">
                                        {p.paymentDate || p.createdAt || p.paidAt || 'Recent'}
                                      </td>
                                      <td className="p-3 font-sans">
                                        <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                                          <span className="material-symbols-outlined text-[14px] text-emerald-700">
                                            check_circle
                                          </span>
                                          {p.paymentMethod || p.method || 'KCB_BUNI'}
                                        </span>
                                      </td>
                                      <td className="p-3 text-on-surface-variant text-[11px]">
                                        {p.transactionReference || p.ref || '--'}
                                      </td>
                                      <td className="p-3 text-right font-extrabold text-emerald-700 text-sm">
                                        +KES {(p.amount || 0).toLocaleString()}
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                          {p.status || 'COMPLETED'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 3: OFFICIAL PRINTABLE STATEMENT */}
                      {activeTab === 'statement' && (
                        <div className="bg-white text-slate-900 p-6 rounded-xl border border-outline-variant/30 space-y-6 shadow-sm print:m-0 print:border-none">
                          {/* Official Statement Header */}
                          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg">
                                <span className="material-symbols-outlined text-[28px]">school</span>
                              </div>
                              <div>
                                <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                                  {user?.schoolName || 'SmartShule CBC Academy'}
                                </h3>
                                <p className="text-xs text-slate-600">
                                  Official Learner Fee Statement &amp; Audit Ledger
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs text-slate-600">
                              <div>Date Generated: <strong className="text-slate-900">{new Date().toLocaleDateString()}</strong></div>
                              <div>Payment Rail: <strong className="text-emerald-800">KCB Paybill 522533</strong></div>
                            </div>
                          </div>

                          {/* Student Biodata Summary */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg text-xs border border-slate-200">
                            <div>
                              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Learner Name</span>
                              <strong className="text-slate-900 text-sm">{selectedStudent.name}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Admission No</span>
                              <strong className="text-slate-900 text-sm font-mono">{selectedStudent.admNo}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Grade / Class</span>
                              <strong className="text-slate-900 text-sm">{selectedStudent.grade} ({selectedStudent.stream || 'A'})</strong>
                            </div>
                            <div>
                              <span className="text-slate-500 uppercase text-[10px] font-semibold block">Parent / Guardian</span>
                              <strong className="text-slate-900 text-sm">{selectedStudent.guardianName} ({selectedStudent.guardianPhone})</strong>
                            </div>
                          </div>

                          {/* Running Ledger Table */}
                          <div className="space-y-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                              Transaction Journal &amp; Balance Summary
                            </h4>
                            <div className="border border-slate-300 rounded-lg overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                                  <tr>
                                    <th className="p-2.5">Date / Item</th>
                                    <th className="p-2.5">Reference Code</th>
                                    <th className="p-2.5 text-right">Debit (Billed)</th>
                                    <th className="p-2.5 text-right">Credit (Paid)</th>
                                    <th className="p-2.5 text-right">Running Bal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 font-mono text-xs">
                                  {invoicesList.map((inv, idx) => (
                                    <tr key={`inv-${idx}`}>
                                      <td className="p-2.5 font-sans">
                                        Invoice #{inv.invoiceNumber} (Term Fee)
                                      </td>
                                      <td className="p-2.5 text-slate-600">{inv.dueDate || 'Term Billed'}</td>
                                      <td className="p-2.5 text-right text-rose-700 font-bold">
                                        KES {(inv.amountPayable || inv.amountBilled || 0).toLocaleString()}
                                      </td>
                                      <td className="p-2.5 text-right text-slate-400">--</td>
                                      <td className="p-2.5 text-right font-bold text-slate-900">
                                        KES {(inv.balance || 0).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                  {paymentsList.map((p, idx) => (
                                    <tr key={`pay-${idx}`} className="bg-emerald-50/40">
                                      <td className="p-2.5 font-sans text-emerald-900">
                                        Payment: {p.paymentMethod || 'KCB Buni Paybill'}
                                      </td>
                                      <td className="p-2.5 text-emerald-800">{p.receiptNumber}</td>
                                      <td className="p-2.5 text-right text-slate-400">--</td>
                                      <td className="p-2.5 text-right text-emerald-700 font-bold">
                                        +KES {(p.amount || 0).toLocaleString()}
                                      </td>
                                      <td className="p-2.5 text-right font-bold text-slate-900">
                                        CR
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-100 font-bold text-slate-900 text-sm">
                                    <td colSpan={4} className="p-3 text-right font-sans uppercase">
                                      Net Outstanding Balance:
                                    </td>
                                    <td className={`p-3 text-right ${isCleared ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      KES {currentBalance.toLocaleString()}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Payment Instructions & Official Endorsement */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-300 text-xs">
                            <div className="space-y-1 text-slate-600">
                              <span className="font-bold text-slate-900 block">Bank &amp; Paybill Remittance:</span>
                              <div>1. Business Number: <strong>522533</strong> (KCB Buni API Platform)</div>
                              <div>2. Account Number: <strong>{kcbAccountRef}</strong></div>
                              <div>3. Direct Bank Wire: KCB Bank Kenya · A/C 1234567890</div>
                            </div>
                            <div className="text-right space-y-4 pt-2">
                              <div className="text-slate-500 italic">Official School Stamp &amp; Accounts Sign-off:</div>
                              <div className="border-b border-dashed border-slate-400 w-44 ml-auto pt-4"></div>
                              <div className="text-[11px] text-slate-700 font-semibold">Authorized Finance Officer</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Zero State: No Learner Selected */
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-10 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[36px]">search_check</span>
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-base text-on-surface">Select a Learner to Inspect Fees</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  Use the search bar above or choose a student from the matching learners panel on the left to view complete term invoices, payment receipts, balance breakdowns, and official KCB Paybill remittance references.
                </p>
              </div>

              {filteredStudents.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-on-surface-variant block mb-2">
                    Or select one from recent results:
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                    {filteredStudents.slice(0, 5).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStudent(st)}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface flex items-center gap-1.5 cursor-pointer transition-colors border border-outline-variant/30"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                        <span>{st.name}</span>
                        <span className="font-data-mono text-[11px] text-error font-bold">
                          {(st.feeBalance || 0) > 0 ? `KES ${st.feeBalance.toLocaleString()}` : 'KES 0'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* 1. KCB Buni Modal */}
      {isKcbModalOpen && selectedStudent && (
        <KcbBuniPaymentModal
          isOpen={isKcbModalOpen}
          onClose={() => setIsKcbModalOpen(false)}
          students={students}
          initialStudent={selectedStudent}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* 2. Manual Payment Record Modal (Cash / Bank Deposit / Slip / Cheque) */}
      {isRecordPaymentOpen && selectedStudent && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          students={students}
          initialStudent={selectedStudent}
          onPaymentRecorded={handlePaymentSuccess}
        />
      )}

      {/* 3. Delete Hanging Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-rose-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <h3 className="font-semibold text-sm">Delete Hanging Invoice</h3>
              </div>
              <button
                onClick={() => {
                  if (!isDeletingInvoice) {
                    setInvoiceToDelete(null);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeletingInvoice}
                className="text-rose-100 hover:text-white cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-on-surface">
                Are you sure you want to delete invoice <strong className="font-data-mono text-primary">#{invoiceToDelete.invoiceNumber}</strong>?
              </p>

              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-2 font-data-mono">
                <div className="flex justify-between text-on-surface-variant font-sans">
                  <span>Student / Adm:</span>
                  <span className="font-semibold text-on-surface">
                    {selectedStudent?.name || invoiceToDelete.studentId} ({selectedStudent?.admNo || ''})
                  </span>
                </div>
                <div className="flex justify-between text-on-surface-variant font-sans">
                  <span>Billed Amount:</span>
                  <span className="font-bold text-on-surface">
                    KES {(invoiceToDelete.amountPayable || invoiceToDelete.amountBilled || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-on-surface-variant font-sans">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-emerald-700">
                    KES {(invoiceToDelete.amountPaid || 0).toLocaleString()} (0 Payments)
                  </span>
                </div>
                <div className="flex justify-between text-on-surface-variant font-sans">
                  <span>Status:</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] uppercase">
                    {invoiceToDelete.status} (Hanging)
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[11px] flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">info</span>
                <span>
                  This action removes this unsettled billing entry from the ledger. Only hanging invoices with <strong>zero payments recorded</strong> can be deleted. This action cannot be undone.
                </span>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm shrink-0">error</span>
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeletingInvoice}
                  className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteInvoice}
                  disabled={isDeletingInvoice}
                  className="px-4 py-2 bg-error hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingInvoice ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
