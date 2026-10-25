import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FeeBannerConfig } from '../../types';
import { EditStudentModal } from '../modals/EditStudentModal';
import { ForwardPaymentModal } from '../modals/ForwardPaymentModal';
import { ReceiptViewModal } from '../modals/ReceiptViewModal';
import { resolveStreamName, resolveGradeName, resolveLearningAreaName } from '../../utils/formatters';

interface ParentDashboardViewProps {
  onOpenMpesaWithStudent?: (student: any) => void;
  onOpenKcbBuniWithStudent?: (student: any) => void;
  onViewReportCard: (student: any) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ParentDashboardView: React.FC<ParentDashboardViewProps> = ({
  onOpenMpesaWithStudent,
  onOpenKcbBuniWithStudent,
  onViewReportCard,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [portalData, setPortalData] = useState<any>(null);
  const [lunchEnrollments, setLunchEnrollments] = useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isForwardPaymentModalOpen, setIsForwardPaymentModalOpen] = useState(false);
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [clearanceModalTarget, setClearanceModalTarget] = useState<'REPORT_CARD' | 'FORMATIVE'>('REPORT_CARD');
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);
  const [activeCbcTab, setActiveCbcTab] = useState<'formative' | 'summative'>('formative');
  const [selectedFormativeRating, setSelectedFormativeRating] = useState<string>('All');
  const [selectedFormativeSubject, setSelectedFormativeSubject] = useState<string>('All');
  const [reopenAnnouncement, setReopenAnnouncement] = useState<any | null>(null);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [res, lunchRes, annRes] = await Promise.all([
        apiService.getGuardianPortalData(),
        apiService.getLunchEnrollments().catch(() => ({ success: true, data: [] })),
        apiService.getAnnouncements().catch(() => ({ success: true, data: [] })),
      ]);
      if (res.success && res.data) {
        setPortalData(res.data);
      }
      if (lunchRes.success && lunchRes.data) {
        setLunchEnrollments(lunchRes.data);
      }
      if (annRes?.data && Array.isArray(annRes.data)) {
        const found = annRes.data.find((a: any) =>
          a.title?.toLowerCase().includes('reopen') ||
          a.title?.toLowerCase().includes('opening') ||
          a.content?.toLowerCase().includes('reopening date')
        );
        if (found) {
          setReopenAnnouncement(found);
        }
      }
    } catch (err) {
      console.error('Failed to load parent portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const children = portalData?.children || [];
  const currentChild = children[selectedChildIndex] || null;
  const currentChildLunch =
    lunchEnrollments.find((l: any) => l.studentId === currentChild?.id) ||
    currentChild?.lunch ||
    null;
  const guardianUser = portalData?.guardian?.user || user;

  const currentChildFee = currentChild?.fee;
  const isSponsored = Boolean(currentChild?.isSponsored || currentChild?.sponsorship || currentChild?.isChargeExempt || (currentChild as any)?.sponsorship);
  const feeBalance = isSponsored ? 0 : (currentChildFee?.balance || (currentChild as any)?.feeBalance || 0);
  const isFeeCleared = isSponsored || feeBalance <= 0;
  const arrearsAmount = isSponsored ? 0 : (currentChildFee?.arrearsAmount || (currentChild as any)?.priorArrears || 0);
  const feeBannerConfig: FeeBannerConfig | null = portalData?.feeBanner || null;
  const rawDueDate = feeBannerConfig?.deadlineDate || currentChildFee?.dueDate || currentChildFee?.invoices?.[0]?.dueDate || null;

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '30th October 2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getDaysRemaining = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const due = new Date(dateStr);
      if (isNaN(due.getTime())) return null;
      const now = new Date();
      due.setHours(23, 59, 59, 999);
      const diffTime = due.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const formattedDueDate = formatDueDate(rawDueDate);
  const daysRemaining = getDaysRemaining(rawDueDate);

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'EE':
        return <span className="px-2.5 py-0.5 rounded-full bg-secondary text-white font-bold text-xs">EE · Exceeding Expectations</span>;
      case 'ME':
        return <span className="px-2.5 py-0.5 rounded-full bg-primary text-white font-bold text-xs">ME · Meeting Expectations</span>;
      case 'AE':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-700 text-white font-bold text-xs">AE · Approaching Expectations</span>;
      case 'BE':
        return <span className="px-2.5 py-0.5 rounded-full bg-error text-white font-bold text-xs">BE · Below Expectations</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-secondary text-white font-bold text-xs">ME · Meeting Expectations</span>;
    }
  };

  const formativeAssessments: any[] = currentChild?.CBC?.formativeAssessments || [];
  const summativeEvaluations: any[] = currentChild?.CBC?.latestEvaluations || [];

  const formativesEeCount = formativeAssessments.filter((f: any) => f.performanceLevel === 'EE').length;
  const formativesMeCount = formativeAssessments.filter((f: any) => f.performanceLevel === 'ME').length;
  const formativesAeCount = formativeAssessments.filter((f: any) => f.performanceLevel === 'AE').length;
  const formativesBeCount = formativeAssessments.filter((f: any) => f.performanceLevel === 'BE').length;

  const filteredFormatives = formativeAssessments.filter((f: any) => {
    const matchesRating = selectedFormativeRating === 'All' || f.performanceLevel === selectedFormativeRating;
    const resolvedName = resolveLearningAreaName(f.learningAreaId, f.learningAreaName);
    const matchesSubject = selectedFormativeSubject === 'All' || resolvedName === selectedFormativeSubject;
    return matchesRating && matchesSubject;
  });

  const uniqueFormativeSubjects = Array.from(
    new Set(formativeAssessments.map((f: any) => resolveLearningAreaName(f.learningAreaId, f.learningAreaName)))
  ).sort();

  const formatEnumLabel = (text?: string) => {
    if (!text) return '';
    return text.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-primary font-body">Loading Parent Portal from database...</p>
      </div>
    );
  }

  if (!children.length) {
    return (
      <div className="space-y-6 pb-12">
        <div className="p-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-center max-w-lg mx-auto my-12 space-y-3">
          <span className="material-symbols-outlined text-5xl text-outline">family_restroom</span>
          <h2 className="text-lg font-bold text-on-surface">No Linked Learners Found</h2>
          <p className="text-xs text-on-surface-variant">
            No student profile is currently linked to your parent account ({guardianUser?.email}). Please contact the school administration to link your student admission records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-[#500b1a] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            {portalData?.school?.name || user?.schoolName || 'Grace Seeds School'} · Parent Portal
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            Welcome, {guardianUser?.firstName} {guardianUser?.lastName}
          </h1>
          <p className="text-xs text-rose-100/90">
            Real-time academic performance, live attendance roll-call, and instant M-Pesa fee settlement
          </p>
        </div>

        {/* Child Selector if multiple */}
        {children.length > 1 && (
          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/20">
            <span className="text-[10px] uppercase font-bold text-rose-200 block mb-1">Select Child:</span>
            <div className="flex items-center gap-1.5">
              {children.map((c: any, idx: number) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedChildIndex === idx
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {c.firstName} ({resolveGradeName(c.gradeLevel)})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentChild && (
        <>
          {/* Child Identity Card */}
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                {currentChild.firstName?.[0]}{currentChild.lastName?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-on-surface">
                    {currentChild.fullName || `${currentChild.firstName} ${currentChild.lastName}`}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-xs font-bold">
                    {resolveGradeName(currentChild.gradeLevel)}
                  </span>
                  {(currentChild.streamName || currentChild.streamId) && (
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-xs font-semibold">
                      Stream: {resolveStreamName(currentChild.streamId, currentChild.streamName || currentChild.stream?.name, currentChild.gradeLevel)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant mt-1 font-data-mono">
                  <span>Adm #: <strong className="text-primary">{currentChild.admissionNumber}</strong></span>
                  <span>•</span>
                  <span>UPI: {currentChild.upiNumber || 'NEMIS-PENDING'}</span>
                  <span>•</span>
                  <span>Gender: {currentChild.gender}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigateTab ? onNavigateTab('parent-profile') : setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">manage_accounts</span>
                <span>Full Profile & Edit Records</span>
              </button>

              {isFeeCleared ? (
                <button
                  onClick={() => onViewReportCard({
                    id: currentChild.id,
                    name: currentChild.fullName || `${currentChild.firstName} ${currentChild.lastName}`,
                    admNo: currentChild.admissionNumber,
                    upi: currentChild.upiNumber || 'NEMIS-K9281A',
                    grade: resolveGradeName(currentChild.gradeLevel),
                    stream: resolveStreamName(currentChild.streamId, currentChild.streamName || currentChild.stream?.name, currentChild.gradeLevel) || 'Main Stream',
                    feeBalance: currentChild.fee?.balance || 0,
                    totalFee: currentChild.fee?.totalBilled || 0,
                    isChargeExempt: currentChild.isChargeExempt,
                    attendanceRate: currentChild.attendance?.attendanceRate || 100,
                    CBCRating: 'ME',
                    status: currentChild.status || 'Active'
                  })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  <span>Term Report Card</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setClearanceModalTarget('REPORT_CARD');
                    setIsClearanceModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 rounded-lg text-xs font-bold border border-amber-600/30 transition-all cursor-pointer shadow-2xs"
                  title="Report Card Withheld · Outstanding Fee Balance Required"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-800">lock</span>
                  <span>Report Card (Uncleared)</span>
                </button>
              )}

              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('concerns')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#7a1228]/10 hover:bg-[#7a1228]/20 text-[#7a1228] rounded-lg text-xs font-bold border border-[#7a1228]/20 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">rate_review</span>
                  <span>Submit Concern</span>
                </button>
              )}

              <button
                onClick={() => setIsForwardPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary to-[#500b1a] text-white rounded-lg hover:shadow-xs text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                <span>Forward Payment Message</span>
              </button>
            </div>
          </div>

          {/* Official School Reopening Notice Banner for Parents */}
          {reopenAnnouncement && (
            <div className="bg-gradient-to-r from-[#800000] via-[#660000] to-[#500b1a] text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in border border-rose-300/30">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-bold shrink-0 shadow-xs text-amber-300">
                  <span className="material-symbols-outlined text-[28px]">campaign</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                      {reopenAnnouncement.title}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                      Official Admin Notice
                    </span>
                  </div>
                  <p className="text-xs text-rose-100 mt-1 leading-relaxed line-clamp-2">
                    {reopenAnnouncement.content}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('announcements')}
                    className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span>Read Full Directives</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Prominent Fee Payment Notice & Remittance Instructions */}
          {isSponsored ? (
            <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-900 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-[26px]">verified</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-emerald-950">
                      Fees Cleared · 100% Institutional Scholarship Scheme
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700 text-white">
                      Status: CLEARED
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900/90 mt-0.5">
                    <strong>{currentChild.firstName} {currentChild.lastName}</strong> is enrolled under the institutional scholarship benevolence scheme. All academic term fees are 100% waived and fully cleared.
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Ledger Balance</span>
                <span className="text-base font-black font-data-mono text-emerald-800">KES 0 (CLEARED)</span>
              </div>
            </div>
          ) : feeBalance < 0 ? (
            <div className="bg-teal-500/10 border-2 border-teal-500/40 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-900 border border-teal-500/30 flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-[26px]">savings</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-teal-950">
                      Fee Overpayment / Advance Credit
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-700 text-white font-mono">
                      Credit Balance: -KES {Math.abs(feeBalance).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-teal-900/90 mt-0.5">
                    An advance payment has been recorded for <strong>{currentChild.firstName}</strong>. Your account has an overpayment credit of <strong className="font-mono text-teal-950 font-bold">-KES {Math.abs(feeBalance).toLocaleString()}</strong> which will automatically be credited against subsequent term fees.
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Prepaid Credit</span>
                <span className="text-base font-black font-data-mono text-teal-800">-KES {Math.abs(feeBalance).toLocaleString()}</span>
              </div>
            </div>
          ) : feeBalance > 0 && feeBannerConfig?.isEnabled !== false ? (
            <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-900 border border-amber-500/30 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[28px] text-amber-900">calendar_clock</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-amber-950 tracking-tight">
                      {feeBannerConfig?.bannerTitle || 'School Fee Payment Notice'}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#7a1228] text-white shadow-2xs">
                      Due: {formattedDueDate}
                    </span>
                    {arrearsAmount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-400">
                        Includes KES {arrearsAmount.toLocaleString()} Prior Arrears
                      </span>
                    )}
                    {daysRemaining !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        daysRemaining <= 0
                          ? 'bg-rose-600 text-white animate-pulse'
                          : daysRemaining <= 7
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {daysRemaining < 0
                          ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
                          : daysRemaining === 0
                          ? 'Due Today!'
                          : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    The outstanding school fee balance of <strong className="font-bold text-[#7a1228] font-data-mono">KES {feeBalance.toLocaleString()}</strong>
                    {arrearsAmount > 0 ? (
                      <span> (including <strong className="text-rose-950 font-bold">KES {arrearsAmount.toLocaleString()}</strong> in prior fee arrears)</span>
                    ) : ''} for{' '}
                    <strong>{currentChild.firstName} {currentChild.lastName}</strong> is due on or before{' '}
                    <strong className="text-slate-900">{formattedDueDate}</strong>.
                    {feeBannerConfig?.customMessage ? (
                      <span className="block my-1 font-semibold text-rose-950 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                        {feeBannerConfig.customMessage}
                      </span>
                    ) : null}
                    <span className="block mt-0.5">
                      Pay via Lipa na M-Pesa Paybill <strong className="font-data-mono text-emerald-800">{feeBannerConfig?.paybillNumber || '522533'}</strong> (Account: <strong className="font-data-mono text-[#7a1228]">8048859#{currentChild.firstName} {currentChild.lastName} ({resolveGradeName(currentChild.gradeLevel)})</strong> — kindly use child’s name &amp; grade, not admission number) or {feeBannerConfig?.bankName || 'KCB Bank'} (A/C: {feeBannerConfig?.bankAccountNumber || '1234567890'}), then forward your confirmation message.
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => setIsForwardPaymentModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-primary to-[#500b1a] hover:from-[#600e20] hover:to-[#400914] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                  <span>Forward Payment Confirmation</span>
                </button>
              </div>
            </div>
          ) : feeBalance <= 0 ? (
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-900 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                  <span className="material-symbols-outlined text-[26px]">task_alt</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-emerald-950">
                      Fees Cleared · Zero Balance
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                      Status: Fully Settled
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900/80 mt-0.5">
                    All statutory tuition and term levies for <strong>{currentChild.firstName}</strong> have been settled in full. Next term billing schedule will take effect in January 2027.
                  </p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Current Ledger Balance</span>
                <span className="text-base font-black font-data-mono text-emerald-800">KES 0</span>
              </div>
            </div>
          ) : null}

          {/* Quick Shortcuts for Parent Portal */}
          {onNavigateTab && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                onClick={() => onNavigateTab('ediary')}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 shadow-xs cursor-pointer flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">edit_note</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface">Digital eDiary</div>
                  <div className="text-[11px] text-on-surface-variant">View homework & sign off</div>
                </div>
              </div>

              <div
                onClick={() => onNavigateTab('formative-assessments')}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 shadow-xs cursor-pointer flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-700/10 text-emerald-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">fact_check</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface">CBC Formative Progress</div>
                  <div className="text-[11px] text-on-surface-variant">Classroom rubrics & CATs</div>
                </div>
              </div>

              <div
                onClick={() => onNavigateTab('visual-CBC')}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 shadow-xs cursor-pointer flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">add_a_photo</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface">Ask Teacher with Photo</div>
                  <div className="text-[11px] text-on-surface-variant">Homework photo Q&A desk</div>
                </div>
              </div>

              <div
                onClick={() => onNavigateTab('concerns')}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 shadow-xs cursor-pointer flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">rate_review</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface">School Concerns & Help</div>
                  <div className="text-[11px] text-on-surface-variant">Submit inquiry or feedback</div>
                </div>
              </div>
            </div>
          )}

          {/* 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Attendance Rate
              </span>
              <div className="text-2xl font-bold font-data-mono text-secondary mt-1">
                {currentChild.attendance?.attendanceRate || 100}%
              </div>
              <span className="text-[11px] text-on-surface-variant mt-1 block">
                Today: <strong className="text-secondary">{currentChild.attendance?.todayStatus || 'PRESENT'}</strong>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                CBE Formative Rubrics
              </span>
              <div className="text-2xl font-bold font-data-mono text-primary mt-1">
                {currentChild.CBC?.formativesCount ?? formativeAssessments.length ?? currentChild.CBC?.assessmentsCount ?? 0}
              </div>
              <span className="text-[11px] text-secondary font-semibold mt-1 block">
                Continuous Classroom Evaluations
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                {isSponsored ? 'Fee Status' : feeBalance < 0 ? 'Account Credit / Overpayment' : 'Outstanding Balance'}
              </span>
              <div className={`text-2xl font-bold font-data-mono mt-1 ${
                isSponsored || feeBalance === 0 ? 'text-emerald-700' : feeBalance < 0 ? 'text-teal-700' : 'text-error'
              }`}>
                {isSponsored
                  ? 'KES 0 (CLEARED)'
                  : feeBalance < 0
                  ? `-KES ${Math.abs(feeBalance).toLocaleString()}`
                  : `KES ${feeBalance.toLocaleString()}`}
              </div>
              {arrearsAmount > 0 && !isSponsored && feeBalance > 0 && (
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 text-[10px] font-bold border border-amber-300">
                  <span className="material-symbols-outlined text-[12px] text-amber-800">warning</span>
                  <span>Includes KES {arrearsAmount.toLocaleString()} Prior Arrears</span>
                </div>
              )}
              {isSponsored ? (
                <span className="text-[11px] text-emerald-800 font-bold mt-1 block">
                  100% Institutional Scholarship
                </span>
              ) : feeBalance < 0 ? (
                <span className="text-[11px] text-teal-700 font-bold mt-1 block">
                  Exact Advance Overpayment: -KES {Math.abs(feeBalance).toLocaleString()}
                </span>
              ) : (
                <span className="text-[11px] text-on-surface-variant mt-1 block">
                  Total Invoiced: KES {(currentChild.fee?.totalBilled || 0).toLocaleString()}
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Total Fees Cleared
              </span>
              <div className="text-2xl font-bold font-data-mono text-secondary mt-1">
                KES {(currentChild.fee?.totalPaid || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block truncate" title={`Official Paybill: 522533 · Acc: 8048859#${currentChild.firstName} ${currentChild.lastName} (${resolveGradeName(currentChild.gradeLevel)})`}>
                Official Paybill: 522533 · Acc: 8048859#{currentChild.firstName} {currentChild.lastName} · {resolveGradeName(currentChild.gradeLevel)} (Name &amp; Grade)
              </span>
            </div>
          </div>

          {/* Two-Column Section: Fee Statement & Continuous Assessments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fee Statement & Invoices */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-container pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
                  <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Fee Statement Ledger</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsForwardPaymentModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">forward_to_inbox</span>
                    <span>Forward Payment</span>
                  </button>
                  <span className={`text-xs font-bold font-data-mono ${feeBalance < 0 ? 'text-teal-800' : isSponsored || feeBalance === 0 ? 'text-emerald-700' : 'text-primary'}`}>
                    Balance: {isSponsored ? 'KES 0 (CLEARED)' : feeBalance < 0 ? `-KES ${Math.abs(feeBalance).toLocaleString()}` : `KES ${feeBalance.toLocaleString()}`}
                  </span>
                </div>
              </div>

              {currentChild.fee?.invoices?.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-on-surface">Term Invoices:</div>
                  {currentChild.fee.invoices.map((inv: any) => {
                    const isArrearInvoice = inv.feeStructureId === 'MANUAL_ARREARS' || inv.invoiceNumber?.includes('ARR');
                    const arrearItem = Array.isArray(inv.items) ? inv.items.find((it: any) => it.name?.toLowerCase().includes('arrear') || it.name?.toLowerCase().includes('carried forward')) : null;
                    return (
                      <div key={inv.id} className="p-3 rounded-lg bg-surface-container-low text-xs space-y-1">
                        <div className="flex justify-between font-bold text-on-surface">
                          <span className="flex items-center gap-1.5">
                            <span>Invoice #{inv.invoiceNumber}</span>
                            {isArrearInvoice && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 text-[10px] font-bold border border-amber-300">
                                Arrears Invoice
                              </span>
                            )}
                          </span>
                          <span className="font-data-mono text-primary">KES {inv.amountPayable?.toLocaleString()}</span>
                        </div>
                        {arrearItem && !isArrearInvoice && (
                          <div className="text-[11px] text-amber-900 font-medium">
                            ↳ Includes KES {Number(arrearItem.amount || 0).toLocaleString()} prior arrears
                          </div>
                        )}
                        <div className="flex justify-between text-on-surface-variant text-[11px]">
                          <span>Paid: KES {inv.amountPaid?.toLocaleString()}</span>
                          <span className={`font-semibold ${inv.balance > 0 ? 'text-error font-bold' : 'text-emerald-700'}`}>
                            Bal: KES {inv.balance?.toLocaleString()} {inv.balance === 0 && '(Cleared)'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {currentChild.fee.payments?.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="text-xs font-semibold text-on-surface">Payment Receipts:</div>
                      {currentChild.fee.payments.map((pay: any) => {
                        const isPending = pay.status === 'PENDING' || pay.receiptNumber?.startsWith('FWD-');
                        return (
                          <div
                            key={pay.id}
                            onClick={() => !isPending && setSelectedPaymentForReceipt(pay)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                              isPending
                                ? 'bg-amber-50/70 border-amber-300'
                                : 'bg-secondary/5 border-secondary/20 hover:bg-secondary/15 hover:border-secondary/40 cursor-pointer'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-primary font-data-mono flex items-center gap-1.5">
                                <span>{pay.receiptNumber}</span>
                                {isPending ? (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 text-[10px] font-bold">
                                    Pending Verification
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[11px]">print</span> View / Print
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Ref: {pay.transactionReference} · {pay.paymentMethod} {pay.paymentDate ? `· ${pay.paymentDate}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold font-data-mono ${isPending ? 'text-amber-900' : 'text-secondary'}`}>
                                +KES {pay.amount?.toLocaleString()}
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isPending ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-secondary-container text-on-secondary-container'
                              }`}>
                                {isPending ? 'Under Review' : pay.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  No fee invoices or transactions recorded for this learner yet.
                </div>
              )}
            </div>

            {/* Continuous Assessment Evaluations & CBC Formative Progress */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-container pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined ${isFeeCleared ? 'text-secondary' : 'text-amber-800'} text-[20px]`}>
                    {isFeeCleared ? 'grading' : 'lock'}
                  </span>
                  <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">CBE Assessment Portfolio</h3>
                </div>
                {!isFeeCleared ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Fee Clearance Required
                  </span>
                ) : onNavigateTab ? (
                  <button
                    onClick={() => onNavigateTab('formative-assessments')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Full Formative Rubric Records</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                ) : null}
              </div>

              {!isFeeCleared ? (
                <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-300/80 space-y-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <span className="material-symbols-outlined text-[24px]">lock_person</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-amber-950">
                        Formative Progress &amp; Rubric Records Withheld
                      </h4>
                      <p className="text-xs text-amber-900/90 leading-relaxed">
                        Continuous classroom observation rubrics, CAT scores, and strand competency evaluations for <strong>{currentChild.firstName} {currentChild.lastName}</strong> are withheld pending fee clearance. The outstanding ledger balance is <strong className="font-data-mono text-[#7a1228] font-bold">KES {feeBalance.toLocaleString()}</strong>.
                      </p>
                      <p className="text-xs text-amber-900/80">
                        Kindly clear the balance or request clearance details and authorization from the <strong>Head Teacher</strong> or <strong>School Director</strong> below.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setClearanceModalTarget('FORMATIVE');
                        setIsClearanceModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#7a1228] hover:bg-[#5a1226] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">support_agent</span>
                      <span>Request Clearance / Contact Leadership</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsForwardPaymentModalOpen(true)}
                      className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm text-emerald-700">forward_to_inbox</span>
                      <span>Forward Payment Confirmation</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Sub-tab navigation: Formative vs Summative */}
                  <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveCbcTab('formative')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeCbcTab === 'formative'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">fact_check</span>
                  <span>Formative CATs & Rubrics</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeCbcTab === 'formative' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface'
                  }`}>
                    {formativeAssessments.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCbcTab('summative')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeCbcTab === 'summative'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">military_tech</span>
                  <span>Summative Terminal Exams</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeCbcTab === 'summative' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface'
                  }`}>
                    {summativeEvaluations.length}
                  </span>
                </button>
              </div>

              {activeCbcTab === 'formative' ? (
                <div className="space-y-3.5">
                  {/* Formative Level Breakdown Pills */}
                  {formativeAssessments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">EE · Exceeding</span>
                        <span className="text-base font-extrabold text-emerald-900 font-data-mono">{formativesEeCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
                        <span className="text-[10px] font-bold text-blue-800 uppercase block">ME · Meeting</span>
                        <span className="text-base font-extrabold text-blue-900 font-data-mono">{formativesMeCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">AE · Approaching</span>
                        <span className="text-base font-extrabold text-amber-900 font-data-mono">{formativesAeCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-center">
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">BE · Below</span>
                        <span className="text-base font-extrabold text-rose-900 font-data-mono">{formativesBeCount}</span>
                      </div>
                    </div>
                  )}

                  {/* Formative Filters if items exist */}
                  {formativeAssessments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <select
                        value={selectedFormativeSubject}
                        onChange={(e) => setSelectedFormativeSubject(e.target.value)}
                        className="bg-surface-container-low text-[11px] font-semibold py-1 px-2.5 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
                      >
                        <option value="All">All Subjects ({formativeAssessments.length})</option>
                        {uniqueFormativeSubjects.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedFormativeRating}
                        onChange={(e) => setSelectedFormativeRating(e.target.value)}
                        className="bg-surface-container-low text-[11px] font-semibold py-1 px-2.5 rounded-lg border border-outline-variant/30 text-on-surface cursor-pointer"
                      >
                        <option value="All">All Rubric Levels</option>
                        <option value="EE">EE - Exceeding Expectations</option>
                        <option value="ME">ME - Meeting Expectations</option>
                        <option value="AE">AE - Approaching Expectations</option>
                        <option value="BE">BE - Below Expectations</option>
                      </select>
                    </div>
                  )}

                  {/* List of Formatives */}
                  {filteredFormatives.length > 0 ? (
                    <div className="space-y-3">
                      {filteredFormatives.map((fa: any) => {
                        const areaName = resolveLearningAreaName(fa.learningAreaId, fa.learningAreaName);
                        return (
                          <div
                            key={fa.id}
                            className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs hover:border-primary/30 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-primary">{areaName}</span>
                                {fa.subStrandCode && (
                                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-bold text-on-surface-variant font-data-mono">
                                    {fa.subStrandCode}
                                  </span>
                                )}
                              </div>
                              {getRatingBadge(fa.performanceLevel)}
                            </div>

                            {/* Sub-strand title & Outcome Tested */}
                            <div className="text-[11px] text-on-surface space-y-0.5">
                              {fa.subStrandTitle && (
                                <div>
                                  <span className="text-on-surface-variant font-medium">Sub-strand:</span>{' '}
                                  <strong className="text-on-surface">{fa.subStrandTitle}</strong>
                                </div>
                              )}
                              {fa.specificOutcomeTested && (
                                <div>
                                  <span className="text-on-surface-variant font-medium">Outcome Tested:</span>{' '}
                                  <span className="text-slate-800">{fa.specificOutcomeTested}</span>
                                </div>
                              )}
                            </div>

                            {/* Targeted Competencies and Core Values Observed */}
                            {((fa.targetedCompetencies && fa.targetedCompetencies.length > 0) ||
                              (fa.valuesObserved && fa.valuesObserved.length > 0)) && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {fa.targetedCompetencies?.map((c: string) => (
                                  <span
                                    key={c}
                                    className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-semibold"
                                  >
                                    Competency: {formatEnumLabel(c)}
                                  </span>
                                ))}
                                {fa.valuesObserved?.map((v: string) => (
                                  <span
                                    key={v}
                                    className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold"
                                  >
                                    Value: {formatEnumLabel(v)}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Teacher Evidence & Observation Notes */}
                            {(fa.evidenceNotes || fa.teacherRemarks) && (
                              <p className="text-xs text-on-surface italic bg-white/80 p-2.5 rounded-lg border-l-2 border-primary/50 shadow-2xs">
                                "{fa.evidenceNotes || fa.teacherRemarks}"
                              </p>
                            )}

                            {/* Footer metadata */}
                            <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-outline-variant/15">
                              <span>
                                Date: <strong>{fa.assessmentDate || 'Term 3 2026'}</strong>
                                {fa.assessmentMethod && (
                                  <span> · Method: <strong className="text-secondary">{formatEnumLabel(fa.assessmentMethod)}</strong></span>
                                )}
                              </span>
                              <span className="text-on-surface-variant">
                                Evaluator: <strong className="text-on-surface">{fa.teacherName || 'Class Teacher'}</strong>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/40">
                      <span className="material-symbols-outlined text-3xl text-outline mb-1 block">fact_check</span>
                      <strong className="block text-on-surface mb-0.5">No Formative Rubrics Found</strong>
                      {formativeAssessments.length === 0
                        ? 'No continuous classroom observation rubrics or CATs have been logged for this learner yet. Observations will display here as educators evaluate sub-strands.'
                        : 'No formative rubrics match your active filter selection.'}
                    </div>
                  )}
                </div>
              ) : (
                /* Summative Evaluations Tab */
                <div className="space-y-3">
                  {summativeEvaluations.length > 0 ? (
                    summativeEvaluations.map((ev: any) => {
                      const rawScore =
                        ev.percentageScore ??
                        ev.overallScore ??
                        ev.score ??
                        (ev.strandScores?.[0]?.rawScore !== undefined ? ev.strandScores[0].rawScore : null);
                      const scoreDisplay = rawScore !== null && rawScore !== undefined ? `${rawScore}%` : 'Competency Assessed';
                      const areaName = resolveLearningAreaName(ev.learningAreaId, ev.learningAreaName || ev.name);

                      return (
                        <div
                          key={ev.id}
                          className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">{areaName}</span>
                            {getRatingBadge(ev.overallPerformanceLevel)}
                          </div>
                          <p className="text-xs text-on-surface italic bg-white/70 p-2.5 rounded-lg border-l-2 border-primary/40">
                            "{ev.teacherRemarks || 'Demonstrates strong understanding and mastery of core strand competencies.'}"
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-outline pt-1">
                            <span>Evaluated: {ev.evaluationDate || 'Term 3 2026'}</span>
                            <span className="font-bold text-secondary font-data-mono">
                              {scoreDisplay}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/40">
                      <span className="material-symbols-outlined text-3xl text-outline mb-1 block">military_tech</span>
                      <strong className="block text-on-surface mb-0.5">No Summative Terminal Exams Found</strong>
                      Summative terminal examination marks for this term have not been posted yet.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
          </div>

          {/* School Lunch & Catering Program Section - ONLY VISIBLE IF CHILD IS ON THE LUNCH LIST */}
          {currentChildLunch && (
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-container pb-3 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[22px]">lunch_dining</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">
                        School Lunch & Catering Program
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                        Enrolled on Official Roster
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Plan: <strong className="text-on-surface">{currentChildLunch.planName || 'Standard Lunch'}</strong> · Term 3, 2026
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentChildLunch.dietaryNotes && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                      <span className="material-symbols-outlined text-[14px]">health_and_safety</span>
                      <span>Diet: {currentChildLunch.dietaryNotes}</span>
                    </span>
                  )}
                  {currentChildLunch.balance > 0 && (
                    <button
                      onClick={() => {
                        const studentObj = {
                          id: currentChild.id,
                          name: currentChild.fullName || `${currentChild.firstName} ${currentChild.lastName}`,
                          admNo: currentChild.admissionNumber,
                          feeBalance: currentChildLunch.balance,
                          totalFee: currentChildLunch.amount,
                          notes: `Lunch Fee Settlement for ${currentChildLunch.planName}`,
                        };
                        if (onOpenKcbBuniWithStudent) {
                          onOpenKcbBuniWithStudent(studentObj);
                        } else if (onOpenMpesaWithStudent) {
                          onOpenMpesaWithStudent(studentObj);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">credit_card</span>
                      <span>Pay Lunch Fee (KES {currentChildLunch.balance.toLocaleString()})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Metrics for Lunch Program */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-data-mono">
                <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
                  <span className="text-[10px] uppercase font-semibold text-on-surface-variant block">Term Lunch Fee</span>
                  <span className="text-base font-bold text-on-surface">KES {currentChildLunch.amount?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/50">
                  <span className="text-[10px] uppercase font-semibold text-emerald-800 block">Total Cleared</span>
                  <span className="text-base font-bold text-emerald-700">KES {currentChildLunch.amountPaid?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200/50">
                  <span className="text-[10px] uppercase font-semibold text-rose-800 block">Lunch Balance</span>
                  <span className={`text-base font-bold ${currentChildLunch.balance > 0 ? 'text-error' : 'text-emerald-700'}`}>
                    KES {currentChildLunch.balance?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Lunch Fee Receipts History */}
              {currentChildLunch.payments && currentChildLunch.payments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-on-surface">Lunch Fee Payment Receipts:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentChildLunch.payments.map((p: any) => (
                      <div key={p.id} className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-primary font-data-mono">{p.receiptNumber}</div>
                          <div className="text-[11px] text-on-surface-variant">
                            Ref: {p.transactionReference} · {p.paymentMethod}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold font-data-mono text-emerald-700">+KES {p.amount?.toLocaleString()}</div>
                          <span className="text-[10px] text-on-surface-variant">{p.paymentDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {isEditModalOpen && currentChild && (
        <EditStudentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          student={{
            id: currentChild.id,
            admNo: currentChild.admissionNumber,
            upi: currentChild.upiNumber || '',
            nemis: currentChild.upiNumber || '',
            name: currentChild.fullName || `${currentChild.firstName} ${currentChild.lastName}`,
            gender: currentChild.gender || 'MALE',
            grade: resolveGradeName(currentChild.gradeLevel),
            stream: resolveStreamName(currentChild.streamId, currentChild.streamName || currentChild.stream?.name, currentChild.gradeLevel),
            guardianName: currentChild.guardianName || `${guardianUser?.firstName || ''} ${guardianUser?.lastName || ''}`.trim() || 'Parent',
            guardianPhone: currentChild.guardianPhone || guardianUser?.phone || '',
            feeBalance: currentChild.fee?.balance || 0,
            totalFee: currentChild.fee?.totalBilled || 0,
            attendanceRate: currentChild.attendance?.attendanceRate || 100,
            CBCRating: 'ME',
            status: currentChild.status || 'Active',
            dateOfBirth: currentChild.dateOfBirth,
            medicalConditions: currentChild.medicalConditions,
            specialNeeds: currentChild.specialNeeds,
            profilePhotoUrl: currentChild.profilePhotoUrl
          }}
          onStudentUpdated={async () => {
            await loadPortalData();
          }}
          isParentView={true}
        />
      )}

      {isForwardPaymentModalOpen && (
        <ForwardPaymentModal
          isOpen={isForwardPaymentModalOpen}
          onClose={() => setIsForwardPaymentModalOpen(false)}
          students={children}
          initialStudent={currentChild}
          onSuccess={() => {
            loadPortalData();
          }}
        />
      )}

      {selectedPaymentForReceipt && (
        <ReceiptViewModal
          isOpen={!!selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
          paymentId={selectedPaymentForReceipt.id}
          initialReceipt={{
            receiptNumber: selectedPaymentForReceipt.receiptNumber,
            paymentDate: selectedPaymentForReceipt.paymentDate,
            amountPaid: selectedPaymentForReceipt.amount,
            paymentMethod: selectedPaymentForReceipt.paymentMethod,
            transactionReference: selectedPaymentForReceipt.transactionReference,
            studentName: currentChild?.fullName || currentChild?.name,
            admissionNumber: currentChild?.admissionNumber || currentChild?.admNo,
            gradeLevel: currentChild?.gradeLevel || currentChild?.grade,
            streamName: currentChild?.streamName,
            remainingBalance: currentChild?.fee?.balance ?? currentChild?.fee?.currentBalance,
            notes: selectedPaymentForReceipt.notes,
          }}
        />
      )}
      {/* Fee Clearance Authorization & Leadership Contact Modal */}
      {isClearanceModalOpen && currentChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#7a1228] to-[#500b1a] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-amber-300">lock_reset</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    Fee Clearance Authorization Required
                  </h3>
                  <p className="text-xs text-white/80">
                    {clearanceModalTarget === 'REPORT_CARD'
                      ? 'Official CBE Term Report Card Withheld'
                      : 'Formative Assessment & CAT Rubric Portfolio Withheld'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClearanceModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Learner & Ledger Snapshot Card */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Learner Account
                    </span>
                    <strong className="text-sm font-bold text-on-surface">
                      {currentChild.fullName || `${currentChild.firstName} ${currentChild.lastName}`}
                    </strong>
                    <div className="text-xs text-on-surface-variant font-data-mono">
                      Adm: {currentChild.admissionNumber} · {resolveGradeName(currentChild.gradeLevel)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Outstanding Fee Balance
                    </span>
                    <span className="text-lg font-black font-data-mono text-[#7a1228]">
                      KES {feeBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-amber-950/90 pt-1 border-t border-amber-200/80 leading-relaxed">
                  In accordance with Grace Seeds School financial policies, academic dossiers and formative competency rubrics are accessible once fees are fully cleared or authorized by leadership.
                </p>
              </div>

              {/* Leadership Contact Cards */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">support_agent</span>
                  <span>Request Authorization from Leadership</span>
                </div>

                {/* 1. Head Teacher */}
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">school</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-on-surface">Head Teacher&apos;s Office</h4>
                      <p className="text-[11px] text-on-surface-variant">
                        For academic progress clearance and permission
                      </p>
                      <div className="text-[11px] text-primary font-bold mt-0.5">
                        0745436312 · headteacher@smartshule.ac.ke
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`https://wa.me/254745436312?text=${encodeURIComponent(
                        `Hello Head Teacher, I am requesting fee clearance details and authorization to access the ${
                          clearanceModalTarget === 'REPORT_CARD' ? 'report card' : 'formative progress records'
                        } for my child ${currentChild.fullName || currentChild.firstName} (Adm: ${currentChild.admissionNumber}, Grade: ${resolveGradeName(currentChild.gradeLevel)}) at Grace Seeds School.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`mailto:headteacher@smartshule.ac.ke?subject=${encodeURIComponent(
                        `Fee Clearance Request - ${currentChild.fullName || currentChild.firstName} (${currentChild.admissionNumber})`
                      )}&body=${encodeURIComponent(
                        `Dear Head Teacher,\n\nI am requesting fee clearance authorization and access to the ${
                          clearanceModalTarget === 'REPORT_CARD' ? 'term report card' : 'formative progress records'
                        } for my child ${currentChild.fullName || currentChild.firstName} (Adm: ${currentChild.admissionNumber}, Grade: ${resolveGradeName(currentChild.gradeLevel)}) at Grace Seeds School.\n\nThank you,\n${guardianUser?.name || 'Parent'}`
                      )}`}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">mail</span>
                      <span>Email</span>
                    </a>
                  </div>
                </div>

                {/* 2. School Director */}
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-900 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-on-surface">School Director</h4>
                      <p className="text-[11px] text-on-surface-variant">
                        For fee balance arrangements, bursaries &amp; clearances
                      </p>
                      <div className="text-[11px] text-[#7a1228] font-bold mt-0.5">
                        0745436312 · schoolgraceseeds@gmail.com
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`https://wa.me/254745436312?text=${encodeURIComponent(
                        `Hello Director, I am requesting fee clearance details and authorization to access the ${
                          clearanceModalTarget === 'REPORT_CARD' ? 'report card' : 'formative progress records'
                        } for my child ${currentChild.fullName || currentChild.firstName} (Adm: ${currentChild.admissionNumber}, Grade: ${resolveGradeName(currentChild.gradeLevel)}) at Grace Seeds School.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={`mailto:schoolgraceseeds@gmail.com?subject=${encodeURIComponent(
                        `Fee Clearance Request - ${currentChild.fullName || currentChild.firstName} (${currentChild.admissionNumber})`
                      )}&body=${encodeURIComponent(
                        `Dear School Director,\n\nI am requesting fee clearance authorization and access to the ${
                          clearanceModalTarget === 'REPORT_CARD' ? 'term report card' : 'formative progress records'
                        } for my child ${currentChild.fullName || currentChild.firstName} (Adm: ${currentChild.admissionNumber}, Grade: ${resolveGradeName(currentChild.gradeLevel)}) at Grace Seeds School.\n\nThank you,\n${guardianUser?.name || 'Parent'}`
                      )}`}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">mail</span>
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Remittance Option */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">payments</span>
                    <span>Already made a fee payment?</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80">
                    Forward your M-Pesa or bank slip message to clear your ledger instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsClearanceModalOpen(false);
                    setIsForwardPaymentModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                  <span>Forward Payment</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsClearanceModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant/30 cursor-pointer transition-colors"
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
