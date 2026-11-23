import type { TabType } from '../types';

/** Each stage has one destination. Editors belong to their document's stage. */
export const CURRICULUM_WORKFLOW = [
  { id: 'learning-areas', label: 'Learning Areas', icon: 'menu_book', description: 'Set up subjects and teaching assignments.' },
  { id: 'syllabus-coverage-plan', label: 'Syllabus Planning', icon: 'calendar_add_on', description: 'Allocate the term syllabus and submit the coverage plan for review.' },
  { id: 'schemes-lesson-plans', label: 'Schemes of Work', icon: 'edit_calendar', description: 'Prepare and review dated teaching sessions from approved syllabus plans.' },
  { id: 'lesson-plans', label: 'Lesson Plans', icon: 'menu_book', description: 'Prepare the activities and timing for each approved scheme lesson.' },
  { id: 'records-of-work', label: 'Records of Work', icon: 'auto_stories', description: 'Record actual teaching, reflections and catch-up work for verification.' },
  { id: 'curriculum-tracker', label: 'Coverage Tracking', icon: 'fact_check', description: 'Monitor reported and verified teaching in the weekly register.' },
] as const;
export type CurriculumPage = typeof CURRICULUM_WORKFLOW[number]['id'];
export function curriculumPageForTab(tab: TabType): CurriculumPage | undefined {
  if (tab === 'scheme-of-work-builder') return 'schemes-lesson-plans';
  return CURRICULUM_WORKFLOW.find(step => step.id === tab)?.id;
}
