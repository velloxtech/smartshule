import React from 'react';
import { initialClasses } from '../../data/mockData';

export const ClassesView: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
          <span>Home</span>
          <span>/</span>
          <span>Academics</span>
          <span>/</span>
          <span className="text-primary font-semibold">Classes & Streams</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
          Classes, Streams & Learner Distribution
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          PP1 through Grade 6 CBC streams, gender breakdown, and classroom allocations
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {initialClasses.map((c) => (
          <div
            key={c.grade}
            className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  {c.roomNumber}
                </span>
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                  {c.proficientRate}% Proficient
                </span>
              </div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mt-2">{c.grade}</h3>
              <p className="text-xs text-on-surface-variant">{c.stream} Streams</p>

              <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Class Teacher:</span>
                  <span className="font-semibold text-primary">{c.classTeacher}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Total Learners:</span>
                  <span className="font-bold text-on-surface font-data-mono">{c.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Gender Split:</span>
                  <span className="font-data-mono text-outline">
                    {c.boys} Boys · {c.girls} Girls
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Avg Daily Roll Call:</span>
                  <span className="font-bold text-secondary font-data-mono">{c.avgAttendance}%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container">
              <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-primary h-full"
                  style={{ width: `${(c.boys / c.total) * 100}%` }}
                  title="Boys"
                ></div>
                <div
                  className="bg-secondary h-full"
                  style={{ width: `${(c.girls / c.total) * 100}%` }}
                  title="Girls"
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-outline mt-1 font-data-mono">
                <span>Boys: {((c.boys / c.total) * 100).toFixed(0)}%</span>
                <span>Girls: {((c.girls / c.total) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
