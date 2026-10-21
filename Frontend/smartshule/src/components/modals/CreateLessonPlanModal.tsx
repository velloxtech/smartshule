import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClassRoom, StreamItem, BackendLearningArea, BackendStrand, BackendSubStrand } from '../../types';

interface CreateLessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (plan: any) => void;
}

export const CreateLessonPlanModal: React.FC<CreateLessonPlanModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated,
}) => {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassRoomId, setSelectedClassRoomId] = useState('');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState('');

  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [selectedStrandId, setSelectedStrandId] = useState('');
  const [strandTitle, setStrandTitle] = useState('');
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState('');
  const [subStrandTitle, setSubStrandTitle] = useState('');
  const [loadingStrands, setLoadingStrands] = useState(false);

  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMinutes] = useState(40);
  const [rollBoys, setRollBoys] = useState('0');
  const [rollGirls, setRollGirls] = useState('0');
  const [outcomes, setOutcomes] = useState('');
  const [inquiryQuestion, setInquiryQuestion] = useState('');
  const [resources, setResources] = useState('');
  const [extendedActivity, setExtendedActivity] = useState('');
  const [teacherReflection, setTeacherReflection] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      try {
        const [cRes, laRes] = await Promise.all([
          apiService.getClasses().catch(() => null),
          apiService.getLearningAreas().catch(() => null),
        ]);

        if (cRes?.data && Array.isArray(cRes.data) && cRes.data.length > 0) {
          setClasses(cRes.data);
          setSelectedClassRoomId(cRes.data[0].id);
        }

        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          setSelectedLearningAreaId(laRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    }
    loadOptions();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedClassRoomId) {
      setStreams([]);
      setSelectedStreamId('');
      return;
    }

    apiService.getStreamsByClass(selectedClassRoomId)
      .then((res) => {
        if (res?.success && res.data && res.data.length > 0) {
          setStreams(res.data);
          setSelectedStreamId(res.data[0].id);
        } else {
          setStreams([]);
          setSelectedStreamId('');
        }
      })
      .catch(() => { setStreams([]); setSelectedStreamId(''); });
  }, [selectedClassRoomId]);

  // SMART DB FETCHING: Fetch and strictly filter Strands by the Class Grade
  useEffect(() => {
    if (!isOpen || !selectedLearningAreaId || !selectedClassRoomId) {
      setStrands([]);
      setSelectedStrandId('');
      setStrandTitle('');
      return;
    }

    const selectedClass = classes.find(c => c.id === selectedClassRoomId);
    const classGradeFormat = selectedClass?.gradeLevel || '';

    setLoadingStrands(true);
    apiService.getStrandsByLearningArea(selectedLearningAreaId, classGradeFormat)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          // Strict frontend filter
          const gradeStrands = res.data.filter((st: any) => st.gradeLevel === classGradeFormat);
          setStrands(gradeStrands);
          
          if (gradeStrands.length > 0) {
            setSelectedStrandId(gradeStrands[0].id);
            setStrandTitle(gradeStrands[0].title);
          } else {
            setSelectedStrandId('');
            setStrandTitle('');
          }
        } else {
          setStrands([]);
          setSelectedStrandId('');
          setStrandTitle('');
        }
      })
      .catch(() => {
        setStrands([]);
        setSelectedStrandId('');
        setStrandTitle('');
      })
      .finally(() => setLoadingStrands(false));
  }, [selectedLearningAreaId, selectedClassRoomId, classes, isOpen]);

  useEffect(() => {
    if (!selectedStrandId || !isOpen) {
      setSubStrands([]);
      setSelectedSubStrandId('');
      setSubStrandTitle('');
      return;
    }

    apiService.getSubStrandsByStrand(selectedStrandId)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setSubStrands(res.data);
          setSelectedSubStrandId(res.data[0].id);
          setSubStrandTitle(res.data[0].title);
          
          if (res.data[0].specificLearningOutcomes?.length > 0 && !outcomes) {
            setOutcomes(res.data[0].specificLearningOutcomes.join('\n'));
          }
        } else {
          setSubStrands([]);
          setSelectedSubStrandId('');
          setSubStrandTitle('');
        }
      })
      .catch(() => {
        setSubStrands([]);
        setSelectedSubStrandId('');
        setSubStrandTitle('');
      });
  }, [selectedStrandId, isOpen]);

  useEffect(() => {
    if (!selectedClassRoomId) return;
    apiService.getStudents({ classroomId: selectedClassRoomId, streamId: selectedStreamId || undefined })
      .then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const boys = res.data.filter((s: any) => s.gender === 'MALE' || s.gender === 'Boy').length;
          const girls = res.data.filter((s: any) => s.gender === 'FEMALE' || s.gender === 'Girl').length;
          setRollBoys(String(boys));
          setRollGirls(String(girls));
        }
      }).catch(() => {});
  }, [selectedClassRoomId, selectedStreamId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!selectedClassRoomId || !selectedLearningAreaId) {
      setError('Please select a class and learning area');
      setIsLoading(false);
      return;
    }

    const teacherId = user?.id || '';
    const finalStrandTitle = strandTitle || strands.find(s => s.id === selectedStrandId)?.title || '';
    const finalSubStrandTitle = subStrandTitle || subStrands.find(s => s.id === selectedSubStrandId)?.title || '';

    const steps = [
      { stepNumber: 1, stepTitle: 'Introduction (5 mins)', durationMinutes: 5, teacherActivities: 'Introduces lesson outcomes and sets context through inquiry questions.', learnerActivities: 'Engage actively in answering initial review questions.' },
      { stepNumber: 2, stepTitle: 'Step 1: Concept Exploration (15 mins)', durationMinutes: 15, teacherActivities: 'Facilitates conceptual demonstration and guided explanation.', learnerActivities: 'Observe demonstration and explore key concepts collaboratively.' },
      { stepNumber: 3, stepTitle: 'Step 2: Practical Application (15 mins)', durationMinutes: 15, teacherActivities: 'Guides hands-on practical exercises and provides individual scaffolding.', learnerActivities: 'Carry out guided tasks and document observations.' },
      { stepNumber: 4, stepTitle: 'Conclusion & Summary (5 mins)', durationMinutes: 5, teacherActivities: 'Summarizes key takeaway learning points and gives formative feedback.', learnerActivities: 'Record key reflections and clean up learning stations.' },
    ];

    try {
      const res = await apiService.createLessonPlan({
        teacherId,
        learningAreaId: selectedLearningAreaId,
        classRoomId: selectedClassRoomId,
        streamId: selectedStreamId || undefined,
        lessonDate,
        durationMinutes,
        rollBoys: Number(rollBoys) || 0,
        rollGirls: Number(rollGirls) || 0,
        strand: finalStrandTitle.trim(),
        subStrand: finalSubStrandTitle.trim(),
        specificLearningOutcomes: [outcomes.trim()],
        keyInquiryQuestions: [inquiryQuestion.trim()],
        coreCompetenciesAddressed: ['CRITICAL_THINKING_AND_PROBLEM_SOLVING', 'DIGITAL_LITERACY'],
        valuesAddressed: ['RESPONSIBILITY', 'RESPECT'],
        learningResources: [resources.trim() || 'Textbooks, charts and digital tools'],
        steps,
        extendedActivity: extendedActivity.trim() || undefined,
        teacherSelfReflection: teacherReflection.trim() || undefined,
      });

      if (res.success && res.data) {
        onPlanCreated(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to create lesson plan');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating lesson plan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">timer</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Create 40-Min CBC Lesson Plan</h3>
              <p className="text-xs text-rose-100">Structured 4-step pedagogical plan with reflection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
          {error && <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Class *</label>
              <select value={selectedClassRoomId} onChange={(e) => setSelectedClassRoomId(e.target.value)} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Stream (Opt)</label>
              <select value={selectedStreamId} onChange={(e) => setSelectedStreamId(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer">
                <option value="">All Streams</option>
                {streams.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Global Subject *</label>
              <select value={selectedLearningAreaId} onChange={(e) => setSelectedLearningAreaId(e.target.value)} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer">
                {learningAreas.map((la) => <option key={la.id} value={la.id}>{la.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Curriculum Strand *</label>
              {loadingStrands ? (
                <div className="p-2 text-xs text-on-surface-variant">Loading DB strands...</div>
              ) : strands.length > 0 ? (
                <select value={selectedStrandId} onChange={(e) => { setSelectedStrandId(e.target.value); setStrandTitle(strands.find(s => s.id === e.target.value)?.title || ''); }} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary cursor-pointer truncate">
                  {strands.map(st => <option key={st.id} value={st.id}>{st.title}</option>)}
                </select>
              ) : (
                <div className="p-2 text-xs text-error bg-error/10 rounded-lg font-medium">No strands for this grade.</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Sub-strand *</label>
              {subStrands.length > 0 ? (
                <select value={selectedSubStrandId} onChange={(e) => { setSelectedSubStrandId(e.target.value); const selected = subStrands.find(s => s.id === e.target.value); if (selected) { setSubStrandTitle(selected.title); setOutcomes(selected.specificLearningOutcomes?.join('\n') || ''); } }} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary cursor-pointer truncate">
                  {subStrands.map(sub => <option key={sub.id} value={sub.id}>{sub.title}</option>)}
                </select>
              ) : (
                <div className="p-2 text-xs text-on-surface-variant">-</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Date *</label>
              <input type="date" required value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Roll (Boys)</label>
              <input type="number" min="0" value={rollBoys} onChange={(e) => setRollBoys(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Roll (Girls)</label>
              <input type="number" min="0" value={rollGirls} onChange={(e) => setRollGirls(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Specific Learning Outcome *</label>
            <input type="text" required placeholder="e.g. By the end of the lesson, learners should be able to..." value={outcomes} onChange={(e) => setOutcomes(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Key Inquiry Question *</label>
            <input type="text" required placeholder="e.g. How do we measure mass accurately?" value={inquiryQuestion} onChange={(e) => setInquiryQuestion(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Learning Resources</label>
            <input type="text" placeholder="e.g. Textbooks, charts, experimental apparatus" value={resources} onChange={(e) => setResources(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary" />
          </div>

          <div className="p-3 rounded-lg bg-surface-container-low space-y-1 text-xs border border-outline-variant/20">
            <span className="font-bold text-primary block">Integrated CBC 4-Step Development:</span>
            <div className="text-on-surface-variant">1. Intro (5m) · 2. Concept Exploration (15m) · 3. Practical Focus (15m) · 4. Conclusion (5m)</div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Extended Activity (Optional)</label>
            <input type="text" placeholder="e.g. Practice questions in exercise book" value={extendedActivity} onChange={(e) => setExtendedActivity(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Teacher Self-Reflection & Notes</label>
            <textarea rows={2} placeholder="Record pedagogical observations and reflections post-lesson..." value={teacherReflection} onChange={(e) => setTeacherReflection(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary" />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-[#7a1228] text-white text-sm font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">post_add</span>
              <span>{isLoading ? 'Creating Plan...' : 'Save Lesson Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};