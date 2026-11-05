import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { ComplaintUseCases } from '../../../application/complaints/ComplaintUseCases';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UserRole } from '../../../core/domain/user/User';
import { SystemLogUseCases } from '../../../application/system-logs/SystemLogUseCases';

export const CreateComplaintSchema = z
  .object({
    title: z.string().min(3).max(255).optional(),
    subject: z.string().min(3).max(255).optional(),
    description: z.string().min(5).optional(),
    details: z.string().min(5).optional(),
    category: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    complainantName: z.string().optional(),
    complainantRole: z.string().optional(),
    complainantPhone: z.string().optional(),
    complainantEmail: z.string().email().optional().or(z.literal('')),
    complainantStudentId: z.string().optional(),
    studentId: z.string().optional(),
    studentName: z.string().optional(),
    admissionNumber: z.string().optional(),
    gradeLevel: z.string().optional(),
    parentUserId: z.string().optional(),
    assignedToUserId: z.string().optional(),
    schoolId: z.string().optional(),
    attachments: z.array(z.any()).optional()
  })
  .refine((data) => Boolean(data.title || data.subject), {
    message: 'Title or subject is required (min 3 chars)',
    path: ['title']
  })
  .refine((data) => Boolean(data.description || data.details), {
    message: 'Description or details is required (min 5 chars)',
    path: ['description']
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
  studentId: z.string().optional(),
  assignedToUserId: z.string().optional()
});

export const UpdateComplaintStatusSchema = z.object({
  status: z.enum([
    'OPEN',
    'IN_REVIEW',
    'INVESTIGATING',
    'RESOLVED',
    'DISMISSED',
    'SUBMITTED',
    'ACKNOWLEDGED',
    'UNDER_REVIEW',
    'AWAITING_PARENT_RESPONSE',
    'ESCALATED',
    'CLOSED',
    'REOPENED'
  ]),
  notes: z.string().optional()
});

export const AssignComplaintSchema = z.object({
  assignedToUserId: z.string().min(1),
  reason: z.string().optional()
});

export const AcknowledgeConcernSchema = z.object({
  notes: z.string().optional()
});

export const EscalateConcernSchema = z.object({
  escalatedToUserId: z.string().optional(),
  reason: z.string().min(3)
});

export const AddConcernMessageSchema = z
  .object({
    message: z.string().optional(),
    response: z.string().optional(),
    visibility: z.enum(['PARENT_VISIBLE', 'INTERNAL_ONLY']).optional(),
    attachments: z.array(z.any()).optional(),
    awaitParentResponse: z.boolean().optional()
  })
  .refine((data) => Boolean(data.message || data.response), {
    message: 'Message or response text is required',
    path: ['message']
  });

export const ResolveComplaintSchema = z
  .object({
    resolutionNotes: z.string().optional(),
    actionTaken: z.string().optional(),
    resolutionDetails: z.string().optional()
  })
  .refine((data) => Boolean(data.resolutionNotes || data.actionTaken), {
    message: 'Resolution notes or action taken is required',
    path: ['resolutionNotes']
  });

export const CloseConcernSchema = z.object({
  notes: z.string().optional()
});

export const ReopenConcernSchema = z.object({
  reason: z.string().min(3)
});

export const DismissComplaintSchema = z.object({
  reason: z.string().min(3)
});

export class ComplaintController {
  constructor(
    private readonly useCases: ComplaintUseCases,
    private readonly systemLogUseCases?: SystemLogUseCases
  ) {}

  public create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const isParent = req.user?.role === UserRole.PARENT || req.user?.role === UserRole.GUARDIAN;
      const schoolId = req.body.schoolId || req.user?.schoolId || 'school-001';

      const complaint = await this.useCases.createComplaint(
        {
          ...req.body,
          schoolId
        },
        {
          userId: req.user!.userId,
          role: req.user?.role,
          email: req.user?.email,
          schoolId
        }
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
        details: `Concern registered: "${complaint.title}" (Ref: ${complaint.referenceNumber})`,
        metadata: {
          complaintId: complaint.id,
          referenceNumber: complaint.referenceNumber,
          category: complaint.category,
          priority: complaint.priority
        }
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Concern submitted successfully',
        data: isParent ? complaint.toParentSafeJSON() : complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const isParent = req.user?.role === UserRole.PARENT || req.user?.role === UserRole.GUARDIAN;
      const {
        status,
        category,
        priority,
        assignedToUserId,
        complainantRole,
        complainantStudentId,
        studentId,
        parentUserId,
        studentGrade,
        isOverdue,
        search,
        startDate,
        endDate,
        limit,
        offset,
        schoolId
      } = req.query;

      const complaints = await this.useCases.listComplaints(
        {
          schoolId: (schoolId as string) || req.user?.schoolId,
          status: status as string,
          category: category as string,
          priority: priority as string,
          assignedToUserId: assignedToUserId as string,
          complainantRole: complainantRole as string,
          complainantStudentId: (complainantStudentId || studentId) as string,
          studentId: (studentId || complainantStudentId) as string,
          parentUserId: parentUserId as string,
          studentGrade: studentGrade as string,
          isOverdue: isOverdue === 'true' ? true : isOverdue === 'false' ? false : undefined,
          search: search as string,
          startDate: startDate as string,
          endDate: endDate as string,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined
        },
        req.user
          ? {
              userId: req.user.userId,
              role: req.user.role,
              email: req.user.email,
              schoolId: req.user.schoolId
            }
          : undefined
      );

      return res.status(200).json({
        success: true,
        count: complaints.length,
        data: complaints.map((c) => (isParent ? c.toParentSafeJSON() : c.toJSON()))
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const isParent = req.user?.role === UserRole.PARENT || req.user?.role === UserRole.GUARDIAN;

      const complaint = await this.useCases.getComplaintById(
        id,
        req.user
          ? {
              userId: req.user.userId,
              role: req.user.role,
              email: req.user.email,
              schoolId: req.user.schoolId
            }
          : undefined
      );

      return res.status(200).json({
        success: true,
        data: isParent ? complaint.toParentSafeJSON() : complaint.toJSON()
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

  public acknowledge = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { notes } = req.body;

      const complaint = await this.useCases.acknowledgeComplaint(
        id,
        {
          userId: req.user!.userId,
          name: req.user?.email || 'Staff Member',
          role: req.user?.role
        },
        notes
      );

      return res.status(200).json({
        success: true,
        message: 'Concern acknowledged successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public assign = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { assignedToUserId, reason } = req.body;
      const complaint = await this.useCases.assignComplaint(
        id,
        {
          assignedToUserId,
          assignedByUserId: req.user!.userId,
          assignedByName: req.user?.email || 'Administrator',
          reason
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Complaint assigned successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public escalate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { escalatedToUserId, reason } = req.body;

      const complaint = await this.useCases.escalateComplaint(id, {
        escalatedToUserId,
        escalatedByUserId: req.user!.userId,
        escalatedByName: req.user?.email || 'Staff Member',
        reason
      });

      return res.status(200).json({
        success: true,
        message: 'Concern escalated successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public addMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const isParent = req.user?.role === UserRole.PARENT || req.user?.role === UserRole.GUARDIAN;
      const message = req.body.message || req.body.response;
      const visibility = req.body.visibility;
      const attachments = req.body.attachments;
      const awaitParentResponse = req.body.awaitParentResponse;

      const complaint = await this.useCases.addMessage(
        id,
        {
          senderUserId: req.user!.userId,
          senderName: req.user?.email || (isParent ? 'Parent' : 'Staff Member'),
          senderRole: req.user?.role || (isParent ? 'PARENT' : 'STAFF'),
          message,
          visibility,
          attachments,
          awaitParentResponse
        },
        req.user
          ? {
              userId: req.user.userId,
              role: req.user.role,
              email: req.user.email,
              schoolId: req.user.schoolId
            }
          : undefined
      );

      return res.status(200).json({
        success: true,
        message: 'Message recorded successfully',
        data: isParent ? complaint.toParentSafeJSON() : complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public resolve = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const actionTaken = req.body.actionTaken || req.body.resolutionNotes;
      const resolutionDetails = req.body.resolutionDetails;
      const resolvedByUserId = req.user!.userId;

      const complaint = await this.useCases.resolveComplaint(
        id,
        {
          actionTaken,
          resolutionDetails,
          resolutionNotes: actionTaken,
          resolvedByUserId,
          resolvedByName: req.user?.email || 'Administrator'
        }
      );

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
        details: `Concern "${complaint.title}" resolved. Action: ${actionTaken}`,
        metadata: { complaintId: complaint.id, referenceNumber: complaint.referenceNumber, actionTaken }
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

  public close = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { notes } = req.body;

      const complaint = await this.useCases.closeComplaint(id, {
        closedByUserId: req.user!.userId,
        closedByName: req.user?.email || 'Administrator',
        notes
      });

      return res.status(200).json({
        success: true,
        message: 'Concern closed successfully',
        data: complaint.toJSON()
      });
    } catch (err) {
      next(err);
    }
  };

  public reopen = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const isParent = req.user?.role === UserRole.PARENT || req.user?.role === UserRole.GUARDIAN;
      const { reason } = req.body;

      const complaint = await this.useCases.reopenComplaint(
        id,
        {
          reopenedByUserId: req.user!.userId,
          reopenedByName: req.user?.email || (isParent ? 'Parent' : 'Staff Member'),
          reason
        },
        req.user
          ? {
              userId: req.user.userId,
              role: req.user.role,
              email: req.user.email,
              schoolId: req.user.schoolId
            }
          : undefined
      );

      return res.status(200).json({
        success: true,
        message: 'Concern reopened successfully',
        data: isParent ? complaint.toParentSafeJSON() : complaint.toJSON()
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
