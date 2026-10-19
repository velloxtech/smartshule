import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { StudentSponsorshipUseCases } from '../../../application/sponsorship/StudentSponsorshipUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { SponsorshipType, SponsorshipStatus } from '../../../core/domain/sponsorship/StudentSponsorship';
import { CBCGradeLevel } from '../../../core/domain/user/Student';

export const CreateSponsorshipSchema = z.object({
  schoolId: z.string().optional(),
  studentId: z.string().min(1, 'studentId is required'),
  sponsorshipType: z.nativeEnum(SponsorshipType).default(SponsorshipType.DIRECTOR_BENEVOLENCE),
  sponsorshipStatus: z.nativeEnum(SponsorshipStatus).default(SponsorshipStatus.ACTIVE),
  coverage: z.object({
    tuitionCovered: z.boolean().default(true),
    lunchCovered: z.boolean().default(false),
    materialsCovered: z.boolean().default(true),
    uniformCovered: z.boolean().default(false),
    activitiesCovered: z.boolean().default(true),
    percentageCovered: z.number().default(100)
  }).optional(),
  sponsorName: z.string().min(1, 'sponsorName is required'),
  sponsorContact: z.string().optional(),
  termlySubsidyAmount: z.number().optional(),
  annualSubsidyAmount: z.number().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD').optional(),
  academicYearId: z.string().optional(),
  approvalReference: z.string().optional(),
  reasonNotes: z.string().min(1, 'reasonNotes is required'),
  confidentialNotes: z.string().optional()
});

export const UpdateSponsorshipSchema = z.object({
  sponsorshipType: z.nativeEnum(SponsorshipType).optional(),
  sponsorshipStatus: z.nativeEnum(SponsorshipStatus).optional(),
  coverage: z.object({
    tuitionCovered: z.boolean().optional(),
    lunchCovered: z.boolean().optional(),
    materialsCovered: z.boolean().optional(),
    uniformCovered: z.boolean().optional(),
    activitiesCovered: z.boolean().optional(),
    percentageCovered: z.number().optional()
  }).optional(),
  sponsorName: z.string().min(1).optional(),
  sponsorContact: z.string().optional(),
  termlySubsidyAmount: z.number().optional(),
  annualSubsidyAmount: z.number().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  academicYearId: z.string().optional(),
  approvalReference: z.string().optional(),
  reasonNotes: z.string().optional(),
  confidentialNotes: z.string().optional()
});

export const UpdateSponsorshipStatusSchema = z.object({
  status: z.nativeEnum(SponsorshipStatus),
  confidentialRemark: z.string().optional()
});

export class StudentSponsorshipController {
  constructor(private sponsorshipUseCases: StudentSponsorshipUseCases) {}

  public createSponsorship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateSponsorshipSchema.parse(req.body);
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId,
        email: authReq.user.email
      } : undefined;

      const result = await this.sponsorshipUseCases.createSponsorship(validated as any, requestingUser);
      res.status(201).json({
        success: true,
        message: 'Learner sponsorship enrolled successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public listSponsorships = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId,
        email: authReq.user.email
      } : undefined;

      const { schoolId, studentId, gradeLevel, sponsorshipType, sponsorshipStatus, academicYearId, search } = req.query;

      const filters = {
        schoolId: schoolId as string | undefined,
        studentId: studentId as string | undefined,
        gradeLevel: gradeLevel as CBCGradeLevel | undefined,
        sponsorshipType: sponsorshipType as SponsorshipType | undefined,
        sponsorshipStatus: sponsorshipStatus as SponsorshipStatus | undefined,
        academicYearId: academicYearId as string | undefined,
        search: search as string | undefined
      };

      const result = await this.sponsorshipUseCases.listSponsorships(filters, requestingUser);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId
      } : undefined;

      const schoolId = (req.query.schoolId as string) || requestingUser?.schoolId;
      const stats = await this.sponsorshipUseCases.getStats(schoolId, requestingUser);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };

  public getSponsorshipById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId
      } : undefined;

      const result = await this.sponsorshipUseCases.getSponsorshipById(req.params.id as string, requestingUser);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public getSponsorshipByStudentId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId
      } : undefined;

      const result = await this.sponsorshipUseCases.getSponsorshipByStudentId(req.params.studentId as string, requestingUser);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public updateSponsorship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateSponsorshipSchema.parse(req.body);
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId
      } : undefined;

      const result = await this.sponsorshipUseCases.updateSponsorship(req.params.id as string, validated as any, requestingUser);
      res.status(200).json({
        success: true,
        message: 'Sponsorship details updated successfully.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public updateSponsorshipStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateSponsorshipStatusSchema.parse(req.body);
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId
      } : undefined;

      const result = await this.sponsorshipUseCases.updateSponsorshipStatus(
        req.params.id as string,
        validated.status,
        validated.confidentialRemark,
        requestingUser
      );
      res.status(200).json({
        success: true,
        message: `Sponsorship status transitioned to ${validated.status}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteSponsorship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const requestingUser = authReq.user ? {
        userId: authReq.user.userId,
        role: authReq.user.role,
        schoolId: authReq.user.schoolId
      } : undefined;

      const result = await this.sponsorshipUseCases.deleteSponsorship(req.params.id as string, requestingUser);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
