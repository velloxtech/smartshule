import type { AppContainer } from '../../infrastructure/container';
import { TeacherAssignmentAccess } from '../shared/TeacherAssignmentAccess';
import { CurriculumPlanUseCases } from '../curriculum-plans/CurriculumPlanUseCases';
import { CalendarPlanningService } from './CalendarPlanningService';

/** Reuse identical reads only while assembling one GET response. Never shared
 * between users or requests; permission checks still run against these reads. */
export function memoizePlanningReads<T extends object>(repository: T): T {
  const reads = new Map<string, Promise<unknown>>();
  return new Proxy(repository, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      if (typeof property !== 'string' || !(property.startsWith('find') || property === 'get')) {
        return value.bind(target);
      }
      return (...args: unknown[]) => {
        const key = JSON.stringify([property, args]);
        let pending = reads.get(key);
        if (!pending) {
          pending = Promise.resolve().then(() => value.apply(target, args));
          reads.set(key, pending);
        }
        return pending;
      };
    },
  });
}

export function createPlanningReadContext(c: AppContainer) {
  const academicRepository = memoizePlanningReads(c.academicRepository);
  const teacherRepository = memoizePlanningReads(c.teacherRepository);
  const schemeOfWorkRepository = memoizePlanningReads(c.schemeOfWorkRepository);
  const lessonPlanRepository = memoizePlanningReads(c.lessonPlanRepository);
  const planningRepository = memoizePlanningReads(c.planningRepository);
  const assignmentAccess = new TeacherAssignmentAccess(academicRepository, teacherRepository);
  const calendarPlanning = new CalendarPlanningService(planningRepository, academicRepository,
    memoizePlanningReads(c.timetableRepository), schemeOfWorkRepository, assignmentAccess);
  const curriculumUseCases = new CurriculumPlanUseCases(schemeOfWorkRepository,
    lessonPlanRepository, teacherRepository, assignmentAccess, calendarPlanning);
  return { academicRepository, teacherRepository, schemeOfWorkRepository, lessonPlanRepository,
    planningRepository, assignmentAccess, calendarPlanning, curriculumUseCases,
    userRepository: memoizePlanningReads(c.userRepository),
    recordOfWorkRepository: memoizePlanningReads(c.recordOfWorkRepository) };
}
