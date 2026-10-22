import React, { useState, useEffect } from 'react';
import { RecordOfWork } from '../views/RecordsOfWorkView';
import { apiService } from '../../services/api';
import { ClassRoom, BackendLearningArea, BackendStrand, BackendSubStrand } from '../../types';

interface CreateRecordOfWorkModalProps {
  onClose: () => void;
  onSubmit: (record: Omit<RecordOfWork, 'id'>) => void;
}

export const CreateRecordOfWorkModal: React.FC<CreateRecordOfWorkModalProps> = ({ onClose, onSubmit }) => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState('');
  
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [selectedStrandId, setSelectedStrandId] = useState('');
  const [subStrands, setSubStrands] = useState<BackendSubStrand[]>([]);
  const [selectedSubStrandId, setSelectedSubStrandId] = useState('');
  const [loadingStrands, setLoadingStrands] = useState(false);

  const [formData, setFormData] = useState({
    term: 'Term 3',
    week: 1,
    day: 'Mon',
    period: '',
    subjectAndGrade: '',
    strandAndWorkCovered: '',
    reference: '',
    reflection: '',
    comments: ''
  });

  useEffect(() => {
    async function loadInitial() {
      const [cRes, laRes] = await Promise.all([
        apiService.getClasses().catch(() => null),
        apiService.getLearningAreas().catch(() => null)
      ]);
      
      if (cRes?.data && cRes.data.length > 0) {
        setClasses(cRes.data);
        setSelectedClassId(cRes.data[0].id);
      }
      if (laRes?.data && laRes.data.length > 0) {
        setLearningAreas(laRes.data);
        setSelectedLearningAreaId(laRes.data[0].id);
      }
    }
    loadInitial();
  }, []);

  // SMART DB FETCHING: Fetch and strictly filter Strands by the Class Grade
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
          // Strict frontend filter
          const gradeStrands = res.data.filter((st: any) => st.gradeLevel === classGradeFormat);
          setStrands(gradeStrands);
          
          if (gradeStrands.length > 0) {
            setSelectedStrandId(gradeStrands[0].id);
          } else {
            setSelectedStrandId('');
          }
        } else {
          setStrands([]);
          setSelectedStrandId('');
        }
      }).catch(() => setStrands([]))
        .finally(() => setLoadingStrands(false));
  }, [selectedLearningAreaId, selectedClassId, classes]);

  useEffect(() => {
    if (!selectedStrandId) {
      setSubStrands([]);
      setSelectedSubStrandId('');
      return;
    }
    apiService.getSubStrandsByStrand(selectedStrandId)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setSubStrands(res.data);
          setSelectedSubStrandId(res.data[0].id);
        } else {
          setSubStrands([]);
          setSelectedSubStrandId('');
        }
      }).catch(() => setSubStrands([]));
  }, [selectedStrandId]);

  useEffect(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    const la = learningAreas.find(l => l.id === selectedLearningAreaId);
    const st = strands.find(s => s.id === selectedStrandId);
    const sub = subStrands.find(s => s.id === selectedSubStrandId);

    const subjectText = cls && la ? `${cls.name} ${la.name}` : formData.subjectAndGrade;
    const workText = st && sub ? `${st.title} > ${sub.title}` : formData.strandAndWorkCovered;

    setFormData(prev => ({
      ...prev,
      subjectAndGrade: subjectText,
      strandAndWorkCovered: workText
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedLearningAreaId, selectedStrandId, selectedSubStrandId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, week: Number(formData.week) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-[#7a1228] flex items-center justify-center">
              <span className="material-symbols-outlined">add_notes</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Record of Work</h2>
              <p className="text-xs text-gray-500">Log your daily curriculum coverage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="create-record-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Term</label>
                <input required type="text" name="term" value={formData.term} onChange={handleChange} className="block w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Week</label>
                <input required type="number" name="week" min="1" value={formData.week} onChange={handleChange} className="block w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day</label>
                <select name="day" value={formData.day} onChange={handleChange} className="block w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors cursor-pointer">
                  <option value="Mon">Monday</option>
                  <option value="Tue">Tuesday</option>
                  <option value="Wed">Wednesday</option>
                  <option value="Thu">Thursday</option>
                  <option value="Fri">Friday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Period <span className="text-gray-400 font-normal">(Opt)</span></label>
                <input type="text" name="period" value={formData.period} onChange={handleChange} placeholder="e.g. 1" className="block w-full px-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Select Class *</label>
                  <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Global Subject *</label>
                  <select value={selectedLearningAreaId} onChange={(e) => setSelectedLearningAreaId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer">
                    {learningAreas.length > 0 ? (
                      learningAreas.map(la => <option key={la.id} value={la.id}>{la.name}</option>)
                    ) : (
                      <option value="">No subjects found</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Curriculum Strand</label>
                  {loadingStrands ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Loading DB strands...</div>
                  ) : strands.length > 0 ? (
                    <select value={selectedStrandId} onChange={(e) => setSelectedStrandId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer">
                      {strands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  ) : (
                    <div className="px-3 py-2 text-sm text-rose-600 bg-rose-50 rounded-lg border border-rose-100">No strands for this grade</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Sub-strand Topic</label>
                  {subStrands.length > 0 ? (
                    <select value={selectedSubStrandId} onChange={(e) => setSelectedSubStrandId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer">
                      {subStrands.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">-</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Subject & Grade</label>
                <span className="text-[10px] text-[#7a1228] bg-rose-100 px-2 py-0.5 rounded font-bold">Auto-filled (Editable)</span>
              </div>
              <input required type="text" name="subjectAndGrade" value={formData.subjectAndGrade} onChange={handleChange} className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Strand & Work Covered</label>
                <span className="text-[10px] text-[#7a1228] bg-rose-100 px-2 py-0.5 rounded font-bold">Auto-filled (Editable)</span>
              </div>
              <textarea required name="strandAndWorkCovered" rows={2} value={formData.strandAndWorkCovered} onChange={handleChange} className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reference Materials</label>
              <input required type="text" name="reference" placeholder="e.g., Oxford Growing in Christ Grade 3; Good News Bible" value={formData.reference} onChange={handleChange} className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
            </div>

            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">psychology</span>
                  Lesson Reflection & Evaluation
                </label>
                <span className="text-xs text-amber-700 font-medium">Outcome Mastery & Remedial Action</span>
              </div>
              <p className="text-xs text-amber-800/80">Self-evaluate lesson success: proportion of learners meeting the objective, challenges encountered, or remedial action taken.</p>
              <textarea name="reflection" rows={2} placeholder="e.g., Most learners (approx 85%) achieved the expected outcomes..." value={formData.reflection} onChange={handleChange} className="block w-full px-4 py-2 text-sm bg-white border border-amber-300/80 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-colors resize-none placeholder-gray-400" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comments / Remarks <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" name="comments" placeholder="Any additional teacher remarks..." value={formData.comments} onChange={handleChange} className="block w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] transition-colors" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">Cancel</button>
          <button type="submit" form="create-record-form" className="px-6 py-2.5 text-sm font-semibold text-white bg-[#7a1228] rounded-xl hover:bg-[#901530] transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Record
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRecordOfWorkModal;