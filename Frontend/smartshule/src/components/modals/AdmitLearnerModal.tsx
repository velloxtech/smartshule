import React, { useState, useEffect } from 'react';
import { Student, ClassRoom, StreamItem } from '../../types';
import { apiService } from '../../services/api';

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
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [streamId, setStreamId] = useState('');
  const [dob, setDob] = useState('2015-05-14');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [totalFee, setTotalFee] = useState('0');

  useEffect(() => {
    async function loadDbClasses() {
      try {
        const res = await apiService.getClasses();
        if (res.success && res.data?.length) {
          setClasses(res.data);
          setSelectedClassId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load classes for admission modal:', err);
      }
    }
    if (isOpen) {
      loadDbClasses();
    }
  }, [isOpen]);

  useEffect(() => {
    async function loadStreamsForClass() {
      if (!selectedClassId) {
        setStreams([]);
        setStreamId('');
        return;
      }
      try {
        const res = await apiService.getStreamsByClass(selectedClassId);
        if (res.success && res.data?.length) {
          setStreams(res.data);
          setStreamId('');
        } else {
          setStreams([]);
          setStreamId('');
        }
      } catch {
        setStreams([]);
        setStreamId('');
      }
    }
    loadStreamsForClass();
  }, [selectedClassId]);

  if (!isOpen) return null;

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const gradeLevel = currentClass?.gradeLevel || 'GRADE_7';

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
      classroomId: currentClass?.id,
      streamId: streamId || undefined,
      schoolId: 'school-001',
      academicYearId: 'year-2026',
      guardian: {
        firstName: gFirst,
        lastName: gLast,
        email: guardianEmail || `${gFirst.toLowerCase()}@gmail.com`,
        phone: guardianPhone || '+254700000000',
        relationship: 'PARENT',
        emergencyContact: guardianPhone || '+254700000000',
      },
    };

    onAdmit(
      {
        admNo,
        upi,
        nemis: upi,
        name: fullName,
        gender: gender === 'MALE' ? 'Boy' : 'Girl',
        grade: currentClass?.name || gradeLevel.replace('_', ' '),
        stream: streamId ? (streams.find(s => s.id === streamId)?.name || 'Stream') : 'General',
        guardianName: guardianName || `${gFirst} ${gLast}`,
        guardianPhone: guardianPhone || '-',
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
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Admit New CBC Learner</h3>
              <p className="text-xs text-rose-100">Grace Seeds School · Automatic UPI & NEMIS Registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                CBC Class (From Database)
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.educationLevel.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Stream (Optional)
              </label>
              <select
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              >
                <option value="">No Stream (Single Class)</option>
                {streams.map((s) => (
                  <option key={s.id} value={s.id}>
                    Stream {s.name} (Cap: {s.capacity})
                  </option>
                ))}
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
                  Email (Optional)
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
