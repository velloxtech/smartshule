import React, { useState } from 'react';
import { apiService } from '../../services/api';

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
  const [title, setTitle] = useState('Grade 7 Integrated Science - Term 1 Scheme of Work');
  const [strandTitle, setStrandTitle] = useState('Living Things and Their Environment');
  const [subStrandTitle, setSubStrandTitle] = useState('Microscope and Cell Structure');
  const [outcomes, setOutcomes] = useState('Identify parts of a light microscope and state their functions');
  const [questions, setQuestions] = useState('How does a microscope help us see tiny organisms?');
  const [experiences, setExperiences] = useState('Hands-on microscope session in groups');
  const [resources, setResources] = useState('Light microscope, specimen slides, KLB Grade 7 Science text');
  const [methods, setMethods] = useState('Oral questioning, direct observation');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.createScheme({
        teacherId: 'teacher-001',
        learningAreaId: 'la-science-7',
        classRoomId: 'class-grade-7',
        streamId: 'stream-g7-east',
        academicYearId: 'year-2026',
        termId: 'term-2026-1',
        title,
        entries: [
          {
            weekNumber: 1,
            lessonNumber: 1,
            strandTitle,
            subStrandTitle,
            specificLearningOutcomes: outcomes.split('\n').filter(Boolean),
            keyInquiryQuestions: questions.split('\n').filter(Boolean),
            learningExperiences: experiences.split('\n').filter(Boolean),
            learningResources: resources.split('\n').filter(Boolean),
            assessmentMethods: methods.split('\n').filter(Boolean),
            reflection: 'Lesson plan designed and ready for execution.',
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

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Scheme of Work Title
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
                Strand Title
              </label>
              <input
                type="text"
                required
                value={strandTitle}
                onChange={(e) => setStrandTitle(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Sub-strand Title
              </label>
              <input
                type="text"
                required
                value={subStrandTitle}
                onChange={(e) => setSubStrandTitle(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Specific Learning Outcomes
            </label>
            <textarea
              rows={2}
              required
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-xs text-on-surface focus:outline-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Key Inquiry Questions
            </label>
            <input
              type="text"
              required
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
              required
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
                required
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
                required
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
