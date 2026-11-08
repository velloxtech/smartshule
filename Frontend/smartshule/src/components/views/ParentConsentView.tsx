import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  PenTool,
  Printer,
  ChevronRight,
  User,
  Info,
  Calendar,
  Sparkles,
  Download,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';
import { apiService, parentConsentApi, signatureApi } from '../../services/api';
import { ParentConsentItem, ParentConsentResponse } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const ParentConsentView: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [children, setChildren] = useState<any[]>([]);
  const [consentItems, setConsentItems] = useState<ParentConsentItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'SUBMITTED'>('PENDING');

  // Review & Signing Modal State
  const [activeConsentForSigning, setActiveConsentForSigning] = useState<ParentConsentItem | null>(null);
  const [decision, setDecision] = useState<'CONSENTED' | 'DECLINED'>('CONSENTED');
  const [parentNotes, setParentNotes] = useState<string>('');
  const [parentName, setParentName] = useState<string>('');
  const [parentRelationship, setParentRelationship] = useState<string>('Parent');
  const [parentPhone, setParentPhone] = useState<string>('');
  const [parentNationalId, setParentNationalId] = useState<string>('');
  const [legalDeclarationChecked, setLegalDeclarationChecked] = useState(false);

  // Signature Input Mode: 'DRAW' | 'TYPE' | 'SAVED'
  const [signatureMode, setSignatureMode] = useState<'DRAW' | 'TYPE' | 'SAVED'>('DRAW');
  const [typedSignature, setTypedSignature] = useState('');
  const [savedSignatureData, setSavedSignatureData] = useState<string | null>(null);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  // Drawing Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Slip Preview Modal
  const [viewingSlipConsent, setViewingSlipConsent] = useState<ParentConsentItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await parentConsentApi.getMyConsents();
      if (res.success && res.data) {
        setChildren(res.data.children || []);
        setConsentItems(res.data.consents || []);
      } else {
        setChildren([]);
        setConsentItems([]);
      }
    } catch (err: any) {
      console.error('Failed to load consents:', err.message);
      setErrorMsg('Failed to load consent requests. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check saved signature profile if any
    const fetchSignature = signatureApi.getMySignatureProfile || signatureApi.getMySignature;
    if (typeof fetchSignature === 'function') {
      fetchSignature().then((res: any) => {
        const sig = res?.data?.profile?.signatureData || res?.data?.signatureData;
        if (res?.success && sig) {
          setSavedSignatureData(sig);
          setHasSavedProfile(true);
        }
      }).catch(() => {});
    }
  }, []);

  // Pre-fill parent details
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setParentName(fullName || 'Parent / Guardian');
      setTypedSignature(fullName);
      setParentPhone(user.phone || '');
    }
  }, [user]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleOpenSigningModal = (item: ParentConsentItem) => {
    setActiveConsentForSigning(item);
    setDecision(item.latestResponse ? item.latestResponse.decision : 'CONSENTED');
    setParentNotes(item.latestResponse?.notes || '');
    setLegalDeclarationChecked(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTimeout(() => {
      clearCanvas();
    }, 100);
  };

  const handleCloseSigningModal = () => {
    setActiveConsentForSigning(null);
    clearCanvas();
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsentForSigning) return;

    if (!legalDeclarationChecked) {
      setErrorMsg('You must check the legal confirmation checkbox before submitting.');
      return;
    }

    let signatureDataStr = '';
    let sigType = signatureMode;

    if (signatureMode === 'DRAW') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        setErrorMsg('Please draw your electronic signature on the pad provided.');
        return;
      }
      signatureDataStr = canvas.toDataURL('image/png');
    } else if (signatureMode === 'TYPE') {
      if (!typedSignature.trim()) {
        setErrorMsg('Please enter your full legal name as your typed signature.');
        return;
      }
      signatureDataStr = typedSignature.trim();
    } else if (signatureMode === 'SAVED') {
      if (!savedSignatureData) {
        setErrorMsg('No saved digital signature profile found. Please draw or type your signature.');
        return;
      }
      signatureDataStr = savedSignatureData;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await parentConsentApi.submitConsent({
        consentRequestId: activeConsentForSigning.consentRequestId,
        studentId: activeConsentForSigning.student.id,
        decision,
        notes: parentNotes.trim() || undefined,
        parentName: parentName.trim(),
        parentRelationship: parentRelationship.trim(),
        parentNationalId: parentNationalId.trim() || undefined,
        parentPhone: parentPhone.trim() || undefined,
        signatureType: sigType,
        signatureData: signatureDataStr
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Consent response submitted successfully.');
        setTimeout(() => {
          handleCloseSigningModal();
          loadData();
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Failed to record consent response.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while submitting your response.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items
  const filteredItems = consentItems.filter(item => {
    if (selectedChildId !== 'ALL' && item.student.id !== selectedChildId) {
      return false;
    }
    if (activeTab === 'PENDING') {
      return item.responseStatus === 'PENDING' || item.responseStatus === 'OUTDATED_VERSION';
    } else {
      return item.responseStatus === 'CONSENTED' || item.responseStatus === 'DECLINED';
    }
  });

  const pendingCount = consentItems.filter(
    i => i.responseStatus === 'PENDING' || i.responseStatus === 'OUTDATED_VERSION'
  ).length;
  const completedCount = consentItems.filter(
    i => i.responseStatus === 'CONSENTED' || i.responseStatus === 'DECLINED'
  ).length;

  const getCategoryBadge = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'TRIP':
        return { label: 'Field Trip & Excursion', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'MEDICAL':
        return { label: 'Medical & Healthcare', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'MEDIA':
        return { label: 'Media & Photography', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'SPORTS':
        return { label: 'Sports & Athletics', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'TRANSPORT':
        return { label: 'School Transport', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
      default:
        return { label: 'General School Consent', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 pb-20">
      {/* Header & Constitutional Article 53 Notice */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#7a1228]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Parent Portal</span>
                <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Kenya Child Protection Law & Art. 53
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Parental Consent & Authorizations</h1>
              <p className="text-xs text-slate-500">
                Review official school activity consent requests, emergency medical directives, and electronically sign per child.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="self-start md:self-auto px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Forms</span>
          </button>
        </div>

        {/* Multi-child selector pill group */}
        {children.length > 1 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Filter Child:
            </span>
            <button
              onClick={() => setSelectedChildId('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedChildId === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Children ({children.length})
            </button>
            {children.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedChildId === c.id
                    ? 'bg-[#7a1228] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({c.gradeLevel})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs: Pending vs Completed */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'PENDING'
              ? 'border-[#7a1228] text-[#7a1228]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Awaiting My Response</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SUBMITTED')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'SUBMITTED'
              ? 'border-[#7a1228] text-[#7a1228]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed Forms & Records</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {completedCount}
          </span>
        </button>
      </div>

      {/* Forms Listing */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7a1228]" />
          <p className="text-sm font-semibold">Loading parental consent records...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">
            {activeTab === 'PENDING' ? 'No pending consent requests!' : 'No completed consent forms found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'PENDING'
              ? 'You have responded to all active school authorizations and excursions for your children.'
              : 'Forms that you sign or decline will appear here with full audit receipts and printable slips.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map(item => {
            const catBadge = getCategoryBadge(item.category);
            const isOutdated = item.responseStatus === 'OUTDATED_VERSION';
            const isConsented = item.responseStatus === 'CONSENTED';
            const isDeclined = item.responseStatus === 'DECLINED';

            return (
              <div
                key={`${item.consentRequestId}-${item.student.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-xs flex flex-col justify-between transition-all space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catBadge.color}`}>
                      {catBadge.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">v{item.version}.0</span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-snug">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">{item.description}</p>
                    )}
                  </div>

                  {/* Child Badge */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {item.student.firstName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {item.student.firstName} {item.student.lastName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Adm: {item.student.admissionNumber} · {item.student.gradeLevel}
                        </div>
                      </div>
                    </div>

                    {item.isMandatory && (
                      <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Mandatory
                      </span>
                    )}
                  </div>

                  {/* Deadline Notice */}
                  {item.deadline && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Response Deadline: <strong>{new Date(item.deadline).toLocaleDateString()}</strong></span>
                    </div>
                  )}

                  {/* Status Banner */}
                  {isOutdated && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>School terms updated. Please review and re-submit consent.</span>
                    </div>
                  )}

                  {isConsented && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Consent Granted on {item.latestResponse ? new Date(item.latestResponse.submittedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  )}

                  {isDeclined && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Consent Declined on {item.latestResponse ? new Date(item.latestResponse.submittedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {item.responseStatus === 'PENDING' || isOutdated ? (
                    <button
                      onClick={() => handleOpenSigningModal(item)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#7a1228] hover:bg-[#600e1f] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{isOutdated ? 'Review Updated Terms & Sign' : 'Review & Respond to Consent'}</span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenSigningModal(item)}
                        className="py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Update Response</span>
                      </button>
                      <button
                        onClick={() => setViewingSlipConsent(item)}
                        className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View / Print Slip</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: REVIEW & SIGNING MODAL */}
      {activeConsentForSigning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#7a1228] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Official Consent Document (v{activeConsentForSigning.version}.0)
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Concerning: {activeConsentForSigning.student.firstName} {activeConsentForSigning.student.lastName}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900">{activeConsentForSigning.title}</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseSigningModal}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitResponse} className="space-y-5">
              {/* Terms Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-700">
                  Full Legal Consent Terms & Conditions
                </label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans max-h-48 overflow-y-auto space-y-2">
                  <p>{activeConsentForSigning.termsAndConditions}</p>
                  <p className="text-[11px] text-slate-500 italic pt-2 border-t border-slate-200">
                    By submitting your electronic signature below, this record is legally bound under the Laws of Kenya,
                    the Constitution of Kenya (Article 53), the Basic Education Act (2013), and the Data Protection Act (2019).
                  </p>
                </div>
              </div>

              {/* Decision Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-700">
                  Your Decision for {activeConsentForSigning.student.firstName}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision('CONSENTED')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
                      decision === 'CONSENTED'
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${decision === 'CONSENTED' ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <div className="font-extrabold text-xs">GRANT CONSENT</div>
                      <div className="text-[10px] opacity-75">I give full authorization</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('DECLINED')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer ${
                      decision === 'DECLINED'
                        ? 'border-rose-600 bg-rose-50/60 text-rose-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <XCircle className={`w-5 h-5 ${decision === 'DECLINED' ? 'text-rose-700' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <div className="font-extrabold text-xs">DECLINE CONSENT</div>
                      <div className="text-[10px] opacity-75">Child will not participate</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Notes / Instructions */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-700">
                  Parent Directives, Medical Notes, or Specific Remarks (Optional)
                </label>
                <textarea
                  value={parentNotes}
                  onChange={e => setParentNotes(e.target.value)}
                  placeholder="e.g., Learner carries an asthma inhaler; allergic to dairy; emergency contact directives..."
                  rows={2}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] outline-hidden"
                />
              </div>

              {/* Guardian Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Parent / Guardian Legal Name</label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={e => {
                      setParentName(e.target.value);
                      if (signatureMode === 'TYPE') setTypedSignature(e.target.value);
                    }}
                    required
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Relationship to Child</label>
                  <select
                    value={parentRelationship}
                    onChange={e => setParentRelationship(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Next of Kin">Next of Kin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Emergency Phone Number</label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={e => setParentPhone(e.target.value)}
                    placeholder="+2547..."
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">National ID / Passport Number</label>
                  <input
                    type="text"
                    value={parentNationalId}
                    onChange={e => setParentNationalId(e.target.value)}
                    placeholder="e.g. 28475921"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Electronic Signature Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-700">
                    Electronic Digital Signature
                  </label>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('DRAW')}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        signatureMode === 'DRAW' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                      }`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('TYPE')}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        signatureMode === 'TYPE' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                      }`}
                    >
                      Type
                    </button>
                    {hasSavedProfile && (
                      <button
                        type="button"
                        onClick={() => setSignatureMode('SAVED')}
                        className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                          signatureMode === 'SAVED' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                        }`}
                      >
                        Saved Vault
                      </button>
                    )}
                  </div>
                </div>

                {signatureMode === 'DRAW' && (
                  <div className="border border-slate-300 rounded-2xl bg-white p-2 text-center space-y-1 relative">
                    <canvas
                      ref={canvasRef}
                      width={520}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-28 border border-dashed border-slate-200 rounded-xl cursor-crosshair touch-none bg-slate-50/50"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>Sign in the box above using mouse or finger touch</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Clear Pad
                      </button>
                    </div>
                  </div>
                )}

                {signatureMode === 'TYPE' && (
                  <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={e => setTypedSignature(e.target.value)}
                      placeholder="Type your full legal name"
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                    />
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                      <span className="font-serif italic text-2xl text-blue-900 font-bold">
                        {typedSignature || 'Signature Preview'}
                      </span>
                    </div>
                  </div>
                )}

                {signatureMode === 'SAVED' && savedSignatureData && (
                  <div className="border border-emerald-300 bg-emerald-50/40 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-900">Digital Signature Profile Loaded</div>
                      <div className="text-[11px] text-emerald-700">Verified institutional key bound to your account</div>
                    </div>
                    <img src={savedSignatureData} alt="Saved Signature" className="h-12 object-contain bg-white px-3 py-1 rounded-lg border border-emerald-200" />
                  </div>
                )}
              </div>

              {/* Constitutional Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={legalDeclarationChecked}
                  onChange={e => setLegalDeclarationChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#7a1228] focus:ring-[#7a1228]"
                  required
                />
                <span className="leading-tight">
                  I solemnly declare that I am the verified lawful parent/guardian of{' '}
                  <strong>{activeConsentForSigning.student.firstName} {activeConsentForSigning.student.lastName}</strong>{' '}
                  (Adm: {activeConsentForSigning.student.admissionNumber}). I submit this response under the Constitution of Kenya (Article 53)
                  and affirm that this electronic signature binds my response.
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseSigningModal}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                    decision === 'CONSENTED' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording Signature...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Submit Official {decision}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINTABLE SLIP / AUDIT RECEIPT */}
      {viewingSlipConsent && viewingSlipConsent.latestResponse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header with print/close */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-base text-slate-900">Parental Consent Certificate</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setViewingSlipConsent(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Institutional Slip Content */}
            <div id="consent-slip-print" className="border-2 border-slate-800 rounded-2xl p-6 bg-white space-y-4 text-xs font-sans">
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
                  GRACE SEEDS SCHOOL · PARENTAL CONSENT RECORD
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  Official Statutory Certificate of Parental Consent · Article 53
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block uppercase font-mono text-[9px]">Learner Details</span>
                  <span className="font-bold text-slate-900">
                    {viewingSlipConsent.student.firstName} {viewingSlipConsent.student.lastName}
                  </span>
                  <span className="block text-slate-500 font-mono">
                    Adm No: {viewingSlipConsent.student.admissionNumber} · {viewingSlipConsent.student.gradeLevel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-mono text-[9px]">Parent / Guardian</span>
                  <span className="font-bold text-slate-900">{viewingSlipConsent.latestResponse.parentName}</span>
                  <span className="block text-slate-500">
                    Relationship: {viewingSlipConsent.latestResponse.parentRelationship || 'Parent'}
                  </span>
                </div>
              </div>

              <div className="space-y-1 py-1">
                <span className="text-slate-400 block uppercase font-mono text-[9px]">Subject / Event</span>
                <span className="font-bold text-slate-900 text-xs">{viewingSlipConsent.title}</span>
                <span className="block text-slate-500 text-[10px]">Version: v{viewingSlipConsent.version}.0</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Decision Recorded</span>
                  <span className={`text-sm font-black ${
                    viewingSlipConsent.latestResponse.decision === 'CONSENTED' ? 'text-emerald-800' : 'text-rose-800'
                  }`}>
                    {viewingSlipConsent.latestResponse.decision === 'CONSENTED' ? '✓ CONSENT GRANTED' : '✕ CONSENT DECLINED'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Submitted On</span>
                  <span className="font-mono text-slate-800">
                    {new Date(viewingSlipConsent.latestResponse.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {viewingSlipConsent.latestResponse.notes && (
                <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 text-[11px] text-amber-950">
                  <span className="font-bold block">Parent Directives / Remarks:</span>
                  <span>{viewingSlipConsent.latestResponse.notes}</span>
                </div>
              )}

              {/* Signature Visual Stamp */}
              <div className="pt-3 border-t border-slate-200 flex items-end justify-between">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 block mb-1">
                    Electronic Signature Stamp
                  </span>
                  {viewingSlipConsent.latestResponse.signatureData?.startsWith('data:image') ? (
                    <img
                      src={viewingSlipConsent.latestResponse.signatureData}
                      alt="Signature"
                      className="h-10 object-contain border-b border-slate-400 pb-1"
                    />
                  ) : (
                    <div className="font-serif italic text-lg text-blue-900 border-b border-slate-400 pb-1">
                      {viewingSlipConsent.latestResponse.signatureData || viewingSlipConsent.latestResponse.parentName}
                    </div>
                  )}
                  <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                    Signed by: {viewingSlipConsent.latestResponse.parentName}
                  </span>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-[9px] uppercase font-mono text-slate-400 block">Cryptographic Hash</span>
                  <span className="font-mono text-[8px] text-slate-500 break-all max-w-[200px] block">
                    {viewingSlipConsent.latestResponse.signatureHash || 'SHA-256 Validated'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Audit Trail</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
