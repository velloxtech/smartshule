import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  FileSignature,
  Layers,
  History,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Mail,
  Send,
  Eye,
  Filter,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  FileText
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DocumentSigningModal } from '../common/DocumentSigningModal';

export const DocumentSigningCenterView: React.FC = () => {
  const { user } = useAuth();

  // Tabs: 'bulk' | 'pending' | 'archive' | 'policies'
  const [activeTab, setActiveTab] = useState<'bulk' | 'pending' | 'archive' | 'policies'>('bulk');

  // Vault Profile Status
  const [vaultProfile, setVaultProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Policies
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Bulk Signing State
  const [selectedDocType, setSelectedDocType] = useState<string>('REPORT_CARD');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [preparingBatch, setPreparingBatch] = useState(false);
  const [preparedBatch, setPreparedBatch] = useState<any>(null);
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Bulk OTP Challenge & Execution Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [challengeData, setChallengeData] = useState<any>(null);
  const [initiatingChallenge, setInitiatingChallenge] = useState(false);
  const [executingBulk, setExecutingBulk] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Archive & Audit Trail State
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Policy Editor State
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Individual Signing Modal for Pending
  const [signingItem, setSigningItem] = useState<any | null>(null);

  // Load User Signature Vault Profile
  const loadVaultProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await apiService.getMySignature();
      if (res?.success && res.data) {
        setVaultProfile(res.data);
      }
    } catch {
      setVaultProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Load Context Data (Years, Terms, Classes, Policies)
  const loadInitialData = async () => {
    try {
      const [ctxRes, clsRes, polRes] = await Promise.all([
        apiService.getCurrentContext().catch(() => null),
        apiService.getClasses().catch(() => null),
        apiService.getSigningPolicies().catch(() => null)
      ]);

      if (ctxRes?.success && ctxRes.data) {
        if (ctxRes.data.allTerms) setTerms(ctxRes.data.allTerms);
        if (ctxRes.data.currentTerm) setSelectedTermId(ctxRes.data.currentTerm.id);
        if (ctxRes.data.currentYear) setSelectedYearId(ctxRes.data.currentYear.id);
      }

      if (clsRes?.success && clsRes.data) {
        setClasses(clsRes.data);
        if (clsRes.data.length > 0) {
          // Default to PP1 or first class
          const pp1 = clsRes.data.find((c: any) => c.name?.toLowerCase().includes('pp1'));
          setSelectedClassId(pp1 ? pp1.id : clsRes.data[0].id);
        }
      }

      if (polRes?.success && polRes.data) {
        setPolicies(polRes.data);
      }
    } catch (e) {
      console.error('Error loading initial signing center data', e);
    }
  };

  // Load Students for Selected Class
  useEffect(() => {
    if (!selectedClassId) return;
    apiService.getStudents({ classId: selectedClassId } as any).then((res) => {
      if (res?.data && Array.isArray(res.data)) {
        setStudents(res.data);
      } else {
        setStudents([]);
      }
    }).catch(() => setStudents([]));
  }, [selectedClassId]);

  useEffect(() => {
    loadVaultProfile();
    loadInitialData();
  }, []);

  // Load Signed Records when Archive tab is active
  useEffect(() => {
    if (activeTab === 'archive') {
      setLoadingRecords(true);
      apiService.getSignatureRecords({ limit: 100 })
        .then((res) => {
          if (res?.success && res.data) {
            setRecords(res.data);
          }
        })
        .finally(() => setLoadingRecords(false));
    }
  }, [activeTab]);

  // Selected Policy
  const currentPolicy = useMemo(() => {
    return policies.find(p => p.documentType === selectedDocType) || null;
  }, [policies, selectedDocType]);

  // Candidate items to sign
  const prepareBatchAction = async () => {
    if (!selectedClassId || students.length === 0) {
      alert('Please select a class with active enrolled pupils.');
      return;
    }

    setPreparingBatch(true);
    setPreparedBatch(null);
    setBatchItems([]);
    setBulkError(null);

    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const selectedTerm = terms.find(t => t.id === selectedTermId);
      const scopeDesc = `${selectedClass?.name || 'Class'} ${selectedTerm?.name || 'Term'} ${selectedDocType.replace(/_/g, ' ')}`;

      // Construct canonical items for each student
      const items = students.map(s => {
        const docId = `RC_${selectedYearId || '2026'}_${selectedTermId || 'T1'}_${s.id}`;
        return {
          documentId: docId,
          documentTitle: `${s.name} (${s.admissionNumber || s.admNo || 'Learner'})`,
          studentId: s.id,
          studentName: s.name,
          documentVersion: '1.0',
          documentContent: JSON.stringify({
            studentId: s.id,
            admNo: s.admissionNumber || s.admNo,
            name: s.name,
            grade: s.gradeLevel || s.grade,
            stream: s.streamName || s.stream,
            classId: selectedClassId,
            termId: selectedTermId,
            yearId: selectedYearId,
            docType: selectedDocType
          })
        };
      });

      const res = await apiService.prepareBulkSigning({
        documentType: selectedDocType,
        scopeDescription: scopeDesc,
        items
      });

      if (res?.success && res.data) {
        setPreparedBatch(res.data.batch);
        setBatchItems(res.data.items);
        const readyIds = new Set(res.data.items.filter((i: any) => i.status === 'READY').map((i: any) => i.id));
        setSelectedItemIds(readyIds);
      }
    } catch (err: any) {
      setBulkError(err?.message || 'Failed to prepare bulk signing batch.');
    } finally {
      setPreparingBatch(false);
    }
  };

  // Launch Bulk Challenge
  const handleInitiateBulkChallenge = async () => {
    if (!preparedBatch) return;

    setInitiatingChallenge(true);
    setBulkError(null);
    setOtpCode('');

    try {
      const res = await apiService.initiateBulkChallenge({
        batchId: preparedBatch.id,
        batchDigest: preparedBatch.batchDigest
      });

      if (res?.success && res.data) {
        setChallengeData(res.data);
        setIsOtpModalOpen(true);
        // In local test mode, fill debug OTP if present
        if (res.data.debugOtp) {
          setOtpCode(res.data.debugOtp);
        }
      }
    } catch (err: any) {
      setBulkError(err?.message || 'Failed to dispatch bulk signing verification code.');
    } finally {
      setInitiatingChallenge(false);
    }
  };

  // Execute Bulk Signing
  const handleExecuteBulkSigning = async () => {
    if (!preparedBatch || !challengeData || !otpCode) return;

    setExecutingBulk(true);
    setBulkError(null);

    try {
      const res = await apiService.executeBulkSigning({
        batchId: preparedBatch.id,
        challengeId: challengeData.challengeId,
        otpCode: otpCode.trim()
      });

      if (res?.success && res.data) {
        setExecutionResult(res.data);
        setIsOtpModalOpen(false);
        // Refresh batch details
        setPreparedBatch(res.data.batch);
        setBatchItems(res.data.items);
      }
    } catch (err: any) {
      setBulkError(err?.message || 'Bulk signing execution failed.');
    } finally {
      setExecutingBulk(false);
    }
  };

  // Retry Failed Items
  const handleRetryFailed = async () => {
    if (!preparedBatch) return;
    setInitiatingChallenge(true);
    try {
      // Re-challenge for retry
      const chalRes = await apiService.initiateBulkChallenge({
        batchId: preparedBatch.id,
        batchDigest: preparedBatch.batchDigest
      });
      if (chalRes?.success && chalRes.data) {
        setChallengeData(chalRes.data);
        setIsOtpModalOpen(true);
        if (chalRes.data.debugOtp) setOtpCode(chalRes.data.debugOtp);
      }
    } catch (err: any) {
      alert(err.message || 'Retry initiation failed');
    } finally {
      setInitiatingChallenge(false);
    }
  };

  // Filtered Archive Records
  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      (r.signerName || '').toLowerCase().includes(q) ||
      (r.documentId || '').toLowerCase().includes(q) ||
      (r.documentType || '').toLowerCase().includes(q) ||
      (r.signerRole || '').toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  // Is Admin or Head Teacher for Policy Configuration
  const canManagePolicies = useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'SUPER_ADMIN' || r === 'HEAD_TEACHER' || r === 'DIRECTOR' || r === 'ADMIN';
  }, [user]);

  return (
    <div className="space-y-6 pb-16 font-body text-on-surface">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#800000] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Digital Signature &amp; Document Endorsement Centre</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface mt-1">Document Signing &amp; Approval Centre</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Grace Seeds School — Centralized universal electronic signing, multi-signatory endorsement, and bulk batch processing.
          </p>
        </div>

        {/* Vault Profile Indicator */}
        <div className="flex items-center gap-3 bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/30">
          <div className="w-9 h-9 rounded-full bg-[#800000]/10 text-[#800000] flex items-center justify-center shrink-0">
            <FileSignature className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span>{vaultProfile?.isConfigured ? 'Vault Configured' : 'No Signature Saved'}</span>
              {vaultProfile?.isConfigured ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant flex items-center gap-2">
              <span>{vaultProfile?.email || user?.email || 'No email'}</span>
              <a
                href="#signature-vault"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = '#signature-vault';
                  window.dispatchEvent(new CustomEvent('navigate-to-vault'));
                }}
                className="text-[#800000] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                Manage Vault <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-outline-variant/30 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'bulk'
              ? 'border-[#800000] text-[#800000] bg-[#800000]/5'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bulk Signing Operations</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-[#800000] text-[#800000] bg-[#800000]/5'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Documents Queue</span>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'archive'
              ? 'border-[#800000] text-[#800000] bg-[#800000]/5'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Signed Documents Archive</span>
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'policies'
              ? 'border-[#800000] text-[#800000] bg-[#800000]/5'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Signing Policies &amp; Placement</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BULK SIGNING OPERATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#800000]" />
                <span>Configure Bulk Signing Scope</span>
              </h2>
              {currentPolicy && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Policy: {currentPolicy.signingOrder} · {currentPolicy.requiredSignaturesCount} signature(s) required
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Document Type Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Document Type
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/50 focus:border-[#800000] text-xs font-semibold"
                >
                  <option value="REPORT_CARD">CBC Summative Learner Report Cards</option>
                  <option value="BROADSHEET">Academic Master Broadsheets</option>
                  <option value="FEE_STATEMENT">Student Fee Statements</option>
                  <option value="PAYROLL_VOUCHER">Staff Salary Payroll Vouchers</option>
                  <option value="ATTENDANCE_REGISTER">Class Attendance Registers</option>
                </select>
              </div>

              {/* Class Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Class / Grade Stream
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/50 focus:border-[#800000] text-xs font-semibold"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.studentCount ?? 0} pupils)
                    </option>
                  ))}
                </select>
              </div>

              {/* Term Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                  Academic Term
                </label>
                <select
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/50 focus:border-[#800000] text-xs font-semibold"
                >
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <div className="flex items-end">
                <button
                  onClick={prepareBatchAction}
                  disabled={preparingBatch || !selectedClassId}
                  className="w-full py-2 px-4 rounded-xl bg-[#800000] hover:bg-[#600000] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {preparingBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  <span>{preparingBatch ? 'Scanning Eligibility...' : 'Scan & Prepare Batch'}</span>
                </button>
              </div>
            </div>

            {bulkError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bulkError}</span>
              </div>
            )}
          </div>

          {/* Prepared Batch Inspection & Summary Cards */}
          {preparedBatch && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30">
                  <span className="text-[11px] font-semibold text-on-surface-variant block uppercase">Total Documents</span>
                  <span className="text-2xl font-black text-on-surface mt-1 block">{batchItems.length}</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
                  <span className="text-[11px] font-semibold text-emerald-800 block uppercase">Ready to Sign</span>
                  <span className="text-2xl font-black text-emerald-700 mt-1 block">
                    {batchItems.filter(i => i.status === 'READY').length}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                  <span className="text-[11px] font-semibold text-amber-800 block uppercase">Blocked / Pending Prior</span>
                  <span className="text-2xl font-black text-amber-700 mt-1 block">
                    {batchItems.filter(i => i.status === 'BLOCKED').length}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                  <span className="text-[11px] font-semibold text-blue-800 block uppercase">Already Signed</span>
                  <span className="text-2xl font-black text-blue-700 mt-1 block">
                    {batchItems.filter(i => i.status === 'SIGNED').length}
                  </span>
                </div>
              </div>

              {/* Action Banner for OTP Signing */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#800000] to-[#500000] text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-300" />
                    <span>Authorize Electronic Signing Batch ({batchItems.filter(i => i.status === 'READY').length} Ready)</span>
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Batch Digest: <code className="font-mono text-[10px] bg-black/20 px-1 py-0.5 rounded">{preparedBatch.batchDigest.substring(0, 24)}...</code>
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleInitiateBulkChallenge}
                    disabled={initiatingChallenge || batchItems.filter(i => i.status === 'READY').length === 0}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-[#800000] hover:bg-white/90 text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {initiatingChallenge ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    <span>Request 6-Digit Email OTP</span>
                  </button>
                </div>
              </div>

              {/* Execution Completion Report if Executed */}
              {executionResult && (
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-on-surface">
                      {executionResult.summary.failedCount === 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      <span>
                        Bulk Execution Finished: {executionResult.summary.signedCount} Signed, {executionResult.summary.failedCount} Failed
                      </span>
                    </div>

                    {executionResult.summary.failedCount > 0 && (
                      <button
                        onClick={handleRetryFailed}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Failed Documents ({executionResult.summary.failedCount})</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Documents Batch Table */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Eligible Documents in Scope ({batchItems.length})
                  </h4>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    Scope: {preparedBatch.scopeDescription}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-outline-variant/20">
                        <th className="py-2.5 px-4 w-12">#</th>
                        <th className="py-2.5 px-4">Learner / Recipient</th>
                        <th className="py-2.5 px-4">Document Title</th>
                        <th className="py-2.5 px-4">Document Reference</th>
                        <th className="py-2.5 px-4">Eligibility Status</th>
                        <th className="py-2.5 px-4">Reason / Audit Stamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {batchItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-surface-container-low/50">
                          <td className="py-2 px-4 text-on-surface-variant font-mono">{index + 1}</td>
                          <td className="py-2 px-4 font-semibold text-on-surface">
                            {item.studentName || '—'}
                          </td>
                          <td className="py-2 px-4 text-on-surface-variant">{item.documentTitle}</td>
                          <td className="py-2 px-4 font-mono text-[11px] text-on-surface-variant">
                            {item.documentId}
                          </td>
                          <td className="py-2 px-4">
                            {item.status === 'READY' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            )}
                            {item.status === 'BLOCKED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" /> Blocked
                              </span>
                            )}
                            {item.status === 'SIGNED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <FileCheck2 className="w-3 h-3" /> Signed
                              </span>
                            )}
                            {item.status === 'FAILED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3 h-3" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-[11px] text-on-surface-variant">
                            {item.failureReason || (item.signedAt ? `Signed on ${new Date(item.signedAt).toLocaleDateString('en-GB')}` : 'Ready for electronic placement')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENDING DOCUMENTS QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 text-center space-y-4 max-w-2xl mx-auto my-6">
          <div className="w-14 h-14 rounded-full bg-[#800000]/10 text-[#800000] flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-on-surface">Individual Document Signing Queue</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            To sign individual report cards, open <a href="#academics/report-cards" className="text-[#800000] font-bold hover:underline">Academics &gt; Report Cards</a> and click the <strong>&quot;Sign Report Card&quot;</strong> action in the toolbar. To sign multiple documents at once, switch to the <strong>Bulk Signing Operations</strong> tab.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('bulk')}
              className="px-4 py-2 rounded-xl bg-[#800000] text-white text-xs font-bold hover:bg-[#600000] transition-colors cursor-pointer"
            >
              Go to Bulk Signing Operations
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SIGNED DOCUMENTS ARCHIVE */}
      {/* ========================================================================= */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search by learner, signer, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs focus:border-[#800000]"
              />
            </div>
            <button
              onClick={() => {
                setLoadingRecords(true);
                apiService.getSignatureRecords({ limit: 100 })
                  .then(res => { if (res?.data) setRecords(res.data); })
                  .finally(() => setLoadingRecords(false));
              }}
              className="px-3 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRecords ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-outline-variant/20">
                    <th className="py-2.5 px-4">Signer Identity</th>
                    <th className="py-2.5 px-4">Signatory Role</th>
                    <th className="py-2.5 px-4">Document Type</th>
                    <th className="py-2.5 px-4">Document Reference</th>
                    <th className="py-2.5 px-4">Timestamp (UTC / Local)</th>
                    <th className="py-2.5 px-4">Integrity Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                        No signed document records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-surface-container-low/50">
                        <td className="py-2.5 px-4 font-bold text-on-surface">
                          {rec.signerName}
                          <span className="block text-[10px] text-on-surface-variant font-normal">
                            {rec.signerEmail}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#800000]/10 text-[#800000]">
                            {rec.signerRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-on-surface-variant font-semibold">
                          {rec.documentType}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-on-surface-variant">
                          {rec.documentId}
                        </td>
                        <td className="py-2.5 px-4 text-on-surface-variant">
                          {new Date(rec.signedAt).toLocaleString('en-GB')}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                              SHA256:{rec.documentHash ? rec.documentHash.substring(0, 10) : 'VERIFIED'}...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SIGNING POLICIES & PLACEMENT CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((pol) => (
              <div
                key={pol.id || pol.documentType}
                className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#800000] font-bold">
                      {pol.documentType}
                    </span>
                    <h3 className="text-sm font-bold text-on-surface">{pol.title}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    pol.allowBulkSigning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {pol.allowBulkSigning ? 'Bulk Signing Allowed' : 'Individual Only'}
                  </span>
                </div>

                <p className="text-xs text-on-surface-variant">{pol.description}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-surface-container-low p-2 rounded-xl">
                    <span className="text-on-surface-variant block">Required Signatures</span>
                    <span className="font-bold text-on-surface">{pol.requiredSignaturesCount} Signatory(ies)</span>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded-xl">
                    <span className="text-on-surface-variant block">Signing Order</span>
                    <span className="font-bold text-on-surface">{pol.signingOrder}</span>
                  </div>
                </div>

                {/* Placements visual representation */}
                <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                    Configured Signature Placements:
                  </span>
                  <div className="space-y-1">
                    {(pol.placements || []).map((pl: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-surface-container-low/70 px-2.5 py-1.5 rounded-lg border border-outline-variant/20">
                        <span className="font-semibold text-on-surface">
                          {idx + 1}. {pl.label} ({pl.role})
                        </span>
                        <span className="text-[10px] font-mono text-on-surface-variant">
                          {pl.position} · Page: {pl.page}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK SIGNING OTP CHALLENGE MODAL */}
      {/* ========================================================================= */}
      {isOtpModalOpen && challengeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#800000]/10 text-[#800000] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-on-surface">Bulk Signing Authorization</h3>
              </div>
              <button
                onClick={() => setIsOtpModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              An authorization code has been dispatched to your verified email address (<strong>{challengeData.maskedEmail}</strong>). Enter the 6 digits below to execute signing across all ready documents.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-on-surface uppercase mb-1">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-xl font-mono font-bold py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50 focus:border-[#800000]"
              />
            </div>

            {bulkError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {bulkError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsOtpModalOpen(false)}
                className="w-1/2 py-2 rounded-xl border border-outline-variant/50 text-xs font-bold text-on-surface hover:bg-surface-container-low cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkSigning}
                disabled={executingBulk || otpCode.length !== 6}
                className="w-1/2 py-2 rounded-xl bg-[#800000] hover:bg-[#600000] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {executingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                <span>{executingBulk ? 'Executing...' : 'Verify & Sign Batch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
