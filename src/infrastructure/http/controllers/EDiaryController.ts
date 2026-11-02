import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EDiaryUseCases } from '../../../application/ediary/EDiaryUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const EDiaryHomeworkTaskSchema = z.object({
  learningArea: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional()
});

export const CreateEDiarySchema = z.object({
  id: z.string().optional(),
  schoolId: z.string().min(1, 'School ID is required'),
  classRoomId: z.string().optional(),
  streamId: z.string().min(1, 'Stream ID is required'),
  studentId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date in YYYY-MM-DD format is required'),
  title: z.string().optional(),
  homework: z.string().optional(),
  homeworkTasks: z.array(EDiaryHomeworkTaskSchema).optional(),
  teacherRemarks: z.string().optional(),
  requirementsTomorrow: z.string().optional(),
  tomorrowRequirements: z.union([z.array(z.string()), z.string()]).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  academicYearId: z.string().optional(),
  termId: z.string().optional()
});

export const AcknowledgeEDiarySchema = z.object({
  studentId: z.string().optional(),
  guardianName: z.string().optional(),
  note: z.string().optional(),
  parentNote: z.string().optional()
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
        message: result.status === 'DRAFT' ? 'eDiary draft saved successfully' : 'eDiary entry published successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getParentFeed = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId, academicYearId, termId, startDate, endDate, date, limit } = req.query;
      const entries = await this.ediaryUseCases.getFeedForParent(req.user!, {
        studentId: studentId as string,
        academicYearId: academicYearId as string,
        termId: termId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        date: date as string,
        limit: limit ? Number(limit) : 50
      });
      return res.status(200).json({ success: true, count: entries.length, data: entries });
    } catch (err) {
      next(err);
    }
  };

  public listStudentEntries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params;
      const { limit } = req.query;
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
      const entries = await this.ediaryUseCases.listEntriesForStream(
        streamId as string,
        date as string,
        req.user
      );
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
        guardianName: req.body.guardianName,
        note: req.body.note,
        parentNote: req.body.parentNote
      });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public deleteEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.ediaryUseCases.deleteEntry(req.params.id as string, (req as any).user);
      return res.status(200).json({ success: true, message: 'eDiary entry deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
