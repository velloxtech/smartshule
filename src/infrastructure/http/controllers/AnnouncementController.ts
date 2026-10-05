import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AnnouncementUseCases } from '../../../application/announcements/AnnouncementUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  category: z.enum(['GENERAL', 'ACADEMIC', 'FEES', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'SPORTS', 'EXAM']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  targetAudience: z.enum(['ALL', 'PARENTS', 'TEACHERS', 'STUDENTS', 'SPECIFIC_GRADE']).optional(),
  targetGradeLevel: z.string().optional(),
  publishDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isPinned: z.boolean().optional(),
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']).optional(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
  sendSmsBroadcast: z.boolean().optional(),
  sendWhatsAppBroadcast: z.boolean().optional(),
  schoolId: z.string().optional()
});

export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['GENERAL', 'ACADEMIC', 'FEES', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'SPORTS', 'EXAM']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  targetAudience: z.enum(['ALL', 'PARENTS', 'TEACHERS', 'STUDENTS', 'SPECIFIC_GRADE']).optional(),
  targetGradeLevel: z.string().optional(),
  publishDate: z.string().optional(),
  expiryDate: z.string().optional(),
  isPinned: z.boolean().optional(),
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']).optional(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
  sendSmsBroadcast: z.boolean().optional(),
  sendWhatsAppBroadcast: z.boolean().optional()
});

export class AnnouncementController {
  constructor(
    private readonly useCases: AnnouncementUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public createAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = req.body.schoolId || req.user?.schoolId || 'school-1';
      const authorName = req.body.authorName || req.user?.email || 'School Administration';
      const authorRole = req.user?.role || 'ADMIN';
      const authorUserId = req.user?.userId;

      const announcement = await this.useCases.createAnnouncement({
        ...req.body,
        schoolId,
        authorName,
        authorRole,
        authorUserId
      });

      this.systemLogUseCases?.log({
        schoolId,
        level: announcement.priority === 'URGENT' ? 'WARN' : 'INFO',
        category: 'COMMUNICATION',
        action: 'ANNOUNCEMENT_CREATED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Published school notice: "${announcement.title}" (${announcement.category} / ${announcement.priority}) to ${announcement.targetAudience}`,
        metadata: { announcementId: announcement.id, title: announcement.title, priority: announcement.priority }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Announcement posted successfully',
        data: announcement.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public listAnnouncements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = (req.query.schoolId as string) || req.user?.schoolId || 'school-1';
      const audience = req.query.audience as string | undefined;
      const category = req.query.category as string | undefined;
      const priority = req.query.priority as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const gradeLevel = req.query.gradeLevel as string | undefined;
      const isPinned = req.query.isPinned !== undefined ? req.query.isPinned === 'true' : undefined;

      const announcements = await this.useCases.listAnnouncements({
        schoolId,
        audience,
        category,
        priority,
        status,
        search,
        gradeLevel,
        isPinned
      });

      return res.status(200).json({
        success: true,
        data: announcements.map((a) => a.toJSON()),
        total: announcements.length
      });
    } catch (err) {
      next(err);
    }
  };

  public getAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const announcement = await this.useCases.getAnnouncementById(id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: announcement.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public updateAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const announcement = await this.useCases.updateAnnouncement(id, req.body);

      this.systemLogUseCases?.log({
        schoolId: announcement.schoolId,
        level: 'INFO',
        category: 'COMMUNICATION',
        action: 'ANNOUNCEMENT_UPDATED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Updated school notice: "${announcement.title}"`,
        metadata: { announcementId: announcement.id }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Announcement updated successfully',
        data: announcement.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteAnnouncement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const success = await this.useCases.deleteAnnouncement(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found or already deleted'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Announcement removed successfully'
      });
    } catch (err) {
      next(err);
    }
  };

  public togglePin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const announcement = await this.useCases.togglePin(id);

      return res.status(200).json({
        success: true,
        message: announcement.isPinned ? 'Announcement pinned to top' : 'Announcement unpinned',
        data: announcement.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public acknowledge = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const userId = req.user?.userId || req.user?.email || 'anonymous-user';
      const result = await this.useCases.acknowledgeAnnouncement(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Receipt acknowledged',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };
}
