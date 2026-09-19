import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClassRoom, StreamItem, BackendLearningArea, AcademicYear, AcademicTerm } from '../../types';

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

  // Dynamic DB entities
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

  // Form states
  const [title, setTitle] = useState('');
  const [strandTitle, setStrandTitle] = useState('');
  const [subStrandTitle, setSubStrandTitle] = useState('');
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
        } else {
          setClasses([]);
          setSelectedClassRoomId('');
        }

        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          setSelectedLearningAreaId(laRes.data[0].id);
        } else {
          setLearningAreas([]);
          setSelectedLearningAreaId('');
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
        console.error('Failed to load initial data for scheme modal:', err);
      }
    }

    loadData();
  }, [isOpen]);

  // Load streams when selectedClassRoomId changes
  useEffect(() => {
    if (!selectedClassRoomId) {
      setStreams([]);
      setSelectedStreamId('');
      return;
    }

    apiService
      .getStreamsByClass(selectedClassRoomId)
      .then((res) => {
        if (res?.success && res.data && res.data.length > 0) {
          setStreams(res.data);
          setSelectedStreamId(res.data[0].id);
        } else {
          setStreams([]);
          setSelectedStreamId('');
        }
      })
      .catch(() => {
        setStreams([]);
        setSelectedStreamId('');
      });
  }, [selectedClassRoomId]);

  // Load terms when selectedYearId changes
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

    if (!selectedClassRoomId) {
      setError('Please select a class');
      setIsLoading(false);
      return;
    }

    if (!selectedLearningAreaId) {
      setError('Please select a learning area');
      setIsLoading(false);
      return;
    }

    if (!selectedYearId || !selectedTermId) {
      setError('Please select an academic year and term');
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiService.createScheme({
        teacherId,
        learningAreaId: selectedLearningAreaId,
        classRoomId: selectedClassRoomId,
        streamId: selectedStreamId || undefined,
        academicYearId: selectedYearId,
        termId: selectedTermId,
        title: title.trim(),
        entries: [
          {
            weekNumber: 1,
            lessonNumber: 1,
            strandTitle: strandTitle.trim(),
            subStrandTitle: subStrandTitle.trim(),
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
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">edit_calendar</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Create Scheme of Work</h3>
              <p className="text-xs text-rose-100">KICD syllabus alignment · Weekly lesson breakdown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors"
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

          {/* Academic Context: Year & Term */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Academic Year *
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => handleYearChange(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface"
              >
                {academicYears.length === 0 ? (
                  <option value="">No years found</option>
                ) : (
                  academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? '(Current)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Term *
              </label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface"
              >
                {terms.length === 0 ? (
                  <option value="">No terms found</option>
                ) : (
                  terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Class, Stream, and Learning Area */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Class *
              </label>
              <select
                value={selectedClassRoomId}
                onChange={(e) => setSelectedClassRoomId(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface"
              >
                {classes.length === 0 ? (
                  <option value="">No classes found</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Stream (Optional)
              </label>
              <select
                value={selectedStreamId}
                onChange={(e) => setSelectedStreamId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface"
              >
                <option value="">All Streams</option>
                {streams.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Learning Area *
              </label>
              <select
                value={selectedLearningAreaId}
                onChange={(e) => setSelectedLearningAreaId(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface"
              >
                {learningAreas.length === 0 ? (
                  <option value="">No subjects found</option>
                ) : (
                  learningAreas.map((la) => (
                    <option key={la.id} value={la.id}>
                      {la.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Scheme of Work Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Grade 7 Integrated Science - Term 1 Scheme of Work"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Strand Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Living Things and Their Environment"
                value={strandTitle}
                onChange={(e) => setStrandTitle(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Sub-strand Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cell Structure & Microscopy"
                value={subStrandTitle}
                onChange={(e) => setSubStrandTitle(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Specific Learning Outcomes *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Enter outcomes (one per line)..."
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Key Inquiry Questions *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. How does a microscope magnify microscopic organisms?"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Suggested Learning Experiences
            </label>
            <input
              type="text"
              placeholder="e.g. Collaborative group practical observing onion epidermal cells"
              value={experiences}
              onChange={(e) => setExperiences(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Learning Resources
              </label>
              <input
                type="text"
                placeholder="e.g. Microscopes, slides, KLB Science Guide"
                value={resources}
                onChange={(e) => setResources(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Assessment Methods
              </label>
              <input
                type="text"
                placeholder="e.g. Oral questioning, practical observation rubric"
                value={methods}
                onChange={(e) => setMethods(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{isLoading ? 'Creating Scheme...' : 'Save Scheme of Work'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
