import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentInvoice, Student } from '../../types';
import { apiService } from '../../services/api';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: StudentInvoice | null;
  student?: Student | null;
  onInvoiceUpdated?: () => void;
  onRecordPayment?: (invoice: StudentInvoice) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  onClose,
  invoice,
  student,
  onInvoiceUpdated,
  onRecordPayment,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!isOpen || !invoice) return null;

  const isDraft = invoice.status === 'DRAFT';
  const isCancelled = invoice.status === 'CANCELLED' || invoice.status === 'VOIDED';
  const isPaid = invoice.status === 'PAID';
  const canCancel = !isDraft && !isCancelled && Number(invoice.amountPaid || 0) === 0;

  const handleIssueDraft = async () => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await apiService.issueInvoice(invoice.id);
      if (res?.success === false) {
        throw new Error(res.message || 'Failed to issue invoice');
      }
      setActionSuccess('Draft invoice has been officially issued!');
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to issue invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelInvoice = async () => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await apiService.cancelInvoice(invoice.id, cancelReason);
      if (res?.success === false) {
        throw new Error(res.message || 'Failed to cancel invoice');
      }
      setActionSuccess('Invoice successfully cancelled and marked as void.');
      setShowCancelPrompt(false);
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Burgundy Header Banner
    doc.setFillColor(122, 18, 40);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GRACE SEEDS SCHOOL', 14, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('The Future Begins Here', 14, 16);
    doc.text('KEMRI Street, Kisian, Kisumu, Kenya | Tel: 0745436312 | Email: schoolgraceseeds@gmail.com', 14, 21);

    // Document Title Banner
    doc.setTextColor(122, 18, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(
      isDraft
        ? 'DRAFT STUDENT FEE INVOICE (UNOFFICIAL)'
        : isCancelled
        ? 'CANCELLED STUDENT FEE INVOICE'
        : 'OFFICIAL STUDENT FEE INVOICE',
      14,
      35
    );

    // Meta details (Invoice No, Dates, Status)
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice Number: ${invoice.invoiceNumber || 'DRAFT'}`, 14, 42);
    doc.text(`Issue Date: ${invoice.issueDate || invoice.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]}`, 14, 47);
    doc.text(`Due Date: ${invoice.dueDate || 'Upon Receipt'}`, 14, 52);

    doc.text(`Status: ${invoice.status}`, 140, 42);
    doc.text(`Term: ${invoice.termId || 'N/A'}`, 140, 47);
    doc.text(`Academic Year: ${invoice.academicYearId || 'N/A'}`, 140, 52);

    // Student Information Grid
    autoTable(doc, {
      startY: 56,
      body: [
        [
          { content: 'Learner Full Name:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: invoice.studentName || student?.name || 'N/A', styles: { fontStyle: 'bold' } },
          { content: 'Admission No:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: invoice.admissionNumber || student?.admNo || 'N/A', styles: { fontStyle: 'bold' } },
        ],
        [
          { content: 'Grade / Class:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: invoice.gradeLevel || student?.grade || 'N/A' },
          { content: 'Stream / Section:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
          { content: invoice.classroomName || student?.stream || 'Main' },
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
    });

    const itemsStartY = (doc as any).lastAutoTable.finalY + 6;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMIZED FEE BREAKDOWN', 14, itemsStartY);

    const tableRows = (invoice.items || []).map((item, idx) => [
      (idx + 1).toString(),
      item.name,
      item.category || 'OTHER',
      (item.quantity || 1).toString(),
      `KES ${(item.unitAmount !== undefined ? item.unitAmount : item.amount || 0).toLocaleString()}`,
      `KES ${(item.amount || 0).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: itemsStartY + 3,
      head: [['#', 'Fee Item Description', 'Category', 'Qty', 'Unit Amount', 'Line Total']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [122, 18, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
    });

    const summaryStartY = (doc as any).lastAutoTable.finalY + 6;

    // Summary Totals Table
    autoTable(doc, {
      startY: summaryStartY,
      margin: { left: 110 },
      body: [
        ['Total Billed Amount:', `KES ${Number(invoice.amountBilled || 0).toLocaleString()}`],
        ['Discounts / Waivers:', `- KES ${Number(invoice.discountAmount || 0).toLocaleString()}`],
        [
          { content: 'Net Amount Payable:', styles: { fontStyle: 'bold', textColor: [122, 18, 40] } },
          { content: `KES ${Number(invoice.amountPayable || 0).toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [122, 18, 40] } },
        ],
        ['Amount Paid to Date:', `KES ${Number(invoice.amountPaid || 0).toLocaleString()}`],
        [
          { content: 'Outstanding Balance:', styles: { fontStyle: 'bold', textColor: Number(invoice.balance || 0) > 0 ? [185, 28, 28] : [22, 101, 52] } },
          { content: `KES ${Number(invoice.balance || 0).toLocaleString()}`, styles: { fontStyle: 'bold', textColor: Number(invoice.balance || 0) > 0 ? [185, 28, 28] : [22, 101, 52] } },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2 },
    });

    const footerY = (doc as any).lastAutoTable.finalY + 12;

    // Payment Instructions Card
    doc.setFillColor(248, 250, 252);
    doc.rect(14, footerY, 182, 28, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, footerY, 182, 28, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT INSTRUCTIONS & BANK ADVICE', 18, footerY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('• M-Pesa / KCB Paybill: Business Number 522533', 18, footerY + 12);
    doc.text(`• Account Code: 8048859#${(invoice.studentName || student?.name || 'STUDENT').toUpperCase()} ${(invoice.gradeLevel || '').toUpperCase()}`, 18, footerY + 17);
    doc.text('• Please quote the invoice number or student admission number on all bank slips.', 18, footerY + 22);

    // School Stamp / Signature footer
    const signY = footerY + 36;
    doc.setDrawColor(148, 163, 184);
    doc.line(14, signY + 10, 70, signY + 10);
    doc.setFontSize(7.5);
    doc.text('Bursar / Authorized Signatory', 14, signY + 14);

    doc.line(140, signY + 10, 196, signY + 10);
    doc.text('Official School Stamp & Seal', 140, signY + 14);

    const safeNumber = (invoice.invoiceNumber || 'INVOICE').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${safeNumber}_${invoice.admissionNumber || 'learner'}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">PAID</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">PARTIALLY PAID</span>;
      case 'UNPAID':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">UNPAID</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">DRAFT</span>;
      case 'CANCELLED':
      case 'VOIDED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 line-through border border-gray-300">CANCELLED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-fade-in flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#7a1228] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-amber-300 text-2xl">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight">Student Fee Invoice</h3>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white/90 font-mono">
                  {invoice.invoiceNumber || 'DRAFT'}
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium">Grace Seeds School &bull; "The Future Begins Here"</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Top Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Status</span>
              <div className="mt-1">{getStatusBadge(invoice.status)}</div>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Issue Date</span>
              <span className="font-semibold text-slate-800 mt-1 block">
                {invoice.issueDate || invoice.createdAt?.split('T')[0] || '--'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Due Date</span>
              <span className="font-semibold text-slate-800 mt-1 block">{invoice.dueDate || '--'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Title / Purpose</span>
              <span className="font-semibold text-slate-800 mt-1 block truncate">
                {invoice.title || 'Term Tuition & Levies'}
              </span>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-xs font-bold text-amber-900 tracking-wide uppercase">Learner Information</span>
              <h4 className="font-bold text-base text-slate-900 mt-0.5">
                {invoice.studentName || student?.name || 'Selected Learner'}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Admission No: <span className="font-mono font-bold text-slate-800">{invoice.admissionNumber || student?.admNo || '--'}</span>
                {invoice.gradeLevel && <span> &bull; Grade: <span className="font-semibold">{invoice.gradeLevel}</span></span>}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 block">KCB Shortcode / Paybill</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">522533</span>
              <span className="text-[11px] text-slate-500 block font-mono">
                Code: 8048859#{invoice.studentName || student?.name || 'STUDENT'}
              </span>
            </div>
          </div>

          {/* Itemized Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase">Itemized Fee Breakdown</h4>
              <span className="text-xs text-slate-500">{invoice.items?.length || 0} line item(s)</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{it.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {it.category || 'OTHER'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it.quantity || 1}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                          KES {(it.unitAmount !== undefined ? it.unitAmount : it.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          KES {(it.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No itemized charges found for this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary Totals Card */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Billed Amount):</span>
                <span className="font-semibold text-slate-800 font-mono">
                  KES {Number(invoice.amountBilled || 0).toLocaleString()}
                </span>
              </div>
              {Number(invoice.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discounts / Waivers:</span>
                  <span className="font-semibold font-mono">
                    - KES {Number(invoice.discountAmount).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2 text-sm">
                <span>Total Payable:</span>
                <span className="font-mono text-[#7a1228]">
                  KES {Number(invoice.amountPayable || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Paid:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  KES {Number(invoice.amountPaid || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-2 text-sm">
                <span>Outstanding Balance:</span>
                <span className={`font-mono ${Number(invoice.balance || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  KES {Number(invoice.balance || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Cancel prompt dialog */}
          {showCancelPrompt && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>Confirm Invoice Cancellation</span>
              </div>
              <p className="text-xs text-rose-700">
                Are you sure you want to cancel and void invoice <span className="font-mono font-bold">{invoice.invoiceNumber}</span>?
                This action is permanent and will exclude this invoice from the student's active balance.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Reason for Cancellation (Optional)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Invoiced wrong fee item or duplicate entry"
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Keep Invoice
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCancelInvoice}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-700 rounded-lg hover:bg-rose-800 disabled:opacity-50"
                >
                  {isProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canCancel && !showCancelPrompt && (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                <span>Cancel / Void Invoice</span>
              </button>
            )}

            {isDraft && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleIssueDraft}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>{isProcessing ? 'Issuing...' : 'Issue Invoice Officially'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRecordPayment && !isDraft && !isCancelled && !isPaid && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRecordPayment(invoice);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                <span>Record Payment</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm text-[#7a1228]">picture_as_pdf</span>
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
