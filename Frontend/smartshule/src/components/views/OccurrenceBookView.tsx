import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  OccurrenceRecord,
  OccurrenceDailySummary,
  OccurrenceCategory,
  OccurrenceSeverity,
  OccurrenceStatus,
  Student
} from '../../types';

export const OccurrenceBookView: React.FC = () => {
  const { user } = useAuth();

  // Current selected date (defaults to today YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateScope, setDateScope] = useState<'today' | 'yesterday' | 'custom' | 'all'>('today');

  // Data states
  const [occurrences, setOccurrences] = useState<OccurrenceRecord[]>([]);
  const [dailySummary, setDailySummary] = useState<OccurrenceDailySummary | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedOccurrenceForResolve, setSelectedOccurrenceForResolve] = useState<OccurrenceRecord | null>(null);
  const [selectedOccurrenceDetail, setSelectedOccurrenceDetail] = useState<OccurrenceRecord | null>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Student search within log modal
  const [studentSearchInput, setStudentSearchInput] = useState('');

  // Form states
  const [form, setForm] = useState<{
    date: string;
    time: string;
    category: OccurrenceCategory;
    severity: OccurrenceSeverity;
    title: string;
    description: string;
    location: string;
    reportedByRole: string;
    reportedByTeacherName: string;
    studentIds: string[];
    studentNames: string[];
    witnesses: string;
    immediateActionTaken: string;
    parentNotified: boolean;
    parentNotificationMethod: 'SMS' | 'PHONE_CALL' | 'IN_PERSON' | 'NONE';
    notifyParentViaSms: boolean;
  }>({
    date: todayStr,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    category: 'DISCIPLINARY',
    severity: 'LOW',
    title: '',
    description: '',
    location: '',
    reportedByRole: 'Teacher on Duty',
    reportedByTeacherName: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || user.email || 'Teacher' : 'Teacher on Duty',
    studentIds: [],
    studentNames: [],
    witnesses: '',
    immediateActionTaken: '',
    parentNotified: false,
    parentNotificationMethod: 'NONE',
    notifyParentViaSms: false,
  });

  const [resolveForm, setResolveForm] = useState<{
    status: OccurrenceStatus;
    resolutionNotes: string;
    resolvedBy: string;
  }>({
    status: 'RESOLVED',
    resolutionNotes: '',
    resolvedBy: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'Deputy Principal' : 'Teacher',
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateScope === 'today') {
        params.date = todayStr;
      } else if (dateScope === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        params.date = d.toISOString().split('T')[0];
      } else if (dateScope === 'custom' && selectedDate) {
        params.date = selectedDate;
      }
      // 'all' passes no date filter

      const [occRes, sumRes, stuRes] = await Promise.all([
        apiService.getOccurrences(params).catch(() => ({ success: false, data: [] })),
        apiService.getOccurrenceDailySummary(params.date || todayStr).catch(() => ({ success: false, data: null })),
        apiService.getStudents().catch(() => ({ success: false, data: [] }))
      ]);

      if (occRes && (occRes as any).data) {
        setOccurrences((occRes as any).data);
      }
      if (sumRes && (sumRes as any).data) {
        setDailySummary((sumRes as any).data);
      }
      if (stuRes && (stuRes as any).data && Array.isArray((stuRes as any).data)) {
        setStudents((stuRes as any).data);
      }
    } catch (err: any) {
      console.error('Failed to load occurrence records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateScope, selectedDate]);

  // Quick scope changes
  const handleScopeChange = (scope: 'today' | 'yesterday' | 'custom' | 'all') => {
    setDateScope(scope);
    if (scope === 'today') {
      setSelectedDate(todayStr);
    } else if (scope === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  // Filtered occurrences
  const filteredOccurrences = useMemo(() => {
    return occurrences.filter((occ) => {
      if (categoryFilter !== 'ALL' && occ.category !== categoryFilter) return false;
      if (severityFilter !== 'ALL' && occ.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && occ.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = occ.title.toLowerCase().includes(q);
        const inDesc = occ.description.toLowerCase().includes(q);
        const inNum = occ.occurrenceNumber.toLowerCase().includes(q);
        const inLoc = occ.location.toLowerCase().includes(q);
        const inTeacher = occ.reportedByTeacherName.toLowerCase().includes(q);
        const inStudents = occ.studentNames?.some((s) => s.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inNum && !inLoc && !inTeacher && !inStudents) {
          return false;
        }
      }
      return true;
    });
  }, [occurrences, categoryFilter, severityFilter, statusFilter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = occurrences.length;
    const open = occurrences.filter((o) => o.status === 'OPEN').length;
    const investigating = occurrences.filter((o) => o.status === 'INVESTIGATING').length;
    const resolved = occurrences.filter((o) => o.status === 'RESOLVED').length;
    const critical = occurrences.filter((o) => o.severity === 'CRITICAL' || o.severity === 'HIGH').length;

    return { total, open, investigating, resolved, critical };
  }, [occurrences]);

  // Student search results inside modal
  const filteredStudentsForSelect = useMemo(() => {
    if (!studentSearchInput.trim()) return [];
    const q = studentSearchInput.toLowerCase();
    return students
      .filter((s: any) => {
        const name = s.name || `${s.firstName || ''} ${s.lastName || ''}`;
        const adm = s.admNo || s.admissionNumber || '';
        return name.toLowerCase().includes(q) || adm.toLowerCase().includes(q);
      })
      .slice(0, 6);
  }, [students, studentSearchInput]);

  const handleAddStudentToForm = (student: any) => {
    const sId = student.id;
    const sName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.admissionNumber;

    if (!form.studentIds.includes(sId)) {
      setForm((prev) => ({
        ...prev,
        studentIds: [...prev.studentIds, sId],
        studentNames: [...prev.studentNames, sName],
      }));
    }
    setStudentSearchInput('');
  };

  const handleRemoveStudentFromForm = (sId: string) => {
    const idx = form.studentIds.indexOf(sId);
    if (idx !== -1) {
      setForm((prev) => ({
        ...prev,
        studentIds: prev.studentIds.filter((_, i) => i !== idx),
        studentNames: prev.studentNames.filter((_, i) => i !== idx),
      }));
    }
  };

  // Submit new incident
  const handleCreateOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      alert('Please fill in the incident title, location, and description.');
      return;
    }

    try {
      const res = await apiService.createOccurrence(form);
      if (res && (res as any).success) {
        showNotification(`Occurrence ${(res as any).data?.occurrenceNumber || 'record'} logged successfully!`);
        setIsLogModalOpen(false);
        // Reset form
        setForm({
          date: todayStr,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          category: 'DISCIPLINARY',
          severity: 'LOW',
          title: '',
          description: '',
          location: '',
          reportedByRole: 'Teacher on Duty',
          reportedByTeacherName: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || user.email || 'Teacher' : 'Teacher on Duty',
          studentIds: [],
          studentNames: [],
          witnesses: '',
          immediateActionTaken: '',
          parentNotified: false,
          parentNotificationMethod: 'NONE',
          notifyParentViaSms: false,
        });
        loadData();
      } else {
        alert((res as any)?.message || 'Failed to record occurrence.');
      }
    } catch (err: any) {
      alert(`Error logging incident: ${err.message}`);
    }
  };

  // Submit resolve/status update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOccurrenceForResolve) return;

    try {
      const res = await apiService.updateOccurrenceStatus(selectedOccurrenceForResolve.id, {
        status: resolveForm.status,
        resolutionNotes: resolveForm.resolutionNotes.trim(),
        resolvedBy: resolveForm.resolvedBy.trim(),
      });

      if (res && (res as any).success) {
        showNotification(`Status updated to ${resolveForm.status}!`);
        setIsResolveModalOpen(false);
        setSelectedOccurrenceForResolve(null);
        loadData();
      } else {
        alert((res as any)?.message || 'Failed to update occurrence status.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete occurrence
  const handleDeleteOccurrence = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this occurrence record?')) {
      return;
    }
    try {
      const res = await apiService.deleteOccurrence(id);
      if (res && (res as any).success) {
        showNotification('Occurrence record deleted.');
        loadData();
      }
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    }
  };

  // Helper formatting badges
  const getSeverityBadge = (sev: OccurrenceSeverity) => {
    switch (sev) {
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Low
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Medium
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            High
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            Critical Emergency
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: OccurrenceCategory) => {
    switch (cat) {
      case 'DISCIPLINARY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="material-symbols-outlined text-xs">gavel</span>
            Disciplinary
          </span>
        );
      case 'ACCIDENT_INJURY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <span className="material-symbols-outlined text-xs">personal_injury</span>
            Accident / Injury
          </span>
        );
      case 'MEDICAL_ILLNESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            <span className="material-symbols-outlined text-xs">medical_services</span>
            Medical / Illness
          </span>
        );
      case 'PROPERTY_DAMAGE_LOSS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <span className="material-symbols-outlined text-xs">construction</span>
            Property / Damage
          </span>
        );
      case 'SECURITY_SAFETY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-xs">shield</span>
            Security & Safety
          </span>
        );
      case 'ACADEMIC_CLASSROOM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="material-symbols-outlined text-xs">school</span>
            Academic / Classroom
          </span>
        );
      case 'COMMENDATION_GOOD_DEED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-xs">star</span>
            Commendation / Good Deed
          </span>
        );
      case 'GENERAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            <span className="material-symbols-outlined text-xs">notes</span>
            General Occurrence
          </span>
        );
    }
  };

  const getStatusBadge = (st: OccurrenceStatus) => {
    switch (st) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="material-symbols-outlined text-xs">pending</span>
            Open
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="material-symbols-outlined text-xs">search</span>
            Investigating
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-xs">task_alt</span>
            Resolved
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-xs">priority_high</span>
            Escalated
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-[#7a1228] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#420914] via-[#7a1228] to-[#9c1834] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">event_note</span>
            Official School Daily Register
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Daily Occurrence Book (OB)</h1>
          <p className="text-rose-100/90 text-sm mt-1 max-w-2xl">
            Duty teachers, class teachers, and administrators record incidents, accidents, disciplinary events, safety issues, and good deeds as they happen throughout the school day.
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-rose-200">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">calendar_today</span>
              Selected Scope: {dateScope === 'today' ? `Today (${todayStr})` : dateScope === 'yesterday' ? 'Yesterday' : dateScope === 'all' ? 'All Historic Dates' : selectedDate}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">badge</span>
              Logged by Duty Master / CBE Staff
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm flex items-center gap-2 transition-all border border-white/20"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Print Daily OB Log
          </button>
          <button
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                date: selectedDate || todayStr,
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              }));
              setIsLogModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-[#7a1228] font-bold text-sm shadow-md hover:shadow-lg flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Record Incident Today
          </button>
        </div>
      </div>

      {/* Date Filter Bar & Scope Pills */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Scope:</span>
          <button
            onClick={() => handleScopeChange('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              dateScope === 'today'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">today</span>
            Today
          </button>
          <button
            onClick={() => handleScopeChange('yesterday')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              dateScope === 'yesterday'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">history</span>
            Yesterday
          </button>
          <button
            onClick={() => handleScopeChange('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              dateScope === 'custom'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">event</span>
            Pick Date
          </button>
          <button
            onClick={() => handleScopeChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              dateScope === 'all'
                ? 'bg-[#7a1228] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">view_agenda</span>
            All Records
          </button>
        </div>

        {dateScope === 'custom' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
            />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-[#7a1228] rounded-lg">
            <span className="material-symbols-outlined text-xl">assignment</span>
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 font-medium">Total Logged</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <span className="material-symbols-outlined text-xl">pending_actions</span>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600">{stats.open}</div>
            <div className="text-xs text-gray-500 font-medium">Open / Pending</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <span className="material-symbols-outlined text-xl">manage_search</span>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600">{stats.investigating}</div>
            <div className="text-xs text-gray-500 font-medium">Under Investigation</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600">{stats.resolved}</div>
            <div className="text-xs text-gray-500 font-medium">Cases Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
          <input
            type="text"
            placeholder="Search incident title, OB number, learner name, teacher, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
          >
            <option value="ALL">All Categories</option>
            <option value="DISCIPLINARY">Disciplinary</option>
            <option value="ACCIDENT_INJURY">Accident / Injury</option>
            <option value="MEDICAL_ILLNESS">Medical / Illness</option>
            <option value="PROPERTY_DAMAGE_LOSS">Property Damage / Loss</option>
            <option value="SECURITY_SAFETY">Security & Safety</option>
            <option value="ACADEMIC_CLASSROOM">Academic / Classroom</option>
            <option value="COMMENDATION_GOOD_DEED">Commendation / Good Deed</option>
            <option value="GENERAL">General Occurrence</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
          >
            <option value="ALL">All Severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical Emergency</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </div>
      </div>

      {/* Occurrences List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7a1228]">history_edu</span>
            <h2 className="text-sm font-bold text-gray-800">
              Occurrence Book Register ({filteredOccurrences.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {dateScope === 'today' ? `Incidents for Today (${todayStr})` : `Scope: ${dateScope}`}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
            <p className="mt-2 text-xs">Loading Occurrence Book entries...</p>
          </div>
        ) : filteredOccurrences.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <span className="material-symbols-outlined text-5xl text-gray-300">verified</span>
            <p className="mt-2 text-sm font-medium text-gray-600">No occurrences logged for this period</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              If an incident happens today, teachers can record it directly using the "Record Incident Today" button above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredOccurrences.map((occ) => (
              <div key={occ.id} className="p-5 hover:bg-gray-50/70 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
                        {occ.occurrenceNumber}
                      </span>
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {occ.date} • {occ.time}
                      </span>
                      {getCategoryBadge(occ.category)}
                      {getSeverityBadge(occ.severity)}
                      {getStatusBadge(occ.status)}
                    </div>

                    {/* Title & Location */}
                    <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                      <h3 className="text-sm font-bold text-gray-900">{occ.title}</h3>
                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {occ.location}
                      </span>
                    </div>

                    {/* Narrative Description */}
                    <p className="text-xs text-gray-700 leading-relaxed max-w-3xl">
                      {occ.description}
                    </p>

                    {/* Immediate Action Taken Box */}
                    {occ.immediateActionTaken && (
                      <div className="mt-2 text-xs bg-amber-50/70 text-amber-900 border-l-2 border-amber-400 px-3 py-1.5 rounded-r">
                        <span className="font-semibold text-amber-800">Action Taken: </span>
                        {occ.immediateActionTaken}
                      </div>
                    )}

                    {/* Resolution Notes Box if resolved */}
                    {occ.resolutionNotes && (
                      <div className="mt-2 text-xs bg-emerald-50/70 text-emerald-900 border-l-2 border-emerald-400 px-3 py-1.5 rounded-r">
                        <span className="font-semibold text-emerald-800">Resolution ({occ.resolvedBy || 'Admin'}): </span>
                        {occ.resolutionNotes}
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">person</span>
                        Reported by: <strong className="text-gray-700">{occ.reportedByTeacherName}</strong> ({occ.reportedByRole || 'Teacher'})
                      </span>

                      {occ.studentNames && occ.studentNames.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">group</span>
                          Learners involved: <strong className="text-gray-700">{occ.studentNames.join(', ')}</strong>
                        </span>
                      )}

                      {occ.parentNotified && (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="material-symbols-outlined text-xs">notifications_active</span>
                          Parent notified ({occ.parentNotificationMethod || 'SMS'})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-1.5 shrink-0 self-start md:self-center">
                    <button
                      onClick={() => setSelectedOccurrenceDetail(occ)}
                      className="p-1.5 text-gray-500 hover:text-[#7a1228] hover:bg-rose-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                      title="View Details"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span className="hidden sm:inline">Details</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedOccurrenceForResolve(occ);
                        setResolveForm({
                          status: occ.status === 'RESOLVED' ? 'RESOLVED' : 'RESOLVED',
                          resolutionNotes: occ.resolutionNotes || '',
                          resolvedBy: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'Deputy Head Teacher' : 'Teacher',
                        });
                        setIsResolveModalOpen(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                      title="Update Status / Action"
                    >
                      <span className="material-symbols-outlined text-base">edit_note</span>
                      <span className="hidden sm:inline">Update Status</span>
                    </button>

                    <button
                      onClick={() => handleDeleteOccurrence(occ.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Record"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECORD INCIDENT MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-[#7a1228] rounded-xl">
                  <span className="material-symbols-outlined">edit_calendar</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Record Occurrence Book Incident</h3>
                  <p className="text-xs text-gray-500">Document an event or incident that happened today</p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOccurrence} className="space-y-4 text-xs">
              {/* Date & Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Date of Incident *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Time of Incident *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:30 AM"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                </div>
              </div>

              {/* Category & Severity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Incident Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as OccurrenceCategory })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  >
                    <option value="DISCIPLINARY">Disciplinary (Fighting, Bullying, Defiance, Absenteeism)</option>
                    <option value="ACCIDENT_INJURY">Accident / Injury (Sports, Playground fall, Cut)</option>
                    <option value="MEDICAL_ILLNESS">Medical / Illness (Sudden illness, Asthma, Fainting)</option>
                    <option value="PROPERTY_DAMAGE_LOSS">Property Damage / Loss (Broken property, Lost item)</option>
                    <option value="SECURITY_SAFETY">Security & Safety (Perimeter, Stranger, Gate issue)</option>
                    <option value="ACADEMIC_CLASSROOM">Academic / Classroom (Disturbance, Homework dispute)</option>
                    <option value="COMMENDATION_GOOD_DEED">Commendation / Good Deed (Honesty, Heroic act)</option>
                    <option value="GENERAL">General Occurrence (Handover note, Routine notice)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Severity Level *</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as OccurrenceSeverity })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  >
                    <option value="LOW">Low (Minor issue, handled immediately on the spot)</option>
                    <option value="MEDIUM">Medium (Noticeable incident requiring monitoring)</option>
                    <option value="HIGH">High (Serious incident requiring deputy/parent attention)</option>
                    <option value="CRITICAL">Critical Emergency (Immediate medical/police/admin alert)</option>
                  </select>
                </div>
              </div>

              {/* Title & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Incident Title / Summary *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Minor Collision on Lower Football Pitch during Break"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Exact Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Playground, Science Lab, Hall"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                </div>
              </div>

              {/* Learner Selector */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Involved Learners (Optional - search and add learners)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type learner name or admission number to select..."
                    value={studentSearchInput}
                    onChange={(e) => setStudentSearchInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                  {filteredStudentsForSelect.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto divide-y divide-gray-100">
                      {filteredStudentsForSelect.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleAddStudentToForm(s)}
                          className="w-full text-left px-3 py-2 hover:bg-rose-50 text-xs flex items-center justify-between"
                        >
                          <span className="font-medium text-gray-800">
                            {s.name || `${s.firstName || ''} ${s.lastName || ''}`}
                          </span>
                          <span className="text-gray-400 font-mono">Adm: {s.admNo || s.admissionNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected learners chips */}
                {form.studentNames.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {form.studentNames.map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-rose-50 text-[#7a1228] border border-rose-200 font-medium"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveStudentFromForm(form.studentIds[i])}
                          className="hover:text-red-800"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Detailed Description of What Happened *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide an objective, clear account of what transpired, who was involved, and circumstances..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                />
              </div>

              {/* Immediate Action Taken & Witnesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Immediate Action Taken</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Administered first aid, escorted to clinic, separated learners, confiscated item..."
                    value={form.immediateActionTaken}
                    onChange={(e) => setForm({ ...form, immediateActionTaken: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Witnesses (Staff or Students)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Tr. Dennis (Duty Teacher), Kevin (Class Prefect)"
                    value={form.witnesses}
                    onChange={(e) => setForm({ ...form, witnesses: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                </div>
              </div>

              {/* Reported By Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reporting Role</label>
                  <select
                    value={form.reportedByRole}
                    onChange={(e) => setForm({ ...form, reportedByRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  >
                    <option value="Teacher on Duty">Teacher on Duty (TOD)</option>
                    <option value="Class Teacher">Class Teacher</option>
                    <option value="Subject Teacher">Subject Teacher</option>
                    <option value="Deputy Head Teacher">Deputy Head Teacher</option>
                    <option value="Head Teacher">Head Teacher / Principal</option>
                    <option value="Guidance Counselor">Guidance & Counseling Head</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reporting Teacher Name</label>
                  <input
                    type="text"
                    value={form.reportedByTeacherName}
                    onChange={(e) => setForm({ ...form, reportedByTeacherName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                  />
                </div>
              </div>

              {/* Parent Notification Options */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notifyParentCheck"
                    checked={form.parentNotified}
                    onChange={(e) => setForm({ ...form, parentNotified: e.target.checked })}
                    className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                  />
                  <label htmlFor="notifyParentCheck" className="font-semibold text-gray-800">
                    Parent / Guardian has been notified (or will be notified)
                  </label>
                </div>

                {form.parentNotified && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-6">
                    <div>
                      <label className="block text-gray-600 mb-0.5">Notification Method</label>
                      <select
                        value={form.parentNotificationMethod}
                        onChange={(e) => setForm({ ...form, parentNotificationMethod: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded bg-white text-xs"
                      >
                        <option value="PHONE_CALL">Phone Call</option>
                        <option value="SMS">SMS Notice</option>
                        <option value="IN_PERSON">In-Person Meeting</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 pt-4">
                      <input
                        type="checkbox"
                        id="sendSmsGateway"
                        checked={form.notifyParentViaSms}
                        onChange={(e) => setForm({ ...form, notifyParentViaSms: e.target.checked })}
                        className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                      />
                      <label htmlFor="sendSmsGateway" className="text-gray-700">
                        Dispatch SMS via Grace Seeds School Gateway
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7a1228] hover:bg-[#600e20] text-white font-bold rounded-lg shadow-sm"
                >
                  Save Occurrence Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS / RESOLUTION MODAL */}
      {isResolveModalOpen && selectedOccurrenceForResolve && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Update Incident Status & Resolution</h3>
                <p className="text-xs text-gray-500">{selectedOccurrenceForResolve.occurrenceNumber}</p>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Current Status</label>
                <select
                  value={resolveForm.status}
                  onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value as OccurrenceStatus })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                >
                  <option value="OPEN">Open (Pending follow-up)</option>
                  <option value="INVESTIGATING">Investigating (Under inquiry)</option>
                  <option value="RESOLVED">Resolved (Case closed)</option>
                  <option value="ESCALATED">Escalated (Referred to Head Teacher / Board)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Resolution & Follow-up Notes</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the final action taken, counseling provided, disciplinary outcome, or current status..."
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Resolved / Handled By</label>
                <input
                  type="text"
                  required
                  value={resolveForm.resolvedBy}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolvedBy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7a1228]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#7a1228] hover:bg-[#600e20] text-white font-bold rounded-lg shadow-sm"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL DETAILS MODAL */}
      {selectedOccurrenceDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="font-mono text-xs font-bold text-gray-500">
                  {selectedOccurrenceDetail.occurrenceNumber}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">
                  {selectedOccurrenceDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOccurrenceDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {getCategoryBadge(selectedOccurrenceDetail.category)}
              {getSeverityBadge(selectedOccurrenceDetail.severity)}
              {getStatusBadge(selectedOccurrenceDetail.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl">
              <div>
                <span className="text-gray-500 font-medium">Date & Time:</span>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {selectedOccurrenceDetail.date} at {selectedOccurrenceDetail.time}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Location:</span>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {selectedOccurrenceDetail.location}
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Reported By:</span>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {selectedOccurrenceDetail.reportedByTeacherName} ({selectedOccurrenceDetail.reportedByRole || 'Teacher'})
                </p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Parent Notified:</span>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {selectedOccurrenceDetail.parentNotified
                    ? `Yes (${selectedOccurrenceDetail.parentNotificationMethod || 'SMS'})`
                    : 'No'}
                </p>
              </div>
            </div>

            {selectedOccurrenceDetail.studentNames && selectedOccurrenceDetail.studentNames.length > 0 && (
              <div>
                <span className="font-semibold text-gray-700">Learners Involved:</span>
                <p className="mt-1 text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {selectedOccurrenceDetail.studentNames.join(', ')}
                </p>
              </div>
            )}

            <div>
              <span className="font-semibold text-gray-700">Narrative Account:</span>
              <p className="mt-1 text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed">
                {selectedOccurrenceDetail.description}
              </p>
            </div>

            {selectedOccurrenceDetail.immediateActionTaken && (
              <div>
                <span className="font-semibold text-amber-800">Immediate Action Taken:</span>
                <p className="mt-1 text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  {selectedOccurrenceDetail.immediateActionTaken}
                </p>
              </div>
            )}

            {selectedOccurrenceDetail.witnesses && (
              <div>
                <span className="font-semibold text-gray-700">Witnesses:</span>
                <p className="mt-1 text-gray-600 bg-gray-50 p-2 rounded-lg">
                  {selectedOccurrenceDetail.witnesses}
                </p>
              </div>
            )}

            {selectedOccurrenceDetail.resolutionNotes && (
              <div>
                <span className="font-semibold text-emerald-800">Resolution & Closure Remarks:</span>
                <div className="mt-1 text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <p className="whitespace-pre-line">{selectedOccurrenceDetail.resolutionNotes}</p>
                  {selectedOccurrenceDetail.resolvedBy && (
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                      Signed off by: {selectedOccurrenceDetail.resolvedBy}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedOccurrenceDetail(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT DAILY OB REGISTER MODAL */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">Official Daily Occurrence Book (OB) Print Sheet</h3>
                <p className="text-xs text-gray-500">Ministry of Education / School Daily Record Sheet</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#7a1228] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print
                </button>
                <button
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Printable Content Container */}
            <div className="p-6 bg-white border border-gray-300 rounded-xl space-y-4 text-xs font-serif print:border-none print:p-0">
              {/* Official School Header */}
              <div className="text-center border-b-2 border-black pb-3 space-y-1">
                <h2 className="text-xl font-bold uppercase tracking-wide">{user?.schoolName || 'GRACE SEEDS SCHOOL'}</h2>
                <h3 className="text-sm font-semibold tracking-wider">DAILY OCCURRENCE BOOK REGISTER (O.B.)</h3>
                <p className="text-xs text-gray-600">
                  Date: <strong>{selectedDate || todayStr}</strong> | Academic Session: <strong>{new Date().getFullYear()}</strong> | Duty Master Daily Handover Sheet
                </p>
              </div>

              {/* Table of Entries */}
              <table className="w-full border-collapse border border-black text-left text-[11px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="border border-black p-1.5 font-bold">OB No.</th>
                    <th className="border border-black p-1.5 font-bold">Time</th>
                    <th className="border border-black p-1.5 font-bold">Category</th>
                    <th className="border border-black p-1.5 font-bold">Incident & Details</th>
                    <th className="border border-black p-1.5 font-bold">Persons Involved</th>
                    <th className="border border-black p-1.5 font-bold">Action Taken & Status</th>
                    <th className="border border-black p-1.5 font-bold">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOccurrences.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-black p-4 text-center text-gray-500 italic">
                        No incidents recorded for this day. Nil returns.
                      </td>
                    </tr>
                  ) : (
                    filteredOccurrences.map((occ) => (
                      <tr key={occ.id} className="border-b border-black">
                        <td className="border border-black p-1.5 font-mono font-bold align-top">
                          {occ.occurrenceNumber}
                        </td>
                        <td className="border border-black p-1.5 align-top whitespace-nowrap">
                          {occ.time}
                        </td>
                        <td className="border border-black p-1.5 align-top uppercase text-[10px]">
                          {occ.category.replace(/_/g, ' ')}
                        </td>
                        <td className="border border-black p-1.5 align-top">
                          <strong>{occ.title}</strong> ({occ.location})
                          <p className="mt-1 text-gray-700">{occ.description}</p>
                        </td>
                        <td className="border border-black p-1.5 align-top">
                          {occ.studentNames && occ.studentNames.length > 0 ? occ.studentNames.join(', ') : 'None'}
                        </td>
                        <td className="border border-black p-1.5 align-top">
                          <p>{occ.immediateActionTaken || 'Logged'}</p>
                          <span className="font-bold uppercase text-[10px] mt-1 block">
                            Status: {occ.status}
                          </span>
                        </td>
                        <td className="border border-black p-1.5 align-top whitespace-nowrap">
                          {occ.reportedByTeacherName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Signatures Footer */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs border-t border-black">
                <div className="space-y-4">
                  <p>
                    Teacher on Duty: <strong>........................................................</strong>
                  </p>
                  <p>Signature & Date: ........................................................</p>
                </div>
                <div className="space-y-4 text-right">
                  <p>
                    Principal / Deputy Head: <strong>........................................................</strong>
                  </p>
                  <p>Official School Stamp: ........................................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
