import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Student, StudentInvoice } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onPaymentRecorded: (payment: any) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  students,
  onPaymentRecorded,
}) => {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>(user?.schoolId || '');

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'MPESA' | 'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'CHEQUE' | 'CASH' | 'CARD' | 'KCB_BUNI'
  >('MPESA');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!schoolId) {
      apiService.getSchool().then((res) => {
        if (res?.data) setSchoolId(res.data.id);
      }).catch(() => {});
    }
  }, [isOpen, schoolId]);

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
          const unpaid = res.data.find((inv) => (inv.balance || 0) > 0) || res.data[0];
          if (unpaid) {
            setSelectedInvoiceId(unpaid.id);
            if ((unpaid.balance || 0) > 0) {
              setAmount(unpaid.balance.toString());
            }
          } else {
            setSelectedInvoiceId('');
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
  }, [selectedStudentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) {
      setError('Please select an active invoice for this student, or generate an invoice first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.recordPayment({
        schoolId,
        invoiceId: selectedInvoiceId,
        amount: Number(amount),
        paymentMethod,
        transactionReference,
        recordedByUserId: user?.id || 'admin',
        notes: notes || undefined,
      });

      if (res.success && res.data) {
        onPaymentRecorded(res.data);
        onClose();
      } else {
        setError(res.message || 'Payment recording failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error recording payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Record Direct Payment</h3>
              <p className="text-xs text-rose-100">Bank Wire · Cheque · Cash Official Receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Select Learner
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            >
              {students.length === 0 ? (
                <option value="">No enrolled learners found</option>
              ) : (
                <>
                  <option value="">-- Select Learner --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admNo}) - Balance: KES {s.feeBalance.toLocaleString()}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Invoice to Settle
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
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary font-data-mono"
            >
              {invoices.length === 0 ? (
                <option value="">No billed invoices found for this learner</option>
              ) : (
                <>
                  <option value="">-- Select Invoice --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} · Bal: KES {(inv.balance || 0).toLocaleString()} (Due: {inv.dueDate})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="MPESA">M-Pesa (Till / Paybill)</option>
                <option value="BANK_TRANSFER">Bank Wire / EFT Transfer</option>
                <option value="BANK_DEPOSIT">Bank Direct Deposit / Agent Slip</option>
                <option value="CASH">Cash Office</option>
                <option value="CHEQUE">Banker's Cheque</option>
                <option value="KCB_BUNI">KCB Buni Online Payment</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary font-data-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Slip / Reference / Cheque #
            </label>
            <input
              type="text"
              required
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="e.g. QHJ8921KL or BNK-829103"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary font-data-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Receipt Notes / Narration
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank slip number or transaction notes"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !selectedInvoiceId || Number(amount) <= 0}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>{isLoading ? 'Processing...' : 'Record & Issue Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
