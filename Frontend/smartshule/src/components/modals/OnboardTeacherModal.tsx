import React, { useState } from 'react';
import { apiService } from '../../services/api';

interface OnboardTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeacherCreated: (teacher: any) => void;
}

export const OnboardTeacherModal: React.FC<OnboardTeacherModalProps> = ({
  isOpen,
  onClose,
  onTeacherCreated,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+254');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [tscNumber, setTscNumber] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [qualification, setQualification] = useState('B.Ed Science');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const specArray = specializations
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (specArray.length === 0) {
      setError('Please provide at least one subject specialization (comma separated).');
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiService.registerTeacher({
        email,
        password: 'Teacher@123',
        firstName,
        lastName,
        phone,
        schoolId: 'school-001',
        employeeNumber: employeeNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        tscNumber: tscNumber || `TSC/${Math.floor(100000 + Math.random() * 900000)}`,
        specialization: specArray,
        qualification,
      });

      if (res.success && res.data) {
        onTeacherCreated(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to onboard teacher');
      }
    } catch (err: any) {
      setError(err.message || 'Error onboarding teacher');
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
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Onboard CBC Teacher</h3>
              <p className="text-xs text-blue-200">TSC Registration & Subject Specializations</p>
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
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. David"
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
                placeholder="e.g. Kiprono"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. david.kiprono@smartshule.ac.ke"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2547XXXXXXXX"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                TSC Number
              </label>
              <input
                type="text"
                value={tscNumber}
                onChange={(e) => setTscNumber(e.target.value)}
                placeholder="TSC/XXXXXX"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Employee #
              </label>
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="EMP-0103"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
                Qualification
              </label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="B.Ed, Diploma"
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant mb-1">
              Subject Specializations (Comma Separated)
            </label>
            <input
              type="text"
              required
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              placeholder="e.g. Mathematics, Social Studies"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-2.5 text-sm text-on-surface focus:outline-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-container text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>{isLoading ? 'Registering...' : 'Register Teacher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
