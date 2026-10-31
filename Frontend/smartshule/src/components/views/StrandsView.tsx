import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { BackendLearningArea, BackendStrand, BackendSubStrand } from '../../types';

export const StrandsView: React.FC = () => {
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('GRADE_4');
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
  const [strandGradeLevel, setStrandGradeLevel] = useState('GRADE_4');

  // Edit Strand Modal
  const [isEditStrandOpen, setIsEditStrandOpen] = useState(false);
  const [editingStrand, setEditingStrand] = useState<BackendStrand | null>(null);
  const [editStrandCode, setEditStrandCode] = useState('');
  const [editStrandTitle, setEditStrandTitle] = useState('');
  const [editStrandDesc, setEditStrandDesc] = useState('');

  // Add Sub-strand Modal
  const [isAddSubStrandOpen, setIsAddSubStrandOpen] = useState(false);
  const [selectedStrandId, setSelectedStrandId] = useState<string>('');
  const [subCode, setSubCode] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [outcomesText, setOutcomesText] = useState('');

  // Edit Sub-strand Modal
  const [isEditSubStrandOpen, setIsEditSubStrandOpen] = useState(false);
  const [editingSubStrand, setEditingSubStrand] = useState<BackendSubStrand | null>(null);
  const [editSubCode, setEditSubCode] = useState('');
  const [editSubTitle, setEditSubTitle] = useState('');
  const [editOutcomesText, setEditOutcomesText] = useState('');

  useEffect(() => {
    async function loadAreas() {
      try {
        const res = await apiService.getLearningAreas();
        if (res.success && res.data?.length) {
          setLearningAreas(res.data);
          if (res.data.length > 0) {
            setSelectedAreaId(res.data[0].id);
          }
        }
      } catch {
        setLearningAreas([]);
      }
    }
    loadAreas();
  }, []);

  // GLOBAL SUBJECTS FIX: Make all global database subjects available for selection
  const availableAreas = useMemo(() => {
    return learningAreas;
  }, [learningAreas]);

  // Keep selectedAreaId valid
  useEffect(() => {
    if (availableAreas.length > 0) {
      if (!availableAreas.some(a => a.id === selectedAreaId)) {
        setSelectedAreaId(availableAreas[0].id);
      }
    } else {
      setSelectedAreaId('');
      setStrands([]);
      setSubStrandsMap({});
    }
  }, [availableAreas, selectedAreaId]);

  const loadStrands = async (areaId: string, grade: string) => {
    if (!areaId) {
      setStrands([]);
      setSubStrandsMap({});
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.getStrandsByLearningArea(areaId, grade);
      if (res.success && res.data) {
        // Filter strands by grade level if specified, or show all if universal
        const filteredStrands = res.data.filter(s => !s.gradeLevel || s.gradeLevel === grade);
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
    if (selectedAreaId) {
      loadStrands(selectedAreaId, selectedGrade);
    }
  }, [selectedAreaId, selectedGrade]);

  const handleDeleteStrand = async (strandId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete strand "${title}"? This will also remove associated sub-strands.`)) {
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

  const currentArea = availableAreas.find((a) => a.id === selectedAreaId);
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

  const handleOpenEditStrand = (st: BackendStrand) => {
    setEditingStrand(st);
    setEditStrandCode(st.code);
    setEditStrandTitle(st.title);
    setEditStrandDesc(st.description || '');
    setIsEditStrandOpen(true);
  };

  const handleUpdateStrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStrand) return;
    setIsSubmitting(true);
    try {
      const res = await apiService.updateStrand(editingStrand.id, {
        code: editStrandCode,
        title: editStrandTitle,
        description: editStrandDesc,
      });
      if (res.success) {
        setIsEditStrandOpen(false);
        setEditingStrand(null);
        loadStrands(selectedAreaId, selectedGrade);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update strand');
    } finally {
      setIsSubmitting(false);
    }
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
        loadStrands(selectedAreaId, selectedGrade);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create strand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddSubStrand = (st: BackendStrand) => {
    setSelectedStrandId(st.id);
    const existingCount = (subStrandsMap[st.id] || []).length;
    setSubCode(`${st.code}.${existingCount + 1}`);
    setSubTitle('');
    setOutcomesText('');
    setIsAddSubStrandOpen(true);
  };

  const handleOpenEditSubStrand = (sub: BackendSubStrand, strandId: string) => {
    setEditingSubStrand(sub);
    setSelectedStrandId(strandId);
    setEditSubCode(sub.code);
    setEditSubTitle(sub.title);
    setEditOutcomesText(sub.specificLearningOutcomes?.join('\n') || '');
    setIsEditSubStrandOpen(true);
  };

  const handleUpdateSubStrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubStrand) return;
    setIsSubmitting(true);

    const outcomesArray = editOutcomesText.split('\n').map(o => o.trim()).filter(o => o.length > 0);
    if (outcomesArray.length === 0) {
      alert('Please enter at least one learning outcome.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await apiService.updateSubStrand(editingSubStrand.id, {
        code: editSubCode,
        title: editSubTitle,
        specificLearningOutcomes: outcomesArray,
      });
      if (res.success) {
        setIsEditSubStrandOpen(false);
        setEditingSubStrand(null);
        loadStrands(selectedAreaId, selectedGrade);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update sub-strand');
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
            <span className="text-primary font-semibold">Strands &amp; Sub-strands</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Official CBC Strands &amp; Sub-Strands Dictionary
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            KICD Curriculum Strands, Sub-strands, and Learning Outcomes scoped by Grade and Learning Area.
          </p>
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

      {/* Grade Selector */}
      <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
        <label className="text-xs font-bold text-on-surface-variant uppercase">Filter Scope Grade:</label>
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
        <span className="text-[11px] text-on-surface-variant font-medium">
          Showing all {availableAreas.length} verified global school subjects
        </span>
      </div>

      {/* Global Learning Areas Chips */}
      {availableAreas.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/30 pb-3">
          {availableAreas.map((la) => (
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
          No learning areas defined in the global database dictionary.
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="p-8 text-center text-xs text-outline italic">Loading curriculum strands...</div>
      ) : strands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strands.map((st) => {
            const subs = subStrandsMap[st.id] || [];
            return (
              <div key={st.id} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-outline-variant/20 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-data-mono bg-primary/10 text-primary">{st.code}</span>
                        <h3 className="font-bold text-sm text-on-surface">{st.title}</h3>
                      </div>
                      {st.description && <p className="text-xs text-on-surface-variant mt-1">{st.description}</p>}
                    </div>
                    <button
                      onClick={() => handleOpenAddSubStrand(st)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-surface-container hover:bg-surface-container-high rounded text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>Sub-strand</span>
                    </button>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-outline tracking-wider block mb-1.5">
                      Sub-strands &amp; Specific Learning Outcomes ({subs.length})
                    </span>
                    {subs.length > 0 ? (
                      <ul className="space-y-2">
                        {subs.map((sub) => (
                          <li key={sub.id} className="p-2.5 rounded bg-surface-container-low space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary font-data-mono text-[11px]">{sub.code}</span>
                                <span className="font-semibold text-on-surface text-xs">{sub.title}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditSubStrand(sub, st.id)}
                                  className="p-1 rounded text-outline hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                  title="Edit sub-strand"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteSubStrand(sub.id, sub.title, st.id)}
                                  className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                  title="Delete sub-strand"
                                >
                                  <span className="material-symbols-outlined text-[14px]">delete</span>
                                </button>
                              </div>
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
                <div className="pt-2 border-t border-surface-container flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEditStrand(st)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    <span>Edit Strand</span>
                  </button>
                  <button
                    onClick={() => handleDeleteStrand(st.id, st.title)}
                    className="text-xs text-error hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
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
          <div className="font-bold text-sm text-on-surface">No Strands Found For {currentArea?.name || 'Selected Subject'}</div>
          <p className="text-xs text-on-surface-variant">Click &quot;Add New Strand&quot; to populate curriculum content for this learning area.</p>
        </div>
      )}

      {/* Add Strand Modal */}
      {isAddStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base leading-tight">Create Curriculum Strand</h3>
                <p className="text-xs text-rose-100">Learning Area: {currentArea?.name}</p>
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

              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Description (Optional)</label>
                <textarea rows={2} value={strandDesc} onChange={(e) => setStrandDesc(e.target.value)} placeholder="Overview of the strand content..." className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 focus:outline-primary" />
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

      {/* Edit Strand Modal */}
      {isEditStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base leading-tight">Edit Curriculum Strand</h3>
                <p className="text-xs text-rose-100">Learning Area: {currentArea?.name}</p>
              </div>
              <button onClick={() => setIsEditStrandOpen(false)} className="p-1 rounded-lg text-rose-100 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            
            <form onSubmit={handleUpdateStrand} className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Strand Code</label>
                  <input type="text" required value={editStrandCode} onChange={(e) => setEditStrandCode(e.target.value.toUpperCase())} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 font-data-mono uppercase focus:outline-primary" />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Strand Title</label>
                  <input type="text" required value={editStrandTitle} onChange={(e) => setEditStrandTitle(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 focus:outline-primary" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Description (Optional)</label>
                <textarea rows={2} value={editStrandDesc} onChange={(e) => setEditStrandDesc(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 focus:outline-primary" />
              </div>
              
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/20 mt-2">
                <button type="button" onClick={() => setIsEditStrandOpen(false)} className="px-4 py-2.5 text-sm font-medium hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-[#7a1228] text-white text-sm font-semibold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-strand Modal */}
      {isAddSubStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full flex flex-col border border-outline-variant/30">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Add Sub-strand &amp; Outcomes</h3>
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
                <textarea rows={4} required value={outcomesText} onChange={(e) => setOutcomesText(e.target.value)} placeholder="e.g. Count whole numbers up to 100&#10;Identify place value of digits" className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 leading-relaxed focus:outline-primary" />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button type="button" onClick={() => setIsAddSubStrandOpen(false)} className="px-4 py-2 font-medium hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#7a1228] text-white font-semibold rounded-lg hover:bg-[#5e0d1e] shadow-md cursor-pointer disabled:opacity-50">Save Sub-strand</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sub-strand Modal */}
      {isEditSubStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full flex flex-col border border-outline-variant/30">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Edit Sub-strand &amp; Outcomes</h3>
                <p className="text-[10px] text-rose-100">Strand: {currentStrand?.title}</p>
              </div>
              <button onClick={() => setIsEditSubStrandOpen(false)} className="text-rose-100 hover:text-white cursor-pointer"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <form onSubmit={handleUpdateSubStrand} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Code</label>
                  <input type="text" required value={editSubCode} onChange={(e) => setEditSubCode(e.target.value.toUpperCase())} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 font-data-mono uppercase focus:outline-primary" />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant uppercase mb-1">Title</label>
                  <input type="text" required value={editSubTitle} onChange={(e) => setEditSubTitle(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 focus:outline-primary" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant uppercase mb-1">Specific Learning Outcomes (One per line)</label>
                <textarea rows={4} required value={editOutcomesText} onChange={(e) => setEditOutcomesText(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 leading-relaxed focus:outline-primary" />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/20">
                <button type="button" onClick={() => setIsEditSubStrandOpen(false)} className="px-4 py-2 font-medium hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#7a1228] text-white font-semibold rounded-lg hover:bg-[#5e0d1e] shadow-md cursor-pointer disabled:opacity-50">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};