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
    {
      id: 'curriculum-tracker',
      label: 'Curriculum Tracker',
      shortLabel: 'Tracker',
      icon: 'fact_check',
      count: counts?.curriculumTrackers,
      description: 'Weekly syllabus progression & audit',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-2 py-1.5 border-b border-slate-100 mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-[#7a1228]">account_tree</span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Curriculum Planning & Coverage Suite
          </span>
        </div>
        <span className="text-[11px] text-slate-500 italic">
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
              onClick={() => onSelectTab(tab.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-r from-[#7a1228] to-[#9e1c38] text-white border-[#7a1228] shadow-sm'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 text-slate-700 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isActive ? 'text-white' : 'text-[#7a1228]'
                    }`}
                  >
                    {tab.icon}
                  </span>
                  <span className="font-black text-xs truncate">{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
              <p
                className={`text-[10px] truncate ${
                  isActive ? 'text-white/80' : 'text-slate-500'
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
