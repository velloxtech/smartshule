import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Student } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ForwardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[] | any[];
  initialStudent?: any;
  onSuccess?: (payment: any) => void;
}

export const ForwardPaymentModal: React.FC<ForwardPaymentModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA' | 'BANK_DEPOSIT' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH'>('MPESA');
  const [transactionReference, setTransactionReference] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [notes, setNotes] = useState('');

  const [isParsingSms, setIsParsingSms] = useState(false);
  const [parseSuccessMsg, setParseSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Reset all entry fields to blank whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStudentId(initialStudent?.id || '');
      setPaymentMethod('MPESA');
      setTransactionReference('');
      setAmount('');
      setPaymentDate('');
      setMpesaPhoneNumber('');
      setSenderName('');
      setSmsMessage('');
      setNotes('');
      setError(null);
      setSuccessResult(null);
      setParseSuccessMsg(null);
    }
  }, [isOpen, initialStudent]);

  // Intelligent parser for Kenyan Lipa na M-Pesa & Bank SMS confirmations
  const handleParseSms = (text: string) => {
    setSmsMessage(text);
    if (!text.trim()) return;

    setIsParsingSms(true);
    setParseSuccessMsg(null);

    let extractedCode = '';
    let extractedAmount = '';
    let extractedDate = '';
    let extractedPhone = '';

    // 1. Transaction Code (e.g. QK7823LM91, RJ489210PL, etc. - 10 uppercase alphanumeric chars)
    const codeMatch = text.match(/\b([A-Z0-9]{10})\b/);
    if (codeMatch) {
      extractedCode = codeMatch[1];
      setTransactionReference(extractedCode);
    }

    // 2. Amount Paid (e.g. Ksh15,000.00, KES 15000, Ksh 5,500)
    const amountMatch = text.match(/(?:Ksh|KES|KSH)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/i);
    if (amountMatch) {
      const cleanNum = amountMatch[1].replace(/,/g, '');
      extractedAmount = cleanNum;
      setAmount(cleanNum);
    }

    // 3. Date (e.g. 17/10/26, 17/10/2026, 2026-10-17)
    const dateMatch = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      if (year.length === 2) year = `20${year}`;
      extractedDate = `${year}-${month}-${day}`;
      setPaymentDate(extractedDate);
    }

    // 4. Phone number if present
    const phoneMatch = text.match(/\b(254\d{9}|07\d{8}|01\d{8})\b/);
    if (phoneMatch) {
      extractedPhone = phoneMatch[1];
      setMpesaPhoneNumber(extractedPhone);
    }

    setIsParsingSms(false);
    if (extractedCode || extractedAmount) {
      setParseSuccessMsg(
        `Auto-detected: ${extractedCode ? `Code: ${extractedCode}` : ''} ${extractedAmount ? `| Amount: KES ${Number(extractedAmount).toLocaleString()}` : ''}`.trim()
      );
      setTimeout(() => setParseSuccessMsg(null), 6000);
    }
  };

  const currentStudent = students.find((s: any) => s.id === selectedStudentId);
  const studentName = currentStudent?.name || currentStudent?.fullName || `${currentStudent?.firstName || ''} ${currentStudent?.lastName || ''}`.trim() || 'Selected Learner';
  const admNo = currentStudent?.admNo || currentStudent?.admissionNumber || 'ADM';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError('Please select the child this payment was made for.');
      return;
    }
    const cleanRef = transactionReference.trim().toUpperCase();
    if (!cleanRef) {
      setError('Please enter the transaction reference code or bank slip number.');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiService.forwardPaymentTransaction({
        studentId: selectedStudentId,
        amount: numAmount,
        paymentMethod,
        transactionReference: cleanRef,
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        mpesaPhoneNumber: mpesaPhoneNumber.trim() || undefined,
        senderName: senderName.trim() || undefined,
        smsMessage: smsMessage.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        setSuccessResult({
          ...res.data,
          studentName,
          admissionNumber: admNo,
          amount: numAmount,
          reference: cleanRef,
        });
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setError(res.message || 'Failed to submit payment notice. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to forward payment:', err);
      setError(err?.message || 'Failed to submit payment details. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessResult(null);
    setError(null);
    setSmsMessage('');
    setTransactionReference('');
    setAmount('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-[#500b1a] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">forward_to_inbox</span>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Forward Fee Payment Confirmation</h3>
              <p className="text-xs text-rose-100">Submit M-Pesa SMS / Bank Slip to the School Bursar</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        {successResult ? (
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto flex-1">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-4xl">task_alt</span>
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-on-surface">Payment Confirmation Forwarded!</h4>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                Your payment notice for <strong className="text-slate-900">{successResult.studentName}</strong> (Adm: {successResult.admissionNumber}) has been submitted to the accounts office.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs space-y-2 text-left max-w-md mx-auto font-data-mono">
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-body">Transaction Ref:</span>
                <span className="font-bold text-primary">{successResult.reference || successResult.payment?.transactionReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-body">Amount Remitted:</span>
                <span className="font-bold text-emerald-700">KES {Number(successResult.amount || successResult.payment?.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-body">Verification Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  Pending Bursar Approval
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs text-left max-w-md mx-auto space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>What happens next?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                The school bursar will reconcile your reference against the school bank statement. Once verified, an official receipt SMS will be sent to your phone and the remaining fee balance will update instantly.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleResetAndClose}
                className="w-full max-w-md px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            {error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Official School Remittance Instructions Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-emerald-500/10 border border-emerald-600/30 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">account_balance</span>
                  Official School Fee Remittance Channels
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Pay Directly
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-800">
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-200/50">
                  <div className="font-bold text-emerald-900">1. Lipa na M-Pesa (Paybill):</div>
                  <div>Business Number: <strong className="font-data-mono text-emerald-800">522533</strong></div>
                  <div>Account: <strong className="font-data-mono text-[#7a1228]">8048859#{studentName} {currentStudent?.grade || currentStudent?.gradeLevel || ''}</strong></div>
                  <div className="text-[10px] text-emerald-900 font-semibold mt-1">Guide: Please use Child's Name &amp; Grade as account reference, not admission number.</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-200/50">
                  <div className="font-bold text-sky-900">2. Bank Wire / Deposit:</div>
                  <div>Bank: <strong>KCB Bank Kenya</strong></div>
                  <div>Account: <strong className="font-data-mono">1234567890</strong> (Branch: Nairobi Main)</div>
                </div>
              </div>
            </div>

            {/* Child Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Learner / Student *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-medium"
              >
                <option value="">-- Choose Learner --</option>
                {students.map((st: any) => {
                  const sName = st.name || st.fullName || `${st.firstName || ''} ${st.lastName || ''}`.trim();
                  const sAdm = st.admNo || st.admissionNumber || '';
                  const sBal = st.feeBalance ?? st.fee?.balance ?? 0;
                  return (
                    <option key={st.id} value={st.id}>
                      {sName} (Adm: {sAdm}) {sBal > 0 ? `· Balance: KES ${sBal.toLocaleString()}` : '· Cleared'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Smart SMS Quick-Paste Box */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-purple-700">content_paste</span>
                  Quick Paste M-Pesa SMS Text (Auto-Fill)
                </label>
                <span className="text-[10px] text-purple-700 font-semibold">Optional Helper</span>
              </div>
              <textarea
                rows={2}
                value={smsMessage}
                onChange={(e) => handleParseSms(e.target.value)}
                placeholder="Paste the full M-Pesa SMS message here (e.g., QK7823LM91 Confirmed. Ksh15,000.00 sent to 522533 Grace Seeds School on 17/10/26...)"
                className="w-full bg-white border border-purple-200 rounded-lg p-2 text-xs text-on-surface focus:outline-purple-600 font-data-mono placeholder:font-body"
              />
              {parseSuccessMsg && (
                <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 animate-fade-in">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>{parseSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Payment Channel Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1.5">
                Payment Channel *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs font-bold">
                {[
                  { id: 'MPESA', label: 'M-Pesa', icon: 'smartphone' },
                  { id: 'BANK_DEPOSIT', label: 'Bank Slip', icon: 'receipt_long' },
                  { id: 'BANK_TRANSFER', label: 'Bank Wire', icon: 'account_balance' },
                  { id: 'CHEQUE', label: 'Cheque', icon: 'credit_card' },
                  { id: 'CASH', label: 'Cash', icon: 'payments' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setPaymentMethod(ch.id as any)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      paymentMethod === ch.id
                        ? 'bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary'
                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base mb-0.5">{ch.icon}</span>
                    <span className="text-[11px]">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Ref & Amount Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Transaction Code / Slip Ref *
                </label>
                <input
                  type="text"
                  required
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value.toUpperCase())}
                  placeholder="e.g. QK7823LM91 or Slip #10928"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-data-mono font-bold uppercase tracking-wider"
                />
              </div>

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
                  placeholder="e.g. 15000"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-data-mono font-bold"
                />
              </div>
            </div>

            {/* Date, Phone, Sender Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Sender Phone Number
                </label>
                <input
                  type="tel"
                  value={mpesaPhoneNumber}
                  onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                  placeholder="e.g. 0712345678"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-data-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Sender / Depositor Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
                />
              </div>
            </div>

            {/* Additional Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Remarks / Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid balance plus Term 2 arrears via agent"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#500b1a] text-white text-xs font-bold hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Notice...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Forward to School Bursar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
