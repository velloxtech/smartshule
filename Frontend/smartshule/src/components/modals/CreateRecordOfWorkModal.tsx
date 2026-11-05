import React, { useState, useEffect } from 'react';
import { RecordOfWork, RecordOfWorkStatus, LearnerComprehension } from '../../types';
import { apiService } from '../../services/api';
import { ClassRoom, BackendLearningArea, BackendStrand, BackendSubStrand } from '../../types';
import { matchGradeLevels } from '../../utils/formatters';

interface CreateRecordOfWorkModalProps {
  onClose: () => void;
  onSubmit: (record: Omit<RecordOfWork, 'id'>) => Promise<void> | void;
}

export const CreateRecordOfWorkModal: React.FC<CreateRecordOfWorkModalProps> = ({ onClose, onSubmit }) => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState('');
  
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [selectedStrandId, setSelectedStrandId] = useState('');
  const [isCustomStrand, setIsCustomStrand] = useState(false);
  const [customStrandTitle, setCustomStrandTitle] = useState('');

  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState('');
  const [isCustomSubStrand, setIsCustomSubStrand] = useState(false);
  const [customSubStrandTitle, setCustomSubStrandTitle] = useState('');

  const [loadingStrands, setLoadingStrands] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    academicYear: new Date().getFullYear().toString(),
    term: 'Term 1',
    week: 1,
    day: 'Mon',
    lessonDate: new Date().toISOString().split('T')[0],
    period: '1',
    lessonTopic: '',
    learningObjectives: '',
    learningActivities: '',
    resources: '',
    subjectAndGrade: '',
    strandAndWorkCovered: '',
    reference: '',
    comments: '',
    comprehensionLevel: 'GOOD' as LearnerComprehension,
    whatWentWell: '',
    challengesFaced: '',
    remedialPlan: '',
    status: 'SUBMITTED' as RecordOfWorkStatus
  });

  const availableLearningAreas = React.useMemo(() => {
    if (!selectedClassId) return learningAreas;
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass?.gradeLevel) return learningAreas;
    const filtered = learningAreas.filter(la => matchGradeLevels(la.gradeLevel, selectedClass.gradeLevel));
    return filtered.length > 0 ? filtered : learningAreas;
  }, [learningAreas, selectedClassId, classes]);

  useEffect(() => {
    if (availableLearningAreas.length > 0) {
      if (!availableLearningAreas.some(la => la.id === selectedLearningAreaId)) {
        setSelectedLearningAreaId(availableLearningAreas[0].id);
      }
    }
  }, [availableLearningAreas, selectedLearningAreaId]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [cRes, laRes, summaryRes] = await Promise.all([
          apiService.getClasses().catch(() => null),
          apiService.getLearningAreas().catch(() => null),
          apiService.getRecordOfWorkSummary().catch(() => null)
        ]);
        
        if (cRes?.data && cRes.data.length > 0) {
          setClasses(cRes.data);
          setSelectedClassId(cRes.data[0].id);
        }
        if (laRes?.data && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          setSelectedLearningAreaId(laRes.data[0].id);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadInitial();
  }, []);

  // SMART DB FETCHING: Fetch and filter Strands by the Class Grade
  useEffect(() => {
    if (!selectedLearningAreaId || !selectedClassId) {
      setStrands([]);
      setSelectedStrandId('');
      return;
    }

    const selectedClass = classes.find(c => c.id === selectedClassId);
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
            setIsCustomStrand(false);
          } else {
            setSelectedStrandId('');
            setIsCustomStrand(true);
          }
        } else {
          setStrands([]);
          setSelectedStrandId('');
          setIsCustomStrand(true);
        }
      }).catch(() => {
        setStrands([]);
        setIsCustomStrand(true);
      })
      .finally(() => setLoadingStrands(false));
  }, [selectedLearningAreaId, selectedClassId, classes]);

  useEffect(() => {
    if (!selectedStrandId || isCustomStrand) {
      setSubStrands([]);
      setSelectedSubStrandId('');
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
            setIsCustomSubStrand(false);
          } else {
            setIsCustomSubStrand(true);
          }
        } else {
          setSubStrands([]);
          setSelectedSubStrandId('');
          setIsCustomSubStrand(true);
        }
      }).catch(() => {
        setSubStrands([]);
        setIsCustomSubStrand(true);
      });
  }, [selectedStrandId, isCustomStrand]);

  useEffect(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    const la = learningAreas.find(l => l.id === selectedLearningAreaId);
    const st = strands.find(s => s.id === selectedStrandId);
    const sub = subStrands.find(s => s.id === selectedSubStrandId);

    const finalStrand = (isCustomStrand || strands.length === 0 ? customStrandTitle : st?.title) || customStrandTitle;
    const finalSub = (isCustomSubStrand || isCustomStrand || subStrands.length === 0 ? customSubStrandTitle : sub?.title) || customSubStrandTitle;

    const subjectText = cls && la ? `${cls.name} - ${la.name}` : formData.subjectAndGrade;
    const workText = finalStrand && finalSub ? `${finalStrand} > ${finalSub}` : (finalStrand || formData.strandAndWorkCovered);

    setFormData(prev => ({
      ...prev,
      subjectAndGrade: subjectText,
      strandAndWorkCovered: workText
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedLearningAreaId, selectedStrandId, selectedSubStrandId, isCustomStrand, customStrandTitle, isCustomSubStrand, customSubStrandTitle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (targetStatus: RecordOfWorkStatus) => {
    setErrorMessage(null);
    setSubmitting(true);

    const cls = classes.find(c => c.id === selectedClassId);
    const la = learningAreas.find(l => l.id === selectedLearningAreaId);
    const st = strands.find(s => s.id === selectedStrandId);
    const sub = subStrands.find(s => s.id === selectedSubStrandId);

    const strandText = isCustomStrand || strands.length === 0 ? customStrandTitle : st?.title;
    const subStrandText = isCustomSubStrand || isCustomStrand || subStrands.length === 0 ? customSubStrandTitle : sub?.title;

    const payload: Omit<RecordOfWork, 'id'> = {
      academicYear: formData.academicYear,
      term: formData.term,
      classRoomId: selectedClassId,
      className: cls?.name,
      learningAreaId: selectedLearningAreaId,
      subjectName: la?.name,
      strandId: !isCustomStrand ? selectedStrandId : undefined,
      strand: strandText,
      subStrandId: !isCustomSubStrand ? selectedSubStrandId : undefined,
      subStrand: subStrandText,
      week: Number(formData.week),
      weekNumber: Number(formData.week),
      day: formData.day,
      lessonDate: formData.lessonDate,
      period: formData.period,
      lessonPeriod: formData.period,
      lessonTopic: formData.lessonTopic || formData.strandAndWorkCovered,
      learningObjectives: formData.learningObjectives,
      learningActivities: formData.learningActivities,
      resources: formData.resources || formData.reference,
      subjectAndGrade: formData.subjectAndGrade || `${cls?.name || 'Class'} ${la?.name || 'Subject'}`,
      strandAndWorkCovered: formData.strandAndWorkCovered || `${strandText || 'Strand'} - ${subStrandText || 'Topic'}`,
      reference: formData.reference || formData.resources || 'Standard CBC Text',
      status: targetStatus,
      comments: formData.comments,
      reflection: formData.whatWentWell || formData.challengesFaced ? `${formData.whatWentWell}. Challenges: ${formData.challengesFaced}. Plan: ${formData.remedialPlan}` : '',
      reflectionData: {
        comprehensionLevel: formData.comprehensionLevel,
        whatWentWell: formData.whatWentWell,
        challengesFaced: formData.challengesFaced,
        remedialPlan: formData.remedialPlan
      }
    };

    try {
      await onSubmit(payload);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to save diary entry. Please verify details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#7a1228] flex items-center justify-center">
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">New Teacher Diary Record</h2>
              <p className="text-xs text-gray-500">Record curriculum delivery, lesson outcomes & learner reflections</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
            <span className="material-symbols-outlined text-rose-600 text-[20px] shrink-0">error</span>
            <div>
              <p className="font-bold">Validation or Progression Error</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}
        
        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Metadata: Term, Week, Day, Date, Period */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Term</label>
              <select name="term" value={formData.term} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Week No. *</label>
              <input required type="number" name="week" min="1" max="15" value={formData.week} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-bold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Day *</label>
              <select name="day" value={formData.day} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer">
                <option value="Mon">Monday</option>
                <option value="Tue">Tuesday</option>
                <option value="Wed">Wednesday</option>
                <option value="Thu">Thursday</option>
                <option value="Fri">Friday</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Lesson Date *</label>
              <input type="date" name="lessonDate" value={formData.lessonDate} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Period</label>
              <input type="text" name="period" value={formData.period} onChange={handleChange} placeholder="e.g. 1" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" />
            </div>
          </div>

          {/* Class & Subject Selection */}
          <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Class / Grade *</label>
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer">
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Learning Area / Subject *</label>
                <select value={selectedLearningAreaId} onChange={(e) => setSelectedLearningAreaId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer">
                  {availableLearningAreas.length > 0 ? (
                    availableLearningAreas.map(la => <option key={la.id} value={la.id}>{la.name}</option>)
                  ) : (
                    <option value="">No subjects found</option>
                  )}
                </select>
              </div>
            </div>

            {/* CBC Strand & Substrand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-gray-600">Curriculum Strand *</label>
                  {strands.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomStrand(!isCustomStrand);
                        if (!isCustomStrand) {
                          setCustomStrandTitle(strands.find(s => s.id === selectedStrandId)?.title || '');
                        }
                      }}
                      className="text-[11px] text-[#7a1228] hover:underline font-bold"
                    >
                      {isCustomStrand ? 'Select From List' : '+ Custom Strand'}
                    </button>
                  )}
                </div>
                {loadingStrands ? (
                  <div className="px-3 py-2 text-xs text-gray-500">Loading strands...</div>
                ) : isCustomStrand || strands.length === 0 ? (
                  <input
                    type="text"
                    placeholder="Enter strand name..."
                    value={customStrandTitle}
                    onChange={(e) => setCustomStrandTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                ) : (
                  <select
                    value={selectedStrandId}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomStrand(true);
                        setCustomStrandTitle('');
                      } else {
                        setSelectedStrandId(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer"
                  >
                    {strands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    <option value="__custom__">+ Enter Custom Strand...</option>
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-gray-600">Sub-Strand</label>
                  {!isCustomStrand && subStrands.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubStrand(!isCustomSubStrand);
                        if (!isCustomSubStrand) {
                          setCustomSubStrandTitle(subStrands.find(s => s.id === selectedSubStrandId)?.title || '');
                        }
                      }}
                      className="text-[11px] text-[#7a1228] hover:underline font-bold"
                    >
                      {isCustomSubStrand ? 'Select From List' : '+ Custom Sub-Strand'}
                    </button>
                  )}
                </div>
                {isCustomSubStrand || isCustomStrand || subStrands.length === 0 ? (
                  <input
                    type="text"
                    placeholder="Enter sub-strand title..."
                    value={customSubStrandTitle}
                    onChange={(e) => setCustomSubStrandTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                ) : (
                  <select
                    value={selectedSubStrandId}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomSubStrand(true);
                        setCustomSubStrandTitle('');
                      } else {
                        setSelectedSubStrandId(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer"
                  >
                    {subStrands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    <option value="__custom__">+ Enter Custom Sub-strand...</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Lesson Details: Topic, Objectives, Activities, Resources */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Lesson Topic / Focus *</label>
              <input
                type="text"
                name="lessonTopic"
                placeholder="e.g. Identifying renewable and non-renewable energy sources"
                value={formData.lessonTopic}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Learning Objectives</label>
                <textarea
                  name="learningObjectives"
                  rows={2}
                  placeholder="By the end of the lesson, the learner should be able to..."
                  value={formData.learningObjectives}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Learning Activities & Methods</label>
                <textarea
                  name="learningActivities"
                  rows={2}
                  placeholder="Group discussion, hands-on experiment, question and answer..."
                  value={formData.learningActivities}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Teaching Resources & Reference Materials</label>
              <input
                type="text"
                name="reference"
                placeholder="e.g. Oxford Growing in Christ Grade 3, realia, charts, digital slides"
                value={formData.reference}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
              />
            </div>
          </div>

          {/* Structured Lesson Reflection & Evaluation */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-600 text-[19px]">psychology</span>
                Lesson Outcome & Reflection
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-800 uppercase">Comprehension:</span>
                <select
                  name="comprehensionLevel"
                  value={formData.comprehensionLevel}
                  onChange={handleChange}
                  className="px-2.5 py-1 text-xs border border-amber-300 rounded-lg bg-white font-semibold text-amber-900"
                >
                  <option value="EXCELLENT">Excellent (90%+ Mastery)</option>
                  <option value="GOOD">Good (75-89% Mastery)</option>
                  <option value="AVERAGE">Average (50-74% Mastery)</option>
                  <option value="BELOW_AVERAGE">Below Average (30-49%)</option>
                  <option value="POOR">Needs Urgent Remedial (&lt;30%)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">What Went Well</label>
                <textarea
                  name="whatWentWell"
                  rows={2}
                  placeholder="Most learners grasped the concept quickly during the activity..."
                  value={formData.whatWentWell}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300/80 rounded-xl focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">Challenges & Remedial Plan</label>
                <textarea
                  name="remedialPlan"
                  rows={2}
                  placeholder="3 learners struggled with calculation; scheduled remedial session..."
                  value={formData.remedialPlan}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300/80 rounded-xl focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Additional Teacher Comments <span className="font-normal">(Optional)</span></label>
            <input
              type="text"
              name="comments"
              placeholder="Any supervisor notes or remarks..."
              value={formData.comments}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl"
            />
          </div>
        </div>

        {/* Modal Footer with Draft vs Submit Options */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('DRAFT')}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">draft</span>
              {submitting ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave('SUBMITTED')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#7a1228] rounded-xl hover:bg-[#901530] transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRecordOfWorkModal;
