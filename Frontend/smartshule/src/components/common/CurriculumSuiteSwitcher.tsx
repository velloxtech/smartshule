import React from 'react';

export type CurriculumSuiteTab = 'schemes' | 'lesson-plans' | 'records-of-work' | 'curriculum-tracker';

interface CurriculumSuiteSwitcherProps {
  activeTab: CurriculumSuiteTab;
  onSelectTab: (tab: CurriculumSuiteTab) => void;
  counts?: {
    schemes?: number;
    lessonPlans?: number;
    recordsOfWork?: number;
    curriculumTrackers?: number;
  };
}

export const CurriculumSuiteSwitcher: React.FC<CurriculumSuiteSwitcherProps> = ({
  activeTab,
  onSelectTab,
  counts,
}) => {
  const tabs: Array<{
    id: CurriculumSuiteTab;
    label: string;
    shortLabel: string;
    icon: string;
    count?: number;
    description: string;
  }> = [
    {
      id: 'curriculum-tracker',
      label: 'Syllabus Coverage Plan',
      shortLabel: 'Coverage Plan',
      icon: 'fact_check',
      count: counts?.curriculumTrackers,
      description: 'Curriculum allocation & coverage progress',
    },
    {
      id: 'schemes',
      label: 'Schemes of Work',
      shortLabel: 'Schemes',
      icon: 'calendar_month',
      count: counts?.schemes,
      description: 'Term-long curriculum breakdown',
    },
    {
      id: 'lesson-plans',
      label: '40-Min Lesson Plans',
      shortLabel: 'Lesson Plans',
      icon: 'menu_book',
      count: counts?.lessonPlans,
      description: 'Daily lesson delivery steps',
    },
    {
      id: 'records-of-work',
      label: 'Records of Work',
      shortLabel: 'Records of Work',
      icon: 'auto_stories',
      count: counts?.recordsOfWork,
      description: 'Documented work covered & reflections',
    },
  ];

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-2 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-2 py-1.5 border-b border-outline-variant/30 mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">account_tree</span>
          <span className="text-xs font-black uppercase tracking-wider text-on-surface">
            Curriculum Planning & Coverage Suite
          </span>
        </div>
        <span className="text-[11px] text-on-surface-variant italic">
          KICD Competency-Based Curriculum (CBC) Professional Pedagogical Records
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(tab.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-r from-primary to-maroon-light text-white border-primary shadow-sm'
                  : 'bg-surface/70 hover:bg-surface-container-low/80 text-on-surface-variant border-outline-variant/30'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isActive ? 'text-white' : 'text-primary'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span className="font-black text-xs truncate">{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
              <p
                className={`text-[10px] truncate ${
                  isActive ? 'text-white/80' : 'text-on-surface-variant'
                }`}
              >
                {tab.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
