import { Response, NextFunction } from 'express';
import { RecordOfWorkUseCases } from '../../../application/curriculum-plans/RecordOfWorkUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class RecordOfWorkController {
  constructor(private useCases: RecordOfWorkUseCases) {}

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const teacherId = user?.userId || (user as any)?.id || 'demo-teacher-id'; 
      const record = await this.useCases.createRecord(req.body, teacherId);
      res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      next(error);
    }
  };

  getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const role = user?.role || 'ADMIN';
      const teacherId = user?.userId || (user as any)?.id;
      const records = await this.useCases.getRecords(role, teacherId);
      res.status(200).json({ success: true, data: records });
    } catch (error: any) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const teacherId = user?.userId || (user as any)?.id;
      const record = await this.useCases.updateRecord(id, req.body, user?.role, teacherId);
      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = req.user;
      const teacherId = user?.userId || (user as any)?.id;
      await this.useCases.deleteRecord(id, user?.role, teacherId);
      res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  };
}