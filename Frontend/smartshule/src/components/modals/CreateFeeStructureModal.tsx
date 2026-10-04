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
  annualAmount: string; // Whole year full amount (KES)
  term1Pct: string;     // Percentage for Term 1 e.g. "50"
  term2Pct: string;     // Percentage for Term 2 e.g. "30"
  term3Pct: string;     // Percentage for Term 3 e.g. "20"
  term1: string;        // Amount in KES for Term 1
  term2: string;        // Amount in KES for Term 2
  term3: string;        // Amount in KES for Term 3
}

const TEMPLATES: Record<string, { label: string; desc: string; icon: string; items: FeeLineItemState[] }> = {
  graceseed_pp: {
    label: 'Grace Seeds Pre-Primary (PG, PP1, PP2)',
    desc: 'Tuition, Activity (T1 & T2 only), Assessment & Admission',
    icon: 'child_care',
    items: [
      { id: 'gs-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, annualAmount: '', term1Pct: '33.3', term2Pct: '33.3', term3Pct: '33.4', term1: '', term2: '', term3: '' },
      { id: 'gs-2', name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '50', term3Pct: '0', term1: '', term2: '', term3: '' },
      { id: 'gs-3', name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, annualAmount: '', term1Pct: '33.3', term2Pct: '33.3', term3Pct: '33.4', term1: '', term2: '', term3: '' },
      { id: 'gs-4', name: 'Admission Fee', category: 'ADMISSION', isOptional: true, annualAmount: '', term1Pct: '100', term2Pct: '0', term3Pct: '0', term1: '', term2: '', term3: '' },
    ]
  },
  graceseed_lower: {
    label: 'Grace Seeds Lower Primary (Grade 1 - 3)',
    desc: 'Tuition, Activity (T1 & T2 only), Assessment & Admission',
    icon: 'school',
    items: [
      { id: 'gs-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, annualAmount: '', term1Pct: '33.3', term2Pct: '33.3', term3Pct: '33.4', term1: '', term2: '', term3: '' },
      { id: 'gs-2', name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '50', term3Pct: '0', term1: '', term2: '', term3: '' },
      { id: 'gs-3', name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, annualAmount: '', term1Pct: '33.3', term2Pct: '33.3', term3Pct: '33.4', term1: '', term2: '', term3: '' },
      { id: 'gs-4', name: 'Admission Fee', category: 'ADMISSION', isOptional: true, annualAmount: '', term1Pct: '100', term2Pct: '0', term3Pct: '0', term1: '', term2: '', term3: '' },
    ]
  },
  graceseed_upper: {
    label: 'Grace Seeds Upper Primary (Grade 4 - 6)',
    desc: 'Tuition, Activity (T1 & T2 only), Assessment & Admission',
    icon: 'menu_book',
    items: [
      { id: 'gs-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, annualAmount: '', term1Pct: '33.3', term2Pct: '33.3', term3Pct: '33.4', term1: '', term2: '', term3: '' },
      { id: 'gs-2', name: 'Activity Fee', category: 'ACTIVITY', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '50', term3Pct: '0', term1: '', term2: '', term3: '' },
      { id: 'gs-3', name: 'Assessment Fee', category: 'ASSESSMENT', isOptional: false, annualAmount: '', term1Pct: '33.3', term2Pct: '33.3', term3Pct: '33.4', term1: '', term2: '', term3: '' },
      { id: 'gs-4', name: 'Admission Fee', category: 'ADMISSION', isOptional: true, annualAmount: '', term1Pct: '100', term2Pct: '0', term3Pct: '0', term1: '', term2: '', term3: '' },
    ]
  },
  primary: {
    label: 'Standard Primary Day Scholar',
    desc: 'Tuition, CBC Materials, Co-Curricular & Lunch',
    icon: 'domain',
    items: [
      { id: 't-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' },
      { id: 't-2', name: 'CBC Assessment & Materials', category: 'ASSESSMENT', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' },
      { id: 't-3', name: 'Co-Curricular & Physical Education', category: 'ACTIVITY', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' },
      { id: 't-4', name: 'School Lunch Scheme', category: 'MEALS', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' }
    ]
  },
  boarding: {
    label: 'Boarding Comprehensive',
    desc: 'Tuition, Accommodation & Catering',
    icon: 'hotel',
    items: [
      { id: 't-1', name: 'Tuition Fee', category: 'TUITION', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' },
      { id: 't-2', name: 'Boarding & Dormitory Amenities', category: 'BOARDING', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' },
      { id: 't-3', name: 'Full Board Catering & Nutrition', category: 'MEALS', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' },
      { id: 't-4', name: 'Infirmary, Laundry & Healthcare', category: 'OTHER', isOptional: false, annualAmount: '', term1Pct: '50', term2Pct: '30', term3Pct: '20', term1: '', term2: '', term3: '' }
    ]
  }
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

  // Global Term Percentage Strategy (defines whole-year split by default)
  const [globalPct1, setGlobalPct1] = useState('33.3');
  const [globalPct2, setGlobalPct2] = useState('33.3');
  const [globalPct3, setGlobalPct3] = useState('33.4');

  const [activeTab, setActiveTab] = useState<'simplified' | 'basics' | 'items' | 'preview'>('simplified');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified Entry State (Grace Seeds School Ratified Schedule)
  const [simplifiedTier, setSimplifiedTier] = useState<'PRE_PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY'>('PRE_PRIMARY');
  const [simplifiedGrade, setSimplifiedGrade] = useState('PLAYGROUP');
  const [simplifiedTuition, setSimplifiedTuition] = useState('');
  const [simplifiedActivity, setSimplifiedActivity] = useState('');
  const [simplifiedAssessment, setSimplifiedAssessment] = useState('');
  const [simplifiedIncludeAdmission, setSimplifiedIncludeAdmission] = useState(true);
  const [simplifiedAdmissionAmount, setSimplifiedAdmissionAmount] = useState('');
  const [simplifiedIncludeLunch, setSimplifiedIncludeLunch] = useState(false);
  const [simplifiedLunchMonthly, setSimplifiedLunchMonthly] = useState('');
  const [simplifiedIncludeUniform, setSimplifiedIncludeUniform] = useState(false);
  const [simplifiedUniformAmount, setSimplifiedUniformAmount] = useState('');

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

      const p1 = initialData.termPercentages?.term1 ?? 50;
      const p2 = initialData.termPercentages?.term2 ?? 30;
      const p3 = initialData.termPercentages?.term3 ?? 20;
      setGlobalPct1(String(p1));
      setGlobalPct2(String(p2));
      setGlobalPct3(String(p3));

      if (initialData.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
        const converted = initialData.items.map((it: any, idx: number) => {
          const amt = Number(it.amount) || 0;
          const div1 = it.termDivisions?.find((d: any) => d.termNumber === 1);
          const div2 = it.termDivisions?.find((d: any) => d.termNumber === 2);
          const div3 = it.termDivisions?.find((d: any) => d.termNumber === 3);

          const t1 = it.termBreakdown?.term1 ?? div1?.amount ?? Math.round((amt * p1) / 100);
          const t2 = it.termBreakdown?.term2 ?? div2?.amount ?? Math.round((amt * p2) / 100);
          const t3 = it.termBreakdown?.term3 ?? div3?.amount ?? Math.max(0, amt - t1 - t2);

          const itemP1 = it.termPercentages?.term1 ?? div1?.percentage ?? (amt > 0 ? Number(((t1 / amt) * 100).toFixed(1)) : p1);
          const itemP2 = it.termPercentages?.term2 ?? div2?.percentage ?? (amt > 0 ? Number(((t2 / amt) * 100).toFixed(1)) : p2);
          const itemP3 = it.termPercentages?.term3 ?? div3?.percentage ?? (amt > 0 ? Number(((t3 / amt) * 100).toFixed(1)) : p3);

          return {
            id: `item-${Date.now()}-${idx}`,
            name: it.name || '',
            category: it.category || 'TUITION',
            isOptional: !!it.isOptional,
            annualAmount: String(amt),
            term1Pct: String(itemP1),
            term2Pct: String(itemP2),
            term3Pct: String(itemP3),
            term1: String(t1),
            term2: String(t2),
            term3: String(t3),
          };
        });
        setItems(converted);
      }
    } else {
      // Default initial title
      const yearObj = academicYears.find((y) => y.id === selectedYearId);
      const yearName = yearObj ? yearObj.name : '2026';
      const gradeName = gradeLevel.replace('_', ' ');
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
  };

  // Global percentage sum check
  const p1Val = Number(globalPct1) || 0;
  const p2Val = Number(globalPct2) || 0;
  const p3Val = Number(globalPct3) || 0;
  const globalPctSum = Number((p1Val + p2Val + p3Val).toFixed(1));
  const isStrategyBalanced = Math.abs(globalPctSum - 100) < 0.2;

  // Auto balance Term 3
  const handleAutoBalanceTerm3 = () => {
    const balancedT3 = Math.max(0, Number((100 - p1Val - p2Val).toFixed(1)));
    setGlobalPct3(String(balancedT3));
    handleApplyGlobalPercentages(p1Val, p2Val, balancedT3);
  };

  // Apply global percentages to all line items (keeping admission fee as 100% Term 1)
  const handleApplyGlobalPercentages = (p1: number, p2: number, p3: number) => {
    setGlobalPct1(String(p1));
    setGlobalPct2(String(p2));
    setGlobalPct3(String(p3));

    setItems((prev) =>
      prev.map((item) => {
        if (item.category === 'ADMISSION') return item;
        const annual = Number(item.annualAmount) || ((Number(item.term1) || 0) + (Number(item.term2) || 0) + (Number(item.term3) || 0));
        const t1 = Math.round((annual * p1) / 100);
        const t2 = Math.round((annual * p2) / 100);
        const t3 = Math.max(0, annual - t1 - t2);

        return {
          ...item,
          annualAmount: String(annual),
          term1Pct: String(p1),
          term2Pct: String(p2),
          term3Pct: String(p3),
          term1: String(t1),
          term2: String(t2),
          term3: String(t3),
        };
      })
    );
  };

  // Apply preset template
  const handleApplyTemplate = (templateKey: string) => {
    const tpl = TEMPLATES[templateKey];
    if (!tpl) return;
    setItems(tpl.items.map((it, idx) => ({ ...it, id: `item-${Date.now()}-${idx}` })));
    setGlobalPct1('50');
    setGlobalPct2('30');
    setGlobalPct3('20');
  };

  // When annual amount changes for an item: recalculate term amounts based on item percentages
  const handleUpdateAnnualAmount = (id: string, newAnnualStr: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const annual = Number(newAnnualStr) || 0;
        const p1 = Number(item.term1Pct) || 0;
        const p2 = Number(item.term2Pct) || 0;

        const t1 = Math.round((annual * p1) / 100);
        const t2 = Math.round((annual * p2) / 100);
        const t3 = Math.max(0, annual - t1 - t2);

        return {
          ...item,
          annualAmount: newAnnualStr,
          term1: String(t1),
          term2: String(t2),
          term3: String(t3),
        };
      })
    );
  };

  // When an item's term percentage changes: recalculate term amounts
  const handleUpdateTermPercentage = (id: string, term: 'term1' | 'term2' | 'term3', newPctStr: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updatedItem = {
          ...item,
          [term === 'term1' ? 'term1Pct' : term === 'term2' ? 'term2Pct' : 'term3Pct']: newPctStr,
        };

        const annual = Number(updatedItem.annualAmount) || 0;
        const p1 = Number(updatedItem.term1Pct) || 0;
        const p2 = Number(updatedItem.term2Pct) || 0;
        const p3 = Number(updatedItem.term3Pct) || 0;

        if (annual > 0) {
          const t1 = Math.round((annual * p1) / 100);
          const t2 = Math.round((annual * p2) / 100);
          const t3 = Math.max(0, annual - t1 - t2);
          updatedItem.term1 = String(t1);
          updatedItem.term2 = String(t2);
          updatedItem.term3 = String(t3);
        }

        return updatedItem;
      })
    );
  };

  // When an item's term KES amount changes: recalculate annual amount and percentages
  const handleUpdateTermAmount = (id: string, term: 'term1' | 'term2' | 'term3', newAmountStr: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updatedItem = {
          ...item,
          [term]: newAmountStr,
        };

        const t1 = Number(updatedItem.term1) || 0;
        const t2 = Number(updatedItem.term2) || 0;
        const t3 = Number(updatedItem.term3) || 0;
        const total = t1 + t2 + t3;

        updatedItem.annualAmount = String(total);
        if (total > 0) {
          updatedItem.term1Pct = String(Number(((t1 / total) * 100).toFixed(1)));
          updatedItem.term2Pct = String(Number(((t2 / total) * 100).toFixed(1)));
          updatedItem.term3Pct = String(Number(((t3 / total) * 100).toFixed(1)));
        }

        return updatedItem;
      })
    );
  };

  const handleAddItem = () => {
    const p1 = Number(globalPct1) || 50;
    const p2 = Number(globalPct2) || 30;
    const p3 = Number(globalPct3) || 20;
    const defaultAnnual = 10000;
    const t1 = Math.round((defaultAnnual * p1) / 100);
    const t2 = Math.round((defaultAnnual * p2) / 100);
    const t3 = Math.max(0, defaultAnnual - t1 - t2);

    const newItem: FeeLineItemState = {
      id: `item-${Date.now()}`,
      name: '',
      category: 'OTHER',
      isOptional: false,
      annualAmount: String(defaultAnnual),
      term1Pct: String(p1),
      term2Pct: String(p2),
      term3Pct: String(p3),
      term1: String(t1),
      term2: String(t2),
      term3: String(t3),
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

  // Compute live totals
  const term1Subtotal = items.reduce((sum, item) => sum + (Number(item.term1) || 0), 0);
  const term2Subtotal = items.reduce((sum, item) => sum + (Number(item.term2) || 0), 0);
  const term3Subtotal = items.reduce((sum, item) => sum + (Number(item.term3) || 0), 0);
  const fullAnnualTotal = term1Subtotal + term2Subtotal + term3Subtotal;

  // Handlers for Simplified Mode
  const handleSelectTier = (tier: 'PRE_PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY') => {
    setSimplifiedTier(tier);
    let newGrade = 'PLAYGROUP';

    if (tier === 'PRE_PRIMARY') {
      newGrade = 'PLAYGROUP';
    } else if (tier === 'LOWER_PRIMARY') {
      newGrade = 'GRADE_1';
    } else {
      newGrade = 'GRADE_4';
    }

    setSimplifiedGrade(newGrade);
    setGradeLevel(newGrade);

    const yearObj = academicYears.find((y) => y.id === selectedYearId);
    const yearName = yearObj ? resolveAcademicYearName(yearObj.name || yearObj.id) : '2026';
    setTitle(`${resolveGradeName(newGrade)} CBC Annual Fee Schedule — ${yearName}`);
  };

  const handleSelectGrade = (gr: string) => {
    setSimplifiedGrade(gr);
    setGradeLevel(gr);
    const yearObj = academicYears.find((y) => y.id === selectedYearId);
    const yearName = yearObj ? resolveAcademicYearName(yearObj.name || yearObj.id) : '2026';
    setTitle(`${resolveGradeName(gr)} CBC Annual Fee Schedule — ${yearName}`);
  };

  const buildItemsFromSimplified = (): FeeLineItemState[] => {
    const tAmt = Number(simplifiedTuition) || 0;
    const actAmt = Number(simplifiedActivity) || 0;
    const assAmt = Number(simplifiedAssessment) || 0;
    const admAmt = simplifiedIncludeAdmission ? (Number(simplifiedAdmissionAmount) || 0) : 0;
    const lunchMonthlyAmt = simplifiedIncludeLunch ? (Number(simplifiedLunchMonthly) || 0) : 0;
    const uniformAmt = simplifiedIncludeUniform ? (Number(simplifiedUniformAmount) || 0) : 0;

    const newItems: FeeLineItemState[] = [
      {
        id: `gs-tuition-${Date.now()}`,
        name: 'Tuition Fee',
        category: 'TUITION',
        isOptional: false,
        annualAmount: String(tAmt * 3),
        term1Pct: '33.3',
        term2Pct: '33.3',
        term3Pct: '33.4',
        term1: String(tAmt),
        term2: String(tAmt),
        term3: String(tAmt),
      },
      {
        id: `gs-activity-${Date.now()}`,
        name: 'Activity Fee',
        category: 'ACTIVITY',
        isOptional: false,
        annualAmount: String(actAmt * 2),
        term1Pct: '50',
        term2Pct: '50',
        term3Pct: '0',
        term1: String(actAmt),
        term2: String(actAmt),
        term3: '0', // 1st & 2nd term ONLY!
      },
      {
        id: `gs-assessment-${Date.now()}`,
        name: 'Assessment Fee',
        category: 'ASSESSMENT',
        isOptional: false,
        annualAmount: String(assAmt * 3),
        term1Pct: '33.3',
        term2Pct: '33.3',
        term3Pct: '33.4',
        term1: String(assAmt),
        term2: String(assAmt),
        term3: String(assAmt),
      },
    ];

    if (simplifiedIncludeAdmission && admAmt > 0) {
      newItems.push({
        id: `gs-admission-${Date.now()}`,
        name: 'Admission Fee',
        category: 'ADMISSION',
        isOptional: true,
        annualAmount: String(admAmt),
        term1Pct: '100',
        term2Pct: '0',
        term3Pct: '0',
        term1: String(admAmt),
        term2: '0',
        term3: '0',
      });
    }

    if (simplifiedIncludeLunch && lunchMonthlyAmt > 0) {
      const termLunch = lunchMonthlyAmt * 3;
      newItems.push({
        id: `gs-lunch-${Date.now()}`,
        name: 'School Lunch Scheme',
        category: 'MEALS',
        isOptional: true,
        annualAmount: String(termLunch * 3),
        term1Pct: '33.3',
        term2Pct: '33.3',
        term3Pct: '33.4',
        term1: String(termLunch),
        term2: String(termLunch),
        term3: String(termLunch),
      });
    }

    if (simplifiedIncludeUniform && uniformAmt > 0) {
      newItems.push({
        id: `gs-uniform-${Date.now()}`,
        name: 'Track Suit / Uniform T-Shirt',
        category: 'OTHER',
        isOptional: true,
        annualAmount: String(uniformAmt),
        term1Pct: '100',
        term2Pct: '0',
        term3Pct: '0',
        term1: String(uniformAmt),
        term2: '0',
        term3: '0',
      });
    }

    return newItems;
  };

  const handleApplySimplifiedToItems = () => {
    const built = buildItemsFromSimplified();
    setItems(built);
    setActiveTab('items');
  };

  const handleSaveSimplifiedDirectly = async () => {
    const built = buildItemsFromSimplified();
    setItems(built);
    await handleSubmit(undefined, built, simplifiedGrade);
  };

  const handleSubmit = async (e?: React.FormEvent, overrideItems?: FeeLineItemState[], overrideGrade?: string) => {
    if (e) e.preventDefault();
    if (!selectedYearId) {
      setError('Please select an active academic year.');
      return;
    }

    const sourceItems = overrideItems || items;
    const targetGrade = overrideGrade || gradeLevel;

    const term1Sum = sourceItems.reduce((sum, item) => sum + (Number(item.term1) || 0), 0);
    const term2Sum = sourceItems.reduce((sum, item) => sum + (Number(item.term2) || 0), 0);
    const term3Sum = sourceItems.reduce((sum, item) => sum + (Number(item.term3) || 0), 0);
    const fullAnn = term1Sum + term2Sum + term3Sum;

    if (fullAnn <= 0) {
      setError('Total annual fee structure amount must be greater than zero.');
      setActiveTab('items');
      return;
    }

    const unNamedItems = sourceItems.filter((it) => !it.name.trim());
    if (unNamedItems.length > 0) {
      setError('Please provide a name for all line items.');
      setActiveTab('items');
      return;
    }

    // Format line items with both amounts and percentages
    const formattedItems = sourceItems
      .filter((it) => it.name.trim() !== '')
      .map((it) => {
        const t1 = Number(it.term1) || 0;
        const t2 = Number(it.term2) || 0;
        const t3 = Number(it.term3) || 0;
        const total = t1 + t2 + t3;

        const p1 = Number(it.term1Pct) || (total > 0 ? Number(((t1 / total) * 100).toFixed(1)) : 0);
        const p2 = Number(it.term2Pct) || (total > 0 ? Number(((t2 / total) * 100).toFixed(1)) : 0);
        const p3 = Number(it.term3Pct) || (total > 0 ? Number(((t3 / total) * 100).toFixed(1)) : 0);

        return {
          name: it.name.trim(),
          amount: total,
          isOptional: it.isOptional,
          category: it.category,
          termBreakdown: {
            term1: t1,
            term2: t2,
            term3: t3,
          },
          termPercentages: {
            term1: p1,
            term2: p2,
            term3: p3,
          },
          termDivisions: [
            { termNumber: 1, termName: 'Term 1', amount: t1, percentage: p1 },
            { termNumber: 2, termName: 'Term 2', amount: t2, percentage: p2 },
            { termNumber: 3, termName: 'Term 3', amount: t3, percentage: p3 },
          ],
        };
      });

    const defaultTitle = `${targetGrade.replace('_', ' ')} CBC Annual Fee Schedule`;
    const payload = {
      schoolId: schoolId || 'school-001',
      academicYearId: selectedYearId,
      termId: 'ALL',
      gradeLevel: targetGrade,
      title: title.trim() || defaultTitle,
      dueDate: dueDate || `${new Date().getFullYear()}-12-31`,
      termPercentages: {
        term1: Number(globalPct1) || 33.3,
        term2: Number(globalPct2) || 33.3,
        term3: Number(globalPct3) || 33.4,
      },
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
      setError(err.message || 'Error creating annual fee structure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {initialData ? 'Clone / Edit Annual Fee Schedule' : 'Create Annual Fee Schedule'}
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Grace Seeds School ratified fee schedules · Term 1, 2, & 3 allocations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Tab Stepper Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between text-xs shrink-0 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[
              { id: 'simplified', label: '⚡ Simplified Entry (Grace Seeds)', icon: 'bolt' },
              { id: 'basics', label: '1. Class & Strategy', icon: 'tune' },
              { id: 'items', label: `2. Itemized Lines (${items.length})`, icon: 'receipt_long' },
              { id: 'preview', label: '3. Invoice Preview & Save', icon: 'preview' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#7a1228] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/70'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">Annual Total:</span>
            <span className="font-mono font-bold text-sm text-[#7a1228] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              KES {fullAnnualTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">error</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* TAB 0: SIMPLIFIED SYSTEM ENTRY (GRACE SEEDS RATIFIED SCHEDULE) */}
          {activeTab === 'simplified' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Header Banner */}
              <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#7a1228] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Grace Seeds School Ratified Schedule
                    </span>
                    <span className="text-[11px] font-semibold text-gray-600">Kisumu, Kenya</span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">
                    Simplified System Entry
                  </h4>
                  <p className="text-xs text-gray-600">
                    Quickly configure Fee, Activity fee (Term 1 & 2 only), Assessment fee (termly), and Admission fee (once off).
                  </p>
                </div>
                <div className="bg-white px-3 py-2 rounded-xl border border-rose-200 text-xs text-right shadow-2xs shrink-0">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">M-Pesa Paybill</div>
                  <div className="font-mono font-bold text-gray-900">522533</div>
                  <div className="text-[10px] text-gray-400">Acc: 8048859# Name</div>
                </div>
              </div>

              {/* 1. Academic Year & Class Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Target Academic Year
                  </label>
                  <select
                    value={selectedYearId}
                    onChange={(e) => handleYearChange(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-[#7a1228] focus:bg-white"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Specific Grade / Class
                  </label>
                  <select
                    value={simplifiedGrade}
                    onChange={(e) => handleSelectGrade(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-[#7a1228] focus:bg-white font-semibold"
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
                  </select>
                </div>
              </div>

              {/* Tier Quick Buttons */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Select Grace Seeds School Tier (Auto-fills official rates)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectTier('PRE_PRIMARY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      simplifiedTier === 'PRE_PRIMARY'
                        ? 'bg-rose-50/80 border-[#7a1228] ring-2 ring-[#7a1228]/20'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[20px] text-[#7a1228]">child_care</span>
                      <span className="font-bold text-xs text-gray-900">Pre-Primary (PG, PP1, PP2)</span>
                    </div>
                    <div className="text-[11px] text-gray-500">Tuition · Activity (T1 &amp; T2) · Assessment</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-1">Rates configured in schedule</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTier('LOWER_PRIMARY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      simplifiedTier === 'LOWER_PRIMARY'
                        ? 'bg-rose-50/80 border-[#7a1228] ring-2 ring-[#7a1228]/20'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[20px] text-[#7a1228]">school</span>
                      <span className="font-bold text-xs text-gray-900">Lower Primary (Grade 1 - 3)</span>
                    </div>
                    <div className="text-[11px] text-gray-500">Tuition · Activity (T1 &amp; T2) · Assessment</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-1">Rates configured in schedule</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTier('UPPER_PRIMARY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      simplifiedTier === 'UPPER_PRIMARY'
                        ? 'bg-rose-50/80 border-[#7a1228] ring-2 ring-[#7a1228]/20'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[20px] text-[#7a1228]">menu_book</span>
                      <span className="font-bold text-xs text-gray-900">Upper Primary (Grade 4 - 6)</span>
                    </div>
                    <div className="text-[11px] text-gray-500">Tuition · Activity (T1 &amp; T2) · Assessment</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-1">Rates configured in schedule</div>
                  </button>
                </div>
              </div>

              {/* Core Fee Inputs Grid */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                <h5 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#7a1228]">account_balance_wallet</span>
                  <span>Core Termly Fee Components</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-800 mb-0.5">
                      Base Fee / Tuition (Termly)
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">Applied equally: Term 1, 2, 3</p>
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:border-[#7a1228]">
                      <span className="text-xs font-bold text-gray-500">KES</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={simplifiedTuition}
                        onChange={(e) => setSimplifiedTuition(e.target.value)}
                        className="w-full text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-xs font-bold text-gray-800">
                        Activity Fee
                      </label>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        T1 & T2 ONLY
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">Term 3 is waived (no fee charged)</p>
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:border-[#7a1228]">
                      <span className="text-xs font-bold text-gray-500">KES</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={simplifiedActivity}
                        onChange={(e) => setSimplifiedActivity(e.target.value)}
                        className="w-full text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-xs font-bold text-gray-800">
                        Assessment Fee
                      </label>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        Termly
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">Billed: Term 1, 2, 3</p>
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:border-[#7a1228]">
                      <span className="text-xs font-bold text-gray-500">KES</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={simplifiedAssessment}
                        onChange={(e) => setSimplifiedAssessment(e.target.value)}
                        className="w-full text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional / Optional Levies */}
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Additional Charges & Optional Schemes
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Admission Fee */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simplifiedIncludeAdmission}
                          onChange={(e) => setSimplifiedIncludeAdmission(e.target.checked)}
                          className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                        />
                        <span className="text-xs font-bold text-gray-900">Admission Fee (Once Off)</span>
                      </label>
                      <p className="text-[10px] text-gray-500">Charged on 1st Term / New Admission only</p>
                      {simplifiedIncludeAdmission && (
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-bold text-gray-500">KES</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={simplifiedAdmissionAmount}
                            onChange={(e) => setSimplifiedAdmissionAmount(e.target.value)}
                            className="w-full text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                          />
                        </div>
                      )}
                    </div>

                    {/* Lunch Scheme */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simplifiedIncludeLunch}
                          onChange={(e) => setSimplifiedIncludeLunch(e.target.checked)}
                          className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                        />
                        <span className="text-xs font-bold text-gray-900">Lunch Scheme</span>
                      </label>
                      <p className="text-[10px] text-gray-500">Monthly lunch rate billed per term</p>
                      {simplifiedIncludeLunch && (
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-bold text-gray-500">KES/mo</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={simplifiedLunchMonthly}
                            onChange={(e) => setSimplifiedLunchMonthly(e.target.value)}
                            className="w-full text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                          />
                        </div>
                      )}
                    </div>

                    {/* Track Suit / Uniform */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simplifiedIncludeUniform}
                          onChange={(e) => setSimplifiedIncludeUniform(e.target.checked)}
                          className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                        />
                        <span className="text-xs font-bold text-gray-900">Track Suit / T-Shirt</span>
                      </label>
                      <p className="text-[10px] text-gray-500">Official uniform levy (once-off)</p>
                      {simplifiedIncludeUniform && (
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1">
                          <span className="text-[10px] font-bold text-gray-500">KES</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={simplifiedUniformAmount}
                            onChange={(e) => setSimplifiedUniformAmount(e.target.value)}
                            className="w-full text-xs font-mono font-bold text-gray-900 outline-none bg-transparent"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Term Breakdown Preview Card */}
              {(() => {
                const tAmt = Number(simplifiedTuition) || 0;
                const actAmt = Number(simplifiedActivity) || 0;
                const assAmt = Number(simplifiedAssessment) || 0;
                const admAmt = simplifiedIncludeAdmission ? (Number(simplifiedAdmissionAmount) || 0) : 0;
                const lunchTermAmt = simplifiedIncludeLunch ? ((Number(simplifiedLunchMonthly) || 0) * 3) : 0;
                const uniAmt = simplifiedIncludeUniform ? (Number(simplifiedUniformAmount) || 0) : 0;

                const t1 = tAmt + actAmt + assAmt + admAmt + lunchTermAmt + uniAmt;
                const t2 = tAmt + actAmt + assAmt + lunchTermAmt;
                const t3 = tAmt + assAmt + lunchTermAmt; // No activity, no admission, no uniform!
                const ann = t1 + t2 + t3;

                return (
                  <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">monitoring</span>
                        <span>Computed Term Billing Schedule ({resolveGradeName(simplifiedGrade)})</span>
                      </span>
                      <span className="text-xs font-bold text-gray-900 font-mono">
                        Annual Total: {ann > 0 ? `KES ${ann.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                        <div className="text-[10px] font-bold uppercase text-gray-500">Term 1 Invoice</div>
                        <div className="text-lg font-mono font-bold text-gray-900 mt-0.5">
                          {t1 > 0 ? `KES ${t1.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 space-y-0.5">
                          <div>Tuition: {tAmt > 0 ? tAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                          <div>Activity: {actAmt > 0 ? actAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                          <div>Assessment: {assAmt > 0 ? assAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                          {admAmt > 0 && <div>Admission: {admAmt.toLocaleString()}</div>}
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                        <div className="text-[10px] font-bold uppercase text-gray-500">Term 2 Invoice</div>
                        <div className="text-lg font-mono font-bold text-gray-900 mt-0.5">
                          {t2 > 0 ? `KES ${t2.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 space-y-0.5">
                          <div>Tuition: {tAmt > 0 ? tAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                          <div>Activity: {actAmt > 0 ? actAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                          <div>Assessment: {assAmt > 0 ? assAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                        <div className="text-[10px] font-bold uppercase text-gray-500">Term 3 Invoice</div>
                        <div className="text-lg font-mono font-bold text-gray-900 mt-0.5">
                          {t3 > 0 ? `KES ${t3.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 space-y-0.5">
                          <div>Tuition: {tAmt > 0 ? tAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                          <div className="text-gray-400 line-through">Activity: -- (Waived)</div>
                          <div>Assessment: {assAmt > 0 ? assAmt.toLocaleString() : <span className="text-gray-400">--</span>}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 gap-3">
                <button
                  type="button"
                  onClick={handleApplySimplifiedToItems}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  <span>Inspect & Customize Line Items &rarr;</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSaveSimplifiedDirectly}
                  className="px-5 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60 transition-all"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Schedule...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Ratify & Save {simplifiedGrade.replace('_', ' ')} Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: BASICS & DIVISION STRATEGY */}
          {activeTab === 'basics' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Quick Template Selector */}
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7a1228] flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                    <span>Quick-Start Fee Schedule Templates</span>
                  </span>
                  <span className="text-[10px] text-gray-500">1-click starter data</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {Object.entries(TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyTemplate(key)}
                      className="p-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#7a1228] hover:shadow-xs text-left transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-outlined text-[18px] text-[#7a1228] group-hover:scale-110 transition-transform">
                          {tpl.icon}
                        </span>
                        <span className="font-bold text-xs text-gray-900 group-hover:text-[#7a1228] truncate">
                          {tpl.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Academic Year
                  </label>
                  <select
                    value={selectedYearId}
                    onChange={(e) => handleYearChange(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-[#7a1228] focus:bg-white"
                  >
                    {academicYears.length > 0 ? (
                      academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {resolveAcademicYearName(y.name || y.id)} {y.isCurrent ? '(Active Year)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">No years created</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Target CBC Grade Level
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 font-semibold focus:outline-[#7a1228] focus:bg-white"
                  >
                    <option value="PLAYGROUP">Playgroup</option>
                    <option value="PP1">PP1 (Pre-Primary 1)</option>
                    <option value="PP2">PP2 (Pre-Primary 2)</option>
                    <option value="GRADE_1">Grade 1</option>
                    <option value="GRADE_2">Grade 2</option>
                    <option value="GRADE_3">Grade 3</option>
                    <option value="GRADE_4">Grade 4</option>
                    <option value="GRADE_5">Grade 5</option>
                    <option value="GRADE_6">Grade 6</option>
                    <option value="GRADE_7">Grade 7 (Junior Secondary)</option>
                    <option value="GRADE_8">Grade 8 (Junior Secondary)</option>
                    <option value="GRADE_9">Grade 9 (Junior Secondary)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Annual Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-[#7a1228] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 7 CBC Junior Secondary — 2026 Annual Fee Schedule"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-sm text-gray-900 font-medium focus:outline-[#7a1228] focus:bg-white"
                />
              </div>

              {/* Dynamic Term Percentage Strategy Card */}
              <div className="p-4 bg-gradient-to-br from-rose-50/50 via-amber-50/30 to-blue-50/30 border border-gray-200 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[18px] text-[#7a1228]">pie_chart</span>
                      <span>Whole-Year Term Division Ratio</span>
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Enter the percentage share for each term. Term amounts automatically calculate and add up to 100%.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border font-mono ${
                        isStrategyBalanced
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                      }`}
                    >
                      {isStrategyBalanced ? '✓ Total: 100%' : `⚠️ Total: ${globalPctSum}% (Must = 100%)`}
                    </span>

                    {!isStrategyBalanced && (
                      <button
                        type="button"
                        onClick={handleAutoBalanceTerm3}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                      >
                        Auto-Balance Term 3
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Stacked Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-3.5 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, p1Val))}%` }}
                      className="bg-[#7a1228] transition-all relative group"
                      title={`Term 1: ${p1Val}%`}
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, p2Val))}%` }}
                      className="bg-amber-500 transition-all relative group"
                      title={`Term 2: ${p2Val}%`}
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, p3Val))}%` }}
                      className="bg-blue-600 transition-all relative group"
                      title={`Term 3: ${p3Val}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 font-semibold px-1">
                    <span className="text-[#7a1228] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#7a1228] inline-block" />
                      Term 1: {p1Val}%
                    </span>
                    <span className="text-amber-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Term 2: {p2Val}%
                    </span>
                    <span className="text-blue-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      Term 3: {p3Val}%
                    </span>
                  </div>
                </div>

                {/* Percentage Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-800">Term 1 Share (%)</span>
                      <span className="text-[10px] text-[#7a1228] font-bold">Opens Year</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={globalPct1}
                        onChange={(e) => setGlobalPct1(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-mono font-bold text-gray-900 pr-7"
                        placeholder="50"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">%</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-800">Term 2 Share (%)</span>
                      <span className="text-[10px] text-amber-700 font-bold">Mid Year</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={globalPct2}
                        onChange={(e) => setGlobalPct2(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-mono font-bold text-gray-900 pr-7"
                        placeholder="30"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">%</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-800">Term 3 Share (%)</span>
                      <span className="text-[10px] text-blue-700 font-bold">Final Term</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={globalPct3}
                        onChange={(e) => setGlobalPct3(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm font-mono font-bold text-gray-900 pr-7"
                        placeholder="20"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                {/* Quick Ratio Presets */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200/80 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-600">Standard Splits:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalPercentages(50, 30, 20)}
                      className="px-2.5 py-1 bg-white hover:bg-rose-50 text-[#7a1228] border border-[#7a1228]/40 rounded-lg font-bold text-[11px] cursor-pointer shadow-2xs"
                    >
                      50 / 30 / 20 (MOE Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalPercentages(40, 30, 30)}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium text-[11px] cursor-pointer shadow-2xs"
                    >
                      40 / 30 / 30 (Balanced)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGlobalPercentages(33.3, 33.3, 33.4)}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium text-[11px] cursor-pointer shadow-2xs"
                    >
                      Equal (1/3 each)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyGlobalPercentages(p1Val, p2Val, p3Val)}
                    className="px-3 py-1 bg-[#7a1228] text-white hover:bg-[#5c0a1a] rounded-lg font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">sync</span>
                    <span>Apply Split to All Lines</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className="px-4 py-2 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Proceed to Itemized Lines</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ITEMIZED CHARGES */}
          {activeTab === 'items' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-200">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Itemized Annual Charges & Term Splits
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Enter annual charge in KES. Adjust percentage or amount per term. Line splits add up to the line total.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#7a1228] text-white hover:bg-[#5c0a1a] rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Line Item</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3.5">
                {items.map((item, index) => {
                  const itemTotal = (Number(item.term1) || 0) + (Number(item.term2) || 0) + (Number(item.term3) || 0);
                  const p1 = Number(item.term1Pct) || 0;
                  const p2 = Number(item.term2Pct) || 0;
                  const p3 = Number(item.term3Pct) || 0;
                  const pctSum = Number((p1 + p2 + p3).toFixed(1));
                  const isItemBalanced = Math.abs(pctSum - 100) < 0.2;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-200 space-y-3 transition-colors shadow-2xs"
                    >
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-bold text-[#7a1228] font-mono bg-white px-2 py-1 rounded-lg border border-gray-200 shrink-0">
                            #{index + 1}
                          </span>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Tuition Fee, Science Kits, Lunch Scheme"
                            value={item.name}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, name: e.target.value } : it))
                              )
                            }
                            className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-[#7a1228]"
                          />
                          <select
                            value={item.category}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) =>
                                  it.id === item.id ? { ...it, category: e.target.value as any } : it
                                )
                              )
                            }
                            className="bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 focus:outline-[#7a1228]"
                          >
                            <option value="TUITION">Tuition</option>
                            <option value="ASSESSMENT">Assessment / CBC</option>
                            <option value="ACTIVITY">Activity / Sports</option>
                            <option value="ADMISSION">Admission (One-Off)</option>
                            <option value="MEALS">Meals / Catering</option>
                            <option value="TRANSPORT">Transport</option>
                            <option value="BOARDING">Boarding</option>
                            <option value="OTHER">Other Levy</option>
                          </select>
                        </div>

                        {/* Annual Amount Box */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer pr-1">
                            <input
                              type="checkbox"
                              checked={item.isOptional}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, isOptional: e.target.checked } : it))
                                )
                              }
                              className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                            />
                            <span>Optional</span>
                          </label>

                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-300 shadow-2xs">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Annual KES:</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0.00"
                              value={item.annualAmount}
                              onChange={(e) => handleUpdateAnnualAmount(item.id, e.target.value)}
                              className="w-24 font-mono font-bold text-xs text-[#7a1228] text-right focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(item.id)}
                            title="Duplicate Line Item"
                            className="p-1 rounded-lg text-gray-400 hover:text-[#7a1228] hover:bg-white cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remove Line Item"
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Term Split Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5 border-t border-gray-200">
                        {/* Term 1 */}
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#7a1228]">Term 1</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {Number(item.term1) > 0 ? `KES ${Number(item.term1).toLocaleString()}` : '--'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="50"
                                value={item.term1Pct}
                                onChange={(e) => handleUpdateTermPercentage(item.id, 'term1', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold pr-5"
                                title="Term 1 Percentage"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[10px] text-gray-400 font-bold">%</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="0.00"
                                value={item.term1}
                                onChange={(e) => handleUpdateTermAmount(item.id, 'term1', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold pr-2 text-right"
                                title="Term 1 Amount (KES)"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Term 2 */}
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-amber-700">Term 2</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {Number(item.term2) > 0 ? `KES ${Number(item.term2).toLocaleString()}` : '--'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="30"
                                value={item.term2Pct}
                                onChange={(e) => handleUpdateTermPercentage(item.id, 'term2', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold pr-5"
                                title="Term 2 Percentage"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[10px] text-gray-400 font-bold">%</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="0.00"
                                value={item.term2}
                                onChange={(e) => handleUpdateTermAmount(item.id, 'term2', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold pr-2 text-right"
                                title="Term 2 Amount (KES)"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Term 3 */}
                        <div className="bg-white p-2.5 rounded-xl border border-gray-200 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-blue-700">Term 3</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {Number(item.term3) > 0 ? `KES ${Number(item.term3).toLocaleString()}` : '--'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="20"
                                value={item.term3Pct}
                                onChange={(e) => handleUpdateTermPercentage(item.id, 'term3', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold pr-5"
                                title="Term 3 Percentage"
                              />
                              <span className="absolute right-1.5 top-1.5 text-[10px] text-gray-400 font-bold">%</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="0.00"
                                value={item.term3}
                                onChange={(e) => handleUpdateTermAmount(item.id, 'term3', e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-1.5 text-xs font-mono font-bold pr-2 text-right"
                                title="Term 3 Amount (KES)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Item Bottom Badges */}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                        <span className="font-medium">
                          Line Sum: <strong className="text-gray-900 font-mono">{itemTotal > 0 ? `KES ${itemTotal.toLocaleString()}` : '--'}</strong>
                        </span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                            isItemBalanced ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          Split: {pctSum}% {isItemBalanced ? '✓' : '(Not 100%)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('basics')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Back to Basics</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-4 py-2 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <span>Preview Live Invoices</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFICATION & LIVE INVOICE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-gradient-to-br from-rose-50/70 to-amber-50/50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{title}</h4>
                    <p className="text-xs text-gray-500">
                      Grade: <span className="font-bold text-gray-800">{resolveGradeName(gradeLevel)}</span> · Due Date:{' '}
                      <span className="font-bold text-gray-800">{dueDate || 'Not set'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">Full Annual Billed</span>
                    <span className="font-mono font-bold text-lg text-[#7a1228]">
                      {fullAnnualTotal > 0 ? `KES ${fullAnnualTotal.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                    </span>
                  </div>
                </div>

                {/* Term Subtotal Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-rose-200 text-center shadow-2xs">
                    <span className="text-[11px] font-bold text-[#7a1228] uppercase block">Term 1 Invoice</span>
                    <span className="text-base font-mono font-bold text-gray-900 block mt-0.5">
                      {term1Subtotal > 0 ? `KES ${term1Subtotal.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {fullAnnualTotal > 0 ? Math.round((term1Subtotal / fullAnnualTotal) * 100) : 0}% of Annual
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 text-center shadow-2xs">
                    <span className="text-[11px] font-bold text-amber-700 uppercase block">Term 2 Invoice</span>
                    <span className="text-base font-mono font-bold text-gray-900 block mt-0.5">
                      {term2Subtotal > 0 ? `KES ${term2Subtotal.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {fullAnnualTotal > 0 ? Math.round((term2Subtotal / fullAnnualTotal) * 100) : 0}% of Annual
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-200 text-center shadow-2xs">
                    <span className="text-[11px] font-bold text-blue-700 uppercase block">Term 3 Invoice</span>
                    <span className="text-base font-mono font-bold text-gray-900 block mt-0.5">
                      {term3Subtotal > 0 ? `KES ${term3Subtotal.toLocaleString()}` : <span className="text-gray-400">KES --</span>}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {fullAnnualTotal > 0 ? Math.round((term3Subtotal / fullAnnualTotal) * 100) : 0}% of Annual
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Table Preview */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center text-[#7a1228]">Term 1 (KES)</th>
                      <th className="py-2.5 px-3 text-center text-amber-700">Term 2 (KES)</th>
                      <th className="py-2.5 px-3 text-center text-blue-700">Term 3 (KES)</th>
                      <th className="py-2.5 px-3 text-right text-gray-900">Annual (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it) => {
                      const t1 = Number(it.term1) || 0;
                      const t2 = Number(it.term2) || 0;
                      const t3 = Number(it.term3) || 0;
                      const tot = t1 + t2 + t3;
                      return (
                        <tr key={it.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-semibold text-gray-800">
                            {it.name || 'Untitled Line'}
                            {it.isOptional && (
                              <span className="ml-1 text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-normal">
                                Optional
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-gray-500">{it.category}</td>
                          <td className="py-2 px-3 text-center font-mono text-gray-700">{t1 > 0 ? `KES ${t1.toLocaleString()}` : '--'}</td>
                          <td className="py-2 px-3 text-center font-mono text-gray-700">{t2 > 0 ? `KES ${t2.toLocaleString()}` : '--'}</td>
                          <td className="py-2 px-3 text-center font-mono text-gray-700">{t3 > 0 ? `KES ${t3.toLocaleString()}` : '--'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                            {tot > 0 ? `KES ${tot.toLocaleString()}` : '--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50/90 font-bold border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-gray-800">
                        Total Annual Billed:
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[#7a1228]">
                        {term1Subtotal > 0 ? `KES ${term1Subtotal.toLocaleString()}` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-700">
                        {term2Subtotal > 0 ? `KES ${term2Subtotal.toLocaleString()}` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-700">
                        {term3Subtotal > 0 ? `KES ${term3Subtotal.toLocaleString()}` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#7a1228]">
                        {fullAnnualTotal > 0 ? `KES ${fullAnnualTotal.toLocaleString()}` : '--'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Navigation and Save */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Edit Lines</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSubmit()}
                  className="px-5 py-2.5 bg-[#7a1228] hover:bg-[#5c0a1a] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-60 transition-all"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Schedule...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Ratify & Save Annual Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Security Badge */}
        <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
            <span>Term Invoices Generated Automatically on Billing Cycles</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
