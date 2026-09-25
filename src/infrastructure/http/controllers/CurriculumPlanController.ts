import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CurriculumPlanUseCases } from '../../../application/curriculum-plans/CurriculumPlanUseCases';
import { CoreCompetency, CoreValue } from '../../../core/domain/cbc/CbcAssessment';
import { SchemeStatus } from '../../../core/domain/curriculum-plan/SchemeOfWork';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UserRole } from '../../../core/domain/user/User';

export const CreateSchemeSchema = z.object({
  teacherId: z.string().min(1),
  learningAreaId: z.string().min(1),
  classRoomId: z.string().min(1),
  streamId: z.string().optional(),
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  title: z.string().min(1),
  entries: z
    .array(
      z.object({
        weekNumber: z.number().int().min(1),
        lessonNumber: z.number().int().min(1),
        strandId: z.string().optional(),
        strandTitle: z.string().min(1),
        subStrandId: z.string().optional(),
        subStrandTitle: z.string().min(1),
        specificLearningOutcomes: z.array(z.string()).min(1),
        keyInquiryQuestions: z.array(z.string()).min(1),
        learningExperiences: z.array(z.string()).min(1),
        learningResources: z.array(z.string()).min(1),
        assessmentMethods: z.array(z.string()).min(1),
        reflection: z.string().optional()
      })
    )
    .optional()
});

export const AddSchemeEntrySchema = z.object({
  weekNumber: z.number().int().min(1),
  lessonNumber: z.number().int().min(1),
  strandId: z.string().optional(),
  strandTitle: z.string().min(1),
  subStrandId: z.string().optional(),
  subStrandTitle: z.string().min(1),
  specificLearningOutcomes: z.array(z.string()).min(1),
  keyInquiryQuestions: z.array(z.string()).min(1),
  learningExperiences: z.array(z.string()).min(1),
  learningResources: z.array(z.string()).min(1),
  assessmentMethods: z.array(z.string()).min(1),
  reflection: z.string().optional()
});

export const ReviewSchemeSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().min(1)
});

export const ReviewLessonPlanSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().min(1)
});

export const CreateLessonPlanSchema = z.object({
  teacherId: z.string().min(1),
  schemeOfWorkEntryId: z.string().optional(),
  learningAreaId: z.string().min(1),
  classRoomId: z.string().min(1),
  streamId: z.string().optional(),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().min(15).max(120).default(40),
  rollBoys: z.number().int().optional(),
  rollGirls: z.number().int().optional(),
  strand: z.string().min(1),
  subStrand: z.string().min(1),
  specificLearningOutcomes: z.array(z.string()).min(1),
  keyInquiryQuestions: z.array(z.string()).min(1),
  coreCompetenciesAddressed: z.array(z.nativeEnum(CoreCompetency)),
  valuesAddressed: z.array(z.nativeEnum(CoreValue)),
  learningResources: z.array(z.string()).min(1),
  steps: z
    .array(
      z.object({
        stepNumber: z.number().int().min(1),
        stepTitle: z.string().min(1),
        durationMinutes: z.number().int().min(1),
        teacherActivities: z.string().min(1),
        learnerActivities: z.string().min(1),
        assessmentCriterion: z.string().optional()
      })
    )
    .min(1),
  extendedActivity: z.string().optional(),
  teacherSelfReflection: z.string().optional()
});

export class CurriculumPlanController {
  constructor(private readonly curriculumUseCases: CurriculumPlanUseCases) {}

  public createScheme = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const body = { ...req.body };
      if (user?.role === UserRole.TEACHER && user?.userId) {
        body.teacherId = user.userId;
      }
      const scheme = await this.curriculumUseCases.createSchemeOfWork(body);
      return res.status(201).json({ success: true, message: 'Scheme of work created', data: scheme });
    } catch (err) {
      next(err);
    }
  };

  public addSchemeEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scheme = await this.curriculumUseCases.addEntryToScheme(req.params.id as string, req.body);
      return res.status(200).json({ success: true, message: 'Entry added to scheme of work', data: scheme });
    } catch (err) {
      next(err);
    }
  };

  public submitScheme = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scheme = await this.curriculumUseCases.submitSchemeForReview(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Scheme of work submitted for review', data: scheme });
    } catch (err) {
      next(err);
    }
  };

  public reviewScheme = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const reviewerUserId = req.user!.userId;
      const { approved, remarks } = req.body;
      const scheme = await this.curriculumUseCases.reviewScheme(req.params.id as string, reviewerUserId, approved, remarks);
      return res.status(200).json({ success: true, message: `Scheme of work ${approved ? 'approved' : 'rejected'}`, data: scheme });
    } catch (err) {
      next(err);
    }
  };

  public getSchemeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scheme = await this.curriculumUseCases.getSchemeById(req.params.id as string);
      return res.status(200).json({ success: true, data: scheme });
    } catch (err) {
      next(err);
    }
  };

  public listSchemes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teacherId, learningAreaId, classRoomId, termId, academicYearId, status } = req.query;
      const schemes = await this.curriculumUseCases.listSchemes({
        teacherId: teacherId as string,
        learningAreaId: learningAreaId as string,
        classRoomId: classRoomId as string,
        termId: termId as string,
        academicYearId: academicYearId as string,
        status: status as SchemeStatus
      });
      return res.status(200).json({ success: true, count: schemes.length, data: schemes });
    } catch (err) {
      next(err);
    }
  };

  public createLessonPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const body = { ...req.body };
      if (user?.role === UserRole.TEACHER && user?.userId) {
        body.teacherId = user.userId;
      }
      const lessonPlan = await this.curriculumUseCases.createLessonPlan(body);
      return res.status(201).json({ success: true, message: 'Lesson plan created successfully', data: lessonPlan });
    } catch (err) {
      next(err);
    }
  };

  public submitLessonPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.curriculumUseCases.submitLessonPlanForReview(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Lesson plan submitted for review', data: plan });
    } catch (err) {
      next(err);
    }
  };

  public reviewLessonPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const reviewerUserId = req.user!.userId;
      const { approved, remarks } = req.body;
      const plan = await this.curriculumUseCases.reviewLessonPlan(req.params.id as string, reviewerUserId, approved, remarks);
      return res.status(200).json({ success: true, message: `Lesson plan ${approved ? 'approved' : 'rejected'}`, data: plan });
    } catch (err) {
      next(err);
    }
  };

  public getLessonPlanById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.curriculumUseCases.getLessonPlanById(req.params.id as string);
      return res.status(200).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  };

  public listLessonPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { teacherId, learningAreaId, classRoomId, streamId, startDate, endDate } = req.query;
      const plans = await this.curriculumUseCases.listLessonPlans({
        teacherId: teacherId as string,
        learningAreaId: learningAreaId as string,
        classRoomId: classRoomId as string,
        streamId: streamId as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      return res.status(200).json({ success: true, count: plans.length, data: plans });
    } catch (err) {
      next(err);
    }
  };

  public deleteScheme = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.curriculumUseCases.deleteScheme(req.params.id as string, (req as any).user);
      return res.status(200).json({ success: true, message: 'Scheme of work deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public deleteLessonPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.curriculumUseCases.deleteLessonPlan(req.params.id as string, (req as any).user);
      return res.status(200).json({ success: true, message: 'Lesson plan deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
