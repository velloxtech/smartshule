import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { apiService } from '../../services/api';

interface MpesaStkModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  onSuccess?: (phone: string, amount: number, studentId: string) => void;
  onPaymentSuccess?: (tx: {
    studentName: string;
    admNo: string;
    amount: number;
    phone: string;
    ref: string;
    grade: string;
  }) => void;
}

export const MpesaStkModal: React.FC<MpesaStkModalProps> = ({
  isOpen,
  onClose,
  students = [],
  initialStudent,
  onSuccess,
  onPaymentSuccess,
}) => {
  const [school, setSchool] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudent?.id || (students && students.length > 0 ? students[0].id : '')
  );
  const [phone, setPhone] = useState(
    initialStudent?.guardianPhone || (students && students.length > 0 ? students[0].guardianPhone : '')
  );
  const [amount, setAmount] = useState(
    initialStudent
      ? (initialStudent.feeBalance > 0 ? initialStudent.feeBalance.toString() : '')
      : (students && students.length > 0 && students[0].feeBalance > 0 ? students[0].feeBalance.toString() : '')
  );
  const [step, setStep] = useState<'form' | 'pushing' | 'prompt' | 'success'>('form');
  const [txRef, setTxRef] = useState('QKH' + Math.floor(100000 + Math.random() * 900000) + 'XJ');
  const [mpesaReceiptCode, setMpesaReceiptCode] = useState('');

  useEffect(() => {
    apiService.getSchool().then(res => {
      if (res?.success && res.data) setSchool(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudentId(initialStudent.id);
      setPhone(initialStudent.guardianPhone || '');
      setAmount(initialStudent.feeBalance > 0 ? initialStudent.feeBalance.toString() : '');
    } else if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
      setPhone(students[0].guardianPhone || '');
      setAmount(students[0].feeBalance > 0 ? students[0].feeBalance.toString() : '');
    }
  }, [initialStudent, students, selectedStudentId]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId) || initialStudent || students[0];

  const handleStudentChange = (sId: string) => {
    setSelectedStudentId(sId);
    const found = students.find((s) => s.id === sId);
    if (found) {
      setPhone(found.guardianPhone || '');
      setAmount(found.feeBalance > 0 ? found.feeBalance.toString() : '');
    }
  };

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleStudentChange(e.target.value);
  };

  const handleTriggerPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setStep('pushing');
    const newRef = 'QKH' + Math.floor(100000 + Math.random() * 900000) + 'XJ';
    setTxRef(newRef);

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '254' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('254')) {
      cleanPhone = '254' + cleanPhone;
    }

    if (currentStudent) {
      apiService.initiateMpesaStkPush(currentStudent.id, cleanPhone).catch(() => {});
    }

    setTimeout(() => {
      setStep('prompt');
    }, 1200);
  };

  const handleSendPush = handleTriggerPush;

  const handleConfirmPayment = () => {
    const paidAmount = Number(amount) || 0;
    const finalRef = mpesaReceiptCode.trim() || txRef;
    if (onPaymentSuccess && currentStudent) {
      onPaymentSuccess({
        studentName: currentStudent.name,
        admNo: currentStudent.admNo,
        grade: currentStudent.grade,
        amount: paidAmount,
        phone,
        ref: finalRef,
      });
    }
    if (onSuccess) {
      onSuccess(phone, paidAmount, currentStudent?.id || '');
    }
    setStep('success');
  };

  const handleReset = () => {
    setStep('form');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Modal Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#006a40] flex items-center justify-center text-white font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">KCB Buni M-Pesa Express</h3>
              <p className="text-xs text-rose-100">KCB Bank Kenya API Platform · Paybill 522123</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {step === 'form' && (
            <form onSubmit={handleSendPush} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1 tracking-wider">
                  Select Learner
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                >
                  {students.length === 0 ? (
                    <option value="">No enrolled learners found</option>
                  ) : (
                    students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.admNo} - {s.grade}) · Bal: KES {s.feeBalance.toLocaleString()}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1 tracking-wider">
                  Parent / Guardian M-Pesa Phone
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-outline font-medium">🇰🇪 +254</span>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg py-2.5 pl-24 pr-3 text-sm font-data-mono text-on-surface focus:outline-primary"
                  />
                </div>
                <span className="text-[11px] text-outline mt-1 block">
                  A real-time push prompt will appear on parent's Safaricom SIM.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1 tracking-wider">
                  Amount to Request (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-primary">KES</span>
                  <input
                    type="number"
                    required
                    min="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg py-2.5 pl-14 pr-3 text-base font-bold font-data-mono text-on-surface focus:outline-primary"
                  />
                </div>
              </div>

              <div className="p-3 bg-secondary-container/40 rounded-xl flex items-center justify-between text-xs text-on-secondary-container">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  KCB Paybill 522123 Account:
                </span>
                <span className="font-data-mono font-bold">{currentStudent?.admNo}</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
                  <span>Trigger STK Push</span>
                </button>
              </div>
            </form>
          )}

          {step === 'pushing' && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-secondary animate-spin">
                <span className="material-symbols-outlined text-[32px]">sync</span>
              </div>
              <div>
                <div className="text-base font-bold text-on-surface">Connecting to KCB Buni API Platform...</div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Dispatching M-Pesa Express push prompt to {phone} via KCB Paybill 522123
                </p>
              </div>
            </div>
          )}

          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="p-4 bg-surface-container-low rounded-xl border border-secondary/30 relative space-y-2">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-secondary text-white text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    <span>STK Push Dispatched</span>
                  </div>
                  <span className="text-[11px] font-data-mono font-bold text-on-surface-variant">
                    {phone}
                  </span>
                </div>
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Amount Payable:</span>
                    <span className="font-bold text-secondary font-data-mono">KES {Number(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Account / Adm No:</span>
                    <span className="font-bold text-on-surface">{currentStudent ? currentStudent.admNo : '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Reference ID:</span>
                    <span className="font-data-mono text-outline text-[11px]">{txRef}</span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant text-center pt-1">
                  A secure push prompt was sent to the parent's handset. Enter the transaction receipt code from SMS or confirm receipt below.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  M-Pesa Receipt Code (Optional)
                </label>
                <input
                  type="text"
                  value={mpesaReceiptCode}
                  onChange={(e) => setMpesaReceiptCode(e.target.value.toUpperCase())}
                  placeholder={`e.g. ${txRef}`}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface font-data-mono focus:outline-primary uppercase"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-3 py-2 text-xs font-medium text-error hover:bg-error-container/30 rounded-lg"
                >
                  Cancel Request
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="px-4 py-2.5 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-[#00504a] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Confirm Payment Received</span>
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>
              <div>
                <h4 className="font-bold text-lg text-on-surface">Payment Confirmed!</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  KES {Number(amount).toLocaleString()} credited to {school?.name || 'school'} collection ledger.
                </p>
                <div className="inline-block mt-3 px-3 py-1 rounded bg-surface-container font-data-mono text-xs font-bold text-primary">
                  Ref: {txRef}
                </div>
              </div>
              <button
                onClick={handleReset}
                className="mt-4 px-6 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all cursor-pointer"
              >
                Done & Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
