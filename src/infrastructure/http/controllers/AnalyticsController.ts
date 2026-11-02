import { Request, Response, NextFunction } from 'express';
import { AnalyticsUseCases } from '../../../application/analytics/AnalyticsUseCases';
import { UserRole } from '../../../core/domain/user/User';

export class AnalyticsController {
  constructor(private readonly analyticsUseCases: AnalyticsUseCases) {}

  public getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: School-wide analytics dashboard is restricted to staff.'
        });
      }

      const schoolId = (req.query.schoolId as string) || user?.schoolId;
      const academicYearId = (req.query.academicYearId as string) || (req.query.yearId as string);
      const termId = req.query.termId as string;
      const date = (req.query.date as string) || (req.query.startDate as string);
      const classRoomId = req.query.classRoomId as string;
      const streamId = req.query.streamId as string;
      const gradeLevel = req.query.gradeLevel as string;
      const teacherId = req.query.teacherId as string;

      const data = await this.analyticsUseCases.getSchoolDashboardSummary({
        schoolId,
        academicYearId,
        termId,
        date,
        classRoomId,
        streamId,
        gradeLevel,
        teacherId
      });

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public getAttendanceTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Attendance trends are restricted to staff.'
        });
      }

      const schoolId = (req.query.schoolId as string) || user?.schoolId;
      const academicYearId = req.query.academicYearId as string;
      const termId = req.query.termId as string;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;

      const data = await this.analyticsUseCases.getAttendanceTrends(
        { schoolId, academicYearId, termId, days },
        user
      );

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public getWholeTermReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.role === UserRole.PARENT || user?.role === UserRole.GUARDIAN) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Whole-term executive school reports are restricted to staff.'
        });
      }

      const schoolId = (req.query.schoolId as string) || user?.schoolId;
      const academicYearId = (req.query.academicYearId as string) || '';
      const termId = (req.query.termId as string) || '';

      const data = await this.analyticsUseCases.getWholeTermReport(
        { schoolId, academicYearId, termId },
        user
      );

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };
}
