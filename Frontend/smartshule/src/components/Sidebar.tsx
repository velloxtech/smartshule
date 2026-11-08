import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TabType, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getFilteredNavModules,
  getRoleDisplayName,
  getRoleBadgeStyle,
  NavModuleDef,
  NavItemDef,
} from '../utils/rbac';
import { onboardingService } from '../services/onboardingService';
import { apiService } from '../services/api';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigateLanding?: () => void;
  onOpenLegalModal?: (tab?: 'terms' | 'privacy' | 'cookies' | 'child_protection') => void;
  isCompact?: boolean;
  onToggleCompact?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  onNavigateLanding,
  onOpenLegalModal,
  isCompact = false,
  onToggleCompact,
}) => {
  const { user, logout, activeViewMode, setActiveViewMode, isStaffWithChildren } = useAuth();
  const effectiveRole = (isStaffWithChildren && activeViewMode === 'PARENT') ? UserRole.PARENT : user?.role;
  const navModules = useMemo(() => getFilteredNavModules(effectiveRole), [effectiveRole]);
  const badgeStyle = getRoleBadgeStyle(effectiveRole);

  const [pendingOnboardingsCount, setPendingOnboardingsCount] = useState(0);
  const [pendingSlotsCount, setPendingSlotsCount] = useState(0);
  const [pendingForwardedCount, setPendingForwardedCount] = useState(0);

  const canAccessOnboardQueue = Boolean(
    effectiveRole && [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.SCHOOL_ADMIN,
      UserRole.HEAD_TEACHER,
      UserRole.DEPUTY_HEAD_TEACHER,
      UserRole.ADMISSIONS,
    ].includes(effectiveRole)
  );

  // Hover state for compact flyout menu
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  // Find module that owns currentTab
  const activeModuleId = useMemo(() => {
    for (const mod of navModules) {
      if (mod.items.some((it) => it.id === currentTab)) {
        return mod.id;
      }
    }
    return null;
  }, [navModules, currentTab]);

  // Expanded module state (Accordion: only one expanded at a time)
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('smartshule_expanded_module');
      if (saved) return saved;
    } catch {}
    return activeModuleId || 'admissions-enrolment';
  });

  // Automatically expand parent module when navigating to one of its children
  useEffect(() => {
    if (activeModuleId && activeModuleId !== 'dashboard-module') {
      setExpandedModuleId(activeModuleId);
      try {
        localStorage.setItem('smartshule_expanded_module', activeModuleId);
      } catch {}
    }
  }, [activeModuleId]);

  // Periodic count synchronization for badges
  useEffect(() => {
    const updateCounts = async () => {
      setPendingOnboardingsCount(onboardingService.getPendingCount());
      setPendingSlotsCount(onboardingService.getPendingSlotsCount());

      const canCheckFinance = effectiveRole && [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.SCHOOL_ADMIN,
        UserRole.BURSAR,
        UserRole.ACCOUNTANT,
      ].includes(effectiveRole);

      if (canCheckFinance) {
        try {
          const res = await apiService.getForwardedTransactions();
          if (res?.success && Array.isArray(res.data)) {
            const pending = res.data.filter((tx: any) => tx.status === 'PENDING').length;
            setPendingForwardedCount(pending);
          }
        } catch {}
      }
    };

    updateCounts();
    if (typeof window !== 'undefined') {
      window.addEventListener('smartshule_onboarding_updated', updateCounts);
    }
    const interval = setInterval(updateCounts, 5000);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartshule_onboarding_updated', updateCounts);
      }
      clearInterval(interval);
    };
  }, [effectiveRole]);

  const handleToggleModule = (modId: string) => {
    setExpandedModuleId((curr) => {
      const next = curr === modId ? null : modId;
      try {
        if (next) {
          localStorage.setItem('smartshule_expanded_module', next);
        } else {
          localStorage.removeItem('smartshule_expanded_module');
        }
      } catch {}
      return next;
    });
  };

  const getItemBadge = (item: NavItemDef, isActive: boolean) => {
    if (item.badgeKey === 'slots' || item.id === 'slot-applications') {
      if (pendingSlotsCount > 0) {
        return (
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
            isActive ? 'bg-white text-primary' : 'bg-emerald-600 text-white animate-pulse'
          }`}>
            {pendingSlotsCount} New
          </span>
        );
      }
      return null;
    }

    if (item.badgeKey === 'onboard' || item.id === 'onboard-queue') {
      if (pendingOnboardingsCount > 0) {
        return (
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
            isActive ? 'bg-white text-primary' : 'bg-amber-600 text-white animate-pulse'
          }`}>
            {pendingOnboardingsCount} New
          </span>
        );
      }
      return null;
    }

    if (item.badgeKey === 'forwarded_payments' || item.id === 'forwarded-payments') {
      if (pendingForwardedCount > 0) {
        return (
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
            isActive ? 'bg-white text-primary' : 'bg-emerald-600 text-white animate-pulse'
          }`}>
            {pendingForwardedCount} New
          </span>
        );
      }
      return null;
    }

    return null;
  };

  const getModuleBadge = (mod: NavModuleDef) => {
    if (mod.id === 'admissions-enrolment') {
      const totalAdmissionsPending = pendingSlotsCount + pendingOnboardingsCount;
      if (totalAdmissionsPending > 0) {
        return (
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-emerald-600 text-white shadow-2xs">
            {totalAdmissionsPending}
          </span>
        );
      }
    }
    if (mod.id === 'finance-billing') {
      if (pendingForwardedCount > 0) {
        return (
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full bg-emerald-600 text-white shadow-2xs">
            {pendingForwardedCount}
          </span>
        );
      }
    }
    return null;
  };

  // Standalone dashboard item
  const dashboardItem = useMemo(() => {
    const dashMod = navModules.find((m) => m.id === 'dashboard-module');
    return dashMod?.items[0] || null;
  }, [navModules]);

  // Non-dashboard collapsible modules
  const collapsibleModules = useMemo(() => {
    return navModules.filter((m) => m.id !== 'dashboard-module');
  }, [navModules]);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        id="main-sidebar"
        className={`fixed left-0 top-0 bottom-0 bg-[#f5ada8] border-r border-[#7a1228]/20 z-40 flex flex-col justify-between shadow-xl transition-all duration-200 ease-in-out ${
          isCompact ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0 !w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Top Brand Header */}
          <div className="h-16 px-3 flex items-center justify-between gap-2 border-b border-[#7a1228]/15 shrink-0 bg-[#f5ada8]">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-xs border border-[#7a1228]/25 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const fallback = (e.target as HTMLElement).nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
              <div className="w-9 h-9 rounded-xl bg-primary hidden items-center justify-center text-white shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[20px]">school</span>
              </div>
              {(!isCompact || mobileOpen) && (
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-headline-md text-sm text-primary font-bold tracking-tight truncate">
                    {user?.schoolName || 'Grace Seeds School'}
                  </span>
                  <span className="text-[10px] text-primary/75 italic truncate" title="The future Begins Here">
                    &quot;The future Begins Here&quot;
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Compact Toggle Button */}
            {onToggleCompact && (
              <button
                type="button"
                onClick={onToggleCompact}
                className="hidden lg:flex p-1.5 rounded-lg text-primary hover:bg-[#7a1228]/15 transition-colors cursor-pointer shrink-0"
                title={isCompact ? 'Expand Sidebar' : 'Collapse Sidebar to Icons'}
                aria-label="Toggle compact sidebar"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isCompact ? 'chevron_right' : 'chevron_left'}
                </span>
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-primary hover:bg-[#7a1228]/15 cursor-pointer shrink-0"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* User Profile Card (Full vs Compact) */}
          <div className="p-3 shrink-0">
            {!isCompact || mobileOpen ? (
              <div className="w-full p-2.5 rounded-xl bg-white/95 border border-[#7a1228]/15 shadow-2xs flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {user ? `${user.firstName[0]}${user.lastName[0]}` : <span className="material-symbols-outlined text-[16px]">person</span>}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs text-on-surface font-bold truncate">
                      {user?.fullName || 'Authorized Admin'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono truncate">
                      {user?.email || 'Administrator'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#7a1228]/10">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badgeStyle.bg} ${badgeStyle.text} uppercase tracking-wider`}>
                    {isStaffWithChildren && activeViewMode === 'PARENT'
                      ? "Parent View"
                      : getRoleDisplayName(user?.role)}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Session"></span>
                </div>

                {isStaffWithChildren && activeViewMode === 'PARENT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewMode('STAFF');
                      onSelectTab('dashboard');
                      onCloseMobile();
                    }}
                    className="w-full mt-0.5 py-1 px-2 rounded-lg bg-primary text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[#660000] transition-colors cursor-pointer"
                    title={user?.role === UserRole.TEACHER ? "Return to Teacher Workspace" : "Return to Staff Workspace"}
                  >
                    <span className="material-symbols-outlined text-[13px]">badge</span>
                    <span>{user?.role === UserRole.TEACHER ? 'Return to Teacher Workspace' : 'Return to Staff Workspace'}</span>
                  </button>
                )}

                {isStaffWithChildren && activeViewMode === 'STAFF' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveViewMode('PARENT');
                      onSelectTab('dashboard');
                      onCloseMobile();
                    }}
                    className="w-full mt-0.5 py-1 px-2 rounded-lg bg-[#7a1228]/10 hover:bg-[#7a1228]/20 border border-[#7a1228]/20 text-[#7a1228] text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Switch to Parent View to monitor your enrolled children"
                  >
                    <span className="material-symbols-outlined text-[13px]">family_restroom</span>
                    <span>Switch to Parent View (My Children)</span>
                  </button>
                )}

                {canAccessOnboardQueue && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#7a1228]/10">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('slot-applications');
                        onCloseMobile();
                      }}
                      className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                        currentTab === 'slot-applications'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-600/25 text-emerald-950'
                      }`}
                      title="Open Admission Slot Applications"
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-[13px] text-emerald-800 shrink-0">event_available</span>
                        <span className="truncate">Slots</span>
                      </div>
                      {pendingSlotsCount > 0 ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white animate-pulse shrink-0">
                          {pendingSlotsCount}
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-mono text-emerald-800/60 uppercase">0</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('onboard-queue');
                        onCloseMobile();
                      }}
                      className={`py-1 px-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                        currentTab === 'onboard-queue'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-600/25 text-amber-950'
                      }`}
                      title="Open Admitted Learner Onboard Queue"
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-[13px] text-amber-800 shrink-0">how_to_reg</span>
                        <span className="truncate">Onboard</span>
                      </div>
                      {pendingOnboardingsCount > 0 ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-600 text-white animate-pulse shrink-0">
                          {pendingOnboardingsCount}
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-mono text-amber-800/60 uppercase">0</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="w-10 h-10 mx-auto rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer"
                title={`${user?.fullName} (${getRoleDisplayName(user?.role)})`}
              >
                {user ? `${user.firstName[0]}${user.lastName[0]}` : 'GS'}
              </div>
            )}
          </div>

          {/* Scrollable Navigation Items */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 space-y-1.5 scrollbar-thin scrollbar-thumb-[#7a1228]/20">
            {/* Standalone Top Item: Dashboard */}
            {dashboardItem && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('dashboard');
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center ${
                    isCompact && !mobileOpen ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } rounded-xl transition-all cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'text-[#40000e] hover:bg-[#7a1228]/15 font-semibold'
                  }`}
                  title="Dashboard Overview"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`material-symbols-outlined text-[19px] shrink-0 ${
                      currentTab === 'dashboard' ? 'text-white' : 'text-[#7a1228]'
                    }`}>
                      dashboard
                    </span>
                    {(!isCompact || mobileOpen) && (
                      <span className="text-xs truncate">Dashboard</span>
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* Collapsible Accordion Navigation Modules */}
            {collapsibleModules.map((module) => {
              const isExpanded = expandedModuleId === module.id;
              const hasActiveChild = module.items.some((it) => it.id === currentTab);
              const moduleBadge = getModuleBadge(module);

              return (
                <div
                  key={module.id}
                  className="relative group rounded-xl"
                  onMouseEnter={() => {
                    if (isCompact && !mobileOpen) {
                      clearTimeout(hoverTimeoutRef.current);
                      setHoveredModuleId(module.id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isCompact && !mobileOpen) {
                      hoverTimeoutRef.current = setTimeout(() => {
                        setHoveredModuleId(null);
                      }, 200);
                    }
                  }}
                >
                  {/* Module Accordion Header Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompact && !mobileOpen) {
                        onToggleCompact?.();
                        setExpandedModuleId(module.id);
                      } else {
                        handleToggleModule(module.id);
                      }
                    }}
                    className={`w-full flex items-center ${
                      isCompact && !mobileOpen ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                    } rounded-xl transition-all cursor-pointer ${
                      hasActiveChild && !isExpanded
                        ? 'bg-[#7a1228]/20 text-primary font-bold border border-[#7a1228]/30 shadow-2xs'
                        : isExpanded
                        ? 'bg-[#7a1228]/15 text-primary font-bold'
                        : 'text-[#40000e] hover:bg-[#7a1228]/10 font-semibold'
                    }`}
                    title={module.title}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`material-symbols-outlined text-[19px] shrink-0 ${
                        hasActiveChild ? 'text-primary' : 'text-[#7a1228]'
                      }`}>
                        {module.icon}
                      </span>
                      {(!isCompact || mobileOpen) && (
                        <span className="text-xs tracking-tight truncate font-semibold">
                          {module.title}
                        </span>
                      )}
                    </div>

                    {(!isCompact || mobileOpen) && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {moduleBadge}
                        <span
                          className={`material-symbols-outlined text-[16px] text-[#7a1228]/80 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-primary' : ''
                          }`}
                        >
                          expand_more
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Desktop Compact Tooltip / Flyout Menu */}
                  {isCompact && !mobileOpen && hoveredModuleId === module.id && (
                    <div className="absolute left-full top-0 ml-2 z-50 bg-white border border-[#7a1228]/25 shadow-2xl rounded-2xl p-2.5 min-w-[220px] max-w-[280px] animate-in fade-in slide-in-from-left-2 duration-150">
                      <div className="px-2.5 py-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-primary truncate">{module.title}</span>
                        {moduleBadge}
                      </div>
                      <div className="space-y-1 max-h-[360px] overflow-y-auto">
                        {module.items.map((item) => {
                          const isActive = currentTab === item.id;
                          const itemBadge = getItemBadge(item, isActive);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onSelectTab(item.id);
                                setHoveredModuleId(null);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-primary text-white font-bold'
                                  : 'text-slate-700 hover:bg-[#7a1228]/10 hover:text-primary font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-[15px] shrink-0">{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                              </div>
                              {itemBadge}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded Submenu Accordion Drawer */}
                  {(!isCompact || mobileOpen) && isExpanded && (
                    <div className="mt-1 ml-4 pl-2.5 border-l-2 border-[#7a1228]/25 space-y-1 py-1 transition-all">
                      {module.items.map((item) => {
                        const isActive = currentTab === item.id;
                        const itemBadge = getItemBadge(item, isActive);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectTab(item.id);
                              onCloseMobile();
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                              isActive
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-[#500010] hover:bg-[#7a1228]/15 hover:text-primary font-medium'
                            }`}
                            data-path={item.id}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`material-symbols-outlined text-[15px] shrink-0 ${
                                isActive ? 'text-white' : 'text-[#7a1228]/70'
                              }`}>
                                {item.icon}
                              </span>
                              <span className="truncate font-medium">{item.label}</span>
                            </div>
                            {itemBadge}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Landing, Privacy, Sign Out */}
        <div className="p-2.5 shrink-0 border-t border-[#7a1228]/15 bg-[#f5ada8] space-y-1.5">
          {(!isCompact || mobileOpen) ? (
            <div className="bg-white/95 rounded-xl p-2 border border-[#7a1228]/15 shadow-2xs space-y-1">
              {onNavigateLanding && (
                <button
                  type="button"
                  onClick={onNavigateLanding}
                  className="w-full py-1.5 px-2 text-xs font-semibold text-[#40000e] hover:text-primary hover:bg-[#7a1228]/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">home</span>
                  <span>Landing Page</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenLegalModal?.('privacy')}
                className="w-full py-1 px-2 text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px] text-emerald-600">verified_user</span>
                <span>Legal & Privacy (KDPA)</span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full py-1.5 px-2 text-xs font-bold text-rose-800 hover:bg-rose-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1 flex flex-col items-center">
              {onNavigateLanding && (
                <button
                  type="button"
                  onClick={onNavigateLanding}
                  className="p-2 rounded-xl text-[#40000e] hover:bg-[#7a1228]/15 cursor-pointer"
                  title="Landing Page"
                >
                  <span className="material-symbols-outlined text-[18px]">home</span>
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-xl text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          )}

          {(!isCompact || mobileOpen) && (
            <div className="text-center text-[9.5px] text-[#7a1228]/70 flex items-center justify-center gap-1 pt-0.5">
              <span>Powered by</span>
              <span className="font-bold text-primary tracking-wide">Vellox Tech</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
