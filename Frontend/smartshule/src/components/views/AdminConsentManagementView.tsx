import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Download,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Users,
  Calendar,
  Eye,
  Edit,
  ArrowRight
} from 'lucide-react';
import { parentConsentApi } from '../../services/api';
import { ParentConsentRequest } from '../../types';

export const AdminConsentManagementView: React.FC = () => {
  const [requests, setRequests] = useState<ParentConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Create Request Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'TRIP' | 'MEDICAL' | 'MEDIA' | 'SPORTS' | 'TRANSPORT' | 'GENERAL'>('TRIP');
  const [newDescription, setNewDescription] = useState('');
  const [newTerms, setNewTerms] = useState('');
  const [newTargetType, setNewTargetType] = useState<'WHOLE_SCHOOL' | 'GRADE'>('WHOLE_SCHOOL');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [newIsMandatory, setNewIsMandatory] = useState(true);
  const [newDeadline, setNewDeadline] = useState('');

  // Roster View Modal State
  const [selectedRequestForRoster, setSelectedRequestForRoster] = useState<ParentConsentRequest | null>(null);
  const [rosterData, setRosterData] = useState<{ request: any; roster: any[]; summary: any } | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'ALL' | 'CONSENTED' | 'DECLINED' | 'PENDING'>('ALL');
  const [rosterSearch, setRosterSearch] = useState('');

  // Signature Inspection Modal
  const [inspectedSignatureItem, setInspectedSignatureItem] = useState<any | null>(null);

  const ALL_GRADES = [
    'Playgroup', 'PP1', 'PP2',
    'Grade 1', 'Grade 2', 'Grade 3',
    'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9'
  ];

  const loadRequests = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await parentConsentApi.getAdminRequests();
      if (res.success && Array.isArray(res.data)) {
        setRequests(res.data);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      console.error('Failed to load admin consent requests:', err.message);
      setErrorMsg('Failed to load consent requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Pre-fill standard legal templates when category changes
  const applyTemplate = (cat: string) => {
    switch (cat) {
      case 'TRIP':
        setNewTerms(
          'I, being the lawful parent/guardian of the specified learner, hereby grant permission for the child to participate in supervised academic and cultural field excursions organized by Grace Seeds School. I authorize designated school educators and licensed school transport chaperones to supervise my child. In the event of an emergency requiring immediate medical attention, school personnel are authorized to secure reasonable emergency first aid and care. All school policies and the Constitution of Kenya Child Protection safeguards apply.'
        );
        break;
      case 'MEDICAL':
        setNewTerms(
          'I authorize the Grace Seeds School infirmary nurse, certified staff first aiders, and contracted healthcare emergency partners to administer necessary first aid and emergency clinical support to my child in case of acute illness or sudden injury during school hours or official school activities. I agree to disclose all known chronic ailments, medical allergies, and emergency contact directives to ensure the child is properly cared for in accordance with Article 53 of the Constitution of Kenya.'
        );
        break;
      case 'MEDIA':
        setNewTerms(
          'I consent / decline the capture and ethical use of photographic images and educational video recordings of my child participating in school events, academic exhibitions, music festivals, and sports competitions for official Grace Seeds School newsletters, visual CBC portfolios, and secure school communication channels. No child commercial exploitation or personal contact data shall ever be disclosed, strictly adhering to the Data Protection Act (2019) and Kenyan Child Online Protection Guidelines.'
        );
        break;
      case 'SPORTS':
        setNewTerms(
          'I hereby grant authorization for my child to participate in supervised sports, inter-school athletic tournaments, and swimming/physical education activities organized by Grace Seeds School. I confirm that my child is physically capable of participating in these sporting events unless specific medical limitations are noted in this form.'
        );
        break;
      case 'TRANSPORT':
        setNewTerms(
          'I authorize Grace Seeds School to provide daily/event school transport for my child on designated routes. I acknowledge that the learner must adhere to school bus safety guidelines and code of conduct at all times.'
        );
        break;
      default:
        setNewTerms(
          'I, being the lawful parent/guardian of the specified learner, hereby acknowledge and affirm consent for the school activities described above in accordance with school regulations and Kenyan law.'
        );
    }
  };

  const handleOpenCreateModal = () => {
    setNewTitle('');
    setNewCategory('TRIP');
    setNewDescription('');
    applyTemplate('TRIP');
    setNewTargetType('WHOLE_SCHOOL');
    setSelectedGrades([]);
    setNewIsMandatory(true);
    // Default deadline: 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setNewDeadline(d.toISOString().substring(0, 10));
    setIsCreateModalOpen(true);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMsg('Please enter a descriptive title for this consent request.');
      return;
    }
    if (!newTerms.trim()) {
      setErrorMsg('Please enter the full legal terms and conditions.');
      return;
    }

    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await parentConsentApi.createConsentRequest({
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim() || undefined,
        termsAndConditions: newTerms.trim(),
        targetType: newTargetType,
        targetClassIds: newTargetType === 'GRADE' ? selectedGrades : [],
        isMandatory: newIsMandatory,
        deadline: newDeadline ? new Date(newDeadline).toISOString() : undefined,
        status: 'PUBLISHED'
      });

      if (res.success) {
        setSuccessMsg('Consent request published successfully to target parents.');
        setIsCreateModalOpen(false);
        loadRequests();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to create consent request.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating consent request.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenRoster = async (req: ParentConsentRequest) => {
    setSelectedRequestForRoster(req);
    setRosterLoading(true);
    setRosterStatusFilter('ALL');
    setRosterSearch('');
    try {
      const res = await parentConsentApi.getConsentResponses(req.id);
      if (res.success && res.data) {
        setRosterData(res.data);
      } else {
        setRosterData(null);
      }
    } catch (err: any) {
      console.error('Failed to load roster:', err.message);
    } finally {
      setRosterLoading(false);
    }
  };

  // KPI Calculations
  const totalRequests = requests.length;
  const totalEligible = requests.reduce((acc, r) => acc + (r.metrics?.totalEligible || 0), 0);
  const totalConsented = requests.reduce((acc, r) => acc + (r.metrics?.consentedCount || 0), 0);
  const totalDeclined = requests.reduce((acc, r) => acc + (r.metrics?.declinedCount || 0), 0);
  const totalPending = requests.reduce((acc, r) => acc + (r.metrics?.pendingCount || 0), 0);
  const overallRate = totalEligible > 0 ? Math.round((totalConsented / totalEligible) * 100) : 0;

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || r.category.toUpperCase() === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7a1228]/10 text-[#7a1228] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#7a1228]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7a1228]">Administration & Legal</span>
                <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Parental Consent Hub
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Parent Consent & Authorization Records</h1>
              <p className="text-xs text-slate-500">
                Publish configurable consent requests for field trips, medical authorizations, and monitor digital signatures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadRequests}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-[#7a1228] hover:bg-[#600e1f] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Consent Request</span>
            </button>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Published</span>
            <span className="text-xl font-black text-slate-900">{totalRequests}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Active school authorisations</span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Consents Granted</span>
            <span className="text-xl font-black text-emerald-900">{totalConsented}</span>
            <span className="text-[10px] text-emerald-700 block mt-0.5">{overallRate}% overall clearance</span>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Consents Declined</span>
            <span className="text-xl font-black text-rose-900">{totalDeclined}</span>
            <span className="text-[10px] text-rose-700 block mt-0.5">Parent opt-outs recorded</span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending Responses</span>
            <span className="text-xl font-black text-amber-900">{totalPending}</span>
            <span className="text-[10px] text-amber-700 block mt-0.5">Awaiting parent sign-off</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by title or description..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="ALL">All Categories</option>
            <option value="TRIP">Field Trips & Excursions</option>
            <option value="MEDICAL">Medical & Healthcare</option>
            <option value="MEDIA">Media & Photography</option>
            <option value="SPORTS">Sports & Extracurricular</option>
            <option value="TRANSPORT">School Transport</option>
            <option value="GENERAL">General School Consent</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7a1228]" />
          <p className="text-sm font-semibold">Loading consent records...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-base text-slate-800">No consent requests found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Create Consent Request" to publish your first excursion, medical, or media authorization.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Consent Title & Version</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Target Audience</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Response Breakdown</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(r => {
                  const m = r.metrics || {
                    totalEligible: 0,
                    consentedCount: 0,
                    declinedCount: 0,
                    pendingCount: 0,
                    responseRatePercentage: 0
                  };

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{r.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          v{r.version}.0 · Created {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-300">
                          {r.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {r.targetType === 'WHOLE_SCHOOL' ? (
                          <span className="font-bold text-slate-800">Whole School</span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-600">
                            Grades: {(r.targetClassIds || []).join(', ') || 'Selected Classes'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {r.deadline ? new Date(r.deadline).toLocaleDateString() : 'No Deadline'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-emerald-700">{m.consentedCount} Consented</span>
                            <span className="text-slate-400">{m.totalEligible} Slots</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="bg-emerald-600 h-2"
                              style={{ width: `${m.totalEligible > 0 ? (m.consentedCount / m.totalEligible) * 100 : 0}%` }}
                              title={`${m.consentedCount} Consented`}
                            />
                            <div
                              className="bg-rose-500 h-2"
                              style={{ width: `${m.totalEligible > 0 ? (m.declinedCount / m.totalEligible) * 100 : 0}%` }}
                              title={`${m.declinedCount} Declined`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500">
                            <span>{m.declinedCount} declined</span>
                            <span>{m.pendingCount} pending</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{r.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenRoster(r)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Responses Roster</span>
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

      {/* MODAL 1: CREATE CONSENT REQUEST */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Publish Parent Consent Request</h2>
                <p className="text-xs text-slate-500">Create an official excursion, medical, or media authorization form.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Consent Form Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Year 4 National Museum Educational Excursion (2026)"
                  required
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => {
                      const c = e.target.value as any;
                      setNewCategory(c);
                      applyTemplate(c);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="TRIP">Field Trip & Excursion</option>
                    <option value="MEDICAL">Medical & Emergency Healthcare</option>
                    <option value="MEDIA">Photography & Media Publication</option>
                    <option value="SPORTS">Sports & Extracurricular</option>
                    <option value="TRANSPORT">School Transport</option>
                    <option value="GENERAL">General School Consent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Response Deadline</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={e => setNewDeadline(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Target Audience</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setNewTargetType('WHOLE_SCHOOL')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newTargetType === 'WHOLE_SCHOOL'
                        ? 'border-[#7a1228] bg-rose-50/50 text-[#7a1228]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Whole School
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTargetType('GRADE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newTargetType === 'GRADE'
                        ? 'border-[#7a1228] bg-rose-50/50 text-[#7a1228]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Specific Grade(s)
                  </button>
                </div>

                {newTargetType === 'GRADE' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {ALL_GRADES.map(grade => {
                      const isSelected = selectedGrades.includes(grade);
                      return (
                        <label key={grade} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedGrades(selectedGrades.filter(g => g !== grade));
                              } else {
                                setSelectedGrades([...selectedGrades, grade]);
                              }
                            }}
                            className="rounded text-[#7a1228]"
                          />
                          <span>{grade}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Event Summary / Overview</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Provide context, itinerary details, dates, and requirements..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-slate-700">
                    Full Legal Terms & Statutory Conditions
                  </label>
                  <span className="text-[10px] text-slate-400">Verbatim legal text presented to parents</span>
                </div>
                <textarea
                  value={newTerms}
                  onChange={e => setNewTerms(e.target.value)}
                  rows={4}
                  required
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-sans leading-relaxed focus:ring-2 focus:ring-[#7a1228]/20 focus:border-[#7a1228] outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsMandatory}
                  onChange={e => setNewIsMandatory(e.target.checked)}
                  className="rounded text-[#7a1228]"
                />
                <span className="font-semibold">Mandatory Response (Parent must provide formal response before activity)</span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-[#7a1228] hover:bg-[#600e1f] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Publish to Parents</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ROSTER VIEW & PRINTABLE CLEARANCE LIST */}
      {selectedRequestForRoster && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#7a1228]">
                  Official Student Consent Roster
                </span>
                <h2 className="text-xl font-black text-slate-900">{selectedRequestForRoster.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Roster</span>
                </button>
                <button
                  onClick={() => setSelectedRequestForRoster(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Roster Summary Pills & Filter */}
            {rosterData && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Filter Status:</span>
                  <button
                    onClick={() => setRosterStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      rosterStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    All ({rosterData.summary.totalEligible})
                  </button>
                  <button
                    onClick={() => setRosterStatusFilter('CONSENTED')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      rosterStatusFilter === 'CONSENTED' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    Consented ({rosterData.summary.consented})
                  </button>
                  <button
                    onClick={() => setRosterStatusFilter('DECLINED')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      rosterStatusFilter === 'DECLINED' ? 'bg-rose-700 text-white' : 'bg-white text-rose-800 border border-rose-200'
                    }`}
                  >
                    Declined ({rosterData.summary.declined})
                  </button>
                  <button
                    onClick={() => setRosterStatusFilter('PENDING')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      rosterStatusFilter === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-white text-amber-800 border border-amber-200'
                    }`}
                  >
                    Pending ({rosterData.summary.pending})
                  </button>
                </div>

                <div className="w-48">
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={e => setRosterSearch(e.target.value)}
                    placeholder="Search student name..."
                    className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Roster Table */}
            {rosterLoading ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#7a1228]" />
                <p className="text-xs font-semibold">Generating student consent roster...</p>
              </div>
            ) : !rosterData ? (
              <div className="py-8 text-center text-slate-500 text-xs">Failed to load roster records.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Student & Adm No</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4">Parent / Guardian</th>
                      <th className="py-3 px-4">Emergency Phone</th>
                      <th className="py-3 px-4">Decision</th>
                      <th className="py-3 px-4">Directives / Medical Notes</th>
                      <th className="py-3 px-4 text-right">Digital Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterData.roster
                      .filter(row => {
                        if (rosterStatusFilter !== 'ALL' && row.status !== rosterStatusFilter) return false;
                        if (rosterSearch && !row.studentName.toLowerCase().includes(rosterSearch.toLowerCase())) {
                          return false;
                        }
                        return true;
                      })
                      .map((row, idx) => {
                        const isConsented = row.status === 'CONSENTED';
                        const isDeclined = row.status === 'DECLINED';
                        const isPending = row.status === 'PENDING';

                        return (
                          <tr key={row.studentId} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <div>{row.studentName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Adm: {row.admissionNumber}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-600">{row.gradeLevel}</td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {row.parentName || <span className="text-slate-400 italic">Unassigned</span>}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                              {row.parentPhone || '—'}
                            </td>
                            <td className="py-3 px-4">
                              {isConsented ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>CONSENTED</span>
                                </span>
                              ) : isDeclined ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>DECLINED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>PENDING</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-[11px] max-w-[180px]">
                              {row.notes ? (
                                <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {row.notes}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {row.signatureData ? (
                                <button
                                  onClick={() => setInspectedSignatureItem(row)}
                                  className="text-xs text-blue-700 hover:underline font-bold inline-flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>View Stamp</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Not signed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: SIGNATURE INSPECTION MODAL */}
      {inspectedSignatureItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">Verified Electronic Signature</h3>
              </div>
              <button
                onClick={() => setInspectedSignatureItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Signatory</div>
                <div className="font-bold text-slate-900 text-sm">{inspectedSignatureItem.parentName}</div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {inspectedSignatureItem.parentRelationship || 'Parent'} · ID: {inspectedSignatureItem.parentNationalId || 'N/A'}
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-4 bg-white text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono mb-2">Signature Snapshot</div>
                {inspectedSignatureItem.signatureData?.startsWith('data:image') ? (
                  <img
                    src={inspectedSignatureItem.signatureData}
                    alt="Signature"
                    className="h-16 mx-auto object-contain"
                  />
                ) : (
                  <div className="font-serif italic text-2xl text-blue-900">
                    {inspectedSignatureItem.signatureData || inspectedSignatureItem.parentName}
                  </div>
                )}
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-600">
                <div>Timestamp: {new Date(inspectedSignatureItem.submittedAt).toLocaleString()}</div>
                <div className="break-all text-[9px] text-slate-400">
                  Hash: {inspectedSignatureItem.signatureHash}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
