import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { SystemAuditLog, SystemLogStats, SystemLogLevel, SystemLogCategory, SystemLogStatus } from '../../types';

export const SystemLogsView: React.FC = () => {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [stats, setStats] = useState<SystemLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Inspection modal
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getSystemLogs({
        search: search.trim() || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        level: levelFilter !== 'ALL' ? levelFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
        page,
        limit,
      });

      if (res.success && res.data) {
        setLogs(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load system logs' });
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, levelFilter, statusFilter, startDate, endDate, page, limit]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.getSystemLogStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      // Non-critical background fetch
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      await apiService.downloadSystemLogsCsv({
        search: search.trim() || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        level: levelFilter !== 'ALL' ? levelFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
      });
      setFeedback({ type: 'success', message: 'System audit logs downloaded successfully (.csv)' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to download logs' });
    } finally {
      setDownloading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setLevelFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return iso;
    }
  };

  const getLevelBadge = (level: SystemLogLevel) => {
    switch (level) {
      case 'AUDIT':
        return { label: 'AUDIT', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'verified_user' };
      case 'INFO':
        return { label: 'INFO', bg: 'bg-sky-50 text-sky-800 border-sky-200', icon: 'info' };
      case 'WARN':
        return { label: 'WARN', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'warning' };
      case 'ERROR':
        return { label: 'ERROR', bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: 'error' };
      default:
        return { label: level, bg: 'bg-slate-50 text-slate-800 border-slate-200', icon: 'help' };
    }
  };

  const getCategoryBadge = (cat: SystemLogCategory) => {
    switch (cat) {
      case 'AUTH':
        return { label: 'AUTH', bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: 'vpn_key' };
      case 'FINANCE':
        return { label: 'FINANCE', bg: 'bg-amber-50 text-amber-900 border-amber-200', icon: 'payments' };
      case 'STUDENTS':
        return { label: 'STUDENTS', bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: 'school' };
      case 'ACADEMICS':
        return { label: 'ACADEMICS', bg: 'bg-teal-50 text-teal-800 border-teal-200', icon: 'menu_book' };
      case 'COMPLAINTS':
        return { label: 'COMPLAINTS', bg: 'bg-orange-50 text-orange-800 border-orange-200', icon: 'campaign' };
      case 'COMMUNICATION':
        return { label: 'COMMUNICATION', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'chat' };
      case 'SYSTEM':
      default:
        return { label: 'SYSTEM', bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: 'settings' };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Administration</span>
            <span>/</span>
            <span>Governance & Compliance</span>
            <span>/</span>
            <span className="text-primary font-semibold">System Audit Trail</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              System Audit Logs & Transparency
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              <span>Tamper-Evident Record</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Complete audit trail of system operations, payment processing, student admissions, user access, and administrative actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={downloading || total === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Download audit logs as CSV spreadsheet"
          >
            <span className="material-symbols-outlined text-[17px]">
              {downloading ? 'sync' : 'download'}
            </span>
            <span>{downloading ? 'Exporting CSV...' : 'Download Logs (CSV)'}</span>
          </button>
          <button
            onClick={() => {
              fetchLogs();
              fetchStats();
            }}
            disabled={loading}
            title="Refresh logs list"
            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              {loading ? 'sync' : 'refresh'}
            </span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs border animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-error-container text-on-error-container border-error/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">manage_search</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Log Entries
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {stats?.total ?? total}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">payments</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Financial Actions
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {stats?.byCategory?.['FINANCE'] ?? 0}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">shield_person</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Auth & Security
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {stats?.byCategory?.['AUTH'] ?? 0}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Warnings & Errors
            </div>
            <div className="text-xl font-bold text-rose-700 mt-0.5">
              {(stats?.byLevel?.['WARN'] || 0) + (stats?.byLevel?.['ERROR'] || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search action, details, actor, IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="AUTH">AUTH</option>
              <option value="FINANCE">FINANCE</option>
              <option value="STUDENTS">STUDENTS</option>
              <option value="ACADEMICS">ACADEMICS</option>
              <option value="COMPLAINTS">COMPLAINTS</option>
              <option value="COMMUNICATION">COMMUNICATION</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          {/* Level */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white cursor-pointer"
            >
              <option value="ALL">All Levels</option>
              <option value="AUDIT">AUDIT</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center">
            <button
              onClick={handleClearFilters}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Date Range Sub-row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">calendar_today</span>
            Date Range:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {(startDate || endDate || search || categoryFilter !== 'ALL' || levelFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <span className="text-[11px] font-semibold text-primary ml-auto">
              Filtered ({total} results found)
            </span>
          )}
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Level</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Action & Details</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[32px] animate-spin text-primary">
                        progress_activity
                      </span>
                      <span>Loading system audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <span className="material-symbols-outlined text-[40px] text-slate-300">
                        receipt_long
                      </span>
                      <span className="font-semibold text-slate-700">No Audit Logs Found</span>
                      <p className="text-xs text-slate-500">
                        No system operations matched the specified filter criteria. Adjust your search or date range.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const lvl = getLevelBadge(log.level);
                  const cat = getCategoryBadge(log.category);
                  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatDateTime(log.timestamp)}
                      </td>

                      {/* Level */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${lvl.bg}`}>
                          <span className="material-symbols-outlined text-[12px]">{lvl.icon}</span>
                          <span>{lvl.label}</span>
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.bg}`}>
                          <span className="material-symbols-outlined text-[12px]">{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </td>

                      {/* Action & Details */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-semibold text-slate-900 font-mono text-[11px]">
                          {log.action}
                        </div>
                        <div className="text-slate-600 truncate mt-0.5 text-xs" title={log.details}>
                          {log.details}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 truncate max-w-[150px]" title={log.actorEmail || 'System / Auto'}>
                          {log.actorEmail || 'System Auto'}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {log.actorRole && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono">
                              {log.actorRole}
                            </span>
                          )}
                          {log.ipAddress && (
                            <span className="font-mono text-slate-400">
                              {log.ipAddress}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            <span>SUCCESS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                            <span className="material-symbols-outlined text-[12px]">error</span>
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>

                      {/* View Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>{hasMeta ? 'Inspect' : 'View'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries per page</span>
            <span className="text-slate-400">|</span>
            <span>
              Showing {total > 0 ? (page - 1) * limit + 1 : 0} to{' '}
              {Math.min(page * limit, total)} of {total} entries
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2 py-1 text-slate-700 font-semibold text-xs">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Metadata Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">manage_search</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">System Audit Record Details</h3>
                  <div className="text-[11px] text-slate-500 font-mono">ID: {selectedLog.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Timestamp</span>
                  <span className="font-mono font-medium text-slate-800">{formatDateTime(selectedLog.timestamp)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Level</span>
                  <span className="font-semibold text-slate-800">{selectedLog.level}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Category</span>
                  <span className="font-semibold text-slate-800">{selectedLog.category}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Action Code</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Status</span>
                  <span className={selectedLog.status === 'SUCCESS' ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">IP Address</span>
                  <span className="font-mono text-slate-800">{selectedLog.ipAddress || 'Internal / N/A'}</span>
                </div>
              </div>

              {/* Actor Details */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Operator / Actor</span>
                <div className="font-medium text-slate-900">{selectedLog.actorEmail || 'System Automated Job'}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  User ID: {selectedLog.actorUserId || 'N/A'} · Role: {selectedLog.actorRole || 'SYSTEM'}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700 block">Event Summary & Description</span>
                <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-800 font-sans leading-relaxed">
                  {selectedLog.details}
                </div>
              </div>

              {/* JSON Metadata Payload */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Structured Event Metadata (JSON)</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0
                      ? `${Object.keys(selectedLog.metadata).length} keys`
                      : 'Empty'}
                  </span>
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56 leading-normal">
                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0
                    ? JSON.stringify(selectedLog.metadata, null, 2)
                    : '// No additional metadata payload for this event'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
