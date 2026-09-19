import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { TimetableData, TimetableSlot, PeriodDefinition, DayDefinition, UserRole } from '../../types';
import { AddTimetableSlotModal } from '../modals/AddTimetableSlotModal';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_PERIODS: PeriodDefinition[] = [
  { periodNumber: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false, isLunch: false },
  { periodNumber: 2, name: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false, isLunch: false },
  { periodNumber: 3, name: 'Morning Break', startTime: '09:30', endTime: '09:50', isBreak: true, isLunch: false },
  { periodNumber: 4, name: 'Period 3', startTime: '09:50', endTime: '10:35', isBreak: false, isLunch: false },
  { periodNumber: 5, name: 'Period 4', startTime: '10:35', endTime: '11:20', isBreak: false, isLunch: false },
  { periodNumber: 6, name: 'Lunch & Rest', startTime: '11:20', endTime: '12:40', isBreak: true, isLunch: true },
  { periodNumber: 7, name: 'Period 5', startTime: '12:40', endTime: '13:25', isBreak: false, isLunch: false },
  { periodNumber: 8, name: 'Period 6', startTime: '13:25', endTime: '14:10', isBreak: false, isLunch: false },
];

const DEFAULT_DAYS: DayDefinition[] = [
  { dayOfWeek: 'MONDAY', label: 'Monday', isEnabled: true },
  { dayOfWeek: 'TUESDAY', label: 'Tuesday', isEnabled: true },
  { dayOfWeek: 'WEDNESDAY', label: 'Wednesday', isEnabled: true },
  { dayOfWeek: 'THURSDAY', label: 'Thursday', isEnabled: true },
  { dayOfWeek: 'FRIDAY', label: 'Friday', isEnabled: true },
];

export const TimetableView: React.FC = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === UserRole.TEACHER;
  const canEditGrid = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SCHOOL_ADMIN || user?.role === UserRole.HEAD_TEACHER || isTeacher;

  const [viewMode, setViewMode] = useState<'stream' | 'teacher'>(isTeacher ? 'teacher' : 'stream');
  const [streamId, setStreamId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teacherProfile, setTeacherProfile] = useState<any>(null);

  // Dynamic context and entities
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [availableStreams, setAvailableStreams] = useState<Array<{ id: string; name: string; classRoomId: string; className: string }>>([]);

  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [teacherSlots, setTeacherSlots] = useState<TimetableSlot[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Grid Dimensions State
  const [periods, setPeriods] = useState<PeriodDefinition[]>(DEFAULT_PERIODS);
  const [days, setDays] = useState<DayDefinition[]>(DEFAULT_DAYS);
  const [isGridDirty, setIsGridDirty] = useState(false);
  const [isSavingGrid, setIsSavingGrid] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit/Add slot modal state
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<any>(null);

  // Period / Day Modals
  const [editingPeriod, setEditingPeriod] = useState<PeriodDefinition | null>(null);
  const [isAddPeriodOpen, setIsAddPeriodOpen] = useState(false);
  const [newPeriodData, setNewPeriodData] = useState<PeriodDefinition>({
    periodNumber: 9,
    name: 'Period 7',
    startTime: '14:15',
    endTime: '15:00',
    isBreak: false,
    isLunch: false,
  });

  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('Saturday');

  // Load school, academic context, classes & streams
  useEffect(() => {
    async function loadTimetableContext() {
      try {
        const [scRes, ctxRes, cRes] = await Promise.all([
          apiService.getSchool().catch(() => null),
          apiService.getCurrentContext().catch(() => null),
          apiService.getClasses().catch(() => null),
        ]);
        if (scRes?.data) setSchoolInfo(scRes.data);
        if (ctxRes?.data) setCurrentContext(ctxRes.data);
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
          if (allStreams.length > 0 && !streamId) {
            setStreamId(allStreams[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load timetable context:', err);
      }
    }
    loadTimetableContext();
  }, []);

  // Initialize teacher profile if educator & load teachers list
  useEffect(() => {
    async function initTeacher() {
      if (isTeacher) {
        try {
          const res = await apiService.getMyTeacherProfile();
          if (res?.data) {
            setTeacherProfile(res.data);
            setTeacherId(res.data.id);
            if (res.data.assignedClassStreamIds?.length) {
              setStreamId(res.data.assignedClassStreamIds[0]);
            }
          }
        } catch {
          // Keep defaults
        }
      }
      try {
        const tList = await apiService.getTeachers();
        if (tList?.data && Array.isArray(tList.data)) {
          setTeachersList(tList.data);
          if (tList.data.length > 0 && !teacherId) {
            setTeacherId(tList.data[0].id);
          }
        }
      } catch {
        // Keep defaults
      }
    }
    initTeacher();
  }, [isTeacher]);

  const loadTimetable = async () => {
    setLoading(true);
    const activeTermId = currentContext?.currentTerm?.id || '';
    try {
      if (viewMode === 'stream') {
        if (!streamId) {
          setTimetable(null);
          setPeriods(DEFAULT_PERIODS);
          setDays(DEFAULT_DAYS);
          setLoading(false);
          return;
        }
        const res = await apiService.getStreamTimetable(streamId, activeTermId);
        if (res.success && res.data) {
          setTimetable(res.data);
          if (res.data.periods && res.data.periods.length > 0) {
            setPeriods(res.data.periods);
          } else {
            setPeriods(DEFAULT_PERIODS);
          }
          if (res.data.days && res.data.days.length > 0) {
            setDays(res.data.days);
          } else {
            setDays(DEFAULT_DAYS);
          }
        } else {
          setTimetable(null);
          setPeriods(DEFAULT_PERIODS);
          setDays(DEFAULT_DAYS);
        }
      } else {
        if (!teacherId) {
          setTeacherSlots([]);
          setLoading(false);
          return;
        }
        const res = await apiService.getTeacherTimetable(teacherId, activeTermId);
        if (res.success && res.data) {
          setTeacherSlots(res.data);
        } else {
          setTeacherSlots([]);
        }
      }
      setIsGridDirty(false);
    } catch {
      if (viewMode === 'stream') {
        setTimetable(null);
        setPeriods(DEFAULT_PERIODS);
        setDays(DEFAULT_DAYS);
      } else {
        setTeacherSlots([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [viewMode, streamId, teacherId, currentContext]);

  const activeSlots: TimetableSlot[] = viewMode === 'stream'
    ? (timetable?.slots || [])
    : teacherSlots;

  // Save full grid with dynamic periods and days
  const handleSaveGrid = async () => {
    setIsSavingGrid(true);
    setSaveSuccessMsg(null);

    const matchedStream = availableStreams.find((s) => s.id === streamId);
    const targetClassId = matchedStream ? matchedStream.classRoomId : 'general-class';
    const activeSchoolId = user?.schoolId || schoolInfo?.id || '';

    try {
      const res = await apiService.saveTimetableGrid({
        timetableId: timetable?.id || `timetable-${streamId}`,
        schoolId: activeSchoolId,
        academicYearId: currentContext?.currentYear?.id || '',
        termId: currentContext?.currentTerm?.id || '',
        classRoomId: targetClassId,
        streamId: streamId,
        periods: periods,
        days: days,
        slots: timetable?.slots || [],
      });

      if (res.success && res.data) {
        setTimetable(res.data);
        if (res.data.periods) setPeriods(res.data.periods);
        if (res.data.days) setDays(res.data.days);
        setIsGridDirty(false);
        setSaveSuccessMsg('Timetable grid dimensions & schedule saved successfully!');
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      alert('Failed to save grid: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingGrid(false);
    }
  };

  // Row (Period) Actions
  const handleAddPeriod = () => {
    const updated = [...periods, { ...newPeriodData, periodNumber: periods.length + 1 }];
    setPeriods(updated);
    setIsGridDirty(true);
    setIsAddPeriodOpen(false);
    setNewPeriodData({
      periodNumber: updated.length + 1,
      name: `Period ${updated.length + 1}`,
      startTime: '14:15',
      endTime: '15:00',
      isBreak: false,
      isLunch: false,
    });
  };

  const handleUpdatePeriod = (updatedPeriod: PeriodDefinition) => {
    const updated = periods.map((p) => (p.periodNumber === updatedPeriod.periodNumber ? updatedPeriod : p));
    setPeriods(updated);
    setEditingPeriod(null);
    setIsGridDirty(true);
  };

  const handleDeletePeriod = (periodNum: number) => {
    if (!window.confirm(`Delete row Period ${periodNum}? Slots in this period will also be affected.`)) return;
    const updated = periods
      .filter((p) => p.periodNumber !== periodNum)
      .map((p, idx) => ({ ...p, periodNumber: idx + 1 }));
    setPeriods(updated);
    setIsGridDirty(true);
  };

  // Column (Day) Actions
  const handleAddDay = () => {
    const dayKey = newDayLabel.trim().toUpperCase().replace(/\s+/g, '_');
    if (days.some((d) => d.dayOfWeek === dayKey)) {
      alert('A day column with this identifier already exists!');
      return;
    }
    const updated = [...days, { dayOfWeek: dayKey, label: newDayLabel.trim(), isEnabled: true }];
    setDays(updated);
    setIsGridDirty(true);
    setIsAddDayOpen(false);
    setNewDayLabel('Saturday');
  };

  const handleDeleteDay = (dayKey: string) => {
    if (!window.confirm(`Delete the column "${dayKey}" and all scheduled lessons for this day?`)) return;
    const updated = days.filter((d) => d.dayOfWeek !== dayKey);
    setDays(updated);
    // Remove slots associated with this day
    if (timetable) {
      setTimetable({
        ...timetable,
        slots: timetable.slots.filter((s) => s.dayOfWeek !== dayKey),
      });
    }
    setIsGridDirty(true);
  };

  const handleSlotAdded = (updatedTimetable: TimetableData) => {
    setTimetable(updatedTimetable);
    if (updatedTimetable.periods && updatedTimetable.periods.length > 0) {
      setPeriods(updatedTimetable.periods);
    }
    if (updatedTimetable.days && updatedTimetable.days.length > 0) {
      setDays(updatedTimetable.days);
    }
    setIsGridDirty(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (timetable?.id) {
      try {
        const res = await apiService.deleteTimetableSlot(timetable.id, slotId);
        if (res.success && res.data) {
          setTimetable(res.data);
          return;
        }
      } catch {
        // fallback to local removal
      }
    }
    if (timetable) {
      setTimetable({
        ...timetable,
        slots: timetable.slots.filter((s) => s.id !== slotId),
      });
    }
  };

  const handleCellClick = (dayKey: string, pDef: PeriodDefinition, existingSlot?: TimetableSlot) => {
    if (!canEditGrid) return;
    if (existingSlot) {
      setSelectedSlotForEdit({
        ...existingSlot,
        dayOfWeek: dayKey,
        periodNumber: pDef.periodNumber,
      });
    } else {
      setSelectedSlotForEdit({
        dayOfWeek: dayKey,
        periodNumber: pDef.periodNumber,
        startTime: pDef.startTime,
        endTime: pDef.endTime,
        isBreak: pDef.isBreak,
        label: pDef.isBreak ? pDef.name : undefined,
        teacherId: isTeacher && teacherProfile?.id ? teacherProfile.id : teacherId,
        roomName: 'Grade 7 East Room',
      });
    }
    setIsAddSlotOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Operations</span>
            <span>/</span>
            <span className="text-primary font-semibold">Fully Editable Timetable Grid</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Master Timetable Builder & Schedule Engine
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Add/delete period rows, add/delete day columns, customize times, and assign teachers with conflict checks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditGrid && (
            <>
              <button
                onClick={() => setIsAddPeriodOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
                title="Add a new Period / Row"
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                <span>+ Add Row (Period)</span>
              </button>

              <button
                onClick={() => setIsAddDayOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-bold border border-outline-variant/30 transition-all cursor-pointer"
                title="Add a new Day / Column"
              >
                <span className="material-symbols-outlined text-[16px]">view_column</span>
                <span>+ Add Column (Day)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedSlotForEdit(null);
                  setIsAddSlotOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7a1228] text-white rounded-lg hover:bg-[#5e0d1e] text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Assign Slot</span>
              </button>

              <button
                onClick={handleSaveGrid}
                disabled={isSavingGrid}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer ${
                  isGridDirty
                    ? 'bg-secondary text-white hover:bg-secondary/90 animate-pulse'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isSavingGrid ? 'sync' : 'cloud_done'}
                </span>
                <span>{isSavingGrid ? 'Saving Grid...' : isGridDirty ? 'Save Grid (Unsaved Changes)' : 'Save Timetable Grid'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-base text-emerald-700">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Control Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('stream')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'stream'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Stream Schedule
          </button>
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'teacher'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Teacher Individual View
          </button>
        </div>

        {viewMode === 'stream' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Stream:</span>
            <select
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1 px-3 text-xs font-semibold text-on-surface"
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
            <span className="text-[11px] text-on-surface-variant font-data-mono">
              Grid: {periods.length} Rows × {days.length} Columns
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Teacher:</span>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1 px-3 text-xs font-semibold text-on-surface"
            >
              {teachersList.length === 0 ? (
                <option value="">No teachers available</option>
              ) : (
                teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.user?.fullName || `Teacher ${t.tscNumber || ''}`}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      {/* Editable Matrix Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-3 w-36 border-r border-surface-container">
                  <div className="flex items-center justify-between">
                    <span>Period / Time</span>
                    {canEditGrid && (
                      <button
                        onClick={() => setIsAddPeriodOpen(true)}
                        title="Add period row"
                        className="text-primary hover:text-primary/70 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_box</span>
                      </button>
                    )}
                  </div>
                </th>
                {days.map((d) => (
                  <th key={d.dayOfWeek} className="py-3 px-3 min-w-[170px] border-r border-surface-container last:border-r-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface">{d.label}</span>
                      {canEditGrid && days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDay(d.dayOfWeek)}
                          title={`Delete ${d.label} column`}
                          className="text-outline hover:text-error transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {periods.map((pDef) => (
                <tr
                  key={pDef.periodNumber}
                  className={pDef.isBreak ? 'bg-surface-container-low/70' : 'hover:bg-surface-container-low/20 transition-colors'}
                >
                  {/* Period Time Header with Edit Controls */}
                  <td className="py-3 px-3 border-r border-surface-container font-data-mono align-top">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-primary block">
                          P{pDef.periodNumber} · {pDef.name}
                        </span>
                        <span className="text-[11px] text-outline font-normal block mt-0.5">
                          {pDef.startTime} - {pDef.endTime}
                        </span>
                        {pDef.isBreak && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-800 text-[10px] font-bold">
                            {pDef.isLunch ? 'Lunch' : 'Break'}
                          </span>
                        )}
                      </div>

                      {canEditGrid && (
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingPeriod(pDef)}
                            title="Edit Period Times & Label"
                            className="text-on-surface-variant hover:text-primary cursor-pointer p-0.5 rounded hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          {periods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeletePeriod(pDef.periodNumber)}
                              title="Delete this row"
                              className="text-on-surface-variant hover:text-error cursor-pointer p-0.5 rounded hover:bg-surface-container"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Day Columns */}
                  {days.map((d) => {
                    const slot = activeSlots.find(
                      (s) => s.dayOfWeek === d.dayOfWeek && s.periodNumber === pDef.periodNumber
                    );

                    return (
                      <td
                        key={`${d.dayOfWeek}-${pDef.periodNumber}`}
                        onClick={() => handleCellClick(d.dayOfWeek, pDef, slot)}
                        className={`py-2 px-2 border-r border-surface-container last:border-r-0 align-top transition-colors ${
                          canEditGrid ? 'cursor-pointer hover:bg-primary/5' : ''
                        }`}
                      >
                        {slot ? (
                          slot.isBreak ? (
                            <div className="h-full min-h-[56px] rounded-lg bg-amber-50 border border-amber-200/60 p-2 flex flex-col justify-center items-center text-center">
                              <span className="material-symbols-outlined text-amber-700 text-sm">coffee</span>
                              <span className="text-[11px] font-bold text-amber-900 mt-0.5">
                                {slot.label || (slot.isLunch ? 'Lunch & Rest' : 'Morning Break')}
                              </span>
                            </div>
                          ) : (
                            <div className="h-full min-h-[56px] rounded-lg bg-surface-container-lowest border border-outline-variant/30 p-2 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between">
                              <div>
                                <div className="font-bold text-on-surface text-xs leading-tight">
                                  {slot.learningAreaName || 'Learning Area'}
                                </div>
                                <div className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px] text-secondary">person</span>
                                  <span className="truncate">{slot.teacherName || 'Assigned Teacher'}</span>
                                </div>
                              </div>
                              <div className="mt-2 pt-1 border-t border-surface-container-high flex items-center justify-between text-[10px] text-outline font-data-mono">
                                <span>{slot.roomName || 'Room'}</span>
                                <span className="text-primary font-semibold">
                                  {slot.startTime}-{slot.endTime}
                                </span>
                              </div>
                            </div>
                          )
                        ) : pDef.isBreak ? (
                          <div className="h-full min-h-[56px] rounded-lg bg-surface-container-low/50 border border-dashed border-outline-variant/30 p-2 flex flex-col justify-center items-center text-center">
                            <span className="text-[11px] text-outline italic">
                              {pDef.name || 'Break'}
                            </span>
                          </div>
                        ) : (
                          <div className="h-full min-h-[56px] rounded-lg border border-dashed border-outline-variant/30 p-2 flex flex-col justify-center items-center text-center text-outline hover:text-primary hover:border-primary transition-all group">
                            {canEditGrid && (
                              <>
                                <span className="material-symbols-outlined text-xs group-hover:scale-110 transition-transform">add</span>
                                <span className="text-[10px] font-semibold mt-0.5">Empty Slot</span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Period Edit Modal */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="font-bold text-sm text-on-surface">Edit Period {editingPeriod.periodNumber} Details</h3>
              <button
                onClick={() => setEditingPeriod(null)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-on-surface-variant mb-1">Period Label / Name</label>
                <input
                  type="text"
                  value={editingPeriod.name}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, name: e.target.value })}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editingPeriod.startTime}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, startTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">End Time</label>
                  <input
                    type="time"
                    value={editingPeriod.endTime}
                    onChange={(e) => setEditingPeriod({ ...editingPeriod, endTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="periodIsBreak"
                  checked={editingPeriod.isBreak}
                  onChange={(e) => setEditingPeriod({ ...editingPeriod, isBreak: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="periodIsBreak" className="text-xs font-semibold text-on-surface">
                  This row is a Break or Interval
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="flex-1 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdatePeriod(editingPeriod)}
                className="flex-1 py-2 bg-[#7a1228] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Update Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Period Modal */}
      {isAddPeriodOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="font-bold text-sm text-on-surface">Add New Timetable Row (Period)</h3>
              <button
                onClick={() => setIsAddPeriodOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-on-surface-variant mb-1">Period Label</label>
                <input
                  type="text"
                  value={newPeriodData.name}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, name: e.target.value })}
                  placeholder="e.g. Period 7, Evening Study"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newPeriodData.startTime}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, startTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-on-surface-variant mb-1">End Time</label>
                  <input
                    type="time"
                    value={newPeriodData.endTime}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, endTime: e.target.value })}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs font-data-mono text-on-surface"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newIsBreak"
                  checked={newPeriodData.isBreak}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, isBreak: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="newIsBreak" className="text-xs font-semibold text-on-surface">
                  This row is a Break / Tea / Rest
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddPeriodOpen(false)}
                className="flex-1 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPeriod}
                className="flex-1 py-2 bg-[#7a1228] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Add Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Day Modal */}
      {isAddDayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl shadow-xl border border-outline-variant/30 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="font-bold text-sm text-on-surface">Add Timetable Column (Day)</h3>
              <button
                onClick={() => setIsAddDayOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold uppercase text-on-surface-variant mb-1">Day Name / Label</label>
                <input
                  type="text"
                  value={newDayLabel}
                  onChange={(e) => setNewDayLabel(e.target.value)}
                  placeholder="e.g. Saturday, Sunday, Remedial"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-xs text-on-surface font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddDayOpen(false)}
                className="flex-1 py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDay}
                className="flex-1 py-2 bg-[#7a1228] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Modal */}
      <AddTimetableSlotModal
        isOpen={isAddSlotOpen}
        onClose={() => {
          setIsAddSlotOpen(false);
          setSelectedSlotForEdit(null);
        }}
        onSlotAdded={handleSlotAdded}
        timetableId={timetable?.id || `timetable-${streamId}`}
        initialSlot={selectedSlotForEdit}
        availableDays={days.map((d) => ({ key: d.dayOfWeek, label: d.label }))}
        onDeleteSlot={handleDeleteSlot}
      />
    </div>
  );
};
