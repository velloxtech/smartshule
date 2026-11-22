import { Request, Response, NextFunction } from 'express';
import { IAuthTokenService } from '../../../core/ports/services/IExternalServices';
import {IUserRepository} from '../../../core/ports/repositories/IUserRepository';
import { UserStatus, UserRole } from '../../../core/domain/user/User';
import { UnauthorizedError, ForbiddenError } from '../../../core/domain/shared/Errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    phone?: string;
    role: UserRole;
    schoolId?: string;
  };
}

async function authenticatedActor(req: AuthenticatedRequest, tokenService: IAuthTokenService, users?: IUserRepository) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Authorization token required');
  const payload = tokenService.verifyAccessToken(header.split(' ')[1]);
  if (!payload) throw new UnauthorizedError('Invalid or expired token');
  if (users) {
    const user = await users.findById(payload.userId);
    if (!user || user.status !== UserStatus.ACTIVE || user.role !== payload.role || user.schoolId !== payload.schoolId) {
      throw new UnauthorizedError('Your account permissions have changed. Please sign in again.');
    }
  }
  // Parent View can reduce authority; a header can never grant a staff role.
  return req.headers['x-portal-view'] === 'PARENT' && payload.role !== UserRole.STUDENT
    ? {...payload,role:UserRole.PARENT} : payload;
}

export function createAuthMiddleware(tokenService: IAuthTokenService, users?: IUserRepository) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try { req.user = await authenticatedActor(req,tokenService,users);next(); } catch(error) { next(error); }
  };
}

export function createOptionalAuthMiddleware(tokenService: IAuthTokenService, users?: IUserRepository) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      if (req.headers.authorization) req.user = await authenticatedActor(req,tokenService,users);
      next();
    } catch(error) { if(!users){delete req.user;return next();}next(error); }
  };
}

export function requireRoles(...allowedRoles: (UserRole | UserRole[])[]) {
  const flatRoles = allowedRoles.flat(Infinity) as UserRole[];
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next(); // Super admin bypass
    }

    const expandedAllowed = new Set<string>();
    for (const r of flatRoles) {
      expandedAllowed.add(r);
      if (r === UserRole.ADMIN || r === UserRole.SCHOOL_ADMIN) {
        expandedAllowed.add(UserRole.ADMIN);
        expandedAllowed.add(UserRole.SCHOOL_ADMIN);
      }
      if (r === UserRole.HEAD_TEACHER || (r as string) === 'HEADTEACHER') {
        expandedAllowed.add(UserRole.HEAD_TEACHER);
        expandedAllowed.add('HEADTEACHER');
      }
      if (r === UserRole.BURSAR || r === UserRole.ACCOUNTANT) {
        expandedAllowed.add(UserRole.BURSAR);
        expandedAllowed.add(UserRole.ACCOUNTANT);
      }
      if (r === UserRole.PARENT || r === UserRole.GUARDIAN) {
        expandedAllowed.add(UserRole.PARENT);
        expandedAllowed.add(UserRole.GUARDIAN);
      }
    }

    const userRoleStr = req.user.role ? String(req.user.role).toUpperCase().replace(/\s+/g, '_') : '';
    if (!expandedAllowed.has(req.user.role) && !expandedAllowed.has(userRoleStr)) {
      return next(new ForbiddenError(`Required role: ${flatRoles.join(' or ')}`));
    }

    next();
  };
}
