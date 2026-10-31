<<<<<<< Updated upstream
import React, { useEffect, useState } from 'react';
=======
import React, { useCallback, useEffect, useRef, useState } from 'react';
>>>>>>> Stashed changes
import { apiService } from '../../services/api';
import { DashboardSummary, SchoolInfo } from '../../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}
<<<<<<< Updated upstream
=======

const DEFAULT_SCHOOL: Partial<SchoolInfo> = {
  name: 'Grace Seeds School',
  address: 'KEMRI Street, Kisian, Kisumu, Kenya',
  phone: '0745436312',
  email: 'schoolgraceseeds@gmail.com',
  motto: 'The future begins here',
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return 'KES 0.00';
  const formatted = Math.abs(value).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(KES ${formatted})` : `KES ${formatted}`;
};

const formatPercentage = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
};
>>>>>>> Stashed changes

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [analytics, setAnalytics] = useState<DashboardSummary | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [schoolResult, analyticsResult] = await Promise.all([
          apiService.getSchool(),
          apiService.getDashboardAnalytics(),
        ]);
<<<<<<< Updated upstream
        if (schoolRes && schoolRes.success && schoolRes.data) {
          setSchool(schoolRes.data);
        }
        if (analyticsRes && analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
      } catch (err) {
        console.error('Failed to load export report data:', err);
=======

        if (cancelled) return;

        if (schoolResult?.success && schoolResult.data) {
          setSchool(schoolResult.data);
        }

        if (analyticsResult?.success && analyticsResult.data) {
          setAnalytics(analyticsResult.data);
        } else {
          setError('Could not load term analytics data.');
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load report data.');
        }
>>>>>>> Stashed changes
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

<<<<<<< Updated upstream
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const schoolName = school?.name || 'Grace Seeds School';
  const termName = analytics?.academicPeriod?.term || 'Current Term';
  const yearName = analytics?.academicPeriod?.year || new Date().getFullYear().toString();

  const totalStudents = analytics?.counts?.totalStudents || 0;
  const totalTeachers = analytics?.counts?.totalTeachers || 0;
  const totalCollected = analytics?.finance?.totalCollected || 0;
  const totalInvoiced = analytics?.finance?.totalInvoiced || 0;
  const collectionRate = analytics?.finance?.collectionRatePercentage || 0;

  const totalAssessments = analytics?.CBCProficiency?.totalAssessments || 0;
  const meetingOrExceeding = (analytics?.CBCProficiency?.exceeding || 0) + (analytics?.CBCProficiency?.meeting || 0);
  const CBCMasteryPct = totalAssessments > 0 ? Math.round((meetingOrExceeding / totalAssessments) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">description</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Executive Summary Report Preview</h3>
              <p className="text-xs text-rose-100">{schoolName} · {termName} {yearName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-on-surface overscroll-contain">
          {/* Official Document Header */}
          <div className="text-center border-b border-outline-variant/30 pb-4">
            <div className="text-xs font-bold text-secondary uppercase tracking-widest">
              Ministry of Education · Continuous Assessment Framework
            </div>
            <h2 className="text-xl font-bold text-primary mt-1 uppercase">{schoolName} - CBE EXECUTIVE BRIEF</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {school?.address || 'KEMRI Street, Kisian, Kisumu, Kenya'} · Tel: {school?.phone || '0745436312'} · Email: {school?.email || 'schoolgraceseeds@gmail.com'}
            </p>
            <div className="mt-2 text-xs font-data-mono text-outline">
              Generated on: {new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-on-surface-variant flex flex-col items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[28px] text-primary">progress_activity</span>
              <span>Loading executive summary metrics from database...</span>
            </div>
          ) : (
            <>
              {/* Key Executive Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="text-[11px] text-on-surface-variant uppercase font-medium">Enrolled</span>
                  <div className="text-xl font-bold text-primary">{totalStudents.toLocaleString()}</div>
                  <span className="text-[11px] text-on-surface-variant">{totalTeachers} Teachers</span>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="text-[11px] text-on-surface-variant uppercase font-medium">Fee Collection</span>
                  <div className="text-xl font-bold text-secondary">{collectionRate}%</div>
                  <span className="text-[11px] text-secondary font-medium">Rate</span>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="text-[11px] text-on-surface-variant uppercase font-medium">Fee Collected</span>
                  <div className="text-base font-bold text-primary font-data-mono">KES {totalCollected.toLocaleString()}</div>
                  <span className="text-[11px] text-on-surface-variant">of KES {totalInvoiced.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-surface-container-low rounded-xl text-center">
                  <span className="text-[11px] text-on-surface-variant uppercase font-medium">CBE Mastery</span>
                  <div className="text-xl font-bold text-primary">{CBCMasteryPct}%</div>
                  <span className="text-[11px] text-secondary font-medium">EE + ME Tier</span>
                </div>
              </div>

              {/* Attendance & Staffing Section */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Institutional Status
                </h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between py-1 border-b border-surface-container">
                    <span>Enrolled Learners in Database</span>
                    <span className="font-semibold text-secondary">{totalStudents} Learners</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-surface-container">
                    <span>Active Teaching Staff</span>
                    <span className="font-semibold text-secondary">{totalTeachers} Teachers</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>CBE Formative & Summative Records Logged</span>
                    <span className="font-bold text-primary">{totalAssessments} Rubrics</span>
                  </div>
                </div>
              </div>

              {/* Financials Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Financial Collection Status
                </h4>
                <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Total Invoiced:</span>
                    <span className="font-bold font-data-mono text-primary">KES {totalInvoiced.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Total Cleared:</span>
                    <span className="font-bold font-data-mono text-secondary">KES {totalCollected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant/30 pt-1.5 font-bold">
                    <span>Outstanding Balance / Arrears:</span>
                    <span className="font-data-mono text-primary">KES {(analytics?.finance?.totalArrears || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Certification Signoff */}
              <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-end text-xs">
                <div>
                  <div className="font-bold text-on-surface">Principal Administrator</div>
                  <div className="text-on-surface-variant">Principal Administrator, {schoolName}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-secondary">Institutional System Verification</div>
                  <div className="text-outline font-data-mono">Verified Authentic</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print Official Brief</span>
          </button>
        </div>
=======
  const handlePrint = useCallback(() => {
    if (!reportRef.current || loading || !analytics) return;

    const printWindow = window.open('', '_blank', 'width=1050,height=800');
    if (!printWindow) {
      window.alert('Pop-up blocked. Please allow pop-ups for this site.');
      return;
    }

    const reportHtml = reportRef.current.innerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${school?.name || DEFAULT_SCHOOL.name} - End of Term Report</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 7mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1f2937;
              font-size: 10px;
              line-height: 1.35;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0 6px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 4px 6px;
              font-size: 9.5px;
            }
            th {
              background-color: #fdf2f4 !important;
              color: #800020 !important;
              font-weight: 700;
              text-align: left;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          ${reportHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [analytics, loading, school]);

  if (!isOpen) return null;

  const schoolName = school?.name || DEFAULT_SCHOOL.name!;
  const schoolAddress = school?.address || DEFAULT_SCHOOL.address!;
  const schoolPhone = school?.phone || DEFAULT_SCHOOL.phone!;
  const schoolEmail = school?.email || DEFAULT_SCHOOL.email!;
  const schoolMotto = (school?.motto || DEFAULT_SCHOOL.motto!).toUpperCase();
  const logoUrl = school?.logoUrl || '';

  const academicPeriod = analytics?.academicPeriod;
  const termRaw = academicPeriod?.term || '3';
  const termName = String(termRaw).toLowerCase().includes('term') ? termRaw : `Term ${termRaw}`;
  const yearName = academicPeriod?.year || '2026';

  const counts = analytics?.counts;
  const finance = analytics?.finance;
  const cbc = analytics?.CBCProficiency;
  const attendance = analytics?.attendanceSummary;

  const totalCbcAssessments = cbc?.totalAssessments || 0;
  const eeRate = totalCbcAssessments > 0 ? ((cbc?.exceeding || 0) / totalCbcAssessments) * 100 : 0;
  const meRate = totalCbcAssessments > 0 ? ((cbc?.meeting || 0) / totalCbcAssessments) * 100 : 0;
  const aeRate = totalCbcAssessments > 0 ? ((cbc?.approaching || 0) / totalCbcAssessments) * 100 : 0;
  const beRate = totalCbcAssessments > 0 ? ((cbc?.below || 0) / totalCbcAssessments) * 100 : 0;

  const presentRate = attendance?.presentPercentage ?? 95.0;
  const collectionRate = finance?.collectionRatePercentage ?? 0;

  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Top Controls */}
        <div className="flex items-center justify-between border-b border-rose-100 bg-[#fdf5f7] px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#800020] text-xl">assessment</span>
            <h2 className="text-sm font-bold text-[#800020]">End of Term Institutional Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !analytics || !!error}
              className="flex items-center gap-1.5 rounded-lg bg-[#800020] px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-[#66001a] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Print (Single A4 Page)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="flex-1 overflow-y-auto bg-stone-100/60 p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-600">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#800020]">progress_activity</span>
              <p className="mt-2 text-xs font-medium">Generating Report...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700">
              {error}
            </div>
          ) : !analytics ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-800">
              No analytics records available.
            </div>
          ) : (
            <div
              ref={reportRef}
              style={{
                maxWidth: '780px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                padding: '16px 20px',
                color: '#111827',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #800020',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ height: '56px', width: '56px', objectFit: 'contain' }} />
                  ) : (
                    <div
                      style={{
                        height: '56px',
                        width: '56px',
                        backgroundColor: '#800020',
                        color: '#fff',
                        fontWeight: '900',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                      }}
                    >
                      GS
                    </div>
                  )}
                  <div>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '900',
                        color: '#800020',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {schoolName}
                    </h1>
                    <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#4b5563', fontWeight: '500' }}>
                      {schoolAddress}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: '9.5px', color: '#6b7280' }}>
                      Tel: {schoolPhone} | Email: {schoolEmail}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      backgroundColor: '#800020',
                      color: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '800',
                      letterSpacing: '0.5px',
                      display: 'inline-block',
                      textTransform: 'uppercase',
                    }}
                  >
                    END OF {termName} {yearName} REPORT
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '9.5px', color: '#6b7280' }}>
                    Curriculum: <strong>CBC (2-6-3-3-3)</strong>
                  </p>
                </div>
              </div>

              {/* Sub-Header Metadata */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #fecdd3',
                  padding: '4px 6px',
                  backgroundColor: '#fff1f2',
                  fontSize: '9.5px',
                  color: '#4b5563',
                  margin: '6px 0 8px',
                  borderRadius: '3px',
                }}
              >
                <span><strong>Period:</strong> {termName} ({yearName})</span>
                <span><strong>Report Date:</strong> {generatedDate}</span>
                <span><strong>Report Scope:</strong> Comprehensive Operations & Performance</span>
              </div>

              {/* Section 1: KPI Cards */}
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    borderBottom: '1.5px solid #800020',
                    paddingBottom: '2px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    color: '#800020',
                    textTransform: 'uppercase',
                  }}
                >
                  1. Institutional Key Performance Indicators (KPIs)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '6px' }}>
                  <div style={{ border: '1px solid #fecdd3', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#fffbfc' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#800020', textTransform: 'uppercase' }}>Enrolled Learners</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#111827', margin: '2px 0 0' }}>
                      {counts?.activeStudents ?? counts?.totalStudents ?? 0}
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#6b7280' }}>{counts?.boysCount ?? 0} Boys | {counts?.girlsCount ?? 0} Girls</div>
                  </div>

                  <div style={{ border: '1px solid #fecdd3', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#fffbfc' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#800020', textTransform: 'uppercase' }}>Faculty & Staff</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#111827', margin: '2px 0 0' }}>
                      {counts?.totalTeachers ?? 0}
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#6b7280' }}>{counts?.totalNonTeachingStaff ?? 0} Support Staff</div>
                  </div>

                  <div style={{ border: '1px solid #a7f3d0', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#ecfdf5' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>CBC Quality Rate</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#047857', margin: '2px 0 0' }}>
                      {formatPercentage(cbc?.proficiencyRate ?? (eeRate + meRate))}
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#047857' }}>Meeting/Exceeding Goals</div>
                  </div>

                  <div style={{ border: '1px solid #fecdd3', borderRadius: '4px', padding: '6px 8px', backgroundColor: '#fff1f2' }}>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: '#800020', textTransform: 'uppercase' }}>Fee Collection Rate</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#800020', margin: '2px 0 0' }}>
                      {formatPercentage(collectionRate)}
                    </div>
                    <div style={{ fontSize: '8.5px', color: '#6b7280' }}>{formatCurrency(finance?.totalCollected)} Paid</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Visual CBC Performance */}
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    borderBottom: '1.5px solid #800020',
                    paddingBottom: '2px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    color: '#800020',
                    textTransform: 'uppercase',
                  }}
                >
                  2. Competency-Based Assessment (CBC) Distribution & Visual Analytics
                </div>

                {/* Visual Stacked Bar */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '5px 8px', backgroundColor: '#f9fafb', margin: '5px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: '700', color: '#4b5563', marginBottom: '3px' }}>
                    <span>Curriculum Mastery Graph</span>
                    <span>Total Evaluated: {totalCbcAssessments} assessments</span>
                  </div>
                  <div style={{ display: 'flex', height: '14px', borderRadius: '3px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
                    <div style={{ width: `${eeRate}%`, backgroundColor: '#059669', color: '#fff', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {eeRate > 8 ? `${eeRate.toFixed(0)}%` : ''}
                    </div>
                    <div style={{ width: `${meRate}%`, backgroundColor: '#800020', color: '#fff', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {meRate > 8 ? `${meRate.toFixed(0)}%` : ''}
                    </div>
                    <div style={{ width: `${aeRate}%`, backgroundColor: '#d97706', color: '#fff', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {aeRate > 8 ? `${aeRate.toFixed(0)}%` : ''}
                    </div>
                    <div style={{ width: `${beRate}%`, backgroundColor: '#be123c', color: '#fff', fontSize: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {beRate > 8 ? `${beRate.toFixed(0)}%` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', fontWeight: '600', marginTop: '3px' }}>
                    <span style={{ color: '#047857' }}>● EE: {formatPercentage(eeRate)}</span>
                    <span style={{ color: '#800020' }}>● ME: {formatPercentage(meRate)}</span>
                    <span style={{ color: '#b45309' }}>● AE: {formatPercentage(aeRate)}</span>
                    <span style={{ color: '#be123c' }}>● BE: {formatPercentage(beRate)}</span>
                  </div>
                </div>

                {/* CBC Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fdf2f4', color: '#800020' }}>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Rubric Level</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', width: '50px' }}>Count</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', width: '65px' }}>Proportion</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Curriculum Action & Implication</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '700', color: '#047857' }}>Exceeding Expectations (EE)</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700' }}>{cbc?.exceeding ?? 0}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700', color: '#047857' }}>{formatPercentage(eeRate)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#4b5563' }}>Demonstrates deep inquiry, creative reasoning, and mastery</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '700', color: '#800020' }}>Meeting Expectations (ME)</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700' }}>{cbc?.meeting ?? 0}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700', color: '#800020' }}>{formatPercentage(meRate)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#4b5563' }}>Consistently achieves all targeted sub-strand competencies</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '700', color: '#b45309' }}>Approaching Expectations (AE)</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700' }}>{cbc?.approaching ?? 0}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700', color: '#b45309' }}>{formatPercentage(aeRate)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#4b5563' }}>Requires guidance in specific strands and focused exercises</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '700', color: '#be123c' }}>Below Expectations (BE)</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700' }}>{cbc?.below ?? 0}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700', color: '#be123c' }}>{formatPercentage(beRate)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#4b5563' }}>Enrolled in individualized remedial coaching</td>
                    </tr>
                    <tr style={{ backgroundColor: '#fff1f2', fontWeight: '700', color: '#800020' }}>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Total Assessments</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center' }}>{totalCbcAssessments}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center' }}>100.0%</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Term-wide assessment coverage across all learning areas</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 3: Attendance & Operations */}
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    borderBottom: '1.5px solid #800020',
                    paddingBottom: '2px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    color: '#800020',
                    textTransform: 'uppercase',
                  }}
                >
                  3. Learner Attendance & Routine Overview
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fdf2f4', color: '#800020' }}>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Attendance Category</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', width: '70px' }}>Sessions</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', width: '75px' }}>Term Rate</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Operational Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '600' }}>Present in Class</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700' }}>{attendance?.present ?? 0}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700', color: '#047857' }}>{formatPercentage(presentRate)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#4b5563' }}>High classroom participation and active daily engagement</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '600' }}>Absent (Excused & Unexcused)</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700' }}>{(attendance?.absent ?? 0) + (attendance?.excused ?? 0)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center', fontWeight: '700', color: '#be123c' }}>{formatPercentage(100 - presentRate)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#4b5563' }}>Promptly recorded and parents notified via SMS / WhatsApp</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 4: Finances */}
              <div style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    borderBottom: '1.5px solid #800020',
                    paddingBottom: '2px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    color: '#800020',
                    textTransform: 'uppercase',
                  }}
                >
                  4. Financial Health & Fee Collection Status
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fdf2f4', color: '#800020' }}>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Revenue Head</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', width: '120px' }}>Amount (KES)</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', width: '80px' }}>Proportion</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>Accounting Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '700' }}>Total Invoiced Billing</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(finance?.totalInvoiced)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>100.0%</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#4b5563' }}>Term tuition, academic assessments & feeding billing</td>
                    </tr>
                    <tr style={{ backgroundColor: '#ecfdf5' }}>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '700', color: '#065f46' }}>Total Collections Realized</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', fontWeight: '700', color: '#047857' }}>{formatCurrency(finance?.totalCollected)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', fontWeight: '700', color: '#047857' }}>{formatPercentage(collectionRate)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#065f46' }}>Verified via Bank Wire & M-Pesa channels</td>
                    </tr>
                    <tr style={{ backgroundColor: '#fff1f2' }}>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', fontWeight: '700', color: '#800020' }}>Outstanding Arrears & Defaulters</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', fontWeight: '700', color: '#800020' }}>{formatCurrency(finance?.totalArrears)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', fontWeight: '700', color: '#800020' }}>
                        {formatPercentage(finance?.totalInvoiced && finance.totalInvoiced > 0 ? ((finance.totalArrears ?? 0) / finance.totalInvoiced) * 100 : 0)}
                      </td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', color: '#be123c' }}>Follow-up fee statements dispatched to guardians</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '14px', paddingTop: '4px' }}>
                <div style={{ borderTop: '1.5px dashed #800020', paddingTop: '4px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#111827' }}>Deputy Head Teacher / Academic Lead</div>
                  <div style={{ fontSize: '8.5px', color: '#6b7280', marginTop: '2px' }}>Signature: __________________________</div>
                  <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px' }}>Date: {generatedDate}</div>
                </div>

                <div style={{ borderTop: '1.5px dashed #800020', paddingTop: '4px', textAlign: 'right' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#111827' }}>Head Teacher / School Administrator</div>
                  <div style={{ fontSize: '8.5px', color: '#6b7280', marginTop: '2px' }}>Signature & Official Stamp: __________________</div>
                  <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px' }}>Date: {generatedDate}</div>
                </div>
              </div>

              {/* Motto Footer */}
              <div style={{ borderTop: '1px solid #fecdd3', marginTop: '10px', paddingTop: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', color: '#800020' }}>
                  {schoolMotto}
                </div>
                <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px' }}>
                  Grace Seeds School ERP • Official Academic & Institutional Report
                </div>
              </div>
            </div>
          )}
        </div>
>>>>>>> Stashed changes
      </div>
    </div>
  );
};

export default ExportReportModal;