import React, { useEffect, useState } from 'react';
import type { DashboardSummary } from '../../types';
import { apiService } from '../../services/api';

interface Props {
  summaryData?: DashboardSummary | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

/** Shared school leadership card; a failed request is never represented as zero results. */
export function AssessmentRubricsCard({summaryData: supplied, loading = false, error = '', onRetry}: Props) {
  const [fetched, setFetched] = useState<DashboardSummary | null>(null);
  const [fetching, setFetching] = useState(supplied === undefined);
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (supplied !== undefined) return;
    let live = true;
    setFetching(true); setFailure('');
    apiService.getDashboardAnalytics().then(response => {
      if (!response.success || !response.data) throw new Error('Assessment summary unavailable');
      if (live) setFetched(response.data);
    }).catch(() => {if (live) setFailure('Could not load assessment results. Please retry.');})
      .finally(() => {if (live) setFetching(false);});
    return () => {live = false;};
  }, [supplied, attempt]);
  const summaryData = supplied === undefined ? fetched : supplied;
  const pending = supplied === undefined ? fetching : loading;
  const loadError = supplied === undefined ? failure : error;
  if (pending || loadError || !summaryData) return <section aria-label="CBE Assessment Rubrics" className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-lg shadow-xs">
    <h2 className="font-semibold text-headline-md text-on-surface">CBE Assessment Rubrics</h2>
    {pending ? <p role="status" className="mt-3 text-sm text-on-surface-variant">Loading assessment results…</p> : <div className="mt-3"><p role="alert" className="text-sm text-on-surface-variant">{loadError || 'Assessment results are unavailable. Please retry.'}</p><button className="ui-button mt-3" onClick={() => supplied === undefined ? setAttempt(value => value + 1) : onRetry?.()}>Retry assessment results</button></div>}
  </section>;
  // CBC Assessments
  const CBCProf = summaryData?.CBCProficiency;
  const totalAssessments = CBCProf?.totalAssessments || 0;
  const eeAssessments = CBCProf?.exceeding || 0;
  const meAssessments = CBCProf?.meeting || 0;
  const aeAssessments = CBCProf?.approaching || 0;
  const beAssessments = CBCProf?.below || 0;

  const eePct = totalAssessments > 0 ? ((eeAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const mePct = totalAssessments > 0 ? ((meAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const aePct = totalAssessments > 0 ? ((aeAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const bePct = totalAssessments > 0 ? ((beAssessments / totalAssessments) * 100).toFixed(1) : '0.0';
  const proficientPct = totalAssessments > 0 ? (Number(eePct) + Number(mePct)).toFixed(0) : '0';

  const circ = 238.76;
  const eeLen = totalAssessments > 0 ? (Number(eePct) / 100) * circ : 0;
  const meLen = totalAssessments > 0 ? (Number(mePct) / 100) * circ : 0;
  const aeLen = totalAssessments > 0 ? (Number(aePct) / 100) * circ : 0;
  const beLen = totalAssessments > 0 ? (Number(bePct) / 100) * circ : 0;
  const meOffset = -eeLen;
  const aeOffset = -(eeLen + meLen);
  const beOffset = -(eeLen + meLen + aeLen);

  const academicPeriodLabel = summaryData?.academicPeriod?.term && summaryData?.academicPeriod?.year && summaryData.academicPeriod.term !== 'N/A'
    ? `${summaryData.academicPeriod.term}, ${summaryData.academicPeriod.year}`
    : 'Active Academic Session';

  return (
        <div className="rounded-xl bg-surface-container-lowest p-lg shadow-xs flex flex-col justify-between border border-outline-variant/30">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-sm">
              <div className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  CBE Assessment Rubrics
                </h2>
              </div>
              <span className="font-label-md text-label-md text-success font-medium">
                {academicPeriodLabel}
              </span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-md">
              {totalAssessments > 0
                ? `Aggregate distribution of ${totalAssessments.toLocaleString()} learning outcomes assessed`
                : 'No formative or summative assessments recorded yet in this term'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-md">
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-surface-container-high"
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="38"
                    stroke="currentColor"
                    strokeWidth="12"
                  ></circle>
                  {totalAssessments > 0 && (
                    <>
                      <circle
                        className="text-success"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${eeLen} 238.76`}
                        strokeDashoffset="0"
                        strokeWidth="12"
                      ></circle>
                      <circle
                        className="text-primary"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${meLen} 238.76`}
                        strokeDashoffset={meOffset}
                        strokeWidth="12"
                      ></circle>
                      <circle
                        className="text-amber-700"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${aeLen} 238.76`}
                        strokeDashoffset={aeOffset}
                        strokeWidth="12"
                      ></circle>
                      <circle
                        className="text-error"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke="currentColor"
                        strokeDasharray={`${beLen} 238.76`}
                        strokeDashoffset={beOffset}
                        strokeWidth="12"
                      ></circle>
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-headline-md text-headline-md font-bold text-on-surface">
                    {proficientPct}%
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                    Proficient
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-xs w-full">
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-success"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Exceeding (EE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-success">
                    {eePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-primary"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Meeting (ME)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-primary">
                    {mePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-amber-700"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Approaching (AE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-amber-800">
                    {aePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-xs rounded bg-surface-container-low">
                  <div className="flex items-center gap-xs">
                    <span className="w-3 h-3 rounded bg-error"></span>
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      Below (BE)
                    </span>
                  </div>
                  <span className="font-data-mono text-data-mono font-bold text-error">
                    {bePct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Genuine Term-to-Term Comparison Section */}
          <div className="mt-md pt-sm border-t border-surface-container">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider block mb-xs font-bold">
              Term-to-Term Performance Comparison
            </span>
            {summaryData?.academicOverview?.termComparison?.comparisonAvailable ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-900 font-semibold block">
                    Compared with {summaryData.academicOverview.termComparison.previousTermName}
                  </span>
                  <span className="text-xs text-emerald-800">
                    Previous Mean: <strong>{summaryData.academicOverview.termComparison.previousTermMean}%</strong> · Current Mean: <strong>{summaryData.academicOverview.termComparison.currentTermMean}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 font-black text-sm text-emerald-900">
                  <span className="material-symbols-outlined text-base">
                    {(summaryData.academicOverview.termComparison.growthDelta || 0) >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  <span>
                    {(summaryData.academicOverview.termComparison.growthDelta || 0) >= 0 ? '+' : ''}
                    {summaryData.academicOverview.termComparison.growthDelta}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-base">info</span>
                <span>
                  Prior term baseline comparison is only calculated when genuine previous assessment records exist in the database.
                </span>
              </div>
            )}
          </div>
        </div>
  );
}
