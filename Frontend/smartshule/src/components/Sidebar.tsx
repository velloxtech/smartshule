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
                    <span className="font-label-md text-[11px] font-bold text-[#7a1228]/80 uppercase tracking-wider">
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
                          ? 'bg-primary text-white font-semibold shadow-sm'
                          : 'text-[#40000e] hover:bg-[#F8F5F5]/60 hover:text-primary'
                      }`}
                      data-path={item.id}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-white' : 'text-[#7a1228]/80'}`}>
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
