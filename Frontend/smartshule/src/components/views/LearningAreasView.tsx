import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { BackendLearningArea } from '../../types';

export const LearningAreasView: React.FC = () => {
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [gradeLevel, setGradeLevel] = useState('GRADE_7');
  const [educationLevel, setEducationLevel] = useState('JUNIOR_SCHOOL');
  const [isElective, setIsElective] = useState(false);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const res = await apiService.getLearningAreas();
      if (res.success && res.data?.length) {
        setLearningAreas(res.data);
      }
    } catch {
      // Keep fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createLearningArea({
        name,
        code,
        gradeLevel,
        educationLevel,
        isElective,
        schoolId: 'school-001',
      });
      if (res.success) {
        setIsAddOpen(false);
        loadAreas();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create learning area');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-primary font-semibold">Learning Areas</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            KICD CBC Learning Areas & Competency Strands
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Curriculum designs, core sub-strands, assessment criteria, and lead instructional teachers
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Add Learning Area</span>
        </button>
      </div>

      {/* Backend Registered Learning Areas */}
      {learningAreas.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
              Configured Syllabus Learning Areas ({learningAreas.length})
            </h3>
            <span className="text-xs text-secondary font-semibold">Backend Synced</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {learningAreas.map((la) => (
              <div
                key={la.id}
                className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-data-mono text-xs font-bold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded">
                      {la.code}
                    </span>
                    <span className="text-xs font-semibold text-primary bg-surface-container px-2 py-0.5 rounded">
                      {la.isElective ? 'Elective' : 'Core'}
                    </span>
                  </div>
                  <h3 className="font-headline-md text-base font-bold text-on-surface mt-3">
                    {la.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Grade: {la.gradeLevel} · Cycle: {la.educationLevel.replace('_', ' ')}
                  </p>

                  <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Curriculum Design:</span>
                      <span className="font-semibold text-on-surface">KICD Accredited</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">System Code:</span>
                      <span className="font-data-mono text-primary font-bold">{la.id}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                  <span className="text-[11px] text-outline">KNEC CBC Compliant</span>
                  <span className="font-semibold text-primary flex items-center gap-1">
                    Ready for Grading <span className="material-symbols-outlined text-[14px]">check</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-5xl text-outline">menu_book</span>
            <p className="font-bold text-base text-on-surface">No learning areas configured</p>
            <p className="text-xs text-outline">Click "Add Learning Area" above to create KICD curriculum subjects.</p>
          </div>
        </div>
      )}

      {/* Add Learning Area Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Create New CBC Learning Area</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-blue-200 hover:text-white cursor-pointer shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Learning Area Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pre-Technical Studies"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Subject Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. PRETECH7"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 font-data-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Grade Level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                  >
                    <option value="GRADE_7">Grade 7</option>
                    <option value="GRADE_8">Grade 8</option>
                    <option value="GRADE_9">Grade 9</option>
                    <option value="GRADE_6">Grade 6</option>
                    <option value="GRADE_5">Grade 5</option>
                    <option value="GRADE_4">Grade 4</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Education Level</label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                >
                  <option value="JUNIOR_SCHOOL">Junior School</option>
                  <option value="PRIMARY_SCHOOL">Primary School</option>
                  <option value="EARLY_YEARS">Early Years</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="elective"
                  checked={isElective}
                  onChange={(e) => setIsElective(e.target.checked)}
                />
                <label htmlFor="elective" className="font-semibold text-on-surface">Is Elective Subject</label>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container"
                >
                  Save Learning Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
