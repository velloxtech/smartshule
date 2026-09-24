import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { IncomeSourceType, OtherIncomeRecord } from '../../types';

interface RecordIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncomeRecorded: (income: OtherIncomeRecord) => void;
}

const SOURCE_OPTIONS: { value: IncomeSourceType; label: string; icon: string }[] = [
  { value: 'FEES_COLLECTION', label: 'Student Fees Collection (Direct Inflow)', icon: 'payments' },
  { value: 'GOVERNMENT_CAPITATION_JSS', label: 'MoE Junior Secondary Capitation Grant (JSS)', icon: 'account_balance' },
  { value: 'GOVERNMENT_CAPITATION_FPE', label: 'MoE Free Primary Capitation Grant (FPE)', icon: 'school' },
  { value: 'UNIFORM_SALES', label: 'School Uniform Store & Merchandise Sales', icon: 'checkroom' },
  { value: 'BUS_FACILITY_HIRE', label: 'School Bus, Hall & Grounds / Facility Hire', icon: 'directions_bus' },
  { value: 'DONATIONS_GRANTS', label: 'Donations, Alumni & Development Grants', icon: 'volunteer_activism' },
  { value: 'EXAM_REVISION_BOOKS', label: 'Exam Revision Books & CBC Workbooks', icon: 'auto_stories' },
  { value: 'OTHER_INCOME', label: 'Other Miscellaneous School Inflows', icon: 'add_circle' },
];

export const RecordIncomeModal: React.FC<RecordIncomeModalProps> = ({
  isOpen,
  onClose,
  onIncomeRecorded,
}) => {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<IncomeSourceType>('GOVERNMENT_CAPITATION_JSS');
  const [amount, setAmount] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'BANK_TRANSFER' | 'BANK_DEPOSIT' | 'MPESA' | 'CHEQUE' | 'CASH' | 'CARD' | 'KCB_BUNI'
  >('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title or narration for this income receipt.');
      return;
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!receivedFrom.trim()) {
      setError('Please indicate who the funds were received from.');
      return;
    }
    if (!paymentReference.trim()) {
      setError('Please provide a payment reference (e.g. EFT ref, Bank slip, M-Pesa ID).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.recordOtherIncome({
        source,
        title: title.trim(),
        amount: parsedAmount,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        receivedFrom: receivedFrom.trim(),
        incomeDate,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        onIncomeRecorded(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to record income');
      }
    } catch (err: any) {
      setError(err.message || 'Network error recording income');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">Record Non-Fee Income</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 text-emerald-200 border border-emerald-300/30">
                  Money In
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">Government Capitation · Grants · Uniform Store · Facility Hire</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Regulatory Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 px-5 py-2.5 border-b border-emerald-200/50 dark:border-emerald-900/40 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
          <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">receipt</span>
          <span>Issues an official School Miscellaneous General Receipt (OR) in the financial ledger.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Income Narration / Title <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MoE Junior Secondary Capitation Grant Term 1 2026"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              required
            />
          </div>

          {/* Source & Amount in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Revenue Source <span className="text-emerald-600">*</span>
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as IncomeSourceType)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Amount (KES) <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                  KES
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="240,000"
                  min="1"
                  step="0.01"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-12 pr-3.5 py-2.5 text-sm font-semibold text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Received From & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Received From / Payer <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="e.g. Ministry of Education, St. Teresa Church"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Receipt Date <span className="text-emerald-600">*</span>
              </label>
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                required
              />
            </div>
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Receiving Account / Channel <span className="text-emerald-600">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              >
                <option value="BANK_TRANSFER">Bank Account (EFT / Wire)</option>
                <option value="BANK_DEPOSIT">Bank Direct Deposit Slip</option>
                <option value="MPESA">M-Pesa (Till / Paybill)</option>
                <option value="CHEQUE">Bankers Cheque</option>
                <option value="CASH">Cash Drawer</option>
                <option value="KCB_BUNI">KCB Buni Online Payment</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Reference / Slip / Transaction ID <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. EFT-MOE-TR1, QHN77889DD, SLIP-449"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm font-mono text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Auditor Notes / Purpose Description (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Capitation allocation for 120 Grade 7 learners verified via NEMIS UPI registers."
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-on-surface focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving Inflow...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Record Official Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
