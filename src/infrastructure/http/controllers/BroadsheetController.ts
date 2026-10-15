import { Request, Response, NextFunction } from 'express';
import { BroadsheetUseCases } from '../../../application/academics/BroadsheetUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class BroadsheetController {
  constructor(private readonly broadsheetUseCases: BroadsheetUseCases) {}

  public getStreamBroadsheet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const streamId = req.query.streamId as string;
      const classId = req.query.classId as string | undefined;
      const termId = req.query.termId as string | undefined;
      const academicYearId = req.query.academicYearId as string | undefined;
      const examType = req.query.examType as string | undefined;

      if (!streamId && !classId) {
        return res.status(400).json({
          success: false,
          message: 'streamId or classId query parameter is required'
        });
      }

      const result = await this.broadsheetUseCases.getStreamBroadsheet({
        streamId: streamId || 'all',
        classId,
        termId,
        academicYearId,
        examType
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getClassAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const classId = (req.query.classId as string) || (req.query.streamId as string);
      const termId = req.query.termId as string | undefined;
      const academicYearId = req.query.academicYearId as string | undefined;

      if (!classId) {
        return res.status(400).json({
          success: false,
          message: 'classId or streamId query parameter is required'
        });
      }

      const result = await this.broadsheetUseCases.getClassAnalytics(classId, termId, academicYearId);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };
}
