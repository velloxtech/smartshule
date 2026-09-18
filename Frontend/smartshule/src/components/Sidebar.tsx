import React from 'react';
import { TabType } from '../types';
import { useAuth } from '../context/AuthContext';
import { getFilteredNavSections, getRoleDisplayName, getRoleBadgeStyle } from '../utils/rbac';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigateLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  onNavigateLanding,
}) => {
  const { user, logout } = useAuth();
  const navSections = getFilteredNavSections(user?.role);
  const badgeStyle = getRoleBadgeStyle(user?.role);

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
        className={`fixed left-0 top-0 bottom-0 w-64 bg-surface-container-lowest z-40 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] overflow-y-auto transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Brand Header */}
          <div className="h-16 px-md flex items-center justify-between gap-sm bg-surface-container-low">
            <div className="flex items-center gap-sm">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[20px] text-white">school</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-headline-md text-body-md text-primary font-bold tracking-tight">
                  {user?.schoolName || 'SmartShule'}
                </span>
                <span className="font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  CBC Portal
                </span>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded hover:bg-surface-container text-on-surface-variant cursor-pointer"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* User Profile Card */}
          <div className="p-md bg-surface-container-lowest">
            <div className="w-full p-3 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/30">
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
              <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyle.bg} ${badgeStyle.text} uppercase tracking-wider`}>
                  {getRoleDisplayName(user?.role)}
                </span>
                <span className="w-2 h-2 rounded-full bg-secondary" title="Active Session"></span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-sm pb-lg flex flex-col gap-xs">
            {navSections.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                {section.group && (
                  <div className={`px-sm ${sIdx === 0 ? 'pt-xs' : 'pt-md'} pb-xs`}>
                    <span className="font-label-md text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      {section.group}
                    </span>
                  </div>
                )}
                {section.items.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`flex items-center gap-sm px-sm py-2 text-left w-full transition-all rounded-lg cursor-pointer ${
                        isActive
                          ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                      data-path={item.id}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-white' : ''}`}>
                        {item.icon}
                      </span>
                      <span className="font-body-md text-sm truncate">{item.label}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: Landing Page & Sign Out */}
        <div className="p-sm bg-surface-container-low m-sm rounded-xl space-y-2 border border-outline-variant/20">
          {onNavigateLanding && (
            <button
              onClick={onNavigateLanding}
              className="w-full py-1.5 px-2 text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Landing Page</span>
            </button>
          )}

          <button
            onClick={logout}
            className="w-full py-1.5 px-2 text-xs font-semibold text-error hover:bg-error-container/20 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>

        {/* Vellox Tech Company Watermark */}
        <div className="px-3 pb-3 text-center text-[10px] text-on-surface-variant/70 flex items-center justify-center gap-1">
          <span>Powered by</span>
          <span className="font-bold text-primary tracking-wide">Vellox Tech</span>
        </div>
      </aside>
    </>
  );
};
