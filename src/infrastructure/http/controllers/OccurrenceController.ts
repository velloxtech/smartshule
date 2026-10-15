import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OccurrenceUseCases } from '../../../application/occurrences/OccurrenceUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateOccurrenceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum([
    'DISCIPLINARY',
    'ACCIDENT_INJURY',
    'MEDICAL_ILLNESS',
    'PROPERTY_DAMAGE_LOSS',
    'SECURITY_SAFETY',
    'ACADEMIC_CLASSROOM',
    'COMMENDATION_GOOD_DEED',
    'GENERAL'
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  reportedByRole: z.string().optional(),
  reportedByTeacherName: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
  studentNames: z.array(z.string()).optional(),
  witnesses: z.string().optional(),
  immediateActionTaken: z.string().optional(),
  parentNotified: z.boolean().optional(),
  parentNotificationMethod: z.enum(['SMS', 'PHONE_CALL', 'IN_PERSON', 'NONE']).optional(),
  notifyParentViaSms: z.boolean().optional()
});

export const UpdateOccurrenceStatusSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED']),
  resolutionNotes: z.string().optional(),
  resolvedBy: z.string().optional()
});

export const UpdateOccurrenceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.enum([
    'DISCIPLINARY',
    'ACCIDENT_INJURY',
    'MEDICAL_ILLNESS',
    'PROPERTY_DAMAGE_LOSS',
    'SECURITY_SAFETY',
    'ACADEMIC_CLASSROOM',
    'COMMENDATION_GOOD_DEED',
    'GENERAL'
  ]).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
  studentNames: z.array(z.string()).optional(),
  witnesses: z.string().optional(),
  immediateActionTaken: z.string().optional(),
  parentNotified: z.boolean().optional(),
  parentNotificationMethod: z.enum(['SMS', 'PHONE_CALL', 'IN_PERSON', 'NONE']).optional()
});

export class OccurrenceController {
  constructor(private readonly occurrenceUseCases: OccurrenceUseCases) {}

  public listOccurrences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const {
        date,
        startDate,
        endDate,
        category,
        severity,
        status,
        teacherId,
        studentId,
        search
      } = req.query;

      const occurrences = await this.occurrenceUseCases.listOccurrences({
        schoolId,
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        category: category as any,
        severity: severity as any,
        status: status as any,
        teacherId: teacherId as string,
        studentId: studentId as string,
        search: search as string
      });

      return res.status(200).json({
        success: true,
        count: occurrences.length,
        data: occurrences
      });
    } catch (err) {
      next(err);
    }
  };

  public getDailySummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId;
      const today = new Date().toISOString().split('T')[0];
      const targetDate = (req.query.date as string) || today;

      const summary = await this.occurrenceUseCases.getDailyOccurrenceSummary(targetDate, schoolId);
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  };

  public getOccurrence = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const occurrence = await this.occurrenceUseCases.getOccurrenceById(req.params.id as string);
      return res.status(200).json({
        success: true,
        data: occurrence
      });
    } catch (err) {
      next(err);
    }
  };

  public createOccurrence = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.user?.schoolId || 'school-001';
      const reportedByTeacherId = req.user?.userId || 'teacher-001';
      const reportedByTeacherName =
        req.body.reportedByTeacherName || req.user?.email || 'Duty Teacher';

      const occurrence = await this.occurrenceUseCases.createOccurrence({
        ...req.body,
        schoolId,
        reportedByTeacherId,
        reportedByTeacherName
      });

      return res.status(201).json({
        success: true,
        message: 'Daily occurrence / incident logged successfully',
        data: occurrence
      });
    } catch (err) {
      next(err);
    }
  };

  public updateStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { status, resolutionNotes, resolvedBy } = req.body;
      const author = resolvedBy || req.user?.email || 'Duty Administrator';

      const updated = await this.occurrenceUseCases.updateOccurrenceStatus(
        id,
        status,
        resolutionNotes,
        author
      );

      return res.status(200).json({
        success: true,
        message: 'Occurrence record status updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public updateOccurrence = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const updated = await this.occurrenceUseCases.updateOccurrence(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Occurrence record updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteOccurrence = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await this.occurrenceUseCases.deleteOccurrence(id);

      return res.status(200).json({
        success: true,
        message: 'Occurrence record deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };
}
