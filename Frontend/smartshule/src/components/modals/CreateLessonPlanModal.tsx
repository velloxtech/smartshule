import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClassRoom, StreamItem, BackendLearningArea, BackendStrand, BackendSubStrand } from '../../types';
import { matchGradeLevels } from '../../utils/formatters';

interface CreateLessonPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (plan: any) => void;
}

const AVAILABLE_COMPETENCIES = [
  { id: 'CRITICAL_THINKING_AND_PROBLEM_SOLVING', label: 'Critical Thinking & Problem Solving' },
  { id: 'COMMUNICATION_AND_COLLABORATION', label: 'Communication & Collaboration' },
  { id: 'DIGITAL_LITERACY', label: 'Digital Literacy' },
  { id: 'SELF_EFFICACY', label: 'Self-Efficacy' },
  { id: 'CREATIVITY_AND_IMAGINATION', label: 'Creativity & Imagination' },
  { id: 'CITIZENSHIP', label: 'Citizenship' },
  { id: 'LEARNING_TO_LEARN', label: 'Learning to Learn' },
];

const AVAILABLE_VALUES = [
  { id: 'RESPECT', label: 'Respect' },
  { id: 'RESPONSIBILITY', label: 'Responsibility' },
  { id: 'INTEGRITY', label: 'Integrity' },
  { id: 'UNITY', label: 'Unity' },
  { id: 'PEACE', label: 'Peace' },
  { id: 'LOVE', label: 'Love' },
  { id: 'SOCIAL_JUSTICE', label: 'Social Justice' },
];

export const CreateLessonPlanModal: React.FC<CreateLessonPlanModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated,
}) => {
  const { user } = useAuth();

  // Active step / tab in modal for structured CBE template
  const [activeTab, setActiveTab] = useState<'details' | 'outcomes' | 'competencies' | 'presentation' | 'review'>('details');

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassRoomId, setSelectedClassRoomId] = useState('');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState('');

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

  // Template Session Details
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekNumber, setWeekNumber] = useState('1');
  const [lessonNumber, setLessonNumber] = useState('1');
  const [sessionTitle, setSessionTitle] = useState('');
  const [durationMinutes] = useState(40);
  const [rollBoys, setRollBoys] = useState('0');
  const [rollGirls, setRollGirls] = useState('0');
  const [learnerNeeds, setLearnerNeeds] = useState('Differentiated support: peer scaffolding for emerging readers, extension tasks for early finishers.');

  // Template Learning Outcomes (3 outcomes standard)
  const [outcome1, setOutcome1] = useState('');
  const [outcome2, setOutcome2] = useState('');
  const [outcome3, setOutcome3] = useState('');

  // Key inquiry questions
  const [inquiry1, setInquiry1] = useState('');
  const [inquiry2, setInquiry2] = useState('');
  const [inquiry3, setInquiry3] = useState('');

  // Competencies, Values, PCIs & Safety
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>([
    'CRITICAL_THINKING_AND_PROBLEM_SOLVING',
    'COMMUNICATION_AND_COLLABORATION',
  ]);
  const [selectedValues, setSelectedValues] = useState<string[]>([
    'RESPECT',
    'RESPONSIBILITY',
  ]);
  const [pcis, setPcis] = useState('Financial literacy, Environmental education, Health awareness');
  const [resources, setResources] = useState('Approved Primary Coursebook, charts, realia, digital learning aids');
  const [safetyRequirements, setSafetyRequirements] = useState('Safe and orderly handling of instructional aids, organized group movement.');

  // Session Presentation: 1. Introduction
  const [introDuration, setIntroDuration] = useState('5');
  const [introActivities, setIntroActivities] = useState('Review the previous lesson through recall inquiry. Learners share observations and connect prior knowledge.');

  // Session Presentation: 2. Session Delivery Steps
  const [step1Time, setStep1Time] = useState('10');
  const [step1Teacher, setStep1Teacher] = useState('Introduces core concepts using realia demonstrations and guides inquiry questions.');
  const [step1Learner, setStep1Learner] = useState('Observe model demonstration, discuss in pairs, and record initial deductions.');
  const [step1Assessment, setStep1Assessment] = useState('Oral questioning and concept recall check.');

  const [step2Time, setStep2Time] = useState('10');
  const [step2Teacher, setStep2Teacher] = useState('Guides structured group exercise, scaffolding struggling learners with tailored hints.');
  const [step2Learner, setStep2Learner] = useState('Collaborate in small groups to solve practical task exercises in exercise books.');
  const [step2Assessment, setStep2Assessment] = useState('Observation of group collaboration and rubric checklist.');

  const [step3Time, setStep3Time] = useState('10');
  const [step3Teacher, setStep3Teacher] = useState('Monitors individual independent practice, giving immediate formative corrective feedback.');
  const [step3Learner, setStep3Learner] = useState('Carry out independent practical tasks and cross-verify answers with seat partners.');
  const [step3Assessment, setStep3Assessment] = useState('Formative exercise book assessment.');

  const [step4Time, setStep4Time] = useState('5');
  const [step4Teacher, setStep4Teacher] = useState('Facilitates plenary presentations and validates peer task results.');
  const [step4Learner, setStep4Learner] = useState('Present group findings, ask clarifying questions, and document key takeaways.');
  const [step4Assessment, setStep4Assessment] = useState('Peer evaluation and self-reflection check.');

  // Session Presentation: 3. Session Review
  const [reviewDuration, setReviewDuration] = useState('5');
  const [reviewActivities, setReviewActivities] = useState('Summarize key points and learning achieved. Conduct brief interactive plenary check and preview next session.');

  // Wrap-up & Reflection
  const [extendedActivity, setExtendedActivity] = useState('Practice exercises in coursebook with home guardian guidance.');
  const [teacherReflection, setTeacherReflection] = useState('Learners participated actively. Key outcomes achieved; remedial attention planned for emerging learners.');

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
          const gradeStrands = res.data.filter((st: any) => matchGradeLevels(st.gradeLevel, classGradeFormat));
          const effectiveStrands = gradeStrands.length > 0 ? gradeStrands : res.data;

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
            if (uniqueSubs[0].specificLearningOutcomes?.length > 0) {
              const outs = uniqueSubs[0].specificLearningOutcomes;
              if (outs[0] && !outcome1) setOutcome1(outs[0]);
              if (outs[1] && !outcome2) setOutcome2(outs[1]);
              if (outs[2] && !outcome3) setOutcome3(outs[2]);
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

  useEffect(() => {
    if (!selectedClassRoomId) return;
    apiService.getStudents({ classroomId: selectedClassRoomId, streamId: selectedStreamId || undefined })
      .then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const boys = res.data.filter((s: any) => s.gender === 'MALE' || s.gender === 'Boy' || s.gender === 'Male').length;
          const girls = res.data.filter((s: any) => s.gender === 'FEMALE' || s.gender === 'Girl' || s.gender === 'Female').length;
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
    const finalStrandTitle = (isCustomStrand || strands.length === 0 ? customStrandTitle : strandTitle) || strands.find(s => s.id === selectedStrandId)?.title || customStrandTitle;
    const finalSubStrandTitle = (isCustomSubStrand || subStrands.length === 0 || isCustomStrand ? customSubStrandTitle : subStrandTitle) || subStrands.find(s => s.id === selectedSubStrandId)?.title || customSubStrandTitle;

    if (!finalStrandTitle.trim() || !finalSubStrandTitle.trim()) {
      setError('Curriculum Strand and Sub-strand are required');
      setIsLoading(false);
      return;
    }

    // Auto-save custom strand & sub-strand to DB on the fly
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
            specificLearningOutcomes: [outcome1.trim() || 'Demonstrates competency']
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    // Prepare outcomes list conforming to 3-outcome template
    const outcomesList = [
      outcome1.trim() || 'Identify and describe the key conceptual principles',
      outcome2.trim() || 'Apply skills collaboratively to solve practical tasks',
      outcome3.trim() || 'Appreciate the role and importance in daily life',
    ].filter(Boolean);

    // Prepare inquiry list
    const inquiriesList = [
      inquiry1.trim() || 'How do we apply this concept in real life situations?',
      inquiry2.trim() || 'What key observations or patterns can we identify?',
      inquiry3.trim(),
    ].filter(Boolean);

    // Prepare 4 Delivery Steps
    const steps = [
      {
        stepNumber: 1,
        stepTitle: `Step 1 (${step1Time || 10} mins)`,
        durationMinutes: Number(step1Time) || 10,
        teacherActivities: step1Teacher.trim(),
        learnerActivities: step1Learner.trim(),
        assessmentCriterion: step1Assessment.trim() || undefined,
      },
      {
        stepNumber: 2,
        stepTitle: `Step 2 (${step2Time || 10} mins)`,
        durationMinutes: Number(step2Time) || 10,
        teacherActivities: step2Teacher.trim(),
        learnerActivities: step2Learner.trim(),
        assessmentCriterion: step2Assessment.trim() || undefined,
      },
      {
        stepNumber: 3,
        stepTitle: `Step 3 (${step3Time || 10} mins)`,
        durationMinutes: Number(step3Time) || 10,
        teacherActivities: step3Teacher.trim(),
        learnerActivities: step3Learner.trim(),
        assessmentCriterion: step3Assessment.trim() || undefined,
      },
      {
        stepNumber: 4,
        stepTitle: `Step 4 (${step4Time || 5} mins)`,
        durationMinutes: Number(step4Time) || 5,
        teacherActivities: step4Teacher.trim(),
        learnerActivities: step4Learner.trim(),
        assessmentCriterion: step4Assessment.trim() || undefined,
      },
    ];

    const pcisList = pcis.split(',').map(p => p.trim()).filter(Boolean);
    const resourcesList = resources.split(';').map(r => r.trim()).filter(Boolean);

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
        weekNumber: Number(weekNumber) || 1,
        lessonNumber: Number(lessonNumber) || 1,
        sessionTitle: sessionTitle.trim() || `${finalStrandTitle.trim()} - ${finalSubStrandTitle.trim()}`,
        learnerNeeds: learnerNeeds.trim() || undefined,
        specificLearningOutcomes: outcomesList,
        keyInquiryQuestions: inquiriesList,
        coreCompetenciesAddressed: selectedCompetencies,
        valuesAddressed: selectedValues,
        learningResources: resourcesList.length > 0 ? resourcesList : [resources.trim()],
        pcis: pcisList,
        safetyRequirements: safetyRequirements.trim() || undefined,
        introduction: {
          durationMinutes: Number(introDuration) || 5,
          activities: introActivities.trim(),
        },
        steps,
        sessionReview: {
          durationMinutes: Number(reviewDuration) || 5,
          activities: reviewActivities.trim(),
        },
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

  const toggleCompetency = (id: string) => {
    setSelectedCompetencies(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleValue = (id: string) => {
    setSelectedValues(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-3xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        {/* Header */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Session Plan Template (Primary CBE)</h3>
              <p className="text-xs text-rose-100">Official Ministry of Education / KICD 3-Page Pedagogical Dossier</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-outline-variant/30 bg-surface-container-low px-4 pt-2 gap-1 overflow-x-auto shrink-0 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'details' ? 'border-[#7a1228] text-[#7a1228] bg-surface-container-lowest' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>1. Session Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outcomes')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'outcomes' ? 'border-[#7a1228] text-[#7a1228] bg-surface-container-lowest' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>2. Outcomes & Inquiry</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('competencies')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'competencies' ? 'border-[#7a1228] text-[#7a1228] bg-surface-container-lowest' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>3. Core Values & PCIs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presentation')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'presentation' ? 'border-[#7a1228] text-[#7a1228] bg-surface-container-lowest' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_timeline</span>
            <span>4. Presentation (4 Steps)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`px-3 py-2 font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'review' ? 'border-[#7a1228] text-[#7a1228] bg-surface-container-lowest' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">rate_review</span>
            <span>5. Review & Reflection</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {error && <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium">{error}</div>}

          {/* TAB 1: SESSION DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Class *</label>
                  <select
                    value={selectedClassRoomId}
                    onChange={(e) => setSelectedClassRoomId(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer"
                  >
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Stream (Opt)</label>
                  <select
                    value={selectedStreamId}
                    onChange={(e) => setSelectedStreamId(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer"
                  >
                    <option value="">All Streams</option>
                    {streams.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Learning Area (Subject) *</label>
                  <select
                    value={selectedLearningAreaId}
                    onChange={(e) => setSelectedLearningAreaId(e.target.value)}
                    required
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer"
                  >
                    {availableLearningAreas.map((la) => <option key={la.id} value={la.id}>{la.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
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
                      placeholder="e.g. Numbers, Algebra, Measurement..."
                      value={customStrandTitle}
                      onChange={(e) => {
                        setCustomStrandTitle(e.target.value);
                        setStrandTitle(e.target.value);
                      }}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface focus:outline-primary"
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
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer truncate"
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
                        className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                      >
                        {isCustomSubStrand ? 'Select From List' : '+ Enter New'}
                      </button>
                    )}
                  </div>
                  {isCustomSubStrand || isCustomStrand || subStrands.length === 0 ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Whole Numbers, Place Value..."
                      value={customSubStrandTitle}
                      onChange={(e) => {
                        setCustomSubStrandTitle(e.target.value);
                        setSubStrandTitle(e.target.value);
                      }}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface focus:outline-primary"
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
                            if (selected.specificLearningOutcomes?.length > 0) {
                              setOutcome1(selected.specificLearningOutcomes[0] || '');
                              if (selected.specificLearningOutcomes[1]) setOutcome2(selected.specificLearningOutcomes[1]);
                              if (selected.specificLearningOutcomes[2]) setOutcome3(selected.specificLearningOutcomes[2]);
                            }
                          }
                        }
                      }}
                      required
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface cursor-pointer truncate"
                    >
                      {subStrands.map(sub => <option key={sub.id} value={sub.id}>{sub.title}</option>)}
                      <option value="__custom__">+ Enter Custom Sub-strand...</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Session Title</label>
                <input
                  type="text"
                  placeholder="e.g. Identifying and writing whole numbers up to 1000"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Week *</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    required
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Lesson *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={lessonNumber}
                    onChange={(e) => setLessonNumber(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Boys</label>
                  <input
                    type="number"
                    min="0"
                    value={rollBoys}
                    onChange={(e) => setRollBoys(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Girls</label>
                  <input
                    type="number"
                    min="0"
                    value={rollGirls}
                    onChange={(e) => setRollGirls(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">Learner Needs (LLN) / Special Requirements</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scaffolding for slow readers, visual charts for hearing-impaired learners, extension challenges..."
                  value={learnerNeeds}
                  onChange={(e) => setLearnerNeeds(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('outcomes')}
                  className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next: Outcomes & Inquiry</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: OUTCOMES & INQUIRY */}
          {activeTab === 'outcomes' && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-xs space-y-1">
                <div className="font-bold text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  <span>Primary CBE Learning Outcomes Standard:</span>
                </div>
                <div className="text-on-surface-variant">
                  By the end of this session, the learner should be able to achieve the following:
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                    1. Outcome 1: start with an action verb *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Identify and write numbers up to 1000 in symbols and words"
                    value={outcome1}
                    onChange={(e) => setOutcome1(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                    2. Outcome 2 (Application / Skill) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Demonstrate place value using number charts and concrete counters"
                    value={outcome2}
                    onChange={(e) => setOutcome2(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                    3. Outcome 3 (Appreciation / Attitude) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Appreciate the practical use of numbers and calculations in day-to-day life"
                    value={outcome3}
                    onChange={(e) => setOutcome3(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant/20">
                <div className="font-bold text-xs uppercase text-on-surface-variant mb-2">
                  Key Inquiry Questions (The learner is guided to):
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-0.5">Inquiry Question / Experience 1 *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. How can we group items into tens and hundreds quickly?"
                      value={inquiry1}
                      onChange={(e) => setInquiry1(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-0.5">Inquiry Question / Experience 2 *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. What happens when we add one unit to nine tens and nine units?"
                      value={inquiry2}
                      onChange={(e) => setInquiry2(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-0.5">Inquiry Question / Experience 3 (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Where do we encounter four-digit numbers around us?"
                      value={inquiry3}
                      onChange={(e) => setInquiry3(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-container cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('competencies')}
                  className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next: Core Values & PCIs</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: COMPETENCIES, VALUES, PCIS & RESOURCES */}
          {activeTab === 'competencies' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1.5">
                  Core Competencies Addressed
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_COMPETENCIES.map((comp) => {
                    const isSelected = selectedCompetencies.includes(comp.id);
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => toggleCompetency(comp.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                          isSelected
                            ? 'bg-[#7a1228] text-white border-[#7a1228]'
                            : 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:bg-surface-container'
                        }`}
                      >
                        {comp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1.5">
                  Core Values Addressed
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_VALUES.map((val) => {
                    const isSelected = selectedValues.includes(val.id);
                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => toggleValue(val.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ${
                          isSelected
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:bg-surface-container'
                        }`}
                      >
                        {val.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Pertinent and Contemporary Issues (PCIs)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Financial literacy, Environmental conservation, Safety, Health education"
                  value={pcis}
                  onChange={(e) => setPcis(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Resources (references and learning aids) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Approved CBE Mathematics Pupil's Book, flashcards, counters, abacus"
                  value={resources}
                  onChange={(e) => setResources(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Safety Requirements
                </label>
                <input
                  type="text"
                  placeholder="e.g. Careful handling of counting materials; safe spacing during group activities"
                  value={safetyRequirements}
                  onChange={(e) => setSafetyRequirements(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('outcomes')}
                  className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-container cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('presentation')}
                  className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next: Session Presentation</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SESSION PRESENTATION (INTRODUCTION + 4 DELIVERY STEPS + REVIEW) */}
          {activeTab === 'presentation' && (
            <div className="space-y-4">
              {/* 1. Introduction */}
              <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-primary">1. Introduction</span>
                  <div className="flex items-center gap-1 text-xs">
                    <span>Duration:</span>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={introDuration}
                      onChange={(e) => setIntroDuration(e.target.value)}
                      className="w-12 bg-surface-container-lowest border border-outline-variant/40 rounded p-1 text-center font-data-mono text-xs"
                    />
                    <span>mins</span>
                  </div>
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  Review the previous lesson. Say how learners will begin: read, discuss or recall.
                </div>
                <textarea
                  rows={2}
                  value={introActivities}
                  onChange={(e) => setIntroActivities(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              {/* 2. Session Delivery Steps */}
              <div className="space-y-3">
                <div className="font-bold text-xs uppercase text-primary">
                  2. Session Delivery (4 Steps Table)
                </div>

                {/* Step 1 */}
                <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-low space-y-2">
                  <div className="flex items-center justify-between font-semibold text-xs text-secondary">
                    <span>Step 1: Introduction of Concept</span>
                    <div className="flex items-center gap-1 font-normal">
                      <span>Time:</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={step1Time}
                        onChange={(e) => setStep1Time(e.target.value)}
                        className="w-12 bg-surface-container-lowest border border-outline-variant/40 rounded p-1 text-center font-data-mono text-xs"
                      />
                      <span>mins</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Teacher Activity</label>
                      <input
                        type="text"
                        value={step1Teacher}
                        onChange={(e) => setStep1Teacher(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Learner Activity</label>
                      <input
                        type="text"
                        value={step1Learner}
                        onChange={(e) => setStep1Learner(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-0.5">Learning Check / Assessment</label>
                    <input
                      type="text"
                      value={step1Assessment}
                      onChange={(e) => setStep1Assessment(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-low space-y-2">
                  <div className="flex items-center justify-between font-semibold text-xs text-secondary">
                    <span>Step 2: Guided Practice & Collaboration</span>
                    <div className="flex items-center gap-1 font-normal">
                      <span>Time:</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={step2Time}
                        onChange={(e) => setStep2Time(e.target.value)}
                        className="w-12 bg-surface-container-lowest border border-outline-variant/40 rounded p-1 text-center font-data-mono text-xs"
                      />
                      <span>mins</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Teacher Activity</label>
                      <input
                        type="text"
                        value={step2Teacher}
                        onChange={(e) => setStep2Teacher(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Learner Activity</label>
                      <input
                        type="text"
                        value={step2Learner}
                        onChange={(e) => setStep2Learner(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-0.5">Learning Check / Assessment</label>
                    <input
                      type="text"
                      value={step2Assessment}
                      onChange={(e) => setStep2Assessment(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-low space-y-2">
                  <div className="flex items-center justify-between font-semibold text-xs text-secondary">
                    <span>Step 3: Independent Application & Scaffolding</span>
                    <div className="flex items-center gap-1 font-normal">
                      <span>Time:</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={step3Time}
                        onChange={(e) => setStep3Time(e.target.value)}
                        className="w-12 bg-surface-container-lowest border border-outline-variant/40 rounded p-1 text-center font-data-mono text-xs"
                      />
                      <span>mins</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Teacher Activity</label>
                      <input
                        type="text"
                        value={step3Teacher}
                        onChange={(e) => setStep3Teacher(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Learner Activity</label>
                      <input
                        type="text"
                        value={step3Learner}
                        onChange={(e) => setStep3Learner(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-0.5">Learning Check / Assessment</label>
                    <input
                      type="text"
                      value={step3Assessment}
                      onChange={(e) => setStep3Assessment(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-low space-y-2">
                  <div className="flex items-center justify-between font-semibold text-xs text-secondary">
                    <span>Step 4: Plenary Presentation & Synthesis</span>
                    <div className="flex items-center gap-1 font-normal">
                      <span>Time:</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={step4Time}
                        onChange={(e) => setStep4Time(e.target.value)}
                        className="w-12 bg-surface-container-lowest border border-outline-variant/40 rounded p-1 text-center font-data-mono text-xs"
                      />
                      <span>mins</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Teacher Activity</label>
                      <input
                        type="text"
                        value={step4Teacher}
                        onChange={(e) => setStep4Teacher(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-on-surface-variant mb-0.5">Learner Activity</label>
                      <input
                        type="text"
                        value={step4Learner}
                        onChange={(e) => setStep4Learner(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-0.5">Learning Check / Assessment</label>
                    <input
                      type="text"
                      value={step4Assessment}
                      onChange={(e) => setStep4Assessment(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded p-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Session Review */}
              <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-primary">3. Session Review</span>
                  <div className="flex items-center gap-1 text-xs">
                    <span>Duration:</span>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={reviewDuration}
                      onChange={(e) => setReviewDuration(e.target.value)}
                      className="w-12 bg-surface-container-lowest border border-outline-variant/40 rounded p-1 text-center font-data-mono text-xs"
                    />
                    <span>mins</span>
                  </div>
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  Summarize key points and learning achieved. Add a brief interactive activity. Preview the next session.
                </div>
                <textarea
                  rows={2}
                  value={reviewActivities}
                  onChange={(e) => setReviewActivities(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('competencies')}
                  className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-container cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('review')}
                  className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next: Review & Reflection</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: WRAP-UP & REFLECTION */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Assignment (extended activities)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Practice questions 1 to 5 on page 42 of pupil's activity book with home guardian guidance."
                  value={extendedActivity}
                  onChange={(e) => setExtendedActivity(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Session Reflection (teacher self-evaluation)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Learning outcomes achieved by 90% of learners. Group collaboration went smoothly; three learners required remediation on regrouping..."
                  value={teacherReflection}
                  onChange={(e) => setTeacherReflection(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs focus:outline-primary"
                />
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs space-y-1">
                <span className="font-bold text-primary block">CBE Verification & Endorsement:</span>
                <div className="text-on-surface-variant">
                  Upon saving, this lesson plan will be formatted into the official 3-Page Primary CBE Session Dossier and submitted for institutional leadership review.
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('presentation')}
                  className="px-4 py-2 border border-outline text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-container cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Persistent Footer Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-outline-variant/20 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#7a1228] text-white text-xs font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">post_add</span>
              <span>{isLoading ? 'Saving Session Plan...' : 'Save Lesson Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
