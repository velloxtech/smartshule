import React, { useState } from 'react';
import { Student, CBCRubric, UserRole } from '../../types';
import { EditStudentModal } from '../modals/EditStudentModal';
import { LearnerProfileModal } from '../modals/LearnerProfileModal';
import { PromoteStudentModal } from '../modals/PromoteStudentModal';
import { ArchivedStudentsModal } from '../modals/ArchivedStudentsModal';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';

interface StudentsViewProps {
  students: Student[];
  onOpenMpesaWithStudent: (student: Student) => void;
  onOpenCBCWithStudent: (student: Student) => void;
  onOpenAdmitModal: () => void;
  onViewReportCard: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
  onRefreshStudents?: () => void | Promise<void>;
  onNavigateStandaloneArchive?: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onOpenMpesaWithStudent,
  onOpenCBCWithStudent,
  onOpenAdmitModal,
  onViewReportCard,
  onUpdateStudent,
  onDeleteStudent,
  onRefreshStudents,
  onNavigateStandaloneArchive,
}) => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;

  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedRating, setSelectedRating] = useState('All');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [promotingStudent, setPromotingStudent] = useState<Student | null>(null);
  const [isBulkPromoteOpen, setIsBulkPromoteOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSyncingFees, setIsSyncingFees] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Deleted Students Archive & Modal States
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleteReason, setDeleteReason] = useState('Transferred to another institution');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionFeedback, setDeletionFeedback] = useState<{
    studentName: string;
    admNo: string;
    summaryText: string;
    clearedDebt: number;
  } | null>(null);

  const handleSyncFeeBalances = async () => {
    try {
      setIsSyncingFees(true);
      setSyncFeedback(null);
      const res = await apiService.syncFeeBalances({ schoolId: user?.schoolId });
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: res.message || `Successfully synced fee structures for ${res.data?.invoicesCreated ?? 0} learner(s).`
        });
        await onRefreshStudents?.();
      } else {
        setSyncFeedback({
          type: 'error',
          message: (res as any).error?.message || 'Failed to sync fee structures.'
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Error occurred while syncing fee balances.'
      });
    } finally {
      setIsSyncingFees(false);
    }
  };

  const handleOpenDeleteModal = (s: Student) => {
    setStudentToDelete(s);
    setDeleteReason('Transferred to another institution');
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiService.deleteStudent(studentToDelete.id, deleteReason);
      if (res.success) {
        const cleared = res.data?.pendingWorkCleared;
        const totalDebt = (cleared?.clearedInvoiceBalances || 0) + (cleared?.clearedLunchBalances || 0);
        setDeletionFeedback({
          studentName: studentToDelete.name,
          admNo: studentToDelete.admNo,
          summaryText: cleared?.summaryText || 'Profile and all linked records moved to archive table.',
          clearedDebt: totalDebt,
        });
        onDeleteStudent?.(studentToDelete.id);
        await onRefreshStudents?.();
        setStudentToDelete(null);
      } else {
        alert(res.message || 'Failed to delete student');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while deleting student');
    } finally {
      setIsDeleting(false);
    }
  };

  const standardGrades = ['Playgroup', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
  const studentGrades = Array.from(new Set(students.map((s) => s.grade).filter(Boolean)));
  const combinedGrades = Array.from(new Set([...standardGrades, ...studentGrades]));
  const grades = ['All', ...combinedGrades];
  const ratings = ['All', 'EE', 'ME', 'AE', 'BE'];

  const normalizeGrade = (g: string) => (g || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admNo.includes(search) ||
      s.upi.toLowerCase().includes(search.toLowerCase()) ||
      s.guardianName.toLowerCase().includes(search.toLowerCase());
    const matchesGrade =
      selectedGrade === 'All' ||
      s.grade === selectedGrade ||
      normalizeGrade(s.grade) === normalizeGrade(selectedGrade);
    const matchesRating = selectedRating === 'All' || s.cbcRating === selectedRating;
    return matchesSearch && matchesGrade && matchesRating;
  });

  const getRatingBadge = (rating: CBCRubric) => {
    switch (rating) {
      case 'EE':
        return <span className="px-2 py-0.5 rounded bg-secondary text-white text-xs font-bold">EE · Exceeding</span>;
      case 'ME':
        return <span className="px-2 py-0.5 rounded bg-primary text-white text-xs font-bold">ME · Meeting</span>;
      case 'AE':
        return <span className="px-2 py-0.5 rounded bg-amber-700 text-white text-xs font-bold">AE · Approaching</span>;
      case 'BE':
        return <span className="px-2 py-0.5 rounded bg-error text-white text-xs font-bold">BE · Below</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-primary font-semibold">Students & Guardians</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              CBC Learner Directory & Profiles
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Articles 53 & 54 Compliant</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ministry of Education NEMIS & Biometric verified student registry · Constitution of Kenya 2010
          </p>
        </div>

        {!isTeacher && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleSyncFeeBalances}
              disabled={isSyncingFees}
              title="Look up and attach full class fee structures to any existing learners missing fee invoices"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high text-primary hover:bg-primary/10 border border-primary/30 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-outlined text-[18px] ${isSyncingFees ? 'animate-spin' : ''}`}>
                {isSyncingFees ? 'sync' : 'account_balance_wallet'}
              </span>
              <span>{isSyncingFees ? 'Syncing Fees...' : 'Sync Fee Balances'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkPromoteOpen(true)}
              title="Promote selected learners or current grade cohort to the next CBC grade"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high text-primary hover:bg-primary/10 border border-primary/30 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upgrade</span>
              <span>{selectedStudentIds.length > 0 ? `Promote Selected (${selectedStudentIds.length})` : 'Promote Cohort'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigateStandaloneArchive) {
                  onNavigateStandaloneArchive();
                } else {
                  setIsArchivedModalOpen(true);
                }
              }}
              title="Open standalone deleted students archive table, historical records, and cleared debts"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container-high text-on-surface hover:bg-surface-container border border-outline-variant/30 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-rose-800">inventory_2</span>
              <span>Archived Learners</span>
            </button>

            <button
              type="button"
              onClick={onOpenAdmitModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-container text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Admit Learner (Art. 53)</span>
            </button>
          </div>
        )}
      </div>

      {/* Deletion & Archiving Feedback Banner */}
      {deletionFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[24px] text-emerald-600 shrink-0 mt-0.5">
              archive
            </span>
            <div>
              <h4 className="font-bold text-sm">
                Learner {deletionFeedback.studentName} (Adm #{deletionFeedback.admNo}) Moved to Archive Table
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                {deletionFeedback.summaryText}
              </p>
              {deletionFeedback.clearedDebt > 0 && (
                <span className="inline-block mt-1 text-xs font-semibold bg-emerald-100/90 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200">
                  KES {deletionFeedback.clearedDebt.toLocaleString()} Pending Debt Cleared
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateStandaloneArchive) {
                  onNavigateStandaloneArchive();
                } else {
                  setIsArchivedModalOpen(true);
                }
                setDeletionFeedback(null);
              }}
              className="text-xs font-semibold px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer transition-colors"
            >
              Open Archive Table
            </button>
            <button
              type="button"
              onClick={() => setDeletionFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Sync Fee Balances Feedback Banner */}
      {syncFeedback && (
        <div
          className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-medium border shadow-xs transition-all ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px]">
              {syncFeedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{syncFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1 rounded-md"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name, Adm #, UPI, or Parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low pl-10 pr-4 py-2 rounded-lg text-sm border border-outline-variant/30 focus:outline-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/30 text-xs rounded-lg py-2 px-3 text-on-surface"
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                Grade: {g}
              </option>
            ))}
          </select>

          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/30 text-xs rounded-lg py-2 px-3 text-on-surface"
          >
            {ratings.map((r) => (
              <option key={r} value={r}>
                Rubric: {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
              <tr>
                {!isTeacher && (
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all learners"
                      checked={filtered.length > 0 && selectedStudentIds.length === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedStudentIds(filtered.map((s) => s.id));
                        else setSelectedStudentIds([]);
                      }}
                      className="rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Learner Details</th>
                <th className="py-3 px-4">MoE UPI / NEMIS</th>
                <th className="py-3 px-4">Grade & Stream</th>
                <th className="py-3 px-4">Guardian & Phone</th>
                <th className="py-3 px-4">CBC Rubric</th>
                {isTeacher ? (
                  <th className="py-3 px-4 text-right">Attendance</th>
                ) : (
                  <th className="py-3 px-4 text-right">Fee Balance</th>
                )}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 7 : 8} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl text-outline">group_off</span>
                      <p className="font-semibold text-sm">No learners found</p>
                      <p className="text-xs text-outline">All learners are synced from the database.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low/50 transition-colors">
                  {!isTeacher && (
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${s.name}`}
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds((prev) => [...prev, s.id]);
                          } else {
                            setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                          }
                        }}
                        className="rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-outline-variant/30">
                        {(s as any).profilePhotoUrl ? (
                          <img
                            src={(s as any).profilePhotoUrl}
                            alt={s.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          (s.name || '')
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('') || 'ST'
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface flex items-center gap-1.5">
                          <span>{s.name}</span>
                          {s.specialNeeds && s.specialNeeds.includes('Article 54') && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title={s.specialNeeds}>
                              Art. 54 SNE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-on-surface-variant font-data-mono">
                          Adm #{s.admNo} · {s.gender}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-data-mono text-xs font-medium text-primary">{s.upi}</div>
                    <div className="font-data-mono text-[11px] text-outline">{s.nemis}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-on-surface">{s.grade}</span>
                    <span className="text-xs text-on-surface-variant block">{s.stream ? `${s.stream} Stream` : 'Single Cohort'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-on-surface">{s.guardianName}</div>
                    <div className="text-xs font-data-mono text-on-surface-variant">{s.guardianPhone}</div>
                  </td>
                  <td className="py-3 px-4">{getRatingBadge(s.cbcRating)}</td>
                  
                  {isTeacher ? (
                    <td className="py-3 px-4 text-right">
                      <span className="font-data-mono font-bold text-secondary">
                        {s.attendanceRate}% Present
                      </span>
                    </td>
                  ) : (
                    <td className="py-3 px-4 text-right">
                      {s.feeBalance > 0 ? (
                        <div>
                          <div className="font-bold text-error font-data-mono">
                            KES {s.feeBalance.toLocaleString()}
                          </div>
                          <span className="text-[11px] text-outline">due this term</span>
                        </div>
                      ) : (s.totalFee || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span> Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <span className="material-symbols-outlined text-[13px]">receipt_long</span> Pending Invoice
                        </span>
                      )}
                    </td>
                  )}

                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        onClick={() => setProfileStudent(s)}
                        title="View Learner Profile & Emergency Details"
                        className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>

                      <button
                        onClick={() => onViewReportCard(s)}
                        title="View Official CBC Report Card"
                        className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">article</span>
                      </button>

                      <button
                        onClick={() => onOpenCBCWithStudent(s)}
                        title="Log CBC Rubric / Upload Marks"
                        className="p-1.5 rounded-lg text-secondary hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">rule</span>
                      </button>

                      {!isTeacher && s.feeBalance > 0 && (
                        <button
                          onClick={() => onOpenMpesaWithStudent(s)}
                          title="Trigger M-Pesa STK Push"
                          className="p-1.5 rounded-lg text-secondary hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                        </button>
                      )}

                      {!isTeacher && (
                        <>
                          <button
                            onClick={() => setPromotingStudent(s)}
                            title="Promote Learner to Next Grade & Carry Forward Balance"
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">upgrade</span>
                          </button>
                          <button
                            onClick={() => setEditingStudent(s)}
                            title="Edit Profile & Link Guardian"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(s)}
                            disabled={isDeleting && studentToDelete?.id === s.id}
                            title="Delete Learner Record & Archive Linked Data"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partial Learner Details Modal */}
      <LearnerProfileModal
        isOpen={!!profileStudent}
        student={profileStudent}
        onClose={() => setProfileStudent(null)}
        onGradeStudent={(st) => {
          setProfileStudent(null);
          onOpenCBCWithStudent(st);
        }}
      />

      {/* Edit Learner & Link Guardian Modal (Admin Only) */}
      <EditStudentModal
        isOpen={!!editingStudent}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onStudentUpdated={(updated) => {
          onUpdateStudent?.(updated);
          setEditingStudent(null);
        }}
      />

      {/* Promote Learner Modal (Single) */}
      <PromoteStudentModal
        isOpen={!!promotingStudent}
        student={promotingStudent}
        onClose={() => setPromotingStudent(null)}
        onPromoted={async () => {
          setPromotingStudent(null);
          await onRefreshStudents?.();
        }}
      />

      {/* Bulk Promote Learners Modal */}
      <PromoteStudentModal
        isOpen={isBulkPromoteOpen}
        selectedStudents={
          selectedStudentIds.length > 0
            ? students.filter((s) => selectedStudentIds.includes(s.id))
            : (selectedGrade !== 'All' ? filtered : filtered)
        }
        onClose={() => setIsBulkPromoteOpen(false)}
        onPromoted={async () => {
          setIsBulkPromoteOpen(false);
          setSelectedStudentIds([]);
          await onRefreshStudents?.();
        }}
      />

      {/* Archived / Deleted Students Table Modal */}
      <ArchivedStudentsModal
        isOpen={isArchivedModalOpen}
        onClose={() => setIsArchivedModalOpen(false)}
        onStudentRestored={async () => {
          await onRefreshStudents?.();
        }}
      />

      {/* Delete Student & Move to Archive Table Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px]">archive</span>
                <h3 className="font-bold text-base">Archive & Delete Learner</h3>
              </div>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                <p className="font-semibold text-sm">
                  {studentToDelete.name} (Adm #{studentToDelete.admNo})
                </p>
                <p className="text-xs text-rose-800 mt-1">
                  Grade: {studentToDelete.grade} {studentToDelete.stream}
                </p>
              </div>

              <div className="text-on-surface-variant space-y-2 text-xs">
                <p className="font-medium text-on-surface">When this learner is deleted:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Record will be placed in the dedicated <strong className="text-on-surface">deleted_students</strong> table.</li>
                  <li>Everything linked (invoices, payments, CBC assessments, attendance, e-diary, photos) will be preserved in the archive.</li>
                  <li>All pending work (unpaid fee balances, lunch arrears, open concerns) will be cleared.</li>
                  <li>Guardians will be safely unlinked from this student.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Reason for Deletion (Recorded in Archive Table):
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Transferred to another school, Relocated, Graduated..."
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs sm:text-sm text-on-surface focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-surface-container-high hover:bg-surface-container border border-outline-variant/30 text-on-surface rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStudent}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7a1228] hover:bg-[#600e1f] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isDeleting ? 'animate-spin' : ''}`}>
                    {isDeleting ? 'progress_activity' : 'archive'}
                  </span>
                  <span>{isDeleting ? 'Archiving & Deleting...' : 'Archive & Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
