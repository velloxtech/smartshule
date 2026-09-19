import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Student, BackendLearningArea, BackendStrand, BackendSubStrand, ClassRoom, StreamItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState<string>('');
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [selectedStrandId, setSelectedStrandId] = useState<string>('');
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<'SUMMATIVE' | 'FORMATIVE'>('SUMMATIVE');
  const [termId, setTermId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');

  // Class and Stream filters from DB
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterStreamId, setFilterStreamId] = useState<string>('');

  // Marks inputs
  const [rawScore, setRawScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('100');
  const [customRemarks, setCustomRemarks] = useState<string>('');
  const [isCustomRemarkEdited, setIsCustomRemarkEdited] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load students, learning areas, classes, and academic context from DB
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      try {
        const [stRes, laRes, ctxRes, yrRes, cRes] = await Promise.all([
          apiService.getStudents().catch(() => null),
          apiService.getLearningAreas().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getYears().catch(() => null),
          apiService.getClasses().catch(() => null),
        ]);

        if (cRes?.data && Array.isArray(cRes.data)) {
          setClasses(cRes.data);
        }

        if (ctxRes?.data) {
          if (ctxRes.data.currentYear?.id) setAcademicYearId(ctxRes.data.currentYear.id);
          if (ctxRes.data.currentTerm?.id) setTermId(ctxRes.data.currentTerm.id);
        } else if (yrRes?.data && yrRes.data.length > 0) {
          const currentYear = yrRes.data.find((y: any) => y.isCurrent) || yrRes.data[0];
          setAcademicYearId(currentYear.id);
          const tRes = await apiService.getTerms(currentYear.id).catch(() => null);
          if (tRes?.data && tRes.data.length > 0) {
            const currentTerm = tRes.data.find((t: any) => t.isCurrent) || tRes.data[0];
            setTermId(currentTerm.id);
          }
        }

        if (stRes?.data && Array.isArray(stRes.data)) {
          const mapped: Student[] = stRes.data.map((s: any) => ({
            id: s.id,
            admNo: s.admissionNumber,
            upi: s.upiNumber || 'NEMIS-PENDING',
            nemis: s.upiNumber || 'NEMIS-PENDING',
            name: `${s.firstName} ${s.lastName}`,
            gender: s.gender === 'FEMALE' ? 'Girl' : 'Boy',
            grade: s.gradeLevel ? s.gradeLevel.replace(/_/g, ' ') : 'CBC Grade',
            stream: s.stream?.name || s.streamName || (s.streamId ? s.streamId.replace('stream-', '').replace(/_/g, ' ') : ''),
            guardianName: s.guardian ? `${s.guardian.firstName} ${s.guardian.lastName}` : (s.emergencyContactName || 'N/A'),
            guardianPhone: s.guardian?.phone || s.emergencyContactPhone || 'N/A',
            feeBalance: s.feeBalance || 0,
            totalFee: s.totalFee || 0,
            attendanceRate: s.attendanceRate ?? 100,
            cbcRating: s.cbcRating || 'ME',
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

  // Fetch strands dynamically when learning area changes
  useEffect(() => {
    if (!selectedLearningAreaId) {
      setStrands([]);
      setSelectedStrandId('');
      return;
    }
    apiService
      .getStrandsByLearningArea(selectedLearningAreaId)
      .then((res) => {
        if (res?.success && res.data && res.data.length > 0) {
          setStrands(res.data);
          setSelectedStrandId(res.data[0].id);
        } else {
          setStrands([]);
          setSelectedStrandId('');
        }
      })
      .catch(() => {
        setStrands([]);
        setSelectedStrandId('');
      });
  }, [selectedLearningAreaId]);

  // Fetch sub-strands dynamically when strand changes
  useEffect(() => {
    if (!selectedStrandId) {
      setSubStrands([]);
      setSelectedSubStrandId('');
      return;
    }
    apiService
      .getSubStrandsByStrand(selectedStrandId)
      .then((res) => {
        if (res?.success && res.data && res.data.length > 0) {
          setSubStrands(res.data);
          setSelectedSubStrandId(res.data[0].id);
        } else {
          setSubStrands([]);
          setSelectedSubStrandId('');
        }
      })
      .catch(() => {
        setSubStrands([]);
        setSelectedSubStrandId('');
      });
  }, [selectedStrandId]);

  // Load streams when filter class changes
  useEffect(() => {
    if (!filterClassId) {
      setStreams([]);
      setFilterStreamId('');
      return;
    }
    apiService
      .getStreamsByClass(filterClassId)
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setStreams(res.data);
        } else {
          setStreams([]);
        }
      })
      .catch(() => setStreams([]));
  }, [filterClassId]);

  // Filter students by selected class and stream
  const filteredStudents = students.filter((s) => {
    if (filterClassId) {
      const cls = classes.find((c) => c.id === filterClassId);
      if (cls) {
        const gradeText = cls.gradeLevel.replace(/_/g, ' ').toLowerCase();
        const clsName = cls.name.toLowerCase();
        const sGrade = s.grade.toLowerCase();
        if (!sGrade.includes(gradeText) && !sGrade.includes(clsName)) {
          return false;
        }
      }
    }
    if (filterStreamId) {
      const stm = streams.find((st) => st.id === filterStreamId);
      if (stm && !s.stream.toLowerCase().includes(stm.name.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    if (filteredStudents.length > 0) {
      const exists = filteredStudents.some((s) => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    }
  }, [filterClassId, filterStreamId, filteredStudents, selectedStudentId]);

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

    if (!selectedLearningAreaId) {
      setError('Please select a valid learning area');
      setIsLoading(false);
      return;
    }

    if (assessmentType === 'FORMATIVE' && !selectedSubStrandId) {
      setError('Please select a valid sub-strand for formative assessment. If none exist in the database, please define strands & sub-strands in the curriculum manager.');
      setIsLoading(false);
      return;
    }

    const teacherId = user?.id || '';

    try {
      if (assessmentType === 'SUMMATIVE') {
        const payload = {
          studentId: selectedStudentId,
          teacherId,
          learningAreaId: selectedLearningAreaId,
          termId,
          academicYearId,
          strandScores: selectedStrandId
            ? [
                {
                  strandId: selectedStrandId,
                  performanceLevel,
                  rawScore: numScore,
                  maxScore: numMax,
                },
              ]
            : [],
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
          teacherId,
          learningAreaId: selectedLearningAreaId,
          subStrandId: selectedSubStrandId,
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

          {/* Class & Stream Filters Loaded from Database */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Filter Learners by Class & Stream (Live DB)
              </span>
              <span className="text-[10px] text-slate-500">
                {filteredStudents.length} of {students.length} Learners
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-primary"
                >
                  <option value="">-- All Classes --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gradeLevel.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={filterStreamId}
                  onChange={(e) => setFilterStreamId(e.target.value)}
                  disabled={!filterClassId}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-primary disabled:opacity-50"
                >
                  <option value="">
                    {!filterClassId
                      ? '-- Select Class First --'
                      : streams.length === 0
                      ? '-- No Streams Found --'
                      : '-- All Streams --'}
                  </option>
                  {streams.map((st) => (
                    <option key={st.id} value={st.id}>
                      Stream: {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

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
              {filteredStudents.length === 0 ? (
                <option value="">
                  {students.length === 0 ? 'No learners found in database' : 'No learners match selected class/stream filter'}
                </option>
              ) : (
                filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admNo}) · {s.grade} {s.stream}
                  </option>
                ))
              )}
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
                {learningAreas.length === 0 ? (
                  <option value="">No learning areas found</option>
                ) : (
                  learningAreas.map((la) => (
                    <option key={la.id} value={la.id}>
                      {la.name} ({la.code})
                    </option>
                  ))
                )}
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

          {/* Dynamic Strands & Sub-Strands */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-on-surface-variant uppercase mb-1">
                Curriculum Strand {assessmentType === 'FORMATIVE' ? '*' : '(Optional)'}
              </label>
              <select
                value={selectedStrandId}
                onChange={(e) => setSelectedStrandId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-on-surface"
              >
                {strands.length === 0 ? (
                  <option value="">No strands defined for this subject</option>
                ) : (
                  <>
                    <option value="">Select Strand</option>
                    {strands.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.code ? `[${st.code}] ` : ''}{st.title}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {assessmentType === 'FORMATIVE' && (
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">
                  Sub-Strand *
                </label>
                <select
                  value={selectedSubStrandId}
                  onChange={(e) => setSelectedSubStrandId(e.target.value)}
                  required
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-on-surface"
                >
                  {subStrands.length === 0 ? (
                    <option value="">No sub-strands defined</option>
                  ) : (
                    <>
                      <option value="">Select Sub-Strand</option>
                      {subStrands.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code ? `[${sub.code}] ` : ''}{sub.title}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            )}
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
