import { TeacherAssignmentAccess } from '../../src/application/shared/TeacherAssignmentAccess';

describe('Current-term assignment effective dates', () => {
  afterEach(() => jest.useRealTimers());

  it('uses today for the current term even when its stored end date has passed', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-14T09:00:00Z'));
    const year = { id: 'year', schoolId: 'school', isCurrent: true };
    const term = { id: 'term', academicYearId: 'year', isCurrent: true, startDate: '2026-08-24', endDate: '2026-10-23' };
    const assignment = { schoolId: 'school', academicYearId: 'year', isActive: true, effectiveFrom: '2026-11-05' };
    const academic: any = {
      findCurrentYear: async () => year,
      findCurrentTerm: async () => term,
      findClassTeacherAssignments: async () => [assignment, { ...assignment, effectiveFrom: '2026-11-15' }, { ...assignment, effectiveTo: '2026-11-13' }],
      findSubjectTeacherAssignments: async () => [assignment]
    };
    const access = new TeacherAssignmentAccess(academic, { findByUserId: async () => ({ id: 'teacher' }) } as any);
    const actor = { userId: 'user', role: 'TEACHER', schoolId: 'school' };
    const current = await access.assignments(actor);
    expect(current.classes).toEqual([assignment]);
    expect(current.subjects).toEqual([assignment]);

    // A historical term still evaluates assignments within its own bounds.
    term.isCurrent = false;
    const historical = await access.assignments(actor);
    expect(historical.classes).toEqual([]);
    expect(historical.subjects).toEqual([]);
  });
});
