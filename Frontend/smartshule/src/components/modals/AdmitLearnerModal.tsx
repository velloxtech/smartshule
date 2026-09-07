import React, { useState } from 'react';
import { Student } from '../../types';

interface AdmitLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmit: (newLearner: Omit<Student, 'id'>, rawBackendData?: any) => void;
}

export const AdmitLearnerModal: React.FC<AdmitLearnerModalProps> = ({
  isOpen,
  onClose,
  onAdmit,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [gradeLevel, setGradeLevel] = useState('GRADE_7');
  const [streamId, setStreamId] = useState('stream-g7-east');
  const [dob, setDob] = useState('2013-05-14');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('+254799888777');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [totalFee, setTotalFee] = useState('42000');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const admNo = 'ADM-2026-' + Math.floor(100 + Math.random() * 900);
    const upi = 'NEMIS-K' + Math.floor(1000 + Math.random() * 9000) + 'A';
    const fullName = `${firstName} ${lastName}`.trim();

    const guardianParts = guardianName.trim().split(' ');
    const gFirst = guardianParts[0] || 'Guardian';
    const gLast = guardianParts.slice(1).join(' ') || 'Parent';

    const rawPayload = {
      admissionNumber: admNo,
      upiNumber: upi,
      firstName,
      lastName,
      dateOfBirth: dob,
      gender,
      gradeLevel,
      streamId,
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardian: {
        firstName: gFirst,
        lastName: gLast,
        email: guardianEmail || `${gFirst.toLowerCase()}@gmail.com`,
        phone: guardianPhone,
        relationship: 'MOTHER',
        emergencyContact: guardianPhone,
      },
    };

    onAdmit(
      {
        admNo,
        upi,
        nemis: upi,
        name: fullName,
        gender: gender === 'MALE' ? 'Boy' : 'Girl',
        grade: gradeLevel.replace('_', ' '),
        stream: 'East',
        guardianName: guardianName || `${gFirst} ${gLast}`,
        guardianPhone,
        feeBalance: Number(totalFee),
        totalFee: Number(totalFee),
        attendanceRate: 100,
        cbcRating: 'ME',
        status: 'Active',
      },
      rawPayload
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden border border-outline-variant/30 my-auto">
        <div className="bg-[#00236f] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Admit New CBC Learner</h3>
              <p className="text-xs text-blue-200">SmartShule · Automatic UPI & NEMIS Registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Kevin"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Kariuki"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="MALE">Boy (Male)</option>
                <option value="FEMALE">Girl (Female)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                CBC Grade
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="GRADE_7">Grade 7 (Junior Sec)</option>
                <option value="GRADE_8">Grade 8 (Junior Sec)</option>
                <option value="GRADE_9">Grade 9 (Junior Sec)</option>
                <option value="GRADE_6">Grade 6 (KPSEA)</option>
                <option value="GRADE_5">Grade 5</option>
                <option value="GRADE_4">Grade 4</option>
                <option value="GRADE_3">Grade 3</option>
                <option value="GRADE_2">Grade 2</option>
                <option value="GRADE_1">Grade 1</option>
                <option value="PP2">PP2</option>
                <option value="PP1">PP1</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Allocated Stream
              </label>
              <select
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="stream-g7-east">East Stream</option>
                <option value="stream-g7-west">West Stream</option>
              </select>
            </div>
          </div>

          <div className="border-t border-surface-container pt-3 space-y-3">
            <span className="text-xs font-bold text-primary uppercase block">Parent / Guardian Bio</span>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Guardian Full Name
              </label>
              <input
                type="text"
                required
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="e.g. Mary Kariuki"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  M-Pesa Mobile #
                </label>
                <input
                  type="text"
                  required
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="+2547XXXXXXXX"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary font-data-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  placeholder="parent@gmail.com"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              <span>Confirm Learner Admission</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
