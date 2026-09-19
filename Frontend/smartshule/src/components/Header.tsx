import React, { useState, useRef, useEffect } from 'react';
import { Student, Teacher } from '../types';
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

  const terms = ['Term 3 - 2026', 'Term 2 - 2026', 'Term 1 - 2026', 'Term 1 - 2027'];

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
    <header className="sticky top-0 z-30 w-full h-16 bg-surface-container-lowest/95 backdrop-blur-xl border-b border-outline-variant/20 shrink-0">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-md">
        {/* Mobile Toggle & Search Group */}
        <div className="flex items-center gap-sm md:gap-md flex-1 max-w-xl">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Term Switcher Dropdown */}
        <div className="relative shrink-0" ref={termRef}>
          <button
            onClick={() => setTermDropdownOpen(!termDropdownOpen)}
            className="flex items-center gap-xs bg-surface-container-low px-sm py-xs rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">event</span>
            <span className="font-label-md text-label-md text-primary font-semibold hidden sm:inline">
              {currentTerm}
            </span>
            <span className="font-label-md text-label-md text-primary font-semibold sm:hidden">
              T1
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          {termDropdownOpen && (
            <div className="absolute left-0 mt-xs w-48 max-w-[calc(100vw-2rem)] rounded-lg bg-surface-container-lowest p-xs shadow-xl z-50 border border-outline-variant/30 flex flex-col gap-base animate-in fade-in slide-in-from-top-1">
              <div className="px-sm py-xs text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Academic Session
              </div>
              {terms.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    onChangeTerm(term);
                    setTermDropdownOpen(false);
                  }}
                  className={`text-left px-sm py-xs text-body-md rounded-md transition-colors flex items-center justify-between ${
                    term === currentTerm
                      ? 'bg-primary-container text-white font-medium'
                      : 'text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span>{term}</span>
                  {term === currentTerm && (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search with instant popover */}
        <div className="relative flex-1 flex items-center bg-surface-container-low rounded-lg px-sm" ref={searchRef}>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-xs">
            search
          </span>
          <input
            className="w-full bg-transparent py-xs font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
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
              className="text-on-surface-variant hover:text-on-surface p-0.5"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 max-h-96 overflow-y-auto z-50 p-2">
              <div className="text-[11px] font-semibold text-on-surface-variant uppercase px-2 py-1">
                Matching Results ({filteredStudents.length + filteredTeachers.length})
              </div>

              {filteredStudents.length === 0 && filteredTeachers.length === 0 && (
                <div className="p-4 text-center text-on-surface-variant text-sm">
                  No students, teachers or strands match "{searchQuery}"
                </div>
              )}

              {filteredStudents.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-primary">Students</div>
                  {filteredStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        onSelectStudent?.(s);
                        setShowSearchResults(false);
                      }}
                      className="p-2 rounded-lg hover:bg-surface-container-low cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-on-surface">{s.name}</div>
                        <div className="text-xs text-on-surface-variant">
                          Adm #{s.admNo} · {s.grade} {s.stream} · UPI: {s.upi}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container">
                        Rating: {s.cbcRating}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {filteredTeachers.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold text-secondary">Teachers</div>
                  {filteredTeachers.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg hover:bg-surface-container-low cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-on-surface">{t.name}</div>
                        <div className="text-xs text-on-surface-variant">
                          {t.tscNumber} · {t.role}
                        </div>
                      </div>
                      <span className="text-xs text-on-surface-variant">
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

      {/* Right Actions: MoE Sync, Alerts, Help, Profile */}
      <div className="flex items-center gap-sm md:gap-md">
        <div className="hidden sm:flex items-center gap-xs px-sm py-xs rounded-lg bg-surface-container-low text-secondary border border-secondary/20">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span className="font-label-md text-label-md font-medium">Constitution 2010 Aligned</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setNotificationsRead(true);
            }}
            className="relative p-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            type="button"
            title="System Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {!notificationsRead && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-surface-container-lowest p-sm shadow-2xl border border-outline-variant/30 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-sm border-b border-surface-container">
                <span className="font-headline-md text-[14px] font-semibold text-on-surface">
                  Notifications & Alerts
                </span>
                <span className="text-[11px] text-secondary font-medium">CBA Live Bridge</span>
              </div>
              <div className="flex flex-col gap-sm py-sm max-h-72 overflow-y-auto">
                <div className="py-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-[24px]">notifications_none</span>
                  <span>No new notifications</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help & Guide */}
        <div className="relative">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            type="button"
            title="CBC Help & Guidelines"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          {showHelp && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-surface-container-lowest p-md shadow-2xl border border-outline-variant/30 z-50">
              <div className="flex items-center gap-xs font-semibold text-sm text-primary mb-2">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>KICD CBC Rating Guide</span>
              </div>
              <div className="text-xs text-on-surface-variant space-y-1.5">
                <div>
                  <strong className="text-secondary">EE (Exceeding):</strong> Learner performs beyond required level independently.
                </div>
                <div>
                  <strong className="text-primary">ME (Meeting):</strong> Learner performs correctly at standard required level.
                </div>
                <div>
                  <strong className="text-tertiary-container">AE (Approaching):</strong> Learner occasionally requires guided prompts.
                </div>
                <div>
                  <strong className="text-error">BE (Below):</strong> Learner requires intensive individualized remediation.
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-surface-container text-[11px] text-outline">
                {user?.schoolName || 'SmartShule'} · CBC Portal v2.0
              </div>
            </div>
          )}
        </div>

        {/* Backend Online Status Dot */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border ${
            backendConnected
              ? 'bg-secondary-container/30 border-secondary/40 text-secondary'
              : 'bg-error-container/30 border-error/40 text-error'
          }`}
          title={backendConnected ? 'Backend Connected (Hexagonal REST API Active)' : 'Connecting to Backend...'}
        >
          <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-secondary animate-pulse' : 'bg-error'}`}></span>
          <span className="hidden md:inline">{backendConnected ? 'API Live' : 'Connecting'}</span>
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 py-1 px-2 rounded-xl hover:bg-surface-container transition-colors cursor-pointer border border-outline-variant/30"
            title="User Account & Session"
            type="button"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : <span className="material-symbols-outlined text-[18px]">person</span>}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="font-bold text-xs text-on-surface truncate max-w-[110px]">
                {user?.fullName || 'Authorized'}
              </span>
              <span className="text-[10px] font-bold text-primary uppercase truncate max-w-[110px]">
                {getRoleDisplayName(user?.role)}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface-container-lowest p-3 shadow-2xl border border-outline-variant/30 z-50 animate-in fade-in">
              <div className="p-2 border-b border-surface-container">
                <div className="font-bold text-sm text-on-surface">{user?.fullName || 'Current User'}</div>
                <div className="text-xs text-on-surface-variant font-mono truncate">{user?.email || 'admin@smartshule.ac.ke'}</div>
                <div className="mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleBadgeStyle(user?.role).bg} ${getRoleBadgeStyle(user?.role).text} uppercase tracking-wider`}>
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>
              </div>

              <div className="py-2 space-y-1">
                {onOpenOnboardSchool && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenOnboardSchool();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">account_balance</span>
                    <span>Institution Setup (Constitution)</span>
                  </button>
                )}

                {onNavigateLanding && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigateLanding();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">public</span>
                    <span>View Public Landing Page</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-error hover:bg-error-container/20 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
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
