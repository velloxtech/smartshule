import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { OtherIncomeRecord, IncomeSourceType } from '../../types';
import { RecordIncomeModal } from '../modals/RecordIncomeModal';

const INCOME_SOURCE_CONFIG: Record<
  IncomeSourceType,
  { label: string; icon: string; bg: string; text: string }
> = {
  GOVERNMENT_CAPITATION_JSS: { label: 'MoE Junior Secondary Capitation (JSS)', icon: 'account_balance', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
  GOVERNMENT_CAPITATION_FPE: { label: 'MoE Free Primary Capitation (FPE)', icon: 'school', bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300' },
  UNIFORM_SALES: { label: 'School Uniform Store Sales', icon: 'checkroom', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300' },
  BUS_FACILITY_HIRE: { label: 'Bus & Facility / Field Hire', icon: 'directions_bus', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
  DONATIONS_GRANTS: { label: 'Donations & Sponsor Grants', icon: 'volunteer_activism', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300' },
  EXAM_REVISION_BOOKS: { label: 'Revision Books & Workbooks', icon: 'auto_stories', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300' },
  OTHER_INCOME: { label: 'Other Ancillary Inflows', icon: 'add_circle', bg: 'bg-gray-50 dark:bg-gray-900/50', text: 'text-gray-700 dark:text-gray-300' },
  FEES_COLLECTION: { label: 'Direct Student Tuition Fees', icon: 'payments', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
};

export const CapitationIncomeView: React.FC = () => {
  const [incomes, setIncomes] = useState<OtherIncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Notifications
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceiptForView, setSelectedReceiptForView] = useState<OtherIncomeRecord | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadIncomes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getOtherIncome({
        source: selectedSource !== 'ALL' ? selectedSource : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success && Array.isArray(res.data)) {
        setIncomes(res.data);
      } else {
        setError(res.message || 'Failed to fetch income records');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to income service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncomes();
  }, [selectedSource, startDate, endDate]);

  const handleIncomeRecorded = (newInc: OtherIncomeRecord) => {
    showNotification(`Income receipt ${newInc.receiptNumber} recorded successfully!`);
    loadIncomes();
  };

  const handleDeleteIncome = async (id: string, receiptNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete official receipt "${receiptNumber}"?`)) return;
    try {
      const res = await apiService.deleteOtherIncome(id);
      if (res.success) {
        showNotification(`Receipt ${receiptNumber} deleted.`);
        loadIncomes();
      }
    } catch (err: any) {
      alert(`Error deleting income record: ${err.message}`);
    }
  };

  // Filtered income records
  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mTitle = inc.title.toLowerCase().includes(q);
        const mFrom = inc.receivedFrom.toLowerCase().includes(q);
        const mRec = inc.receiptNumber.toLowerCase().includes(q);
        const mRef = inc.paymentReference.toLowerCase().includes(q);
        if (!mTitle && !mFrom && !mRec && !mRef) return false;
      }
      return true;
    });
  }, [incomes, searchQuery]);

  // Aggregate Metrics
  const totalCapitation = useMemo(() => {
    return incomes
      .filter((i) => i.source === 'GOVERNMENT_CAPITATION_JSS' || i.source === 'GOVERNMENT_CAPITATION_FPE')
      .reduce((acc, i) => acc + i.amount, 0);
  }, [incomes]);

  const totalUniformSales = useMemo(() => {
    return incomes.filter((i) => i.source === 'UNIFORM_SALES').reduce((acc, i) => acc + i.amount, 0);
  }, [incomes]);

  const totalFacilityHire = useMemo(() => {
    return incomes.filter((i) => i.source === 'BUS_FACILITY_HIRE').reduce((acc, i) => acc + i.amount, 0);
  }, [incomes]);

  const totalAllIncomes = useMemo(() => {
    return incomes.reduce((acc, i) => acc + i.amount, 0);
  }, [incomes]);

  // Export CSV
  const exportCSV = () => {
    if (!filteredIncomes.length) {
      alert('No receipts to export.');
      return;
    }
    const headers = ['Receipt No', 'Date', 'Revenue Source', 'Title / Narration', 'Received From', 'Payment Channel', 'Reference', 'Amount (KES)'];
    const rows = filteredIncomes.map((i) => [
      `"${i.receiptNumber}"`,
      `"${i.incomeDate}"`,
      `"${i.source}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.receivedFrom.replace(/"/g, '""')}"`,
      `"${i.paymentMethod}"`,
      `"${i.paymentReference}"`,
      i.amount,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartShule_Capitation_Income_Receipts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Capitation & Grants</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1 flex items-center gap-2.5">
            Government Capitation & Non-Fee Revenue
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300/40">
              Money In
            </span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            NEMIS UPI Enrolment Subsidies, MoE Free Primary & Junior Secondary Grants, Uniform Store & Facility Hire
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Record Official Receipt (OR)</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Receipts</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Non-Fee Inflow */}
        <div className="bg-surface-container-lowest border border-emerald-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Total Non-Fee Inflow
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {totalAllIncomes.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant">
            <span>{incomes.length} Official General Receipts</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        </div>

        {/* Government Capitation Grants */}
        <div className="bg-surface-container-lowest border border-blue-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                MoE Capitation Grants
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {totalCapitation.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">account_balance</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant flex items-center gap-1">
            <span className="font-semibold text-blue-700">JSS + FPE</span>
            <span>NEMIS UPI Disbursed</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
        </div>

        {/* Uniform Store Sales */}
        <div className="bg-surface-container-lowest border border-purple-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                Uniform Store Sales
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {totalUniformSales.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">checkroom</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant">
            <span>Uniforms, sweaters & badges</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600"></div>
        </div>

        {/* Facility & Bus Hire */}
        <div className="bg-surface-container-lowest border border-amber-500/20 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Facility & Bus Hire
              </p>
              <h3 className="text-2xl font-black text-on-surface mt-1">
                KES {totalFacilityHire.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">directions_bus</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-on-surface-variant">
            <span>Weekend bus hire & hall rentals</span>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600"></div>
        </div>
      </div>

      {/* NEMIS Capitation Information Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px] text-emerald-200">assured_workload</span>
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">MoE Capitation Statutory Guidelines</h3>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
              Junior Secondary School (JSS) learners receive KES 15,040 annually per learner, split into 50% Term 1, 30% Term 2, and 20% Term 3. Direct government disbursements are tied to verified NEMIS UPI student registrations.
            </p>
          </div>
        </div>
        <div className="bg-white/10 rounded-xl px-4 py-3 border border-white/20 text-center shrink-0">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-200">Statutory Rate</div>
          <div className="text-lg font-black font-mono">KES 15,040</div>
          <div className="text-[10px] text-emerald-100/80">Per JSS Learner / Year</div>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedSource('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
            selectedSource === 'ALL'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
              : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
          }`}
        >
          All Inflow Streams
        </button>

        {[
          'GOVERNMENT_CAPITATION_JSS',
          'GOVERNMENT_CAPITATION_FPE',
          'UNIFORM_SALES',
          'BUS_FACILITY_HIRE',
          'DONATIONS_GRANTS',
        ].map((src) => {
          const cfg = INCOME_SOURCE_CONFIG[src as IncomeSourceType];
          const isSelected = selectedSource === src;
          return (
            <button
              key={src}
              onClick={() => setSelectedSource(isSelected ? 'ALL' : src)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Receipts Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs space-y-4">
        {/* Table Top Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipts by receipt #, remitter, or narration..."
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-on-surface focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
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

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-emerald-600">progress_activity</span>
              <span>Loading official receipts...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error text-sm font-medium">{error}</div>
          ) : filteredIncomes.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm space-y-2">
              <span className="material-symbols-outlined text-[36px] text-outline-variant">receipt</span>
              <p className="font-semibold">No miscellaneous receipts found.</p>
              <button
                onClick={() => setIsRecordModalOpen(true)}
                className="mt-2 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Record First Receipt
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 border-b border-outline-variant/30 text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Revenue Stream</th>
                  <th className="py-3 px-4">Narration / Purpose</th>
                  <th className="py-3 px-4">Received From</th>
                  <th className="py-3 px-4">Channel & Ref</th>
                  <th className="py-3 px-4 text-right">Amount (KES)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredIncomes.map((inc) => {
                  const cfg = INCOME_SOURCE_CONFIG[inc.source] || INCOME_SOURCE_CONFIG.OTHER_INCOME;
                  return (
                    <tr key={inc.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                        {inc.receiptNumber}
                      </td>

                      <td className="py-3 px-4 text-on-surface font-mono whitespace-nowrap">
                        {inc.incomeDate}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-on-surface max-w-xs">
                        <div className="truncate" title={inc.title}>{inc.title}</div>
                        {inc.notes && (
                          <div className="text-[11px] text-on-surface-variant truncate font-normal mt-0.5">
                            {inc.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-on-surface whitespace-nowrap font-medium">
                        {inc.receivedFrom}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-[11px] font-bold text-on-surface">{inc.paymentMethod}</div>
                        <div className="text-[10px] font-mono text-on-surface-variant">{inc.paymentReference}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-black font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        +KES {inc.amount.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedReceiptForView(inc)}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="View Official Receipt"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          <button
                            onClick={() => handleDeleteIncome(inc.id, inc.receiptNumber)}
                            className="p-1 text-on-surface-variant hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Receipt"
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

      {/* Record Income Modal */}
      <RecordIncomeModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onIncomeRecorded={handleIncomeRecorded}
      />

      {/* View Printable Receipt Modal */}
      {selectedReceiptForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-outline-variant/30">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-[24px]">receipt</span>
                <h3 className="font-bold text-base text-on-surface">School Official Receipt (OR)</h3>
              </div>
              <button
                onClick={() => setSelectedReceiptForView(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-3 text-xs">
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Receipt Number:</span>
                <span className="font-mono font-bold text-emerald-700">{selectedReceiptForView.receiptNumber}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Receipt Date:</span>
                <span className="font-bold text-on-surface">{selectedReceiptForView.incomeDate}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Revenue Stream:</span>
                <span className="font-bold text-on-surface">{selectedReceiptForView.source}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Received From:</span>
                <span className="font-bold text-on-surface">{selectedReceiptForView.receivedFrom}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Receiving Channel:</span>
                <span className="font-bold text-on-surface">{selectedReceiptForView.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Reference / Slip:</span>
                <span className="font-mono font-bold text-on-surface">{selectedReceiptForView.paymentReference}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/20 pb-2">
                <span className="text-on-surface-variant">Amount Received:</span>
                <span className="font-mono font-black text-base text-emerald-700">
                  KES {selectedReceiptForView.amount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block mb-1">Purpose / Narration:</span>
                <p className="p-2 rounded bg-surface-container text-on-surface font-medium">
                  {selectedReceiptForView.title}
                  {selectedReceiptForView.notes ? ` - ${selectedReceiptForView.notes}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedReceiptForView(null)}
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
