import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface AddTimetableSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSlotAdded: (data: any) => void;
  timetableId?: string;
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
  timetableId = 'timetable-g7-east',
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
  const [learningAreaId, setLearningAreaId] = useState<string>(initialSlot?.learningAreaId || 'la-science-7');
  const [teacherId, setTeacherId] = useState<string>(initialSlot?.teacherId || 'teacher-001');
  const [roomName, setRoomName] = useState<string>(initialSlot?.roomName || 'Grade 7 East Room');
  const [isBreak, setIsBreak] = useState<boolean>(initialSlot?.isBreak || false);
  const [breakLabel, setBreakLabel] = useState<string>(initialSlot?.label || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialSlot when opened
  useEffect(() => {
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
  }, [initialSlot, isOpen]);

  // Load real options from database if not supplied
  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      try {
        const [laRes, tRes] = await Promise.all([
          apiService.getLearningAreas().catch(() => null),
          apiService.getTeachers().catch(() => null),
        ]);
        if (laRes?.data && Array.isArray(laRes.data) && laRes.data.length > 0) {
          setLearningAreas(laRes.data);
          if (!initialSlot?.learningAreaId) {
            setLearningAreaId(laRes.data[0].id);
          }
        }
        if (tRes?.data && Array.isArray(tRes.data) && tRes.data.length > 0) {
          setTeachers(tRes.data);
          if (!initialSlot?.teacherId) {
            setTeacherId(tRes.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading options for timetable slot:', err);
      }
    }

    loadOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.addTimetableSlot({
        timetableId,
        dayOfWeek,
        periodNumber: Number(periodNumber),
        startTime,
        endTime,
        learningAreaId: isBreak ? undefined : learningAreaId,
        teacherId: isBreak ? undefined : teacherId,
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
              <p className="text-xs text-rose-100">With automated teacher & room clash detection</p>
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
            <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs font-medium">
              {error}
            </div>
          )}

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
                onChange={(e) => setPeriodNumber(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface"
              >
                <option value="1">Period 1</option>
                <option value="2">Period 2</option>
                <option value="3">Period 3 (Break)</option>
                <option value="4">Period 4</option>
                <option value="5">Period 5</option>
                <option value="6">Period 6 (Lunch)</option>
                <option value="7">Period 7</option>
                <option value="8">Period 8</option>
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
              onChange={(e) => setIsBreak(e.target.checked)}
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
                  {learningAreas.map((la) => (
                    <option key={la.id} value={la.id}>
                      {la.name} ({la.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Instructional Teacher
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2 text-xs font-semibold text-on-surface"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.user?.fullName || `Teacher ${t.tscNumber || ''}`}
                    </option>
                  ))}
                </select>
              </div>

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
              disabled={isLoading}
              className="flex-1 py-2.5 bg-[#7a1228] text-white font-bold rounded-lg hover:bg-[#5e0d1e] shadow-md transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{isLoading ? 'Checking Conflicts & Saving...' : 'Save Timetable Slot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
