import React, { useState, useEffect } from 'react';
import { DeletedStudentRecord } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ArchivedStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentRestored?: () => void;
}

export const ArchivedStudentsModal: React.FC<ArchivedStudentsModalProps> = ({
  isOpen,
  onClose,
  onStudentRestored,
}) => {
  const { user } = useAuth();
  const [archivedStudents, setArchivedStudents] = useState<DeletedStudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DeletedStudentRecord | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadArchivedStudents = async () => {
    try {
      setLoading(true);
      setActionFeedback(null);
      const res = await apiService.getDeletedStudents({ schoolId: user?.schoolId });
      if (res.success && Array.isArray(res.data)) {
        setArchivedStudents(res.data);
      } else {
        setArchivedStudents([]);
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to load archived learners from database.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadArchivedStudents();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestore = async (record: DeletedStudentRecord) => {
    if (
      !window.confirm(
        `Are you sure you want to restore ${record.fullName} (Adm: ${record.admissionNumber}) back to the active student roster?`
      )
    ) {
      return;
    }

    try {
      setRestoringId(record.id);
      setActionFeedback(null);
      const res = await apiService.restoreStudent(record.id);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          message: res.message || `Learner ${record.fullName} restored successfully to the active student list.`,
        });
        if (selectedRecord?.id === record.id) {
          setSelectedRecord(null);
        }
        await loadArchivedStudents();
        onStudentRestored?.();
      } else {
        setActionFeedback({
          type: 'error',
          message: res.message || 'Failed to restore learner.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error occurred while restoring learner.',
      });
    } finally {
      setRestoringId(null);
    }
  };

  const filtered = archivedStudents.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.fullName?.toLowerCase().includes(q) ||
      r.admissionNumber?.toLowerCase().includes(q) ||
      (r.upiNumber && r.upiNumber.toLowerCase().includes(q)) ||
      (r.gradeLevel && r.gradeLevel.toLowerCase().includes(q)) ||
      (r.reason && r.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-[#4a1525] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>Deleted Learners Archive Table</span>
                <span className="text-xs bg-rose-500/30 text-rose-100 font-mono px-2 py-0.5 rounded-full border border-rose-400/20">
                  {archivedStudents.length} Archived
                </span>
              </h3>
              <p className="text-xs text-rose-200">
                Dedicated archive repository storing deleted student snapshots, preserved linked histories, and cleared pending debts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`p-3 text-xs font-medium border-b flex items-center justify-between ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {actionFeedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by learner, Adm #, grade or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={loadArchivedStudents}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-high hover:bg-surface-container border border-outline-variant/30 rounded-xl text-xs font-semibold text-on-surface transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh Archive</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] animate-spin text-primary mb-2">
                progress_activity
              </span>
              <p className="text-xs sm:text-sm font-medium">Fetching archived records from deleted_students table...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/40">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-2">
                folder_off
              </span>
              <p className="text-sm font-semibold text-on-surface">No Archived Learners Found</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm mx-auto">
                When a learner is deleted from the active student roster, their complete profile and linked records will automatically be stored here with cleared pending debts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((record) => {
                const linked = record.linkedData || ({} as any);
                const pending = record.pendingWorkCleared || ({} as any);
                const isSelected = selectedRecord?.id === record.id;
                const formattedDate = record.deletedAt
                  ? new Date(record.deletedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A';

                return (
                  <div
                    key={record.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-rose-50/40 border-rose-300 shadow-xs'
                        : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Learner Info */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#7a1228]/10 text-[#7a1228] font-bold flex items-center justify-center text-sm shrink-0 border border-[#7a1228]/20">
                          {record.firstName?.[0] || 'L'}
                          {record.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-on-surface">{record.fullName}</h4>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-medium">
                              Adm #{record.admissionNumber}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold">
                              {record.gradeLevel}
                            </span>
                            {record.upiNumber && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                UPI: {record.upiNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                              Deleted: {formattedDate}
                            </span>
                            {record.reason && (
                              <span className="flex items-center gap-1 text-on-surface-variant font-medium">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                Reason: <span className="italic text-on-surface">{record.reason}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(isSelected ? null : record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container border border-outline-variant/30 rounded-lg text-xs font-semibold text-on-surface transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isSelected ? 'expand_less' : 'visibility'}
                          </span>
                          <span>{isSelected ? 'Hide Details' : 'View Archive'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRestore(record)}
                          disabled={restoringId === record.id}
                          title="Restore this learner and their profile back to active student roster"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${restoringId === record.id ? 'animate-spin' : ''}`}>
                            {restoringId === record.id ? 'sync' : 'restore'}
                          </span>
                          <span>{restoringId === record.id ? 'Restoring...' : 'Restore Learner'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="mt-3 pt-3 border-t border-outline-variant/15 flex flex-wrap items-center gap-2 text-xs">
                      {/* Cleared pending work highlight */}
                      {(pending.clearedInvoiceBalances > 0 || pending.clearedLunchBalances > 0) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          KES {(pending.clearedInvoiceBalances || 0) + (pending.clearedLunchBalances || 0)} Cleared Debt
                        </span>
                      )}

                      {/* Preserved Linked Counts */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-outline-variant/20">
                        <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                        {linked.invoices?.length || 0} Invoices Arch.
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-outline-variant/20">
                        <span className="material-symbols-outlined text-[13px]">payments</span>
                        {linked.payments?.length || 0} Payments
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-outline-variant/20">
                        <span className="material-symbols-outlined text-[13px]">restaurant</span>
                        {linked.lunchEnrollments?.length || 0} Lunch Records
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-outline-variant/20">
                        <span className="material-symbols-outlined text-[13px]">assignment_turned_in</span>
                        {(linked.formativeAssessments?.length || 0) + (linked.summativeAssessments?.length || 0)} CBC Marks
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-outline-variant/20">
                        <span className="material-symbols-outlined text-[13px]">event_available</span>
                        {linked.attendanceRecords?.length || 0} Attendance
                      </span>

                      {pending.resolvedComplaintsCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                          <span className="material-symbols-outlined text-[13px]">task_alt</span>
                          {pending.resolvedComplaintsCount} Issue(s) Resolved
                        </span>
                      )}
                    </div>

                    {/* Expanded Detail Panel */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/20 space-y-4 bg-surface-container-low/50 p-4 rounded-xl">
                        {/* Summary of Cleared Pending Work */}
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5">
                          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-1">
                            <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                            <span>Pending Work Cleared During Deletion</span>
                          </div>
                          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                            {pending.summaryText || 'All operational ties, fee arrears, and pending tasks cleared.'}
                          </p>

                          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                              <span className="text-[11px] text-emerald-700 block">Cleared Fee Balances</span>
                              <span className="font-bold text-emerald-900">KES {pending.clearedInvoiceBalances || 0}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                              <span className="text-[11px] text-emerald-700 block">Cleared Lunch Debt</span>
                              <span className="font-bold text-emerald-900">KES {pending.clearedLunchBalances || 0}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                              <span className="text-[11px] text-emerald-700 block">Complaints Resolved</span>
                              <span className="font-bold text-emerald-900">{pending.resolvedComplaintsCount || 0}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                              <span className="text-[11px] text-emerald-700 block">Unlinked Guardians</span>
                              <span className="font-bold text-emerald-900">{pending.unlinkedGuardiansCount || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Preserved Records Detail Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Financial Archive */}
                          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">account_balance_wallet</span>
                                Financial Snapshot
                              </span>
                              <span className="text-[11px] text-on-surface-variant font-mono">
                                {linked.invoices?.length || 0} Inv · {linked.payments?.length || 0} Pay
                              </span>
                            </div>
                            <div className="space-y-1 text-on-surface-variant max-h-32 overflow-y-auto">
                              {linked.invoices?.length > 0 ? (
                                linked.invoices.map((inv: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between py-1 border-b border-outline-variant/10 text-[11px]">
                                    <span>#{inv.invoiceNumber || inv.id}</span>
                                    <span>Payable: KES {inv.amountPayable || inv.amountBilled || 0}</span>
                                    <span className="font-semibold text-rose-700">Bal: KES {inv.balance || 0}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] italic">No prior fee invoices.</p>
                              )}
                            </div>
                          </div>

                          {/* Academic & CBC Archive */}
                          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-primary">school</span>
                                Academic & CBC Snapshot
                              </span>
                              <span className="text-[11px] text-on-surface-variant font-mono">
                                {linked.formativeAssessments?.length || 0} Form · {linked.summativeAssessments?.length || 0} Summ
                              </span>
                            </div>
                            <div className="space-y-1 text-on-surface-variant max-h-32 overflow-y-auto">
                              <p className="text-[11px]">
                                <span className="font-semibold text-on-surface">Formative Marks:</span> {linked.formativeAssessments?.length || 0} recorded
                              </p>
                              <p className="text-[11px]">
                                <span className="font-semibold text-on-surface">Summative Marks:</span> {linked.summativeAssessments?.length || 0} recorded
                              </p>
                              <p className="text-[11px]">
                                <span className="font-semibold text-on-surface">Report Cards:</span> {linked.reportCards?.length || 0} generated
                              </p>
                              <p className="text-[11px]">
                                <span className="font-semibold text-on-surface">Attendance Days:</span> {linked.attendanceRecords?.length || 0} entries
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Parents & Guardians Archive */}
                        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                              <span className="material-symbols-outlined text-[16px] text-primary">diversity_3</span>
                              Archived Parents & Guardians ({linked.guardians?.length || 0})
                            </span>
                            <span className="text-[11px] text-on-surface-variant font-mono">
                              {pending.clearedParentAccountsCount || 0} user account(s) cleared
                            </span>
                          </div>

                          <div className="space-y-2.5 max-h-48 overflow-y-auto">
                            {linked.guardians && linked.guardians.length > 0 ? (
                              linked.guardians.map((g: any, gi: number) => {
                                const pUser = g.parentUser;
                                const parentName = pUser?.fullName || (pUser ? `${pUser.firstName} ${pUser.lastName}` : 'Guardian');
                                const phone = pUser?.phone || g.emergencyContact || 'N/A';
                                const email = pUser?.email || 'N/A';

                                return (
                                  <div key={gi} className="p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/15 text-xs space-y-1">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-on-surface">{parentName}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold uppercase">
                                          {g.relationship || 'Guardian'}
                                        </span>
                                      </div>
                                      {g.willArchiveParentAccount ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                          Parent Account Cleared from Active Directory
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                          Retained (Other Active Children)
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px] text-on-surface-variant pt-1">
                                      <span>Phone: <strong className="text-on-surface">{phone}</strong></span>
                                      <span>Email: <strong className="text-on-surface">{email}</strong></span>
                                      {g.nationalId && (
                                        <span>National ID: <strong className="text-on-surface">{g.nationalId}</strong></span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] italic text-on-surface-variant">No linked guardians found in archive.</p>
                            )}
                          </div>
                        </div>

                        {/* Raw Snapshot Information */}
                        <div className="text-[11px] text-on-surface-variant bg-surface-container p-2.5 rounded-lg flex items-center justify-between">
                          <span>
                            Archived table record ID: <code className="font-mono text-on-surface">{record.id}</code>
                          </span>
                          <span>
                            Original Student ID: <code className="font-mono text-on-surface">{record.studentId}</code>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-between shrink-0">
          <p className="text-xs text-on-surface-variant">
            Records in this archive table remain isolated and preserved. Restoring a learner will re-admit them to active classes.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-container-high hover:bg-surface-container border border-outline-variant/30 text-on-surface rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Close Archive
          </button>
        </div>
      </div>
    </div>
  );
};
