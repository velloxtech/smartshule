import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { BackendLearningArea, BackendStrand, BackendSubStrand } from '../../types';

export const StrandsView: React.FC = () => {
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('GRADE_7');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [subStrandsMap, setSubStrandsMap] = useState<Record<string, BackendSubStrand[]>>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Strand Modal
  const [isAddStrandOpen, setIsAddStrandOpen] = useState(false);
  const [strandCode, setStrandCode] = useState('');
  const [strandTitle, setStrandTitle] = useState('');
  const [strandDesc, setStrandDesc] = useState('');
  const [strandGradeLevel, setStrandGradeLevel] = useState('GRADE_1');

  // Add Sub-strand Modal
  const [isAddSubStrandOpen, setIsAddSubStrandOpen] = useState(false);
  const [selectedStrandId, setSelectedStrandId] = useState<string>('');
  const [subCode, setSubCode] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [outcomesText, setOutcomesText] = useState('');

  useEffect(() => {
    async function loadAreas() {
      try {
        const res = await apiService.getLearningAreas();
        if (res.success && res.data?.length) {
          setLearningAreas(res.data);
          if (res.data.length > 0) setSelectedAreaId(res.data[0].id);
        }
      } catch {
        setLearningAreas([]);
      }
    }
    loadAreas();
  }, []);

  const loadStrands = async (areaId: string, grade: string) => {
    if (!areaId) {
      setStrands([]);
      setSubStrandsMap({});
      return;
    }
    setLoading(true);
    try {
      // STRICT FILTERING: Only fetch strands for the currently selected grade tab
      const res = await apiService.getStrandsByLearningArea(areaId, grade);
      if (res.success && res.data) {
        // Double security filter
        const filteredStrands = res.data.filter(s => s.gradeLevel === grade);
        setStrands(filteredStrands);
        
        const subMap: Record<string, BackendSubStrand[]> = {};
        for (const st of filteredStrands) {
          const subRes = await apiService.getSubStrandsByStrand(st.id);
          if (subRes.success && subRes.data) {
            subMap[st.id] = subRes.data;
          }
        }
        setSubStrandsMap(subMap);
      } else {
        setStrands([]);
        setSubStrandsMap({});
      }
    } catch {
      setStrands([]);
      setSubStrandsMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrands(selectedAreaId, selectedGrade);
  }, [selectedAreaId, selectedGrade]);

  const handleDeleteStrand = async (strandId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete strand "${title}"?`)) {
      try {
        const res = await apiService.deleteStrand(strandId);
        if (res.success) {
          setStrands((prev) => prev.filter((s) => s.id !== strandId));
          const updated = { ...subStrandsMap };
          delete updated[strandId];
          setSubStrandsMap(updated);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete strand');
      }
    }
  };

  const handleDeleteSubStrand = async (subStrandId: string, title: string, strandId: string) => {
    if (window.confirm(`Are you sure you want to delete sub-strand "${title}"?`)) {
      try {
        const res = await apiService.deleteSubStrand(subStrandId);
        if (res.success) {
          setSubStrandsMap((prev) => ({
            ...prev,
            [strandId]: (prev[strandId] || []).filter((sub) => sub.id !== subStrandId),
          }));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete sub-strand');
      }
    }
  };

  const currentArea = learningAreas.find((a) => a.id === selectedAreaId);
  const currentStrand = strands.find((s) => s.id === selectedStrandId);

  const handleOpenAddStrand = () => {
    const areaPrefix = currentArea?.code ? currentArea.code.substring(0, 3).toUpperCase() : 'STR';
    const nextNumber = strands.length + 1;
    setStrandCode(`${areaPrefix}-${nextNumber.toString().padStart(2, '0')}`);
    setStrandTitle('');
    setStrandDesc('');
    setStrandGradeLevel(selectedGrade);
    setIsAddStrandOpen(true);
  };

  const handleCreateStrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await apiService.createStrand({
        learningAreaId: selectedAreaId,
        gradeLevel: strandGradeLevel,
        code: strandCode,
        title: strandTitle,
        description: strandDesc,
      });
      if (res.success) {
        setIsAddStrandOpen(false);
        if (strandGradeLevel === selectedGrade) {
          loadStrands(selectedAreaId, selectedGrade);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create strand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubStrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const outcomesArray = outcomesText.split('\n').map(o => o.trim()).filter(o => o.length > 0);
    if (outcomesArray.length === 0) {
      alert('Please enter at least one learning outcome.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await apiService.createSubStrand({
        strandId: selectedStrandId,
        code: subCode,
        title: subTitle,
        specificLearningOutcomes: outcomesArray,
      });
      if (res.success) {
        setIsAddSubStrandOpen(false);
        loadStrands(selectedAreaId, selectedGrade);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create sub-strand');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>CBC Competencies</span>
            <span>/</span>
            <span className="text-primary font-semibold">Strands & Sub-strands</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Global Subjects & Strands Dictionary
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddStrand}
            disabled={!selectedAreaId}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#7a1228] text-white rounded-xl hover:bg-[#5e0d1e] text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Add New Strand</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
        <label className="text-xs font-bold text-on-surface-variant uppercase">Select Grade:</label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="bg-white border border-outline-variant/40 rounded-lg p-2 text-xs font-bold text-primary focus:outline-primary cursor-pointer"
        >
          <option value="PLAYGROUP">Playgroup</option>
          <option value="PP1">PP1</option>
          <option value="PP2">PP2</option>
          <option value="GRADE_1">Grade 1</option>
          <option value="GRADE_2">Grade 2</option>
          <option value="GRADE_3">Grade 3</option>
          <option value="GRADE_4">Grade 4</option>
          <option value="GRADE_5">Grade 5</option>
          <option value="GRADE_6">Grade 6</option>
          <option value="GRADE_7">Grade 7</option>
          <option value="GRADE_8">Grade 8</option>
          <option value="GRADE_9">Grade 9</option>
        </select>
      </div>

      {learningAreas.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/30 pb-3">
          {learningAreas.map((la) => (
            <button
              key={la.id}
              onClick={() => setSelectedAreaId(la.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
                selectedAreaId === la.id
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="font-data-mono text-[10px] opacity-80">{la.code}</span>
              <span>{la.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-error font-medium p-3 bg-error/10 rounded-lg">
          No global learning areas defined yet.
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-on-surface-variant">Loading strands from syllabus backend...</div>
      ) : strands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strands.map((st) => {
            const subStrands = subStrandsMap[st.id] || [];
            return (
              <div key={st.id} className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-surface-container pb-2">
                    <div>
                      <span className="font-data-mono text-[10px] font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded mr-2">
                        {st.code}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Target: {st.gradeLevel.replace('_', ' ')}
                      </span>
                      <h3 className="font-bold text-sm text-primary mt-1">{st.title}</h3>
                    </div>
                  </div>

                  {st.description && <p className="text-xs text-on-surface-variant italic mt-1.5">{st.description}</p>}

                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                        Approved Sub-strands ({subStrands.length})
                      </span>
                      <button
                        onClick={() => {
                          setSelectedStrandId(st.id);
                          setSubCode(`SUB-${st.code.split('-').pop() || '1'}.1`);
                          setSubTitle('');
                          setOutcomesText('');
                          setIsAddSubStrandOpen(true);
                        }}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span>Add Sub-strand</span>
                      </button>
                    </div>

                    {subStrands.length > 0 ? (
                      <ul className="space-y-2 text-xs text-on-surface">
                        {subStrands.map((sub) => (
                          <li key={sub.id} className="p-2.5 rounded bg-surface-container-low space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary font-data-mono text-[11px]">{sub.code}</span>
                                <span className="font-semibold text-on-surface text-xs">{sub.title}</span>
                              </div>
                              <button onClick={() => handleDeleteSubStrand(sub.id, sub.title, st.id)} className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                            {sub.specificLearningOutcomes?.map((outcome, idx) => (
                              <div key={idx} className="text-[11px] text-on-surface-variant flex items-start gap-1.5 pl-1 mt-1 border-t border-outline-variant/10 pt-1">
                                <span className="material-symbols-outlined text-secondary text-[14px] shrink-0 mt-0.5">check_circle</span>
                                <span>{outcome}</span>
                              </div>
                            ))}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 text-center text-xs text-outline italic bg-surface-container-low rounded">
                        No sub-strands recorded yet.
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-surface-container flex items-center justify-end">
                  <button onClick={() => handleDeleteStrand(st.id, st.title)} className="text-xs text-error hover:underline flex items-center gap-1 cursor-pointer font-sans">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    <span>Delete Strand</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/30 text-center space-y-2">
          <span className="material-symbols-outlined text-outline text-[32px]">folder_open</span>
          <div className="font-bold text-sm text-on-surface">No Strands Found For {currentArea?.name || 'Selected Subject'} ({selectedGrade.replace('_', ' ')})</div>
        </div>
      )}

      {isAddStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base leading-tight">Create Curriculum Strand</h3>
                <p className="text-xs text-rose-100">Global Subject: {currentArea?.name}</p>
              </div>
              <button onClick={() => setIsAddStrandOpen(false)} className="p-1 rounded-lg text-rose-100 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            
            <form onSubmit={handleCreateStrand} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Target Grade Level *</label>
                <select value={strandGradeLevel} onChange={(e) => setStrandGradeLevel(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 font-bold text-on-surface focus:outline-primary cursor-pointer">
                  <option value="PLAYGROUP">Playgroup</option>
                  <option value="PP1">PP1</option>
                  <option value="PP2">PP2</option>
                  <option value="GRADE_1">Grade 1</option>
                  <option value="GRADE_2">Grade 2</option>
                  <option value="GRADE_3">Grade 3</option>
                  <option value="GRADE_4">Grade 4</option>
                  <option value="GRADE_5">Grade 5</option>
                  <option value="GRADE_6">Grade 6</option>
                  <option value="GRADE_7">Grade 7</option>
                  <option value="GRADE_8">Grade 8</option>
                  <option value="GRADE_9">Grade 9</option>
                </select>
                <p className="text-[10px] text-on-surface-variant mt-1">This ensures the strand only appears for students in this specific grade.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Strand Code</label>
                  <input type="text" required value={strandCode} onChange={(e) => setStrandCode(e.target.value.toUpperCase())} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 font-data-mono uppercase focus:outline-primary" />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Strand Title</label>
                  <input type="text" required value={strandTitle} onChange={(e) => setStrandTitle(e.target.value)} placeholder="e.g. Algebra" className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 focus:outline-primary" />
                </div>
              </div>
              
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/20 mt-2">
                <button type="button" onClick={() => setIsAddStrandOpen(false)} className="px-4 py-2.5 text-sm font-medium hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-[#7a1228] text-white text-sm font-semibold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Create Strand</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddSubStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full flex flex-col border border-outline-variant/30">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Add Sub-strand & Outcomes</h3>
                <p className="text-[10px] text-rose-100">Strand: {currentStrand?.title}</p>
              </div>
              <button onClick={() => setIsAddSubStrandOpen(false)} className="text-rose-100 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <form onSubmit={handleCreateSubStrand} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Code</label>
                  <input type="text" required value={subCode} onChange={(e) => setSubCode(e.target.value.toUpperCase())} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 font-data-mono uppercase focus:outline-primary" />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Title</label>
                  <input type="text" required value={subTitle} onChange={(e) => setSubTitle(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 focus:outline-primary" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Specific Learning Outcomes (One per line)</label>
                <textarea rows={4} required value={outcomesText} onChange={(e) => setOutcomesText(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 leading-relaxed focus:outline-primary" />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button type="button" onClick={() => setIsAddSubStrandOpen(false)} className="px-4 py-2 font-medium hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#7a1228] text-white font-semibold rounded-lg hover:bg-[#5e0d1e] shadow-md cursor-pointer disabled:opacity-50">Save Sub-strand</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};