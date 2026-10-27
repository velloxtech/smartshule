import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, StudentInvoice, UserRole, FeeStructure } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { LearnerFeeCollectionDesk } from './LearnerFeeCollectionDesk';

export interface StudentFeeCheckerViewProps {
  students: Student[];
  onRefreshStudents?: () => void | Promise<void>;
  initialStudentId?: string;
}

export interface StudentFinancials {
  isSponsored: boolean;
  billed: number;
  priorArrears: number;
  totalDue: number;
  paid: number;
  balance: number;
  arrearsDue: number;
  overpayment: number;
  status: 'SPONSORED' | 'OVERPAID' | 'CLEARED' | 'PARTIAL' | 'ARREARS' | 'UNBILLED';
  statusLabel?: string;
}

export const getStudentFinancials = (
  s: Student,
  selectedTerm: 'term-1' | 'term-2' | 'term-3' | 'ALL' = 'term-3',
  feeStructures: FeeStructure[] = [],
  backendAccount?: any
): StudentFinancials => {
  const isSponsored = Boolean(s.isSponsored || (s as any).sponsorship || backendAccount?.isSponsored);
  if (isSponsored) {
    return {
      isSponsored: true,
      billed: 0,
      priorArrears: 0,
      totalDue: 0,
      paid: 0,
      balance: 0,
      arrearsDue: 0,
      overpayment: 0,
      status: 'SPONSORED',
      statusLabel: '100% Scholarship (Exempt)',
    };
  }

  if (backendAccount) {
    const billed = Number(backendAccount.billedFees) || 0;
    const priorArrears = Number(backendAccount.priorArrears) || 0;
    const totalDue = Number(backendAccount.totalDue) || 0;
    const paid = Number(backendAccount.paidFees) || 0;
    const balance = Math.max(0, Number(backendAccount.balance) || 0);
    const overpayment = Number(backendAccount.overpaymentCredit) || 0;
    const status = backendAccount.status || (overpayment > 0 && balance === 0 ? 'OVERPAID' : balance === 0 && priorArrears === 0 ? 'CLEARED' : paid > 0 ? 'PARTIAL' : 'ARREARS');
    const statusLabel = backendAccount.statusLabel || (status === 'CLEARED' ? 'Fees Cleared' : status === 'OVERPAID' ? `Advance Credit (+KES ${overpayment.toLocaleString()})` : balance > 0 && priorArrears > 0 && paid >= billed ? 'Current Term Cleared, Arrears Remain' : status === 'PARTIAL' ? 'Partially Paid' : 'Arrears Outstanding');
    return {
      isSponsored: false,
      billed,
      priorArrears,
      totalDue,
      paid,
      balance,
      arrearsDue: balance,
      overpayment,
      status,
      statusLabel,
    };
  }

  // 1. Resolve Fee Billed from Fee Structure according to the term
  let billed = 0;
  if (feeStructures && feeStructures.length > 0) {
    const sGrade = (s.grade || (s as any).gradeLevel || '').toUpperCase();
    const matchFs = feeStructures.find((fs) => {
      const fsGrade = (fs.gradeLevel || '').toUpperCase();
      const gradeMatch = fsGrade === sGrade || fsGrade.replace(/_/g, ' ') === sGrade.replace(/_/g, ' ');
      if (!gradeMatch) return false;
      const fsTerm = String(fs.termId || '').toLowerCase();
      const selTermStr = String(selectedTerm).toLowerCase();
      return fsTerm === selTermStr || (selectedTerm !== 'ALL' && (fsTerm.includes(selTermStr.replace('term-', 't')) || fsTerm.includes(selTermStr)));
    }) || feeStructures.find((fs) => {
      const fsGrade = (fs.gradeLevel || '').toUpperCase();
      return fsGrade === sGrade || fsGrade.replace(/_/g, ' ') === sGrade.replace(/_/g, ' ');
    });

    if (matchFs) {
      const isTermStructure = matchFs.termId && matchFs.termId !== 'ALL' && matchFs.termId !== 'ANNUAL';
      if (isTermStructure) {
        billed = matchFs.totalAmount || matchFs.items?.reduce((acc: number, it: any) => acc + (Number(it.amount) || 0), 0) || 0;
      } else if (selectedTerm === 'term-1') {
        billed = matchFs.term1Total !== undefined
          ? matchFs.term1Total
          : (matchFs.termBreakdown?.term1 !== undefined ? matchFs.termBreakdown.term1 : (matchFs.totalAmount || 0));
      } else if (selectedTerm === 'term-2') {
        billed = matchFs.term2Total !== undefined
          ? matchFs.term2Total
          : (matchFs.termBreakdown?.term2 !== undefined ? matchFs.termBreakdown.term2 : (matchFs.totalAmount || 0));
      } else if (selectedTerm === 'term-3') {
        billed = matchFs.term3Total !== undefined
          ? matchFs.term3Total
          : (matchFs.termBreakdown?.term3 !== undefined ? matchFs.termBreakdown.term3 : (matchFs.totalAmount || 0));
      } else {
        // Whole Year (All terms)
        billed = matchFs.totalAmount || matchFs.items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      }
    }
  }

  if (billed === 0 && s.totalFee !== undefined && s.totalFee !== null && Number(s.totalFee) > 0) {
    billed = Number(s.totalFee);
  }

  // 2. Prior Arrears (opening/carried forward arrears, distinct from term fee structure billed fee)
  const priorArrears = Math.max(0, Number((s as any).priorArrears) || 0);

  // 3. Total Due (Billed Fees + Prior Arrears)
  const totalDue = Math.max(0, Math.round((billed + priorArrears) * 100) / 100);

  // 4. Paid Fees
  let paid = 0;
  if ((s as any).totalPaid !== undefined && (s as any).totalPaid !== null) {
    paid = Number((s as any).totalPaid) || 0;
  } else if ((s as any).amountPaid !== undefined && (s as any).amountPaid !== null) {
    paid = Number((s as any).amountPaid) || 0;
  } else {
    const rawBalance = Number(s.feeBalance) || 0;
    if (rawBalance < 0) {
      paid = totalDue + Math.abs(rawBalance);
    } else {
      paid = Math.max(0, totalDue - rawBalance);
    }
  }

  // 5. Balance (Amount still owed) & Overpayment / Prepayment Credit
  let balance = 0;
  let overpayment = (s as any).creditBalance ? Number((s as any).creditBalance) : 0;

  if (paid > totalDue) {
    const excess = Math.round((paid - totalDue) * 100) / 100;
    overpayment = Math.round((overpayment + excess) * 100) / 100;
    balance = 0;
  } else {
    balance = Math.round((totalDue - paid) * 100) / 100;
  }

  // 6. Financial Status
  let status: StudentFinancials['status'];
  let statusLabel = 'Arrears Outstanding';
  if (overpayment > 0 && balance === 0) {
    status = 'OVERPAID';
    statusLabel = `Advance Credit (+KES ${overpayment.toLocaleString()})`;
  } else if (balance === 0 && priorArrears === 0 && (paid > 0 || totalDue > 0)) {
    status = 'CLEARED';
    statusLabel = 'Fees Cleared';
  } else if (billed === 0 && priorArrears === 0 && balance === 0) {
    status = 'UNBILLED';
    statusLabel = 'Not Billed';
  } else if (balance > 0 && priorArrears > 0 && paid >= billed) {
    status = 'PARTIAL';
    statusLabel = 'Current Term Cleared, Arrears Remain';
  } else if (paid > 0 && balance > 0) {
    status = 'PARTIAL';
    statusLabel = 'Partially Paid';
  } else {
    status = 'ARREARS';
    statusLabel = 'Arrears Outstanding';
  }

  return {
    isSponsored: false,
    billed,
    priorArrears,
    totalDue,
    paid,
    balance,
    arrearsDue: balance,
    overpayment,
    status,
    statusLabel,
  };
};

export const StudentFeeCheckerView: React.FC<StudentFeeCheckerViewProps> = ({
  students = [],
  onRefreshStudents,
  initialStudentId,
}) => {
  const { user } = useAuth();

  // Mode: Director & Cashier Fast-Track Desk vs Full Roster Accounting Ledger
  const [viewMode, setViewMode] = useState<'cashier_desk' | 'full_roster'>('cashier_desk');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedStream, setSelectedStream] = useState('All');
  const [selectedTerm, setSelectedTerm] = useState<'term-1' | 'term-2' | 'term-3' | 'ALL'>('term-3');
  const [selectedStatus, setSelectedStatus] = useState<
    'All' | 'Has_Balance' | 'Overpaid' | 'Cleared' | 'Sponsored'
  >('All');
  const [sortBy, setSortBy] = useState<
    'balance_desc' | 'overpaid_desc' | 'billed_desc' | 'name' | 'adm'
  >('balance_desc');

  // Fee Structures & Academic Context State
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [studentAccounts, setStudentAccounts] = useState<Map<string, any>>(new Map());
  const [accountsSummary, setAccountsSummary] = useState<any | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isApplyingCredit, setIsApplyingCredit] = useState(false);
  const [creditActionFeedback, setCreditActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiService.getCurrentContext()
      .then((res) => {
        if (isMounted && res?.success && res.data) {
          setCurrentContext(res.data);
          if (res.data.currentTerm) {
            const tNum = res.data.currentTerm.termNumber;
            if (tNum === 1) setSelectedTerm('term-1');
            else if (tNum === 2) setSelectedTerm('term-2');
            else if (tNum === 3) setSelectedTerm('term-3');
          }
        }
      })
      .catch(() => {});

    apiService.getFeeStructures()
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setFeeStructures(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Authoritative Backend Student Fee Accounts for selected term
  const loadStudentAccounts = async () => {
    try {
      setIsLoadingAccounts(true);
      const res = await apiService.getStudentFeeAccounts({ termId: selectedTerm });
      if (res?.success && res.data) {
        const map = new Map<string, any>();
        if (Array.isArray(res.data.accounts)) {
          res.data.accounts.forEach((acc: any) => map.set(acc.studentId, acc));
        }
        setStudentAccounts(map);
        setAccountsSummary(res.data.summary || null);
      }
    } catch (err) {
      console.warn('Could not load student fee accounts for term', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadStudentAccounts();
  }, [selectedTerm]);

  // Synchronize fee accounts whenever switching to full roster view
  useEffect(() => {
    if (viewMode === 'full_roster') {
      loadStudentAccounts();
    }
  }, [viewMode]);

  // Re-fetch fee accounts whenever student prop list updates
  useEffect(() => {
    loadStudentAccounts();
  }, [students]);

  const handleRefreshAll = async () => {
    if (onRefreshStudents) {
      await onRefreshStudents();
    }
    await loadStudentAccounts();
  };

  // Modals & Active Student State
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);

  // Statement Inspection Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementStudent, setStatementStudent] = useState<Student | null>(null);
  const [statementData, setStatementData] = useState<any | null>(null);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [statementTab, setStatementTab] = useState<'invoices' | 'payments' | 'statement' | 'credits'>('invoices');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Billing Authorization & Deletion State (Inside Statement Modal)
  const isGuardian = user?.role === UserRole.GUARDIAN || user?.role === UserRole.PARENT;
  const canManageInvoices = !isGuardian;
  const isBillingAuthorized = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.BURSAR,
    UserRole.ACCOUNTANT
  ].includes(user?.role as UserRole);

  const [isAuthorizingBilling, setIsAuthorizingBilling] = useState(false);
  const [billingAuthFeedback, setBillingAuthFeedback] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<StudentInvoice | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Distinct grades & streams for filtering
  const distinctGrades = useMemo(() => {
    const grades = new Set<string>();
    students.forEach((s) => {
      if (s.grade) grades.add(s.grade);
    });
    return Array.from(grades).sort();
  }, [students]);

  const distinctStreams = useMemo(() => {
    const streams = new Set<string>();
    students.forEach((s) => {
      if (s.stream) streams.add(s.stream);
    });
    return Array.from(streams).sort();
  }, [students]);

  // Handle Initial Student Selection if provided
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const found = students.find((s) => s.id === initialStudentId);
      if (found) {
        handleOpenStatementModal(found);
      }
    }
  }, [initialStudentId, students]);

  // Filtered & Sorted Student List
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

        // Stream Filter
        if (selectedStream !== 'All' && s.stream !== selectedStream) {
          return false;
        }

        // Status Filter
        const fin = getStudentFinancials(s, selectedTerm, feeStructures, studentAccounts.get(s.id));
        if (selectedStatus === 'Has_Balance' && fin.balance <= 0) {
          return false;
        }
        if (selectedStatus === 'Overpaid' && fin.overpayment <= 0) {
          return false;
        }
        if (selectedStatus === 'Cleared') {
          // Show cleared students as well as scholarship program learners whose fees are clear
          if (!fin.isSponsored && fin.status !== 'CLEARED') {
            return false;
          }
        }
        if (selectedStatus === 'Sponsored' && !fin.isSponsored) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aFin = getStudentFinancials(a, selectedTerm, feeStructures, studentAccounts.get(a.id));
        const bFin = getStudentFinancials(b, selectedTerm, feeStructures, studentAccounts.get(b.id));

        if (sortBy === 'balance_desc') return bFin.balance - aFin.balance;
        if (sortBy === 'overpaid_desc') return bFin.overpayment - aFin.overpayment;
        if (sortBy === 'billed_desc') return bFin.billed - aFin.billed;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'adm') return (a.admNo || '').localeCompare(b.admNo || '');
        return 0;
      });
  }, [students, searchQuery, selectedGrade, selectedStream, selectedTerm, selectedStatus, sortBy, feeStructures, studentAccounts]);

  // Aggregate Ledger Totals
  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalPriorArrears = 0;
    let totalDue = 0;
    let totalPaid = 0;
    let totalArrears = 0;
    let totalOverpayment = 0;
    let clearedCount = 0;
    let overpaidCount = 0;
    let arrearsCount = 0;
    let sponsoredCount = 0;

    filteredStudents.forEach((s) => {
      const fin = getStudentFinancials(s, selectedTerm, feeStructures, studentAccounts.get(s.id));
      totalBilled += fin.billed;
      totalPriorArrears += fin.priorArrears;
      totalDue += fin.totalDue;
      totalPaid += fin.paid;
      if (fin.balance > 0) {
        totalArrears += fin.balance;
        arrearsCount++;
      }
      if (fin.overpayment > 0) {
        totalOverpayment += fin.overpayment;
        overpaidCount++;
      }

      if (fin.status === 'CLEARED' || fin.isSponsored) clearedCount++;
      if (fin.isSponsored) sponsoredCount++;
    });

    const collectionRate = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;

    return {
      totalBilled,
      totalPriorArrears,
      totalDue,
      totalPaid,
      totalArrears,
      totalOverpayment,
      clearedCount,
      overpaidCount,
      arrearsCount,
      sponsoredCount,
      collectionRate,
    };
  }, [filteredStudents, selectedTerm, feeStructures, studentAccounts]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open Statement Modal
  const handleOpenStatementModal = (st: Student) => {
    setStatementStudent(st);
    setIsStatementModalOpen(true);
    setStatementTab('invoices');
    setIsLoadingStatement(true);
    setStatementError(null);
    setStatementData(null);

    apiService
      .getFeeStatement(st.id)
      .then((res) => {
        if (res?.success && res.data) {
          setStatementData(res.data);
        }
      })
      .catch((err) => {
        console.warn('Could not load detailed statement, fallback to student data:', err);
        setStatementError('Could not fetch real-time invoice breakdown. Showing basic student balance data.');
      })
      .finally(() => {
        setIsLoadingStatement(false);
      });
  };

  // Payment Recording Success Callback
  const handlePaymentSuccess = async () => {
    setIsRecordPaymentOpen(false);
    setSelectedStudentForPayment(null);
    if (onRefreshStudents) {
      await onRefreshStudents();
    }
    await loadStudentAccounts();
    if (statementStudent) {
      apiService.getFeeStatement(statementStudent.id).then((res) => {
        if (res?.success && res.data) setStatementData(res.data);
      }).catch(() => {});
    }
  };

  // Authorize Billing Handler
  const handleAuthorizeBilling = async () => {
    if (!statementStudent) return;
    setIsAuthorizingBilling(true);
    setBillingAuthFeedback(null);
    try {
      const yearId = currentContext?.currentYear?.id;
      let termId = currentContext?.currentTerm?.id;
      if (selectedTerm === 'term-1') {
        const found = currentContext?.yearTerms?.find((t: any) => t.termNumber === 1 || t.id.includes('t1') || t.id.includes('term-1'));
        termId = found ? found.id : 'term-1';
      } else if (selectedTerm === 'term-2') {
        const found = currentContext?.yearTerms?.find((t: any) => t.termNumber === 2 || t.id.includes('t2') || t.id.includes('term-2'));
        termId = found ? found.id : 'term-2';
      } else if (selectedTerm === 'term-3') {
        const found = currentContext?.yearTerms?.find((t: any) => t.termNumber === 3 || t.id.includes('t3') || t.id.includes('term-3'));
        termId = found ? found.id : 'term-3';
      }

      const res = await apiService.generateInvoices({
        studentId: statementStudent.id,
        schoolId: (statementStudent as any).schoolId || 'school-001',
        academicYearId: yearId,
        termId: termId,
      });
      if (res.success) {
        setBillingAuthFeedback(`Student successfully authorized and billed for ${selectedTerm.toUpperCase()}.`);
        const statementRes = await apiService.getFeeStatement(statementStudent.id).catch(() => null);
        if (statementRes?.success && statementRes.data) {
          setStatementData(statementRes.data);
        }
        if (onRefreshStudents) {
          await onRefreshStudents();
        }
        await loadStudentAccounts();
        setTimeout(() => setBillingAuthFeedback(null), 5000);
      } else {
        setBillingAuthFeedback(res.message || 'Failed to authorize billing for student.');
      }
    } catch (err: any) {
      setBillingAuthFeedback(err.message || 'Error authorizing student billing.');
    } finally {
      setIsAuthorizingBilling(false);
    }
  };

  // Apply Traceable Overpayment Credit to Invoice Handler
  const handleApplyCredit = async (creditId: string, invoiceId: string, amount?: number) => {
    if (!statementStudent) return;
    setIsApplyingCredit(true);
    setCreditActionFeedback(null);
    try {
      const res = await apiService.applyCreditToInvoice({
        creditId,
        studentId: statementStudent.id,
        invoiceId,
        amount
      });
      if (res.success) {
        setCreditActionFeedback(res.message || 'Credit applied successfully to invoice.');
        const statementRes = await apiService.getFeeStatement(statementStudent.id).catch(() => null);
        if (statementRes?.success && statementRes.data) {
          setStatementData(statementRes.data);
        }
        if (onRefreshStudents) {
          await onRefreshStudents();
        }
        await loadStudentAccounts();
        setTimeout(() => setCreditActionFeedback(null), 6000);
      } else {
        setCreditActionFeedback(res.message || 'Failed to apply credit to invoice.');
      }
    } catch (err: any) {
      setCreditActionFeedback(err.message || 'Error applying credit.');
    } finally {
      setIsApplyingCredit(false);
    }
  };

  // Delete Hanging Invoice Handler
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
      if (statementStudent) {
        const statementRes = await apiService.getFeeStatement(statementStudent.id).catch(() => null);
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

  // --------------------------------------------------------------------------
  // PDF EXPORT 1: FULL ROSTER / LEDGER PDF (LANDSCAPE A4 with Accounting Grid)
  // --------------------------------------------------------------------------
  const handleDownloadLedgerPdf = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Burgundy Header Bar
    doc.setFillColor(122, 18, 40); // #7a1228
    doc.rect(0, 0, 297, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('GRACE SEEDS SCHOOL — STUDENT FINANCES & FEE LEDGER', 14, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const termLabel = selectedTerm === 'term-1' ? 'Term 1' : selectedTerm === 'term-2' ? 'Term 2' : selectedTerm === 'term-3' ? 'Term 3' : 'Whole Year';
    doc.text(
      `Official Institutional Fee Register | Grade: ${selectedGrade} | Term: ${termLabel} | Generated: ${new Date().toLocaleDateString()} | Audited Ledger`,
      14,
      15
    );

    const head = [[
      '#',
      'Adm No',
      'Learner Name',
      'Grade',
      'Stream',
      'Billed Fees (KES)',
      'Prior Arrears (KES)',
      'Total Due (KES)',
      'Paid Fees (KES)',
      'Balance (KES)',
      'Overpayment / Credit (KES)',
      'Financial Status'
    ]];

    const body = filteredStudents.map((s, idx) => {
      const fin = getStudentFinancials(s, selectedTerm, feeStructures);
      return [
        idx + 1,
        s.admNo || '--',
        s.name + (fin.isSponsored ? ' [100% SCHOLARSHIP · FEE CLEARED]' : ''),
        s.grade || '--',
        s.stream || '--',
        fin.isSponsored ? '0 (Waived)' : fin.billed.toLocaleString(),
        fin.isSponsored ? '0' : fin.priorArrears.toLocaleString(),
        fin.isSponsored ? '0' : fin.totalDue.toLocaleString(),
        fin.paid.toLocaleString(),
        fin.isSponsored ? '0 (Cleared)' : fin.balance < 0 ? `-${Math.abs(fin.balance).toLocaleString()}` : fin.balance.toLocaleString(),
        fin.overpayment > 0 ? `+${fin.overpayment.toLocaleString()}` : '--',
        fin.isSponsored
          ? 'CLEARED · 100% SCHOLARSHIP'
          : fin.status === 'OVERPAID'
          ? `OVERPAID (-KES ${Math.abs(fin.balance).toLocaleString()})`
          : fin.status === 'CLEARED'
          ? 'CLEARED'
          : fin.status === 'PARTIAL'
          ? 'PARTIALLY PAID'
          : 'ARREARS DUE'
      ];
    });

    const foot = [[
      '∑',
      'TOTALS',
      `${filteredStudents.length} Learners`,
      '--',
      '--',
      `KES ${stats.totalBilled.toLocaleString()}`,
      `KES ${stats.totalPriorArrears.toLocaleString()}`,
      `KES ${stats.totalDue.toLocaleString()}`,
      `KES ${stats.totalPaid.toLocaleString()}`,
      `KES ${stats.totalArrears.toLocaleString()}`,
      `+KES ${stats.totalOverpayment.toLocaleString()}`,
      `Rate: ${stats.collectionRate}% | Cleared: ${stats.clearedCount}`
    ]];

    autoTable(doc, {
      startY: 22,
      head,
      body,
      foot,
      theme: 'grid',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [180, 180, 180],
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [31, 41, 55],
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [209, 213, 219],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      footStyles: {
        fillColor: [243, 244, 246],
        textColor: [122, 18, 40],
        fontStyle: 'bold',
        fontSize: 7,
        lineWidth: 0.2,
        lineColor: [100, 100, 100],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 16 },
        2: { cellWidth: 36, fontStyle: 'bold' },
        3: { cellWidth: 18 },
        4: { cellWidth: 16 },
        5: { halign: 'right' },
        6: { halign: 'right', textColor: [180, 83, 9] },
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
        9: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
        10: { halign: 'right', fontStyle: 'bold', textColor: [13, 148, 136] },
        11: { cellWidth: 26 },
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount} — Grace Seeds School · KCB Paybill: 522533 · Official Confidential Ledger`,
          14,
          205
        );
      },
    });

    doc.save(`Grace_Seeds_School_Student_Finances_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --------------------------------------------------------------------------
  // PDF EXPORT 2: INDIVIDUAL STUDENT FEE STATEMENT & AUDIT SLIP (PORTRAIT A4)
  // --------------------------------------------------------------------------
  const handleDownloadStudentStatementPdf = (st: Student) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const fin = getStudentFinancials(st);

    // Burgundy Header
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('GRACE SEEDS SCHOOL', 14, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Official Learner Fee Statement & Ledger Advice', 14, 16);
    doc.text('KEMRI Street, Kisian, Kisumu, Kenya | Tel: 0745436312 | Email: schoolgraceseeds@gmail.com', 14, 20);

    // Learner Details Card
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LEARNER & PAYMENT DETAILS', 14, 32);

    autoTable(doc, {
      startY: 34,
      body: [
        [
          { content: 'Learner Name:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: st.name, styles: { fontStyle: 'bold' } },
          { content: 'Admission No:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: st.admNo || '--', styles: { fontStyle: 'bold' } }
        ],
        [
          { content: 'Grade / Class:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: `${st.grade || '--'}${st.stream ? ` (${st.stream})` : ''}` },
          { content: 'KCB Paybill Shortcode:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: '522533', styles: { fontStyle: 'bold', textColor: [0, 106, 64] } }
        ],
        [
          { content: 'Parent / Guardian:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: `${st.guardianName || '--'} (${st.guardianPhone || '--'})` },
          { content: 'Buni Account Code:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: `8048859#${st.name} ${st.grade || ''}`.trim(), styles: { fontStyle: 'bold', textColor: [0, 106, 64] } }
        ]
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    // Financial Position Table
    const afterBiodataY = (doc as any).lastAutoTable.finalY + 6;
    doc.text('FINANCIAL POSITION & RECONCILIATION', 14, afterBiodataY);

    autoTable(doc, {
      startY: afterBiodataY + 2,
      head: [['Billed Fees', 'Prior Arrears', 'Total Payable', 'Fees Paid', 'Outstanding Arrears', 'Overpayment / Credit', 'Clearance Status']],
      body: [[
        `KES ${fin.billed.toLocaleString()}`,
        `KES ${fin.priorArrears.toLocaleString()}`,
        `KES ${fin.totalDue.toLocaleString()}`,
        `KES ${fin.paid.toLocaleString()}`,
        `KES ${fin.arrearsDue.toLocaleString()}`,
        fin.overpayment > 0 ? `+KES ${fin.overpayment.toLocaleString()}` : 'KES 0',
        fin.status === 'SPONSORED'
          ? '100% SCHOLARSHIP'
          : fin.status === 'OVERPAID'
          ? 'OVERPAID (Credit)'
          : fin.status === 'CLEARED'
          ? 'CLEARED'
          : fin.status === 'PARTIAL'
          ? 'PARTIALLY PAID'
          : 'ARREARS DUE'
      ]],
      theme: 'grid',
      headStyles: { fillColor: [122, 18, 40], textColor: [255, 255, 255], fontSize: 7, halign: 'center' },
      bodyStyles: { fontSize: 8, halign: 'center', fontStyle: 'bold' },
    });

    // Footer Sign-off
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Official Verified Record · Grace Seeds School Accounts Office', 14, finalY);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Thank you for supporting your child's education.`, 14, finalY + 5);

    doc.save(`Fee_Statement_${st.admNo || 'learner'}_${st.name.replace(/\s+/g, '_')}.pdf`);
  };

  const studentGradeStr = statementStudent?.grade || (statementStudent as any)?.gradeLevel || '';
  const kcbAccountRef = statementStudent?.name
    ? `8048859#${statementStudent.name}${studentGradeStr ? ' ' + studentGradeStr : ''}`.trim()
    : `8048859#${statementStudent?.admNo || ''}`;

  const invoicesList: StudentInvoice[] = statementData?.invoices || [];
  const paymentsList: any[] = statementData?.payments || [];
  const creditsList: any[] = statementData?.credits || [];
  const applicationsList: any[] = statementData?.creditApplications || [];
  const availableCreditAmount: number = statementData?.summary?.availableCredit ?? (
    creditsList
      .filter((c: any) => c.status === 'AVAILABLE' || c.status === 'PARTIALLY_USED')
      .reduce((sum: number, c: any) => sum + (Number(c.balance) || 0), 0)
  );
  const activeSponsorship = statementData?.sponsorship || (statementStudent as any)?.sponsorship || null;

  return (
    <div className="space-y-4 pb-16 font-body">
      {/* 0. Top Mode Selector: Cashier Fast-Track Desk vs All Students Accounting Ledger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#7a1228] text-white flex items-center justify-center font-bold shrink-0">
            <span className="material-symbols-outlined text-[20px]">
              {viewMode === 'cashier_desk' ? 'point_of_sale' : 'table_rows'}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {viewMode === 'cashier_desk' ? 'Fee Collection & Cashier Desk' : 'Full Student Finances & Fee Register'}
            </div>
            <div className="text-[11px] text-slate-500">
              {viewMode === 'cashier_desk'
                ? 'Search a learner, view fee position, record payment, and issue receipts'
                : 'Comprehensive institutional accounting ledger with multi-column grid and PDF exports'}
            </div>
          </div>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cashier_desk')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'cashier_desk'
                ? 'bg-[#7a1228] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:text-[#7a1228] font-semibold'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span>Fee Collection (Cashier Desk)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('full_roster')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'full_roster'
                ? 'bg-[#7a1228] text-white shadow-xs font-bold'
                : 'text-slate-700 hover:text-[#7a1228] font-semibold'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">table_rows</span>
            <span>Full Ledger & Class Roster</span>
          </button>
        </div>
      </div>

      {viewMode === 'cashier_desk' ? (
        <LearnerFeeCollectionDesk
          students={students}
          onRefreshStudents={handleRefreshAll}
          initialStudentId={initialStudentId}
          onNavigateToFullLedger={() => {
            setViewMode('full_roster');
            loadStudentAccounts();
          }}
        />
      ) : (
        <>
      {/* 1. Header Toolbar with Title & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-slate-500">
            <span>Home</span>
            <span>/</span>
            <span>Finance &amp; Billing</span>
            <span>/</span>
            <span className="text-[#7a1228] font-bold">Student Finances &amp; Ledger</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Student Finances &amp; Fee Register
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              KCB Paybill 522533
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 font-mono">
              Accounting Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single unified institutional ledger to manage all enrolled learners&apos; fee schedules, prior arrears, collections, overpayment advance credits, and official statements.
          </p>
        </div>

        {/* Global Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Ledger Button */}
          <button
            type="button"
            onClick={loadStudentAccounts}
            disabled={isLoadingAccounts}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Refresh student fee accounts and payments from database"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary ${isLoadingAccounts ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{isLoadingAccounts ? 'Refreshing...' : 'Refresh Ledger'}</span>
          </button>

          {/* Download Official PDF Ledger */}
          <button
            type="button"
            onClick={handleDownloadLedgerPdf}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Download Landscape A4 PDF Ledger of all filtered learners"
          >
            <span className="material-symbols-outlined text-[16px] text-[#7a1228]">picture_as_pdf</span>
            <span>Export Ledger PDF</span>
          </button>

          {/* Record Fee Payment / Arrears Shortcut */}
          <button
            type="button"
            onClick={() => {
              setSelectedStudentForPayment(students.length > 0 ? students[0] : null);
              setIsRecordPaymentOpen(true);
            }}
            className="px-4 py-2 bg-[#7a1228] hover:bg-[#600e1f] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_card</span>
            <span>Record Fee / Arrear</span>
          </button>
        </div>
      </div>

      {/* 2. High-Density KPI Accounting Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Learners
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            {filteredStudents.length} <span className="text-[10px] font-normal text-slate-400">/ {students.length}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Active Roster</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Billed Fees
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            KES {stats.totalBilled.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">Term Fee Schedules</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Prior Arrears
          </span>
          <div className="text-lg font-bold font-mono text-amber-900 mt-0.5">
            KES {stats.totalPriorArrears.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-700 mt-0.5 block truncate">Carried Balances</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
            Total Receivables
          </span>
          <div className="text-lg font-extrabold font-mono text-slate-900 mt-0.5">
            KES {stats.totalDue.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block truncate">Total Liability</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Paid &amp; Reconciled
          </span>
          <div className="text-lg font-extrabold font-mono text-emerald-700 mt-0.5">
            KES {stats.totalPaid.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block truncate">
            {stats.collectionRate}% Collection Rate
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
            Arrears Due
          </span>
          <div className="text-lg font-extrabold font-mono text-rose-700 mt-0.5">
            KES {stats.totalArrears.toLocaleString()}
          </div>
          <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block truncate">
            {stats.arrearsCount} Learner(s)
          </span>
        </div>

        <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 shadow-2xs">
          <span className="text-[10px] font-bold text-teal-900 uppercase tracking-wider block flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">savings</span>
            Overpayment / Credit
          </span>
          <div className="text-lg font-black font-mono text-teal-800 mt-0.5">
            +KES {stats.totalOverpayment.toLocaleString()}
          </div>
          <span className="text-[10px] text-teal-700 font-semibold mt-0.5 block truncate">
            {stats.overpaidCount} Advance Credit(s)
          </span>
        </div>

        {/* 8th Card: Sponsored Learners in Institutional Scholarship Program */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Sponsored' ? 'All' : 'Sponsored')}
          className={`p-3 rounded-xl border shadow-2xs cursor-pointer transition-all ${
            selectedStatus === 'Sponsored'
              ? 'bg-[#7a1228] text-white border-[#7a1228] ring-2 ring-[#7a1228]/40'
              : 'bg-rose-50/40 hover:bg-rose-50 border-rose-200 text-slate-900'
          }`}
          title="Click to filter learners under the 100% Scholarship Program"
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block flex items-center gap-1 ${
            selectedStatus === 'Sponsored' ? 'text-rose-100' : 'text-[#7a1228]'
          }`}>
            <span className="material-symbols-outlined text-[13px]">workspace_premium</span>
            Scholarship
          </span>
          <div className="text-lg font-black font-mono mt-0.5">
            {stats.sponsoredCount} <span className={`text-[10px] font-normal ${selectedStatus === 'Sponsored' ? 'text-rose-200' : 'text-slate-400'}`}>Learner(s)</span>
          </div>
          <span className={`text-[10px] mt-0.5 block truncate ${selectedStatus === 'Sponsored' ? 'text-rose-200 font-semibold' : 'text-slate-500'}`}>
            100% Fee Waived
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Real-Time Search Input */}
          <div className="lg:col-span-4 relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#7a1228] text-[18px]">
              person_search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search learner name, admission no, UPI, grade, stream, parent phone..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                title="Clear Search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Academic Term Filter (Distinguish fee billed according to term from fee structure) */}
          <div className="lg:col-span-2">
            <div className="relative">
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value as any)}
                className="w-full py-2 pl-7 pr-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7a1228] cursor-pointer"
                title="Distinguish fee billed from fee structure according to term"
              >
                <option value="term-1">Term 1 Schedule{currentContext?.currentTerm?.termNumber === 1 ? ' (Active Term)' : ''}</option>
                <option value="term-2">Term 2 Schedule{currentContext?.currentTerm?.termNumber === 2 ? ' (Active Term)' : ''}</option>
                <option value="term-3">Term 3 Schedule{currentContext?.currentTerm?.termNumber === 3 ? ' (Active Term)' : ''}</option>
                <option value="ALL">Whole Year (Annual Total)</option>
              </select>
              <span className="material-symbols-outlined absolute left-2 top-2 text-[#7a1228] text-[15px] pointer-events-none">
                calendar_month
              </span>
            </div>
          </div>

          {/* Grade Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7a1228] cursor-pointer"
            >
              <option value="All">All Grades ({distinctGrades.length})</option>
              {distinctGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Stream Filter */}
          <div className="lg:col-span-1">
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="w-full py-2 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7a1228] cursor-pointer"
            >
              <option value="All">All Streams</option>
              {distinctStreams.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full py-2 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7a1228] cursor-pointer"
            >
              <option value="All">All Financial Statuses</option>
              <option value="Has_Balance">Outstanding Arrears (Debtors)</option>
              <option value="Overpaid">Overpaid (Credit Balance)</option>
              <option value="Cleared">Fully Cleared (Zero Balance)</option>
              <option value="Sponsored">100% Scholarship / Sponsored</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="lg:col-span-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#7a1228] cursor-pointer"
            >
              <option value="balance_desc">Highest Arrears</option>
              <option value="overpaid_desc">Highest Overpaid</option>
              <option value="billed_desc">Highest Billed</option>
              <option value="name">Name (A-Z)</option>
              <option value="adm">Adm No</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Buttons & Results strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedStatus('All')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                selectedStatus === 'All' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('Has_Balance')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                selectedStatus === 'Has_Balance' ? 'bg-rose-700 text-white shadow-2xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              Has Balance ({stats.arrearsCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('Cleared')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                selectedStatus === 'Cleared' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Cleared ({stats.clearedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('Overpaid')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                selectedStatus === 'Overpaid' ? 'bg-teal-700 text-white shadow-2xs' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              Overpaid ({stats.overpaidCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus('Sponsored')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                selectedStatus === 'Sponsored' ? 'bg-[#7a1228] text-white shadow-2xs' : 'bg-[#7a1228]/10 text-[#7a1228] hover:bg-[#7a1228]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">workspace_premium</span>
              100% Scholarship ({stats.sponsoredCount})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900 font-mono">{filteredStudents.length}</strong> of{' '}
              <strong className="text-slate-900 font-mono">{students.length}</strong> learner(s)
            </span>
            {(searchQuery || selectedGrade !== 'All' || selectedStream !== 'All' || selectedStatus !== 'All' || selectedTerm !== 'term-3') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGrade('All');
                  setSelectedStream('All');
                  setSelectedStatus('All');
                  setSelectedTerm('term-3');
                  setSortBy('balance_desc');
                }}
                className="text-[#7a1228] hover:underline text-[11px] font-bold cursor-pointer ml-1"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Full-Width Accounting Table (The List Form - Identical to Payroll) */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[720px]">
          {filteredStudents.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">table_rows</span>
              <p className="text-slate-700 font-semibold text-sm">No student finance records found.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No learners match your search query or filter criteria. Click &quot;Reset Filters&quot; to restore the full school ledger roster.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-300 text-left text-xs text-slate-800 font-mono table-auto">
              {/* Table Column Headers with Clear Dividing Lines & Self-Adjusting Column Sizes */}
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase text-[10px] select-none">
                <tr>
                  <th className="px-1.5 py-1.5 text-center bg-slate-200 border border-slate-300 w-8 whitespace-nowrap">#</th>
                  <th className="px-2 py-1.5 border border-slate-300 whitespace-nowrap font-mono" title="Learner Admission Number">Adm No</th>
                  <th className="px-2 py-1.5 border border-slate-300 font-sans whitespace-nowrap">Learner Name</th>
                  <th className="px-2 py-1.5 border border-slate-300 font-sans whitespace-nowrap">Grade</th>
                  <th className="px-1.5 py-1.5 border border-slate-300 font-sans whitespace-nowrap">Stream</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-right whitespace-nowrap" title="Billed Term Fee from Fee Structure">
                    <div>Billed Fees</div>
                    <div className="text-[9px] font-normal text-slate-500">(KES)</div>
                  </th>
                  <th className="px-2 py-1.5 border border-slate-300 text-right whitespace-nowrap text-amber-800" title="Opening / Prior Term Arrears (distinct from term billed fee)">
                    <div>Prior Arrears</div>
                    <div className="text-[9px] font-normal text-amber-600">(KES)</div>
                  </th>
                  <th className="px-2 py-1.5 border border-slate-300 text-right bg-slate-200/70 font-extrabold text-slate-900 whitespace-nowrap" title="Total Due = Billed Fees + Prior Arrears">
                    <div>Total Due</div>
                    <div className="text-[9px] font-normal text-slate-600">(KES)</div>
                  </th>
                  <th className="px-2 py-1.5 border border-slate-300 text-right text-emerald-800 bg-emerald-50/50 font-extrabold whitespace-nowrap" title="Collections Reconciled">
                    <div>Paid Fees</div>
                    <div className="text-[9px] font-normal text-emerald-600">(KES)</div>
                  </th>
                  <th className="px-2 py-1.5 border border-slate-300 text-right font-bold text-slate-800 bg-slate-100/70 whitespace-nowrap" title="Net Balance = Total Due - Paid Fees (Negative indicates exact overpayment credit)">
                    <div>Balance</div>
                    <div className="text-[9px] font-normal text-slate-500">(KES)</div>
                  </th>
                  <th className="px-2 py-1.5 border border-slate-300 text-right font-bold text-teal-800 bg-teal-50/50 whitespace-nowrap" title="Prepayment / Advance Credit">
                    <div>Overpayment / Credit</div>
                    <div className="text-[9px] font-normal text-teal-600">(KES)</div>
                  </th>
                  <th className="px-2 py-1.5 border border-slate-300 font-sans whitespace-nowrap">Financial Status</th>
                  <th className="px-2 py-1.5 border border-slate-300 text-center font-sans whitespace-nowrap sticky right-0 z-30 bg-slate-100 shadow-[-3px_0_5px_rgba(0,0,0,0.06)]">Actions</th>
                </tr>
              </thead>

              {/* Table Rows with Explicit Cell Borders (Gridlines) & Self-Adjusting Dimensions */}
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredStudents.map((st, idx) => {
                  const fin = getStudentFinancials(st, selectedTerm, feeStructures, studentAccounts.get(st.id));
                  const rowNumber = idx + 1;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors group">
                      {/* 1. Row Index */}
                      <td className="px-1.5 py-1 text-center bg-slate-50 border border-slate-300 font-bold text-slate-500 text-[11px] select-none whitespace-nowrap">
                        {rowNumber}
                      </td>

                      {/* 2. Admission Number */}
                      <td className="px-2 py-1 border border-slate-300 text-slate-700 font-mono text-[11px] font-bold whitespace-nowrap">
                        {st.admNo || '--'}
                      </td>

                      {/* 3. Learner Name with Profile Avatar & Guardian */}
                      <td className="px-2 py-1 border border-slate-300 font-sans whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-[#7a1228] font-bold text-[10px] flex items-center justify-center shrink-0 overflow-hidden">
                            {st.profilePhotoUrl ? (
                              <img src={st.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              st.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="leading-tight">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{st.name}</span>
                              {fin.isSponsored && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-950 border border-emerald-300" title="Fee is Cleared under Institutional Scholarship Scheme">
                                  <span className="material-symbols-outlined text-[11px] text-emerald-700">verified</span>
                                  <span>Cleared · Scholarship</span>
                                </span>
                              )}
                            </div>
                            {st.guardianPhone && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({st.guardianPhone})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Grade */}
                      <td className="px-2 py-1 border border-slate-300 font-sans text-slate-800 text-[11px] font-medium whitespace-nowrap">
                        {st.grade || '--'}
                      </td>

                      {/* 5. Stream */}
                      <td className="px-1.5 py-1 border border-slate-300 font-sans text-slate-600 text-[11px] whitespace-nowrap">
                        {st.stream || '--'}
                      </td>

                      {/* 6. Billed Fees */}
                      <td className="px-2 py-1 border border-slate-300 text-right text-slate-800 text-[11px] font-medium whitespace-nowrap">
                        {fin.isSponsored ? (
                          <span className="text-slate-400 font-normal">0 <span className="text-[9px] text-emerald-700 font-bold">(Waived)</span></span>
                        ) : (
                          fin.billed.toLocaleString()
                        )}
                      </td>

                      {/* 7. Prior Arrears */}
                      <td className="px-2 py-1 border border-slate-300 text-right text-amber-800 text-[11px] font-medium whitespace-nowrap">
                        {fin.isSponsored ? '0' : (fin.priorArrears > 0 ? fin.priorArrears.toLocaleString() : '--')}
                      </td>

                      {/* 8. Total Due */}
                      <td className="px-2 py-1 border border-slate-300 text-right font-extrabold text-slate-900 bg-slate-50/70 text-[11px] whitespace-nowrap">
                        {fin.isSponsored ? '0' : fin.totalDue.toLocaleString()}
                      </td>

                      {/* 9. Paid Fees */}
                      <td className="px-2 py-1 border border-slate-300 text-right font-extrabold text-emerald-800 bg-emerald-50/40 text-[11px] whitespace-nowrap">
                        {fin.paid.toLocaleString()}
                      </td>

                      {/* 10. Balance (Amount still owed; KSh 0 when settled or overpaid) */}
                      <td className={`px-2 py-1 border border-slate-300 text-right font-bold text-[11px] whitespace-nowrap ${
                        fin.isSponsored
                          ? 'bg-emerald-50/20 text-emerald-800'
                          : fin.balance > 0
                          ? 'bg-rose-50/20 text-rose-700'
                          : 'text-emerald-700'
                      }`}>
                        {fin.isSponsored ? (
                          <span className="text-emerald-700 font-extrabold inline-flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            0
                          </span>
                        ) : fin.balance > 0 ? (
                          <span className="text-rose-700 font-extrabold font-mono">
                            {fin.balance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold font-mono">0</span>
                        )}
                      </td>

                      {/* 11. Overpayment / Prepayment Credit */}
                      <td className="px-2 py-1 border border-slate-300 text-right font-bold text-[11px] whitespace-nowrap bg-teal-50/30">
                        {fin.overpayment > 0 ? (
                          <span className="text-teal-800 font-extrabold inline-flex items-center gap-0.5" title={`Available Credit: KES ${fin.overpayment.toLocaleString()}`}>
                            <span className="material-symbols-outlined text-[13px]">savings</span>
                            +{fin.overpayment.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">--</span>
                        )}
                      </td>

                      {/* 12. Financial Status Badge */}
                      <td className="px-2 py-1 border border-slate-300 font-sans whitespace-nowrap">
                        {fin.isSponsored ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs" title="100% Institutional Scholarship Scheme — Fee Cleared">
                            <span className="material-symbols-outlined text-[13px] text-emerald-700">verified</span>
                            CLEARED · SCHOLARSHIP
                          </span>
                        ) : fin.status === 'OVERPAID' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
                            <span className="material-symbols-outlined text-[12px] text-teal-700">savings</span>
                            OVERPAID (+KES {fin.overpayment.toLocaleString()})
                          </span>
                        ) : fin.status === 'CLEARED' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            CLEARED
                          </span>
                        ) : fin.status === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            PARTIAL
                          </span>
                        ) : fin.status === 'UNBILLED' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            UNBILLED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                            ARREARS
                          </span>
                        )}
                      </td>

                      {/* 13. Actions - Sticky Right to ALWAYS remain visible */}
                      <td className="px-2 py-1 border border-slate-300 font-sans text-center sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-3px_0_5px_rgba(0,0,0,0.06)] whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1-click Transact (Record Payment / Arrears) */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForPayment(st);
                              setIsRecordPaymentOpen(true);
                            }}
                            title="Record manual fee payment or fee arrears for this student"
                            className="px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">payments</span>
                            <span>Transact</span>
                          </button>

                          {/* View Statement & Breakdown Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenStatementModal(st)}
                            title="View detailed invoices breakdown & payment history"
                            className="p-1 text-slate-600 hover:text-[#7a1228] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                          </button>

                          {/* Download Single Student Statement PDF */}
                          <button
                            type="button"
                            onClick={() => handleDownloadStudentStatementPdf(st)}
                            title="Download Official Fee Statement PDF Advice"
                            className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Accounting Totals Row with Clean Accounting Double Underlines */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 text-slate-900 border-t-2 border-b-4 border-double border-slate-700 font-bold text-xs select-none shadow-md">
                <tr>
                  <td className="px-1.5 py-1.5 text-center bg-slate-200 border border-slate-300 font-black text-slate-800 whitespace-nowrap">
                    ∑
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-slate-700 font-sans uppercase text-[10px] whitespace-nowrap">
                    TOTALS
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 font-sans whitespace-nowrap">
                    {filteredStudents.length} Learners
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-slate-500 font-sans whitespace-nowrap">
                    --
                  </td>
                  <td className="px-1.5 py-1.5 border border-slate-300 text-slate-500 font-sans whitespace-nowrap">
                    --
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-right whitespace-nowrap text-[11px]">
                    {stats.totalBilled.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-right whitespace-nowrap text-[11px] text-amber-800">
                    {stats.totalPriorArrears.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-right font-black text-slate-900 bg-slate-200/60 whitespace-nowrap text-[11px]">
                    {stats.totalDue.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-right font-black text-emerald-900 bg-emerald-100/70 whitespace-nowrap text-[11px]">
                    {stats.totalPaid.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-right font-black text-rose-800 bg-rose-100/60 whitespace-nowrap text-[11px]">
                    {stats.totalArrears.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-right font-black text-teal-900 bg-teal-100/70 whitespace-nowrap text-[11px]">
                    +{stats.totalOverpayment.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 font-sans text-[10px] whitespace-nowrap text-slate-700">
                    Cleared: <strong className="text-emerald-800">{stats.clearedCount}</strong> · Overpaid: <strong className="text-teal-800">{stats.overpaidCount}</strong>
                  </td>
                  <td className="px-2 py-1.5 border border-slate-300 text-center font-sans text-[10px] text-slate-600 sticky right-0 z-30 bg-slate-100 shadow-[-3px_0_5px_rgba(0,0,0,0.06)] whitespace-nowrap">
                    Audited
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Ledger Summary Strip */}
        <div className="bg-slate-100 text-slate-700 text-xs px-4 py-2 border-t border-slate-300 flex flex-wrap items-center justify-between gap-3 font-medium">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#7a1228]">verified</span>
            <span>Showing {filteredStudents.length} learners for <strong>{selectedGrade === 'All' ? 'All Classes' : selectedGrade}</strong></span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>TOTAL BILLED: <strong className="text-slate-900 font-mono">KES {stats.totalBilled.toLocaleString()}</strong></span>
            <span>TOTAL COLLECTED: <strong className="text-emerald-700 font-mono font-bold">KES {stats.totalPaid.toLocaleString()}</strong></span>
            <span>OUTSTANDING ARREARS: <strong className="text-rose-700 font-mono font-bold">KES {stats.totalArrears.toLocaleString()}</strong></span>
            <span>PREPAYMENT CREDITS: <strong className="text-teal-800 font-mono font-bold">+KES {stats.totalOverpayment.toLocaleString()}</strong></span>
            <span>SCHOLARSHIP LEARNERS: <strong className="text-[#7a1228] font-mono font-bold">{stats.sponsoredCount} (100% Waived)</strong></span>
            <span>COLLECTION RATE: <strong className="text-slate-900 font-mono font-bold">{stats.collectionRate}%</strong></span>
          </div>
        </div>
      </div>

      {/* 5. MODAL: DETAILED STUDENT STATEMENT INSPECTION */}
      {isStatementModalOpen && statementStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
            {/* Modal Header */}
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                  {statementStudent.profilePhotoUrl ? (
                    <img src={statementStudent.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{statementStudent.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base leading-tight">{statementStudent.name}</h3>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                      {statementStudent.status || 'Active'}
                    </span>
                  </div>
                  <div className="text-xs text-rose-100 font-mono flex flex-wrap items-center gap-2 mt-0.5">
                    <span>Adm: <strong className="text-white">{statementStudent.admNo}</strong></span>
                    <span>·</span>
                    <span>Grade: <strong className="text-white">{statementStudent.grade}</strong></span>
                    {statementStudent.stream && (
                      <>
                        <span>·</span>
                        <span>Stream: <strong className="text-white">{statementStudent.stream}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadStudentStatementPdf(statementStudent)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Download Statement PDF"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>PDF Statement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
              {/* KCB Paybill Official Shortcode Banner */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#006a40] text-white flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-950">
                        KCB Buni Paybill: <span className="font-mono text-[#006a40]">522533</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('522533', 'paybill')}
                        className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold cursor-pointer"
                      >
                        {copiedField === 'paybill' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-[11px] text-emerald-900 flex items-center gap-1.5 mt-0.5">
                      <span>Account Ref:</span>
                      <strong className="font-mono bg-white px-1.5 py-0.2 rounded border border-emerald-300 text-emerald-950">
                        {kcbAccountRef}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleCopy(kcbAccountRef, 'account')}
                        className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded text-[10px] font-bold cursor-pointer"
                      >
                        {copiedField === 'account' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForPayment(statementStudent);
                    setIsRecordPaymentOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer self-start sm:self-center"
                >
                  <span className="material-symbols-outlined text-[15px]">add_card</span>
                  <span>Record Payment / Arrears</span>
                </button>
              </div>

              {/* 4 Financial Stat Cards */}
              {(() => {
                const fin = getStudentFinancials(statementStudent);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Billed</span>
                      <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                        KES {fin.billed.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Approved Fees</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 block">Total Paid</span>
                      <div className="text-base font-bold font-mono text-emerald-800 mt-0.5">
                        KES {fin.paid.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-emerald-700 mt-0.5 block">Reconciled Collections</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-rose-700 block">Outstanding Arrears</span>
                      <div className="text-base font-extrabold font-mono text-rose-800 mt-0.5">
                        KES {fin.arrearsDue.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-rose-600 mt-0.5 block">Due to School</span>
                    </div>

                    <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                      <span className="text-[10px] font-bold uppercase text-teal-800 block flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">savings</span>
                        Overpayment / Credit
                      </span>
                      <div className="text-base font-black font-mono text-teal-900 mt-0.5">
                        +KES {fin.overpayment.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-teal-700 mt-0.5 block font-semibold">Advance Prepayment</span>
                    </div>
                  </div>
                );
              })()}

              {/* Sub-Tabs: Invoices / Payments / Credits / Printable Statement */}
              <div className="flex border-b border-slate-200 gap-2 pt-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatementTab('invoices')}
                  className={`pb-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    statementTab === 'invoices'
                      ? 'border-[#7a1228] text-[#7a1228]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                  <span>Billed Invoices ({invoicesList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatementTab('payments')}
                  className={`pb-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    statementTab === 'payments'
                      ? 'border-[#7a1228] text-[#7a1228]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">payments</span>
                  <span>Payment Receipts ({paymentsList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatementTab('credits')}
                  className={`pb-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    statementTab === 'credits'
                      ? 'border-[#7a1228] text-[#7a1228]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">savings</span>
                  <span>Credit Ledger ({creditsList.length})</span>
                  {availableCreditAmount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-teal-100 text-teal-800 border border-teal-300">
                      +KES {availableCreditAmount.toLocaleString()}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStatementTab('statement')}
                  className={`pb-2 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    statementTab === 'statement'
                      ? 'border-[#7a1228] text-[#7a1228]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">description</span>
                  <span>Printable Statement Advice</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div>
                {isLoadingStatement ? (
                  <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <div className="w-7 h-7 rounded-full border-2 border-[#7a1228] border-t-transparent animate-spin mx-auto"></div>
                    <p>Loading real-time statement ledger...</p>
                  </div>
                ) : statementError ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-700 text-sm">warning</span>
                    <span>{statementError}</span>
                  </div>
                ) : (
                  <>
                    {/* 1. INVOICES TAB */}
                    {statementTab === 'invoices' && (
                      <div className="space-y-3">
                        {deleteSuccess && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
                            <span>{deleteSuccess}</span>
                            <button onClick={() => setDeleteSuccess(null)} className="text-emerald-700">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        )}
                        {deleteError && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
                            <span>{deleteError}</span>
                            <button onClick={() => setDeleteError(null)} className="text-rose-700">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        )}

                        {invoicesList.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                            <span className="material-symbols-outlined text-3xl text-amber-600">pending_actions</span>
                            <h4 className="text-xs font-bold text-slate-800">Learner Not Yet Invoiced (Pending Authorization)</h4>
                            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                              In accordance with system policy, term billing will take place once authorized by Accounts or School Admin.
                            </p>
                            {isBillingAuthorized && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={handleAuthorizeBilling}
                                  disabled={isAuthorizingBilling}
                                  className="px-3.5 py-1.5 bg-[#7a1228] hover:bg-[#600e1f] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isAuthorizingBilling ? 'Authorizing...' : 'Authorize & Bill Term 1'}
                                </button>
                                {billingAuthFeedback && (
                                  <p className="text-xs text-emerald-700 font-semibold mt-2">
                                    {billingAuthFeedback}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {invoicesList.map((inv) => {
                              const isExpanded = expandedInvoiceId === inv.id;
                              const invBal = inv.balance || 0;
                              const isInvPaid = invBal <= 0;

                              return (
                                <div key={inv.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                  <div
                                    onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                    className="p-3 bg-slate-50 hover:bg-slate-100 flex flex-wrap items-center justify-between gap-3 cursor-pointer text-xs"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className="font-mono font-bold text-[#7a1228]">#{inv.invoiceNumber}</span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                          isInvPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
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
                                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                          title="Delete Unsettled Hanging Invoice"
                                        >
                                          <span className="material-symbols-outlined text-[12px]">delete</span>
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-4 font-mono text-xs">
                                      <span>Billed: <strong>{(inv.amountPayable || inv.amountBilled || 0).toLocaleString()}</strong></span>
                                      <span>Paid: <strong className="text-emerald-700">{(inv.amountPaid || 0).toLocaleString()}</strong></span>
                                      <span>Bal: <strong className={isInvPaid ? 'text-emerald-700' : 'text-rose-700'}>{invBal.toLocaleString()}</strong></span>
                                      <span className="material-symbols-outlined text-[16px] text-slate-400">
                                        {isExpanded ? 'expand_less' : 'expand_more'}
                                      </span>
                                    </div>
                                  </div>

                                  {isExpanded && inv.items && inv.items.length > 0 && (
                                    <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-600 font-semibold">
                                          <tr>
                                            <th className="p-2">Item Name</th>
                                            <th className="p-2">Category</th>
                                            <th className="p-2 text-right">Amount (KES)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                          {inv.items.map((it: any, itemIdx: number) => (
                                            <tr key={itemIdx}>
                                              <td className="p-2 font-sans">{it.name}</td>
                                              <td className="p-2 font-sans text-slate-500 text-[11px]">{it.category || 'Tuition / Levy'}</td>
                                              <td className="p-2 text-right font-bold">{(it.amount || 0).toLocaleString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. PAYMENTS TAB */}
                    {statementTab === 'payments' && (
                      <div className="space-y-3">
                        {paymentsList.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">credit_card_off</span>
                            <p className="font-semibold text-slate-700">No payment records found for this learner yet.</p>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForPayment(statementStudent);
                                  setIsRecordPaymentOpen(true);
                                }}
                                className="px-3 py-1.5 bg-[#7a1228] text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                              >
                                Record Payment Now
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-2.5">Receipt #</th>
                                  <th className="p-2.5">Date</th>
                                  <th className="p-2.5 font-sans">Method</th>
                                  <th className="p-2.5">Reference / Slip</th>
                                  <th className="p-2.5 text-right">Amount</th>
                                  <th className="p-2.5 text-center font-sans">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {paymentsList.map((p, pIdx) => (
                                  <tr key={pIdx} className="hover:bg-slate-50">
                                    <td className="p-2.5 font-bold text-[#7a1228]">{p.receiptNumber || `REC-${pIdx + 1000}`}</td>
                                    <td className="p-2.5 text-slate-600">{p.paymentDate || 'Recent'}</td>
                                    <td className="p-2.5 font-sans font-medium text-slate-800">{p.paymentMethod || 'KCB_BUNI'}</td>
                                    <td className="p-2.5 text-slate-600">{p.transactionReference || '--'}</td>
                                    <td className="p-2.5 text-right font-extrabold text-emerald-700">
                                      +KES {(p.amount || 0).toLocaleString()}
                                    </td>
                                    <td className="p-2.5 text-center font-sans">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
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

                    {/* 3. PRINTABLE STATEMENT ADVICE TAB */}
                    {statementTab === 'statement' && (
                      <div className="bg-white p-5 rounded-xl border border-slate-300 space-y-5">
                        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                          <div>
                            <h3 className="text-sm font-extrabold uppercase text-slate-900">
                              {user?.schoolName || 'Grace Seeds School'}
                            </h3>
                            <p className="text-[11px] text-slate-500">Official Student Fee Statement &amp; Audit Slip</p>
                          </div>
                          <div className="text-right text-[11px] text-slate-600">
                            <div>Date: <strong className="text-slate-900">{new Date().toLocaleDateString()}</strong></div>
                            <div>Paybill: <strong className="text-emerald-800">522533</strong></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg text-xs border border-slate-200">
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">Learner</span>
                            <strong className="text-slate-900">{statementStudent.name}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">Adm No</span>
                            <strong className="text-slate-900 font-mono">{statementStudent.admNo}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">Class / Stream</span>
                            <strong className="text-slate-900">{statementStudent.grade} ({statementStudent.stream || 'Simba'})</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold block">Guardian</span>
                            <strong className="text-slate-900">{statementStudent.guardianName || '--'} ({statementStudent.guardianPhone || '--'})</strong>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Ledger Journal</h4>
                          <div className="border border-slate-300 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-xs font-mono">
                              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700">
                                <tr>
                                  <th className="p-2 font-sans">Item / Description</th>
                                  <th className="p-2">Reference</th>
                                  <th className="p-2 text-right">Debit (Billed)</th>
                                  <th className="p-2 text-right">Credit (Paid)</th>
                                  <th className="p-2 text-right">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {invoicesList.map((inv, iIdx) => (
                                  <tr key={`inv-${iIdx}`}>
                                    <td className="p-2 font-sans">Invoice #{inv.invoiceNumber}</td>
                                    <td className="p-2 text-slate-500">{inv.dueDate || 'Term Fee'}</td>
                                    <td className="p-2 text-right text-rose-700 font-bold">KES {(inv.amountPayable || inv.amountBilled || 0).toLocaleString()}</td>
                                    <td className="p-2 text-right text-slate-400">--</td>
                                    <td className="p-2 text-right font-bold text-slate-800">KES {(inv.balance || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                                {paymentsList.map((p, pIdx) => (
                                  <tr key={`p-${pIdx}`} className="bg-emerald-50/40">
                                    <td className="p-2 font-sans text-emerald-900">Payment: {p.paymentMethod || 'KCB Paybill'}</td>
                                    <td className="p-2 text-emerald-800">{p.receiptNumber}</td>
                                    <td className="p-2 text-right text-slate-400">--</td>
                                    <td className="p-2 text-right text-emerald-700 font-bold">+KES {(p.amount || 0).toLocaleString()}</td>
                                    <td className="p-2 text-right font-bold text-slate-800">CR</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadStudentStatementPdf(statementStudent)}
                            className="px-4 py-2 bg-[#7a1228] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                            <span>Download Statement PDF</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 4. PREPAYMENT CREDITS & OVERPAYMENT LEDGER TAB */}
                    {statementTab === 'credits' && (
                      <div className="space-y-4">
                        {creditActionFeedback && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between font-semibold">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-emerald-700">check_circle</span>
                              <span>{creditActionFeedback}</span>
                            </div>
                            <button onClick={() => setCreditActionFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        )}

                        {/* Credit Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Credit Generated</span>
                            <div className="text-base font-black font-mono text-slate-900 mt-1">
                              KES {creditsList.reduce((sum: number, c: any) => sum + (c.status !== 'REVERSED' ? Number(c.amount) || 0 : 0), 0).toLocaleString()}
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">{creditsList.length} overpayment / advance record(s)</span>
                          </div>

                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Credit Applied</span>
                            <div className="text-base font-black font-mono text-emerald-700 mt-1">
                              KES {creditsList.reduce((sum: number, c: any) => sum + (c.status !== 'REVERSED' ? Number(c.amountUsed) || 0 : 0), 0).toLocaleString()}
                            </div>
                            <span className="text-[10px] text-emerald-600 mt-0.5 block">{applicationsList.length} invoice application(s)</span>
                          </div>

                          <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl">
                            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">savings</span>
                              Available Credit Balance
                            </span>
                            <div className="text-lg font-black font-mono text-teal-900 mt-1">
                              +KES {availableCreditAmount.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-teal-700 font-semibold mt-0.5 block">Ready to apply to incoming fees</span>
                          </div>
                        </div>

                        {/* Quick Offset Action Banner if student has unpaid invoices and available credit */}
                        {availableCreditAmount > 0 && invoicesList.some(inv => (inv.balance || 0) > 0) && (
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="material-symbols-outlined text-amber-700 text-xl">info</span>
                              <div>
                                <span className="font-bold text-amber-900">Unsettled Fee Invoices Found</span>
                                <p className="text-[11px] text-amber-800">
                                  This learner has available credit of KES {availableCreditAmount.toLocaleString()} that can offset outstanding fees.
                                </p>
                              </div>
                            </div>
                            {isBillingAuthorized && (
                              <button
                                type="button"
                                disabled={isApplyingCredit}
                                onClick={() => {
                                  const targetInvoice = invoicesList.find(inv => (inv.balance || 0) > 0);
                                  const availableCredit = creditsList.find((c: any) => (c.balance || 0) > 0 && c.status !== 'REVERSED');
                                  if (targetInvoice && availableCredit) {
                                    handleApplyCredit(availableCredit.id, targetInvoice.id);
                                  }
                                }}
                                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">price_check</span>
                                <span>{isApplyingCredit ? 'Applying...' : 'Apply Credit to Earliest Invoice'}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Credits List Table */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-[#7a1228]">account_balance_wallet</span>
                            <span>Credit &amp; Overpayment Ledger</span>
                          </h4>

                          {creditsList.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                              <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">savings</span>
                              <p className="font-semibold text-slate-700">No advance credits or overpayments recorded.</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Overpayments recorded against invoices or advance deposits are automatically tracked here.
                              </p>
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2.5">Credit ID</th>
                                    <th className="p-2.5">Origin Receipt #</th>
                                    <th className="p-2.5 text-right">Credit Amount</th>
                                    <th className="p-2.5 text-right">Amount Used</th>
                                    <th className="p-2.5 text-right font-bold text-teal-800">Remaining Balance</th>
                                    <th className="p-2.5 text-center font-sans">Status</th>
                                    {isBillingAuthorized && <th className="p-2.5 text-center font-sans">Action</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {creditsList.map((c: any, cIdx: number) => {
                                    const canApply = (c.balance || 0) > 0 && c.status !== 'REVERSED' && invoicesList.some(inv => (inv.balance || 0) > 0);
                                    return (
                                      <tr key={c.id || cIdx} className="hover:bg-slate-50">
                                        <td className="p-2.5 text-slate-700 font-bold">{c.id ? c.id.slice(0, 12) : `CR-${cIdx + 1}`}</td>
                                        <td className="p-2.5 font-bold text-[#7a1228]">{c.originatingReceiptNumber || '--'}</td>
                                        <td className="p-2.5 text-right font-bold text-slate-900">KES {(Number(c.amount) || 0).toLocaleString()}</td>
                                        <td className="p-2.5 text-right text-emerald-700">KES {(Number(c.amountUsed) || 0).toLocaleString()}</td>
                                        <td className="p-2.5 text-right font-black text-teal-800 bg-teal-50/40">
                                          +KES {(Number(c.balance) || 0).toLocaleString()}
                                        </td>
                                        <td className="p-2.5 text-center font-sans">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            c.status === 'AVAILABLE'
                                              ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                              : c.status === 'PARTIALLY_USED'
                                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                              : c.status === 'FULLY_USED'
                                              ? 'bg-slate-100 text-slate-600'
                                              : 'bg-rose-100 text-rose-800'
                                          }`}>
                                            {c.status}
                                          </span>
                                        </td>
                                        {isBillingAuthorized && (
                                          <td className="p-2.5 text-center font-sans">
                                            {canApply ? (
                                              <button
                                                type="button"
                                                disabled={isApplyingCredit}
                                                onClick={() => {
                                                  const targetInvoice = invoicesList.find(inv => (inv.balance || 0) > 0);
                                                  if (targetInvoice) {
                                                    handleApplyCredit(c.id, targetInvoice.id);
                                                  }
                                                }}
                                                className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-[10px] font-bold cursor-pointer transition-all disabled:opacity-50"
                                                title="Apply this credit to unpaid invoice"
                                              >
                                                Apply
                                              </button>
                                            ) : (
                                              <span className="text-slate-400 text-[10px]">--</span>
                                            )}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Credit Applications Audit Trail */}
                        {applicationsList.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-emerald-700">history</span>
                              <span>Credit Application History (Audit Trail)</span>
                            </h4>
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                  <tr>
                                    <th className="p-2.5">Applied Date</th>
                                    <th className="p-2.5">Credit Ref</th>
                                    <th className="p-2.5">Target Invoice</th>
                                    <th className="p-2.5 text-right">Amount Applied</th>
                                    <th className="p-2.5 font-sans">Applied By</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {applicationsList.map((app: any, aIdx: number) => (
                                    <tr key={app.id || aIdx} className="hover:bg-slate-50">
                                      <td className="p-2.5 text-slate-600">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recent'}</td>
                                      <td className="p-2.5 text-slate-700 font-bold">{app.creditId ? app.creditId.slice(0, 10) : '--'}</td>
                                      <td className="p-2.5 font-bold text-[#7a1228]">{app.invoiceId ? app.invoiceId.slice(0, 14) : '--'}</td>
                                      <td className="p-2.5 text-right font-black text-emerald-800">+KES {(Number(app.amountApplied) || 0).toLocaleString()}</td>
                                      <td className="p-2.5 font-sans text-slate-600 text-[11px]">{app.appliedByUserId || 'ADMIN'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                KCB Paybill 522533 · A/C: <strong className="font-mono text-emerald-800">{kcbAccountRef}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: UNIFIED RECORD PAYMENT / ARREARS MODAL */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setSelectedStudentForPayment(null);
          }}
          students={students}
          initialStudent={selectedStudentForPayment || (students.length > 0 ? students[0] : undefined)}
          onPaymentRecorded={handlePaymentSuccess}
          onArrearRecorded={handlePaymentSuccess}
          onRefreshStudents={onRefreshStudents}
        />
      )}

      {/* 7. MODAL: DELETE HANGING INVOICE CONFIRMATION */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 my-auto">
            <div className="bg-rose-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <h3 className="font-bold text-sm">Delete Hanging Invoice</h3>
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
              <p className="text-slate-800">
                Are you sure you want to delete invoice <strong className="font-mono text-[#7a1228]">#{invoiceToDelete.invoiceNumber}</strong>?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>Student / Adm:</span>
                  <span className="font-bold text-slate-900">
                    {statementStudent?.name || invoiceToDelete.studentId} ({statementStudent?.admNo || ''})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>Billed Amount:</span>
                  <span className="font-bold text-slate-900">
                    KES {(invoiceToDelete.amountPayable || invoiceToDelete.amountBilled || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-emerald-700">
                    KES {(invoiceToDelete.amountPaid || 0).toLocaleString()} (0 Payments)
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>Status:</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] uppercase">
                    {invoiceToDelete.status} (Hanging)
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[11px] flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">info</span>
                <span>
                  Only hanging invoices with <strong>zero payments recorded</strong> can be deleted. This action cannot be undone.
                </span>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm shrink-0">error</span>
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeletingInvoice}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteInvoice}
                  disabled={isDeletingInvoice}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {isDeletingInvoice ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
