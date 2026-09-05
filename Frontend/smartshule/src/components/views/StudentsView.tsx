import React, { useState } from 'react';
import { Student, CBCRubric } from '../../types';

interface StudentsViewProps {
  students: Student[];
  onOpenMpesaWithStudent: (student: Student) => void;
  onOpenCBCWithStudent: (student: Student) => void;
  onOpenAdmitModal: () => void;
  onViewReportCard: (student: Student) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onOpenMpesaWithStudent,
  onOpenCBCWithStudent,
  onOpenAdmitModal,
  onViewReportCard,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedRating, setSelectedRating] = useState('All');

  const grades = ['All', 'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  const ratings = ['All', 'EE', 'ME', 'AE', 'BE'];

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admNo.includes(search) ||
      s.upi.toLowerCase().includes(search.toLowerCase()) ||
      s.guardianName.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = selectedGrade === 'All' || s.grade === selectedGrade;
    const matchesRating = selectedRating === 'All' || s.cbcRating === selectedRating;
    return matchesSearch && matchesGrade && matchesRating;
  });

  const getRatingBadge = (rating: CBCRubric) => {
    switch (rating) {
      case 'EE':
        return <span className="px-2 py-0.5 rounded bg-secondary text-white text-xs font-bold">EE · Exceeding</span>;
      case 'ME':
        return <span className="px-2 py-0.5 rounded bg-primary text-white text-xs font-bold">ME · Meeting</span>;
      case 'AE':
        return <span className="px-2 py-0.5 rounded bg-amber-700 text-white text-xs font-bold">AE · Approaching</span>;
      case 'BE':
        return <span className="px-2 py-0.5 rounded bg-error text-white text-xs font-bold">BE · Below</span>;
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
            <span className="text-primary font-semibold">Students & Guardians</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
            CBC Learner Directory & Profiles
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ministry of Education NEMIS & Biometric verified student registry
          </p>
        </div>

        <button
          onClick={onOpenAdmitModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-container text-sm font-semibold shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Admit New Learner</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name, Adm #, UPI, or Parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low pl-10 pr-4 py-2 rounded-lg text-sm border border-outline-variant/30 focus:outline-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-surface-container-low text-xs font-semibold py-2 px-3 rounded-lg border border-outline-variant/30 text-on-surface"
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                Class: {g}
              </option>
            ))}
          </select>

          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="bg-surface-container-low text-xs font-semibold py-2 px-3 rounded-lg border border-outline-variant/30 text-on-surface"
          >
            {ratings.map((r) => (
              <option key={r} value={r}>
                CBC Rating: {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-outline-variant/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase font-label-md tracking-wider border-b border-outline-variant/20">
              <tr>
                <th className="py-3 px-4">Learner Details</th>
                <th className="py-3 px-4">MoE UPI / NEMIS</th>
                <th className="py-3 px-4">Grade & Stream</th>
                <th className="py-3 px-4">Guardian & Phone</th>
                <th className="py-3 px-4">CBC Rubric</th>
                <th className="py-3 px-4 text-right">Fee Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {(s.name || '')
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('') || 'ST'}
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface">{s.name}</div>
                        <div className="text-xs text-on-surface-variant font-data-mono">
                          Adm #{s.admNo} · {s.gender}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-data-mono text-xs font-medium text-primary">{s.upi}</div>
                    <div className="font-data-mono text-[11px] text-outline">{s.nemis}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-on-surface">{s.grade}</span>
                    <span className="text-xs text-on-surface-variant block">{s.stream} Stream</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-on-surface">{s.guardianName}</div>
                    <div className="text-xs font-data-mono text-on-surface-variant">{s.guardianPhone}</div>
                  </td>
                  <td className="py-3 px-4">{getRatingBadge(s.cbcRating)}</td>
                  <td className="py-3 px-4 text-right">
                    {s.feeBalance === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> Cleared
                      </span>
                    ) : (
                      <div>
                        <div className="font-bold text-error font-data-mono">
                          KES {s.feeBalance.toLocaleString()}
                        </div>
                        <span className="text-[11px] text-outline">due this term</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewReportCard(s)}
                        title="View Official CBC Report Card"
                        className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">article</span>
                      </button>
                      <button
                        onClick={() => onOpenCBCWithStudent(s)}
                        title="Log CBC Rubric"
                        className="p-1.5 rounded-lg text-secondary hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">rule</span>
                      </button>
                      {s.feeBalance > 0 && (
                        <button
                          onClick={() => onOpenMpesaWithStudent(s)}
                          title="Trigger M-Pesa STK Push"
                          className="p-1.5 rounded-lg text-secondary hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                        </button>
                      )}
                    </div>
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
