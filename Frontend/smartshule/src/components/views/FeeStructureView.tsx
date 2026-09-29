import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { FeeStructure, SchoolInfo } from '../../types';
import { CreateFeeStructureModal } from '../modals/CreateFeeStructureModal';

export const FeeStructureView: React.FC = () => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clonedData, setClonedData] = useState<FeeStructure | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Official document inspection modal
  const [inspectingStructure, setInspectingStructure] = useState<FeeStructure | null>(null);
  const [school, setSchool] = useState<SchoolInfo | null>(null);

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

  // Filter structures
  const filteredStructures = structures.filter((s) => {
    const matchesSearch =
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'ALL' || s.gradeLevel === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  // Calculate Cumulative KPI Metrics
  const totalAnnualValue = structures.reduce((sum, s) => sum + (getTermBreakdown(s).total || 0), 0);
  const totalT1Value = structures.reduce((sum, s) => sum + (getTermBreakdown(s).t1 || 0), 0);
  const totalT2Value = structures.reduce((sum, s) => sum + (getTermBreakdown(s).t2 || 0), 0);
  const totalT3Value = structures.reduce((sum, s) => sum + (getTermBreakdown(s).t3 || 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-[#7a1228] font-bold">Annual Fee Structures</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-1">
            Ratified Annual Fee Structures
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage whole-year fee schedules with Term 1, 2, & 3 percentage divisions constituting 100% of the annual billing
          </p>
        </div>

        <button
          onClick={() => {
            setClonedData(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Annual Fee Structure</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Active Schedules</span>
            <span className="material-symbols-outlined text-[18px] text-[#7a1228]">calendar_month</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-gray-900">{structures.length}</div>
          <p className="text-[11px] text-gray-400">Configured classes</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Cumulative Annual</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">account_balance</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-700">
            KES {totalAnnualValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-400">Total billable across all levels</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Term 1 Inflow</span>
            <span className="material-symbols-outlined text-[18px] text-[#7a1228]">trending_up</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#7a1228]">
            KES {totalT1Value.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-400">
            {totalAnnualValue > 0 ? Math.round((totalT1Value / totalAnnualValue) * 100) : 0}% of annual total
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Terms 2 & 3 Combined</span>
            <span className="material-symbols-outlined text-[18px] text-blue-600">pie_chart</span>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-blue-800">
            KES {(totalT2Value + totalT3Value).toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-400">
            {totalAnnualValue > 0 ? Math.round(((totalT2Value + totalT3Value) / totalAnnualValue) * 100) : 0}% of annual total
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined text-[18px] text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              placeholder="Search schedules by title, grade level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-[#7a1228] focus:bg-white transition-colors"
            />
          </div>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-[#7a1228] cursor-pointer"
          >
            <option value="ALL">All Grade Levels</option>
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

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#7a1228] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
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
                viewMode === 'table'
                  ? 'bg-white text-[#7a1228] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Listing */}
      {loading ? (
        <div className="p-16 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <span className="w-8 h-8 border-3 border-[#7a1228] border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">Loading annual fee schedules from database...</span>
        </div>
      ) : filteredStructures.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 shadow-2xs space-y-3">
          <span className="material-symbols-outlined text-5xl text-gray-300">payments</span>
          <div>
            <p className="font-bold text-base text-gray-800">No matching fee schedules found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery || gradeFilter !== 'ALL'
                ? 'Try adjusting your search query or grade filter.'
                : 'Click "New Annual Fee Structure" above to configure your first whole-year fee schedule with term divisions.'}
            </p>
          </div>
          {(searchQuery || gradeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGradeFilter('ALL');
              }}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStructures.map((s) => {
            const { t1, t2, t3, total, p1, p2, p3 } = getTermBreakdown(s);

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl p-5 shadow-2xs hover:shadow-md border border-gray-200 space-y-4 flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                    <div className="flex-1 pr-2">
                      <span className="text-[11px] font-bold text-[#7a1228] uppercase bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {s.gradeLevel?.replace('_', ' ')}
                      </span>
                      <h3 className="font-bold text-base text-gray-900 mt-1 leading-snug group-hover:text-[#7a1228] transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        <span>Due Date: {s.dueDate}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Annual Fee</span>
                      <div className="text-base sm:text-lg font-bold font-mono text-[#7a1228]">
                        KES {total.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Term Division Breakdown Pills */}
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-gray-600">Term Divisions:</span>
                      <span className="text-[10px] text-[#7a1228] font-mono font-bold bg-white px-2 py-0.5 rounded border border-rose-200 shadow-2xs">
                        {p1}% / {p2}% / {p3}%
                      </span>
                    </div>

                    {/* Stacked bar */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex">
                      <div style={{ width: `${p1}%` }} className="bg-[#7a1228]" title={`T1: ${p1}%`} />
                      <div style={{ width: `${p2}%` }} className="bg-amber-500" title={`T2: ${p2}%`} />
                      <div style={{ width: `${p3}%` }} className="bg-blue-600" title={`T3: ${p3}%`} />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold">Term 1</span>
                        <span className="font-mono font-bold text-gray-900 text-xs block mt-0.5">
                          KES {t1.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-[#7a1228] font-mono">
                          {p1}%
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold">Term 2</span>
                        <span className="font-mono font-bold text-gray-900 text-xs block mt-0.5">
                          KES {t2.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 font-mono">
                          {p2}%
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                        <span className="text-[10px] text-gray-500 uppercase block font-bold">Term 3</span>
                        <span className="font-mono font-bold text-gray-900 text-xs block mt-0.5">
                          KES {t3.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 font-mono">
                          {p3}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Charges Breakdown */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                      <span>Itemized Charges ({s.items?.length || 0}):</span>
                      <span className="text-[10px] text-gray-400 font-mono">Annual Breakdown</span>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {s.items?.map((item, idx) => {
                        const itemAmt = Number(item.amount) || 0;
                        const div1 = item.termDivisions?.find((d) => d.termNumber === 1);
                        const div2 = item.termDivisions?.find((d) => d.termNumber === 2);
                        const div3 = item.termDivisions?.find((d) => d.termNumber === 3);

                        const itemT1 = item.termBreakdown?.term1 ?? div1?.amount ?? Math.round(itemAmt / 3);
                        const itemT2 = item.termBreakdown?.term2 ?? div2?.amount ?? Math.round(itemAmt / 3);
                        const itemT3 = item.termBreakdown?.term3 ?? div3?.amount ?? Math.max(0, itemAmt - itemT1 - itemT2);

                        const itemP1 = item.termPercentages?.term1 ?? div1?.percentage ?? (itemAmt > 0 ? Math.round((itemT1 / itemAmt) * 100) : 0);
                        const itemP2 = item.termPercentages?.term2 ?? div2?.percentage ?? (itemAmt > 0 ? Math.round((itemT2 / itemAmt) * 100) : 0);
                        const itemP3 = item.termPercentages?.term3 ?? div3?.percentage ?? (itemAmt > 0 ? Math.round((itemT3 / itemAmt) * 100) : 0);

                        return (
                          <div
                            key={item.id || idx}
                            className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-800 truncate flex items-center gap-1">
                                {item.name}
                                {item.isOptional && (
                                  <span className="text-[9px] bg-gray-200 text-gray-600 px-1 py-0.2 rounded font-normal">
                                    Opt
                                  </span>
                                )}
                              </span>
                              <span className="font-mono font-bold text-gray-900 shrink-0">
                                KES {itemAmt.toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-gray-500 pt-0.5">
                              <div className="bg-white px-1 py-0.5 rounded text-center border border-gray-200">
                                T1: {itemT1.toLocaleString()} ({itemP1}%)
                              </div>
                              <div className="bg-white px-1 py-0.5 rounded text-center border border-gray-200">
                                T2: {itemT2.toLocaleString()} ({itemP2}%)
                              </div>
                              <div className="bg-white px-1 py-0.5 rounded text-center border border-gray-200">
                                T3: {itemT3.toLocaleString()} ({itemP3}%)
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setInspectingStructure(s)}
                    className="inline-flex items-center gap-1 text-[#7a1228] hover:text-[#5c0a1a] font-bold text-xs cursor-pointer hover:underline"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View / Print</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(s)}
                      title="Clone this schedule into a new structure"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span className="hidden sm:inline">Clone</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFeeStructure(s.id, s.title)}
                      title="Delete Fee Structure"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
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
                  <th className="py-3 px-4">Schedule Title</th>
                  <th className="py-3 px-4 text-center text-[#7a1228]">Term 1 (KES / %)</th>
                  <th className="py-3 px-4 text-center text-amber-700">Term 2 (KES / %)</th>
                  <th className="py-3 px-4 text-center text-blue-700">Term 3 (KES / %)</th>
                  <th className="py-3 px-4 text-right text-gray-900 font-bold">Annual Total</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStructures.map((s) => {
                  const { t1, t2, t3, total, p1, p2, p3 } = getTermBreakdown(s);

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <span className="bg-rose-50 text-[#7a1228] px-2 py-0.5 rounded border border-rose-200 text-xs">
                          {s.gradeLevel?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-900 font-semibold">{s.title}</td>
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
                      <td className="py-3.5 px-4 font-mono text-gray-500">{s.dueDate}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectingStructure(s)}
                            title="Inspect & Print Schedule"
                            className="p-1 rounded text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(s)}
                            title="Clone Schedule"
                            className="p-1 rounded text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFeeStructure(s.id, s.title)}
                            title="Delete Fee Structure"
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
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

      {/* Official Payment Gateways Notice */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 text-xs text-gray-600 space-y-1.5 shadow-2xs">
        <div className="font-bold text-[#7a1228] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
          <span>Official Payment Gateways & Term Allocation Guidelines:</span>
        </div>
        <div className="pl-6 space-y-1 text-gray-600">
          <div>
            1. Whole-year ratified fee schedules automatically generate per-term invoices based on approved percentage divisions.
          </div>
          <div>
            2. Payments made through KCB Buni API Paybill <strong>522123</strong> (Account: Student Admission Number) immediately credit the student&apos;s invoice.
          </div>
          <div>
            3. Instant SMS and WhatsApp confirmation receipts with unique cryptographic reference codes are dispatched to parents automatically.
          </div>
        </div>
      </div>

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
                    <div>1. KCB Buni API Paybill: <strong>522123</strong></div>
                    <div>2. Account Number: <strong>Student Admission Number</strong></div>
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
    </div>
  );
};
