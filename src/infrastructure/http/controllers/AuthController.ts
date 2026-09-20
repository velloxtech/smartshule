import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthUseCases } from '../../../application/auth/AuthUseCases';
import { UserRole, UserStatus } from '../../../core/domain/user/User';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const RegisterUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole).default(UserRole.TEACHER),
  phone: z.string().optional(),
  schoolId: z.string().optional()
});

export const LoginUserSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export const AdminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  schoolId: z.string().optional()
});

export const AdminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional()
});

export const AdminSetStatusSchema = z.object({
  status: z.nativeEnum(UserStatus)
});

export const AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(6)
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long')
});

export class AuthController {
  constructor(private readonly authUseCases: AuthUseCases) {}

  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authUseCases.register(req.body);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`[Auth] Inbound login attempt for user: "${req.body?.email}"`);
      const result = await this.authUseCases.login(req.body);
      console.log(`[Auth] ✅ Authenticated user: "${req.body?.email}" as ${result.user.role}`);
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (err: any) {
      console.warn(`[Auth] ❌ Login failed for "${req.body?.email}": ${err.message}`);
      next(err);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authUseCases.refreshToken(req.body.refreshToken);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.authUseCases.getProfile(userId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.authUseCases.changePassword(userId, req.body);
      return res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { role, search } = req.query;
      const schoolId = req.user?.schoolId;
      const users = await this.authUseCases.listUsers({
        schoolId: schoolId || undefined,
        role: role ? String(role) : undefined,
        search: search ? String(search) : undefined
      });
      return res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (err) {
      next(err);
    }
  };

  public adminCreateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId || 'school-001';
      const user = await this.authUseCases.adminCreateUser({
        ...req.body,
        schoolId
      });
      return res.status(201).json({
        success: true,
        message: 'User account created successfully',
        data: user
      });
    } catch (err) {
      next(err);
    }
  };

  public adminUpdateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authUseCases.adminUpdateUser(req.params.id as string, req.body);
      return res.status(200).json({
        success: true,
        message: 'User account updated successfully',
        data: user
      });
    } catch (err) {
      next(err);
    }
  };

  public adminSetStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.authUseCases.adminSetStatus(req.params.id as string, req.body.status);
      return res.status(200).json({
        success: true,
        message: `User status changed to ${req.body.status}`,
        data: user
      });
    } catch (err) {
      next(err);
    }
  };

  public adminResetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authUseCases.adminResetPassword(req.params.id as string, req.body.newPassword);
      return res.status(200).json({
        success: true,
        message: 'User password reset successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public adminDeleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.id as string;
      if (req.user?.userId === targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own active administrator account'
        });
      }
      await this.authUseCases.adminDeleteUser(targetUserId);
      return res.status(200).json({
        success: true,
        message: 'User account deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };
}
