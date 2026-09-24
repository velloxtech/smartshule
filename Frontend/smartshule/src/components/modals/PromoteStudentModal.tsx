import React, { useState, useEffect } from 'react';
import { Student, AcademicYear, AcademicTerm } from '../../types';
import { apiService } from '../../services/api';

interface PromoteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  selectedStudents?: Student[];
  onPromoted: (result: any) => void;
}

const CBC_PROGRESSION: Record<string, string> = {
  PLAYGROUP: 'PP1',
  PP1: 'PP2',
  PP2: 'GRADE_1',
  GRADE_1: 'GRADE_2',
  GRADE_2: 'GRADE_3',
  GRADE_3: 'GRADE_4',
  GRADE_4: 'GRADE_5',
  GRADE_5: 'GRADE_6',
  GRADE_6: 'GRADE_7',
  GRADE_7: 'GRADE_8',
  GRADE_8: 'GRADE_9',
  GRADE_9: 'SENIOR_1',
  SENIOR_1: 'SENIOR_2',
  SENIOR_2: 'SENIOR_3',
  SENIOR_3: 'GRADUATED',
};

const ALL_GRADES = [
  { value: 'PLAYGROUP', label: 'Playgroup' },
  { value: 'PP1', label: 'PP1' },
  { value: 'PP2', label: 'PP2' },
  { value: 'GRADE_1', label: 'Grade 1' },
  { value: 'GRADE_2', label: 'Grade 2' },
  { value: 'GRADE_3', label: 'Grade 3' },
  { value: 'GRADE_4', label: 'Grade 4' },
  { value: 'GRADE_5', label: 'Grade 5' },
  { value: 'GRADE_6', label: 'Grade 6' },
  { value: 'GRADE_7', label: 'Grade 7 (JSS)' },
  { value: 'GRADE_8', label: 'Grade 8 (JSS)' },
  { value: 'GRADE_9', label: 'Grade 9 (JSS)' },
  { value: 'SENIOR_1', label: 'Senior 1' },
  { value: 'SENIOR_2', label: 'Senior 2' },
  { value: 'SENIOR_3', label: 'Senior 3' },
  { value: 'GRADUATED', label: 'Graduated / Alumni' },
];

function normalizeGrade(grade: string | undefined): string {
  if (!grade) return 'GRADE_7';
  const clean = grade.toUpperCase().replace(/\s+/g, '_');
  if (clean.startsWith('GRADE')) return clean;
  if (clean.startsWith('PP')) return clean;
  if (clean.includes('PLAYGROUP')) return 'PLAYGROUP';
  return clean;
}

export const PromoteStudentModal: React.FC<PromoteStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  selectedStudents = [],
  onPromoted,
}) => {
  const isBulk = !student && selectedStudents.length > 0;
  const currentGrade = student ? normalizeGrade(student.grade) : (selectedStudents.length > 0 ? normalizeGrade(selectedStudents[0].grade) : 'GRADE_7');
  const defaultNextGrade = CBC_PROGRESSION[currentGrade] || 'GRADE_8';

  const [targetGradeLevel, setTargetGradeLevel] = useState(defaultNextGrade);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [availableStreams, setAvailableStreams] = useState<{ id: string; name: string }[]>([]);
  const [targetStreamId, setTargetStreamId] = useState('');
  const [carryForwardBalance, setCarryForwardBalance] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Total balance computation
  const totalOutstandingBalance = student
    ? (student.feeBalance || 0)
    : selectedStudents.reduce((acc, s) => acc + (s.feeBalance || 0), 0);

  useEffect(() => {
    if (!isOpen) return;
    setTargetGradeLevel(defaultNextGrade);
    setError(null);
    setSuccess(null);
    setCarryForwardBalance(true);

    async function loadAcademicData() {
      try {
        const [contextRes, yearsRes, classesRes] = await Promise.all([
          apiService.getCurrentContext().catch(() => null),
          apiService.getYears().catch(() => null),
          apiService.getClasses().catch(() => null),
        ]);

        if (yearsRes?.success && yearsRes.data && yearsRes.data.length > 0) {
          setAcademicYears(yearsRes.data);
          const activeYear = contextRes?.data?.currentYear || yearsRes.data.find(y => y.isCurrent) || yearsRes.data[0];
          setSelectedYearId(activeYear.id);

          const termsRes = await apiService.getTerms(activeYear.id);
          if (termsRes?.success && termsRes.data) {
            setTerms(termsRes.data);
            const activeTerm = contextRes?.data?.currentTerm || termsRes.data.find(t => t.isCurrent) || termsRes.data[0];
            if (activeTerm) setSelectedTermId(activeTerm.id);
          }
        }

        if (classesRes?.success && classesRes.data) {
          const matchedClass = classesRes.data.find(c => c.gradeLevel === defaultNextGrade);
          if (matchedClass) {
            const streamsRes = await apiService.getStreamsByClass(matchedClass.id);
            if (streamsRes?.success && streamsRes.data) {
              setAvailableStreams(streamsRes.data.map(st => ({ id: st.id, name: st.name })));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load academic data for promotion:', err);
      }
    }
    loadAcademicData();
  }, [isOpen, defaultNextGrade]);

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    try {
      const res = await apiService.getTerms(yearId);
      if (res.success && res.data) {
        setTerms(res.data);
        if (res.data.length > 0) setSelectedTermId(res.data[0].id);
        else setSelectedTermId('');
      }
    } catch {
      setTerms([]);
      setSelectedTermId('');
    }
  };

  const handleGradeChange = async (newGrade: string) => {
    setTargetGradeLevel(newGrade);
    setTargetStreamId('');
    try {
      const classesRes = await apiService.getClasses();
      if (classesRes.success && classesRes.data) {
        const matchedClass = classesRes.data.find(c => c.gradeLevel === newGrade);
        if (matchedClass) {
          const streamsRes = await apiService.getStreamsByClass(matchedClass.id);
          if (streamsRes.success && streamsRes.data) {
            setAvailableStreams(streamsRes.data.map(st => ({ id: st.id, name: st.name })));
            return;
          }
        }
      }
      setAvailableStreams([]);
    } catch {
      setAvailableStreams([]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isBulk) {
        const studentIds = selectedStudents.map(s => s.id);
        const res = await apiService.promoteStudentsBulk({
          studentIds,
          targetGradeLevel,
          targetAcademicYearId: selectedYearId || undefined,
          targetTermId: selectedTermId || undefined,
          targetStreamId: targetStreamId || undefined,
          carryForwardBalance,
        });

        if (res.success) {
          setSuccess(res.message || `Successfully promoted ${res.data?.promotedCount || studentIds.length} learner(s).`);
          setTimeout(() => {
            onPromoted(res.data);
            onClose();
          }, 1200);
        } else {
          setError(res.message || 'Failed to promote learners');
        }
      } else if (student) {
        const res = await apiService.promoteStudent(student.id, {
          targetGradeLevel,
          targetAcademicYearId: selectedYearId || undefined,
          targetTermId: selectedTermId || undefined,
          targetStreamId: targetStreamId || undefined,
          carryForwardBalance,
        });

        if (res.success) {
          setSuccess(res.message || `Successfully promoted ${student.name} to ${targetGradeLevel}.`);
          setTimeout(() => {
            onPromoted(res.data);
            onClose();
          }, 1200);
        } else {
          setError(res.message || 'Failed to promote learner');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while promoting learner');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">upgrade</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                {isBulk ? `Bulk Promote Learners (${selectedStudents.length})` : 'Promote Learner'}
              </h3>
              <p className="text-xs text-rose-100">
                {isBulk
                  ? `Cohort promotion for ${selectedStudents.length} selected learners`
                  : `Advance ${student?.name} (Adm: ${student?.admNo}) to next grade`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs sm:text-sm">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {/* Current vs Target Grade Summary Card */}
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex items-center justify-between gap-3">
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                Current Level
              </span>
              <div className="text-sm font-bold text-on-surface">
                {isBulk ? `${selectedStudents.length} Learners (${currentGrade.replace('_', ' ')})` : (student?.grade || currentGrade)}
              </div>
              <span className="text-[11px] text-outline">
                {isBulk ? 'Multi-student batch' : (student?.stream ? `${student.stream} Stream` : 'Standard Cohort')}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </div>

            <div className="flex-1 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-1">
                Target Progression
              </span>
              <div className="text-sm font-bold text-primary">
                {targetGradeLevel.replace('_', ' ')}
              </div>
              <span className="text-[11px] text-outline">
                {targetGradeLevel === 'GRADUATED' ? 'Mark as Graduated' : 'Next CBC Stage'}
              </span>
            </div>
          </div>

          {/* Target Grade Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Target CBC Grade Level
            </label>
            <select
              value={targetGradeLevel}
              onChange={(e) => handleGradeChange(e.target.value)}
              required
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary font-medium"
            >
              {ALL_GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label} {g.value === defaultNextGrade ? '(Next CBC Grade)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Target Academic Year & Term */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Target Academic Year
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
              >
                {academicYears.length > 0 ? (
                  academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '(Active)' : ''}
                    </option>
                  ))
                ) : (
                  <option value="">Default (2026)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Target Term
              </label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
              >
                {terms.length > 0 ? (
                  terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <option value="">Term 1</option>
                )}
              </select>
            </div>
          </div>

          {/* Stream Assignment */}
          {availableStreams.length > 0 && targetGradeLevel !== 'GRADUATED' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Target Stream (Optional)
              </label>
              <select
                value={targetStreamId}
                onChange={(e) => setTargetStreamId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
              >
                <option value="">-- Keep Current / Automatic Cohort --</option>
                {availableStreams.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} Stream
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fee Balance Carry-Forward Section */}
          <div className="border border-outline-variant/30 rounded-xl p-3.5 bg-surface-container-lowest space-y-2.5">
            <div className="flex items-start gap-3">
              <input
                id="carryForwardCheckbox"
                type="checkbox"
                checked={carryForwardBalance}
                onChange={(e) => setCarryForwardBalance(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-outline-variant/50 cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="carryForwardCheckbox" className="font-semibold text-on-surface block cursor-pointer text-xs">
                  Carry Forward Outstanding Balance into Next Grade Invoice
                </label>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  When enabled, any unpaid balance will be rolled over as an arrears line item on the target grade invoice, and prior invoices will be ratified as carried forward.
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between text-xs font-medium">
              <span className="text-on-surface-variant">Outstanding Arrears:</span>
              <span className={`font-data-mono font-bold ${totalOutstandingBalance > 0 ? 'text-error' : 'text-secondary'}`}>
                {totalOutstandingBalance > 0
                  ? `KES ${totalOutstandingBalance.toLocaleString()}`
                  : 'KES 0 (Fully Cleared)'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isLoading ? 'sync' : 'upgrade'}
              </span>
              <span>
                {isLoading
                  ? 'Promoting...'
                  : isBulk
                  ? `Promote ${selectedStudents.length} Learners`
                  : 'Confirm Promotion'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
