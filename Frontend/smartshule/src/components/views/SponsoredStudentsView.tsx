import React, { useState, useEffect, useMemo } from 'react';
import {
  StudentSponsorship,
  SponsorshipType,
  SponsorshipStatus,
  SponsorshipStats,
  UserRole
} from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { resolveGradeName } from '../../utils/formatters';

const SPONSORSHIP_TYPE_CONFIG: Record<
  SponsorshipType,
  { label: string; badgeBg: string; badgeText: string; icon: string }
> = {
  DIRECTOR_BENEVOLENCE: {
    label: "Director's Benevolence Fund",
    badgeBg: 'bg-[#7a1228]/10 text-primary border-[#7a1228]/25',
    badgeText: 'text-primary',
    icon: 'volunteer_activism'
  },
  ACADEMIC_MERIT: {
    label: 'Academic Excellence Scholarship',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    badgeText: 'text-amber-800',
    icon: 'workspace_premium'
  },
  NEEDY_VULNERABLE: {
    label: 'Needy & Vulnerable Full Bursary',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeText: 'text-emerald-800',
    icon: 'handshake'
  },
  STAFF_CHILD_WAIVER: {
    label: 'Staff Child 100% Tuition Waiver',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    badgeText: 'text-amber-800',
    icon: 'family_restroom'
  },
  ORPHAN_ASSISTANCE: {
    label: 'Orphan & Guardianless Assistance',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    badgeText: 'text-rose-800',
    icon: 'shield_heart'
  },
  BOARD_TRUSTEE: {
    label: 'Board of Trustees Scholarship',
    badgeBg: 'bg-rose-50 text-rose-900 border-rose-200',
    badgeText: 'text-rose-800',
    icon: 'account_balance'
  },
  SPECIAL_TALENT: {
    label: 'Special Talent & Creative Arts',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    badgeText: 'text-teal-800',
    icon: 'star'
  }
};

const GRADE_LEVELS = [
  'PLAYGROUP',
  'PP1',
  'PP2',
  'GRADE_1',
  'GRADE_2',
  'GRADE_3',
  'GRADE_4',
  'GRADE_5',
  'GRADE_6',
  'GRADE_7',
  'GRADE_8',
  'GRADE_9'
];

export const SponsoredStudentsView: React.FC = () => {
  const { user } = useAuth();

  const [sponsorships, setSponsorships] = useState<StudentSponsorship[]>([]);
  const [stats, setStats] = useState<SponsorshipStats | null>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);
  const [activeDossier, setActiveDossier] = useState<StudentSponsorship | null>(null);

  // Form State for Enrollment / Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    sponsorshipType: 'DIRECTOR_BENEVOLENCE' as SponsorshipType,
    sponsorName: "School Director's Benevolence Fund",
    sponsorContact: '+254700000000',
    termlySubsidyAmount: 18000,
    annualSubsidyAmount: 54000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    approvalReference: '',
    reasonNotes: "Approved under the School Director's Full Educational Sponsorship Scheme.",
    confidentialNotes: '',
    coverage: {
      tuitionCovered: true,
      lunchCovered: true,
      materialsCovered: true,
      uniformCovered: false,
      activitiesCovered: true,
      percentageCovered: 100
    }
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sponRes, statsRes, studentsRes] = await Promise.all([
        apiService.getSponsoredStudents({ schoolId: user?.schoolId }),
        apiService.getSponsorshipStats(user?.schoolId),
        apiService.getStudents({ schoolId: user?.schoolId, limit: 300 }).catch(() => ({ success: true, data: [] }))
      ]);

      if (sponRes.success && sponRes.data) {
        setSponsorships(sponRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (studentsRes.success && studentsRes.data) {
        setAvailableStudents(Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data as any).students || []);
      }
    } catch (err: any) {
      console.error('Failed to load sponsored students data:', err);
      setError(err.message || 'Failed to load sponsored students dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.schoolId]);

  // Filtered List
  const filteredSponsorships = useMemo(() => {
    return sponsorships.filter((s) => {
      if (selectedGrade !== 'ALL' && s.gradeLevel !== selectedGrade) return false;
      if (selectedType !== 'ALL' && s.sponsorshipType !== selectedType) return false;
      if (selectedStatus !== 'ALL' && s.sponsorshipStatus !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.studentName.toLowerCase().includes(q);
        const matchesAdm = s.admissionNumber.toLowerCase().includes(q);
        const matchesRef = s.approvalReference.toLowerCase().includes(q);
        const matchesSponsor = s.sponsorName.toLowerCase().includes(q);
        if (!matchesName && !matchesAdm && !matchesRef && !matchesSponsor) return false;
      }
      return true;
    });
  }, [sponsorships, selectedGrade, selectedType, selectedStatus, searchQuery]);

  // Open Modal for New Learner
  const handleOpenEnrollModal = () => {
    setEditingId(null);
    const count = sponsorships.length + 1;
    const year = new Date().getFullYear();
    setFormData({
      studentId: '',
      sponsorshipType: 'DIRECTOR_BENEVOLENCE',
      sponsorName: "School Director's Benevolence Fund",
      sponsorContact: user?.phone || '+254700000000',
      termlySubsidyAmount: 18000,
      annualSubsidyAmount: 54000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      approvalReference: `DIR-SCH-${year}-${String(count).padStart(3, '0')}`,
      reasonNotes: "Approved under the School Director's Full Educational Sponsorship Scheme.",
      confidentialNotes: '',
      coverage: {
        tuitionCovered: true,
        lunchCovered: true,
        materialsCovered: true,
        uniformCovered: false,
        activitiesCovered: true,
        percentageCovered: 100
      }
    });
    setIsEnrollModalOpen(true);
  };

  // Open Modal for Editing Learner
  const handleOpenEditModal = (s: StudentSponsorship) => {
    setEditingId(s.id);
    setFormData({
      studentId: s.studentId,
      sponsorshipType: s.sponsorshipType,
      sponsorName: s.sponsorName,
      sponsorContact: s.sponsorContact || '',
      termlySubsidyAmount: s.termlySubsidyAmount,
      annualSubsidyAmount: s.annualSubsidyAmount,
      startDate: s.startDate,
      endDate: s.endDate || '',
      approvalReference: s.approvalReference,
      reasonNotes: s.reasonNotes,
      confidentialNotes: s.confidentialNotes || '',
      coverage: {
        tuitionCovered: s.coverage.tuitionCovered,
        lunchCovered: s.coverage.lunchCovered,
        materialsCovered: s.coverage.materialsCovered,
        uniformCovered: s.coverage.uniformCovered,
        activitiesCovered: s.coverage.activitiesCovered,
        percentageCovered: s.coverage.percentageCovered || 100
      }
    });
    setIsEnrollModalOpen(true);
  };

  // Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) {
      alert('Please select a learner to sponsor.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await apiService.updateSponsoredStudent(editingId, {
          sponsorshipType: formData.sponsorshipType,
          sponsorName: formData.sponsorName,
          sponsorContact: formData.sponsorContact,
          termlySubsidyAmount: Number(formData.termlySubsidyAmount),
          annualSubsidyAmount: Number(formData.annualSubsidyAmount),
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          approvalReference: formData.approvalReference,
          reasonNotes: formData.reasonNotes,
          confidentialNotes: formData.confidentialNotes || undefined,
          coverage: formData.coverage
        });

        if (res.success) {
          setSuccessMessage('Sponsorship details updated successfully.');
          setIsEnrollModalOpen(false);
          loadData();
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          alert(res.error || 'Failed to update sponsorship');
        }
      } else {
        const res = await apiService.createSponsoredStudent({
          schoolId: user?.schoolId || 'school-001',
          studentId: formData.studentId,
          sponsorshipType: formData.sponsorshipType,
          sponsorName: formData.sponsorName,
          sponsorContact: formData.sponsorContact,
          termlySubsidyAmount: Number(formData.termlySubsidyAmount),
          annualSubsidyAmount: Number(formData.annualSubsidyAmount),
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          approvalReference: formData.approvalReference,
          reasonNotes: formData.reasonNotes,
          confidentialNotes: formData.confidentialNotes || undefined,
          coverage: formData.coverage
        });

        if (res.success) {
          setSuccessMessage('Learner successfully enrolled into full school sponsorship.');
          setIsEnrollModalOpen(false);
          loadData();
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          alert(res.error || 'Failed to enroll sponsored learner');
        }
      }
    } catch (err: any) {
      console.error('Error saving sponsorship:', err);
      alert(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status Handler
  const handleToggleStatus = async (s: StudentSponsorship) => {
    const nextStatus = s.sponsorshipStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const reason = prompt(
      `Enter confidential reason for changing status to ${nextStatus}:`,
      nextStatus === 'SUSPENDED' ? 'Pending termly academic/welfare evaluation' : 'Regularized and approved'
    );
    if (reason === null) return;

    try {
      const res = await apiService.updateSponsoredStudentStatus(s.id, nextStatus, reason);
      if (res.success) {
        setSuccessMessage(`Learner sponsorship status updated to ${nextStatus}.`);
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Delete Handler
  const handleDelete = async (s: StudentSponsorship) => {
    if (!confirm(`Are you sure you want to permanently revoke and remove sponsorship for ${s.studentName} (Ref: ${s.approvalReference})? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await apiService.deleteSponsoredStudent(s.id);
      if (res.success) {
        setSuccessMessage('Sponsorship record deleted successfully.');
        loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(res.error || 'Failed to delete record');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete sponsorship');
    }
  };

  // Print Certificate / Dossier
  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-primary via-[#5e0f21] to-[#360812] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 skew-x-12 pointer-events-none transform translate-x-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-wider shadow-sm">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>School Director &amp; Administrator Exclusive Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-amber-300">
                volunteer_activism
              </span>
              <span>Fully Sponsored Students &amp; Scholarships Dossier</span>
            </h1>
            <p className="text-sm sm:text-base text-rose-100/90 max-w-2xl leading-relaxed">
              Confidential institutional management of learners on 100% full school sponsorship, Director benevolence subsidies, needy student bursaries, and staff waivers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleOpenEnrollModal}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span>+ Enroll Sponsored Learner</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh Records"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Confidentiality Warning Footer */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-200/80">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-400">verified_user</span>
            <span>
              Restricted Module: Only School Directors and Administrators are authorized to view or manage these bursary records.
            </span>
          </div>
          <div className="text-[11px] text-rose-200/70 font-data-mono">
            Grace Seeds Institutional Benevolent Scheme · Academic Year 2026
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs animate-fade-in">
          <span className="material-symbols-outlined text-emerald-600 text-[24px]">
            check_circle
          </span>
          <div className="flex-1 text-sm font-semibold">{successMessage}</div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-center gap-3 text-rose-900 shadow-xs animate-fade-in">
          <span className="material-symbols-outlined text-rose-600 text-[24px]">
            error
          </span>
          <div className="flex-1 text-sm font-semibold">{error}</div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">groups</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Sponsored Learners
            </div>
            <div className="text-2xl font-black text-slate-900 font-data-mono mt-0.5">
              {stats?.totalSponsoredStudents ?? sponsorships.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across all CBE streams
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">verified</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Sponsorships
            </div>
            <div className="text-2xl font-black text-emerald-600 font-data-mono mt-0.5">
              {stats?.activeCount ?? sponsorships.filter(s => s.sponsorshipStatus === 'ACTIVE').length}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              100% Fees Waived
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">payments</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Annual Subsidized Value
            </div>
            <div className="text-xl font-black text-amber-600 font-data-mono mt-0.5">
              KES {(stats?.totalAnnualSubsidy ?? sponsorships.reduce((sum, s) => sum + (s.annualSubsidyAmount || 0), 0)).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Full school financial commitment
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">restaurant</span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Free Lunch Beneficiaries
            </div>
            <div className="text-2xl font-black text-teal-700 font-data-mono mt-0.5">
              {stats?.lunchCoveredCount ?? sponsorships.filter(s => s.coverage?.lunchCovered).length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Full catering subsidization
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learner by name, admission no, ref number, or sponsor..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary font-bold cursor-pointer"
          >
            <option value="ALL">All Grades</option>
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>
                {resolveGradeName(g)}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary font-bold cursor-pointer"
          >
            <option value="ALL">All Sponsorship Types</option>
            {Object.entries(SPONSORSHIP_TYPE_CONFIG).map(([k, cfg]) => (
              <option key={k} value={k}>
                {cfg.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-primary font-bold cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="COMPLETED">Completed</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900">
              Institutional Sponsorship Roster
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {filteredSponsorships.length} Learners Found
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Director Governance Module
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <span className="material-symbols-outlined text-[32px] animate-spin text-primary">
              progress_activity
            </span>
            <div className="text-xs font-semibold mt-2">Loading sponsored learner records...</div>
          </div>
        ) : filteredSponsorships.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">volunteer_activism</span>
            </div>
            <div className="text-base font-extrabold text-slate-800">
              No Sponsored Learners Found
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no sponsored learners matching your filter criteria. Click the button below to register a learner on 100% full institutional scholarship.
            </p>
            <button
              onClick={handleOpenEnrollModal}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-[#600e20] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Enroll First Sponsored Learner</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Learner &amp; Admission</th>
                  <th className="py-3 px-4">Grade &amp; Stream</th>
                  <th className="py-3 px-4">Sponsorship Scheme</th>
                  <th className="py-3 px-4">Coverage Scope</th>
                  <th className="py-3 px-4">Subsidized Value</th>
                  <th className="py-3 px-4">Approval Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSponsorships.map((s) => {
                  const typeCfg = SPONSORSHIP_TYPE_CONFIG[s.sponsorshipType] || {
                    label: s.sponsorshipType,
                    badgeBg: 'bg-slate-100 text-slate-800',
                    badgeText: 'text-slate-800',
                    icon: 'star'
                  };

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Learner Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#500b1a] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {s.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs">
                              {s.studentName}
                            </div>
                            <div className="font-data-mono text-[10px] text-slate-500 mt-0.5">
                              Adm: {s.admissionNumber} {s.gender ? `· ${s.gender}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grade Level */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {resolveGradeName(s.gradeLevel)}
                        </div>
                        {s.streamName && (
                          <div className="text-[10px] text-slate-500">
                            {s.streamName}
                          </div>
                        )}
                      </td>

                      {/* Sponsorship Category */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${typeCfg.badgeBg}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {typeCfg.icon}
                            </span>
                            <span>{typeCfg.label}</span>
                          </span>
                          <div className="text-[10px] text-slate-500 line-clamp-1">
                            Sponsor: <strong className="text-slate-700">{s.sponsorName}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Coverage Scope */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#7a1228]/10 text-primary border border-[#7a1228]/20">
                            100% Tuition
                          </span>
                          {s.coverage.lunchCovered && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                              Free Lunch
                            </span>
                          )}
                          {s.coverage.materialsCovered && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              Materials
                            </span>
                          )}
                          {s.coverage.uniformCovered && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Uniform
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Financial Value */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold font-data-mono text-[#7a1228] text-xs">
                          KES {s.termlySubsidyAmount.toLocaleString()} / term
                        </div>
                        <div className="text-[10px] text-slate-500 font-data-mono mt-0.5">
                          KES {s.annualSubsidyAmount.toLocaleString()} / year
                        </div>
                      </td>

                      {/* Approval Reference */}
                      <td className="py-3.5 px-4">
                        <div className="font-data-mono font-bold text-slate-800 text-xs">
                          {s.approvalReference}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          By: {s.approvedByUserName || 'Director'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.sponsorshipStatus === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.sponsorshipStatus === 'SUSPENDED'
                              ? 'bg-amber-100 text-amber-800'
                              : s.sponsorshipStatus === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-800 border border-slate-200'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.sponsorshipStatus === 'ACTIVE'
                                ? 'bg-emerald-500 animate-pulse'
                                : s.sponsorshipStatus === 'SUSPENDED'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{s.sponsorshipStatus}</span>
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDossier(s);
                              setIsDossierModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Full Confidential Dossier & Certificate"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              description
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Sponsorship Details"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              edit
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              s.sponsorshipStatus === 'ACTIVE'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={s.sponsorshipStatus === 'ACTIVE' ? 'Suspend Sponsorship' : 'Reactivate Sponsorship'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {s.sponsorshipStatus === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Revoke / Delete Record"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Enroll / Edit Sponsored Learner */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-[#500b1a] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px] text-amber-300">
                  {editingId ? 'edit_note' : 'person_add'}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    {editingId ? 'Edit Sponsorship Details' : 'Enroll Learner in Full School Sponsorship'}
                  </h3>
                  <div className="text-[11px] text-rose-100/80">
                    Confidential Director Authorization Form
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Select Learner */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Select Registered Learner *
                </label>
                {editingId ? (
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold">
                    {sponsorships.find(s => s.id === editingId)?.studentName} (Adm: {sponsorships.find(s => s.id === editingId)?.admissionNumber})
                  </div>
                ) : (
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="">-- Choose active student from school roster --</option>
                    {availableStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} (Adm: {st.admissionNumber}) · {resolveGradeName(st.gradeLevel)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Sponsorship Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Sponsorship Scheme / Category *
                  </label>
                  <select
                    value={formData.sponsorshipType}
                    onChange={(e) => setFormData({ ...formData, sponsorshipType: e.target.value as any })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    {Object.entries(SPONSORSHIP_TYPE_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Benefactor / Sponsor Name *
                  </label>
                  <input
                    type="text"
                    value={formData.sponsorName}
                    onChange={(e) => setFormData({ ...formData, sponsorName: e.target.value })}
                    placeholder="e.g. School Director's Benevolence Fund"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Coverage Checkboxes */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Institutional Coverage &amp; Benefits:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.coverage.tuitionCovered}
                      onChange={(e) => setFormData({
                        ...formData,
                        coverage: { ...formData.coverage, tuitionCovered: e.target.checked }
                      })}
                      className="text-primary rounded-sm cursor-pointer"
                    />
                    <span>100% Tuition Fee</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.coverage.lunchCovered}
                      onChange={(e) => setFormData({
                        ...formData,
                        coverage: { ...formData.coverage, lunchCovered: e.target.checked }
                      })}
                      className="text-primary rounded-sm cursor-pointer"
                    />
                    <span>Free School Lunch</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.coverage.materialsCovered}
                      onChange={(e) => setFormData({
                        ...formData,
                        coverage: { ...formData.coverage, materialsCovered: e.target.checked }
                      })}
                      className="text-primary rounded-sm cursor-pointer"
                    />
                    <span>CBC Books &amp; Materials</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.coverage.uniformCovered}
                      onChange={(e) => setFormData({
                        ...formData,
                        coverage: { ...formData.coverage, uniformCovered: e.target.checked }
                      })}
                      className="text-primary rounded-sm cursor-pointer"
                    />
                    <span>Uniform &amp; PE Kit</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.coverage.activitiesCovered}
                      onChange={(e) => setFormData({
                        ...formData,
                        coverage: { ...formData.coverage, activitiesCovered: e.target.checked }
                      })}
                      className="text-primary rounded-sm cursor-pointer"
                    />
                    <span>Trips &amp; Activities</span>
                  </label>
                </div>
              </div>

              {/* Subsidies & Approvals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Termly Subsidy (KES) *
                  </label>
                  <input
                    type="number"
                    value={formData.termlySubsidyAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData({
                        ...formData,
                        termlySubsidyAmount: val,
                        annualSubsidyAmount: val * 3
                      });
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-data-mono font-bold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Annual Subsidy (KES)
                  </label>
                  <input
                    type="number"
                    value={formData.annualSubsidyAmount}
                    onChange={(e) => setFormData({ ...formData, annualSubsidyAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-data-mono font-bold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Approval Reference *
                  </label>
                  <input
                    type="text"
                    value={formData.approvalReference}
                    onChange={(e) => setFormData({ ...formData, approvalReference: e.target.value })}
                    placeholder="DIR-SCH-2026-001"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-data-mono font-bold text-xs"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Effective Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider block">
                  Public Award Directive Note *
                </label>
                <textarea
                  rows={2}
                  value={formData.reasonNotes}
                  onChange={(e) => setFormData({ ...formData, reasonNotes: e.target.value })}
                  placeholder="e.g. Awarded full institutional scholarship for exemplary CBE performance and community background."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider block">
                    Confidential Director Assessment Notes
                  </label>
                  <span className="text-[10px] text-amber-600 font-bold">Admin Eyes Only</span>
                </div>
                <textarea
                  rows={2}
                  value={formData.confidentialNotes}
                  onChange={(e) => setFormData({ ...formData, confidentialNotes: e.target.value })}
                  placeholder="e.g. Family assessment verified by community visit; single-parent household; exceptional conduct."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs leading-relaxed"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-[#600e20] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>{editingId ? 'Update Sponsorship' : 'Approve & Enroll Learner'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Confidential Dossier & Printable Certificate */}
      {isDossierModalOpen && activeDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-[#500b1a] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[24px] text-amber-300">
                  workspace_premium
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Official Sponsorship Award Dossier
                  </h3>
                  <div className="text-[11px] text-rose-100/80">
                    Ref: {activeDossier.approvalReference}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDossier}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Certificate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDossierModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Certificate Body (Printable) */}
            <div className="p-8 space-y-6 overflow-y-auto text-slate-800">
              {/* Institution Header */}
              <div className="text-center pb-6 border-b-2 border-primary/20 space-y-1">
                <div className="text-xl font-black text-primary tracking-tight uppercase">
                  {user?.schoolName || 'Grace Seeds School'}
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  Competency Based Curriculum (CBC) · School Director Educational Foundation
                </div>
                <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300">
                  Official Full Scholarship Award Certificate
                </div>
              </div>

              {/* Beneficiary Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Learner Full Name</span>
                  <span className="text-sm font-extrabold text-slate-900">{activeDossier.studentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Admission Number</span>
                  <span className="text-sm font-data-mono font-extrabold text-slate-900">{activeDossier.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Grade &amp; Stream</span>
                  <span className="font-bold text-slate-800">
                    {resolveGradeName(activeDossier.gradeLevel)} {activeDossier.streamName ? `(${activeDossier.streamName})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Award Reference</span>
                  <span className="font-data-mono font-bold text-primary">{activeDossier.approvalReference}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Sponsorship Scheme</span>
                  <span className="font-bold text-slate-800">
                    {SPONSORSHIP_TYPE_CONFIG[activeDossier.sponsorshipType]?.label || activeDossier.sponsorshipType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Subsidized Value</span>
                  <span className="font-bold font-data-mono text-[#7a1228]">
                    KES {activeDossier.termlySubsidyAmount.toLocaleString()} / term (KES {activeDossier.annualSubsidyAmount.toLocaleString()} / yr)
                  </span>
                </div>
              </div>

              {/* Coverage Breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Authorized Benefits &amp; Full Waivers:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span>100% Tuition &amp; Term Levies Waived</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span>CBC Formative &amp; Summative Assessment Slips</span>
                  </div>
                  {activeDossier.coverage.lunchCovered && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                      <span>100% Daily School Lunch &amp; Catering Included</span>
                    </div>
                  )}
                  {activeDossier.coverage.materialsCovered && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                      <span>CBC Workbooks &amp; Learning Exercise Materials</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Public Reason */}
              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Award Directive &amp; Purpose</span>
                <p className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950 leading-relaxed font-semibold">
                  {activeDossier.reasonNotes}
                </p>
              </div>

              {/* Confidential Notes (Director only) */}
              {activeDossier.confidentialNotes && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-rose-600 font-bold uppercase block">
                      Confidential Case Assessment Record
                    </span>
                    <span className="text-[10px] text-rose-500 font-bold uppercase">Restricted</span>
                  </div>
                  <p className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-rose-950 leading-relaxed whitespace-pre-wrap">
                    {activeDossier.confidentialNotes}
                  </p>
                </div>
              )}

              {/* Signatures Block */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="font-extrabold text-slate-900">
                    {activeDossier.approvedByUserName || 'School Director'}
                  </div>
                  <div className="text-[10px] text-slate-500">Office of the School Director</div>
                  <div className="mt-6 border-b border-dashed border-slate-300 w-32 mx-auto" />
                  <div className="text-[9px] text-slate-400 mt-1">Authorized Signature &amp; Stamp</div>
                </div>

                <div>
                  <div className="font-extrabold text-slate-900">
                    {new Date(activeDossier.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-slate-500">Effective Award Date</div>
                  <div className="mt-6 border-b border-dashed border-slate-300 w-32 mx-auto" />
                  <div className="text-[9px] text-slate-400 mt-1">Date of Institutional Enactment</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
