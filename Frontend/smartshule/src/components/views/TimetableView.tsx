import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { TimetableData, TimetableSlot } from '../../types';
import { AddTimetableSlotModal } from '../modals/AddTimetableSlotModal';

export const TimetableView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'stream' | 'teacher'>('stream');
  const [streamId, setStreamId] = useState('stream-g7-east');
  const [teacherId, setTeacherId] = useState('teacher-001');
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [teacherSlots, setTeacherSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      if (viewMode === 'stream') {
        const res = await apiService.getStreamTimetable(streamId, 'term-2026-1');
        if (res.success && res.data) {
          setTimetable(res.data);
        }
      } else {
        const res = await apiService.getTeacherTimetable(teacherId, 'term-2026-1');
        if (res.success && res.data) {
          setTeacherSlots(res.data);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [viewMode, streamId, teacherId]);

  const defaultSchedule = [
    { time: '08:00 - 08:45', mon: 'Integrated Science (Lab 1)', tue: 'Mathematics (East Rm)', wed: 'Integrated Science', thu: 'Pre-Technical', fri: 'Agriculture' },
    { time: '08:45 - 09:30', mon: 'Mathematics (East Rm)', tue: 'Integrated Science', wed: 'English Language', thu: 'Social Studies', fri: 'Physical Ed' },
    { time: '09:30 - 09:50', mon: 'Morning Break / Milk', tue: 'Morning Break / Milk', wed: 'Morning Break / Milk', thu: 'Morning Break / Milk', fri: 'Morning Break / Milk', isBreak: true },
    { time: '09:50 - 10:35', mon: 'Pre-Technical Studies', tue: 'Kiswahili Lugha', wed: 'Integrated Science', thu: 'Mathematics', fri: 'Creative Arts' },
    { time: '10:35 - 11:20', mon: 'Social Studies', tue: 'Creative Arts', wed: 'Agriculture & Nutrition', thu: 'English Language', fri: 'Physical Ed' },
    { time: '11:20 - 12:40', mon: 'Hot Lunch & Recreation', tue: 'Hot Lunch & Recreation', wed: 'Hot Lunch & Recreation', thu: 'Hot Lunch & Recreation', fri: 'Hot Lunch & Recreation', isBreak: true },
    { time: '12:40 - 01:25', mon: 'Kiswahili Lugha', tue: 'Integrated Science', wed: 'Creative Arts', thu: 'Agriculture', fri: 'Pastoral / PPI' },
    { time: '01:25 - 02:10', mon: 'Creative Arts & Music', tue: 'Social Studies', wed: 'Physical Ed', thu: 'Life Skills & Values', fri: 'Clubs & Societies' },
  ];

  const slots = timetable?.slots || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Operations</span>
            <span>/</span>
            <span className="text-primary font-semibold">Timetable Builder</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Weekly Master Timetable & Conflict Engine
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Synchronized KICD lesson allocations, automated teacher/room double-booking prevention
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddSlotOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Assign Slot</span>
          </button>
        </div>
      </div>

      {/* Control Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('stream')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'stream'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Stream Schedule
          </button>
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'teacher'
                ? 'bg-primary text-white shadow-xs'
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
              <option value="stream-g7-east">Grade 7 - East</option>
              <option value="stream-g7-west">Grade 7 - West</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Teacher:</span>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg py-1 px-3 text-xs font-semibold text-on-surface"
            >
              <option value="teacher-001">Tr. Sarah Mwangi (Science)</option>
              <option value="teacher-002">Tr. John Ochieng (Mathematics)</option>
            </select>
          </div>
        )}
      </div>

      {/* Timetable Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3 px-4 w-32 border-r border-surface-container">Time Slot</th>
                <th className="py-3 px-4">Monday</th>
                <th className="py-3 px-4">Tuesday</th>
                <th className="py-3 px-4">Wednesday</th>
                <th className="py-3 px-4">Thursday</th>
                <th className="py-3 px-4">Friday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {defaultSchedule.map((row, i) => (
                <tr
                  key={i}
                  className={row.isBreak ? 'bg-surface-container-low/70 font-semibold' : 'hover:bg-surface-container-low/30'}
                >
                  <td className="py-3 px-4 font-data-mono font-bold text-primary border-r border-surface-container">
                    {row.time}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.mon}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.tue}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.wed}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.thu}
                  </td>
                  <td className={`py-3 px-4 ${row.isBreak ? 'text-outline italic' : 'text-on-surface font-medium'}`}>
                    {row.fri}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backend Assigned Slots Details */}
      {slots.length > 0 && (
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-primary uppercase tracking-wider">
              Assigned Periods with Clash Prevention ({slots.length})
            </h4>
            <span className="text-[11px] font-semibold text-secondary bg-secondary-container px-2 py-0.5 rounded">
              Conflict-Checked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {slots.map((s) => (
              <div key={s.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-primary">{s.dayOfWeek} · P{s.periodNumber}</span>
                  <span className="font-data-mono text-[11px] text-outline">{s.startTime} - {s.endTime}</span>
                </div>
                <div className="font-semibold text-on-surface">{s.learningAreaName || s.label || 'Subject'}</div>
                <div className="text-[11px] text-on-surface-variant">{s.teacherName} · {s.roomName}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddTimetableSlotModal
        isOpen={isAddSlotOpen}
        onClose={() => setIsAddSlotOpen(false)}
        onSlotAdded={() => loadTimetable()}
        timetableId={timetable?.id || 'timetable-g7-east'}
      />
    </div>
  );
};
