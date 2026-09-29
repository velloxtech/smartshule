import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Student, StudentInvoice } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  initialInvoice?: StudentInvoice;
  onPaymentRecorded: (payment: any) => void;
}

type PaymentChannel = 'CASH' | 'BANK_DEPOSIT' | 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE';

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

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  initialInvoice,
  onPaymentRecorded,
}) => {
  const { user } = useAuth();

  // Student & Invoice selection
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudent?.id || students[0]?.id || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoice?.id || '');
  const [schoolId, setSchoolId] = useState<string>(user?.schoolId || '');
  const [schoolData, setSchoolData] = useState<any>(null);

  // Core Payment details
  const [amount, setAmount] = useState('');
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel>('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Cash-specific fields
  const [cashReceiptRef, setCashReceiptRef] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [cashDenominations, setCashDenominations] = useState('');
  const [isCashVerified, setIsCashVerified] = useState(false);

  // Bank Deposit-specific fields
  const [bankName, setBankName] = useState('KCB Bank Kenya');
  const [customBankName, setCustomBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [depositorName, setDepositorName] = useState('');
  const [schoolBankAccount, setSchoolBankAccount] = useState('KCB Fees Collection A/C (522123)');
  const [isSlipVerified, setIsSlipVerified] = useState(false);

  // M-Pesa / Transfer / Cheque fields
  const [transactionReference, setTransactionReference] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordedResult, setRecordedResult] = useState<any | null>(null);

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

  // Sync initial student
  useEffect(() => {
    if (initialStudent?.id) {
      setSelectedStudentId(initialStudent.id);
    }
  }, [initialStudent]);

  // Auto-generate cash reference on mount or channel switch
  useEffect(() => {
    if (paymentChannel === 'CASH' && !cashReceiptRef) {
      const year = new Date().getFullYear();
      const randomCode = Math.floor(10000 + Math.random() * 90000);
      setCashReceiptRef(`CSH-${year}-${randomCode}`);
    }
  }, [paymentChannel, cashReceiptRef]);

  // Load invoices whenever selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) {
      setInvoices([]);
      setSelectedInvoiceId('');
      return;
    }

    async function loadInvoices() {
      try {
        const res = await apiService.getInvoices({ studentId: selectedStudentId });
        if (res.success && res.data) {
          setInvoices(res.data);
          if (initialInvoice && res.data.some(i => i.id === initialInvoice.id)) {
            setSelectedInvoiceId(initialInvoice.id);
            if ((initialInvoice.balance || 0) > 0) {
              setAmount(initialInvoice.balance.toString());
            }
          } else {
            const unpaid = res.data.find((inv) => (inv.balance || 0) > 0) || res.data[0];
            if (unpaid) {
              setSelectedInvoiceId(unpaid.id);
              if ((unpaid.balance || 0) > 0) {
                setAmount(unpaid.balance.toString());
              }
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
      }
    }
    loadInvoices();
  }, [selectedStudentId, initialInvoice]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const currentInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  const numAmount = Number(amount) || 0;
  const invBalance = currentInvoice?.balance || 0;
  const projectedBalance = Math.max(0, invBalance - numAmount);

  // Filter students by search
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admNo.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      setError('Please select an active invoice for this student, or generate an invoice first.');
      return;
    }
    if (numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    // Validation for Bank Deposit
    if (paymentChannel === 'BANK_DEPOSIT') {
      if (!slipNumber.trim()) {
        setError('Please enter the Bank Deposit Slip / Teller Reference number.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

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
          notes.trim() ? notes.trim() : null,
        ].filter(Boolean).join(' | ') || undefined,
      });

      if (res.success && res.data) {
        setRecordedResult({
          ...res.data,
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
          newBalance: projectedBalance,
          invoiceNumber: currentInvoice?.invoiceNumber,
        });
        onPaymentRecorded(res.data);
      } else {
        setError(res.message || 'Payment recording failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error recording payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Receipt Slip Modal when payment is completed
  if (recordedResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
        <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
          {/* Header */}
          <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h3 className="font-semibold text-base leading-tight">Payment Recorded Successfully</h3>
                <p className="text-xs text-rose-100">Official SmartShule Receipt Generated</p>
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
          <div id="smartshule-receipt-print" className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* School Header */}
            <div className="text-center pb-3 border-b border-surface-container">
              <div className="text-base font-bold text-[#7a1228] uppercase tracking-wide">
                {schoolData?.name || 'SmartShule Academy'}
              </div>
              {(schoolData?.knecCode || schoolData?.registrationNumber) && (
                <div className="text-[11px] text-on-surface-variant font-data-mono">
                  KNEC / Reg: {schoolData?.knecCode || schoolData?.registrationNumber}
                </div>
              )}
              {schoolData?.address && (
                <div className="text-[10px] text-outline mt-0.5">{schoolData.address}</div>
              )}
              <div className="mt-2 inline-block px-3 py-0.5 bg-surface-container rounded-full text-[10px] font-bold text-on-surface uppercase tracking-wider">
                {recordedResult.channel === 'CASH' ? 'Official Cash Receipt' : 'Bank Deposit Acknowledgment'}
              </div>
            </div>

            {/* Receipt Details Table */}
            <div className="bg-surface-container-low rounded-xl p-3.5 space-y-2 border border-outline-variant/30 font-body">
              <div className="flex justify-between items-center pb-1.5 border-b border-outline-variant/20">
                <span className="text-on-surface-variant font-semibold">Receipt Number:</span>
                <span className="font-data-mono font-bold text-[#7a1228] text-sm">
                  {recordedResult.payment?.receiptNumber || recordedResult.receiptNumber || 'REC-OFFICIAL'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Date:</span>
                <span className="font-data-mono font-medium text-on-surface">{recordedResult.paymentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Learner Name:</span>
                <span className="font-bold text-on-surface">{recordedResult.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Admission Number:</span>
                <span className="font-data-mono font-bold text-on-surface">{recordedResult.admissionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Grade Level:</span>
                <span className="font-semibold text-on-surface">{recordedResult.gradeLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Invoice Settled:</span>
                <span className="font-data-mono text-on-surface">{recordedResult.invoiceNumber}</span>
              </div>

              {/* Channel specifics */}
              <div className="flex justify-between pt-1 border-t border-outline-variant/20">
                <span className="text-on-surface-variant">Payment Method:</span>
                <span className="font-bold text-emerald-800">
                  {recordedResult.channel === 'CASH' && '💵 Cash Office (Currency Tendered)'}
                  {recordedResult.channel === 'BANK_DEPOSIT' && `🏦 Bank Deposit (${recordedResult.bankName})`}
                  {recordedResult.channel === 'MPESA' && '📱 M-Pesa E-Money'}
                  {recordedResult.channel === 'CHEQUE' && '📜 Banker\'s Cheque'}
                  {recordedResult.channel === 'BANK_TRANSFER' && '💳 Bank Wire / EFT'}
                </span>
              </div>
              {recordedResult.channel === 'BANK_DEPOSIT' && recordedResult.slipNumber && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Bank Slip / Teller #:</span>
                  <span className="font-data-mono font-bold text-on-surface">{recordedResult.slipNumber}</span>
                </div>
              )}
              {recordedResult.channel === 'CASH' && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Cash Voucher / Ref:</span>
                  <span className="font-data-mono font-bold text-on-surface">{recordedResult.cashReceiptRef}</span>
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="pt-2 border-t border-outline-variant/30 space-y-1">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Previous Invoice Balance:</span>
                  <span className="font-data-mono">KES {recordedResult.previousBalance?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                  <span>Amount Paid:</span>
                  <span className="font-data-mono text-base">KES {recordedResult.amountPaid?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-on-surface pt-1">
                  <span>Remaining Invoice Balance:</span>
                  <span className={`font-data-mono ${recordedResult.newBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    KES {recordedResult.newBalance?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Stamp & Served By */}
            <div className="pt-2 flex justify-between items-end text-[11px] text-on-surface-variant">
              <div>
                <p>Served By: <span className="font-semibold text-on-surface">{user?.firstName} {user?.lastName} (Finance)</span></p>
                <p className="text-[10px] text-outline">SmartShule Automated Ledger Verification</p>
              </div>
              <div className="border border-dashed border-outline-variant/60 rounded p-2 text-center text-[10px] text-outline uppercase font-mono">
                Official School Stamp
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#7a1228] text-white font-semibold rounded-lg hover:bg-[#600e1f] text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Official Receipt</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Record Fee Payment</h3>
              <p className="text-xs text-rose-100">Direct Cash Office · Bank Deposit Slips · Cheques</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Payment Method / Channel Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1.5">
              Select Payment Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Cash */}
              <button
                type="button"
                onClick={() => setPaymentChannel('CASH')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentChannel === 'CASH'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs ring-1 ring-emerald-600'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-xl mb-1 text-emerald-700">payments</span>
                <span>Cash Office</span>
                <span className="text-[10px] font-normal text-outline">Physical currency</span>
              </button>

              {/* Bank Deposit */}
              <button
                type="button"
                onClick={() => setPaymentChannel('BANK_DEPOSIT')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentChannel === 'BANK_DEPOSIT'
                    ? 'bg-sky-50 border-sky-600 text-sky-800 shadow-xs ring-1 ring-sky-600'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-xl mb-1 text-sky-700">account_balance</span>
                <span>Bank Deposit</span>
                <span className="text-[10px] font-normal text-outline">Manual slip / agent</span>
              </button>

              {/* M-Pesa */}
              <button
                type="button"
                onClick={() => setPaymentChannel('MPESA')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentChannel === 'MPESA'
                    ? 'bg-purple-50 border-purple-600 text-purple-800 shadow-xs ring-1 ring-purple-600'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-xl mb-1 text-purple-700">smartphone</span>
                <span>M-Pesa</span>
                <span className="text-[10px] font-normal text-outline">Till / Paybill code</span>
              </button>

              {/* Cheque / EFT */}
              <button
                type="button"
                onClick={() => setPaymentChannel('CHEQUE')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentChannel === 'CHEQUE'
                    ? 'bg-amber-50 border-amber-600 text-amber-800 shadow-xs ring-1 ring-amber-600'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-xl mb-1 text-amber-700">receipt_long</span>
                <span>Cheque / Wire</span>
                <span className="text-[10px] font-normal text-outline">Banker's cheque</span>
              </button>
            </div>
          </div>

          {/* Learner & Invoice Selection */}
          <div className="bg-surface-container-low/70 rounded-xl p-3.5 border border-outline-variant/30 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase text-on-surface-variant">
                  Select Enrolled Learner
                </label>
                {students.length > 5 && (
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or Adm #..."
                    className="text-[11px] px-2 py-0.5 bg-surface-container border border-outline-variant/30 rounded focus:outline-primary w-44 font-normal"
                  />
                )}
              </div>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-medium"
              >
                {filteredStudents.length === 0 ? (
                  <option value="">No matching learners found</option>
                ) : (
                  <>
                    <option value="">-- Choose Learner --</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Adm: {s.admNo}) · {s.grade} · Balance: KES {s.feeBalance.toLocaleString()}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Target Invoice to Credit
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value);
                  const inv = invoices.find((i) => i.id === e.target.value);
                  if (inv && (inv.balance || 0) > 0) {
                    setAmount(inv.balance.toString());
                  }
                }}
                required
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-data-mono font-medium"
              >
                {invoices.length === 0 ? (
                  <option value="">No billed invoices found for this learner</option>
                ) : (
                  <>
                    <option value="">-- Choose Invoice to Settle --</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} · Bal: KES {(inv.balance || 0).toLocaleString()} (Billed: KES {inv.amountPayable.toLocaleString()} | Due: {inv.dueDate})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Live Balance Calculator Bar */}
            {currentInvoice && (
              <div className="bg-surface-container-lowest rounded-lg p-2.5 border border-outline-variant/20 flex flex-wrap items-center justify-between text-xs gap-2">
                <div>
                  <span className="text-on-surface-variant block text-[10px] uppercase font-semibold">Current Arrears</span>
                  <span className="font-data-mono font-bold text-rose-700">KES {invBalance.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-on-surface-variant block text-[10px] uppercase font-semibold">Amount Paying</span>
                  <span className="font-data-mono font-bold text-emerald-800">KES {numAmount.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-on-surface-variant block text-[10px] uppercase font-semibold">New Balance After Pay</span>
                  <span className={`font-data-mono font-bold ${projectedBalance === 0 ? 'text-emerald-700' : 'text-on-surface'}`}>
                    KES {projectedBalance.toLocaleString()} {projectedBalance === 0 && '✓ Cleared'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Amount & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Amount Paid (KES) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary font-data-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-data-mono"
              />
            </div>
          </div>

          {/* CHANNEL SPECIFIC FORM FIELDS */}

          {/* 1. CASH OFFICE MODE */}
          {paymentChannel === 'CASH' && (
            <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200 space-y-3 animate-fade-in">
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
                    className="w-full bg-surface-container-lowest border border-emerald-300 rounded-lg p-2 text-xs text-on-surface focus:outline-emerald-600 font-data-mono font-bold"
                  />
                  <span className="text-[10px] text-emerald-800 mt-0.5 block">
                    Auto-filled. Overwrite if using manual paper receipt serial book.
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                    Received From / Payer
                  </label>
                  <input
                    type="text"
                    value={receivedFrom}
                    onChange={(e) => setReceivedFrom(e.target.value)}
                    placeholder="e.g. Mary Wanjiku (Mother) or Learner"
                    className="w-full bg-surface-container-lowest border border-emerald-300 rounded-lg p-2 text-xs text-on-surface focus:outline-emerald-600"
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
                  placeholder="e.g. Paid in 1000 notes at counter. Change given: KES 0."
                  className="w-full bg-surface-container-lowest border border-emerald-300 rounded-lg p-2 text-xs text-on-surface focus:outline-emerald-600"
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
                  I confirm that physical currency of KES {numAmount.toLocaleString()} has been counted and placed in the cash drawer/safe.
                </span>
              </label>
            </div>
          )}

          {/* 2. BANK DEPOSIT MODE */}
          {paymentChannel === 'BANK_DEPOSIT' && (
            <div className="bg-sky-50/70 rounded-xl p-3.5 border border-sky-200 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                <span className="material-symbols-outlined text-[18px] text-sky-700">account_balance</span>
                <span>Manual Bank Deposit Slip / Agent Verification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                    Bank Deposited Into *
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-sky-300 rounded-lg p-2 text-xs text-on-surface focus:outline-sky-600 font-semibold"
                  >
                    {KENYAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
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
                      className="w-full bg-surface-container-lowest border border-sky-300 rounded-lg p-2 text-xs text-on-surface focus:outline-sky-600"
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
                      placeholder="e.g. Moi Avenue Branch or Agent #301"
                      className="w-full bg-surface-container-lowest border border-sky-300 rounded-lg p-2 text-xs text-on-surface focus:outline-sky-600"
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
                    className="w-full bg-surface-container-lowest border border-sky-300 rounded-lg p-2 text-xs text-on-surface focus:outline-sky-600 font-data-mono font-bold"
                  />
                  <span className="text-[10px] text-sky-800 mt-0.5 block">
                    Found on the stamped paper bank slip / agent receipt.
                  </span>
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
                    className="w-full bg-surface-container-lowest border border-sky-300 rounded-lg p-2 text-xs text-on-surface focus:outline-sky-600"
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
                  className="w-full bg-surface-container-lowest border border-sky-300 rounded-lg p-2 text-xs text-on-surface focus:outline-sky-600"
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
                  Bank slip stamp and date have been visually verified against the school account records.
                </span>
              </label>
            </div>
          )}

          {/* 3. M-PESA MODE */}
          {paymentChannel === 'MPESA' && (
            <div className="bg-purple-50/70 rounded-xl p-3.5 border border-purple-200 space-y-3 animate-fade-in">
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
                    className="w-full bg-surface-container-lowest border border-purple-300 rounded-lg p-2 text-xs text-on-surface focus:outline-purple-600 font-data-mono font-bold uppercase"
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
                    className="w-full bg-surface-container-lowest border border-purple-300 rounded-lg p-2 text-xs text-on-surface focus:outline-purple-600 font-data-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. CHEQUE / WIRE MODE */}
          {paymentChannel === 'CHEQUE' && (
            <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <span className="material-symbols-outlined text-[18px] text-amber-700">receipt_long</span>
                <span>Banker's Cheque / Electronic Transfer</span>
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
                    className="w-full bg-surface-container-lowest border border-amber-300 rounded-lg p-2 text-xs text-on-surface focus:outline-amber-600 font-data-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Issuing Bank / Drawee
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Standard Chartered Bank"
                    className="w-full bg-surface-container-lowest border border-amber-300 rounded-lg p-2 text-xs text-on-surface focus:outline-amber-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* General Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Internal Ledger Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Term 1 tuition installment or payment confirmation notes"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !selectedInvoiceId || numAmount <= 0}
              className="w-full py-3 bg-[#7a1228] text-white font-semibold rounded-xl hover:bg-[#600e1f] text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">
                {paymentChannel === 'CASH' ? 'payments' : paymentChannel === 'BANK_DEPOSIT' ? 'account_balance' : 'receipt'}
              </span>
              <span>
                {isLoading
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
      </div>
    </div>
  );
};
