import React from 'react';
import { initialLearningAreas } from '../../data/mockData';

export const LearningAreasView: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
          <span>Home</span>
          <span>/</span>
          <span>Academics</span>
          <span>/</span>
          <span className="text-primary font-semibold">Learning Areas</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">
          KICD CBC Learning Areas & Competency Strands
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Curriculum designs, core sub-strands, assessment criteria, and lead instructional teachers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialLearningAreas.map((la) => (
          <div
            key={la.id}
            className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-data-mono text-xs font-bold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded">
                  {la.code}
                </span>
                <span className="text-xs font-semibold text-primary bg-surface-container px-2 py-0.5 rounded">
                  {la.category}
                </span>
              </div>
              <h3 className="font-headline-md text-base font-bold text-on-surface mt-3">
                {la.name}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Target: {la.grades.join(', ')}
              </p>

              <div className="mt-4 pt-3 border-t border-surface-container space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Instructional Lead:</span>
                  <span className="font-semibold text-on-surface">{la.leadTeacher}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Syllabus Strands:</span>
                  <span className="font-bold text-primary font-data-mono">{la.strandsCount} Strands</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Active Sub-Strands:</span>
                  <span className="font-data-mono text-on-surface">{la.subStrandsCount} Competencies</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Assessments Logged:</span>
                  <span className="font-bold text-secondary font-data-mono">
                    {la.assessmentsCount.toLocaleString()} Entries
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
              <span className="text-[11px] text-outline">KNEC CBC syllabus compliant</span>
              <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer">
                Curriculum Design <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
