import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DeletedStudentRecord, UserRole } from '../../types';
import { getRoleDisplayName, getRoleBadgeStyle } from '../../utils/rbac';
import { resolveGradeName, resolveStreamName } from '../../utils/formatters';

interface StandaloneArchivedRecordsPageProps {
  onBackToPortal: () => void;
  onRefreshStudents?: () => void | Promise<void>;
}

type ArchiveSubTab = 'accounts' | 'learners' | 'finances' | 'academic' | 'attendance' | 'welfare';

export const StandaloneArchivedRecordsPage: React.FC<StandaloneArchivedRecordsPageProps> = ({
  onBackToPortal,
  onRefreshStudents,
}) => {
  const { user: currentUser } = useAuth();
  const [archivedRecords, setArchivedRecords] = useState<DeletedStudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ArchiveSubTab>('accounts');
  const [search, setSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'ALL' | 'PARENT' | 'STUDENT'>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<DeletedStudentRecord | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const roleBadge = getRoleBadgeStyle(currentUser?.role);

  const isAuthorized = currentUser?.role && [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
  ].includes(currentUser.role);

  const fetchArchivedRecords = async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
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

  // Open in new window
  const handleOpenInNewWindow = () => {
    window.open(`${window.location.origin}${window.location.pathname}#/archive`, '_blank');
  };

  // Print Report
  const handlePrint = () => {
    window.print();
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
      identifier: string;
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
        relationshipOrGrade: rec.gradeLevel || 'Student',
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

  // Available grade options
  const gradeOptions = useMemo(() => {
    const grades = new Set<string>();
    for (const rec of archivedRecords) {
      if (rec.gradeLevel) grades.add(rec.gradeLevel);
    }
    return Array.from(grades);
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
  const filteredAccounts = useMemo(() => {
    return allArchivedAccounts.filter((acc) => {
      if (accountTypeFilter !== 'ALL' && acc.accountType !== accountTypeFilter) return false;
      if (gradeFilter !== 'ALL' && acc.record.gradeLevel !== gradeFilter) return false;
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
  }, [allArchivedAccounts, accountTypeFilter, gradeFilter, search]);

  // Filtered Learners
  const filteredLearners = useMemo(() => {
    return archivedRecords.filter((rec) => {
      if (gradeFilter !== 'ALL' && rec.gradeLevel !== gradeFilter) return false;
      const q = search.toLowerCase();
      return (
        rec.fullName.toLowerCase().includes(q) ||
        rec.admissionNumber.toLowerCase().includes(q) ||
        (rec.upiNumber && rec.upiNumber.toLowerCase().includes(q)) ||
        (rec.gradeLevel && rec.gradeLevel.toLowerCase().includes(q)) ||
        (rec.reason && rec.reason.toLowerCase().includes(q)) ||
        (rec.deletedBy && rec.deletedBy.toLowerCase().includes(q))
      );
    });
  }, [archivedRecords, gradeFilter, search]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 text-rose-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">lock</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600">
            The Enterprise Archive Vault is strictly restricted to School Administrators, Directors, and the Head Teacher.
          </p>
          <button
            type="button"
            onClick={onBackToPortal}
            className="w-full py-2.5 bg-[#800000] text-white rounded-xl text-xs font-bold hover:bg-[#600000] transition-colors cursor-pointer"
          >
            Return to School Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-rose-900 selection:text-white">
      {/* Top Standalone Header Bar */}
      <header className="sticky top-0 z-40 bg-[#800000] text-white shadow-md border-b border-[#600000] print:hidden">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left Brand & Navigation Back */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToPortal}
              title="Return to Main Portal Dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Portal</span>
            </button>

            <div className="h-6 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[24px] text-amber-300">inventory_2</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    {currentUser?.schoolName || 'Grace Seeds School'}
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-bold tracking-wide uppercase">
                    Archive Vault
                  </span>
                </div>
                <span className="text-[11px] text-rose-200">
                  Administrative Standalone Repository · Deleted Accounts & Preserved Data
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenInNewWindow}
              title="Open standalone archive in a new browser tab"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/15 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>New Window</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="Print official audit report"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/15 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={loading || archivedRecords.length === 0}
              title="Export complete archive snapshot as JSON file"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="hidden sm:inline">Export JSON</span>
            </button>

            <button
              type="button"
              onClick={fetchArchivedRecords}
              disabled={loading}
              title="Refresh database records"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
                sync
              </span>
            </button>

            {/* Authenticated Admin Pill */}
            <div className="hidden xl:flex items-center gap-2.5 pl-2 border-l border-white/20">
              <div className="w-8 h-8 rounded-full bg-white text-[#800000] flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser ? `${currentUser.firstName[0]}${currentUser.lastName[0]}` : 'A'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">
                  {currentUser?.fullName || 'Administrator'}
                </span>
                <span className="text-[10px] text-rose-200">
                  {getRoleDisplayName(currentUser?.role)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Standalone Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Notice */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              <span>SmartShule Isolated Archive System</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">PostgreSQL & MongoDB Dual-Engine Ready</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span>Archived Accounts & Operational Data</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                <span className="material-symbols-outlined text-[15px]">security</span>
                <span>Audit & Chapter 6 Certified</span>
              </span>
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-4xl">
              Deleted learners, exclusive parent logins, fee invoices, CBC formative/summative marks, attendance registers, and welfare grievances are securely preserved in the isolated archive table. Restoring any record reinstates credentials and operational ledgers seamlessly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-right">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Archive Storage</span>
              <span className="text-sm font-black text-slate-800 font-mono">
                {archivedRecords.length} Learner Dossiers
              </span>
            </div>
            <div className="px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-200 text-right">
              <span className="text-[11px] font-bold text-emerald-700 block uppercase">Protection Status</span>
              <span className="text-sm font-black text-emerald-800 flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Immutable Snapshots
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-xs animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px]">
                {feedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Archived Learners</span>
              <span className="material-symbols-outlined text-[20px] text-rose-800">school</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalArchivedLearners}</div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Full dossiers preserved</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Parent Accounts</span>
              <span className="material-symbols-outlined text-[20px] text-indigo-700">family_restroom</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalArchivedParents}</div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Logins & credentials</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Cleared Fee Debt</span>
              <span className="material-symbols-outlined text-[20px] text-emerald-700">money_off</span>
            </div>
            <div className="text-2xl font-black text-emerald-800 font-mono">
              KES {totalClearedDebt.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Relieved on archive</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Preserved Invoices</span>
              <span className="material-symbols-outlined text-[20px] text-amber-700">receipt_long</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalPreservedInvoices}</div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Historical billing data</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">CBC Marks Preserved</span>
              <span className="material-symbols-outlined text-[20px] text-sky-700">grade</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalAssessmentsPreserved}</div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">Formative & summative</span>
          </div>
        </div>

        {/* Controls Bar: Sub-Tabs & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            {/* Sub-Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { id: 'accounts', label: 'Archived Accounts', icon: 'manage_accounts', count: allArchivedAccounts.length },
                { id: 'learners', label: 'Archived Learners', icon: 'school', count: archivedRecords.length },
                { id: 'finances', label: 'Preserved Invoices', icon: 'account_balance_wallet', count: totalPreservedInvoices },
                { id: 'academic', label: 'CBC & Academics', icon: 'menu_book', count: totalAssessmentsPreserved },
                { id: 'attendance', label: 'Attendance Logs', icon: 'checklist', count: archivedRecords.reduce((s, r) => s + (r.linkedData?.attendance?.length || 0), 0) },
                { id: 'welfare', label: 'Welfare & eDiary', icon: 'rate_review', count: archivedRecords.reduce((s, r) => s + (r.linkedData?.complaints?.length || 0) + (r.linkedData?.ediary?.length || 0), 0) },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as ArchiveSubTab)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#800000] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Showing {activeTab === 'accounts' ? filteredAccounts.length : filteredLearners.length} records
              </span>
            </div>
          </div>

          {/* Search & Select Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, parent name, admission #, email, phone, or reason..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-800/30 focus:border-rose-800 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {activeTab === 'accounts' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['ALL', 'PARENT', 'STUDENT'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setAccountTypeFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        accountTypeFilter === filter
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {filter === 'ALL' ? 'All Accounts' : filter === 'PARENT' ? 'Parents Only' : 'Students Only'}
                    </button>
                  ))}
                </div>
              )}

              {gradeOptions.length > 0 && (
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-800/30"
                >
                  <option value="ALL">All Grades / Levels</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Tab 1: Archived Accounts Table */}
        {activeTab === 'accounts' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Account Holder & Type</th>
                    <th className="py-3.5 px-4">Identifier / Role</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Archived Reason</th>
                    <th className="py-3.5 px-4">Date Deleted</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-[32px] animate-spin mb-2 block">
                          sync
                        </span>
                        <span>Loading archived accounts repository...</span>
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <span className="material-symbols-outlined text-[36px] text-slate-400 mb-2 block">
                          person_off
                        </span>
                        <span className="font-bold text-sm block">No archived accounts found</span>
                        <span className="text-xs text-slate-400 mt-1 block">
                          {search ? 'Try adjusting your search criteria' : 'No deleted accounts exist in the archive'}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc, idx) => {
                      const isParent = acc.accountType === 'PARENT';
                      return (
                        <tr key={`${acc.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isParent
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {isParent ? 'family_restroom' : 'school'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate text-sm">
                                  {acc.fullName}
                                </span>
                                <span
                                  className={`inline-block text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider mt-0.5 ${
                                    isParent ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-800'
                                  }`}
                                >
                                  {isParent ? 'Guardian Account' : 'Learner Account'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-800 font-semibold block">
                              {acc.identifier}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[200px]">
                              {acc.relationshipOrGrade}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              {acc.email && acc.email !== 'N/A' && (
                                <span className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">email</span>
                                  <span>{acc.email}</span>
                                </span>
                              )}
                              {acc.phone && acc.phone !== 'N/A' && (
                                <span className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">call</span>
                                  <span>{acc.phone}</span>
                                </span>
                              )}
                              {(!acc.email || acc.email === 'N/A') && (!acc.phone || acc.phone === 'N/A') && (
                                <span className="text-slate-400 italic">No contact provided</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-700 italic max-w-xs block truncate" title={acc.reason || 'None specified'}>
                              {acc.reason || 'None specified'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {new Date(acc.deletedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>{acc.parentStatus || 'Archived Snapshot'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedRecord(acc.record)}
                                title="Inspect linked dossier details"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRestore(acc.record)}
                                disabled={restoringId === acc.record.id}
                                title="Restore student & linked parent accounts to active system"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[15px]">settings_backup_restore</span>
                                <span>Restore</span>
                              </button>
                            </div>
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

        {/* Tab 2: Archived Learners Table */}
        {activeTab === 'learners' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Learner Name</th>
                    <th className="py-3.5 px-4">Admission #</th>
                    <th className="py-3.5 px-4">Grade & Stream</th>
                    <th className="py-3.5 px-4">Archived Reason</th>
                    <th className="py-3.5 px-4">Deleted By</th>
                    <th className="py-3.5 px-4">Debt Cleared</th>
                    <th className="py-3.5 px-4">Archived Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-[32px] animate-spin mb-2 block">
                          sync
                        </span>
                        <span>Loading archived learners...</span>
                      </td>
                    </tr>
                  ) : filteredLearners.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <span className="material-symbols-outlined text-[36px] text-slate-400 mb-2 block">
                          school
                        </span>
                        <span className="font-bold text-sm block">No archived learners found</span>
                      </td>
                    </tr>
                  ) : (
                    filteredLearners.map((rec) => {
                      const clearedDebt =
                        (rec.pendingWorkCleared?.clearedInvoiceBalances || 0) +
                        (rec.pendingWorkCleared?.clearedLunchBalances || 0);

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {rec.fullName[0] || 'L'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-sm">
                                  {rec.fullName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  UPI: {rec.upiNumber || '--'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {rec.admissionNumber}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 block">
                              {resolveGradeName(rec.gradeLevel)}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {resolveStreamName(rec.streamId, rec.streamName) || 'No stream'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-slate-700 italic max-w-xs block truncate" title={rec.reason || 'Not specified'}>
                              {rec.reason || 'Not specified'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="font-medium">{rec.deletedBy || 'System Administrator'}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {clearedDebt > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-[11px]">
                                KES {clearedDebt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">KES 0</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {new Date(rec.deletedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedRecord(rec)}
                                title="Inspect learner dossier"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestore(rec)}
                                disabled={restoringId === rec.id}
                                title="Restore student"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[15px]">settings_backup_restore</span>
                                <span>Restore</span>
                              </button>
                            </div>
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

        {/* Tab 3: Preserved Invoices */}
        {activeTab === 'finances' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Learner Name & Adm</th>
                    <th className="py-3.5 px-4">Total Billed</th>
                    <th className="py-3.5 px-4">Paid Amount</th>
                    <th className="py-3.5 px-4">Archived Balance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allArchivedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <span className="material-symbols-outlined text-[36px] text-slate-400 mb-2 block">
                          receipt_long
                        </span>
                        <span className="font-bold text-sm block">No preserved invoices</span>
                      </td>
                    </tr>
                  ) : (
                    allArchivedInvoices.map((inv, idx) => (
                      <tr key={`${inv.id || idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber || inv.id?.slice(0, 10) || 'INV-PRESERVED'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{inv.studentName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">Adm: {inv.admissionNumber}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          KES {(inv.totalAmount || inv.billed || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-700 font-semibold">
                          KES {(inv.paidAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-rose-800 font-bold">
                          KES {(inv.balance || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                            {inv.status || 'Preserved'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(inv.record)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
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

        {/* Tab 4: Academic Assessments */}
        {activeTab === 'academic' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Preserved CBC Competency Marks & Term Report Cards
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Archived assessments are retained for KNEC and MoE regulatory audits and can be restored anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedRecords.map((rec) => {
                const formatives = rec.linkedData?.formativeAssessments || [];
                const summatives = rec.linkedData?.summativeAssessments || [];
                const reportCards = rec.linkedData?.reportCards || [];

                return (
                  <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{rec.fullName}</h3>
                        <span className="text-[11px] text-slate-500 font-mono">Adm: {rec.admissionNumber}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-bold">
                        {rec.gradeLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Formative</span>
                        <span className="text-base font-black text-sky-700">{formatives.length}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Summative</span>
                        <span className="text-base font-black text-indigo-700">{summatives.length}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Reports</span>
                        <span className="text-base font-black text-emerald-700">{reportCards.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(rec)}
                        className="text-primary hover:underline font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">search</span>
                        <span>View Raw Marks</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestore(rec)}
                        className="text-emerald-700 hover:underline font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">restore</span>
                        <span>Restore File</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Attendance Logs */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Historical Attendance Roll-Call Registers</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Preserved attendance records ensure full compliance with school safety and enrollment audit mandates.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {archivedRecords.map((rec) => {
                const attList = rec.linkedData?.attendance || [];
                return (
                  <div key={rec.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{rec.fullName}</span>
                      <span className="text-xs text-slate-500">
                        Adm #{rec.admissionNumber} · {rec.gradeLevel} · Preserved Attendance Logs: {attList.length} days
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(rec)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Inspect Logs
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 6: Welfare & Complaints */}
        {activeTab === 'welfare' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Parent Grievances, Resolved Concerns & eDiary</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Archived parent communications, concern logs, and eDiary activity logs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedRecords.map((rec) => {
                const complaints = rec.linkedData?.complaints || [];
                const ediary = rec.linkedData?.ediary || [];

                return (
                  <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{rec.fullName}</span>
                      <span className="text-xs text-slate-500">Adm #{rec.admissionNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>Concerns: <strong>{complaints.length}</strong></span>
                      <span>•</span>
                      <span>eDiary Entries: <strong>{ediary.length}</strong></span>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(rec)}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                      >
                        Inspect Welfare History →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Standalone Footer */}
      <footer className="mt-auto py-5 bg-[#800000] border-t border-[#600000] text-white text-xs print:hidden shadow-lg">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">SmartShule Enterprise Archive Vault</span>
            <span className="text-rose-200">•</span>
            <span className="text-rose-100">{currentUser?.schoolName || 'Grace Seeds School'}</span>
          </div>
          <div className="flex items-center gap-3 text-rose-200">
            <span>Powered by <strong className="text-white">Vellox Tech</strong></span>
            <span>|</span>
            <button
              type="button"
              onClick={onBackToPortal}
              className="text-white hover:underline font-bold cursor-pointer"
            >
              Return to School Portal
            </button>
          </div>
        </div>
      </footer>

      {/* Inspection Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 bg-[#800000] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm border border-white/20">
                  <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">
                    {selectedRecord.fullName}
                  </h3>
                  <span className="text-xs text-rose-200 font-mono">
                    Adm #{selectedRecord.admissionNumber} · Archive Dossier ID: {selectedRecord.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Demographics Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                  <span>Student Demographic Data</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Grade & Stream</span>
                    <span className="font-bold text-slate-900">
                      {resolveGradeName(selectedRecord.gradeLevel)} ({resolveStreamName(selectedRecord.streamId, selectedRecord.streamName) || 'No stream'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">UPI / NEMIS</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedRecord.upiNumber || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Deletion Date</span>
                    <span className="font-mono text-slate-900">
                      {new Date(selectedRecord.deletedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Archived By</span>
                    <span className="font-bold text-slate-900">
                      {selectedRecord.deletedBy || 'System Admin'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Deletion Reason</span>
                  <p className="text-slate-800 italic mt-0.5">{selectedRecord.reason || 'None specified'}</p>
                </div>
              </div>

              {/* Linked Guardians */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-700">family_restroom</span>
                  <span>Associated Parent & Guardian Logins</span>
                </h4>
                {selectedRecord.linkedData?.guardians?.length ? (
                  <div className="space-y-2">
                    {selectedRecord.linkedData.guardians.map((g, idx) => (
                      <div key={idx} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start justify-between">
                        <div>
                          <span className="font-bold text-indigo-900 block text-sm">
                            {g.parentUser?.fullName || `${g.parentUser?.firstName || ''} ${g.parentUser?.lastName || ''}`.trim() || 'Parent'}
                          </span>
                          <span className="text-[11px] text-indigo-700 block">
                            {g.relationship || 'Guardian'} · {g.parentUser?.email || g.emergencyContact || 'No contact'}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-600 block mt-0.5">
                            Status: {g.willArchiveParentAccount ? 'Archived (Exclusive account)' : 'Unlinked (Has other children)'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          {g.parentUser?.role || 'PARENT'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No parent accounts were linked.</p>
                )}
              </div>

              {/* Cleared Pending Work */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <h4 className="font-bold text-emerald-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">task_alt</span>
                  <span>Pending Obligations Cleared During Archival</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-emerald-900">
                  <div>
                    <span className="text-[10px] text-emerald-700 block uppercase">Fee Debt Cleared</span>
                    <span className="font-mono font-black text-sm">
                      KES {(selectedRecord.pendingWorkCleared?.clearedInvoiceBalances || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block uppercase">Lunch Debt Cleared</span>
                    <span className="font-mono font-black text-sm">
                      KES {(selectedRecord.pendingWorkCleared?.clearedLunchBalances || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block uppercase">Complaints Closed</span>
                    <span className="font-mono font-bold text-sm">
                      {selectedRecord.pendingWorkCleared?.clearedComplaintsCount || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block uppercase">Parent Accounts Purged</span>
                    <span className="font-mono font-bold text-sm">
                      {selectedRecord.pendingWorkCleared?.clearedParentAccountsCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw JSON Snapshot */}
              <div>
                <span className="font-bold text-slate-700 block mb-1 uppercase text-[10px]">
                  Raw Dossier Snapshot (Inspection)
                </span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono max-h-60">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Close Drawer
              </button>
              <button
                type="button"
                onClick={() => handleRestore(selectedRecord)}
                disabled={restoringId === selectedRecord.id}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[17px]">settings_backup_restore</span>
                <span>Restore Student & Parents</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
