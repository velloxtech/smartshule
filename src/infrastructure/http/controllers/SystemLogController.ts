import { Response, NextFunction } from 'express';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class SystemLogController {
  constructor(private readonly useCases: SystemLogUseCases) {}

  public listLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        schoolId,
        category,
        level,
        status,
        action,
        search,
        startDate,
        endDate,
        page = '1',
        limit = '25'
      } = req.query;

      const userSchoolId = (schoolId as string) || req.user?.schoolId;

      const result = await this.useCases.listLogs(
        {
          schoolId: userSchoolId,
          category: category as string,
          level: level as string,
          status: status as string,
          action: action as string,
          search: search as string,
          startDate: startDate as string,
          endDate: endDate as string
        },
        parseInt(page as string, 10) || 1,
        parseInt(limit as string, 10) || 25
      );

      return res.status(200).json({
        success: true,
        data: result.logs.map((l) => l.toJSON()),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = (req.query.schoolId as string) || req.user?.schoolId;
      const stats = await this.useCases.getStats(schoolId);

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const log = await this.useCases.getLogById(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'System audit log entry not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: log.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public downloadLogsCsv = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        schoolId,
        category,
        level,
        status,
        action,
        search,
        startDate,
        endDate
      } = req.query;

      const userSchoolId = (schoolId as string) || req.user?.schoolId;

      const csv = await this.useCases.exportLogsCsv({
        schoolId: userSchoolId,
        category: category as string,
        level: level as string,
        status: status as string,
        action: action as string,
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      const today = new Date().toISOString().split('T')[0];
      const filename = `smartshule_system_logs_${today}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  };
}
