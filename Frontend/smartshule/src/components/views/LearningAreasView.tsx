import React, { useState, useEffect } from 'react';
import { apiService, SubjectTeacherAssignmentItem } from '../../services/api';
import { BackendLearningArea, ClassRoom, StreamItem, Teacher, AcademicYear, GlobalSubject } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const LearningAreasView: React.FC<{onNavigateTab?:(tab:string)=>void}> = ({onNavigateTab}) => {
  const { user } = useAuth();
  const canManageAssignments = ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'DEPUTY_HEAD_TEACHER'].includes(user?.role || '');
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
  const [leadClassId, setLeadClassId] = useState('');
  const [leadStreamId, setLeadStreamId] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [removingAssignmentId, setRemovingAssignmentId] = useState('');
  const [leadEffectiveFrom, setLeadEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Subject History Modal
  const [isSubjectHistoryOpen, setIsSubjectHistoryOpen] = useState(false);
  const [subjectHistoryTarget, setSubjectHistoryTarget] = useState<{
    learningAreaId: string;
    learningAreaName: string;
  } | null>(null);

  const [globalSubjects, setGlobalSubjects] = useState<GlobalSubject[]>([]);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');

  // Subject Form State
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectGradeLevel, setSubjectGradeLevel] = useState('GRADE_1');
  const [selectedGlobalSubjectId, setSelectedGlobalSubjectId] = useState('');
  const [isElective, setIsElective] = useState(false);
  const [assignedTeacherId, setAssignedTeacherId] = useState('');

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [scRes, laRes, cRes, tRes, yRes, staRes, gsRes] = await Promise.all([
        apiService.getSchool().catch(() => null),
        apiService.getLearningAreas().catch(() => null),
        apiService.getClasses().catch(() => null),
        apiService.getTeachers().catch(() => null),
        apiService.getYears().catch(() => null),
        apiService.getSubjectTeacherAssignments().catch(() => null),
        apiService.getGlobalSubjects().catch(() => null),
      ]);

      if (scRes?.data) setSchoolInfo(scRes.data);
      if (laRes?.data) setLearningAreas(laRes.data || []);
      if (gsRes?.data) setGlobalSubjects(gsRes.data || []);
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
    setLeadRole('SUBJECT_TEACHER');
    const area = learningAreas.find(a => a.id === learningAreaId);
    const matching = classes.filter(c => c.gradeLevel === area?.gradeLevel);
    setLeadClassId(matching.length === 1 ? matching[0].id : '');
    setLeadStreamId('');
    setAssignmentError('');
    setLeadEffectiveFrom(new Date().toISOString().split('T')[0]);
    setIsAssignLeadOpen(true);
  };

  const openSubjectHistoryModal = (learningAreaId: string, learningAreaName: string) => {
    setSubjectHistoryTarget({ learningAreaId, learningAreaName });
    setIsSubjectHistoryOpen(true);
  };

  const handleAssignLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLeadTarget || !leadTeacherId || !leadClassId) return;
    const activeSchoolId = user?.schoolId || schoolInfo?.id;
    const targetYearId = selectedYearId;
    if (!activeSchoolId || !targetYearId) {
      setAssignmentError('Select a school academic year before assigning a teacher.');
      return;
    }

    setIsSubmittingLead(true);
    setAssignmentError('');
    try {
      const res = await apiService.assignSubjectTeacher({
        schoolId: activeSchoolId,
        academicYearId: targetYearId,
        classRoomId: leadClassId,
        streamId: leadStreamId || undefined,
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
          message: `Teacher assigned to ${assigningLeadTarget.learningAreaName} · ${classes.find(c => c.id === leadClassId)?.name || 'selected class'} successfully.`,
        });
        await loadAllData();
      } else throw new Error('The subject assignment was not saved. Please try again.');
    } catch (err: any) {
      setAssignmentError(err.message || 'Failed to assign subject teacher');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    setRemovingAssignmentId(id);
    try {
      const res = await apiService.deleteSubjectTeacherAssignment(id);
      if (!res.success) throw new Error('The assignment could not be removed.');
      await loadAllData();
      setFeedback({ type: 'success', message: 'Subject assignment removed. Assignment history is preserved.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove assignment' });
    } finally { setRemovingAssignmentId(''); }
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
        gradeLevel: subjectGradeLevel,
        educationLevel: ['PLAYGROUP', 'PP1', 'PP2', 'CRECHE', 'RECEPTION'].includes(subjectGradeLevel) ? 'PRE_PRIMARY' : /^GRADE_[7-9]$/.test(subjectGradeLevel) ? 'JUNIOR_SCHOOL' : /^GRADE_([1-3])$/.test(subjectGradeLevel) ? 'LOWER_PRIMARY' : /^GRADE_([4-6])$/.test(subjectGradeLevel) ? 'UPPER_PRIMARY' : 'SENIOR_SCHOOL',
        isElective,
        schoolId,
        teacherId: assignedTeacherId || undefined,
        globalSubjectId: selectedGlobalSubjectId || undefined,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: `Subject "${subjectName}" created successfully!` });
        setIsAddSubjectOpen(false);
        setSubjectName('');
        setSubjectCode('');
        setSelectedGlobalSubjectId('');
        setAssignedTeacherId('');
        await loadAllData();
      } else {
        setFeedback({ type: 'error', message: res.error?.message || 'Failed to create subject' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving subject' });
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

  const filteredAreas = learningAreas.filter((la) => {
    const matchesSearch =
      la.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      la.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (la.canonicalSubjectName && la.canonicalSubjectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (la.canonicalSubjectCode && la.canonicalSubjectCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGrade =
      selectedGradeFilter === 'ALL' ||
      la.gradeLevel === selectedGradeFilter ||
      (la as any).grade_level === selectedGradeFilter;

    return matchesSearch && matchesGrade;
  });

  const getTeacherName = (tId?: string) => {
    if (!tId) return 'Unassigned';
    const teacher = teachers.find((t) => t.id === tId);
    return teacher ? teacher.name || (teacher as any).user?.fullName || [(teacher as any).user?.firstName,(teacher as any).user?.lastName].filter(Boolean).join(' ') || 'Assigned Teacher' : 'Assigned Teacher';
  };

  return (
    <div className="space-y-6 pb-16">
      <label className="block text-sm font-semibold">Planning academic year
        <select aria-label="Learning area assignment academic year" className="ui-field mt-2" value={selectedYearId} onChange={event=>{setSelectedYearId(event.target.value);setIsAssignLeadOpen(false);}}>
          {academicYears.map(year=><option key={year.id} value={year.id}>{year.name}{year.isCurrent?' · Current':''}</option>)}
        </select>
      </label>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-semibold">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-primary">Learning Areas</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight mt-1">
            Learning Areas
          </h1>
        </div>

        {canManageAssignments && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsAddSubjectOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Create Learning Area</span>
            </button>
            <button type="button" onClick={()=>onNavigateTab?.('classes-streams')} className="ui-button">Manage Classes &amp; Streams →</button>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">{feedback.type === 'success' ? 'check_circle' : 'error'}</span>
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-on-surface-variant hover:text-black cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Global Subjects Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">public</span>
              <span>Learning Areas Catalogue ({filteredAreas.length})</span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Grade-specific curriculum offerings referencing canonical global subjects.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-slate-400">search</span>
              <input
                type="text"
                placeholder="Search subject or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-outline-variant/30 rounded-xl focus:outline-primary"
              />
            </div>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="py-1.5 px-3 text-xs font-semibold bg-surface border border-outline-variant/30 rounded-xl focus:outline-primary cursor-pointer"
            >
              <option value="ALL">All Grades ({learningAreas.length})</option>
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
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-on-surface-variant bg-[#F8F5F5] rounded-2xl border border-outline-variant/30">Loading learning areas...</div>
        ) : filteredAreas.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant bg-[#F8F5F5] rounded-2xl border border-outline-variant/30 p-8">
            <p className="font-bold text-sm text-on-surface mt-2">No subjects found</p>
            <p className="text-xs text-on-surface-variant mt-1">Adjust your search or filter, or click "Create Subject Offering" to add a new learning area.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAreas.map((la) => (
              <div key={la.id} className="bg-[#F8F5F5] rounded-2xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-primary bg-rose-100 px-2.5 py-0.5 rounded-lg border border-rose-200">
                        {la.code}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-container-low text-on-surface-variant border border-outline-variant/30">
                        {la.gradeLevel ? la.gradeLevel.replace('_', ' ') : 'General'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${la.isElective ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-emerald-100 text-emerald-800'}`}>
                      {la.isElective ? 'Elective' : 'Core Subject'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-on-surface mt-2.5">{la.name}</h3>

                  {(la.canonicalSubjectName || la.globalSubject?.name) && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-on-primary-fixed bg-primary-fixed border border-primary rounded-lg px-2.5 py-1">
                      <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                      <span>Global: <strong>{la.canonicalSubjectName || la.globalSubject?.name}</strong> {la.canonicalSubjectCode ? `(${la.canonicalSubjectCode})` : ''}</span>
                    </div>
                  )}

                  {(() => {
                    const activeLead = subjectAssignments.find(
                      (a) => a.isActive && a.academicYearId === selectedYearId && a.learningAreaId === la.id && a.role === 'SUBJECT_LEAD'
                    );
                    const leadName = activeLead?.teacherName || getTeacherName(la.teacherId);
                    const isAssigned = leadName && leadName !== 'Unassigned';

                    return (
                      <div className="mt-4 pt-3 border-t border-outline-variant/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-[15px] text-primary">psychology</span>
                            <span className="text-on-surface-variant font-medium shrink-0">Subject Lead:</span>
                            {isAssigned ? (
                              <span className="font-bold text-primary bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[11px] truncate">
                                {leadName}
                              </span>
                            ) : (
                              <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                Unassigned
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {canManageAssignments && <button
                              onClick={() =>
                                openAssignLeadModal(
                                  la.id,
                                  la.name,
                                  la.code,
                                  activeLead?.teacherId || la.teacherId
                                )
                              }
                              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                            >
                              Assign teacher
                            </button>}
                            <button
                              onClick={() => openSubjectHistoryModal(la.id, la.name)}
                              title="Leadership History"
                              className="p-0.5 text-slate-400 hover:text-on-surface-variant cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">history</span>
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2" aria-label={`${la.name} teaching assignments`}>
                          {subjectAssignments.filter(a => a.isActive && a.academicYearId === selectedYearId && a.learningAreaId === la.id && a.classRoomId).map(a => (
                            <div key={a.id} className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-2 flex items-start justify-between gap-2">
                              <div><p className="font-semibold text-on-surface">{a.teacherName || a.teacherId}</p><p className="text-on-surface-variant">{a.className || classes.find(c => c.id === a.classRoomId)?.name} · {a.streamName || 'All streams'}</p><p className="text-on-surface-variant">{a.role === 'SUBJECT_LEAD' ? 'Subject lead' : 'Subject teacher'} · From {a.effectiveFrom || 'start of year'}</p></div>
                              {canManageAssignments && <button type="button" disabled={Boolean(removingAssignmentId)} onClick={() => handleRemoveAssignment(a.id)} className="text-rose-700 font-semibold disabled:opacity-50">{removingAssignmentId === a.id ? 'Removing…' : 'Remove'}</button>}
                            </div>
                          ))}
                          {!subjectAssignments.some(a => a.isActive && a.academicYearId === selectedYearId && a.learningAreaId === la.id && a.classRoomId) && <p className="text-on-surface-variant">No class subject teachers assigned for this academic year.</p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-on-surface-variant font-medium">
                    {la.gradeLevel ? `Grade: ${la.gradeLevel.replace('_', ' ')}` : 'School-wide Subject'}
                  </span>
                  {canManageAssignments && (
                    <button onClick={() => handleDeleteSubject(la.id, la.name)} className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE SUBJECT MODAL */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Create Subject Offering</h3>
              <button onClick={() => setIsAddSubjectOpen(false)} className="text-rose-100 hover:text-white cursor-pointer"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleCreateSubject} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Canonical Global Subject</label>
                <select
                  value={selectedGlobalSubjectId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setSelectedGlobalSubjectId(selId);
                    const matched = globalSubjects.find((g) => g.id === selId);
                    if (matched) {
                      if (!subjectName) setSubjectName(matched.name);
                      if (!subjectCode) setSubjectCode(matched.code);
                    }
                  }}
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 focus:outline-primary"
                >
                  <option value="">-- Custom / Not Linked --</option>
                  {globalSubjects.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-on-surface-variant mt-0.5">Links this offering to the school's authoritative global subject catalogue.</p>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Target Grade Level *</label>
                <select
                  value={subjectGradeLevel}
                  onChange={(e) => setSubjectGradeLevel(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 focus:outline-primary"
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
                <label className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Subject Title *</label>
                <input type="text" required value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Mathematical Activities" className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 focus:outline-primary" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Subject Code *</label>
                <input type="text" required value={subjectCode} onChange={(e) => setSubjectCode(e.target.value.toUpperCase())} placeholder="e.g. MAT" className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 font-mono uppercase focus:outline-primary" />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase tracking-wider">Assign Lead Educator (Optional)</label>
                <select value={assignedTeacherId} onChange={(e) => setAssignedTeacherId(e.target.value)} className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 focus:outline-primary">
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="electiveCheck" checked={isElective} onChange={(e) => setIsElective(e.target.checked)} className="w-4 h-4 text-primary" />
                <label htmlFor="electiveCheck" className="font-semibold text-on-surface cursor-pointer">Elective Subject</label>
              </div>
              <div className="pt-3 flex items-center gap-2">
                <button type="button" onClick={() => setIsAddSubjectOpen(false)} className="flex-1 py-2.5 bg-surface-container-low font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl cursor-pointer">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Subject Lead Educator Modal */}
      {isAssignLeadOpen && assigningLeadTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="bg-primary text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Assign Subject Teacher</h3>
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
            <form onSubmit={handleAssignLead} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  <span>Subject teaching access</span>
                </div>
                <p className="leading-relaxed">
                  The teacher can update marks, schemes, lesson plans and syllabus coverage for this subject in the selected class and stream. This keeps their class-teacher duty separate.
                </p>
              </div>
              {assignmentError && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800">{assignmentError}</p>}
              <div>
                <label htmlFor="subject-assignment-class" className="block font-bold text-on-surface-variant mb-1 uppercase">Class *</label>
                <select id="subject-assignment-class" required value={leadClassId} onChange={e => { setLeadClassId(e.target.value); setLeadStreamId(''); }} className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 text-on-surface">
                  <option value="">Choose class</option>
                  {classes.filter(c => c.gradeLevel === learningAreas.find(a => a.id === assigningLeadTarget.learningAreaId)?.gradeLevel).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="mt-1 text-on-surface-variant">Only classes matching this learning area's grade are available.</p>
              </div>
              <div>
                <label htmlFor="subject-assignment-stream" className="block font-bold text-on-surface-variant mb-1 uppercase">Stream</label>
                <select id="subject-assignment-stream" disabled={!leadClassId} value={leadStreamId} onChange={e => setLeadStreamId(e.target.value)} className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 text-on-surface">
                  <option value="">All streams in this class</option>
                  {(streamsMap[leadClassId] || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="subject-assignment-teacher" className="block font-bold text-on-surface-variant mb-1 uppercase">Select Educator *</label>
                <select
                  id="subject-assignment-teacher"
                  required
                  value={leadTeacherId}
                  onChange={(e) => setLeadTeacherId(e.target.value)}
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 text-on-surface font-semibold focus:outline-primary"
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
                  <label htmlFor="subject-assignment-role" className="block font-bold text-on-surface-variant mb-1 uppercase">Assignment Role</label>
                  <select
                    id="subject-assignment-role"
                    value={leadRole}
                    onChange={(e) => setLeadRole(e.target.value as any)}
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 text-on-surface font-semibold focus:outline-primary"
                  >
                    <option value="SUBJECT_LEAD">Subject Lead (HOD)</option>
                    <option value="SUBJECT_TEACHER">Subject Teacher</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={leadEffectiveFrom}
                    onChange={(e) => setLeadEffectiveFrom(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl p-2.5 text-on-surface focus:outline-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignLeadOpen(false)}
                  className="flex-1 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead || !leadTeacherId || !leadClassId || !selectedYearId}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-container text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
          <div className="bg-[#F8F5F5] rounded-2xl shadow-2xl max-w-lg w-full border border-outline-variant/30 overflow-hidden flex flex-col">
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
                    <div className="py-8 text-center text-on-surface-variant">
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
                            : 'bg-surface-container-lowest border-outline-variant/30 opacity-80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface text-sm">
                              {h.teacherName || h.teacherId}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                h.role === 'SUBJECT_LEAD'
                                  ? 'bg-primary text-white'
                                  : 'bg-surface-container text-on-surface'
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
                          <div className="text-[11px] text-on-surface-variant">
                            Academic Year: <span className="font-semibold">{h.academicYearName || h.academicYearId}</span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant">{h.className || 'School subject leadership'}{h.classRoomId ? ` · ${h.streamName || 'All streams'}` : ''}</p>
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
            <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSubjectHistoryOpen(false)}
                className="px-4 py-1.5 bg-primary text-white rounded-xl font-bold hover:bg-black cursor-pointer text-xs"
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
