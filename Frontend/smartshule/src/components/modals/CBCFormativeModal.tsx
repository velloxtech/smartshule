import React, { useState, useEffect } from 'react';
import { Student, CBCRubric, LearningArea, AssessmentRecord, BackendStrand, BackendSubStrand } from '../../types';
import { apiService } from '../../services/api';

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
  learningAreas = [],
  onSave,
  onSaveAssessment,
}) => {
  const [studentId, setStudentId] = useState<string>(
    initialStudent?.id || (students && students.length > 0 ? students[0].id : '')
  );
  
  const currentStudent = students.find((s) => s.id === studentId) || initialStudent || students[0];
  const studentGradeFormat = currentStudent?.gradeLevel || currentStudent?.grade?.toUpperCase().replace(' ', '_') || '';

  // ALL subjects are global now, no need to filter availableLearningAreas by grade!
  const availableLearningAreas = learningAreas;
  const [learningAreaId, setLearningAreaId] = useState<string>('');
  
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [strandId, setStrandId] = useState('');
  const [strandTitle, setStrandTitle] = useState('');
  
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [subStrandId, setSubStrandId] = useState('');
  const [subStrandTitle, setSubStrandTitle] = useState('');
  
  const [loadingStrands, setLoadingStrands] = useState(false);
  const [rating, setRating] = useState<CBCRubric>('ME');
  const [evidence, setEvidence] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialStudent) {
      setStudentId(initialStudent.id);
    } else if (students && students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
  }, [initialStudent, students, isOpen]);

  useEffect(() => {
    if (availableLearningAreas.length > 0 && !learningAreaId) {
      setLearningAreaId(availableLearningAreas[0].id);
    }
  }, [availableLearningAreas, learningAreaId]);

  // SMART DB FETCHING: Fetch only Strands belonging to the Global Subject AND the Learner's Grade
  useEffect(() => {
    if (!isOpen || !learningAreaId) {
      setStrands([]);
      setStrandId('');
      setStrandTitle('');
      return;
    }

    setLoadingStrands(true);
    // Notice we are passing the studentGradeFormat as the second parameter here!
    apiService.getStrandsByLearningArea(learningAreaId, studentGradeFormat)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setStrands(res.data);
          setStrandId(res.data[0].id);
          setStrandTitle(res.data[0].title);
        } else {
          setStrands([]);
          setStrandId('');
          setStrandTitle('');
        }
      })
      .catch(() => {
        setStrands([]);
        setStrandId('');
        setStrandTitle('');
      })
      .finally(() => setLoadingStrands(false));
  }, [learningAreaId, studentGradeFormat, isOpen]);

  useEffect(() => {
    if (!strandId || !isOpen) {
      setSubStrands([]);
      setSubStrandId('');
      setSubStrandTitle('');
      return;
    }

    apiService.getSubStrandsByStrand(strandId)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setSubStrands(res.data);
          setSubStrandId(res.data[0].id);
          setSubStrandTitle(res.data[0].title);
        } else {
          setSubStrands([]);
          setSubStrandId('');
          setSubStrandTitle('');
        }
      })
      .catch(() => {
        setSubStrands([]);
        setSubStrandId('');
        setSubStrandTitle('');
      });
  }, [strandId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    const selectedLa = availableLearningAreas.find(la => la.id === learningAreaId);

    const recordPayload = {
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      admNo: currentStudent.admNo,
      grade: currentStudent.grade,
      learningAreaId: learningAreaId,
      learningArea: selectedLa?.name || 'Subject',
      strandId: strandId,
      strand: strandTitle || strandId,
      subStrandId: subStrandId,
      subStrand: subStrandTitle || subStrandId,
      rating,
      evidence: evidence || 'Demonstrated expected competency level.',
    };

    if (onSave) onSave(recordPayload);
    if (onSaveAssessment) onSaveAssessment(recordPayload);

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[24px]">rule</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Record CBE Formative Rubric</h3>
              <p className="text-xs text-rose-100">KICD Competency Framework · 4-Level Assessment Scale</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {saved ? (
          <div className="p-8 text-center space-y-3 overflow-y-auto flex-1">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-secondary mx-auto">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h4 className="font-bold text-lg text-on-surface">Assessment Recorded Successfully!</h4>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Select Learner</label>
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary">
                  {(students || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Global Subject</label>
                <select value={learningAreaId} onChange={(e) => setLearningAreaId(e.target.value)} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary cursor-pointer">
                  {availableLearningAreas.map((la) => (
                    <option key={la.id} value={la.id}>{la.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Grade-Specific Strand</label>
                {loadingStrands ? (
                  <div className="p-2.5 text-xs text-on-surface-variant">Loading DB strands...</div>
                ) : strands.length > 0 ? (
                  <select value={strandId} onChange={(e) => { setStrandId(e.target.value); setStrandTitle(strands.find(s => s.id === e.target.value)?.title || ''); }} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary cursor-pointer truncate">
                    {strands.map(st => <option key={st.id} value={st.id}>{st.title}</option>)}
                  </select>
                ) : (
                  <div className="p-2.5 text-xs text-error font-medium bg-error/10 rounded-lg">No Strands for {currentStudent?.grade}</div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Sub-Strand</label>
                {subStrands.length > 0 ? (
                  <select value={subStrandId} onChange={(e) => { setSubStrandId(e.target.value); setSubStrandTitle(subStrands.find(s => s.id === e.target.value)?.title || ''); }} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary cursor-pointer truncate">
                    {subStrands.map(sub => <option key={sub.id} value={sub.id}>{sub.title}</option>)}
                  </select>
                ) : (
                  <div className="p-2.5 text-xs text-on-surface-variant bg-surface-container-low rounded-lg">-</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1.5">CBE Rubric Level</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'EE', label: 'Exceeding (EE)', desc: 'Mastery beyond expected standard', activeClass: 'bg-secondary text-white' },
                  { key: 'ME', label: 'Meeting (ME)', desc: 'Competently meets standard', activeClass: 'bg-primary text-white' },
                  { key: 'AE', label: 'Approaching (AE)', desc: 'Progressing with teacher guidance', activeClass: 'bg-[#653400] text-white' },
                  { key: 'BE', label: 'Below (BE)', desc: 'Urgent individual intervention required', activeClass: 'bg-error text-white' },
                ].map((btn) => {
                  const isSelected = rating === btn.key;
                  return (
                    <button key={btn.key} type="button" onClick={() => setRating(btn.key as any)} className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${isSelected ? btn.activeClass + ' shadow-md' : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'}`}>
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{btn.label}</span>
                        {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/90' : 'text-on-surface-variant'}`}>{btn.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Teacher Observation Evidence</label>
              <textarea rows={2} value={evidence} onChange={(e) => setEvidence(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary" placeholder="Learner demonstrated exceptional problem-solving..." />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 shrink-0 border-t border-outline-variant/20 mt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" disabled={strands.length === 0} className="px-5 py-2.5 bg-[#7a1228] text-white text-sm font-semibold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Save CBE Assessment</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};