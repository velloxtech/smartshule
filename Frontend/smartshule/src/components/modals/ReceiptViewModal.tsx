import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { detectReceiptPrinter, triggerReceiptPrint, PrinterDetectionResult } from '../../utils/printerDetector';

interface ReceiptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId?: string;
  initialReceipt?: any;
}

export const ReceiptViewModal: React.FC<ReceiptViewModalProps> = ({
  isOpen,
  onClose,
  paymentId,
  initialReceipt,
}) => {
  const [receipt, setReceipt] = useState<any | null>(initialReceipt || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrinterDetectionResult>({
    hasReceiptPrinter: false,
    printerType: 'SYSTEM_DEFAULT',
    printerName: 'Standard Printer',
    autoPrintEnabled: false,
  });
  const [resendingChannel, setResendingChannel] = useState<'email' | 'whatsapp' | null>(null);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      detectReceiptPrinter().then(setPrinterStatus);
      if (initialReceipt) {
        setReceipt(initialReceipt);
      } else if (paymentId) {
        setIsLoading(true);
        setError(null);
        apiService
          .getPaymentReceipt(paymentId)
          .then((res) => {
            if (res.success && res.data?.receipt) {
              setReceipt(res.data.receipt);
            } else {
              setError(res.message || 'Failed to load receipt details');
            }
          })
          .catch((err) => {
            setError(err.message || 'Error retrieving receipt');
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } else {
      setReceipt(null);
      setError(null);
      setResendFeedback(null);
    }
  }, [isOpen, paymentId, initialReceipt]);

  const handleResend = async (channel: 'email' | 'whatsapp') => {
    const pId = paymentId || receipt?.paymentId || receipt?.id;
    if (!pId) return;
    setResendingChannel(channel);
    setResendFeedback(null);
    try {
      const res = await apiService.reissueReceipt(pId);
      if (res.success) {
        setResendFeedback(`Receipt dispatched to parent via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}!`);
      } else {
        setResendFeedback(res.message || 'Dispatch failed.');
      }
    } catch (err: any) {
      setResendFeedback(err.message || 'Failed to dispatch receipt.');
    } finally {
      setResendingChannel(null);
      setTimeout(() => setResendFeedback(null), 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Official Fee Receipt</h3>
              <p className="text-xs text-rose-100">Grace Seeds School Verified Payment Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {isLoading && (
            <div className="py-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
              <span>Loading official receipt details...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {receipt && !isLoading && (
            <>
              {/* Multi-Channel Parent Dispatch Control */}
              <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/30 space-y-2 no-print font-body">
                <div className="text-[10px] font-bold text-on-surface uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-xs">share</span>
                    Issue Receipt to Parent
                  </span>
                  <span className="text-[10px] font-medium text-outline">
                    {printerStatus.hasReceiptPrinter ? 'POS Printer Ready' : 'Print Ready'}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={resendingChannel !== null}
                    onClick={() => handleResend('whatsapp')}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {resendingChannel === 'whatsapp' ? 'sync' : 'chat'}
                    </span>
                    {resendingChannel === 'whatsapp' ? 'Dispatching...' : 'Send to WhatsApp'}
                  </button>
                  <button
                    type="button"
                    disabled={resendingChannel !== null}
                    onClick={() => handleResend('email')}
                    className="flex-1 py-1.5 px-2 bg-[#7a1228] hover:bg-[#600e1f] text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {resendingChannel === 'email' ? 'sync' : 'mail'}
                    </span>
                    {resendingChannel === 'email' ? 'Dispatching...' : 'Send to Email'}
                  </button>
                </div>

                {resendFeedback && (
                  <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-1.5 rounded text-center">
                    {resendFeedback}
                  </div>
                )}
              </div>

              {/* Printable Official Receipt Body */}
              <div id="smartshule-receipt-print" className="p-4 sm:p-5 space-y-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
                {/* School Header */}
                <div className="text-center pb-3 border-b border-surface-container">
                  <div className="text-base font-bold text-[#7a1228] uppercase tracking-wide">
                    {receipt.schoolName || 'Grace Seeds School'}
                  </div>
                  <div className="text-[10px] text-outline mt-0.5">
                    {receipt.schoolAddress || 'KEMRI Street, Kisian, Kisumu, Kenya'} · Tel: {receipt.schoolPhone || '0745436312'} · Email: {receipt.schoolEmail || 'schoolgraceseeds@gmail.com'}
                  </div>
                  <div className="mt-2 inline-block px-3 py-0.5 bg-surface-container rounded-full text-[10px] font-bold text-on-surface uppercase tracking-wider">
                    Official Fee Payment Receipt
                  </div>
                </div>

                {/* Receipt Details Table */}
                <div className="space-y-2 font-body">
                  <div className="flex justify-between items-center pb-1.5 border-b border-outline-variant/20">
                    <span className="text-on-surface-variant font-semibold">Receipt Number:</span>
                    <span className="font-data-mono font-bold text-[#7a1228] text-sm">
                      {receipt.receiptNumber || 'REC-OFFICIAL'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Date:</span>
                    <span className="font-data-mono font-medium text-on-surface">{receipt.paymentDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Learner Name:</span>
                    <span className="font-bold text-on-surface">{receipt.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Admission Number:</span>
                    <span className="font-data-mono font-bold text-on-surface">{receipt.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Grade Level:</span>
                    <span className="font-semibold text-on-surface">{receipt.gradeLevel}{receipt.streamName ? ` (${receipt.streamName})` : ''}</span>
                  </div>
                  {receipt.invoiceNumber && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Invoice Settled:</span>
                      <span className="font-data-mono text-on-surface">{receipt.invoiceNumber}</span>
                    </div>
                  )}

                  {/* Channel specifics */}
                  <div className="flex justify-between pt-1 border-t border-outline-variant/20">
                    <span className="text-on-surface-variant">Payment Method:</span>
                    <span className="font-bold text-emerald-800">
                      {receipt.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Reference Code:</span>
                    <span className="font-data-mono font-bold text-on-surface">{receipt.transactionReference || 'N/A'}</span>
                  </div>
                  {receipt.bankName && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Bank Name:</span>
                      <span className="font-semibold text-on-surface">{receipt.bankName}</span>
                    </div>
                  )}
                  {receipt.slipNumber && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Deposit Slip #:</span>
                      <span className="font-data-mono font-bold text-on-surface">{receipt.slipNumber}</span>
                    </div>
                  )}

                  {/* Financial Breakdown */}
                  <div className="pt-2 border-t border-outline-variant/30 space-y-1">
                    <div className="flex justify-between text-sm font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                      <span>Amount Paid:</span>
                      <span className="font-data-mono text-base">KES {Number(receipt.amountPaid || 0).toLocaleString()}</span>
                    </div>
                    {receipt.remainingBalance !== undefined && (
                      <div className="flex justify-between font-bold text-on-surface pt-1">
                        <span>Remaining Fee Balance:</span>
                        <span className={`font-data-mono ${receipt.remainingBalance === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          KES {Number(receipt.remainingBalance).toLocaleString()} {receipt.remainingBalance === 0 ? '(CLEARED)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stamp & Verification */}
                <div className="pt-2 flex justify-between items-end text-[11px] text-on-surface-variant border-t border-outline-variant/20">
                  <div>
                    <p>Served By: <span className="font-semibold text-on-surface">{receipt.servedBy || 'Finance Office'}</span></p>
                    <p className="text-[10px] text-outline">Grace Seeds School Ledger Verification</p>
                  </div>
                  <div className="border border-dashed border-outline-variant/60 rounded p-1.5 text-center text-[9px] text-outline uppercase font-mono">
                    Official Stamp
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2 no-print">
                <button
                  type="button"
                  onClick={() => triggerReceiptPrint()}
                  className="flex-1 py-2.5 bg-[#7a1228] text-white font-semibold rounded-lg hover:bg-[#600e1f] text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Receipt {printerStatus.hasReceiptPrinter && '(Thermal POS)'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-on-surface transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
