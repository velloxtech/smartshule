import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

interface FeeStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
}

export const FeeStatementModal: React.FC<FeeStatementModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
}) => {
  const [statement, setStatement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !studentId) return;
    setIsLoading(true);
    apiService
      .getFeeStatement(studentId)
      .then((res) => {
        if (res.success) setStatement(res.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Student Fee Statement</h3>
              <p className="text-xs text-rose-100">{studentName || 'Learner Account'} · Ledger & Transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors"
              title="Print Statement"
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 overscroll-contain">
          {isLoading ? (
            <div className="py-12 text-center text-on-surface-variant text-sm">Loading fee ledger...</div>
          ) : (
            <>
              {/* Balances Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                  <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Total Invoiced</span>
                  <div className="text-lg font-bold font-data-mono text-on-surface mt-1">
                    KES {(statement?.totalInvoiced || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                  <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Total Paid</span>
                  <div className="text-lg font-bold font-data-mono text-secondary mt-1">
                    KES {(statement?.totalPaid || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
                  <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Current Balance</span>
                  <div className="text-lg font-bold font-data-mono text-error mt-1">
                    KES {(statement?.currentBalance || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Invoices List */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Billed Invoices</h4>
                <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-low">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container border-b border-outline-variant/30 text-on-surface-variant font-semibold">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-right">Paid</th>
                        <th className="p-2.5 text-right">Balance</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 font-data-mono">
                      {statement?.invoices && statement.invoices.length > 0 ? (
                        statement.invoices.map((inv: any, i: number) => (
                          <tr key={i} className="hover:bg-surface-container">
                            <td className="p-2.5 font-bold text-primary">{inv.invoiceNumber}</td>
                            <td className="p-2.5 text-on-surface-variant">{inv.dueDate}</td>
                            <td className="p-2.5 text-right">KES {(inv.amountPayable || inv.amountBilled || 0).toLocaleString()}</td>
                            <td className="p-2.5 text-right text-secondary">KES {(inv.amountPaid || 0).toLocaleString()}</td>
                            <td className="p-2.5 text-right text-error font-bold">KES {(inv.balance || 0).toLocaleString()}</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container text-on-primary-container">
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-on-surface-variant font-sans">
                            No invoices recorded for this learner.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payments History */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Payment Receipts</h4>
                <div className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-low">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container border-b border-outline-variant/30 text-on-surface-variant font-semibold">
                      <tr>
                        <th className="p-2.5">Receipt #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Channel</th>
                        <th className="p-2.5">Ref / Trans ID</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 font-data-mono">
                      {statement?.payments && statement.payments.length > 0 ? (
                        statement.payments.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-surface-container">
                            <td className="p-2.5 font-bold text-secondary">{p.receiptNumber}</td>
                            <td className="p-2.5 text-on-surface-variant">{p.paymentDate}</td>
                            <td className="p-2.5 text-on-surface">{p.paymentMethod}</td>
                            <td className="p-2.5 text-on-surface-variant">{p.transactionReference}</td>
                            <td className="p-2.5 text-right font-bold text-secondary">
                              KES {p.amount?.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-on-surface-variant font-sans">
                            No payment receipts recorded for this learner.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
