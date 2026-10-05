import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { AcademicYear, AcademicTerm } from '../../types';
import { resolveAcademicYearName, resolveGradeName } from '../../utils/formatters';

interface CreateFeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (structure: any) => void;
  initialData?: any;
}

export interface FeeLineItemState {
  id: string;
  name: string;
  category: 'TUITION' | 'ASSESSMENT' | 'ACTIVITY' | 'BOARDING' | 'MEALS' | 'TRANSPORT' | 'ADMISSION' | 'OTHER';
  isOptional: boolean;
  amount: string; // Whole year full amount (KES)
}

const TEMPLATES: Record<string, { label: string; desc: string; icon: string; gradeLevel: string; items: FeeLineItemState[] }> = {
  graceseed_pp: {
    label: 'Pre-Primary (PG, PP1, PP2)',
    desc: 'Tuition 13,500 · Activity 600 · Assessment 900',
    icon: 'child_care',
    gradeLevel: 'PLAYGROUP',
    items: [
      { id: 'gs-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '13500' },
      { id: 'gs-2', name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, amount: '600' },
      { id: 'gs-3', name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, amount: '900' },
      { id: 'gs-4', name: 'Admission Fee', category: 'ADMISSION', isOptional: true, amount: '1500' },
    ],
  },
  graceseed_lower: {
    label: 'Lower Primary (Grade 1 - 3)',
    desc: 'Tuition 15,000 · Activity 1,000 · Assessment 900',
    icon: 'school',
    gradeLevel: 'GRADE_1',
    items: [
      { id: 'gs-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '15000' },
      { id: 'gs-2', name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, amount: '1000' },
      { id: 'gs-3', name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, amount: '900' },
      { id: 'gs-4', name: 'Admission Fee', category: 'ADMISSION', isOptional: true, amount: '1500' },
    ],
  },
  graceseed_upper: {
    label: 'Upper Primary (Grade 4 - 6)',
    desc: 'Tuition 17,100 · Activity 1,000 · Assessment 900',
    icon: 'menu_book',
    gradeLevel: 'GRADE_4',
    items: [
      { id: 'gs-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '17100' },
      { id: 'gs-2', name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, amount: '1000' },
      { id: 'gs-3', name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, amount: '900' },
      { id: 'gs-4', name: 'Admission Fee', category: 'ADMISSION', isOptional: true, amount: '1500' },
    ],
  },
  junior_secondary: {
    label: 'Junior School (Grade 7 - 9)',
    desc: 'Tuition 75,000 · Assessment 18,000 · Activity 5,000',
    icon: 'account_balance',
    gradeLevel: 'GRADE_7',
    items: [
      { id: 'js-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '75000' },
      { id: 'js-2', name: 'CBC Assessment Practical Kits', category: 'ASSESSMENT', isOptional: false, amount: '18000' },
      { id: 'js-3', name: 'Activity & Sports Levy', category: 'ACTIVITY', isOptional: false, amount: '5000' },
      { id: 'js-4', name: 'Hot Lunch Programme', category: 'MEALS', isOptional: true, amount: '25500' },
    ],
  },
};

const DEFAULT_FEE_ITEMS: FeeLineItemState[] = TEMPLATES.graceseed_pp.items;

export const CreateFeeStructureModal: React.FC<CreateFeeStructureModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialData,
}) => {
  const [gradeLevel, setGradeLevel] = useState('PLAYGROUP');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<FeeLineItemState[]>(DEFAULT_FEE_ITEMS);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schoolId, setSchoolId] = useState('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [, setTerms] = useState<AcademicTerm[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadAcademicData() {
      try {
        const [schoolRes, contextRes, yearsRes] = await Promise.all([
          apiService.getSchool().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getYears().catch(() => null),
        ]);

        if (schoolRes?.success && schoolRes.data) {
          setSchoolId(schoolRes.data.id);
        }

        if (yearsRes?.success && yearsRes.data && yearsRes.data.length > 0) {
          setAcademicYears(yearsRes.data);
          const currentYear = contextRes?.data?.currentYear || yearsRes.data.find((y) => y.isCurrent) || yearsRes.data[0];
          setSelectedYearId(currentYear.id);

          const termsRes = await apiService.getTerms(currentYear.id);
          if (termsRes?.success && termsRes.data) {
            setTerms(termsRes.data);
          }
        }
      } catch (err) {
        console.error('Failed to load academic data for fee structure:', err);
      }
    }
    loadAcademicData();
  }, [isOpen]);

  // Handle clone / pre-fill if initialData passed
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      if (initialData.gradeLevel) setGradeLevel(initialData.gradeLevel);
      if (initialData.academicYearId) setSelectedYearId(initialData.academicYearId);
      if (initialData.dueDate) setDueDate(initialData.dueDate);
      if (initialData.title) setTitle(`${initialData.title} (Copy)`);

      if (initialData.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
        const converted: FeeLineItemState[] = initialData.items.map((it: any, idx: number) => {
          const amt = Number(it.amount) || 0;
          return {
            id: `item-${Date.now()}-${idx}`,
            name: it.name || '',
            category: it.category || 'TUITION',
            isOptional: !!it.isOptional,
            amount: String(amt),
          };
        });
        setItems(converted);
      }
    } else {
      // Default initial title
      const yearObj = academicYears.find((y) => y.id === selectedYearId);
      const yearName = yearObj ? resolveAcademicYearName(yearObj.name || yearObj.id) : '2026';
      const gradeName = resolveGradeName(gradeLevel);
      setTitle(`${gradeName} CBC Annual Fee Schedule — ${yearName}`);
    }
  }, [isOpen, initialData, selectedYearId, gradeLevel, academicYears]);

  if (!isOpen) return null;

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    try {
      const res = await apiService.getTerms(yearId);
      if (res.success && res.data) {
        setTerms(res.data);
      }
    } catch {
      setTerms([]);
    }
    const yearObj = academicYears.find((y) => y.id === yearId);
    const yearName = yearObj ? resolveAcademicYearName(yearObj.name || yearObj.id) : '2026';
    setTitle(`${resolveGradeName(gradeLevel)} CBC Annual Fee Schedule — ${yearName}`);
  };

  const handleGradeChange = (newGrade: string) => {
    setGradeLevel(newGrade);
    const yearObj = academicYears.find((y) => y.id === selectedYearId);
    const yearName = yearObj ? resolveAcademicYearName(yearObj.name || yearObj.id) : '2026';
    setTitle(`${resolveGradeName(newGrade)} CBC Annual Fee Schedule — ${yearName}`);
  };

  // Apply preset template
  const handleApplyTemplate = (templateKey: string) => {
    const tpl = TEMPLATES[templateKey];
    if (!tpl) return;
    setItems(tpl.items.map((it, idx) => ({ ...it, id: `item-${Date.now()}-${idx}` })));
    if (tpl.gradeLevel) {
      handleGradeChange(tpl.gradeLevel);
    }
  };

  // Update annual KES amount
  const handleUpdateAmount = (id: string, newAmountStr: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, amount: newAmountStr } : item))
    );
  };

  const handleAddItem = () => {
    const newItem: FeeLineItemState = {
      id: `item-${Date.now()}`,
      name: '',
      category: 'OTHER',
      isOptional: false,
      amount: '0',
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleDuplicateItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const cloned: FeeLineItemState = {
      ...target,
      id: `item-${Date.now()}`,
      name: `${target.name} (Copy)`,
    };
    setItems((prev) => [...prev, cloned]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert('A fee structure must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Quick Add-on shortcuts
  const handleAddAddon = (type: 'LUNCH' | 'ADMISSION' | 'TRANSPORT' | 'UNIFORM') => {
    let newItem: FeeLineItemState;
    if (type === 'LUNCH') {
      newItem = {
        id: `addon-lunch-${Date.now()}`,
        name: 'School Lunch Scheme',
        category: 'MEALS',
        isOptional: true,
        amount: '9000',
      };
    } else if (type === 'ADMISSION') {
      newItem = {
        id: `addon-adm-${Date.now()}`,
        name: 'Admission & Registration Fee',
        category: 'ADMISSION',
        isOptional: true,
        amount: '1500',
      };
    } else if (type === 'TRANSPORT') {
      newItem = {
        id: `addon-trans-${Date.now()}`,
        name: 'School Transport Scheme',
        category: 'TRANSPORT',
        isOptional: true,
        amount: '12000',
      };
    } else {
      newItem = {
        id: `addon-uni-${Date.now()}`,
        name: 'Track Suit / School Uniform',
        category: 'OTHER',
        isOptional: true,
        amount: '2000',
      };
    }
    setItems((prev) => [...prev, newItem]);
  };

  // Compute totals for the whole year
  const fullAnnualTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const mandatoryTotal = items.filter(it => !it.isOptional).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const optionalTotal = items.filter(it => it.isOptional).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedYearId) {
      setError('Please select an active academic year.');
      return;
    }

    if (fullAnnualTotal <= 0) {
      setError('Total fee structure amount must be greater than zero.');
      return;
    }

    const unNamedItems = items.filter((it) => !it.name.trim());
    if (unNamedItems.length > 0) {
      setError('Please provide a name for all line items.');
      return;
    }

    const formattedItems = items
      .filter((it) => it.name.trim() !== '')
      .map((it) => {
        const amt = Number(it.amount) || 0;
        const t1 = Math.round(amt / 3);
        const t2 = Math.round(amt / 3);
        const t3 = Math.max(0, amt - t1 - t2);

        return {
          name: it.name.trim(),
          amount: amt,
          isOptional: it.isOptional,
          category: it.category,
          termBreakdown: {
            term1: t1,
            term2: t2,
            term3: t3,
          },
          termPercentages: {
            term1: amt > 0 ? Number(((t1 / amt) * 100).toFixed(1)) : 33.3,
            term2: amt > 0 ? Number(((t2 / amt) * 100).toFixed(1)) : 33.3,
            term3: amt > 0 ? Number(((t3 / amt) * 100).toFixed(1)) : 33.4,
          },
          termDivisions: [
            { termNumber: 1, termName: 'Term 1', amount: t1, percentage: amt > 0 ? Number(((t1 / amt) * 100).toFixed(1)) : 33.3 },
            { termNumber: 2, termName: 'Term 2', amount: t2, percentage: amt > 0 ? Number(((t2 / amt) * 100).toFixed(1)) : 33.3 },
            { termNumber: 3, termName: 'Term 3', amount: t3, percentage: amt > 0 ? Number(((t3 / amt) * 100).toFixed(1)) : 33.4 },
          ],
        };
      });

    const defaultTitle = `${gradeLevel.replace('_', ' ')} CBC Annual Fee Schedule`;
    const payload = {
      schoolId: schoolId || 'school-001',
      academicYearId: selectedYearId,
      termId: 'ALL',
      gradeLevel,
      title: title.trim() || defaultTitle,
      dueDate: dueDate || `${new Date().getFullYear()}-12-31`,
      items: formattedItems,
    };

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.createFeeStructure(payload);
      if (res.success && res.data) {
        onCreated(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to create fee structure');
      }
    } catch (err: any) {
      console.error('Error creating fee structure:', err);
      setError(err.message || 'Error creating fee structure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 my-auto">
        {/* Modal Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                {initialData ? 'Duplicate / Edit Fee Structure' : 'New Annual Fee Structure'}
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Set up whole-year annual fee schedules for CBC classes (KES)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
              <span className="text-[10px] text-rose-200 uppercase font-semibold block">Total Annual Fee</span>
              <span className="font-mono font-bold text-sm text-white">
                KES {fullAnnualTotal.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">error</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* 1. Basic Structure Settings */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Academic Year
                </label>
                <select
                  value={selectedYearId}
                  onChange={(e) => handleYearChange(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 font-semibold focus:outline-[#7a1228]"
                >
                  {academicYears.length > 0 ? (
                    academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} {y.isCurrent ? '(Active Year)' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">No years created</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Class / Grade Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 font-semibold focus:outline-[#7a1228]"
                >
                  <optgroup label="Pre-Primary (Pre-School)">
                    <option value="PLAYGROUP">Playgroup</option>
                    <option value="PP1">PP1 (Pre-Primary 1)</option>
                    <option value="PP2">PP2 (Pre-Primary 2)</option>
                  </optgroup>
                  <optgroup label="Lower Primary (Grade 1 - 3)">
                    <option value="GRADE_1">Grade 1</option>
                    <option value="GRADE_2">Grade 2</option>
                    <option value="GRADE_3">Grade 3</option>
                  </optgroup>
                  <optgroup label="Upper Primary (Grade 4 - 6)">
                    <option value="GRADE_4">Grade 4</option>
                    <option value="GRADE_5">Grade 5</option>
                    <option value="GRADE_6">Grade 6</option>
                  </optgroup>
                  <optgroup label="Junior Secondary (Grade 7 - 9)">
                    <option value="GRADE_7">Grade 7</option>
                    <option value="GRADE_8">Grade 8</option>
                    <option value="GRADE_9">Grade 9</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 1 CBC Annual Fee Schedule — 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 font-semibold focus:outline-[#7a1228]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs text-gray-900 font-mono focus:outline-[#7a1228]"
                />
              </div>
            </div>

            {/* Quick Templates Bar */}
            <div className="pt-2 border-t border-gray-200">
              <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">
                Load Official Rates Preset (1-Click):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyTemplate(key)}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:border-[#7a1228] hover:bg-rose-50/50 text-left transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#7a1228] group-hover:scale-110 transition-transform">
                        {tpl.icon}
                      </span>
                      <span className="text-xs font-bold text-gray-800">{tpl.label}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 truncate mt-0.5">{tpl.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Whole-Year Fee Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Fee Line Items ({items.length})
                </h4>
                <p className="text-[11px] text-gray-500">
                  Enter the whole-year annual amount (KES) for each fee component.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#7a1228] text-white hover:bg-[#5c0a1a] rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Item</span>
              </button>
            </div>

            {/* Line Items Container */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Category</th>
                      <th className="py-2.5 px-3 text-right min-w-[140px] text-[#7a1228]">Whole Year Amount (KES)</th>
                      <th className="py-2.5 px-2 text-center w-20">Optional?</th>
                      <th className="py-2.5 px-2 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => {
                      const itemAmt = Number(item.amount) || 0;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-gray-400 font-bold">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Tuition Fee"
                              value={item.name}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, name: e.target.value } : it))
                                )
                              }
                              className="w-full bg-gray-50/80 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-[#7a1228]"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={item.category}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id ? { ...it, category: e.target.value as any } : it
                                  )
                                )
                              }
                              className="w-full bg-gray-50/80 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:bg-white focus:outline-[#7a1228]"
                            >
                              <option value="TUITION">Tuition</option>
                              <option value="ASSESSMENT">Assessment / CBC</option>
                              <option value="ACTIVITY">Activity / Sports</option>
                              <option value="ADMISSION">Admission (Once Off)</option>
                              <option value="MEALS">Meals / Catering</option>
                              <option value="TRANSPORT">Transport</option>
                              <option value="BOARDING">Boarding</option>
                              <option value="OTHER">Other Levy</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 bg-rose-50/40 border border-rose-200 rounded-lg px-2 py-1 focus-within:bg-white focus-within:border-[#7a1228]">
                              <span className="text-[10px] font-bold text-gray-400">KES</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item.amount}
                                onChange={(e) => handleUpdateAmount(item.id, e.target.value)}
                                className="w-28 text-xs font-mono font-bold text-gray-900 text-right outline-none bg-transparent"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.isOptional}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, isOptional: e.target.checked } : it))
                                )
                              }
                              className="rounded text-[#7a1228] focus:ring-[#7a1228] cursor-pointer"
                              title="Check if this is an optional fee (e.g. lunch or uniform)"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateItem(item.id)}
                                title="Duplicate"
                                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove line item"
                                className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Table Footer: Sum Totals */}
                  <tfoot className="bg-gray-50/90 font-bold border-t-2 border-gray-200 text-xs">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 uppercase text-gray-700">
                        Total Annual Amount:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-[#7a1228]">
                        KES {fullAnnualTotal.toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Quick Add-ons bar */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Quick Add-ons:</span>
              <button
                type="button"
                onClick={() => handleAddAddon('LUNCH')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-amber-600">restaurant</span>
                <span>+ Lunch Scheme (KES 9,000/yr)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddAddon('TRANSPORT')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-blue-600">directions_bus</span>
                <span>+ Transport (KES 12,000/yr)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddAddon('ADMISSION')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-emerald-600">how_to_reg</span>
                <span>+ Admission Fee (KES 1,500 once-off)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddAddon('UNIFORM')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-purple-600">checkroom</span>
                <span>+ Uniform / Track Suit (KES 2,000 once-off)</span>
              </button>
            </div>
          </div>

          {/* 3. Live Whole-Year Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
            <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Line Items</span>
              <span className="text-sm sm:text-base font-mono font-bold text-gray-900 block mt-0.5">
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-rose-100 text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Mandatory Fees</span>
              <span className="text-sm sm:text-base font-mono font-bold text-[#7a1228] block mt-0.5">
                KES {mandatoryTotal.toLocaleString()}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-100 text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Optional Fees</span>
              <span className="text-sm sm:text-base font-mono font-bold text-amber-700 block mt-0.5">
                KES {optionalTotal.toLocaleString()}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Annual Fee</span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-700 block mt-0.5">
                KES {fullAnnualTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isLoading || fullAnnualTotal <= 0}
            onClick={() => handleSubmit()}
            className="px-5 py-2 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Schedule...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Save Annual Fee Structure</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
