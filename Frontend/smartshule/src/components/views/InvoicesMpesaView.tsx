import React, { useState, useEffect } from 'react';
import { FeeTransaction, Student, StudentInvoice, FinanceSummaryData, UserRole } from '../../types';
import { GenerateInvoicesModal } from '../modals/GenerateInvoicesModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { KcbBuniPaymentModal } from '../modals/KcbBuniPaymentModal';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface InvoicesMpesaViewProps {
  transactions: FeeTransaction[];
  totalCollected: number;
  students?: Student[];
  onOpenMpesaModal?: () => void;
  onPaymentAdded?: (payment: any) => void;
}

export const InvoicesMpesaView: React.FC<InvoicesMpesaViewProps> = ({
  transactions: propTransactions,
  totalCollected: propTotalCollected,
  students = [],
  onOpenMpesaModal,
}) => {
  const { user } = useAuth();
  const isGuardian = user?.role === UserRole.GUARDIAN || user?.role === UserRole.PARENT;

  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryData | null>(null);
  const [school, setSchool] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'transactions'>('invoices');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isGenInvoicesOpen, setIsGenInvoicesOpen] = useState(false);
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false);
  const [isKcbBuniOpen, setIsKcbBuniOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<StudentInvoice | undefined>(undefined);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<Student | undefined>(undefined);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, summaryRes, schoolRes] = await Promise.all([
        apiService.getInvoices().catch(() => null),
        apiService.getFinanceSummary().catch(() => null),
        apiService.getSchool().catch(() => null),
      ]);

      if (invRes?.data && Array.isArray(invRes.data)) {
        setInvoices(invRes.data);
      }
      if (summaryRes?.data) {
        setFinanceSummary(summaryRes.data);
      }
      if (schoolRes?.data) {
        setSchool(schoolRes.data);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handlePayInvoice = (inv: StudentInvoice) => {
    setSelectedInvoiceForPay(inv);
    const linkedStudent = students.find((s) => s.id === inv.studentId);
    setSelectedStudentForPay(linkedStudent);
    setIsKcbBuniOpen(true);
  };

  const handleGeneralPayment = () => {
    setSelectedInvoiceForPay(undefined);
    setSelectedStudentForPay(students[0]);
    setIsKcbBuniOpen(true);
  };

  const totalInvoiced = financeSummary?.totalInvoiced || invoices.reduce((acc, inv) => acc + (inv.amountPayable || 0), 0);
  const totalPaid = financeSummary?.totalCollected || propTotalCollected || invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
  const totalBalance = financeSummary?.totalOutstanding || Math.max(0, totalInvoiced - totalPaid);
  const collectionRate = financeSummary?.collectionRatePercentage || (totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0);

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-[#006a40] font-semibold">
              {isGuardian ? 'My Child Fees & KCB Payments' : 'KCB Buni Payment Gateway & Invoicing'}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            {isGuardian ? 'Parent Fee Ledger & Instant KCB Bank Settlement' : 'KCB Buni Payment Platform & Invoicing'}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isGuardian
              ? 'View official school invoices for your linked learners and clear balances via KCB Buni STK Push, Paybill 522123, or KCB Bank'
              : 'Direct fee collection via KCB Bank Kenya Paybill 522123, real-time Buni STK Push APIs, and automated reconciliation'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isGuardian && (
            <>
              <button
                onClick={() => setIsGenInvoicesOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">receipt</span>
                <span>Generate Invoices</span>
              </button>

              <button
                onClick={() => setIsRecordPayOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                <span>Record Bank Deposit / Cash</span>
              </button>
            </>
          )}

          <button
            onClick={handleGeneralPayment}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#005a36] to-[#006a40] text-white rounded-lg hover:shadow-md text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            <span>Pay with KCB Buni (M-Pesa / Bank)</span>
          </button>
        </div>
      </div>

      {/* Gateway & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Dedicated KCB Bank Rail Card */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Settlement Bank Rail
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold font-data-mono text-[#006a40]">KCB Bank Kenya</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Paybill 522123
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
              KCB Buni API Platform Active
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#006a40] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">account_balance</span>
          </div>
        </div>

        {/* Total Settled Card */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              {isGuardian ? 'Total Cleared Fees' : 'Term Fee Collections'}
            </span>
            <div className="text-xl font-bold font-data-mono text-secondary mt-1">
              KES {totalPaid.toLocaleString()}
            </div>
            <span className="text-[11px] text-secondary font-medium mt-1 block">
              {collectionRate}% payment clearance rate
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">verified</span>
          </div>
        </div>

        {/* Total Outstanding Card */}
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              {isGuardian ? 'My Outstanding Balance' : 'Total Outstanding Arrears'}
            </span>
            <div className="text-xl font-bold font-data-mono text-error mt-1">
              KES {totalBalance.toLocaleString()}
            </div>
            <span className="text-[11px] text-outline font-medium mt-1 block">
              {isGuardian ? 'Strictly linked to your enrolled child' : 'Subject to SMS reminder alerts'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">pending_actions</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Invoices vs Transaction Feed */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'invoices'
              ? 'bg-[#7a1228] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          <span>{isGuardian ? 'My Child Invoices' : 'School Invoices'} ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'transactions'
              ? 'bg-[#7a1228] text-white shadow-xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span>Bank Settlements & Receipts</span>
        </button>
      </div>

      {/* INVOICES TABLE */}
      {activeSubTab === 'invoices' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-surface-container flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface">
              {isGuardian ? 'Child Term Invoices' : 'All Student Fee Invoices'}
            </h3>
            <span className="text-xs text-on-surface-variant">
              Showing {invoices.length} billing records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Learner / Adm</th>
                  <th className="py-3 px-4">Items Included</th>
                  <th className="py-3 px-4 text-right">Billed Amount</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-outline">receipt_long</span>
                        <p className="font-semibold text-sm">No Invoices Found</p>
                        <p className="text-xs text-on-surface-variant">
                          {isGuardian
                            ? 'There are currently no outstanding fee invoices for your linked learners.'
                            : 'Generate invoices for the current term using the button above.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const student = students.find((s) => s.id === inv.studentId);
                    return (
                      <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4 font-bold font-data-mono text-primary">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-on-surface">
                            {student?.name || `Student (${inv.studentId})`}
                          </div>
                          <div className="text-[11px] text-outline font-data-mono">
                            {student?.admNo || inv.studentId} · {student?.grade || ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-on-surface-variant">
                            {inv.items?.length || 0} fee components (Tuition, Meals...)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-data-mono font-bold text-on-surface">
                          KES {inv.amountPayable.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-data-mono text-secondary font-bold">
                          KES {inv.amountPaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-data-mono font-black text-error">
                          KES {inv.balance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.status === 'PAID'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {inv.balance > 0 ? (
                            <button
                              onClick={() => handlePayInvoice(inv)}
                              className="px-2.5 py-1.5 bg-[#006a40] hover:bg-[#005a36] text-white rounded-lg text-xs font-bold hover:shadow-xs transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[13px]">payments</span>
                              <span>Pay with KCB Buni</span>
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-secondary flex items-center justify-end gap-1">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              <span>Fully Settled</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TABLE */}
      {activeSubTab === 'transactions' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
          <div className="p-4 border-b border-surface-container flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
              {isGuardian ? 'My Child Payment Receipts' : 'Live Reconciled Inflow Ledger'}
            </h3>
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              KCB Buni Real-Time Webhook Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
                <tr>
                  <th className="py-3 px-4">Receipt / Ref</th>
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-4">Adm #</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {propTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-outline">receipt_long</span>
                        <p className="font-semibold text-sm">No Payment Transactions Recorded</p>
                        <p className="text-xs text-on-surface-variant">
                          Payments made through Paystack bank transfers, virtual accounts, or cards will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  propTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-4 font-bold font-data-mono text-primary">{tx.ref}</td>
                      <td className="py-3 px-4 font-semibold text-on-surface">{tx.studentName}</td>
                      <td className="py-3 px-4 font-data-mono text-outline">{tx.admNo}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-semibold text-[11px]">
                          {tx.channel || 'Paystack Bank'}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slip Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-sm w-full max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-gradient-to-r from-primary to-[#500b1a] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Official School Receipt</h3>
              <button onClick={() => setSelectedTx(null)} className="text-rose-100 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="text-center pb-2 border-b border-surface-container">
                <div className="font-bold text-sm text-primary uppercase">{school?.name || 'SmartShule'}</div>
                {(school?.knecCode || school?.registrationNumber) && (
                  <div className="text-[11px] text-on-surface-variant">Code: {school?.knecCode || school?.registrationNumber}</div>
                )}
                {school?.address && (
                  <div className="text-[10px] text-outline">{school.address}</div>
                )}
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
                  <span className="text-on-surface-variant">Admission Number:</span>
                  <span className="font-data-mono text-on-surface">{selectedTx.admNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Payment Rail:</span>
                  <span className="font-semibold text-on-surface">{selectedTx.channel || 'Paystack Bank'}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-surface-container">
                  <span className="font-bold text-on-surface">Amount Paid:</span>
                  <span className="font-bold font-data-mono text-secondary text-sm">
                    KES {selectedTx.amount.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="pt-3">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs font-bold text-primary transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>Print Official Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KCB Buni Payment Modal */}
      <KcbBuniPaymentModal
        isOpen={isKcbBuniOpen}
        onClose={() => {
          setIsKcbBuniOpen(false);
          setSelectedInvoiceForPay(undefined);
          setSelectedStudentForPay(undefined);
        }}
        students={students}
        initialStudent={selectedStudentForPay}
        initialInvoice={selectedInvoiceForPay}
        onPaymentSuccess={() => {
          loadData();
        }}
      />

      {/* Modals for Admins */}
      <GenerateInvoicesModal
        isOpen={isGenInvoicesOpen}
        onClose={() => setIsGenInvoicesOpen(false)}
        onInvoicesGenerated={() => {
          loadData();
          setIsGenInvoicesOpen(false);
        }}
      />

      <RecordPaymentModal
        isOpen={isRecordPayOpen}
        onClose={() => setIsRecordPayOpen(false)}
        students={students}
        onPaymentRecorded={() => {
          loadData();
          setIsRecordPayOpen(false);
        }}
      />
    </div>
  );
};
