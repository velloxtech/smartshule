import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiService } from '../../services/api';
import { FeeCreditUtilizationReceiptPayload } from '../../types';
import { triggerReceiptPrint } from '../../utils/printerDetector';
import { RequestTransactionReversalModal } from './RequestTransactionReversalModal';

interface FeeCreditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptNumber?: string;
  initialReceipt?: FeeCreditUtilizationReceiptPayload | null;
}

export const FeeCreditReceiptModal: React.FC<FeeCreditReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptNumber,
  initialReceipt,
}) => {
  const [receipt, setReceipt] = useState<FeeCreditUtilizationReceiptPayload | null>(initialReceipt || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialReceipt) {
        setReceipt(initialReceipt);
      } else if (receiptNumber) {
        setIsLoading(true);
        setError(null);
        apiService
          .getCreditUtilizationReceipt(receiptNumber)
          .then((res: any) => {
            if (res.success && res.data?.receipt) {
              setReceipt(res.data.receipt);
            } else {
              setError(res.message || 'Failed to retrieve fee credit utilization receipt');
            }
          })
          .catch((err: any) => {
            setError(err.message || 'Error retrieving fee credit utilization receipt');
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } else {
      setReceipt(null);
      setError(null);
    }
  }, [isOpen, receiptNumber, initialReceipt]);

  const handleDownloadPdf = () => {
    if (!receipt) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Maroon Header Banner (#7a1228 = rgb(122, 18, 40))
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.schoolName || 'GRACE SEEDS SCHOOL', 14, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('The Future Begins Here', 14, 16);
    doc.text(
      `${receipt.schoolAddress || 'KEMRI Street, Kisian, Kisumu, Kenya'} | Tel: ${receipt.schoolPhone || '0745436312'} | Email: ${receipt.schoolEmail || 'schoolgraceseeds@gmail.com'}`,
      14,
      21
    );

    // Document Title Banner
    doc.setTextColor(122, 18, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('FEE CREDIT UTILIZATION RECEIPT', 14, 34);

    // Explicit Mandatory Statement Callout Box
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(217, 119, 6);   // amber-600
    doc.roundedRect(14, 38, 182, 15, 2, 2, 'FD');
    doc.setTextColor(146, 64, 14);   // amber-900
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('MANDATORY ACCOUNTING CLASSIFICATION NOTICE:', 17, 43);
    doc.setFont('helvetica', 'normal');
    const statementLines = doc.splitTextToSize(
      receipt.statement ||
        "THIS DOCUMENT CONFIRMS THE UTILIZATION OF PREVIOUSLY RECEIVED FEE CREDIT. IT IS NOT A NEW CASH, BANK OR MOBILE MONEY PAYMENT.",
      176
    );
    doc.text(statementLines, 17, 48);

    // Reversal Banner if reversed
    let metaStartY = 60;
    if (receipt.status === 'REVERSED') {
      doc.setFillColor(254, 226, 226);
      doc.setDrawColor(239, 68, 68);
      doc.roundedRect(14, 56, 182, 12, 2, 2, 'FD');
      doc.setTextColor(185, 28, 28);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`TRANSACTION REVERSED · Ref: ${receipt.reversalReference || 'N/A'} · Reason: ${receipt.reversalReason || 'Administrative Reversal'}`, 17, 63);
      metaStartY = 73;
    }

    // Meta Details Grid
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt Number: ${receipt.receiptNumber}`, 14, metaStartY);
    doc.text(`Date & Time: ${receipt.formattedDate || receipt.timestamp}`, 14, metaStartY + 5);
    doc.text(
      `Transaction Mode: ${receipt.transactionMode || (receipt.transactionType === 'ADMIN-INITIATED' ? 'ADMINISTRATOR-INITIATED' : 'AUTOMATIC')}`,
      14,
      metaStartY + 10
    );

    doc.text(`Academic Year: ${receipt.academicYear}`, 130, metaStartY);
    doc.text(`Academic Term: ${receipt.academicTerm}`, 130, metaStartY + 5);
    doc.text(`Status: ${receipt.status || 'COMPLETED'}`, 130, metaStartY + 10);

    // Learner Information Table
    const learnerHead = receipt.parentName ? ['Learner Full Name', 'Admission No', 'Grade Level / Stream', 'Parent / Guardian'] : ['Learner Full Name', 'Admission No', 'Grade Level / Stream'];
    const learnerBody = receipt.parentName
      ? [[receipt.studentName, receipt.admissionNumber, `${receipt.gradeLevel}${receipt.streamName ? ` (${receipt.streamName})` : ''}`, receipt.parentName]]
      : [[receipt.studentName, receipt.admissionNumber, `${receipt.gradeLevel}${receipt.streamName ? ` (${receipt.streamName})` : ''}`]];

    autoTable(doc, {
      startY: metaStartY + 15,
      theme: 'grid',
      head: [learnerHead],
      body: learnerBody,
      headStyles: { fillColor: [122, 18, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    });

    // Financial Breakdown Table
    const lastY = (doc as any).lastAutoTable?.finalY || 95;
    autoTable(doc, {
      startY: lastY + 6,
      theme: 'grid',
      head: [['Financial Position / Obligation', 'Before Allocation', 'Credit Utilized', 'Position After']],
      body: [
        [
          'Previous-Term Arrears (Priority 1)',
          `KES ${Number(receipt.previousTermArrearsBefore || 0).toLocaleString()}`,
          `KES ${Number(receipt.amountAppliedToArrears || 0).toLocaleString()}`,
          `KES ${Math.max(0, (receipt.previousTermArrearsBefore || 0) - (receipt.amountAppliedToArrears || 0)).toLocaleString()}`,
        ],
        [
          'Current-Term Billed Fees (Priority 2)',
          `KES ${Number(receipt.currentTermFeesBefore || 0).toLocaleString()}`,
          `KES ${Number(receipt.amountAppliedToCurrentFees || 0).toLocaleString()}`,
          `KES ${Math.max(0, (receipt.currentTermFeesBefore || 0) - (receipt.amountAppliedToCurrentFees || 0)).toLocaleString()}`,
        ],
        [
          'Total Outstanding Fee Due',
          `KES ${(Number(receipt.previousTermArrearsBefore || 0) + Number(receipt.currentTermFeesBefore || 0)).toLocaleString()}`,
          `KES ${Number(receipt.totalCreditUtilized || 0).toLocaleString()}`,
          `KES ${Number(receipt.remainingOutstanding || 0).toLocaleString()}`,
        ],
        [
          'Available Fee Credit / Overpayment',
          `+KES ${Number(receipt.availableCreditBefore || 0).toLocaleString()}`,
          `-KES ${Number(receipt.totalCreditUtilized || 0).toLocaleString()}`,
          `+KES ${Number(receipt.remainingCredit || 0).toLocaleString()}`,
        ],
      ],
      headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
        3: { halign: 'right', fontStyle: 'bold' },
      },
    });

    // Affected Invoices Table if present
    let invY = (doc as any).lastAutoTable?.finalY || 140;
    if (receipt.invoiceAllocations && receipt.invoiceAllocations.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(122, 18, 40);
      doc.text('AFFECTED INVOICE ALLOCATIONS', 14, invY + 6);

      autoTable(doc, {
        startY: invY + 8,
        theme: 'striped',
        head: [['Invoice Number', 'Category / Obligation', 'Amount Applied', 'Remaining Invoice Balance']],
        body: receipt.invoiceAllocations.map((inv) => [
          inv.invoiceNumber,
          inv.category || 'Tuition / Term Fee',
          `KES ${Number(inv.amountApplied || 0).toLocaleString()}`,
          `KES ${Number(inv.remainingBalance || 0).toLocaleString()}`,
        ]),
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
          3: { halign: 'right' },
        },
      });
      invY = (doc as any).lastAutoTable?.finalY || 170;
    }

    // Audit Verification Box
    const auditY = invY + 8;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, auditY, 182, 24, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('AUDIT & AUTHORIZATION TRAIL:', 17, auditY + 5);
    doc.setFont('helvetica', 'normal');

    if (receipt.transactionType === 'ADMIN-INITIATED') {
      doc.text(`Authorized Officer: ${receipt.initiatedByAdminName || 'Finance Administrator'}`, 17, auditY + 11);
      doc.text(`Mandatory Business Reason: ${receipt.mandatoryReason || 'Manual credit utilization authorized by Finance Office'}`, 17, auditY + 16);
      doc.text(`Internal Transaction Ref: ${receipt.transactionReference}`, 17, auditY + 21);
    } else {
      doc.text('Authorization: SYSTEM GENERATED AUTOMATIC UTILIZATION', 17, auditY + 11);
      doc.text(`Trigger Source: ${receipt.triggerSource || 'Payment Overpayment Reconciliation Workflow'}`, 17, auditY + 16);
      doc.text(`Internal Transaction Ref: ${receipt.transactionReference}`, 17, auditY + 21);
    }

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Official Grace Seeds School Financial Record · Internal Non-Cash Credit Adjustment', 14, 287);
    doc.text(`Generated on ${new Date().toLocaleString()} · System Reference: ${receipt.receiptNumber}`, 110, 287);

    doc.save(`Fee_Credit_Utilization_Receipt_${receipt.receiptNumber}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in font-body">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header (Screen only) */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Fee Credit Utilization Receipt</h3>
              <p className="text-xs text-rose-100">
                Grace Seeds School Non-Cash Credit Application Record
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

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {isLoading && (
            <div className="py-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#7a1228]">progress_activity</span>
              <span>Loading credit utilization receipt...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base text-rose-700">error</span>
              <span>{error}</span>
            </div>
          )}

          {receipt && !isLoading && (
            <>
              {/* Printable Area */}
              <div id="smartshule-receipt-print" className="p-5 sm:p-6 space-y-4 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                {/* School Header */}
                <div className="text-center pb-3 border-b border-slate-200">
                  <div className="text-lg font-black text-[#7a1228] uppercase tracking-wide">
                    {receipt.schoolName || 'Grace Seeds School'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {receipt.schoolAddress || 'KEMRI Street, Kisian, Kisumu, Kenya'} · Tel: {receipt.schoolPhone || '0745436312'} · Email: {receipt.schoolEmail || 'schoolgraceseeds@gmail.com'}
                  </div>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-full text-[11px] font-extrabold text-[#7a1228] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                    <span>Fee Credit Utilization Receipt</span>
                  </div>
                </div>

                {/* Mandatory Explicit Statement Callout */}
                <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-900 text-[11px] leading-relaxed">
                  <div className="font-bold flex items-center gap-1 text-amber-950 mb-0.5 uppercase tracking-wide text-[10px]">
                    <span className="material-symbols-outlined text-xs">info</span>
                    <span>Official Notice: Non-Cash Credit Settlement</span>
                  </div>
                  <p className="font-bold tracking-tight uppercase">
                    &ldquo;{receipt.statement || "THIS DOCUMENT CONFIRMS THE UTILIZATION OF PREVIOUSLY RECEIVED FEE CREDIT. IT IS NOT A NEW CASH, BANK OR MOBILE MONEY PAYMENT."}&rdquo;
                  </p>
                </div>

                {/* Reversal Banner if reversed */}
                {receipt.status === 'REVERSED' && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-600 rounded-r-lg text-rose-900 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1 text-rose-950 uppercase tracking-wide text-[10px]">
                      <span className="material-symbols-outlined text-xs text-rose-600">warning</span>
                      <span>Transaction Formally Reversed</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-rose-800">
                      <span><strong>Reversal Ref:</strong> <span className="font-mono font-bold">{receipt.reversalReference || 'N/A'}</span></span>
                      <span><strong>Date:</strong> {receipt.reversalDate || 'N/A'}</span>
                      <span><strong>Reversed By:</strong> {receipt.reversedByAdminName || 'Finance Administrator'}</span>
                    </div>
                    {receipt.reversalReason && (
                      <div className="text-[11px] text-rose-900 italic">
                        <strong>Reason:</strong> {receipt.reversalReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Receipt Metadata & Learner Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 border-b border-slate-100 font-sans">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Receipt Number:</span>
                      <strong className="font-mono font-bold text-[#7a1228] text-sm">{receipt.receiptNumber}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Date &amp; Time:</span>
                      <span className="font-mono text-slate-800 font-medium">{receipt.formattedDate || receipt.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Transaction Mode:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${receipt.transactionType === 'ADMIN-INITIATED' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'}`}>
                        {receipt.transactionMode || (receipt.transactionType === 'ADMIN-INITIATED' ? 'ADMINISTRATOR-INITIATED' : 'AUTOMATIC')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Status:</span>
                      <span className={`font-bold uppercase font-mono ${receipt.status === 'REVERSED' ? 'text-rose-700' : 'text-emerald-700'}`}>{receipt.status || 'COMPLETED'}</span>
                    </div>
                    {receipt.originatingPaymentReferences && receipt.originatingPaymentReferences.length > 0 && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Originating Payment Ref(s):</span>
                        <span className="font-mono font-semibold text-slate-800 text-[10px]">{receipt.originatingPaymentReferences.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:border-l sm:border-slate-100 sm:pl-3">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Learner Name:</span>
                      <strong className="text-slate-900 font-bold">{receipt.studentName}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Admission Number:</span>
                      <span className="font-mono font-bold text-slate-800">{receipt.admissionNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Grade &amp; Stream:</span>
                      <span className="font-semibold text-slate-800">
                        {receipt.gradeLevel}{receipt.streamName ? ` (${receipt.streamName})` : ''}
                      </span>
                    </div>
                    {receipt.parentName && (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Parent / Guardian:</span>
                        <span className="font-medium text-slate-800">{receipt.parentName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Academic Period:</span>
                      <span className="text-slate-700 font-medium">{receipt.academicTerm} · {receipt.academicYear}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Allocation Table */}
                <div className="space-y-1.5 pt-1">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700">
                    Financial Balance &amp; Allocation Breakdown
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 font-sans">
                        <tr>
                          <th className="p-2">Fee Obligation</th>
                          <th className="p-2 text-right">Before</th>
                          <th className="p-2 text-right text-emerald-800">Credit Applied</th>
                          <th className="p-2 text-right">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-2 font-sans font-semibold text-slate-800">
                            1. Prior Arrears (Previous Terms)
                          </td>
                          <td className="p-2 text-right text-slate-700">
                            KES {(Number(receipt.previousTermArrearsBefore) || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-700">
                            -KES {(Number(receipt.amountAppliedToArrears) || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800">
                            KES {Math.max(0, (Number(receipt.previousTermArrearsBefore) || 0) - (Number(receipt.amountAppliedToArrears) || 0)).toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-sans font-semibold text-slate-800">
                            2. Current Term Billed Fees
                          </td>
                          <td className="p-2 text-right text-slate-700">
                            KES {(Number(receipt.currentTermFeesBefore) || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-700">
                            -KES {(Number(receipt.amountAppliedToCurrentFees) || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-bold text-slate-800">
                            KES {Math.max(0, (Number(receipt.currentTermFeesBefore) || 0) - (Number(receipt.amountAppliedToCurrentFees) || 0)).toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-slate-50/70 font-bold border-t border-slate-200">
                          <td className="p-2 font-sans text-slate-900">Total Outstanding Balance</td>
                          <td className="p-2 text-right text-slate-700">
                            KES {((Number(receipt.previousTermArrearsBefore) || 0) + (Number(receipt.currentTermFeesBefore) || 0)).toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-emerald-800 text-sm">
                            -KES {(Number(receipt.totalCreditUtilized) || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-[#7a1228] text-sm">
                            KES {(Number(receipt.remainingOutstanding) || 0).toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-teal-50/60 font-bold text-teal-950">
                          <td className="p-2 font-sans">Available Fee Credit Balance</td>
                          <td className="p-2 text-right">
                            +KES {(Number(receipt.availableCreditBefore) || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-teal-800">
                            -KES {(Number(receipt.totalCreditUtilized) || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-teal-900 text-sm">
                            +KES {(Number(receipt.remainingCredit) || 0).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoices Breakdown if present */}
                {receipt.invoiceAllocations && receipt.invoiceAllocations.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700">
                      Settled Invoices Breakdown
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 font-sans text-[11px]">
                          <tr>
                            <th className="p-2">Invoice #</th>
                            <th className="p-2 font-sans">Category</th>
                            <th className="p-2 text-right">Credit Allocated</th>
                            <th className="p-2 text-right">Remaining Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {receipt.invoiceAllocations.map((inv, idx) => (
                            <tr key={inv.invoiceId || idx} className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-[#7a1228]">{inv.invoiceNumber}</td>
                              <td className="p-2 font-sans text-slate-600 text-[11px]">{inv.category || 'Tuition / Fees'}</td>
                              <td className="p-2 text-right font-bold text-emerald-800">+KES {(Number(inv.amountApplied) || 0).toLocaleString()}</td>
                              <td className="p-2 text-right text-slate-700">KES {(Number(inv.remainingBalance) || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Audit & Authorization Verification Box */}
                <div className="pt-2 border-t border-slate-200 space-y-1 bg-slate-50/80 p-3 rounded-lg border border-slate-200/60 font-sans text-[11px]">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-slate-600">verified_user</span>
                    <span>Audit &amp; Authorization Details</span>
                  </div>
                  {receipt.transactionType === 'ADMIN-INITIATED' ? (
                    <div className="space-y-0.5 text-slate-600">
                      <p>
                        Authorized By: <strong className="text-slate-800">{receipt.initiatedByAdminName || 'Finance Administrator'}</strong>
                        {receipt.initiatedByAdminId ? ` (${receipt.initiatedByAdminId})` : ''}
                      </p>
                      <p>
                        Recorded Reason: <span className="font-semibold text-slate-800 italic">&ldquo;{receipt.mandatoryReason}&rdquo;</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Internal Application Reference: {receipt.transactionReference}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 text-slate-600">
                      <p>
                        Authorization: <span className="font-semibold text-purple-900">System Automatic Utilization</span>
                      </p>
                      <p>
                        Trigger Workflow: <span className="font-mono text-slate-800 font-medium">{receipt.triggerSource || 'Auto-reconciliation upon overpayment receipt'}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Internal Application Reference: {receipt.transactionReference}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 no-print font-sans">
                {receipt.status !== 'REVERSED' && (
                  <button
                    type="button"
                    onClick={() => setIsReversalModalOpen(true)}
                    className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">rotate_left</span>
                    <span>Request Reversal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => triggerReceiptPrint()}
                  className="flex-1 py-2.5 bg-[#7a1228] text-white font-bold rounded-xl hover:bg-[#600e1f] text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex-1 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download PDF Document</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {receipt && isReversalModalOpen && (
        <RequestTransactionReversalModal
          isOpen={isReversalModalOpen}
          onClose={() => setIsReversalModalOpen(false)}
          onSuccess={() => {
            setIsReversalModalOpen(false);
            onClose();
          }}
          transaction={{
            id: receipt.applicationId || receipt.transactionReference,
            reference: receipt.receiptNumber || receipt.transactionReference,
            receiptNumber: receipt.receiptNumber,
            type: 'CREDIT_UTILIZATION',
            amount: receipt.amountUtilized,
            date: receipt.timestamp ? new Date(receipt.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            studentId: receipt.studentId,
            studentName: receipt.studentName,
            admissionNumber: receipt.admissionNumber
          }}
        />
      )}
    </div>
  );
};
