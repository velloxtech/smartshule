import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BackendLearningArea } from '../../types';
import {
  isValidKenyanPhone,
  formatKenyanPhone,
  isValidTscNumber,
  formatTscNumber,
} from '../../utils/kenyanConstitution';

interface EditTeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherProfile: any;
  onProfileUpdated: (updatedData: any) => void;
}

export const EditTeacherProfileModal: React.FC<EditTeacherProfileModalProps> = ({
  isOpen,
  onClose,
  teacherProfile,
  onProfileUpdated,
}) => {
  const { user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tscNumber, setTscNumber] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [qualification, setQualification] = useState('B.Ed (Science)');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState('');

  const [dbLearningAreas, setDbLearningAreas] = useState<BackendLearningArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize form with current teacher details when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccessMsg(null);

    const currentUser = teacherProfile?.user || user;
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }

    if (teacherProfile) {
      setTscNumber(teacherProfile.tscNumber || '');
      setEmployeeNumber(teacherProfile.employeeNumber || '');
      setQualification(teacherProfile.qualification || 'B.Ed (Science)');
      setSelectedSubjects(
        Array.isArray(teacherProfile.specialization) ? teacherProfile.specialization : []
      );
    }

    // Load available CBC learning areas
    apiService
      .getLearningAreas()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setDbLearningAreas(res.data);
        }
      })
      .catch(() => {});
  }, [isOpen, teacherProfile, user]);

  if (!isOpen) return null;

  const toggleSubject = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const handleAddCustomSubject = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customSubject.trim();
    if (trimmed && !selectedSubjects.includes(trimmed)) {
      setSelectedSubjects((prev) => [...prev, trimmed]);
      setCustomSubject('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (phone.trim() && !isValidKenyanPhone(phone)) {
      setError('Please provide a valid Kenyan phone number (e.g. +254712345678 or 0712345678).');
      return;
    }

    if (tscNumber.trim() && !isValidTscNumber(tscNumber)) {
      setError('Invalid TSC number format. Enter digits or format like TSC/123456 (or leave blank if pending).');
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phone.trim() ? formatKenyanPhone(phone) : undefined;
      const formattedTsc = tscNumber.trim() ? formatTscNumber(tscNumber) : undefined;

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        tscNumber: formattedTsc,
        employeeNumber: employeeNumber.trim() || undefined,
        qualification,
        specialization: selectedSubjects,
      };

      const res = await apiService.updateMyTeacherProfile(payload);

      if (res.success && res.data) {
        setSuccessMsg('Profile updated successfully!');
        onProfileUpdated(res.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 my-auto text-slate-800">
        {/* Header with Grace Seeds Burgundy stripe */}
        <div className="bg-[#7a1228] text-white p-4 sm:p-5 relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
              </div>
              <div>
                <h2 className="text-lg font-bold">Edit Teacher / Staff Profile</h2>
                <p className="text-xs text-rose-100">
                  Update personal details, contact info, TSC number, and specializations
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">
                check_circle
              </span>
              <div className="flex-1 font-semibold">{successMsg}</div>
            </div>
          )}

          {/* Section: Personal Info */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              Personal & Contact Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  First Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. David"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Last Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Kiprono"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Official Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. teacher@smartshule.ac.ke"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Phone Number (M-Pesa / SMS)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+2547XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Professional Credentials */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>Professional Credentials</span>
              <span className="text-[10px] text-emerald-700 font-semibold lowercase">TSC is optional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    TSC Number
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Optional
                  </span>
                </div>
                <input
                  type="text"
                  value={tscNumber}
                  onChange={(e) => setTscNumber(e.target.value)}
                  placeholder="e.g. TSC/123456 (Leave blank if pending)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Teachers awaiting commission number can leave this blank</span>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Employee Number
                </label>
                <input
                  type="text"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="e.g. 01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Highest Academic / Professional Qualification
              </label>
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-900 focus:outline-[#7a1228] focus:bg-white"
              >
                <option value="Certificate in Early Childhood (ECDE)">Certificate in Early Childhood (ECDE)</option>
                <option value="Diploma in Early Childhood (ECDE)">Diploma in Early Childhood (ECDE)</option>
                <option value="Diploma in Primary Teacher Education (DPTE)">Diploma in Primary Teacher Education (DPTE)</option>
                <option value="Diploma in Secondary Teacher Education (DSTE)">Diploma in Secondary Teacher Education (DSTE)</option>
                <option value="B.Ed (Science)">Bachelor of Education (Science)</option>
                <option value="B.Ed (Arts)">Bachelor of Education (Arts)</option>
                <option value="B.Ed (Special Needs)">B.Ed Special Needs Education (SNE)</option>
                <option value="Postgraduate Diploma in Education (PGDE)">Postgraduate Diploma in Education (PGDE)</option>
                <option value="Masters in Education (M.Ed)">Masters in Education (M.Ed)</option>
                <option value="Doctor of Philosophy in Education (Ph.D)">Doctor of Philosophy in Education (Ph.D)</option>
                <option value="Bachelor of Commerce / Finance / CPA">Bachelor of Commerce / Finance / CPA</option>
                <option value="Diploma / Degree in Business Administration">Diploma / Degree in Business Administration</option>
                <option value="Other Professional Qualification">Other Professional Qualification</option>
              </select>
            </div>
          </div>

          {/* Section: Learning Areas / Specialization */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                CBC Learning Areas & Specializations
              </label>
              <span className="text-[10px] text-slate-500">
                Select areas you teach
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
              {(dbLearningAreas.length > 0
                ? Array.from(new Set(dbLearningAreas.map((la) => la.name)))
                : [
                    'Mathematics',
                    'English Language',
                    'Kiswahili Language',
                    'Integrated Science',
                    'Social Studies',
                    'Christian Religious Education (CRE)',
                    'Agriculture & Nutrition',
                    'Creative Arts & Sports',
                    'Pre-Technical Studies',
                  ]
              ).map((subjName) => {
                const isSelected = selectedSubjects.includes(subjName);
                return (
                  <button
                    key={subjName}
                    type="button"
                    onClick={() => toggleSubject(subjName)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 border cursor-pointer ${
                      isSelected
                        ? 'bg-[#7a1228] text-white border-[#7a1228] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {isSelected ? 'check' : 'add'}
                    </span>
                    <span>{subjName}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Subject Chips */}
            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedSubjects.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className="hover:text-rose-900 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Custom Specialization */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomSubject(e);
                }}
                placeholder="Other area (e.g. French, Music)..."
                className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-[#7a1228]"
              />
              <button
                type="button"
                onClick={handleAddCustomSubject}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-[#7a1228] hover:bg-[#5e0d1e] text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
