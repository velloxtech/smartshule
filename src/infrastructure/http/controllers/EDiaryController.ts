import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EDiaryUseCases } from '../../../application/ediary/EDiaryUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateEDiarySchema = z.object({
  schoolId: z.string().min(1),
  streamId: z.string().min(1),
  studentId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  homework: z.string().min(1),
  teacherRemarks: z.string().optional(),
  requirementsTomorrow: z.string().optional()
});

export const AcknowledgeEDiarySchema = z.object({
  studentId: z.string().min(1),
  note: z.string().optional()
});

export class EDiaryController {
  constructor(private readonly ediaryUseCases: EDiaryUseCases) {}

  public createEntry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.ediaryUseCases.createEntry({
        ...req.body,
        teacherId: req.user!.userId
      });
      return res.status(201).json({
        success: true,
        message: 'eDiary entry posted successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listStudentEntries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params;
      const { streamId, limit } = req.query;
      const entries = await this.ediaryUseCases.listEntriesForStudent(
        studentId as string,
        req.user,
        limit ? Number(limit) : 20
      );
      return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (err) {
      next(err);
    }
  };

  public listStreamEntries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { streamId } = req.params;
      const { date } = req.query;
      const entries = await this.ediaryUseCases.listEntriesForStream(streamId as string, date as string);
      return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (err) {
      next(err);
    }
  };

  public acknowledgeEntry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.ediaryUseCases.acknowledgeEntry({
        entryId: req.params.id as string,
        studentId: req.body.studentId,
        guardianUserId: req.user!.userId,
        note: req.body.note
      });
      return res.status(200).json({
        success: true,
        message: 'eDiary signed and acknowledged successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.ediaryUseCases.deleteEntry(req.params.id as string);
      return res.status(200).json({ success: true, message: 'eDiary entry deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
