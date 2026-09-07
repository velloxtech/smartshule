import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthUseCases } from '../../../application/auth/AuthUseCases';
import { UserRole } from '../../../core/domain/user/User';
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
}
