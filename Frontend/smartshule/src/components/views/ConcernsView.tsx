import React, { useState, useEffect, useMemo } from 'react';
import { ConcernRecord, ConcernMessage, ConcernAttachment, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const CONCERN_CATEGORIES = [
  { id: 'ACADEMIC_CURRICULUM', label: 'Academics & Curriculum', icon: 'menu_book', defaultAssignee: 'Teacher' },
  { id: 'TEACHER_CLASSROOM', label: 'Teacher & Classroom Communication', icon: 'school', defaultAssignee: 'Teacher' },
  { id: 'DISCIPLINE_BEHAVIOUR', label: 'Discipline & Behaviour', icon: 'gavel', defaultAssignee: 'Deputy Head / Admin' },
  { id: 'BULLYING_SAFETY', label: 'Bullying, Safety & Welfare', icon: 'security', defaultAssignee: 'Head Teacher / Admin' },
  { id: 'HEALTH_MEDICAL_DIETARY', label: 'Health, Medical & Dietary', icon: 'medical_services', defaultAssignee: 'School Clinic' },
  { id: 'TRANSPORT', label: 'Transport & Commute', icon: 'directions_bus', defaultAssignee: 'Transport Manager' },
  { id: 'SCHOOL_FEES_FINANCIAL', label: 'School Fees & Billing', icon: 'payments', defaultAssignee: 'Bursar' },
  { id: 'LUNCH_CATERING', label: 'Lunch & Catering', icon: 'restaurant', defaultAssignee: 'Catering Officer' },
  { id: 'CO_CURRICULAR_SPORTS', label: 'Co-Curricular & Sports', icon: 'sports_soccer', defaultAssignee: 'Sports Master' },
  { id: 'FACILITIES_HYGIENE', label: 'Facilities, Sanitation & Hygiene', icon: 'clean_hands', defaultAssignee: 'Facility Admin' },
  { id: 'GENERAL_ENQUIRY_OTHER', label: 'General School Matters / Other', icon: 'help_outline', defaultAssignee: 'School Administration' },
];

export const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon: string }> = {
  SUBMITTED: { label: 'Submitted', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'send' },
  OPEN: { label: 'Submitted', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'send' },
  ACKNOWLEDGED: { label: 'Acknowledged', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: 'mark_email_read' },
  UNDER_REVIEW: { label: 'Under Review', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'pending_actions' },
  IN_REVIEW: { label: 'Under Review', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'pending_actions' },
  INVESTIGATING: { label: 'Under Review', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'search' },
  AWAITING_PARENT_RESPONSE: { label: 'Awaiting Parent Response', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200', icon: 'reply' },
  ESCALATED: { label: 'Escalated', badgeClass: 'bg-red-100 text-red-800 border-red-200', icon: 'priority_high' },
  RESOLVED: { label: 'Resolved', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'task_alt' },
  CLOSED: { label: 'Closed', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200', icon: 'lock' },
  DISMISSED: { label: 'Closed', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200', icon: 'lock' },
  REOPENED: { label: 'Reopened', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200', icon: 'replay' },
};

export const ConcernsView: React.FC = () => {
  const { user } = useAuth();

  // Role Checks
  const isParent = user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN;
  const isHeadTeacherOrAdmin =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SCHOOL_ADMIN ||
    user?.role === UserRole.HEAD_TEACHER;

  // View States
  const [activeTab, setActiveTab] = useState<'list' | 'submit' | 'analytics'>('list');
  const [concerns, setConcerns] = useState<ConcernRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [overdueFilter, setOverdueFilter] = useState<'ALL' | 'OVERDUE' | 'ON_TRACK'>('ALL');

  // Selected Concern for Detail Drawer / Modal
  const [selectedConcern, setSelectedConcern] = useState<ConcernRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Submission Form State
  const [formData, setFormData] = useState({
    studentId: '',
    category: 'ACADEMIC_CURRICULUM',
    subject: '',
    details: '',
    priority: 'MEDIUM',
    attachmentUrl: '',
    attachmentName: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessRef, setFormSuccessRef] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Interactive Action States on Detail Modal
  const [newMessage, setNewMessage] = useState('');
  const [messageVisibility, setMessageVisibility] = useState<'PARENT_VISIBLE' | 'INTERNAL_ONLY'>('PARENT_VISIBLE');
  const [awaitParentResponse, setAwaitParentResponse] = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState(false);

  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');
  const [showAcknowledgeDialog, setShowAcknowledgeDialog] = useState(false);

  const [assigneeId, setAssigneeId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);

  const [resolveAction, setResolveAction] = useState('');
  const [resolveDetails, setResolveDetails] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const [reopenReason, setReopenReason] = useState('');
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  // 1. Initial Data Loading
  const loadData = async () => {
    setLoading(true);
    try {
      const [concernsRes, statsRes] = await Promise.all([
        apiService.getConcerns(),
        isHeadTeacherOrAdmin ? apiService.getConcernStats().catch(() => null) : Promise.resolve(null),
      ]);

      if (concernsRes.success && Array.isArray(concernsRes.data)) {
        setConcerns(concernsRes.data);
      }
      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }

      // Load children for parent or students for staff
      if (isParent) {
        const portalRes = await apiService.getGuardianPortalData().catch(() => null);
        if (portalRes?.success && portalRes.data?.children) {
          setChildren(portalRes.data.children);
          if (portalRes.data.children.length === 1) {
            setFormData((prev) => ({ ...prev, studentId: portalRes.data.children[0].id }));
          }
        }
      } else {
        const [studentsRes, usersRes] = await Promise.all([
          apiService.getStudents().catch(() => null),
          apiService.getUsers().catch(() => null),
        ]);
        if (studentsRes?.success && Array.isArray(studentsRes.data)) {
          setChildren(studentsRes.data);
        }
        if (usersRes?.success && Array.isArray(usersRes.data)) {
          setStaffUsers(usersRes.data.filter((u: any) => u.role !== UserRole.PARENT && u.role !== UserRole.GUARDIAN));
        }
      }
    } catch (err) {
      console.error('Failed to load concerns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Refresh single concern in detail view
  const refreshSelectedConcern = async (concernId: string) => {
    setDetailLoading(true);
    try {
      const res = await apiService.getConcernById(concernId);
      if (res.success && res.data) {
        setSelectedConcern(res.data);
        setConcerns((prev) => prev.map((c) => (c.id === concernId ? res.data : c)));
      }
    } catch (err) {
      console.error('Failed to refresh concern:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // 2. Concern Submission
  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.subject.trim()) {
      setFormError('Please enter a descriptive subject for your concern.');
      return;
    }
    if (!formData.details.trim()) {
      setFormError('Please describe the concern details (at least 10 characters).');
      return;
    }
    if (isParent && children.length > 0 && !formData.studentId) {
      setFormError('Please select the child this concern relates to.');
      return;
    }

    setFormSubmitting(true);
    try {
      const selectedChild = children.find((c) => c.id === formData.studentId);
      const attachments: ConcernAttachment[] = formData.attachmentUrl.trim()
        ? [
            {
              id: `att-${Date.now()}`,
              name: formData.attachmentName.trim() || 'Supporting Document',
              url: formData.attachmentUrl.trim(),
              type: 'application/pdf',
            },
          ]
        : [];

      const res = await apiService.createConcern({
        studentId: formData.studentId || undefined,
        studentName: selectedChild?.fullName || selectedChild?.name || (selectedChild ? `${selectedChild.firstName || ''} ${selectedChild.lastName || ''}`.trim() : undefined),
        admissionNumber: selectedChild?.admissionNumber,
        gradeLevel: selectedChild?.gradeLevel,
        category: formData.category,
        subject: formData.subject.trim(),
        title: formData.subject.trim(),
        details: formData.details.trim(),
        description: formData.details.trim(),
        priority: formData.priority,
        attachments,
      });

      if (res.success && res.data) {
        setFormSuccessRef(res.data.referenceNumber || res.data.id);
        setFormData({
          studentId: children.length === 1 ? children[0].id : '',
          category: 'ACADEMIC_CURRICULUM',
          subject: '',
          details: '',
          priority: 'MEDIUM',
          attachmentUrl: '',
          attachmentName: '',
        });
        await loadData();
      } else {
        setFormError(res.message || 'Failed to submit concern. Please try again.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving concern.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // 3. Staff Acknowledge
  const handleAcknowledge = async () => {
    if (!selectedConcern) return;
    try {
      const res = await apiService.acknowledgeConcern(selectedConcern.id, acknowledgeNotes.trim() || undefined);
      if (res.success) {
        setShowAcknowledgeDialog(false);
        setAcknowledgeNotes('');
        await refreshSelectedConcern(selectedConcern.id);
      } else {
        alert(res.message || 'Failed to acknowledge concern');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge concern');
    }
  };

  // 4. Staff Assign
  const handleAssign = async () => {
    if (!selectedConcern || !assigneeId) return;
    try {
      const res = await apiService.assignConcern(selectedConcern.id, assigneeId, assignReason.trim() || undefined);
      if (res.success) {
        setShowAssignDialog(false);
        setAssigneeId('');
        setAssignReason('');
        await refreshSelectedConcern(selectedConcern.id);
      } else {
        alert(res.message || 'Failed to assign concern');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign concern');
    }
  };

  // 5. Staff Escalate
  const handleEscalate = async () => {
    if (!selectedConcern || !escalateReason.trim()) return;
    try {
      const res = await apiService.escalateConcern(selectedConcern.id, escalateReason.trim());
      if (res.success) {
        setShowEscalateDialog(false);
        setEscalateReason('');
        await refreshSelectedConcern(selectedConcern.id);
      } else {
        alert(res.message || 'Failed to escalate concern');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to escalate concern');
    }
  };

  // 6. Two-Way Messaging
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcern || !newMessage.trim()) return;

    setSubmittingMessage(true);
    try {
      const visibility = isParent ? 'PARENT_VISIBLE' : messageVisibility;
      const res = await apiService.sendConcernMessage(
        selectedConcern.id,
        newMessage.trim(),
        visibility,
        undefined,
        awaitParentResponse
      );

      if (res.success) {
        setNewMessage('');
        setAwaitParentResponse(false);
        await refreshSelectedConcern(selectedConcern.id);
      } else {
        alert(res.message || 'Failed to send message');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSubmittingMessage(false);
    }
  };

  // 7. Resolve Concern
  const handleResolve = async () => {
    if (!selectedConcern || !resolveAction.trim()) return;
    try {
      const res = await apiService.resolveConcern(
        selectedConcern.id,
        resolveAction.trim(),
        resolveDetails.trim() || undefined
      );
      if (res.success) {
        setShowResolveDialog(false);
        setResolveAction('');
        setResolveDetails('');
        await refreshSelectedConcern(selectedConcern.id);
      } else {
        alert(res.message || 'Failed to resolve concern');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve concern');
    }
  };

  // 8. Reopen Concern (Parent or Staff)
  const handleReopen = async () => {
    if (!selectedConcern || !reopenReason.trim()) return;
    try {
      const res = await apiService.reopenConcern(selectedConcern.id, reopenReason.trim());
      if (res.success) {
        setShowReopenDialog(false);
        setReopenReason('');
        await refreshSelectedConcern(selectedConcern.id);
      } else {
        alert(res.message || 'Failed to reopen concern');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reopen concern');
    }
  };

  // Filtered Concerns calculation
  const filteredConcerns = useMemo(() => {
    return concerns.filter((c) => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesRef = c.referenceNumber?.toLowerCase().includes(q);
        const matchesSubj = c.subject?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
        const matchesChild = c.studentName?.toLowerCase().includes(q);
        const matchesParent = c.parentName?.toLowerCase().includes(q) || c.complainantName?.toLowerCase().includes(q);
        if (!matchesRef && !matchesSubj && !matchesChild && !matchesParent) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        const currentNorm = c.status?.toUpperCase();
        if (statusFilter === 'ACTIVE') {
          if (currentNorm === 'RESOLVED' || currentNorm === 'CLOSED' || currentNorm === 'DISMISSED') return false;
        } else if (currentNorm !== statusFilter) {
          return false;
        }
      }

      // Category Filter
      if (categoryFilter !== 'ALL') {
        if (c.category !== categoryFilter) return false;
      }

      // Priority Filter
      if (priorityFilter !== 'ALL') {
        if (c.priority?.toUpperCase() !== priorityFilter) return false;
      }

      // Overdue Filter
      if (overdueFilter === 'OVERDUE' && !c.isOverdue) return false;
      if (overdueFilter === 'ON_TRACK' && c.isOverdue) return false;

      return true;
    });
  }, [concerns, searchTerm, statusFilter, categoryFilter, priorityFilter, overdueFilter]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = concerns.length;
    const active = concerns.filter((c) => !['RESOLVED', 'CLOSED', 'DISMISSED'].includes(c.status?.toUpperCase())).length;
    const resolved = concerns.filter((c) => c.status?.toUpperCase() === 'RESOLVED').length;
    const escalated = concerns.filter((c) => c.status?.toUpperCase() === 'ESCALATED').length;
    const awaitingParent = concerns.filter((c) => c.status?.toUpperCase() === 'AWAITING_PARENT_RESPONSE').length;
    const overdue = concerns.filter((c) => c.isOverdue).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return { total, active, resolved, escalated, awaitingParent, overdue, resolutionRate };
  }, [concerns]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#7a1228] to-[#9e1c38] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <span className="material-symbols-outlined text-[160px]">support_agent</span>
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2 text-white/80 font-bold uppercase text-xs tracking-wider">
            <span className="material-symbols-outlined text-base">verified_user</span>
            <span>{isParent ? 'Parent Communication & Issue Resolution' : 'School Case Management Pipeline'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-2">
            {isParent ? 'Daily Homefun & Parent Concern Pipeline' : 'Parent Concern Management & Resolution Desk'}
          </h1>
          <p className="text-sm md:text-base text-white/90 leading-relaxed">
            {isParent
              ? 'Raise, track and communicate with school educators and administrators regarding your learners. Every concern is assigned a unique tracking reference, guaranteed response deadlines, and an auditable investigation log.'
              : 'Centrally receive, investigate, assign, escalate and ratify parent concerns across CBC grades with strict role-based isolation, two-way messaging, and response-deadline enforcement.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'list'
                  ? 'bg-white text-[#7a1228] shadow'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_list</span>
              <span>{isParent ? 'My Tracked Concerns' : 'Active Concerns Queue'}</span>
              <span className="ml-1 bg-[#7a1228] text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {concerns.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'submit'
                  ? 'bg-white text-[#7a1228] shadow'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>{isParent ? 'Log New Concern' : 'Register Parent Concern'}</span>
            </button>

            {!isParent && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'bg-white text-[#7a1228] shadow'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <span className="material-symbols-outlined text-sm">analytics</span>
                <span>SLA & Resolution Analytics</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards (Visible to Staff & Admins) */}
      {!isParent && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-bold uppercase">Total Logged</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{metrics.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">All CBC matters</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-blue-50/30">
            <div className="text-xs text-blue-700 font-bold uppercase">Active Pipeline</div>
            <div className="text-2xl font-black text-blue-800 mt-1">{metrics.active}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">Under investigation</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm bg-red-50/30">
            <div className="text-xs text-red-700 font-bold uppercase">Escalated</div>
            <div className="text-2xl font-black text-red-800 mt-1">{metrics.escalated}</div>
            <div className="text-[10px] text-red-600 mt-0.5">Senior review</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/30">
            <div className="text-xs text-amber-700 font-bold uppercase">SLA Overdue</div>
            <div className="text-2xl font-black text-amber-800 mt-1">{metrics.overdue}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Deadline exceeded</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm bg-purple-50/30">
            <div className="text-xs text-purple-700 font-bold uppercase">Awaiting Parent</div>
            <div className="text-2xl font-black text-purple-800 mt-1">{metrics.awaitingParent}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Feedback requested</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
            <div className="text-xs text-emerald-700 font-bold uppercase">Resolved Cases</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{metrics.resolved}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Ratified & closed</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm bg-slate-50/50">
            <div className="text-xs text-slate-700 font-bold uppercase">Resolution Rate</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{metrics.resolutionRate}%</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Performance index</div>
          </div>
        </div>
      )}

      {/* TAB 1: LIST VIEW */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder={isParent ? 'Search by reference number, subject or child name...' : 'Search reference, learner, category or parent...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#7a1228] focus:border-[#7a1228] outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:ring-2 focus:ring-[#7a1228] outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Cases Only</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="AWAITING_PARENT_RESPONSE">Awaiting Parent</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:ring-2 focus:ring-[#7a1228] outline-none max-w-[180px] truncate"
              >
                <option value="ALL">All Categories</option>
                {CONCERN_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-medium focus:ring-2 focus:ring-[#7a1228] outline-none"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent (Safety)</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* SLA Filter */}
              {!isParent && (
                <button
                  onClick={() => setOverdueFilter(overdueFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    overdueFilter === 'OVERDUE'
                      ? 'bg-red-600 text-white border-red-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Overdue Only</span>
                </button>
              )}
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-[#7a1228] animate-spin">refresh</span>
              <p className="mt-2 text-xs font-bold text-slate-600">Loading concerns registry...</p>
            </div>
          ) : filteredConcerns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">task_alt</span>
              <h3 className="mt-2 text-sm font-bold text-slate-800">No Concerns Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {isParent
                  ? 'You currently have no open or resolved concerns matching your filter criteria. Use the "Log New Concern" button to reach out to the school.'
                  : 'No concerns match the selected criteria.'}
              </p>
              {isParent && (
                <button
                  onClick={() => setActiveTab('submit')}
                  className="mt-4 px-4 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-xl shadow hover:bg-[#9e1c38] transition-all"
                >
                  Log New Concern
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Ref Number</th>
                      <th className="py-3 px-4">Learner / Grade</th>
                      <th className="py-3 px-4">Category & Subject</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Response SLA</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredConcerns.map((c) => {
                      const statusDef = STATUS_CONFIG[c.status?.toUpperCase()] || STATUS_CONFIG.SUBMITTED;
                      const catDef = CONCERN_CATEGORIES.find((cat) => cat.id === c.category) || {
                        label: c.category || 'General',
                        icon: 'help_outline',
                      };

                      return (
                        <tr
                          key={c.id}
                          onClick={() => {
                            setSelectedConcern(c);
                            refreshSelectedConcern(c.id);
                          }}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          {/* Reference Number */}
                          <td className="py-3.5 px-4 font-mono font-black text-[#7a1228]">
                            {c.referenceNumber || `CON-${c.id.slice(0, 8)}`}
                            <div className="text-[10px] text-slate-400 font-sans font-normal">
                              {new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>

                          {/* Child / Learner */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">
                              {c.studentName || 'Unspecified Learner'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.gradeLevel || 'CBC Grade'} {c.admissionNumber ? `• Adm: ${c.admissionNumber}` : ''}
                            </div>
                          </td>

                          {/* Category & Subject */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                              <span className="material-symbols-outlined text-[13px] text-[#7a1228]">{catDef.icon}</span>
                              <span>{catDef.label}</span>
                            </div>
                            <div className="font-bold text-slate-900 truncate">
                              {c.subject || c.title || 'Concern Inquiry'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {c.details || c.description || ''}
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                c.priority?.toUpperCase() === 'URGENT'
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : c.priority?.toUpperCase() === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : c.priority?.toUpperCase() === 'LOW'
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {c.priority?.toUpperCase() === 'URGENT' ? 'warning' : 'flag'}
                              </span>
                              {c.priority || 'MEDIUM'}
                            </span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusDef.badgeClass}`}
                            >
                              <span className="material-symbols-outlined text-[12px]">{statusDef.icon}</span>
                              {statusDef.label}
                            </span>
                          </td>

                          {/* SLA / Overdue Status */}
                          <td className="py-3.5 px-4">
                            {c.status?.toUpperCase() === 'RESOLVED' || c.status?.toUpperCase() === 'CLOSED' ? (
                              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">verified</span>
                                Case Closed
                              </span>
                            ) : c.isOverdue ? (
                              <span className="text-[11px] font-black text-red-600 flex items-center gap-1 animate-pulse">
                                <span className="material-symbols-outlined text-sm">error</span>
                                Overdue SLA
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-cyan-600">timer</span>
                                On Track
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConcern(c);
                                refreshSelectedConcern(c.id);
                              }}
                              className="px-3 py-1.5 bg-[#7a1228]/10 text-[#7a1228] hover:bg-[#7a1228] hover:text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <span>View Case</span>
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMIT CONCERN FORM */}
      {activeTab === 'submit' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isParent ? 'Raise a Concern for Your Child' : 'Record Parent Concern / Inquiry'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isParent
                  ? 'Your concern will be securely routed to the designated school educator and administrative office.'
                  : 'Ensure the correct student profile is linked for transparent record-keeping.'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('list')}
              className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

          {formSuccessRef && (
            <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-900">Concern Submitted Successfully!</h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Your unique tracking reference number is:
                  </p>
                  <div className="mt-2 inline-block px-3 py-1 bg-white border border-emerald-300 font-mono font-black text-sm text-emerald-950 rounded-lg shadow-sm">
                    {formSuccessRef}
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-2">
                    The administration has received this concern and an acknowledgment will be logged shortly. You can track all responses in real-time.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setFormSuccessRef(null);
                        setActiveTab('list');
                      }}
                      className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 shadow-sm"
                    >
                      View in My Concerns
                    </button>
                    <button
                      onClick={() => setFormSuccessRef(null)}
                      className="px-4 py-2 bg-white text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-50"
                    >
                      Log Another Concern
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {formError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-red-600">error</span>
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitConcern} className="space-y-4">
            {/* Child Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Learner / Child <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#7a1228] outline-none"
              >
                <option value="">-- Choose child --</option>
                {children.map((child: any) => {
                  const childName = child.fullName || child.name || `${child.firstName || ''} ${child.lastName || ''}`.trim();
                  return (
                    <option key={child.id} value={child.id}>
                      {childName} ({child.gradeLevel || 'CBC'} {child.admissionNumber ? `- Adm: ${child.admissionNumber}` : ''})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Concern Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Concern Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#7a1228] outline-none"
              >
                {CONCERN_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} (Assigned to: {cat.defaultAssignee})
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency / Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Priority / Urgency Level
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: 'LOW', label: 'Low', desc: 'General enquiry' },
                  { id: 'MEDIUM', label: 'Medium', desc: 'Standard attention' },
                  { id: 'HIGH', label: 'High', desc: 'Urgent resolution' },
                  { id: 'URGENT', label: 'Urgent', desc: 'Safety / Critical' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.id })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formData.priority === p.id
                        ? 'border-[#7a1228] bg-[#7a1228]/5 text-[#7a1228] ring-1 ring-[#7a1228]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-black text-xs">{p.label}</div>
                    <div className="text-[10px] text-slate-500">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Subject / Summary <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Inquiries regarding Grade 4 Mathematics homework or Bus delay on Route 2"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#7a1228] outline-none"
              />
            </div>

            {/* Details */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Detailed Explanation & Request <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Please describe what happened, dates, educators involved, and what specific assistance or resolution you are seeking..."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#7a1228] outline-none"
              />
            </div>

            {/* Supporting Attachment URL (Optional) */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supporting Attachment / Document Link (Optional)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Provide an image link, PDF, medical note, receipt or scanned document supporting your concern.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Document Name (e.g. Doctor's Note)"
                  value={formData.attachmentName}
                  onChange={(e) => setFormData({ ...formData, attachmentName: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#7a1228] outline-none"
                />
                <input
                  type="url"
                  placeholder="Attachment URL (https://...)"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#7a1228] outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-3 bg-[#7a1228] text-white font-black text-xs rounded-xl shadow-md hover:bg-[#9e1c38] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {formSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    <span>Submitting Concern...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Submit Concern Securely</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SLA & RESOLUTION ANALYTICS (Staff Only) */}
      {activeTab === 'analytics' && !isParent && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7a1228]">analytics</span>
              <span>Case Resolution & SLA Compliance Breakdown</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category Breakdown */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Cases by Category
                </h4>
                <div className="space-y-2">
                  {CONCERN_CATEGORIES.map((cat) => {
                    const count = concerns.filter((c) => c.category === cat.id).length;
                    const pct = concerns.length > 0 ? Math.round((count / concerns.length) * 100) : 0;
                    return (
                      <div key={cat.id} className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-600 truncate max-w-[180px]">{cat.label}</span>
                          <span className="font-bold text-slate-800">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#7a1228] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Lifecycle Distribution
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(STATUS_CONFIG).slice(0, 8).map(([stKey, stVal]) => {
                    const count = concerns.filter((c) => c.status?.toUpperCase() === stKey).length;
                    if (count === 0 && ['OPEN', 'IN_REVIEW', 'DISMISSED'].includes(stKey)) return null;
                    return (
                      <div key={stKey} className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stVal.badgeClass}`}>
                          {stVal.label}
                        </span>
                        <span className="font-black text-slate-800">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SLA & Time Metrics */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  SLA Target Adherence
                </h4>
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Average Response Time</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">
                      {stats?.avgResponseTimeHours ? `${stats.avgResponseTimeHours} hrs` : '< 24 hrs'}
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-1">Target SLA: 24h Acknowledgement</div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Average Case Resolution Time</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">
                      {stats?.avgResolutionTimeHours ? `${stats.avgResolutionTimeHours} hrs` : '~ 48 hrs'}
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-1">Target SLA: 72h Final Resolution</div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500">Overdue Concerns Requiring Action</div>
                    <div className="text-xl font-black text-red-600 mt-0.5">{metrics.overdue}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Immediate intervention required</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL & RESOLUTION MODAL */}
      {selectedConcern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Top Header */}
            <div className="bg-[#7a1228] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl">chat_bubble</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm tracking-wider">
                      {selectedConcern.referenceNumber || `CON-${selectedConcern.id.slice(0, 8)}`}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        STATUS_CONFIG[selectedConcern.status?.toUpperCase()]?.badgeClass || 'bg-white/20 text-white'
                      }`}
                    >
                      {STATUS_CONFIG[selectedConcern.status?.toUpperCase()]?.label || selectedConcern.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5 max-w-xl truncate">
                    {selectedConcern.subject || selectedConcern.title || 'Concern Inquiry'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedConcern(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
              {/* Concern Overview Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Learner</span>
                  <div className="font-black text-slate-900 text-sm mt-0.5">
                    {selectedConcern.studentName || 'Learner'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedConcern.gradeLevel || 'CBC Grade'} {selectedConcern.admissionNumber ? `• Adm: ${selectedConcern.admissionNumber}` : ''}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Complainant / Parent</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedConcern.parentName || selectedConcern.complainantName || 'Parent / Guardian'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedConcern.parentPhone || selectedConcern.complainantPhone || 'Phone on file'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Staff</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedConcern.assignedToName || 'Unassigned'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedConcern.assignedToRole || 'Awaiting dispatch'}
                  </div>
                </div>
              </div>

              {/* Full Details & Attachments */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2">
                  Original Concern Description
                </h4>
                <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedConcern.details || selectedConcern.description}
                </p>

                {selectedConcern.attachments && selectedConcern.attachments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Supporting Attachments ({selectedConcern.attachments.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedConcern.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all border border-slate-200"
                        >
                          <span className="material-symbols-outlined text-sm text-[#7a1228]">attach_file</span>
                          <span>{att.name}</span>
                          <span className="material-symbols-outlined text-[10px] text-slate-400">open_in_new</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chronological Message Thread */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#7a1228]">forum</span>
                  <span>Two-Way Communication Thread & Investigation Log</span>
                </h4>

                {detailLoading ? (
                  <div className="text-center py-6 text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-2xl">refresh</span>
                    <p className="text-xs mt-1">Syncing thread...</p>
                  </div>
                ) : !selectedConcern.messages || selectedConcern.messages.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 text-xs">
                    No communication messages have been posted on this concern yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedConcern.messages.map((m) => {
                      const isInternal = m.visibility === 'INTERNAL_ONLY';
                      const isFromParent = m.senderRole === 'PARENT' || m.senderRole === 'GUARDIAN';

                      return (
                        <div
                          key={m.id}
                          className={`p-4 rounded-xl border ${
                            isInternal
                              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                              : isFromParent
                              ? 'bg-blue-50/60 border-blue-200 text-blue-950 ml-0 md:mr-12'
                              : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 ml-0 md:ml-12'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs">{m.senderName}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  isInternal
                                    ? 'bg-amber-200 text-amber-900'
                                    : isFromParent
                                    ? 'bg-blue-200 text-blue-900'
                                    : 'bg-emerald-200 text-emerald-900'
                                }`}
                              >
                                {isInternal ? 'Confidential Staff Note' : m.senderRole}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(m.createdAt).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Message Reply Input */}
              {selectedConcern.status !== 'CLOSED' && (
                <form onSubmit={handleSendMessage} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      {isParent ? 'Send a Message / Provide Additional Information' : 'Post Reply / Investigation Note'}
                    </span>

                    {!isParent && (
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-600 font-bold">
                          <input
                            type="radio"
                            name="visibility"
                            checked={messageVisibility === 'PARENT_VISIBLE'}
                            onChange={() => setMessageVisibility('PARENT_VISIBLE')}
                          />
                          <span>Parent-Visible Message</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-amber-800 font-bold">
                          <input
                            type="radio"
                            name="visibility"
                            checked={messageVisibility === 'INTERNAL_ONLY'}
                            onChange={() => setMessageVisibility('INTERNAL_ONLY')}
                          />
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">lock</span>
                            Internal Staff Note Only
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    placeholder={
                      isParent
                        ? 'Type your message to the school administration regarding this concern...'
                        : messageVisibility === 'INTERNAL_ONLY'
                        ? 'Enter confidential investigation remarks (strictly invisible to parent)...'
                        : 'Enter formal message/update sent directly to parent portal and SMS...'
                    }
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-[#7a1228] outline-none"
                  />

                  <div className="flex items-center justify-between pt-1">
                    {!isParent && messageVisibility === 'PARENT_VISIBLE' && (
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={awaitParentResponse}
                          onChange={(e) => setAwaitParentResponse(e.target.checked)}
                          className="rounded text-[#7a1228]"
                        />
                        <span>Require Parent Response (changes status to Awaiting Parent Response)</span>
                      </label>
                    )}
                    {isParent && <div />}

                    <button
                      type="submit"
                      disabled={submittingMessage || !newMessage.trim()}
                      className="px-4 py-2 bg-[#7a1228] text-white font-bold text-xs rounded-xl hover:bg-[#9e1c38] shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>{isParent ? 'Send Reply' : 'Post Message'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {/* Staff Actions */}
                  {!isParent && isHeadTeacherOrAdmin && selectedConcern.status === 'SUBMITTED' && (
                    <button
                      onClick={() => setShowAcknowledgeDialog(true)}
                      className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">mark_email_read</span>
                      <span>Acknowledge Concern</span>
                    </button>
                  )}

                  {!isParent && isHeadTeacherOrAdmin && (
                    <button
                      onClick={() => setShowAssignDialog(true)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">assignment_ind</span>
                      <span>{selectedConcern.assignedToUserId ? 'Reassign Staff' : 'Assign Staff'}</span>
                    </button>
                  )}

                  {!isParent && selectedConcern.status !== 'ESCALATED' && selectedConcern.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setShowEscalateDialog(true)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">priority_high</span>
                      <span>Escalate to Admin</span>
                    </button>
                  )}

                  {!isParent && isHeadTeacherOrAdmin && selectedConcern.status !== 'RESOLVED' && (
                    <button
                      onClick={() => setShowResolveDialog(true)}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>Mark as Resolved</span>
                    </button>
                  )}
                </div>

                {/* Parent Reopen Button */}
                {(selectedConcern.status === 'RESOLVED' || selectedConcern.status === 'CLOSED') && (
                  <button
                    onClick={() => setShowReopenDialog(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">replay</span>
                    <span>Reopen Concern</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Acknowledge */}
      {showAcknowledgeDialog && selectedConcern && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-sm">Acknowledge Concern #{selectedConcern.referenceNumber}</h4>
            <p className="text-xs text-slate-600">
              Acknowledging stamps the concern with the current timestamp and sends an automatic notification to the parent confirming investigation has commenced.
            </p>
            <textarea
              rows={2}
              placeholder="Optional notes for parent or audit log..."
              value={acknowledgeNotes}
              onChange={(e) => setAcknowledgeNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAcknowledgeDialog(false)} className="px-3 py-1.5 text-xs text-slate-600 font-bold">
                Cancel
              </button>
              <button onClick={handleAcknowledge} className="px-4 py-1.5 bg-cyan-700 text-white rounded-xl text-xs font-bold shadow">
                Confirm Acknowledgment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Assign Staff */}
      {showAssignDialog && selectedConcern && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-sm">Assign Staff to Concern #{selectedConcern.referenceNumber}</h4>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white"
              >
                <option value="">-- Choose Staff Member --</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim()} ({u.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assignment / Investigation Instructions</label>
              <textarea
                rows={2}
                placeholder="Specific guidance for the assigned educator or officer..."
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAssignDialog(false)} className="px-3 py-1.5 text-xs text-slate-600 font-bold">
                Cancel
              </button>
              <button
                disabled={!assigneeId}
                onClick={handleAssign}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
              >
                Assign Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Escalate */}
      {showEscalateDialog && selectedConcern && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-sm text-red-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined">priority_high</span>
              <span>Escalate Concern #{selectedConcern.referenceNumber}</span>
            </h4>
            <p className="text-xs text-slate-600">
              Escalating routes this concern directly to Senior Administration & Head Teacher with High priority. A clear escalation reason is mandatory.
            </p>
            <textarea
              rows={3}
              placeholder="Mandatory explanation for escalation (e.g. Unresolved safety issue, repeated grievance)..."
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              required
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEscalateDialog(false)} className="px-3 py-1.5 text-xs text-slate-600 font-bold">
                Cancel
              </button>
              <button
                disabled={!escalateReason.trim()}
                onClick={handleEscalate}
                className="px-4 py-1.5 bg-red-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Resolve */}
      {showResolveDialog && selectedConcern && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-sm text-emerald-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined">check_circle</span>
              <span>Resolve Concern #{selectedConcern.referenceNumber}</span>
            </h4>
            <p className="text-xs text-slate-600">
              Specify the corrective action taken. This will be stamped into the permanent audit ledger and transmitted to the parent.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Action Taken <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Remedial support session arranged, fee statement adjusted"
                value={resolveAction}
                onChange={(e) => setResolveAction(e.target.value)}
                required
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Additional Resolution Notes</label>
              <textarea
                rows={3}
                placeholder="Elaborate on any agreed preventative measures or follow-up timelines..."
                value={resolveDetails}
                onChange={(e) => setResolveDetails(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowResolveDialog(false)} className="px-3 py-1.5 text-xs text-slate-600 font-bold">
                Cancel
              </button>
              <button
                disabled={!resolveAction.trim()}
                onClick={handleResolve}
                className="px-4 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
              >
                Ratify & Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: Reopen */}
      {showReopenDialog && selectedConcern && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-black text-slate-900 text-sm text-orange-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined">replay</span>
              <span>Reopen Concern #{selectedConcern.referenceNumber}</span>
            </h4>
            <p className="text-xs text-slate-600">
              Please explain why this concern requires reopening (e.g. agreed action not completed, recurrence of the issue). A mandatory reason is required.
            </p>
            <textarea
              rows={3}
              placeholder="State the reason why this issue is not fully settled..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              required
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReopenDialog(false)} className="px-3 py-1.5 text-xs text-slate-600 font-bold">
                Cancel
              </button>
              <button
                disabled={!reopenReason.trim()}
                onClick={handleReopen}
                className="px-4 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
              >
                Reopen Concern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
