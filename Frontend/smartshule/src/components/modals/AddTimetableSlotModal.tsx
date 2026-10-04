import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { sortAndGroupClasses, sortClassesInCbcSequence } from '../../utils/classCategorization';

interface AddTimetableSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSlotAdded: (data: any) => void;
  timetableId?: string;
  classRoomId?: string;
  streamId?: string;
  termId?: string;
  classes?: any[];
  streams?: any[];
  learningAreas?: any[];
  teachers?: any[];
  initialSlot?: any;
  availableDays?: Array<{ key: string; label: string }>;
  onDeleteSlot?: (slotId: string) => void;
}

export const AddTimetableSlotModal: React.FC<AddTimetableSlotModalProps> = ({
  isOpen,
  onClose,
  onSlotAdded,
  timetableId = '',
  classRoomId,
  streamId,
  termId,
  classes: propClasses = [],
  streams: propStreams = [],
  learningAreas: propLearningAreas = [],
  teachers: propTeachers = [],
  initialSlot,
  availableDays = [
    { key: 'MONDAY', label: 'Monday' },
    { key: 'TUESDAY', label: 'Tuesday' },
    { key: 'WEDNESDAY', label: 'Wednesday' },
    { key: 'THURSDAY', label: 'Thursday' },
    { key: 'FRIDAY', label: 'Friday' },
  ],
  onDeleteSlot,
}) => {
  const [classesList, setClassesList] = useState<any[]>(propClasses);
  const [selectedClassRoomId, setSelectedClassRoomId] = useState<string>(classRoomId || '');
  const [streamsList, setStreamsList] = useState<any[]>(propStreams);
  const [selectedStreamId, setSelectedStreamId] = useState<string>(streamId || '');

  const [learningAreas, setLearningAreas] = useState<any[]>(propLearningAreas);
  const [teachers, setTeachers] = useState<any[]>(propTeachers);

  const [dayOfWeek, setDayOfWeek] = useState<string>(
    initialSlot?.dayOfWeek || availableDays[0]?.key || 'MONDAY'
  );
  const [periodNumber, setPeriodNumber] = useState<string>(
    initialSlot?.periodNumber ? String(initialSlot.periodNumber) : '1'
  );
  const [startTime, setStartTime] = useState<string>(initialSlot?.startTime || '08:00');
  const [endTime, setEndTime] = useState<string>(initialSlot?.endTime || '08:45');
  const [learningAreaId, setLearningAreaId] = useState<string>(initialSlot?.learningAreaId || '');
  const [teacherId, setTeacherId] = useState<string>(initialSlot?.teacherId || '');
  const [roomName, setRoomName] = useState<string>(initialSlot?.roomName || '');
  const [isBreak, setIsBreak] = useState<boolean>(initialSlot?.isBreak || false);
  const [breakLabel, setBreakLabel] = useState<string>(initialSlot?.label || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time Teacher Clash Detection State
  const [clashWarning, setClashWarning] = useState<string | null>(null);
  const [isCheckingClash, setIsCheckingClash] = useState<boolean>(false);
  const [isClashBlocked, setIsClashBlocked] = useState<boolean>(false);

  const PERIOD_TIME_PRESETS: Record<string, { start: string; end: string; isBreak?: boolean; label?: string }> = {
    '1': { start: '08:00', end: '08:45', isBreak: false },
    '2': { start: '08:45', end: '09:30', isBreak: false },
    '3': { start: '09:30', end: '10:00', isBreak: true, label: 'Mid-Morning Break & Snack' },
    '4': { start: '10:00', end: '10:45', isBreak: false },
    '5': { start: '10:45', end: '11:30', isBreak: false },
    '6': { start: '11:30', end: '12:15', isBreak: false },
    '7': { start: '12:15', end: '13:00', isBreak: false },
    '8': { start: '13:00', end: '14:00', isBreak: true, label: 'Lunch Break & Relaxation' },
    '9': { start: '14:00', end: '14:45', isBreak: false },
  };

  const handlePeriodChange = (val: string) => {
    setPeriodNumber(val);
    const preset = PERIOD_TIME_PRESETS[val];
    if (preset) {
      setStartTime(preset.start);
      setEndTime(preset.end);
      if (preset.isBreak) {
        setIsBreak(true);
        setBreakLabel(preset.label || 'Break');
      } else {
        setIsBreak(false);
        setBreakLabel('');
      }
    }
  };

  const handleBreakToggle = (checked: boolean) => {
    setIsBreak(checked);
    if (checked && !breakLabel) {
      setBreakLabel('Break');
    }
  };

  // Sync initialSlot and props when opened
  useEffect(() => {
    if (classRoomId) setSelectedClassRoomId(classRoomId);
    if (streamId !== undefined) setSelectedStreamId(streamId);
    if (initialSlot) {
      if (initialSlot.dayOfWeek) setDayOfWeek(initialSlot.dayOfWeek);
      if (initialSlot.periodNumber) setPeriodNumber(String(initialSlot.periodNumber));
      if (initialSlot.startTime) setStartTime(initialSlot.startTime);
      if (initialSlot.endTime) setEndTime(initialSlot.endTime);
      if (initialSlot.learningAreaId) setLearningAreaId(initialSlot.learningAreaId);
      if (initialSlot.teacherId) setTeacherId(initialSlot.teacherId);
      if (initialSlot.roomName) setRoomName(initialSlot.roomName);
      if (initialSlot.isBreak !== undefined) setIsBreak(initialSlot.isBreak);
      if (initialSlot.label) setBreakLabel(initialSlot.label);
    }
    setError(null);
    setClashWarning(null);
    setIsClashBlocked(false);
  }, [initialSlot, classRoomId, streamId, isOpen]);

  // Load real options from database if not supplied
  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      try {
        const promises: Promise<any>[] = [
          apiService.getLearningAreas().catch(() => null),
          apiService.getTeachers().catch(() => null),
        ];

        if (!propClasses || propClasses.length === 0) {
          promises.push(apiService.getClasses().catch(() => null));
        }

        const [laRes, tRes, cRes] = await Promise.all(promises);

        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          if (!initialSlot?.learningAreaId && !learningAreaId) {
            setLearningAreaId(laRes.data[0].id);
          }
        }
        if (tRes?.data && Array.isArray(tRes.data) && tRes.data.length > 0) {
          setTeachers(tRes.data);
          if (!initialSlot?.teacherId && !teacherId) {
            setTeacherId(tRes.data[0].id);
          }
        }
        if (cRes?.data && Array.isArray(cRes.data) && cRes.data.length > 0) {
          const sorted = sortClassesInCbcSequence(cRes.data);
          setClassesList(sorted);
          if (!selectedClassRoomId && !classRoomId) {
            setSelectedClassRoomId(sorted[0].id);
          }
        } else if (propClasses && propClasses.length > 0) {
          const sorted = sortClassesInCbcSequence(propClasses);
          setClassesList(sorted);
          if (!selectedClassRoomId && !classRoomId) {
            setSelectedClassRoomId(sorted[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading options for timetable slot:', err);
      }
    }

    loadOptions();
  }, [isOpen]);

  // Load streams when selectedClassRoomId changes
  useEffect(() => {
    if (!selectedClassRoomId) return;
    apiService.getStreamsByClass(selectedClassRoomId)
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setStreamsList(res.data);
        } else {
          setStreamsList([]);
        }
      })
      .catch(() => setStreamsList([]));
  }, [selectedClassRoomId]);

  // Real-time Teacher Clash Detection
  // Checks if the selected teacher already has another class scheduled on the same day and period
  useEffect(() => {
    if (!isOpen) return;

    if (!teacherId || isBreak) {
      setClashWarning(null);
      setIsClashBlocked(false);
      return;
    }

    let isMounted = true;
    setIsCheckingClash(true);

    apiService.getTeacherTimetable(teacherId, termId || '')
      .then((res) => {
        if (!isMounted) return;
        setIsCheckingClash(false);
        const slots = res?.data || [];

        const conflict = slots.find((s: any) => {
          const isSameDay = String(s.dayOfWeek).trim().toUpperCase() === String(dayOfWeek).trim().toUpperCase();
          const isSamePeriod = Number(s.periodNumber) === Number(periodNumber);
          if (!isSameDay || !isSamePeriod) return false;

          // Slot in the exact same class & stream (or same timetable)?
          const isSameTimetable = (timetableId && s.timetableId && s.timetableId === timetableId) ||
            (s.classRoomId === selectedClassRoomId && (s.streamId || '') === (selectedStreamId || ''));

          return !isSameTimetable;
        });

        if (conflict) {
          const teacherObj = teachers.find((t) => t.id === teacherId);
          const teacherName = teacherObj?.name || teacherObj?.user?.fullName || 'This teacher';
          const confClassName = classesList.find((c) => c.id === conflict.classRoomId)?.name || 'another class';
          const confStream = conflict.streamId ? ` (Stream: ${conflict.streamId})` : '';

          setClashWarning(
            `⚠️ CLASH DETECTED: ${teacherName} is already scheduled in ${confClassName}${confStream} on ${dayOfWeek}, Period ${periodNumber}. A teacher cannot have two classes simultaneously!`
          );
          setIsClashBlocked(true);
        } else {
          setClashWarning(null);
          setIsClashBlocked(false);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setIsCheckingClash(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, teacherId, dayOfWeek, periodNumber, selectedClassRoomId, selectedStreamId, isBreak, timetableId, termId, classesList, teachers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isClashBlocked) {
      setError(clashWarning || 'Scheduling clash: teacher is already booked in another class at this time.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const selectedArea = learningAreas.find((la) => la.id === learningAreaId);
    const selectedTeacher = teachers.find((t) => t.id === teacherId);
    const resolvedTeacherName = selectedTeacher
      ? (selectedTeacher.name || selectedTeacher.user?.fullName || `Teacher ${selectedTeacher.tscNumber || ''}`)
      : undefined;

    try {
      const res = await apiService.addTimetableSlot({
        timetableId: timetableId || undefined,
        classRoomId: selectedClassRoomId || undefined,
        streamId: selectedStreamId || undefined,
        termId: termId || undefined,
        dayOfWeek,
        periodNumber: Number(periodNumber),
        startTime,
        endTime,
        learningAreaId: isBreak ? undefined : learningAreaId,
        learningAreaName: isBreak ? undefined : (selectedArea?.name || selectedArea?.code),
        teacherId: isBreak ? undefined : teacherId,
        teacherName: isBreak ? undefined : resolvedTeacherName,
        roomName: isBreak ? undefined : roomName,
        isBreak,
        isLunch: isBreak && breakLabel.toLowerCase().includes('lunch'),
        label: isBreak ? breakLabel : undefined,
      });

      if (res.success && res.data) {
        onSlotAdded(res.data);
        onClose();
      } else {
        setError(res.message || 'Slot addition failed due to conflict');
      }
    } catch (err: any) {
      setError(err.message || 'Timetable clash detected! The teacher or room is already booked.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">calendar_add_on</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                {initialSlot?.id ? 'Edit Timetable Slot' : 'Assign Timetable Slot'}
              </h3>
              <p className="text-xs text-rose-100">With automated teacher clash revocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Target Class & Stream Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-outline-variant/20">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Class / Grade
              </label>
              <select
                value={selectedClassRoomId}
                onChange={(e) => {
                  setSelectedClassRoomId(e.target.value);
                  setSelectedStreamId('');
                }}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-[#7a1228]"
              >
                {classesList.length === 0 ? (
                  <option value="">No classes configured</option>
                ) : (
                  sortAndGroupClasses(classesList).map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Stream (Optional)
              </label>
              <select
                value={selectedStreamId}
                onChange={(e) => setSelectedStreamId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface focus:ring-1 focus:ring-[#7a1228]"
              >
                <option value="">Main Cohort (No Stream)</option>
                {streamsList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface"
              >
                {availableDays.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Period Number
              </label>
              <select
                value={periodNumber}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface"
              >
                <option value="1">Period 1 (08:00 - 08:45)</option>
                <option value="2">Period 2 (08:45 - 09:30)</option>
                <option value="3">Period 3 (Break: 09:30 - 10:00)</option>
                <option value="4">Period 4 (10:00 - 10:45)</option>
                <option value="5">Period 5 (10:45 - 11:30)</option>
                <option value="6">Period 6 (11:30 - 12:15)</option>
                <option value="7">Period 7 (12:15 - 13:00)</option>
                <option value="8">Period 8 (Lunch: 13:00 - 14:00)</option>
                <option value="9">Period 9 (14:00 - 14:45)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono font-semibold text-on-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-data-mono font-semibold text-on-surface"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isBreak"
              checked={isBreak}
              onChange={(e) => handleBreakToggle(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="isBreak" className="text-xs font-semibold text-on-surface">
              Is Break / Interval / Lunch Slot
            </label>
          </div>

          {isBreak ? (
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Break Label
              </label>
              <input
                type="text"
                placeholder="e.g. Morning Tea & Milk, Lunch Break"
                value={breakLabel}
                onChange={(e) => setBreakLabel(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface font-semibold"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Learning Area / Subject
                </label>
                <select
                  value={learningAreaId}
                  onChange={(e) => setLearningAreaId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface"
                >
                  {learningAreas.length === 0 ? (
                    <option value="">No learning areas found</option>
                  ) : (
                    learningAreas.map((la) => (
                      <option key={la.id} value={la.id}>
                        {la.name} ({la.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant">
                    Instructional Teacher
                  </label>
                  {isCheckingClash && (
                    <span className="text-[10px] text-primary animate-pulse font-semibold">
                      Checking availability...
                    </span>
                  )}
                </div>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className={`w-full bg-surface-container-low border rounded-lg p-2 text-xs font-semibold text-on-surface ${
                    isClashBlocked ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'
                  }`}
                >
                  {teachers.length === 0 ? (
                    <option value="">No teachers found</option>
                  ) : (
                    teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.user?.fullName || `Teacher ${t.tscNumber || ''}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Real-time Clash Warning Banner */}
              {clashWarning && (
                <div className="p-3 rounded-xl bg-error/15 border border-error/40 text-error flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">block</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold leading-tight">{clashWarning}</p>
                    <p className="text-[11px] text-error/80 mt-1">
                      Double-booking is forbidden. Please reassign to an available teacher or pick an open period.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Classroom / Lab
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                  placeholder="e.g. Science Lab 1, Grade 7 East"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs text-on-surface font-semibold"
                />
              </div>
            </>
          )}

          <div className="pt-3 flex items-center gap-2">
            {initialSlot?.id && onDeleteSlot && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to remove this timetable slot?')) {
                    onDeleteSlot(initialSlot.id);
                    onClose();
                  }
                }}
                className="py-2.5 px-3 bg-error/10 hover:bg-error/20 text-error font-bold rounded-lg transition-all flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete</span>
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || isClashBlocked}
              className={`flex-1 py-2.5 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 text-xs ${
                isClashBlocked
                  ? 'bg-gray-400 cursor-not-allowed opacity-75'
                  : 'bg-[#7a1228] hover:bg-[#5e0d1e] cursor-pointer'
              } disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isClashBlocked ? 'block' : 'save'}
              </span>
              <span>
                {isLoading
                  ? 'Validating & Saving...'
                  : isClashBlocked
                  ? 'Blocked: Teacher Double-Booked'
                  : 'Save Timetable Slot'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
