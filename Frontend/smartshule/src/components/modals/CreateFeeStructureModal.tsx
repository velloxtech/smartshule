import React, { useState } from 'react';
import { apiService } from '../../services/api';

interface CreateFeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (structure: any) => void;
}

export const CreateFeeStructureModal: React.FC<CreateFeeStructureModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [gradeLevel, setGradeLevel] = useState('GRADE_7');
  const [title, setTitle] = useState('Grade 7 Junior Secondary - Term 1 Fee Structure');
  const [dueDate, setDueDate] = useState('2026-01-31');
  const [tuition, setTuition] = useState('25000');
  const [assessment, setAssessment] = useState('6000');
  const [activity, setActivity] = useState('2500');
  const [lunch, setLunch] = useState('8500');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const items = [
      { name: 'Tuition Fee', amount: Number(tuition), isOptional: false, category: 'TUITION' as const },
      { name: 'CBC Assessment & Science Kits', amount: Number(assessment), isOptional: false, category: 'ASSESSMENT' as const },
      { name: 'Activity & Co-Curricular Levy', amount: Number(activity), isOptional: false, category: 'ACTIVITY' as const },
      { name: 'Hot Lunch Programme', amount: Number(lunch), isOptional: true, category: 'MEALS' as const },
    ].filter((item) => item.amount > 0);

    try {
      const res = await apiService.createFeeStructure({
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId: 'term-2026-1',
        gradeLevel,
        title,
        dueDate,
        items,
      });

      if (res.success && res.data) {
        onCreated(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to create fee structure');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating fee structure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Create Fee Structure</h3>
              <p className="text-xs text-blue-200">Itemized billing ratified for CBC Grade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Structure Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                CBC Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
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
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div className="border-t border-surface-container pt-3 space-y-2.5">
            <span className="text-xs font-bold text-primary block uppercase">Itemized Line Amounts (KES)</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-0.5">Tuition (Mandatory)</label>
                <input
                  type="number"
                  required
                  value={tuition}
                  onChange={(e) => setTuition(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-0.5">CBC Kits (Mandatory)</label>
                <input
                  type="number"
                  required
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-0.5">Activity Levy</label>
                <input
                  type="number"
                  required
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-0.5">Lunch (Optional)</label>
                <input
                  type="number"
                  value={lunch}
                  onChange={(e) => setLunch(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>{isLoading ? 'Saving...' : 'Save Fee Structure'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
