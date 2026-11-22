import React from 'react';
import { CURRICULUM_WORKFLOW, CurriculumPage } from '../../utils/curriculumWorkflow';

export function CurriculumSuiteSwitcher({activeTab,onSelectTab,canAccess}:{activeTab:CurriculumPage;onSelectTab:(tab:CurriculumPage)=>void;canAccess:(tab:CurriculumPage)=>boolean}) {
  const current=CURRICULUM_WORKFLOW.find(step=>step.id===activeTab)!;
  return <nav aria-label="Curriculum workflow" className="mb-6 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-3 sm:p-4">
    <p className="mb-3 text-sm font-semibold text-primary">Plan → Prepare → Teach → Verify</p>
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {CURRICULUM_WORKFLOW.map((step,index)=>canAccess(step.id)&&<li key={step.id}>
        <button type="button" aria-current={activeTab===step.id?'page':undefined} onClick={()=>onSelectTab(step.id)} className={`h-full w-full rounded-xl border p-3 text-left text-xs font-semibold ${activeTab===step.id?'border-primary bg-primary text-white':'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'}`}>
          <span className="mb-1 block text-[11px] opacity-80">Step {index+1}</span>{step.label}
        </button>
      </li>)}
    </ol>
    <p className="mt-3 text-xs text-on-surface-variant"><strong>{current.label}:</strong> {current.description}</p>
  </nav>;
}
