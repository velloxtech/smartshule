import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { ExpenseCategoryType, ExpenseRecord, ExpenseStatusType } from '../../types';

interface RecordExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseRecorded: (expense: ExpenseRecord) => void;
}

const CATEGORY_OPTIONS: { value: ExpenseCategoryType; label: string; icon: string }[] = [
  { value: 'SALARIES_WAGES', label: 'Salaries & Wages (BOM & Support Staff)', icon: 'badge' },
  { value: 'CBC_LEARNING_MATERIALS', label: 'CBC Learning Materials & Lab Kits', icon: 'science' },
  { value: 'UTILITIES_BILLS', label: 'Utilities & Bills (KPLC Power, Water, Internet)', icon: 'bolt' },
  { value: 'MEALS_FEEDING', label: 'Meals Programme & Kitchen Foodstock', icon: 'restaurant' },
  { value: 'REPAIRS_MAINTENANCE', label: 'Repairs, Plumbing & Facilities Maintenance', icon: 'handyman' },
  { value: 'TRANSPORT_FUEL', label: 'Transport, School Bus Fuel & Servicing', icon: 'directions_bus' },
  { value: 'ADMIN_OFFICE', label: 'Administration, Office & Stationery Printing', icon: 'description' },
  { value: 'KNEC_EXAMS', label: 'KNEC & Assessment Examination Logistics', icon: 'assignment_turned_in' },
  { value: 'CO_CURRICULAR', label: 'Co-Curricular, Sports & Music Festivals', icon: 'sports_soccer' },
  { value: 'CAPITAL_DEVELOPMENT', label: 'Capital & Infrastructure Development', icon: 'domain' },
  { value: 'OTHER_EXPENSES', label: 'Other Miscellaneous Expenses', icon: 'more_horiz' },
];

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseRecorded,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategoryType>('UTILITIES_BILLS');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'CARD'>('MPESA');
  const [paymentReference, setPaymentReference] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<ExpenseStatusType>('PAID');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a descriptive title for this expense.');
      return;
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!payee.trim()) {
      setError('Please specify the payee / vendor / recipient.');
      return;
    }
    if (!paymentReference.trim()) {
      setError('Please provide a payment reference (e.g. M-Pesa ID, Cheque #, EFT slip).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.recordExpense({
        category,
        title: title.trim(),
        amount: parsedAmount,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        payee: payee.trim(),
        expenseDate,
        status,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        onExpenseRecorded(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to record expense');
      }
    } catch (err: any) {
      setError(err.message || 'Network error recording expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">Record School Expense</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/70 text-rose-200 border border-rose-300/30">
                  Money Out
                </span>
              </div>
              <p className="text-xs text-rose-100/90 mt-0.5">MoE Vote Head Accounting & Payment Voucher (PV)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Regulatory Banner */}
        <div className="bg-rose-50 dark:bg-rose-950/30 px-5 py-2.5 border-b border-rose-200/50 dark:border-rose-900/40 flex items-center gap-2 text-xs text-rose-900 dark:text-rose-200">
          <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0">verified_user</span>
          <span>Compliant with Kenyan Public Finance Management Act (PFMA) and Ministry of Education audit vouchers.</span>
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
              Expense Title / Narration <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. KPLC Electricity Bill - January 2026"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
              required
            />
          </div>

          {/* Category & Amount in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Vote Head / Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategoryType)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Amount (KES) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                  KES
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25,000"
                  min="1"
                  step="0.01"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-12 pr-3.5 py-2.5 text-sm font-semibold text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payee & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Payee / Vendor / Supplier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="e.g. Kenya Power, TotalEnergies, Fundi James"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
                required
              />
            </div>
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Disbursement Channel <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
              >
                <option value="MPESA">M-Pesa (Till / Paybill)</option>
                <option value="BANK_TRANSFER">Bank EFT / Wire Transfer</option>
                <option value="CHEQUE">School Cheque</option>
                <option value="CASH">Petty Cash Drawer</option>
                <option value="CARD">Debit / Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Ref / Voucher # / Slip <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. QHJ89012AA, CHQ-0021, PCV-05"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-sm font-mono text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
                required
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Voucher Status
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'PAID', label: 'Paid / Disbursed', color: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' },
                { id: 'APPROVED', label: 'Approved (Pending Disb.)', color: 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
                { id: 'PENDING', label: 'Draft / Under Review', color: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id as ExpenseStatusType)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all cursor-pointer text-center ${
                    status === s.id ? s.color : 'border-outline-variant/30 text-on-surface-variant bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  {s.label}
                </button>
              ))}
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
              placeholder="e.g. Authorized by Principal for Junior Secondary practical science project materials."
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-on-surface focus:outline-rose-600 focus:ring-1 focus:ring-rose-600 transition-all"
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
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-700 hover:bg-rose-800 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Record Payment Voucher</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
