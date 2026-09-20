import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { VisualMediaUseCases } from '../../../application/media/VisualMediaUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateHelpRequestSchema = z.object({
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  teacherId: z.string().optional(),
  subject: z.string().optional(),
  learningAreaId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  imageDataOrUrl: z.string().optional(),
  photoBase64: z.string().optional(),
  mimeType: z.string().optional(),
  imageFileName: z.string().optional()
}).passthrough();

export const RespondHelpRequestSchema = z.object({
  response: z.string().optional(),
  responseMessage: z.string().optional(),
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED']).optional()
}).passthrough();

export const UploadProgressPhotoSchema = z.object({
  schoolId: z.string().min(1),
  studentId: z.string().min(1),
  learningAreaId: z.string().optional(),
  competencyTag: z.string().optional(),
  competencyDomain: z.string().optional(),
  rating: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  imageDataOrUrl: z.string().optional(),
  photoBase64: z.string().optional(),
  mimeType: z.string().optional(),
  imageFileName: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional()
}).passthrough();

export class MediaController {
  constructor(private readonly visualMediaUseCases: VisualMediaUseCases) {}

  public createHelpRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const imageData = req.body.imageDataOrUrl || req.body.photoBase64;
      const subject = req.body.subject || req.body.learningAreaId || 'General CBC Inquiry';

      const result = await this.visualMediaUseCases.createHelpRequest({
        ...req.body,
        subject,
        imageDataOrUrl: imageData,
        imageFileName: req.body.imageFileName || 'homework_help.jpg',
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
      const responseText = req.body.response || req.body.responseMessage;
      if (!responseText) {
        return res.status(400).json({ success: false, message: 'Response message is required' });
      }

      const result = await this.visualMediaUseCases.respondToHelpRequest({
        requestId: req.params.id as string,
        teacherId: req.user!.userId,
        response: responseText,
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
      const imageData = req.body.imageDataOrUrl || req.body.photoBase64;
      if (!imageData) {
        return res.status(400).json({ success: false, message: 'Image data or photo is required' });
      }

      const competency = req.body.competencyTag || req.body.competencyDomain || 'General CBC Progress';
      let tags = req.body.tags;
      if (typeof tags === 'string') {
        tags = tags.split(',').map((s: string) => s.trim().replace(/^#/, '')).filter(Boolean);
      }

      const result = await this.visualMediaUseCases.uploadProgressPhoto({
        ...req.body,
        competencyTag: competency,
        rating: req.body.rating,
        tags,
        imageDataOrUrl: imageData,
        imageFileName: req.body.imageFileName || 'student_progress.jpg',
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

  public uploadGeneralPhoto = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const imageData = req.body.imageDataOrUrl || req.body.photoBase64 || req.body.image;
      if (!imageData) {
        return res.status(400).json({ success: false, message: 'Image data is required' });
      }
      const processed = await this.visualMediaUseCases.processDirectPhoto(
        imageData,
        req.body.filename || 'upload.jpg'
      );
      return res.status(200).json({
        success: true,
        message: 'Photo uploaded and processed successfully',
        data: {
          url: processed.imageUrl,
          imageUrl: processed.imageUrl,
          photoUrl: processed.imageUrl,
          thumbnailUrl: processed.thumbnailUrl,
          metadata: processed.metadata
        }
      });
    } catch (err) {
      next(err);
    }
  };
}
