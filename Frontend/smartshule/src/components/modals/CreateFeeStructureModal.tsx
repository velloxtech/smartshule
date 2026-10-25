import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiService } from '../../services/api';
import { AcademicYear, AcademicTerm, FeeStructure } from '../../types';
import { resolveAcademicYearName, resolveGradeName } from '../../utils/formatters';

interface CreateFeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (structure?: any) => void;
  initialData?: FeeStructure | null;
}

export interface FeeLineItemState {
  id: string;
  name: string;
  category: 'TUITION' | 'ASSESSMENT' | 'ACTIVITY' | 'BOARDING' | 'MEALS' | 'TRANSPORT' | 'ADMISSION' | 'OTHER';
  isOptional: boolean;
  amount: string;
  expectedAmount?: string;
}

const GRADE_OPTIONS = [
  { group: 'Pre-Primary', items: [{ id: 'PLAYGROUP', name: 'Playgroup' }, { id: 'PP1', name: 'PP1' }, { id: 'PP2', name: 'PP2' }] },
  { group: 'Lower Primary', items: [{ id: 'GRADE_1', name: 'Grade 1' }, { id: 'GRADE_2', name: 'Grade 2' }, { id: 'GRADE_3', name: 'Grade 3' }] },
  { group: 'Upper Primary', items: [{ id: 'GRADE_4', name: 'Grade 4' }, { id: 'GRADE_5', name: 'Grade 5' }, { id: 'GRADE_6', name: 'Grade 6' }] },
  { group: 'Junior Secondary', items: [{ id: 'GRADE_7', name: 'Grade 7' }, { id: 'GRADE_8', name: 'Grade 8' }, { id: 'GRADE_9', name: 'Grade 9' }] },
];

export const CreateFeeStructureModal: React.FC<CreateFeeStructureModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialData,
}) => {
  const [schoolId, setSchoolId] = useState('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [termLabel, setTermLabel] = useState('Term 1');
  const [gradeLevel, setGradeLevel] = useState('GRADE_1');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<FeeLineItemState[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomTitleEdited = useRef(false);

  // Strict term number parser that will not be confused by year numbers like "2026" or "2027"
  const parseTermNumber = (labelOrId: string): 1 | 2 | 3 => {
    const s = String(labelOrId).toLowerCase();
    if (/(?:term[-_\s]*3|\bt[-_\s]*3\b)/i.test(s) || s.endsWith('-3') || s.endsWith('_3')) return 3;
    if (/(?:term[-_\s]*2|\bt[-_\s]*2\b)/i.test(s) || s.endsWith('-2') || s.endsWith('_2')) return 2;
    return 1;
  };

  const getDefaultAmountsForGrade = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.includes('PLAYGROUP') || g.includes('PP1') || g.includes('PP2')) {
      return { tuition: '4500', assessment: '300', activity: '300' };
    }
    if (g.includes('GRADE_4') || g.includes('GRADE_5') || g.includes('GRADE_6') || g === 'GRADE 4' || g === 'GRADE 5' || g === 'GRADE 6') {
      return { tuition: '5700', assessment: '300', activity: '500' };
    }
    return { tuition: '5000', assessment: '300', activity: '500' };
  };

  const generateDefaultItems = (termNum: number, grade: string): FeeLineItemState[] => {
    const rates = getDefaultAmountsForGrade(grade);
    const base: FeeLineItemState[] = [
      { id: `tuition-${Date.now()}`, name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '', expectedAmount: rates.tuition },
      { id: `assessment-${Date.now() + 1}`, name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, amount: '', expectedAmount: rates.assessment },
    ];

    if (termNum !== 3) {
      base.push({
        id: `activity-${Date.now() + 2}`,
        name: 'Activity Fee',
        category: 'ACTIVITY',
        isOptional: false,
        amount: '',
        expectedAmount: rates.activity,
      });
    }

    return base;
  };

  // Synchronize terms and pre-fill data whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initializeModal() {
      try {
        const [schoolRes, contextRes, yearsRes] = await Promise.all([
          apiService.getSchool().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getYears().catch(() => null),
        ]);

        if (!isMounted) return;

        if (schoolRes?.success && schoolRes.data) {
          setSchoolId(schoolRes.data.id || '');
        }

        let loadedYears: AcademicYear[] = [];
        let loadedTerms: AcademicTerm[] = [];
        let activeYId = '';
        let activeTId = '';
        let activeTName = 'Term 1';

        if (yearsRes?.success && Array.isArray(yearsRes.data) && yearsRes.data.length > 0) {
          loadedYears = yearsRes.data;
          setAcademicYears(loadedYears);

          const activeYear = contextRes?.data?.currentYear || loadedYears.find((y) => y.isCurrent) || loadedYears[0];
          activeYId = initialData?.academicYearId || activeYear.id;
          setSelectedYearId(activeYId);

          const termsRes = await apiService.getTerms(activeYId).catch(() => null);
          if (termsRes?.success && Array.isArray(termsRes.data) && termsRes.data.length > 0) {
            loadedTerms = termsRes.data;
            setTerms(loadedTerms);

            const matchedTerm = initialData?.termId
              ? loadedTerms.find((t) => t.id === initialData.termId)
              : contextRes?.data?.currentTerm || loadedTerms.find((t) => t.isCurrent) || loadedTerms[0];

            if (matchedTerm) {
              activeTId = matchedTerm.id;
              activeTName = matchedTerm.name || `Term ${parseTermNumber(matchedTerm.id)}`;
            } else {
              activeTId = loadedTerms[0].id;
              activeTName = loadedTerms[0].name || 'Term 1';
            }
          }
        }

        const g = initialData?.gradeLevel || 'GRADE_1';
        const tNum = parseTermNumber(activeTName || activeTId);
        const resolvedTLabel = `Term ${tNum}`;

        setGradeLevel(g);
        setSelectedTermId(activeTId);
        setTermLabel(resolvedTLabel);
        setDueDate(initialData?.dueDate || '');

        const gradeDisplay = resolveGradeName(g);
        if (initialData?.title) {
          setTitle(initialData.title);
          isCustomTitleEdited.current = true;
        } else {
          setTitle(`${gradeDisplay} ${resolvedTLabel} Fee Schedule`);
          isCustomTitleEdited.current = false;
        }

        if (initialData?.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
          const defaultRates = getDefaultAmountsForGrade(g);
          let loadedItems: FeeLineItemState[] = initialData.items.map((it: any, idx: number) => {
            const val = Number(it.amount);
            return {
              id: it.id || `item-${Date.now()}-${idx}`,
              name: it.name || '',
              category: it.category || 'TUITION',
              isOptional: !!it.isOptional,
              amount: val > 0 ? String(val) : '',
              expectedAmount: String(val > 0 ? val : (defaultRates as any)[it.category?.toLowerCase()] || '500'),
            };
          });

          if (tNum === 3) {
            loadedItems = loadedItems.filter((it) => it.category !== 'ACTIVITY' && !it.name.toLowerCase().includes('activity'));
          }

          setItems(loadedItems);
        } else {
          setItems(generateDefaultItems(tNum, g));
        }
      } catch (err) {
        console.error('Failed to initialize fee schedule modal:', err);
      }
    }

    initializeModal();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialData]);

  // Handle changing Academic Year: immediately reload valid terms for that year
  const handleYearChange = async (newYearId: string) => {
    setSelectedYearId(newYearId);
    try {
      const res = await apiService.getTerms(newYearId);
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setTerms(res.data);
        const firstTerm = res.data.find((t) => t.isCurrent) || res.data[0];
        const tNum = parseTermNumber(firstTerm.name || firstTerm.id);
        const newTermLabel = `Term ${tNum}`;

        setSelectedTermId(firstTerm.id);
        setTermLabel(newTermLabel);

        const gradeDisplay = resolveGradeName(gradeLevel);
        if (!isCustomTitleEdited.current) {
          setTitle(`${gradeDisplay} ${newTermLabel} Fee Schedule`);
        }

        setItems(generateDefaultItems(tNum, gradeLevel));
      } else {
        setTerms([]);
      }
    } catch {
      setTerms([]);
    }
  };

  // Handle changing Academic Term: sync label, title, and activity fee row
  const handleTermSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTermId = e.target.value;
    const selectedOptionText = e.target.options[e.target.selectedIndex]?.text || '';
    const tNum = parseTermNumber(selectedOptionText || newTermId);
    const newTermLabel = `Term ${tNum}`;

    setSelectedTermId(newTermId);
    setTermLabel(newTermLabel);

    const gradeDisplay = resolveGradeName(gradeLevel);
    if (!isCustomTitleEdited.current) {
      setTitle(`${gradeDisplay} ${newTermLabel} Fee Schedule`);
    } else {
      setTitle((prev) => {
        if (/Term\s+[1-3]/i.test(prev)) {
          return prev.replace(/Term\s+[1-3]/i, newTermLabel);
        }
        return `${gradeDisplay} ${newTermLabel} Fee Schedule`;
      });
    }

    setItems((prevItems) => {
      const rates = getDefaultAmountsForGrade(gradeLevel);

      if (tNum === 3) {
        return prevItems.filter(
          (it) => it.category !== 'ACTIVITY' && !it.name.toLowerCase().includes('activity')
        );
      } else {
        const hasActivity = prevItems.some(
          (it) => it.category === 'ACTIVITY' || it.name.toLowerCase().includes('activity')
        );
        if (!hasActivity) {
          return [
            ...prevItems,
            {
              id: `activity-${Date.now()}`,
              name: 'Activity Fee',
              category: 'ACTIVITY',
              isOptional: false,
              amount: '',
              expectedAmount: rates.activity,
            },
          ];
        }
        return prevItems;
      }
    });
  };

  const handleGradeSelect = (newGrade: string) => {
    setGradeLevel(newGrade);
    const gradeDisplay = resolveGradeName(newGrade);
    if (!isCustomTitleEdited.current) {
      setTitle(`${gradeDisplay} ${termLabel} Fee Schedule`);
    }

    const rates = getDefaultAmountsForGrade(newGrade);
    setItems((prevItems) =>
      prevItems.map((it) => {
        if (it.category === 'TUITION' || it.name.toLowerCase().includes('tuition')) {
          return { ...it, expectedAmount: rates.tuition };
        }
        if (it.category === 'ACTIVITY' || it.name.toLowerCase().includes('activity')) {
          return { ...it, expectedAmount: rates.activity };
        }
        return it;
      })
    );
  };

  const applyOfficialPreset = (level: 'PRE_PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY') => {
    const tNum = parseTermNumber(termLabel);
    const isT3 = tNum === 3;

    if (level === 'PRE_PRIMARY') {
      setItems([
        { id: `ps-${Date.now()}-1`, name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '', expectedAmount: '4500' },
        { id: `ps-${Date.now()}-2`, name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, amount: '', expectedAmount: '300' },
        ...(!isT3 ? [{ id: `ps-${Date.now()}-3`, name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, amount: '', expectedAmount: '300' } as FeeLineItemState] : []),
      ]);
    } else if (level === 'LOWER_PRIMARY') {
      setItems([
        { id: `ps-${Date.now()}-1`, name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '', expectedAmount: '5000' },
        { id: `ps-${Date.now()}-2`, name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, amount: '', expectedAmount: '300' },
        ...(!isT3 ? [{ id: `ps-${Date.now()}-3`, name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, amount: '', expectedAmount: '500' } as FeeLineItemState] : []),
      ]);
    } else if (level === 'UPPER_PRIMARY') {
      setItems([
        { id: `ps-${Date.now()}-1`, name: 'Tuition Fee', category: 'TUITION', isOptional: false, amount: '', expectedAmount: '5700' },
        { id: `ps-${Date.now()}-2`, name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, amount: '', expectedAmount: '300' },
        ...(!isT3 ? [{ id: `ps-${Date.now()}-3`, name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, amount: '', expectedAmount: '500' } as FeeLineItemState] : []),
      ]);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, name: '', category: 'ACTIVITY', isOptional: false, amount: '', expectedAmount: '500' },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert('At least one fee line item is required.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const getEffectiveAmount = (it: FeeLineItemState): number => {
    if (it.amount.trim() !== '') return Number(it.amount) || 0;
    return Number(it.expectedAmount) || 0;
  };

  const totalTermlyAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + getEffectiveAmount(it), 0);
  }, [items]);

  const mandatoryTotal = useMemo(() => {
    return items.filter((it) => !it.isOptional).reduce((sum, it) => sum + getEffectiveAmount(it), 0);
  }, [items]);

  const isTerm3Active = parseTermNumber(termLabel) === 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a schedule title.');
      return;
    }
    if (totalTermlyAmount <= 0) {
      setError('Total fee amount must be greater than zero.');
      return;
    }

    const unNamedItems = items.filter((it) => !it.name.trim());
    if (unNamedItems.length > 0) {
      setError('Please provide a valid description for all line items.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Format valid YYYY-MM-DD due date
    const fallbackDueDate = `${new Date().getFullYear()}-12-31`;
    const formattedDueDate = dueDate && dueDate.trim() !== '' ? dueDate : fallbackDueDate;

    const payload = {
      schoolId: schoolId || 'school-001',
      academicYearId: selectedYearId,
      termId: selectedTermId,
      gradeLevel,
      title: title.trim(),
      dueDate: formattedDueDate,
      totalAmount: totalTermlyAmount,
      items: items.map((it) => ({
        name: it.name.trim(),
        amount: getEffectiveAmount(it),
        isOptional: it.isOptional,
        category: it.category,
      })),
    };

    try {
      let res;
      if (initialData?.id) {
        res = await apiService.updateFeeStructure(initialData.id, payload);
      } else {
        res = await apiService.createFeeStructure(payload);
      }

      if (res?.success) {
        onCreated(res.data);
        onClose();
      } else {
        setError(res?.message || 'Failed to save fee structure in the database.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error while updating fee structure.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[22px]">payments</span>
            <div>
              <h2 className="font-bold text-sm tracking-tight">
                {initialData ? 'Edit Database Fee Schedule' : 'New Fee Schedule'}
              </h2>
              <p className="text-[11px] text-rose-200">
                Saves directly to system database for student invoices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-sm bg-white/15 px-3 py-1 rounded-lg border border-white/20">
              KES {totalTermlyAmount.toLocaleString()}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Schedule Parameters */}
          <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Academic Year</label>
              <select
                value={selectedYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-900 focus:outline-[#7a1228]"
              >
                {academicYears.length > 0 ? (
                  academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {resolveAcademicYearName(y.name || y.id)} {y.isCurrent ? '(Active)' : ''}
                    </option>
                  ))
                ) : (
                  <option value="2026">2026 (Active)</option>
                )}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Academic Term</label>
              <select
                value={selectedTermId}
                onChange={handleTermSelect}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-900 focus:outline-[#7a1228]"
              >
                {terms.length > 0 ? (
                  terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || `Term ${parseTermNumber(t.id)}`}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="TERM_1">Term 1</option>
                    <option value="TERM_2">Term 2</option>
                    <option value="TERM_3">Term 3</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Class / Grade Level</label>
              <select
                value={gradeLevel}
                onChange={(e) => handleGradeSelect(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-900 focus:outline-[#7a1228]"
              >
                {GRADE_OPTIONS.map((grp) => (
                  <optgroup key={grp.group} label={grp.group}>
                    {grp.items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-gray-700 block mb-1">Schedule Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  isCustomTitleEdited.current = true;
                  setTitle(e.target.value);
                }}
                placeholder="e.g. Grade 1 Term 1 Fee Schedule"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-900 focus:outline-[#7a1228]"
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Term Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-gray-900 focus:outline-[#7a1228]"
              />
            </div>
          </div>

          {/* Rate Presets (Tied to active term label) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              1-Click Rate Presets ({termLabel}):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => applyOfficialPreset('PRE_PRIMARY')}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#7a1228] hover:text-white text-gray-700 font-bold text-[11px] transition-colors cursor-pointer"
              >
                Pre-Primary ({isTerm3Active ? 'KES 4,800' : 'KES 5,100'})
              </button>
              <button
                type="button"
                onClick={() => applyOfficialPreset('LOWER_PRIMARY')}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#7a1228] hover:text-white text-gray-700 font-bold text-[11px] transition-colors cursor-pointer"
              >
                Lower Primary ({isTerm3Active ? 'KES 5,300' : 'KES 5,800'})
              </button>
              <button
                type="button"
                onClick={() => applyOfficialPreset('UPPER_PRIMARY')}
                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#7a1228] hover:text-white text-gray-700 font-bold text-[11px] transition-colors cursor-pointer"
              >
                Upper Primary ({isTerm3Active ? 'KES 6,000' : 'KES 6,500'})
              </button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800">Fee Components ({items.length})</span>
                {isTerm3Active && (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.2 rounded-full">
                    Term 3: Activity Fee Excluded
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7a1228] hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Item</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto bg-white p-1">
              {items.map((it, idx) => (
                <div key={it.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg">
                  <span className="font-mono text-gray-400 text-[11px] w-4 text-center">{idx + 1}</span>

                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((item) => (item.id === it.id ? { ...item, name: e.target.value } : item))
                      )
                    }
                    placeholder="Description (e.g. Tuition Fee)"
                    className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-900"
                    required
                  />

                  <select
                    value={it.category}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((item) => (item.id === it.id ? { ...item, category: e.target.value as any } : item))
                      )
                    }
                    className="w-32 bg-white border border-gray-300 rounded-md px-1.5 py-1 text-[11px] text-gray-700 font-medium"
                  >
                    <option value="TUITION">Tuition</option>
                    <option value="ASSESSMENT">Assessment / CBC</option>
                    <option value="ACTIVITY">Activity / Sports</option>
                    <option value="MEALS">Meals / Lunch</option>
                    <option value="ADMISSION">Admission (Once)</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="OTHER">Other Levy</option>
                  </select>

                  <div className="relative w-24">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                      KES
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={it.amount}
                      placeholder={it.expectedAmount || '0'}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((item) => (item.id === it.id ? { ...item, amount: e.target.value } : item))
                        )
                      }
                      className="w-full bg-white border border-gray-300 rounded-md pl-8 pr-1 py-1 text-xs font-mono font-bold text-gray-900 text-right placeholder:text-gray-400 placeholder:font-normal focus:outline-[#7a1228]"
                    />
                  </div>

                  <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={it.isOptional}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((item) => (item.id === it.id ? { ...item, isOptional: e.target.checked } : item))
                        )
                      }
                      className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                    />
                    <span>Opt</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(it.id)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Remove item"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">
              Mandatory: <strong className="text-gray-900 font-mono">KES {mandatoryTotal.toLocaleString()}</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-[#7a1228] text-sm font-mono">
              Total: KES {totalTermlyAmount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit as any}
              disabled={isLoading || totalTermlyAmount <= 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              )}
              <span>{initialData?.id ? 'Update Schedule' : 'Save to Database'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateFeeStructureModal;