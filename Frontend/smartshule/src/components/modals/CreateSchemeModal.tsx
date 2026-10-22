import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClassRoom, StreamItem, BackendLearningArea, AcademicYear, AcademicTerm, BackendStrand, BackendSubStrand } from '../../types';

interface CreateSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchemeCreated: (scheme: any) => void;
}

export const CreateSchemeModal: React.FC<CreateSchemeModalProps> = ({
  isOpen,
  onClose,
  onSchemeCreated,
}) => {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassRoomId, setSelectedClassRoomId] = useState('');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState('');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [selectedStrandId, setSelectedStrandId] = useState('');
  const [strandTitle, setStrandTitle] = useState('');
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState('');
  const [subStrandTitle, setSubStrandTitle] = useState('');
  const [loadingStrands, setLoadingStrands] = useState(false);

  const [title, setTitle] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [questions, setQuestions] = useState('');
  const [experiences, setExperiences] = useState('');
  const [resources, setResources] = useState('');
  const [methods, setMethods] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      try {
        const [cRes, laRes, ctxRes, yrRes] = await Promise.all([
          apiService.getClasses().catch(() => null),
          apiService.getLearningAreas().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getYears().catch(() => null),
        ]);

        if (cRes?.data && Array.isArray(cRes.data) && cRes.data.length > 0) {
          setClasses(cRes.data);
          setSelectedClassRoomId(cRes.data[0].id);
        }

        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          setSelectedLearningAreaId(laRes.data[0].id);
        }

        if (yrRes?.data && Array.isArray(yrRes.data) && yrRes.data.length > 0) {
          setAcademicYears(yrRes.data);
          const currentYear = ctxRes?.data?.currentYear || yrRes.data.find((y: any) => y.isCurrent) || yrRes.data[0];
          setSelectedYearId(currentYear.id);

          const tRes = await apiService.getTerms(currentYear.id).catch(() => null);
          if (tRes?.data && Array.isArray(tRes.data) && tRes.data.length > 0) {
            setTerms(tRes.data);
            const currentTerm = ctxRes?.data?.currentTerm || tRes.data.find((t: any) => t.isCurrent) || tRes.data[0];
            setSelectedTermId(currentTerm.id);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    }
    loadData();
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
      }).catch(() => { setStreams([]); setSelectedStreamId(''); });
  }, [selectedClassRoomId]);

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    try {
      const res = await apiService.getTerms(yearId);
      if (res?.success && res.data && res.data.length > 0) {
        setTerms(res.data);
        setSelectedTermId(res.data[0].id);
      } else {
        setTerms([]);
        setSelectedTermId('');
      }
    } catch {
      setTerms([]);
      setSelectedTermId('');
    }
  };

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
          // Strict frontend filter ensuring strands belong to the selected class grade
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const teacherId = user?.id || '';
    if (!teacherId) {
      setError('Authenticated educator profile required to create scheme of work');
      setIsLoading(false);
      return;
    }

    if (!selectedClassRoomId || !selectedLearningAreaId || !selectedYearId || !selectedTermId) {
      setError('Please ensure class, learning area, year, and term are selected');
      setIsLoading(false);
      return;
    }

    const finalStrandTitle = strandTitle || strands.find(s => s.id === selectedStrandId)?.title || '';
    const finalSubStrandTitle = subStrandTitle || subStrands.find(s => s.id === selectedSubStrandId)?.title || '';

    try {
      const res = await apiService.createScheme({
        teacherId,
        learningAreaId: selectedLearningAreaId,
        classRoomId: selectedClassRoomId,
        streamId: selectedStreamId || undefined,
        academicYearId: selectedYearId,
        termId: selectedTermId,
        title: title.trim() || `${learningAreas.find(la => la.id === selectedLearningAreaId)?.name} Scheme`,
        entries: [
          {
            weekNumber: 1,
            lessonNumber: 1,
            strandId: selectedStrandId || undefined,
            strandTitle: finalStrandTitle.trim(),
            subStrandId: selectedSubStrandId || undefined,
            subStrandTitle: finalSubStrandTitle.trim(),
            specificLearningOutcomes: outcomes.split('\n').map((s) => s.trim()).filter(Boolean),
            keyInquiryQuestions: questions.split('\n').map((s) => s.trim()).filter(Boolean),
            learningExperiences: experiences.split('\n').map((s) => s.trim()).filter(Boolean),
            learningResources: resources.split('\n').map((s) => s.trim()).filter(Boolean),
            assessmentMethods: methods.split('\n').map((s) => s.trim()).filter(Boolean),
            reflection: 'Scheme entry ready for syllabus progression tracking.',
          },
        ],
      });

      if (res.success && res.data) {
        onSchemeCreated(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to create scheme of work');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating scheme of work');
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
              <span className="material-symbols-outlined text-[24px]">edit_calendar</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Create Scheme of Work</h3>
              <p className="text-xs text-rose-100">KICD syllabus alignment · Weekly lesson breakdown</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
          {error && <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">error</span>{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Academic Year *</label>
              <select value={selectedYearId} onChange={(e) => handleYearChange(e.target.value)} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer">
                {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? '(Current)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Term *</label>
              <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer">
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Class *</label>
              <select value={selectedClassRoomId} onChange={(e) => setSelectedClassRoomId(e.target.value)} required className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Stream</label>
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

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Scheme of Work Title *</label>
            <input type="text" required placeholder="e.g. Grade 7 Integrated Science - Term 1 Scheme" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary" />
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

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Specific Learning Outcomes *</label>
            <textarea rows={3} required placeholder="Enter outcomes (one per line)..." value={outcomes} onChange={(e) => setOutcomes(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary leading-relaxed" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Key Inquiry Questions *</label>
            <input type="text" required placeholder="e.g. How does a microscope magnify microscopic organisms?" value={questions} onChange={(e) => setQuestions(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary" />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Suggested Learning Experiences</label>
            <input type="text" placeholder="e.g. Collaborative group practical" value={experiences} onChange={(e) => setExperiences(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Learning Resources</label>
              <input type="text" placeholder="e.g. Microscopes, slides" value={resources} onChange={(e) => setResources(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Assessment Methods</label>
              <input type="text" placeholder="e.g. Oral questioning, practical observation" value={methods} onChange={(e) => setMethods(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary" />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-[#7a1228] text-white text-sm font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{isLoading ? 'Creating Scheme...' : 'Save Scheme of Work'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};