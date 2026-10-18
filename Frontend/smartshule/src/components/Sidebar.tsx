import React, { useState, useEffect } from 'react';
import { TabType, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { getFilteredNavSections, getRoleDisplayName, getRoleBadgeStyle } from '../utils/rbac';
import { onboardingService } from '../services/onboardingService';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigateLanding?: () => void;
  onOpenLegalModal?: (tab?: 'terms' | 'privacy' | 'cookies' | 'child_protection') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  onNavigateLanding,
  onOpenLegalModal,
}) => {
  const { user, logout, activeViewMode, setActiveViewMode, isStaffWithChildren } = useAuth();
  const effectiveRole = (isStaffWithChildren && activeViewMode === 'PARENT') ? UserRole.PARENT : user?.role;
  const navSections = getFilteredNavSections(effectiveRole);
  const badgeStyle = getRoleBadgeStyle(effectiveRole);
  const [pendingOnboardingsCount, setPendingOnboardingsCount] = useState(0);
  const [pendingSlotsCount, setPendingSlotsCount] = useState(0);

  useEffect(() => {
    const updateCounts = () => {
      setPendingOnboardingsCount(onboardingService.getPendingCount());
      setPendingSlotsCount(onboardingService.getPendingSlotsCount());
    };
    updateCounts();
    if (typeof window !== 'undefined') {
      window.addEventListener('smartshule_onboarding_updated', updateCounts);
    }
    const interval = setInterval(updateCounts, 4000);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartshule_onboarding_updated', updateCounts);
      }
      clearInterval(interval);
    };
  }, []);

  const canAccessOnboardQueue = user?.role && [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER,
    UserRole.DEPUTY_HEAD_TEACHER,
    UserRole.ADMISSIONS,
  ].includes(user.role);

  const isAdmin = user?.role && [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
  ].includes(user.role);

  const isFinanceAdmin = user?.role && [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.BURSAR,
    UserRole.ACCOUNTANT,
  ].includes(user.role);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed left-0 top-0 bottom-0 w-64 bg-[#DEC4C4] border-r border-[#DEC4C4] z-40 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.06)] overflow-y-auto transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="h-16 px-md flex items-center justify-between gap-sm bg-[#DEC4C4] border-b border-[#7a1228]/10">
            <div className="flex items-center gap-sm">
              <img
                src="/logo.png"
                alt="School Logo"
                className="w-8 h-8 rounded-lg object-cover shadow-xs border border-[#7a1228]/20 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = (e.target as HTMLElement).nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
              <div className="w-8 h-8 rounded-lg bg-primary hidden items-center justify-center text-on-primary shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[20px] text-white">school</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-headline-md text-body-md text-primary font-bold tracking-tight truncate max-w-[145px]">
                  {user?.schoolName || 'Grace Seeds School'}
                </span>
                <span className="font-label-md text-[9.5px] text-primary/80 italic truncate max-w-[145px]" title="The future Begins Here">
                  &quot;The future Begins Here&quot;
                </span>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded hover:bg-black/5 text-primary cursor-pointer"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* User Profile Card */}
          <div className="p-md">
            <div className="w-full p-3 rounded-xl bg-[#F8F5F5] flex flex-col gap-2 border border-[#7a1228]/15 shadow-[0_4px_16px_rgba(0,0,0,0.09)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {user ? `${user.firstName[0]}${user.lastName[0]}` : <span className="material-symbols-outlined text-[18px]">person</span>}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-headline-md text-sm text-on-surface truncate font-semibold">
                    {user?.fullName || 'User'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant truncate font-mono">
                    {user?.email || 'Authorized Account'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#7a1228]/10">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyle.bg} ${badgeStyle.text} uppercase tracking-wider`}>
                  {isStaffWithChildren && activeViewMode === 'PARENT'
                    ? (user?.role === UserRole.TEACHER ? "Parent View · Teacher's Child" : 'Parent View · Staff Child')
                    : getRoleDisplayName(user?.role)}
                </span>
                <span className="w-2 h-2 rounded-full bg-secondary" title="Active Session"></span>
              </div>
              {isStaffWithChildren && activeViewMode === 'PARENT' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewMode('STAFF');
                    onSelectTab('dashboard');
                    onCloseMobile();
                  }}
                  className="w-full mt-1 py-1 px-2 rounded-lg bg-primary text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#660000] transition-colors cursor-pointer shadow-2xs"
                  title={user?.role === UserRole.TEACHER ? "Return to Teacher Workspace" : "Return to Staff Workspace"}
                >
                  <span className="material-symbols-outlined text-[14px]">badge</span>
                  <span>{user?.role === UserRole.TEACHER ? 'Return to Teacher Workspace' : 'Return to Staff Workspace'}</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('archived-records');
                    onCloseMobile();
                  }}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-[#7a1228]/10 hover:bg-[#7a1228]/20 border border-[#7a1228]/20 text-[#7a1228] text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                  title="Open Standalone Enterprise Archive Vault"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#7a1228]">inventory_2</span>
                    <span>Archived Data Vault</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-[#7a1228] text-white px-1.5 py-0.2 rounded-full font-bold">
                    Vault
                  </span>
                </button>
              )}
              {isFinanceAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('arrears');
                    onCloseMobile();
                  }}
                  className="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-[#7a1228]/10 hover:bg-[#7a1228]/20 border border-[#7a1228]/20 text-[#7a1228] text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                  title="Open Dedicated Standalone Fee Arrears Management Page"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#7a1228]">assignment_late</span>
                    <span>Fee Arrears Ledger</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-[#7a1228] text-white px-1.5 py-0.2 rounded-full font-bold">
                    Arrears
                  </span>
                </button>
              )}
              {canAccessOnboardQueue && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('slot-applications');
                      onCloseMobile();
                    }}
                    className="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-600/30 text-emerald-950 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                    title="Open Admission Slot Applications & Tour/Assessment Scheduling"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-emerald-800">event_available</span>
                      <span>Slot Applications</span>
                    </div>
                    {pendingSlotsCount > 0 ? (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white animate-pulse">
                        {pendingSlotsCount} New
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase bg-emerald-800/15 text-emerald-900 px-1.5 py-0.2 rounded-full font-bold">
                        Slots
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('onboard-queue');
                      onCloseMobile();
                    }}
                    className="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/30 text-amber-950 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                    title="Open Admitted Learner Onboard Queue"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-800">how_to_reg</span>
                      <span>Onboard Queue</span>
                    </div>
                    {pendingOnboardingsCount > 0 ? (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-600 text-white animate-pulse">
                        {pendingOnboardingsCount} New
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase bg-[#7a1228]/15 text-[#7a1228] px-1.5 py-0.2 rounded-full font-bold">
                        Queue
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-sm pb-lg flex flex-col gap-xs">
            {navSections.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                {section.group && (
                  <div className={`px-sm ${sIdx === 0 ? 'pt-xs' : 'pt-md'} pb-xs`}>
                    <span className="font-label-md text-[11px] font-bold text-[#7a1228]/80 uppercase tracking-wider">
                      {section.group}
                    </span>
                  </div>
                )}
                {section.items.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={`${sIdx}-${item.id}`}
                      onClick={() => {
                        onSelectTab(item.id as TabType);
                        onCloseMobile();
                      }}
                      className={`flex items-center justify-between px-sm py-2 text-left w-full transition-all rounded-lg cursor-pointer ${
                        isActive
                          ? 'bg-primary text-white font-semibold shadow-sm'
                          : 'text-[#40000e] hover:bg-[#F8F5F5]/60 hover:text-primary'
                      }`}
                      data-path={item.id}
                    >
                      <div className="flex items-center gap-sm min-w-0">
                        <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-white' : 'text-[#7a1228]/80'}`}>
                          {item.icon}
                        </span>
                        <span className="font-body-md text-sm truncate">{item.label}</span>
                      </div>
                      {item.id === 'slot-applications' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                          pendingSlotsCount > 0
                            ? (isActive ? 'bg-emerald-400 text-emerald-950 font-bold' : 'bg-emerald-600 text-white font-bold animate-pulse')
                            : (isActive ? 'bg-white/20 text-white' : 'bg-[#7a1228]/15 text-[#7a1228]')
                        }`}>
                          {pendingSlotsCount > 0 ? `${pendingSlotsCount} New` : 'Slots'}
                        </span>
                      )}
                      {item.id === 'onboard-queue' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                          pendingOnboardingsCount > 0
                            ? (isActive ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-amber-600 text-white font-bold animate-pulse')
                            : (isActive ? 'bg-white/20 text-white' : 'bg-[#7a1228]/15 text-[#7a1228]')
                        }`}>
                          {pendingOnboardingsCount > 0 ? `${pendingOnboardingsCount} New` : 'Queue'}
                        </span>
                      )}
                      {item.id === 'archived-records' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#7a1228]/15 text-[#7a1228]'
                        }`}>
                          Vault
                        </span>
                      )}
                      {item.id === 'arrears' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#7a1228]/15 text-[#7a1228]'
                        }`}>
                          Arrears
                        </span>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: Landing Page & Sign Out */}
        <div className="p-sm bg-[#F8F5F5] m-sm rounded-xl space-y-2 border border-[#7a1228]/15 shadow-[0_4px_16px_rgba(0,0,0,0.09)]">
          {onNavigateLanding && (
            <button
              onClick={onNavigateLanding}
              className="w-full py-1.5 px-2 text-xs font-semibold text-[#40000e] hover:text-primary hover:bg-white/60 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Landing Page</span>
            </button>
          )}

          <button
            onClick={() => onOpenLegalModal?.('privacy')}
            className="w-full py-1.5 px-2 mb-1.5 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-emerald-600">verified_user</span>
            <span>Legal & Privacy (KDPA)</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-1.5 px-2 text-xs font-semibold text-error hover:bg-error-container/40 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>

        {/* Vellox Tech Company Watermark */}
        <div className="px-3 pb-3 text-center text-[10px] text-[#7a1228]/70 flex items-center justify-center gap-1">
          <span>Powered by</span>
          <span className="font-bold text-primary tracking-wide">Vellox Tech</span>
        </div>
      </aside>
    </>
  );
};