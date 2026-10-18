import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CurriculumTrackerUseCases } from '../../../application/curriculum-tracker/CurriculumTrackerUseCases';

export const CreateCurriculumTrackerSchema = z.object({
  schoolId: z.string().optional(),
  teacherId: z.string().optional(),
  teacherName: z.string().optional(),
  learningAreaId: z.string().min(1, 'Learning area / subject ID is required'),
  subjectName: z.string().min(1, 'Subject name is required'),
  classRoomId: z.string().min(1, 'Classroom ID is required'),
  className: z.string().min(1, 'Class / Grade name is required'),
  streamId: z.string().optional(),
  streamName: z.string().optional(),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  totalWeeks: z.number().int().min(1).max(20).optional(),
  items: z.array(z.any()).optional()
});

export const UpdateWeekPlanSchema = z.object({
  strand: z.string().optional(),
  subStrand: z.string().optional(),
  learningOutcomes: z.string().optional(),
  plannedLessons: z.number().int().min(1).optional(),
  targetDate: z.string().optional(),
  suggestedActivities: z.string().optional(),
  resources: z.string().optional()
});

export const ConfirmWeekCoveredSchema = z.object({
  covered: z.boolean().optional(),
  coveredAt: z.string().optional(),
  comment: z.string().optional(),
  lessonsTaught: z.number().int().min(0).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COVERED', 'DELAYED']).optional()
});

export const UpdateWeekCommentSchema = z.object({
  comment: z.string()
});

export const BatchUpdateWeeksSchema = z.object({
  weeks: z.array(z.any())
});

export const AddDailyLogSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  dayOfWeek: z.string().optional(),
  weekNumber: z.number().int().min(1).max(25).optional(),
  lessonPeriod: z.string().optional(),
  strand: z.string().min(1, 'Strand / Topic is required'),
  subStrand: z.string().min(1, 'Sub-strand is required'),
  learningOutcomesTaught: z.string().min(1, 'Learning outcomes taught are required'),
  activitiesConducted: z.string().optional(),
  resourcesUsed: z.string().optional(),
  status: z.enum(['TAUGHT', 'PARTIALLY_TAUGHT', 'POSTPONED', 'REMEDIAL']).optional(),
  reflection: z.object({
    comprehensionLevel: z.enum(['EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_REMEDIATION']),
    whatWentWell: z.string().min(1, 'What went well is required'),
    challengesFaced: z.string().optional(),
    remedialPlan: z.string().optional(),
    nextSteps: z.string().optional()
  })
});

export const UpdateDailyLogSchema = z.object({
  date: z.string().optional(),
  dayOfWeek: z.string().optional(),
  weekNumber: z.number().int().min(1).max(25).optional(),
  lessonPeriod: z.string().optional(),
  strand: z.string().optional(),
  subStrand: z.string().optional(),
  learningOutcomesTaught: z.string().optional(),
  activitiesConducted: z.string().optional(),
  resourcesUsed: z.string().optional(),
  status: z.enum(['TAUGHT', 'PARTIALLY_TAUGHT', 'POSTPONED', 'REMEDIAL']).optional(),
  reflection: z.object({
    comprehensionLevel: z.enum(['EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_REMEDIATION']).optional(),
    whatWentWell: z.string().optional(),
    challengesFaced: z.string().optional(),
    remedialPlan: z.string().optional(),
    nextSteps: z.string().optional()
  }).optional()
});

export const EndorseDailyLogSchema = z.object({
  remarks: z.string().min(1, 'Endorsement remark is required')
});

export class CurriculumTrackerController {
  constructor(private readonly trackerUseCases: CurriculumTrackerUseCases) {}

  public create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const tracker = await this.trackerUseCases.createTracker(req.body, {
        userId: user?.userId,
        role: user?.role,
        schoolId: (user as any)?.schoolId || 'school-001',
        fullName: (user as any)?.fullName || (user as any)?.name
      });
      return res.status(201).json({
        success: true,
        message: 'Curriculum Progress Tracker initialized successfully',
        data: tracker
      });
    } catch (err) {
      next(err);
    }
  };

  public list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const {
        schoolId,
        teacherId,
        classRoomId,
        streamId,
        learningAreaId,
        term,
        academicYear,
        status,
        search
      } = req.query;

      const trackers = await this.trackerUseCases.listTrackers(
        {
          schoolId: schoolId as string,
          teacherId: teacherId as string,
          classRoomId: classRoomId as string,
          streamId: streamId as string,
          learningAreaId: learningAreaId as string,
          term: term as string,
          academicYear: academicYear as string,
          status: status as string,
          search: search as string
        },
        {
          userId: user?.userId,
          role: user?.role,
          schoolId: (user as any)?.schoolId
        }
      );

      return res.status(200).json({
        success: true,
        count: trackers.length,
        data: trackers
      });
    } catch (err) {
      next(err);
    }
  };

  public getSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const schoolId = (req.query.schoolId as string) || (user as any)?.schoolId || 'school-001';
      const term = req.query.term as string;
      const academicYear = req.query.academicYear as string;

      const summary = await this.trackerUseCases.getSummary(schoolId, term, academicYear);
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const tracker = await this.trackerUseCases.getTrackerById(req.params.id as string, {
        userId: user?.userId,
        role: user?.role
      });
      return res.status(200).json({
        success: true,
        data: tracker
      });
    } catch (err) {
      next(err);
    }
  };

  public updateWeekPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const weekNumber = parseInt(req.params.weekNumber as string, 10);
      const tracker = await this.trackerUseCases.updateWeekPlan(
        req.params.id as string,
        weekNumber,
        req.body,
        {
          userId: user?.userId,
          role: user?.role
        }
      );
      return res.status(200).json({
        success: true,
        message: `Week ${weekNumber} curriculum plan updated`,
        data: tracker
      });
    } catch (err) {
      next(err);
    }
  };

  public confirmWeekCovered = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const weekNumber = parseInt(req.params.weekNumber as string, 10);
      const tracker = await this.trackerUseCases.confirmWeekCovered(
        req.params.id as string,
        weekNumber,
        req.body,
        {
          userId: user?.userId,
          role: user?.role,
          fullName: (user as any)?.fullName || (user as any)?.name
        }
      );
      return res.status(200).json({
        success: true,
        message: `Week ${weekNumber} coverage confirmed successfully`,
        data: tracker
      });
    } catch (err) {
      next(err);
    }
  };

  public updateWeekComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const weekNumber = parseInt(req.params.weekNumber as string, 10);
      const tracker = await this.trackerUseCases.updateWeekComment(
        req.params.id as string,
        weekNumber,
        req.body.comment,
        {
          userId: user?.userId,
          role: user?.role
        }
      );
      return res.status(200).json({
        success: true,
        message: `Week ${weekNumber} comment updated successfully`,
        data: tracker
      });
    } catch (err) {
      next(err);
    }
  };

  public batchUpdateWeeks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const tracker = await this.trackerUseCases.batchUpdateWeeks(
        req.params.id as string,
        req.body.weeks,
        {
          userId: user?.userId,
          role: user?.role
        }
      );
      return res.status(200).json({
        success: true,
        message: 'Curriculum weeks updated successfully',
        data: tracker
      });
    } catch (err) {
      next(err);
    }
  };

  public addDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const result = await this.trackerUseCases.addDailyLog(
        req.params.id as string,
        req.body,
        {
          userId: user?.userId,
          role: user?.role,
          fullName: (user as any)?.fullName || (user as any)?.name
        }
      );
      return res.status(201).json({
        success: true,
        message: 'Daily lesson delivery and reflection logged successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public updateDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const result = await this.trackerUseCases.updateDailyLog(
        req.params.id as string,
        req.params.logId as string,
        req.body,
        {
          userId: user?.userId,
          role: user?.role,
          fullName: (user as any)?.fullName || (user as any)?.name
        }
      );
      return res.status(200).json({
        success: true,
        message: 'Daily lesson delivery and reflection updated successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public endorseDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const result = await this.trackerUseCases.endorseDailyLog(
        req.params.id as string,
        req.params.logId as string,
        req.body,
        {
          userId: user?.userId,
          role: user?.role,
          fullName: (user as any)?.fullName || (user as any)?.name
        }
      );
      return res.status(200).json({
        success: true,
        message: 'Daily curriculum log endorsed successfully by leadership',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteDailyLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      await this.trackerUseCases.deleteDailyLog(
        req.params.id as string,
        req.params.logId as string,
        {
          userId: user?.userId,
          role: user?.role
        }
      );
      return res.status(200).json({
        success: true,
        message: 'Daily curriculum log deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };

  public listDailyLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const {
        schoolId,
        teacherId,
        classRoomId,
        learningAreaId,
        date,
        startDate,
        endDate,
        search
      } = req.query;

      const result = await this.trackerUseCases.getAllDailyLogs(
        {
          schoolId: schoolId as string,
          teacherId: teacherId as string,
          classRoomId: classRoomId as string,
          learningAreaId: learningAreaId as string,
          date: date as string,
          startDate: startDate as string,
          endDate: endDate as string,
          search: search as string
        },
        {
          userId: user?.userId,
          role: user?.role,
          schoolId: (user as any)?.schoolId
        }
      );

      return res.status(200).json({
        success: true,
        total: result.total,
        data: result.logs
      });
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      await this.trackerUseCases.deleteTracker(req.params.id as string, {
        userId: user?.userId,
        role: user?.role
      });
      return res.status(200).json({
        success: true,
        message: 'Curriculum Progress Tracker deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };
}
