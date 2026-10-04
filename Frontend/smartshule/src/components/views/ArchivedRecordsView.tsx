import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DeletedStudentRecord, UserRole } from '../../types';
import { resolveGradeName, resolveStreamName } from '../../utils/formatters';

interface ArchivedRecordsViewProps {
  onNavigateTab?: (tabId: string) => void;
  onRefreshStudents?: () => void | Promise<void>;
}

type ArchiveSubTab = 'accounts' | 'learners' | 'finances' | 'academic' | 'attendance' | 'welfare';

export const ArchivedRecordsView: React.FC<ArchivedRecordsViewProps> = ({
  onNavigateTab,
  onRefreshStudents,
}) => {
  const { user: currentUser } = useAuth();
  const [archivedRecords, setArchivedRecords] = useState<DeletedStudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ArchiveSubTab>('accounts');
  const [search, setSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'ALL' | 'PARENT' | 'STUDENT'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<DeletedStudentRecord | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchArchivedRecords = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiService.getDeletedStudents({ schoolId: currentUser?.schoolId });
      if (res.success && Array.isArray(res.data)) {
        setArchivedRecords(res.data);
      } else {
        setArchivedRecords([]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load archived records from database' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedRecords();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Restore Student & Parent Accounts
  const handleRestore = async (record: DeletedStudentRecord) => {
    if (
      !window.confirm(
        `Are you sure you want to restore ${record.fullName} (Adm: ${record.admissionNumber}) and associated parent account(s) back to active status?`
      )
    ) {
      return;
    }

    setRestoringId(record.id);
    try {
      const res = await apiService.restoreStudent(record.id);
      if (res.success) {
        showToast('success', res.message || `Successfully restored ${record.fullName} and parent account(s).`);
        if (selectedRecord?.id === record.id) setSelectedRecord(null);
        await fetchArchivedRecords();
        await onRefreshStudents?.();
      } else {
        showToast('error', res.message || 'Failed to restore student');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error occurred during account restoration');
    } finally {
      setRestoringId(null);
    }
  };

  // Export full archive as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(archivedRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SmartShule_Archived_Accounts_and_Data_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('success', 'Full archived records snapshot downloaded as JSON');
  };

  // Flattened Archived Accounts List (Both Students and Archived Parents)
  const allArchivedAccounts = useMemo(() => {
    const list: Array<{
      id: string;
      archiveId: string;
      accountType: 'STUDENT' | 'PARENT';
      fullName: string;
      email?: string;
      phone?: string;
      identifier: string; // Adm No for student, National ID for parent
      relationshipOrGrade: string;
      deletedAt: string;
      reason?: string;
      parentStatus?: string;
      record: DeletedStudentRecord;
    }> = [];

    for (const rec of archivedRecords) {
      // 1. Add Student Account
      list.push({
        id: rec.studentId,
        archiveId: rec.id,
        accountType: 'STUDENT',
        fullName: rec.fullName,
        email: rec.studentData?.email || 'N/A',
        phone: rec.studentData?.phone || 'N/A',
        identifier: `Adm #${rec.admissionNumber}`,
        relationshipOrGrade: resolveGradeName(rec.gradeLevel) || 'Student',
        deletedAt: rec.deletedAt,
        reason: rec.reason,
        record: rec,
      });

      // 2. Add Parent / Guardian Accounts
      const guardians = rec.linkedData?.guardians || [];
      for (const g of guardians) {
        const pUser = g.parentUser;
        const parentName = pUser?.fullName || (pUser ? `${pUser.firstName} ${pUser.lastName}` : `Guardian of ${rec.fullName}`);
        list.push({
          id: g.userId || g.id,
          archiveId: rec.id,
          accountType: 'PARENT',
          fullName: parentName,
          email: pUser?.email || 'N/A',
          phone: pUser?.phone || g.emergencyContact || 'N/A',
          identifier: g.nationalId ? `ID: ${g.nationalId}` : 'ID: Not specified',
          relationshipOrGrade: `${g.relationship || 'Guardian'} of ${rec.fullName} (${rec.admissionNumber})`,
          deletedAt: rec.deletedAt,
          reason: rec.reason,
          parentStatus: g.willArchiveParentAccount ? 'Archived from Active Directory' : 'Retained (Other Active Children)',
          record: rec,
        });
      }
    }

    return list;
  }, [archivedRecords]);

  // Flattened Preserved Financial Invoices
  const allArchivedInvoices = useMemo(() => {
    const list: Array<any> = [];
    for (const rec of archivedRecords) {
      const invs = rec.linkedData?.invoices || [];
      for (const inv of invs) {
        list.push({
          ...inv,
          studentName: rec.fullName,
          admissionNumber: rec.admissionNumber,
          deletedAt: rec.deletedAt,
          archiveId: rec.id,
          record: rec,
        });
      }
    }
    return list;
  }, [archivedRecords]);

  // Aggregated Summary KPIs
  const totalArchivedLearners = archivedRecords.length;
  const totalArchivedParents = allArchivedAccounts.filter((a) => a.accountType === 'PARENT').length;
  const totalPreservedInvoices = allArchivedInvoices.length;
  const totalClearedDebt = archivedRecords.reduce((sum, r) => {
    const pw = r.pendingWorkCleared || ({} as any);
    return sum + (pw.clearedInvoiceBalances || 0) + (pw.clearedLunchBalances || 0);
  }, 0);
  const totalAssessmentsPreserved = archivedRecords.reduce((sum, r) => {
    const ld = r.linkedData || ({} as any);
    return sum + (ld.formativeAssessments?.length || 0) + (ld.summativeAssessments?.length || 0);
  }, 0);

  // Filtered Accounts
  const filteredAccounts = allArchivedAccounts.filter((acc) => {
    if (accountTypeFilter !== 'ALL' && acc.accountType !== accountTypeFilter) return false;
    const q = search.toLowerCase();
    return (
      acc.fullName.toLowerCase().includes(q) ||
      (acc.email && acc.email.toLowerCase().includes(q)) ||
      (acc.phone && acc.phone.includes(q)) ||
      acc.identifier.toLowerCase().includes(q) ||
      acc.relationshipOrGrade.toLowerCase().includes(q) ||
      (acc.reason && acc.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <span>Administration</span>
            <span>/</span>
            <span className="text-[#7a1228] font-bold">Archived Accounts & Data</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface flex items-center gap-2">
              <span>Archived Accounts & Preserved Data</span>
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">inventory_2</span>
              <span>Isolated Archive Table</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Complete administrative repository of archived parent & learner accounts, historical fee invoices, CBC marks, attendance records, and cleared debts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={loading || archivedRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container border border-outline-variant/30 rounded-xl text-xs font-bold text-on-surface shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">download</span>
            <span>Export Archive (JSON)</span>
          </button>

          <button
            type="button"
            onClick={fetchArchivedRecords}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7a1228] hover:bg-[#600e1f] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Refresh Archive</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Archived Learners</span>
            <span className="material-symbols-outlined text-[#7a1228] text-[20px]">school</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-on-surface">{totalArchivedLearners}</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Isolated learner snapshots</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Parent Accounts</span>
            <span className="material-symbols-outlined text-blue-600 text-[20px]">diversity_3</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-700">{totalArchivedParents}</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Guardian & parent logins</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cleared Fee Debt</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              KES {totalClearedDebt.toLocaleString()}
            </span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Arrears cleared on delete</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">Preserved Invoices</span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">receipt_long</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-700">{totalPreservedInvoices}</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Ledgers & audit vouchers</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-bold uppercase tracking-wider">CBC Marks Preserved</span>
            <span className="material-symbols-outlined text-purple-600 text-[20px]">assignment_turned_in</span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-700">{totalAssessmentsPreserved}</span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">Formative & Summative</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-xs">
        <div className="p-3 bg-surface-container-low border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'accounts'
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
              <span>Archived Accounts ({allArchivedAccounts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('learners')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'learners'
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">school</span>
              <span>Learners Snapshots ({archivedRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('finances')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'finances'
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
              <span>Financial Ledgers ({allArchivedInvoices.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('academic')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'academic'
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">assignment</span>
              <span>CBC & Marks ({totalAssessmentsPreserved})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>Attendance History</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('welfare')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'welfare'
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">rate_review</span>
              <span>Concerns & eDiary</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[17px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search archived data..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Tab 1: Archived Accounts */}
        {activeTab === 'accounts' && (
          <div className="p-4 space-y-4">
            {/* Filter by Type */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-on-surface-variant font-medium">Filter Accounts:</span>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  accountTypeFilter === 'ALL'
                    ? 'bg-on-surface text-surface'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                All Accounts ({allArchivedAccounts.length})
              </button>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('PARENT')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  accountTypeFilter === 'PARENT'
                    ? 'bg-blue-600 text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Parents / Guardians ({totalArchivedParents})
              </button>
              <button
                type="button"
                onClick={() => setAccountTypeFilter('STUDENT')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  accountTypeFilter === 'STUDENT'
                    ? 'bg-[#7a1228] text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Learners ({totalArchivedLearners})
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] animate-spin text-primary mb-2">
                  progress_activity
                </span>
                <p className="text-xs font-semibold">Loading archived accounts...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-16 text-center text-on-surface-variant bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-2">
                  account_box
                </span>
                <p className="text-sm font-bold text-on-surface">No Archived Accounts Found</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Deleted parent user accounts and student profiles will appear here with complete archived credentials and restoration controls.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-bold">
                      <th className="py-3 px-4">Account Holder</th>
                      <th className="py-3 px-4">Account Type</th>
                      <th className="py-3 px-4">Identifier / ID</th>
                      <th className="py-3 px-4">Associated Learner / Grade</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Date Archived</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {filteredAccounts.map((acc, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs text-white shrink-0 ${
                              acc.accountType === 'PARENT' ? 'bg-blue-600' : 'bg-[#7a1228]'
                            }`}>
                              {acc.fullName?.[0] || 'U'}
                            </div>
                            <div>
                              <span className="font-bold text-on-surface block leading-tight">{acc.fullName}</span>
                              {acc.reason && (
                                <span className="text-[10px] text-on-surface-variant/80 italic">
                                  Reason: {acc.reason}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            acc.accountType === 'PARENT'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            <span className="material-symbols-outlined text-[13px]">
                              {acc.accountType === 'PARENT' ? 'diversity_3' : 'school'}
                            </span>
                            {acc.accountType}
                          </span>
                          {acc.parentStatus && (
                            <span className="block text-[9.5px] text-on-surface-variant mt-0.5">
                              {acc.parentStatus}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-on-surface">
                          {acc.identifier}
                        </td>

                        <td className="py-3 px-4 text-on-surface-variant font-medium">
                          {acc.relationshipOrGrade}
                        </td>

                        <td className="py-3 px-4 text-[11px]">
                          <div>{acc.phone || 'No phone'}</div>
                          <div className="text-on-surface-variant text-[10px]">{acc.email || 'No email'}</div>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-on-surface-variant">
                          {acc.deletedAt ? new Date(acc.deletedAt).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(acc.record)}
                              className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Inspect Data
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestore(acc.record)}
                              disabled={restoringId === acc.archiveId}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {restoringId === acc.archiveId ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Learners Snapshots */}
        {activeTab === 'learners' && (
          <div className="p-4 space-y-3">
            {archivedRecords.map((record) => {
              const linked = record.linkedData || ({} as any);
              const pending = record.pendingWorkCleared || ({} as any);

              return (
                <div key={record.id} className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-on-surface">{record.fullName}</h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">
                        Adm #{record.admissionNumber}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold">
                        {resolveGradeName(record.gradeLevel)} {record.streamName ? `(${resolveStreamName(record.streamId, record.streamName)})` : ''}
                      </span>
                      {record.upiNumber && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          UPI: {record.upiNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1.5 flex-wrap">
                      <span>Archived: {new Date(record.deletedAt).toLocaleDateString()}</span>
                      {record.reason && <span>Reason: <em className="text-on-surface">{record.reason}</em></span>}
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        KES {(pending.clearedInvoiceBalances || 0) + (pending.clearedLunchBalances || 0)} Cleared Debt
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-on-surface rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      View All Linked Records
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestore(record)}
                      disabled={restoringId === record.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      Restore Learner & Parents
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Financial Ledgers */}
        {activeTab === 'finances' && (
          <div className="p-4 space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm">Archived Financial Invoices & Ledgers</span>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Historical fee invoices and receipts preserved from deleted learners. All pending balances were cleared upon deletion to prevent ghost debts.
                </p>
              </div>
              <span className="font-bold text-base text-emerald-900 font-mono">
                {allArchivedInvoices.length} Invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/20 text-on-surface-variant font-bold">
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Learner</th>
                    <th className="py-2.5 px-3">Amount Billed</th>
                    <th className="py-2.5 px-3">Amount Paid</th>
                    <th className="py-2.5 px-3">Archived Balance</th>
                    <th className="py-2.5 px-3">Archived Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {allArchivedInvoices.map((inv, i) => (
                    <tr key={i} className="hover:bg-surface-container-low/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-primary">#{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3">{inv.studentName} ({inv.admissionNumber})</td>
                      <td className="py-2.5 px-3">KES {(inv.amountBilled || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-emerald-700 font-semibold">KES {(inv.amountPaid || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-bold text-rose-700">KES {(inv.balance || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-surface-container-high text-on-surface-variant font-bold">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(inv.record)}
                          className="px-2 py-1 bg-surface-container text-on-surface rounded text-[11px] font-semibold hover:bg-surface-container-high cursor-pointer"
                        >
                          View Snapshot
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Academic & CBC Records */}
        {activeTab === 'academic' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedRecords.map((r) => {
                const ld = r.linkedData || ({} as any);
                const formatives = ld.formativeAssessments || [];
                const summatives = ld.summativeAssessments || [];
                const reportCards = ld.reportCards || [];

                return (
                  <div key={r.id} className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                      <div>
                        <h4 className="font-bold text-sm text-on-surface">{r.fullName}</h4>
                        <span className="text-xs text-on-surface-variant">Adm #{r.admissionNumber} · {resolveGradeName(r.gradeLevel)}</span>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                        {formatives.length + summatives.length} Assessment Entries
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-on-surface-variant">
                      <div className="flex justify-between">
                        <span>Formative Assessments:</span>
                        <strong className="text-on-surface">{formatives.length} records</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Summative Exams:</span>
                        <strong className="text-on-surface">{summatives.length} records</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>CBC Report Cards:</span>
                        <strong className="text-on-surface">{reportCards.length} generated</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedRecord(r)}
                      className="w-full py-1.5 bg-surface-container-low hover:bg-surface-container text-primary font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Inspect CBC Marks & Rubrics
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Attendance Registers */}
        {activeTab === 'attendance' && (
          <div className="p-4 space-y-3">
            {archivedRecords.map((r) => {
              const ld = r.linkedData || ({} as any);
              const attendance = ld.attendanceRecords || [];

              return (
                <div key={r.id} className="p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">{r.fullName}</h4>
                    <span className="text-xs text-on-surface-variant">Adm #{r.admissionNumber} · Preserved {attendance.length} daily marked entries</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(r)}
                    className="px-3 py-1.5 bg-surface-container text-xs font-semibold rounded-lg hover:bg-surface-container-high cursor-pointer"
                  >
                    View Attendance
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 6: Welfare, Concerns & eDiary */}
        {activeTab === 'welfare' && (
          <div className="p-4 space-y-3">
            {archivedRecords.map((r) => {
              const ld = r.linkedData || ({} as any);
              const complaints = ld.complaints || [];
              const ediary = ld.ediaryEntries || [];
              const helpRequests = ld.helpRequests || [];

              return (
                <div key={r.id} className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">{r.fullName}</h4>
                      <span className="text-xs text-on-surface-variant">Adm #{r.admissionNumber}</span>
                    </div>
                    <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Resolved & Cleared
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-outline-variant/15">
                    <div>
                      <span className="text-on-surface-variant block">Concerns:</span>
                      <strong className="text-on-surface">{complaints.length} preserved & resolved</strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">Parent Help Requests:</span>
                      <strong className="text-on-surface">{helpRequests.length} closed</strong>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block">eDiary Homework:</span>
                      <strong className="text-on-surface">{ediary.length} items</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Inspection Drawer / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 text-white font-bold flex items-center justify-center border border-white/20">
                  {selectedRecord.firstName?.[0] || 'L'}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {selectedRecord.fullName} (Adm #{selectedRecord.admissionNumber})
                  </h3>
                  <p className="text-xs text-rose-100">
                    {resolveGradeName(selectedRecord.gradeLevel)} {selectedRecord.streamName ? `(${resolveStreamName(selectedRecord.streamId, selectedRecord.streamName)})` : ''} · Archived on {new Date(selectedRecord.deletedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Deletion Summary Banner */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                <span className="font-bold block text-sm mb-0.5">Archive Reason & Cleared Obligations</span>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {selectedRecord.reason ? `Reason: ${selectedRecord.reason}. ` : ''}
                  {selectedRecord.pendingWorkCleared?.summaryText || 'All operational ties cleared.'}
                </p>
              </div>

              {/* Parents & Guardians Section */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">diversity_3</span>
                  Linked Parents & Guardian Accounts ({selectedRecord.linkedData?.guardians?.length || 0})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(selectedRecord.linkedData?.guardians || []).map((g: any, gi: number) => {
                    const pUser = g.parentUser;
                    const pName = pUser?.fullName || (pUser ? `${pUser.firstName} ${pUser.lastName}` : 'Guardian');
                    return (
                      <div key={gi} className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-on-surface text-xs">{pName}</strong>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 uppercase">
                            {g.relationship || 'Guardian'}
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant space-y-0.5">
                          <div>Phone: <strong className="text-on-surface">{pUser?.phone || g.emergencyContact || 'N/A'}</strong></div>
                          <div>Email: <strong className="text-on-surface">{pUser?.email || 'N/A'}</strong></div>
                          {g.nationalId && <div>National ID: <strong className="text-on-surface">{g.nationalId}</strong></div>}
                        </div>
                        <span className={`inline-block text-[9.5px] px-1.5 py-0.5 rounded font-semibold ${
                          g.willArchiveParentAccount ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {g.willArchiveParentAccount ? 'User Account Cleared from Directory' : 'User Account Retained (Other Children)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Raw JSON Snapshot Explorer */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
                    Complete Archive JSON Snapshot (Preserved in deleted_students table)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedRecord, null, 2));
                      showToast('success', 'JSON snapshot copied to clipboard');
                    }}
                    className="text-[11px] px-2 py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface font-semibold cursor-pointer"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="max-h-60 overflow-y-auto bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20 font-mono text-[10.5px] text-on-surface leading-tight">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Snapshot
              </button>

              <button
                type="button"
                onClick={() => handleRestore(selectedRecord)}
                disabled={restoringId === selectedRecord.id}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {restoringId === selectedRecord.id ? 'Restoring Accounts...' : 'Restore Learner & Parent Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
