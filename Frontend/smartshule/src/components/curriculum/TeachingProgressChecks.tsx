import React from 'react';
import {teachingProgressChecks,type TeachingProgressInput} from '../../utils/teachingProgress';

export function TeachingProgressChecks(props:TeachingProgressInput){
 return <div className="mt-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-2" aria-label="Automatic session checks">
  {teachingProgressChecks(props).map(check=><div key={check.label} role="checkbox" aria-label={check.label} aria-checked={check.partial?'mixed':check.checked} aria-readonly="true" className={`flex min-w-0 items-start gap-2 rounded-xl border p-3 ${check.checked?'border-emerald-200 bg-emerald-50 text-emerald-900':check.partial?'border-amber-200 bg-amber-50 text-amber-900':'border-outline-variant/30 bg-surface text-on-surface-variant'}`}>
   <span aria-hidden="true" className="material-symbols-outlined w-5 shrink-0 overflow-hidden text-xl">{check.checked?'check_circle':check.partial?'indeterminate_check_box':'radio_button_unchecked'}</span>
   <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{check.label}</p><p className="mt-1 text-xs">{check.detail}</p></div>
  </div>)}
 </div>;
}
