import React, { useState, useEffect } from 'react';
import { apiService, SubjectTeacherAssignmentItem } from '../../services/api';
import { BackendLearningArea, ClassRoom, StreamItem, Teacher, AcademicYear } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const LearningAreasView: React.FC = () => {
  const { user } = useAuth();
  const [learningAreas, setLearningAreas] = useState<BackendLearningArea[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, StreamItem[]>>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectTeacherAssignmentItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);

  // Subject Leadership Modal
  const [isAssignLeadOpen, setIsAssignLeadOpen] = useState(false);
  const [assigningLeadTarget, setAssigningLeadTarget] = useState<{
    learningAreaId: string;
    learningAreaName: string;
    learningAreaCode: string;
    currentTeacherId?: string;
  } | null>(null);
  const [leadTeacherId, setLeadTeacherId] = useState('');
  const [leadRole, setLeadRole] = useState<'SUBJECT_LEAD' | 'SUBJECT_TEACHER'>('SUBJECT_LEAD');
  const [leadEffectiveFrom, setLeadEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Subject History Modal
  const [isSubjectHistoryOpen, setIsSubjectHistoryOpen] = useState(false);
  const [subjectHistoryTarget, setSubjectHistoryTarget] = useState<{
    learningAreaId: string;
    learningAreaName: string;
  } | null>(null);

  // Subject Form State (Simplified for Global Subjects)
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [isElective, setIsElective] = useState(false);
  const [assignedTeacherId, setAssignedTeacherId] = useState('');

  // Stream Form State
  const [streamClassRoomId, setStreamClassRoomId] = useState('');
  const [streamName, setStreamName] = useState('');
  const [streamCapacity, setStreamCapacity] = useState('40');
  const [streamTeacherId, setStreamTeacherId] = useState('');

  // Class Form State
  const [className, setClassName] = useState('');
  const [classGradeLevel, setClassGradeLevel] = useState('GRADE_7');
  const [classEducationLevel, setClassEducationLevel] = useState('JUNIOR_SCHOOL');

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [scRes, laRes, cRes, tRes, yRes, staRes] = await Promise.all([
        apiService.getSchool().catch(() => null),
        apiService.getLearningAreas().catch(() => null),
        apiService.getClasses().catch(() => null),
        apiService.getTeachers().catch(() => null),
        apiService.getYears().catch(() => null),
        apiService.getSubjectTeacherAssignments().catch(() => null),
      ]);

      if (scRes?.data) setSchoolInfo(scRes.data);
      if (laRes?.data) setLearningAreas(laRes.data || []);
      if (yRes?.data && Array.isArray(yRes.data)) {
        setAcademicYears(yRes.data);
        if (!selectedYearId) {
          const current = yRes.data.find((y: any) => y.isCurrent) || yRes.data[0];
          if (current) setSelectedYearId(current.id);
        }
      }
      if (staRes?.data && Array.isArray(staRes.data)) {
        setSubjectAssignments(staRes.data);
      }
      if (cRes?.data) {
        setClasses(cRes.data || []);
        if (cRes.data.length > 0 && !streamClassRoomId) {
          setStreamClassRoomId(cRes.data[0].id);
        }

        const sMap: Record<string, StreamItem[]> = {};
        for (const cls of cRes.data) {
          const sRes = await apiService.getStreamsByClass(cls.id).catch(() => null);
          if (sRes?.data) {
            sMap[cls.id] = sRes.data;
          }
        }
        setStreamsMap(sMap);
      }
      if (tRes?.data) setTeachers(tRes.data || []);
    } catch (err: any) {
      console.error('Failed to load academic data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAssignLeadModal = (
    learningAreaId: string,
    learningAreaName: string,
    learningAreaCode: string,
    currentTeacherId?: string
  ) => {
    setAssigningLeadTarget({ learningAreaId, learningAreaName, learningAreaCode, currentTeacherId });
    setLeadTeacherId(currentTeacherId || '');
    setLeadRole('SUBJECT_LEAD');
    setLeadEffectiveFrom(new Date().toISOString().split('T')[0]);
    setIsAssignLeadOpen(true);
  };

  const openSubjectHistoryModal = (learningAreaId: string, learningAreaName: string) => {
    setSubjectHistoryTarget({ learningAreaId, learningAreaName });
    setIsSubjectHistoryOpen(true);
  };

  const handleAssignLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLeadTarget || !leadTeacherId) return;
    const activeSchoolId = user?.schoolId || schoolInfo?.id || 'school-001';
    const targetYearId = selectedYearId || academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || 'year-2026';

    setIsSubmittingLead(true);
    try {
      const res = await apiService.assignSubjectTeacher({
        schoolId: activeSchoolId,
        academicYearId: targetYearId,
        learningAreaId: assigningLeadTarget.learningAreaId,
        teacherId: leadTeacherId,
        role: leadRole,
        effectiveFrom: leadEffectiveFrom,
      });

      if (res.success) {
        setIsAssignLeadOpen(false);
        setAssigningLeadTarget(null);
        setLeadTeacherId('');
        setFeedback({
          type: 'success',
          message: `Lead educator assigned for "${assigningLeadTarget.learningAreaName}" successfully!`,
        });
        await loadAllData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to assign subject lead' });
    } finally {
      setIsSubmittingLead(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !subjectCode.trim()) {
      setFeedback({ type: 'error', message: 'Subject name and code are required.' });
      return;
    }

    const schoolId = user?.schoolId || schoolInfo?.id || 'school-001';

    try {
      const res = await apiService.createLearningArea({
        name: subjectName.trim(),
        code: subjectCode.trim().toUpperCase(),
        gradeLevel: 'GRADE_7', // Hidden default to satisfy backend enum, treated as Global in UI
        educationLevel: 'JUNIOR_SCHOOL', // Hidden default
        isElective,
        schoolId,
        teacherId: assignedTeacherId || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Global Subject "${subjectName}" created successfully!` });
        setIsAddSubjectOpen(false);
        setSubjectName('');
        setSubjectCode('');
        setAssignedTeacherId('');
        await loadAllData();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to create subject' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving subject' });
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamClassRoomId || !streamName.trim()) return;
    try {
      const res = await apiService.createStream({
        classRoomId: streamClassRoomId,
        name: streamName.trim(),
        capacity: parseInt(streamCapacity, 10) || 40,
        classTeacherId: streamTeacherId || undefined,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: `Stream "${streamName}" saved successfully!` });
        setIsAddStreamOpen(false);
        setStreamName('');
        setStreamTeacherId('');
        await loadAllData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving stream' });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    const schoolId = user?.schoolId || schoolInfo?.id || 'school-001';
    try {
      const res = await apiService.createClass({
        name: className.trim(),
        gradeLevel: classGradeLevel,
        educationLevel: classEducationLevel,
        schoolId,
      });
      if (res.success) {
        setFeedback({ type: 'success', message: `Class "${className}" created successfully!` });
        setIsAddClassOpen(false);
        setClassName('');
        await loadAllData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving class' });
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the global subject "${name}"?`)) {
      try {
        const res = await apiService.deleteLearningArea(id);
        if (res.success) {
          setLearningAreas((prev) => prev.filter((la) => la.id !== id));
          setFeedback({ type: 'success', message: `Subject "${name}" deleted.` });
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Failed to delete subject.' });
      }
    }
  };

  const filteredAreas = learningAreas.filter((la) => 
    la.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    la.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTeacherName = (tId?: string) => {
    if (!tId) return 'Unassigned';
    const teacher = teachers.find((t) => t.id === tId);
    return teacher ? teacher.name : 'Assigned Teacher';
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-[#800000]">Global Subjects & Classes</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Subjects & Cohort Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setIsAddSubjectOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Create Global Subject</span>
          </button>
          <button onClick={() => setIsAddStreamOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">splitscreen</span>
            <span>Add Stream</span>
          </button>
          <button onClick={() => setIsAddClassOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">school</span>
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">{feedback.type === 'success' ? 'check_circle' : 'error'}</span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-600 hover:text-black cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Global Subjects Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#800000]">public</span>
            <span>Global Subjects Dictionary ({filteredAreas.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 bg-[#F8F5F5] rounded-2xl border border-slate-200">Loading global subjects...</div>
        ) : filteredAreas.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-[#F8F5F5] rounded-2xl border border-slate-200 p-8">
            <p className="font-bold text-sm text-slate-800 mt-2">No subjects found</p>
            <p className="text-xs text-slate-500 mt-1">Click "Create Global Subject" to add your first subject available to all classes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAreas.map((la) => (
              <div key={la.id} className="bg-[#F8F5F5] rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#800000] bg-rose-100 px-2.5 py-0.5 rounded-lg border border-rose-200">
                      {la.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${la.isElective ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {la.isElective ? 'Elective' : 'Core Subject'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-3">{la.name}</h3>
                  {(() => {
                    const activeLead = subjectAssignments.find(
                      (a) => a.isActive && a.learningAreaId === la.id && a.role === 'SUBJECT_LEAD'
                    );
                    const leadName = activeLead?.teacherName || getTeacherName(la.teacherId);
                    const isAssigned = leadName && leadName !== 'Unassigned';

                    return (
                      <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[15px] text-[#800000]">psychology</span>
                            <span className="text-slate-500 font-medium shrink-0">Subject Lead:</span>
                            {isAssigned ? (
                              <span className="font-bold text-[#800000] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px] truncate">
                                {leadName}
                              </span>
                            ) : (
                              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                Unassigned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                openAssignLeadModal(
                                  la.id,
                                  la.name,
                                  la.code,
                                  activeLead?.teacherId || la.teacherId
                                )
                              }
                              className="text-[11px] font-semibold text-[#800000] hover:underline cursor-pointer"
                            >
                              {isAssigned ? 'Reassign' : 'Assign'}
                            </button>
                            <button
                              onClick={() => openSubjectHistoryModal(la.id, la.name)}
                              title="Leadership History"
                              className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">history</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Global (All Classes)</span>
                  <button onClick={() => handleDeleteSubject(la.id, la.name)} className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE SUBJECT MODAL */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#800000] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Create Global Subject</h3>
              <button onClick={() => setIsAddSubjectOpen(false)} className="text-rose-100 hover:text-white cursor-pointer"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleCreateSubject} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Subject Title *</label>
                <input type="text" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Mathematics" className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-[#800000]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Subject Code *</label>
                <input type="text" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value.toUpperCase())} placeholder="e.g. MATH" className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono uppercase focus:outline-[#800000]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">Assign Lead Educator (Optional)</label>
                <select value={assignedTeacherId} onChange={(e) => setAssignedTeacherId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 focus:outline-[#800000]">
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="electiveCheck" checked={isElective} onChange={(e) => setIsElective(e.target.checked)} className="w-4 h-4 text-[#800000]" />
                <label htmlFor="electiveCheck" className="font-semibold text-slate-800 cursor-pointer">Elective Subject</label>
              </div>
              <div className="pt-3 flex items-center gap-2">
                <button type="button" onClick={() => setIsAddSubjectOpen(false)} className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#800000] text-white font-bold rounded-xl cursor-pointer">Save Global Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CLASS MODAL */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#800000] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">school</span>
                <h3 className="font-bold text-sm">Add New Academic Class</h3>
              </div>
              <button
                onClick={() => setIsAddClassOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Class Room Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Grade 7, Grade 8, Pre-Primary 1"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Grade Level
                </label>
                <select
                  value={classGradeLevel}
                  onChange={(e) => setClassGradeLevel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="PLAYGROUP">Playgroup</option>
                  <option value="PP1">Pre-Primary 1 (PP1)</option>
                  <option value="PP2">Pre-Primary 2 (PP2)</option>
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

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Education Level (CBC Stage)
                </label>
                <select
                  value={classEducationLevel}
                  onChange={(e) => setClassEducationLevel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="PRE_PRIMARY">Pre-Primary (Playgroup - PP2)</option>
                  <option value="LOWER_PRIMARY">Lower Primary (Grade 1 - 3)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (Grade 4 - 6)</option>
                  <option value="JUNIOR_SCHOOL">Junior Secondary (Grade 7 - 9)</option>
                  <option value="SENIOR_SCHOOL">Senior Secondary (Grade 10 - 12)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#800000] hover:bg-[#660000] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Class into Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STREAM MODAL */}
      {isAddStreamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">splitscreen</span>
                <h3 className="font-bold text-sm">Add Stream to Class</h3>
              </div>
              <button
                onClick={() => setIsAddStreamOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateStream} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Target Class Room <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={streamClassRoomId}
                  onChange={(e) => setStreamClassRoomId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.gradeLevel.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Stream Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={streamName}
                    onChange={(e) => setStreamName(e.target.value)}
                    placeholder="e.g. East, West, Alpha"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Student Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={streamCapacity}
                    onChange={(e) => setStreamCapacity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Assigned Class Teacher (From Database)
                </label>
                <select
                  value={streamTeacherId}
                  onChange={(e) => setStreamTeacherId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                >
                  <option value="">-- Select Class Teacher (Optional) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.tscNumber || 'Educator'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStreamOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Stream into Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Subject Lead Educator Modal */}
      {isAssignLeadOpen && assigningLeadTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#800000] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Assign Subject Leadership</h3>
                <p className="text-rose-100 text-[11px] mt-0.5">
                  {assigningLeadTarget.learningAreaName} ({assigningLeadTarget.learningAreaCode})
                </p>
              </div>
              <button
                onClick={() => setIsAssignLeadOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAssignLead} className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  <span>Leadership Integrity</span>
                </div>
                <p className="leading-relaxed">
                  Assigning a new Subject Lead safely marks prior lead assignments as inactive with an effective end date while preserving full historical records.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase">Select Educator *</label>
                <select
                  required
                  value={leadTeacherId}
                  onChange={(e) => setLeadTeacherId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-[#800000]"
                >
                  <option value="">-- Choose Educator --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employeeNumber || t.tscNumber || 'Educator'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Leadership Role</label>
                  <select
                    value={leadRole}
                    onChange={(e) => setLeadRole(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-[#800000]"
                  >
                    <option value="SUBJECT_LEAD">Subject Lead (HOD)</option>
                    <option value="SUBJECT_TEACHER">Subject Teacher</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={leadEffectiveFrom}
                    onChange={(e) => setLeadEffectiveFrom(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-[#800000]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignLeadOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead || !leadTeacherId}
                  className="flex-1 py-2.5 bg-[#800000] hover:bg-[#660000] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLead ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Leadership History Modal */}
      {isSubjectHistoryOpen && subjectHistoryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Subject Leadership History</h3>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  {subjectHistoryTarget.learningAreaName}
                </p>
              </div>
              <button
                onClick={() => setIsSubjectHistoryOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto text-xs">
              {(() => {
                const history = subjectAssignments.filter(
                  (a) => a.learningAreaId === subjectHistoryTarget.learningAreaId
                );
                if (history.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-500">
                      <span className="material-symbols-outlined text-4xl text-slate-400 mb-1">history_edu</span>
                      <p className="font-semibold">No recorded teacher assignment history for this subject.</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          h.isActive
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-white border-slate-200 opacity-80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {h.teacherName || h.teacherId}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                h.role === 'SUBJECT_LEAD'
                                  ? 'bg-[#800000] text-white'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {h.role === 'SUBJECT_LEAD' ? 'Subject Lead' : 'Subject Teacher'}
                            </span>
                            {h.isActive && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Academic Year: <span className="font-semibold">{h.academicYearName || h.academicYearId}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>From: {h.effectiveFrom || 'Start'}</span>
                            {h.effectiveTo && <span>To: {h.effectiveTo}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSubjectHistoryOpen(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};