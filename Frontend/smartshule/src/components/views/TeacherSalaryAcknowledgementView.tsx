import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Printer,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  FileText,
  User,
  Calendar,
  Info,
  PenTool,
  Check
} from 'lucide-react';
import { apiService, signatureApi } from '../../services/api';
import { PayrollRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const TeacherSalaryAcknowledgementView: React.FC = () => {
  const { user } = useAuth();

  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tabs & Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AWAITING' | 'ACKNOWLEDGED' | 'DISPUTED'>('ALL');

  // Modal 1: Acknowledge Modal
  const [selectedRecordForAck, setSelectedRecordForAck] = useState<any | null>(null);
  const [signatureMode, setSignatureMode] = useState<'TYPE' | 'DRAW' | 'SAVED'>('TYPE');
  const [typedSignature, setTypedSignature] = useState('');
  const [customStatement, setCustomStatement] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);
  const [savedSignatureData, setSavedSignatureData] = useState<string | null>(null);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  // Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Modal 2: Report Discrepancy / Dispute Modal
  const [selectedRecordForDispute, setSelectedRecordForDispute] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // Modal 3: View Official Acknowledgement Certificate / Slip
  const [viewingCertificateRecord, setViewingCertificateRecord] = useState<any | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiService.getMySalary();
      if (res.success && Array.isArray(res.data)) {
        setSalaryRecords(res.data);
      } else {
        setSalaryRecords([]);
      }
    } catch (err: any) {
      console.error('Failed to load salary records:', err.message);
      setErrorMsg('Failed to load salary records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();

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

  // Pre-fill user signature
  useEffect(() => {
    if (user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setTypedSignature(fullName);
    }
  }, [user]);

  // Drawing Canvas Handlers
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

  const handleOpenAckModal = (record: any) => {
    setSelectedRecordForAck(record);
    const amount = record.amountPaid > 0 ? record.amountPaid : record.netSalary;
    setCustomStatement(
      `I, ${record.teacherName}, hereby confirm receipt of salary payment of KES ${Number(amount).toLocaleString()} for the ${record.month} payroll period (Payment Ref: ${record.paymentReference || 'N/A'}).`
    );
    setSignatureMode('TYPE');
    setTypedSignature(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : record.teacherName);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCloseAckModal = () => {
    setSelectedRecordForAck(null);
    clearCanvas();
  };

  const handleConfirmAck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForAck) return;

    let signatureStr = '';
    let method: any = 'PORTAL_AUTH';

    if (signatureMode === 'DRAW') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        setErrorMsg('Please draw your electronic signature on the pad provided.');
        return;
      }
      signatureStr = canvas.toDataURL('image/png');
      method = 'DIGITAL_SIGNATURE';
    } else if (signatureMode === 'TYPE') {
      if (!typedSignature.trim()) {
        setErrorMsg('Please enter your legal name as your electronic signature.');
        return;
      }
      signatureStr = typedSignature.trim();
      method = 'PORTAL_AUTH';
    } else if (signatureMode === 'SAVED') {
      if (!savedSignatureData) {
        setErrorMsg('No saved digital signature profile found.');
        return;
      }
      signatureStr = savedSignatureData;
      method = 'DIGITAL_SIGNATURE';
    }

    setIsSubmittingAck(true);
    setErrorMsg(null);

    try {
      const res = await apiService.acknowledgeSalary(selectedRecordForAck.id, {
        statement: customStatement.trim(),
        method,
        signature: signatureStr,
      });

      if (res.success) {
        setSuccessMsg(res.message || 'Salary payment receipt acknowledged successfully.');
        setTimeout(() => {
          handleCloseAckModal();
          fetchRecords();
          setTimeout(() => setSuccessMsg(null), 3000);
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Failed to record acknowledgement.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while acknowledging salary.');
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const handleOpenDisputeModal = (record: any) => {
    setSelectedRecordForDispute(record);
    setDisputeReason('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleCloseDisputeModal = () => {
    setSelectedRecordForDispute(null);
    setDisputeReason('');
  };

  const handleConfirmDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForDispute) return;
    if (!disputeReason.trim() || disputeReason.trim().length < 5) {
      setErrorMsg('Please provide a detailed description of the salary discrepancy.');
      return;
    }

    setIsSubmittingDispute(true);
    setErrorMsg(null);

    try {
      const res = await apiService.disputeSalary(selectedRecordForDispute.id, disputeReason.trim());
      if (res.success) {
        setSuccessMsg('Discrepancy reported successfully. The accounts office has been notified and the record is under review.');
        setTimeout(() => {
          handleCloseDisputeModal();
          fetchRecords();
          setTimeout(() => setSuccessMsg(null), 3000);
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Failed to submit discrepancy report.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while reporting discrepancy.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // KPIs
  const totalCount = salaryRecords.length;
  const awaitingCount = salaryRecords.filter(
    r => r.isPaid && r.acknowledgementStatus !== 'ACKNOWLEDGED' && r.acknowledgementStatus !== 'UNDER_REVIEW'
  ).length;
  const ackCount = salaryRecords.filter(r => r.acknowledgementStatus === 'ACKNOWLEDGED').length;
  const disputedCount = salaryRecords.filter(r => r.acknowledgementStatus === 'UNDER_REVIEW').length;

  // Filter
  const filteredRecords = salaryRecords.filter(r => {
    if (statusFilter === 'AWAITING') {
      return r.isPaid && r.acknowledgementStatus !== 'ACKNOWLEDGED' && r.acknowledgementStatus !== 'UNDER_REVIEW';
    }
    if (statusFilter === 'ACKNOWLEDGED') {
      return r.acknowledgementStatus === 'ACKNOWLEDGED';
    }
    if (statusFilter === 'DISPUTED') {
      return r.acknowledgementStatus === 'UNDER_REVIEW';
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-800 flex items-center justify-center shadow-xs">
              <CreditCard className="w-6 h-6 text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">My Employment</span>
                <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Staff Remuneration Vault
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Salary Payment Acknowledgement</h1>
              <p className="text-xs text-slate-500">
                Review official disbursed salary records, verify net compensation, electronically acknowledge receipts, or report discrepancies.
              </p>
            </div>
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="self-start md:self-auto px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Periods</span>
            <span className="text-xl font-black text-slate-900">{totalCount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Disbursed salary records</span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Awaiting Acknowledgement</span>
            <span className="text-xl font-black text-amber-900">{awaitingCount}</span>
            <span className="text-[10px] text-amber-700 block mt-0.5">Pending your confirmation</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Receipts Confirmed</span>
            <span className="text-xl font-black text-emerald-900">{ackCount}</span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Electronically verified</span>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Under Review / Disputed</span>
            <span className="text-xl font-black text-rose-900">{disputedCount}</span>
            <span className="text-[10px] text-rose-700 block mt-0.5">Discrepancies reported</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>All Records</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('AWAITING')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            statusFilter === 'AWAITING'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Awaiting Acknowledgement</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
            awaitingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {awaitingCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('ACKNOWLEDGED')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            statusFilter === 'ACKNOWLEDGED'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Acknowledged</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {ackCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('DISPUTED')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            statusFilter === 'DISPUTED'
              ? 'border-rose-600 text-rose-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Under Review</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {disputedCount}
          </span>
        </button>
      </div>

      {/* Salary Records Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-700" />
          <p className="text-sm font-semibold">Loading your salary records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">No salary payment records found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Disbursed salary records processed by the school accounts office will appear here for your review and acknowledgement.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Salary</th>
                  <th className="py-3 px-4">Statutory Deductions</th>
                  <th className="py-3 px-4">Net Amount Paid</th>
                  <th className="py-3 px-4">Payment Method & Ref</th>
                  <th className="py-3 px-4">Disbursed Date</th>
                  <th className="py-3 px-4">Acknowledgement Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(r => {
                  const isPaid = r.isPaid;
                  const isAck = r.acknowledgementStatus === 'ACKNOWLEDGED';
                  const isDisputed = r.acknowledgementStatus === 'UNDER_REVIEW';
                  const isAwaiting = isPaid && !isAck && !isDisputed;
                  const netAmount = r.amountPaid > 0 ? r.amountPaid : r.netSalary;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <span className="font-mono text-xs">{r.month}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        KES {Number(r.grossSalary || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="text-[11px] font-mono text-rose-700 font-semibold">
                          KES {Number(r.totalDeductions || 0).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          PAYE + SHIF + NSSF + Levy
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800 text-sm">
                        KES {Number(netAmount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] font-semibold text-slate-800">
                          {r.paymentMethod ? r.paymentMethod.replace(/_/g, ' ') : 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Ref: {r.paymentReference || 'No Ref'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : 'Pending'}
                      </td>
                      <td className="py-3.5 px-4">
                        {isAck ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                              <CheckCircle2 className="w-3 h-3 text-teal-700" />
                              <span>ACKNOWLEDGED</span>
                            </span>
                            {r.acknowledgedAt && (
                              <div className="text-[10px] text-teal-900 font-mono">
                                {new Date(r.acknowledgedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : isDisputed ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-700" />
                              <span>UNDER REVIEW</span>
                            </span>
                            <div className="text-[10px] text-rose-900 font-semibold truncate max-w-[140px]" title={r.disputeReason}>
                              {r.disputeReason}
                            </div>
                          </div>
                        ) : isAwaiting ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>AWAITING ACKNOWLEDGEMENT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            <span>UNPAID DRAFT</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isAwaiting ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAckModal(r)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Acknowledge</span>
                            </button>
                            <button
                              onClick={() => handleOpenDisputeModal(r)}
                              title="Report Discrepancy"
                              className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Dispute</span>
                            </button>
                          </div>
                        ) : isAck ? (
                          <button
                            onClick={() => setViewingCertificateRecord(r)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>View Slip</span>
                          </button>
                        ) : isDisputed ? (
                          <span className="text-[11px] text-rose-700 font-semibold italic">Discrepancy Reported</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Payment Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ACKNOWLEDGE SALARY MODAL */}
      {selectedRecordForAck && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
                <h3 className="font-bold text-base text-slate-900">Acknowledge Receipt of Salary</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseAckModal}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
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

            <form onSubmit={handleConfirmAck} className="space-y-4">
              {/* Payment Summary Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payroll Period:</span>
                  <span className="font-bold font-mono text-slate-900">{selectedRecordForAck.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Salary:</span>
                  <span className="font-mono text-slate-800">
                    KES {Number(selectedRecordForAck.grossSalary || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Deductions:</span>
                  <span className="font-mono text-rose-700 font-semibold">
                    KES {Number(selectedRecordForAck.totalDeductions || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Net Amount Disbursed:</span>
                  <span className="font-bold font-mono text-emerald-800 text-sm">
                    KES {Number(selectedRecordForAck.amountPaid > 0 ? selectedRecordForAck.amountPaid : selectedRecordForAck.netSalary).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Method & Ref:</span>
                  <span className="font-mono">
                    {selectedRecordForAck.paymentMethod} · {selectedRecordForAck.paymentReference || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Statement */}
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                  Acknowledgement Confirmation Statement
                </label>
                <textarea
                  value={customStatement}
                  onChange={e => setCustomStatement(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 outline-hidden font-medium"
                />
              </div>

              {/* Signature Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold uppercase text-slate-700">
                    Electronic Digital Signature
                  </label>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('TYPE')}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        signatureMode === 'TYPE' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                      }`}
                    >
                      Type
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('DRAW')}
                      className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                        signatureMode === 'DRAW' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                      }`}
                    >
                      Draw
                    </button>
                    {hasSavedProfile && (
                      <button
                        type="button"
                        onClick={() => setSignatureMode('SAVED')}
                        className={`px-2.5 py-1 rounded-md text-[11px] transition-all cursor-pointer ${
                          signatureMode === 'SAVED' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
                        }`}
                      >
                        Saved Profile
                      </button>
                    )}
                  </div>
                </div>

                {signatureMode === 'TYPE' && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={e => setTypedSignature(e.target.value)}
                      placeholder="Type your full legal name"
                      required
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-semibold"
                    />
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="font-serif italic text-xl text-blue-900 font-bold">
                        {typedSignature || 'Signature Preview'}
                      </span>
                    </div>
                  </div>
                )}

                {signatureMode === 'DRAW' && (
                  <div className="border border-slate-300 rounded-2xl bg-white p-2 text-center space-y-1">
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={100}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-24 border border-dashed border-slate-200 rounded-xl cursor-crosshair touch-none bg-slate-50/50"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>Draw signature in the box</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {signatureMode === 'SAVED' && savedSignatureData && (
                  <div className="border border-emerald-300 bg-emerald-50/40 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-900">Stored Digital Signature Profile</div>
                      <div className="text-[10px] text-emerald-700">Cryptographically bound to your employee record</div>
                    </div>
                    <img src={savedSignatureData} alt="Saved" className="h-10 object-contain bg-white px-2 py-0.5 rounded border border-emerald-200" />
                  </div>
                )}

                <p className="text-[11px] text-slate-400">
                  By clicking confirm, an authenticated digital acknowledgement with timestamp and IP address will be permanently sealed in your personnel ledger.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseAckModal}
                  disabled={isSubmittingAck}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAck}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmittingAck ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Confirm & Acknowledge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORT DISCREPANCY / DISPUTE MODAL */}
      {selectedRecordForDispute && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-700" />
                <h3 className="font-bold text-base text-slate-900">Report Salary Discrepancy</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDisputeModal}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
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

            <form onSubmit={handleConfirmDispute} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Period:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRecordForDispute.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recorded Disbursed Amount:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    KES {Number(selectedRecordForDispute.amountPaid > 0 ? selectedRecordForDispute.amountPaid : selectedRecordForDispute.netSalary).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Reference:</span>
                  <span className="font-mono text-slate-700">{selectedRecordForDispute.paymentReference || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Describe Discrepancy / Reason for Dispute
                </label>
                <textarea
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="e.g. Received KES 42,000 via M-Pesa instead of stated KES 47,500; responsibility allowance omitted; wrong bank reference..."
                  rows={4}
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-700/20 focus:border-rose-700 outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Submitting this report changes the status to <strong>UNDER REVIEW</strong> and notifies the school accounts office for immediate investigation.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseDisputeModal}
                  disabled={isSubmittingDispute}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute}
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isSubmittingDispute ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Submit Discrepancy Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW OFFICIAL ACKNOWLEDGEMENT CERTIFICATE / SLIP */}
      {viewingCertificateRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-5 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-base text-slate-900">Salary Acknowledgement Advice</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setViewingCertificateRecord(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div id="salary-slip-print" className="border-2 border-slate-800 rounded-2xl p-6 bg-white space-y-4 text-xs font-sans">
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
                  GRACE SEEDS SCHOOL · PAYROLL DISBURSEMENT ADVICE
                </h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  Official Statutory Electronic Receipt of Salary Remuneration
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block uppercase font-mono text-[9px]">Staff Faculty</span>
                  <span className="font-bold text-slate-900">{viewingCertificateRecord.teacherName}</span>
                  <span className="block text-slate-500 font-mono">Staff ID: {viewingCertificateRecord.teacherId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-mono text-[9px]">Payroll Period</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">{viewingCertificateRecord.month}</span>
                  <span className="block text-slate-500">
                    Disbursed: {viewingCertificateRecord.paidAt ? new Date(viewingCertificateRecord.paidAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gross Salary:</span>
                  <span className="font-mono font-bold text-slate-900">
                    KES {Number(viewingCertificateRecord.grossSalary || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statutory Deductions (PAYE, NSSF, SHIF, Levy):</span>
                  <span className="font-mono text-rose-700 font-semibold">
                    - KES {Number(viewingCertificateRecord.totalDeductions || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-900">Net Salary Paid:</span>
                  <span className="font-bold font-mono text-emerald-800">
                    KES {Number(viewingCertificateRecord.amountPaid > 0 ? viewingCertificateRecord.amountPaid : viewingCertificateRecord.netSalary).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Method & Ref:</span>
                  <span className="font-mono">
                    {viewingCertificateRecord.paymentMethod} · {viewingCertificateRecord.paymentReference || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block uppercase font-mono text-[9px]">Affirmed Statement</span>
                <p className="text-[11px] text-slate-700 italic bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-200">
                  "{viewingCertificateRecord.acknowledgementStatement || 'I hereby confirm receipt of salary payment.'}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-end justify-between">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-400 block mb-1">
                    Signatory Stamp
                  </span>
                  {viewingCertificateRecord.acknowledgementSignature?.startsWith('data:image') ? (
                    <img
                      src={viewingCertificateRecord.acknowledgementSignature}
                      alt="Signature"
                      className="h-10 object-contain border-b border-slate-400 pb-1"
                    />
                  ) : (
                    <div className="font-serif italic text-lg text-blue-900 border-b border-slate-400 pb-1">
                      {viewingCertificateRecord.acknowledgementSignature || viewingCertificateRecord.teacherName}
                    </div>
                  )}
                  <span className="text-[9px] text-slate-500 block mt-1 font-mono">
                    Acknowledged: {viewingCertificateRecord.acknowledgedAt ? new Date(viewingCertificateRecord.acknowledgedAt).toLocaleString() : 'N/A'}
                  </span>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-[9px] uppercase font-mono text-slate-400 block">Status</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">
                    <ShieldCheck className="w-3 h-3 text-teal-700" />
                    <span>VERIFIED RECORD</span>
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
