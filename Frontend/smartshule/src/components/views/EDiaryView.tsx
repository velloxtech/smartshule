import React, { useState, useEffect } from 'react';
import { EDiaryEntry, Student, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const EDiaryView: React.FC = () => {
  const { user, activeViewMode } = useAuth();
  const isGuardian = user?.role === UserRole.GUARDIAN || user?.role === UserRole.PARENT || activeViewMode === 'PARENT';
  const isTeacher = !isGuardian && (user?.role === UserRole.TEACHER || user?.role === UserRole.HEAD_TEACHER || user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SCHOOL_ADMIN);

  const [entries, setEntries] = useState<EDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterDate, setFilterDate] = useState<string>('');

  // Dynamic context
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [availableStreams, setAvailableStreams] = useState<Array<{ id: string; name: string; classRoomId: string; className: string }>>([]);

  // Guardian Portal linked child
  const [linkedStudents, setLinkedStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Teacher Create/Edit Entry Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryStatus, setEntryStatus] = useState<'DRAFT' | 'PUBLISHED'>('PUBLISHED');
  const [newTasks, setNewTasks] = useState<Array<{ learningArea: string; description: string; dueDate: string }>>([]);
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [tomorrowRequirements, setTomorrowRequirements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const loadData = async (studentIdToFilter?: string, dateToFilter?: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      if (isGuardian) {
        // Load parent's children
        const pRes = await apiService.getGuardianPortalData().catch((err: any) => {
          throw new Error(err?.message || 'Failed to authenticate parent profile');
        });
        if (pRes?.data?.children && Array.isArray(pRes.data.children) && pRes.data.children.length > 0) {
          const mappedChildren: Student[] = pRes.data.children.map((st: any) => ({
            ...st,
            name:
              st.name ||
              st.fullName ||
              `${st.firstName || ''} ${st.lastName || ''}`.trim() ||
              'Learner',
            admNo: st.admNo || st.admissionNumber || 'N/A',
            grade: st.grade || (st.gradeLevel ? st.gradeLevel.replace(/_/g, ' ') : 'CBC'),
            stream: st.stream || st.streamName || '',
            profilePhotoUrl: st.profilePhotoUrl,
          }));
          setLinkedStudents(mappedChildren);

          const effectiveStudentId = studentIdToFilter !== undefined ? studentIdToFilter : selectedStudentId;
          const effectiveDate = dateToFilter !== undefined ? dateToFilter : filterDate;

          const feedRes = await apiService.getParentEDiaryFeed({
            studentId: effectiveStudentId || undefined,
            date: effectiveDate || undefined,
          });

          if (feedRes.success && feedRes.data) {
            setEntries(feedRes.data);
          } else {
            setFetchError(feedRes.message || 'Unable to load published eDiary entries.');
            setEntries([]);
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
        const effectiveDate = dateToFilter !== undefined ? dateToFilter : filterDate;
        const diaryRes = await apiService.getStreamEDiary(selectedStreamId, effectiveDate || undefined);
        if (diaryRes.success && diaryRes.data) {
          setEntries(diaryRes.data);
        } else {
          setFetchError(diaryRes.message || 'Unable to load stream eDiary entries.');
          setEntries([]);
        }
      }
    } catch (err: any) {
      console.error('Error loading eDiary entries:', err);
      setFetchError(err.message || 'Network connection failed while fetching eDiary entries.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (window.confirm('Are you sure you want to delete this Daily Homefun & Communication Diary entry?')) {
      try {
        const res = await apiService.deleteEDiaryEntry(entryId);
        if (res.success) {
          setEntries((prev) => prev.filter((e) => e.id !== entryId));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete diary entry');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [user, activeViewMode, selectedStreamId, isGuardian]);

  const handleChildChange = async (stId: string) => {
    setSelectedStudentId(stId);
    await loadData(stId, filterDate);
  };

  const handleDateFilterChange = async (d: string) => {
    setFilterDate(d);
    await loadData(selectedStudentId, d);
  };

  const handleOpenCreateModal = (entryToEdit?: EDiaryEntry) => {
    setFormError(null);
    if (entryToEdit) {
      setEditingEntryId(entryToEdit.id);
      setEntryTitle(entryToEdit.title || '');
      setSelectedDate(entryToEdit.date);
      setTeacherRemarks(entryToEdit.teacherRemarks || '');
      setTomorrowRequirements(
        entryToEdit.tomorrowRequirements ? entryToEdit.tomorrowRequirements.join(', ') : ''
      );
      if (entryToEdit.homeworkTasks && entryToEdit.homeworkTasks.length > 0) {
        setNewTasks(entryToEdit.homeworkTasks.map((t) => ({ ...t })));
      } else if (entryToEdit.homework) {
        setNewTasks([
          {
            learningArea: 'General Homefun',
            description: entryToEdit.homework,
            dueDate: entryToEdit.date,
          },
        ]);
      } else {
        setNewTasks([
          {
            learningArea: '',
            description: '',
            dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          },
        ]);
      }
      setEntryStatus(entryToEdit.status || 'PUBLISHED');
    } else {
      setEditingEntryId(null);
      setEntryTitle('');
      setSelectedDate(new Date().toISOString().slice(0, 10));
      setTeacherRemarks('');
      setTomorrowRequirements('');
      setNewTasks([
        {
          learningArea: '',
          description: '',
          dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        },
      ]);
      setEntryStatus('PUBLISHED');
    }
    setIsCreateOpen(true);
  };

  const handleCreateEntry = async (e: React.FormEvent, targetStatus: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED') => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const reqList = tomorrowRequirements
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const validTasks = newTasks.filter((t) => t.learningArea.trim() || t.description.trim());
      if (validTasks.length === 0 && !teacherRemarks.trim()) {
        const msg = 'Please provide at least one homefun activity or teacher remark before saving.';
        setFormError(msg);
        setIsSubmitting(false);
        return;
      }

      const matchedStream = availableStreams.find((s) => s.id === selectedStreamId);
      const targetClassId = matchedStream ? matchedStream.classRoomId : 'general-class';

      const res = await apiService.createEDiaryEntry({
        id: editingEntryId || undefined,
        schoolId: user?.schoolId || schoolInfo?.id || '',
        classRoomId: targetClassId,
        streamId: selectedStreamId,
        date: selectedDate,
        title: entryTitle.trim() || undefined,
        homeworkTasks: validTasks,
        teacherRemarks: teacherRemarks.trim() || undefined,
        tomorrowRequirements: reqList,
        status: targetStatus,
      });

      if (res.success && res.data) {
        setEntries((prev) => {
          const exists = prev.some((item) => item.id === res.data.id);
          if (exists) {
            return prev.map((item) => (item.id === res.data.id ? res.data : item));
          }
          return [res.data, ...prev];
        });
        setIsCreateOpen(false);
        setEditingEntryId(null);
        setEntryTitle('');
      } else {
        const errorMsg = res.message || 'Failed to save eDiary entry';
        setFormError(errorMsg);
        alert(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to publish eDiary entry';
      setFormError(errorMsg);
      alert('Failed to publish eDiary entry: ' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = async (entryId: string) => {
    setIsSubmittingAck(true);
    try {
      const res = await apiService.acknowledgeEDiary(entryId, {
        studentId: selectedStudentId || undefined,
        guardianName: user ? `${user.firstName} ${user.lastName}` : 'Guardian',
        parentNote: parentNote.trim() || undefined,
      });

      if (res.success && (res.data || (res as any).entry)) {
        const updatedEntry = res.data || (res as any).entry;
        setEntries(entries.map((item) => (item.id === entryId ? updatedEntry : item)));
        setAcknowledgingEntryId(null);
        setParentNote('');
      } else {
        alert(res.message || 'Failed to sign diary entry');
      }
    } catch (err: any) {
      alert('Failed to sign diary entry: ' + (err.message || 'Sign-off failed'));
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
    if (newTasks.length <= 1) {
      setNewTasks([{ learningArea: '', description: '', dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }]);
      return;
    }
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
            <span className="text-primary font-semibold">Daily Homefun &amp; Communication Diary (E-Diary)</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Daily Homefun &amp; Communication Diary (E-Diary)
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {isGuardian
              ? 'Review daily homefun activities, teacher remarks, requirements for tomorrow, and digitally sign off'
              : 'Record daily homefun activities, learning area requirements, and review parent digital sign-offs'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isGuardian && (
            <>
              {linkedStudents.length > 0 && (
                <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 px-2.5 py-1.5 rounded-xl shadow-2xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">family_restroom</span>
                  <span className="text-xs font-bold text-on-surface-variant">Child:</span>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => handleChildChange(e.target.value)}
                    className="bg-transparent text-xs font-bold text-primary focus:outline-hidden cursor-pointer"
                  >
                    <option value="">All Children (Combined Feed)</option>
                    {linkedStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.grade}{st.stream ? ` - ${st.stream}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/30 px-2.5 py-1.5 rounded-xl shadow-2xs">
                <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => handleDateFilterChange(e.target.value)}
                  className="bg-transparent text-xs font-medium text-on-surface focus:outline-hidden"
                />
                {filterDate && (
                  <button
                    onClick={() => handleDateFilterChange('')}
                    className="text-[11px] text-primary hover:underline font-bold cursor-pointer ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}

          {isTeacher && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>+ Record Daily Homefun &amp; Communication Diary</span>
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

      {/* Network / Fetch Error Alert */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-error">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">error</span>
            <div>
              <p className="text-xs font-bold">Failed to load Daily Homefun &amp; Communication Diary entries</p>
              <p className="text-xs text-error/80">{fetchError}</p>
            </div>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1.5 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 self-start sm:self-auto cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Entries Timeline */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-primary">Loading Daily Homefun &amp; Communication Diary entries from database...</p>
        </div>
      ) : isGuardian && linkedStudents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 max-w-md mx-auto my-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-outline-variant/20 flex items-center justify-center mx-auto text-outline">
            <span className="material-symbols-outlined text-2xl">no_accounts</span>
          </div>
          <h3 className="font-bold text-base text-on-surface">No Linked Children Found</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Your parent account is not currently linked to any active learners. Please contact the school administration to link your student profile.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant/30 max-w-md mx-auto my-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <span className="material-symbols-outlined text-2xl">menu_book</span>
          </div>
          <h3 className="font-bold text-base text-on-surface">No Daily Homefun &amp; Communication Diary Entries Found</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {isGuardian
              ? selectedStudentId
                ? 'No published diary entries found for this child’s class in this period.'
                : 'Your children’s educators have not yet published homefun activities or diary entries for this period.'
              : 'No entries recorded for this stream yet. Click "+ Record Daily Homefun & Communication Diary" to publish today\'s activities.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const hasSigned = Boolean(
              entry.isAcknowledgedByParent ||
              (entry.parentAcknowledgements && entry.parentAcknowledgements.length > 0) ||
              ((entry as any).acknowledgements && (entry as any).acknowledgements.length > 0)
            );
            const myAck = entry.parentAcknowledgement ||
                          entry.parentAcknowledgements?.find((a) => a.guardianUserId === user?.id) ||
                          entry.parentAcknowledgements?.[0] ||
                          (entry as any).acknowledgements?.[0];
            const isDraft = entry.status === 'DRAFT';

            return (
              <div
                key={entry.id}
                className={`bg-surface-container-lowest rounded-2xl border ${isDraft ? 'border-amber-300 bg-amber-50/20' : 'border-outline-variant/30'} shadow-xs overflow-hidden`}
              >
                {/* Entry Date & Header */}
                <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${isDraft ? 'bg-amber-100 text-amber-800' : 'bg-primary/10 text-primary'} flex items-center justify-center font-bold`}>
                      <span className="material-symbols-outlined text-lg">{isDraft ? 'draft' : 'event_available'}</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-bold text-sm text-on-surface">
                        <span>{entry.title ? `${entry.title} — ` : ''}Diary for {new Date(entry.date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        {isDraft ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold uppercase tracking-wider">
                            Draft
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                            Published
                          </span>
                        )}
                        <span className="text-[10px] text-outline font-data-mono font-normal">
                          Ref: #{entry.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        Recorded by: <span className="font-semibold text-primary">{entry.teacherName || 'CBC Class Educator'}</span>
                      </div>
                      {/* Learner Badges for Parent Portal */}
                      {isGuardian && entry.applicableStudents && entry.applicableStudents.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] font-bold text-on-surface-variant">For:</span>
                          {entry.applicableStudents.map((st) => (
                            <span
                              key={st.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold"
                            >
                              <span className="material-symbols-outlined text-[13px]">school</span>
                              <span>{st.name}</span>
                              <span className="text-[10px] text-primary/70">({st.grade})</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {isGuardian && (!entry.applicableStudents || entry.applicableStudents.length === 0) && entry.studentName && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[11px] font-bold text-on-surface-variant">For:</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[13px]">school</span>
                            <span>{entry.studentName}</span>
                            {entry.grade && <span className="text-[10px] text-primary/70">({entry.grade})</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Digital Acknowledgement Stamp & Actions */}
                  <div className="flex items-center gap-2">
                    {isDraft ? (
                      isTeacher && (
                        <button
                          onClick={() => handleOpenCreateModal(entry)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Edit & Publish</span>
                        </button>
                      )
                    ) : hasSigned ? (
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

                    {isTeacher && !isDraft && (
                      <button
                        onClick={() => handleOpenCreateModal(entry)}
                        title="Edit this Daily Homefun & Communication Diary entry"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container border border-outline-variant/40 rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>Edit</span>
                      </button>
                    )}

                    {isTeacher && (
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        title="Delete Diary Entry"
                        className="p-1 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Entry Body */}
                <div className="p-5 space-y-4">
                  {/* Homefun Activities */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">assignment</span>
                      <span>Daily Homefun Activities</span>
                    </h4>
                    {entry.homeworkTasks && entry.homeworkTasks.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {entry.homeworkTasks.map((task, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-primary">{task.learningArea || 'General'}</span>
                              <span className="text-[10px] font-data-mono text-outline">Due: {task.dueDate || entry.date}</span>
                            </div>
                            <p className="text-xs text-on-surface font-medium leading-relaxed">
                              {task.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : entry.homework ? (
                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1">
                        <span className="font-bold text-xs text-primary">{entry.title || 'Daily Homefun Activities'}</span>
                        <p className="text-xs text-on-surface font-medium leading-relaxed">
                          {entry.homework}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-variant italic">No specific homefun activities assigned for today.</p>
                    )}
                  </div>

                  {/* Requirements for Tomorrow & Teacher Remarks in Two Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Tomorrow's Requirements */}
                    {entry.tomorrowRequirements && entry.tomorrowRequirements.length > 0 ? (
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
                    ) : null}

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
                  {myAck && (myAck.parentNote || (myAck as any).note) && (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-emerald-700 mt-0.5">rate_review</span>
                      <div>
                        <span className="font-bold text-emerald-950">Parent Note ({myAck.guardianName}): </span>
                        <span className="text-emerald-900 italic">"{myAck.parentNote || (myAck as any).note}"</span>
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
              By acknowledging, you confirm you have inspected your child’s homefun activities and prepared the necessary items for tomorrow.
            </p>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Parent Feedback or Note to Teacher (Optional):
              </label>
              <textarea
                rows={3}
                value={parentNote}
                onChange={(e) => setParentNote(e.target.value)}
                placeholder="e.g. Homefun reviewed and signed. Learner was able to complete all activities."
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

      {/* Teacher Create/Edit Daily Homefun & Communication Diary Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl shadow-xl border border-outline-variant/30 p-6 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary">edit_note</span>
                <h3 className="font-bold text-sm text-on-surface">
                  {editingEntryId ? 'Edit Daily Homefun & Communication Diary Entry' : 'Publish Daily Homefun & Communication Diary Entry'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleCreateEntry(e, entryStatus)} className="space-y-4 overflow-y-auto flex-1 pr-1">
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

              {/* Lesson Focus / Subject Title */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Lesson Focus / Subject Title (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science - Solar System, English - Creative Writing, Mathematics"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface"
                />
              </div>

              {/* Homefun Activities Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface">Homefun Activities &amp; Instructions:</label>
                  <button
                    type="button"
                    onClick={addTaskRow}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Homefun Activity</span>
                  </button>
                </div>

                {newTasks.map((t, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
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
                      <button
                        type="button"
                        onClick={() => removeTaskRow(idx)}
                        className="text-outline hover:text-error cursor-pointer p-1"
                        title="Remove Activity"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Homefun instructions for learners and parents..."
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

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 bg-surface-container rounded-xl text-xs font-bold text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    setEntryStatus('DRAFT');
                    handleCreateEntry(e, 'DRAFT');
                  }}
                  className="flex-1 py-2.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Save Draft</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => setEntryStatus('PUBLISHED')}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{isSubmitting ? 'Publishing...' : 'Publish to Stream'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
