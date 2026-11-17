import React from 'react';
import {CoverageProgressBar} from './CoverageProgressBar';

const marks = [
  ['planned', 'Planned'],
  ['reported', 'Reported'],
  ['taught', 'Confirmed'],
  ['reflection', 'Reflection'],
] as const;

export function ClassCoverageSummary({ area, className, streamName }: { area: any; className: string; streamName: string }) {
  return <section aria-label="Class subject coverage" className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-5">
    <div><h2 className="text-xl font-bold">{area.name}</h2><p className="text-sm text-on-surface-variant">{className} · {streamName || 'Whole class'} · Class coverage</p></div>
    <p className="text-sm text-on-surface-variant">View only. The assigned subject teacher prepares this subject’s scheme and lesson plans.</p>
    {area.setupRequired && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{area.setupRequired}</p>}
    {area.coverage?.length ? <div className="space-y-6">{area.coverage.map((row: any, index: number) => {
      const lessons = row.lessons || [];
      const taught = lessons.filter((lesson: any) => lesson.statuses?.taught).length;
      const planned = lessons.filter((lesson: any) => lesson.statuses?.planned).length;
      const reflected = lessons.filter((lesson: any) => lesson.statuses?.reflection).length;
      const weeks = [...new Set(lessons.map((lesson: any) => lesson.weekNumber))] as number[];
      return <article key={index} className="space-y-4 rounded-xl border border-outline-variant/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{row.teacherName}</h3><p className="text-xs text-on-surface-variant">{row.status} · {row.allocatedLessons} lessons allocated</p></div><div className="text-sm font-semibold">{taught}/{lessons.length} taught</div></div>
        <CoverageProgressBar confirmed={taught} total={lessons.length} label={`${row.teacherName} confirmed lesson coverage`}/>
        <p className="text-xs text-on-surface-variant">Planned {planned}/{lessons.length} · Reported {lessons.filter((lesson:any)=>lesson.statuses?.reported).length}/{lessons.length} · Confirmed {taught}/{lessons.length} · Reflected {reflected}/{lessons.length}</p>
        {weeks.length ? <div className="space-y-4">{weeks.map(week => <section key={week} aria-label={`Week ${week} lessons`}><h4 className="mb-2 text-sm font-semibold">Week {week}</h4><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{lessons.filter((lesson: any) => lesson.weekNumber === week).map((lesson: any, lessonIndex: number) => <div key={`${lesson.date}-${lesson.lessonNumber}-${lessonIndex}`} className="rounded-lg border border-outline-variant/30 p-3"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">Lesson {lesson.lessonNumber}</strong><time className="text-xs text-on-surface-variant">{lesson.date}</time></div><p className="mt-2 text-xs text-on-surface-variant">{lesson.strandTitle || 'Topic pending'}{lesson.subStrandTitle ? ` · ${lesson.subStrandTitle}` : ''}</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{marks.map(([key, label]) => <span key={key} className={`text-[11px] ${lesson.statuses?.[key] ? 'font-semibold text-emerald-700' : 'text-slate-400'}`}>{lesson.statuses?.[key] ? '✓' : '○'} {label}</span>)}</div></div>)}</div></section>)}</div> : <p className="rounded-lg bg-surface p-3 text-sm text-on-surface-variant">No scheduled lesson details are available yet.</p>}
      </article>;
    })}</div> : <p className="rounded-lg bg-surface p-4 text-sm text-on-surface-variant">No scheme of work has been saved for this subject yet.</p>}
  </section>;
}
