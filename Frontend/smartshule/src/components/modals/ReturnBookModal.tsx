import React, { useState, useEffect } from 'react';
import { BookLoan } from '../../types';

interface ReturnBookModalProps {
  isOpen: boolean;
  loan: BookLoan | null;
  onClose: () => void;
  onSubmit: (
    loanId: string,
    returnData: {
      returnDate: string;
      fineAmount?: number;
      finePaid?: boolean;
      remarks?: string;
      status?: 'RETURNED' | 'LOST' | 'DAMAGED';
    }
  ) => Promise<void>;
}

const ReturnBookModal: React.FC<ReturnBookModalProps> = ({
  isOpen,
  loan,
  onClose,
  onSubmit
}) => {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [conditionStatus, setConditionStatus] = useState<'RETURNED' | 'LOST' | 'DAMAGED'>('RETURNED');
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [finePaid, setFinePaid] = useState<boolean>(false);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loan) {
      const today = new Date().toISOString().split('T')[0];
      setReturnDate(today);
      setFineAmount(loan.fineAmount > 0 ? loan.fineAmount : 0);
      setFinePaid(loan.finePaid || false);
      setRemarks(loan.remarks || '');
      setConditionStatus(loan.status === 'LOST' || loan.status === 'DAMAGED' ? loan.status : 'RETURNED');
      setError(null);
    }
  }, [loan, isOpen]);

  if (!isOpen || !loan) return null;

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = loan.dueDate && today > loan.dueDate;
  const overdueDays = isOverdue
    ? Math.ceil((new Date(today).getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(loan.id, {
        returnDate,
        fineAmount: Number(fineAmount) || 0,
        finePaid,
        remarks: remarks.trim() || undefined,
        status: conditionStatus
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process book return');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-outline-variant/30">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined">library_add_check</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Return Book (Check-In)</h2>
              <p className="text-xs text-on-surface-variant">Record item return, assess condition & overdue fines</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="p-2 text-gray-400 hover:text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {/* Loan Card Summary */}
          <div className="mb-5 p-4 rounded-xl bg-surface border border-outline-variant/80 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Title</span>
                <h4 className="text-sm font-bold text-on-surface">{loan.bookTitle}</h4>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isOverdue ? `${overdueDays} Days Overdue` : 'Within Due Period'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant pt-1 border-t border-outline-variant/60">
              <div>Borrower: <strong className="text-on-surface">{loan.borrowerName}</strong> ({loan.borrowerType})</div>
              <div>Due Date: <strong className="text-on-surface font-mono">{loan.dueDate}</strong></div>
            </div>
          </div>

          <form id="return-book-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Condition on Return */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Item Status / Condition on Return
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setConditionStatus('RETURNED')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                    conditionStatus === 'RETURNED'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-on-surface-variant border-outline-variant/30 hover:bg-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Returned Good
                </button>
                <button
                  type="button"
                  onClick={() => setConditionStatus('DAMAGED')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                    conditionStatus === 'DAMAGED'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-on-surface-variant border-outline-variant/30 hover:bg-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">warning</span>
                  Damaged
                </button>
                <button
                  type="button"
                  onClick={() => setConditionStatus('LOST')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                    conditionStatus === 'LOST'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                      : 'bg-white text-on-surface-variant border-outline-variant/30 hover:bg-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  Reported Lost
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Return Date
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface font-medium"
              />
            </div>

            {/* Fine Section */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">payments</span>
                  Overdue / Replacement Fine (KES)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-on-surface-variant">KES</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={fineAmount}
                    onChange={e => setFineAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-12 pr-3 py-1.5 text-xs font-bold border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface-variant select-none">
                  <input
                    type="checkbox"
                    checked={finePaid}
                    onChange={e => setFinePaid(e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span>Paid in Full</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Check-in Remarks / Condition Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Returned on time, clean copy, or minor torn page taped"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-end gap-3 bg-surface/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="return-book-form"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Processing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">task_alt</span>
                Complete Check-In
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReturnBookModal;
