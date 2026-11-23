/** Administrative authority does not replace tenant, ownership, or workflow validation. */
export const hasAdministrativeAccess = (role?: string) =>
  Boolean(role && ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN'].includes(role));

export const canPrepareCurriculum = (role?: string) =>
  role === 'TEACHER' || hasAdministrativeAccess(role);
