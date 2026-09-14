import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Student, BackendLearningArea } from '../../types';

interface UploadMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarksUploaded?: () => void;
  initialStudent?: Student;
}

export const UploadMarksModal: React.FC<UploadMarksModalProps> = ({
  isOpen,
  onClose,
  onMarksUploaded,
  initialStudent,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<'SUMMATIVE' | 'FORMATIVE'>('SUMMATIVE');
  const [termId, setTermId] = useState('term-2026-1');
  const [academicYearId, setAcademicYearId] = useState('year-2026');

  // Marks inputs
  const [rawScore, setRawScore] = useState<string>('60');
  const [maxScore, setMaxScore] = useState<string>('100');
  const [customRemarks, setCustomRemarks] = useState<string>('');
  const [isCustomRemarkEdited, setIsCustomRemarkEdited] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load students and learning areas from DB
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      try {
        const [stRes, laRes] = await Promise.all([
          apiService.getStudents(),
          apiService.getLearningAreas(),
        ]);

        if (stRes?.data && Array.isArray(stRes.data)) {
          const mapped: Student[] = stRes.data.map((s: any) => ({
            id: s.id,
            admNo: s.admissionNumber,
            upi: s.upiNumber || 'NEMIS-PENDING',
            nemis: s.upiNumber || 'NEMIS-PENDING',
            name: `${s.firstName} ${s.lastName}`,
            gender: s.gender === 'FEMALE' ? 'Girl' : 'Boy',
            grade: s.gradeLevel ? s.gradeLevel.replace('_', ' ') : 'Grade 7',
            stream: s.streamId ? s.streamId.replace('stream-g7-', '').toUpperCase() : 'East',
            guardianName: s.guardian ? `${s.guardian.firstName} ${s.guardian.lastName}` : 'Guardian',
            guardianPhone: s.guardian?.phone || '+254700000000',
            feeBalance: 0,
            totalFee: 0,
            attendanceRate: 98,
            cbcRating: 'ME',
            status: s.status === 'ACTIVE' ? 'Active' : s.status,
          }));
          setStudents(mapped);
          if (initialStudent?.id) {
            setSelectedStudentId(initialStudent.id);
          } else if (mapped.length > 0) {
            setSelectedStudentId(mapped[0].id);
          }
        }

        if (laRes?.data && Array.isArray(laRes.data)) {
          setLearningAreas(laRes.data);
          if (laRes.data.length > 0) {
            setSelectedLearningAreaId(laRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data for grading modal:', err);
      }
    }

    loadData();
  }, [isOpen, initialStudent]);

  // CBC Standard Dynamic Evaluation Engine
  const numScore = parseFloat(rawScore) || 0;
  const numMax = parseFloat(maxScore) || 100;
  const percentage = numMax > 0 ? Math.round((numScore / numMax) * 100) : 0;

  let performanceLevel: 'EE' | 'ME' | 'AE' | 'BE' = 'BE';
  let levelTitle = 'Below Expectations (BE)';
  let levelBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
  let standardCbcRemark = '';

  if (percentage >= 80) {
    performanceLevel = 'EE';
    levelTitle = 'Exceeding Expectations (EE) - Level 4';
    levelBadgeColor = 'bg-teal-100 text-teal-900 border-teal-300';
    standardCbcRemark = 'Exceeds expected curriculum competencies. Demonstrates exemplary conceptual understanding, high accuracy, creative problem solving, and independent application.';
  } else if (percentage >= 60) {
    performanceLevel = 'ME';
    levelTitle = 'Meeting Expectations (ME) - Level 3';
    levelBadgeColor = 'bg-[#7a1228]/15 text-[#7a1228] border-[#7a1228]/30';
    standardCbcRemark = 'Meets expected CBC learning competencies effectively. Demonstrates solid conceptual comprehension, consistent application of skills, and required task completion.';
  } else if (percentage >= 40) {
    performanceLevel = 'AE';
    levelTitle = 'Approaching Expectations (AE) - Level 2';
    levelBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
    standardCbcRemark = 'Approaching expected learning competencies. Grasps basic principles and concepts but benefits from guided teacher practice, scaffolding, and reinforced exercises.';
  } else {
    performanceLevel = 'BE';
    levelTitle = 'Below Expectations (BE) - Level 1';
    levelBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
    standardCbcRemark = 'Below expected competency level. Requires structured scaffolding, intensive teacher remediation, and personalized interventions to master foundational learning outcomes.';
  }

  // Update remarks default if not manually overridden
  const activeRemarks = isCustomRemarkEdited ? customRemarks : standardCbcRemark;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      setError('Please select a valid learner');
      setIsLoading(false);
      return;
    }

    try {
      if (assessmentType === 'SUMMATIVE') {
        const payload = {
          studentId: selectedStudentId,
          teacherId: 'teacher-001',
          learningAreaId: selectedLearningAreaId || 'la-science-7',
          termId,
          academicYearId,
          strandScores: [
            {
              strandId: 'strand-scie-01',
              performanceLevel,
              rawScore: numScore,
              maxScore: numMax,
            },
          ],
          overallPerformanceLevel: performanceLevel,
          teacherRemarks: activeRemarks,
          evaluationDate: new Date().toISOString().split('T')[0],
        };

        const res = await apiService.recordSummativeAssessment(payload);
        if (res.success) {
          setSuccessMessage(`Marks uploaded successfully! Recorded as ${performanceLevel} (${percentage}%) according to CBC standards.`);
          setTimeout(() => {
            onMarksUploaded?.();
            onClose();
          }, 1800);
        }
      } else {
        const payload = {
          studentId: selectedStudentId,
          teacherId: 'teacher-001',
          learningAreaId: selectedLearningAreaId || 'la-science-7',
          subStrandId: 'substrand-scie-01',
          termId,
          academicYearId,
          assessmentDate: new Date().toISOString().split('T')[0],
          assessmentMethod: 'PRACTICAL_OBSERVATION',
          performanceLevel,
          specificOutcomeTested: 'Competency mastery evaluation',
          teacherRemarks: activeRemarks,
          evidenceNotes: `Score: ${numScore}/${numMax} (${percentage}%)`,
          targetedCompetencies: ['CRITICAL_THINKING_AND_PROBLEM_SOLVING'],
          valuesObserved: ['INTEGRITY', 'RESPONSIBILITY'],
        };

        const res = await apiService.recordFormativeAssessment(payload);
        if (res.success) {
          setSuccessMessage(`Formative evaluation recorded successfully as ${performanceLevel}!`);
          setTimeout(() => {
            onMarksUploaded?.();
            onClose();
          }, 1800);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record CBC marks');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentLearner = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Maroon Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">grade</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Upload Marks & CBC Rubric</h3>
              <p className="text-xs text-rose-100">Evaluates remarks according to KICD CBC standards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-secondary/15 border border-secondary/30 text-secondary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Select Learner */}
          <div>
            <label className="block font-bold text-on-surface-variant uppercase mb-1">
              Select Learner
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 font-semibold text-on-surface"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.admNo}) · {s.grade} {s.stream}
                </option>
              ))}
            </select>
            {currentLearner && (
              <p className="text-[11px] text-on-surface-variant mt-1">
                UPI: <span className="font-data-mono font-semibold">{currentLearner.upi}</span> · Emergency Contact: {currentLearner.guardianName} ({currentLearner.guardianPhone})
              </p>
            )}
          </div>

          {/* Learning Area & Assessment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Learning Area
              </label>
              <select
                value={selectedLearningAreaId}
                onChange={(e) => setSelectedLearningAreaId(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-on-surface"
              >
                {learningAreas.map((la) => (
                  <option key={la.id} value={la.id}>
                    {la.name} ({la.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Evaluation Type
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-on-surface font-semibold"
              >
                <option value="SUMMATIVE">Summative (Term Exam / Assessment)</option>
                <option value="FORMATIVE">Formative (Continuous Outcome)</option>
              </select>
            </div>
          </div>

          {/* Numerical Marks Entry */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-primary">
                Learner Numerical Marks
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium">
                KICD Rubric Conversion
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  Marks Scored (Score)
                </label>
                <input
                  type="number"
                  min="0"
                  max={numMax}
                  step="1"
                  required
                  value={rawScore}
                  onChange={(e) => {
                    setRawScore(e.target.value);
                    setIsCustomRemarkEdited(false);
                  }}
                  placeholder="e.g. 60"
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2.5 text-base font-bold font-data-mono text-on-surface"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  Out Of (Max Score)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={maxScore}
                  onChange={(e) => {
                    setMaxScore(e.target.value);
                    setIsCustomRemarkEdited(false);
                  }}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2.5 text-base font-bold font-data-mono text-on-surface"
                />
              </div>
            </div>

            {/* Dynamic CBC Live Evaluation Result */}
            <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${levelBadgeColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-data-mono">{percentage}%</span>
                  <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-white/70">
                    {performanceLevel}
                  </span>
                </div>
                <span className="font-bold text-xs">{levelTitle}</span>
              </div>
              <p className="text-[11px] leading-relaxed italic">
                "{standardCbcRemark}"
              </p>
            </div>
          </div>

          {/* Teacher CBC Evaluated Pedagogical Remarks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-on-surface-variant uppercase">
                Evaluated Pedagogical Remarks
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomRemarkEdited(false);
                  setCustomRemarks('');
                }}
                className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
              >
                Reset to CBC Standard
              </button>
            </div>
            <textarea
              rows={3}
              required
              value={activeRemarks}
              onChange={(e) => {
                setCustomRemarks(e.target.value);
                setIsCustomRemarkEdited(true);
              }}
              placeholder="Enter or customize CBC remarks..."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface leading-relaxed"
            />
            <p className="text-[10px] text-on-surface-variant mt-1">
              Remarks are automatically pre-filled to match KICD National CBC benchmarks for <strong className="font-bold">{performanceLevel}</strong>.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#7a1228] text-white font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isLoading ? 'Saving Evaluation...' : 'Save CBC Marks & Evaluated Remarks'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
