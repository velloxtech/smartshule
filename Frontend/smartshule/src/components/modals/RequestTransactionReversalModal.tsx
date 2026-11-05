import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import apiService from '../../services/api';

export interface RequestTransactionReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: {
    id?: string;
    reference: string;
    receiptNumber?: string;
    type: 'PAYMENT' | 'CREDIT_UTILIZATION' | 'FEE_ALLOCATION' | 'OTHER';
    amount: number;
    date: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    gradeLevel?: string;
  } | null;
}

// Exportable reusable position loader
export const loadPosition = async (
  studentId: string,
  options?: { termId?: string; academicYearId?: string }
) => {
  return await apiService.getLearnerFeePosition(studentId, options);
};

export const RequestTransactionReversalModal: React.FC<RequestTransactionReversalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transaction
}) => {
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authoritative Learner Fee Position State
  const [accountPosition, setAccountPosition] = useState<any | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);

  const loadLearnerPosition = async () => {
    if (!transaction?.studentId) return;
    setIsLoadingPosition(true);
    setPositionError(null);
    try {
      const res = await apiService.getLearnerFeePosition(transaction.studentId);
      if (res?.success && res.data) {
        setAccountPosition(res.data);
      } else {
        setAccountPosition(null);
      }
    } catch (err: any) {
      console.warn('Could not load authoritative learner fee position', err);
      setPositionError(err?.message || 'Live ledger position unavailable');
      setAccountPosition(null);
    } finally {
      setIsLoadingPosition(false);
    }
  };

  // Reusable position loader accessible inside component scope
  const loadPosition = loadLearnerPosition;

  useEffect(() => {
    if (isOpen && transaction?.studentId) {
      loadPosition();
      setReason('');
      setExplanation('');
      setAttachmentUrl('');
      setError(null);
    } else {
      setAccountPosition(null);
      setPositionError(null);
    }
  }, [isOpen, transaction?.studentId]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A mandatory reversal reason is required (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiService.requestTransactionReversal({
        transactionId: transaction.id,
        transactionReference: transaction.receiptNumber || transaction.reference,
        transactionType: transaction.type,
        studentId: transaction.studentId,
        reason: reason.trim(),
        explanation: explanation.trim() || undefined,
        supportingAttachmentUrl: attachmentUrl.trim() || undefined
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to submit reversal request.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error submitting reversal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7a1228] to-[#9e1c38] p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Request Transaction Reversal</h3>
              <p className="text-xs text-rose-100">Bursar Submission &bull; Requires Administrator Approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Learner:</span>
              <span className="font-semibold text-slate-800">
                {transaction.studentName} ({transaction.admissionNumber})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Transaction Type:</span>
              <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 uppercase tracking-wide">
                {transaction.type.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Reference / Receipt:</span>
              <span className="font-mono text-xs font-bold text-slate-700">
                {transaction.receiptNumber || transaction.reference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Transaction Date:</span>
              <span className="text-xs font-medium text-slate-700">{transaction.date}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-600 font-bold">Transaction Amount:</span>
              <span className="text-base font-extrabold text-[#7a1228] font-mono">
                KES {Number(transaction.amount).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Authoritative Financial Position Card */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <span className="material-symbols-outlined text-[15px] text-[#7a1228]">account_balance_wallet</span>
                <span>Current Account Position</span>
              </span>
              <button
                type="button"
                onClick={loadPosition}
                disabled={isLoadingPosition}
                className="text-[11px] font-semibold text-[#7a1228] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[13px] ${isLoadingPosition ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>{isLoadingPosition ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            {isLoadingPosition ? (
              <div className="py-3 flex items-center justify-center space-x-2 text-slate-500 text-xs">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Loading live ledger position...</span>
              </div>
            ) : positionError ? (
              <div className="py-1 text-slate-500 text-[11px] flex justify-between items-center">
                <span>{positionError}</span>
                <button
                  type="button"
                  onClick={loadPosition}
                  className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : accountPosition?.financialPosition ? (
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="block text-[10px] font-sans uppercase font-bold text-slate-500">Outstanding Fees</span>
                  <span className={`text-sm font-black ${
                    accountPosition.financialPosition.outstandingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    KES {Number(accountPosition.financialPosition.outstandingBalance || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-teal-50/70 rounded-lg border border-teal-200">
                  <span className="block text-[10px] font-sans uppercase font-bold text-teal-900">Available Credit</span>
                  <span className="text-sm font-black text-teal-800">
                    KES {Number(accountPosition.financialPosition.overpaymentCredit || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-1 text-slate-500 text-[11px]">
                Learner position snapshot verified.
              </div>
            )}
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Mandatory Reason for Reversal <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Incorrect bank deposit allocated, Parent presented returned cheque, Duplicate entry recorded..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-[#7a1228] outline-none transition"
            />
          </div>

          {/* Optional Explanation */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Additional Details / Explanation <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Provide any additional context or audit explanations..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-[#7a1228] outline-none transition"
            />
          </div>

          {/* Optional Attachment Link */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Supporting Attachment URL <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://... (link to scanned slip or letter)"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#7a1228] focus:border-[#7a1228] outline-none transition"
            />
          </div>

          {/* Governance Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Immediate Balance Impact:</strong> Submitting this request will not alter account balances or cancel receipts. The transaction remains active in the ledger until an Administrator reviews and approves the reversal.
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-[#7a1228] hover:bg-[#600e1f] rounded-xl shadow-md hover:shadow-lg transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmitting ? 'Submitting...' : 'Submit Reversal Request'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
