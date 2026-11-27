import { curriculumPageForTab } from '../utils/curriculumWorkflow';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TabType, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getFilteredNavModules,
  NavModuleDef,
  NavItemDef,
} from '../utils/rbac';
import { onboardingService } from '../services/onboardingService';
import { apiService, captureApiRequestScope } from '../services/api';

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
  const { user, logout, activeViewMode, isStaffWithChildren } = useAuth();
  const effectiveRole = (isStaffWithChildren && activeViewMode === 'PARENT') ? UserRole.PARENT : user?.role;
  const navModules = useMemo(() => getFilteredNavModules(effectiveRole), [effectiveRole]);

  const [pendingOnboardingsCount, setPendingOnboardingsCount] = useState(0);
  const [pendingSlotsCount, setPendingSlotsCount] = useState(0);
  const [pendingForwardedCount, setPendingForwardedCount] = useState(0);

  // Hover state for compact flyout menu
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const navigationTab = curriculumPageForTab(currentTab) || currentTab;

  // Find module that owns currentTab
  const activeModuleId = useMemo(() => {
    for (const mod of navModules) {
      if (mod.items.some((it) => it.id === navigationTab)) {
        return mod.id;
      }
    }
    return null;
  }, [navModules, navigationTab]);

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
    let live = true;
    let inFlight = false;
    const isCurrentScope = captureApiRequestScope();
    const updateCounts = async () => {
      if (!live || document.hidden || inFlight || !isCurrentScope()) return;
      inFlight = true;
      try {
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
            if (live && isCurrentScope() && res?.success && Array.isArray(res.data)) {
              const pending = res.data.filter((tx: any) => tx.status === 'PENDING').length;
              setPendingForwardedCount(pending);
            }
          } catch {}
        }
      } finally { inFlight = false; }
    };

    updateCounts();
    if (typeof window !== 'undefined') {
      window.addEventListener('smartshule_onboarding_updated', updateCounts);
      document.addEventListener('visibilitychange', updateCounts);
    }
    const interval = setInterval(updateCounts, 30000);
    return () => {
      live = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('smartshule_onboarding_updated', updateCounts);
        document.removeEventListener('visibilitychange', updateCounts);
      }
      clearInterval(interval);
    };
  }, [effectiveRole, user?.id]);

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
        className={`fixed left-0 top-0 bottom-0 bg-[#f5ada8] border-r border-primary/20 z-40 flex flex-col shadow-xl transition-all duration-200 ease-in-out ${
          isCompact ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0 !w-64' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Header */}
        <div className="h-16 px-3 flex items-center justify-between gap-2 border-b border-primary/15 shrink-0 bg-[#f5ada8]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-xl object-cover shadow-xs border border-primary/25 shrink-0"
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
              className="hidden lg:flex p-1.5 rounded-lg text-primary hover:bg-primary/15 transition-colors cursor-pointer shrink-0"
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
            className="lg:hidden p-1.5 rounded-lg text-primary hover:bg-primary/15 cursor-pointer shrink-0"
            aria-label="Close sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Container with Nav and Non-Sticky Bottom Card (moves with sidebar) */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-[#791329]/20 flex flex-col justify-between">
          <nav className="px-2 pt-3 pb-2 space-y-1.5">
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
                      : 'text-[#40000e] hover:bg-primary/15 font-semibold'
                  }`}
                  title="Dashboard Overview"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`material-symbols-outlined text-[19px] shrink-0 ${
                      currentTab === 'dashboard' ? 'text-white' : 'text-primary'
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
              const hasActiveChild = module.items.some((it) => it.id === navigationTab);
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
                        ? 'bg-primary/20 text-primary font-bold border border-primary/30 shadow-2xs'
                        : isExpanded
                        ? 'bg-primary/15 text-primary font-bold'
                        : 'text-[#40000e] hover:bg-primary/10 font-semibold'
                    }`}
                    title={module.title}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`material-symbols-outlined text-[19px] shrink-0 ${
                        hasActiveChild ? 'text-primary' : 'text-primary'
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
                          className={`material-symbols-outlined text-[16px] text-primary/80 transition-transform duration-200 ${
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
                    <div className="absolute left-full top-0 ml-2 z-50 bg-[#e69b95] dark:bg-[#4a101d] border border-primary/25 shadow-2xl rounded-2xl p-2.5 min-w-[220px] max-w-[280px] animate-in fade-in slide-in-from-left-2 duration-150">
                      <div className="px-2.5 py-1.5 mb-1.5 border-b border-primary/20 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#40000e] dark:text-rose-100 truncate">{module.title}</span>
                        {moduleBadge}
                      </div>
                      <div className="space-y-0.5 max-h-[360px] overflow-y-auto">
                        {module.items.map((item) => {
                          const isActive = navigationTab === item.id;
                          const itemBadge = getItemBadge(item, isActive);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onSelectTab(item.id);
                                setHoveredModuleId(null);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all duration-150 cursor-pointer ${
                                isActive
                                  ? 'bg-primary text-white font-bold shadow-xs'
                                  : 'text-[#40000e] hover:bg-black/10 hover:text-[#2d000a] dark:text-rose-100 dark:hover:bg-black/20 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`material-symbols-outlined text-[15px] shrink-0 ${
                                  isActive ? 'text-white' : 'text-primary'
                                }`}>
                                  {item.icon}
                                </span>
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
                    <div className="mt-1 ml-3 mr-1.5 p-1.5 rounded-xl bg-black/[0.07] dark:bg-black/25 border-l-2 border-primary/35 border border-primary/15 shadow-inner space-y-0.5 transition-all duration-200">
                      {module.items.map((item) => {
                        const isActive = navigationTab === item.id;
                        const itemBadge = getItemBadge(item, isActive);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectTab(item.id);
                              onCloseMobile();
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all duration-150 cursor-pointer ${
                              isActive
                                ? 'bg-primary text-white font-bold shadow-xs'
                                : 'text-[#40000e] hover:bg-black/10 hover:text-[#2d000a] dark:text-rose-100 dark:hover:bg-black/20 font-medium'
                            }`}
                            data-path={item.id}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`material-symbols-outlined text-[15px] shrink-0 ${
                                isActive ? 'text-white' : 'text-primary/75'
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

          {/* Sidebar Footer Card: Landing, Privacy, Sign Out (moves with the sidebar, non-sticky) */}
          <div className="p-2.5 mt-auto space-y-1.5">
            {(!isCompact || mobileOpen) ? (
              <div className="bg-white/95 rounded-xl p-2 border border-primary/15 shadow-2xs space-y-1">
                {onNavigateLanding && (
                  <button
                    type="button"
                    onClick={onNavigateLanding}
                    className="w-full py-1.5 px-2 text-xs font-semibold text-[#40000e] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">home</span>
                    <span>Landing Page</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenLegalModal?.('privacy')}
                  className="w-full py-1 px-2 text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-surface-container-low rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px] text-primary">verified_user</span>
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
                    className="p-2 rounded-xl text-[#40000e] hover:bg-primary/15 cursor-pointer"
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
              <div className="text-center text-[9.5px] text-primary/70 flex items-center justify-center gap-1 pt-0.5">
                <span>Powered by</span>
                <span className="font-bold text-primary tracking-wide">Vellox Tech</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
