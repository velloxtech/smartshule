import React, { useState, useEffect } from 'react';
import { Student, CBCRubric, LearningArea, AssessmentRecord } from '../../types';
import { initialLearningAreas } from '../../data/mockData';

interface CBCFormativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  learningAreas?: LearningArea[];
  onSave?: (record: Omit<AssessmentRecord, 'id' | 'date'>) => void;
  onSaveAssessment?: (record: Omit<AssessmentRecord, 'id' | 'date'>) => void;
}

export const CBCFormativeModal: React.FC<CBCFormativeModalProps> = ({
  isOpen,
  onClose,
  students = [],
  initialStudent,
  learningAreas = initialLearningAreas,
  onSave,
  onSaveAssessment,
}) => {
  const [studentId, setStudentId] = useState<string>(
    initialStudent?.id || (students && students.length > 0 ? students[0].id : '')
  );
  const [learningArea, setLearningArea] = useState<string>(
    learningAreas && learningAreas.length > 0 ? learningAreas[0].name : 'Mathematics Activities'
  );
  const [strand, setStrand] = useState('Numbers & Operations');
  const [subStrand, setSubStrand] = useState('Fractions & Decimals in Real Life Contexts');
  const [rating, setRating] = useState<CBCRubric>('EE');
  const [evidence, setEvidence] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialStudent) {
      setStudentId(initialStudent.id);
    } else if (students && students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
  }, [initialStudent, students, isOpen]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === studentId) || initialStudent || students[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    const recordPayload = {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      admNo: currentStudent.admNo,
      grade: currentStudent.grade,
      learningArea,
      strand,
      subStrand,
      rating,
      evidence: evidence || 'Demonstrated consistent competency during practical group exercise.',
    };

    if (onSave) {
      onSave(recordPayload);
    }
    if (onSaveAssessment) {
      onSaveAssessment(recordPayload);
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const rubricButtons: { key: CBCRubric; label: string; desc: string; activeClass: string; color: string }[] = [
    {
      key: 'EE',
      label: 'Exceeding (EE)',
      desc: 'Mastery beyond expected standard',
      activeClass: 'bg-secondary text-white border-secondary',
      color: '#006a63',
    },
    {
      key: 'ME',
      label: 'Meeting (ME)',
      desc: 'Competently meets standard',
      activeClass: 'bg-primary text-white border-primary',
      color: '#00236f',
    },
    {
      key: 'AE',
      label: 'Approaching (AE)',
      desc: 'Progressing with teacher guidance',
      activeClass: 'bg-[#653400] text-white border-[#653400]',
      color: '#653400',
    },
    {
      key: 'BE',
      label: 'Below (BE)',
      desc: 'Urgent individual intervention required',
      activeClass: 'bg-error text-white border-error',
      color: '#ba1a1a',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-outline-variant/30">
        <div className="bg-[#00236f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">rule</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Record CBC Formative Rubric</h3>
              <p className="text-xs text-blue-200">KICD Competency Framework · 4-Level Assessment Scale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {saved ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-secondary mx-auto">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h4 className="font-bold text-lg text-on-surface">Assessment Recorded Successfully!</h4>
            <p className="text-xs text-on-surface-variant">
              Synchronized with school formative records and student portfolio.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Select Learner
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                >
                  {(students || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.grade} {s.stream})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Learning Area
                </label>
                <select
                  value={learningArea}
                  onChange={(e) => setLearningArea(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                >
                  {(learningAreas || []).map((la) => (
                    <option key={la.id} value={la.name}>
                      {la.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Strand
                </label>
                <input
                  type="text"
                  required
                  value={strand}
                  onChange={(e) => setStrand(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                  placeholder="e.g. Numbers & Operations"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Sub-Strand
                </label>
                <input
                  type="text"
                  required
                  value={subStrand}
                  onChange={(e) => setSubStrand(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                  placeholder="e.g. Fractions & Decimals"
                />
              </div>
            </div>

            {/* 4-Level Rubric Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1.5">
                CBC Rubric Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {rubricButtons.map((btn) => {
                  const isSelected = rating === btn.key;
                  return (
                    <button
                      key={btn.key}
                      type="button"
                      onClick={() => setRating(btn.key)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? btn.activeClass + ' shadow-md'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{btn.label}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-white/90' : 'text-on-surface-variant'
                        }`}
                      >
                        {btn.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Teacher Observation / Rubric Evidence
              </label>
              <textarea
                rows={2}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                placeholder="Learner demonstrated exceptional problem-solving and collaboration during tasks..."
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Save CBC Assessment</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
