import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FinanceSummaryData, CashFlowLedgerData } from '../../types';

interface BursarDashboardViewProps {
  totalCollectedFee: number;
  onOpenMpesa: () => void;
  onOpenRecordExpense?: () => void;
  onOpenRecordIncome?: () => void;
  onOpenSmsModal?: (target?: 'absentee' | 'fee' | 'all') => void;
  onNavigateTab: (tabId: any) => void;
}

export const BursarDashboardView: React.FC<BursarDashboardViewProps> = ({
  totalCollectedFee,
  onOpenMpesa,
  onOpenRecordExpense,
  onOpenRecordIncome,
  onOpenSmsModal,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryData | null>(null);
  const [cashflowData, setCashflowData] = useState<CashFlowLedgerData | null>(null);
  const [defaultersList, setDefaultersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFinanceData() {
      setLoading(true);
      try {
        const [sumRes, cfRes, defRes] = await Promise.all([
          apiService.getFinanceSummary().catch(() => null),
          apiService.getCashFlowLedger().catch(() => null),
          apiService.getDefaulters({ minBalance: 1 }).catch(() => null),
        ]);
        if (sumRes?.data) setFinanceSummary(sumRes.data);
        if (cfRes?.data) setCashflowData(cfRes.data);
        if (defRes?.data) {
          const list = Array.isArray(defRes.data)
            ? defRes.data
            : Array.isArray((defRes.data as any).defaulters)
            ? (defRes.data as any).defaulters
            : [];
          setDefaultersList(list);
        }
      } catch (err) {
        console.warn('Failed loading bursar finance data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFinanceData();
  }, []);

  const totalBilled = financeSummary?.totalBilled || 0;
  const totalCollected = financeSummary?.totalCollected || totalCollectedFee || 0;
  const totalOutstanding = financeSummary?.totalOutstanding || Math.max(0, totalBilled - totalCollected);
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const totalExpenses = cashflowData?.summary?.totalExpensesOut || 0;
  const otherIncome = cashflowData?.summary?.totalOtherIncome || 0;
  const netCashflow = cashflowData?.summary?.netCashPosition || (totalCollected + otherIncome - totalExpenses);

  const safeDefaulters = Array.isArray(defaultersList) ? defaultersList : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Bursar Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-amber-900 to-yellow-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                Treasury & Accounts Desk
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Isolated Finance Domain
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Bursar Financial & Liquidity Command Center
            </h1>
            <p className="mt-1 text-sm text-amber-100 max-w-xl">
              Strictly managing school fee billing, M-Pesa STK receipts, operating expenditures, MoE capitation, and liquidity reconciliation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onOpenMpesa}
              className="px-4 py-2.5 rounded-xl bg-white text-amber-950 font-bold text-xs hover:bg-white/95 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">payments</span>
              <span>Receive M-Pesa / Bank</span>
            </button>
            <button
              onClick={() => onNavigateTab('defaulters-receipts')}
              className="px-4 py-2.5 rounded-xl bg-amber-800/80 hover:bg-amber-800 text-white font-semibold text-xs border border-amber-400/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              <span>Defaulters Roster ({safeDefaulters.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Financial Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Total Fee Collected</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">account_balance_wallet</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">
              KES {totalCollected.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-800 font-semibold mt-1">
              {collectionRate}% of Term 1 Billed Target
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Outstanding Arrears</span>
            <span className="material-symbols-outlined text-rose-600 text-[20px]">pending</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">
              KES {totalOutstanding.toLocaleString()}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-1">
              Across {safeDefaulters.length} outstanding accounts
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Expenses</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">receipt</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">
              KES {totalExpenses.toLocaleString()}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-1">Disbursed operational costs</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-bold uppercase tracking-wider">Net Cash Position</span>
            <span className="material-symbols-outlined text-blue-600 text-[20px]">balance</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">
              KES {netCashflow.toLocaleString()}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-1">Net liquidity on hand</div>
          </div>
        </div>
      </div>

      {/* Priority Defaulters & High Balance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-outline-variant/30 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-on-surface">Priority Fee Defaulters</h2>
              <p className="text-xs text-on-surface-variant">
                Learners with pending balances requiring prompt clearance.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('defaulters-receipts')}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Ledger</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {safeDefaulters.length === 0 ? (
            <div className="py-12 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[36px]">check_circle</span>
              <span className="font-semibold text-sm text-on-surface">Fee Collection Pristine</span>
              <span>No outstanding balances found for current term.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase text-[10px] font-bold border-b border-outline-variant/30">
                  <tr>
                    <th className="py-2.5 px-3">Adm #</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Grade</th>
                    <th className="py-2.5 px-3">Outstanding</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {safeDefaulters.slice(0, 6).map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900">
                        {item.admissionNumber || item.student?.admissionNumber || 'ADM-2026'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-on-surface">
                        {item.studentName || `${item.student?.firstName || ''} ${item.student?.lastName || ''}`}
                      </td>
                      <td className="py-2.5 px-3 text-on-surface-variant">
                        {item.gradeLevel || item.student?.gradeLevel || 'Grade 1'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-rose-700">
                        KES {Number(item.balance || item.outstandingAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={onOpenMpesa}
                          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Finance Department Modules Navigation */}
        <div className="p-6 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-on-surface mb-1">Treasury Modules</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              All financial books and payment reconciliation interfaces.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigateTab('cashflow-ledger')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-amber-50/50 hover:border-amber-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-amber-700 text-[22px]">account_balance_wallet</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Cash Flow & Ledger</div>
                  <div className="text-[11px] text-on-surface-variant">Money In vs Money Out tracking</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('expenses-management')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-amber-50/50 hover:border-amber-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-amber-700 text-[22px]">payments</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Operating Expenses</div>
                  <div className="text-[11px] text-on-surface-variant">Utilities, supplies, salaries & repairs</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('capitation-income')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-amber-50/50 hover:border-amber-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-amber-700 text-[22px]">domain_add</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Capitation & MoE Grants</div>
                  <div className="text-[11px] text-on-surface-variant">NEMIS funding & government grants</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('fee-structure')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-amber-50/50 hover:border-amber-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-amber-700 text-[22px]">table_chart</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Fee Structures</div>
                  <div className="text-[11px] text-on-surface-variant">Configure term tuition & levies</div>
                </div>
              </button>

              <button
                onClick={() => onNavigateTab('financial-reports')}
                className="w-full p-3 rounded-xl border border-outline-variant/30 hover:bg-amber-50/50 hover:border-amber-300 transition-all flex items-center gap-3 text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-amber-700 text-[22px]">analytics</span>
                <div>
                  <div className="text-xs font-bold text-on-surface">Financial Reports & P&L</div>
                  <div className="text-[11px] text-on-surface-variant">Profit & Loss statements and export</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-bold">Notice:</span> The Finance Department account is strictly restricted to billing, ledger entries, payments, and financial books.
          </div>
        </div>
      </div>
    </div>
  );
};
