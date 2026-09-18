import React, { useState } from 'react';
import { Teacher } from '../../types';
import { apiService } from '../../services/api';

interface TeachersViewProps {
  teachers: Teacher[];
  onToggleClockIn: (teacherId: string) => void;
  onOpenOnboardTeacher?: () => void;
  onDeleteTeacher?: (teacherId: string) => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  onToggleClockIn,
  onOpenOnboardTeacher,
  onDeleteTeacher,
}) => {
  const [search, setSearch] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [streamId, setStreamId] = useState('stream-g7-east');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteTeacher = async (t: Teacher) => {
    if (window.confirm(`Are you sure you want to delete ${t.name} (TSC: ${t.tscNumber})? This action cannot be undone.`)) {
      setDeletingId(t.id);
      try {
        const res = await apiService.deleteTeacher(t.id);
        if (res.success) {
          onDeleteTeacher?.(t.id);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete teacher');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tscNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.role.toLowerCase().includes(search.toLowerCase()) ||
      t.learningAreas.some((la) => la.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAssignStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignLoading(true);
    setAssignSuccess(null);
    try {
      const res = await apiService.assignStreamToTeacher(selectedTeacherId, streamId);
      if (res.success) {
        setAssignSuccess('Stream successfully assigned to teacher!');
        setTimeout(() => {
          setIsAssignOpen(false);
          setAssignSuccess(null);
        }, 1200);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign stream');
    } finally {
      setAssignLoading(false);
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
            <span className="text-primary font-semibold">Teachers & Staff</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              Faculty & Biometric Clock-in Registry
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>Article 237 (TSC) & Chapter 6 Compliant</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            TSC registered educators, assigned learning areas, stream allocations, and real-time roll call
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenOnboardTeacher && (
            <button
              onClick={onOpenOnboardTeacher}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg hover:bg-primary-container text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Onboard Teacher (Art. 237)</span>
            </button>
          )}
          <span className="px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            {teachers.filter((t) => t.status === 'Clocked In').length}/{teachers.length} Clocked In
          </span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-2.5 material-symbols-outlined text-outline text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by teacher name, TSC number, or learning area..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:outline-primary shadow-xs"
          />
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-5xl text-outline">person_off</span>
            <p className="font-bold text-base text-on-surface">No educators found</p>
            <p className="text-xs text-outline">Click "Onboard CBC Teacher" to register faculty members with TSC numbers.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
          const isClockedIn = t.status === 'Clocked In';
          return (
            <div
              key={t.id}
              className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {(t.name || '')
                        .replace('Tr. ', '')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h3 className="font-headline-md text-sm font-bold text-on-surface">{t.name}</h3>
                      <p className="text-[11px] text-on-surface-variant font-data-mono">{t.tscNumber}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isClockedIn ? 'bg-secondary text-white' : 'bg-surface-container text-outline'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Role / Designation:</span>
                    <span className="font-semibold text-on-surface">{t.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Assigned Class:</span>
                    <span className="font-bold text-primary">{t.assignedClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Specialization:</span>
                    <span className="font-semibold text-secondary truncate max-w-[170px]">
                      {t.learningAreas.join(', ')}
                    </span>
                  </div>
                  {t.qualification && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Qualification:</span>
                      <span className="text-on-surface">{t.qualification}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Direct Phone:</span>
                    <span className="font-data-mono text-outline">{t.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedTeacherId(t.id);
                    setIsAssignOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary transition-colors cursor-pointer"
                >
                  Assign Stream
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDeleteTeacher(t)}
                    disabled={deletingId === t.id}
                    title="Delete Teacher Record"
                    className="p-1 rounded text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {deletingId === t.id ? 'sync' : 'delete'}
                    </span>
                  </button>
                  <button
                    onClick={() => onToggleClockIn(t.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                      isClockedIn
                        ? 'bg-error-container text-on-error-container hover:bg-error/20'
                        : 'bg-primary text-white hover:bg-primary-container'
                    }`}
                  >
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Assign Stream Modal */}
      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-sm w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
            <div className="bg-[#7a1228] text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">Assign Stream to Educator</h3>
              <button onClick={() => setIsAssignOpen(false)} className="text-rose-100 hover:text-white cursor-pointer p-1 rounded-lg">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <form onSubmit={handleAssignStream} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              {assignSuccess && (
                <div className="p-2.5 rounded bg-secondary/10 text-secondary font-semibold border border-secondary/20">
                  {assignSuccess}
                </div>
              )}
              <div>
                <label className="block font-bold text-on-surface-variant mb-1 uppercase">Target Stream</label>
                <select
                  value={streamId}
                  onChange={(e) => setStreamId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2"
                >
                  <option value="stream-g7-east">Grade 7 - East Stream</option>
                  <option value="stream-g7-west">Grade 7 - West Stream</option>
                  <option value="stream-g8-east">Grade 8 - East Stream</option>
                </select>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-container disabled:opacity-50"
                >
                  {assignLoading ? 'Assigning...' : 'Confirm Stream Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
