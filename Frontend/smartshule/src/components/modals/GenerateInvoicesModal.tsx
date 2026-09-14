import React, { useState } from 'react';
import { apiService } from '../../services/api';

interface GenerateInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoicesGenerated: () => void;
}

export const GenerateInvoicesModal: React.FC<GenerateInvoicesModalProps> = ({
  isOpen,
  onClose,
  onInvoicesGenerated,
}) => {
  const [scope, setScope] = useState<'grade' | 'all'>('all');
  const [gradeLevel, setGradeLevel] = useState('GRADE_7');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await apiService.generateInvoices({
        schoolId: 'school-001',
        academicYearId: 'year-2026',
        termId: 'term-2026-1',
        gradeLevel: scope === 'grade' ? gradeLevel : undefined,
      });

      if (res.success) {
        setMessage('Term 1 invoices generated successfully!');
        setTimeout(() => {
          onInvoicesGenerated();
          onClose();
        }, 1000);
      } else {
        setError(res.message || 'Invoice generation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating invoices');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">receipt</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Generate Fee Invoices</h3>
              <p className="text-xs text-rose-100">Bulk billing automated by Grade or Whole School</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold">
              {message}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-2">
              Billing Target Scope
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'border-primary bg-primary-fixed/30 text-primary'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'
                }`}
              >
                Whole School (All Grades)
              </button>
              <button
                type="button"
                onClick={() => setScope('grade')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  scope === 'grade'
                    ? 'border-primary bg-primary-fixed/30 text-primary'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'
                }`}
              >
                Specific Grade
              </button>
            </div>
          </div>

          {scope === 'grade' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Select CBC Grade
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
          )}

          <div className="p-3 rounded-lg bg-surface-container-low text-xs text-on-surface-variant space-y-1">
            <span className="font-bold text-primary block">Billing Summary:</span>
            <div>Period: <strong>Year 2026 · Term 1</strong></div>
            <div>Invoices will automatically pull approved items from the corresponding fee structure.</div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>{isLoading ? 'Generating Invoices...' : 'Confirm & Generate Invoices'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
