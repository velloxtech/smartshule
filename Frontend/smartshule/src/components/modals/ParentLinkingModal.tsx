import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Student } from '../../types';

interface ParentAccount {
  userId: string;
  guardianId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  relationship: string;
  role?: string;
  linkedStudents: Array<{
    id: string;
    admissionNumber: string;
    fullName: string;
    gradeLevel: string;
    status: string;
  }>;
  linkedStudentCount: number;
  duplicateAccounts: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
  }>;
}

interface ParentLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinksUpdated?: () => void;
  preSelectedStudent?: Student | null;
}

export const ParentLinkingModal: React.FC<ParentLinkingModalProps> = ({
  isOpen,
  onClose,
  onLinksUpdated,
  preSelectedStudent,
}) => {
  // Navigation / active tab
  const [activeTab, setActiveTab] = useState<'link_to_child' | 'register_new' | 'family_directory'>('link_to_child');

  // Active Target Learner
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [switchingStudent, setSwitchingStudent] = useState(false);
  const [studentSearchQ, setStudentSearchQ] = useState('');

  // Search Parent State
  const [parentQuery, setParentQuery] = useState('');
  const [parents, setParents] = useState<ParentAccount[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentAccount | null>(null);
  const [isSearchingParents, setIsSearchingParents] = useState(false);

  // Link Options
  const [relationshipType, setRelationshipType] = useState('MOTHER');
  const [isPrimary, setIsPrimary] = useState(true);
  const [canViewAcademics, setCanViewAcademics] = useState(true);
  const [canViewFinances, setCanViewFinances] = useState(true);

  // Quick Register State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNationalId, setRegNationalId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRelationship, setRegRelationship] = useState('MOTHER');
  const [regIsPrimary, setRegIsPrimary] = useState(true);

  // Multi-learner selection (for family directory tab)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [multiLearnerQuery, setMultiLearnerQuery] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load students and initialize
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(null);
    setSelectedParent(null);
    setSwitchingStudent(false);

    apiService.getStudents().then((res) => {
      if (res.success && res.data) {
        setAllStudents(res.data);
        if (preSelectedStudent) {
          const fresh = res.data.find((s: Student) => s.id === preSelectedStudent.id) || preSelectedStudent;
          setTargetStudent(fresh);
        } else if (res.data.length > 0) {
          setTargetStudent(res.data[0]);
        }
      }
    }).catch(() => {});

    // Initial load of recent parents
    handleSearchParents('');
  }, [isOpen, preSelectedStudent]);

  // If targetStudent has guardian phone, auto-suggest or search
  useEffect(() => {
    if (targetStudent?.guardianPhone && !selectedParent) {
      handleSearchParents(targetStudent.guardianPhone);
    }
  }, [targetStudent]);

  const handleSearchParents = async (searchVal?: string) => {
    const q = searchVal !== undefined ? searchVal : parentQuery;
    setIsSearchingParents(true);
    setError(null);
    try {
      const res = await apiService.searchParents(q);
      if (res.success && res.data) {
        setParents(res.data);
        if (res.data.length === 1 && !selectedParent && q) {
          setSelectedParent(res.data[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search parents');
    } finally {
      setIsSearchingParents(false);
    }
  };

  const handleLinkToTargetStudent = async () => {
    if (!selectedParent) {
      setError('Please search for and select a parent account first.');
      return;
    }
    if (!targetStudent) {
      setError('Please select a learner to link.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiService.linkParentToLearners({
        parentUserId: selectedParent.userId,
        studentIds: [targetStudent.id],
        relationship: relationshipType,
        isPrimary,
        canViewAcademics,
        canViewFinances,
      });

      if (res.success) {
        const studentName = targetStudent.name || (targetStudent as any).fullName || 'learner';
        setSuccess(`Successfully linked ${selectedParent.fullName} as ${relationshipType} to ${studentName}!`);

        // Refresh parent family tree
        const treeRes = await apiService.getParentFamilyTree(selectedParent.userId);
        if (treeRes.success && treeRes.data) {
          setSelectedParent((prev) =>
            prev
              ? {
                  ...prev,
                  linkedStudents: treeRes.data.children,
                  linkedStudentCount: treeRes.data.children.length,
                }
              : null
          );
        }

        // Refresh all students to reflect newly linked guardian
        const freshStudents = await apiService.getStudents();
        if (freshStudents.success && freshStudents.data) {
          setAllStudents(freshStudents.data);
          const updatedTarget = freshStudents.data.find((s: Student) => s.id === targetStudent.id);
          if (updatedTarget) setTargetStudent(updatedTarget);
        }

        if (onLinksUpdated) onLinksUpdated();
      } else {
        setError(res.message || 'Failed to link parent to learner');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while linking parent to learner');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) {
      setError('No target learner selected.');
      return;
    }
    if (!regFirstName.trim() || !regLastName.trim()) {
      setError('Please enter both the first and last name of the parent.');
      return;
    }
    if (!regPhone.trim()) {
      setError('Please enter a valid mobile phone number for communication.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiService.createAndLinkParent({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        phone: regPhone.trim(),
        nationalId: regNationalId.trim() || undefined,
        email: regEmail.trim() || undefined,
        relationship: regRelationship,
        studentId: targetStudent.id,
        isPrimary: regIsPrimary,
      });

      if (res.success) {
        const studentName = targetStudent.name || (targetStudent as any).fullName || 'learner';
        setSuccess(
          `Parent account established for ${regFirstName.trim()} ${regLastName.trim()} and linked to ${studentName}!`
        );

        // Reset form
        setRegFirstName('');
        setRegLastName('');
        setRegPhone('');
        setRegNationalId('');
        setRegEmail('');

        // Refresh all students & target
        const freshStudents = await apiService.getStudents();
        if (freshStudents.success && freshStudents.data) {
          setAllStudents(freshStudents.data);
          const updatedTarget = freshStudents.data.find((s: Student) => s.id === targetStudent.id);
          if (updatedTarget) setTargetStudent(updatedTarget);
        }

        // Switch to link tab and re-search
        setActiveTab('link_to_child');
        handleSearchParents(regPhone.trim());

        if (onLinksUpdated) onLinksUpdated();
      } else {
        setError(res.message || 'Failed to register and link parent');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during parent account creation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async (studentId: string, studentName: string) => {
    if (!selectedParent) return;
    if (
      !confirm(
        `Are you sure you want to unlink ${studentName} from ${selectedParent.fullName}?\n\nThis will remove Parent Portal access for this child.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.unlinkParentFromLearner({
        parentUserId: selectedParent.userId,
        studentId,
      });

      if (res.success) {
        setSuccess(`Unlinked ${studentName} successfully.`);

        // Refresh parent tree
        const treeRes = await apiService.getParentFamilyTree(selectedParent.userId);
        if (treeRes.success && treeRes.data) {
          setSelectedParent((prev) =>
            prev
              ? {
                  ...prev,
                  linkedStudents: treeRes.data.children,
                  linkedStudentCount: treeRes.data.children.length,
                }
              : null
          );
        }

        // Refresh students
        const freshStudents = await apiService.getStudents();
        if (freshStudents.success && freshStudents.data) {
          setAllStudents(freshStudents.data);
          if (targetStudent) {
            const updatedTarget = freshStudents.data.find((s: Student) => s.id === targetStudent.id);
            if (updatedTarget) setTargetStudent(updatedTarget);
          }
        }

        if (onLinksUpdated) onLinksUpdated();
      } else {
        setError(res.message || 'Failed to unlink learner');
      }
    } catch (err: any) {
      setError(err.message || 'Error unlinking learner');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter learners for switcher
  const filteredLearnersForSwitcher = allStudents.filter((s) => {
    if (!studentSearchQ.trim()) return true;
    const q = studentSearchQ.toLowerCase();
    const sName = (s.name || `${(s as any).firstName || ''} ${(s as any).lastName || ''}`).toLowerCase();
    const sAdm = (s.admNo || (s as any).admissionNumber || '').toLowerCase();
    const sGrade = (s.grade || (s as any).gradeLevel || '').toLowerCase();
    return sName.includes(q) || sAdm.includes(q) || sGrade.includes(q);
  });

  const targetName = targetStudent?.name || (targetStudent as any)?.fullName || 'Selected Learner';
  const targetAdm = targetStudent?.admNo || (targetStudent as any)?.admissionNumber || 'N/A';
  const targetGrade = targetStudent?.grade || (targetStudent as any)?.gradeLevel || 'N/A';
  const targetStream = targetStudent?.stream || 'Cohort';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-rose-100 my-auto">
        {/* Institutional Header */}
        <div className="bg-gradient-to-r from-[#7a1228] to-[#961a35] text-white p-5 sm:p-6 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold border border-white/20">
              <span className="material-symbols-outlined text-[26px] text-amber-300">family_restroom</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight">
                  Parent-to-Learner Linking Desk
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white tracking-wider uppercase">
                  Parent Portal Access
                </span>
              </div>
              <p className="text-xs text-rose-100/90 mt-0.5">
                Search parent directory, establish verifiable guardian linkages, and manage multi-child accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Global Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('link_to_child')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'link_to_child'
                ? 'border-[#7a1228] text-[#7a1228]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">person_search</span>
            <span>Search & Link to Child</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register_new')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'register_new'
                ? 'border-[#7a1228] text-[#7a1228]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">person_add</span>
            <span>Register & Link New Parent</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('family_directory')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'family_directory'
                ? 'border-[#7a1228] text-[#7a1228]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">diversity_1</span>
            <span>Parent Directory & Siblings</span>
          </button>
        </div>

        {/* Alerts Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-start gap-2.5 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">check_circle</span>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Target Learner Spotlight Card (Visible across all tabs) */}
          <div className="bg-gradient-to-br from-slate-50 to-rose-50/40 rounded-2xl p-4 border border-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#7a1228] text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                {targetName
                  .split(' ')
                  .filter(Boolean)
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('') || 'ST'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#7a1228] block">
                  Active Target Learner
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate">{targetName}</h4>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-data-mono mt-0.5">
                  <span className="font-bold text-[#7a1228]">Adm #{targetAdm}</span>
                  <span>•</span>
                  <span>{targetGrade}</span>
                  <span>•</span>
                  <span>{targetStream}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setSwitchingStudent(!switchingStudent)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-bold text-[#7a1228] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                <span>{switchingStudent ? 'Cancel Selection' : 'Change Learner'}</span>
              </button>
            </div>
          </div>

          {/* Learner Switcher Drawer */}
          {switchingStudent && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select a Different Learner
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Showing {filteredLearnersForSwitcher.length} of {allStudents.length} learners
                </span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={studentSearchQ}
                  onChange={(e) => setStudentSearchQ(e.target.value)}
                  placeholder="Type learner name, admission number, or grade (e.g. Brian, Grade 4)..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-[#7a1228]"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-white">
                {filteredLearnersForSwitcher.slice(0, 25).map((s) => {
                  const sName = s.name || (s as any).fullName || 'Learner';
                  const sAdm = s.admNo || (s as any).admissionNumber || 'N/A';
                  const sGrade = s.grade || (s as any).gradeLevel || '';
                  const isCurrent = targetStudent?.id === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setTargetStudent(s);
                        setSwitchingStudent(false);
                        setStudentSearchQ('');
                      }}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        isCurrent
                          ? 'bg-rose-50 border border-rose-200 font-bold text-[#7a1228]'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div>
                        <strong>{sName}</strong>
                        <span className="text-[11px] text-slate-500 font-mono ml-2">
                          Adm #{sAdm} · {sGrade}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="material-symbols-outlined text-rose-700 text-[16px]">check_circle</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: Search & Link to Target Child */}
          {activeTab === 'link_to_child' && (
            <div className="space-y-5">
              {/* Search Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#7a1228] text-white flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <span>Search Parent / Guardian Account</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Matches Name, Phone, National ID, or Email
                  </span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                      person_search
                    </span>
                    <input
                      type="text"
                      value={parentQuery}
                      onChange={(e) => setParentQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchParents()}
                      placeholder="Enter parent name (e.g. Mary), phone (07XXXXXXXX), or national ID (28475921)..."
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-[#7a1228]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearchParents()}
                    disabled={isSearchingParents}
                    className="px-4 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-xl hover:bg-[#600e1f] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    {isSearchingParents ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">search</span>
                    )}
                    <span>Search Parent</span>
                  </button>
                </div>
              </div>

              {/* Search Results Roster */}
              {parents.length > 0 && !selectedParent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Matching Parent Accounts ({parents.length})
                    </span>
                    <span className="text-[11px] text-slate-500">Click a card to select</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                    {parents.map((p) => {
                      const isAlreadyLinkedToTarget =
                        targetStudent && p.linkedStudents.some((ls) => ls.id === targetStudent.id);

                      return (
                        <div
                          key={p.userId}
                          onClick={() => setSelectedParent(p)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isAlreadyLinkedToTarget
                              ? 'bg-emerald-50/50 border-emerald-300'
                              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs hover:border-[#7a1228]/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-xs text-slate-900">{p.fullName}</h5>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono mt-0.5">
                                  <span className="text-[#7a1228] font-bold">{p.phone || 'No phone'}</span>
                                  {p.nationalId && <span>ID: {p.nationalId}</span>}
                                </div>
                                {p.email && (
                                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.email}</div>
                                )}
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                                {p.role || 'PARENT'}
                              </span>
                            </div>

                            {/* Enrolled Children Tag List */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100">
                              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                                Enrolled Siblings ({p.linkedStudentCount}):
                              </span>
                              {p.linkedStudents.length === 0 ? (
                                <span className="text-[11px] text-rose-600 italic">No learners currently linked</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {p.linkedStudents.map((child) => (
                                    <span
                                      key={child.id}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                        targetStudent && child.id === targetStudent.id
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {child.fullName} ({child.gradeLevel})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            {isAlreadyLinkedToTarget ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                <span>Already linked to this child</span>
                              </span>
                            ) : (
                              <span className="text-[#7a1228] font-bold flex items-center gap-1 text-[11px]">
                                <span className="material-symbols-outlined text-[15px]">add_link</span>
                                <span>Select & Link to {targetName}</span>
                              </span>
                            )}
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Parent Found State */}
              {parents.length === 0 && !isSearchingParents && (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
                  <span className="material-symbols-outlined text-[36px] text-slate-400">person_off</span>
                  <p className="text-xs font-semibold text-slate-800">No matching parent found</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    We could not find an existing account matching &quot;{parentQuery}&quot;. You can register and link this parent immediately.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (parentQuery.includes('@')) {
                        setRegEmail(parentQuery);
                      } else if (/^\+?\d+$/.test(parentQuery.trim())) {
                        setRegPhone(parentQuery.trim());
                      } else {
                        const parts = parentQuery.trim().split(' ');
                        setRegFirstName(parts[0] || '');
                        setRegLastName(parts.slice(1).join(' ') || '');
                      }
                      setActiveTab('register_new');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 bg-[#7a1228] text-white text-xs font-bold rounded-xl hover:bg-[#5e0d1e] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Register New Parent Now</span>
                  </button>
                </div>
              )}

              {/* Selected Parent Linking Panel */}
              {selectedParent && (
                <div className="bg-white rounded-2xl border-2 border-[#7a1228]/40 p-5 space-y-4 shadow-sm animate-in fade-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7a1228]/10 text-[#7a1228] uppercase tracking-wider">
                          Selected Parent Account
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          VERIFIED
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{selectedParent.fullName}</h4>
                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 font-mono mt-0.5">
                        <span className="text-[#7a1228] font-bold">{selectedParent.phone}</span>
                        {selectedParent.nationalId && <span>National ID: {selectedParent.nationalId}</span>}
                        {selectedParent.email && <span>{selectedParent.email}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedParent(null)}
                      className="text-xs text-[#7a1228] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                      <span>Change Parent</span>
                    </button>
                  </div>

                  {/* Relationship & Permission Settings */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Relationship to {targetName} <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={relationshipType}
                          onChange={(e) => setRelationshipType(e.target.value)}
                          className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 focus:outline-[#7a1228]"
                        >
                          <option value="MOTHER">Mother</option>
                          <option value="FATHER">Father</option>
                          <option value="GUARDIAN">Legal Guardian</option>
                          <option value="SPONSOR">Educational Sponsor</option>
                          <option value="NEXT_OF_KIN">Next of Kin</option>
                          <option value="GRANDPARENT">Grandparent</option>
                          <option value="UNCLE">Uncle</option>
                          <option value="AUNT">Aunt</option>
                          <option value="OTHER">Other Representative</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 pt-2 sm:pt-0">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={isPrimary}
                            onChange={(e) => setIsPrimary(e.target.checked)}
                            className="rounded border-slate-300 text-[#7a1228] focus:ring-[#7a1228]"
                          />
                          <span className="font-semibold">
                            Primary Guardian (Receives automated SMS receipts & notices)
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={canViewAcademics}
                            onChange={(e) => setCanViewAcademics(e.target.checked)}
                            className="rounded border-slate-300 text-[#7a1228] focus:ring-[#7a1228]"
                          />
                          <span>Academic Progress & e-Diary Access</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={canViewFinances}
                            onChange={(e) => setCanViewFinances(e.target.checked)}
                            className="rounded border-slate-300 text-[#7a1228] focus:ring-[#7a1228]"
                          />
                          <span>Fee Invoices & Statement Access</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Submission Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      Linking assigns learner under {selectedParent.fullName}&apos;s verified Parent Portal.
                    </span>

                    <button
                      type="button"
                      onClick={handleLinkToTargetStudent}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-[#7a1228] hover:bg-[#5e0d1e] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Linking Learner...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">add_link</span>
                          <span>Link {selectedParent.fullName} as {relationshipType} to {targetName}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Register & Link New Parent */}
          {activeTab === 'register_new' && (
            <form onSubmit={handleRegisterAndLink} className="space-y-4 animate-in fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Direct Parent Provisioning</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This form registers a new parent account and immediately links them as a guardian of{' '}
                  <strong>{targetName}</strong> (Adm #{targetAdm}). Their default login password will be their phone number (change required on first login).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    First Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="e.g. Mary"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Last Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="e.g. Otieno"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Mobile Phone Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. 0712345678 or +254712345678"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-[#7a1228]"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Used for SMS alerts, receipts, and portal login.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    National ID / Passport Number
                  </label>
                  <input
                    type="text"
                    value={regNationalId}
                    onChange={(e) => setRegNationalId(e.target.value)}
                    placeholder="e.g. 28475921"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-[#7a1228]"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Enables parent National ID login authentication.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. mary.otieno@gmail.com"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-[#7a1228]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Relationship to {targetName} <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={regRelationship}
                    onChange={(e) => setRegRelationship(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-[#7a1228]"
                  >
                    <option value="MOTHER">Mother</option>
                    <option value="FATHER">Father</option>
                    <option value="GUARDIAN">Legal Guardian</option>
                    <option value="SPONSOR">Educational Sponsor</option>
                    <option value="NEXT_OF_KIN">Next of Kin</option>
                    <option value="GRANDPARENT">Grandparent</option>
                    <option value="UNCLE">Uncle</option>
                    <option value="AUNT">Aunt</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={regIsPrimary}
                    onChange={(e) => setRegIsPrimary(e.target.checked)}
                    className="rounded border-slate-300 text-[#7a1228] focus:ring-[#7a1228]"
                  />
                  <span className="font-semibold">
                    Set as Primary Contact for SMS Alerts & Financial Receipts
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('link_to_child')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-[#7a1228] hover:bg-[#5e0d1e] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating & Linking Account...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                      <span>Register Parent & Link to {targetName}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Parent Directory & Siblings (Multi-Learner) */}
          {activeTab === 'family_directory' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Search Parent Directory & Family Trees
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Link multiple learners or manage duplicate accounts
                  </span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                      search
                    </span>
                    <input
                      type="text"
                      value={parentQuery}
                      onChange={(e) => setParentQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchParents()}
                      placeholder="Search parent by name, phone, or national ID..."
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-[#7a1228]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearchParents()}
                    disabled={isSearchingParents}
                    className="px-4 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-xl hover:bg-[#600e1f] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Parents List */}
              <div className="space-y-2">
                {parents.map((p) => {
                  const isExpanded = selectedParent?.userId === p.userId;

                  return (
                    <div
                      key={p.userId}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
                    >
                      <div
                        onClick={() => setSelectedParent(isExpanded ? null : p)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#7a1228] flex items-center justify-center font-bold text-xs shrink-0">
                            {p.fullName
                              .split(' ')
                              .filter(Boolean)
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('') || 'PT'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-xs text-slate-900">{p.fullName}</h5>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                                {p.role || 'PARENT'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3 font-mono mt-0.5">
                              <span className="text-[#7a1228] font-bold">{p.phone}</span>
                              {p.nationalId && <span>ID: {p.nationalId}</span>}
                              <span>{p.linkedStudentCount} child(ren) linked</span>
                            </div>
                          </div>
                        </div>

                        <span className="material-symbols-outlined text-slate-400">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>

                      {/* Expanded Family Details & Linked Children */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
                          {/* Duplicate Profiles Banner if any */}
                          {p.duplicateAccounts.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                              <div className="text-xs text-amber-900">
                                <strong>Duplicate Detected:</strong> {p.duplicateAccounts.length} user profile(s) share phone {p.phone}.
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm(`Merge ${p.duplicateAccounts.length} duplicate accounts into this profile?`)) return;
                                  setIsLoading(true);
                                  try {
                                    await apiService.resolveDuplicateParents({
                                      primaryUserId: p.userId,
                                      duplicateUserIds: p.duplicateAccounts.map((d) => d.id),
                                    });
                                    handleSearchParents();
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }}
                                className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 cursor-pointer"
                              >
                                Merge Accounts
                              </button>
                            </div>
                          )}

                          {/* Currently Linked Children */}
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-2">
                              Linked Learners in Parent Portal ({p.linkedStudents.length}):
                            </span>
                            {p.linkedStudents.length === 0 ? (
                              <p className="text-xs text-rose-600 italic bg-white p-2.5 rounded-xl border border-rose-200">
                                No learners linked yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {p.linkedStudents.map((child) => (
                                  <div
                                    key={child.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <strong className="text-slate-900 block">{child.fullName}</strong>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        Adm #{child.admissionNumber} · {child.gradeLevel}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUnlink(child.id, child.fullName)}
                                      disabled={isLoading}
                                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Unlink learner"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">link_off</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Multi-Learner Linker Form */}
                          <div className="pt-3 border-t border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Link Additional Learners to {p.fullName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-600 font-semibold">Relationship:</span>
                                <select
                                  value={relationshipType}
                                  onChange={(e) => setRelationshipType(e.target.value)}
                                  className="text-xs py-1 px-2 rounded-lg border border-slate-200 bg-white font-bold"
                                >
                                  <option value="MOTHER">Mother</option>
                                  <option value="FATHER">Father</option>
                                  <option value="GUARDIAN">Guardian</option>
                                  <option value="SPONSOR">Sponsor</option>
                                </select>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={multiLearnerQuery}
                              onChange={(e) => setMultiLearnerQuery(e.target.value)}
                              placeholder="Filter students by name or admission number..."
                              className="w-full py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-xl"
                            />

                            <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-xl p-2">
                              {allStudents
                                .filter((s) => {
                                  if (!multiLearnerQuery.trim()) return true;
                                  const q = multiLearnerQuery.toLowerCase();
                                  const sName = (s.name || '').toLowerCase();
                                  const sAdm = (s.admNo || '').toLowerCase();
                                  return sName.includes(q) || sAdm.includes(q);
                                })
                                .slice(0, 20)
                                .map((s) => {
                                  const isAlreadyLinked = p.linkedStudents.some((ls) => ls.id === s.id);
                                  const isChecked = selectedStudentIds.includes(s.id);

                                  return (
                                    <label
                                      key={s.id}
                                      className={`p-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer ${
                                        isAlreadyLinked
                                          ? 'bg-slate-100 opacity-60 border-slate-200'
                                          : isChecked
                                          ? 'bg-rose-50 border-rose-300'
                                          : 'hover:bg-slate-50 border-slate-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isChecked || isAlreadyLinked}
                                          disabled={isAlreadyLinked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedStudentIds((prev) => [...prev, s.id]);
                                            } else {
                                              setSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                                            }
                                          }}
                                          className="rounded text-[#7a1228] focus:ring-[#7a1228]"
                                        />
                                        <span>
                                          <strong>{s.name}</strong> ({s.admNo} · {s.grade})
                                        </span>
                                      </div>
                                      {isAlreadyLinked ? (
                                        <span className="text-[10px] text-slate-500 font-bold">Linked</span>
                                      ) : isChecked ? (
                                        <span className="text-[10px] text-[#7a1228] font-bold">Selected</span>
                                      ) : null}
                                    </label>
                                  );
                                })}
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (selectedStudentIds.length === 0) return;
                                setIsLoading(true);
                                try {
                                  await apiService.linkParentToLearners({
                                    parentUserId: p.userId,
                                    studentIds: selectedStudentIds,
                                    relationship: relationshipType,
                                    isPrimary: true,
                                  });
                                  setSuccess(`Successfully linked ${selectedStudentIds.length} learner(s) to ${p.fullName}!`);
                                  setSelectedStudentIds([]);
                                  handleSearchParents();
                                  if (onLinksUpdated) onLinksUpdated();
                                } catch (err: any) {
                                  setError(err.message || 'Failed to link learners');
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              disabled={isLoading || selectedStudentIds.length === 0}
                              className="px-4 py-2 bg-[#7a1228] text-white text-xs font-bold rounded-xl hover:bg-[#5e0d1e] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Link Selected ({selectedStudentIds.length}) to {p.fullName}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">verified_user</span>
            <span>Parent Portal Access conforms to the Children Act 2022 & Data Protection Act</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
