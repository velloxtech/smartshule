import React, { useState } from 'react';
import { attendanceGradeData } from '../../data/mockData';

interface AttendanceRegisterViewProps {
  onOpenSmsModal: (target?: 'absentee' | 'fee' | 'all') => void;
}

export const AttendanceRegisterView: React.FC<AttendanceRegisterViewProps> = ({
  onOpenSmsModal,
}) => {
  const [selectedGrade, setSelectedGrade] = useState('Grade 1');

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Attendance & Daily Roll</span>
            <span>/</span>
            <span className="text-primary font-semibold">Daily Register</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Biometric & Teacher Roll-Call Register
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Morning roll call records, late-arrivals verification, and absentee SMS trigger
          </p>
        </div>

        <button
          onClick={() => onOpenSmsModal('absentee')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-container text-sm font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">sms</span>
          <span>Trigger Absentee SMS Alerts</span>
        </button>
      </div>

      {/* Grade Level Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {attendanceGradeData.map((g) => (
          <div
            key={g.grade}
            onClick={() => setSelectedGrade(g.grade)}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedGrade === g.grade
                ? 'bg-surface-container-lowest border-primary shadow-sm'
                : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-on-surface">{g.grade}</span>
              <span className="text-xs font-data-mono font-bold text-secondary">{g.pct.toFixed(1)}%</span>
            </div>
            <div className="mt-2 text-xs text-on-surface-variant flex justify-between">
              <span>{g.present} / {g.total} Present</span>
              <span className="text-error font-medium">{g.late} Late</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Class Register */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div>
            <h3 className="font-bold text-base text-primary">{selectedGrade} Morning Roll-Call</h3>
            <p className="text-xs text-on-surface-variant">Class Teacher: Tr. Sarah Mwangi · Time Logged: 07:45 AM</p>
          </div>
          <span className="px-3 py-1 rounded bg-secondary-container text-on-secondary-container text-xs font-bold">
            Biometric Gate Reader Active
          </span>
        </div>

        <div className="space-y-2">
          {[
            { name: 'Kipchoge Brian', adm: 'HA-2021-089', status: 'Present', time: '07:12 AM', badge: 'bg-secondary' },
            { name: 'Achieng Brenda', adm: 'HA-2022-104', status: 'Present', time: '07:20 AM', badge: 'bg-secondary' },
            { name: 'Otieno Emmanuel', adm: 'HA-2022-145', status: 'Late', time: '08:15 AM', badge: 'bg-amber-600' },
            { name: 'Wanjiku Mercy', adm: 'HA-2023-012', status: 'Absent (Unexplained)', time: '--', badge: 'bg-error' },
            { name: 'Mutua Kevin', adm: 'HA-2021-078', status: 'Present', time: '07:25 AM', badge: 'bg-secondary' },
          ].map((st, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low text-xs">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${st.badge}`}></span>
                <div>
                  <div className="font-semibold text-on-surface">{st.name}</div>
                  <div className="text-[11px] text-outline font-data-mono">{st.adm}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-data-mono text-on-surface-variant">{st.time}</span>
                <span className={`font-semibold ${st.status.includes('Absent') ? 'text-error' : st.status === 'Late' ? 'text-amber-700' : 'text-secondary'}`}>
                  {st.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
