import { SchemeOfWorkEntry, SchemePlanningState } from '../../core/domain/curriculum-plan/SchemeOfWork';
import { ValidationError } from '../../core/domain/shared/Errors';

/** A weekly scheme can refine teaching content, never replace its saved coverage selection. */
export function assertWeeklyCoverage(state: SchemePlanningState, entries: SchemeOfWorkEntry[]) {
  for (const entry of entries.filter(row => !row.archivedAt)) {
    const allocation = state.allocations.find(row => row.subStrandId === entry.subStrandId);
    if (!allocation || JSON.stringify([...(allocation.combinedSubStrandIds || [])].sort()) !== JSON.stringify([...(entry.combinedSubStrandIds || [])].sort())) {
      throw new ValidationError('Weekly lesson curriculum must come from the saved syllabus coverage.');
    }
  }
}

export function weeklyLessonComplete(entry: SchemeOfWorkEntry) {
  return Boolean(!entry.archivedAt && entry.strandTitle?.trim() && entry.subStrandTitle?.trim()
    && entry.specificLearningOutcomes?.some(value => value.trim())
    && entry.learningExperiences?.some(value => value.trim())
    && entry.assessmentMethods?.some(value => value.trim()));
}

export function selectWeeklySubmission(state: SchemePlanningState, entries: SchemeOfWorkEntry[], requested?: string[]) {
  const approved = new Set(state.approvedEntryIds || []);
  const selected = requested || entries.filter(entry => !approved.has(entry.id) && weeklyLessonComplete(entry)).map(entry => entry.id);
  if (!selected.length) throw new ValidationError('Complete at least one scheduled weekly lesson, including outcomes, learning experiences and assessment methods, before submitting.');
  if (new Set(selected).size !== selected.length) throw new ValidationError('Each submitted lesson must be selected once.');
  const rows = selected.map(id => entries.find(entry => entry.id === id && !entry.archivedAt));
  if (rows.some(entry => !entry || approved.has(entry.id) || !weeklyLessonComplete(entry))) throw new ValidationError('Select only completed, unapproved scheme lessons for review.');
  return rows as SchemeOfWorkEntry[];
}

export function weeklyReviewEntries(state: SchemePlanningState | undefined, entries: SchemeOfWorkEntry[]) {
  if (!state?.submittedEntryIds) return entries;
  if (!state.submittedEntryIds.length || new Set(state.submittedEntryIds).size !== state.submittedEntryIds.length) throw new ValidationError('The submitted scheme lesson selection is invalid.');
  return state.submittedEntryIds.map(id => {
    const entry = entries.find(row => row.id === id && !row.archivedAt);
    if (!entry) throw new ValidationError('A submitted scheme lesson is missing.');
    return entry;
  });
}
