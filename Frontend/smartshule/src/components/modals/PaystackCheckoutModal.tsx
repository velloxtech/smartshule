import React, { useState, useEffect } from 'react';
import { Student, StudentInvoice, PaystackInitializeResponse } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PaystackCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: Student[];
  initialStudent?: Student;
  initialInvoice?: StudentInvoice;
  onPaymentSuccess?: (tx: {
    studentName: string;
    admNo: string;
    amount: number;
    channel: string;
    reference: string;
    receiptNumber: string;
  }) => void;
}

export const PaystackCheckoutModal: React.FC<PaystackCheckoutModalProps> = ({
  isOpen,
  onClose,
  students = [],
  initialStudent,
  initialInvoice,
  onPaymentSuccess,
}) => {
  const { user } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudent?.id || (students.length > 0 ? students[0].id : '')
  );
  const [payerEmail, setPayerEmail] = useState<string>(user?.email || 'guardian@smartshule.ac.ke');
  const [payerPhone, setPayerPhone] = useState<string>(
    initialStudent?.guardianPhone || (students.length > 0 ? students[0].guardianPhone : '+254712345678')
  );
  const [amount, setAmount] = useState<string>(
    initialInvoice ? initialInvoice.balance.toString() : (initialStudent && initialStudent.feeBalance > 0 ? initialStudent.feeBalance.toString() : '15000')
  );
  const [paymentType, setPaymentType] = useState<string>('TUITION');
  const [paymentRail, setPaymentRail] = useState<'bank_transfer' | 'paystack_online'>('bank_transfer');

  const [step, setStep] = useState<'form' | 'processing' | 'bank_details' | 'success'>('form');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paystackData, setPaystackData] = useState<PaystackInitializeResponse | null>(null);
  const [completedTx, setCompletedTx] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudentId(initialStudent.id);
      if (initialStudent.guardianPhone) setPayerPhone(initialStudent.guardianPhone);
      if (initialStudent.feeBalance > 0 && !initialInvoice) {
        setAmount(initialStudent.feeBalance.toString());
      }
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
      if (students[0].guardianPhone) setPayerPhone(students[0].guardianPhone);
      if (students[0].feeBalance > 0) setAmount(students[0].feeBalance.toString());
    }

    if (initialInvoice) {
      setAmount(initialInvoice.balance.toString());
    }

    if (user?.email) {
      setPayerEmail(user.email);
    }
  }, [initialStudent, initialInvoice, students, user, isOpen]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId) || initialStudent || students[0];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStep('processing');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      setStep('form');
      return;
    }

    try {
      const res = await apiService.initializePaystack({
        studentId: currentStudent ? currentStudent.id : 'student-001',
        invoiceId: initialInvoice?.id,
        amount: numAmount,
        email: payerEmail || 'guardian@smartshule.ac.ke',
        phone: payerPhone,
        paymentType: paymentType as any,
      });

      if (res.success && res.data) {
        setPaystackData(res.data);
        if (paymentRail === 'bank_transfer') {
          setStep('bank_details');
        } else {
          window.open(res.data.authorizationUrl, '_blank');
          setStep('bank_details');
        }
      } else {
        throw new Error(res.message || 'Failed to initialize Paystack session');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment initialization failed. Please try again.');
      setStep('form');
    }
  };

  const handleVerifyPayment = async () => {
    if (!paystackData?.reference) return;
    setStep('processing');
    setErrorMsg(null);

    try {
      const res = await apiService.verifyPaystack(paystackData.reference);
      if (res.success && res.data && res.data.verified) {
        const txData = {
          studentName: currentStudent?.name || 'Kevin Kamau Kariuki',
          admNo: currentStudent?.admNo || 'ADM-2026-001',
          amount: res.data.amount,
          channel: res.data.channel,
          reference: res.data.reference,
          receiptNumber: res.data.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
        };
        setCompletedTx(txData);
        setStep('success');
        if (onPaymentSuccess) {
          onPaymentSuccess(txData);
        }
      } else {
        setErrorMsg('Payment verification is pending bank network confirmation. If you just transferred, please allow 30 seconds and click verify again.');
        setStep('bank_details');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying payment with Paystack gateway.');
      setStep('bank_details');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-body">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-gradient-to-r from-primary to-[#500b1a] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm font-bold text-white text-base">Paystack Bank Payment Gateway</h3>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">
                  Bank Rails Active
                </span>
              </div>
              <p className="text-xs text-rose-100/80">
                Direct bank transfer, dedicated virtual account & card settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-error/10 border border-error/20 flex items-start gap-3 text-error text-xs">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* STEP 1: FORM */}
          {step === 'form' && (
            <form onSubmit={handleInitialize} className="space-y-4">
              {/* Student Details Card */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant block mb-1.5">
                  Select Learner for Fee Clearance:
                </label>
                {students.length > 1 ? (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => {
                      setSelectedStudentId(e.target.value);
                      const st = students.find((s) => s.id === e.target.value);
                      if (st) {
                        setPayerPhone(st.guardianPhone);
                        if (st.feeBalance > 0) setAmount(st.feeBalance.toString());
                      }
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.admNo}) - Grade: {s.grade} · Bal: KES {s.feeBalance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-on-surface">
                        {currentStudent?.name || 'Kevin Kamau Kariuki'}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        Adm: <span className="font-data-mono font-bold text-primary">{currentStudent?.admNo || 'ADM-2026-001'}</span> · Grade: {currentStudent?.grade || 'Grade 7'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-on-surface-variant uppercase font-bold">Outstanding Bal</div>
                      <div className="text-sm font-bold font-data-mono text-error">
                        KES {(currentStudent?.feeBalance || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Rail Selection */}
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">
                  Select Payment Method:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentRail('bank_transfer')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentRail === 'bank_transfer'
                        ? 'border-primary bg-primary/5 text-primary shadow-xs'
                        : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-lg">account_balance</span>
                      <span className="font-bold text-xs">Bank Transfer</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-tight">
                      Stanbic Bank Dedicated Virtual Account (Instant auto-reconciliation)
                    </p>
                  </div>

                  <div
                    onClick={() => setPaymentRail('paystack_online')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentRail === 'paystack_online'
                        ? 'border-primary bg-primary/5 text-primary shadow-xs'
                        : 'border-outline-variant/30 hover:border-outline-variant bg-surface-container-lowest'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-lg">credit_card</span>
                      <span className="font-bold text-xs">Card / Online</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-tight">
                      Visa, Mastercard or Paystack checkout portal
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount & Fee Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Amount to Pay (KES):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-outline">KES</span>
                    <input
                      type="number"
                      required
                      min="100"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-12 pr-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs font-data-mono font-bold text-on-surface focus:outline-hidden focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Fee Category:
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full p-2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface"
                  >
                    <option value="TUITION">Tuition & Learning</option>
                    <option value="ASSESSMENT">CBC Assessment & KNEC</option>
                    <option value="ACTIVITY">Activity & Sports</option>
                    <option value="MEALS">School Meals / Lunch</option>
                    <option value="TRANSPORT">School Transport</option>
                    <option value="GENERAL">General Fee Balance</option>
                  </select>
                </div>
              </div>

              {/* Payer Email and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Guardian Email (for Receipt):
                  </label>
                  <input
                    type="email"
                    required
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Guardian Phone:
                  </label>
                  <input
                    type="text"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="+2547..."
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-primary to-[#500b1a] text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                  <span>
                    Proceed with {paymentRail === 'bank_transfer' ? 'Bank Transfer Virtual Account' : 'Paystack Online Checkout'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">Connecting to Paystack Banking Gateway...</h4>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                  Generating secure Stanbic Bank virtual account and cryptographic payment reference.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: BANK DETAILS & VERIFY */}
          {step === 'bank_details' && paystackData && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Dedicated Virtual Bank Account
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                    Stanbic Bank Kenya
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  Transfer exact fee amount to this dedicated virtual account via your Bank App, M-Pesa Paybill to Bank, or RTGS/EFT:
                </p>
              </div>

              {/* Bank Account Information Card */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Bank Name:</span>
                  <span className="text-xs font-bold text-on-surface font-data-mono">
                    {paystackData.bankDetails?.bankName || 'Stanbic Bank Kenya'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-primary font-data-mono tracking-wider">
                      {paystackData.bankDetails?.accountNumber || '0100982347101'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paystackData.bankDetails?.accountNumber || '0100982347101', 'account')}
                      className="text-xs text-secondary hover:text-secondary/80 font-bold px-1.5 py-0.5 rounded hover:bg-secondary/10 cursor-pointer"
                    >
                      {copiedField === 'account' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Account Name:</span>
                  <span className="text-xs font-semibold text-on-surface">
                    {paystackData.bankDetails?.accountName || 'Grace Seeds School - Fee Collection'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <span className="text-xs text-on-surface-variant">Payment Reference:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-data-mono text-on-surface">
                      {paystackData.reference}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paystackData.reference, 'ref')}
                      className="text-xs text-secondary hover:text-secondary/80 font-bold px-1.5 py-0.5 rounded hover:bg-secondary/10 cursor-pointer"
                    >
                      {copiedField === 'ref' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-on-surface-variant font-semibold">Amount to Transfer:</span>
                  <span className="text-base font-black text-secondary font-data-mono">
                    KES {Number(amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Online Checkout Link Option */}
              {paystackData.authorizationUrl && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/30 text-xs">
                  <span className="text-on-surface-variant">Prefer direct Card / Online checkout?</span>
                  <a
                    href={paystackData.authorizationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    <span>Open Paystack Portal</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleVerifyPayment}
                  className="w-full py-3 bg-secondary text-white font-bold rounded-xl text-xs shadow-md hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">sync</span>
                  <span>I Have Completed Bank Transfer - Verify Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="w-full py-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Back to Form
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && completedTx && (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>

              <div>
                <h4 className="text-lg font-black text-on-surface">Bank Settlement Confirmed!</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  The payment has been verified by Paystack and credited to {completedTx.studentName}'s fee ledger.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-left space-y-2 text-xs font-body">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Official Receipt #:</span>
                  <span className="font-data-mono font-bold text-primary">{completedTx.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Paystack Reference:</span>
                  <span className="font-data-mono text-on-surface">{completedTx.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Settled Amount:</span>
                  <span className="font-data-mono font-black text-secondary">KES {completedTx.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Payment Rail:</span>
                  <span className="font-semibold text-on-surface uppercase">{completedTx.channel || 'BANK TRANSFER'}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
