import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { AcademicYear, AcademicTerm, ClassRoom } from '../../types';
import {
  resolveLearningAreaName,
  resolveLearningAreaCode,
  resolveAcademicYearName,
  resolveGradeName,
} from '../../utils/formatters';

// Official CBC Performance Rubric Color Tokens
const CBC_COLORS = {
  EE: '#00796B', // Teal (Exceeding Expectations)
  ME: '#880E35', // Dark Burgundy (Meeting Expectations)
  AE: '#C45A00', // Orange (Approaching Expectations)
  BE: '#E53935', // Red (Below Expectations)
  PENDING: '#94A3B8', // Neutral Slate
};

interface SubjectAnalyticsItem {
  id?: string;
  name: string;
  code?: string;
  total: number;
  ee: number;
  me: number;
  ae: number;
  be: number;
  counts?: {
    ee: number;
    me: number;
    ae: number;
    be: number;
  };
}

interface SvgSlice {
  key: 'EE' | 'ME' | 'AE' | 'BE';
  label: string;
  count: number;
  fraction: number;
  percentage: number;
  color: string;
  path: string;
  labelX: number;
  labelY: number;
}

/**
 * Native SVG Assessment Distribution Pie/Donut Chart
 */
const AssessmentDistributionPie: React.FC<{
  distribution: { ee: number; me: number; ae: number; be: number };
  total: number;
  hoveredTier: string | null;
  onHoverTier: (tier: string | null) => void;
}> = ({ distribution, total, hoveredTier, onHoverTier }) => {
  const cx = 120;
  const cy = 120;
  const R = 90;
  const innerR = 56;

  const rawData: Array<{ key: 'EE' | 'ME' | 'AE' | 'BE'; label: string; count: number; color: string }> = [
    { key: 'EE', label: 'Exceeding Expectations', count: distribution.ee, color: CBC_COLORS.EE },
    { key: 'ME', label: 'Meeting Expectations', count: distribution.me, color: CBC_COLORS.ME },
    { key: 'AE', label: 'Approaching Expectations', count: distribution.ae, color: CBC_COLORS.AE },
    { key: 'BE', label: 'Below Expectations', count: distribution.be, color: CBC_COLORS.BE },
  ];

  const slices: SvgSlice[] = useMemo(() => {
    if (total === 0) return [];
    const nonZero = rawData.filter((d) => d.count > 0);
    if (nonZero.length === 0) return [];

    if (nonZero.length === 1) {
      const d = nonZero[0];
      return [
        {
          ...d,
          fraction: 1,
          percentage: 100,
          path:
            `M ${cx - R} ${cy} A ${R} ${R} 0 1 0 ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx - R} ${cy} ` +
            `M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 1 1 ${cx + innerR} ${cy} A ${innerR} ${innerR} 0 1 1 ${cx - innerR} ${cy} Z`,
          labelX: cx,
          labelY: cy - (R + innerR) / 2 + 4,
        },
      ];
    }

    let currentAngle = -Math.PI / 2;
    return nonZero.map((d) => {
      const fraction = d.count / total;
      const sliceAngle = fraction * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);

      const ix1 = cx + innerR * Math.cos(endAngle);
      const iy1 = cy + innerR * Math.sin(endAngle);
      const ix2 = cx + innerR * Math.cos(startAngle);
      const iy2 = cy + innerR * Math.sin(startAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const path =
        `M ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
        `A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} ` +
        `L ${ix1.toFixed(2)} ${iy1.toFixed(2)} ` +
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z`;

      const midAngle = startAngle + sliceAngle / 2;
      const midR = (R + innerR) / 2;
      const labelX = cx + midR * Math.cos(midAngle);
      const labelY = cy + midR * Math.sin(midAngle) + 4;

      return {
        ...d,
        fraction,
        percentage: Math.round(fraction * 100),
        path,
        labelX,
        labelY,
      };
    });
  }, [distribution, total]);

  const activeCategory = hoveredTier ? rawData.find((d) => d.key === hoveredTier) : null;
  const activePct = activeCategory && total > 0 ? Math.round((activeCategory.count / total) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      {/* SVG Donut Chart */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 240 240"
          className="w-56 h-56 drop-shadow-sm transition-transform duration-200"
          role="img"
          aria-label="Assessment grading distribution pie chart"
        >
          {total === 0 ? (
            // Neutral Empty State Ring
            <g>
              <circle
                cx={cx}
                cy={cy}
                r={(R + innerR) / 2}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth={R - innerR}
                strokeDasharray="6 4"
                className="opacity-70"
              />
              <circle
                cx={cx}
                cy={cy}
                r={innerR - 4}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="1"
              />
            </g>
          ) : (
            // Render Pie Slices
            <g>
              {slices.map((slice) => {
                const isHovered = hoveredTier === slice.key;
                const isDimmed = hoveredTier && hoveredTier !== slice.key;
                return (
                  <g
                    key={slice.key}
                    onMouseEnter={() => onHoverTier(slice.key)}
                    onMouseLeave={() => onHoverTier(null)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <path
                      d={slice.path}
                      fill={slice.color}
                      className="transition-all duration-200"
                      style={{
                        opacity: isDimmed ? 0.35 : 1,
                        filter: isHovered ? 'brightness(1.15) drop-shadow(0 4px 6px rgba(0,0,0,0.2))' : 'none',
                        transformOrigin: `${cx}px ${cy}px`,
                        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                      }}
                    >
                      <title>{`${slice.label} (${slice.key}): ${slice.count} learners (${slice.percentage}%)`}</title>
                    </path>
                    {/* Segment text label if segment is large enough */}
                    {slice.percentage >= 8 && (
                      <text
                        x={slice.labelX}
                        y={slice.labelY}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="11"
                        fontWeight="700"
                        className="pointer-events-none select-none font-data-mono"
                        style={{
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          opacity: isDimmed ? 0.4 : 1,
                        }}
                      >
                        {slice.percentage}%
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Central Donut Readout */}
          <g className="pointer-events-none select-none">
            {total === 0 ? (
              <>
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  className="font-bold text-lg fill-slate-400"
                >
                  0
                </text>
                <text
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  className="text-[10px] font-semibold uppercase tracking-wider fill-slate-400"
                >
                  No Records
                </text>
              </>
            ) : activeCategory ? (
              <>
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  className="text-xs font-bold uppercase tracking-wider font-data-mono"
                  fill={activeCategory.color}
                >
                  {activeCategory.key} · {activePct}%
                </text>
                <text
                  x={cx}
                  y={cy + 9}
                  textAnchor="middle"
                  className="text-xl font-extrabold fill-slate-800 font-data-mono"
                >
                  {activeCategory.count}
                </text>
                <text
                  x={cx}
                  y={cy + 24}
                  textAnchor="middle"
                  className="text-[10px] font-medium fill-slate-500 uppercase tracking-tight"
                >
                  Learners
                </text>
              </>
            ) : (
              <>
                <text
                  x={cx}
                  y={cy - 5}
                  textAnchor="middle"
                  className="text-2xl font-extrabold fill-slate-800 font-data-mono"
                >
                  {total}
                </text>
                <text
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  className="text-[10px] font-semibold uppercase tracking-wider fill-slate-500"
                >
                  Total Assessed
                </text>
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Legend Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
        {rawData.map((cat) => {
          const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
          const isHovered = hoveredTier === cat.key;
          const isDimmed = hoveredTier && hoveredTier !== cat.key;

          return (
            <div
              key={cat.key}
              onMouseEnter={() => onHoverTier(cat.key)}
              onMouseLeave={() => onHoverTier(null)}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                isHovered
                  ? 'border-primary shadow-sm bg-primary/5 -translate-y-0.5'
                  : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low'
              } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-bold text-xs text-on-surface">
                    {cat.key} ({cat.label})
                  </span>
                </div>
                <span
                  className="text-xs font-bold font-data-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${cat.color}15`,
                    color: cat.color,
                  }}
                >
                  {total > 0 ? `${pct}%` : '0%'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="text-on-surface-variant text-[11px]">Assessed Records:</span>
                <span className="font-bold font-data-mono text-on-surface">
                  {cat.count} {cat.count === 1 ? 'learner' : 'learners'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Individual Learning Area / Subject Card
 */
const SubjectCard: React.FC<{
  subject: SubjectAnalyticsItem;
  highlightTier: string | null;
}> = ({ subject, highlightTier }) => {
  const total = subject.total;
  const isPending = total === 0;

  // Resolve clean name and code
  const displayName = resolveLearningAreaName(subject.name, subject.name);
  const displayCode = resolveLearningAreaCode(subject.code || subject.name);

  // Exact counts
  const eeCount = subject.counts?.ee ?? (isPending ? 0 : Math.round((subject.ee * total) / 100));
  const meCount = subject.counts?.me ?? (isPending ? 0 : Math.round((subject.me * total) / 100));
  const aeCount = subject.counts?.ae ?? (isPending ? 0 : Math.round((subject.ae * total) / 100));
  const beCount = subject.counts?.be ?? (isPending ? 0 : Math.round((subject.be * total) / 100));

  // Overall proficiency (EE + ME)
  const proficiency = isPending ? 0 : subject.ee + subject.me;

  // Status badge styling
  let statusBadge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
      Pending Assessments
    </span>
  );

  if (!isPending) {
    if (proficiency >= 75) {
      statusBadge = (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
          style={{
            backgroundColor: `${CBC_COLORS.EE}15`,
            color: CBC_COLORS.EE,
            borderColor: `${CBC_COLORS.EE}30`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CBC_COLORS.EE }}></span>
          High Mastery · {proficiency}%
        </span>
      );
    } else if (proficiency >= 50) {
      statusBadge = (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
          style={{
            backgroundColor: `${CBC_COLORS.ME}15`,
            color: CBC_COLORS.ME,
            borderColor: `${CBC_COLORS.ME}30`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CBC_COLORS.ME }}></span>
          On Track · {proficiency}%
        </span>
      );
    } else {
      statusBadge = (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
          style={{
            backgroundColor: `${CBC_COLORS.AE}15`,
            color: CBC_COLORS.AE,
            borderColor: `${CBC_COLORS.AE}30`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CBC_COLORS.AE }}></span>
          Needs Support · {proficiency}%
        </span>
      );
    }
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between p-5 bg-surface-container-lowest ${
        isPending
          ? 'border-dashed border-slate-300 hover:border-slate-400'
          : 'border-outline-variant/30 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none"
              style={{
                backgroundColor: isPending ? '#F1F5F9' : `${CBC_COLORS.EE}15`,
                color: isPending ? '#64748B' : CBC_COLORS.EE,
                border: `1px solid ${isPending ? '#E2E8F0' : `${CBC_COLORS.EE}30`}`,
              }}
            >
              {displayCode.slice(0, 4)}
            </div>
            <div>
              <h4 className="font-bold text-sm text-on-surface line-clamp-1" title={displayName}>
                {displayName}
              </h4>
              <span className="text-[11px] text-on-surface-variant font-medium">
                {displayCode} · CBC Learning Area
              </span>
            </div>
          </div>
          <div className="shrink-0">{statusBadge}</div>
        </div>

        {/* Proficiency Metric Summary */}
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-semibold text-on-surface-variant">Overall Proficiency Rate:</span>
          <span className="text-sm font-bold font-data-mono">
            {isPending ? (
              <span className="text-slate-400 font-normal">Pending</span>
            ) : (
              <span
                style={{
                  color: proficiency >= 75 ? CBC_COLORS.EE : proficiency >= 50 ? CBC_COLORS.ME : CBC_COLORS.AE,
                }}
              >
                {proficiency}% (EE + ME)
              </span>
            )}
          </span>
        </div>

        {/* Visual Grading Distribution Progress Bar */}
        <div className="mb-4">
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/60 shadow-2xs">
            {isPending ? (
              <div
                className="w-full h-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-500 font-medium"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 10px, #f1f5f9 10px, #f1f5f9 20px)',
                }}
                title="Pending rubric assessments"
              />
            ) : (
              <>
                {subject.ee > 0 && (
                  <div
                    style={{
                      width: `${subject.ee}%`,
                      backgroundColor: CBC_COLORS.EE,
                      filter: highlightTier === 'EE' ? 'brightness(1.2)' : 'none',
                    }}
                    className="h-full transition-all duration-200"
                    title={`Exceeding Expectations (EE): ${subject.ee}% (${eeCount} learners)`}
                  />
                )}
                {subject.me > 0 && (
                  <div
                    style={{
                      width: `${subject.me}%`,
                      backgroundColor: CBC_COLORS.ME,
                      filter: highlightTier === 'ME' ? 'brightness(1.2)' : 'none',
                    }}
                    className="h-full transition-all duration-200"
                    title={`Meeting Expectations (ME): ${subject.me}% (${meCount} learners)`}
                  />
                )}
                {subject.ae > 0 && (
                  <div
                    style={{
                      width: `${subject.ae}%`,
                      backgroundColor: CBC_COLORS.AE,
                      filter: highlightTier === 'AE' ? 'brightness(1.2)' : 'none',
                    }}
                    className="h-full transition-all duration-200"
                    title={`Approaching Expectations (AE): ${subject.ae}% (${aeCount} learners)`}
                  />
                )}
                {subject.be > 0 && (
                  <div
                    style={{
                      width: `${subject.be}%`,
                      backgroundColor: CBC_COLORS.BE,
                      filter: highlightTier === 'BE' ? 'brightness(1.2)' : 'none',
                    }}
                    className="h-full transition-all duration-200"
                    title={`Below Expectations (BE): ${subject.be}% (${beCount} learners)`}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 4-Tier Rubric Breakdown Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {/* EE Tile */}
          <div
            className={`p-2 rounded-xl text-center border transition-all ${
              highlightTier === 'EE'
                ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-400/20'
                : 'bg-surface-container-low border-outline-variant/20'
            }`}
          >
            <span
              className="text-[10px] font-bold block uppercase"
              style={{ color: CBC_COLORS.EE }}
            >
              EE
            </span>
            <span className="text-xs font-bold font-data-mono text-on-surface block mt-0.5">
              {isPending ? '—' : `${subject.ee}%`}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block">
              {isPending ? '0' : eeCount}
            </span>
          </div>

          {/* ME Tile */}
          <div
            className={`p-2 rounded-xl text-center border transition-all ${
              highlightTier === 'ME'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-surface-container-low border-outline-variant/20'
            }`}
          >
            <span
              className="text-[10px] font-bold block uppercase"
              style={{ color: CBC_COLORS.ME }}
            >
              ME
            </span>
            <span className="text-xs font-bold font-data-mono text-on-surface block mt-0.5">
              {isPending ? '—' : `${subject.me}%`}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block">
              {isPending ? '0' : meCount}
            </span>
          </div>

          {/* AE Tile */}
          <div
            className={`p-2 rounded-xl text-center border transition-all ${
              highlightTier === 'AE'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
                : 'bg-surface-container-low border-outline-variant/20'
            }`}
          >
            <span
              className="text-[10px] font-bold block uppercase"
              style={{ color: CBC_COLORS.AE }}
            >
              AE
            </span>
            <span className="text-xs font-bold font-data-mono text-on-surface block mt-0.5">
              {isPending ? '—' : `${subject.ae}%`}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block">
              {isPending ? '0' : aeCount}
            </span>
          </div>

          {/* BE Tile */}
          <div
            className={`p-2 rounded-xl text-center border transition-all ${
              highlightTier === 'BE'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-400/20'
                : 'bg-surface-container-low border-outline-variant/20'
            }`}
          >
            <span
              className="text-[10px] font-bold block uppercase"
              style={{ color: CBC_COLORS.BE }}
            >
              BE
            </span>
            <span className="text-xs font-bold font-data-mono text-on-surface block mt-0.5">
              {isPending ? '—' : `${subject.be}%`}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium block">
              {isPending ? '0' : beCount}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-sm text-outline">group</span>
          <span>
            {isPending ? (
              <span className="text-slate-400">0 learners assessed</span>
            ) : (
              <span className="text-on-surface font-semibold">
                {total} {total === 1 ? 'learner' : 'learners'} assessed
              </span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[11px]">
          {isPending ? (
            <span className="text-amber-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Awaiting Entry
            </span>
          ) : (
            <span className="text-teal-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              Active Rubric
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export const CompetencyAnalyticsView: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);

  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HIGH' | 'ON_TRACK' | 'SUPPORT' | 'PENDING'>('ALL');

  // Hover state shared between pie chart and subject cards
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

  // Load Metadata (Years, Terms, Classes)
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [yearsRes, classesRes, ctxRes] = await Promise.allSettled([
          apiService.getAcademicYears(),
          apiService.getClasses(),
          apiService.getCurrentContext(),
        ]);

        let defaultYearId = '';
        let defaultTermId = '';

        if (yearsRes.status === 'fulfilled' && yearsRes.value?.data) {
          const yrs = yearsRes.value.data;
          setAcademicYears(yrs);

          // Find current year or active year
          const currentYr = yrs.find((y: any) => y.isCurrent) || yrs[0];
          if (currentYr) {
            defaultYearId = currentYr.id;
            setSelectedYearId(currentYr.id);
            if (currentYr.terms && currentYr.terms.length > 0) {
              setTerms(currentYr.terms);
              const currentT = currentYr.terms.find((t: any) => t.isCurrent) || currentYr.terms[0];
              if (currentT) {
                defaultTermId = currentT.id;
                setSelectedTermId(currentT.id);
              }
            }
          }
        }

        if (classesRes.status === 'fulfilled' && classesRes.value?.data) {
          setClasses(classesRes.value.data);
        }

        // Fallback to current context if not set by years list
        if (ctxRes.status === 'fulfilled' && ctxRes.value?.data) {
          const ctx = ctxRes.value.data;
          if (!defaultYearId && ctx.currentYear?.id) {
            setSelectedYearId(ctx.currentYear.id);
            defaultYearId = ctx.currentYear.id;
          }
          if (!defaultTermId && ctx.currentTerm?.id) {
            setSelectedTermId(ctx.currentTerm.id);
            defaultTermId = ctx.currentTerm.id;
          }
        }
      } catch (err) {
        console.warn('Metadata loading warning:', err);
      }
    }

    loadMetadata();
  }, []);

  // Sync Terms when Academic Year changes
  useEffect(() => {
    if (!selectedYearId || academicYears.length === 0) return;
    const yearObj = academicYears.find((y) => y.id === selectedYearId);
    if (yearObj?.terms && yearObj.terms.length > 0) {
      setTerms(yearObj.terms);
      if (!yearObj.terms.some((t) => t.id === selectedTermId)) {
        const currentT = yearObj.terms.find((t) => t.isCurrent) || yearObj.terms[0];
        setSelectedTermId(currentT?.id || '');
      }
    } else {
      apiService
        .getTerms(selectedYearId)
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setTerms(res.data);
            if (!res.data.some((t) => t.id === selectedTermId)) {
              const currentT = res.data.find((t) => t.isCurrent) || res.data[0];
              setSelectedTermId(currentT?.id || '');
            }
          }
        })
        .catch(() => {});
    }
  }, [selectedYearId, academicYears]);

  // Main Data Loader
  const loadStats = useCallback(async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const params: any = {};
      if (selectedTermId) params.termId = selectedTermId;
      if (selectedYearId) params.academicYearId = selectedYearId;
      if (selectedGradeLevel && selectedGradeLevel !== 'All') {
        params.gradeLevel = selectedGradeLevel;
      }

      const [dashRes, CBCRes] = await Promise.all([
        user?.role === 'TEACHER' ? Promise.resolve(null) : apiService.getDashboardAnalytics().catch(() => null),
        apiService.getCBCAnalytics(Object.keys(params).length ? params : undefined).catch(() => null),
      ]);

      if (dashRes?.success) setDashboardData(dashRes.data);
      if (CBCRes?.success) setAnalytics(CBCRes.data);
    } catch (err) {
      console.warn('Analytics loading error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.role, selectedTermId, selectedYearId, selectedGradeLevel]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Unique grade levels for filter dropdown
  const gradeLevelOptions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.gradeLevel) set.add(c.gradeLevel);
    });
    return Array.from(set).sort();
  }, [classes]);

  // Aggregate Performance Totals
  const total = analytics?.totalAssessments ?? dashboardData?.CBCProficiency?.totalAssessments ?? 0;
  const ee = analytics?.distribution?.EXCEEDING_EXPECTATIONS ?? dashboardData?.CBCProficiency?.exceeding ?? 0;
  const me = analytics?.distribution?.MEETING_EXPECTATIONS ?? dashboardData?.CBCProficiency?.meeting ?? 0;
  const ae = analytics?.distribution?.APPROACHING_EXPECTATIONS ?? dashboardData?.CBCProficiency?.approaching ?? 0;
  const be = analytics?.distribution?.BELOW_EXPECTATIONS ?? dashboardData?.CBCProficiency?.below ?? 0;

  const eePct = total > 0 ? Math.round((ee / total) * 100) : 0;
  const mePct = total > 0 ? Math.round((me / total) * 100) : 0;
  const aePct = total > 0 ? Math.round((ae / total) * 100) : 0;
  const bePct = total > 0 ? Math.round((be / total) * 100) : 0;
  const masteryRate = analytics?.proficiencyRatePercentage ?? (total > 0 ? eePct + mePct : 0);

  const subjectList: SubjectAnalyticsItem[] = useMemo(() => {
    return analytics?.subjectAnalytics || [];
  }, [analytics]);

  // Filtered Subject Cards
  const filteredSubjects = useMemo(() => {
    return subjectList.filter((s) => {
      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const resolvedName = resolveLearningAreaName(s.name, s.name).toLowerCase();
        const resolvedCode = (s.code || '').toLowerCase();
        if (!resolvedName.includes(query) && !resolvedCode.includes(query)) {
          return false;
        }
      }

      // Status Pill Filter
      const isPending = s.total === 0;
      const proficiency = isPending ? 0 : s.ee + s.me;

      if (statusFilter === 'PENDING') return isPending;
      if (statusFilter === 'HIGH') return !isPending && proficiency >= 75;
      if (statusFilter === 'ON_TRACK') return !isPending && proficiency >= 50 && proficiency < 75;
      if (statusFilter === 'SUPPORT') return !isPending && proficiency < 50;

      return true;
    });
  }, [subjectList, searchQuery, statusFilter]);

  // Status counts for filter chips
  const counts = useMemo(() => {
    let pending = 0;
    let high = 0;
    let onTrack = 0;
    let support = 0;
    subjectList.forEach((s) => {
      if (s.total === 0) {
        pending++;
      } else {
        const prof = s.ee + s.me;
        if (prof >= 75) high++;
        else if (prof >= 50) onTrack++;
        else support++;
      }
    });
    return { all: subjectList.length, pending, high, onTrack, support };
  }, [subjectList]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header with Breadcrumbs & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>CBE Competencies</span>
            <span>/</span>
            <span className="text-primary font-semibold">Competency Analytics</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            CBE Performance Analytics & Strand Mastery
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Macro-level learning outcome distribution across active continuous assessment rubrics from database
          </p>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => loadStats()}
          disabled={isRefreshing}
          className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low text-xs font-semibold text-on-surface shadow-2xs transition-colors cursor-pointer"
          title="Refresh analytics data"
        >
          <span
            className={`material-symbols-outlined text-sm text-primary ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            refresh
          </span>
          <span>{isRefreshing ? 'Updating...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
          <span className="material-symbols-outlined text-base text-primary">filter_list</span>
          <span>Filters:</span>
        </span>

        {/* Academic Year Selector */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="academic-year-select" className="text-xs text-on-surface-variant font-medium">
            Year:
          </label>
          <select
            id="academic-year-select"
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="text-xs bg-surface border border-outline-variant/40 rounded-lg px-2.5 py-1.5 font-medium text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {academicYears.length === 0 ? (
              <option value="">Default Academic Year</option>
            ) : (
              academicYears.map((yr) => (
                <option key={yr.id} value={yr.id}>
                  {resolveAcademicYearName(yr)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Term Selector */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="academic-term-select" className="text-xs text-on-surface-variant font-medium">
            Term:
          </label>
          <select
            id="academic-term-select"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="text-xs bg-surface border border-outline-variant/40 rounded-lg px-2.5 py-1.5 font-medium text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {terms.length === 0 ? (
              <option value="">Default Term</option>
            ) : (
              terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || `Term ${t.termNumber}`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Grade Level Selector */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="grade-level-select" className="text-xs text-on-surface-variant font-medium">
            Grade:
          </label>
          <select
            id="grade-level-select"
            value={selectedGradeLevel}
            onChange={(e) => setSelectedGradeLevel(e.target.value)}
            className="text-xs bg-surface border border-outline-variant/40 rounded-lg px-2.5 py-1.5 font-medium text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            <option value="All">All Grades & Levels</option>
            {gradeLevelOptions.map((g) => (
              <option key={g} value={g}>
                {resolveGradeName(g)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-on-surface-variant text-sm flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            progress_activity
          </span>
          <p className="font-medium text-on-surface">Loading CBE assessment records from database...</p>
          <p className="text-xs text-outline">Synchronizing summative rubric distributions across grades</p>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs hover:shadow-sm transition-shadow">
              <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                Overall Mastery Rate
              </span>
              <div
                className="text-3xl font-extrabold font-data-mono mt-1"
                style={{ color: CBC_COLORS.EE }}
              >
                {masteryRate}%
              </div>
              <span className="text-xs font-semibold mt-1 block" style={{ color: CBC_COLORS.EE }}>
                EE + ME (Above KICD Target)
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs hover:shadow-sm transition-shadow">
              <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                Exceeding Expectations
              </span>
              <div
                className="text-3xl font-extrabold font-data-mono mt-1"
                style={{ color: CBC_COLORS.EE }}
              >
                {eePct}%
              </div>
              <span className="text-xs text-on-surface-variant mt-1 block font-medium">
                {ee} Formative & Summative Records
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs hover:shadow-sm transition-shadow">
              <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                Meeting Expectations
              </span>
              <div
                className="text-3xl font-extrabold font-data-mono mt-1"
                style={{ color: CBC_COLORS.ME }}
              >
                {mePct}%
              </div>
              <span className="text-xs text-on-surface-variant mt-1 block font-medium">
                {me} Formative & Summative Records
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs hover:shadow-sm transition-shadow">
              <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                Support Needed (AE + BE)
              </span>
              <div
                className="text-3xl font-extrabold font-data-mono mt-1"
                style={{ color: CBC_COLORS.AE }}
              >
                {aePct + bePct}%
              </div>
              <span className="text-xs font-semibold mt-1 block" style={{ color: CBC_COLORS.BE }}>
                {ae + be} Records (Targeted Remediation)
              </span>
            </div>
          </div>

          {/* TOP SECTION: Overall Assessment Grading Distribution Pie Chart Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-outline-variant/30 space-y-5">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">pie_chart</span>
                    <span>Overall Assessment Grading Distribution</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Proportional share of assessed learners across the four standard CBC rubric performance tiers
                  </p>
                </div>
                {total > 0 && (
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {total} Active Assessments
                  </span>
                )}
              </div>
            </div>

            {/* Assessment Distribution Pie Component */}
            <AssessmentDistributionPie
              distribution={{ ee, me, ae, be }}
              total={total}
              hoveredTier={hoveredTier}
              onHoverTier={setHoveredTier}
            />
          </div>

          {/* MAIN SECTION: Learning Area Mastery Distribution & Individual Subject Cards */}
          <div className="space-y-4">
            {/* Section Header & Search / Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">grid_view</span>
                  <span>Learning Area Mastery Distribution</span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Detailed performance metrics and competency progress for each official CBC learning area
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search subject by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface"
                    title="Clear search"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Tabs / Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                All Subjects ({counts.all})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('HIGH')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'HIGH'
                    ? 'text-white shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}
                style={{
                  backgroundColor: statusFilter === 'HIGH' ? CBC_COLORS.EE : undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusFilter === 'HIGH' ? '#FFFFFF' : CBC_COLORS.EE }}
                />
                <span>High Mastery ≥75% ({counts.high})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('ON_TRACK')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ON_TRACK'
                    ? 'text-white shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}
                style={{
                  backgroundColor: statusFilter === 'ON_TRACK' ? CBC_COLORS.ME : undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusFilter === 'ON_TRACK' ? '#FFFFFF' : CBC_COLORS.ME }}
                />
                <span>On Track 50-74% ({counts.onTrack})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('SUPPORT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'SUPPORT'
                    ? 'text-white shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}
                style={{
                  backgroundColor: statusFilter === 'SUPPORT' ? CBC_COLORS.AE : undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusFilter === 'SUPPORT' ? '#FFFFFF' : CBC_COLORS.AE }}
                />
                <span>Needs Support &lt;50% ({counts.support})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'PENDING'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Pending Assessments ({counts.pending})</span>
              </button>
            </div>

            {/* Subject Cards Responsive Grid: 3 cols desktop, 2 cols tablet, 1 col mobile */}
            {filteredSubjects.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">
                  search_off
                </span>
                <p className="font-bold text-sm text-on-surface">No matching learning areas found</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {searchQuery
                    ? `No subjects match "${searchQuery}". Try clearing the search query.`
                    : 'No subjects found matching the selected filter criteria.'}
                </p>
                {(searchQuery || statusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                {filteredSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id || subject.name}
                    subject={subject}
                    highlightTier={hoveredTier}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
