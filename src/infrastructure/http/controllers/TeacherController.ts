import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TeacherUseCases } from '../../../application/teachers/TeacherUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UserRole, UserStatus } from '../../../core/domain/user/User';

export const RegisterTeacherSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().optional(),
  nationalId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  schoolId: z.string().optional(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.TEACHER),
  tscNumber: z.string().optional(),
  employeeNumber: z.string().optional(),
  specialization: z.array(z.string()).optional().default([]),
  assignedClassStreamIds: z.array(z.string()).optional(),
  qualification: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  residentialAddress: z.string().optional(),
  employmentDate: z.string().optional(),
  employmentType: z.string().optional(),
  department: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    relationship: z.string().min(1)
  }).optional()
}).passthrough();

export const UpdateTeacherProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  role: z.nativeEnum(UserRole).optional(),
  tscNumber: z.string().optional(),
  employeeNumber: z.string().optional(),
  specialization: z.array(z.string()).optional(),
  assignedClassStreamIds: z.array(z.string()).optional(),
  qualification: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationalId: z.string().optional(),
  residentialAddress: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  employmentDate: z.string().optional(),
  employmentType: z.string().optional(),
  employmentStatus: z.string().optional(),
  department: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    relationship: z.string().min(1)
  }).optional()
}).passthrough();

export const SelfServiceUpdateSchema = z.object({
  phone: z.string().optional(),
  residentialAddress: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    relationship: z.string().min(1)
  }).optional(),
  profilePhotoUrl: z.string().optional()
}).passthrough();

export const SubmitCorrectionRequestSchema = z.object({
  fieldName: z.string().min(1, 'Field name is required'),
  proposedValue: z.string().min(1, 'Proposed value is required'),
  reason: z.string().min(1, 'A reason for the correction is required'),
  evidenceUrl: z.string().optional()
});

export const ReviewCorrectionRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  remarks: z.string().optional()
});

export const AssignStreamSchema = z.object({
  teacherId: z.string().min(1),
  streamId: z.string().min(1)
});

export class TeacherController {
  constructor(private readonly teacherUseCases: TeacherUseCases) {}

  public registerTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await this.teacherUseCases.registerTeacher(req.body, authReq.user);
      const isTeacher = !!(result as any).id;
      return res.status(201).json({
        success: true,
        message: isTeacher ? 'Teacher onboarded successfully' : 'Staff member onboarded successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getMyTeacherProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const profile = await this.teacherUseCases.getMyTeacherProfile(req.user.userId);
      return res.status(200).json({
        success: true,
        data: profile
      });
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return res.status(404).json({ success: false, message: 'No teacher profile linked to this user' });
      }
      next(err);
    }
  };

  public updateMyTeacherProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const updated = await this.teacherUseCases.updateMyTeacherProfile(req.user.userId, req.body, {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role
      });
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public submitCorrectionRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const request = await this.teacherUseCases.submitCorrectionRequest(req.user.userId, req.body, {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role
      });
      return res.status(201).json({
        success: true,
        message: 'Correction request submitted successfully and queued for administrator review.',
        data: request
      });
    } catch (err) {
      next(err);
    }
  };

  public getMyCorrectionRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const requests = await this.teacherUseCases.getMyCorrectionRequests(req.user.userId);
      return res.status(200).json({
        success: true,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  };

  public listCorrectionRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as any;
      const schoolId = (req.query.schoolId as string) || (req.user as any)?.schoolId || 'school-001';
      const requests = await this.teacherUseCases.listAllCorrectionRequests(schoolId, status);
      return res.status(200).json({
        success: true,
        count: requests.length,
        data: requests
      });
    } catch (err) {
      next(err);
    }
  };

  public reviewCorrectionRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const requestId = req.params.id as string;
      const reviewer = {
        id: req.user?.userId || 'unknown-admin',
        name: (req.user as any)?.name || (req.user as any)?.fullName || (req.user as any)?.email,
        email: req.user?.email,
        role: req.user?.role
      };
      const result = await this.teacherUseCases.reviewCorrectionRequest(requestId, req.body, reviewer);
      return res.status(200).json({
        success: true,
        message: `Correction request ${req.body.action.toLowerCase()}ed successfully.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getTeacherAuditHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.params.id as string;
      const history = await this.teacherUseCases.getTeacherAuditHistory(teacherId);
      return res.status(200).json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (err) {
      next(err);
    }
  };

  public adminUpdateTeacherProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const teacherId = req.params.id as string;
      const reviewer = {
        id: req.user?.userId || 'unknown-admin',
        name: (req.user as any)?.name || (req.user as any)?.fullName || (req.user as any)?.email,
        email: req.user?.email,
        role: req.user?.role,
        schoolId: req.user?.schoolId
      };
      const updated = await this.teacherUseCases.adminUpdateTeacherProfile(teacherId, req.body, reviewer);
      return res.status(200).json({
        success: true,
        message: 'Teacher profile updated by administrator',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public updateTeacherProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const reviewer = {
        id: authUser?.userId || 'unknown-admin',
        name: (authUser as any)?.name || (authUser as any)?.fullName || (authUser as any)?.email,
        email: authUser?.email,
        role: authUser?.role,
        schoolId: authUser?.schoolId
      };
      const updated = await this.teacherUseCases.updateTeacherProfile(req.params.id as string, req.body, reviewer);
      return res.status(200).json({
        success: true,
        message: 'Teacher profile updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public getTeacherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teacher = await this.teacherUseCases.getTeacherById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: teacher
      });
    } catch (err) {
      next(err);
    }
  };

  public listTeachers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const schoolId = (req.query.schoolId as string) || authReq.user?.schoolId;
      const teachers = await this.teacherUseCases.listTeachers({ schoolId });
      return res.status(200).json({
        success: true,
        count: teachers.length,
        data: teachers
      });
    } catch (err) {
      next(err);
    }
  };

  public assignStream = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.teacherUseCases.assignStream(req.body);
      return res.status(200).json({
        success: true,
        message: 'Stream assigned to teacher successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteTeacher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.teacherUseCases.deleteTeacher(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: 'Teacher deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };
}
