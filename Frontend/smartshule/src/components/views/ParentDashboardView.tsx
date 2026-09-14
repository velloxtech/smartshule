import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ParentDashboardViewProps {
  onOpenMpesaWithStudent?: (student: any) => void;
  onOpenPaystackWithStudent?: (student: any) => void;
  onViewReportCard: (student: any) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ParentDashboardView: React.FC<ParentDashboardViewProps> = ({
  onOpenMpesaWithStudent,
  onOpenPaystackWithStudent,
  onViewReportCard,
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const [portalData, setPortalData] = useState<any>(null);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getGuardianPortalData();
      if (res.success && res.data) {
        setPortalData(res.data);
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
  const guardianUser = portalData?.guardian?.user || user;

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
            Grace Seeds School · Parent Portal
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
                  {c.firstName} ({c.gradeLevel})
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
                    {currentChild.gradeLevel}
                  </span>
                  {currentChild.streamId && (
                    <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-xs font-semibold">
                      Stream: {currentChild.streamId.replace('stream-', '').replace('-east', ' East').replace('-west', ' West')}
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
                onClick={() => onViewReportCard({
                  id: currentChild.id,
                  name: currentChild.fullName || `${currentChild.firstName} ${currentChild.lastName}`,
                  admNo: currentChild.admissionNumber,
                  upi: currentChild.upiNumber || 'NEMIS-K9281A',
                  grade: currentChild.gradeLevel,
                  stream: currentChild.streamId ? 'East' : 'General',
                  feeBalance: currentChild.fee?.balance || 0,
                  totalFee: currentChild.fee?.totalBilled || 0,
                  attendanceRate: currentChild.attendance?.attendanceRate || 100,
                  cbcRating: 'ME',
                  status: currentChild.status || 'Active'
                })}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span>Term Report Card</span>
              </button>

              <button
                onClick={() => {
                  const studentObj = {
                    id: currentChild.id,
                    name: currentChild.fullName || `${currentChild.firstName} ${currentChild.lastName}`,
                    admNo: currentChild.admissionNumber,
                    upi: currentChild.upiNumber || 'NEMIS-K9281A',
                    grade: currentChild.gradeLevel,
                    stream: currentChild.streamId ? 'East' : 'General',
                    guardianName: `${guardianUser?.firstName} ${guardianUser?.lastName}`,
                    guardianPhone: guardianUser?.phone || '',
                    feeBalance: currentChild.fee?.balance || 0,
                    totalFee: currentChild.fee?.totalBilled || 0,
                    attendanceRate: currentChild.attendance?.attendanceRate || 100,
                    cbcRating: 'ME',
                    status: currentChild.status || 'Active'
                  };
                  if (onOpenPaystackWithStudent) {
                    onOpenPaystackWithStudent(studentObj);
                  } else if (onOpenMpesaWithStudent) {
                    onOpenMpesaWithStudent(studentObj);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary to-[#500b1a] text-white rounded-lg hover:shadow-xs text-xs font-bold transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">account_balance</span>
                <span>Pay Fees via Paystack Bank</span>
              </button>
            </div>
          </div>

          {/* Quick Shortcuts for Parent Portal */}
          {onNavigateTab && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                onClick={() => onNavigateTab('visual-cbc')}
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
                onClick={() => onNavigateTab('whatsapp-bot')}
                className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 shadow-xs cursor-pointer flex items-center gap-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">chat</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface">WhatsApp School Desk</div>
                  <div className="text-[11px] text-on-surface-variant">Instant bot inquiries</div>
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
                CBC Competencies Logged
              </span>
              <div className="text-2xl font-bold font-data-mono text-primary mt-1">
                {currentChild.cbc?.assessmentsCount || 0}
              </div>
              <span className="text-[11px] text-secondary font-semibold mt-1 block">
                Continuous Teacher Rubrics
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Outstanding Balance
              </span>
              <div className="text-2xl font-bold font-data-mono text-error mt-1">
                KES {(currentChild.fee?.balance || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-on-surface-variant mt-1 block">
                Term Total: KES {(currentChild.fee?.totalBilled || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Total Fees Cleared
              </span>
              <div className="text-2xl font-bold font-data-mono text-secondary mt-1">
                KES {(currentChild.fee?.totalPaid || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-outline mt-1 block">
                Reconciled via Stanbic Bank & Paystack Gateway
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
                <span className="text-xs font-bold text-primary font-data-mono">
                  Balance: KES {(currentChild.fee?.balance || 0).toLocaleString()}
                </span>
              </div>

              {currentChild.fee?.invoices?.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-on-surface">Term Invoices:</div>
                  {currentChild.fee.invoices.map((inv: any) => (
                    <div key={inv.id} className="p-3 rounded-lg bg-surface-container-low text-xs space-y-1">
                      <div className="flex justify-between font-bold text-on-surface">
                        <span>Invoice #{inv.invoiceNumber}</span>
                        <span className="font-data-mono text-primary">KES {inv.amountPayable?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-on-surface-variant text-[11px]">
                        <span>Paid: KES {inv.amountPaid?.toLocaleString()}</span>
                        <span className="font-semibold text-error">Bal: KES {inv.balance?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}

                  {currentChild.fee.payments?.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="text-xs font-semibold text-on-surface">Payment Receipts:</div>
                      {currentChild.fee.payments.map((pay: any) => (
                        <div key={pay.id} className="p-2.5 rounded-lg bg-secondary/5 border border-secondary/20 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-primary font-data-mono">{pay.receiptNumber}</div>
                            <div className="text-[11px] text-on-surface-variant">
                              Ref: {pay.transactionReference} · {pay.paymentMethod}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold font-data-mono text-secondary">
                              +KES {pay.amount?.toLocaleString()}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary-container text-on-secondary-container font-semibold">
                              {pay.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  No fee invoices or transactions recorded for this learner yet.
                </div>
              )}
            </div>

            {/* Continuous Assessment Evaluations */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-container pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">grading</span>
                  <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">CBC Assessment Portfolio</h3>
                </div>
                <span className="text-xs font-semibold text-secondary">KICD CBA Rubrics</span>
              </div>

              {currentChild.cbc?.latestEvaluations?.length > 0 ? (
                <div className="space-y-3">
                  {currentChild.cbc.latestEvaluations.map((ev: any) => (
                    <div key={ev.id} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">{ev.learningAreaId}</span>
                        {getRatingBadge(ev.overallPerformanceLevel)}
                      </div>
                      <p className="text-xs text-on-surface italic bg-white/70 p-2.5 rounded-lg border-l-2 border-primary/40">
                        "{ev.teacherRemarks}"
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-outline pt-1">
                        <span>Evaluated: {ev.evaluationDate}</span>
                        <span className="font-bold text-secondary font-data-mono">
                          {ev.percentageScore ? `${ev.percentageScore}%` : 'Competency Assessed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  No formative or summative assessments logged for this term yet. Continuous assessments will appear here as teachers complete rubrics.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
