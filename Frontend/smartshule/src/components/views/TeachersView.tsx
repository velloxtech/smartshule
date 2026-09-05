import React, { useState } from 'react';
import { Teacher } from '../../types';

interface TeachersViewProps {
  teachers: Teacher[];
  onToggleClockIn: (teacherId: string) => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({ teachers, onToggleClockIn }) => {
  const [search, setSearch] = useState('');

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tscNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.role.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Faculty & Biometric Clock-in Registry
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            TSC registered educators, assigned learning areas, and real-time roll call logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            42/43 Staff Clocked In Today
          </span>
        </div>
      </div>

      {/* Faculty Cards Grid */}
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
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('') || 'TR'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-on-surface">{t.name}</h3>
                      <span className="font-data-mono text-xs text-outline block">{t.tscNumber}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      isClockedIn
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Role:</span>
                    <span className="font-medium text-on-surface text-right">{t.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Assigned Class:</span>
                    <span className="font-semibold text-primary">{t.assignedClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Phone:</span>
                    <span className="font-data-mono text-on-surface">{t.phone}</span>
                  </div>
                  {t.clockInTime && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Biometric Logged:</span>
                      <span className="font-data-mono text-secondary font-semibold">{t.clockInTime}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-surface-container">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                    Learning Areas Handled
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {t.learningAreas.map((la) => (
                      <span
                        key={la}
                        className="px-2 py-0.5 rounded bg-surface-container text-primary font-medium text-[11px]"
                      >
                        {la}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                <button
                  onClick={() => onToggleClockIn(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isClockedIn
                      ? 'bg-surface-container text-error hover:bg-error-container'
                      : 'bg-secondary text-white hover:bg-secondary/90'
                  }`}
                >
                  {isClockedIn ? 'Clock Out / Permit' : 'Clock In Biometric'}
                </button>
                <a
                  href={`tel:${t.phone.replace(/\s/g, '')}`}
                  className="text-primary text-xs font-semibold flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span> Contact
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
