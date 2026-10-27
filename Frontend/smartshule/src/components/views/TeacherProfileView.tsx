import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { TeacherProfileData, TeacherCorrectionRequest, TeacherEmergencyContact } from '../../types';
import { useAuth } from '../../context/AuthContext';

const RESTRICTED_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'tscNumber', label: 'TSC Registration Number' },
  { key: 'nationalId', label: 'National ID / Passport Number' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'qualification', label: 'Highest Qualification' },
  { key: 'employeeNumber', label: 'Employee Number' },
  { key: 'employmentDate', label: 'Employment Date' },
  { key: 'employmentType', label: 'Employment Type' },
  { key: 'department', label: 'Department / Section' },
];

export const TeacherProfileView: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [requests, setRequests] = useState<TeacherCorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'requests' | 'security'>('profile');

  // Notification state
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Direct Edit Modal State (phone, residentialAddress, emergencyContact, profilePhotoUrl)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingDirect, setSavingDirect] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: '',
    residentialAddress: '',
    profilePhotoUrl: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  // Request Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    fieldName: 'tscNumber',
    proposedValue: '',
    reason: '',
    evidenceUrl: '',
  });

  // Password Change Form State
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadProfileAndRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, reqRes] = await Promise.all([
        apiService.getMyTeacherProfile().catch((err) => ({ success: false, message: err.message, data: null })),
        apiService.getMyTeacherCorrectionRequests().catch(() => ({ success: false, data: [] })),
      ]);

      if (profileRes?.success && profileRes.data) {
        setProfile(profileRes.data);
      }
      if (reqRes?.success && Array.isArray(reqRes.data)) {
        setRequests(reqRes.data);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to load teacher profile.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfileAndRequests();
  }, [loadProfileAndRequests]);

  const handleOpenEditModal = () => {
    if (!profile) return;
    setEditForm({
      phone: profile.user?.phone || '',
      residentialAddress: profile.residentialAddress || '',
      profilePhotoUrl: profile.profilePhotoUrl || '',
      emergencyContactName: profile.emergencyContact?.name || '',
      emergencyContactPhone: profile.emergencyContact?.phone || '',
      emergencyContactRelationship: profile.emergencyContact?.relationship || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveDirectProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDirect(true);
    setAlert(null);
    try {
      const payload: {
        phone?: string;
        residentialAddress?: string;
        profilePhotoUrl?: string;
        emergencyContact?: TeacherEmergencyContact;
      } = {
        phone: editForm.phone.trim(),
        residentialAddress: editForm.residentialAddress.trim(),
        profilePhotoUrl: editForm.profilePhotoUrl.trim() || undefined,
      };

      if (editForm.emergencyContactName.trim() || editForm.emergencyContactPhone.trim()) {
        payload.emergencyContact = {
          name: editForm.emergencyContactName.trim(),
          phone: editForm.emergencyContactPhone.trim(),
          relationship: editForm.emergencyContactRelationship.trim() || 'Other',
        };
      }

      const res = await apiService.updateMyTeacherProfile(payload);
      if (res?.success) {
        setAlert({ type: 'success', message: 'Profile details updated successfully.' });
        setIsEditModalOpen(false);
        await loadProfileAndRequests();
      } else {
        setAlert({ type: 'error', message: res?.message || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'An error occurred while saving profile.' });
    } finally {
      setSavingDirect(false);
    }
  };

  const handleOpenCorrectionModal = (defaultField?: string) => {
    setCorrectionForm({
      fieldName: defaultField || 'tscNumber',
      proposedValue: '',
      reason: '',
      evidenceUrl: '',
    });
    setIsCorrectionModalOpen(true);
  };

  const getCurrentValueOfField = (fieldName: string): string => {
    if (!profile) return 'None';
    switch (fieldName) {
      case 'firstName':
        return profile.user?.firstName || 'None';
      case 'lastName':
        return profile.user?.lastName || 'None';
      case 'email':
        return profile.user?.email || 'None';
      case 'tscNumber':
        return profile.tscNumber || 'None';
      case 'nationalId':
        return profile.nationalId || 'None';
      case 'dateOfBirth':
        return profile.dateOfBirth || 'None';
      case 'gender':
        return profile.gender || 'None';
      case 'qualification':
        return profile.qualification || 'None';
      case 'employeeNumber':
        return profile.employeeNumber || 'None';
      case 'employmentDate':
        return profile.employmentDate || 'None';
      case 'employmentType':
        return profile.employmentType || 'FULL_TIME';
      case 'department':
        return profile.department || 'None';
      default:
        return 'None';
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionForm.proposedValue.trim()) {
      setAlert({ type: 'error', message: 'Proposed value is required.' });
      return;
    }
    if (!correctionForm.reason.trim()) {
      setAlert({ type: 'error', message: 'A reason must be provided explaining the requested change.' });
      return;
    }

    setSubmittingCorrection(true);
    setAlert(null);
    try {
      const res = await apiService.submitTeacherCorrectionRequest({
        fieldName: correctionForm.fieldName,
        proposedValue: correctionForm.proposedValue.trim(),
        reason: correctionForm.reason.trim(),
        evidenceUrl: correctionForm.evidenceUrl.trim() || undefined,
      });

      if (res?.success) {
        setAlert({
          type: 'success',
          message: 'Correction request submitted. It is now queued for administrative verification.',
        });
        setIsCorrectionModalOpen(false);
        setActiveTab('requests');
        await loadProfileAndRequests();
      } else {
        setAlert({ type: 'error', message: res?.message || 'Failed to submit correction request.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'An error occurred while submitting correction request.' });
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      setAlert({ type: 'error', message: 'Current password is required.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setAlert({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setAlert({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }

    setChangingPassword(true);
    setAlert(null);
    try {
      const res = await apiService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res?.success) {
        setAlert({ type: 'success', message: 'Password changed successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setAlert({ type: 'error', message: res?.message || 'Password update failed. Verify current password.' });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Password change failed.' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant space-y-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
        <p className="text-sm font-semibold">Loading teacher profile & credentials...</p>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span>Home</span>
            <span>/</span>
            <span>Faculty</span>
            <span>/</span>
            <span className="text-primary font-semibold">My Profile</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">
              My Educator Profile & Records
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>Active Staff • Grace Seeds School</span>
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            View verified employment information, directly update contact & emergency details, or submit correction requests for restricted fields.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 text-on-surface rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">edit</span>
            <span>Edit Permitted Info</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCorrectionModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">rule</span>
            <span>Request Correction</span>
          </button>
        </div>
      </div>

      {/* Global Alert Notification */}
      {alert && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-medium animate-fadeIn ${
            alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : alert.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {alert.type === 'success' ? 'check_circle' : alert.type === 'error' ? 'error' : 'info'}
            </span>
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-gray-500 hover:text-black">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {profile?.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt="Teacher Profile"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border-2 border-primary/20">
                {profile?.user?.firstName?.[0] || 'T'}
                {profile?.user?.lastName?.[0] || 'R'}
              </div>
            )}
            <button
              onClick={handleOpenEditModal}
              title="Change Profile Photo"
              className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-white rounded-lg shadow-md hover:bg-primary/90 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">photo_camera</span>
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-on-surface">
                {profile?.user?.fullName || user?.fullName || 'Educator Profile'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7a1228]/10 text-[#7a1228]">
                {profile?.user?.role || 'TEACHER'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-1.5">
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">badge</span>
                <span>Emp ID: <strong>{profile?.employeeNumber || 'Pending'}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>TSC No: <strong>{profile?.tscNumber || 'Not Registered'}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">mail</span>
                <span>{profile?.user?.email || 'No email registered'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
          <div className="text-right">
            <span className="block text-[11px] text-on-surface-variant font-medium">Assigned Class Stream</span>
            <span className="font-bold text-xs text-primary">
              {profile?.assignedStreamInfo
                ? `${profile.assignedStreamInfo.className} - ${profile.assignedStreamInfo.streamName}`
                : 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'profile'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">person</span>
          <span>Profile Details (7 Sections)</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'requests'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">rule</span>
          <span>My Correction Requests</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-b-2 ${
            activeTab === 'security'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
          <span>Account Security</span>
        </button>
      </div>

      {/* TAB 1: 7-SECTION PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A: Personal Information */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">Section A: Personal Information</h3>
              </div>
              <button
                onClick={() => handleOpenCorrectionModal('firstName')}
                className="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Request Edit</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-on-surface-variant text-[11px]">First Name</span>
                <span className="font-semibold text-on-surface">{profile?.user?.firstName || '—'}</span>
                <span className="block text-[10px] text-amber-700 italic mt-0.5">Protected field</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Last Name</span>
                <span className="font-semibold text-on-surface">{profile?.user?.lastName || '—'}</span>
                <span className="block text-[10px] text-amber-700 italic mt-0.5">Protected field</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Date of Birth</span>
                <span className="font-semibold text-on-surface">{profile?.dateOfBirth || 'Not set'}</span>
                <span className="block text-[10px] text-amber-700 italic mt-0.5">Protected field</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Gender</span>
                <span className="font-semibold text-on-surface">{profile?.gender || 'Not specified'}</span>
                <span className="block text-[10px] text-amber-700 italic mt-0.5">Protected field</span>
              </div>
              <div className="col-span-2">
                <span className="block text-on-surface-variant text-[11px]">National ID / Passport Number</span>
                <span className="font-semibold text-on-surface">{profile?.nationalId || 'Not provided'}</span>
                <span className="block text-[10px] text-amber-700 italic mt-0.5">Chapter 6 vetted identity record</span>
              </div>
            </div>
          </div>

          {/* Section B: Contact Information */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">call</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">Section B: Contact Information</h3>
              </div>
              <button
                onClick={handleOpenEditModal}
                className="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Direct Edit</span>
                <span className="material-symbols-outlined text-[13px]">edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-on-surface-variant text-[11px]">Phone Number</span>
                <span className="font-semibold text-on-surface">{profile?.user?.phone || 'Not recorded'}</span>
                <span className="block text-[10px] text-emerald-700 font-medium mt-0.5">Directly editable</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Email Address</span>
                <span className="font-semibold text-on-surface">{profile?.user?.email || 'Not recorded'}</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-700 font-bold mt-0.5">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  <span>Verified Auth Email</span>
                </span>
              </div>
              <div className="col-span-2">
                <span className="block text-on-surface-variant text-[11px]">Residential Address</span>
                <span className="font-semibold text-on-surface">{profile?.residentialAddress || 'Not recorded'}</span>
                <span className="block text-[10px] text-emerald-700 font-medium mt-0.5">Directly editable</span>
              </div>
            </div>
          </div>

          {/* Section C: Professional Information */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">school</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">Section C: Professional Credentials</h3>
              </div>
              <button
                onClick={() => handleOpenCorrectionModal('tscNumber')}
                className="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Request Edit</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-on-surface-variant text-[11px]">TSC Registration Number</span>
                <span className="font-bold text-on-surface">{profile?.tscNumber || 'Not registered'}</span>
                <span className="block text-[10px] text-amber-700 italic mt-0.5">Requires verified TSC certificate</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Highest Qualification</span>
                <span className="font-semibold text-on-surface">{profile?.qualification || 'Bachelor of Education'}</span>
                <span className="block text-[10px] text-amber-700 italic mt-0.5">Requires academic certificate</span>
              </div>
              <div className="col-span-2">
                <span className="block text-on-surface-variant text-[11px] mb-1">Subject Specialization</span>
                {profile?.specialization && profile.specialization.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.specialization.map((spec, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container text-[11px] font-semibold">
                        {spec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-on-surface-variant">General Primary & Pre-Primary Curriculum</span>
                )}
              </div>
            </div>
          </div>

          {/* Section D: Employment Information (Read-only for teachers) */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">work</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">Section D: Employment Information</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                School Admin Managed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-on-surface-variant text-[11px]">Employee Number</span>
                <span className="font-bold text-on-surface">{profile?.employeeNumber || 'EMP0001'}</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Date of Employment</span>
                <span className="font-semibold text-on-surface">{profile?.employmentDate || '01-Jan-2023'}</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Employment Type</span>
                <span className="font-semibold text-on-surface">{profile?.employmentType || 'FULL_TIME'}</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Employment Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>{profile?.employmentStatus || 'ACTIVE'}</span>
                </span>
              </div>
              <div className="col-span-2">
                <span className="block text-on-surface-variant text-[11px]">Department / Designation</span>
                <span className="font-semibold text-on-surface">{profile?.department || 'Lower Primary & CBC Division'}</span>
              </div>
            </div>
          </div>

          {/* Section E: Teaching Assignments (Read-only for teachers) */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">Section E: Teaching & Class Stream Assignments</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                Head Teacher Allocated
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] text-on-surface-variant font-medium">Class / Stream Allocation</span>
                  <span className="font-bold text-sm text-primary">
                    {profile?.assignedStreamInfo
                      ? `${profile.assignedStreamInfo.className} - ${profile.assignedStreamInfo.streamName}`
                      : 'No class assigned yet'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-2xl text-primary/40">meeting_room</span>
              </div>

              {/* Official Class Teacher Assignments */}
              {profile?.classTeacherAssignments && profile.classTeacherAssignments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold text-on-surface-variant">Class Teacher Responsibilities</span>
                  <div className="space-y-1">
                    {profile.classTeacherAssignments.map((a: any, i: number) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                          a.isActive ? 'bg-primary/5 border-primary/30' : 'bg-surface-container-low border-outline-variant/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-on-surface">
                              {a.className} {a.streamName ? `(${a.streamName})` : ''}
                            </span>
                            {a.isActive ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="bg-slate-200 text-slate-700 text-[9px] font-medium px-1.5 py-0.2 rounded-full">
                                Past
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-outline">
                            Year: {a.academicYearName || a.academicYearId} • From {a.effectiveFrom || 'Start'}
                            {a.effectiveTo ? ` to ${a.effectiveTo}` : ''}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[16px]">school</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Leadership Roles */}
              {profile?.subjectAssignments && profile.subjectAssignments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-[11px] font-bold text-on-surface-variant">Subject Leadership & Allocations</span>
                  <div className="space-y-1">
                    {profile.subjectAssignments.map((sa: any, i: number) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                          sa.isActive ? 'bg-rose-50/60 border-rose-200' : 'bg-surface-container-low border-outline-variant/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-on-surface">
                              {sa.learningAreaName} {sa.learningAreaCode ? `(${sa.learningAreaCode})` : ''}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                sa.role === 'SUBJECT_LEAD' ? 'bg-[#800000] text-white' : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {sa.role === 'SUBJECT_LEAD' ? 'Subject Lead' : 'Educator'}
                            </span>
                          </div>
                          <span className="text-[10px] text-outline">
                            Year: {sa.academicYearName || sa.academicYearId}
                            {sa.className ? ` • Class: ${sa.className}` : ' • School-wide'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[16px]">psychology</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant mb-2">Weekly Teaching Schedule</span>
                {profile?.teachingAssignments && profile.teachingAssignments.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {profile.teachingAssignments.map((slot, i) => (
                      <div key={i} className="p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-bold text-on-surface">{slot.learningAreaName || 'Learning Area'}</span>
                          <span className="text-on-surface-variant block text-[10px]">
                            {slot.dayOfWeek} • Period {slot.periodNumber} ({slot.startTime} - {slot.endTime})
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium">
                          {slot.roomName || 'Classroom'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-on-surface-variant italic">No scheduled timetable periods recorded.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section F: Emergency Contact (Directly editable) */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[20px]">emergency</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface">Section F: Emergency Contact</h3>
              </div>
              <button
                onClick={handleOpenEditModal}
                className="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Direct Edit</span>
                <span className="material-symbols-outlined text-[13px]">edit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-on-surface-variant text-[11px]">Contact Person Name</span>
                <span className="font-semibold text-on-surface">{profile?.emergencyContact?.name || 'Not recorded'}</span>
              </div>
              <div>
                <span className="block text-on-surface-variant text-[11px]">Phone Number</span>
                <span className="font-semibold text-on-surface">{profile?.emergencyContact?.phone || 'Not recorded'}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-on-surface-variant text-[11px]">Relationship</span>
                <span className="font-semibold text-on-surface">{profile?.emergencyContact?.relationship || 'Not specified'}</span>
                <span className="block text-[10px] text-emerald-700 font-medium mt-0.5">Emergency contact details can be updated at any time</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CORRECTION REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
            <div>
              <h2 className="text-base font-bold text-on-surface">Profile Correction Requests</h2>
              <p className="text-xs text-on-surface-variant">
                Track status and administrative review remarks for your restricted field change requests.
              </p>
            </div>
            <button
              onClick={() => handleOpenCorrectionModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>New Correction Request</span>
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined text-4xl text-outline">fact_check</span>
              <p className="text-sm font-bold text-on-surface">No correction requests submitted yet.</p>
              <p className="text-xs">If any restricted details need updating, click "New Correction Request".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-outline-variant/25 bg-surface-container-low hover:bg-surface-container transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface">{req.fieldLabel || req.fieldName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        Submitted: {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-on-surface-variant">Current Value: </span>
                        <span className="font-medium text-gray-700">{req.currentValue || 'None'}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant">Proposed Value: </span>
                        <strong className="text-primary">{req.proposedValue}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-on-surface-variant">
                      <span>Reason: </span>
                      <span className="italic text-on-surface">"{req.reason}"</span>
                    </div>

                    {req.evidenceUrl && (
                      <div className="text-[11px]">
                        <a
                          href={req.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline inline-flex items-center gap-1 font-semibold"
                        >
                          <span className="material-symbols-outlined text-[12px]">attachment</span>
                          <span>View Attached Evidence Document</span>
                        </a>
                      </div>
                    )}

                    {req.reviewRemarks && (
                      <div className="p-2.5 rounded-lg bg-surface border border-outline-variant/30 text-[11px] space-y-0.5 mt-2">
                        <span className="font-bold text-on-surface block">
                          Administrator Review ({req.reviewedByName || 'Reviewer'}):
                        </span>
                        <p className="text-on-surface-variant">{req.reviewRemarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCOUNT SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-xs max-w-xl space-y-6">
          <div className="border-b border-outline-variant/20 pb-3">
            <h2 className="text-base font-bold text-on-surface">Account Security & Password</h2>
            <p className="text-xs text-on-surface-variant">
              Manage your login password and review active account authentication details.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-on-surface mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">New Password (minimum 6 characters) *</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                placeholder="Enter strong new password"
              />
            </div>

            <div>
              <label className="block font-bold text-on-surface mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface focus:outline-primary"
                placeholder="Re-type new password"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              {changingPassword && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
              <span>Update Password</span>
            </button>
          </form>

          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 text-xs space-y-2">
            <h4 className="font-bold text-on-surface">Account Authentication Guidelines</h4>
            <ul className="list-disc list-inside text-on-surface-variant space-y-1 text-[11px]">
              <li>Use a password with a mix of letters, numbers, and symbols.</li>
              <li>Your verified email ({profile?.user?.email || 'N/A'}) receives OTP verification codes for sensitive actions.</li>
              <li>SmartShule staff will never request your password or OTP code.</li>
            </ul>
          </div>
        </div>
      )}

      {/* MODAL 1: DIRECT EDIT PERMITTED INFO */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface">Edit Permitted Profile Details</h3>
                <p className="text-xs text-on-surface-variant">These fields can be saved immediately without administrator review.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDirectProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +254 712 345 678"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editForm.residentialAddress}
                  onChange={(e) => setEditForm({ ...editForm, residentialAddress: e.target.value })}
                  placeholder="e.g. Ruiru, Kiambu County"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Profile Photo URL</label>
                <input
                  type="url"
                  value={editForm.profilePhotoUrl}
                  onChange={(e) => setEditForm({ ...editForm, profilePhotoUrl: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                />
                <span className="text-[10px] text-on-surface-variant">Provide a publicly accessible image URL or secure CDN link.</span>
              </div>

              <div className="pt-2 border-t border-outline-variant/20 space-y-3">
                <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider text-primary">Emergency Contact</h4>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={editForm.emergencyContactName}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-on-surface mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactPhone}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                      placeholder="+254 700 000 000"
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-on-surface mb-1">Relationship</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactRelationship}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                      placeholder="e.g. Spouse / Brother"
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDirect}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold disabled:opacity-50 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  {savingDirect && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST CORRECTION TO RESTRICTED FIELDS */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface">Submit Profile Correction Request</h3>
                <p className="text-xs text-on-surface-variant">
                  Restricted fields require justification and administrator verification.
                </p>
              </div>
              <button onClick={() => setIsCorrectionModalOpen(false)} className="text-gray-500 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-on-surface mb-1">Field Requiring Correction *</label>
                <select
                  value={correctionForm.fieldName}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, fieldName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary cursor-pointer"
                >
                  {RESTRICTED_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                <span className="block text-[11px] text-on-surface-variant font-medium">Current Recorded Value</span>
                <span className="font-bold text-on-surface text-xs">
                  {getCurrentValueOfField(correctionForm.fieldName)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Proposed Correct Value *</label>
                <input
                  type="text"
                  required
                  value={correctionForm.proposedValue}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, proposedValue: e.target.value })}
                  placeholder="Enter the accurate new value"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Reason / Explanation for Correction *</label>
                <textarea
                  required
                  rows={3}
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="Explain why this change is necessary (e.g., typographical error on onboarding, updated national ID, new academic degree awarded)..."
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Supporting Evidence / Document URL (Optional)</label>
                <input
                  type="url"
                  value={correctionForm.evidenceUrl}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, evidenceUrl: e.target.value })}
                  placeholder="https://drive.google.com/... or uploaded document link"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                />
                <span className="text-[10px] text-on-surface-variant">Attach link to scanned certificate, gazette notice, or ID document.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-bold disabled:opacity-50 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  {submittingCorrection && <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
