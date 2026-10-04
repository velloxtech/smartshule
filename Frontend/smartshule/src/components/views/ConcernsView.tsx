import React, { useState, useEffect } from 'react';
import { ConcernRecord, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const ConcernsView: React.FC = () => {
  const { user } = useAuth();
  const [concerns, setConcerns] = useState<ConcernRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('history');

  // Search & Filter state for Admin / Director
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_REVIEW' | 'RESOLVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Response Modal / Form state
  const [selectedConcern, setSelectedConcern] = useState<ConcernRecord | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<'PENDING' | 'IN_REVIEW' | 'RESOLVED'>('RESOLVED');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // New Concern Form state for Parent
  const [formData, setFormData] = useState({
    category: 'General' as ConcernRecord['category'],
    studentName: '',
    gradeLevel: '',
    subject: '',
    details: '',
    priority: 'Medium' as ConcernRecord['priority'],
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Determine user authorization
  const isAdminOrDirector =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SCHOOL_ADMIN;

  const isParent = user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN;

  const isAuthorized = isAdminOrDirector || isParent;

  // Load concerns from API
  const loadConcerns = async () => {
    setLoading(true);
    try {
      const res = await apiService.getConcerns();
      if (res.success && Array.isArray(res.data)) {
        setConcerns(res.data);
      }
    } catch (error) {
      console.error('Failed to load concerns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadConcerns();
    }
  }, [user]);

  // Handle Parent Concern Submission
  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.details.trim()) {
      alert('Please fill in both subject and concern details.');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await apiService.createConcern({
        parentUserId: user?.id || 'parent-id',
        parentName: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Parent / Guardian',
        parentEmail: user?.email || '',
        parentPhone: user?.phone || '',
        studentName: formData.studentName.trim(),
        gradeLevel: formData.gradeLevel.trim(),
        category: formData.category,
        subject: formData.subject.trim(),
        details: formData.details.trim(),
        priority: formData.priority,
      });

      if (res.success) {
        setSuccessMessage('Your concern has been submitted confidentially to the Director & Administration.');
        setFormData({
          category: 'General',
          studentName: '',
          gradeLevel: '',
          subject: '',
          details: '',
          priority: 'Medium',
        });
        await loadConcerns();
        setTimeout(() => setSuccessMessage(''), 5000);
        if (isParent) setActiveTab('history');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit concern.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Admin Response Submission
  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcern) return;
    if (!responseText.trim()) {
      alert('Please enter a response message.');
      return;
    }

    setSubmittingResponse(true);
    try {
      const responderLabel = user?.role === UserRole.ADMIN ? 'School Director' : 'School Administration';
      const res = await apiService.respondToConcern(
        selectedConcern.id,
        responseText.trim(),
        responseStatus,
        responderLabel
      );

      if (res.success) {
        alert('Response saved successfully.');
        setSelectedConcern(null);
        setResponseText('');
        await loadConcerns();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save response.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Handle Delete Concern (Admin only)
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this concern record?')) return;
    try {
      const res = await apiService.deleteConcern(id);
      if (res.success) {
        setConcerns((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete concern.');
    }
  };

  // If user role is not authorized (e.g. Teacher, Bursar, Admissions, Student, etc.)
  if (!isAuthorized) {
    return (
      <div className="p-8 my-8 text-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-4 max-w-lg mx-auto shadow-sm">
        <span className="material-symbols-outlined text-[54px] text-rose-700">lock</span>
        <h3 className="text-lg font-bold">Confidential Access Restricted</h3>
        <p className="text-xs text-rose-800 leading-relaxed">
          The Parent Concerns desk is strictly confidential. Only Parents, School Directors, and School Administrators are authorized to view or manage concern records.
        </p>
      </div>
    );
  }

  // Filter concerns list
  const userConcerns = isParent
    ? concerns.filter(
        (c) =>
          (c.parentUserId && (c.parentUserId === user?.id || c.parentUserId === user?.userId)) ||
          (c.parentEmail && user?.email && c.parentEmail.toLowerCase() === user.email.toLowerCase())
      )
    : concerns;

  const filteredConcerns = userConcerns.filter((item) => {
    const matchesSearch =
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.studentName && item.studentName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const pendingCount = concerns.filter((c) => c.status === 'PENDING').length;
  const inReviewCount = concerns.filter((c) => c.status === 'IN_REVIEW').length;
  const resolvedCount = concerns.filter((c) => c.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">rate_review</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Parent Concerns & Feedback</h1>
            <p className="text-xs text-gray-500">
              {isAdminOrDirector
                ? 'Confidential portal to review and address concerns submitted by parents.'
                : 'Submit confidential concerns directly to the School Director & Administration.'}
            </p>
          </div>
        </div>

        {/* Action Toggle for Parents */}
        {isParent && (
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-[#7a1228] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Concerns ({userConcerns.length})
            </button>
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'submit'
                  ? 'bg-[#7a1228] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              + Submit Concern
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 text-xs font-semibold animate-fadeIn">
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Admin Summary Stats */}
      {isAdminOrDirector && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-gray-500">Total Concerns</span>
              <p className="text-2xl font-bold text-gray-900">{concerns.length}</p>
            </div>
            <span className="material-symbols-outlined text-[32px] text-gray-400">inbox</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-amber-800">Pending Review</span>
              <p className="text-2xl font-bold text-amber-900">{pendingCount}</p>
            </div>
            <span className="material-symbols-outlined text-[32px] text-amber-500">hourglass_top</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/40 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-sky-800">In Progress</span>
              <p className="text-2xl font-bold text-sky-900">{inReviewCount}</p>
            </div>
            <span className="material-symbols-outlined text-[32px] text-sky-500">sync</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-emerald-800">Resolved</span>
              <p className="text-2xl font-bold text-emerald-900">{resolvedCount}</p>
            </div>
            <span className="material-symbols-outlined text-[32px] text-emerald-500">check_circle</span>
          </div>
        </div>
      )}

      {/* Parent Form: Submit New Concern */}
      {(isParent && activeTab === 'submit') && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7a1228]">edit_note</span>
              Share a Concern with Director & Administration
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Your message will be delivered directly to the School Director. Please provide clear details.
            </p>
          </div>

          <form onSubmit={handleSubmitConcern} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                  required
                >
                  <option value="General">General Concern</option>
                  <option value="Academic">Academic & Learning</option>
                  <option value="Transport">School Bus & Transport</option>
                  <option value="Fee & Finance">Fees & Financial Ledger</option>
                  <option value="Discipline">Discipline & Conduct</option>
                  <option value="Facilities">Facilities & Hygiene</option>
                  <option value="Other">Other Issues</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Urgency Level</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                >
                  <option value="Low">Low - Informational</option>
                  <option value="Medium">Medium - Normal Attention</option>
                  <option value="High">High - High Importance</option>
                  <option value="Urgent">Urgent - Immediate Action Required</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Child / Learner Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Kevin Kamau"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Grade / Class (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 7 East"
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Subject / Summary Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Brief title of your concern"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Detailed Concern <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Describe your concern clearly..."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                required
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-6 py-2 rounded-xl bg-[#7a1228] hover:bg-[#5a0c1d] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {formSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    Submit Concern
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Concern List View (For Admin/Director or Parent History) */}
      {(isAdminOrDirector || (isParent && activeTab === 'history')) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search concern, parent or learner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
              >
                <option value="ALL">All Categories</option>
                <option value="Academic">Academic</option>
                <option value="Transport">Transport</option>
                <option value="Fee & Finance">Fee & Finance</option>
                <option value="Discipline">Discipline</option>
                <option value="Facilities">Facilities</option>
                <option value="General">General</option>
              </select>

              <div className="flex items-center gap-1 p-1 bg-white border border-gray-300 rounded-xl">
                {(['ALL', 'PENDING', 'IN_REVIEW', 'RESOLVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#7a1228] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st === 'IN_REVIEW' ? 'In Review' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="p-12 text-center text-gray-500 space-y-2">
              <span className="material-symbols-outlined text-[36px] animate-spin text-[#7a1228]">
                progress_activity
              </span>
              <p className="text-xs font-semibold">Loading concern records...</p>
            </div>
          ) : filteredConcerns.length === 0 ? (
            <div className="p-12 text-center text-gray-500 space-y-3">
              <span className="material-symbols-outlined text-[48px] text-gray-300">task_alt</span>
              <p className="text-sm font-bold text-gray-700">No concerns found</p>
              <p className="text-xs text-gray-400">
                {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'Try adjusting your search or status filters.'
                  : 'There are currently no concerns filed.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConcerns.map((item) => {
                const isPending = item.status === 'PENDING';
                const isInReview = item.status === 'IN_REVIEW';
                const isResolved = item.status === 'RESOLVED';

                return (
                  <div key={item.id} className="p-5 hover:bg-gray-50/80 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Tag */}
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold text-[11px] border border-gray-200">
                          {item.category}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            item.priority === 'Urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : item.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : item.priority === 'Medium'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.priority} Urgency
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                            isPending
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isInReview
                              ? 'bg-sky-100 text-sky-900 border border-sky-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {isPending ? 'Pending Review' : isInReview ? 'Under Review' : 'Resolved'}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400 font-mono">
                        Submitted: {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900">{item.subject}</h3>
                      <p className="text-xs text-gray-700 mt-1 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200/60">
                        {item.details}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      <div className="flex items-center gap-3 text-gray-600">
                        <span className="flex items-center gap-1 font-semibold text-gray-800">
                          <span className="material-symbols-outlined text-[16px] text-[#7a1228]">person</span>
                          {item.parentName}
                        </span>
                        {item.parentPhone && (
                          <span className="flex items-center gap-1 text-gray-500 font-mono">
                            <span className="material-symbols-outlined text-[15px]">call</span>
                            {item.parentPhone}
                          </span>
                        )}
                        {item.studentName && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 text-[11px] font-medium border border-rose-100">
                            Learner: {item.studentName} {item.gradeLevel ? `(${item.gradeLevel})` : ''}
                          </span>
                        )}
                      </div>

                      {/* Admin Response Action or Indicator */}
                      <div className="flex items-center gap-2">
                        {isAdminOrDirector && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedConcern(item);
                                setResponseText(item.adminResponse || '');
                                setResponseStatus(item.status);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#7a1228] hover:bg-[#5a0c1d] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">reply</span>
                              {item.adminResponse ? 'Edit Response' : 'Respond & Review'}
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete concern"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Render Admin Response if available */}
                    {item.adminResponse && (
                      <div className="mt-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                        <div className="flex items-center justify-between text-xs text-emerald-950 font-bold">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-emerald-700">verified_user</span>
                            {item.respondedBy || 'Director & Administration Response'}
                          </span>
                          {item.respondedAt && (
                            <span className="text-[10px] text-emerald-700 font-normal font-mono">
                              {new Date(item.respondedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-900 leading-relaxed font-normal">
                          {item.adminResponse}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Admin / Director Response Modal */}
      {selectedConcern && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-gray-200 shadow-xl overflow-hidden animate-fadeIn space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] text-[#7a1228]">gavel</span>
                <h3 className="text-base font-bold text-gray-900">Respond to Parent Concern</h3>
              </div>
              <button
                onClick={() => setSelectedConcern(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs text-gray-700">
              <div className="flex items-center justify-between font-bold text-gray-900">
                <span>{selectedConcern.subject}</span>
                <span className="text-gray-500 font-normal">{selectedConcern.parentName}</span>
              </div>
              <p className="italic text-gray-600">&quot;{selectedConcern.details}&quot;</p>
            </div>

            <form onSubmit={handleSaveResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Update Resolution Status
                </label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                >
                  <option value="IN_REVIEW">Under Review by Management</option>
                  <option value="RESOLVED">Resolved & Actioned</option>
                  <option value="PENDING">Keep Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Director / Official Admin Response <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter clear official response for the parent..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7a1228]"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConcern(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse}
                  className="px-5 py-2 rounded-xl bg-[#7a1228] hover:bg-[#5a0c1d] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingResponse ? 'Saving...' : 'Save & Notify Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
