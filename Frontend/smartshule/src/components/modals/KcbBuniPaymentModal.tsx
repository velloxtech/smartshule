import React, { useState, useEffect } from 'react';
import { Student, StudentInvoice, KcbBuniConfig, KcbBuniStkPushResponse } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface KcbBuniPaymentModalProps {
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

export const KcbBuniPaymentModal: React.FC<KcbBuniPaymentModalProps> = ({
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
  const [payerPhone, setPayerPhone] = useState<string>(
    initialStudent?.guardianPhone || (students.length > 0 ? (students[0].guardianPhone || '') : '')
  );
  const [amount, setAmount] = useState<string>(
    initialInvoice ? initialInvoice.balance.toString() : (initialStudent && initialStudent.feeBalance > 0 ? initialStudent.feeBalance.toString() : '')
  );
  const [activeTab, setActiveTab] = useState<'stk_push' | 'paybill_instructions' | 'bank_transfer'>('stk_push');

  const [step, setStep] = useState<'form' | 'pushing' | 'awaiting_pin' | 'success'>('form');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [kcbConfig, setKcbConfig] = useState<KcbBuniConfig | null>(null);
  const [stkResponse, setStkResponse] = useState<KcbBuniStkPushResponse | null>(null);
  const [completedTx, setCompletedTx] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Real-time validation state for Tab 2
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    studentName?: string;
    balance?: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      apiService.getKcbBuniConfig().then((res) => {
        if (res?.success && res.data) {
          setKcbConfig(res.data);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

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
  }, [initialStudent, initialInvoice, students, isOpen]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId) || initialStudent || students[0];
  const admissionNumber = currentStudent?.admNo || 'ADM-GENERAL';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStudentChange = (sId: string) => {
    setSelectedStudentId(sId);
    const found = students.find((s) => s.id === sId);
    if (found) {
      if (found.guardianPhone) setPayerPhone(found.guardianPhone);
      if (found.feeBalance > 0 && !initialInvoice) {
        setAmount(found.feeBalance.toString());
      }
      setValidationResult(null);
    }
  };

  // 1. Trigger KCB Buni M-Pesa Express STK Push
  const handleInitiateStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStep('pushing');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      setStep('form');
      return;
    }

    let cleanPhone = payerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('254')) {
      cleanPhone = '254' + cleanPhone;
    }

    try {
      const res = await apiService.initiateKcbBuniStkPush({
        invoiceId: initialInvoice?.id || currentStudent?.id || 'inv-gen',
        phoneNumber: cleanPhone,
        amount: numAmount,
        description: `Fees - ${admissionNumber}`
      });

      if (res?.success && res.data) {
        setStkResponse(res.data);
        setStep('awaiting_pin');
      } else {
        throw new Error(res?.message || 'Failed to dispatch KCB Buni STK push');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with KCB Buni API. Please try again.');
      setStep('form');
    }
  };

  // 2. Query / Check STK Push Status
  const handleVerifyKcbStatus = async () => {
    if (!stkResponse?.checkoutRequestId) return;
    setErrorMsg(null);

    try {
      const res = await apiService.queryKcbBuniStatus(stkResponse.checkoutRequestId);
      if (res?.success && res.data) {
        const receipt = res.data.receiptNumber || `KCB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const paidAmount = Number(amount) || 0;

        const txData = {
          studentName: currentStudent?.name || 'Learner',
          admNo: admissionNumber,
          amount: paidAmount,
          channel: 'KCB Buni M-Pesa Express',
          reference: stkResponse.checkoutRequestId,
          receiptNumber: receipt,
        };

        setCompletedTx(txData);
        setStep('success');

        if (onPaymentSuccess) {
          onPaymentSuccess(txData);
        }
      } else {
        setErrorMsg('Payment confirmation still pending. Please verify your M-Pesa PIN was entered.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not verify status with KCB Buni. Please check M-Pesa message.');
    }
  };

  // 3. Test / Validate Learner Account on KCB Paybill 522123
  const handleValidateAccount = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await apiService.validateKcbBuniBill({
        billReferenceNumber: admissionNumber,
        amount: Number(amount) || 0,
        phoneNumber: payerPhone
      });

      if (res?.resultCode === '0' || res?.success) {
        setValidationResult({
          success: true,
          studentName: res.studentName || currentStudent?.name,
          balance: res.currentBalance !== undefined ? res.currentBalance : currentStudent?.feeBalance,
          message: 'Account Validated: Active learner registered on KCB Buni Paybill 522123'
        });
      } else {
        setValidationResult({
          success: false,
          message: res?.resultDesc || 'Student admission number not found on school registry'
        });
      }
    } catch (err: any) {
      setValidationResult({
        success: false,
        message: err.message || 'Validation request failed'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setErrorMsg(null);
    setStkResponse(null);
    setValidationResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* KCB Bank Branded Header */}
        <div className="bg-gradient-to-r from-[#005a36] via-[#006a40] to-[#0b7049] text-white p-5 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[26px] text-emerald-300">account_balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">KCB Buni Payment Gateway</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  KCB Bank Kenya
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Official Paybill <span className="font-bold font-data-mono text-white">522123</span> · Buni Developer API Platform
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Channel Selection Tabs */}
        {step === 'form' && (
          <div className="flex border-b border-outline-variant/30 bg-surface-container-low px-4 pt-3 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('stk_push')}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'stk_push'
                  ? 'border-[#006a40] text-[#006a40]'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
              <span>KCB Buni STK Push</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paybill_instructions')}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'paybill_instructions'
                  ? 'border-[#006a40] text-[#006a40]'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">pin</span>
              <span>Paybill 522123 (M-Pesa / App)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bank_transfer')}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'bank_transfer'
                  ? 'border-[#006a40] text-[#006a40]'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
              <span>KCB Bank Transfer</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 overscroll-contain">
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: INITIAL FORM */}
          {step === 'form' && (
            <div className="space-y-4">
              
              {/* Learner Select */}
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1 tracking-wider">
                  Select Learner
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 text-sm text-on-surface focus:outline-[#006a40] focus:ring-1 focus:ring-[#006a40]"
                >
                  {students.length === 0 ? (
                    <option value="">No enrolled learners found</option>
                  ) : (
                    students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.admNo} - {s.grade}) · Outstanding: KES {s.feeBalance.toLocaleString()}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Amount to Pay */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold uppercase text-on-surface-variant tracking-wider">
                    Amount to Pay (KES)
                  </label>
                  {currentStudent && currentStudent.feeBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(currentStudent.feeBalance.toString())}
                      className="text-[11px] font-semibold text-[#006a40] hover:underline cursor-pointer"
                    >
                      Pay Full Balance (KES {currentStudent.feeBalance.toLocaleString()})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-[#006a40]">KES</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2.5 pl-14 pr-3 text-base font-bold font-data-mono text-on-surface focus:outline-[#006a40] focus:ring-1 focus:ring-[#006a40]"
                  />
                </div>
              </div>

              {/* TAB 1: KCB BUNI M-PESA EXPRESS */}
              {activeTab === 'stk_push' && (
                <form onSubmit={handleInitiateStkPush} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1 tracking-wider">
                      Parent / Guardian Mobile Phone (M-Pesa)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm text-outline font-medium">🇰🇪 +254</span>
                      <input
                        type="text"
                        required
                        value={payerPhone}
                        onChange={(e) => setPayerPhone(e.target.value)}
                        placeholder="0712 345 678"
                        className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2.5 pl-24 pr-3 text-sm font-data-mono text-on-surface focus:outline-[#006a40] focus:ring-1 focus:ring-[#006a40]"
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant/80 mt-1 block">
                      A real-time prompt will be dispatched directly to this phone via the <strong>KCB Buni Platform</strong>.
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-emerald-700">verified_user</span>
                      <div>
                        <div className="font-bold">KCB Bank Express Integration</div>
                        <div className="text-[11px] text-emerald-800">Shortcode: 522123 · Route: 207</div>
                      </div>
                    </div>
                    <span className="font-data-mono font-bold text-xs bg-white px-2.5 py-1 rounded-md border border-emerald-300">
                      {admissionNumber}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#006a40] hover:bg-[#005a36] text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
                      <span>Send KCB Buni Push Prompt</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: MANUAL KCB PAYBILL 522123 */}
              {activeTab === 'paybill_instructions' && (
                <div className="space-y-4 pt-1">
                  <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                      <span className="text-xs text-on-surface-variant font-medium">Business / Paybill No:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-data-mono font-extrabold text-base text-[#006a40]">522123</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('522123', 'paybill')}
                          className="px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-800 rounded font-semibold hover:bg-emerald-200 cursor-pointer"
                        >
                          {copiedField === 'paybill' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                      <span className="text-xs text-on-surface-variant font-medium">Account Number:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-data-mono font-extrabold text-base text-on-surface">{admissionNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(admissionNumber, 'account')}
                          className="px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-800 rounded font-semibold hover:bg-emerald-200 cursor-pointer"
                        >
                          {copiedField === 'account' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant font-medium">Amount to Pay:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-data-mono font-extrabold text-sm text-on-surface">KES {Number(amount || 0).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(amount || '0', 'amount')}
                          className="px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-800 rounded font-semibold hover:bg-emerald-200 cursor-pointer"
                        >
                          {copiedField === 'amount' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Validate Admission Account Button */}
                  <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant">Live Account Check:</span>
                      <button
                        type="button"
                        onClick={handleValidateAccount}
                        disabled={isValidating}
                        className="px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest text-[#006a40] text-xs font-bold rounded-lg border border-[#006a40]/30 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isValidating ? 'sync' : 'check_circle'}
                        </span>
                        <span>{isValidating ? 'Validating...' : 'Validate Account on KCB'}</span>
                      </button>
                    </div>

                    {validationResult && (
                      <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        validationResult.success
                          ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-300'
                          : 'bg-error-container/40 text-error border border-error/30'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {validationResult.success ? 'verified' : 'warning'}
                        </span>
                        <div>
                          <div className="font-bold">{validationResult.message}</div>
                          {validationResult.studentName && (
                            <div className="text-[11px] opacity-90">
                              Learner: {validationResult.studentName} · Balance: KES {validationResult.balance?.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="text-xs text-on-surface-variant space-y-1.5 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20">
                    <div className="font-bold text-on-surface mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#006a40]">smartphone</span>
                      <span>How to Pay via M-Pesa / KCB App:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Go to <strong>M-Pesa</strong> &gt; <strong>Lipa na M-Pesa</strong> &gt; <strong>Paybill</strong> (or open <strong>KCB App / Vooma</strong>).</li>
                      <li>Enter Business Number: <strong className="font-data-mono">522123</strong>.</li>
                      <li>Enter Account Number: <strong className="font-data-mono">{admissionNumber}</strong>.</li>
                      <li>Enter Amount: <strong>KES {Number(amount || 0).toLocaleString()}</strong>.</li>
                      <li>Enter your M-Pesa / KCB App PIN and confirm.</li>
                    </ol>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold rounded-xl cursor-pointer"
                    >
                      Done / Close
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DIRECT KCB BANK TRANSFER */}
              {activeTab === 'bank_transfer' && (
                <div className="space-y-4 pt-1">
                  <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                      <span className="text-xs text-on-surface-variant">Bank Name:</span>
                      <span className="text-xs font-bold text-on-surface">KCB Bank Kenya Limited</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                      <span className="text-xs text-on-surface-variant">Collection Paybill:</span>
                      <span className="font-data-mono font-bold text-xs text-[#006a40]">522123</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                      <span className="text-xs text-on-surface-variant">Account / Student Reference:</span>
                      <span className="font-data-mono font-bold text-xs text-on-surface">{admissionNumber}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                      <span className="text-xs text-on-surface-variant">Beneficiary:</span>
                      <span className="text-xs font-medium text-on-surface">SmartShule Collection Account</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Channels Supported:</span>
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        KCB Branch · KCB Mtaani Agent · Internet Banking
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-700">info</span>
                    <span>
                      Always include learner's admission number <strong>{admissionNumber}</strong> as the payment reference for immediate automated reconciliation.
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold rounded-xl cursor-pointer"
                    >
                      Close Instructions
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 2: DISPATCHING / CONNECTING TO KCB BUNI */}
          {step === 'pushing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-[#006a40] animate-spin">
                <span className="material-symbols-outlined text-[32px]">sync</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-on-surface">Connecting to KCB Buni API Platform...</h4>
                <p className="text-xs text-on-surface-variant mt-1.5 max-w-xs mx-auto">
                  Authorizing OAuth 2.0 and sending M-Pesa Express prompt to <strong className="font-data-mono">{payerPhone}</strong>
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: AWAITING PIN / POLLING */}
          {step === 'awaiting_pin' && stkResponse && (
            <div className="py-6 space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#006a40] mx-auto flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[30px] animate-pulse">lock_clock</span>
              </div>
              
              <div>
                <h4 className="font-bold text-base text-on-surface">Prompt Dispatched to Mobile!</h4>
                <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                  {stkResponse.customerMessage || `Please check ${payerPhone} and enter your M-Pesa PIN to complete payment of KES ${Number(amount).toLocaleString()} to KCB Paybill 522123.`}
                </p>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-3.5 max-w-sm mx-auto text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Checkout Request ID:</span>
                  <span className="font-data-mono font-bold text-on-surface">{stkResponse.checkoutRequestId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Learner:</span>
                  <span className="font-bold text-on-surface">{currentStudent?.name} ({admissionNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Amount:</span>
                  <span className="font-bold text-[#006a40]">KES {Number(amount).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  Change Details
                </button>
                <button
                  type="button"
                  onClick={handleVerifyKcbStatus}
                  className="px-5 py-2.5 bg-[#006a40] hover:bg-[#005a36] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Confirm / Verify Payment</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 'success' && completedTx && (
            <div className="py-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>

              <div>
                <h4 className="font-bold text-lg text-on-surface">Payment Successfully Settled!</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  Payment confirmed by KCB Buni API platform and credited to learner's fee balance.
                </p>
              </div>

              <div className="bg-surface-container-low border border-emerald-300/40 rounded-xl p-4 max-w-sm mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">KCB Receipt Code:</span>
                  <span className="font-data-mono font-bold text-emerald-700">{completedTx.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Learner:</span>
                  <span className="font-bold text-on-surface">{completedTx.studentName} ({completedTx.admNo})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Amount Paid:</span>
                  <span className="font-bold text-emerald-700 text-sm">KES {Number(completedTx.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Gateway Channel:</span>
                  <span className="font-semibold text-on-surface">{completedTx.channel}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-[#006a40] hover:bg-[#005a36] text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
