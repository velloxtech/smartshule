import React, { useState, useEffect } from 'react';
import { Student } from '../../types';

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
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudent?.id || (students && students.length > 0 ? students[0].id : '')
  );
  const [phone, setPhone] = useState(
    initialStudent?.guardianPhone || (students && students.length > 0 ? students[0].guardianPhone : '0712 345 678')
  );
  const [amount, setAmount] = useState(
    initialStudent
      ? (initialStudent.feeBalance > 0 ? initialStudent.feeBalance.toString() : '15000')
      : (students && students.length > 0 && students[0].feeBalance > 0 ? students[0].feeBalance.toString() : '24000')
  );
  const [step, setStep] = useState<'form' | 'pushing' | 'prompt' | 'success'>('form');
  const [txRef, setTxRef] = useState('QKH' + Math.floor(100000 + Math.random() * 900000) + 'XJ');

  useEffect(() => {
    if (initialStudent) {
      setSelectedStudentId(initialStudent.id);
      setPhone(initialStudent.guardianPhone);
      setAmount(initialStudent.feeBalance > 0 ? initialStudent.feeBalance.toString() : '15000');
    } else if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
      setPhone(students[0].guardianPhone);
      setAmount(students[0].feeBalance > 0 ? students[0].feeBalance.toString() : '15000');
    }
  }, [initialStudent, students, isOpen]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === selectedStudentId) || initialStudent || students[0];

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const s = students.find((st) => st.id === id);
    if (s) {
      setPhone(s.guardianPhone);
      setAmount(s.feeBalance > 0 ? s.feeBalance.toString() : '15000');
    }
  };

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('pushing');
    const newRef = 'QKH' + Math.floor(100000 + Math.random() * 900000) + 'XJ';
    setTxRef(newRef);

    setTimeout(() => {
      setStep('prompt');
    }, 1200);
  };

  const handleSimulatePinEnter = () => {
    const paidAmount = Number(amount) || 24000;
    if (onPaymentSuccess) {
      onPaymentSuccess({
        studentName: currentStudent ? currentStudent.name : 'Kevin Omondi',
        admNo: currentStudent ? currentStudent.admNo : '2024-082',
        grade: currentStudent ? currentStudent.grade : 'Grade 4',
        amount: paidAmount,
        phone,
        ref: txRef,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30">
        {/* Modal Header */}
        <div className="bg-[#00236f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#006a63] flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">M-Pesa STK Push Collection</h3>
              <p className="text-xs text-blue-200">Safaricom Daraja API v2.0 · Paybill 891230</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6">
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
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admNo} - {s.grade}) · Bal: KES {s.feeBalance.toLocaleString()}
                    </option>
                  ))}
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
                  Paybill Account:
                </span>
                <span className="font-data-mono font-bold">HILLSIDE-{currentStudent?.admNo}</span>
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
                <div className="text-base font-bold text-on-surface">Connecting to Safaricom Daraja...</div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Dispatching USSD Push payload to {phone}
                </p>
              </div>
            </div>
          )}

          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="p-4 bg-surface-container-low rounded-xl border border-secondary/30 relative">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-white text-[10px] font-bold uppercase tracking-wider mb-2">
                  <span>📱 Parent's Phone Screen</span>
                </div>
                <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs shadow-inner leading-relaxed">
                  <p className="font-bold text-white mb-1">Do you want to pay KES {Number(amount).toLocaleString()} to HILLSIDE ACADEMY Paybill 891230?</p>
                  <p className="text-slate-300">Account: {currentStudent.admNo}</p>
                  <p className="text-yellow-400 mt-2">Enter M-Pesa PIN:</p>
                  <p className="text-lg tracking-widest text-white mt-1">● ● ● ●</p>
                </div>
              </div>

              <p className="text-xs text-center text-on-surface-variant">
                Waiting for parent's biometric confirmation or PIN entry on their mobile phone...
              </p>

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
                  onClick={handleSimulatePinEnter}
                  className="px-4 py-2.5 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-[#00504a] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Simulate PIN Entered (Pay)</span>
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
                  KES {Number(amount).toLocaleString()} credited to Hillside Academy collection ledger.
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
