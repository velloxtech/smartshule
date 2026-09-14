import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { VisualMediaUseCases } from '../../../application/media/VisualMediaUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateHelpRequestSchema = z.object({
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  teacherId: z.string().optional(),
  subject: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  imageDataOrUrl: z.string().optional(),
  imageFileName: z.string().optional()
});

export const RespondHelpRequestSchema = z.object({
  response: z.string().min(1),
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED']).optional()
});

export const UploadProgressPhotoSchema = z.object({
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  learningAreaId: z.string().optional(),
  competencyTag: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  imageDataOrUrl: z.string().min(1),
  imageFileName: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export class MediaController {
  constructor(private readonly visualMediaUseCases: VisualMediaUseCases) {}

  public createHelpRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.visualMediaUseCases.createHelpRequest({
        ...req.body,
        guardianUserId: req.user!.userId
      });
      return res.status(201).json({
        success: true,
        message: 'Help request with processed photo uploaded successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listHelpRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, studentId, status } = req.query;
      const requests = await this.visualMediaUseCases.listHelpRequests({
        schoolId: schoolId as string,
        studentId: studentId as string,
        status: status as any,
        requestingUser: req.user
      });
      return res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (err) {
      next(err);
    }
  };

  public respondToHelpRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.visualMediaUseCases.respondToHelpRequest({
        requestId: req.params.id as string,
        teacherId: req.user!.userId,
        response: req.body.response,
        status: req.body.status || 'RESOLVED'
      });
      return res.status(200).json({
        success: true,
        message: 'Teacher response added successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public uploadProgressPhoto = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.visualMediaUseCases.uploadProgressPhoto({
        ...req.body,
        teacherId: req.user!.userId
      });
      return res.status(201).json({
        success: true,
        message: 'Student progress photo processed and uploaded successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listProgressPhotos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { schoolId, studentId, learningAreaId, competencyTag } = req.query;
      const photos = await this.visualMediaUseCases.listProgressPhotos({
        schoolId: schoolId as string,
        studentId: studentId as string,
        learningAreaId: learningAreaId as string,
        competencyTag: competencyTag as string,
        requestingUser: req.user
      });
      return res.status(200).json({ success: true, count: photos.length, data: photos });
    } catch (err) {
      next(err);
    }
  };
}
