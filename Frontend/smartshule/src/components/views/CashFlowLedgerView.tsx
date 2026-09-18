import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { CashFlowLedgerData, ExpenseRecord, OtherIncomeRecord } from '../../types';
import { RecordExpenseModal } from '../modals/RecordExpenseModal';
import { RecordIncomeModal } from '../modals/RecordIncomeModal';

export const CashFlowLedgerView: React.FC = () => {
  const [ledgerData, setLedgerData] = useState<CashFlowLedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getCashFlowLedger({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success && res.data) {
        setLedgerData(res.data);
      } else {
        setError(res.message || 'Failed to fetch financial ledger');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to financial service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [startDate, endDate]);

  const handleExpenseRecorded = (expense: ExpenseRecord) => {
    showNotification(`Expense voucher ${expense.voucherNumber} recorded successfully!`);
    loadLedger();
  };

  const handleIncomeRecorded = (income: OtherIncomeRecord) => {
    showNotification(`Income receipt ${income.receiptNumber} recorded successfully!`);
    loadLedger();
  };

  const handleUpdateExpenseStatus = async (id: string, newStatus: string) => {
    try {
      const res = await apiService.updateExpenseStatus(id, newStatus);
      if (res.success) {
        showNotification(`Expense voucher status updated to ${newStatus}`);
        loadLedger();
      }
    } catch (err: any) {
      alert(`Could not update status: ${err.message}`);
    }
  };

  const handleDeleteExpense = async (id: string, voucherNo: string) => {
    if (!window.confirm(`Are you sure you want to delete expense voucher "${voucherNo}"?`)) return;
    try {
      const res = await apiService.deleteExpense(id);
      if (res.success) {
        showNotification(`Expense ${voucherNo} deleted.`);
        loadLedger();
      }
    } catch (err: any) {
      alert(`Could not delete expense: ${err.message}`);
    }
  };

  // Filtered transactions
  const filteredLedger = useMemo(() => {
    if (!ledgerData?.recentLedger) return [];
    return ledgerData.recentLedger.filter((tx) => {
      // Tab filter
      if (activeTab !== 'ALL' && tx.type !== activeTab) return false;

      // Channel filter
      if (selectedChannel !== 'ALL') {
        if (selectedChannel === 'MPESA' && tx.paymentMethod !== 'MPESA') return false;
        if (selectedChannel === 'BANK' && !['BANK_TRANSFER', 'BANK_DEPOSIT', 'PAYSTACK', 'CARD'].includes(tx.paymentMethod)) return false;
        if (selectedChannel === 'CASH' && tx.paymentMethod !== 'CASH') return false;
        if (selectedChannel === 'CHEQUE' && tx.paymentMethod !== 'CHEQUE') return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && tx.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(q);
        const matchesParty = tx.party.toLowerCase().includes(q);
        const matchesRef = tx.reference.toLowerCase().includes(q);
        const matchesCategory = tx.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesParty && !matchesRef && !matchesCategory) return false;
      }

      return true;
    });
  }, [ledgerData, activeTab, selectedChannel, selectedCategory, searchQuery]);

  // Export to CSV
  const exportToCSV = () => {
    if (!ledgerData?.recentLedger.length) {
      alert('No ledger transactions available to export.');
      return;
    }

    const headers = ['Date', 'Type', 'Vote Head / Source', 'Narration', 'Payee / Payer', 'Channel', 'Reference', 'Amount (KES)', 'Status'];
    const rows = filteredLedger.map((tx) => [
      `"${tx.date}"`,
      `"${tx.type}"`,
      `"${tx.category}"`,
      `"${tx.title.replace(/"/g, '""')}"`,
      `"${tx.party.replace(/"/g, '""')}"`,
      `"${tx.paymentMethod}"`,
      `"${tx.reference}"`,
      tx.amount,
      `"${tx.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SmartShule_CashBook_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format vote head label
  const formatVoteHead = (cat: string) => {
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Cash Flow & Ledger</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1 flex items-center gap-2.5">
            Institutional Cash Flow & Financial Ledger
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300/40">
              Money In & Out
            </span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Comprehensive Ministry of Education Vote Head Accounting, Liquid Cash Reserves, and Real-Time Cash Book
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Record Money In</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Record Money Out</span>
          </button>

          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Download CSV Ledger"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range & Quick Filters Bar */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px] text-primary">calendar_month</span>
          <span>Ledger Reporting Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-on-surface-variant">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-transparent text-on-surface focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-on-surface-variant">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-transparent text-on-surface focus:outline-none"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface-variant transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}

          <button
            onClick={loadLedger}
            className="p-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer ml-auto sm:ml-0"
            title="Refresh Ledger"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Main KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow (Money In) */}
        <div className="bg-surface-container-lowest border border-emerald-500/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Total Money In (Inflow)
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {ledgerData ? ledgerData.totalMoneyIn.toLocaleString() : '---'}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">arrow_downward</span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Fees: KES {ledgerData?.feeInflow.toLocaleString() || '0'}</span>
            <span>Other: KES {ledgerData?.otherInflow.toLocaleString() || '0'}</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* Total Outflow (Money Out) */}
        <div className="bg-surface-container-lowest border border-rose-500/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Total Money Out (Outflow)
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {ledgerData ? ledgerData.totalMoneyOut.toLocaleString() : '---'}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">arrow_upward</span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Disbursed Expenses</span>
            <span className="font-semibold text-rose-700 dark:text-rose-400">
              {ledgerData?.voteHeadBreakdown.length || 0} Vote Heads
            </span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
        </div>

        {/* Net Operating Cash Flow */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Net Operating Cash Flow
              </p>
              <h3
                className={`text-2xl font-black mt-1 ${
                  (ledgerData?.netCashFlow || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {(ledgerData?.netCashFlow || 0) >= 0 ? '+' : ''}
                KES {ledgerData ? ledgerData.netCashFlow.toLocaleString() : '---'}
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                (ledgerData?.netCashFlow || 0) >= 0
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-rose-500/10 text-rose-600'
              }`}
            >
              <span className="material-symbols-outlined text-[26px]">
                {(ledgerData?.netCashFlow || 0) >= 0 ? 'trending_up' : 'trending_down'}
              </span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Financial Position:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                (ledgerData?.netCashFlow || 0) >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {(ledgerData?.netCashFlow || 0) >= 0 ? 'Operating Surplus' : 'Operating Deficit'}
            </span>
          </div>
          <div
            className={`absolute top-0 left-0 right-0 h-1 ${
              (ledgerData?.netCashFlow || 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          ></div>
        </div>

        {/* Total Liquid Reserves */}
        <div className="bg-surface-container-lowest border border-primary/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Total Liquid Reserves
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {ledgerData ? ledgerData.accountBalances.totalLiquidCash.toLocaleString() : '---'}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">account_balance</span>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Bank + M-Pesa + Cash</span>
            <span className="font-semibold text-primary">Reconciled</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
        </div>
      </div>

      {/* Account Balances Breakdown Panel */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-primary">savings</span>
            <h3 className="text-sm sm:text-base font-bold text-on-surface">
              Liquid Asset Accounts & Reconciliation Channels
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant hidden sm:inline">
            Reflecting all Inflows vs Outflows across banking & digital wallets
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bank Account */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
                <span className="font-bold text-xs sm:text-sm text-on-surface">School Bank Accounts</span>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                Equity / KCB
              </span>
            </div>
            <div className="text-xl font-extrabold text-on-surface">
              KES {ledgerData?.accountBalances.bank.balance.toLocaleString() || '0'}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20 text-[11px] text-on-surface-variant">
              <div>Inflows: <span className="font-semibold text-emerald-600">+KES {ledgerData?.accountBalances.bank.inflows.toLocaleString() || '0'}</span></div>
              <div>Outflows: <span className="font-semibold text-rose-600">-KES {ledgerData?.accountBalances.bank.outflows.toLocaleString() || '0'}</span></div>
            </div>
          </div>

          {/* M-Pesa Till / Paybill */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">phone_android</span>
                </div>
                <span className="font-bold text-xs sm:text-sm text-on-surface">M-Pesa Till & Paybill</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                Safaricom Rails
              </span>
            </div>
            <div className="text-xl font-extrabold text-on-surface">
              KES {ledgerData?.accountBalances.mpesa.balance.toLocaleString() || '0'}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20 text-[11px] text-on-surface-variant">
              <div>Inflows: <span className="font-semibold text-emerald-600">+KES {ledgerData?.accountBalances.mpesa.inflows.toLocaleString() || '0'}</span></div>
              <div>Outflows: <span className="font-semibold text-rose-600">-KES {ledgerData?.accountBalances.mpesa.outflows.toLocaleString() || '0'}</span></div>
            </div>
          </div>

          {/* Petty Cash Drawer */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                </div>
                <span className="font-bold text-xs sm:text-sm text-on-surface">Petty Cash Drawer</span>
              </div>
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                Cash Office
              </span>
            </div>
            <div className="text-xl font-extrabold text-on-surface">
              KES {ledgerData?.accountBalances.pettyCash.balance.toLocaleString() || '0'}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20 text-[11px] text-on-surface-variant">
              <div>Inflows: <span className="font-semibold text-emerald-600">+KES {ledgerData?.accountBalances.pettyCash.inflows.toLocaleString() || '0'}</span></div>
              <div>Outflows: <span className="font-semibold text-rose-600">-KES {ledgerData?.accountBalances.pettyCash.outflows.toLocaleString() || '0'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Vote Head Budget Consumption & Revenue Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vote Heads Expenditure Breakdown */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 text-[22px]">pie_chart</span>
              <h3 className="font-bold text-sm sm:text-base text-on-surface">
                Expenditure by Vote Head (MoE Cost Centers)
              </h3>
            </div>
            <span className="text-xs font-semibold text-rose-600">
              Money Out Analysis
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {ledgerData?.voteHeadBreakdown.map((vh) => (
              <div key={vh.category} className="space-y-1 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-on-surface">{formatVoteHead(vh.category)}</span>
                  <span className="text-on-surface font-mono">
                    KES {vh.totalSpent.toLocaleString()}{' '}
                    <span className="text-[11px] text-on-surface-variant font-normal">
                      ({vh.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(vh.percentage, vh.totalSpent > 0 ? 3 : 0))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Sources Breakdown */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[22px]">donut_small</span>
              <h3 className="font-bold text-sm sm:text-base text-on-surface">
                Income Sources (Fees & Non-Fee Inflows)
              </h3>
            </div>
            <span className="text-xs font-semibold text-emerald-600">
              Money In Analysis
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {ledgerData?.incomeBreakdown.map((inc) => (
              <div key={inc.source} className="space-y-1 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-on-surface">{formatVoteHead(inc.source)}</span>
                  <span className="text-on-surface font-mono">
                    KES {inc.totalAmount.toLocaleString()}{' '}
                    <span className="text-[11px] text-on-surface-variant font-normal">
                      ({inc.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(inc.percentage, inc.totalAmount > 0 ? 3 : 0))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Cash Book / Financial Ledger Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs space-y-4">
        {/* Table Top Controls & Sub-tabs */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl self-start">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All Entries ({ledgerData?.recentLedger.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('INFLOW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'INFLOW'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                <span>Money In</span>
              </button>
              <button
                onClick={() => setActiveTab('OUTFLOW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'OUTFLOW'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                <span>Money Out</span>
              </button>
            </div>

            {/* Channel filter & Category filter */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-primary"
              >
                <option value="ALL">All Channels</option>
                <option value="MPESA">M-Pesa</option>
                <option value="BANK">Bank / Paystack</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Petty Cash</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-primary"
              >
                <option value="ALL">All Categories</option>
                <option value="FEES_COLLECTION">Fees Collection</option>
                <option value="GOVERNMENT_CAPITATION_JSS">JSS Capitation</option>
                <option value="GOVERNMENT_CAPITATION_FPE">FPE Capitation</option>
                <option value="SALARIES_WAGES">Salaries & Wages</option>
                <option value="UTILITIES_BILLS">Utilities & Bills</option>
                <option value="CBC_LEARNING_MATERIALS">CBC Learning Materials</option>
                <option value="MEALS_FEEDING">Meals & Feeding</option>
                <option value="TRANSPORT_FUEL">Transport & Fuel</option>
                <option value="REPAIRS_MAINTENANCE">Repairs & Maintenance</option>
                <option value="ADMIN_OFFICE">Admin & Stationery</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ledger entries by title, vendor/payee, voucher or receipt reference..."
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-on-surface focus:outline-primary"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              <span>Loading institutional cash flow ledger...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error text-sm font-medium">
              {error}
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm space-y-2">
              <span className="material-symbols-outlined text-[36px] text-outline-variant">account_balance_wallet</span>
              <p className="font-semibold">No transactions found matching the selected filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-outline-variant/30 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Flow Type</th>
                  <th className="py-3 px-4">Narration / Title</th>
                  <th className="py-3 px-4">Vote Head / Source</th>
                  <th className="py-3 px-4">Payee / Payer</th>
                  <th className="py-3 px-4">Channel & Ref</th>
                  <th className="py-3 px-4 text-right">Amount (KES)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredLedger.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-on-surface font-mono whitespace-nowrap">
                      {tx.date}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.type === 'INFLOW' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
                          <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
                          <span>Inflow</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/40">
                          <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
                          <span>Outflow</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-on-surface max-w-xs">
                      <div className="truncate" title={tx.title}>{tx.title}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-on-surface-variant font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-[11px]">
                        {formatVoteHead(tx.category)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-on-surface whitespace-nowrap">
                      {tx.party}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-[11px] font-bold text-on-surface">{tx.paymentMethod}</div>
                      <div className="text-[10px] font-mono text-on-surface-variant">{tx.reference}</div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold font-mono whitespace-nowrap">
                      <span
                        className={
                          tx.type === 'INFLOW'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }
                      >
                        {tx.type === 'INFLOW' ? '+' : '-'}KES {tx.amount.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === 'PAID' || tx.status === 'COMPLETED' || tx.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : tx.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {tx.type === 'OUTFLOW' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {tx.status !== 'PAID' && (
                            <button
                              onClick={() => handleUpdateExpenseStatus(tx.id, 'PAID')}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              title="Mark as Paid"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteExpense(tx.id, tx.reference)}
                            className="p-1 text-on-surface-variant hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant font-mono">Receipted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Expense Modal (Money Out) */}
      <RecordExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onExpenseRecorded={handleExpenseRecorded}
      />

      {/* Record Non-Fee Income Modal (Money In) */}
      <RecordIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onIncomeRecorded={handleIncomeRecorded}
      />
    </div>
  );
};
