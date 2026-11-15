import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { FeeCreditUtilizationPreview, FeeCreditUtilizationReceiptPayload } from '../../types';

interface AdminInitiateCreditUtilizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  gradeLevel?: string;
  availableCredit?: number;
  totalDue?: number;
  onSuccess: (receipt: FeeCreditUtilizationReceiptPayload) => void;
}

export const AdminInitiateCreditUtilizationModal: React.FC<AdminInitiateCreditUtilizationModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  admissionNumber,
  gradeLevel,
  availableCredit = 0,
  totalDue = 0,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [preview, setPreview] = useState<FeeCreditUtilizationPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial preview on open
  useEffect(() => {
    if (isOpen && studentId) {
      setError(null);
      setIsLoadingPreview(true);
      apiService
        .previewCreditUtilization({ studentId })
        .then((res: any) => {
          if (res.success && res.data) {
            setPreview(res.data);
            const defaultAmt = res.data.proposedAmount || res.data.maxApplicableAmount || 0;
            setAmountStr(defaultAmt > 0 ? String(defaultAmt) : '');
          } else {
            setError(res.message || 'Failed to load allocation preview');
          }
        })
        .catch((err: any) => {
          setError(err.message || 'Error loading preview');
        })
        .finally(() => {
          setIsLoadingPreview(false);
        });
    } else {
      setAmountStr('');
      setReason('');
      setPreview(null);
      setError(null);
    }
  }, [isOpen, studentId]);

  // Handle amount change and refresh preview
  const handleAmountChange = (newVal: string) => {
    setAmountStr(newVal);
    setError(null);

    const num = Number(newVal);
    if (!isNaN(num) && num > 0 && studentId) {
      apiService
        .previewCreditUtilization({ studentId, amountToApply: num })
        .then((res: any) => {
          if (res.success && res.data) {
            setPreview(res.data);
          }
        })
        .catch(() => {
          // ignore transient preview error
        });
    }
  };

  const handleApplyMax = () => {
    if (preview?.maxApplicableAmount) {
      handleAmountChange(String(preview.maxApplicableAmount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid allocation amount greater than 0.');
      return;
    }

    if (preview && numAmount > preview.maxApplicableAmount) {
      setError(`Amount cannot exceed the maximum applicable amount of KES ${preview.maxApplicableAmount.toLocaleString()}.`);
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setError('A mandatory recorded reason (at least 3 characters) is required for audit logs.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.adminInitiateCreditUtilization({
        studentId,
        amountToApply: numAmount,
        reason: reason.trim(),
      });

      if (res.success && res.data?.receipt) {
        onSuccess(res.data.receipt);
        onClose();
      } else {
        setError(res.message || 'Failed to execute credit utilization.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while executing credit utilization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentLearnerName = preview?.studentName || studentName || 'Learner';
  const currentAdmNo = preview?.admissionNumber || admissionNumber || '--';
  const currentGrade = preview?.gradeLevel || gradeLevel || '--';
  const availCredit = preview?.availableCredit ?? availableCredit;
  const maxApplicable = preview?.maxApplicableAmount ?? Math.min(availCredit, totalDue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in font-body">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-primary text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Admin Fee Credit Utilization</h3>
              <p className="text-xs text-rose-100">
                Apply available fee credit/overpayment to outstanding obligations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-rose-700">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Learner Identity Summary Card */}
          <div className="bg-surface border border-outline-variant/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm text-on-surface">{currentLearnerName}</div>
              <div className="text-[11px] text-on-surface-variant mt-0.5">
                Adm: <span className="font-mono font-bold text-on-surface">{currentAdmNo}</span> · Grade: <span className="font-medium text-on-surface">{currentGrade}</span>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-outline-variant/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Available Credit</span>
              <span className="text-base font-black font-mono text-teal-700">+KES {availCredit.toLocaleString()}</span>
            </div>
          </div>

          {/* Allocation Rules Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-950 uppercase tracking-wide text-[10px]">
              <span className="material-symbols-outlined text-xs">balance</span>
              <span>Mandatory Allocation Order Enforced</span>
            </div>
            <p>
              1. <strong>Previous-Term Arrears settled first.</strong> Credit cannot be applied to current-term fees while arrears remain.
            </p>
            <p>
              2. <strong>Receipt generation is automatic.</strong> A traceable Fee Credit Utilization Receipt will be issued instantly upon confirmation.
            </p>
          </div>

          {/* Amount to Apply Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-bold text-on-surface-variant">
                Amount to Apply (KES) <span className="text-primary">*</span>
              </label>
              <button
                type="button"
                onClick={handleApplyMax}
                disabled={maxApplicable <= 0}
                className="text-[11px] font-bold text-primary hover:text-primary-container underline cursor-pointer disabled:opacity-40"
              >
                Apply Maximum Eligible (KES {maxApplicable.toLocaleString()})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400 font-mono text-xs">KES</span>
              <input
                type="number"
                min="1"
                max={maxApplicable}
                step="any"
                required
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Live Allocation Preview Box */}
          <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-lowest">
            <div className="bg-surface-container-low/80 px-3.5 py-2 border-b border-outline-variant/30 font-bold text-[11px] text-on-surface-variant uppercase tracking-wider flex items-center justify-between">
              <span>Projected Settlement Breakdown</span>
              {isLoadingPreview && (
                <span className="flex items-center gap-1 text-[10px] text-on-surface-variant lowercase">
                  <span className="material-symbols-outlined animate-spin text-xs">sync</span>
                  calculating...
                </span>
              )}
            </div>

            <div className="p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="font-sans">Allocation to Previous-Term Arrears:</span>
                <strong className="text-emerald-700 font-bold">
                  KES {(preview?.amountToArrears ?? 0).toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="font-sans">Allocation to Current-Term Fees:</span>
                <strong className="text-emerald-700 font-bold">
                  KES {(preview?.amountToCurrentFees ?? 0).toLocaleString()}
                </strong>
              </div>
              <div className="border-t border-outline-variant/30 pt-1.5 flex justify-between items-center font-bold text-on-surface">
                <span className="font-sans">Total Credit Utilized:</span>
                <span className="text-emerald-800 text-sm">
                  KES {(preview?.proposedAmount ?? (Number(amountStr) || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="font-sans">Projected Remaining Fee Due:</span>
                <span className="text-rose-700 font-bold">
                  KES {(preview?.projectedRemainingOutstanding ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="font-sans">Projected Remaining Available Credit:</span>
                <span className="text-teal-800 font-bold">
                  +KES {(preview?.projectedRemainingCredit ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Reason Field */}
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface-variant flex items-center justify-between">
              <span>
                Mandatory Reason / Justification <span className="text-primary">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Recorded for compliance audit</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Authorized utilization of Term 1 fee overpayment towards outstanding Term 2 balance as requested by guardian."
              className="w-full p-2.5 bg-white border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex gap-2.5 font-sans">
            <button
              type="submit"
              disabled={isSubmitting || maxApplicable <= 0}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-container text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Executing Utilization...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Confirm &amp; Generate Receipt</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-surface-container hover:bg-slate-300 text-on-surface font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
