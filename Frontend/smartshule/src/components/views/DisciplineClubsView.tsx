import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { CoCurricularClub, DisciplineIncident } from '../../types';

export const DisciplineClubsView: React.FC = () => {
 const [activeTab, setActiveTab] = useState<'clubs' | 'discipline'>('clubs');
 const [clubs, setClubs] = useState<CoCurricularClub[]>([]);
 const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);
 const [loading, setLoading] = useState(true);
 const [typeFilter, setTypeFilter] = useState<string>('ALL');
 const [searchQuery, setSearchQuery] = useState('');
 const [notification, setNotification] = useState<string | null>(null);

 // Modals
 const [isRegisterClubModalOpen, setIsRegisterClubModalOpen] = useState(false);
 const [isLogIncidentModalOpen, setIsLogIncidentModalOpen] = useState(false);
 const [selectedClubForMembers, setSelectedClubForMembers] = useState<CoCurricularClub | null>(null);
 const [newMemberStudentId, setNewMemberStudentId] = useState('');

 // Forms
 const [clubForm, setClubForm] = useState({
 clubName: '',
 category: 'STEM_ROBOTICS' as CoCurricularClub['category'],
 patronTeacherName: '',
 patronTeacherId: '',
 meetingDay: 'Wednesday 3:30 PM - 5:00 PM',
 description: '',
 });

 const [incidentForm, setIncidentForm] = useState({
 studentId: '',
 studentName: '',
 gradeLevel: 'Grade 6',
 incidentType: 'MERIT_COMMENDATION' as DisciplineIncident['incidentType'],
 cbcCoreValue: 'INTEGRITY' as DisciplineIncident['cbcCoreValue'],
 title: '',
 description: '',
 actionTaken: '',
 points: 5,
 parentInformed: true,
 parentPhoneNumber: '',
 });

 const showNotification = (msg: string) => {
 setNotification(msg);
 setTimeout(() => setNotification(null), 4000);
 };

 const loadData = async () => {
 setLoading(true);
 try {
 const [clubsRes, incidentsRes] = await Promise.all([
 apiService.getClubs(),
 apiService.getDisciplineIncidents(),
 ]);
 if (clubsRes?.data) setClubs(clubsRes.data);
 if (incidentsRes?.data) setIncidents(incidentsRes.data);
 } catch (err: any) {
 console.error('Failed to load discipline/clubs data:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const stats = useMemo(() => {
 const totalClubs = clubs.length;
 const totalMembers = clubs.reduce((acc, c) => acc + (c.memberStudentIds?.length || c.memberCount || 0), 0);
 const merits = incidents.filter((i) => i.incidentType === 'MERIT_COMMENDATION').length;
 const infractions = incidents.filter((i) => i.incidentType === 'INFRACTION_WARNING').length;
 const counseling = incidents.filter((i) => i.incidentType === 'COUNSELING_REFERRAL').length;

 return {
 totalClubs,
 totalMembers,
 merits,
 infractions,
 counseling,
 };
 }, [clubs, incidents]);

 const filteredIncidents = useMemo(() => {
 return incidents.filter((i) => {
 if (typeFilter !== 'ALL' && i.incidentType !== typeFilter) return false;
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 return (
 i.studentName.toLowerCase().includes(q) ||
 i.title.toLowerCase().includes(q) ||
 i.cbcCoreValue.toLowerCase().includes(q)
 );
 }
 return true;
 });
 }, [incidents, typeFilter, searchQuery]);

 const handleCreateClub = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!clubForm.clubName || !clubForm.patronTeacherName) return;
 try {
 const res = await apiService.createClub(clubForm);
 if (res.success) {
 showNotification(`Club "${clubForm.clubName}" registered successfully!`);
 setIsRegisterClubModalOpen(false);
 setClubForm({
 clubName: '',
 category: 'STEM_ROBOTICS',
 patronTeacherName: '',
 patronTeacherId: '',
 meetingDay: 'Wednesday 3:30 PM - 5:00 PM',
 description: '',
 });
 loadData();
 } else {
 alert(res.message || 'Failed to register club');
 }
 } catch (err: any) {
 alert(`Error: ${err.message}`);
 }
 };

 const handleLogIncident = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!incidentForm.studentName || !incidentForm.title) return;
 try {
 const res = await apiService.logDisciplineIncident({
 ...incidentForm,
 studentId: incidentForm.studentId || `STU-${Date.now().toString().slice(-4)}`,
 });
 if (res.success) {
 showNotification(`Incident / Merit for ${incidentForm.studentName} logged!`);
 setIsLogIncidentModalOpen(false);
 setIncidentForm({
 studentId: '',
 studentName: '',
 gradeLevel: 'Grade 6',
 incidentType: 'MERIT_COMMENDATION',
 cbcCoreValue: 'INTEGRITY',
 title: '',
 description: '',
 actionTaken: '',
 points: 5,
 parentInformed: true,
 parentPhoneNumber: '',
 });
 loadData();
 } else {
 alert(res.message || 'Failed to log incident');
 }
 } catch (err: any) {
 alert(`Error: ${err.message}`);
 }
 };

 const handleAddMember = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedClubForMembers || !newMemberStudentId.trim()) return;
 try {
 const res = await apiService.addClubMember(selectedClubForMembers.id, newMemberStudentId.trim());
 if (res.success) {
 showNotification('Member added to club');
 setNewMemberStudentId('');
 // Refresh club
 const updated = await apiService.getClub(selectedClubForMembers.id);
 if (updated?.data) setSelectedClubForMembers(updated.data);
 loadData();
 }
 } catch (err: any) {
 alert(`Error adding member: ${err.message}`);
 }
 };

 const handleRemoveMember = async (studentId: string) => {
 if (!selectedClubForMembers) return;
 try {
 const res = await apiService.removeClubMember(selectedClubForMembers.id, studentId);
 if (res.success) {
 showNotification('Member removed');
 const updated = await apiService.getClub(selectedClubForMembers.id);
 if (updated?.data) setSelectedClubForMembers(updated.data);
 loadData();
 }
 } catch (err: any) {
 alert(`Error removing member: ${err.message}`);
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
 <span className="material-symbols-outlined text-base">military_tech</span>
 CBC Core Values & Character Formation
 </div>
 <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Clubs, Societies & Discipline Log</h1>
 <p className="text-rose-100/90 text-sm mt-1 max-w-2xl">
 Promoting holistic CBC competencies through scouting, STEM, drama, and positive behavior commendations and counseling.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <button
 onClick={() => setIsLogIncidentModalOpen(true)}
 className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
 >
 <span className="material-symbols-outlined text-lg">workspace_premium</span>
 Log Commendation / Issue
 </button>
 <button
 onClick={() => setIsRegisterClubModalOpen(true)}
 className="bg-white text-indigo-900 hover:bg-indigo-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
 >
 <span className="material-symbols-outlined text-lg">group_add</span>
 Register Club
 </button>
 </div>
 </div>

 {/* Metric Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Active Clubs</span>
 <span className="material-symbols-outlined text-indigo-600 text-lg">groups</span>
 </div>
 <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalClubs}</p>
 <p className="text-xs text-slate-500 mt-1">{stats.totalMembers} enrolled learners</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Merits & Commendations</span>
 <span className="material-symbols-outlined text-emerald-600 text-lg">thumb_up</span>
 </div>
 <p className="text-2xl font-bold text-emerald-600 mt-2">+{stats.merits}</p>
 <p className="text-xs text-slate-500 mt-1">Exemplary CBC values recognized</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Infractions Recorded</span>
 <span className="material-symbols-outlined text-amber-500 text-lg">priority_high</span>
 </div>
 <p className="text-2xl font-bold text-amber-600 mt-2">{stats.infractions}</p>
 <p className="text-xs text-slate-500 mt-1">Behavior warnings issued</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
 <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
 <span>Counseling Referrals</span>
 <span className="material-symbols-outlined text-purple-600 text-lg">psychology</span>
 </div>
 <p className="text-2xl font-bold text-purple-600 mt-2">{stats.counseling}</p>
 <p className="text-xs text-slate-500 mt-1">Guidance sessions arranged</p>
 </div>
 </div>

 {/* Sub Tabs */}
 <div className="flex items-center gap-2 border-b border-slate-200 ">
 <button
 onClick={() => setActiveTab('clubs')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeTab === 'clubs'
 ? 'border-indigo-600 text-indigo-700'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">diversity_3</span>
 Co-Curricular Clubs Roster ({clubs.length})
 </button>

 <button
 onClick={() => setActiveTab('discipline')}
 className={`px-5 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
 activeTab === 'discipline'
 ? 'border-indigo-600 text-indigo-700'
 : 'border-transparent text-slate-600 hover:text-slate-900'
 }`}
 >
 <span className="material-symbols-outlined text-lg">award_star</span>
 Values & Discipline Incident Log ({incidents.length})
 </button>
 </div>

 {/* TAB 1: CLUBS ROSTER */}
 {activeTab === 'clubs' && (
 <div className="space-y-4">
 {loading ? (
 <div className="p-12 text-center text-slate-500">
 <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-indigo-600">progress_activity</span>
 <p>Loading clubs...</p>
 </div>
 ) : clubs.length === 0 ? (
 <div className="p-12 text-center bg-white rounded-2xl border">
 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">groups</span>
 <p className="text-slate-600 font-medium">No clubs registered yet.</p>
 <p className="text-xs text-slate-400 mt-1">Click "Register Club" to start a scouting, STEM, or debate club.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 {clubs.map((c) => {
 const memberCount = c.memberStudentIds?.length || c.memberCount || 0;
 return (
 <div
 key={c.id}
 className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all"
 >
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 ">
 {c.category}
 </span>
 <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
 <span className="material-symbols-outlined text-sm">schedule</span>
 {c.meetingDay}
 </span>
 </div>

 <h3 className="text-lg font-bold text-slate-900 mt-1">{c.clubName}</h3>
 <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description || 'No description provided.'}</p>

 <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1">
 <p className="text-slate-600 ">
 Patron Teacher: <strong className="text-slate-900 ">{c.patronTeacherName}</strong>
 </p>
 <p className="text-slate-600 ">
 Active Members: <strong className="text-indigo-600 ">{memberCount} learners</strong>
 </p>
 </div>
 </div>

 <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
 <button
 onClick={() => setSelectedClubForMembers(c)}
 className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
 >
 <span className="material-symbols-outlined text-base">group</span>
 Manage Members
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* TAB 2: DISCIPLINE & VALUES LOG */}
 {activeTab === 'discipline' && (
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
 {/* Filters Bar */}
 <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
 <div className="flex flex-wrap items-center gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Incident Type</label>
 <select
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value)}
 className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 "
 >
 <option value="ALL">All Categories</option>
 <option value="MERIT_COMMENDATION">Merit Commendations (+)</option>
 <option value="INFRACTION_WARNING">Infraction Warnings (-)</option>
 <option value="COUNSELING_REFERRAL">Counseling Referrals</option>
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-500 mb-1">Search Incident</label>
 <div className="relative">
 <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-sm">search</span>
 <input
 type="text"
 placeholder="Search student, value, title..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 "
 />
 </div>
 </div>
 </div>

 <div className="text-xs text-slate-500">
 Showing <span className="font-bold text-slate-800 ">{filteredIncidents.length}</span> logged entries
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 {loading ? (
 <div className="p-12 text-center text-slate-500">
 <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-indigo-600">progress_activity</span>
 <p>Loading incident records...</p>
 </div>
 ) : filteredIncidents.length === 0 ? (
 <div className="p-12 text-center">
 <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">military_tech</span>
 <p className="text-slate-600 font-medium">No behavior incidents recorded.</p>
 </div>
 ) : (
 <table className="w-full text-left text-sm text-slate-700 ">
 <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 ">
 <tr>
 <th className="px-4 py-3">Learner & Grade</th>
 <th className="px-4 py-3">Type</th>
 <th className="px-4 py-3">CBC Core Value</th>
 <th className="px-4 py-3">Points</th>
 <th className="px-4 py-3">Incident Title & Details</th>
 <th className="px-4 py-3">Action / Guidance Taken</th>
 <th className="px-4 py-3">Logged By</th>
 <th className="px-4 py-3 text-right">Parent SMS</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredIncidents.map((i) => (
 <tr key={i.id} className="hover:bg-slate-50/60 ">
 <td className="px-4 py-3">
 <div className="font-semibold text-slate-900 ">{i.studentName}</div>
 <div className="text-xs text-slate-400">{i.gradeLevel || 'Learner'}</div>
 </td>
 <td className="px-4 py-3">
 {i.incidentType === 'MERIT_COMMENDATION' ? (
 <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 ">
 ★ Commendation
 </span>
 ) : i.incidentType === 'INFRACTION_WARNING' ? (
 <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 ">
 ⚠ Infraction
 </span>
 ) : (
 <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 ">
 ♥ Counseling
 </span>
 )}
 </td>
 <td className="px-4 py-3">
 <span className="font-mono text-xs font-semibold text-slate-700 ">
 {i.cbcCoreValue}
 </span>
 </td>
 <td className="px-4 py-3">
 <span
 className={`font-bold font-mono text-sm ${
 i.points >= 0 ? 'text-emerald-600' : 'text-rose-600'
 }`}
 >
 {i.points >= 0 ? `+${i.points}` : i.points}
 </span>
 </td>
 <td className="px-4 py-3 text-xs max-w-xs">
 <div className="font-bold text-slate-900 ">{i.title}</div>
 <div className="text-slate-500 line-clamp-1">{i.description}</div>
 </td>
 <td className="px-4 py-3 text-xs font-medium text-slate-800 ">
 {i.actionTaken || '--'}
 </td>
 <td className="px-4 py-3 text-xs text-slate-500">{i.loggedByTeacherName}</td>
 <td className="px-4 py-3 text-right">
 {i.parentInformed ? (
 <span className="text-xs text-blue-600 font-medium flex items-center justify-end gap-1">
 <span className="material-symbols-outlined text-sm">done_all</span> Notified
 </span>
 ) : (
 <span className="text-slate-400 text-xs">Not Sent</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 )}

 {/* MODAL: REGISTER NEW CLUB */}
 {isRegisterClubModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-bold text-slate-900 mb-3">Register Co-Curricular Club</h3>
 <form onSubmit={handleCreateClub} className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Club Name</label>
 <input
 type="text"
 required
 placeholder="e.g., Scouts & Girl Guides Movement"
 value={clubForm.clubName}
 onChange={(e) => setClubForm({ ...clubForm, clubName: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
 <select
 value={clubForm.category}
 onChange={(e: any) => setClubForm({ ...clubForm, category: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="SCOUTS_GIRLGUIDES">Scouts & Girl Guides</option>
 <option value="RED_CROSS">Kenya Red Cross</option>
 <option value="STEM_ROBOTICS">STEM, Robotics & Coding</option>
 <option value="DEBATE_DRAMA">Debate & Drama Society</option>
 <option value="SPORTS_ATHLETICS">Sports & Athletics</option>
 <option value="MUSIC_BAND">Music, Choir & Brass Band</option>
 <option value="ENVIRONMENTAL">4K Club & Environmental</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Patron Teacher</label>
 <input
 type="text"
 required
 placeholder="e.g., Tr. Grace Njeri"
 value={clubForm.patronTeacherName}
 onChange={(e) => setClubForm({ ...clubForm, patronTeacherName: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Meeting Schedule</label>
 <input
 type="text"
 placeholder="e.g., Wednesday 3:30 PM - 5:00 PM"
 value={clubForm.meetingDay}
 onChange={(e) => setClubForm({ ...clubForm, meetingDay: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Description / Core Mandate</label>
 <textarea
 rows={2}
 placeholder="Goals, activities, and CBC competencies nurtured..."
 value={clubForm.description}
 onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsRegisterClubModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl"
 >
 Register Club
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: LOG INCIDENT / COMMENDATION */}
 {isLogIncidentModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-bold text-slate-900 mb-3">Log CBC Value Commendation or Incident</h3>
 <form onSubmit={handleLogIncident} className="space-y-3">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Student Full Name</label>
 <input
 type="text"
 required
 placeholder="e.g., Samuel Ochieng"
 value={incidentForm.studentName}
 onChange={(e) => setIncidentForm({ ...incidentForm, studentName: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Grade Level</label>
 <input
 type="text"
 value={incidentForm.gradeLevel}
 onChange={(e) => setIncidentForm({ ...incidentForm, gradeLevel: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Category / Record Type</label>
 <select
 value={incidentForm.incidentType}
 onChange={(e: any) => {
 const val = e.target.value;
 setIncidentForm({
 ...incidentForm,
 incidentType: val,
 points: val === 'MERIT_COMMENDATION' ? 5 : val === 'INFRACTION_WARNING' ? -3 : 0,
 });
 }}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="MERIT_COMMENDATION">Merit Commendation (Positive)</option>
 <option value="INFRACTION_WARNING">Infraction Warning (Negative)</option>
 <option value="COUNSELING_REFERRAL">Guidance & Counseling Referral</option>
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">CBC Core Value</label>
 <select
 value={incidentForm.cbcCoreValue}
 onChange={(e: any) => setIncidentForm({ ...incidentForm, cbcCoreValue: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 >
 <option value="LOVE">Love / Compassion</option>
 <option value="RESPECT">Respect</option>
 <option value="RESPONSIBILITY">Responsibility</option>
 <option value="INTEGRITY">Integrity / Honesty</option>
 <option value="PEACE">Peace & Harmony</option>
 <option value="PATRIOTISM">Patriotism</option>
 <option value="UNITY">Unity & Teamwork</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-3">
 <div className="col-span-2">
 <label className="block text-xs font-medium text-slate-600 mb-1">Summary Title</label>
 <input
 type="text"
 required
 placeholder="e.g., Handed over lost money / Unruly in dining hall"
 value={incidentForm.title}
 onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Merit Points</label>
 <input
 type="number"
 value={incidentForm.points}
 onChange={(e) => setIncidentForm({ ...incidentForm, points: Number(e.target.value) })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-900 "
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Detailed Description</label>
 <textarea
 rows={2}
 placeholder="Circumstances and observation..."
 value={incidentForm.description}
 onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-slate-600 mb-1">Corrective Action / Award Given</label>
 <input
 type="text"
 placeholder="e.g., Commended in morning assembly / Advised on teamwork"
 value={incidentForm.actionTaken}
 onChange={(e) => setIncidentForm({ ...incidentForm, actionTaken: e.target.value })}
 className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 "
 />
 </div>

 <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 ">
 <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-900 ">
 <input
 type="checkbox"
 checked={incidentForm.parentInformed}
 onChange={(e) => setIncidentForm({ ...incidentForm, parentInformed: e.target.checked })}
 className="rounded text-indigo-600"
 />
 Send SMS Notice to Parent / Guardian
 </label>
 {incidentForm.parentInformed && (
 <div className="mt-2">
 <input
 type="tel"
 placeholder="Parent Phone Number (e.g. +254712345678)"
 value={incidentForm.parentPhoneNumber}
 onChange={(e) => setIncidentForm({ ...incidentForm, parentPhoneNumber: e.target.value })}
 className="w-full px-3 py-1.5 rounded-lg border text-xs bg-white "
 />
 </div>
 )}
 </div>

 <div className="flex justify-end gap-3 pt-3 border-t">
 <button
 type="button"
 onClick={() => setIsLogIncidentModalOpen(false)}
 className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl"
 >
 Save Entry
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL: MANAGE CLUB MEMBERS */}
 {selectedClubForMembers && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between border-b pb-3 mb-4">
 <div>
 <h3 className="text-lg font-bold text-slate-900 ">{selectedClubForMembers.clubName}</h3>
 <p className="text-xs text-slate-500">Patron: {selectedClubForMembers.patronTeacherName}</p>
 </div>
 <button onClick={() => setSelectedClubForMembers(null)} className="text-slate-400 hover:text-slate-600">
 <span className="material-symbols-outlined">close</span>
 </button>
 </div>

 {/* Add Member Form */}
 <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
 <input
 type="text"
 placeholder="Student ID or Admission No (e.g., STU-001)..."
 value={newMemberStudentId}
 onChange={(e) => setNewMemberStudentId(e.target.value)}
 className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 "
 />
 <button
 type="submit"
 className="px-4 py-2 bg-indigo-700 text-white font-bold text-xs rounded-xl hover:bg-indigo-800"
 >
 + Add Member
 </button>
 </form>

 {/* Members List */}
 <div className="space-y-2">
 <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
 Current Registered Members ({selectedClubForMembers.memberStudentIds?.length || 0})
 </h4>

 {selectedClubForMembers.memberStudentIds?.length === 0 ? (
 <p className="text-xs text-slate-400 py-3 text-center">No student members added yet.</p>
 ) : (
 <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
 {selectedClubForMembers.memberStudentIds?.map((mId, idx) => (
 <div key={idx} className="py-2 flex items-center justify-between text-xs">
 <div className="flex items-center gap-2">
 <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">
 {idx + 1}
 </span>
 <span className="font-semibold text-slate-900 ">Learner ID: {mId}</span>
 </div>
 <button
 onClick={() => handleRemoveMember(mId)}
 className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
 >
 Remove
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="flex justify-end pt-4 border-t mt-4">
 <button
 type="button"
 onClick={() => setSelectedClubForMembers(null)}
 className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
