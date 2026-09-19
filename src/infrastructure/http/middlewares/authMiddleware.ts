import { Request, Response, NextFunction } from 'express';
import { IAuthTokenService } from '../../../core/ports/services/IExternalServices';
import { UserRole } from '../../../core/domain/user/User';
import { UnauthorizedError, ForbiddenError } from '../../../core/domain/shared/Errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    schoolId?: string;
  };
}

export function createAuthMiddleware(tokenService: IAuthTokenService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Authorization token required'));
    }

    const token = authHeader.split(' ')[1];
    const payload = tokenService.verifyAccessToken(token);

    if (!payload) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }

    req.user = payload;
    next();
  };
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next(); // Super admin bypass
    }

    const expandedAllowed = new Set<string>();
    for (const r of allowedRoles) {
      expandedAllowed.add(r);
      if (r === UserRole.ADMIN || r === UserRole.SCHOOL_ADMIN) {
        expandedAllowed.add(UserRole.ADMIN);
        expandedAllowed.add(UserRole.SCHOOL_ADMIN);
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

    if (!expandedAllowed.has(req.user.role)) {
      return next(new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`));
    }

    next();
  };
}
