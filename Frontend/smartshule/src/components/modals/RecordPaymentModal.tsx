import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { Student, StudentInvoice } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  detectReceiptPrinter,
  setReceiptAutoPrint,
  PrinterDetectionResult
} from '../../utils/printerDetector';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  initialInvoice?: StudentInvoice;
  initialMode?: 'PAYMENT' | 'ARREARS';
  onPaymentRecorded?: (payment: any) => void;
  onArrearRecorded?: (arrearData: any) => void;
  onRefreshStudents?: () => void | Promise<void>;
}

type PaymentChannel = 'CASH' | 'BANK_DEPOSIT' | 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE';
type EntryTab = 'PAYMENT' | 'ARREARS';

const KENYAN_BANKS = [
  'KCB Bank Kenya',
  'Equity Bank Kenya',
  'Co-operative Bank of Kenya',
  'NCBA Bank',
  'Absa Bank Kenya',
  'Stanbic Bank Kenya',
  'Family Bank',
  'Postbank Kenya',
  'Diamond Trust Bank (DTB)',
  'Standard Chartered Kenya',
  'I&M Bank',
  'Other Bank',
];

const ARREAR_REASONS = [
  'Opening Fee Arrears / Prior Balance',
  'Previous Term Unpaid Balance Carried Forward',
  'Previous School Unpaid Balance',
  'Transport & Bus Service Arrears',
  'Boarding & Meals Arrears',
  'Lost Item / Damage / Textbook Levy',
  'Custom Reason',
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  students = [],
  initialStudent,
  initialInvoice,
  initialMode = 'PAYMENT',
  onPaymentRecorded,
  onArrearRecorded,
  onRefreshStudents,
}) => {
  const { user } = useAuth();

  // Active Tab: Manual Paid Fees vs Arrears Recording
  const [activeTab, setActiveTab] = useState<EntryTab>(initialMode);

  // Student & Invoice selection
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudent?.id || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoice?.id || '');
  const [schoolId, setSchoolId] = useState<string>(user?.schoolId || '');
  const [schoolData, setSchoolData] = useState<any>(null);

  // Local student balance tracker (updates immediately after recording without forcing modal close)
  const [localStudentBalance, setLocalStudentBalance] = useState<number | null>(null);

  // General Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // --- PAYMENT SPECIFIC FIELDS ---
  const [amount, setAmount] = useState('');
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('CASH');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Cash-specific fields
  const [cashReceiptRef, setCashReceiptRef] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [cashDenominations, setCashDenominations] = useState('');
  const [isCashVerified, setIsCashVerified] = useState(false);

  // Bank Deposit-specific fields
  const [bankName, setBankName] = useState('');
  const [customBankName, setCustomBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [depositorName, setDepositorName] = useState('');
  const [schoolBankAccount, setSchoolBankAccount] = useState('');
  const [isSlipVerified, setIsSlipVerified] = useState(false);

  // M-Pesa / Transfer / Cheque fields
  const [transactionReference, setTransactionReference] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Payment UI state
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [recordedResult, setRecordedResult] = useState<any | null>(null);

  // Printer & multi-channel receipt issuance state
  const [printerStatus, setPrinterStatus] = useState<PrinterDetectionResult>({
    hasReceiptPrinter: false,
    printerType: 'SYSTEM_DEFAULT',
    printerName: 'Standard System Printer',
    autoPrintEnabled: false,
  });
  const [isAutoPrinting, setIsAutoPrinting] = useState(false);
  const [resendingChannel, setResendingChannel] = useState<'email' | 'whatsapp' | null>(null);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  // --- ARREARS SPECIFIC FIELDS ---
  const [arrearAmount, setArrearAmount] = useState<number | ''>('');
  const [arrearMode, setArrearMode] = useState<'ADD' | 'SET'>('ADD');
  const [arrearReason, setArrearReason] = useState('Opening Fee Arrears / Prior Balance');
  const [arrearCustomReason, setArrearCustomReason] = useState('');
  const [arrearYear, setArrearYear] = useState('year-2026');
  const [arrearTerm, setArrearTerm] = useState('term-2026-t1');
  const [arrearDueDate, setArrearDueDate] = useState('');
  const [arrearNotes, setArrearNotes] = useState('');
  const [isSubmittingArrear, setIsSubmittingArrear] = useState(false);

  // Detect connected receipt printers on modal open
  useEffect(() => {
    if (isOpen) {
      detectReceiptPrinter().then((status) => {
        setPrinterStatus(status);
      });
    }
  }, [isOpen]);

  // Reset/sync modal state when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode || 'PAYMENT');
      const targetStudent = initialStudent || (students.length > 0 ? students[0] : undefined);
      setSelectedStudentId(targetStudent?.id || '');
      setLocalStudentBalance(targetStudent?.feeBalance ?? null);
      setSelectedInvoiceId(initialInvoice?.id || '');
      setStudentSearch('');
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setCashReceiptRef('');
      setReceivedFrom('');
      setCashDenominations('');
      setIsCashVerified(false);
      setBankName('');
      setCustomBankName('');
      setBankBranch('');
      setSlipNumber('');
      setDepositorName('');
      setSchoolBankAccount('');
      setIsSlipVerified(false);
      setTransactionReference('');
      setMpesaPhoneNumber('');
      setPaymentNotes('');
      setArrearAmount('');
      setArrearMode('ADD');
      setArrearReason('Opening Fee Arrears / Prior Balance');
      setArrearCustomReason('');
      setArrearDueDate('');
      setArrearNotes('');
      setFeedback(null);
      setRecordedResult(null);
    }
  }, [isOpen, initialStudent, initialInvoice, initialMode]);

  // Load School Metadata
  useEffect(() => {
    if (!isOpen) return;
    apiService.getSchool().then((res) => {
      if (res?.data) {
        setSchoolData(res.data);
        if (!schoolId) setSchoolId(res.data.id);
      }
    }).catch(() => {});
  }, [isOpen, schoolId]);

  // Load student invoices helper
  const fetchStudentInvoices = async (studentId: string) => {
    if (!studentId) {
      setInvoices([]);
      setSelectedInvoiceId('');
      return;
    }
    setIsLoadingInvoices(true);
    try {
      const res = await apiService.getInvoices({ studentId });
      if (res.success && res.data) {
        setInvoices(res.data);
        // Auto-select invoice: either keep initial if valid, or select the first one with a balance
        if (initialInvoice && res.data.some((i: StudentInvoice) => i.id === initialInvoice.id)) {
          setSelectedInvoiceId(initialInvoice.id);
        } else {
          const withBalance = res.data.find((i: StudentInvoice) => (i.balance || 0) > 0);
          if (withBalance) {
            setSelectedInvoiceId(withBalance.id);
          } else if (res.data.length > 0) {
            setSelectedInvoiceId(res.data[0].id);
          } else {
            setSelectedInvoiceId('');
          }
        }
      } else {
        setInvoices([]);
        setSelectedInvoiceId('');
      }
    } catch {
      setInvoices([]);
      setSelectedInvoiceId('');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Sync invoices when selected student changes
  useEffect(() => {
    if (selectedStudentId) {
      const st = students.find(s => s.id === selectedStudentId);
      if (st) {
        setLocalStudentBalance(st.feeBalance ?? 0);
      }
      fetchStudentInvoices(selectedStudentId);
    } else {
      setInvoices([]);
      setSelectedInvoiceId('');
      setLocalStudentBalance(null);
    }
  }, [selectedStudentId, students]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const currentInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  // Current balance display
  const effectiveBalance = localStudentBalance !== null
    ? localStudentBalance
    : (currentStudent?.feeBalance || 0);

  // Calculations for Payment
  const numAmount = Number(amount) || 0;
  const invBalance = currentInvoice?.balance || 0;
  const projectedInvoiceBalance = Math.max(0, invBalance - numAmount);
  const projectedTotalBalanceAfterPay = Math.max(0, effectiveBalance - numAmount);

  // Calculations for Arrear
  const numArrear = Number(arrearAmount) || 0;
  const projectedTotalBalanceAfterArrear =
    arrearMode === 'SET' ? numArrear : effectiveBalance + numArrear;

  // Filter students for search
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.grade && s.grade.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  // ----------------------------------------------------------------------
  // SUBMIT HANDLER: RECORD MANUAL PAYMENT
  // ----------------------------------------------------------------------
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      setFeedback({ type: 'error', message: 'Please select an enrolled learner first.' });
      return;
    }
    if (currentStudent?.isSponsored) {
      setFeedback({
        type: 'error',
        message: 'Cannot record fee payment: This learner is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and has zero fee liability.'
      });
      return;
    }
    if (!selectedInvoiceId) {
      setFeedback({
        type: 'error',
        message: 'No active billed invoice selected. You can switch to the "Record / Adjust Arrears" tab to initialize this student\'s balance.'
      });
      return;
    }
    if (numAmount <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid payment amount greater than zero.' });
      return;
    }

    if (paymentChannel === 'BANK_DEPOSIT') {
      if (!bankName) {
        setFeedback({ type: 'error', message: 'Please select the Bank deposited into.' });
        return;
      }
      if (!slipNumber.trim()) {
        setFeedback({ type: 'error', message: 'Please enter the Bank Deposit Slip / Teller Reference number.' });
        return;
      }
    }

    setIsSubmittingPayment(true);
    setFeedback(null);

    const effectiveBank = bankName === 'Other Bank' ? (customBankName.trim() || 'Bank') : bankName;
    const finalTxRef =
      paymentChannel === 'CASH'
        ? (cashReceiptRef.trim() || `CSH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`)
        : paymentChannel === 'BANK_DEPOSIT'
        ? (slipNumber.trim() || `DEP-${Date.now().toString().slice(-6)}`)
        : (transactionReference.trim() || `TX-${Date.now().toString().slice(-6)}`);

    try {
      const res = await apiService.recordPayment({
        schoolId: schoolId || 'school-001',
        invoiceId: selectedInvoiceId,
        amount: numAmount,
        paymentMethod: paymentChannel,
        transactionReference: finalTxRef,
        mpesaPhoneNumber: paymentChannel === 'MPESA' ? mpesaPhoneNumber : undefined,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        recordedByUserId: user?.id || 'admin',
        bankName: paymentChannel === 'BANK_DEPOSIT' ? effectiveBank : undefined,
        bankBranch: paymentChannel === 'BANK_DEPOSIT' ? bankBranch : undefined,
        slipNumber: paymentChannel === 'BANK_DEPOSIT' ? slipNumber : undefined,
        depositorName: paymentChannel === 'BANK_DEPOSIT' ? depositorName : undefined,
        receivedFrom: paymentChannel === 'CASH' ? receivedFrom : undefined,
        notes: [
          paymentChannel === 'CASH' && cashDenominations ? `Notes: ${cashDenominations}` : null,
          paymentChannel === 'BANK_DEPOSIT' && schoolBankAccount ? `A/C: ${schoolBankAccount}` : null,
          paymentNotes.trim() ? paymentNotes.trim() : null,
        ].filter(Boolean).join(' | ') || undefined,
      });

      if (res.success && res.data) {
        const delivery = res.data.delivery || {};
        const receipt = res.data.receipt || {};
        const newTotalBal = res.data.studentTotalBalance !== undefined
          ? res.data.studentTotalBalance
          : projectedTotalBalanceAfterPay;

        setLocalStudentBalance(newTotalBal);

        setRecordedResult({
          ...res.data,
          delivery,
          receipt,
          studentName: currentStudent?.name,
          admissionNumber: currentStudent?.admNo,
          gradeLevel: currentStudent?.grade,
          channel: paymentChannel,
          bankName: effectiveBank,
          slipNumber,
          cashReceiptRef: finalTxRef,
          paymentDate,
          amountPaid: numAmount,
          previousBalance: invBalance,
          newBalance: res.data.updatedInvoice?.balance !== undefined ? res.data.updatedInvoice.balance : projectedInvoiceBalance,
          studentTotalBalance: newTotalBal,
          invoiceNumber: currentInvoice?.invoiceNumber,
        });

        if (onPaymentRecorded) {
          onPaymentRecorded(res.data);
        }
        if (onRefreshStudents) {
          onRefreshStudents();
        }

        // Auto-print receipt if receipt printer is detected or auto-print is enabled
        if (printerStatus.hasReceiptPrinter || printerStatus.autoPrintEnabled) {
          setIsAutoPrinting(true);
          setTimeout(() => {
            window.print();
            setIsAutoPrinting(false);
          }, 450);
        }
      } else {
        setFeedback({ type: 'error', message: res.message || 'Payment recording failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error recording payment.' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ----------------------------------------------------------------------
  // SUBMIT HANDLER: RECORD / ADJUST ARREARS
  // ----------------------------------------------------------------------
  const handleArrearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      setFeedback({ type: 'error', message: 'Please select an enrolled learner first.' });
      return;
    }
    if (currentStudent?.isSponsored) {
      setFeedback({
        type: 'error',
        message: 'Cannot record arrears: This learner is enrolled under the Institutional Scholarship Program (100% Fee Waiver) and is exempt from all fee charges.'
      });
      return;
    }
    if (numArrear < 0) {
      setFeedback({ type: 'error', message: 'Arrears amount cannot be negative.' });
      return;
    }

    const effectiveReason = arrearReason === 'Custom Reason' ? arrearCustomReason.trim() : arrearReason;
    if (!effectiveReason) {
      setFeedback({ type: 'error', message: 'Please provide a reason or category for the arrears.' });
      return;
    }

    setIsSubmittingArrear(true);
    setFeedback(null);

    try {
      const res = await apiService.addManualArrear({
        studentId: currentStudent.id,
        amount: numArrear,
        mode: arrearMode,
        reason: effectiveReason,
        academicYearId: arrearYear,
        termId: arrearTerm,
        dueDate: arrearDueDate || undefined,
        notes: arrearNotes.trim() || undefined,
      });

      if (res.success) {
        const updatedBal = res.data?.newBalance ?? projectedTotalBalanceAfterArrear;
        setLocalStudentBalance(updatedBal);

        setFeedback({
          type: 'success',
          message: res.message || `Arrears of KES ${numArrear.toLocaleString()} recorded successfully for ${currentStudent.name}! Updated Arrears Balance: KES ${updatedBal.toLocaleString()}.`
        });

        // Refresh invoices for this student immediately
        await fetchStudentInvoices(currentStudent.id);

        if (onArrearRecorded) {
          onArrearRecorded(res.data);
        }
        if (onRefreshStudents) {
          await onRefreshStudents();
        }

        // Reset arrear amount field
        setArrearAmount('');
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to record fee arrears.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error occurred while recording manual arrears.' });
    } finally {
      setIsSubmittingArrear(false);
    }
  };

  const handleResendReceipt = async (channel: 'email' | 'whatsapp') => {
    const paymentId = recordedResult?.payment?.id;
    if (!paymentId) return;
    setResendingChannel(channel);
    setResendFeedback(null);
    try {
      const res = await apiService.reissueReceipt(paymentId);
      if (res.success) {
        setResendFeedback(`Receipt re-issued and dispatched via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}!`);
      } else {
        setResendFeedback(res.message || 'Dispatch failed.');
      }
    } catch (err: any) {
      setResendFeedback(err.message || 'Error dispatching receipt.');
    } finally {
      setResendingChannel(null);
      setTimeout(() => setResendFeedback(null), 5000);
    }
  };

  // ----------------------------------------------------------------------
  // VIEW: OFFICIAL RECEIPT SLIP WHEN PAYMENT IS RECORDED
  // ----------------------------------------------------------------------
  if (recordedResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in font-sans">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
          {/* Header */}
          <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">Payment Recorded Successfully</h3>
                <p className="text-xs text-rose-100">Official Grace Seeds School Receipt Generated</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Printable Official Receipt Body */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
            {isAutoPrinting && (
              <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 no-print shadow-xs animate-pulse">
                <span className="material-symbols-outlined text-emerald-700 text-base">print</span>
                <span className="font-bold">Receipt printer detected — auto-printing official receipt...</span>
              </div>
            )}

            {/* Multi-Channel Parent Delivery Status Card */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 no-print">
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#7a1228]">
                  <span className="material-symbols-outlined text-xs">send</span>
                  Dispatched to Parent
                </span>
                <span className="text-[10px] font-medium text-slate-500">Multi-Channel</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* Email */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">mail</span>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 text-[10px] leading-tight">Email Receipt</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {recordedResult.delivery?.email?.recipient || 'Registered Email'}
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">check</span> Sent
                  </span>
                </div>

                {/* WhatsApp */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">chat</span>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 text-[10px] leading-tight">WhatsApp</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {recordedResult.delivery?.whatsApp?.recipient || 'Parent Phone'}
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">check</span> Sent
                  </span>
                </div>
              </div>

              {/* Resend actions & Hardware printer status */}
              <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-200">
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="material-symbols-outlined text-xs text-[#7a1228]">print</span>
                  <span className="font-medium">
                    {printerStatus.hasReceiptPrinter ? `${printerStatus.printerName} (Thermal Ready)` : 'System Printer Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={resendingChannel !== null}
                    onClick={() => handleResendReceipt('whatsapp')}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {resendingChannel === 'whatsapp' ? 'sync' : 'chat'}
                    </span>
                    {resendingChannel === 'whatsapp' ? 'Sending...' : 'Resend WA'}
                  </button>
                  <button
                    type="button"
                    disabled={resendingChannel !== null}
                    onClick={() => handleResendReceipt('email')}
                    className="text-[10px] font-bold text-[#7a1228] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {resendingChannel === 'email' ? 'sync' : 'mail'}
                    </span>
                    {resendingChannel === 'email' ? 'Sending...' : 'Resend Email'}
                  </button>
                </div>
              </div>
              {resendFeedback && (
                <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-1.5 rounded text-center">
                  {resendFeedback}
                </div>
              )}
            </div>

            {/* Actual Official Receipt Element (Printed via window.print()) */}
            <div id="smartshule-receipt-print" className="p-4 sm:p-5 space-y-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              {/* School Header */}
              <div className="text-center pb-3 border-b border-slate-200">
                <div className="text-base font-bold text-[#7a1228] uppercase tracking-wide">
                  {schoolData?.name || 'Grace Seeds School'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {schoolData?.address || 'KEMRI Street, Kisian, Kisumu, Kenya'} · Tel: {schoolData?.phone || '0745436312'} · Email: {schoolData?.email || 'schoolgraceseeds@gmail.com'}
                </div>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-200 rounded-full text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                  {recordedResult.channel === 'CASH' ? 'Official Cash Receipt' : 'Bank Deposit Acknowledgment'}
                </div>
              </div>

              {/* Receipt Details Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-slate-600 font-semibold">Receipt Number:</span>
                  <span className="font-mono font-bold text-[#7a1228] text-sm">
                    {recordedResult.payment?.receiptNumber || recordedResult.receiptNumber || 'REC-OFFICIAL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Date:</span>
                  <span className="font-mono font-medium text-slate-900">{recordedResult.paymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Learner Name:</span>
                  <span className="font-bold text-slate-900">{recordedResult.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Admission Number:</span>
                  <span className="font-mono font-bold text-slate-900">{recordedResult.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Grade Level:</span>
                  <span className="font-semibold text-slate-900">{recordedResult.gradeLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Invoice Settled:</span>
                  <span className="font-mono text-slate-900">{recordedResult.invoiceNumber}</span>
                </div>

                {/* Channel specifics */}
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-bold text-emerald-800">
                    {recordedResult.channel === 'CASH' && 'Cash Office (Currency Tendered)'}
                    {recordedResult.channel === 'BANK_DEPOSIT' && `Bank Deposit (${recordedResult.bankName})`}
                    {recordedResult.channel === 'MPESA' && 'M-Pesa E-Money'}
                    {recordedResult.channel === 'CHEQUE' && "Banker's Cheque"}
                    {recordedResult.channel === 'BANK_TRANSFER' && 'Bank Wire / EFT'}
                  </span>
                </div>
                {recordedResult.channel === 'BANK_DEPOSIT' && recordedResult.slipNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bank Slip / Teller #:</span>
                    <span className="font-mono font-bold text-slate-900">{recordedResult.slipNumber}</span>
                  </div>
                )}
                {recordedResult.channel === 'CASH' && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cash Voucher / Ref:</span>
                    <span className="font-mono font-bold text-slate-900">{recordedResult.cashReceiptRef}</span>
                  </div>
                )}

                {/* Financial Breakdown */}
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Previous Invoice Balance:</span>
                    <span className="font-mono">KES {recordedResult.previousBalance?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                    <span>Amount Paid:</span>
                    <span className="font-mono text-base">KES {recordedResult.amountPaid?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1">
                    <span>Remaining Invoice Balance:</span>
                    <span className={`font-mono ${recordedResult.newBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      KES {recordedResult.newBalance?.toLocaleString()}
                    </span>
                  </div>
                  {recordedResult.amountPaid > (recordedResult.previousBalance ?? 0) && (
                    <div className="flex justify-between font-bold text-teal-800 bg-teal-50 p-2 rounded-lg border border-teal-200">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">savings</span>
                        <span>Overpayment Credited (Advance):</span>
                      </span>
                      <span className="font-mono text-sm">+KES {(recordedResult.amountPaid - (recordedResult.previousBalance ?? 0)).toLocaleString()}</span>
                    </div>
                  )}
                  {recordedResult.studentTotalBalance !== undefined && (
                    <div className="flex justify-between font-bold text-slate-700 pt-1 border-t border-dashed border-slate-300">
                      <span>{recordedResult.studentTotalBalance < 0 ? 'Student Advance Credit Balance:' : 'Total Outstanding Student Arrears:'}</span>
                      <span className={`font-mono ${recordedResult.studentTotalBalance < 0 ? 'text-teal-700 font-extrabold' : recordedResult.studentTotalBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {recordedResult.studentTotalBalance < 0
                          ? `+KES ${Math.abs(recordedResult.studentTotalBalance).toLocaleString()} (Credit)`
                          : `KES ${recordedResult.studentTotalBalance.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stamp & Served By */}
              <div className="pt-2 flex justify-between items-end text-[11px] text-slate-500 border-t border-slate-200">
                <div>
                  <p>Served By: <span className="font-semibold text-slate-800">{user?.firstName} {user?.lastName} (Finance)</span></p>
                  <p className="text-[10px] text-slate-400">Grace Seeds School Ledger Verification</p>
                </div>
                <div className="border border-dashed border-slate-400 rounded p-1.5 text-center text-[9px] text-slate-400 uppercase font-mono">
                  Official School Stamp
                </div>
              </div>
            </div>

            {/* Quick Actions from Receipt view */}
            <div className="pt-2 flex flex-col gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 bg-[#7a1228] text-white font-semibold rounded-lg hover:bg-[#600e1f] text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Official Receipt {printerStatus.hasReceiptPrinter && '(Thermal POS)'}</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordedResult(null);
                    setAmount('');
                    fetchStudentInvoices(selectedStudentId);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  <span>Record Another Entry for {currentStudent?.name?.split(' ')[0] || 'Learner'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // MAIN MODAL VIEW: UNIFIED FEE PAYMENT & ARREARS ENTRY
  // ----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Unified Fee & Arrears Entry</h3>
              <p className="text-xs text-rose-100">Manual Fee Payments · Opening Balances · Arrears Adjustments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  {feedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* SECTION 1: LEARNER SELECTOR & LIVE STATUS CARD (ALWAYS VISIBLE) */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#7a1228]">person_search</span>
                  Select Enrolled Learner *
                </label>
                {students.length > 4 && (
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search name / Adm No..."
                      className="text-[11px] pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228] w-48 font-normal"
                    />
                    <span className="material-symbols-outlined text-[13px] text-slate-400 absolute left-1.5 top-1.5">search</span>
                  </div>
                )}
              </div>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setFeedback(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-medium"
              >
                {filteredStudents.length === 0 ? (
                  <option value="">No matching learners found</option>
                ) : (
                  <>
                    <option value="">-- Choose Learner to Credit / Adjust --</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Adm: {s.admNo}) · {s.grade} {s.stream ? `(${s.stream})` : ''} · Balance: KES {(s.feeBalance || 0).toLocaleString()}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Current Learner Financial Status Banner */}
            {currentStudent && (
              <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>{currentStudent.name}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                      Adm: {currentStudent.admNo}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {currentStudent.grade} {currentStudent.stream ? `· Stream ${currentStudent.stream}` : ''}
                    {currentStudent.guardianPhone ? ` · Contact: ${currentStudent.guardianPhone}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentStudent.isSponsored ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-300">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      100% Scholarship (Exempt)
                    </span>
                  ) : (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Arrears / Balance</span>
                      {effectiveBalance < 0 ? (
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-teal-100 text-teal-900 border border-teal-300">
                          <span className="material-symbols-outlined text-xs">savings</span>
                          Overpayment / Credit: +KES {Math.abs(effectiveBalance).toLocaleString()}
                        </span>
                      ) : effectiveBalance > 0 ? (
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-rose-100 text-rose-800">
                          <span className="material-symbols-outlined text-xs">priority_high</span>
                          KES {effectiveBalance.toLocaleString()} Due
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-emerald-100 text-emerald-800">
                          <span className="material-symbols-outlined text-xs">check</span>
                          KES 0 (Nil Balance)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ENTRY MODE TABS */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('PAYMENT');
                setFeedback(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'PAYMENT'
                  ? 'bg-white text-[#7a1228] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[17px] text-emerald-700">payments</span>
              <span>Record Paid Fees (Manual Entry)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ARREARS');
                setFeedback(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ARREARS'
                  ? 'bg-white text-[#7a1228] shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[17px] text-rose-700">assignment_late</span>
              <span>Record / Adjust Arrears</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: RECORD MANUAL PAID FEES (Cash, Bank Deposit, M-Pesa, etc.) */}
          {/* ================================================================= */}
          {activeTab === 'PAYMENT' && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 animate-fade-in">
              {/* Payment Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Select Payment Channel *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Cash */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('CASH')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'CASH'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs ring-1 ring-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-emerald-700">payments</span>
                    <span>Cash Office</span>
                    <span className="text-[9px] font-normal text-slate-500">Physical currency</span>
                  </button>

                  {/* Bank Deposit */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('BANK_DEPOSIT')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'BANK_DEPOSIT'
                        ? 'bg-sky-50 border-sky-600 text-sky-800 shadow-xs ring-1 ring-sky-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-sky-700">account_balance</span>
                    <span>Bank Deposit</span>
                    <span className="text-[9px] font-normal text-slate-500">Manual slip / teller</span>
                  </button>

                  {/* M-Pesa */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('MPESA')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'MPESA'
                        ? 'bg-purple-50 border-purple-600 text-purple-800 shadow-xs ring-1 ring-purple-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-purple-700">smartphone</span>
                    <span>M-Pesa</span>
                    <span className="text-[9px] font-normal text-slate-500">Till / Paybill code</span>
                  </button>

                  {/* Cheque / EFT */}
                  <button
                    type="button"
                    onClick={() => setPaymentChannel('CHEQUE')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentChannel === 'CHEQUE'
                        ? 'bg-amber-50 border-amber-600 text-amber-800 shadow-xs ring-1 ring-amber-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl mb-0.5 text-amber-700">receipt_long</span>
                    <span>Cheque / Wire</span>
                    <span className="text-[9px] font-normal text-slate-500">Banker's cheque</span>
                  </button>
                </div>
              </div>

              {/* Target Invoice Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Target Invoice to Credit *
                  </label>
                  {isLoadingInvoices && (
                    <span className="text-[10px] text-slate-400 animate-pulse">Loading invoices...</span>
                  )}
                </div>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono font-medium"
                >
                  {invoices.length === 0 ? (
                    <option value="">No billed invoice found — switch to "Record Arrears" tab to initialize</option>
                  ) : (
                    <>
                      <option value="">-- Choose Invoice to Settle --</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} · Bal: KES {(inv.balance || 0).toLocaleString()} (Billed: KES {inv.amountPayable.toLocaleString()} | Due: {inv.dueDate || 'Current'})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Amount & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Amount Paid (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono font-bold"
                  />
                  {/* Preset quick buttons */}
                  {currentInvoice && currentInvoice.balance > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-400">Quick:</span>
                      <button
                        type="button"
                        onClick={() => setAmount(String(currentInvoice.balance))}
                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold cursor-pointer hover:bg-emerald-100"
                      >
                        Full Bal (KES {currentInvoice.balance.toLocaleString()})
                      </button>
                      {currentInvoice.balance > 2000 && (
                        <button
                          type="button"
                          onClick={() => setAmount(String(Math.round(currentInvoice.balance / 2)))}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono cursor-pointer hover:bg-slate-200"
                        >
                          Half (KES {Math.round(currentInvoice.balance / 2).toLocaleString()})
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono"
                  />
                </div>
              </div>

              {/* CHANNEL SPECIFIC FIELDS */}

              {/* 1. CASH OFFICE */}
              {paymentChannel === 'CASH' && (
                <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-emerald-700">payments</span>
                    <span>Cash Counter Collection Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                        Cash Receipt / Voucher Ref
                      </label>
                      <input
                        type="text"
                        value={cashReceiptRef}
                        onChange={(e) => setCashReceiptRef(e.target.value)}
                        placeholder="Auto-generated e.g. CSH-2026-9281"
                        className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                        Received From / Payer
                      </label>
                      <input
                        type="text"
                        value={receivedFrom}
                        onChange={(e) => setReceivedFrom(e.target.value)}
                        placeholder="e.g. Mary Wanjiku (Mother)"
                        className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Cash Notes / Denominations (Optional)
                    </label>
                    <input
                      type="text"
                      value={cashDenominations}
                      onChange={(e) => setCashDenominations(e.target.value)}
                      placeholder="e.g. Paid in 1,000 notes at counter. Exact change."
                      className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCashVerified}
                      onChange={(e) => setIsCashVerified(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-emerald-900">
                      I confirm physical currency of KES {numAmount.toLocaleString()} has been counted and placed in the cash drawer/safe.
                    </span>
                  </label>
                </div>
              )}

              {/* 2. BANK DEPOSIT */}
              {paymentChannel === 'BANK_DEPOSIT' && (
                <div className="bg-sky-50/70 rounded-xl p-3.5 border border-sky-200 space-y-3">
                  <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-sky-700">account_balance</span>
                    <span>Manual Bank Deposit Slip / Teller Verification</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                        Bank Deposited Into *
                      </label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 font-semibold"
                      >
                        <option value="">-- Select Bank --</option>
                        {KENYAN_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    {bankName === 'Other Bank' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                          Specify Bank Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={customBankName}
                          onChange={(e) => setCustomBankName(e.target.value)}
                          placeholder="e.g. SBM Bank Kenya"
                          className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                          Bank Branch / Agent Name
                        </label>
                        <input
                          type="text"
                          value={bankBranch}
                          onChange={(e) => setBankBranch(e.target.value)}
                          placeholder="e.g. Kisian Branch or Agent #301"
                          className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                        Deposit Slip / Teller Reference # *
                      </label>
                      <input
                        type="text"
                        required
                        value={slipNumber}
                        onChange={(e) => setSlipNumber(e.target.value)}
                        placeholder="e.g. SLIP-89210 or DEP-49102"
                        className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                        Depositor Name (from slip)
                      </label>
                      <input
                        type="text"
                        value={depositorName}
                        onChange={(e) => setDepositorName(e.target.value)}
                        placeholder="e.g. John Ouma"
                        className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                      School Account Deposited Into
                    </label>
                    <input
                      type="text"
                      value={schoolBankAccount}
                      onChange={(e) => setSchoolBankAccount(e.target.value)}
                      placeholder="e.g. KCB Fees Collection A/C #1100223344"
                      className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSlipVerified}
                      onChange={(e) => setIsSlipVerified(e.target.checked)}
                      className="rounded text-sky-700 focus:ring-sky-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-sky-900">
                      Bank slip stamp and date have been visually verified against school account records.
                    </span>
                  </label>
                </div>
              )}

              {/* 3. M-PESA */}
              {paymentChannel === 'MPESA' && (
                <div className="bg-purple-50/70 rounded-xl p-3.5 border border-purple-200 space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-purple-700">smartphone</span>
                    <span>M-Pesa Transaction Verification</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        M-Pesa Transaction Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value.toUpperCase())}
                        placeholder="e.g. QHK8912KL"
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                        Sender Phone Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={mpesaPhoneNumber}
                        onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CHEQUE / WIRE */}
              {paymentChannel === 'CHEQUE' && (
                <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px] text-amber-700">receipt_long</span>
                    <span>Banker's Cheque / Electronic Wire</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Cheque / Wire Reference # *
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionReference}
                        onChange={(e) => setTransactionReference(e.target.value)}
                        placeholder="e.g. CHQ-001928"
                        className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Issuing Bank / Drawee
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. Standard Chartered Bank"
                        className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Payment Calculator Bar */}
              {currentInvoice && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">Invoice Balance</span>
                    <span className="font-bold text-rose-700">KES {invBalance.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">Amount Paying</span>
                    <span className="font-bold text-emerald-800">KES {numAmount.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">New Balance</span>
                    <span className={`font-bold ${projectedInvoiceBalance === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                      KES {projectedInvoiceBalance.toLocaleString()} {projectedInvoiceBalance === 0 && '(Cleared)'}
                    </span>
                  </div>
                  {numAmount > invBalance && (
                    <div className="w-full pt-2 mt-1 border-t border-slate-200 flex items-center justify-between font-sans">
                      <span className="text-teal-800 font-bold flex items-center gap-1 text-[11px]">
                        <span className="material-symbols-outlined text-[15px]">savings</span>
                        Advance Overpayment / Credit:
                      </span>
                      <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                        +KES {(numAmount - invBalance).toLocaleString()} (Credited)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Internal Ledger Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Term 1 tuition installment or bursary top-up"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                />
              </div>

              {/* Workstation Receipt Printer Detection & Auto-Print Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#7a1228]/10 flex items-center justify-center text-[#7a1228] font-bold shrink-0">
                    <span className="material-symbols-outlined text-[18px]">print</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-[11px] leading-tight flex items-center gap-1.5">
                      <span>Receipt Printer Mode</span>
                      {printerStatus.hasReceiptPrinter && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                          Detected
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {printerStatus.hasReceiptPrinter
                        ? printerStatus.printerName
                        : 'Auto-prints thermal receipt on payment recording'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !printerStatus.autoPrintEnabled;
                    setReceiptAutoPrint(next);
                    setPrinterStatus((prev) => ({ ...prev, autoPrintEnabled: next }));
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    printerStatus.autoPrintEnabled
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {printerStatus.autoPrintEnabled ? 'AUTO-PRINT ON' : 'AUTO-PRINT OFF'}
                </button>
              </div>

              {/* Submit Payment Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPayment || !selectedInvoiceId || numAmount <= 0 || !!currentStudent?.isSponsored}
                  className="w-full py-3 bg-[#7a1228] text-white font-bold rounded-xl hover:bg-[#600e1f] text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {currentStudent?.isSponsored ? 'lock' : paymentChannel === 'CASH' ? 'payments' : paymentChannel === 'BANK_DEPOSIT' ? 'account_balance' : 'receipt'}
                  </span>
                  <span>
                    {currentStudent?.isSponsored
                      ? 'Learner Is 100% Scholarship (Exempt)'
                      : isSubmittingPayment
                      ? 'Recording & Generating Receipt...'
                      : paymentChannel === 'CASH'
                      ? `Accept Cash (KES ${numAmount.toLocaleString()}) & Issue Receipt`
                      : paymentChannel === 'BANK_DEPOSIT'
                      ? `Record Bank Deposit (KES ${numAmount.toLocaleString()}) & Issue Receipt`
                      : `Record Payment (KES ${numAmount.toLocaleString()}) & Issue Receipt`}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: RECORD / ADJUST ARREARS (Opening balances, prior term, etc) */}
          {/* ================================================================= */}
          {activeTab === 'ARREARS' && (
            <form onSubmit={handleArrearSubmit} className="space-y-4 animate-fade-in">
              {/* Arrear Mode Selector: SET vs ADD */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Adjustment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setArrearMode('ADD')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      arrearMode === 'ADD'
                        ? 'border-[#7a1228] bg-rose-50 text-[#7a1228] font-bold shadow-xs ring-1 ring-[#7a1228]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="material-symbols-outlined text-sm text-[#7a1228]">add_circle</span>
                      <span>Add to Existing Arrears</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Adds this amount on top of current balance (e.g. extra charge)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setArrearMode('SET')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      arrearMode === 'SET'
                        ? 'border-[#7a1228] bg-rose-50 text-[#7a1228] font-bold shadow-xs ring-1 ring-[#7a1228]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="material-symbols-outlined text-sm text-[#7a1228]">tune</span>
                      <span>Set / Overwrite Exact Arrears</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Sets the learner's total arrears to this exact figure
                    </div>
                  </button>
                </div>
              </div>

              {/* Arrears Amount Input & Quick Preset Chips */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Arrears Amount (KES) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 font-mono">
                    KES
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="e.g. 8500"
                    value={arrearAmount}
                    onChange={(e) => setArrearAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                  {[1000, 2500, 5000, 10000, 15000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setArrearAmount(amt)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-800 border border-slate-300 cursor-pointer"
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setArrearAmount(0);
                      setArrearMode('SET');
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold cursor-pointer hover:bg-rose-100"
                  >
                    Clear to Zero (0)
                  </button>
                </div>
              </div>

              {/* Arrear Reason / Category Presets */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason / Source of Arrears *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ARREAR_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setArrearReason(r)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        arrearReason === r
                          ? 'bg-[#7a1228] text-white border-[#7a1228] shadow-2xs font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {arrearReason === 'Custom Reason' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter specific custom reason (e.g. Damaged Science Kit, Swimming Gala Levy)..."
                    value={arrearCustomReason}
                    onChange={(e) => setArrearCustomReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] mt-1"
                  />
                )}
              </div>

              {/* Term & Academic Year Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Academic Term & Year
                  </label>
                  <select
                    value={arrearTerm}
                    onChange={(e) => setArrearTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-medium"
                  >
                    <option value="term-2026-t1">2026 — Term 1</option>
                    <option value="term-2026-t2">2026 — Term 2</option>
                    <option value="term-2026-t3">2026 — Term 3</option>
                    <option value="term-2025-t3">2025 — Term 3 (Prior Year)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Arrears Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={arrearDueDate}
                    onChange={(e) => setArrearDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228] font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Ledger Remarks / Conditions (Optional)
                </label>
                <input
                  type="text"
                  value={arrearNotes}
                  onChange={(e) => setArrearNotes(e.target.value)}
                  placeholder="e.g. Balance verified from previous school admission file or audit note"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                />
              </div>

              {/* Live Arrears Calculation Box */}
              {currentStudent && (
                <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200 flex flex-wrap items-center justify-between text-xs gap-2 font-mono">
                  <div>
                    <span className="text-rose-800 block text-[10px] uppercase font-bold font-sans">Current Balance</span>
                    <span className="font-bold text-slate-900">KES {effectiveBalance.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-rose-800 block text-[10px] uppercase font-bold font-sans">
                      {arrearMode === 'ADD' ? '+ Addition' : '= Set Value'}
                    </span>
                    <span className="font-bold text-rose-800">KES {numArrear.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-800 block text-[10px] uppercase font-bold font-sans">Projected Arrears</span>
                    <span className="font-bold text-rose-900 text-sm">
                      KES {projectedTotalBalanceAfterArrear.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Arrear Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingArrear || !currentStudent || numArrear < 0 || !!currentStudent?.isSponsored}
                  className="w-full py-3 bg-[#7a1228] text-white font-bold rounded-xl hover:bg-[#600e1f] text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {currentStudent?.isSponsored ? 'lock' : 'save'}
                  </span>
                  <span>
                    {currentStudent?.isSponsored
                      ? 'Learner Is 100% Scholarship (Exempt)'
                      : isSubmittingArrear
                      ? 'Saving Arrears...'
                      : arrearMode === 'SET'
                      ? `Set Learner Arrears to KES ${numArrear.toLocaleString()}`
                      : `Add KES ${numArrear.toLocaleString()} to Arrears Balance`}
                  </span>
                </button>
              </div>

              {/* Inline suggestion if user wants to immediately record a payment */}
              {effectiveBalance > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 text-[11px]">
                    Did the guardian also make an immediate fee payment?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('PAYMENT');
                      setFeedback(null);
                    }}
                    className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-xs rounded-lg hover:bg-emerald-800 flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">payments</span>
                    <span>Switch to Record Payment</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
