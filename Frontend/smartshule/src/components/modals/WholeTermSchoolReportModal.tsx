import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface WholeTermSchoolReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAcademicYearId?: string;
  defaultTermId?: string;
}

export const WholeTermSchoolReportModal: React.FC<WholeTermSchoolReportModalProps> = ({
  isOpen,
  onClose,
  defaultAcademicYearId = '',
  defaultTermId = ''
}) => {
  const [academicYearId, setAcademicYearId] = useState<string>(defaultAcademicYearId);
  const [termId, setTermId] = useState<string>(defaultTermId);
  const [availableYears, setAvailableYears] = useState<any[]>([]);
  const [availableTerms, setAvailableTerms] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available periods on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchPeriods = async () => {
      try {
        const yearsRes = await apiService.getAcademicYears();
        const years = yearsRes.data || [];
        setAvailableYears(years);

        const currentYear = years.find((y: any) => y.isCurrent) || years[0];
        const yearIdToUse = academicYearId || currentYear?.id || '';
        if (!academicYearId && yearIdToUse) {
          setAcademicYearId(yearIdToUse);
        }

        if (yearIdToUse) {
          const termsRes = await apiService.getTermsByYear(yearIdToUse);
          const terms = termsRes.data || [];
          setAvailableTerms(terms);
          const currentTerm = terms.find((t: any) => t.isCurrent) || terms[0];
          if (!termId && currentTerm) {
            setTermId(currentTerm.id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching academic periods for whole-term report:', err);
      }
    };
    fetchPeriods();
  }, [isOpen]);

  // Handle year change
  const handleYearChange = async (newYearId: string) => {
    setAcademicYearId(newYearId);
    try {
      const termsRes = await apiService.getTermsByYear(newYearId);
      const terms = termsRes.data || [];
      setAvailableTerms(terms);
      if (terms.length > 0) {
        const currentTerm = terms.find((t: any) => t.isCurrent) || terms[0];
        setTermId(currentTerm.id);
      } else {
        setTermId('');
      }
    } catch {}
  };

  // Fetch report data when academicYearId and termId change
  useEffect(() => {
    if (!isOpen || !academicYearId) return;
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.getWholeTermReport({
          academicYearId,
          termId
        });
        if (res.data) {
          setReportData(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate whole-term school report.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [isOpen, academicYearId, termId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl max-w-5xl w-full border border-outline-variant shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-2xl">menu_book</span>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white">Whole-Term School Executive Report</h2>
              <p className="text-[11px] text-slate-300">Grace Seeds School Official Term Summary Dossier</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector */}
            <select
              value={academicYearId}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              {availableYears.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>

            {/* Term Selector */}
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              {availableTerms.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || !reportData}
              className="px-3 py-1.5 bg-[#7a1228] hover:bg-[#5e0d1e] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 font-body text-slate-900 bg-white">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-[#7a1228] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-[#7a1228]">Synthesizing Grace Seeds School whole-term operational records...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl">error</span>
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : reportData ? (
            <div className="space-y-6 print:space-y-4">
              {/* Report Letterhead Header */}
              <div className="text-center border-b-2 border-[#7a1228] pb-4">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <div className="w-12 h-12 rounded-full bg-[#7a1228] text-white flex items-center justify-center font-black text-xl">
                    GS
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#7a1228] uppercase">{reportData.institution.name}</h1>
                    <p className="text-xs italic font-semibold text-slate-600 tracking-wide">"{reportData.institution.motto}"</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-4 mt-2">
                  <span>Location: {reportData.institution.address}</span>
                  <span>•</span>
                  <span>Academic Period: {reportData.institution.academicYear} - {reportData.institution.term}</span>
                  <span>•</span>
                  <span>Generated Date: {reportData.institution.reportDate}</span>
                </div>
              </div>

              {/* Executive Summary Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Enrolment</span>
                  <div className="text-xl font-black text-slate-800 mt-1">{reportData.enrolment.totalEnrolled}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Boys: {reportData.enrolment.boys} | Girls: {reportData.enrolment.girls}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Attendance Rate</span>
                  <div className="text-xl font-black text-emerald-700 mt-1">{reportData.attendance.averageAttendanceRate}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{reportData.attendance.totalRegistersMarked} registers completed</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved Curriculum Coverage</span>
                  <div className="text-xl font-black text-blue-700 mt-1">{reportData.curriculum.approvedCoveragePercentage}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{reportData.curriculum.approvedLessons} of {reportData.curriculum.totalPlannedLessons} planned units</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fee Collection Rate</span>
                  <div className="text-xl font-black text-[#7a1228] mt-1">{reportData.finance.collectionRate}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Arrears: KES {reportData.finance.totalArrears.toLocaleString()}</div>
                </div>
              </div>

              {/* Section 1: Academic Summative CBC Proficiency Distribution */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#7a1228]">school</span>
                    CBC Academic Summative Proficiency Levels
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">{reportData.academics.totalEvaluations} evaluated assessments</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-black text-emerald-800">EE (Exceeding)</span>
                    <div className="text-lg font-black text-emerald-700 mt-1">{reportData.academics.proficiencyBreakdown.EE.count}</div>
                    <div className="text-[10px] font-bold text-emerald-600">{reportData.academics.proficiencyBreakdown.EE.percentage}% of cohort</div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-xs font-black text-blue-800">ME (Meeting)</span>
                    <div className="text-lg font-black text-blue-700 mt-1">{reportData.academics.proficiencyBreakdown.ME.count}</div>
                    <div className="text-[10px] font-bold text-blue-600">{reportData.academics.proficiencyBreakdown.ME.percentage}% of cohort</div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-xs font-black text-amber-800">AE (Approaching)</span>
                    <div className="text-lg font-black text-amber-700 mt-1">{reportData.academics.proficiencyBreakdown.AE.count}</div>
                    <div className="text-[10px] font-bold text-amber-600">{reportData.academics.proficiencyBreakdown.AE.percentage}% of cohort</div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-xs font-black text-rose-800">BE (Below)</span>
                    <div className="text-lg font-black text-rose-700 mt-1">{reportData.academics.proficiencyBreakdown.BE.count}</div>
                    <div className="text-[10px] font-bold text-rose-600">{reportData.academics.proficiencyBreakdown.BE.percentage}% of cohort</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Curriculum Progression & Controlled Coverage */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#7a1228]">account_tree</span>
                    Curriculum Tracker Controlled Coverage & Progression
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">{reportData.curriculum.activeTrackers} active syllabus plans</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Planned Units</span>
                    <div className="font-black text-sm text-slate-800 mt-0.5">{reportData.curriculum.totalPlannedLessons} units</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Approved Coverage</span>
                    <div className="font-black text-sm text-emerald-700 mt-0.5">{reportData.curriculum.approvedLessons} units ({reportData.curriculum.approvedCoveragePercentage}%)</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Pending Review</span>
                    <div className="font-black text-sm text-amber-700 mt-0.5">{reportData.curriculum.submittedPendingLessons} units</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Teaching Staff Allocations</span>
                    <div className="font-black text-sm text-slate-800 mt-0.5">{reportData.staffing.classTeacherAssignments} classes • {reportData.staffing.subjectTeacherAssignments} subjects</div>
                  </div>
                </div>
              </div>

              {/* Section 3: Verified Financial Statement & Position */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#7a1228]">payments</span>
                    Term Financial Statement (Actual Invoices & Verified Payments)
                  </h3>
                  <span className="text-[10px] text-slate-500 italic">No fabricated expenditure</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Billed Invoices</span>
                    <div className="font-black text-sm text-slate-900 mt-0.5">KES {reportData.finance.totalInvoiced.toLocaleString()}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Verified Collections</span>
                    <div className="font-black text-sm text-emerald-700 mt-0.5">KES {reportData.finance.totalCollected.toLocaleString()}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Outstanding Arrears</span>
                    <div className="font-black text-sm text-rose-700 mt-0.5">KES {reportData.finance.totalArrears.toLocaleString()}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Defaulter Accounts</span>
                    <div className="font-black text-sm text-slate-800 mt-0.5">{reportData.finance.defaultersCount} learners</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic">{reportData.finance.note}</p>
              </div>

              {/* Section 4: Operational Occurrences & Learner Welfare */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#7a1228]">event_note</span>
                    Learner Welfare, Disciplinary & Occurrence Log Summary
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">{reportData.operations.totalIncidents} total incidents</span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="font-bold text-slate-700">Resolved: <strong className="text-emerald-700 font-black">{reportData.operations.resolvedCount}</strong></span>
                  <span className="font-bold text-slate-700">Pending Resolution: <strong className="text-amber-700 font-black">{reportData.operations.pendingCount}</strong></span>
                  <span className="font-bold text-slate-700">Chronic Absenteeism Cases: <strong className="text-rose-700 font-black">{reportData.attendance.chronicAbsenteeCount}</strong></span>
                </div>
              </div>

              {/* Section 5: Strategic Management Recommendations */}
              <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-700">lightbulb</span>
                  Evidence-Based Management Recommendations & Next Actions
                </h3>
                <ul className="space-y-1.5 text-xs text-amber-900">
                  {reportData.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-700 font-black">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Official Signatures Block */}
              <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="h-10 border-b border-slate-400 mb-1"></div>
                  <span className="font-black text-slate-800">{reportData.institution.signatories.headTeacher}</span>
                  <div className="text-[10px] text-slate-500 font-semibold">Headteacher / Academic Director • Grace Seeds School</div>
                </div>

                <div>
                  <div className="h-10 border-b border-slate-400 mb-1"></div>
                  <span className="font-black text-slate-800">{reportData.institution.signatories.executiveDirector}</span>
                  <div className="text-[10px] text-slate-500 font-semibold">Executive Director / Board of Governance</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
