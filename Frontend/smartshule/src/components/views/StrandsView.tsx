import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { BackendLearningArea, BackendStrand, BackendSubStrand } from '../../types';

export const StrandsView: React.FC = () => {
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('la-science-7');
  const [strands, setStrands] = useState<BackendStrand[]>([]);
  const [subStrandsMap, setSubStrandsMap] = useState<Record<string, BackendSubStrand[]>>({});
  const [loading, setLoading] = useState(false);

  // Add Strand Modal
  const [isAddStrandOpen, setIsAddStrandOpen] = useState(false);
  const [strandCode, setStrandCode] = useState('STR-02');
  const [strandTitle, setStrandTitle] = useState('Energy and Change');
  const [strandDesc, setStrandDesc] = useState('Study of forms of energy and thermal dynamics');

  // Add Sub-strand Modal
  const [isAddSubStrandOpen, setIsAddSubStrandOpen] = useState(false);
  const [selectedStrandId, setSelectedStrandId] = useState<string>('');
  const [subCode, setSubCode] = useState('SUB-2.1');
  const [subTitle, setSubTitle] = useState('Conduction, Convection and Radiation');
  const [outcomesText, setOutcomesText] = useState('Demonstrate heat transfer in liquids and solids safely');

  useEffect(() => {
    async function loadAreas() {
      try {
        const res = await apiService.getLearningAreas();
        if (res.success && res.data?.length) {
          setLearningAreas(res.data);
          setSelectedAreaId(res.data[0].id);
        } else {
          setLearningAreas([
            { id: 'la-science-7', name: 'Integrated Science', code: 'SCIE7', gradeLevel: 'GRADE_7', educationLevel: 'JUNIOR_SCHOOL', isElective: false, schoolId: 'school-001' },
            { id: 'la-math-7', name: 'Mathematics', code: 'MATH7', gradeLevel: 'GRADE_7', educationLevel: 'JUNIOR_SCHOOL', isElective: false, schoolId: 'school-001' }
          ]);
        }
      } catch {
        // Fallback
      }
    }
    loadAreas();
  }, []);

  const loadStrands = async (areaId: string) => {
    if (!areaId) return;
    setLoading(true);
    try {
      const res = await apiService.getStrandsByLearningArea(areaId);
      if (res.success && res.data) {
        setStrands(res.data);
        const subMap: Record<string, BackendSubStrand[]> = {};
        for (const st of res.data) {
          const subRes = await apiService.getSubStrandsByStrand(st.id);
          if (subRes.success && subRes.data) {
            subMap[st.id] = subRes.data;
          }
        }
        setSubStrandsMap(subMap);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrands(selectedAreaId);
  }, [selectedAreaId]);

  const handleCreateStrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createStrand({
        learningAreaId: selectedAreaId,
        gradeLevel: 'GRADE_7',
        code: strandCode,
        title: strandTitle,
        description: strandDesc,
      });
      if (res.success) {
        setIsAddStrandOpen(false);
        loadStrands(selectedAreaId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create strand');
    }
  };

  const handleCreateSubStrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createSubStrand({
        strandId: selectedStrandId,
        code: subCode,
        title: subTitle,
        specificLearningOutcomes: [outcomesText],
      });
      if (res.success) {
        setIsAddSubStrandOpen(false);
        loadStrands(selectedAreaId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create sub-strand');
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
            KICD Curriculum Strands & Learning Outcomes
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Competency-Based Curriculum framework, specific learning outcomes, and assessment rubrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddStrandOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Strand</span>
          </button>
        </div>
      </div>

      {/* Learning Area Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 overflow-x-auto">
        {learningAreas.map((la) => (
          <button
            key={la.id}
            onClick={() => setSelectedAreaId(la.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              selectedAreaId === la.id
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="font-data-mono text-[10px] opacity-80">{la.code}</span>
            <span>{la.name}</span>
          </button>
        ))}
      </div>

      {/* Strands & Sub-strands List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-on-surface-variant">Loading strands from syllabus backend...</div>
      ) : strands.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strands.map((st) => {
            const subStrands = subStrandsMap[st.id] || [];
            return (
              <div
                key={st.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-surface-container pb-2">
                    <div>
                      <span className="font-data-mono text-[10px] font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                        {st.code}
                      </span>
                      <h3 className="font-bold text-sm text-primary mt-1">{st.title}</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-secondary bg-secondary-container px-2 py-0.5 rounded">
                      KICD Verified
                    </span>
                  </div>

                  {st.description && (
                    <p className="text-xs text-on-surface-variant italic mt-1.5">{st.description}</p>
                  )}

                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                        Approved Sub-strands ({subStrands.length})
                      </span>
                      <button
                        onClick={() => {
                          setSelectedStrandId(st.id);
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
                              <span className="font-bold text-primary font-data-mono text-[11px]">{sub.code}</span>
                              <span className="font-semibold text-on-surface text-xs">{sub.title}</span>
                            </div>
                            {sub.specificLearningOutcomes?.map((outcome, idx) => (
                              <div key={idx} className="text-[11px] text-on-surface-variant flex items-start gap-1.5 pl-1">
                                <span className="material-symbols-outlined text-secondary text-[14px] shrink-0 mt-0.5">check_circle</span>
                                <span>{outcome}</span>
                              </div>
                            ))}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 text-center text-xs text-outline italic bg-surface-container-low rounded">
                        No sub-strands recorded yet. Click "Add Sub-strand" to add learning outcomes.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-surface-container text-[10px] text-outline font-data-mono">
                  Strand ID: {st.id}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/30 text-center space-y-2">
          <span className="material-symbols-outlined text-outline text-[32px]">folder_open</span>
          <div className="font-bold text-sm text-on-surface">No Strands Found For Selected Subject</div>
          <p className="text-xs text-on-surface-variant">Click the "Add Strand" button above to add the first curriculum strand.</p>
        </div>
      )}

      {/* Add Strand Modal */}
      {isAddStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Add New Curriculum Strand</h3>
              <button onClick={() => setIsAddStrandOpen(false)} className="text-rose-100 hover:text-white cursor-pointer p-1 rounded-lg">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateStrand} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Strand Code</label>
                <input
                  type="text"
                  required
                  value={strandCode}
                  onChange={(e) => setStrandCode(e.target.value)}
                  placeholder="e.g. STR-02"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 font-data-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Strand Title</label>
                <input
                  type="text"
                  required
                  value={strandTitle}
                  onChange={(e) => setStrandTitle(e.target.value)}
                  placeholder="e.g. Measurement"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Strand Description</label>
                <textarea
                  rows={2}
                  value={strandDesc}
                  onChange={(e) => setStrandDesc(e.target.value)}
                  placeholder="Focus areas and competency scope"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container cursor-pointer transition-colors"
                >
                  Create Strand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-strand Modal */}
      {isAddSubStrandOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Add Sub-strand & Outcome</h3>
              <button onClick={() => setIsAddSubStrandOpen(false)} className="text-rose-100 hover:text-white cursor-pointer p-1 rounded-lg">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateSubStrand} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Sub-strand Code</label>
                <input
                  type="text"
                  required
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  placeholder="e.g. SUB-2.1"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 font-data-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Sub-strand Title</label>
                <input
                  type="text"
                  required
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="e.g. Heat and Temperature"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Specific Learning Outcome</label>
                <textarea
                  rows={2}
                  required
                  value={outcomesText}
                  onChange={(e) => setOutcomesText(e.target.value)}
                  placeholder="Describe measurable skill/competency"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container cursor-pointer transition-colors"
                >
                  Save Sub-strand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
