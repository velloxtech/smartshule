import React from 'react';
import { TabType } from '../types';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: { group?: string; items: { id: TabType; label: string; icon: string }[] }[] = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      ],
    },
    {
      group: 'Academics',
      items: [
        { id: 'students-guardians', label: 'Students & Guardians', icon: 'group' },
        { id: 'teachers-staff', label: 'Teachers & Staff', icon: 'badge' },
        { id: 'classes-streams', label: 'Classes & Streams', icon: 'meeting_room' },
        { id: 'learning-areas', label: 'Learning Areas', icon: 'menu_book' },
      ],
    },
    {
      group: 'CBC Competencies',
      items: [
        { id: 'assessments', label: 'Assessments (Form/Summ)', icon: 'assignment' },
        { id: 'competencies-strands', label: 'Strands & Sub-strands', icon: 'account_tree' },
        { id: 'report-cards', label: 'CBC Report Cards', icon: 'article' },
        { id: 'cbc-analytics', label: 'Competency Analytics', icon: 'monitoring' },
      ],
    },
    {
      group: 'Operations',
      items: [
        { id: 'schemes-lesson-plans', label: 'Schemes & Lesson Plans', icon: 'edit_calendar' },
        { id: 'timetable', label: 'Timetable Builder', icon: 'calendar_view_week' },
        { id: 'attendance-register', label: 'Daily Attendance', icon: 'checklist' },
      ],
    },
    {
      group: 'Finance & Billing',
      items: [
        { id: 'fee-structure', label: 'Fee Structure', icon: 'payments' },
        { id: 'invoices-mpesa', label: 'M-Pesa & Fee Invoices', icon: 'receipt_long' },
        { id: 'defaulters-receipts', label: 'Defaulters & Receipts', icon: 'point_of_sale' },
      ],
    },
  ];

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
                <span className="font-headline-md text-body-md text-primary font-semibold tracking-tight">
                  smartshule CBC
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Kenya Portal
                </span>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded hover:bg-surface-container text-on-surface-variant"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* User Profile Card */}
          <div className="p-md bg-surface-container-lowest">
            <div className="p-sm rounded-lg bg-surface-container-low flex items-center gap-sm">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-headline-md text-body-md text-on-surface truncate font-semibold">
                  Maina Kamau
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant truncate">
                  Admin · Hillside Academy
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-sm pb-lg flex flex-col gap-xs">
            {navItems.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                {section.group && (
                  <div className={`px-sm ${sIdx === 0 ? 'pt-sm' : 'pt-md'} pb-xs`}>
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
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
                      className={`flex items-center gap-sm px-sm py-sm text-left w-full transition-all rounded-lg cursor-pointer ${
                        isActive
                          ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                      data-path={item.id}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-white' : ''}`}>
                        {item.icon}
                      </span>
                      <span className="font-body-md text-body-md truncate">{item.label}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Server Status Footer */}
        <div className="p-sm bg-surface-container-low m-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-xs">
            <span className="w-2 h-2 rounded-full bg-secondary"></span>
            <span className="font-label-md text-label-md text-on-surface-variant">CBC Server v1.4</span>
          </div>
          <span className="font-label-md text-label-md text-secondary font-medium">Online</span>
        </div>
      </aside>
    </>
  );
};
