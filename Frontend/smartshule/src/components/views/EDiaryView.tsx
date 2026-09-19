import React, { useState, useEffect } from 'react';
import { EDiaryEntry, Student, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const EDiaryView: React.FC = () => {
  const { user } = useAuth();
  const isGuardian = user?.role === UserRole.GUARDIAN;
  const isTeacher = user?.role === UserRole.TEACHER || user?.role === UserRole.HEAD_TEACHER || user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SCHOOL_ADMIN;

  const [entries, setEntries] = useState<EDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Dynamic context
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [availableStreams, setAvailableStreams] = useState<Array<{ id: string; name: string; classRoomId: string; className: string }>>([]);

  // Guardian Portal linked child
  const [linkedStudents, setLinkedStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Teacher Create Entry Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTasks, setNewTasks] = useState<Array<{ learningArea: string; description: string; dueDate: string }>>([]);
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [tomorrowRequirements, setTomorrowRequirements] = useState('');

  // Guardian Acknowledge Modal
  const [acknowledgingEntryId, setAcknowledgingEntryId] = useState<string | null>(null);
  const [parentNote, setParentNote] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  useEffect(() => {
    async function loadStreams() {
      try {
        const [scRes, cRes] = await Promise.all([
          apiService.getSchool().catch(() => null),
          apiService.getClasses().catch(() => null),
        ]);
        if (scRes?.data) setSchoolInfo(scRes.data);
        if (cRes?.data && Array.isArray(cRes.data)) {
          const allStreams: Array<{ id: string; name: string; classRoomId: string; className: string }> = [];
          for (const c of cRes.data) {
            const sRes = await apiService.getStreamsByClass(c.id).catch(() => null);
            if (sRes?.data && Array.isArray(sRes.data)) {
              sRes.data.forEach((st: any) => {
                allStreams.push({
                  id: st.id,
                  name: st.name,
                  classRoomId: c.id,
                  className: c.name,
                });
              });
            }
          }
          setAvailableStreams(allStreams);
          if (allStreams.length > 0 && !selectedStreamId) {
            setSelectedStreamId(allStreams[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading streams for eDiary:', err);
      }
    }
    loadStreams();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isGuardian) {
        // Load parent's children
        const pRes = await apiService.getGuardianPortalData().catch(() => null);
        if (pRes?.data?.children && Array.isArray(pRes.data.children) && pRes.data.children.length > 0) {
          const firstChild = pRes.data.children[0];
          setLinkedStudents(pRes.data.children);
          setSelectedStudentId(firstChild.id);
          const diaryRes = await apiService.getStudentEDiary(firstChild.id);
          if (diaryRes.success && diaryRes.data) {
            setEntries(diaryRes.data);
          }
        } else {
          setLinkedStudents([]);
          setEntries([]);
        }
      } else {
        if (!selectedStreamId) {
          setEntries([]);
          return;
        }
        const diaryRes = await apiService.getStreamEDiary(selectedStreamId);
        if (diaryRes.success && diaryRes.data) {
          setEntries(diaryRes.data);
        } else {
          setEntries([]);
        }
      }
    } catch (err) {
      console.error('Error loading eDiary entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this eDiary homework entry?')) {
      try {
        const res = await apiService.deleteEDiaryEntry(entryId);
        if (res.success) {
          setEntries((prev) => prev.filter((e) => e.id !== entryId));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete eDiary entry');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [user, selectedStreamId, isGuardian]);

  const handleChildChange = async (stId: string) => {
    setSelectedStudentId(stId);
    setLoading(true);
    try {
      const diaryRes = await apiService.getStudentEDiary(stId);
      if (diaryRes.success && diaryRes.data) {
        setEntries(diaryRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const reqList = tomorrowRequirements
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const matchedStream = availableStreams.find((s) => s.id === selectedStreamId);
      const targetClassId = matchedStream ? matchedStream.classRoomId : 'general-class';

      const res = await apiService.createEDiaryEntry({
        schoolId: user?.schoolId || schoolInfo?.id || '',
        classRoomId: targetClassId,
        streamId: selectedStreamId,
        date: selectedDate,
        homeworkTasks: newTasks,
        teacherRemarks,
        tomorrowRequirements: reqList,
      });

      if (res.success && res.data) {
        setEntries([res.data, ...entries]);
        setIsCreateOpen(false);
      }
    } catch (err: any) {
      alert('Failed to publish eDiary entry: ' + err.message);
    }
  };

  const handleAcknowledge = async (entryId: string) => {
    setIsSubmittingAck(true);
    try {
      const res = await apiService.acknowledgeEDiary(entryId, {
        guardianName: user ? `${user.firstName} ${user.lastName}` : 'Guardian',
        parentNote: parentNote.trim() || undefined,
      });

      if (res.success && res.data) {
        setEntries(entries.map((item) => (item.id === entryId ? res.data : item)));
        setAcknowledgingEntryId(null);
        setParentNote('');
      }
    } catch (err: any) {
      alert('Failed to sign diary entry: ' + err.message);
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const addTaskRow = () => {
    setNewTasks([
      ...newTasks,
      { learningArea: '', description: '', dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
    ]);
  };

  const removeTaskRow = (idx: number) => {
    setNewTasks(newTasks.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Academics</span>
            <span>/</span>
            <span className="text-primary font-semibold">Digital School eDiary</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            {isGuardian ? 'Daily Homework & Communication Diary' : 'Class Digital eDiary & Assignment Board'}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isGuardian
              ? 'Review daily assignments, teacher remarks, requirements for tomorrow, and digitally sign off'
              : 'Record daily homework tasks, learning area requirements, and review parent digital sign-offs'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isGuardian && linkedStudents.length > 1 && (
            <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 p-1.5 rounded-xl">
              <span className="text-xs font-bold text-on-surface-variant">Learner:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => handleChildChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-primary focus:outline-hidden"
              >
                {linkedStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.grade})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isTeacher && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>+ Record Daily eDiary</span>
            </button>
          )}
        </div>
      </div>

      {/* Stream Selector for Teachers */}
      {!isGuardian && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant">Active Class Stream:</span>
            <select
              value={selectedStreamId}
              onChange={(e) => setSelectedStreamId(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1 px-3 text-xs font-bold text-on-surface"
            >
              {availableStreams.length === 0 ? (
                <option value="">No streams configured</option>
              ) : (
                availableStreams.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.className} - {st.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <span className="text-xs text-on-surface-variant">
            Showing all published diary records for this class
          </span>
        </div>
      )}

      {/* Entries Timeline */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-primary">Loading eDiary entries from database...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 max-w-md mx-auto my-8 space-y-3">
          <span className="material-symbols-outlined text-4xl text-outline">menu_book</span>
          <h3 className="font-bold text-base text-on-surface">No eDiary Entries Found</h3>
          <p className="text-xs text-on-surface-variant">
            {isGuardian
              ? 'Your child’s teacher has not yet posted any homework or diary entries for this period.'
              : 'No entries recorded for this stream yet. Click "Record Daily eDiary" to publish today\'s tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const hasSigned = entry.parentAcknowledgements && entry.parentAcknowledgements.length > 0;
            const myAck = entry.parentAcknowledgements?.find((a) => a.guardianUserId === user?.id) || entry.parentAcknowledgements?.[0];

            return (
              <div
                key={entry.id}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden"
              >
                {/* Entry Date & Header */}
                <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-lg">event_available</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-on-surface">
                        Diary for {new Date(entry.date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="text-[11px] text-on-surface-variant">
                        Recorded by: <span className="font-semibold text-primary">{entry.teacherName || 'CBC Class Educator'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Digital Acknowledgement Stamp */}
                  <div className="flex items-center gap-2">
                    {hasSigned ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                        <span>Digitally Signed by {myAck?.guardianName || 'Parent'}</span>
                      </div>
                    ) : isGuardian ? (
                      <button
                        onClick={() => setAcknowledgingEntryId(entry.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-primary to-[#500b1a] text-white rounded-xl text-xs font-bold hover:shadow-xs transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">draw</span>
                        <span>Sign & Acknowledge Entry</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                        Awaiting Parent Sign-off
                      </span>
                    )}
                    {isTeacher && (
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        title="Delete eDiary Entry"
                        className="p-1 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Entry Body */}
                <div className="p-5 space-y-4">
                  {/* Homework Tasks */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">assignment</span>
                      <span>Daily Homework Assignments</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {entry.homeworkTasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-primary">{task.learningArea}</span>
                            <span className="text-[10px] font-data-mono text-outline">Due: {task.dueDate}</span>
                          </div>
                          <p className="text-xs text-on-surface font-medium leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Requirements for Tomorrow & Teacher Remarks in Two Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Tomorrow's Requirements */}
                    {entry.tomorrowRequirements && entry.tomorrowRequirements.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[16px] text-amber-700">backpack</span>
                          <span>What to Bring Tomorrow</span>
                        </div>
                        <ul className="space-y-1 text-xs text-amber-950 font-medium">
                          {entry.tomorrowRequirements.map((req, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Teacher Remarks */}
                    {entry.teacherRemarks && (
                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1">
                        <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          <span>Teacher Notes & Remarks</span>
                        </div>
                        <p className="text-xs text-on-surface leading-relaxed">
                          "{entry.teacherRemarks}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Guardian Feedback Note if Signed */}
                  {myAck && myAck.parentNote && (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-emerald-700 mt-0.5">rate_review</span>
                      <div>
                        <span className="font-bold text-emerald-950">Parent Note ({myAck.guardianName}): </span>
                        <span className="text-emerald-900 italic">"{myAck.parentNote}"</span>
                        <span className="text-[10px] text-emerald-700 block mt-0.5 font-data-mono">
                          Signed on {new Date(myAck.signedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Parent Sign & Acknowledge Modal */}
      {acknowledgingEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">draw</span>
                <h3 className="font-bold text-sm text-on-surface">Digital Parent Signature & Acknowledgement</h3>
              </div>
              <button
                onClick={() => setAcknowledgingEntryId(null)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              By acknowledging, you confirm you have inspected your child’s homework tasks and prepared the necessary items for tomorrow.
            </p>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Parent Feedback or Note to Teacher (Optional):
              </label>
              <textarea
                rows={3}
                value={parentNote}
                onChange={(e) => setParentNote(e.target.value)}
                placeholder="e.g. Homework reviewed and signed. Learner was able to complete all tasks."
                className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-primary"
              ></textarea>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcknowledgingEntryId(null)}
                className="flex-1 py-2.5 bg-surface-container rounded-xl text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAck}
                onClick={() => handleAcknowledge(acknowledgingEntryId)}
                className="flex-1 py-2.5 bg-gradient-to-r from-primary to-[#500b1a] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{isSubmittingAck ? 'Signing...' : 'Sign & Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Create eDiary Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl shadow-xl border border-outline-variant/30 p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">edit_note</span>
                <h3 className="font-bold text-sm text-on-surface">Publish Class eDiary Entry</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Class Stream:</label>
                  <select
                    value={selectedStreamId}
                    onChange={(e) => setSelectedStreamId(e.target.value)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface font-semibold"
                  >
                    {availableStreams.length === 0 ? (
                      <option value="">No streams configured</option>
                    ) : (
                      availableStreams.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.className} - {st.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Date:</label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
              </div>

              {/* Homework Tasks Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface">Homework Tasks:</label>
                  <button
                    type="button"
                    onClick={addTaskRow}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Task</span>
                  </button>
                </div>

                {newTasks.map((t, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Learning Area (e.g. Science, Mathematics)"
                        value={t.learningArea}
                        onChange={(e) => {
                          const updated = [...newTasks];
                          updated[idx].learningArea = e.target.value;
                          setNewTasks(updated);
                        }}
                        className="flex-1 p-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs font-bold text-on-surface"
                      />
                      <input
                        type="date"
                        value={t.dueDate}
                        onChange={(e) => {
                          const updated = [...newTasks];
                          updated[idx].dueDate = e.target.value;
                          setNewTasks(updated);
                        }}
                        className="p-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                      />
                      {newTasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTaskRow(idx)}
                          className="text-outline hover:text-error cursor-pointer p-1"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      required
                      rows={2}
                      placeholder="Task description and questions..."
                      value={t.description}
                      onChange={(e) => {
                        const updated = [...newTasks];
                        updated[idx].description = e.target.value;
                        setNewTasks(updated);
                      }}
                      className="w-full p-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs text-on-surface"
                    ></textarea>
                  </div>
                ))}
              </div>

              {/* Tomorrow's Requirements */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Tomorrow's Requirements (Comma-separated items):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Manila paper, Colored markers, P.E. sneakers"
                  value={tomorrowRequirements}
                  onChange={(e) => setTomorrowRequirements(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface"
                />
              </div>

              {/* Teacher Remarks */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Teacher Remarks / General Notice:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Excellent participation in class science experiment today."
                  value={teacherRemarks}
                  onChange={(e) => setTeacherRemarks(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 bg-surface-container rounded-xl text-xs font-bold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Publish to Class Stream</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
