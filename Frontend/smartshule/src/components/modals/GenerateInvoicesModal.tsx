import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { AcademicYear, AcademicTerm, Student } from '../../types';

interface GenerateInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoicesGenerated: () => void;
  targetStudent?: Student | null;
  students?: Student[];
}

interface BulkPreviewCandidate {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  gradeLevel: string;
  status: 'READY' | 'ALREADY_INVOICED' | 'EXEMPT_SPONSORED' | 'MISSING_FEE_STRUCTURE';
  reason: string;
  feeStructureId: string | null;
  feeStructureTitle: string;
  baseAmount: number;
  carriedForwardBalance: number;
  totalPayable: number;
  existingInvoiceNumber: string | null;
}

interface BulkPreviewData {
  period: {
    academicYearId: string;
    termId: string;
    termNumber: number;
  };
  scope: string;
  summary: {
    totalEligible: number;
    readyCount: number;
    alreadyInvoicedCount: number;
    exemptSponsoredCount: number;
    missingStructureCount: number;
    totalEstimatedBilling: number;
  };
  candidates: BulkPreviewCandidate[];
}

export const GenerateInvoicesModal: React.FC<GenerateInvoicesModalProps> = ({
  isOpen,
  onClose,
  onInvoicesGenerated,
  targetStudent,
  students = [],
}) => {
  // Tabs: 'CREATE' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'CREATE' | 'HISTORY'>('CREATE');

  // Configuration
  const [scope, setScope] = useState<'ALL' | 'ECDE' | 'PRIMARY' | 'JUNIOR_SECONDARY' | 'GRADE' | 'SINGLE_STUDENT'>('ALL');
  const [gradeLevel, setGradeLevel] = useState('GRADE_4');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [allStudentsList, setAllStudentsList] = useState<Student[]>(students);

  // Academic Period
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Preview & Execution State
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState<BulkPreviewData | null>(null);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Status feedback
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter in preview table
  const [candidateFilter, setCandidateFilter] = useState<'ALL' | 'READY' | 'SKIPPED'>('ALL');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setMessage(null);
      setPreviewData(null);
      setExecutionResult(null);
      setActiveTab('CREATE');
      loadAcademicData();

      if (targetStudent) {
        setScope('SINGLE_STUDENT');
        setSelectedStudentId(targetStudent.id);
      } else {
        setScope('ALL');
        setSelectedStudentId('');
      }

      if (students.length === 0) {
        apiService.getStudents().then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setAllStudentsList(res.data as any);
          }
        }).catch(() => {});
      } else {
        setAllStudentsList(students);
      }
    }
  }, [isOpen, targetStudent]);

  const loadAcademicData = async () => {
    try {
      const yearsRes = await apiService.getYears().catch(() => null);
      if (yearsRes?.success && yearsRes.data && yearsRes.data.length > 0) {
        setAcademicYears(yearsRes.data);
        const currentYear = yearsRes.data.find((y: any) => y.isCurrent) || yearsRes.data[0];
        setSelectedYearId(currentYear.id);
        const termsRes = await apiService.getTerms(currentYear.id);
        if (termsRes.success && termsRes.data) {
          setTerms(termsRes.data);
          const currentTerm = termsRes.data.find((t: any) => t.isCurrent) || termsRes.data[0];
          if (currentTerm) setSelectedTermId(currentTerm.id);
        }
      }
    } catch (err) {
      console.error('Failed to load academic years:', err);
    }
  };

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    setPreviewData(null);
    try {
      const res = await apiService.getTerms(yearId);
      if (res.success && res.data) {
        setTerms(res.data);
        if (res.data.length > 0) setSelectedTermId(res.data[0].id);
        else setSelectedTermId('');
      }
    } catch {
      setTerms([]);
      setSelectedTermId('');
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await apiService.getBulkBillingHistory();
      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to load billing history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedYearId || !selectedTermId) {
      setError('Please select an active academic year and term.');
      return;
    }
    if (scope === 'GRADE' && !gradeLevel) {
      setError('Please select a CBC grade level.');
      return;
    }
    if (scope === 'SINGLE_STUDENT' && !selectedStudentId) {
      setError('Please select a learner to invoice.');
      return;
    }

    setIsPreviewLoading(true);
    setError(null);
    setMessage(null);
    setExecutionResult(null);

    try {
      const res = await apiService.previewBulkInvoices({
        academicYearId: selectedYearId,
        termId: selectedTermId,
        scope,
        targetGradeLevel: scope === 'GRADE' ? gradeLevel : undefined,
        studentId: scope === 'SINGLE_STUDENT' ? selectedStudentId : undefined,
        includePreviousBalance,
      });

      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        setError(res.message || 'Failed to generate bulk billing preview');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExecuteBulk = async () => {
    if (!previewData || previewData.summary.readyCount === 0) {
      setError('No eligible learners are ready for invoicing.');
      return;
    }

    const confirmMsg = scope === 'SINGLE_STUDENT'
      ? `Generate official term fee invoice for ${previewData.candidates[0]?.studentName || 'selected learner'} totalling KES ${previewData.summary.totalEstimatedBilling.toLocaleString()}?`
      : `Generate ${previewData.summary.readyCount} invoice(s) totalling KES ${previewData.summary.totalEstimatedBilling.toLocaleString()}? Existing invoices will NOT be duplicated.`;
    if (!confirm(confirmMsg)) return;

    setIsExecuting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await apiService.executeBulkInvoices({
        academicYearId: selectedYearId,
        termId: selectedTermId,
        scope,
        targetGradeLevel: scope === 'GRADE' ? gradeLevel : undefined,
        studentId: scope === 'SINGLE_STUDENT' ? selectedStudentId : undefined,
        includePreviousBalance,
        dueDate: dueDate || undefined,
      });

      if (res.success && res.data) {
        setExecutionResult(res.data);
        setMessage(res.data.message || (scope === 'SINGLE_STUDENT' ? 'Learner term invoice generated successfully!' : 'Invoices generated successfully in bulk!'));
        onInvoicesGenerated();
      } else {
        setError(res.message || 'Invoice generation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing invoice generation');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCandidates = (previewData?.candidates || []).filter(c => {
    if (candidateFilter === 'READY') return c.status === 'READY';
    if (candidateFilter === 'SKIPPED') return c.status !== 'READY';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px] text-amber-300">receipt_long</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Automated Bulk Fee Invoicing</h3>
              <p className="text-xs text-rose-100">
                Grade-level & cohort bulk billing with pre-flight preview & idempotency protection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('CREATE');
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'CREATE' ? 'bg-white text-[#7a1228]' : 'text-rose-100 hover:bg-white/10'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => {
                setActiveTab('HISTORY');
                loadHistory();
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'HISTORY' ? 'bg-white text-[#7a1228]' : 'text-rose-100 hover:bg-white/10'
              }`}
            >
              Batch History
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-2"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="m-4 p-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{message}</span>
          </div>
        )}

        {/* Content Body */}
        {activeTab === 'CREATE' ? (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
            
            {/* Step 1: Billing Period & Cohort Configuration */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                Billing Period & Cohort Scope
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Academic Year */}
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                    Academic Year *
                  </label>
                  <select
                    value={selectedYearId}
                    onChange={e => handleYearChange(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-semibold"
                  >
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name || y.id} {y.isCurrent ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Term */}
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                    Academic Term *
                  </label>
                  <select
                    value={selectedTermId}
                    onChange={e => {
                      setSelectedTermId(e.target.value);
                      setPreviewData(null);
                    }}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-semibold"
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.id} {t.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scope */}
                <div>
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                    Target Cohort *
                  </label>
                  <select
                    value={scope}
                    onChange={e => {
                      setScope(e.target.value as any);
                      setPreviewData(null);
                    }}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-semibold"
                  >
                    <option value="SINGLE_STUDENT">Individual Pupil (Search & Bill Single Learner)</option>
                    <option value="ALL">Entire School (All Learners)</option>
                    <option value="ECDE">ECDE Only (Playgroup, PP1, PP2)</option>
                    <option value="PRIMARY">Primary Only (Grade 1 - 6)</option>
                    <option value="JUNIOR_SECONDARY">Junior Secondary (Grade 7 - 9)</option>
                    <option value="GRADE">Specific Single Grade</option>
                  </select>
                </div>

                {/* Single Grade (if scope is GRADE) */}
                {scope === 'GRADE' && (
                  <div>
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                      Grade Level *
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={e => {
                        setGradeLevel(e.target.value);
                        setPreviewData(null);
                      }}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-semibold"
                    >
                      <option value="PLAYGROUP">Playgroup</option>
                      <option value="PP1">PP1</option>
                      <option value="PP2">PP2</option>
                      <option value="GRADE_1">Grade 1</option>
                      <option value="GRADE_2">Grade 2</option>
                      <option value="GRADE_3">Grade 3</option>
                      <option value="GRADE_4">Grade 4</option>
                      <option value="GRADE_5">Grade 5</option>
                      <option value="GRADE_6">Grade 6</option>
                      <option value="GRADE_7">Grade 7</option>
                      <option value="GRADE_8">Grade 8</option>
                      <option value="GRADE_9">Grade 9</option>
                    </select>
                  </div>
                )}

                {/* Pupil Selector (if scope is SINGLE_STUDENT) */}
                {scope === 'SINGLE_STUDENT' && (
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                      Select Learner to Bill *
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={e => {
                        setSelectedStudentId(e.target.value);
                        setPreviewData(null);
                      }}
                      className="w-full text-xs py-2 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-semibold"
                    >
                      <option value="">-- Choose Learner to Bill --</option>
                      {allStudentsList.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Adm: {s.admNo}) · {s.grade} {s.stream ? `(${s.stream})` : ''} · Bal: KES {(s.feeBalance || 0).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Pupil Spotlight Card when SINGLE_STUDENT is selected */}
              {scope === 'SINGLE_STUDENT' && selectedStudentId && (() => {
                const currentPupil = allStudentsList.find(s => s.id === selectedStudentId);
                if (!currentPupil) return null;
                return (
                  <div className="p-3 bg-white rounded-xl border border-[#7a1228]/20 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#7a1228]/10 text-[#7a1228] font-bold text-xs flex items-center justify-center shrink-0">
                        {currentPupil.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{currentPupil.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Adm #{currentPupil.admNo} · {currentPupil.grade} {currentPupil.stream ? `(${currentPupil.stream})` : ''} · Guardian: {currentPupil.guardianName || '--'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Current Outstanding</span>
                      <span className={`text-xs font-bold font-mono ${currentPupil.feeBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {currentPupil.feeBalance > 0 ? `KES ${currentPupil.feeBalance.toLocaleString()}` : 'KES 0 (Cleared / Unbilled)'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Advanced Options */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/30">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-on-surface">
                  <input
                    type="checkbox"
                    checked={includePreviousBalance}
                    onChange={e => {
                      setIncludePreviousBalance(e.target.checked);
                      setPreviewData(null);
                    }}
                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <span>Automatically carry forward previous unpaid fee arrears</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-on-surface-variant font-medium">Invoice Due Date (Optional):</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="text-xs py-1 px-2.5 rounded border border-outline-variant bg-surface"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPreviewLoading || isExecuting}
                  className="px-5 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-lg hover:bg-[#600e1f] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  {isPreviewLoading ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                  )}
                  <span>Preview Qualifying Learners</span>
                </button>
              </div>
            </div>

            {/* Step 2: Pre-Flight Preview Results */}
            {previewData && (
              <div className="space-y-4 animate-fade-in">
                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">Eligible Learners</span>
                    <strong className="text-lg font-bold text-on-surface font-data-mono">{previewData.summary.totalEligible}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Ready to Invoice</span>
                    <strong className="text-lg font-bold text-emerald-700 font-data-mono">{previewData.summary.readyCount}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Already Invoiced (Skip)</span>
                    <strong className="text-lg font-bold text-amber-700 font-data-mono">{previewData.summary.alreadyInvoicedCount}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">100% Scholarship</span>
                    <strong className="text-lg font-bold text-blue-700 font-data-mono">{previewData.summary.exemptSponsoredCount}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Estimated Billing</span>
                    <strong className="text-base font-bold text-[#7a1228] font-data-mono">
                      KES {previewData.summary.totalEstimatedBilling.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Candidate Table Controls */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-on-surface">Candidate Table ({filteredCandidates.length})</span>
                    <div className="flex rounded-lg border border-outline-variant p-0.5 bg-surface text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setCandidateFilter('ALL')}
                        className={`px-2.5 py-0.5 rounded cursor-pointer ${candidateFilter === 'ALL' ? 'bg-[#7a1228] text-white' : 'text-on-surface-variant'}`}
                      >
                        All ({previewData.candidates.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCandidateFilter('READY')}
                        className={`px-2.5 py-0.5 rounded cursor-pointer ${candidateFilter === 'READY' ? 'bg-emerald-700 text-white' : 'text-on-surface-variant'}`}
                      >
                        Ready ({previewData.summary.readyCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCandidateFilter('SKIPPED')}
                        className={`px-2.5 py-0.5 rounded cursor-pointer ${candidateFilter === 'SKIPPED' ? 'bg-amber-700 text-white' : 'text-on-surface-variant'}`}
                      >
                        Skipped ({previewData.summary.alreadyInvoicedCount + previewData.summary.exemptSponsoredCount + previewData.summary.missingStructureCount})
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteBulk}
                    disabled={isExecuting || previewData.summary.readyCount === 0}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {isExecuting ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    )}
                    <span>Confirm & Generate Invoices ({previewData.summary.readyCount})</span>
                  </button>
                </div>

                {/* Preview Table */}
                <div className="border border-outline-variant/30 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-container text-on-surface-variant font-bold sticky top-0 border-b border-outline-variant/30">
                      <tr>
                        <th className="p-2.5">Learner & Adm</th>
                        <th className="p-2.5">Grade</th>
                        <th className="p-2.5">Fee Structure</th>
                        <th className="p-2.5 text-right">Base Fee</th>
                        <th className="p-2.5 text-right">Arrears</th>
                        <th className="p-2.5 text-right">Net Payable</th>
                        <th className="p-2.5 text-center">Billing Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 bg-surface">
                      {filteredCandidates.map(c => (
                        <tr key={c.studentId} className="hover:bg-surface-container-low transition-colors">
                          <td className="p-2.5">
                            <strong className="text-on-surface block font-semibold">{c.studentName}</strong>
                            <span className="text-[11px] text-on-surface-variant font-data-mono">Adm #{c.admissionNumber}</span>
                          </td>
                          <td className="p-2.5 font-data-mono text-[11px]">{c.gradeLevel}</td>
                          <td className="p-2.5 text-[11px] text-on-surface-variant max-w-[150px] truncate" title={c.feeStructureTitle}>
                            {c.feeStructureTitle}
                          </td>
                          <td className="p-2.5 text-right font-data-mono">KES {c.baseAmount.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-data-mono text-amber-700">
                            {c.carriedForwardBalance > 0 ? `+KES ${c.carriedForwardBalance.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-2.5 text-right font-data-mono font-bold text-[#7a1228]">
                            KES {c.totalPayable.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center">
                            {c.status === 'READY' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Ready
                              </span>
                            )}
                            {c.status === 'ALREADY_INVOICED' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title={c.reason}>
                                Already Billed
                              </span>
                            )}
                            {c.status === 'EXEMPT_SPONSORED' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                100% Scholarship
                              </span>
                            )}
                            {c.status === 'MISSING_FEE_STRUCTURE' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={c.reason}>
                                Missing Structure
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Execution Success Card */}
                {executionResult && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-700 text-[20px]">task_alt</span>
                      <strong className="text-sm font-bold text-emerald-900">
                        Bulk Invoicing Batch Completed Successfully!
                      </strong>
                    </div>
                    <p className="text-xs text-emerald-800">
                      Batch ID: <span className="font-data-mono font-bold">{executionResult.batchId}</span> · Generated {executionResult.batchSummary?.totalGenerated} invoices · Total Amount Billed: <span className="font-bold">KES {executionResult.batchSummary?.totalAmountBilled?.toLocaleString()}</span>
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>
        ) : (
          /* Tab 2: Billing Batch History */
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Historical Bulk Invoicing Batches
              </h4>
              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Refresh
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                <span>Loading batch history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant border border-dashed border-outline-variant/40 rounded-xl">
                No past bulk billing batches recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(batch => (
                  <div key={batch.id} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-on-surface font-data-mono">{batch.id}</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {batch.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant">
                        {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-on-surface-variant uppercase block">Scope</span>
                        <strong className="font-semibold text-on-surface">{batch.scope} {batch.targetGradeLevel ? `(${batch.targetGradeLevel})` : ''}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant uppercase block">Generated</span>
                        <strong className="font-data-mono text-emerald-700">{batch.totalGenerated} invoices</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant uppercase block">Skipped / Exempt</span>
                        <strong className="font-data-mono text-amber-700">{batch.totalSkipped}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-on-surface-variant uppercase block">Total Amount Billed</span>
                        <strong className="font-data-mono text-[#7a1228] font-bold">KES {batch.totalAmountBilled?.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-surface-container border-t border-outline-variant/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-emerald-700">shield</span>
            <span>Duplicate protection active: re-running billing never duplicates existing invoices.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
