import React, { useState } from 'react';
import { apiService } from '../../services/api';

interface AddTimetableSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSlotAdded: (data: any) => void;
  timetableId?: string;
  learningAreas?: any[];
  teachers?: any[];
}

export const AddTimetableSlotModal: React.FC<AddTimetableSlotModalProps> = ({
  isOpen,
  onClose,
  onSlotAdded,
  timetableId = 'timetable-g7-east',
  learningAreas = [],
  teachers = [],
}) => {
  const [dayOfWeek, setDayOfWeek] = useState<'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY'>('MONDAY');
  const [periodNumber, setPeriodNumber] = useState('4');
  const [startTime, setStartTime] = useState('10:30');
  const [endTime, setEndTime] = useState('11:15');
  const [learningAreaId, setLearningAreaId] = useState(learningAreas[0]?.id || 'la-science-7');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || 'teacher-001');
  const [roomName, setRoomName] = useState('Grade 7 East Room');
  const [isBreak, setIsBreak] = useState(false);
  const [breakLabel, setBreakLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
              <span className="material-symbols-outlined text-[24px]">calendar_add_on</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Assign Timetable Slot</h3>
              <p className="text-xs text-blue-200">With automated teacher & room clash detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
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
                onChange={(e) => setDayOfWeek(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="MONDAY">Monday</option>
                <option value="TUESDAY">Tuesday</option>
                <option value="WEDNESDAY">Wednesday</option>
                <option value="THURSDAY">Thursday</option>
                <option value="FRIDAY">Friday</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Period #
              </label>
              <input
                type="number"
                min="1"
                max="9"
                required
                value={periodNumber}
                onChange={(e) => setPeriodNumber(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Start Time
              </label>
              <input
                type="text"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="08:00"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary font-data-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                End Time
              </label>
              <input
                type="text"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="08:45"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary font-data-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 pb-1">
            <input
              type="checkbox"
              id="isBreak"
              checked={isBreak}
              onChange={(e) => setIsBreak(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="isBreak" className="text-xs font-semibold text-on-surface">
              This is a Break / Lunch slot
            </label>
          </div>

          {isBreak ? (
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Break Label
              </label>
              <input
                type="text"
                value={breakLabel}
                onChange={(e) => setBreakLabel(e.target.value)}
                placeholder="e.g. Morning Tea Break"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Learning Area
                </label>
                <select
                  value={learningAreaId}
                  onChange={(e) => setLearningAreaId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                >
                  <option value="la-science-7">Integrated Science (SCIE7)</option>
                  <option value="la-math-7">Mathematics (MATH7)</option>
                  {learningAreas.map((la) => (
                    <option key={la.id} value={la.id}>
                      {la.name} ({la.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                    Instructional Teacher
                  </label>
                  <select
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                  >
                    <option value="teacher-001">Tr. Sarah Mwangi</option>
                    <option value="teacher-002">Tr. John Ochieng</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.user?.fullName || t.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Science Lab 1"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
              <span>{isLoading ? 'Verifying & Saving...' : 'Save & Check Clash'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
