import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ReceiptViewModal } from '../modals/ReceiptViewModal';
import { FeeStatementModal } from '../modals/FeeStatementModal';
import { InvoiceDetailsModal } from '../modals/InvoiceDetailsModal';

export interface LearnerFeeCollectionDeskProps {
  students: Student[];
  onRefreshStudents?: () => void | Promise<void>;
  initialStudentId?: string;
  onNavigateToFullLedger?: () => void;
}

type PaymentMethodType = 'CASH' | 'MPESA' | 'BANK_DEPOSIT';

const KENYAN_BANKS = [
  'KCB Bank Kenya',
  'Equity Bank Kenya',
  'Co-operative Bank of Kenya',
  'NCBA Bank',
  'Absa Bank Kenya',
  'Stanbic Bank Kenya',
  'Family Bank',
  'Diamond Trust Bank (DTB)',
  'Standard Chartered Kenya',
  'Other Bank',
];

export const LearnerFeeCollectionDesk: React.FC<LearnerFeeCollectionDeskProps> = ({
  students = [],
  onRefreshStudents,
  initialStudentId,
  onNavigateToFullLedger,
}) => {
  const { user } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Term selection
  const [selectedTerm, setSelectedTerm] = useState<'term-1' | 'term-2' | 'term-3' | 'ALL'>('term-3');

  // Backend authoritative fee position data
  const [feePositionData, setFeePositionData] = useState<any | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);

  // Active sub-tab under summary
  const [activeLedgerTab, setActiveLedgerTab] = useState<'history' | 'statement' | 'invoices'>('history');

  // Payment recording panel / modal state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('MPESA');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transactionReference, setTransactionReference] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [bankName, setBankName] = useState(KENYAN_BANKS[0]);
  const [slipNumber, setSlipNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  // Manual Arrears recording state
  const [isRecordArrearsOpen, setIsRecordArrearsOpen] = useState(false);
  const [arrearsAmount, setArrearsAmount] = useState('');
  const [arrearsAcademicYear, setArrearsAcademicYear] = useState('year-2026');
  const [arrearsTerm, setArrearsTerm] = useState('term-2026-t3');
  const [arrearsReason, setArrearsReason] = useState('Outstanding fees from previous term');
  const [arrearsSource, setArrearsSource] = useState('Verified school records');
  const [arrearsDueDate, setArrearsDueDate] = useState('');
  const [arrearsReferenceNote, setArrearsReferenceNote] = useState('');
  const [arrearsError, setArrearsError] = useState<string | null>(null);
  const [arrearsSuccessMessage, setArrearsSuccessMessage] = useState<string | null>(null);
  const [isSubmittingArrears, setIsSubmittingArrears] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

  // Modal inspection states
  const [receiptModalPaymentId, setReceiptModalPaymentId] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<any | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Role check
  const isFinanceStaff = Boolean(
    user?.role &&
      [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.SCHOOL_ADMIN,
        UserRole.HEAD_TEACHER,
        UserRole.BURSAR,
        UserRole.ACCOUNTANT,
      ].includes(user.role)
  );

  // Initial student selection
  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const found = students.find((s) => s.id === initialStudentId);
      if (found) {
        setSelectedStudent(found);
      }
    } else if (!selectedStudent && students.length > 0) {
      // Default select the first student or Tania / PP1-001 if present
      const preferred =
        students.find((s) => s.name.toLowerCase().includes('tania')) ||
        students.find((s) => (s.admNo || '').startsWith('PP1-')) ||
        students[0];
      if (preferred) setSelectedStudent(preferred);
    }
  }, [initialStudentId, students]);

  // Load fee position whenever selected student or term changes
  const loadLearnerFeePosition = async (studentId: string, term: string) => {
    setIsLoadingPosition(true);
    setPositionError(null);
    try {
      const res = await apiService.getLearnerFeePosition(studentId, { termId: term });
      if (res?.success && res.data) {
        setFeePositionData(res.data);
      } else {
        setFeePositionData(null);
      }
    } catch (err: any) {
      console.warn('Could not load authoritative fee position, using student data fallback', err);
      setPositionError(err?.message || 'Using local fee summary');
      setFeePositionData(null);
    } finally {
      setIsLoadingPosition(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      loadLearnerFeePosition(selectedStudent.id, selectedTerm);
    } else {
      setFeePositionData(null);
    }
  }, [selectedStudent?.id, selectedTerm]);

  // Filtered search suggestions
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const admMatch = (s.admNo || '').toLowerCase().includes(q);
        const gradeMatch = (s.grade || (s as any).gradeLevel || '').toLowerCase().includes(q);
        const streamMatch = (s.stream || (s as any).streamName || '').toLowerCase().includes(q);
        const phoneMatch = (s.guardianPhone || '').replace(/\s+/g, '').includes(q);
        return nameMatch || admMatch || gradeMatch || streamMatch || phoneMatch;
      })
      .slice(0, 8);
  }, [students, searchQuery]);

  // Computed financial values (authoritative backend with client fallback)
  const financials = useMemo(() => {
    if (feePositionData?.financialPosition) {
      const fp = feePositionData.financialPosition;
      const feesThisTerm = Number(fp.feesThisTerm) || 0;
      const previousBalance = Number(fp.previousBalance) || 0;
      const totalPaid = Number(fp.totalPaid) || 0;
      const outstandingBalance = Number(fp.outstandingBalance) || 0;
      const overpaymentCredit = Number(fp.overpaymentCredit) || 0;
      const totalDue = Number((fp as any).totalDue) || (feesThisTerm + previousBalance);
      return {
        feesThisTerm,
        previousBalance,
        totalPaid,
        totalDue,
        outstandingBalance,
        overpaymentCredit,
        status: fp.status || 'ARREARS',
        statusLabel: fp.statusLabel || 'Arrears Pending',
        formula: fp.formula || '',
      };
    }

    if (!selectedStudent) {
      return {
        feesThisTerm: 0,
        previousBalance: 0,
        totalPaid: 0,
        totalDue: 0,
        outstandingBalance: 0,
        overpaymentCredit: 0,
        status: 'UNBILLED',
        statusLabel: 'No learner selected',
        formula: '',
      };
    }

    const isSponsored = Boolean(selectedStudent.isSponsored || (selectedStudent as any).sponsorship);
    if (isSponsored) {
      return {
        feesThisTerm: 0,
        previousBalance: 0,
        totalPaid: 0,
        totalDue: 0,
        outstandingBalance: 0,
        overpaymentCredit: 0,
        status: 'SPONSORED',
        statusLabel: '100% Scholarship (Exempt)',
        formula: 'KSh 0 + KSh 0 - KSh 0 = KSh 0',
      };
    }

    const feesThisTerm = Number(selectedStudent.totalFee) || 0;
    const previousBalance = Math.max(0, Number((selectedStudent as any).priorArrears) || 0);
    const rawBalance = Number(selectedStudent.feeBalance) || 0;
    const totalDue = feesThisTerm + previousBalance;
    const totalPaid = Math.max(0, totalDue - rawBalance);
    const outstandingBalance = Math.max(0, totalDue - totalPaid);
    const overpaymentCredit = Number((selectedStudent as any).creditBalance) || 0;

    let status = 'ARREARS';
    let statusLabel = 'Arrears Pending';
    if (overpaymentCredit > 0 && outstandingBalance === 0) {
      status = 'OVERPAID';
      statusLabel = `Advance Credit (+KES ${overpaymentCredit.toLocaleString()})`;
    } else if (outstandingBalance === 0 && totalPaid > 0) {
      status = 'CLEARED';
      statusLabel = 'Fees Cleared';
    } else if (totalPaid > 0 && outstandingBalance > 0) {
      status = 'PARTIAL';
      statusLabel = 'Partially Paid';
    }

    return {
      feesThisTerm,
      previousBalance,
      totalPaid,
      totalDue,
      outstandingBalance,
      overpaymentCredit,
      status,
      statusLabel,
      formula: `KSh ${feesThisTerm.toLocaleString()} + KSh ${previousBalance.toLocaleString()} - KSh ${totalPaid.toLocaleString()} = KSh ${outstandingBalance.toLocaleString()}`,
    };
  }, [feePositionData, selectedStudent]);

  // Handle student selection from search
  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setSearchQuery('');
    setIsSearchFocused(false);
    setIsRecordPaymentOpen(false);
    setIsRecordArrearsOpen(false);
    setPaymentSuccessMessage(null);
    setPaymentError(null);
    setArrearsSuccessMessage(null);
    setArrearsError(null);
    setDuplicateWarning(null);
  };

  // Quick Amount preset buttons
  const handleSetQuickAmount = (val: number) => {
    setPaymentAmount(String(val));
  };

  // Open Record Payment Panel
  const handleOpenRecordPayment = () => {
    // Open with empty amount to support flexible partial payments of any size
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setTransactionReference('');
    setSlipNumber('');
    setPaymentNotes('');
    setIsConfirmingPayment(false);
    setPaymentError(null);
    setPaymentSuccessMessage(null);
    setIsRecordArrearsOpen(false);
    setIsRecordPaymentOpen(true);
  };

  // Open Record Arrears Panel
  const handleOpenRecordArrears = () => {
    setArrearsAmount('');
    const curYearId = feePositionData?.academicPeriod?.academicYearId || 'year-2026';
    const curTermId = feePositionData?.academicPeriod?.termId || (selectedTerm ? `term-2026-${selectedTerm.replace('term-', 't')}` : 'term-2026-t3');
    setArrearsAcademicYear(curYearId);
    setArrearsTerm(curTermId);
    setArrearsReason('Outstanding fees from previous term');
    setArrearsSource('Verified school records');
    setArrearsDueDate('');
    setArrearsReferenceNote('');
    setArrearsError(null);
    setArrearsSuccessMessage(null);
    setDuplicateWarning(null);
    setIsRecordPaymentOpen(false);
    setIsRecordArrearsOpen(true);
  };

  // Submit Manual Arrears
  const handleSubmitArrears = async (e?: React.FormEvent, forceDuplicate = false) => {
    if (e) e.preventDefault();
    if (!selectedStudent) return;

    const numAmt = Number(arrearsAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setArrearsError('Please enter a valid arrears amount greater than zero.');
      return;
    }

    if (!arrearsReason.trim()) {
      setArrearsError('Arrears description or reason is required.');
      return;
    }

    if (!arrearsAcademicYear.trim()) {
      setArrearsError('Academic year is required.');
      return;
    }

    setIsSubmittingArrears(true);
    setArrearsError(null);

    try {
      const payload = {
        studentId: selectedStudent.id,
        amount: numAmt,
        reason: arrearsReason.trim(),
        academicYearId: arrearsAcademicYear.trim(),
        termId: arrearsTerm === 'ALL' ? undefined : arrearsTerm,
        dueDate: arrearsDueDate || undefined,
        source: arrearsSource.trim() || 'Verified school records',
        referenceNote: arrearsReferenceNote.trim() || undefined,
        notes: arrearsReferenceNote.trim() || undefined,
        mode: 'ADD' as const,
        confirmDuplicate: forceDuplicate,
        allowDuplicate: forceDuplicate,
      };

      const res = await apiService.addManualArrear(payload);
      if (res?.success) {
        setArrearsSuccessMessage(
          `Fee arrears of KSh ${numAmt.toLocaleString()} recorded successfully for ${selectedStudent.name}. (Invoice #${res.data?.invoiceNumber || 'INV-ARR'})`
        );
        setIsRecordArrearsOpen(false);
        setDuplicateWarning(null);
        await loadLearnerFeePosition(selectedStudent.id, selectedTerm);
        if (onRefreshStudents) await onRefreshStudents();
      } else {
        setArrearsError(res?.message || 'Failed to save arrears entry.');
      }
    } catch (err: any) {
      const details = err?.response?.data?.error?.details || err?.error?.details || err?.details;
      if (err?.statusCode === 409 || err?.status === 409 || details?.duplicateDetected) {
        setDuplicateWarning({
          message: err?.message || 'Potential duplicate arrears entry detected for this period.',
          existingEntry: details?.existingEntry || null,
        });
      } else {
        setArrearsError(err?.message || 'Failed to record manual arrears.');
      }
    } finally {
      setIsSubmittingArrears(false);
    }
  };

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIsUploadingPhoto(true);
      try {
        const uploadRes = await apiService.uploadPhoto({ imageDataOrUrl: base64, filename: file.name });
        const newPhotoUrl = uploadRes.success && uploadRes.data?.url ? uploadRes.data.url : base64;
        await apiService.updateStudent(selectedStudent.id, { profilePhotoUrl: newPhotoUrl });
        setSelectedStudent({ ...selectedStudent, profilePhotoUrl: newPhotoUrl });
        if (onRefreshStudents) await onRefreshStudents();
      } catch (err: any) {
        alert(err?.message || 'Error updating learner photo');
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const numAmount = Number(paymentAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (paymentMethod === 'MPESA' && !transactionReference.trim()) {
      setPaymentError('M-Pesa transaction reference (e.g. QHJ8921KL) is required.');
      return;
    }

    if (paymentMethod === 'BANK_DEPOSIT' && !slipNumber.trim() && !transactionReference.trim()) {
      setPaymentError('Please provide a bank deposit slip number or reference.');
      return;
    }

    if (!isConfirmingPayment) {
      setIsConfirmingPayment(true);
      setPaymentError(null);
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);

    const activeInvId = feePositionData?.activeInvoice?.id || undefined;
    const finalTxRef =
      paymentMethod === 'CASH'
        ? transactionReference.trim() || undefined
        : paymentMethod === 'BANK_DEPOSIT'
        ? slipNumber.trim() || transactionReference.trim()
        : transactionReference.trim();

    try {
      const payload: any = {
        schoolId: (selectedStudent as any).schoolId || 'school-001',
        studentId: selectedStudent.id,
        invoiceId: activeInvId,
        amount: numAmount,
        paymentMethod: paymentMethod,
        transactionReference: finalTxRef,
        mpesaPhoneNumber: paymentMethod === 'MPESA' ? mpesaPhoneNumber.trim() || undefined : undefined,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        recordedByUserId: user?.id || 'cashier',
        bankName: paymentMethod === 'BANK_DEPOSIT' ? bankName : undefined,
        slipNumber: paymentMethod === 'BANK_DEPOSIT' ? slipNumber.trim() || undefined : undefined,
        notes: paymentNotes.trim() || undefined,
      };

      const res = await apiService.recordPayment(payload);
      if (res?.success) {
        const createdPayment = res.data?.payment;
        const receiptNo = createdPayment?.receiptNumber || 'REC-PROCESSED';
        setPaymentSuccessMessage(`Payment of KSh ${numAmount.toLocaleString()} recorded successfully! Receipt #${receiptNo}`);
        setIsRecordPaymentOpen(false);
        setIsConfirmingPayment(false);

        // Refresh authoritative position
        await loadLearnerFeePosition(selectedStudent.id, selectedTerm);
        if (onRefreshStudents) await onRefreshStudents();

        // Prompt or open receipt modal immediately
        if (createdPayment?.id) {
          setReceiptModalPaymentId(createdPayment.id);
          setIsReceiptModalOpen(true);
        }
      } else {
        setPaymentError(res?.message || 'Failed to record payment. Please check references.');
      }
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to submit payment. Please verify transaction reference.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Payments list for the selected student
  const paymentsList = feePositionData?.payments || [];
  const statementList = feePositionData?.statement || [];
  const latestPayment = paymentsList.length > 0 ? paymentsList[paymentsList.length - 1] : null;

  return (
    <div className="space-y-4">
      {/* 1. TOP PROMINENT SEARCH BAR */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-primary">point_of_sale</span>
              <span>Fee Collection & Cashier Desk</span>
            </h1>
            <p className="text-xs text-on-surface-variant">
              Search a learner, view their real-time ledger, record payment, and issue official receipts in one screen.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onNavigateToFullLedger && (
              <button
                type="button"
                onClick={onNavigateToFullLedger}
                className="px-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Switch to full school ledger roster table"
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                <span>Full Accounting Ledger</span>
              </button>
            )}
          </div>
        </div>

        {/* The Single Prominent Search Box */}
        <div className="relative">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[22px]">
              person_search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search learner by Name, Admission Number (e.g. PP1-001, Tania), Class, or Stream..."
              className="w-full pl-11 pr-24 py-3 rounded-xl border-2 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-medium bg-surface text-on-surface placeholder:text-on-surface-variant/60 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Instant Dropdown Suggestions */}
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 overflow-hidden z-30 max-h-80 overflow-y-auto animate-in fade-in duration-100">
              <div className="px-3 py-1.5 bg-surface-container text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Matching Learners ({searchResults.length})
              </div>
              <div className="divide-y divide-outline-variant/20">
                {searchResults.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectStudent(st)}
                    className="w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {st.profilePhotoUrl ? (
                          <img src={st.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          st.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface">{st.name}</div>
                        <div className="text-[11px] text-on-surface-variant font-mono">
                          Adm: <strong className="text-on-surface">{st.admNo || '--'}</strong> · {st.grade || '--'}{' '}
                          {st.stream ? `(${st.stream})` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-primary">
                        KES {(st.feeBalance ?? 0).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-on-surface-variant">Outstanding</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {paymentSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-600 text-[24px]">verified</span>
            <div className="text-xs font-semibold">{paymentSuccessMessage}</div>
          </div>
          {latestPayment && (
            <button
              type="button"
              onClick={() => {
                setReceiptModalPaymentId(latestPayment.id);
                setIsReceiptModalOpen(true);
              }}
              className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Receipt</span>
            </button>
          )}
        </div>
      )}

      {arrearsSuccessMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-[24px]">verified</span>
            <div className="text-xs font-semibold">{arrearsSuccessMessage}</div>
          </div>
          <button
            type="button"
            onClick={() => setArrearsSuccessMessage(null)}
            className="p-1 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {selectedStudent ? (
        <>
          {/* 2. LEARNER RESULT CARD */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-4">
                {/* Photo / Avatar Placeholder */}
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 text-primary flex items-center justify-center font-bold text-xl overflow-hidden shadow-xs">
                    {selectedStudent.profilePhotoUrl ? (
                      <img src={selectedStudent.profilePhotoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-extrabold">{selectedStudent.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  {isFinanceStaff && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-primary text-white hover:bg-primary-dark shadow-sm text-[11px] cursor-pointer"
                      title="Upload or change learner photograph"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isUploadingPhoto ? 'sync' : 'photo_camera'}
                      </span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Profile Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-on-surface">{selectedStudent.name}</h2>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-surface-container-high text-on-surface border border-outline-variant/30">
                      Adm: {selectedStudent.admNo || '--'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary">
                      {selectedStudent.grade || '--'} · {selectedStudent.stream || 'Main Stream'}
                    </span>
                  </div>

                  <div className="text-xs text-on-surface-variant flex items-center gap-3 flex-wrap">
                    {selectedStudent.guardianName && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">family_restroom</span>
                        <span>Guardian: <strong>{selectedStudent.guardianName}</strong></span>
                      </span>
                    )}
                    {selectedStudent.guardianPhone && (
                      <span className="flex items-center gap-1 font-mono">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        <span>{selectedStudent.guardianPhone}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      <span>Academic Year: <strong>2026</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Term Selector */}
              <div className="flex items-center gap-2 self-start md:self-center">
                <span className="text-xs font-semibold text-on-surface-variant">Active Period:</span>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="term-1">Term 1 (2026)</option>
                  <option value="term-2">Term 2 (2026)</option>
                  <option value="term-3">Term 3 (Current)</option>
                  <option value="ALL">Whole Year (Consolidated)</option>
                </select>
              </div>
            </div>

            {/* 3. FOUR PROMINENT FINANCIAL SUMMARY CARDS */}
            <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Fees This Term */}
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 relative overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Fees This Term</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-on-surface mt-1">
                  KSh {financials.feesThisTerm.toLocaleString()}
                </div>
                <div className="text-[10px] text-on-surface-variant mt-0.5">Assigned termly charges</div>
              </div>

              {/* Card 2: Previous Balance */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 relative overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Previous Balance</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-amber-950 mt-1">
                  KSh {financials.previousBalance.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-800 mt-0.5">Brought-forward arrears</div>
              </div>

              {/* Card 3: Total Paid */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Total Paid</div>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950 mt-1">
                  KSh {financials.totalPaid.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-800 mt-0.5">Allocated collections</div>
              </div>

              {/* Card 4: Outstanding Balance */}
              <div
                className={`p-4 rounded-xl border relative overflow-hidden ${
                  financials.outstandingBalance === 0
                    ? 'bg-teal-500/10 border-teal-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    financials.outstandingBalance === 0 ? 'text-teal-900' : 'text-rose-900'
                  }`}
                >
                  Outstanding Balance
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono mt-1 ${
                    financials.outstandingBalance === 0 ? 'text-teal-950' : 'text-rose-950'
                  }`}
                >
                  KSh {financials.outstandingBalance.toLocaleString()}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                      financials.outstandingBalance === 0 ? 'bg-teal-700 text-white' : 'bg-rose-700 text-white'
                    }`}
                  >
                    {financials.statusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Formula Explanation Banner */}
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container-high/50 border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-on-surface-variant gap-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">calculate</span>
                <span className="font-semibold text-on-surface">Formula:</span>
                <span className="font-mono">
                  Fees This Term (KSh {financials.feesThisTerm.toLocaleString()}) + Previous Balance (KSh{' '}
                  {financials.previousBalance.toLocaleString()}) − Total Paid (KSh {financials.totalPaid.toLocaleString()}) ={' '}
                  <strong className="text-on-surface font-mono">
                    KSh {financials.outstandingBalance.toLocaleString()}
                  </strong>
                </span>
              </div>
              {financials.outstandingBalance === 0 && financials.overpaymentCredit > 0 && (
                <div className="font-bold text-teal-800">
                  Prepayment Credit Available: KSh {financials.overpaymentCredit.toLocaleString()}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS (DIRECTLY ON PAGE) */}
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenRecordPayment}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Record Payment</span>
              </button>

              <button
                type="button"
                onClick={handleOpenRecordArrears}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">history_edu</span>
                <span>Record Arrears</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStatementModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px] text-primary">receipt_long</span>
                <span>View Fee Statement</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLedgerTab('history')}
                className="px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px] text-primary">history</span>
                <span>View Payment History</span>
              </button>

              {latestPayment && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptModalPaymentId(latestPayment.id);
                    setIsReceiptModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-primary">print</span>
                  <span>Print Receipt (#{latestPayment.receiptNumber})</span>
                </button>
              )}

              {feePositionData?.activeInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceForModal(feePositionData.activeInvoice);
                    setIsInvoiceModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-primary">description</span>
                  <span>View / Print Invoice</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. COMPACT RECORD PAYMENT FORM / PANEL */}
          {isRecordPaymentOpen && (
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-emerald-600/30 shadow-md p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">Record Fee Payment</h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Recording for: <strong className="text-on-surface">{selectedStudent.name}</strong> ({selectedStudent.admNo})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {paymentError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{paymentError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                {/* 1-Click Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">1. Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('MPESA')}
                      className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'MPESA'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-surface-container border-outline-variant/40 text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">smartphone</span>
                      <div>
                        <div>M-Pesa</div>
                        <div className="text-[10px] font-normal opacity-90">Mobile Money</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BANK_DEPOSIT')}
                      className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'BANK_DEPOSIT'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-surface-container border-outline-variant/40 text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">account_balance</span>
                      <div>
                        <div>Bank Deposit</div>
                        <div className="text-[10px] font-normal opacity-90">Slip / Transfer</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'CASH'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-surface-container border-outline-variant/40 text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">local_atm</span>
                      <div>
                        <div>Cash</div>
                        <div className="text-[10px] font-normal opacity-90">Counter Receipt</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-on-surface">
                        2. Amount Paid (KES) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        Flexible Installments Accepted
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-on-surface-variant font-mono">
                        KES
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter payment amount (e.g. 200, 500, 1000...)"
                        className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">payments</span>
                      <span>Accept any partial payment or installment amount. No fixed requirement.</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      3. Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="text-[10px] text-on-surface-variant mt-1">
                      Academic Period: <strong>2026 · {selectedTerm.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>

                {/* Conditional Reference Fields */}
                {paymentMethod === 'MPESA' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div>
                      <label className="block text-xs font-bold text-emerald-950 mb-1">
                        M-Pesa Transaction Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value.toUpperCase())}
                        placeholder="e.g. QHJ8921KL"
                        className="w-full px-3 py-2 rounded-lg border border-emerald-300 font-mono text-xs uppercase font-bold text-emerald-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-950 mb-1">M-Pesa Phone (Optional)</label>
                      <input
                        type="text"
                        value={mpesaPhoneNumber}
                        onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full px-3 py-2 rounded-lg border border-emerald-300 font-mono text-xs text-emerald-950 bg-white"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'BANK_DEPOSIT' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">Select Bank</label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-white"
                      >
                        {KENYAN_BANKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Slip / Deposit Reference <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={slipNumber}
                        onChange={(e) => setSlipNumber(e.target.value)}
                        placeholder="e.g. SLIP-8921"
                        className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 font-mono text-xs text-on-surface bg-white"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'CASH' && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-700 text-[20px]">info</span>
                    <span>
                      Cash collected at counter. An official system receipt number (e.g.{' '}
                      <strong className="font-mono">REC-2026-XXXX</strong>) will be issued automatically with your cashier
                      credentials recorded in the audit trail.
                    </span>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Optional Notes / Remarks</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Paid by aunt / Partial payment for term balance"
                    className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Concise Confirmation before saving */}
                {isConfirmingPayment ? (
                  <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary text-xs space-y-2 animate-in fade-in">
                    <div className="font-bold text-sm text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">help</span>
                      <span>Confirm Payment Submission</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-on-surface font-mono">
                      <div>Learner: <strong>{selectedStudent.name}</strong></div>
                      <div>Adm: <strong>{selectedStudent.admNo}</strong></div>
                      <div>Amount: <strong>KES {Number(paymentAmount).toLocaleString()}</strong></div>
                      <div>Method: <strong>{paymentMethod}</strong></div>
                      {transactionReference && <div>Ref: <strong>{transactionReference}</strong></div>}
                      {slipNumber && <div>Slip: <strong>{slipNumber}</strong></div>}
                      <div className="col-span-2 pt-1 border-t border-primary/20">
                        Resulting Balance:{' '}
                        <strong className="text-emerald-700">
                          KES {Math.max(0, financials.outstandingBalance - Number(paymentAmount)).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingPayment}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>{isSubmittingPayment ? 'Saving...' : 'Confirm & Save Payment'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingPayment(false)}
                        className="px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-semibold hover:bg-surface-container cursor-pointer"
                      >
                        Back to Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRecordPaymentOpen(false)}
                      className="px-4 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-semibold hover:bg-surface-container cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      <span>Review & Confirm Payment</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* 4b. RECORD ARREARS FORM / PANEL */}
          {isRecordArrearsOpen && (
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-amber-500/40 shadow-md p-4 sm:p-5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">history_edu</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">Record Unbilled / Opening Fee Arrears</h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Recording for: <strong className="text-on-surface">{selectedStudent.name}</strong> ({selectedStudent.admNo})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecordArrearsOpen(false)}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {arrearsError && (
                <div className="p-3 mb-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{arrearsError}</span>
                </div>
              )}

              {duplicateWarning && (
                <div className="p-4 mb-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-on-surface space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">warning</span>
                    <div>
                      <h4 className="font-bold text-xs text-amber-700">Potential Duplicate Arrears Detected</h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{duplicateWarning.message}</p>
                      {duplicateWarning.existingEntry && (
                        <div className="mt-2 p-2.5 rounded-lg bg-surface-container text-xs space-y-1 border border-outline-variant/30">
                          <div><span className="text-on-surface-variant">Invoice #:</span> <span className="font-mono font-bold text-primary">{duplicateWarning.existingEntry.invoiceNumber}</span></div>
                          <div><span className="text-on-surface-variant">Amount:</span> <span className="font-bold">KES {(Number(duplicateWarning.existingEntry.amount) || 0).toLocaleString()}</span></div>
                          <div><span className="text-on-surface-variant">Period:</span> <span className="font-semibold">{duplicateWarning.existingEntry.academicYearId} {duplicateWarning.existingEntry.termId}</span></div>
                          <div><span className="text-on-surface-variant">Reason / Item:</span> <span>{duplicateWarning.existingEntry.reason}</span></div>
                          <div><span className="text-on-surface-variant">Source:</span> <span className="italic">{duplicateWarning.existingEntry.source}</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {duplicateWarning.existingEntry?.invoiceId && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecordArrearsOpen(false);
                          setDuplicateWarning(null);
                          const matchInv = feePositionData?.invoices?.find((i: any) => i.id === duplicateWarning.existingEntry.invoiceId);
                          if (matchInv) {
                            setSelectedInvoiceForModal(matchInv);
                            setIsInvoiceModalOpen(true);
                          } else {
                            setActiveLedgerTab('statement');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>Inspect Existing Entry</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSubmitArrears(undefined, true)}
                      disabled={isSubmittingArrears}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">done_all</span>
                      <span>{isSubmittingArrears ? 'Saving...' : 'Confirm & Save Duplicate Anyway'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateWarning(null)}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant/40 text-on-surface-variant hover:text-on-surface text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={(e) => handleSubmitArrears(e, false)} className="space-y-4">
                {/* Learner Info Confirmation Badge */}
                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-on-surface-variant text-[10px] block uppercase font-bold">Selected Learner</span>
                      <span className="font-bold text-on-surface">{selectedStudent.name}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant text-[10px] block uppercase font-bold">Admission Number</span>
                      <span className="font-mono font-bold text-primary">{selectedStudent.admNo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-on-surface-variant text-[10px] block uppercase font-bold">Current Total Due</span>
                      <span className="font-mono font-bold text-on-surface">KSh {(financials.totalDue ?? (financials.feesThisTerm + financials.previousBalance) ?? 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant text-[10px] block uppercase font-bold">Current Net Balance</span>
                      <span className={`font-mono font-bold ${(financials.outstandingBalance ?? 0) > 0 ? 'text-error' : 'text-emerald-700'}`}>
                        KSh {(financials.outstandingBalance ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Arrears Amount */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Arrears Amount (KES) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-on-surface-variant font-mono">
                        KSh
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={arrearsAmount}
                        onChange={(e) => setArrearsAmount(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full pl-12 pr-3 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>
                    {/* Flexible Arrears Input */}
                    <p className="text-[11px] text-on-surface-variant mt-1.5">
                      Enter the exact arrears amount to record.
                    </p>
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={arrearsAcademicYear}
                      onChange={(e) => setArrearsAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="year-2026">2026 (Current Academic Year)</option>
                      <option value="year-2025">2025 (Previous Academic Year)</option>
                      <option value="year-2024">2024 (Historical Year)</option>
                      <option value="year-2023">2023 (Historical Year)</option>
                    </select>
                  </div>

                  {/* Academic Term */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Applicable Term <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={arrearsTerm}
                      onChange={(e) => setArrearsTerm(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="term-2026-t1">Term 1</option>
                      <option value="term-2026-t2">Term 2</option>
                      <option value="term-2026-t3">Term 3</option>
                      <option value="ALL">Annual / Opening Balance</option>
                    </select>
                  </div>
                </div>

                {/* Reason / Description */}
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Arrears Description / Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={arrearsReason}
                    onChange={(e) => setArrearsReason(e.target.value)}
                    placeholder="e.g. Outstanding fees from a previous term"
                    className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  {/* Quick reason suggestions */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {[
                      'Outstanding fees from previous term',
                      'Opening arrears upon admission',
                      'Unbilled transport fee arrears',
                      'Boarding / catering balance brought forward',
                    ].map((reasonStr) => (
                      <button
                        key={reasonStr}
                        type="button"
                        onClick={() => setArrearsReason(reasonStr)}
                        className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-[10px] text-on-surface-variant transition-colors cursor-pointer"
                      >
                        {reasonStr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Source */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Source of Debt / Record <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={arrearsSource}
                      onChange={(e) => setArrearsSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="Verified school records">Verified school records</option>
                      <option value="Previous school ledger">Previous school ledger</option>
                      <option value="Director / Bursar approved opening balance">Director / Bursar approved opening balance</option>
                      <option value="Authorized financial audit adjustment">Authorized financial audit adjustment</option>
                      <option value="Transfer / Admission records">Transfer / Admission records</option>
                    </select>
                  </div>

                  {/* Original Due Date */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Original Due Date <span className="text-[10px] text-on-surface-variant font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={arrearsDueDate}
                      onChange={(e) => setArrearsDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Reference / Supporting Note */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Reference / Supporting Note <span className="text-[10px] text-on-surface-variant font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={arrearsReferenceNote}
                      onChange={(e) => setArrearsReferenceNote(e.target.value)}
                      placeholder="e.g. Physical file ref #842 or paper receipt #104"
                      className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  {/* Recorded By (Read Only) */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Recorded By <span className="text-[10px] text-emerald-700 font-semibold">(Authenticated User)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={user ? `${user.name || user.email} (${user.role})` : 'Authenticated Finance Staff'}
                      className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container text-on-surface text-xs font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Submit & Cancel Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecordArrearsOpen(false);
                      setDuplicateWarning(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-semibold hover:bg-surface-container cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingArrears}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{isSubmittingArrears ? 'Saving Arrears...' : 'Save Arrears Entry'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 5. TRANSACTION HISTORY & CHRONOLOGICAL FEE STATEMENT TABS */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 pt-3 border-b border-outline-variant/20 bg-surface-container">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveLedgerTab('history')}
                  className={`px-3.5 py-2 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLedgerTab === 'history'
                      ? 'bg-surface-container-lowest text-primary border-t-2 border-primary shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  <span>Payment History ({paymentsList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLedgerTab('statement')}
                  className={`px-3.5 py-2 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeLedgerTab === 'statement'
                      ? 'bg-surface-container-lowest text-primary border-t-2 border-primary shadow-2xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  <span>Chronological Fee Statement</span>
                </button>
              </div>

              {activeLedgerTab === 'statement' && (
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer pb-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  <span>Print Statement</span>
                </button>
              )}
            </div>

            <div className="p-4 sm:p-5">
              {activeLedgerTab === 'history' ? (
                /* Payment History Table */
                paymentsList.length === 0 ? (
                  <div className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[36px] text-outline-variant mb-1">payments</span>
                    <p className="font-semibold text-xs text-on-surface">No payments recorded for this learner yet.</p>
                    <p className="text-[11px] mt-0.5">Click &quot;Record Payment&quot; above to add a new transaction.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container text-on-surface-variant font-bold text-[10px] uppercase border-b border-outline-variant/30">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Receipt #</th>
                          <th className="px-3 py-2 text-right">Amount (KES)</th>
                          <th className="px-3 py-2">Method</th>
                          <th className="px-3 py-2">Reference</th>
                          <th className="px-3 py-2">Period</th>
                          <th className="px-3 py-2">Recorded By</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 font-mono text-[11px]">
                        {paymentsList.map((p: any) => (
                          <tr key={p.id} className="hover:bg-surface-container/50 transition-colors">
                            <td className="px-3 py-2 font-semibold text-on-surface">{p.paymentDate}</td>
                            <td className="px-3 py-2 font-bold text-primary">{p.receiptNumber}</td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-800">
                              {(Number(p.amount) || 0).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 font-sans font-semibold text-on-surface">{p.paymentMethod}</td>
                            <td className="px-3 py-2 text-on-surface-variant">{p.transactionReference || '--'}</td>
                            <td className="px-3 py-2 font-sans text-on-surface-variant">2026</td>
                            <td className="px-3 py-2 font-sans text-on-surface-variant">{p.recordedByName || 'Cashier'}</td>
                            <td className="px-3 py-2 text-center font-sans">
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                {p.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptModalPaymentId(p.id);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-primary/10 text-primary font-bold text-[10px] transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[13px]">print</span>
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Chronological Statement Table */
                statementList.length === 0 ? (
                  <div className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[36px] text-outline-variant mb-1">receipt_long</span>
                    <p className="font-semibold text-xs text-on-surface">No statement items generated.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container text-on-surface-variant font-bold text-[10px] uppercase border-b border-outline-variant/30">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Transaction Description</th>
                          <th className="px-3 py-2 text-right">Debit / Billed (KES)</th>
                          <th className="px-3 py-2 text-right">Credit / Paid (KES)</th>
                          <th className="px-3 py-2 text-right">Running Balance (KES)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 font-mono text-[11px]">
                        {statementList.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                            <td className="px-3 py-2 text-on-surface font-semibold">{item.date}</td>
                            <td className="px-3 py-2 font-sans font-medium text-on-surface">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.debit > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                />
                                <span>{item.description}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-rose-800">
                              {item.debit > 0 ? Number(item.debit).toLocaleString() : '--'}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-800">
                              {item.credit > 0 ? Number(item.credit).toLocaleString() : '--'}
                            </td>
                            <td className="px-3 py-2 text-right font-extrabold text-on-surface">
                              {Number(item.runningBalance).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      ) : (
        /* Empty State: No Student Selected */
        <div className="p-16 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-[48px] text-primary/40 mb-2">person_search</span>
          <h3 className="font-bold text-base text-on-surface">Search a Learner to Begin Fee Collection</h3>
          <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
            Type an admission number (e.g. <strong className="font-mono">PP1-001</strong>) or name in the box above to immediately
            inspect their financial position, record a cash/M-Pesa payment, and print receipts.
          </p>
        </div>
      )}

      {/* INSPECTION MODALS */}
      {receiptModalPaymentId && (
        <ReceiptViewModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptModalPaymentId(null);
          }}
          paymentId={receiptModalPaymentId}
        />
      )}

      {selectedStudent && (
        <FeeStatementModal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
        />
      )}

      {selectedInvoiceForModal && (
        <InvoiceDetailsModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoiceForModal(null);
          }}
          invoice={selectedInvoiceForModal}
        />
      )}
    </div>
  );
};
