import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GeofenceUseCases } from '../../../application/attendance/GeofenceUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UserRole } from '../../../core/domain/user/User';

export const UpdateGeofenceSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofenceRadius: z.number().min(10).max(50000).optional(),
  geofenceEnabled: z.boolean().optional(),
  address: z.string().optional()
});

export const ClockInSchema = z.object({
  action: z.enum(['CLOCK_IN', 'CLOCK_OUT']).default('CLOCK_IN'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().optional()
});

export class GeofenceController {
  constructor(private readonly geofenceUseCases: GeofenceUseCases) {}

  public getGeofenceConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await this.geofenceUseCases.getGeofenceConfig();
      return res.status(200).json({
        success: true,
        data: config
      });
    } catch (err) {
      next(err);
    }
  };

  public updateGeofenceConfig = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role as UserRole | undefined;
      const updated = await this.geofenceUseCases.updateGeofenceConfig(
        req.body,
        userRole
      );
      return res.status(200).json({
        success: true,
        message: 'School compound geofence coordinates updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public clockIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const result = await this.geofenceUseCases.clockInTeacher({
        userId: req.user.userId,
        userRole: req.user.role as UserRole,
        action: req.body.action || 'CLOCK_IN',
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        accuracy: req.body.accuracy
      });

      return res.status(200).json({
        success: true,
        message:
          req.body.action === 'CLOCK_OUT'
            ? 'Teacher clocked out successfully'
            : 'Clock-in verified within school compound',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getTodayStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const record = await this.geofenceUseCases.getTodayTeacherClockIn(req.user.userId);
      return res.status(200).json({
        success: true,
        data: record
      });
    } catch (err) {
      next(err);
    }
  };

  public listRecords = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = req.query.date as string | undefined;
      const teacherId = req.query.teacherId as string | undefined;
      const records = await this.geofenceUseCases.listClockInRecords({ date, teacherId });
      return res.status(200).json({
        success: true,
        count: records.length,
        data: records
      });
    } catch (err) {
      next(err);
    }
  };
}
