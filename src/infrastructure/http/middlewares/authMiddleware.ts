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

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`));
    }

    next();
  };
}
