import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { ClinicVisit, StudentMedicalProfile } from '../../types';

export const ClinicManagementView: React.FC = () => {
 const [activeTab, setActiveTab] = useState<'visits' | 'profiles'>('visits');
 const [visits, setVisits] = useState<ClinicVisit[]>([]);
 const [loading, setLoading] = useState(true);
 const [statusFilter, setStatusFilter] = useState<string>('ALL');
 const [searchQuery, setSearchQuery] = useState('');
 const [notification, setNotification] = useState<string | null>(null);

 // Modals
 const [isLogModalOpen, setIsLogModalOpen] = useState(false);
 const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
 const [selectedVisitForStatus, setSelectedVisitForStatus] = useState<ClinicVisit | null>(null);
 const [newStatus, setNewStatus] = useState<'RESOLVED' | 'UNDER_OBSERVATION' | 'REFERRED_TO_HOSPITAL'>('RESOLVED');
 const [referredHospital, setReferredHospital] = useState('');

 // Medical Profile lookup/update
 const [profileSearchStudentId, setProfileSearchStudentId] = useState('');
 const [searchedProfile, setSearchedProfile] = useState<StudentMedicalProfile | null>(null);
 const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
 const [profileForm, setProfileForm] = useState({
 studentId: '',
 bloodGroup: 'UNKNOWN' as StudentMedicalProfile['bloodGroup'],
 allergies: '',
 chronicConditions: '',
 emergencyContactName: '',
 emergencyContactPhone: '',
 immunizationUpToDate: true,
 notes: '',
 });

 // Log Visit Form State
 const [visitForm, setVisitForm] = useState({
 studentId: '',
 studentName: '',
 gradeLevel: 'Grade 4',
 temperatureCelsius: 36.8,
 symptoms: [] as string[],
 customSymptom: '',
 treatmentAdministered: '',
 medicationDispensed: '',
 nurseRemarks: '',
 status: 'UNDER_OBSERVATION' as ClinicVisit['status'],
 referredHospitalName: '',
 notifyParent: true,
 parentPhoneNumber: '',
 });

 const COMMON_SYMPTOMS = [
 'Headache',
 'Fever / Chills',
 'Stomachache / Abdominal Pain',
 'Nausea / Vomiting',
 'Sports Injury / Cut / Bruise',
 'Asthma / Breathing Strain',
 'Cough / Cold',
 'Allergic Reaction',
 'Dizziness / Fainting',
 ];

 const showNotification = (msg: string) => {
 setNotification(msg);
 setTimeout(() => setNotification(null), 4000);
 };

 const loadVisits = async () => {
 setLoading(true);
 try {
 const res = await apiService.getClinicVisits();
 if (res?.data) {
 setVisits(res.data);
 }
 } catch (err: any) {
 console.error('Failed to load clinic visits:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadVisits();
 }, []);

 const stats = useMemo(() => {
 const today = new Date().toISOString().split('T')[0];
 const todayVisits = visits.filter((v) => v.visitDate?.startsWith(today) || v.createdAt?.startsWith(today)).length;
 const underObs = visits.filter((v) => v.status === 'UNDER_OBSERVATION').length;
 const referred = visits.filter((v) => v.status === 'REFERRED_TO_HOSPITAL').length;
 const resolved = visits.filter((v) => v.status === 'RESOLVED').length;

 return {
 total: visits.length,
 todayVisits: todayVisits || visits.length,
 underObs,
 referred,
 resolved,
 };
 }, [visits]);

 const filteredVisits = useMemo(() => {
 return visits.filter((v) => {
 if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 return (
 v.studentName.toLowerCase().includes(q) ||
 v.symptoms.some((s) => s.toLowerCase().includes(q)) ||
 v.treatmentAdministered.toLowerCase().includes(q)
 );
 }
 return true;
 });
 }, [visits, statusFilter, searchQuery]);

 const toggleSymptom = (sym: string) => {
 if (visitForm.symptoms.includes(sym)) {
 setVisitForm({ ...visitForm, symptoms: visitForm.symptoms.filter((s) => s !== sym) });
 } else {
 setVisitForm({ ...visitForm, symptoms: [...visitForm.symptoms, sym] });
 }
 };

 const handleAddCustomSymptom = () => {
 if (visitForm.customSymptom.trim() && !visitForm.symptoms.includes(visitForm.customSymptom.trim())) {
 setVisitForm({
 ...visitForm,
 symptoms: [...visitForm.symptoms, visitForm.customSymptom.trim()],
 customSymptom: '',
 });
 }
 };

 const handleLogVisit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!visitForm.studentName || visitForm.symptoms.length === 0) {
 alert('Please provide student name and at least one symptom');
 return;
 }

 try {
 const res = await apiService.logClinicVisit({
 ...visitForm,
 studentId: visitForm.studentId || `STU-${Date.now().toString().slice(-4)}`,
 });
 if (res.success) {
 showNotification(`Clinic visit for ${visitForm.studentName} logged!`);
 setIsLogModalOpen(false);
 setVisitForm({
 studentId: '',
 studentName: '',
 gradeLevel: 'Grade 4',
 temperatureCelsius: 36.8,
 symptoms: [],
 customSymptom: '',
 treatmentAdministered: '',
 medicationDispensed: '',
 nurseRemarks: '',
 status: 'UNDER_OBSERVATION',
 referredHospitalName: '',
 notifyParent: true,
 parentPhoneNumber: '',
 });
 loadVisits();
 } else {
 alert(res.message || 'Failed to log visit');
 }
 } catch (err: any) {
 alert(`Error logging visit: ${err.message}`);
 }
 };

 const handleUpdateStatus = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedVisitForStatus) return;

 try {
 const res = await apiService.updateClinicVisitStatus(
 selectedVisitForStatus.id,
 newStatus,
 newStatus === 'REFERRED_TO_HOSPITAL' ? referredHospital : undefined
 );
 if (res.success) {
 showNotification('Visit status updated successfully');
 setIsUpdateStatusModalOpen(false);
 setSelectedVisitForStatus(null);
 setReferredHospital('');
 loadVisits();
 }
 } catch (err: any) {
 alert(`Error updating status: ${err.message}`);
 }
 };

 const handleSearchProfile = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!profileSearchStudentId.trim()) return;
 try {
 const res = await apiService.getStudentMedicalProfile(profileSearchStudentId.trim());
 if (res.success && res.data) {
 setSearchedProfile(res.data);
 } else {
 alert(res.message || 'No medical profile found for this student ID');
 }
 } catch (err: any) {
 alert(`Failed to load profile: ${err.message}`);
 }
 };

 const handleSaveProfile = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!profileForm.studentId) return;

 try {
 const payload = {
 bloodGroup: profileForm.bloodGroup,
 allergies: profileForm.allergies.split(',').map((s) => s.trim()).filter(Boolean),
 chronicConditions: profileForm.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
 emergencyContactName: profileForm.emergencyContactName,
 emergencyContactPhone: profileForm.emergencyContactPhone,
 immunizationUpToDate: profileForm.immunizationUpToDate,
 notes: profileForm.notes,
 };

 const res = await apiService.updateStudentMedicalProfile(profileForm.studentId, payload);
 if (res.success) {
 showNotification('Medical profile updated successfully');
 setIsEditProfileModalOpen(false);
 setSearchedProfile(res.data);
 }
 } catch (err: any) {
 alert(`Error updating profile: ${err.message}`);
 }
 };

 return (
 <div className="space-y-6">
 {/* Toast Notification */}
 {notification && (
 <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
 <span className="material-symbols-outlined text-lg">check_circle</span>
 <span className="text-sm font-semibold">{notification}</span>
 </div>
 )}

 {/* Header Banner */}
 <div className="bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
 <span className="material-symbols-outlined text-base">medical_services</span>
 Learner Wellness & Health Center
 </div>
 <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">School Infirmary & Clinic</h1>
 <p className="text-rose-100/90 text-sm mt-1 max-w-2xl">
 First aid triage, symptom assessments, prescription dispense tracking, emergency parent alerts, and student allergy profiles.
 </p>
 </div>

 <button
 onClick={() => setIsLogModalOpen(true)}
 className="bg-white text-teal-800 hover:bg-teal-50 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm self-start md:self-auto"
 >
 <span className="material-symbols-outlined text-lg">local_hospital</span>
 Log Clinic Triage
 </button>
 </div>

 {/* Metric Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Visits Logged</span>
 <span className="material-symbols-outlined text-teal-600 text-lg">history_edu</span>
 </div>
 <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</p>
 <p className="text-xs text-slate-500 mt-1">{stats.resolved} resolved cases</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Under Observation</span>
 <span className="material-symbols-outlined text-amber-500 text-lg">bed</span>
 </div>
 <p className="text-2xl font-bold text-amber-600 mt-2">{stats.underObs}</p>
 <p className="text-xs text-slate-500 mt-1">Resting in school sick bay</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Hospital Referrals</span>
 <span className="material-symbols-outlined text-rose-600 text-lg">emergency</span>
 </div>
 <p className="text-2xl font-bold text-rose-600 mt-2">{stats.referred}</p>
 <p className="text-xs text-slate-500 mt-1">Escalated to partner facility</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Parent SMS Alerts</span>
 <span className="material-symbols-outlined text-blue-600 text-lg">sms</span>
 </div>
 <p className="text-2xl font-bold text-blue-600 mt-2">
 {visits.filter((v) => v.parentNotified).length}
 </p>
 <p className="text-xs text-slate-500 mt-1">Guardians notified via SMS</p>
 </div>
 </div>

 {/* Sub Tabs */}
 <div className="flex items-center gap-2 border-b border-slate-200 ">
 <button
 onClick={() => setActiveTab('visits')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeTab === 'visits'
 ? 'border-teal-600 text-teal-700'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">view_list</span>
 Triage & Visits Log ({filteredVisits.length})
 </button>

 <button
 onClick={() => setActiveTab('profiles')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeTab === 'profiles'
 ? 'border-teal-600 text-teal-700'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">contact_emergency</span>
 Student Health Profiles
 </button>
 </div>

 {/* TAB 1: VISITS LOG */}
 {activeTab === 'visits' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
 {/* Filter Bar */}
 <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
 <div className="flex flex-wrap items-center gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 "
 >
 <option value="ALL">All Cases</option>
 <option value="UNDER_OBSERVATION">Under Observation (Sick Bay)</option>
 <option value="RESOLVED">Resolved (Returned to Class)</option>
 <option value="REFERRED_TO_HOSPITAL">Referred to Hospital</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Search Cases</label>
 <div className="relative">
 <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">search</span>
 <input
 type="text"
 placeholder="Search student, symptom, treatment..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 "
 />
 </div>
 </div>
 </div>

 <div className="text-xs text-slate-500">
 Showing <span className="font-bold text-slate-800 ">{filteredVisits.length}</span> recorded cases
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 {loading ? (
 <div className="p-12 text-center text-slate-500">
 <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-teal-600">progress_activity</span>
 <p>Loading clinic records...</p>
 </div>
 ) : filteredVisits.length === 0 ? (
 <div className="p-12 text-center">
 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">medical_services</span>
 <p className="text-slate-600 font-medium">No clinic visits recorded.</p>
 <p className="text-xs text-slate-400 mt-1">Click "Log Clinic Triage" to register a learner visit.</p>
 </div>
 ) : (
 <table className="w-full text-left text-sm text-slate-700 ">
 <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 ">
 <tr>
 <th className="px-4 py-3">Learner & Grade</th>
 <th className="px-4 py-3">Time & Date</th>
 <th className="px-4 py-3">Temp (°C)</th>
 <th className="px-4 py-3">Symptoms</th>
 <th className="px-4 py-3">Treatment / Meds</th>
 <th className="px-4 py-3">Status</th>
 <th className="px-4 py-3">Parent SMS</th>
 <th className="px-4 py-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredVisits.map((v) => {
 const isFever = v.temperatureCelsius && v.temperatureCelsius >= 37.5;
 return (
 <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
 <td className="px-4 py-3">
 <div className="font-semibold text-slate-900 ">{v.studentName}</div>
 <div className="text-xs text-slate-400">{v.gradeLevel || 'Learner'}</div>
 </td>
 <td className="px-4 py-3 text-xs">
 <div className="font-medium text-slate-900 ">{v.visitTime}</div>
 <div className="text-slate-400">{v.visitDate}</div>
 </td>
 <td className="px-4 py-3">
 {v.temperatureCelsius ? (
 <span
 className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
 isFever
 ? 'bg-rose-100 text-rose-800'
 : 'bg-emerald-50 text-emerald-700'
 }`}
 >
 {v.temperatureCelsius}°C
 </span>
 ) : (
 <span className="text-slate-400 text-xs">--</span>
 )}
 </td>
 <td className="px-4 py-3">
 <div className="flex flex-wrap gap-1 max-w-xs">
 {v.symptoms.map((s, idx) => (
 <span
 key={idx}
 className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 "
 >
 {s}
 </span>
 ))}
 </div>
 </td>
 <td className="px-4 py-3 text-xs">
 <div className="font-medium text-slate-900 ">{v.treatmentAdministered}</div>
 {v.medicationDispensed && (
 <div className="text-teal-600 text-[11px]">
 Rx: {v.medicationDispensed}
 </div>
 )}
 </td>
 <td className="px-4 py-3">
 {v.status === 'RESOLVED' ? (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 ">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Resolved
 </span>
 ) : v.status === 'UNDER_OBSERVATION' ? (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 ">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> In Sick Bay
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 ">
 <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Referral: {v.referredHospitalName || 'Hospital'}
 </span>
 )}
 </td>
 <td className="px-4 py-3">
 {v.parentNotified ? (
 <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
 <span className="material-symbols-outlined text-sm">done_all</span> Sent
 </span>
 ) : (
 <span className="text-slate-400 text-xs">Not Sent</span>
 )}
 </td>
 <td className="px-4 py-3 text-right">
 <button
 onClick={() => {
 setSelectedVisitForStatus(v);
 setNewStatus(v.status);
 setReferredHospital(v.referredHospitalName || '');
 setIsUpdateStatusModalOpen(true);
 }}
 className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 "
 >
 Update Status
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>
 </div>
 )}

 {/* TAB 2: STUDENT HEALTH PROFILES */}
 {activeTab === 'profiles' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
 <div className="max-w-xl">
 <h3 className="text-base font-bold text-slate-900 mb-1">Search Student Health Profile</h3>
 <p className="text-xs text-slate-500 mb-3">Lookup allergies, chronic conditions, blood groups, and immunization records by Student ID or Admission Number.</p>
 <form onSubmit={handleSearchProfile} className="flex gap-2">
 <input
 type="text"
 placeholder="Enter Student ID (e.g., STU-001)..."
 value={profileSearchStudentId}
 onChange={(e) => setProfileSearchStudentId(e.target.value)}
 className="flex-1 px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 "
 />
 <button
 type="submit"
 className="bg-teal-700 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-teal-800 flex items-center gap-1.5"
 >
 <span className="material-symbols-outlined text-base">search</span>
 Search
 </button>
 </form>
 </div>

 {searchedProfile && (
 <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
 <div className="flex items-center justify-between border-b pb-3">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-800 font-black text-lg">
 {searchedProfile.bloodGroup || '??'}
 </div>
 <div>
 <h4 className="text-lg font-bold text-slate-900 ">
 {searchedProfile.studentName || `Student: ${searchedProfile.studentId}`}
 </h4>
 <p className="text-xs text-slate-500">ID: {searchedProfile.studentId}</p>
 </div>
 </div>

 <button
 onClick={() => {
 setProfileForm({
 studentId: searchedProfile.studentId,
 bloodGroup: searchedProfile.bloodGroup || 'UNKNOWN',
 allergies: searchedProfile.allergies?.join(', ') || '',
 chronicConditions: searchedProfile.chronicConditions?.join(', ') || '',
 emergencyContactName: searchedProfile.emergencyContactName || '',
 emergencyContactPhone: searchedProfile.emergencyContactPhone || '',
 immunizationUpToDate: searchedProfile.immunizationUpToDate ?? true,
 notes: searchedProfile.notes || '',
 });
 setIsEditProfileModalOpen(true);
 }}
 className="bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal-800 flex items-center gap-1.5"
 >
 <span className="material-symbols-outlined text-base">edit</span>
 Edit Profile
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
 <div className="bg-white p-3 rounded-xl border">
 <span className="text-slate-400 font-medium">Allergies:</span>
 <div className="flex flex-wrap gap-1 mt-1">
 {searchedProfile.allergies && searchedProfile.allergies.length > 0 ? (
 searchedProfile.allergies.map((a, i) => (
 <span key={i} className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[11px] font-semibold">
 {a}
 </span>
 ))
 ) : (
 <span className="text-slate-500">None reported</span>
 )}
 </div>
 </div>

 <div className="bg-white p-3 rounded-xl border">
 <span className="text-slate-400 font-medium">Chronic Conditions:</span>
 <div className="flex flex-wrap gap-1 mt-1">
 {searchedProfile.chronicConditions && searchedProfile.chronicConditions.length > 0 ? (
 searchedProfile.chronicConditions.map((c, i) => (
 <span key={i} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[11px] font-semibold">
 {c}
 </span>
 ))
 ) : (
 <span className="text-slate-500">None reported</span>
 )}
 </div>
 </div>

 <div className="bg-white p-3 rounded-xl border">
 <span className="text-slate-400 font-medium">Emergency Contact:</span>
 <p className="font-bold text-slate-800 mt-1">
 {searchedProfile.emergencyContactName || 'N/A'} ({searchedProfile.emergencyContactPhone || 'No Phone'})
 </p>
 <p className="text-[11px] text-slate-400 mt-1">
 Immunizations: {searchedProfile.immunizationUpToDate ? '✓ Up to Date' : '⚠ Pending'}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {/* MODAL: LOG CLINIC VISIT */}
 {isLogModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between border-b pb-3 mb-4">
 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
 <span className="material-symbols-outlined text-teal-600">emergency</span>
 Log Clinic Triage / Visit
 </h3>
 <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
 <span className="material-symbols-outlined">close</span>
 </button>
 </div>

 <form onSubmit={handleLogVisit} className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Student Full Name</label>
 <input
 type="text"
 required
 placeholder="e.g., Amani Kiprono"
 value={visitForm.studentName}
 onChange={(e) => setVisitForm({ ...visitForm, studentName: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Grade Level</label>
 <input
 type="text"
 value={visitForm.gradeLevel}
 onChange={(e) => setVisitForm({ ...visitForm, gradeLevel: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Temperature (°C)</label>
 <div className="flex items-center gap-3">
 <input
 type="number"
 step="0.1"
 min="34"
 max="43"
 value={visitForm.temperatureCelsius}
 onChange={(e) => setVisitForm({ ...visitForm, temperatureCelsius: Number(e.target.value) })}
 className="w-32 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-900 "
 />
 <span className="text-xs text-slate-500">Normal range: 36.5°C - 37.4°C</span>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-2">Reported Symptoms</label>
 <div className="flex flex-wrap gap-2 mb-2">
 {COMMON_SYMPTOMS.map((sym) => {
 const isSelected = visitForm.symptoms.includes(sym);
 return (
 <button
 type="button"
 key={sym}
 onClick={() => toggleSymptom(sym)}
 className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
 isSelected
 ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
 : 'border-slate-200 text-slate-700 hover:bg-slate-50'
 }`}
 >
 {sym}
 </button>
 );
 })}
 </div>
 <div className="flex gap-2">
 <input
 type="text"
 placeholder="Other symptom..."
 value={visitForm.customSymptom}
 onChange={(e) => setVisitForm({ ...visitForm, customSymptom: e.target.value })}
 className="flex-1 px-3 py-1.5 rounded-lg border text-xs bg-white text-slate-900 "
 />
 <button
 type="button"
 onClick={handleAddCustomSymptom}
 className="px-3 py-1.5 bg-slate-200 rounded-lg text-xs font-semibold"
 >
 Add
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Treatment Administered</label>
 <input
 type="text"
 required
 placeholder="e.g., Cleaned wound, bandaged, cold compress"
 value={visitForm.treatmentAdministered}
 onChange={(e) => setVisitForm({ ...visitForm, treatmentAdministered: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Medication Dispensed (Rx)</label>
 <input
 type="text"
 placeholder="e.g., Paracetamol 500mg syrup"
 value={visitForm.medicationDispensed}
 onChange={(e) => setVisitForm({ ...visitForm, medicationDispensed: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Nurse / Attendant Remarks</label>
 <textarea
 rows={2}
 placeholder="Clinical observation notes..."
 value={visitForm.nurseRemarks}
 onChange={(e) => setVisitForm({ ...visitForm, nurseRemarks: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 {/* SMS Notification Checkbox */}
 <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
 <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-900 ">
 <input
 type="checkbox"
 checked={visitForm.notifyParent}
 onChange={(e) => setVisitForm({ ...visitForm, notifyParent: e.target.checked })}
 className="rounded text-blue-600"
 />
 Dispatch Immediate SMS Alert to Parent
 </label>
 {visitForm.notifyParent && (
 <div className="mt-2">
 <input
 type="tel"
 placeholder="Parent Phone Number (e.g., +254712345678)"
 value={visitForm.parentPhoneNumber}
 onChange={(e) => setVisitForm({ ...visitForm, parentPhoneNumber: e.target.value })}
 className="w-full px-3 py-1.5 rounded-lg border text-xs bg-white "
 />
 </div>
 )}
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsLogModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-teal-700 text-white font-bold text-xs rounded-xl hover:bg-teal-800 shadow-md"
 >
 Save & Log Case
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: UPDATE VISIT STATUS */}
 {isUpdateStatusModalOpen && selectedVisitForStatus && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
 <h3 className="text-lg font-bold text-slate-900 mb-2">Update Clinic Case Status</h3>
 <p className="text-xs text-slate-500 mb-4">
 Learner: <strong>{selectedVisitForStatus.studentName}</strong>
 </p>

 <form onSubmit={handleUpdateStatus} className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
 <select
 value={newStatus}
 onChange={(e: any) => setNewStatus(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="UNDER_OBSERVATION">Under Observation (In Sick Bay)</option>
 <option value="RESOLVED">Resolved (Discharged back to Class)</option>
 <option value="REFERRED_TO_HOSPITAL">Referred to Hospital Facility</option>
 </select>
 </div>

 {newStatus === 'REFERRED_TO_HOSPITAL' && (
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Hospital / Clinic Facility Name</label>
 <input
 type="text"
 required
 placeholder="e.g., Aga Khan Hospital / Nairobi Women's"
 value={referredHospital}
 onChange={(e) => setReferredHospital(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 )}

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsUpdateStatusModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-teal-700 text-white font-bold text-xs rounded-xl hover:bg-teal-800"
 >
 Update
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: EDIT MEDICAL PROFILE */}
 {isEditProfileModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-bold text-slate-900 mb-3">Edit Learner Medical Profile</h3>
 <form onSubmit={handleSaveProfile} className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Blood Group</label>
 <select
 value={profileForm.bloodGroup}
 onChange={(e: any) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="UNKNOWN">Unknown</option>
 <option value="A+">A+</option>
 <option value="A-">A-</option>
 <option value="B+">B+</option>
 <option value="B-">B-</option>
 <option value="AB+">AB+</option>
 <option value="AB-">AB-</option>
 <option value="O+">O+</option>
 <option value="O-">O-</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Immunization Up To Date</label>
 <select
 value={profileForm.immunizationUpToDate ? 'YES' : 'NO'}
 onChange={(e) => setProfileForm({ ...profileForm, immunizationUpToDate: e.target.value === 'YES' })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="YES">Yes, Up to Date</option>
 <option value="NO">No, Pending Vaccines</option>
 </select>
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Allergies (comma-separated)</label>
 <input
 type="text"
 placeholder="e.g., Peanuts, Penicillin, Dust"
 value={profileForm.allergies}
 onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Chronic Medical Conditions (comma-separated)</label>
 <input
 type="text"
 placeholder="e.g., Asthma, Diabetes, Epilepsy"
 value={profileForm.chronicConditions}
 onChange={(e) => setProfileForm({ ...profileForm, chronicConditions: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Emergency Contact Name</label>
 <input
 type="text"
 placeholder="Parent / Guardian"
 value={profileForm.emergencyContactName}
 onChange={(e) => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Emergency Contact Phone</label>
 <input
 type="tel"
 placeholder="+2547..."
 value={profileForm.emergencyContactPhone}
 onChange={(e) => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Dietary / Health Notes</label>
 <textarea
 rows={2}
 placeholder="Special instructions for cafeteria or sports..."
 value={profileForm.notes}
 onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsEditProfileModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-4 py-2 bg-teal-700 text-white font-bold text-xs rounded-xl hover:bg-teal-800"
 >
 Save Profile
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
