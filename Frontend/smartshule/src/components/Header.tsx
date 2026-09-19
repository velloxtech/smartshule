import React, { useState, useRef, useEffect } from 'react';
import { Student, Teacher, AcademicContext, UserRole } from '../types';
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
  onNavigateLanding?: () => void;
  onOpenOnboardSchool?: () => void;
  onOpenAcademicTermsModal?: () => void;
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
  onOpenOnboardSchool,
  onOpenAcademicTermsModal,
  academicContext,
  backendConnected = true,
}) => {
  const { user, logout } = useAuth();
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

  const termsList = academicContext?.allTerms && academicContext.allTerms.length > 0
    ? academicContext.allTerms
    : [
        { id: 'term-3-2026', name: 'Term 3 - 2026', startDate: '2026-08-24', endDate: '2026-10-23', isCurrent: true, status: 'ACTIVE' as const },
        { id: 'term-2-2026', name: 'Term 2 - 2026', startDate: '2026-05-04', endDate: '2026-08-07', isCurrent: false, status: 'ENDED' as const },
        { id: 'term-1-2026', name: 'Term 1 - 2026', startDate: '2026-01-05', endDate: '2026-04-03', isCurrent: false, status: 'ENDED' as const },
        { id: 'term-1-2027', name: 'Term 1 - 2027', startDate: '2027-01-04', endDate: '2027-04-02', isCurrent: false, status: 'UPCOMING' as const },
      ];

  const currentTermObj = academicContext?.currentTerm || termsList.find(t => t.name === currentTerm || t.isCurrent);
  const isTermEnded = currentTermObj?.status === 'ENDED';
  const isTermEndingSoon = currentTermObj?.isEndingSoon;

  const canManageTerms =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SCHOOL_ADMIN ||
    user?.role === UserRole.HEAD_TEACHER;

  const filteredStudents = searchQuery.trim()
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.admNo.includes(searchQuery) ||
          s.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.grade.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredTeachers = searchQuery.trim()
    ? teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tscNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.learningAreas.some((la) => la.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-[#800000] text-white border-b border-[#660000] shadow-md shrink-0">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
        {/* Mobile Toggle & Search Group */}
        <div className="flex items-center gap-2 md:gap-3 flex-1 max-w-xl">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-xl text-white hover:bg-[#660000] transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Term Switcher Dropdown */}
          <div className="relative shrink-0" ref={termRef}>
            <button
              onClick={() => setTermDropdownOpen(!termDropdownOpen)}
              className="flex items-center gap-2 bg-[#660000] hover:bg-[#550000] text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-white/20 shadow-xs"
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
              <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#F8F5F5] p-3 shadow-2xl z-50 border border-slate-200 text-slate-900 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Academic Sessions
                  </span>
                  {currentTermObj && (
                    <span className="text-[10px] text-slate-500 font-mono">
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
                            ? 'bg-[#800000] text-white font-bold shadow-xs'
                            : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="font-semibold leading-tight">{term.name}</div>
                          {term.startDate && term.endDate && (
                            <div className={`text-[10px] ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>
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
                                  : 'bg-slate-200 text-slate-600'
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
                  <div className="pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setTermDropdownOpen(false);
                        onOpenAcademicTermsModal();
                      }}
                      className="w-full py-2 px-3 bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
            className="relative flex-1 flex items-center bg-[#660000] rounded-xl px-3 border border-white/20 focus-within:border-white/40 focus-within:bg-[#550000] transition-all"
            ref={searchRef}
          >
            <span className="material-symbols-outlined text-white/70 text-[18px] mr-2 shrink-0">
              search
            </span>
            <input
              className="w-full bg-transparent py-1.5 text-xs text-white placeholder:text-white/60 focus:outline-none"
              placeholder="Search students, teachers, CBC strands..."
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
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#F8F5F5] text-slate-900 rounded-2xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto z-50 p-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase px-2 py-1">
                  Matching Results ({filteredStudents.length + filteredTeachers.length})
                </div>

                {filteredStudents.length === 0 && filteredTeachers.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    No students or teachers match "{searchQuery}"
                  </div>
                )}

                {filteredStudents.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-xs font-bold text-[#800000]">Students</div>
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onSelectStudent?.(s);
                          setShowSearchResults(false);
                        }}
                        className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Adm #{s.admNo} · {s.grade} {s.stream} · UPI: {s.upi}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          CBC: {s.cbcRating}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredTeachers.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-[#800000]">Teachers</div>
                    {filteredTeachers.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {t.tscNumber} · {t.role}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-600 font-medium">
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

        {/* Right Actions: System Pulse, Alerts, Help, Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Live system pulse key detail */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#660000] border border-white/10 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            ></span>
            <span className="text-[11px] font-semibold text-white/90">
              {backendConnected ? 'CBC Bridge' : 'Offline'}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setNotificationsRead(true);
              }}
              className="p-2 rounded-xl text-white hover:bg-[#660000] transition-colors relative cursor-pointer border border-white/10"
              type="button"
              title="System Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {!notificationsRead && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#F8F5F5] p-3 shadow-2xl border border-slate-200 text-slate-900 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                  <span className="text-[10px] font-bold text-[#800000] uppercase">SmartShule</span>
                </div>
                <div className="py-4 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-slate-400 text-[24px]">notifications_active</span>
                  <span>{currentTermObj?.name ? `${currentTermObj.name} in session` : 'No new unread alerts'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Help & Guide */}
          <div className="relative">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded-xl text-white hover:bg-[#660000] transition-colors cursor-pointer border border-white/10"
              type="button"
              title="CBC Guidelines & Rubrics"
            >
              <span className="material-symbols-outlined text-[20px]">help</span>
            </button>

            {showHelp && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#F8F5F5] p-4 shadow-2xl border border-slate-200 text-slate-900 z-50">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#800000] mb-2">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  <span>KICD CBC Rating Guide</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1.5">
                  <div>
                    <strong className="text-emerald-700">EE (Exceeding):</strong> Learner performs beyond required level independently.
                  </div>
                  <div>
                    <strong className="text-[#800000]">ME (Meeting):</strong> Learner performs correctly at standard required level.
                  </div>
                  <div>
                    <strong className="text-amber-700">AE (Approaching):</strong> Learner occasionally requires guided prompts.
                  </div>
                  <div>
                    <strong className="text-rose-700">BE (Below):</strong> Learner requires individualized remediation.
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                  {user?.schoolName || 'Grace Seeds School'} · CBC Portal v2.0
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-[#660000] hover:bg-[#550000] transition-colors cursor-pointer border border-white/20 text-white"
              title="User Account & Session"
              type="button"
            >
              <div className="w-8 h-8 rounded-full bg-white text-[#800000] flex items-center justify-center shrink-0 shadow-xs font-bold text-xs border border-white">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : <span className="material-symbols-outlined text-[18px]">person</span>}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
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
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#F8F5F5] p-3 shadow-2xl border border-slate-200 text-slate-900 z-50 animate-in fade-in">
                <div className="p-2 border-b border-slate-200">
                  <div className="font-bold text-sm text-slate-900">{user?.fullName || 'Current User'}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">{user?.email || 'admin@smartshule.ac.ke'}</div>
                  <div className="mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleBadgeStyle(user?.role).bg} ${getRoleBadgeStyle(user?.role).text} uppercase tracking-wider`}>
                      {getRoleDisplayName(user?.role)}
                    </span>
                  </div>
                </div>

                <div className="py-2 space-y-1">
                  {canManageTerms && onOpenAcademicTermsModal && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenAcademicTermsModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#800000]">date_range</span>
                      <span>Academic Terms Schedule</span>
                    </button>
                  )}

                  {onOpenOnboardSchool && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenOnboardSchool();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">account_balance</span>
                      <span>Institution Setup</span>
                    </button>
                  )}

                  {onNavigateLanding && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigateLanding();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#800000]">public</span>
                      <span>View Public Landing Page</span>
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
