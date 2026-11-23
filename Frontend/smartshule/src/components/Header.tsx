import {apiService} from '../services/api';
import React, { useState, useRef, useEffect } from 'react';
import { Student, Teacher, AcademicContext, AcademicTerm, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { getRoleDisplayName, getRoleBadgeStyle } from '../utils/rbac';



interface HeaderProps {
  onToggleMobile: () => void;
  currentTerm: string;
  onChangeTerm: (term: string) => void;
  students: Student[];
  teachers: Teacher[];
  onSelectStudent?: (student: Student) => void;
  onOpenQuickAction?: (action: string) => void;
  onOpenAcademicTermsModal?: () => void;
  onOpenChangePasswordModal?: () => void;
  onOpenBiometricModal?: () => void;
  onNavigateLanding?: () => void;
  onNavigateTab?: (tab: string) => void;
  academicContext?: AcademicContext | null;
  backendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobile,
  currentTerm,
  onChangeTerm,
  students,
  teachers,
  onSelectStudent,
  onNavigateLanding,
  onNavigateTab,
  onOpenAcademicTermsModal,
  onOpenChangePasswordModal,
  onOpenBiometricModal,
  academicContext,
  backendConnected = true,
}) => {
  const {
    user,
    logout,
    activeViewMode,
    setActiveViewMode,
    isStaffWithChildren,
    enrolledChildrenCount,
  } = useAuth();
  const [termDropdownOpen, setTermDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (termRef.current && !termRef.current.contains(event.target as Node)) {
        setTermDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const termsList: AcademicTerm[] = academicContext?.allTerms && academicContext.allTerms.length > 0
    ? academicContext.allTerms
    : [
        { id: 'term-3-2026', academicYearId: '2026', termNumber: 3, name: 'Term 3 - 2026', startDate: '2026-08-24', endDate: '2026-10-23', isCurrent: true, status: 'ACTIVE' },
        { id: 'term-2-2026', academicYearId: '2026', termNumber: 2, name: 'Term 2 - 2026', startDate: '2026-05-04', endDate: '2026-08-07', isCurrent: false, status: 'ENDED' },
        { id: 'term-1-2026', academicYearId: '2026', termNumber: 1, name: 'Term 1 - 2026', startDate: '2026-01-05', endDate: '2026-04-03', isCurrent: false, status: 'ENDED' },
        { id: 'term-1-2027', academicYearId: '2027', termNumber: 1, name: 'Term 1 - 2027', startDate: '2027-01-04', endDate: '2027-04-02', isCurrent: false, status: 'UPCOMING' },
      ];

  const currentTermObj = academicContext?.currentTerm || termsList.find(t => t.name === currentTerm || t.isCurrent);
  const isTermEnded = currentTermObj?.status === 'ENDED';
  const isTermEndingSoon = currentTermObj?.isEndingSoon;

  const canManageTerms =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SCHOOL_ADMIN ||
    user?.role === UserRole.HEAD_TEACHER;

  const isParent =
    user?.role === UserRole.PARENT ||
    user?.role === UserRole.GUARDIAN ||
    (isStaffWithChildren && activeViewMode === 'PARENT');

  const filteredStudents = searchQuery.trim()
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.admNo.includes(searchQuery) ||
          (s.upi && s.upi.toLowerCase().includes(searchQuery.toLowerCase())) ||
          s.grade.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredTeachers = (!isParent && searchQuery.trim())
    ? teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tscNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.learningAreas.some((la) => la.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const canUseStaffMessages = !isParent && !!user && [UserRole.SUPER_ADMIN,UserRole.ADMIN,UserRole.SCHOOL_ADMIN,UserRole.HEAD_TEACHER,UserRole.DEPUTY_HEAD_TEACHER,UserRole.ADMISSIONS,UserRole.BURSAR,UserRole.ACCOUNTANT,UserRole.TEACHER].includes(user.role);
  const [unreadMessages,setUnreadMessages] = useState(0);
  useEffect(()=>{
    setUnreadMessages(0);
    if(!canUseStaffMessages)return;
    let live=true,inFlight=false;
    const refresh=async()=>{
      if(inFlight||document.hidden)return;inFlight=true;
      try{const response=await apiService.getStaffInbox();if(live)setUnreadMessages(response.data?.unreadCount||0);}catch{/* Keep the navigation usable when the inbox is unavailable. */}finally{inFlight=false;}
    };
    void refresh();const timer=window.setInterval(()=>void refresh(),30000);
    window.addEventListener('staff-messages-updated',refresh);
    return()=>{live=false;window.clearInterval(timer);window.removeEventListener('staff-messages-updated',refresh);};
  },[canUseStaffMessages,user?.id]);

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-gradient-to-r from-[#7a0f26] via-[#85132d] to-[#6d0c20] text-white border-b border-[#a82442]/40 shadow-md shrink-0">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
        {/* Mobile Toggle & Search Group */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 max-w-xl">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-xl text-white hover:bg-primary-container transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Term Switcher Dropdown */}
          <div className="relative shrink-0" ref={termRef}>
            <button
              onClick={() => setTermDropdownOpen(!termDropdownOpen)}
              className="flex items-center gap-2 bg-primary-container hover:bg-primary-container text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-white/20 shadow-xs"
              type="button"
              title="Academic Term Session"
            >
              <span className="material-symbols-outlined text-[18px] text-white">event</span>
              <span className="font-semibold text-xs text-white hidden sm:inline truncate max-w-[130px]">
                {currentTermObj?.name || currentTerm}
              </span>
              <span className="font-semibold text-xs text-white sm:hidden">
                {currentTermObj?.name ? currentTermObj.name.substring(0, 2) : 'T3'}
              </span>

              {/* Key Detail Indicator: Green for active, Amber for ending soon, Red for ended */}
              {isTermEnded ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white uppercase">
                  Ended
                </span>
              ) : isTermEndingSoon ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 uppercase animate-pulse">
                  Ending
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Term Active"></span>
              )}

              <span className="material-symbols-outlined text-[16px] text-white/80">expand_more</span>
            </button>

            {termDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-container-lowest p-3 shadow-2xl z-50 border border-outline-variant/30 text-on-surface flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between px-2 py-1 border-b border-outline-variant/30">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Academic Sessions
                  </span>
                  {currentTermObj && (
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {currentTermObj.daysRemaining !== undefined ? `${currentTermObj.daysRemaining}d remaining` : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {termsList.map((term) => {
                    const isSelected = term.name === currentTerm || term.isCurrent;
                    return (
                      <button
                        key={term.id || term.name}
                        onClick={() => {
                          onChangeTerm(term.name);
                          setTermDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary text-white font-bold shadow-xs'
                            : 'text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <div>
                          <div className="font-semibold leading-tight">{term.name}</div>
                          {term.startDate && term.endDate && (
                            <div className={`text-[10px] ${isSelected ? 'text-rose-100' : 'text-on-surface-variant'}`}>
                              {new Date(term.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} –{' '}
                              {new Date(term.endDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              term.status === 'ENDED'
                                ? isSelected
                                  ? 'bg-rose-900 text-white'
                                  : 'bg-surface-container text-on-surface-variant'
                                : term.status === 'ACTIVE'
                                ? isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                                : isSelected
                                ? 'bg-blue-900 text-white'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {term.status || (term.isCurrent ? 'ACTIVE' : 'SCHEDULED')}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[16px] text-white">check</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Manage Term Dates Button for Administrators */}
                {canManageTerms && onOpenAcademicTermsModal && (
                  <div className="pt-2 border-t border-outline-variant/30">
                    <button
                      onClick={() => {
                        setTermDropdownOpen(false);
                        onOpenAcademicTermsModal();
                      }}
                      className="w-full py-2 px-3 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                      <span>Manage Term Dates & Transitions</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Global Search with instant popover */}
          <div
            className="relative flex-1 min-w-0 hidden md:flex items-center bg-primary-container rounded-xl px-3 border border-white/20 focus-within:border-white/40 focus-within:bg-primary-container transition-all"
            ref={searchRef}
          >
            <span className="material-symbols-outlined text-white/70 text-[18px] mr-2 shrink-0">
              search
            </span>
            <input
              className="w-full min-w-0 bg-transparent py-1.5 text-xs text-white placeholder:text-white/60 focus:outline-none"
              placeholder={isParent ? 'Search your child by name or Adm No...' : 'Search students, teachers, CBE strands...'}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-white/70 hover:text-white p-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-surface-container-lowest text-on-surface rounded-2xl shadow-2xl border border-outline-variant/30 max-h-96 overflow-y-auto z-50 p-2">
                <div className="text-[11px] font-bold text-on-surface-variant uppercase px-2 py-1">
                  Matching Results ({filteredStudents.length + filteredTeachers.length})
                </div>

                {filteredStudents.length === 0 && filteredTeachers.length === 0 && (
                  <div className="p-4 text-center text-on-surface-variant text-xs">
                    No students or teachers match "{searchQuery}"
                  </div>
                )}

                {filteredStudents.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-xs font-bold text-primary">Students</div>
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onSelectStudent?.(s);
                          setShowSearchResults(false);
                        }}
                        className="p-2 rounded-xl hover:bg-surface-container-low cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-on-surface">{s.name}</div>
                          <div className="text-[11px] text-on-surface-variant">
                            Adm #{s.admNo} · {s.grade} {s.stream} · UPI: {s.upi}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          CBE: {s.CBCRating}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredTeachers.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-primary">Teachers</div>
                    {filteredTeachers.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-xl hover:bg-surface-container-low cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-on-surface">{t.name}</div>
                          <div className="text-[11px] text-on-surface-variant">
                            {t.tscNumber} · {t.role}
                          </div>
                        </div>
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          {t.learningAreas.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Dual-View Switcher, System Pulse, Alerts, Help, Profile */}
        <div className="flex shrink-0 items-center gap-1 md:gap-3">
          {/* Dual-View Toggle for Staff/Teachers with Children in School */}
          {isStaffWithChildren && (
            <div className="hidden xl:flex items-center p-0.5 rounded-xl bg-[#590000] border border-white/20 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveViewMode('STAFF');
                  if (onNavigateTab) onNavigateTab('dashboard');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeViewMode === 'STAFF'
                    ? 'bg-white text-primary shadow-xs font-bold'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title={user?.role === UserRole.TEACHER ? 'Teacher Workspace: Classes, lesson plans, schemes, records' : 'Staff Workspace'}
              >
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span className="hidden sm:inline">{user?.role === UserRole.TEACHER ? 'Teacher Workspace' : 'Staff Workspace'}</span>
                <span className="sm:hidden">{user?.role === UserRole.TEACHER ? 'Teacher' : 'Staff'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveViewMode('PARENT');
                  if (onNavigateTab) onNavigateTab('dashboard');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeViewMode === 'PARENT'
                    ? 'bg-white text-primary shadow-xs font-bold'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Parent View: Child attendance, Daily Homefun & Communication Diary (E-Diary), report cards, fees"
              >
                <span className="material-symbols-outlined text-[16px]">family_restroom</span>
                <span className="hidden sm:inline">Parent View</span>
                <span className="sm:hidden">Parent</span>
                {enrolledChildrenCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeViewMode === 'PARENT'
                        ? 'bg-primary text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {enrolledChildrenCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Live system pulse key detail */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary-container border border-white/10 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            ></span>
            <span className="text-[11px] font-semibold text-white/90">
              {backendConnected ? 'CBE Bridge' : 'Offline'}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setNotificationsRead(true);
              }}
              className="p-2 rounded-xl text-white hover:bg-primary-container transition-colors relative cursor-pointer border border-white/10"
              type="button"
              title="System Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {!notificationsRead && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-container-lowest p-3 shadow-2xl border border-outline-variant/30 text-on-surface z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                  <span className="text-xs font-bold text-on-surface">Notifications & Alerts</span>
                  <span className="text-[10px] font-bold text-primary uppercase">Grace Seeds School</span>
                </div>
                <div className="py-4 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-slate-400 text-[24px]">notifications_active</span>
                  <span>{currentTermObj?.name ? `${currentTermObj.name} in session` : 'No new unread alerts'}</span>
                </div>
              </div>
            )}
          </div>

          {canUseStaffMessages&&<button type="button" onClick={()=>onNavigateTab?.('staff-messages')} aria-label={`Staff messages${unreadMessages?`, ${unreadMessages} unread`:''}`} title="Staff Messages" className="relative rounded-xl border border-white/10 p-2 text-white hover:bg-primary-container"><span className="material-symbols-outlined text-[20px]">forum</span>{unreadMessages>0&&<span className="absolute -right-1 -top-1 rounded-full bg-white px-1 text-[10px] font-bold text-primary">{unreadMessages>99?'99+':unreadMessages}</span>}</button>}

          {/* Help & Guide */}
          <div className="relative">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded-xl text-white hover:bg-primary-container transition-colors cursor-pointer border border-white/10"
              type="button"
              title="CBE Guidelines & Rubrics"
            >
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>

            {showHelp && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-container-lowest p-4 shadow-2xl border border-outline-variant/30 text-on-surface z-50">
                <div className="flex items-center gap-1.5 font-bold text-xs text-primary mb-2">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  <span>KICD CBE Rating Guide</span>
                </div>
                <div className="text-xs text-on-surface-variant space-y-1.5">
                  <div>
                    <strong className="text-emerald-700">EE (Exceeding):</strong> Learner performs beyond required level independently.
                  </div>
                  <div>
                    <strong className="text-primary">ME (Meeting):</strong> Learner performs correctly at standard required level.
                  </div>
                  <div>
                    <strong className="text-amber-700">AE (Approaching):</strong> Learner occasionally requires guided prompts.
                  </div>
                  <div>
                    <strong className="text-rose-700">BE (Below):</strong> Learner requires individualized remediation.
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-outline-variant/30 text-[10px] text-slate-400">
                  {user?.schoolName || 'Grace Seeds School'} · CBE Portal v2.0
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-primary-container hover:bg-primary-container transition-colors cursor-pointer border border-white/20 text-white"
              title="User Account & Session"
              type="button"
            >
              <div className="w-8 h-8 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center shrink-0 shadow-xs font-bold text-xs border border-white">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : <span className="material-symbols-outlined text-[18px]">person</span>}
              </div>
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="font-bold text-xs text-white truncate max-w-[110px]">
                  {user?.fullName || 'Authorized'}
                </span>
                <span className="text-[10px] font-bold text-rose-200 uppercase truncate max-w-[110px]">
                  {getRoleDisplayName(user?.role)}
                </span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-white/80">expand_more</span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-container-lowest p-3 shadow-2xl border border-outline-variant/30 text-on-surface z-50 animate-in fade-in">
                <div className="p-2 border-b border-outline-variant/30">
                  <div className="font-bold text-sm text-on-surface">{user?.fullName || 'Current User'}</div>
                  <div className="text-xs text-on-surface-variant font-mono truncate">{user?.email || 'Email not available'}</div>
                  <div className="mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleBadgeStyle(user?.role).bg} ${getRoleBadgeStyle(user?.role).text} uppercase tracking-wider`}>
                      {getRoleDisplayName(user?.role)}
                    </span>
                  </div>
                </div>

                <div className="py-2 space-y-1">
                  {isStaffWithChildren && (
                    <div className="p-2 mb-2 rounded-xl bg-rose-50 border border-primary/20">
                      <div className="text-[11px] font-bold text-primary flex items-center justify-between">
                        <span>{user?.role === UserRole.TEACHER ? 'Teacher & Parent Role' : 'Staff Dual Role'}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container-lowest text-primary font-bold border border-primary/20">
                          {activeViewMode === 'STAFF' ? (user?.role === UserRole.TEACHER ? 'Teacher Workspace' : 'Staff Workspace') : 'Parent View'}
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        Active role: {activeViewMode === 'STAFF' ? (user?.role === UserRole.TEACHER ? 'Teacher' : 'School Staff') : 'Parent / Guardian'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const nextMode = activeViewMode === 'STAFF' ? 'PARENT' : 'STAFF';
                          setActiveViewMode(nextMode);
                          setUserMenuOpen(false);
                          if (onNavigateTab) onNavigateTab('dashboard');
                        }}
                        className="mt-2 w-full py-1.5 px-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {activeViewMode === 'STAFF' ? 'family_restroom' : 'badge'}
                        </span>
                        <span>
                          {activeViewMode === 'STAFF' ? 'Switch to Parent View' : (user?.role === UserRole.TEACHER ? 'Switch to Teacher Workspace' : 'Switch to Staff Workspace')}
                        </span>
                      </button>
                    </div>
                  )}
                  {isParent && onNavigateTab && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigateTab('parent-profile');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">manage_accounts</span>
                      <span>My Profile & Children</span>
                    </button>
                  )}

                  {canManageTerms && onOpenAcademicTermsModal && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenAcademicTermsModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">date_range</span>
                      <span>Academic Terms Schedule</span>
                    </button>
                  )}

                  {onNavigateLanding && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigateLanding();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">public</span>
                      <span>View Public Landing Page</span>
                    </button>
                  )}

                  
                  {onOpenBiometricModal && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenBiometricModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">fingerprint</span>
                      <span>Biometric & Passkey Devices</span>
                    </button>
                  )}

                  {onOpenChangePasswordModal && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePasswordModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">lock_reset</span>
                      <span>Change My Password</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
