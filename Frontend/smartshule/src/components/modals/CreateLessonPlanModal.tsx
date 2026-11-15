import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ClassRoom, StreamItem, BackendLearningArea, BackendStrand, BackendSubStrand, LessonPlanSourceEntry, LessonPlanStep, LessonPlan } from '../../types';
import { ApprovedSchemePicker } from '../curriculum/ApprovedSchemePicker';
import { matchGradeLevels } from '../../utils/formatters';

const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#7a1228] focus:ring-2 focus:ring-[#7a1228]/15 disabled:cursor-not-allowed disabled:bg-slate-100';

interface CreateLessonPlanModalProps {
  isOpen: boolean;
  sourceEntry?: LessonPlanSourceEntry;
  revisionPlan?: any;
  onNavigateTab?: (tab:string)=>void;
  onClose: () => void;
  onPlanCreated: (plan: any) => void;
}

export const CreateLessonPlanModal: React.FC<CreateLessonPlanModalProps> = ({
  isOpen,
  sourceEntry: providedSourceEntry,
  revisionPlan,
  onNavigateTab,
  onClose,
  onPlanCreated,
}) => {
  const { user } = useAuth();
  const [pickedSourceEntry, setPickedSourceEntry] = useState<LessonPlanSourceEntry>();
  const sourceEntry = providedSourceEntry || pickedSourceEntry;

  const academicContext=sourceEntry?.academicYearId&&sourceEntry?.termId?{academicYearId:sourceEntry.academicYearId,termId:sourceEntry.termId}:undefined;
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

  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [rollBoys, setRollBoys] = useState('0');
  const [rollGirls, setRollGirls] = useState('0');
  const [outcomes, setOutcomes] = useState('');
  const [inquiryQuestion, setInquiryQuestion] = useState('');
  const [resources, setResources] = useState('');
  const [learningExperiences, setLearningExperiences] = useState('');
  const [assessmentMethods, setAssessmentMethods] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [lessonNumber, setLessonNumber] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [pcis, setPcis] = useState('');
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [steps, setSteps] = useState<LessonPlanStep[]>([
    { stepNumber: 1, stepTitle: 'Introduction', durationMinutes: 5, teacherActivities: '', learnerActivities: '' },
    { stepNumber: 2, stepTitle: 'Lesson Development', durationMinutes: 20, teacherActivities: '', learnerActivities: '' },
    { stepNumber: 3, stepTitle: 'Conclusion', durationMinutes: 5, teacherActivities: '', learnerActivities: '' },
  ]);
  const [templateDetails,setTemplateDetails]=useState<Pick<LessonPlan,'otherLearningAreas'|'communityServiceActivities'|'nonFormalActivity'|'assessmentRubric'>>({});
  const [extendedActivity, setExtendedActivity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!isOpen) { setPickedSourceEntry(undefined); setSelectedClassRoomId(''); setSelectedLearningAreaId(''); setClasses([]); setLearningAreas([]); setStreams([]); setError(null); } }, [isOpen]);

  const availableLearningAreas = React.useMemo(() => {
    if (!selectedClassRoomId) return learningAreas;
    const selectedClass = classes.find(c => c.id === selectedClassRoomId);
    if (!selectedClass?.gradeLevel) return learningAreas;
    const filtered = learningAreas.filter(la => matchGradeLevels(la.gradeLevel, selectedClass.gradeLevel));
    return filtered.length > 0 ? filtered : learningAreas;
  }, [learningAreas, selectedClassRoomId, classes]);

  useEffect(() => {
    if (sourceEntry) return;
    if (availableLearningAreas.length > 0) {
      if (!availableLearningAreas.some(la => la.id === selectedLearningAreaId)) {
        setSelectedLearningAreaId(availableLearningAreas[0].id);
      }
    }
  }, [availableLearningAreas, selectedLearningAreaId, sourceEntry]);

  useEffect(() => {
    if (!isOpen || !sourceEntry) return;
    let cancelled = false;
    setSelectedClassRoomId(sourceEntry.classRoomId);
    setSelectedStreamId(sourceEntry.streamId || '');
    setSelectedLearningAreaId(sourceEntry.learningAreaId);

    async function loadOptions() {
      try {
        const [cRes, laRes] = await Promise.all([
          apiService.getClasses(undefined,academicContext).catch(() => null),
          apiService.getLearningAreas(academicContext).catch(() => null),
        ]);

        if (cancelled) return;
        if (cRes?.data && Array.isArray(cRes.data) && cRes.data.length > 0) {
          setClasses(cRes.data);
          setSelectedClassRoomId(sourceEntry?.classRoomId || cRes.data[0].id);
        }

        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          setSelectedLearningAreaId(sourceEntry?.learningAreaId || laRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    }
    if (!revisionPlan) {
      const times = sourceEntry.lessonTime.split('-').map(value => value.split(':').map(Number));
      const minutes = times.length === 2 ? times[1][0] * 60 + times[1][1] - times[0][0] * 60 - times[0][1] : 30;
      const duration = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
      setDurationMinutes(duration); setRollBoys('0'); setRollGirls('0'); setPcis(''); setCompetencies([]); setValues([]); setExtendedActivity('');
      setSteps(duration < 3 ? [{ stepNumber: 1, stepTitle: 'Lesson Development', durationMinutes: duration, teacherActivities: '', learnerActivities: '' }] : [
        { stepNumber: 1, stepTitle: 'Introduction', durationMinutes: Math.min(5, Math.floor(duration / 3)), teacherActivities: '', learnerActivities: '' },
        { stepNumber: 2, stepTitle: 'Lesson Development', durationMinutes: duration - 2 * Math.min(5, Math.floor(duration / 3)), teacherActivities: '', learnerActivities: '' },
        { stepNumber: 3, stepTitle: 'Conclusion', durationMinutes: Math.min(5, Math.floor(duration / 3)), teacherActivities: '', learnerActivities: '' },
      ]);
    }
    setTemplateDetails({otherLearningAreas:revisionPlan?.otherLearningAreas||[],communityServiceActivities:revisionPlan?.communityServiceActivities||'',nonFormalActivity:revisionPlan?.nonFormalActivity||'',assessmentRubric:revisionPlan?.assessmentRubric});
    setError(null);
    if(sourceEntry){setLearningExperiences((revisionPlan?.learningExperiences ?? sourceEntry.learningExperiences ?? []).join('\n'));setAssessmentMethods((revisionPlan?.assessmentMethods ?? sourceEntry.assessmentMethods ?? []).join('\n'));setOutcomes(revisionPlan?.specificLearningOutcomes?.join('\n')||sourceEntry.specificLearningOutcomes?.join('\n')||'');setInquiryQuestion(revisionPlan?.keyInquiryQuestions?.join('\n')||sourceEntry.keyInquiryQuestions?.join('\n')||'');setResources(revisionPlan?.learningResources?.join('\n')||sourceEntry.learningResources?.join('\n')||'');setLessonDate(sourceEntry.lessonDate);setLessonTime(sourceEntry.lessonTime);setWeekNumber(String(sourceEntry.weekNumber));setLessonNumber(String(sourceEntry.lessonNumber));if(revisionPlan){setDurationMinutes(revisionPlan.durationMinutes||30);setRollBoys(String(revisionPlan.rollBoys||0));setRollGirls(String(revisionPlan.rollGirls||0));setPcis((revisionPlan.pcis||[]).join('\n'));setCompetencies(revisionPlan.coreCompetenciesAddressed||[]);setValues(revisionPlan.valuesAddressed||[]);setSteps(revisionPlan.steps?.length?revisionPlan.steps:steps);setExtendedActivity(revisionPlan.extendedActivity||'');}}
    loadOptions();
    return () => { cancelled = true; };
  }, [isOpen, sourceEntry, revisionPlan]);

  useEffect(() => {
    if (!isOpen || !sourceEntry || !selectedClassRoomId) return;
    let cancelled = false;
    setSelectedStreamId(sourceEntry.streamId || '');
    apiService.getStreamsByClass(selectedClassRoomId, academicContext).then(res => {
      if (cancelled) return;
      setStreams(res?.success ? res.data || [] : []);
      setSelectedStreamId(sourceEntry.streamId || '');
    }).catch(() => { if (!cancelled) setStreams([]); });
    return () => { cancelled = true; };
  }, [selectedClassRoomId, sourceEntry, isOpen]);

  // SMART DB FETCHING: Fetch and strictly filter Strands by the Class Grade
  useEffect(() => {
    if (!isOpen || sourceEntry || !selectedLearningAreaId || !selectedClassRoomId) {
      setStrands([]);
      setSelectedStrandId('');
      setStrandTitle('');
      return;
    }

    const selectedClass = classes.find(c => c.id === selectedClassRoomId);
    const classGradeFormat = selectedClass?.gradeLevel || '';

    setLoadingStrands(true);
    apiService.getStrandsByLearningArea(selectedLearningAreaId, classGradeFormat,academicContext)
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
  }, [selectedLearningAreaId, selectedClassRoomId, classes, isOpen, sourceEntry]);

  useEffect(() => {
    if (sourceEntry || !selectedStrandId || !isOpen || isCustomStrand) {
      setSubStrands([]);
      setSelectedSubStrandId('');
      setSubStrandTitle('');
      if (isCustomStrand) setIsCustomSubStrand(true);
      return;
    }

    apiService.getSubStrandsByStrand(selectedStrandId,academicContext)
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
  }, [selectedStrandId, isOpen, isCustomStrand, sourceEntry]);

  useEffect(() => {
    if (!isOpen || !sourceEntry || !selectedClassRoomId) return;
    let cancelled = false;
    apiService.getAssessmentRoster({ ...academicContext, classroomId: selectedClassRoomId, streamId: selectedStreamId || undefined })
      .then((res) => {
        if (cancelled) return;
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const boys = res.data.filter((s: any) => s.gender === 'MALE' || s.gender === 'Boy').length;
          const girls = res.data.filter((s: any) => s.gender === 'FEMALE' || s.gender === 'Girl').length;
          setRollBoys(String(boys));
          setRollGirls(String(girls));
        }
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedClassRoomId, selectedStreamId, isOpen, sourceEntry]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!sourceEntry?.schemeOfWorkEntryId) {
      setError('Choose a scheduled lesson from the term scheme before creating its lesson plan.');
      setIsLoading(false);
      return;
    }

    if (!selectedClassRoomId || !selectedLearningAreaId) {
      setError('Please select a class and learning area');
      setIsLoading(false);
      return;
    }

    const teacherId = user?.id || '';
    const finalStrandTitle = sourceEntry?.strandTitle || (isCustomStrand || strands.length === 0 ? customStrandTitle : strandTitle) || strands.find(s => s.id === selectedStrandId)?.title || customStrandTitle;
    const finalSubStrandTitle = sourceEntry?.subStrandTitle || (isCustomSubStrand || subStrands.length === 0 || isCustomStrand ? customSubStrandTitle : subStrandTitle) || subStrands.find(s => s.id === selectedSubStrandId)?.title || customSubStrandTitle;

    if (!finalStrandTitle.trim() || !finalSubStrandTitle.trim()) {
      setError('Curriculum Strand and Sub-strand are required');
      setIsLoading(false);
      return;
    }

    // Auto-save custom strand & sub-strand to DB on the fly
    if (!sourceEntry && (isCustomStrand || strands.length === 0)) {
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
            specificLearningOutcomes: [outcomes.trim() || 'Demonstrates competency']
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    if (steps.reduce((sum, step) => sum + step.durationMinutes, 0) !== durationMinutes) {
      setError('Phase times must add up to the lesson duration.'); setIsLoading(false); return;
    }

    try {
      const res = await apiService.createLessonPlan({
        teacherId,
        schemeOfWorkEntryId: sourceEntry?.schemeOfWorkEntryId,
        academicYearId: sourceEntry?.academicYearId,
        termId: sourceEntry?.termId,
        learningAreaId: selectedLearningAreaId,
        classRoomId: selectedClassRoomId,
        streamId: selectedStreamId || undefined,
        weekNumber: weekNumber ? Number(weekNumber) : undefined,
        lessonNumber: lessonNumber ? Number(lessonNumber) : undefined,
        lessonTime: lessonTime || undefined,
        pcis: pcis.split('\n').map(s => s.trim()).filter(Boolean),
        lessonDate,
        durationMinutes,
        rollBoys: Number(rollBoys) || 0,
        rollGirls: Number(rollGirls) || 0,
        strand: finalStrandTitle.trim(),
        subStrand: finalSubStrandTitle.trim(),
        specificLearningOutcomes: outcomes.split('\n').map(s => s.trim()).filter(Boolean),
        keyInquiryQuestions: inquiryQuestion.split('\n').map(s => s.trim()).filter(Boolean),
        coreCompetenciesAddressed: competencies,
        valuesAddressed: values,
        learningResources: resources.split('\n').map(s => s.trim()).filter(Boolean),
        learningExperiences: learningExperiences.split('\n').map(s => s.trim()).filter(Boolean),
        assessmentMethods: assessmentMethods.split('\n').map(s => s.trim()).filter(Boolean),
        ...templateDetails,
        otherLearningAreas: (templateDetails.otherLearningAreas||[]).map(value=>value.trim()).filter(Boolean),
        steps,
        extendedActivity: extendedActivity.trim() || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-5" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="create-lesson-plan-title" className="my-auto flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-surface-container-lowest shadow-2xl sm:rounded-3xl">
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#651020] via-primary to-[#9c2942] px-5 py-5 text-white sm:px-7">
          <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full border-[24px] border-white/5" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20"><span className="material-symbols-outlined text-2xl">menu_book</span></div>
              <div><span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">CBC lesson preparation</span><h2 id="create-lesson-plan-title" className="mt-2 text-xl font-bold sm:text-2xl">{revisionPlan?'Revise lesson plan':'Create lesson plan'}</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-rose-100 sm:text-sm">Prepare the lesson before class. Add what learners will do, then record teaching and reflection after the lesson.</p></div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close lesson plan form" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/15 text-white transition hover:bg-black/30"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2 text-[10px] sm:max-w-lg sm:gap-3 sm:text-xs"><div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10"><strong className="block">1 · Plan</strong><span className="text-rose-100">Before class</span></div><div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10"><strong className="block">2 · Teach</strong><span className="text-rose-100">In the lesson</span></div><div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10"><strong className="block">3 · Reflect</strong><span className="text-rose-100">After class</span></div></div>
        </header>

        {!sourceEntry ? <div className="min-h-0 flex-1 overflow-y-auto bg-surface p-4 sm:p-6"><ApprovedSchemePicker onSelect={setPickedSourceEntry} onOpenSchemes={onNavigateTab ? () => { onClose(); onNavigateTab('scheme-of-work-builder'); } : undefined} /></div> : <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col bg-surface">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
            {!providedSourceEntry && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 text-sm"><p>From <strong>{sourceEntry.schemeTitle || 'approved scheme'}</strong> · {sourceEntry.subStrandTitle}</p><button type="button" className="ui-button" disabled={isLoading} onClick={() => { if (window.confirm('Choose another approved session? Unsaved lesson-plan details will be cleared.')) { setPickedSourceEntry(undefined); setSelectedClassRoomId(''); setSelectedLearningAreaId(''); setClasses([]); setLearningAreas([]); setStreams([]); setError(null); } }}>Choose another scheme or session</button></div>}
            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-primary"><span className="material-symbols-outlined">event</span></span><div><h3 className="font-bold text-on-surface">Lesson & class</h3><p className="text-xs text-on-surface-variant">Set the lesson timing and teaching group.</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold text-on-surface-variant">Sub-strand<input aria-label="Lesson sub-strand" readOnly value={sourceEntry.subStrandTitle || ''} className={fieldClass} /></label>
                <label className="text-xs font-semibold text-on-surface-variant">Date<input aria-label="Lesson date" type="date" required readOnly={Boolean(sourceEntry)} value={lessonDate} onChange={e => setLessonDate(e.target.value)} className={fieldClass} /></label>
                <label className="text-xs font-semibold text-on-surface-variant">Time<input aria-label="Time" readOnly={Boolean(sourceEntry)} value={lessonTime} onChange={e => setLessonTime(e.target.value)} className={fieldClass} placeholder="e.g. 08:00–08:45" /></label>
                <label className="text-xs font-semibold text-on-surface-variant">Duration (minutes)<input aria-label="Lesson duration" type="number" min="1" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} className={fieldClass} /></label>
                <label className="text-xs font-semibold text-on-surface-variant">Class<select aria-label="Class" disabled={Boolean(sourceEntry)} value={selectedClassRoomId} onChange={e => setSelectedClassRoomId(e.target.value)} required className={fieldClass}>{sourceEntry && !classes.some(c => c.id === sourceEntry.classRoomId) && <option value={sourceEntry.classRoomId}>{sourceEntry.className || 'Approved scheme class'}</option>}{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label className="text-xs font-semibold text-on-surface-variant">Stream <span className="font-normal text-slate-400">(optional)</span><select aria-label="Stream" disabled={Boolean(sourceEntry)} value={selectedStreamId} onChange={e => setSelectedStreamId(e.target.value)} className={fieldClass}><option value="">All streams</option>{sourceEntry?.streamId && !streams.some(stream => stream.id === sourceEntry.streamId) && <option value={sourceEntry.streamId}>{sourceEntry.streamName || 'Approved scheme stream'}</option>}{streams.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}</select></label>
                <label className="text-xs font-semibold text-on-surface-variant">Learning area<select aria-label="Learning area" disabled={Boolean(sourceEntry)} value={selectedLearningAreaId} onChange={e => setSelectedLearningAreaId(e.target.value)} required className={fieldClass}>{sourceEntry && !availableLearningAreas.some(area => area.id === sourceEntry.learningAreaId) && <option value={sourceEntry.learningAreaId}>{sourceEntry.learningAreaName || 'Approved scheme learning area'}</option>}{availableLearningAreas.map(la => <option key={la.id} value={la.id}>{la.name}</option>)}</select></label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-on-surface-variant">Boys present<input aria-label="Roll (Boys)" type="number" min="0" value={rollBoys} onChange={e => setRollBoys(e.target.value)} className={fieldClass} /></label><label className="text-xs font-semibold text-on-surface-variant">Girls present<input aria-label="Roll (Girls)" type="number" min="0" value={rollGirls} onChange={e => setRollGirls(e.target.value)} className={fieldClass} /></label><label className="text-xs font-semibold text-on-surface-variant">PCIs <span className="font-normal text-slate-400">(one per line)</span><textarea aria-label="PCIs" rows={1} value={pcis} onChange={e => setPcis(e.target.value)} className={fieldClass} placeholder="Relevant issues to integrate" /></label></div>
            </section>

            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-primary"><span className="material-symbols-outlined">account_tree</span></span><div><h3 className="font-bold text-on-surface">Curriculum focus</h3><p className="text-xs text-on-surface-variant">Connect the lesson to its strand and learning outcomes.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><div className="mb-1.5 flex items-center justify-between gap-2"><label className="text-xs font-semibold text-on-surface-variant">Strand <span className="text-primary">*</span></label>{strands.length > 0 && !sourceEntry && <button type="button" onClick={() => {setIsCustomStrand(!isCustomStrand);if (!isCustomStrand) setCustomStrandTitle(strandTitle || '');}} className="text-xs font-bold text-primary hover:underline">{isCustomStrand ? 'Choose from list' : '+ Add custom'}</button>}</div>
                  {sourceEntry?.strandTitle ? <input aria-label="Schemed strand" readOnly value={sourceEntry.strandTitle} className={fieldClass} /> : loadingStrands ? <div className="rounded-xl bg-surface p-3 text-xs text-on-surface-variant">Loading curriculum strands…</div> : isCustomStrand || strands.length === 0 ? <input type="text" required placeholder="Enter strand title" value={customStrandTitle} onChange={e => {setCustomStrandTitle(e.target.value);setStrandTitle(e.target.value);}} className={fieldClass} /> : <select aria-label="Curriculum Strand" value={selectedStrandId} onChange={e => {if (e.target.value === '__custom__') {setIsCustomStrand(true);setCustomStrandTitle('');setStrandTitle('');} else {setSelectedStrandId(e.target.value);setStrandTitle(strands.find(s => s.id === e.target.value)?.title || '');}}} required className={fieldClass}>{strands.map(st => <option key={st.id} value={st.id}>{st.title}</option>)}<option value="__custom__">+ Enter custom strand</option></select>}
                </div>
                <div><div className="mb-1.5 flex items-center justify-between gap-2"><label className="text-xs font-semibold text-on-surface-variant">Sub-strand <span className="text-primary">*</span></label>{subStrands.length > 0 && !isCustomStrand && !sourceEntry && <button type="button" onClick={() => {setIsCustomSubStrand(!isCustomSubStrand);if (!isCustomSubStrand) setCustomSubStrandTitle(subStrandTitle || '');}} className="text-xs font-bold text-primary hover:underline">{isCustomSubStrand ? 'Choose from list' : '+ Add custom'}</button>}</div>
                  {sourceEntry?.subStrandTitle ? <input aria-label="Schemed sub-strand" readOnly value={sourceEntry.subStrandTitle} className={fieldClass} /> : isCustomSubStrand || isCustomStrand || subStrands.length === 0 ? <input type="text" required placeholder="Enter sub-strand title" value={customSubStrandTitle} onChange={e => {setCustomSubStrandTitle(e.target.value);setSubStrandTitle(e.target.value);}} className={fieldClass} /> : <select aria-label="Sub-strand" value={selectedSubStrandId} onChange={e => {if (e.target.value === '__custom__') {setIsCustomSubStrand(true);setCustomSubStrandTitle('');setSubStrandTitle('');} else {setSelectedSubStrandId(e.target.value);const selected = subStrands.find(s => s.id === e.target.value);if (selected) {setSubStrandTitle(selected.title);setOutcomes(selected.specificLearningOutcomes?.join('\n') || '');}}}} required className={fieldClass}>{subStrands.map(sub => <option key={sub.id} value={sub.id}>{sub.title}</option>)}<option value="__custom__">+ Enter custom sub-strand</option></select>}
                </div>
                <label className="text-xs font-semibold text-on-surface-variant sm:col-span-2">Specific learning outcomes <span className="text-primary">*</span><textarea required rows={3} value={outcomes} onChange={e => setOutcomes(e.target.value)} className={fieldClass} placeholder="By the end of the lesson, learners should be able to:&#10;1. …&#10;2. …" /></label>
                <label className="text-xs font-semibold text-on-surface-variant">Key inquiry questions <span className="text-primary">*</span><textarea required rows={3} value={inquiryQuestion} onChange={e => setInquiryQuestion(e.target.value)} className={fieldClass} placeholder="List the questions that will guide learners’ inquiry." /></label>
                <label className="text-xs font-semibold text-on-surface-variant sm:col-span-2">Link to other learning areas<textarea aria-label="Link to other learning areas" rows={2} value={(templateDetails.otherLearningAreas||[]).join('\n')} onChange={e=>setTemplateDetails(old=>({...old,otherLearningAreas:e.target.value.split('\n')}))} className={fieldClass}/></label>
                <label className="text-xs font-semibold text-on-surface-variant">Learning experiences<textarea aria-label="Learning experiences" rows={3} value={learningExperiences} onChange={e => setLearningExperiences(e.target.value)} className={fieldClass} placeholder="One learning experience per line" /></label>
                <label className="text-xs font-semibold text-on-surface-variant">Assessment methods<textarea aria-label="Assessment methods" rows={3} value={assessmentMethods} onChange={e => setAssessmentMethods(e.target.value)} className={fieldClass} placeholder="One assessment method per line" /></label>
                <label className="text-xs font-semibold text-on-surface-variant">Learning resources <span className="text-primary">*</span><textarea required rows={3} value={resources} onChange={e => setResources(e.target.value)} className={fieldClass} placeholder="List textbooks, charts, apparatus or digital resources." /></label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-on-surface-variant">Core competencies<select multiple aria-label="Core Competencies" value={competencies} onChange={e => setCompetencies(Array.from(e.currentTarget.selectedOptions as HTMLCollectionOf<HTMLOptionElement>, o => o.value))} className={fieldClass+' min-h-28'}>{['COMMUNICATION_AND_COLLABORATION','CRITICAL_THINKING_AND_PROBLEM_SOLVING','CREATIVITY_AND_IMAGINATION','CITIZENSHIP','DIGITAL_LITERACY','LEARNING_TO_LEARN','SELF_EFFICACY'].map(v => <option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}</select><span className="mt-1 block text-[11px] font-normal text-slate-400">Hold Ctrl or Cmd to choose more than one.</span></label><label className="text-xs font-semibold text-on-surface-variant">Values<select multiple aria-label="Values" value={values} onChange={e => setValues(Array.from(e.currentTarget.selectedOptions as HTMLCollectionOf<HTMLOptionElement>, o => o.value))} className={fieldClass+' min-h-28'}>{['LOVE','RESPONSIBILITY','RESPECT','UNITY','PEACE','INTEGRITY','SOCIAL_JUSTICE'].map(v => <option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}</select><span className="mt-1 block text-[11px] font-normal text-slate-400">Choose values reinforced in this lesson.</span></label></div>
            </section>

            <section className="rounded-2xl border border-outline-variant/30 bg-white p-4 sm:p-5">
              <h3 className="font-bold">Application and assessment</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">{([['communityServiceActivities','Suggested community service learning activities'],['nonFormalActivity','Suggested non-formal activity']] as const).map(([key,label])=><label key={key} className="text-xs font-semibold">{label}<textarea aria-label={label} className={fieldClass} rows={3} value={templateDetails[key]||''} onChange={e=>setTemplateDetails(old=>({...old,[key]:e.target.value}))}/></label>)}</div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Assessment rubric</h4>{!templateDetails.assessmentRubric?<button type="button" className="ui-button" onClick={()=>setTemplateDetails(old=>({...old,assessmentRubric:Array.from({length:3},()=>({criterion:'',exceeds:'',meets:'',approaching:'',below:''}))}))}>Add assessment rubric</button>:<button type="button" className="ui-button" onClick={()=>setTemplateDetails(old=>({...old,assessmentRubric:undefined}))}>Remove rubric</button>}</div>
              {templateDetails.assessmentRubric&&<><p className="mt-2 text-xs text-slate-600">Complete at least three criteria and describe all four performance levels.</p><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[850px] text-xs"><thead><tr>{['Performance indicator / criterion','Level 4: Exceeds expectation','Level 3: Meets expectation','Level 2: Approaching expectation','Level 1: Below expectation'].map(label=><th key={label} className="border bg-rose-50 p-2 text-left">{label}</th>)}</tr></thead><tbody>{templateDetails.assessmentRubric.map((row,index)=><tr key={index}>{(['criterion','exceeds','meets','approaching','below'] as const).map(key=><td key={key} className="border p-2"><textarea required aria-label={`Criterion ${index+1} ${key}`} className={fieldClass} value={row[key]} onChange={e=>setTemplateDetails(old=>({...old,assessmentRubric:old.assessmentRubric?.map((item,i)=>i===index?{...item,[key]:e.target.value}:item)}))}/></td>)}</tr>)}</tbody></table></div><button type="button" className="ui-button mt-2" onClick={()=>setTemplateDetails(old=>({...old,assessmentRubric:[...(old.assessmentRubric||[]),{criterion:'',exceeds:'',meets:'',approaching:'',below:''}]}))}>Add criterion</button></>}
            </section>

            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-on-surface">Organisation of learning</h3><p className="mt-1 text-xs text-on-surface-variant">Use the lesson-plan sequence: introduction, lesson development and conclusion. Add development steps where needed.</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setSteps(old => {const conclusion=old.findIndex(s=>s.stepTitle==='Conclusion');const insertAt=conclusion<0?old.length:conclusion;const next=[...old];next.splice(insertAt,0,{stepNumber:0,stepTitle:`Lesson Development: Step ${old.filter(s=>s.stepTitle.startsWith('Lesson Development')).length+1}`,durationMinutes:5,teacherActivities:'',learnerActivities:''});return next.map((s,i)=>({...s,stepNumber:i+1}));})} className="rounded-lg border border-outline-variant/30 bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-rose-50">+ Add development step</button><span className={`rounded-full px-3 py-1 text-xs font-bold ${steps.reduce((sum, step) => sum + step.durationMinutes, 0) === durationMinutes ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{steps.reduce((sum, step) => sum + step.durationMinutes, 0)} / {durationMinutes} min</span></div></div>
              <div className="overflow-x-auto rounded-xl border border-outline-variant/30"><table className="w-full min-w-[860px] border-collapse text-left text-xs"><thead className="bg-surface-container-low text-[11px] uppercase tracking-wide text-on-surface-variant"><tr><th className="border-b border-outline-variant/30 px-3 py-3 w-48">Phase</th><th className="border-b border-outline-variant/30 px-3 py-3 w-24">Time</th><th className="border-b border-outline-variant/30 px-3 py-3">Teacher activities</th><th className="border-b border-outline-variant/30 px-3 py-3">Learner activities</th><th className="border-b border-outline-variant/30 px-3 py-3">Assessment criterion</th><th className="border-b border-outline-variant/30 px-3 py-3">Learning points</th><th className="border-b border-outline-variant/30 px-3 py-3">Stage resources</th><th className="border-b border-outline-variant/30 px-2 py-3 w-12"></th></tr></thead><tbody className="divide-y divide-slate-200">{steps.map((step,index)=><tr key={`${step.stepNumber}-${step.stepTitle}`} className="align-top"><td className="px-3 py-3 font-bold text-on-surface">{step.stepTitle}</td><td className="px-3 py-3"><label className="sr-only">{step.stepTitle} minutes</label><div className="flex items-center gap-1"><input aria-label={`${step.stepTitle} minutes`} type="number" min="1" required value={step.durationMinutes} onChange={e=>setSteps(old=>old.map((s,i)=>i===index?{...s,durationMinutes:Number(e.target.value)}:s))} className="w-16 rounded-lg border border-outline-variant/30 bg-white p-2 text-center"/><span className="text-on-surface-variant">min</span></div></td><td className="px-3 py-3"><textarea required rows={3} value={step.teacherActivities} onChange={e=>setSteps(old=>old.map((s,i)=>i===index?{...s,teacherActivities:e.target.value}:s))} className={fieldClass+' min-w-64'} placeholder="What will you guide, model or explain?"/></td><td className="px-3 py-3"><textarea required rows={3} value={step.learnerActivities} onChange={e=>setSteps(old=>old.map((s,i)=>i===index?{...s,learnerActivities:e.target.value}:s))} className={fieldClass+' min-w-64'} placeholder="What will learners practise, discuss or create?"/></td><td className="px-3 py-3"><textarea aria-label={`${step.stepTitle} assessment criterion`} rows={3} value={step.assessmentCriterion || ''} onChange={e=>setSteps(old=>old.map((s,i)=>i===index?{...s,assessmentCriterion:e.target.value}:s))} className={fieldClass+' min-w-48'} placeholder="How will you check learning?"/></td>{(['learningPoints','resources'] as const).map(key=><td key={key} className="px-3 py-3"><textarea aria-label={`${step.stepTitle} ${key==='learningPoints'?'learning points':'resources'}`} rows={3} value={step[key]||''} onChange={e=>setSteps(old=>old.map((s,i)=>i===index?{...s,[key]:e.target.value}:s))} className={fieldClass+' min-w-48'}/></td>)}<td className="px-2 py-3">{step.stepTitle.startsWith('Lesson Development:')&&<button type="button" aria-label={`Remove ${step.stepTitle}`} onClick={()=>setSteps(old=>old.filter((_,i)=>i!==index).map((s,i)=>({...s,stepNumber:i+1})))} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><span className="material-symbols-outlined text-lg">delete</span></button>}</td></tr>)}</tbody></table></div>
            </section>

            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm"><label className="text-xs font-semibold text-on-surface-variant">Extended activity <span className="font-normal text-slate-400">(optional)</span><textarea rows={3} value={extendedActivity} onChange={e => setExtendedActivity(e.target.value)} className={fieldClass} placeholder="Follow-up practice or home activity" /></label><p className="mt-3 rounded-xl bg-surface p-3 text-xs text-on-surface-variant">After class, open this lesson to save your comment and reflection. It will be kept with the lesson plan.</p></section>
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"><span className="font-bold">Could not save lesson plan.</span> {error}</div>}
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-variant/30 bg-surface-container-lowest px-4 py-3 sm:px-6"><p className="hidden text-xs text-on-surface-variant sm:block">Required fields are marked with <span className="font-bold text-primary">*</span></p><div className="ml-auto flex items-center gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low">Cancel</button><button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/15 transition hover:bg-primary-container disabled:cursor-wait disabled:opacity-60"><span className="material-symbols-outlined text-[18px]">{isLoading ? 'hourglass_top' : 'save'}</span><span>{isLoading ? 'Saving lesson plan…' : revisionPlan?'Save revised plan':'Save lesson plan'}</span></button></div></footer>
        </form>
        }
      </div>
    </div>
  );
};
