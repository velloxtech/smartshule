import React, { useState } from 'react';
import { apiService } from '../../services/api';

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
  const [strand, setStrand] = useState('Living Things and Their Environment');
  const [subStrand, setSubStrand] = useState('Microscope and Cell Structure');
  const [lessonDate, setLessonDate] = useState('2026-02-12');
  const [durationMinutes] = useState(40);
  const [rollBoys, setRollBoys] = useState('20');
  const [rollGirls, setRollGirls] = useState('18');
  const [outcomes, setOutcomes] = useState('Identify the ocular lens, stage, and objective lenses of a microscope');
  const [inquiryQuestion, setInquiryQuestion] = useState('Why is proper illumination necessary when using a microscope?');
  const [resources, setResources] = useState('Standard compound microscope, charts, interactive digital model');
  const [extendedActivity, setExtendedActivity] = useState('Draw and label the light microscope in science exercise book.');
  const [teacherReflection, setTeacherReflection] = useState('Learners engaged well with high curiosity during the demonstration.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const steps = [
      {
        stepNumber: 1,
        stepTitle: 'Introduction (5 mins)',
        durationMinutes: 5,
        teacherActivities: 'Introduces lesson with a short riddle about microscopic organisms.',
        learnerActivities: 'Brainstorm in pairs and name tools used to observe tiny specimens.',
      },
      {
        stepNumber: 2,
        stepTitle: 'Step 1: Part Identification (15 mins)',
        durationMinutes: 15,
        teacherActivities: 'Demonstrates handling the microscope correctly; explains lens functions.',
        learnerActivities: 'Examine microscope at station and identify each labeled part.',
      },
      {
        stepNumber: 3,
        stepTitle: 'Step 2: Practical Observation (15 mins)',
        durationMinutes: 15,
        teacherActivities: 'Guides learners on using coarse and fine adjustment knobs safely.',
        learnerActivities: 'Practice bringing specimen slide into clear focus under low power.',
      },
      {
        stepNumber: 4,
        stepTitle: 'Conclusion & Summary (5 mins)',
        durationMinutes: 5,
        teacherActivities: 'Summarizes key takeaway points and equipment safety rules.',
        learnerActivities: 'Pack equipment securely and record one reflection in learner journal.',
      },
    ];

    try {
      const res = await apiService.createLessonPlan({
        teacherId: 'teacher-001',
        schemeOfWorkEntryId: 'scheme-entry-01',
        learningAreaId: 'la-science-7',
        classRoomId: 'class-grade-7',
        streamId: 'stream-g7-east',
        lessonDate,
        durationMinutes,
        rollBoys: Number(rollBoys),
        rollGirls: Number(rollGirls),
        strand,
        subStrand,
        specificLearningOutcomes: [outcomes],
        keyInquiryQuestions: [inquiryQuestion],
        coreCompetenciesAddressed: ['CRITICAL_THINKING_AND_PROBLEM_SOLVING', 'DIGITAL_LITERACY'],
        valuesAddressed: ['RESPONSIBILITY', 'RESPECT'],
        learningResources: [resources],
        steps,
        extendedActivity,
        teacherSelfReflection: teacherReflection,
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
        <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">timer</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Create 40-Min CBC Lesson Plan</h3>
              <p className="text-xs text-blue-200">Structured 4-step pedagogical plan with reflection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Curriculum Strand
              </label>
              <input
                type="text"
                required
                value={strand}
                onChange={(e) => setStrand(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Sub-strand
              </label>
              <input
                type="text"
                required
                value={subStrand}
                onChange={(e) => setSubStrand(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Roll (Boys)
              </label>
              <input
                type="number"
                value={rollBoys}
                onChange={(e) => setRollBoys(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Roll (Girls)
              </label>
              <input
                type="number"
                value={rollGirls}
                onChange={(e) => setRollGirls(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Specific Learning Outcome
            </label>
            <input
              type="text"
              required
              value={outcomes}
              onChange={(e) => setOutcomes(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Key Inquiry Question
            </label>
            <input
              type="text"
              required
              value={inquiryQuestion}
              onChange={(e) => setInquiryQuestion(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Learning Resources
            </label>
            <input
              type="text"
              required
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="p-3 rounded-lg bg-surface-container-low space-y-1 text-xs">
            <span className="font-bold text-primary block">Integrated CBC 4-Step Development:</span>
            <div className="text-on-surface-variant">1. Intro (5m) · 2. Identification (15m) · 3. Practical Focus (15m) · 4. Conclusion (5m)</div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Teacher Self-Reflection & Notes
            </label>
            <textarea
              rows={2}
              value={teacherReflection}
              onChange={(e) => setTeacherReflection(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">post_add</span>
              <span>{isLoading ? 'Creating Plan...' : 'Save Lesson Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
