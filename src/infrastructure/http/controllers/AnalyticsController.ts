import { Request, Response, NextFunction } from 'express';
import { AnalyticsUseCases } from '../../../application/analytics/AnalyticsUseCases';

export class AnalyticsController {
  constructor(private readonly analyticsUseCases: AnalyticsUseCases) {}

  public getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
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
