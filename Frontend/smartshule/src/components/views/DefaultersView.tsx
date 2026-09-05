import React, { useState } from 'react';
import { Student } from '../../types';

interface DefaultersViewProps {
  students: Student[];
  onOpenMpesaWithStudent: (student: Student) => void;
  onOpenSmsModal: (target?: 'absentee' | 'fee' | 'all') => void;
}

export const DefaultersView: React.FC<DefaultersViewProps> = ({
  students,
  onOpenMpesaWithStudent,
  onOpenSmsModal,
}) => {
  const [selectedGrade, setSelectedGrade] = useState('All');

  const defaulters = students.filter((s) => s.feeBalance > 0);
  const filtered = defaulters.filter(
    (s) => selectedGrade === 'All' || s.grade === selectedGrade
  );

  const totalOutstanding = defaulters.reduce((acc, curr) => acc + curr.feeBalance, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Finance & Billing</span>
            <span>/</span>
            <span className="text-primary font-semibold">Defaulters & Receipts</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            Outstanding Fee Defaulters & Arrears
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage fee arrears, automated M-Pesa STK prompts, and bulk SMS reminder broadcasts
          </p>
        </div>

        <button
          onClick={() => onOpenSmsModal('fee')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-error text-white rounded-lg hover:bg-error/90 text-sm font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">sms</span>
          <span>Send Bulk SMS Reminder</span>
        </button>
      </div>

      {/* High-Level Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Outstanding Arrears
            </span>
            <div className="text-2xl font-bold font-data-mono text-error mt-1">
              KES 2,630,000
            </div>
            <span className="text-[11px] text-outline mt-1 block">81 Total Learner Defaulters</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">warning</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Grade 6 Outstanding
            </span>
            <div className="text-xl font-bold font-data-mono text-on-surface mt-1">KES 780,500</div>
            <span className="text-[11px] text-error font-medium mt-1 block">32 Candidate Defaulters</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">school</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Grade 4 Outstanding
            </span>
            <div className="text-xl font-bold font-data-mono text-on-surface mt-1">KES 642,000</div>
            <span className="text-[11px] text-error font-medium mt-1 block">28 Defaulters</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[26px]">group</span>
          </div>
        </div>
      </div>

      {/* Defaulters List */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="p-4 border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[20px]">person_off</span>
            <h3 className="font-semibold text-sm text-on-surface">Active Defaulters Register</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-medium">Filter Class:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-surface-container-low text-xs font-semibold py-1.5 px-3 rounded-lg border border-outline-variant/30 text-on-surface"
            >
              <option value="All">All Classes</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 1">Grade 1</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-label-md tracking-wider border-b border-outline-variant/20">
              <tr>
                <th className="py-3 px-4">Learner</th>
                <th className="py-3 px-4">Grade & Stream</th>
                <th className="py-3 px-4">Parent / Guardian</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-right">Quick Collections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-on-surface">{s.name}</div>
                    <div className="text-xs text-on-surface-variant font-data-mono">
                      Adm #{s.admNo} · UPI: {s.upi}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-on-surface">{s.grade}</span>
                    <span className="text-xs text-on-surface-variant block">{s.stream} Stream</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-on-surface">{s.guardianName}</td>
                  <td className="py-3 px-4 font-data-mono text-xs text-on-surface-variant">
                    {s.guardianPhone}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-sm font-data-mono text-error">
                      KES {s.feeBalance.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onOpenMpesaWithStudent(s)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                      <span>Push STK</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
