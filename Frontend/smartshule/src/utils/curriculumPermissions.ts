import { UserRole, SchemeOfWork, SchemeEntry } from '../types';

export const curriculumReviewRoles: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.HEAD_TEACHER,
  UserRole.DEPUTY_HEAD_TEACHER,
];

export const canManageCurriculum = (role?: UserRole | string) =>
  Boolean(role && [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN].includes(role as UserRole));

export const canPrepareCurriculum = (role?: UserRole | string) =>
  role === UserRole.TEACHER || canManageCurriculum(role);

export const canReviewCurriculum = (role?: UserRole | string) =>
  Boolean(role && curriculumReviewRoles.includes(role as UserRole));

export const isApprovedSchemeEntry = (scheme: Pick<SchemeOfWork, 'status' | 'planningState'>, entry: SchemeEntry) =>
  Boolean(entry.id && !entry.archivedAt && (scheme.planningState?.approvedEntryIds
    ? scheme.planningState.approvedEntryIds.includes(entry.id)
    : scheme.status === 'APPROVED'));
