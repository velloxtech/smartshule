import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Clock,
  User,
  FileText
} from 'lucide-react';
import apiService from '../../services/api';
import { TransactionReversalRequest, FinancialImpactPreview } from '../../types';

interface AdminReviewReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receipt?: any) => void;
  request: TransactionReversalRequest | null;
}

export const AdminReviewReversalModal: React.FC<AdminReviewReversalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  request
}) => {
  const [preview, setPreview] = useState<FinancialImpactPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeAction, setActiveAction] = useState<'NONE' | 'APPROVE' | 'REJECT'>('NONE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && request) {
      setActiveAction('NONE');
      setApprovalComment('');
      setRejectionReason('');
      setError(null);

      // Fetch or use attached preview
      if (request.financialImpactPreview) {
        setPreview(request.financialImpactPreview);
      } else {
        setLoadingPreview(true);
        apiService
          .getTransactionReversalPreview(request.id)
          .then((res: any) => {
            if (res.data) setPreview(res.data);
          })
          .catch((err: any) => {
            console.error('Failed to load preview:', err);
          })
          .finally(() => setLoadingPreview(false));
      }
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiService.approveAndExecuteTransactionReversal(
        request.id,
        approvalComment.trim() || undefined
      );
      if (res.success) {
        const receipt = res.data?.reversalReceipt || (res as any).reversalReceipt || res.data?.receipt;
        onSuccess(receipt);
        onClose();
      } else {
        setError(res.message || 'Failed to approve and execute reversal.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error executing reversal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setError('A mandatory rejection reason is required (minimum 3 characters).');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiService.rejectTransactionReversal(request.id, rejectionReason.trim());
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to reject reversal request.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error rejecting reversal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isPending = request.status === 'PENDING_ADMIN_APPROVAL';
  const hasBlocking = preview?.hasBlockingDependencies ?? false;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold">Review Reversal Request</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20 text-white font-semibold">
                  {request.requestReference}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Authorized Administrator Review &bull; Financial Impact Assessment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Request Metadata Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Learner</span>
                <span className="font-bold text-slate-900">{request.studentName}</span>
                <span className="text-xs text-slate-600 block">Adm: {request.admissionNumber}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Original Transaction</span>
                <span className="font-bold text-slate-900">
                  KES {Number(request.originalAmount).toLocaleString()} ({request.transactionType})
                </span>
                <span className="font-mono text-xs text-slate-600 block">
                  Ref: {request.originalReceiptNumber || request.transactionReference}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span>
                  <strong>Requested By:</strong> {request.requestedByName} ({request.requestedByRole})
                </span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  <strong>Date:</strong> {new Date(request.requestedAt).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>

            {/* Bursar Reason */}
            <div className="pt-2 border-t border-slate-200/80">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                Bursar's Reason for Reversal:
              </span>
              <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 text-sm">
                "{request.reason}"
              </p>
              {request.explanation && (
                <p className="text-xs text-slate-600 mt-1 italic">
                  Additional Notes: {request.explanation}
                </p>
              )}
            </div>
          </div>

          {/* Financial Impact Preview */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-sm text-indigo-950">Financial Impact Preview</h4>
              </div>
              {hasBlocking && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600" />
                  Blocking Dependencies
                </span>
              )}
            </div>

            {loadingPreview ? (
              <p className="text-xs text-indigo-700 italic">Calculating authoritative financial impact...</p>
            ) : preview ? (
              <div className="space-y-3 text-sm">
                {/* Balance Comparison Grid */}
                <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-indigo-100 text-xs">
                  <div>
                    <span className="text-slate-500 block font-medium">Current Outstanding Balance:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      KES {preview.currentOutstandingBalance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Projected Post-Reversal:</span>
                    <span className="font-bold text-indigo-700 text-sm">
                      KES {preview.projectedOutstandingBalance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Current Available Credit:</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      KES {preview.currentAvailableCredit.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Projected Available Credit:</span>
                    <span className="font-bold text-indigo-700 text-sm">
                      KES {preview.projectedCreditBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Dependent Transactions */}
                {preview.dependentTransactions && preview.dependentTransactions.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-indigo-900 block mb-1">
                      Linked & Dependent Transactions:
                    </span>
                    <div className="space-y-1.5">
                      {preview.dependentTransactions.map((dep, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2 rounded border border-slate-200 text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{dep.description}</span>
                            <span className="text-slate-500 block text-[11px]">{dep.impactOnReversal}</span>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0 ml-2">
                            KES {dep.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blocking Warning */}
                {hasBlocking && preview.blockingReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    <strong>Execution Blocked:</strong> {preview.blockingReason}
                  </div>
                )}

                {/* Summary */}
                {preview.impactSummary && (
                  <p className="text-xs text-indigo-900 bg-indigo-100/60 p-2 rounded">
                    <strong>Summary:</strong> {preview.impactSummary}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* Action Selection View */}
          {isPending && activeAction === 'NONE' && (
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveAction('REJECT')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-red-300 text-red-700 font-bold hover:bg-red-50 transition text-sm flex items-center justify-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Request</span>
              </button>
              <button
                type="button"
                disabled={hasBlocking}
                onClick={() => setActiveAction('APPROVE')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Execute Reversal</span>
              </button>
            </div>
          )}

          {/* Confirmation Form: APPROVE */}
          {activeAction === 'APPROVE' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <h5 className="font-bold text-emerald-900 text-sm flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirm Reversal Approval & Execution</span>
              </h5>
              <p className="text-xs text-emerald-800">
                This action will atomically update the student's fee ledger, generate a formal Reversal Document, and update audit logs.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrator Approval Comment (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved following bank clearance verification"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('NONE')}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow disabled:opacity-50"
                >
                  {isProcessing ? 'Executing...' : 'Confirm & Execute Reversal'}
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Form: REJECT */}
          {activeAction === 'REJECT' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <h5 className="font-bold text-red-900 text-sm flex items-center space-x-1.5">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Reject Reversal Request</span>
              </h5>
              <div>
                <label className="block text-xs font-bold text-red-900 mb-1">
                  Mandatory Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this reversal request cannot be approved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('NONE')}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow disabled:opacity-50"
                >
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
