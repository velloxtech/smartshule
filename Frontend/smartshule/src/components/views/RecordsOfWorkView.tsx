import { canManageCurriculum } from '../../utils/curriculumPermissions';
import { loadDocumentSchool } from '../curriculum/SchoolDocumentHeader';
import React, { useState, useEffect, useMemo } from 'react';
import { recordsOfWorkPDF, RecordDocumentSchool } from '../curriculum/RecordOfWorkDocument';
import CreateRecordOfWorkModal from '../modals/CreateRecordOfWorkModal';
import { CreateLinkedRecordOfWorkModal } from '../modals/CreateLinkedRecordOfWorkModal';
import EditRecordOfWorkModal from '../modals/EditRecordOfWorkModal';
import { ViewRecordOfWorkModal } from '../modals/ViewRecordOfWorkModal';
import { apiService } from '../../services/api';
import { UserRole, RecordOfWork, RecordOfWorkStatus, RecordOfWorkSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';

export type { RecordOfWork };

type StatusFilterTab = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';

interface RecordsOfWorkViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const RecordsOfWorkView: React.FC<RecordsOfWorkViewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [documentSchool, setDocumentSchool] = useState<RecordDocumentSchool>();
  useEffect(() => {
    let live = true;
    apiService
      .getSchool()
      .then(async (result) => {
        const school = await loadDocumentSchool(result.data);
        if (live) setDocumentSchool(school);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkedCreateOpen, setIsLinkedCreateOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordOfWork | null>(null);
  const [viewingRecord, setViewingRecord] = useState<RecordOfWork | null>(null);
  const [records, setRecords] = useState<RecordOfWork[]>([]);
  const [summary, setSummary] = useState<RecordOfWorkSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekFilter, setWeekFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<StatusFilterTab>('ALL');

  // Review Modals State
  const [approvingRecord, setApprovingRecord] = useState<RecordOfWork | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [returningRecord, setReturningRecord] = useState<RecordOfWork | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isSupervisor = useMemo(() => {
    const role = user?.role ? String(user.role).toUpperCase() : '';
    return [
      'CURRICULUM_TEACHER',
      'HEAD_TEACHER',
      'DEPUTY_HEAD_TEACHER',
      'SUPER_ADMIN',
      'ADMIN',
      'SCHOOL_ADMIN',
    ].includes(role);
  }, [user]);

  const currentUserId = user?.userId || user?.id;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        apiService.getRecordsOfWork(activeTab !== 'ALL' ? { status: activeTab } : undefined),
        apiService.getRecordOfWorkSummary(),
      ]);

      setRecords(recordsRes?.data || []);
      if (summaryRes?.data) setSummary(summaryRes.data);
    } catch (err: any) {
      console.warn('Failed to load records of work:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (newRecord: Omit<RecordOfWork, 'id'>) => {
    const res = await apiService.createRecordOfWork(newRecord);
    if (res?.data) {
      setRecords((prev) => [res.data, ...prev]);
      setIsCreateModalOpen(false);
      loadData();
    }
  };

  const handleEdit = async (updatedRecord: RecordOfWork) => {
    const allowedFields = [
      'academicYearId',
      'academicYear',
      'termId',
      'term',
      'classRoomId',
      'className',
      'streamId',
      'streamName',
      'learningAreaId',
      'subjectName',
      'strandId',
      'strand',
      'subStrandId',
      'subStrand',
      'weekNumber',
      'day',
      'lessonPeriod',
      'period',
      'lessonDate',
      'lessonTopic',
      'learningObjectives',
      'learningActivities',
      'resources',
      'reference',
      'subjectAndGrade',
      'strandAndWorkCovered',
      'status',
      'comments',
      'reflection',
    ];
    const payload: Record<string, any> = {};
    for (const key of allowedFields) {
      const value = (updatedRecord as any)[key];
      if (value !== undefined && value !== null) payload[key] = value;
    }
    if (updatedRecord.reflectionData) {
      const reflectionData: Record<string, any> = {};
      for (const key of [
        'comprehensionLevel',
        'whatWentWell',
        'challengesFaced',
        'remedialPlan',
        'nextSteps',
        'generalRemarks',
        'homeworkGiven',
        'absentLearnersCount',
        'totalLearnersPresent',
      ]) {
        const value = (updatedRecord.reflectionData as any)[key];
        if (value === undefined || value === null) continue;
        if (
          key === 'comprehensionLevel' &&
          !['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'POOR'].includes(value)
        )
          continue;
        reflectionData[key] = value;
      }
      if (Object.keys(reflectionData).length) payload.reflectionData = reflectionData;
    }
    const res = await apiService.updateRecordOfWork(updatedRecord.id, payload);
    if (res?.data) {
      setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? res.data : r)));
      setSelectedRecord(null);
      loadData();
    }
  };

  const handleSubmitForReview = async (record: RecordOfWork) => {
    setActionError(null);
    try {
      const res = await apiService.submitRecordOfWork(record.id);
      if (res?.data) {
        setRecords((prev) => prev.map((r) => (r.id === record.id ? res.data : r)));
        loadData();
      }
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || err?.message || 'Failed to submit entry for review.'
      );
    }
  };

  const handleExemptPreviousWeek = async (record: RecordOfWork) => {
    const previousWeek = (record.weekNumber || record.week) - 1;
    const reason = window
      .prompt(
        `No instruction took place in Week ${previousWeek}. Enter the reason for the official exception:`,
        `No instruction took place in Week ${previousWeek}.`
      )
      ?.trim();
    if (!reason) return;
    setActionError(null);
    setActionNotice(null);
    try {
      const result = await apiService.exemptPreviousWeekForNoInstruction(record.id, reason);
      setActionNotice(
        result.message ||
          `Week ${previousWeek} marked exempt. Week ${record.weekNumber || record.week} can now be submitted.`
      );
      await loadData();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          err?.message ||
          'Could not record the no-instruction exception.'
      );
    }
  };

  const handleConfirmApproval = async () => {
    if (!approvingRecord) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiService.approveRecordOfWork(approvingRecord.id, {
        remarks: approvalRemarks,
      });
      if (res?.data) {
        setRecords((prev) => prev.map((r) => (r.id === approvingRecord.id ? res.data : r)));
        setApprovingRecord(null);
        setApprovalRemarks('');
        loadData();
      }
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || err?.message || 'Failed to approve record.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returningRecord) return;
    if (!returnReason.trim()) {
      setActionError('A return reason is required.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiService.returnRecordOfWork(returningRecord.id, {
        reason: returnReason,
      });
      if (res?.data) {
        setRecords((prev) => prev.map((r) => (r.id === returningRecord.id ? res.data : r)));
        setReturningRecord(null);
        setReturnReason('');
        loadData();
      }
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || err?.message || 'Failed to return record.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      actionLoading ||
      !window.confirm(
        'Delete this Record of Work? Its teaching evidence will be removed. The lesson plan and scheme will be kept. This cannot be undone.'
      )
    )
      return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.deleteRecordOfWork(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (viewingRecord?.id === id) setViewingRecord(null);
      await loadData();
      setActionNotice('Record of Work deleted.');
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || err?.message || 'Failed to delete record.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (r.subjectAndGrade || '').toLowerCase().includes(q) ||
        (r.strandAndWorkCovered || '').toLowerCase().includes(q) ||
        (r.reference || '').toLowerCase().includes(q) ||
        (r.lessonTopic || '').toLowerCase().includes(q) ||
        (r.reflection && r.reflection.toLowerCase().includes(q));

      const recWeek = r.weekNumber || r.week;
      const matchesWeek = weekFilter === 'ALL' || (recWeek && recWeek.toString() === weekFilter);
      return matchesSearch && matchesWeek;
    });
  }, [records, searchTerm, weekFilter]);

  const uniqueWeeks = useMemo(() => {
    return Array.from(
      new Set(records.map((r) => r.weekNumber || r.week).filter(Boolean))
    ).sort((a: any, b: any) => Number(a) - Number(b));
  }, [records]);

  const downloadRecordsOfWorkPDF = () => {
    if (!filteredRecords.length) {
      setActionError('No Records of Work match the current filters.');
      return;
    }
    recordsOfWorkPDF(filteredRecords, documentSchool).save(
      `records-of-work-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  const getStatusBadge = (status?: RecordOfWorkStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="material-symbols-outlined text-[13px]">verified</span>
            Approved
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            Pending Review
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-200">
            <span className="material-symbols-outlined text-[13px]">assignment_return</span>
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
            <span className="material-symbols-outlined text-[13px]">edit_note</span>
            Draft
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-12">
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 text-rose-900 shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-rose-700 text-xl mt-0.5">error</span>
            <div>
              <p className="font-bold text-sm">Action Notice / Progression Rule</p>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">{actionError}</p>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-800 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {actionNotice && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <strong>Progression exception recorded.</strong> {actionNotice} This week is marked exempt, not taught.
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-900 text-3xl">menu_book</span>
            Records of Work
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Track daily CBC curriculum delivery, lesson reflections, review submissions and official syllabus progression.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadRecordsOfWorkPDF}
            className="px-3 py-2 bg-rose-950/5 border border-rose-900/20 text-rose-900 rounded-xl hover:bg-rose-950/10 transition-colors font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            title="Download official records as PDF"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export PDF
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print
          </button>
          {canManageCurriculum(user?.role) && (
            <button onClick={() => setIsLinkedCreateOpen(true)} className="ui-button">
              Record Work from Lesson
            </button>
          )}
          <button
            onClick={() =>
              user?.role === 'TEACHER'
                ? setIsLinkedCreateOpen(true)
                : setIsCreateModalOpen(true)
            }
            className="px-3.5 py-2 bg-rose-900 text-white rounded-xl hover:bg-rose-950 transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {user?.role === 'TEACHER' ? 'post_add' : 'add_notes'}
            </span>
            {user?.role === 'TEACHER' ? 'Record Work from Lesson' : 'New Diary Entry'}
          </button>
        </div>
      </div>

      {/* Metrics & Progression Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            Total Lessons Logged
          </p>
          <h3 className="text-2xl font-extrabold text-stone-900 mt-1">
            {summary ? summary.totalLessons : records.length}
          </h3>
          <p className="text-[11px] text-stone-400 mt-1">Across all registered classes</p>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Official Coverage
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h3 className="text-2xl font-extrabold text-stone-900">
              {summary ? `${summary.officialCoveragePercentage}%` : '0%'}
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {summary ? `${summary.approvedCount} approved` : '0 approved'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Drives Official CBC Progress</p>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            Pending Review
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h3 className="text-2xl font-extrabold text-stone-900">
              {summary
                ? summary.submittedCount
                : records.filter((r) => r.status === 'SUBMITTED').length}
            </h3>
            {summary && summary.submittedCount > 0 && isSupervisor && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                Action Required
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Awaiting supervisor endorsement</p>
        </div>

        <div className="bg-white border border-rose-900/20 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
            Returned / Revision
          </p>
          <h3 className="text-2xl font-extrabold text-rose-950 mt-1">
            {summary
              ? summary.returnedCount
              : records.filter((r) => r.status === 'RETURNED').length}
          </h3>
          <p className="text-[11px] text-rose-800 mt-1">Requires teacher correction</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-stone-200 flex items-center gap-1 overflow-x-auto pb-px">
        {[
          { id: 'ALL', label: 'All Records', count: summary?.totalLessons },
          { id: 'DRAFT', label: 'Drafts', count: summary?.draftsCount },
          { id: 'SUBMITTED', label: 'Pending Review', count: summary?.submittedCount },
          { id: 'APPROVED', label: 'Approved (Official)', count: summary?.approvedCount },
          { id: 'RETURNED', label: 'Returned for Revision', count: summary?.returnedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as StatusFilterTab)}
            className={`px-3.5 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-rose-900 text-rose-900 bg-rose-950/[0.04]'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-rose-900 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search subject, strand, or reflection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-900/15 focus:border-rose-900 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap">
            Week:
          </label>
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-900/15 focus:border-rose-900 transition-colors bg-stone-50/60 font-semibold text-stone-800 cursor-pointer"
          >
            <option value="ALL">All Weeks</option>
            {uniqueWeeks.map((w) => (
              <option key={w} value={w.toString()}>
                Week {w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2-Column Compact Record Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-stone-400 text-sm flex items-center justify-center gap-2 bg-white rounded-2xl border border-stone-200">
          <span className="material-symbols-outlined animate-spin text-xl text-rose-900">
            progress_activity
          </span>
          Loading diary records...
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((record) => {
            const isRecordTeacher = currentUserId && record.teacherId === currentUserId;
            const canApprove =
              isSupervisor && (canManageCurriculum(user?.role) || !isRecordTeacher);
            const weekNum = record.weekNumber || record.week;

            return (
              <article
                key={record.id}
                className="min-w-0 flex flex-col justify-between bg-white rounded-xl p-4 shadow-xs border border-stone-200 hover:border-rose-900/35 transition-colors space-y-3"
              >
                <div className="min-w-0 space-y-2.5">
                  {/* Top Meta Row: Timeline & Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-data-mono text-[11px] font-bold text-rose-950 bg-rose-950/10 px-2 py-0.5 rounded">
                        Wk {weekNum} · {record.day}
                        {record.lessonPeriod || record.period
                          ? ` · P${record.lessonPeriod || record.period}`
                          : ''}
                      </span>
                      {record.lessonDate && (
                        <span className="text-[11px] text-stone-500 font-data-mono">
                          {record.lessonDate}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(record.status)}
                  </div>

                  {/* Subject, Class & Teacher */}
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setViewingRecord(record)}
                      className="min-w-0 w-full font-bold text-sm text-stone-900 hover:text-rose-900 text-left flex items-center gap-1.5 cursor-pointer"
                      title="Click to view full record details"
                    >
                      <span className="material-symbols-outlined text-[15px] shrink-0 text-rose-900">
                        visibility
                      </span>
                      <span className="truncate">{record.subjectAndGrade}</span>
                    </button>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-stone-500">
                      <span className="truncate">
                        {record.teacherName ? `By ${record.teacherName}` : 'Assigned Teacher'}
                      </span>
                      {(record.academicYear || record.term) && (
                        <span className="shrink-0 text-stone-400">
                          {record.academicYear || ''} {record.term || ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Work Covered Box */}
                  <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 space-y-1 text-xs">
                    {record.lessonTopic && (
                      <p className="truncate font-bold text-stone-800">{record.lessonTopic}</p>
                    )}
                    <p className="line-clamp-2 text-stone-600 leading-relaxed text-[11px]">
                      {record.strandAndWorkCovered}
                    </p>
                    {record.reference && (
                      <p className="truncate text-[10px] text-stone-400 italic">
                        Ref: {record.reference}
                      </p>
                    )}
                  </div>

                  {/* Compact Reflection Strip */}
                  {record.reflection || record.reflectionData?.whatWentWell ? (
                    <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                          <span className="material-symbols-outlined text-[13px] text-rose-900">
                            psychology
                          </span>
                          Reflection
                        </span>
                        {record.reflectionData?.comprehensionLevel && (
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                            {record.reflectionData.comprehensionLevel}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-[11px] text-stone-800 leading-relaxed">
                        {record.reflection || record.reflectionData?.whatWentWell}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-400 italic px-1">
                      No teacher reflection recorded
                    </p>
                  )}

                  {/* Return / Endorsement Notices */}
                  {record.status === 'RETURNED' && record.returnReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-950">
                      <span className="font-bold">Return feedback: </span>
                      <span className="line-clamp-2">{record.returnReason}</span>
                    </div>
                  )}

                  {record.status === 'APPROVED' && record.reviewRemarks && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] shrink-0">
                        comment
                      </span>
                      <span className="truncate">"{record.reviewRemarks}"</span>
                    </div>
                  )}
                </div>

                {/* Compact Footer Actions */}
                <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setViewingRecord(record)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-900 text-white hover:bg-rose-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="View full record dossier & teacher reflection details"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    <span>View</span>
                  </button>

                  {(record.status === 'DRAFT' || record.status === 'RETURNED') && (
                    <button
                      onClick={() => handleSubmitForReview(record)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-900 text-white rounded-lg hover:bg-rose-950 text-xs font-semibold shadow-xs cursor-pointer"
                      title="Submit entry for supervisor review"
                    >
                      <span className="material-symbols-outlined text-[14px]">send</span>
                      <span>{record.status === 'RETURNED' ? 'Resubmit' : 'Submit'}</span>
                    </button>
                  )}

                  {record.status === 'SUBMITTED' && isSupervisor && (
                    <>
                      {canApprove ? (
                        <button
                          onClick={() => {
                            setApprovingRecord(record);
                            setApprovalRemarks(
                              'Endorsed; lesson delivery meets curriculum standards.'
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-xs font-bold cursor-pointer"
                          title="Approve diary entry and increment curriculum coverage"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          <span>Approve</span>
                        </button>
                      ) : (
                        <span
                          className="text-[10px] text-stone-400 italic px-1"
                          title="Anti-self-approval rule: An administrative peer must review your submission."
                        >
                          Cannot self-approve
                        </span>
                      )}

                      <button
                        onClick={() => {
                          setReturningRecord(record);
                          setReturnReason('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-lg hover:bg-rose-100 text-xs font-bold cursor-pointer"
                        title="Return to teacher with correction feedback"
                      >
                        <span className="material-symbols-outlined text-[14px]">undo</span>
                        <span>Return</span>
                      </button>
                    </>
                  )}

                  {isSupervisor &&
                    user?.role !== UserRole.CURRICULUM_TEACHER &&
                    Number(weekNum) > 1 && (
                      <button
                        onClick={() => handleExemptPreviousWeek(record)}
                        className="rounded-lg border border-stone-300 bg-stone-50 px-2 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                        title="Mark the immediately preceding week as exempt because no instruction took place"
                      >
                        Exempt Wk {Number(weekNum) - 1}
                      </button>
                    )}

                  <div className="ml-auto flex items-center gap-1">
                    {user?.role !== UserRole.CURRICULUM_TEACHER &&
                      (record.status !== 'APPROVED' || isSupervisor) && (
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-1.5 text-stone-500 hover:text-rose-900 hover:bg-rose-950/5 rounded-lg transition-colors cursor-pointer"
                          title="Edit entry"
                          aria-label="Edit entry"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}

                    {user?.role !== UserRole.CURRICULUM_TEACHER &&
                      (record.status !== 'APPROVED' || isSupervisor) && (
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          disabled={actionLoading}
                          aria-label="Delete Record of Work"
                          title="Delete Record of Work"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-stone-200">
          <div className="w-14 h-14 bg-rose-950/5 rounded-full flex items-center justify-center mb-3 border border-rose-900/15">
            <span className="material-symbols-outlined text-2xl text-rose-900">history_edu</span>
          </div>
          <h3 className="text-sm font-bold text-stone-900 mb-0.5">No diary records found</h3>
          <p className="text-xs text-stone-500 max-w-sm">
            {searchTerm || weekFilter !== 'ALL' || activeTab !== 'ALL'
              ? 'Try adjusting your search criteria or switching status tabs.'
              : 'Click "New Diary Entry" to start recording lesson coverage.'}
          </p>
        </div>
      )}

      {/* Approve Modal */}
      {approvingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-200">
            <div className="px-6 py-4 border-b border-stone-200 bg-emerald-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900">
                <span className="material-symbols-outlined text-emerald-600">verified</span>
                <h3 className="font-bold text-base">Approve Teacher Diary Record</h3>
              </div>
              <button
                onClick={() => setApprovingRecord(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1 border border-stone-100">
                <p>
                  <span className="font-bold text-stone-600">Teacher:</span>{' '}
                  {approvingRecord.teacherName || 'Assigned Teacher'}
                </p>
                <p>
                  <span className="font-bold text-stone-600">Class & Subject:</span>{' '}
                  {approvingRecord.subjectAndGrade}
                </p>
                <p>
                  <span className="font-bold text-stone-600">Curriculum Week:</span> Week{' '}
                  {approvingRecord.weekNumber || approvingRecord.week}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-stone-600 mb-1">
                  Supervisor Endorsement Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="e.g. Approved; clear lesson objectives and learner activities demonstrated."
                  className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-rose-900/15 focus:border-rose-900"
                />
              </div>
              <p className="text-[11px] text-stone-500">
                Approving this record verifies the teaching evidence used in Coverage Tracking. Other scheduled lessons can be recorded independently.
              </p>
            </div>
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setApprovingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-900 rounded-xl hover:bg-rose-950 shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returningRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-stone-200">
            <div className="px-6 py-4 border-b border-stone-200 bg-rose-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-950">
                <span className="material-symbols-outlined text-rose-800">assignment_return</span>
                <h3 className="font-bold text-base">Return Diary Entry for Correction</h3>
              </div>
              <button
                onClick={() => setReturningRecord(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1 border border-stone-100">
                <p>
                  <span className="font-bold text-stone-600">Teacher:</span>{' '}
                  {returningRecord.teacherName || 'Teacher'}
                </p>
                <p>
                  <span className="font-bold text-stone-600">Class & Subject:</span>{' '}
                  {returningRecord.subjectAndGrade}
                </p>
                <p>
                  <span className="font-bold text-stone-600">Curriculum Week:</span> Week{' '}
                  {returningRecord.weekNumber || returningRecord.week}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-rose-950 mb-1">
                  Reason for Return / Required Revision *
                </label>
                <textarea
                  rows={3}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Specify what requires correction (e.g. Please document specific learning outcomes achieved or include remedial action taken for struggling learners)."
                  className="w-full px-3.5 py-2 text-xs border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-900/15 focus:border-rose-900"
                />
              </div>
              <p className="text-[11px] text-stone-500">
                The submitting teacher will be notified with your feedback and can revise and resubmit this record.
              </p>
            </div>
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setReturningRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={actionLoading || !returnReason.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-900 rounded-xl hover:bg-rose-950 shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                {actionLoading ? 'Returning...' : 'Return with Reason'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <CreateRecordOfWorkModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {isLinkedCreateOpen && (
        <CreateLinkedRecordOfWorkModal
          onClose={() => setIsLinkedCreateOpen(false)}
          onCreated={(record) => {
            setIsLinkedCreateOpen(false);
            setRecords((prev) => [record, ...prev]);
            loadData();
          }}
        />
      )}

      {selectedRecord && (
        <EditRecordOfWorkModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSubmit={handleEdit}
        />
      )}

      {viewingRecord && (
        <ViewRecordOfWorkModal
          record={viewingRecord}
          school={documentSchool}
          onClose={() => setViewingRecord(null)}
          onEdit={(rec) => {
            setViewingRecord(null);
            setSelectedRecord(rec);
          }}
          canEdit={
            user?.role !== UserRole.CURRICULUM_TEACHER &&
            Boolean(viewingRecord.status !== 'APPROVED' || isSupervisor)
          }
        />
      )}
    </div>
  );
};

export default RecordsOfWorkView;