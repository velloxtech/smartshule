import React, { useState } from 'react';
import { Student } from '../../types';

interface AdmitLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmit: (newLearner: Omit<Student, 'id'>) => void;
}

export const AdmitLearnerModal: React.FC<AdmitLearnerModalProps> = ({
  isOpen,
  onClose,
  onAdmit,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Boy' | 'Girl'>('Boy');
  const [grade, setGrade] = useState('Grade 1');
  const [stream, setStream] = useState('East');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [totalFee, setTotalFee] = useState('22000');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const randomAdm = '2024-' + Math.floor(210 + Math.random() * 80);
    const randomUPI = 'UPI-' + Math.floor(1000000 + Math.random() * 9000000);
    const randomNEMIS = 'NEM-' + Math.floor(100000 + Math.random() * 900000);

    onAdmit({
      admNo: randomAdm,
      upi: randomUPI,
      nemis: randomNEMIS,
      name,
      gender,
      grade,
      stream,
      guardianName,
      guardianPhone: guardianPhone || '0712 000 000',
      feeBalance: Number(totalFee),
      totalFee: Number(totalFee),
      attendanceRate: 100,
      cbcRating: 'ME',
      status: 'Active',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-outline-variant/30">
        <div className="bg-[#00236f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#653400] flex items-center justify-center text-white font-bold">
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Admit New CBC Learner</h3>
              <p className="text-xs text-blue-200">Hillside Academy · Automatic NEMIS / UPI Registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Learner Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dennis Kiprono"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Boy' | 'Girl')}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="Boy">Boy</option>
                <option value="Girl">Girl</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Class / Grade
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="PP1">PP1</option>
                <option value="PP2">PP2</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Stream
              </label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="East">East</option>
                <option value="West">West</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Term Fee (KES)
              </label>
              <input
                type="number"
                required
                value={totalFee}
                onChange={(e) => setTotalFee(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm font-data-mono text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Parent / Guardian Name
            </label>
            <input
              type="text"
              required
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="e.g. Christine Kiprono"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Parent Phone (for M-Pesa & SMS)
            </label>
            <input
              type="text"
              required
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="0722 xxx xxx"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm font-data-mono text-on-surface focus:outline-primary"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Confirm Admission</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
