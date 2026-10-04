import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { FeeStructure, SchoolInfo } from '../../types';
import { CreateFeeStructureModal } from '../modals/CreateFeeStructureModal';
import { StationeryRequirementsModal } from '../modals/StationeryRequirementsModal';
import { resolveGradeName, resolveAcademicYearName } from '../../utils/formatters';

type EducationTier = 'ALL' | 'PRE_PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR_SECONDARY';

export const FeeStructureView: React.FC = () => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);
  const [clonedData, setClonedData] = useState<FeeStructure | null>(null);

  // Cognitive Chunking: Education Tier & Progressive Disclosure
  const [selectedTier, setSelectedTier] = useState<EducationTier>('ALL');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Official document inspection modal
  const [inspectingStructure, setInspectingStructure] = useState<FeeStructure | null>(null);
  const [school, setSchool] = useState<SchoolInfo | null>(null);

  const [isInitializing, setIsInitializing] = useState(false);
  const [initFeedback, setInitFeedback] = useState<string | null>(null);

  const loadStructures = async () => {
    setLoading(true);
    try {
      const [res, schoolRes] = await Promise.all([
        apiService.getFeeStructures().catch(() => ({ success: false, data: [] })),
        apiService.getSchool().catch(() => null),
      ]);

      if (res.success && res.data) {
        setStructures(res.data);
      } else {
        setStructures([]);
      }

      if (schoolRes?.success && schoolRes.data) {
        setSchool(schoolRes.data);
      }
    } catch {
      setStructures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeeStructure = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete annual fee structure "${title}"? This cannot be undone.`)) {
      try {
        const res = await apiService.deleteFeeStructure(id);
        if (res.success) {
          setStructures((prev) => prev.filter((s) => s.id !== id));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete fee structure');
      }
    }
  };

  const handleDuplicate = (s: FeeStructure) => {
    setClonedData(s);
    setIsCreateOpen(true);
  };

  useEffect(() => {
    loadStructures();
  }, []);

  const getTierForGrade = (grade?: string): EducationTier => {
    if (!grade) return 'ALL';
    const g = grade.toUpperCase();
    if (g.includes('PLAYGROUP') || g.includes('PP1') || g.includes('PP2')) return 'PRE_PRIMARY';
    if (g.includes('GRADE_1') || g.includes('GRADE_2') || g.includes('GRADE_3') || g === 'GRADE 1' || g === 'GRADE 2' || g === 'GRADE 3') return 'LOWER_PRIMARY';
    if (g.includes('GRADE_4') || g.includes('GRADE_5') || g.includes('GRADE_6') || g === 'GRADE 4' || g === 'GRADE 5' || g === 'GRADE 6') return 'UPPER_PRIMARY';
    if (g.includes('GRADE_7') || g.includes('GRADE_8') || g.includes('GRADE_9') || g === 'GRADE 7' || g === 'GRADE 8' || g === 'GRADE 9') return 'JUNIOR_SECONDARY';
    return 'ALL';
  };

  const toggleExpandCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAllCards = () => {
    const all: Record<string, boolean> = {};
    filteredStructures.forEach((s) => {
      all[s.id] = true;
    });
    setExpandedCards(all);
  };

  const collapseAllCards = () => {
    setExpandedCards({});
  };

  const getTermBreakdown = (s: FeeStructure) => {
    const t1 = s.term1Total ?? s.termBreakdown?.term1 ?? s.items?.reduce((sum, it) => {
      if (it.termBreakdown?.term1 !== undefined) return sum + (Number(it.termBreakdown.term1) || 0);
      const div = it.termDivisions?.find((d) => d.termNumber === 1);
      return sum + (div ? Number(div.amount) || 0 : Math.round((Number(it.amount) || 0) / 3));
    }, 0) ?? Math.round((s.totalAmount || 0) / 3);

    const t2 = s.term2Total ?? s.termBreakdown?.term2 ?? s.items?.reduce((sum, it) => {
      if (it.termBreakdown?.term2 !== undefined) return sum + (Number(it.termBreakdown.term2) || 0);
      const div = it.termDivisions?.find((d) => d.termNumber === 2);
      return sum + (div ? Number(div.amount) || 0 : Math.round((Number(it.amount) || 0) / 3));
    }, 0) ?? Math.round((s.totalAmount || 0) / 3);

    const t3 = s.term3Total ?? s.termBreakdown?.term3 ?? s.items?.reduce((sum, it) => {
      if (it.termBreakdown?.term3 !== undefined) return sum + (Number(it.termBreakdown.term3) || 0);
      const div = it.termDivisions?.find((d) => d.termNumber === 3);
      return sum + (div ? Number(div.amount) || 0 : Math.max(0, (Number(it.amount) || 0) - Math.round((Number(it.amount) || 0) / 3) * 2));
    }, 0) ?? Math.max(0, (s.totalAmount || 0) - t1 - t2);

    const total = s.totalAmount || (t1 + t2 + t3);
    const p1 = s.termPercentages?.term1 ?? (total > 0 ? Math.round((t1 / total) * 100) : 0);
    const p2 = s.termPercentages?.term2 ?? (total > 0 ? Math.round((t2 / total) * 100) : 0);
    const p3 = s.termPercentages?.term3 ?? (total > 0 ? Math.max(0, 100 - p1 - p2) : 0);
    return { t1, t2, t3, total, p1, p2, p3 };
  };

  // Filter structures with chunking
  const filteredStructures = structures.filter((s) => {
    const matchesSearch =
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'ALL' || s.gradeLevel === gradeFilter;
    const matchesTier = selectedTier === 'ALL' || getTierForGrade(s.gradeLevel) === selectedTier;
    return matchesSearch && matchesGrade && matchesTier;
  });

  // Calculate Tier Counts for quick mental anchoring
  const tierCounts = {
    ALL: structures.length,
    PRE_PRIMARY: structures.filter((s) => getTierForGrade(s.gradeLevel) === 'PRE_PRIMARY').length,
    LOWER_PRIMARY: structures.filter((s) => getTierForGrade(s.gradeLevel) === 'LOWER_PRIMARY').length,
    UPPER_PRIMARY: structures.filter((s) => getTierForGrade(s.gradeLevel) === 'UPPER_PRIMARY').length,
    JUNIOR_SECONDARY: structures.filter((s) => getTierForGrade(s.gradeLevel) === 'JUNIOR_SECONDARY').length,
  };

  // Cumulative Metrics
  const totalAnnualValue = structures.reduce((sum, s) => sum + (getTermBreakdown(s).total || 0), 0);
  const totalT1Value = structures.reduce((sum, s) => sum + (getTermBreakdown(s).t1 || 0), 0);
  const totalT2Value = structures.reduce((sum, s) => sum + (getTermBreakdown(s).t2 || 0), 0);
  const totalT3Value = structures.reduce((sum, s) => sum + (getTermBreakdown(s).t3 || 0), 0);

  const handleInitializeGraceSeeds = async () => {
    if (!window.confirm('Initialize or update official Grace Seeds School fee structures (Playgroup to Grade 6)? This sets up verified rates for Tuition, Activity, and Assessment.')) {
      return;
    }
    setIsInitializing(true);
    setInitFeedback(null);
    try {
      const res = await apiService.initGraceSeedsFeeStructures();
      if (res.success) {
        setInitFeedback('Fee schedules initialized successfully for all classes.');
        await loadStructures();
      } else {
        alert(res.message || 'Failed to initialize Grace Seeds fee structures');
      }
    } catch (err: any) {
      alert(err.message || 'Error initializing fee structures');
    } finally {
      setIsInitializing(false);
    }
  };

  const isAllExpanded = filteredStructures.length > 0 && filteredStructures.every((s) => expandedCards[s.id]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. CLEAN HEADER (Simplified Action Hierarchy) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <span>Annual Fee Structures</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#7a1228] border border-rose-200">
              {structures.length} {structures.length === 1 ? 'Class' : 'Classes'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Approved annual schedules, term allocations, and payment channels
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRequirementsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs border border-gray-200 shadow-2xs transition-all cursor-pointer"
            title="View school stationery requirements"
          >
            <span className="material-symbols-outlined text-[17px] text-gray-500">menu_book</span>
            <span>Stationery &amp; Books</span>
          </button>

          <button
            onClick={handleInitializeGraceSeeds}
            disabled={isInitializing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs border border-gray-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Auto-configure ratified schedules"
          >
            {isInitializing ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[17px] text-amber-600">bolt</span>
            )}
            <span>Auto Setup</span>
          </button>

          <button
            onClick={() => {
              setClonedData(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7a1228] hover:bg-[#5c0a1a] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Fee Structure</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {initFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            <span>{initFeedback}</span>
          </div>
          <button onClick={() => setInitFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 2. STREAMLINED SUMMARY & PAYMENT STRIP (Low Visual Clutter) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Payment Channel Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-[22px]">payments</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900">M-Pesa Paybill: 522533</span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                Active Channel
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
              Account format: <span className="font-semibold text-gray-700">8048859#Student Name &amp; Grade</span>
            </p>
          </div>
        </div>

        {/* Compact Key Financial Anchors */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap divide-x divide-gray-100 text-xs">
          <div className="pr-4">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Total Classes</span>
            <span className="text-base font-bold text-gray-900">{structures.length} Configured</span>
          </div>
          <div className="pl-4 pr-4">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Cumulative Annual</span>
            <span className="text-base font-bold font-mono text-[#7a1228]">
              KES {totalAnnualValue.toLocaleString()}
            </span>
          </div>
          <div className="pl-4">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Term 1 Allocation</span>
            <span className="text-base font-bold font-mono text-gray-800">
              KES {totalT1Value.toLocaleString()}
              <span className="text-[10px] font-normal text-gray-400 ml-1">
                ({totalAnnualValue > 0 ? Math.round((totalT1Value / totalAnnualValue) * 100) : 0}%)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. COGNITIVE CHUNKING: EDUCATION LEVEL TABS */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-gray-200 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'ALL', label: 'All Classes', count: tierCounts.ALL },
              { id: 'PRE_PRIMARY', label: 'Pre-Primary', count: tierCounts.PRE_PRIMARY },
              { id: 'LOWER_PRIMARY', label: 'Lower Primary', count: tierCounts.LOWER_PRIMARY },
              { id: 'UPPER_PRIMARY', label: 'Upper Primary', count: tierCounts.UPPER_PRIMARY },
              { id: 'JUNIOR_SECONDARY', label: 'Junior School', count: tierCounts.JUNIOR_SECONDARY },
            ] as const
          ).map((tier) => {
            const isActive = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#7a1228] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <span>{tier.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tier.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Toggle & Expand Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'grid' && filteredStructures.length > 0 && (
            <button
              type="button"
              onClick={isAllExpanded ? collapseAllCards : expandAllCards}
              className="text-xs font-semibold text-[#7a1228] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isAllExpanded ? 'unfold_less' : 'unfold_more'}
              </span>
              <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          )}

          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#7a1228] shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Compact Table View"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#7a1228] shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. SEARCH & FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Search class or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
          />
        </div>

        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-[#7a1228] cursor-pointer"
        >
          <option value="ALL">Specific Grade: All</option>
          <option value="PLAYGROUP">Playgroup</option>
          <option value="PP1">PP1</option>
          <option value="PP2">PP2</option>
          <option value="GRADE_1">Grade 1</option>
          <option value="GRADE_2">Grade 2</option>
          <option value="GRADE_3">Grade 3</option>
          <option value="GRADE_4">Grade 4</option>
          <option value="GRADE_5">Grade 5</option>
          <option value="GRADE_6">Grade 6</option>
          <option value="GRADE_7">Grade 7</option>
          <option value="GRADE_8">Grade 8</option>
          <option value="GRADE_9">Grade 9</option>
        </select>
      </div>

      {/* 5. MAIN CONTENT (PROGRESSIVE DISCLOSURE & SCANNABILITY) */}
      {loading ? (
        <div className="p-16 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <span className="w-8 h-8 border-3 border-[#7a1228] border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold">Loading fee schedules...</span>
        </div>
      ) : filteredStructures.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 shadow-2xs space-y-3">
          <span className="material-symbols-outlined text-4xl text-gray-300">payments</span>
          <div>
            <p className="font-bold text-sm text-gray-800">No fee schedules found</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {searchQuery || gradeFilter !== 'ALL' || selectedTier !== 'ALL'
                ? 'Try adjusting your search or tier filter.'
                : 'Click "New Fee Structure" above or run "Auto Setup" to configure schedules.'}
            </p>
          </div>
          {(searchQuery || gradeFilter !== 'ALL' || selectedTier !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGradeFilter('ALL');
                setSelectedTier('ALL');
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID: Clean & Scannable with Progressive Disclosure */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStructures.map((s) => {
            const { t1, t2, t3, total, p1, p2, p3 } = getTermBreakdown(s);
            const isExpanded = !!expandedCards[s.id];
            const itemCount = s.items?.length || 0;

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-5 shadow-2xs hover:shadow-md border border-gray-200 flex flex-col justify-between transition-all group"
              >
                <div className="space-y-4">
                  {/* Card Header: Class Identification & Action Toolbar */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#7a1228] uppercase bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {resolveGradeName(s.gradeLevel)}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {resolveAcademicYearName(s.academicYearId)}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 mt-1 leading-snug">
                        {s.title}
                      </h3>
                      {s.dueDate && (
                        <span className="text-[11px] text-gray-400 mt-0.5 block">
                          Due: {s.dueDate}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicate(s)}
                        title="Duplicate schedule"
                        className="p-1 rounded-lg text-gray-400 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]">content_copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFeeStructure(s.id, s.title)}
                        title="Delete schedule"
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Primary Anchor: Annual Total */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Annual Total</span>
                    <span className="text-lg font-bold font-mono text-[#7a1228]">
                      KES {total.toLocaleString()}
                    </span>
                  </div>

                  {/* Chunked Term Breakdown (3 distinct visual units) */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Term 1</span>
                      <span className="font-mono font-bold text-xs text-gray-900 block mt-0.5">
                        KES {t1.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-semibold text-[#7a1228] block">({p1}%)</span>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Term 2</span>
                      <span className="font-mono font-bold text-xs text-gray-900 block mt-0.5">
                        KES {t2.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 block">({p2}%)</span>
                    </div>

                    <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Term 3</span>
                      <span className="font-mono font-bold text-xs text-gray-900 block mt-0.5">
                        KES {t3.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 block">({p3}%)</span>
                    </div>
                  </div>

                  {/* PROGRESSIVE DISCLOSURE: Itemized Breakdown Accordion */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpandCard(s.id)}
                      className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-between cursor-pointer border border-transparent hover:border-gray-200"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-gray-400">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                        <span>{isExpanded ? 'Hide Items' : `View Items (${itemCount})`}</span>
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2 animate-in fade-in duration-150">
                        {s.items?.map((it, idx) => {
                          const itemAmt = Number(it.amount) || 0;
                          return (
                            <div
                              key={it.id || idx}
                              className="p-2 rounded-lg bg-gray-50/70 border border-gray-100 text-xs flex items-center justify-between gap-2"
                            >
                              <div className="truncate">
                                <span className="font-medium text-gray-800 truncate block">
                                  {it.name}
                                </span>
                                {it.isOptional && (
                                  <span className="text-[10px] text-gray-400">Optional levy</span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-gray-900 shrink-0">
                                KES {itemAmt.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setInspectingStructure(s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#7a1228] hover:bg-rose-50 font-bold text-xs cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>Official Document</span>
                  </button>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {s.academicYearId || '2026'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT TABLE VIEW */
        <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[11px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Level / Class</th>
                  <th className="py-3 px-4 text-center text-[#7a1228]">Term 1</th>
                  <th className="py-3 px-4 text-center text-amber-700">Term 2</th>
                  <th className="py-3 px-4 text-center text-blue-700">Term 3</th>
                  <th className="py-3 px-4 text-right text-gray-900 font-bold">Annual Total</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStructures.map((s) => {
                  const { t1, t2, t3, total, p1, p2, p3 } = getTermBreakdown(s);

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="bg-rose-50 text-[#7a1228] px-2 py-0.5 rounded border border-rose-200 text-xs">
                            {resolveGradeName(s.gradeLevel)}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">{s.title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-gray-700">
                        <div>KES {t1.toLocaleString()}</div>
                        <span className="text-[10px] text-[#7a1228] font-bold">({p1}%)</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-gray-700">
                        <div>KES {t2.toLocaleString()}</div>
                        <span className="text-[10px] text-amber-700 font-bold">({p2}%)</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium text-gray-700">
                        <div>KES {t3.toLocaleString()}</div>
                        <span className="text-[10px] text-blue-700 font-bold">({p3}%)</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#7a1228] text-right">
                        KES {total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectingStructure(s)}
                            title="Inspect & Print"
                            className="p-1 rounded text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[17px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(s)}
                            title="Duplicate"
                            className="p-1 rounded text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[17px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFeeStructure(s.id, s.title)}
                            title="Delete"
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Create / Clone Fee Structure Modal */}
      <CreateFeeStructureModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setClonedData(null);
        }}
        onCreated={() => loadStructures()}
        initialData={clonedData}
      />

      {/* MODAL 2: Official Printable Document Modal */}
      {inspectingStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 my-auto">
            {/* Modal Actions Header */}
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">print</span>
                <span className="font-bold text-sm">Official Ratified Fee Schedule</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white text-[#7a1228] hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectingStructure(null)}
                  className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-gray-900 bg-white">
              {/* Official School Header */}
              <div className="text-center border-b-2 border-gray-900 pb-4 space-y-1">
                <div className="flex items-center justify-center gap-3">
                  <img
                    src="/logo.png"
                    alt="School Logo"
                    className="w-12 h-12 rounded-xl object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-900">
                      {school?.name || 'Grace Seeds School'}
                    </h2>
                    <p className="text-xs italic text-gray-600">
                      &quot;{school?.motto || 'The future Begins Here'}&quot;
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 pt-1">
                  KNEC Center Code: <span className="font-mono font-bold text-gray-800">{school?.centerCode || 'KNEC-08291'}</span> · Email: {school?.email || 'schoolgraceseeds@gmail.com'} · Tel: {school?.phone || '0745436312'}
                </div>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-gray-100 rounded-full font-bold uppercase text-xs tracking-wider text-gray-800">
                    Official Ratified Annual CBC Fee Schedule
                  </span>
                </div>
              </div>

              {/* Schedule Meta Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block uppercase font-medium text-[10px]">Schedule Title</span>
                  <span className="font-bold text-gray-900">{inspectingStructure.title}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-medium text-[10px]">Grade / Level</span>
                  <span className="font-bold text-gray-900">{inspectingStructure.gradeLevel?.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-medium text-[10px]">Annual Due Date</span>
                  <span className="font-mono font-bold text-gray-900">{inspectingStructure.dueDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-medium text-[10px]">Whole Year Total</span>
                  <span className="font-mono font-bold text-[#7a1228]">
                    KES {getTermBreakdown(inspectingStructure).total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Official Breakdown Table */}
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center text-[#7a1228]">Term 1 (KES)</th>
                      <th className="py-2.5 px-3 text-center text-amber-700">Term 2 (KES)</th>
                      <th className="py-2.5 px-3 text-center text-blue-700">Term 3 (KES)</th>
                      <th className="py-2.5 px-3 text-right text-gray-900">Total (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {inspectingStructure.items?.map((it, idx) => {
                      const itemAmt = Number(it.amount) || 0;
                      const div1 = it.termDivisions?.find((d) => d.termNumber === 1);
                      const div2 = it.termDivisions?.find((d) => d.termNumber === 2);
                      const div3 = it.termDivisions?.find((d) => d.termNumber === 3);

                      const t1 = it.termBreakdown?.term1 ?? div1?.amount ?? Math.round(itemAmt / 3);
                      const t2 = it.termBreakdown?.term2 ?? div2?.amount ?? Math.round(itemAmt / 3);
                      const t3 = it.termBreakdown?.term3 ?? div3?.amount ?? Math.max(0, itemAmt - t1 - t2);

                      return (
                        <tr key={it.id || idx}>
                          <td className="py-2 px-3 text-gray-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-gray-900">
                            {it.name}
                            {it.isOptional && <span className="ml-1 text-[10px] text-gray-500">(Optional)</span>}
                          </td>
                          <td className="py-2 px-3 text-gray-600 text-[11px]">{it.category}</td>
                          <td className="py-2 px-3 text-center font-mono text-gray-800">KES {t1.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center font-mono text-gray-800">KES {t2.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center font-mono text-gray-800">KES {t3.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                            KES {itemAmt.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-400">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 uppercase text-gray-900">
                        Total Annual Ratified Fee:
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[#7a1228]">
                        KES {getTermBreakdown(inspectingStructure).t1.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-700">
                        KES {getTermBreakdown(inspectingStructure).t2.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-700">
                        KES {getTermBreakdown(inspectingStructure).t3.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-base text-[#7a1228]">
                        KES {getTermBreakdown(inspectingStructure).total.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Details & Endorsement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs border-t border-gray-200">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900">Official Payment Instructions:</div>
                  <div className="text-gray-600 space-y-0.5">
                    <div>1. KCB Buni API Paybill: <strong>522533</strong></div>
                    <div>2. Account Number: <strong>8048859#&lt;Child Name &amp; Grade&gt;</strong></div>
                    <div>3. Bank Transfer: KCB Bank Kenya · Account #1122334455</div>
                  </div>
                </div>

                <div className="text-right space-y-3 pt-2 sm:pt-0">
                  <div className="inline-block border-b border-gray-400 w-48 pb-1">
                    <span className="text-[10px] text-gray-400 block uppercase">Principal / Director Signature</span>
                  </div>
                  <div className="text-[10px] text-gray-400">Official School Rubber Stamp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grace Seeds Stationery & Booklist Requirements Modal */}
      <StationeryRequirementsModal
        isOpen={isRequirementsOpen}
        onClose={() => setIsRequirementsOpen(false)}
      />
    </div>
  );
};
