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

      const { schoolId } = req.query;
      const data = await this.analyticsUseCases.getSchoolDashboardSummary(schoolId as string);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };
}
