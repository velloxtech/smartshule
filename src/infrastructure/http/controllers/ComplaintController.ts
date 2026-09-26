import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { ComplaintUseCases } from '../../../application/complaints/ComplaintUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const CreateComplaintSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(5),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  complainantName: z.string().optional(),
  complainantRole: z.string().optional(),
  complainantPhone: z.string().optional(),
  complainantEmail: z.string().email().optional().or(z.literal('')),
  complainantStudentId: z.string().optional(),
  assignedToUserId: z.string().optional(),
  schoolId: z.string().optional()
});

export const UpdateComplaintSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(5).optional(),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  complainantName: z.string().optional(),
  complainantRole: z.string().optional(),
  complainantPhone: z.string().optional(),
  complainantEmail: z.string().email().optional().or(z.literal('')),
  complainantStudentId: z.string().optional(),
  assignedToUserId: z.string().optional()
});

export const UpdateComplaintStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']),
  notes: z.string().optional()
});

export const AssignComplaintSchema = z.object({
  assignedToUserId: z.string().min(1)
});

export const ResolveComplaintSchema = z.object({
  resolutionNotes: z.string().min(3)
});

export const DismissComplaintSchema = z.object({
  reason: z.string().min(3)
});

import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export class ComplaintController {
  constructor(
    private readonly useCases: ComplaintUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const creatorUserId = req.user?.userId;
      const schoolId = req.body.schoolId || req.user?.schoolId || 'school-001';
      const complaint = await this.useCases.createComplaint(
        {
          ...req.body,
          schoolId
        },
        creatorUserId
      );

      this.systemLogUseCases?.log({
        schoolId,
        level: 'INFO',
        category: 'COMPLAINTS',
        action: 'COMPLAINT_CREATED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Complaint submitted: "${complaint.title}" (${complaint.category})`,
        metadata: { complaintId: complaint.id, category: complaint.category, priority: complaint.priority }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Complaint registered successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        status,
        category,
        priority,
        assignedToUserId,
        complainantRole,
        complainantStudentId,
        search,
        startDate,
        endDate,
        limit,
        offset,
        schoolId
      } = req.query;

      const complaints = await this.useCases.listComplaints({
        schoolId: (schoolId as string) || req.user?.schoolId,
        status: status as string,
        category: category as string,
        priority: priority as string,
        assignedToUserId: assignedToUserId as string,
        complainantRole: complainantRole as string,
        complainantStudentId: complainantStudentId as string,
        search: search as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      });

      return res.status(200).json({
        success: true,
        count: complaints.length,
        data: complaints.map((c) => c.toJSON())
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const complaint = await this.useCases.getComplaintById(id);

      return res.status(200).json({
        success: true,
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const complaint = await this.useCases.updateComplaint(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Complaint updated successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public updateStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { status, notes } = req.body;
      const complaint = await this.useCases.updateStatus(id, status, notes);

      return res.status(200).json({
        success: true,
        message: 'Complaint status updated successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public assign = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { assignedToUserId } = req.body;
      const complaint = await this.useCases.assignComplaint(id, assignedToUserId);

      return res.status(200).json({
        success: true,
        message: 'Complaint assigned successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public resolve = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { resolutionNotes } = req.body;
      const resolvedByUserId = req.user!.userId;
      const complaint = await this.useCases.resolveComplaint(id, resolutionNotes, resolvedByUserId);

      this.systemLogUseCases?.log({
        schoolId: complaint.schoolId,
        level: 'AUDIT',
        category: 'COMPLAINTS',
        action: 'COMPLAINT_RESOLVED',
        actorEmail: req.user?.email,
        actorUserId: req.user?.userId,
        actorRole: req.user?.role,
        ipAddress: req.ip || (req.socket?.remoteAddress as string),
        status: 'SUCCESS',
        details: `Complaint "${complaint.title}" resolved. Notes: ${resolutionNotes}`,
        metadata: { complaintId: complaint.id, resolutionNotes }
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        message: 'Complaint resolved successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public dismiss = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const dismissedByUserId = req.user!.userId;
      const complaint = await this.useCases.dismissComplaint(id, reason, dismissedByUserId);

      return res.status(200).json({
        success: true,
        message: 'Complaint dismissed successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await this.useCases.deleteComplaint(id);

      return res.status(200).json({
        success: true,
        message: 'Complaint deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  };

  public getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const schoolId = (req.query.schoolId as string) || req.user?.schoolId;
      const stats = await this.useCases.getStats(schoolId);

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (err) {
      next(err);
    }
  };
}
