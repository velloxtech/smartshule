import React, { useState, useEffect } from 'react';
import { apiService, ClassTeacherAssignmentItem } from '../../services/api';
import { ClassRoom, StreamItem, AcademicYear } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const ClassesView: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, StreamItem[]>>({});
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<ClassTeacherAssignmentItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Class Teacher Assignment Modal
  const [isAssignTeacherOpen, setIsAssignTeacherOpen] = useState(false);
  const [assigningTarget, setAssigningTarget] = useState<{
    classRoomId: string;
    className: string;
    streamId?: string;
    streamName?: string;
    currentTeacherId?: string;
  } | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentReason, setAssignmentReason] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // History Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{
    classRoomId: string;
    className: string;
    streamId?: string;
    streamName?: string;
  } | null>(null);

  // Form states for new class
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('GRADE_1');
  const [newEduLevel, setNewEduLevel] = useState('LOWER_PRIMARY');

  // Form states for new stream
  const [newStreamName, setNewStreamName] = useState('');
  const [newCapacity, setNewCapacity] = useState('40');
  const [newClassTeacherId, setNewClassTeacherId] = useState('');

  const loadClassesAndStreams = async () => {
    setLoading(true);
    try {
      const [scRes, res, tRes, yRes, aRes] = await Promise.all([
        apiService.getSchool().catch(() => null),
        apiService.getClasses().catch(() => null),
        apiService.getTeachers().catch(() => null),
        apiService.getYears().catch(() => null),
        apiService.getClassTeacherAssignments().catch(() => null),
      ]);
      if (scRes?.data) setSchoolInfo(scRes.data);
      if (tRes?.data && Array.isArray(tRes.data)) setTeachers(tRes.data);
      if (yRes?.data && Array.isArray(yRes.data)) {
        setAcademicYears(yRes.data);
        if (!selectedYearId) {
          const current = yRes.data.find((y: any) => y.isCurrent) || yRes.data[0];
          if (current) setSelectedYearId(current.id);
        }
      }
      if (aRes?.data && Array.isArray(aRes.data)) {
        setAssignments(aRes.data);
      }
      if (res?.success) {
        const classList = res.data || [];
        setClasses(classList);
        const streamEntries: Record<string, StreamItem[]> = {};
        for (const c of classList) {
          const streamRes = await apiService.getStreamsByClass(c.id);
          if (streamRes.success) {
            streamEntries[c.id] = streamRes.data || [];
          }
        }
        setStreamsMap(streamEntries);
      } else {
        setClasses([]);
        setStreamsMap({});
      }
    } catch {
      setClasses([]);
      setStreamsMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassesAndStreams();
  }, []);

  const getActiveAssignment = (classId: string, streamId?: string) => {
    // 1. Primary: Active record in assignments state
    const found = assignments.find((a) => {
      if (!a.isActive || a.classRoomId !== classId) return false;
      if (streamId) {
        if (a.streamId !== streamId) return false;
      } else {
        if (a.streamId) return false;
      }
      if (selectedYearId && a.academicYearId && a.academicYearId !== selectedYearId) return false;
      return true;
    });

    if (found) return found;

    // 2. Resilient fallback: check stream.classTeacherId
    if (streamId) {
      const streamsList = streamsMap[classId] || [];
      const st = streamsList.find((s) => s.id === streamId);
      if (st && (st as any).classTeacherId) {
        return {
          id: `fallback-${st.id}`,
          classRoomId: classId,
          streamId: st.id,
          teacherId: (st as any).classTeacherId,
          isActive: true,
          effectiveFrom: '',
        } as ClassTeacherAssignmentItem;
      }
    }

    // 3. Resilient fallback: check teachers' assignedClassStreamIds
    if (streamId) {
      const assignedTeacher = teachers.find(
        (t) => Array.isArray(t.assignedClassStreamIds) && t.assignedClassStreamIds.includes(streamId)
      );
      if (assignedTeacher) {
        return {
          id: `sync-${streamId}`,
          classRoomId: classId,
          streamId: streamId,
          teacherId: assignedTeacher.id,
          isActive: true,
          effectiveFrom: '',
        } as ClassTeacherAssignmentItem;
      }
    }

    return undefined;
  };

  const getAssignmentHistory = (classId: string, streamId?: string) => {
    return assignments.filter((a) => {
      if (a.classRoomId !== classId) return false;
      if (streamId) {
        return a.streamId === streamId;
      }
      return !a.streamId;
    });
  };

  const openAssignModal = (
    classRoomId: string,
    className: string,
    streamId?: string,
    streamName?: string,
    currentTeacherId?: string
  ) => {
    setAssigningTarget({ classRoomId, className, streamId, streamName, currentTeacherId });
    setSelectedTeacherId(currentTeacherId || '');
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setAssignmentReason('');
    setIsAssignTeacherOpen(true);
  };

  const openHistoryModal = (
    classRoomId: string,
    className: string,
    streamId?: string,
    streamName?: string
  ) => {
    setHistoryTarget({ classRoomId, className, streamId, streamName });
    setIsHistoryOpen(true);
  };

  const handleAssignClassTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTarget || !selectedTeacherId) return;
    const activeSchoolId = user?.schoolId || schoolInfo?.id || 'school-001';
    const targetYearId = selectedYearId || academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || 'year-2026';

    setIsSubmittingAssignment(true);
    try {
      const res = await apiService.assignClassTeacher({
        schoolId: activeSchoolId,
        academicYearId: targetYearId,
        classRoomId: assigningTarget.classRoomId,
        streamId: assigningTarget.streamId,
        teacherId: selectedTeacherId,
        effectiveFrom,
        reason: assignmentReason || undefined,
      });

      if (res.success) {
        setIsAssignTeacherOpen(false);
        setAssigningTarget(null);
        setSelectedTeacherId('');
        setAssignmentReason('');
        await loadClassesAndStreams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign class teacher');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete class "${name}"? This action cannot be undone.`)) {
      try {
        const res = await apiService.deleteClass(id);
        if (res.success) {
          setClasses((prev) => prev.filter((c) => c.id !== id));
          const updated = { ...streamsMap };
          delete updated[id];
          setStreamsMap(updated);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete class');
      }
    }
  };

  const handleDeleteStream = async (streamId: string, streamName: string, classId: string) => {
    if (window.confirm(`Are you sure you want to delete stream "${streamName}"?`)) {
      try {
        const res = await apiService.deleteStream(streamId);
        if (res.success) {
          setStreamsMap((prev) => ({
            ...prev,
            [classId]: (prev[classId] || []).filter((s) => s.id !== streamId),
          }));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete stream');
      }
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeSchoolId = user?.schoolId || schoolInfo?.id || 'school-001';
    try {
      const res = await apiService.createClass({
        name: newClassName,
        gradeLevel: newGradeLevel,
        educationLevel: newEduLevel,
        schoolId: activeSchoolId,
      });
      if (res.success) {
        setIsAddClassOpen(false);
        setNewClassName('');
        loadClassesAndStreams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create class');
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiService.createStream({
        classRoomId: selectedClassId,
        name: newStreamName,
        capacity: Number(newCapacity),
        classTeacherId: newClassTeacherId || undefined,
      });
      if (res.success) {
        setIsAddStreamOpen(false);
        setNewStreamName('');
        setNewClassTeacherId('');
        loadClassesAndStreams();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create stream');
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
            <span className="text-primary font-semibold">Classes & Streams</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Classes, Streams & Class Teachers
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            CBE class structures, stream allocations, and official class teacher assignments with historical preservation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {academicYears.length > 0 && (
            <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-lg border border-outline-variant/30 text-xs">
              <span className="text-on-surface-variant font-medium">Academic Year:</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="bg-transparent font-bold text-primary focus:outline-none cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsAddClassOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Backend Live Classes Grid */}
      {classes.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
              Active Registered CBE Grades ({classes.length})
            </h3>
            <span className="text-xs text-secondary font-semibold">
              Live Backend & Teacher Assignment Synced
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => {
              const streams = streamsMap[c.id] || [];
              const singleClassAssignment = getActiveAssignment(c.id, undefined);
              const singleTeacherObj = singleClassAssignment
                ? teachers.find((t) => t.id === singleClassAssignment.teacherId)
                : null;
              const singleTeacherName =
                singleClassAssignment?.teacherName ||
                (singleTeacherObj?.user
                  ? `${singleTeacherObj.user.firstName} ${singleTeacherObj.user.lastName}`
                  : null);

              return (
                <div
                  key={c.id}
                  className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider bg-secondary-container/40 px-2 py-0.5 rounded">
                        {c.educationLevel.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                        {c.gradeLevel}
                      </span>
                    </div>

                    <h3 className="font-headline-md text-lg font-bold text-on-surface mt-3">{c.name}</h3>
                    <p className="text-xs text-on-surface-variant">
                      {streams.length} Stream{streams.length !== 1 ? 's' : ''} Allocated
                    </p>

                    <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                      <div className="font-semibold text-primary mb-1">Streams & Class Teachers:</div>
                      {streams.length > 0 ? (
                        <div className="space-y-2">
                          {streams.map((s) => {
                            const activeAssignment = getActiveAssignment(c.id, s.id);
                            const teacherObj = activeAssignment
                              ? teachers.find((t) => t.id === activeAssignment.teacherId)
                              : teachers.find(
                                  (t) => t.id === s.classTeacherId || t.assignedClassStreamIds?.includes(s.id)
                                );
                            const teacherName =
                              activeAssignment?.teacherName ||
                              (teacherObj?.user
                                ? `${teacherObj.user.firstName} ${teacherObj.user.lastName}`
                                : teacherObj
                                ? teacherObj.employeeNumber
                                : null);

                            return (
                              <div
                                key={s.id}
                                className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-on-surface">Stream {s.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-data-mono text-outline text-[11px]">
                                      Cap: {s.capacity}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteStream(s.id, s.name, c.id)}
                                      title="Delete Stream"
                                      className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-outline-variant/10">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
                                      school
                                    </span>
                                    <span className="text-on-surface-variant font-medium shrink-0">Teacher:</span>
                                    {teacherName ? (
                                      <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px] truncate">
                                        {teacherName}
                                      </span>
                                    ) : (
                                      <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium text-[10px]">
                                        Unassigned
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() =>
                                        openAssignModal(
                                          c.id,
                                          c.name,
                                          s.id,
                                          s.name,
                                          activeAssignment?.teacherId || s.classTeacherId
                                        )
                                      }
                                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                                    >
                                      {teacherName ? 'Reassign' : 'Assign'}
                                    </button>
                                    <button
                                      onClick={() => openHistoryModal(c.id, c.name, s.id, s.name)}
                                      title="Assignment History"
                                      className="p-0.5 text-outline hover:text-primary cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">history</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">Single Cohort</span>
                            <span className="text-[10px] text-slate-400">Streams Optional</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-outline-variant/10">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
                                school
                              </span>
                              <span className="text-on-surface-variant font-medium shrink-0">Class Teacher:</span>
                              {singleTeacherName ? (
                                <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px] truncate">
                                  {singleTeacherName}
                                </span>
                              ) : (
                                <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium text-[10px]">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() =>
                                  openAssignModal(
                                    c.id,
                                    c.name,
                                    undefined,
                                    undefined,
                                    singleClassAssignment?.teacherId
                                  )
                                }
                                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                              >
                                {singleTeacherName ? 'Reassign' : 'Assign'}
                              </button>
                              <button
                                onClick={() => openHistoryModal(c.id, c.name, undefined, undefined)}
                                title="Assignment History"
                                className="p-0.5 text-outline hover:text-primary cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">history</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-container flex justify-between items-center">
                    <button
                      onClick={() => {
                        setSelectedClassId(c.id);
                        setIsAddStreamOpen(true);
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>Add Stream</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteClass(c.id, c.name)}
                        title="Delete Class"
                        className="text-xs text-outline hover:text-error hover:bg-error/10 p-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Delete</span>
                      </button>
                      <span className="text-[10px] text-outline font-data-mono">{c.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-5xl text-outline">meeting_room</span>
            <p className="font-bold text-base text-on-surface">No classes configured</p>
            <p className="text-xs text-outline">Click "Add Class" above to create CBE grades and streams.</p>
          </div>
        </div>
      )}

      {/* Assign / Reassign Class Teacher Modal */}
      {isAssignTeacherOpen && assigningTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-sm">Assign Official Class Teacher</h3>
                <p className="text-rose-100 text-[11px] mt-0.5">
                  {assigningTarget.className}
                  {assigningTarget.streamName ? ` • Stream ${assigningTarget.streamName}` : ''}
                </p>
              </div>
              <button
                onClick={() => setIsAssignTeacherOpen(false)}
                className="text-rose-100 hover:text-white cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAssignClassTeacher} className="p-4 sm:p-5 space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <span className="material-symbols-outlined text-[15px]">info</span>
                  <span>Safe Reassignment Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  Reassigning this class deactivates previous assignments with an effective end date while preserving full historical records and past report cards.
                </p>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Select Teacher</label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-on-surface font-semibold"
                >
                  <option value="">-- Choose Educator --</option>
                  {teachers.map((t: any) => {
                    const name = t.user ? `${t.user.firstName} ${t.user.lastName}` : t.name || t.id;
                    return (
                      <option key={t.id} value={t.id}>
                        {name} ({t.employeeNumber || t.tscNumber || 'Educator'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Academic Year</label>
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Assignment Reason / Notes (Optional)</label>
                <input
                  type="text"
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  placeholder="e.g. Term commencement allocation or handover"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignTeacherOpen(false)}
                  className="flex-1 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssignment || !selectedTeacherId}
                  className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingAssignment ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment History Modal */}
      {isHistoryOpen && historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-sm">Class Teacher Assignment History</h3>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  {historyTarget.className}
                  {historyTarget.streamName ? ` • Stream ${historyTarget.streamName}` : ''}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="p-4 sm:p-5 text-xs space-y-3 max-h-[60vh] overflow-y-auto">
              {(() => {
                const history = getAssignmentHistory(historyTarget.classRoomId, historyTarget.streamId);
                if (history.length === 0) {
                  return (
                    <div className="py-8 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl text-outline mb-1">history_edu</span>
                      <p className="font-semibold">No recorded teacher assignment history for this cohort.</p>
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
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-surface-container-low border-outline-variant/20 opacity-80'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface text-sm">
                              {h.teacherName || h.teacherId}
                            </span>
                            {h.isActive ? (
                              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Currently Active
                              </span>
                            ) : (
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                Historical
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-on-surface-variant">
                            Academic Year: <span className="font-semibold">{h.academicYearName || h.academicYearId}</span>
                          </div>
                          <div className="text-[10px] text-outline flex items-center gap-2">
                            <span>From: {h.effectiveFrom || 'Start'}</span>
                            {h.effectiveTo && <span>To: {h.effectiveTo}</span>}
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-outline text-xl">
                          {h.isActive ? 'verified' : 'history'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Add New CBE Class / Grade</h3>
              <button onClick={() => setIsAddClassOpen(false)} className="text-rose-100 hover:text-white cursor-pointer shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Class Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Grade 8"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Grade Level</label>
                  <select
                    value={newGradeLevel}
                    onChange={(e) => setNewGradeLevel(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
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
                <div>
                  <label className="block font-bold text-on-surface-variant mb-1 uppercase">Education Cycle</label>
                  <select
                    value={newEduLevel}
                    onChange={(e) => setNewEduLevel(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                  >
                    <option value="PRE_PRIMARY">Pre-Primary (Playgroup - PP2)</option>
                    <option value="LOWER_PRIMARY">Lower Primary (Grade 1 - 3)</option>
                    <option value="UPPER_PRIMARY">Upper Primary (Grade 4 - 6)</option>
                    <option value="JUNIOR_SCHOOL">Junior Secondary (Grade 7 - 9)</option>
                    <option value="SENIOR_SCHOOL">Senior Secondary (Grade 10 - 12)</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="flex-1 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container cursor-pointer transition-colors"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stream Modal */}
      {isAddStreamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Add Stream to Class</h3>
              <button onClick={() => setIsAddStreamOpen(false)} className="text-rose-100 hover:text-white cursor-pointer shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateStream} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Stream Name</label>
                <input
                  type="text"
                  required
                  value={newStreamName}
                  onChange={(e) => setNewStreamName(e.target.value)}
                  placeholder="e.g. West, North, Blue"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Capacity (Learners)</label>
                <input
                  type="number"
                  required
                  min="5"
                  max="70"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Class Teacher (Loaded from DB)</label>
                <select
                  value={newClassTeacherId}
                  onChange={(e) => setNewClassTeacherId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-on-surface"
                >
                  <option value="">-- None (Assign Later) --</option>
                  {teachers.map((t: any) => {
                    const name = t.user ? `${t.user.firstName} ${t.user.lastName}` : (t.name || t.id);
                    return (
                      <option key={t.id} value={t.id}>
                        {name} ({t.employeeNumber || t.tscNumber || 'Educator'})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStreamOpen(false)}
                  className="flex-1 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container cursor-pointer transition-colors"
                >
                  Create Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
