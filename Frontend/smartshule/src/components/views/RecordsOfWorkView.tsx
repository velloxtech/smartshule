import {loadDocumentSchool} from '../curriculum/SchoolDocumentHeader';
import React, { useState, useEffect, useMemo } from 'react';
import {recordsOfWorkPDF,RecordDocumentSchool} from '../curriculum/RecordOfWorkDocument';
import CreateRecordOfWorkModal from '../modals/CreateRecordOfWorkModal';
import { CreateLinkedRecordOfWorkModal } from '../modals/CreateLinkedRecordOfWorkModal';
import EditRecordOfWorkModal from '../modals/EditRecordOfWorkModal';
import { ViewRecordOfWorkModal } from '../modals/ViewRecordOfWorkModal';
import { apiService } from '../../services/api';
import { RecordOfWork, RecordOfWorkStatus, RecordOfWorkSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';

export type { RecordOfWork };

type StatusFilterTab = 'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';

interface RecordsOfWorkViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const RecordsOfWorkView: React.FC<RecordsOfWorkViewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [documentSchool,setDocumentSchool]=useState<RecordDocumentSchool>();
  useEffect(()=>{let live=true;apiService.getSchool().then(async result=>{const school=await loadDocumentSchool(result.data);if(live)setDocumentSchool(school);}).catch(()=>{});return()=>{live=false;};},[]);
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
    return ['HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER', 'SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN'].includes(role);
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
        apiService.getRecordOfWorkSummary()
      ]);

      if (recordsRes?.data) {
        setRecords(recordsRes.data);
      } else {
        setRecords([]);
      }

      if (summaryRes?.data) {
        setSummary(summaryRes.data);
      }
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
    // Records returned by older database adapters may contain nulls and
    // presentation-only fields. Send only fields accepted by the update DTO.
    const allowedFields = [
      'academicYearId', 'academicYear', 'termId', 'term', 'classRoomId', 'className',
      'streamId', 'streamName', 'learningAreaId', 'subjectName', 'strandId', 'strand',
      'subStrandId', 'subStrand', 'weekNumber', 'day', 'lessonPeriod', 'period',
      'lessonDate', 'lessonTopic', 'learningObjectives', 'learningActivities', 'resources',
      'reference', 'subjectAndGrade', 'strandAndWorkCovered', 'status', 'comments', 'reflection'
    ];
    const payload: Record<string, any> = {};
    for (const key of allowedFields) {
      const value = (updatedRecord as any)[key];
      if (value !== undefined && value !== null) payload[key] = value;
    }
    if (updatedRecord.reflectionData) {
      const reflectionData: Record<string, any> = {};
      for (const key of ['comprehensionLevel', 'whatWentWell', 'challengesFaced', 'remedialPlan', 'nextSteps', 'generalRemarks', 'homeworkGiven', 'absentLearnersCount', 'totalLearnersPresent']) {
        const value = (updatedRecord.reflectionData as any)[key];
        if (value === undefined || value === null) continue;
        if (key === 'comprehensionLevel' && !['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'POOR'].includes(value)) continue;
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
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit entry for review.';
      setActionError(msg);
    }
  };

  const handleExemptPreviousWeek = async (record:RecordOfWork) => {
    const previousWeek=(record.weekNumber||record.week)-1;
    const reason=window.prompt(`No instruction took place in Week ${previousWeek}. Enter the reason for the official exception:`, `No instruction took place in Week ${previousWeek}.` )?.trim();
    if(!reason)return;
    setActionError(null);setActionNotice(null);
    try{
      const result=await apiService.exemptPreviousWeekForNoInstruction(record.id,reason);
      setActionNotice(result.message||`Week ${previousWeek} marked exempt. Week ${record.weekNumber||record.week} can now be submitted.`);
      await loadData();
    }catch(err:any){setActionError(err?.response?.data?.message||err?.message||'Could not record the no-instruction exception.');}
  };

  const handleConfirmApproval = async () => {
    if (!approvingRecord) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await apiService.approveRecordOfWork(approvingRecord.id, { remarks: approvalRemarks });
      if (res?.data) {
        setRecords((prev) => prev.map((r) => (r.id === approvingRecord.id ? res.data : r)));
        setApprovingRecord(null);
        setApprovalRemarks('');
        loadData();
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to approve record.');
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
      const res = await apiService.returnRecordOfWork(returningRecord.id, { reason: returnReason });
      if (res?.data) {
        setRecords((prev) => prev.map((r) => (r.id === returningRecord.id ? res.data : r)));
        setReturningRecord(null);
        setReturnReason('');
        loadData();
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to return record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (actionLoading || !window.confirm('Delete this Record of Work? Its teaching evidence will be removed. The lesson plan and scheme will be kept. This cannot be undone.')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.deleteRecordOfWork(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (viewingRecord?.id === id) setViewingRecord(null);
      await loadData();
      setActionNotice('Record of Work deleted.');
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to delete record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered records based on search and week
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        (r.subjectAndGrade || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.strandAndWorkCovered || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.lessonTopic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.reflection && r.reflection.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const recWeek = r.weekNumber || r.week;
      const matchesWeek = weekFilter === 'ALL' || (recWeek && recWeek.toString() === weekFilter);
      return matchesSearch && matchesWeek;
    });
  }, [records, searchTerm, weekFilter]);

  const uniqueWeeks = useMemo(() => {
    const weeks = Array.from(new Set(records.map((r) => r.weekNumber || r.week).filter(Boolean))).sort((a: any, b: any) => Number(a) - Number(b));
    return weeks;
  }, [records]);

  // PDF Export
  const downloadRecordsOfWorkPDF = () => {
    if (!filteredRecords.length) {setActionError('No Records of Work match the current filters.');return;}
    recordsOfWorkPDF(filteredRecords,documentSchool).save(`records-of-work-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const getStatusBadge = (status?: RecordOfWorkStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Approved · Official
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Pending Review
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="material-symbols-outlined text-[14px]">assignment_return</span>
            Returned for Revision
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-container-low text-on-surface-variant border border-outline-variant/30">
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
            Draft
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 text-rose-900 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-rose-600 text-xl mt-0.5">error</span>
            <div>
              <p className="font-bold text-sm">Action Notice / Progression Rule</p>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">{actionError}</p>
            </div>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-700">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
      {actionNotice&&<div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Progression exception recorded.</strong> {actionNotice} This week is marked exempt, not taught.</div>}


      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">menu_book</span>
            Records of Work
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Track daily CBC curriculum delivery, lesson reflections, review submissions and official syllabus progression.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={downloadRecordsOfWorkPDF}
            className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 text-primary rounded-xl hover:bg-rose-100 transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Download official records as PDF"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export PDF
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 bg-white border border-outline-variant/30 text-on-surface-variant rounded-xl hover:bg-surface transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print
          </button>
          <button
            onClick={() => user?.role === 'TEACHER' ? setIsLinkedCreateOpen(true) : setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-container transition-colors font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">{user?.role === 'TEACHER' ? 'post_add' : 'add_notes'}</span>
            {user?.role === 'TEACHER' ? 'Record Work from Lesson' : 'New Diary Entry'}
          </button>
        </div>
      </div>

      {/* Metrics & Progression Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Lessons Logged</p>
          <h3 className="text-2xl font-extrabold text-on-surface mt-1">
            {summary ? summary.totalLessons : records.length}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">Across all registered classes</p>
        </div>

        <div className="bg-surface-container-lowest border border-primary/80 bg-gradient-to-br from-white to-primary-fixed/30 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Official Curriculum Coverage</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h3 className="text-2xl font-extrabold text-on-primary-fixed">
              {summary ? `${summary.officialCoveragePercentage}%` : '0%'}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {summary ? `${summary.approvedCount} approved` : '0 approved'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Drives Official CBC Progress</p>
        </div>

        <div className="bg-surface-container-lowest border border-primary/80 bg-gradient-to-br from-white to-primary-fixed/30 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Review</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h3 className="text-2xl font-extrabold text-on-primary-fixed">
              {summary ? summary.submittedCount : records.filter(r => r.status === 'SUBMITTED').length}
            </h3>
            {summary && summary.submittedCount > 0 && isSupervisor && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                Action Required
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Awaiting supervisor endorsement</p>
        </div>

        <div className="bg-surface-container-lowest border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/30 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Returned / Revision</p>
          <h3 className="text-2xl font-extrabold text-rose-900 mt-1">
            {summary ? summary.returnedCount : records.filter(r => r.status === 'RETURNED').length}
          </h3>
          <p className="text-[11px] text-rose-700 mt-1">Requires teacher correction</p>
        </div>
      </div>

      {/* Tabs: ALL, DRAFTS, PENDING REVIEW, APPROVED, RETURNED */}
      <div className="border-b border-outline-variant/30 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { id: 'ALL', label: 'All Records', count: summary?.totalLessons },
          { id: 'DRAFT', label: 'Drafts', count: summary?.draftsCount },
          { id: 'SUBMITTED', label: 'Pending Review', count: summary?.submittedCount },
          { id: 'APPROVED', label: 'Approved (Official)', count: summary?.approvedCount },
          { id: 'RETURNED', label: 'Returned for Revision', count: summary?.returnedCount }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as StatusFilterTab)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-rose-50/40'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/30'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search subject, strand, or reflection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Week Filter:</label>
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-surface font-medium text-on-surface-variant cursor-pointer"
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

      {/* Main Records Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
            Loading diary records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-surface/80 border-b border-outline-variant/30 text-on-surface-variant font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 w-32">Timeline</th>
                  <th className="px-5 py-4 w-44">Subject & Class</th>
                  <th className="px-5 py-4 min-w-[280px]">Curriculum Work Covered</th>
                  <th className="px-5 py-4 w-32">Status</th>
                  <th className="px-5 py-4 min-w-[240px] bg-amber-50/40 text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[16px]">psychology</span>
                      Teacher Reflection
                    </div>
                  </th>
                  <th className="px-5 py-4 text-right w-44">Workflow & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => {
                  const isRecordTeacher = currentUserId && record.teacherId === currentUserId;
                  const canApprove = isSupervisor && !isRecordTeacher;

                  return (
                    <tr key={record.id} className="hover:bg-surface/70 transition-colors align-top group">
                      
                      {/* Timeline */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-on-surface text-sm">Week {record.weekNumber || record.week}</span>
                          <span className="text-on-surface-variant font-medium mt-0.5">
                            {record.day} {record.lessonPeriod || record.period ? `· P${record.lessonPeriod || record.period}` : ''}
                          </span>
                          {record.lessonDate && (
                            <span className="text-[11px] text-gray-400 mt-0.5">{record.lessonDate}</span>
                          )}
                          <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            {record.academicYear || ''} {record.term || ''}
                          </span>
                        </div>
                      </td>

                      {/* Subject & Class */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingRecord(record)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-primary border border-rose-100 font-bold text-xs whitespace-normal leading-snug cursor-pointer transition-colors text-left"
                            title="Click to view details"
                          >
                            <span className="material-symbols-outlined text-[15px] shrink-0">visibility</span>
                            <span>{record.subjectAndGrade}</span>
                          </button>
                          {record.teacherName && (
                            <span className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px] text-gray-400">person</span>
                              {record.teacherName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Work Covered */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {record.lessonTopic && (
                            <p className="font-bold text-on-surface text-xs">
                              {record.lessonTopic}
                            </p>
                          )}
                          <p className="text-on-surface-variant leading-relaxed text-xs">
                            {record.strandAndWorkCovered}
                          </p>
                          {record.reference && (
                            <p className="text-[11px] text-gray-400 italic">
                              Ref: {record.reference}
                            </p>
                          )}

                          {/* Supervisor Return Banner if returned */}
                          {record.status === 'RETURNED' && record.returnReason && (
                            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                              <span className="font-bold block text-rose-800">Return Feedback:</span>
                              {record.returnReason}
                            </div>
                          )}

                          {/* Supervisor Approval Remarks if approved */}
                          {record.status === 'APPROVED' && record.reviewRemarks && (
                            <div className="mt-1.5 text-[11px] text-emerald-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">comment</span>
                              <span>Endorsement: "{record.reviewRemarks}"</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {getStatusBadge(record.status)}
                      </td>

                      {/* Reflection */}
                      <td className="px-5 py-4 bg-amber-50/20">
                        {record.reflection || record.reflectionData?.whatWentWell ? (
                          <div className="p-2.5 bg-surface-container-lowest border border-amber-200 rounded-xl space-y-1 shadow-xs">
                            {record.reflectionData?.comprehensionLevel && (
                              <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                {record.reflectionData.comprehensionLevel}
                              </span>
                            )}
                            <p className="text-on-surface text-xs leading-relaxed">
                              {record.reflection || record.reflectionData?.whatWentWell}
                            </p>
                            {record.reflectionData?.remedialPlan && (
                              <p className="text-[11px] text-amber-900 font-semibold mt-1">
                                Remedial: {record.reflectionData.remedialPlan}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No reflection recorded</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          
                          {/* Teacher Action: Submit draft or resubmit returned */}
                          {(record.status === 'DRAFT' || record.status === 'RETURNED') && (
                            <button
                              onClick={() => handleSubmitForReview(record)}
                              className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-container text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Submit entry for supervisor review"
                            >
                              <span className="material-symbols-outlined text-[14px]">send</span>
                              {record.status === 'RETURNED' ? 'Resubmit' : 'Submit for Review'}
                            </button>
                          )}

                          {/* Supervisor Actions: Approve & Return */}
                          {isSupervisor&&(record.weekNumber||record.week)>1&&<button onClick={()=>handleExemptPreviousWeek(record)} className="rounded-lg border border-primary bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-on-primary-fixed hover:bg-primary-fixed" title="Mark the immediately preceding week as exempt because no instruction took place">Mark Week {(record.weekNumber||record.week)-1} as No Instruction</button>}
                          {record.status === 'SUBMITTED' && isSupervisor && (
                            <div className="flex items-center gap-1">
                              {canApprove ? (
                                <button
                                  onClick={() => {
                                    setApprovingRecord(record);
                                    setApprovalRemarks('Endorsed; lesson delivery meets curriculum standards.');
                                  }}
                                  className="px-2.5 py-1 bg-primary text-white rounded-lg hover:bg-primary-container text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Approve diary entry and increment curriculum coverage"
                                >
                                  <span className="material-symbols-outlined text-[14px]">check</span>
                                  Approve
                                </button>
                              ) : (
                                <span
                                  className="text-[10px] text-gray-400 italic"
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
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Return to teacher with correction feedback"
                              >
                                <span className="material-symbols-outlined text-[14px]">undo</span>
                                Return
                              </button>
                            </div>
                          )}

                          {/* Edit & Delete actions for drafts / returned */}
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              onClick={() => setViewingRecord(record)}
                              className="px-2.5 py-1 bg-primary text-white rounded-lg hover:bg-primary-container text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="View full record dossier & teacher reflection details"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                              <span>View Details</span>
                            </button>

                            {(record.status !== 'APPROVED' || isSupervisor) && (
                              <button
                                onClick={() => setSelectedRecord(record)}
                                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit entry"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                            )}

                            {(record.status !== 'APPROVED' || isSupervisor) && (
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                disabled={actionLoading}
                                aria-label="Delete Record of Work"
                                title="Delete Record of Work"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span><span className="ml-1 text-xs font-semibold">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredRecords.length === 0 && !loading && (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center mb-3 border border-outline-variant/30">
              <span className="material-symbols-outlined text-2xl text-gray-400">history_edu</span>
            </div>
            <h3 className="text-sm font-bold text-on-surface mb-0.5">No diary records found</h3>
            <p className="text-xs text-on-surface-variant max-w-sm">
              {searchTerm || weekFilter !== 'ALL' || activeTab !== 'ALL'
                ? 'Try adjusting your search criteria or switching status tabs.'
                : 'Click "New Diary Entry" to start recording lesson coverage.'}
            </p>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approvingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900">
                <span className="material-symbols-outlined text-emerald-600">verified</span>
                <h3 className="font-bold text-base">Approve Teacher Diary Record</h3>
              </div>
              <button onClick={() => setApprovingRecord(null)} className="text-gray-400 hover:text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-surface rounded-xl text-xs space-y-1">
                <p><span className="font-bold text-on-surface-variant">Teacher:</span> {approvingRecord.teacherName || 'Assigned Teacher'}</p>
                <p><span className="font-bold text-on-surface-variant">Class & Subject:</span> {approvingRecord.subjectAndGrade}</p>
                <p><span className="font-bold text-on-surface-variant">Curriculum Week:</span> Week {approvingRecord.weekNumber || approvingRecord.week}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-on-surface-variant mb-1">
                  Supervisor Endorsement Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="e.g. Approved; clear lesson objectives and learner activities demonstrated."
                  className="w-full px-3.5 py-2 text-xs border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Approving this record verifies the teaching evidence used in Coverage Tracking. Other scheduled lessons can be recorded independently.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface/80 border-t border-outline-variant/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setApprovingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-on-surface-variant bg-white border border-outline-variant/30 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary-container shadow-sm flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900">
                <span className="material-symbols-outlined text-rose-600">assignment_return</span>
                <h3 className="font-bold text-base">Return Diary Entry for Correction</h3>
              </div>
              <button onClick={() => setReturningRecord(null)} className="text-gray-400 hover:text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-surface rounded-xl text-xs space-y-1">
                <p><span className="font-bold text-on-surface-variant">Teacher:</span> {returningRecord.teacherName || 'Teacher'}</p>
                <p><span className="font-bold text-on-surface-variant">Class & Subject:</span> {returningRecord.subjectAndGrade}</p>
                <p><span className="font-bold text-on-surface-variant">Curriculum Week:</span> Week {returningRecord.weekNumber || returningRecord.week}</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-rose-900 mb-1">
                  Reason for Return / Required Revision *
                </label>
                <textarea
                  rows={3}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Specify what requires correction (e.g. Please document specific learning outcomes achieved or include remedial action taken for struggling learners)."
                  className="w-full px-3.5 py-2 text-xs border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant">
                The submitting teacher will be notified with your feedback and can revise and resubmit this record.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface/80 border-t border-outline-variant/30 flex items-center justify-end gap-3">
              <button
                onClick={() => setReturningRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-on-surface-variant bg-white border border-outline-variant/30 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={actionLoading || !returnReason.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
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

      {/* View Record of Work Dossier Modal */}
      {viewingRecord && (
        <ViewRecordOfWorkModal
          record={viewingRecord}
          school={documentSchool}
          onClose={() => setViewingRecord(null)}
          onEdit={(rec) => {
            setViewingRecord(null);
            setSelectedRecord(rec);
          }}
          canEdit={Boolean(viewingRecord.status !== 'APPROVED' || isSupervisor)}
        />
      )}
    </div>
  );
};

export default RecordsOfWorkView;
