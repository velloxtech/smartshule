import React from 'react';

export const ViewLoadingSkeleton: React.FC<{ title?: string }> = ({ title = 'Loading Module...' }) => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Top Header Bar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-32 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl"></div>
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Content / Table Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-9 w-64 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                </div>
              </div>
              <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
