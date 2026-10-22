import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ForwardedPaymentTransaction, Student, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ReceiptViewModal } from '../modals/ReceiptViewModal';
import { FeeStatementModal } from '../modals/FeeStatementModal';
import { resolveGradeName } from '../../utils/formatters';

interface ForwardedPaymentsViewProps {
  students?: Student[];
  onRefreshStudents?: () => void | Promise<void>;
  onNavigateTab?: (tab: string) => void;
}

export const ForwardedPaymentsView: React.FC<ForwardedPaymentsViewProps> = ({
  students = [],
  onRefreshStudents,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<ForwardedPaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED'>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'MPESA' | 'BANK_DEPOSIT' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');

  // Action states
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal states
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);
  const [selectedStudentForStatement, setSelectedStudentForStatement] = useState<{ id: string; name: string } | null>(null);
  const [rejectionModalTx, setRejectionModalTx] = useState<ForwardedPaymentTransaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Transaction reference not found in bank/M-Pesa settlement report');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [auditModalTx, setAuditModalTx] = useState<ForwardedPaymentTransaction | null>(null);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getForwardedTransactions();
      if (res.success && Array.isArray(res.data)) {
        setTransactions(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load forwarded payments:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to load forwarded payment records from server.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 1-Click Approve Verification
  const handleApprove = async (tx: ForwardedPaymentTransaction) => {
    if (verifyingId) return;
    setVerifyingId(tx.id);
    setFeedback(null);

    try {
      const res = await apiService.verifyForwardedPayment(tx.id, {
        action: 'APPROVE',
        invoiceId: tx.invoiceId,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Transaction ${tx.transactionReference} approved! KES ${tx.amount.toLocaleString()} credited to ${tx.studentName || 'learner'} with Official Receipt #${res.data?.receiptNumber || 'generated'}.`,
        });

        // Promptly refresh transactions list & parent students
        await loadTransactions();
        if (onRefreshStudents) {
          onRefreshStudents();
        }

        // If receipt generated, offer option to view receipt
        if (res.data?.receipt || res.data?.payment) {
          setSelectedPaymentForReceipt(res.data.payment || tx);
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to verify transaction.',
        });
      }
    } catch (err: any) {
      console.error('Approval failed:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'An error occurred while approving the forwarded payment.',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  // Rejection handler
  const handleConfirmReject = async () => {
    if (!rejectionModalTx || verifyingId) return;
    const finalReason = rejectionReason === 'CUSTOM'
      ? (customRejectionReason.trim() || 'Payment confirmation rejected by school accounts office')
      : rejectionReason;

    setVerifyingId(rejectionModalTx.id);
    try {
      const res = await apiService.verifyForwardedPayment(rejectionModalTx.id, {
        action: 'REJECT',
        rejectionReason: finalReason,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Transaction ${rejectionModalTx.transactionReference} has been rejected. Reason logged in ledger audit trail.`,
        });
        setRejectionModalTx(null);
        setCustomRejectionReason('');
        await loadTransactions();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Failed to reject transaction.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit rejection.',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  // Extract raw SMS from notes if available
  const extractSmsFromNotes = (notes?: string): string => {
    if (!notes) return '';
    const smsMatch = notes.match(/Forwarded SMS:\s*"(.*?)"/);
    if (smsMatch && smsMatch[1]) return smsMatch[1];
    return notes;
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    const pending = transactions.filter((tx) => tx.status === 'PENDING');
    const pendingAmount = pending.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    const completed = transactions.filter((tx) => tx.status === 'COMPLETED');
    const completedAmount = completed.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    const failed = transactions.filter((tx) => tx.status === 'FAILED');
    const failedAmount = failed.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    return {
      total,
      totalAmount,
      pendingCount: pending.length,
      pendingAmount,
      completedCount: completed.length,
      completedAmount,
      failedCount: failed.length,
      failedAmount,
    };
  }, [transactions]);

  // Filtering transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Status filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
        return false;
      }

      // Channel filter
      if (channelFilter !== 'ALL' && tx.paymentMethod !== channelFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'ALL') {
        const txDate = new Date(tx.createdAt || tx.paymentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'TODAY') {
          const isToday = txDate >= today;
          if (!isToday) return false;
        } else if (dateFilter === 'THIS_WEEK') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (txDate < weekAgo) return false;
        } else if (dateFilter === 'THIS_MONTH') {
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          if (txDate < monthAgo) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = tx.transactionReference?.toLowerCase().includes(q);
        const matchesReceipt = tx.receiptNumber?.toLowerCase().includes(q);
        const matchesStudent = tx.studentName?.toLowerCase().includes(q);
        const matchesAdm = tx.admissionNumber?.toLowerCase().includes(q);
        const matchesPhone = tx.mpesaPhoneNumber?.toLowerCase().includes(q);
        const matchesNotes = tx.notes?.toLowerCase().includes(q);
        return matchesRef || matchesReceipt || matchesStudent || matchesAdm || matchesPhone || matchesNotes;
      }

      return true;
    });
  }, [transactions, statusFilter, channelFilter, dateFilter, searchQuery]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'Receipt / Tracking Number',
      'Transaction Ref',
      'Learner Name',
      'Admission Number',
      'Grade Level',
      'Channel',
      'Amount (KES)',
      'Payment Date',
      'Phone Number',
      'Status',
      'Forwarded Notes & SMS',
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${tx.receiptNumber || ''}"`,
      `"${tx.transactionReference || ''}"`,
      `"${tx.studentName || ''}"`,
      `"${tx.admissionNumber || ''}"`,
      `"${tx.gradeLevel || ''}"`,
      `"${tx.paymentMethod || ''}"`,
      `"${tx.amount || 0}"`,
      `"${tx.paymentDate || ''}"`,
      `"${tx.mpesaPhoneNumber || ''}"`,
      `"${tx.status || ''}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartShule_Forwarded_Payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
            <span className="font-semibold text-primary">Finance &amp; Fee Accounts</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="font-bold text-on-surface">Parent Forwarded Payments</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              Admin &amp; Accounts Portal
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7a1228] to-[#500b1a] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">forward_to_inbox</span>
            </span>
            <span>Parent Forwarded Payments &amp; Verification</span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 max-w-3xl">
            Audit and verify fee payment confirmation messages forwarded by parents from M-Pesa, Bank Deposits, and Airtel Money. 
            Approving a transaction automatically credits the student&apos;s invoice ledger, updates arrears, and generates an official school receipt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-outline-variant/40 disabled:opacity-50"
            title="Refresh transactions from backend"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>Refresh Queue</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredTransactions.length === 0}
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-outline-variant/40 disabled:opacity-40"
            title="Export filtered records to CSV"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-700">download</span>
            <span>Export CSV</span>
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('arrears')}
              className="px-3.5 py-2 rounded-xl bg-[#7a1228]/10 hover:bg-[#7a1228]/20 text-[#7a1228] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-[#7a1228]/20"
            >
              <span className="material-symbols-outlined text-[16px]">assignment_late</span>
              <span>Fee Arrears Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* System Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-start justify-between gap-3 animate-fade-in shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
              : 'bg-rose-50 text-rose-950 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] shrink-0 text-emerald-700">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* KPI Metrics Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Verification Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Pending Verification</span>
            <span className="w-8 h-8 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-950 font-data-mono">{metrics.pendingCount}</span>
              <span className="text-xs font-semibold text-amber-800">awaiting credit</span>
            </div>
            <div className="mt-1 text-xs text-amber-900/80 font-medium">
              KES <strong className="font-data-mono font-bold text-amber-950">{metrics.pendingAmount.toLocaleString()}</strong> uncredited
            </div>
          </div>
          {metrics.pendingCount > 0 && (
            <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>Needs Bursar Attention</span>
            </div>
          )}
        </div>

        {/* Approved & Credited Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Approved &amp; Credited</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-200/70 text-emerald-900 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-950 font-data-mono">{metrics.completedCount}</span>
              <span className="text-xs font-semibold text-emerald-800">settled</span>
            </div>
            <div className="mt-1 text-xs text-emerald-900/80 font-medium">
              KES <strong className="font-data-mono font-bold text-emerald-950">{metrics.completedAmount.toLocaleString()}</strong> in school accounts
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-200/60 text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">receipt_long</span>
            <span>Official REC- receipts issued</span>
          </div>
        </div>

        {/* Rejected / Discrepancy Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">Rejected / Flagged</span>
            <span className="w-8 h-8 rounded-xl bg-rose-200/70 text-rose-900 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-950 font-data-mono">{metrics.failedCount}</span>
              <span className="text-xs font-semibold text-rose-800">discrepancies</span>
            </div>
            <div className="mt-1 text-xs text-rose-900/80 font-medium">
              KES <strong className="font-data-mono font-bold text-rose-950">{metrics.failedAmount.toLocaleString()}</strong> not credited
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-200/60 text-[11px] font-semibold text-rose-800">
            Invalid codes or bank mismatches
          </div>
        </div>

        {/* Total Volume Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-surface-container-low to-surface-container border border-outline-variant/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Submissions</span>
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-on-surface font-data-mono">{metrics.total}</span>
              <span className="text-xs font-semibold text-on-surface-variant">total forwarded</span>
            </div>
            <div className="mt-1 text-xs text-on-surface-variant font-medium">
              KES <strong className="font-data-mono font-bold text-on-surface">{metrics.totalAmount.toLocaleString()}</strong> gross forwarded
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-outline-variant/30 text-[11px] text-on-surface-variant">
            All parents payment notifications
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/30 shadow-xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/20 pb-3">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>All Forwarded Messages</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{metrics.total}</span>
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">pending</span>
            <span>Needs Verification</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">{metrics.pendingCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Approved &amp; Credited</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{metrics.completedCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter('FAILED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'FAILED'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            <span>Rejected / Discrepancy</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{metrics.failedCount}</span>
          </button>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference code, learner name, adm #, phone, or raw SMS..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Payment Method / Channel Filter */}
          <div className="md:col-span-3">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Payment Channels</option>
              <option value="MPESA">Lipa na M-Pesa (Paybill / STK)</option>
              <option value="BANK_DEPOSIT">Direct Bank Deposit</option>
              <option value="BANK_TRANSFER">Bank Wire / EFT Transfer</option>
              <option value="CHEQUE">Banker&apos;s Cheque</option>
              <option value="CASH">Cash at Accounts Office</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="md:col-span-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Dates (All Submissions)</option>
              <option value="TODAY">Received Today</option>
              <option value="THIS_WEEK">Past 7 Days</option>
              <option value="THIS_MONTH">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Verification Queue */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Parent Payment Verification Records ({filteredTransactions.length})</span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Compare payment confirmation codes against your bank or paybill statement, then approve to credit.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
            <span>Showing {filteredTransactions.length} of {transactions.length} records</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-on-surface-variant space-y-3">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">sync</span>
            <p className="text-xs font-semibold">Loading forwarded transactions queue...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant space-y-3">
            <div className="w-14 h-14 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">mark_email_read</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-on-surface">No Forwarded Payments Found</p>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                {searchQuery || statusFilter !== 'ALL' || channelFilter !== 'ALL'
                  ? 'No payment submissions matched your active search and filter criteria. Try clearing filters.'
                  : 'No parent forwarded payment messages in this queue yet. When parents submit their M-Pesa or Bank confirmation messages, they will appear here.'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'ALL' || channelFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setChannelFilter('ALL');
                  setDateFilter('ALL');
                }}
                className="mt-2 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-primary transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant border-b border-surface-container font-semibold">
                  <th className="py-3.5 px-4">Receipt / Tracking</th>
                  <th className="py-3.5 px-4">Learner</th>
                  <th className="py-3.5 px-4">Transaction Code</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Sender / Contact</th>
                  <th className="py-3.5 px-4">Forwarded SMS &amp; Notes</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredTransactions.map((tx) => {
                  const isPending = tx.status === 'PENDING';
                  const isCompleted = tx.status === 'COMPLETED';
                  const isFailed = tx.status === 'FAILED';
                  const isProcessing = verifyingId === tx.id;
                  const rawSms = extractSmsFromNotes(tx.notes);
                  const matchedStudent = students.find((s) => s.id === tx.studentId);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-surface-container-low/60 transition-colors ${
                        isPending ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Tracking / Receipt */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-on-surface flex items-center gap-1.5">
                          <span>{tx.receiptNumber}</span>
                          {isCompleted && (
                            <span className="material-symbols-outlined text-emerald-600 text-[14px]" title="Official Receipt Issued">
                              verified
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                          <span>{tx.paymentDate || (tx.createdAt ? tx.createdAt.split('T')[0] : 'N/A')}</span>
                        </div>
                      </td>

                      {/* Learner */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-on-surface">
                          {tx.studentName || matchedStudent?.name || 'Learner'}
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{tx.admissionNumber || matchedStudent?.admNo || '--'}</span>
                          <span>•</span>
                          <span>{resolveGradeName(tx.gradeLevel || matchedStudent?.grade || '')}</span>
                        </div>
                        {matchedStudent && (
                          <button
                            onClick={() => setSelectedStudentForStatement({ id: matchedStudent.id, name: matchedStudent.name })}
                            className="text-[10px] text-primary hover:underline font-semibold mt-0.5 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Statement</span>
                            <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                          </button>
                        )}
                      </td>

                      {/* Transaction Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-data-mono font-bold text-primary text-xs bg-primary/5 px-2 py-0.5 rounded border border-primary/20">
                            {tx.transactionReference}
                          </span>
                          <button
                            onClick={() => handleCopyCode(tx.transactionReference)}
                            className="text-on-surface-variant hover:text-primary p-0.5 cursor-pointer"
                            title="Copy code"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedCode === tx.transactionReference ? 'done' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-1 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>{tx.paymentMethod ? tx.paymentMethod.replace(/_/g, ' ') : 'M-Pesa'}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-data-mono font-extrabold text-sm text-on-surface">
                          KES {Number(tx.amount || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* Sender / Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-on-surface font-medium truncate max-w-[150px]">
                          {tx.notes?.includes('Sender:')
                            ? tx.notes.split('Sender:')[1].split('|')[0].trim()
                            : 'Parent / Guardian'}
                        </div>
                        {tx.mpesaPhoneNumber ? (
                          <div className="text-[11px] font-data-mono text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[13px] text-emerald-700">call</span>
                            <span>{tx.mpesaPhoneNumber}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-outline">No phone attached</span>
                        )}
                      </td>

                      {/* Forwarded SMS & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {rawSms ? (
                          <div className="space-y-1">
                            <p className="text-[11px] text-on-surface-variant line-clamp-2 italic bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/20 font-mono">
                              &quot;{rawSms}&quot;
                            </p>
                            <button
                              onClick={() => setAuditModalTx(tx)}
                              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Inspect Full Message</span>
                              <span className="material-symbols-outlined text-[12px]">visibility</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant line-clamp-2">
                            {tx.notes || 'Forwarded via Parent Portal'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>PENDING</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                            <span>CREDITED</span>
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                            <span className="material-symbols-outlined text-[12px]">close</span>
                            <span>REJECTED</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(tx)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs hover:shadow-xs disabled:opacity-50"
                              title="1-Click Approve and credit to fee ledger"
                            >
                              {isProcessing ? (
                                <>
                                  <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                                  <span>Crediting...</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                  <span>Approve</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setRejectionModalTx(tx);
                                setRejectionReason('Transaction reference not found in bank/M-Pesa settlement report');
                                setCustomRejectionReason('');
                              }}
                              disabled={isProcessing}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                              title="Reject forwarded transaction"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPaymentForReceipt(tx)}
                              className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="View or print official receipt"
                            >
                              <span className="material-symbols-outlined text-[14px]">print</span>
                              <span>Receipt</span>
                            </button>
                            <button
                              onClick={() => setAuditModalTx(tx)}
                              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg cursor-pointer"
                              title="Audit details"
                            >
                              <span className="material-symbols-outlined text-[16px]">info</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setAuditModalTx(tx)}
                              className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-bold rounded-lg cursor-pointer inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[13px]">info</span>
                              <span>Audit Reason</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectionModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full border border-outline-variant/30 shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <span className="material-symbols-outlined text-rose-700">warning</span>
                <span>Reject Forwarded Payment Submission</span>
              </div>
              <button
                onClick={() => setRejectionModalTx(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="p-3 rounded-xl bg-surface-container-low text-xs space-y-1.5 border border-outline-variant/20">
                <div className="flex justify-between font-bold text-on-surface">
                  <span>Transaction Code:</span>
                  <span className="font-mono text-primary">{rejectionModalTx.transactionReference}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Learner:</span>
                  <span className="font-semibold text-on-surface">{rejectionModalTx.studentName} ({rejectionModalTx.admissionNumber})</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Amount:</span>
                  <span className="font-mono font-bold text-on-surface">KES {Number(rejectionModalTx.amount).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  Select Reason for Rejection:
                </label>
                <div className="space-y-2">
                  {[
                    'Transaction reference not found in bank/M-Pesa settlement report',
                    'Amount claimed does not match actual received amount',
                    'Duplicate transaction reference previously processed',
                    'Incorrect learner selected by parent / Wrong invoice',
                    'Fraudulent or altered SMS confirmation text',
                    'CUSTOM',
                  ].map((preset) => (
                    <label
                      key={preset}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        rejectionReason === preset
                          ? 'border-rose-400 bg-rose-50 text-rose-950 font-semibold'
                          : 'border-outline-variant/30 hover:bg-surface-container-low text-on-surface'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        checked={rejectionReason === preset}
                        onChange={() => setRejectionReason(preset)}
                        className="mt-0.5 text-rose-700 focus:ring-rose-500"
                      />
                      <span>
                        {preset === 'CUSTOM' ? 'Other custom discrepancy note...' : preset}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {rejectionReason === 'CUSTOM' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Custom Discrepancy Note:
                  </label>
                  <textarea
                    rows={2}
                    value={customRejectionReason}
                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                    placeholder="Provide specific details why this transaction was rejected..."
                    className="w-full p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:border-rose-600"
                  />
                </div>
              )}

              <p className="text-[11px] text-on-surface-variant italic">
                Note: Rejecting will mark the transaction as failed and log the reason in the school financial audit ledger without touching the student&apos;s invoice balance.
              </p>
            </div>

            <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalTx(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={verifyingId === rejectionModalTx.id}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {verifyingId === rejectionModalTx.id ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL MESSAGE AUDIT & INSPECTION MODAL */}
      {auditModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full border border-outline-variant/30 shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-primary">mark_email_read</span>
                <span>Payment Confirmation Audit Record</span>
              </div>
              <button
                onClick={() => setAuditModalTx(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Learner & Transaction Overview */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Learner</span>
                  <div className="font-bold text-on-surface text-sm mt-0.5">{auditModalTx.studentName}</div>
                  <div className="text-on-surface-variant font-mono">Adm: {auditModalTx.admissionNumber}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Amount Paid</span>
                  <div className="font-bold text-primary text-base font-data-mono mt-0.5">
                    KES {Number(auditModalTx.amount).toLocaleString()}
                  </div>
                  <div className="text-on-surface-variant">Method: {auditModalTx.paymentMethod}</div>
                </div>
              </div>

              {/* Transaction Codes */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-on-surface">Confirmation Reference:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-data-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                      {auditModalTx.transactionReference}
                    </span>
                    <button
                      onClick={() => handleCopyCode(auditModalTx.transactionReference)}
                      className="text-on-surface-variant hover:text-primary p-0.5 cursor-pointer"
                      title="Copy reference code"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedCode === auditModalTx.transactionReference ? 'done' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Tracking / Receipt #:</span>
                  <span className="font-mono font-semibold text-on-surface">{auditModalTx.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Payment Date:</span>
                  <span>{auditModalTx.paymentDate || 'Not specified'}</span>
                </div>
                {auditModalTx.mpesaPhoneNumber && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Sender Phone:</span>
                    <span className="font-mono text-on-surface font-semibold">{auditModalTx.mpesaPhoneNumber}</span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant">
                  <span>Verification Status:</span>
                  <span className={`font-bold ${
                    auditModalTx.status === 'COMPLETED' ? 'text-emerald-700' :
                    auditModalTx.status === 'FAILED' ? 'text-rose-700' : 'text-amber-700'
                  }`}>
                    {auditModalTx.status}
                  </span>
                </div>
              </div>

              {/* Raw Forwarded SMS Text */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-on-surface mb-1">
                  Raw Forwarded Message / SMS Transcript:
                </label>
                <div className="p-3 rounded-xl bg-surface-container font-mono text-xs text-on-surface leading-relaxed border border-outline-variant/30 select-all whitespace-pre-wrap">
                  {extractSmsFromNotes(auditModalTx.notes) || auditModalTx.notes || 'No message body provided.'}
                </div>
              </div>

              {/* Full Notes */}
              {auditModalTx.notes && (
                <div>
                  <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">
                    Internal System Ledger Notes:
                  </span>
                  <p className="text-[11px] text-on-surface-variant bg-surface-container-low p-2 rounded-lg border border-outline-variant/20">
                    {auditModalTx.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between">
              {auditModalTx.status === 'PENDING' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const target = auditModalTx;
                      setAuditModalTx(null);
                      handleApprove(target);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Approve &amp; Credit</span>
                  </button>
                  <button
                    onClick={() => {
                      const target = auditModalTx;
                      setAuditModalTx(null);
                      setRejectionModalTx(target);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    <span>Reject</span>
                  </button>
                </div>
              ) : auditModalTx.status === 'COMPLETED' ? (
                <button
                  onClick={() => {
                    const target = auditModalTx;
                    setAuditModalTx(null);
                    setSelectedPaymentForReceipt(target);
                  }}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[14px]">print</span>
                  <span>View &amp; Print Receipt</span>
                </button>
              ) : (
                <span className="text-[11px] text-rose-700 font-bold">Transaction Rejected</span>
              )}

              <button
                type="button"
                onClick={() => setAuditModalTx(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT VIEW MODAL INTEGRATION */}
      {selectedPaymentForReceipt && (
        <ReceiptViewModal
          isOpen={!!selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
          paymentId={selectedPaymentForReceipt.id}
          initialReceipt={{
            receiptNumber: selectedPaymentForReceipt.receiptNumber,
            paymentDate: selectedPaymentForReceipt.paymentDate,
            amountPaid: selectedPaymentForReceipt.amount,
            paymentMethod: selectedPaymentForReceipt.paymentMethod,
            transactionReference: selectedPaymentForReceipt.transactionReference,
            studentName: selectedPaymentForReceipt.studentName,
            admissionNumber: selectedPaymentForReceipt.admissionNumber,
            schoolName: user?.schoolName || 'Grace Seeds School',
            servedBy: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Accounts Office',
          }}
        />
      )}

      {/* STUDENT FEE STATEMENT MODAL INTEGRATION */}
      {selectedStudentForStatement && (
        <FeeStatementModal
          isOpen={!!selectedStudentForStatement}
          onClose={() => setSelectedStudentForStatement(null)}
          studentId={selectedStudentForStatement.id}
          studentName={selectedStudentForStatement.name}
        />
      )}
    </div>
  );
};
