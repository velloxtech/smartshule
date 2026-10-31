import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../services/api';
import { DashboardSummary, SchoolInfo } from '../../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}


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
        if (schoolRes && schoolRes.success && schoolRes.data) {
          setSchool(schoolRes.data);
        }
        if (analyticsRes && analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
      } catch (err) {
        console.error('Failed to load export report data:', err);

        if (cancelled) return;

        if (schoolResult?.success && schoolResult.data) {
          setSchool(schoolResult.data);
        }

        if (analyticsResult?.success && analyticsResult.data) {
          setAnalytics(analyticsResult.data);
        } else {
          setError('Could not load term analytics data.');
        }
      } 
      useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
          try {
            setError(null);
            setLoading(true);
            const res = await apiService.getDashboardSummary();
            if (!cancelled && res?.success) {
              // data handling
            }
          } catch (err: any) {
            if (!cancelled) {
              setError(err.message || 'Failed to load report data.');
            }
          } finally {
            if (!cancelled) {
              setLoading(false);
            }
          }
        };
        loadData();
        return () => {
          cancelled = true;
        };
      }, []);
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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
      </div>
    </div>
  );
};

export default ExportReportModal;