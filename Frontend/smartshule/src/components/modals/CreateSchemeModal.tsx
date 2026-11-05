import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClassRoom, StreamItem, BackendLearningArea, AcademicYear, AcademicTerm, BackendStrand, BackendSubStrand } from '../../types';
import { matchGradeLevels } from '../../utils/formatters';

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
  const [isCustomStrand, setIsCustomStrand] = useState(false);
  const [customStrandTitle, setCustomStrandTitle] = useState('');

  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState('');
  const [subStrandTitle, setSubStrandTitle] = useState('');
  const [isCustomSubStrand, setIsCustomSubStrand] = useState(false);
  const [customSubStrandTitle, setCustomSubStrandTitle] = useState('');

  const [loadingStrands, setLoadingStrands] = useState(false);

  const [title, setTitle] = useState('');
  const [outcomes, setOutcomes] = useState('');
  const [questions, setQuestions] = useState('');
  const [experiences, setExperiences] = useState('');
  const [resources, setResources] = useState('');
  const [methods, setMethods] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableLearningAreas = React.useMemo(() => {
    if (!selectedClassRoomId) return learningAreas;
    const selectedClass = classes.find(c => c.id === selectedClassRoomId);
    if (!selectedClass?.gradeLevel) return learningAreas;
    const filtered = learningAreas.filter(la => matchGradeLevels(la.gradeLevel, selectedClass.gradeLevel));
    return filtered.length > 0 ? filtered : learningAreas;
  }, [learningAreas, selectedClassRoomId, classes]);

  useEffect(() => {
    if (availableLearningAreas.length > 0) {
      if (!availableLearningAreas.some(la => la.id === selectedLearningAreaId)) {
        setSelectedLearningAreaId(availableLearningAreas[0].id);
      }
    }
  }, [availableLearningAreas, selectedLearningAreaId]);

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

  // SMART DB FETCHING: Fetch and filter Strands by the Class Grade
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
          const gradeStrands = res.data.filter((st: any) => matchGradeLevels(st.gradeLevel, classGradeFormat));
          const effectiveStrands = gradeStrands.length > 0 ? gradeStrands : res.data;
          
          // Deduplicate
          const seen = new Set<string>();
          const uniqueStrands: BackendStrand[] = [];
          for (const s of effectiveStrands) {
            const k = (s.title || '').trim().toLowerCase();
            if (!k || seen.has(k)) continue;
            seen.add(k);
            uniqueStrands.push(s);
          }
          setStrands(uniqueStrands);
          
          if (uniqueStrands.length > 0) {
            setSelectedStrandId(uniqueStrands[0].id);
            setStrandTitle(uniqueStrands[0].title);
            setIsCustomStrand(false);
          } else {
            setSelectedStrandId('');
            setStrandTitle('');
            setIsCustomStrand(true);
          }
        } else {
          setStrands([]);
          setSelectedStrandId('');
          setStrandTitle('');
          setIsCustomStrand(true);
        }
      })
      .catch(() => {
        setStrands([]);
        setSelectedStrandId('');
        setStrandTitle('');
        setIsCustomStrand(true);
      })
      .finally(() => setLoadingStrands(false));
  }, [selectedLearningAreaId, selectedClassRoomId, classes, isOpen]);

  useEffect(() => {
    if (!selectedStrandId || !isOpen || isCustomStrand) {
      setSubStrands([]);
      setSelectedSubStrandId('');
      setSubStrandTitle('');
      if (isCustomStrand) setIsCustomSubStrand(true);
      return;
    }

    apiService.getSubStrandsByStrand(selectedStrandId)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          const seen = new Set<string>();
          const uniqueSubs: BackendSubStrand[] = [];
          for (const sub of res.data) {
            const sk = (sub.title || '').trim().toLowerCase();
            if (!sk || seen.has(sk)) continue;
            seen.add(sk);
            uniqueSubs.push(sub);
          }
          setSubStrands(uniqueSubs);
          if (uniqueSubs.length > 0) {
            setSelectedSubStrandId(uniqueSubs[0].id);
            setSubStrandTitle(uniqueSubs[0].title);
            setIsCustomSubStrand(false);
            if (uniqueSubs[0].specificLearningOutcomes?.length > 0 && !outcomes) {
              setOutcomes(uniqueSubs[0].specificLearningOutcomes.join('\n'));
            }
          } else {
            setIsCustomSubStrand(true);
          }
        } else {
          setSubStrands([]);
          setSelectedSubStrandId('');
          setSubStrandTitle('');
          setIsCustomSubStrand(true);
        }
      })
      .catch(() => {
        setSubStrands([]);
        setSelectedSubStrandId('');
        setSubStrandTitle('');
        setIsCustomSubStrand(true);
      });
  }, [selectedStrandId, isOpen, isCustomStrand]);

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

    const finalStrandTitle = (isCustomStrand || strands.length === 0 ? customStrandTitle : strandTitle) || strands.find(s => s.id === selectedStrandId)?.title || customStrandTitle;
    const finalSubStrandTitle = (isCustomSubStrand || subStrands.length === 0 || isCustomStrand ? customSubStrandTitle : subStrandTitle) || subStrands.find(s => s.id === selectedSubStrandId)?.title || customSubStrandTitle;

    if (!finalStrandTitle.trim() || !finalSubStrandTitle.trim()) {
      setError('Curriculum Strand and Sub-strand are required');
      setIsLoading(false);
      return;
    }

    // Auto-persist custom strand/sub-strand to database so it is available across the entire school
    if (isCustomStrand || strands.length === 0) {
      const cls = classes.find(c => c.id === selectedClassRoomId);
      const grade = cls?.gradeLevel || 'GRADE_7';
      apiService.createStrand({
        learningAreaId: selectedLearningAreaId,
        gradeLevel: grade as any,
        code: `STR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        title: finalStrandTitle.trim(),
      }).then(res => {
        if (res.success && res.data && finalSubStrandTitle) {
          apiService.createSubStrand({
            strandId: res.data.id,
            code: `${res.data.code}.1`,
            title: finalSubStrandTitle.trim(),
            specificLearningOutcomes: outcomes.split('\n').map(o => o.trim()).filter(Boolean)
          }).catch(() => {});
        }
      }).catch(() => {});
    }

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
            strandId: isCustomStrand ? undefined : selectedStrandId || undefined,
            strandTitle: finalStrandTitle.trim(),
            subStrandId: isCustomSubStrand ? undefined : selectedSubStrandId || undefined,
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
                {availableLearningAreas.map((la) => <option key={la.id} value={la.id}>{la.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Scheme of Work Title *</label>
            <input type="text" required placeholder="e.g. Grade 7 Integrated Science - Term 1 Scheme" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase text-on-surface-variant">Curriculum Strand *</label>
                {strands.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomStrand(!isCustomStrand);
                      if (!isCustomStrand) {
                        setCustomStrandTitle(strandTitle || '');
                      }
                    }}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    {isCustomStrand ? 'Select From List' : '+ Enter New'}
                  </button>
                )}
              </div>
              {loadingStrands ? (
                <div className="p-2 text-xs text-on-surface-variant">Loading DB strands...</div>
              ) : isCustomStrand || strands.length === 0 ? (
                <input
                  type="text"
                  required
                  placeholder="Enter strand title (e.g. Numbers, Mechanics)..."
                  value={customStrandTitle}
                  onChange={(e) => {
                    setCustomStrandTitle(e.target.value);
                    setStrandTitle(e.target.value);
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                />
              ) : (
                <select
                  value={selectedStrandId}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomStrand(true);
                      setCustomStrandTitle('');
                      setStrandTitle('');
                    } else {
                      setSelectedStrandId(e.target.value);
                      setStrandTitle(strands.find(s => s.id === e.target.value)?.title || '');
                    }
                  }}
                  required
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary cursor-pointer truncate"
                >
                  {strands.map(st => <option key={st.id} value={st.id}>{st.title}</option>)}
                  <option value="__custom__">+ Enter Custom Strand...</option>
                </select>
              )}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase text-on-surface-variant">Sub-strand *</label>
                {subStrands.length > 0 && !isCustomStrand && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSubStrand(!isCustomSubStrand);
                      if (!isCustomSubStrand) {
                        setCustomSubStrandTitle(subStrandTitle || '');
                      }
                    }}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    {isCustomSubStrand ? 'Select From List' : '+ Enter New'}
                  </button>
                )}
              </div>
              {isCustomSubStrand || isCustomStrand || subStrands.length === 0 ? (
                <input
                  type="text"
                  required
                  placeholder="Enter sub-strand title..."
                  value={customSubStrandTitle}
                  onChange={(e) => {
                    setCustomSubStrandTitle(e.target.value);
                    setSubStrandTitle(e.target.value);
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                />
              ) : (
                <select
                  value={selectedSubStrandId}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomSubStrand(true);
                      setCustomSubStrandTitle('');
                      setSubStrandTitle('');
                    } else {
                      setSelectedSubStrandId(e.target.value);
                      const selected = subStrands.find(s => s.id === e.target.value);
                      if (selected) {
                        setSubStrandTitle(selected.title);
                        setOutcomes(selected.specificLearningOutcomes?.join('\n') || '');
                      }
                    }
                  }}
                  required
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary cursor-pointer truncate"
                >
                  {subStrands.map(sub => <option key={sub.id} value={sub.id}>{sub.title}</option>)}
                  <option value="__custom__">+ Enter Custom Sub-strand...</option>
                </select>
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