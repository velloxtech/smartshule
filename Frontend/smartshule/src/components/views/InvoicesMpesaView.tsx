import React, { useState } from 'react';
import { FeeTransaction } from '../../types';

interface InvoicesMpesaViewProps {
  transactions: FeeTransaction[];
  totalCollected: number;
  onOpenMpesaModal: () => void;
}

export const InvoicesMpesaView: React.FC<InvoicesMpesaViewProps> = ({
  transactions,
  totalCollected,
  onOpenMpesaModal,
}) => {
  const [selectedTx, setSelectedTx] = useState<FeeTransaction | null>(null);

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
            Safaricom Daraja M-Pesa STK Push Gateway
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Automated instant payment reconciliation for Paybill 891230 & Bank Wire settlement
          </p>
        </div>

        <button
          onClick={onOpenMpesaModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg hover:bg-secondary/90 text-sm font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
          <span>Trigger New M-Pesa STK Push</span>
        </button>
      </div>

      {/* Gateway Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Paybill Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold font-data-mono text-primary">891230</span>
              <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-semibold">
                Active Rail
              </span>
            </div>
            <span className="text-[11px] text-secondary font-medium mt-1 block">
              Safaricom Daraja API 2.0 Webhook Live
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
            <div className="text-xl font-bold font-data-mono text-primary mt-1">
              KES {totalCollected.toLocaleString()}
            </div>
            <span className="text-[11px] text-outline mt-1 block">
              Target: KES 11,050,000 (76.2% Achieved)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Settlement Account
            </span>
            <div className="text-sm font-bold text-on-surface mt-1">
              Equity Bank Kenya (Hillside Ops)
            </div>
            <span className="text-[11px] font-data-mono text-outline mt-1 block">
              A/C: 0180293810281 (Daily Auto-Sweep)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">assured_workload</span>
          </div>
        </div>
      </div>

      {/* Transactions History Ledger */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="p-4 border-b border-surface-container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
            <h3 className="font-semibold text-sm text-on-surface">
              Real-time Inflow Transaction Ledger
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant font-data-mono">
            {transactions.length} Verified Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-label-md tracking-wider border-b border-outline-variant/20">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Learner & Grade</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-data-mono font-bold text-xs text-primary">{tx.ref}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-on-surface">{tx.studentName}</div>
                    <div className="text-xs text-on-surface-variant font-data-mono">
                      Adm #{tx.admNo} · {tx.grade}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-sm font-data-mono text-secondary">
                      KES {tx.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${
                        tx.channel === 'M-Pesa Express'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-primary-fixed text-primary'
                      }`}
                    >
                      {tx.channel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-data-mono text-outline">{tx.timestamp}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-secondary">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>{' '}
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="px-2.5 py-1 rounded bg-surface-container text-primary hover:bg-surface-container-highest text-xs font-semibold transition-colors cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-2xl max-w-md w-full border border-outline-variant/30 space-y-4 text-on-surface">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
                <div>
                  <h4 className="font-bold text-sm text-primary">Hillside Academy Kenya</h4>
                  <p className="text-[11px] text-on-surface-variant">Official Fee Payment Receipt</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Receipt No:</span>
                <span className="font-data-mono font-bold text-primary">{selectedTx.ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Learner:</span>
                <span className="font-bold">{selectedTx.studentName} (Adm #{selectedTx.admNo})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Class:</span>
                <span className="font-semibold">{selectedTx.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Payment Mode:</span>
                <span className="font-semibold text-secondary">{selectedTx.channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Date:</span>
                <span className="font-data-mono">{selectedTx.timestamp}</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant/30 pt-2 text-sm font-bold">
                <span>Amount Paid:</span>
                <span className="font-data-mono text-secondary">KES {selectedTx.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center text-[11px] text-outline">
              Thank you. Certified digitally by Hillside Academy Bursary & Safaricom Daraja M-Pesa.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-container"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
