import React from 'react';

export function CoverageProgressBar({confirmed,total,label='Confirmed lesson coverage'}:{confirmed:number;total:number;label?:string}){
  const scheduled=Number.isFinite(total)?Math.max(0,total):0;
  const covered=Number.isFinite(confirmed)?Math.min(scheduled,Math.max(0,confirmed)):0;
  const percentage=scheduled?Math.round(covered*100/scheduled):0;
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-on-surface">{label}</span><span className="font-semibold text-primary">{scheduled?`${covered}/${scheduled} lessons · ${percentage}%`:'No scheduled lessons'}</span></div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-valuetext={scheduled?`${covered} of ${scheduled} lessons confirmed, ${percentage}%`:'No scheduled lessons'} className="h-3 overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container">
      <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{width:`${percentage}%`}}/>
    </div>
  </div>;
}
