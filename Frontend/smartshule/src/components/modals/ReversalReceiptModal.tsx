import React from 'react';
import { X, Printer, Download, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReversalReceiptPayload } from '../../types';

interface ReversalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReversalReceiptPayload | null;
}

export const ReversalReceiptModal: React.FC<ReversalReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt
}) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // School Letterhead
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(receipt.schoolName || 'GRACE SEEDS SCHOOL', 105, 18, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${receipt.schoolAddress} | Tel: ${receipt.schoolPhone} | Email: ${receipt.schoolEmail}`, 105, 24, {
        align: 'center'
      });

      // Divider line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(14, 28, 196, 28);

      // Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28); // red-700
      doc.text('OFFICIAL TRANSACTION REVERSAL RECEIPT', 105, 36, { align: 'center' });

      // Reversal Reference & Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Reversal No: ${receipt.reversalReceiptNumber}`, 14, 44);
      doc.text(`Date: ${new Date(receipt.executionDate).toLocaleDateString('en-GB')}`, 196, 44, { align: 'right' });
      doc.text(`Request Ref: ${receipt.requestReference}`, 14, 50);
      doc.text(`Original Ref: ${receipt.originalReceiptNumber || receipt.originalTransactionReference}`, 196, 50, { align: 'right' });

      // Student Details Table
      autoTable(doc, {
        startY: 55,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5 },
        body: [
          [
            { content: 'Learner Name:', styles: { fontStyle: 'bold' } },
            receipt.studentName,
            { content: 'Admission No:', styles: { fontStyle: 'bold' } },
            receipt.admissionNumber
          ],
          [
            { content: 'Transaction Type:', styles: { fontStyle: 'bold' } },
            receipt.transactionType,
            { content: 'Original Amount:', styles: { fontStyle: 'bold' } },
            `KES ${Number(receipt.originalAmount).toLocaleString()}`
          ],
          [
            { content: 'Requested By:', styles: { fontStyle: 'bold' } },
            `${receipt.requestedByName} (${receipt.requestedByRole})`,
            { content: 'Approved By:', styles: { fontStyle: 'bold' } },
            `${receipt.approvedByName} (${receipt.approvedByRole})`
          ],
          [
            { content: 'Bursar Reason:', styles: { fontStyle: 'bold' } },
            { content: receipt.bursarReason, colSpan: 3 }
          ]
        ]
      });

      // Resulting Balances Table
      const currentY = (doc as any).lastAutoTable.finalY + 4;
      autoTable(doc, {
        startY: currentY,
        head: [['Resulting Account Position', 'Amount (KES)']],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 2 },
        body: [
          ['Total Amount Reversed', `KES ${Number(receipt.amountReversed).toLocaleString()}`],
          ['New Outstanding Fee Balance', `KES ${Number(receipt.resultingBalances.outstandingBalance).toLocaleString()}`],
          ['New Available Advance Credit', `KES ${Number(receipt.resultingBalances.availableCredit).toLocaleString()}`],
          ['New Arrears Balance', `KES ${Number(receipt.resultingBalances.arrears).toLocaleString()}`]
        ]
      });

      // Mandatory Statement Box
      const statementY = (doc as any).lastAutoTable.finalY + 8;
      doc.setDrawColor(185, 28, 28);
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14, statementY, 182, 16, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(153, 27, 27);
      doc.text(
        receipt.mandatoryNoticeStatement ||
          'THIS DOCUMENT CONFIRMS THE REVERSAL OF A PREVIOUS FINANCIAL TRANSACTION. IT IS NOT A NEW CASH, BANK OR MOBILE MONEY PAYMENT.',
        105,
        statementY + 7,
        { align: 'center', maxWidth: 174 }
      );

      // Signatures
      const sigY = statementY + 28;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('_____________________________', 30, sigY);
      doc.text('Bursar / Cashier Signature', 30, sigY + 5);

      doc.text('_____________________________', 135, sigY);
      doc.text('Administrator Signature & Stamp', 135, sigY + 5);

      doc.save(`${receipt.reversalReceiptNumber}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600/30 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Transaction Reversal Document</h3>
              <p className="text-xs text-slate-300">
                Official Traceable Audit Record &bull; {receipt.reversalReceiptNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              title="Print Reversal Document"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPdf}
              title="Download PDF"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* School Banner */}
          <div className="text-center pb-3 border-b border-slate-200">
            <h4 className="text-lg font-bold text-slate-900">{receipt.schoolName}</h4>
            <p className="text-xs text-slate-500">
              {receipt.schoolAddress} &bull; Tel: {receipt.schoolPhone}
            </p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 uppercase tracking-wider">
              Transaction Reversal Receipt
            </span>
          </div>

          {/* Document Reference Info */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Reversal Document No:</span>
              <span className="font-mono font-bold text-slate-900">{receipt.reversalReceiptNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Execution Date:</span>
              <span className="font-semibold text-slate-800">
                {new Date(receipt.executionDate).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Request Reference:</span>
              <span className="font-mono text-slate-700">{receipt.requestReference}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Original Transaction:</span>
              <span className="font-mono font-semibold text-slate-800">
                {receipt.originalReceiptNumber || receipt.originalTransactionReference}
              </span>
            </div>
          </div>

          {/* Student & Reversal Summary */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Learner Name:</span>
              <span className="font-bold text-slate-800">{receipt.studentName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Admission Number:</span>
              <span className="font-semibold text-slate-800">{receipt.admissionNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Transaction Type:</span>
              <span className="font-semibold text-slate-800">{receipt.transactionType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Amount Reversed:</span>
              <span className="font-bold text-red-700 text-sm">
                KES {Number(receipt.amountReversed).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Requested By:</span>
              <span className="text-slate-800">{receipt.requestedByName} ({receipt.requestedByRole})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Approved By:</span>
              <span className="text-slate-800 font-semibold">{receipt.approvedByName} ({receipt.approvedByRole})</span>
            </div>
            <div className="py-1">
              <span className="text-slate-500 block mb-0.5">Bursar's Reason:</span>
              <span className="text-slate-800 italic bg-slate-50 p-2 rounded block border border-slate-100">
                "{receipt.bursarReason}"
              </span>
            </div>
          </div>

          {/* Resulting Balances Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
            <span className="font-bold text-slate-700 block uppercase tracking-wider mb-1">
              Resulting Account Balances:
            </span>
            <div className="flex justify-between">
              <span className="text-slate-600">Outstanding Balance:</span>
              <span className="font-bold text-slate-900">
                KES {Number(receipt.resultingBalances.outstandingBalance).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Available Advance Credit:</span>
              <span className="font-bold text-emerald-700">
                KES {Number(receipt.resultingBalances.availableCredit).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Arrears:</span>
              <span className="font-bold text-slate-900">
                KES {Number(receipt.resultingBalances.arrears).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Mandatory Statement Alert */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-bold tracking-tight">
              {receipt.mandatoryNoticeStatement}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center space-x-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
