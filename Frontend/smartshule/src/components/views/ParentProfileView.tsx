import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ParentProfileViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const ParentProfileView: React.FC<ParentProfileViewProps> = ({ onNavigateTab }) => {
  const { user, login } = useAuth();
  const [portalData, setPortalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);

  // Edit Parent State
  const [isEditingParent, setIsEditingParent] = useState(false);
  const [savingParent, setSavingParent] = useState(false);
  const [parentForm, setParentForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    nationalId: '',
    relationship: 'MOTHER',
    emergencyContact: '',
    occupation: '',
  });

  // Edit Child State
  const [isEditingChild, setIsEditingChild] = useState(false);
  const [savingChild, setSavingChild] = useState(false);
  const [childForm, setChildForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    upiNumber: '',
    medicalConditions: '',
    specialNeeds: '',
    profilePhotoUrl: '',
  });

  // Feedback Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getGuardianPortalData();
      if (res.success && res.data) {
        setPortalData(res.data);
        initParentForm(res.data);
      }
    } catch (err) {
      console.error('Failed to load parent portal profile:', err);
      showNotification('error', 'Unable to retrieve profile data from the database. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initParentForm = (data: any) => {
    const guardian = data?.guardian || {};
    const guardianUser = guardian?.user || user;
    setParentForm({
      firstName: guardianUser?.firstName || '',
      lastName: guardianUser?.lastName || '',
      phone: guardianUser?.phone || '',
      email: guardianUser?.email || '',
      nationalId: guardian?.nationalId || '',
      relationship: guardian?.relationship || 'MOTHER',
      emergencyContact: guardian?.emergencyContact || guardianUser?.phone || '',
      occupation: guardian?.occupation || '',
    });
  };

  const initChildForm = (child: any) => {
    if (!child) return;
    setChildForm({
      firstName: child.firstName || '',
      middleName: child.middleName || '',
      lastName: child.lastName || '',
      gender: child.gender || 'MALE',
      dateOfBirth: child.dateOfBirth || '',
      upiNumber: child.upiNumber || '',
      medicalConditions: child.medicalConditions || '',
      specialNeeds: child.specialNeeds || '',
      profilePhotoUrl: child.profilePhotoUrl || '',
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const children = portalData?.children || [];
  const currentChild = children[selectedChildIndex] || null;

  useEffect(() => {
    if (currentChild) {
      initChildForm(currentChild);
    }
  }, [selectedChildIndex, portalData]);

  // Handle Save Parent Profile
  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingParent(true);
    try {
      const res = await apiService.updateGuardianProfile(parentForm);
      if (res.success && res.data) {
        setPortalData(res.data);
        initParentForm(res.data);
        setIsEditingParent(false);
        showNotification('success', 'Parent profile updated successfully in the database.');
      } else {
        showNotification('error', res.message || 'Failed to update parent profile.');
      }
    } catch (err: any) {
      console.error('Error updating parent profile:', err);
      showNotification('error', err.message || 'An error occurred while saving parent changes.');
    } finally {
      setSavingParent(false);
    }
  };

  // Handle Save Child Profile
  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChild) return;
    setSavingChild(true);
    try {
      const updatePayload: any = {
        firstName: childForm.firstName.trim(),
        middleName: childForm.middleName.trim() || undefined,
        lastName: childForm.lastName.trim(),
        gender: childForm.gender,
        dateOfBirth: childForm.dateOfBirth.trim() || undefined,
        upiNumber: childForm.upiNumber.trim() || undefined,
        medicalConditions: childForm.medicalConditions.trim() || undefined,
        specialNeeds: childForm.specialNeeds.trim() || undefined,
        profilePhotoUrl: childForm.profilePhotoUrl.trim() || undefined,
      };

      const res = await apiService.updateStudent(currentChild.id, updatePayload);
      if (res.success) {
        showNotification('success', `Learner details for ${childForm.firstName} updated successfully.`);
        setIsEditingChild(false);
        await loadData();
      } else {
        showNotification('error', res.message || 'Failed to update learner details.');
      }
    } catch (err: any) {
      console.error('Error updating child profile:', err);
      showNotification('error', err.message || 'An error occurred while saving child profile.');
    } finally {
      setSavingChild(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#800000] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-[#800000] font-body">Loading family records from database...</p>
      </div>
    );
  }

  const guardian = portalData?.guardian || {};
  const guardianUser = guardian?.user || user;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#800000] to-[#500b1a] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Parent & Family Records · SmartShule Portal
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            My Profile & Child Records
          </h1>
          <p className="text-xs text-rose-100/90">
            View all official records for you and your linked learner(s). Correct typographical errors, update phone numbers, medical conditions, or NEMIS identifiers anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all cursor-pointer shadow-xs"
            title="Reload latest records from database"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Refresh</span>
          </button>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-[#800000] hover:bg-rose-50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Parent Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium border shadow-xs animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* PARENT / GUARDIAN SECTION */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#800000]/10 text-[#800000] flex items-center justify-center font-bold text-lg shrink-0">
              <span className="material-symbols-outlined text-[24px]">person</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Parent / Guardian Profile</h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[11px] font-bold uppercase tracking-wider">
                  {guardian?.relationship || 'GUARDIAN'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Primary contact details linked to school notifications, fee receipts, and portal login.
              </p>
            </div>
          </div>

          {!isEditingParent ? (
            <button
              onClick={() => {
                initParentForm(portalData);
                setIsEditingParent(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit My Details</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditingParent(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              <span>Cancel</span>
            </button>
          )}
        </div>

        {isEditingParent ? (
          <form onSubmit={handleSaveParent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={parentForm.firstName}
                  onChange={(e) => setParentForm({ ...parentForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Jane"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={parentForm.lastName}
                  onChange={(e) => setParentForm({ ...parentForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (WhatsApp & SMS) *</label>
                <input
                  type="tel"
                  required
                  value={parentForm.phone}
                  onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 font-mono"
                  placeholder="e.g. +254711223344"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={parentForm.email}
                  onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. jane.doe@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  National ID (Login Password ID)
                </label>
                <input
                  type="text"
                  value={parentForm.nationalId}
                  onChange={(e) => setParentForm({ ...parentForm, nationalId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 font-mono"
                  placeholder="e.g. 28475921"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship to Learner</label>
                <select
                  value={parentForm.relationship}
                  onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 bg-white"
                >
                  <option value="MOTHER">Mother</option>
                  <option value="FATHER">Father</option>
                  <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                  <option value="SPONSOR">Sponsor</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={parentForm.emergencyContact}
                  onChange={(e) => setParentForm({ ...parentForm, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 font-mono"
                  placeholder="e.g. +254722998877"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Occupation / Workplace</label>
                <input
                  type="text"
                  value={parentForm.occupation}
                  onChange={(e) => setParentForm({ ...parentForm, occupation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Business Analyst"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingParent(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingParent}
                className="px-5 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingParent && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{savingParent ? 'Saving Changes...' : 'Save Parent Details'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Full Name
              </span>
              <span className="font-semibold text-sm text-slate-900">
                {guardianUser?.firstName} {guardianUser?.lastName}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Phone Number
              </span>
              <span className="font-mono text-sm text-slate-900 font-semibold">
                {guardianUser?.phone || 'Not specified'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Email Address
              </span>
              <span className="text-sm text-slate-900 truncate block">
                {guardianUser?.email || 'None on record'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                National ID Number
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-slate-900 font-semibold">
                  {guardian?.nationalId || '28475921'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold" title="Default password for parent sign-in">
                  ID Login
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Relationship
              </span>
              <span className="font-semibold text-sm text-slate-900 capitalize">
                {String(guardian?.relationship || 'Mother').toLowerCase()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Emergency Contact
              </span>
              <span className="font-mono text-sm text-slate-900 font-semibold">
                {guardian?.emergencyContact || guardianUser?.phone || 'Same as primary'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Occupation
              </span>
              <span className="text-sm text-slate-900">
                {guardian?.occupation || 'Not specified'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Linked Children
              </span>
              <span className="text-sm font-bold text-[#800000]">
                {children.length} {children.length === 1 ? 'Learner Enrolled' : 'Learners Enrolled'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* LEARNER / CHILD SECTION */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0">
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Enrolled Child / Learner Profile</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold uppercase tracking-wider">
                  CBC Registered
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Student demographic records, CBC admission number, NEMIS/UPI, and health/medical disclosures.
              </p>
            </div>
          </div>

          {currentChild && (
            <div className="flex items-center gap-2">
              {!isEditingChild ? (
                <button
                  onClick={() => {
                    initChildForm(currentChild);
                    setIsEditingChild(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Edit Child Information</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingChild(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Cancel</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Child Selector Tabs (if parent has multiple children) */}
        {children.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl">
            <span className="text-xs font-bold text-slate-500 px-2 uppercase tracking-wider">
              Learners:
            </span>
            {children.map((c: any, idx: number) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedChildIndex(idx);
                  setIsEditingChild(false);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedChildIndex === idx
                    ? 'bg-white text-[#800000] shadow-xs'
                    : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">child_care</span>
                <span>{c.firstName} {c.lastName} ({c.gradeLevel})</span>
              </button>
            ))}
          </div>
        )}

        {!currentChild ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-4xl text-slate-400">person_off</span>
            <p className="text-sm font-semibold text-slate-700 mt-2">No learner currently linked.</p>
            <p className="text-xs text-slate-500">Contact the school administration to link your student admission records.</p>
          </div>
        ) : isEditingChild ? (
          /* CHILD EDIT FORM */
          <form onSubmit={handleSaveChild} className="space-y-5">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-700">info</span>
              <span>
                <strong>Correction Notice:</strong> You can edit learner names, birth date, gender, NEMIS UPI, and medical/special needs disclosures to fix input errors. Grade promotion or class stream changes must be verified by the school admissions office.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={childForm.firstName}
                  onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Brian"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={childForm.middleName}
                  onChange={(e) => setChildForm({ ...childForm, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Otieno"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={childForm.lastName}
                  onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                <select
                  value={childForm.gender}
                  onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={childForm.dateOfBirth}
                  onChange={(e) => setChildForm({ ...childForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">UPI Number (NEMIS / CBA ID)</label>
                <input
                  type="text"
                  value={childForm.upiNumber}
                  onChange={(e) => setChildForm({ ...childForm, upiNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 font-mono"
                  placeholder="e.g. NEMIS-1001"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Medical Conditions & Allergies</label>
                <input
                  type="text"
                  value={childForm.medicalConditions}
                  onChange={(e) => setChildForm({ ...childForm, medicalConditions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Asthmatic, Inhaler kept in pouch; allergic to penicillin"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Special Educational Needs (SEN)</label>
                <input
                  type="text"
                  value={childForm.specialNeeds}
                  onChange={(e) => setChildForm({ ...childForm, specialNeeds: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                  placeholder="e.g. Mild dyslexia, requires large-print exam sheets"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">Profile Photo URL</label>
                <input
                  type="url"
                  value={childForm.profilePhotoUrl}
                  onChange={(e) => setChildForm({ ...childForm, profilePhotoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 font-mono"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingChild(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingChild}
                className="px-5 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingChild && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{savingChild ? 'Saving Changes...' : 'Save Learner Details'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* CHILD VIEW DISPLAY */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-4">
                {currentChild.profilePhotoUrl ? (
                  <img
                    src={currentChild.profilePhotoUrl}
                    alt={currentChild.firstName}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-300 shadow-xs shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#800000] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                    {currentChild.firstName?.[0]}{currentChild.lastName?.[0]}
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentChild.firstName} {currentChild.middleName ? `${currentChild.middleName} ` : ''}{currentChild.lastName}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-xs font-bold">
                      {currentChild.gradeLevel}
                    </span>
                    {currentChild.streamId && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-medium">
                        Stream: {currentChild.streamId.replace('stream-', '').replace('-east', ' East').replace('-west', ' West')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1 font-mono">
                    <span>Admission No: <strong className="text-[#800000]">{currentChild.admissionNumber}</strong></span>
                    <span>•</span>
                    <span>UPI/NEMIS: <strong>{currentChild.upiNumber || 'NEMIS-PENDING'}</strong></span>
                    <span>•</span>
                    <span>Gender: <strong>{currentChild.gender}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
                  Status: {currentChild.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Detailed Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Date of Birth
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {currentChild.dateOfBirth ? (
                    new Date(currentChild.dateOfBirth).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  ) : (
                    'Not specified'
                  )}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Enrolled Grade & Stage
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {currentChild.gradeLevel || 'Grade 1'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Academic Year
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {currentChild.academicYearId || '2026 Academic Year'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Classroom ID
                </span>
                <span className="text-sm font-mono text-slate-900">
                  {currentChild.classroomId || 'Main Wing'}
                </span>
              </div>
            </div>

            {/* Health & Special Needs Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-[18px] text-rose-700">medical_services</span>
                  <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                    Medical Conditions & Allergies
                  </span>
                </div>
                <p className="text-xs text-rose-950 font-medium">
                  {currentChild.medicalConditions && currentChild.medicalConditions.trim() !== ''
                    ? currentChild.medicalConditions
                    : 'None disclosed or recorded'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/70">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-[18px] text-indigo-700">accessibility_new</span>
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Special Educational Needs (SEN)
                  </span>
                </div>
                <p className="text-xs text-indigo-950 font-medium">
                  {currentChild.specialNeeds && currentChild.specialNeeds.trim() !== ''
                    ? currentChild.specialNeeds
                    : 'Standard learning accommodation'}
                </p>
              </div>
            </div>

            {/* Quick Stats: Finance, Attendance & Lunch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold uppercase tracking-wider">Fee Balance</span>
                  <span className="material-symbols-outlined text-[18px] text-[#800000]">account_balance_wallet</span>
                </div>
                <div className="text-lg font-black text-slate-900 font-mono">
                  KES {(currentChild.fee?.balance ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Billed: KES {(currentChild.fee?.totalBilled ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold uppercase tracking-wider">Attendance Rate</span>
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">checklist</span>
                </div>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  {currentChild.attendance?.attendanceRate ?? 100}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Today&apos;s Status: <strong className="text-emerald-700">{currentChild.attendance?.todayStatus || 'PRESENT'}</strong>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold uppercase tracking-wider">Lunch Program</span>
                  <span className="material-symbols-outlined text-[18px] text-amber-700">lunch_dining</span>
                </div>
                <div className="text-lg font-black text-slate-900">
                  {currentChild.lunch ? (
                    <span className="text-emerald-700">Enrolled ({currentChild.lunch.paymentStatus})</span>
                  ) : (
                    <span className="text-slate-500 text-sm">Not on meal list</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {currentChild.lunch ? `Balance: KES ${currentChild.lunch.balance || 0}` : 'School catering roster'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
