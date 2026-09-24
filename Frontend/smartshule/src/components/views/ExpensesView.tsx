import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { ExpenseRecord, ExpenseCategoryType, ExpenseStatusType } from '../../types';
import { RecordExpenseModal } from '../modals/RecordExpenseModal';

const VOTE_HEAD_CONFIG: Record<
  ExpenseCategoryType,
  { label: string; icon: string; bg: string; text: string }
> = {
  SALARIES_WAGES: { label: 'Salaries & Staff Wages', icon: 'badge', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300' },
  CBC_LEARNING_MATERIALS: { label: 'CBC Materials & Lab Kits', icon: 'science', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300' },
  UTILITIES_BILLS: { label: 'Utilities (Power, Water, Net)', icon: 'bolt', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
  MEALS_FEEDING: { label: 'Meals & Foodstock', icon: 'restaurant', bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300' },
  REPAIRS_MAINTENANCE: { label: 'Repairs & Maintenance', icon: 'handyman', bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300' },
  TRANSPORT_FUEL: { label: 'Transport & Bus Fuel', icon: 'directions_bus', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300' },
  ADMIN_OFFICE: { label: 'Admin & Office Printing', icon: 'description', bg: 'bg-slate-50 dark:bg-slate-900/50', text: 'text-slate-700 dark:text-slate-300' },
  KNEC_EXAMS: { label: 'KNEC & Exam Logistics', icon: 'assignment_turned_in', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
  CO_CURRICULAR: { label: 'Co-Curricular & Sports', icon: 'sports_soccer', bg: 'bg-lime-50 dark:bg-lime-950/40', text: 'text-lime-800 dark:text-lime-300' },
  CAPITAL_DEVELOPMENT: { label: 'Capital & Infrastructure', icon: 'domain', bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-800 dark:text-cyan-300' },
  OTHER_EXPENSES: { label: 'Other Miscellaneous', icon: 'more_horiz', bg: 'bg-gray-50 dark:bg-gray-900/50', text: 'text-gray-700 dark:text-gray-300' },
};

export const ExpensesView: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Notifications
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedVoucherForView, setSelectedVoucherForView] = useState<ExpenseRecord | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getExpenses({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success && Array.isArray(res.data)) {
        setExpenses(res.data);
      } else {
        setError(res.message || 'Failed to fetch expenses');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to expense service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, selectedStatus, startDate, endDate]);

  const handleExpenseRecorded = (newExp: ExpenseRecord) => {
    showNotification(`Payment Voucher ${newExp.voucherNumber} recorded successfully!`);
    loadExpenses();
  };

  const handleUpdateStatus = async (id: string, newStatus: ExpenseStatusType) => {
    try {
      const res = await apiService.updateExpenseStatus(id, newStatus);
      if (res.success) {
        showNotification(`Voucher updated to ${newStatus}`);
        loadExpenses();
      }
    } catch (err: any) {
      alert(`Could not update voucher status: ${err.message}`);
    }
  };

  const handleDeleteExpense = async (id: string, voucherNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete Payment Voucher "${voucherNumber}"?`)) return;
    try {
      const res = await apiService.deleteExpense(id);
      if (res.success) {
        showNotification(`Voucher ${voucherNumber} deleted.`);
        loadExpenses();
      }
    } catch (err: any) {
      alert(`Error deleting expense: ${err.message}`);
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedChannel !== 'ALL') {
        if (selectedChannel === 'MPESA' && e.paymentMethod !== 'MPESA') return false;
        if (selectedChannel === 'BANK' && !['BANK_TRANSFER', 'BANK_DEPOSIT', 'KCB_BUNI', 'CARD'].includes(e.paymentMethod)) return false;
        if (selectedChannel === 'CHEQUE' && e.paymentMethod !== 'CHEQUE') return false;
        if (selectedChannel === 'CASH' && e.paymentMethod !== 'CASH') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = e.title.toLowerCase().includes(q);
        const mPayee = e.payee.toLowerCase().includes(q);
        const mVoucher = e.voucherNumber.toLowerCase().includes(q);
        const mRef = e.paymentReference.toLowerCase().includes(q);
        if (!mTitle && !mPayee && !mVoucher && !mRef) return false;
      }
      return true;
    });
  }, [expenses, selectedChannel, searchQuery]);

  // Aggregate Metrics
  const totalPaid = useMemo(() => {
    return expenses.filter((e) => e.status === 'PAID').reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalApproved = useMemo(() => {
    return expenses.filter((e) => e.status === 'APPROVED').reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const totalPending = useMemo(() => {
    return expenses.filter((e) => e.status === 'PENDING').reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  // Spending per vote head
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      if (e.status === 'PAID' || e.status === 'APPROVED') {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
    }
    return map;
  }, [expenses]);

  // Export CSV
  const exportCSV = () => {
    if (!filteredExpenses.length) {
      alert('No expense records to export.');
      return;
    }
    const headers = ['Voucher No', 'Date', 'Vote Head', 'Narration', 'Payee / Vendor', 'Payment Channel', 'Reference', 'Amount (KES)', 'Status'];
    const rows = filteredExpenses.map((e) => [
      `"${e.voucherNumber}"`,
      `"${e.expenseDate}"`,
      `"${e.category}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.payee.replace(/"/g, '""')}"`,
      `"${e.paymentMethod}"`,
      `"${e.paymentReference}"`,
      e.amount,
      `"${e.status}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartShule_Expenses_Vouchers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-rose-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-fade-in">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Operating Expenses</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1 flex items-center gap-2.5">
            Operating Expenses & MoE Vote Heads
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300/40">
              Money Out
            </span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Payment Voucher (PV) Management, Ministry Cost Center Accounting & Authorization Workflow
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>New Payment Voucher</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export PV Ledger</span>
          </button>
        </div>
      </div>

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-rose-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Disbursed Expenses (Paid)
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {totalPaid.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Reconciled with Bank/M-Pesa</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600"></div>
        </div>

        <div className="bg-surface-container-lowest border border-amber-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Approved (Awaiting Pay)
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {totalApproved.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">task_alt</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Authorized by Principal / BOM</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        <div className="bg-surface-container-lowest border border-blue-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Pending Vouchers
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {totalPending.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">pending</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Awaiting Review / Verification</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Total Payment Vouchers
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                {expenses.length} Vouchers
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span>PFMA Audit Compliant</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-outline-variant"></div>
        </div>
      </div>

      {/* Vote Heads Horizontal Quick Filter Chips */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Filter by Ministry Vote Head:
          </span>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
            >
              Clear Vote Head Filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
              selectedCategory === 'ALL'
                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
            }`}
          >
            All Vote Heads
          </button>

          {(Object.keys(VOTE_HEAD_CONFIG) as ExpenseCategoryType[]).map((cat) => {
            const cfg = VOTE_HEAD_CONFIG[cat];
            const spend = categorySpending[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-rose-700 text-white border-rose-700 shadow-xs font-bold'
                    : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{cfg.icon}</span>
                <span>{cfg.label}</span>
                {spend > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    KES {spend.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vouchers Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs space-y-4">
        {/* Table Filters Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl self-start flex-wrap">
              {['ALL', 'PAID', 'APPROVED', 'PENDING', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedStatus === st
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {st === 'ALL' ? 'All Status' : st}
                </button>
              ))}
            </div>

            {/* Channel and Date range */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-1.5 text-xs text-on-surface focus:outline-rose-600"
              >
                <option value="ALL">All Payment Channels</option>
                <option value="MPESA">M-Pesa</option>
                <option value="BANK">Bank / EFT / Deposit</option>
                <option value="CHEQUE">School Cheque</option>
                <option value="CASH">Petty Cash</option>
              </select>

              <div className="flex items-center gap-1.5 bg-surface-container border border-outline-variant/30 rounded-xl px-2.5 py-1">
                <span className="text-[11px] text-on-surface-variant">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs bg-transparent text-on-surface focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-surface-container border border-outline-variant/30 rounded-xl px-2.5 py-1">
                <span className="text-[11px] text-on-surface-variant">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs bg-transparent text-on-surface focus:outline-none"
                />
              </div>
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
              placeholder="Search expenses by voucher # (e.g. PV-2026-001), payee, narration, or transaction reference..."
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-on-surface focus:outline-rose-600"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-rose-600">progress_activity</span>
              <span>Loading payment vouchers from database...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error text-sm font-medium">
              {error}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm space-y-2">
              <span className="material-symbols-outlined text-[36px] text-outline-variant">payments</span>
              <p className="font-semibold">No payment vouchers found matching your filters.</p>
              <button
                onClick={() => setIsRecordModalOpen(true)}
                className="mt-2 px-3.5 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Create New Voucher
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-outline-variant/30 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vote Head</th>
                  <th className="py-3 px-4">Narration / Details</th>
                  <th className="py-3 px-4">Payee / Vendor</th>
                  <th className="py-3 px-4">Channel & Ref</th>
                  <th className="py-3 px-4 text-right">Amount (KES)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredExpenses.map((exp) => {
                  const cfg = VOTE_HEAD_CONFIG[exp.category] || VOTE_HEAD_CONFIG.OTHER_EXPENSES;
                  return (
                    <tr key={exp.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-rose-800 dark:text-rose-300 whitespace-nowrap">
                        {exp.voucherNumber}
                      </td>

                      <td className="py-3 px-4 text-on-surface font-mono whitespace-nowrap">
                        {exp.expenseDate}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-on-surface max-w-xs">
                        <div className="truncate" title={exp.title}>{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-on-surface-variant truncate font-normal mt-0.5">
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-on-surface whitespace-nowrap font-medium">
                        {exp.payee}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-[11px] font-bold text-on-surface">{exp.paymentMethod}</div>
                        <div className="text-[10px] font-mono text-on-surface-variant">{exp.paymentReference}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-black font-mono text-rose-700 dark:text-rose-400 whitespace-nowrap">
                        KES {exp.amount.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            exp.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                              : exp.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300/40'
                              : exp.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {exp.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateStatus(exp.id, 'APPROVED')}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                              title="Authorize / Approve Voucher"
                            >
                              Approve
                            </button>
                          )}

                          {exp.status === 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateStatus(exp.id, 'PAID')}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              title="Mark as Paid / Disbursed"
                            >
                              Disburse
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedVoucherForView(exp)}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="View Payment Voucher Details"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          <button
                            onClick={() => handleDeleteExpense(exp.id, exp.voucherNumber)}
                            className="p-1 text-on-surface-variant hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Voucher"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onExpenseRecorded={handleExpenseRecorded}
      />

      {/* View Printable Voucher Modal */}
      {selectedVoucherForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-outline-variant/30">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-700 text-[24px]">receipt_long</span>
                <h3 className="font-bold text-base text-on-surface">Payment Voucher (PV) Document</h3>
              </div>
              <button
                onClick={() => setSelectedVoucherForView(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-3 text-xs">
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Voucher Number:</span>
                <span className="font-mono font-bold text-rose-700">{selectedVoucherForView.voucherNumber}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Issue Date:</span>
                <span className="font-bold text-on-surface">{selectedVoucherForView.expenseDate}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Vote Head:</span>
                <span className="font-bold text-on-surface">{selectedVoucherForView.category}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Payee / Vendor:</span>
                <span className="font-bold text-on-surface">{selectedVoucherForView.payee}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Disbursement Channel:</span>
                <span className="font-bold text-on-surface">{selectedVoucherForView.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Reference / Slip:</span>
                <span className="font-mono font-bold text-on-surface">{selectedVoucherForView.paymentReference}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Amount:</span>
                <span className="font-mono font-black text-base text-rose-700">
                  KES {selectedVoucherForView.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Authorization Status:</span>
                <span className="font-bold text-on-surface">{selectedVoucherForView.status}</span>
              </div>
              <div>
                <span className="text-on-surface-variant block mb-1">Purpose / Narration:</span>
                <p className="p-2 rounded bg-surface-container text-on-surface font-medium">
                  {selectedVoucherForView.title}
                  {selectedVoucherForView.notes ? ` - ${selectedVoucherForView.notes}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => setSelectedVoucherForView(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
