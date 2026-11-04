import { Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  RecordOfWorkUseCases,
  CreateDiaryEntryDTO,
  UpdateDiaryEntryDTO,
  UserContext
} from '../../../application/curriculum-plans/RecordOfWorkUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { RecordOfWorkFilterCriteria } from '../../../core/ports/repositories/IRecordOfWorkRepository';

export const CreateRecordOfWorkSchema = z.object({
  schoolId: z.string().optional(),
  teacherId: z.string().optional(),
  teacherName: z.string().optional(),
  academicYearId: z.string().optional(),
  academicYear: z.string().optional(),
  termId: z.string().optional(),
  term: z.string().optional(),
  classRoomId: z.string().optional(),
  className: z.string().optional(),
  streamId: z.string().optional(),
  streamName: z.string().optional(),
  learningAreaId: z.string().optional(),
  subjectName: z.string().optional(),
  strandId: z.string().optional(),
  strand: z.string().optional(),
  subStrandId: z.string().optional(),
  subStrand: z.string().optional(),
  weekNumber: z.number().int().min(1).optional(),
  day: z.string().optional(),
  lessonPeriod: z.string().optional(),
  period: z.string().optional(),
  lessonDate: z.string().optional(),
  lessonTopic: z.string().optional(),
  learningObjectives: z.string().optional(),
  learningActivities: z.string().optional(),
  resources: z.string().optional(),
  reference: z.string().optional(),
  subjectAndGrade: z.string().optional(),
  strandAndWorkCovered: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED']).optional(),
  comments: z.string().optional(),
  reflection: z.string().optional(),
  reflectionData: z
    .object({
      comprehensionLevel: z.enum(['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'POOR']).optional(),
      whatWentWell: z.string().optional(),
      challengesFaced: z.string().optional(),
      remedialPlan: z.string().optional(),
      nextSteps: z.string().optional(),
      generalRemarks: z.string().optional(),
      homeworkGiven: z.string().optional(),
      absentLearnersCount: z.number().int().min(0).optional(),
      totalLearnersPresent: z.number().int().min(0).optional()
    })
    .optional()
});

export const UpdateRecordOfWorkSchema = CreateRecordOfWorkSchema.partial();

export const ApproveRecordOfWorkSchema = z.object({
  remarks: z.string().optional()
});

export const ReturnRecordOfWorkSchema = z.object({
  reason: z.string().min(3, 'Return reason must be at least 3 characters long')
});

export const OverrideProgressionSchema = z.object({
  reason: z.string().min(5, 'Progression override reason must be at least 5 characters long'),
  status: z.enum(['EXEMPTED', 'RESCHEDULED']).optional()
});

export class RecordOfWorkController {
  constructor(private useCases: RecordOfWorkUseCases) {}

  private extractUserContext(req: AuthenticatedRequest): UserContext {
    const user = req.user as any;
    return {
      userId: user?.userId || user?.id,
      id: user?.userId || user?.id,
      role: user?.role,
      schoolId: user?.schoolId,
      fullName: user?.fullName || user?.name || user?.email,
      email: user?.email
    };
  }

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUserContext(req);
      const dto: CreateDiaryEntryDTO = req.body;
      const record = await this.useCases.createDiaryEntry(dto, user);
      res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      next(error);
    }
  };

  getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUserContext(req);
      const filters: RecordOfWorkFilterCriteria = {
        schoolId: (req.query.schoolId as string) || user.schoolId,
        teacherId: req.query.teacherId as string,
        classRoomId: req.query.classRoomId as string,
        streamId: req.query.streamId as string,
        learningAreaId: req.query.learningAreaId as string,
        academicYear: req.query.academicYear as string,
        term: req.query.term as string,
        status: req.query.status as any,
        weekNumber: req.query.weekNumber ? Number(req.query.weekNumber) : undefined,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string
      };

      const records = await this.useCases.listDiaryEntries(filters, user);
      res.status(200).json({ success: true, data: records });
    } catch (error: any) {
      next(error);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = this.extractUserContext(req);
      const record = await this.useCases.getDiaryEntryById(id, user);
      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      next(error);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = this.extractUserContext(req);
      const dto: UpdateDiaryEntryDTO = req.body;
      const record = await this.useCases.updateDiaryEntry(id, dto, user);
      res.status(200).json({ success: true, data: record });
    } catch (error: any) {
      next(error);
    }
  };

  submit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = this.extractUserContext(req);
      const record = await this.useCases.submitDiaryEntry(id, user);
      res.status(200).json({
        success: true,
        message: 'Teacher diary record submitted successfully for review',
        data: record
      });
    } catch (error: any) {
      next(error);
    }
  };

  approve = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = this.extractUserContext(req);
      const { remarks } = req.body || {};
      const record = await this.useCases.approveDiaryEntry(id, { remarks }, user);
      res.status(200).json({
        success: true,
        message: 'Teacher diary record approved and official curriculum progress updated',
        data: record
      });
    } catch (error: any) {
      next(error);
    }
  };

  returnEntry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = this.extractUserContext(req);
      const { reason } = req.body;
      const record = await this.useCases.returnDiaryEntry(id, { reason }, user);
      res.status(200).json({
        success: true,
        message: 'Teacher diary record returned for correction',
        data: record
      });
    } catch (error: any) {
      next(error);
    }
  };

  overrideProgression = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = this.extractUserContext(req);
      const { reason, status } = req.body;
      const record = await this.useCases.overrideProgression(id, { reason, status }, user);
      res.status(200).json({
        success: true,
        message: 'Progression override granted successfully',
        data: record
      });
    } catch (error: any) {
      next(error);
    }
  };

  delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const user = this.extractUserContext(req);
      await this.useCases.deleteDiaryEntry(id, user);
      res.status(200).json({ success: true, message: 'Record deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  };

  getSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = this.extractUserContext(req);
      const schoolId = (req.query.schoolId as string) || user.schoolId;
      const term = req.query.term as string;
      const academicYear = req.query.academicYear as string;
      const summary = await this.useCases.getCurriculumProgressSummary(schoolId, term, academicYear);
      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      next(error);
    }
  };
}
