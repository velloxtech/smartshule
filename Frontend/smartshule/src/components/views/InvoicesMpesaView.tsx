import React, { useState } from 'react';
import { FeeTransaction, Student } from '../../types';
import { GenerateInvoicesModal } from '../modals/GenerateInvoicesModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';

interface InvoicesMpesaViewProps {
  transactions: FeeTransaction[];
  totalCollected: number;
  students?: Student[];
  onOpenMpesaModal: () => void;
  onPaymentAdded?: (payment: any) => void;
}

export const InvoicesMpesaView: React.FC<InvoicesMpesaViewProps> = ({
  transactions,
  totalCollected,
  students = [],
  onOpenMpesaModal,
}) => {
  const [selectedTx, setSelectedTx] = useState<FeeTransaction | null>(null);
  const [isGenInvoicesOpen, setIsGenInvoicesOpen] = useState(false);
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">M-Pesa & Fee Invoices</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Safaricom Daraja M-Pesa STK Push Gateway & Invoicing
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Automated instant payment reconciliation for Paybill 174379, bulk invoice generation, and official receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsGenInvoicesOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">receipt</span>
            <span>Generate Invoices</span>
          </button>

          <button
            onClick={() => setIsRecordPayOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span>Record Bank / Cash</span>
          </button>

          <button
            onClick={onOpenMpesaModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">send_to_mobile</span>
            <span>Trigger M-Pesa STK</span>
          </button>
        </div>
      </div>

      {/* Gateway Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Paybill Shortcode
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold font-data-mono text-primary">174379</span>
              <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-semibold">
                Active Rail
              </span>
            </div>
            <span className="text-[11px] text-secondary font-medium mt-1 block">
              Safaricom Daraja API Webhook Connected
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary-container text-secondary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">point_of_sale</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Term 1 Total Collected
            </span>
            <div className="text-xl font-bold font-data-mono text-secondary mt-1">
              KES {totalCollected.toLocaleString()}
            </div>
            <span className="text-[11px] text-outline mt-1 block">Instant Auto-Reconciled</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">payments</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Collection Settlement
            </span>
            <div className="text-xl font-bold font-data-mono text-primary mt-1">71.4%</div>
            <span className="text-[11px] text-secondary font-medium mt-1 block">Target: 85% by Mid-term</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">trending_up</span>
          </div>
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="p-4 border-b border-surface-container flex items-center justify-between">
          <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
            Live Reconciled Inflow Ledger ({transactions.length} Transactions)
          </h3>
          <span className="text-xs text-secondary font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Real-Time IPN Listener Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4">Receipt / Ref</th>
                <th className="py-3 px-4">Learner Name</th>
                <th className="py-3 px-4">Adm #</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-4 font-bold font-data-mono text-primary">{tx.ref}</td>
                  <td className="py-3 px-4 font-semibold text-on-surface">{tx.studentName}</td>
                  <td className="py-3 px-4 font-data-mono text-outline">{tx.admNo}</td>
                  <td className="py-3 px-4 text-on-surface-variant">{tx.grade}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-semibold text-[11px]">
                      {tx.channel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-data-mono font-bold text-secondary">
                    KES {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-bold text-[10px]">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      View Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-sm w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#00236f] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Official School Receipt</h3>
              <button onClick={() => setSelectedTx(null)} className="text-blue-200 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div className="text-center pb-2 border-b border-surface-container">
                <div className="font-bold text-sm text-primary">SmartShule CBC Academy</div>
                <div className="text-[11px] text-on-surface-variant">KNEC Centre Code: KNEC-041289</div>
                <div className="text-[10px] text-outline">P.O. Box 4567-00100 Nairobi</div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Receipt #:</span>
                  <span className="font-data-mono font-bold text-primary">{selectedTx.ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Learner:</span>
                  <span className="font-bold text-on-surface">{selectedTx.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Admission #:</span>
                  <span className="font-data-mono text-on-surface">{selectedTx.admNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Channel:</span>
                  <span className="font-medium text-on-surface">{selectedTx.channel}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-surface-container text-sm">
                  <span className="font-bold text-on-surface">Amount Paid:</span>
                  <span className="font-bold font-data-mono text-secondary">KES {selectedTx.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-3">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GenerateInvoicesModal
        isOpen={isGenInvoicesOpen}
        onClose={() => setIsGenInvoicesOpen(false)}
        onInvoicesGenerated={() => {}}
      />

      <RecordPaymentModal
        isOpen={isRecordPayOpen}
        onClose={() => setIsRecordPayOpen(false)}
        students={students}
        onPaymentRecorded={() => {}}
      />
    </div>
  );
};
