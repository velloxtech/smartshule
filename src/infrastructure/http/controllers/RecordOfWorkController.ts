import { Request, Response } from 'express';
import { RecordOfWorkUseCases } from '../../../application/curriculum-plans/RecordOfWorkUseCases';

export class RecordOfWorkController {
  constructor(private useCases: RecordOfWorkUseCases) {}

  create = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const teacherId = user?.id || 'demo-teacher-id'; 
      const record = await this.useCases.createRecord(req.body, teacherId);
      res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const role = user?.role || 'ADMIN';
      const teacherId = user?.id;
      const records = await this.useCases.getRecords(role, teacherId);
      res.status(200).json({ success: true, data: records });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const record = await this.useCases.updateRecord(id, req.body);
      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await this.useCases.deleteRecord(id);
      res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}