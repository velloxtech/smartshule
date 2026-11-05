import {
  Complaint,
  ConcernAttachment,
  ConcernAuditEntry,
  ConcernMessage,
  ConcernStatus
} from '../../core/domain/complaint/Complaint';
import {
  IComplaintRepository,
  ComplaintFilterCriteria,
  ComplaintStats
} from '../../core/ports/repositories/IComplaintRepository';
import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IGuardianRepository } from '../../core/ports/repositories/ITeacherRepository';
import { IStudentRepository } from '../../core/ports/repositories/IStudentRepository';
import { GuardianIdentityResolver } from '../shared/GuardianIdentityResolver';
import { IdGenerator, NotFoundError, ValidationError } from '../../core/domain/shared/Errors';

export interface RequestingUserContext {
  userId: string;
  role?: string;
  email?: string;
  name?: string;
  phone?: string;
  schoolId?: string;
}

export interface CreateComplaintDTO {
  schoolId?: string;
  title?: string;
  subject?: string; // Parent concern alias for title
  description?: string;
  details?: string; // Parent concern alias for description
  category?: string;
  priority?: string;
  complainantName?: string;
  complainantRole?: string;
  complainantPhone?: string;
  complainantEmail?: string;
  parentUserId?: string;
  complainantStudentId?: string; // legacy alias for studentId
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  gradeLevel?: string;
  assignedToUserId?: string;
  attachments?: ConcernAttachment[];
}

export interface UpdateComplaintDTO {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  complainantName?: string;
  complainantRole?: string;
  complainantPhone?: string;
  complainantEmail?: string;
  complainantStudentId?: string;
  studentId?: string;
  assignedToUserId?: string;
}

export interface AssignConcernDTO {
  assignedToUserId: string;
  assignedToName?: string;
  assignedToRole?: string;
  assignedByUserId?: string;
  assignedByName?: string;
  reason?: string;
}

export interface AcknowledgeConcernDTO {
  acknowledgedByUserId: string;
  acknowledgedByName?: string;
  notes?: string;
}

export interface EscalateConcernDTO {
  escalatedToUserId?: string;
  escalatedToName?: string;
  escalatedToRole?: string;
  escalatedByUserId: string;
  escalatedByName?: string;
  reason: string;
}

export interface AddConcernMessageDTO {
  senderUserId: string;
  senderName: string;
  senderRole: string;
  message: string;
  visibility?: 'PARENT_VISIBLE' | 'INTERNAL_ONLY';
  attachments?: ConcernAttachment[];
  awaitParentResponse?: boolean;
}

export interface ResolveConcernDTO {
  actionTaken?: string;
  resolutionDetails?: string;
  resolutionNotes?: string;
  resolvedByUserId: string;
  resolvedByName?: string;
}

export interface CloseConcernDTO {
  closedByUserId: string;
  closedByName?: string;
  notes?: string;
}

export interface ReopenConcernDTO {
  reopenedByUserId: string;
  reopenedByName?: string;
  reason: string;
}

export class ComplaintUseCases {
  constructor(
    private readonly complaintRepo: IComplaintRepository,
    private readonly userRepo?: IUserRepository,
    private readonly guardianRepo?: IGuardianRepository,
    private readonly studentRepo?: IStudentRepository,
    private readonly notificationService?: any
  ) {}

  /**
   * Generates a human-readable, unique concern reference: CON-YYYY-XXXXX
   */
  private generateReferenceNumber(): string {
    const year = new Date().getFullYear();
    const randomHex = Math.floor(10000 + Math.random() * 90000).toString();
    return `CON-${year}-${randomHex}`;
  }

  /**
   * Computes SLA deadlines based on priority
   */
  private calculateDeadlines(priority: string): { acknowledgementDeadline: Date; resolutionDeadline: Date } {
    const now = Date.now();
    const upperPriority = (priority || 'MEDIUM').toUpperCase();

    let ackHours = 24;
    let resHours = 72;

    switch (upperPriority) {
      case 'URGENT':
        ackHours = 4;
        resHours = 24;
        break;
      case 'HIGH':
        ackHours = 12;
        resHours = 48;
        break;
      case 'MEDIUM':
        ackHours = 24;
        resHours = 72;
        break;
      case 'LOW':
        ackHours = 48;
        resHours = 120;
        break;
    }

    return {
      acknowledgementDeadline: new Date(now + ackHours * 3600000),
      resolutionDeadline: new Date(now + resHours * 3600000)
    };
  }

  async createComplaint(
    data: CreateComplaintDTO,
    creatorOrUser?: string | RequestingUserContext
  ): Promise<Complaint> {
    const userContext: RequestingUserContext | undefined =
      typeof creatorOrUser === 'string'
        ? { userId: creatorOrUser }
        : creatorOrUser;

    const rawTitle = data.title || data.subject;
    if (!rawTitle || rawTitle.trim().length === 0) {
      throw new ValidationError('Complaint title/subject is required');
    }
    const rawDescription = data.description || data.details;
    if (!rawDescription || rawDescription.trim().length === 0) {
      throw new ValidationError('Complaint description/details is required');
    }

    const title = rawTitle.trim();
    const description = rawDescription.trim();
    const category = data.category || 'GENERAL';
    const priority = data.priority || 'MEDIUM';
    const schoolId = data.schoolId || userContext?.schoolId || 'school-001';

    let targetStudentId = data.studentId || data.complainantStudentId;
    let studentName = data.studentName;
    let admissionNumber = data.admissionNumber;
    let gradeLevel = data.gradeLevel;
    let parentUserId = data.parentUserId || (userContext?.role === 'PARENT' || userContext?.role === 'GUARDIAN' ? userContext.userId : undefined);
    let complainantName = data.complainantName || userContext?.name;
    let complainantEmail = data.complainantEmail || userContext?.email;
    let complainantPhone = data.complainantPhone || userContext?.phone;
    let complainantRole = data.complainantRole || userContext?.role || (parentUserId ? 'PARENT' : undefined);

    const isParentSubmission =
      userContext?.role === 'PARENT' ||
      userContext?.role === 'GUARDIAN' ||
      complainantRole === 'PARENT' ||
      complainantRole === 'GUARDIAN';

    // 1. Authoritative verification of parent-student relationship
    if (isParentSubmission && parentUserId && this.guardianRepo && this.studentRepo) {
      const resolution = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
        userId: parentUserId,
        userPhone: complainantPhone,
        userEmail: complainantEmail,
        guardianRepository: this.guardianRepo,
        studentRepository: this.studentRepo,
        userRepository: this.userRepo
      });

      if (targetStudentId) {
        const isLinked = resolution.studentIds.includes(targetStudentId);
        if (!isLinked) {
          throw new ValidationError(
            'Security validation failed: You are only authorized to raise concerns for your linked children.'
          );
        }

        const linkedStudent = resolution.students.find((s) => s.id === targetStudentId);
        if (linkedStudent) {
          studentName = linkedStudent.fullName || linkedStudent.firstName;
          admissionNumber = linkedStudent.admissionNumber;
          gradeLevel = linkedStudent.gradeLevel;
        }
      } else if (resolution.students.length === 1) {
        // Auto-select single child if not explicitly picked
        const singleChild = resolution.students[0];
        targetStudentId = singleChild.id;
        studentName = singleChild.fullName || singleChild.firstName;
        admissionNumber = singleChild.admissionNumber;
        gradeLevel = singleChild.gradeLevel;
      }

      if (!complainantName && resolution.guardian) {
        const u = this.userRepo ? await this.userRepo.findById(parentUserId) : null;
        complainantName = u ? `${u.fullName || u.email}` : 'Parent';
      }
    } else if (targetStudentId && this.studentRepo && (!studentName || !gradeLevel)) {
      // Staff-submitted complaint referencing a student
      const student = await this.studentRepo.findById(targetStudentId);
      if (student) {
        studentName = studentName || student.fullName || student.firstName;
        admissionNumber = admissionNumber || student.admissionNumber;
        gradeLevel = gradeLevel || student.gradeLevel;
      }
    }

    // 2. Prevent duplicate submissions
    if (isParentSubmission && parentUserId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const recent = await this.complaintRepo.find({
        schoolId,
        parentUserId,
        startDate: fiveMinutesAgo
      });

      const duplicate = recent.find(
        (c) =>
          c.title.toLowerCase() === title.toLowerCase() &&
          c.category.toLowerCase() === category.toLowerCase() &&
          (!targetStudentId || c.studentId === targetStudentId)
      );

      if (duplicate) {
        throw new ValidationError(
          'A similar concern has already been submitted recently. Please track reference ' +
            duplicate.referenceNumber +
            ' instead of creating a duplicate.'
        );
      }
    }

    // 3. Assigned user validation
    if (data.assignedToUserId && this.userRepo) {
      const assignedUser = await this.userRepo.findById(data.assignedToUserId);
      if (!assignedUser) {
        throw new NotFoundError('User', data.assignedToUserId);
      }
    }

    const { acknowledgementDeadline, resolutionDeadline } = this.calculateDeadlines(priority);
    const referenceNumber = this.generateReferenceNumber();

    const auditTrail: ConcernAuditEntry[] = [
      {
        id: IdGenerator.generate(),
        action: 'SUBMITTED',
        performedByUserId: userContext?.userId || 'system',
        performedByName: complainantName || 'Parent / Complainant',
        performedByRole: complainantRole || 'PARENT',
        timestamp: new Date(),
        details: `Concern submitted with reference ${referenceNumber} under category "${category}"`
      }
    ];

    const initialMessages: ConcernMessage[] = [];
    if (data.attachments && data.attachments.length > 0) {
      auditTrail.push({
        id: IdGenerator.generate(),
        action: 'ATTACHMENT_ADDED',
        performedByUserId: userContext?.userId || 'system',
        performedByName: complainantName || 'Parent',
        performedByRole: complainantRole || 'PARENT',
        timestamp: new Date(),
        details: `${data.attachments.length} supporting attachment(s) uploaded.`
      });
    }

    const complaint = Complaint.create(
      {
        schoolId,
        referenceNumber,
        title,
        description,
        category,
        priority,
        status: data.assignedToUserId ? 'IN_REVIEW' : (isParentSubmission ? 'SUBMITTED' : 'OPEN'),
        complainantName: complainantName?.trim(),
        complainantRole,
        complainantPhone: complainantPhone?.trim(),
        complainantEmail: complainantEmail?.trim().toLowerCase(),
        parentUserId,
        complainantStudentId: targetStudentId?.trim(),
        studentId: targetStudentId?.trim(),
        studentName,
        admissionNumber,
        gradeLevel,
        assignedToUserId: data.assignedToUserId,
        acknowledgementDeadline,
        resolutionDeadline,
        messages: initialMessages,
        auditTrail,
        attachments: data.attachments || [],
        createdByUserId: userContext?.userId
      },
      IdGenerator.generate()
    );

    const saved = await this.complaintRepo.create(complaint);

    // Asynchronously notify school office/administration
    if (this.notificationService) {
      const notifyMessage = `SmartShule: New Concern #${referenceNumber} (${category}) logged for student ${studentName || 'Learner'}. Priority: ${priority}.`;
      this.notificationService
        .sendGeneralNotification?.({
          schoolId,
          type: 'CONCERN_SUBMITTED',
          referenceNumber,
          title,
          studentName,
          category,
          priority
        })
        .catch(() => {});
    }

    return saved;
  }

  async getComplaintById(id: string, requestingUser?: RequestingUserContext): Promise<Complaint> {
    let complaint = await this.complaintRepo.findById(id);
    if (!complaint && this.complaintRepo.findByReferenceNumber) {
      complaint = await this.complaintRepo.findByReferenceNumber(id);
    }
    if (!complaint) {
      throw new NotFoundError('Complaint', id);
    }

    // Role-based parent isolation check
    const isParent = requestingUser?.role === 'PARENT' || requestingUser?.role === 'GUARDIAN';
    if (isParent && requestingUser) {
      const matchesUserId =
        complaint.parentUserId === requestingUser.userId ||
        complaint.createdByUserId === requestingUser.userId;
      const matchesEmail =
        complaint.complainantEmail &&
        requestingUser.email &&
        complaint.complainantEmail.toLowerCase() === requestingUser.email.toLowerCase();

      // Check linked students if neither user ID nor email matches
      let matchesStudent = false;
      if (!matchesUserId && !matchesEmail && complaint.studentId && this.guardianRepo && this.studentRepo) {
        const resolution = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
          userId: requestingUser.userId,
          userPhone: requestingUser.phone,
          userEmail: requestingUser.email,
          guardianRepository: this.guardianRepo,
          studentRepository: this.studentRepo,
          userRepository: this.userRepo
        });
        matchesStudent = resolution.studentIds.includes(complaint.studentId);
      }

      if (!matchesUserId && !matchesEmail && !matchesStudent) {
        throw new ValidationError('Access denied: You are only permitted to view concerns submitted for your account.');
      }
    }

    return complaint;
  }

  async listComplaints(
    criteria?: ComplaintFilterCriteria,
    requestingUser?: RequestingUserContext
  ): Promise<Complaint[]> {
    const isParent = requestingUser?.role === 'PARENT' || requestingUser?.role === 'GUARDIAN';

    if (isParent && requestingUser) {
      // Secure parent isolation: Only fetch complaints belonging to this parent or their linked children
      let linkedStudentIds: string[] = [];
      if (this.guardianRepo && this.studentRepo) {
        const res = await GuardianIdentityResolver.resolveLinkedStudentIdsForUser({
          userId: requestingUser.userId,
          userPhone: requestingUser.phone,
          userEmail: requestingUser.email,
          guardianRepository: this.guardianRepo,
          studentRepository: this.studentRepo,
          userRepository: this.userRepo
        });
        linkedStudentIds = res.studentIds;
      }

      const all = await this.complaintRepo.find(criteria);
      return all.filter((c) => {
        const matchesUser =
          c.parentUserId === requestingUser.userId || c.createdByUserId === requestingUser.userId;
        const matchesEmail =
          c.complainantEmail &&
          requestingUser.email &&
          c.complainantEmail.toLowerCase() === requestingUser.email.toLowerCase();
        const matchesChild = c.studentId ? linkedStudentIds.includes(c.studentId) : false;

        return matchesUser || matchesEmail || matchesChild;
      });
    }

    return await this.complaintRepo.find(criteria);
  }

  async updateComplaint(id: string, data: UpdateComplaintDTO): Promise<Complaint> {
    const complaint = await this.getComplaintById(id);

    if (data.assignedToUserId && this.userRepo) {
      const assignedUser = await this.userRepo.findById(data.assignedToUserId);
      if (!assignedUser) {
        throw new NotFoundError('User', data.assignedToUserId);
      }
    }

    complaint.updateDetails(data);
    return await this.complaintRepo.update(complaint);
  }

  async updateStatus(id: string, status: string, notes?: string): Promise<Complaint> {
    const validStatuses = [
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
    ];
    const normalizedStatus = status.toUpperCase();
    if (!validStatuses.includes(normalizedStatus)) {
      throw new ValidationError(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    const complaint = await this.getComplaintById(id);
    complaint.updateStatus(normalizedStatus, notes);
    return await this.complaintRepo.update(complaint);
  }

  async acknowledgeComplaint(
    id: string,
    acknowledgingUser: { userId: string; name?: string; role?: string },
    notes?: string
  ): Promise<Complaint> {
    const complaint = await this.getComplaintById(id);
    const userName = acknowledgingUser.name || 'School Staff';
    const userRole = acknowledgingUser.role || 'ADMIN';

    complaint.acknowledge(acknowledgingUser.userId, userName, userRole, notes);
    const updated = await this.complaintRepo.update(complaint);

    // Notify parent
    if (this.notificationService && complaint.complainantPhone) {
      this.notificationService
        .sendSms?.(
          complaint.complainantPhone,
          `SmartShule: Your concern #${complaint.referenceNumber} has been acknowledged by ${userName} and is now being attended to.`
        )
        .catch(() => {});
    }

    return updated;
  }

  async assignComplaint(
    id: string,
    assignmentOrUserId: string | AssignConcernDTO,
    assignedBy?: { userId: string; name?: string; role?: string }
  ): Promise<Complaint> {
    let assignedToUserId: string;
    let assignedToName: string | undefined;
    let assignedToRole: string | undefined;
    let assignedByUserId: string;
    let assignedByName: string;
    let reason: string | undefined;

    if (typeof assignmentOrUserId === 'string') {
      assignedToUserId = assignmentOrUserId;
      assignedByUserId = assignedBy?.userId || 'system';
      assignedByName = assignedBy?.name || 'Administrator';
    } else {
      assignedToUserId = assignmentOrUserId.assignedToUserId;
      assignedToName = assignmentOrUserId.assignedToName;
      assignedToRole = assignmentOrUserId.assignedToRole;
      assignedByUserId = assignmentOrUserId.assignedByUserId || assignedBy?.userId || 'system';
      assignedByName = assignmentOrUserId.assignedByName || assignedBy?.name || 'Administrator';
      reason = assignmentOrUserId.reason;
    }

    if (!assignedToUserId) {
      throw new ValidationError('assignedToUserId is required');
    }

    if (this.userRepo) {
      const assignedUser = await this.userRepo.findById(assignedToUserId);
      if (!assignedUser) {
        throw new NotFoundError('User', assignedToUserId);
      }
      assignedToName = assignedToName || assignedUser.fullName || assignedUser.email;
      assignedToRole = assignedToRole || assignedUser.role;
    }

    const complaint = await this.getComplaintById(id);
    complaint.assignTo(
      assignedToUserId,
      assignedToName,
      assignedToRole,
      assignedByUserId,
      assignedByName,
      reason
    );

    const updated = await this.complaintRepo.update(complaint);

    // Notify assignee
    if (this.notificationService) {
      this.notificationService
        .sendGeneralNotification?.({
          type: 'CONCERN_ASSIGNED',
          assignedToUserId,
          referenceNumber: complaint.referenceNumber,
          title: complaint.title
        })
        .catch(() => {});
    }

    return updated;
  }

  async escalateComplaint(id: string, escalation: EscalateConcernDTO): Promise<Complaint> {
    if (!escalation.reason || escalation.reason.trim().length === 0) {
      throw new ValidationError('Reason is required to escalate a concern');
    }

    const complaint = await this.getComplaintById(id);
    let targetName = escalation.escalatedToName;
    let targetRole = escalation.escalatedToRole;

    if (escalation.escalatedToUserId && this.userRepo) {
      const targetUser = await this.userRepo.findById(escalation.escalatedToUserId);
      if (targetUser) {
        targetName = targetName || targetUser.fullName || targetUser.email;
        targetRole = targetRole || targetUser.role;
      }
    }

    complaint.escalate(
      escalation.escalatedToUserId || 'admin-pool',
      targetName || 'Administration',
      targetRole || 'ADMIN',
      escalation.reason.trim(),
      escalation.escalatedByUserId,
      escalation.escalatedByName || 'Staff Member',
      'STAFF'
    );

    const updated = await this.complaintRepo.update(complaint);

    // Notify escalated target / administration
    if (this.notificationService) {
      this.notificationService
        .sendGeneralNotification?.({
          type: 'CONCERN_ESCALATED',
          referenceNumber: complaint.referenceNumber,
          reason: escalation.reason
        })
        .catch(() => {});
    }

    return updated;
  }

  async addMessage(
    id: string,
    messageData: AddConcernMessageDTO,
    requestingUser?: RequestingUserContext
  ): Promise<Complaint> {
    if (!messageData.message || messageData.message.trim().length === 0) {
      throw new ValidationError('Message text is required');
    }

    const complaint = await this.getComplaintById(id, requestingUser);
    const isParent =
      requestingUser?.role === 'PARENT' ||
      requestingUser?.role === 'GUARDIAN' ||
      messageData.senderRole === 'PARENT';

    // Security Rule: Parents CANNOT submit internal-only notes. Visibility is strictly PARENT_VISIBLE.
    const visibility: 'PARENT_VISIBLE' | 'INTERNAL_ONLY' = isParent
      ? 'PARENT_VISIBLE'
      : messageData.visibility || 'PARENT_VISIBLE';

    complaint.addMessage({
      senderUserId: messageData.senderUserId || requestingUser?.userId || 'unknown',
      senderName: messageData.senderName || requestingUser?.name || (isParent ? 'Parent' : 'Staff Member'),
      senderRole: messageData.senderRole || requestingUser?.role || (isParent ? 'PARENT' : 'STAFF'),
      message: messageData.message.trim(),
      visibility,
      attachments: messageData.attachments
    });

    // If staff sent a parent-visible message and requested parent response, transition status
    if (!isParent && visibility === 'PARENT_VISIBLE' && messageData.awaitParentResponse) {
      complaint.updateStatus(ConcernStatus.AWAITING_PARENT_RESPONSE, 'Awaiting additional details from parent.');
    }

    // If parent replied while status was AWAITING_PARENT_RESPONSE, transition back to UNDER_REVIEW
    if (isParent && complaint.status.toUpperCase() === 'AWAITING_PARENT_RESPONSE') {
      complaint.updateStatus(ConcernStatus.UNDER_REVIEW, 'Parent provided requested details.');
    }

    const updated = await this.complaintRepo.update(complaint);

    // SMS/Push notification for new message
    if (this.notificationService) {
      if (visibility === 'PARENT_VISIBLE' && !isParent && complaint.complainantPhone) {
        this.notificationService
          .sendSms?.(
            complaint.complainantPhone,
            `SmartShule: New update regarding concern #${complaint.referenceNumber}: "${messageData.message.slice(0, 80)}..."`
          )
          .catch(() => {});
      }
    }

    return updated;
  }

  async resolveComplaint(
    id: string,
    resolutionOrNotes: string | ResolveConcernDTO,
    resolvedByUserId?: string
  ): Promise<Complaint> {
    let actionTaken: string;
    let resolutionDetails: string | undefined;
    let resolvedBy: string;
    let resolvedByName: string | undefined;

    if (typeof resolutionOrNotes === 'string') {
      if (!resolutionOrNotes || resolutionOrNotes.trim().length === 0) {
        throw new ValidationError('Resolution notes are required to resolve a complaint');
      }
      actionTaken = resolutionOrNotes.trim();
      resolvedBy = resolvedByUserId || 'system';
    } else {
      const primaryNote = resolutionOrNotes.actionTaken || resolutionOrNotes.resolutionNotes;
      if (!primaryNote || primaryNote.trim().length === 0) {
        throw new ValidationError('Resolution action / notes are required');
      }
      actionTaken = primaryNote.trim();
      resolutionDetails = resolutionOrNotes.resolutionDetails;
      resolvedBy = resolutionOrNotes.resolvedByUserId || resolvedByUserId || 'system';
      resolvedByName = resolutionOrNotes.resolvedByName;
    }

    if (this.userRepo && !resolvedByName && resolvedBy !== 'system') {
      const u = await this.userRepo.findById(resolvedBy);
      if (u) resolvedByName = u.fullName || u.email;
    }

    const complaint = await this.getComplaintById(id);
    complaint.resolve(actionTaken, resolvedBy, actionTaken, resolvedByName, 'STAFF');

    const updated = await this.complaintRepo.update(complaint);

    // Notify parent
    if (this.notificationService && complaint.complainantPhone) {
      this.notificationService
        .sendSms?.(
          complaint.complainantPhone,
          `SmartShule: Your concern #${complaint.referenceNumber} has been resolved. Action taken: ${actionTaken}. Please verify in your Parent Portal.`
        )
        .catch(() => {});
    }

    return updated;
  }

  async closeComplaint(id: string, closure: CloseConcernDTO): Promise<Complaint> {
    const complaint = await this.getComplaintById(id);
    let closedByName = closure.closedByName;
    if (this.userRepo && !closedByName && closure.closedByUserId !== 'system') {
      const u = await this.userRepo.findById(closure.closedByUserId);
      if (u) closedByName = u.fullName || u.email;
    }

    complaint.close(closure.closedByUserId, closedByName || 'Administrator', 'ADMIN', closure.notes);
    return await this.complaintRepo.update(complaint);
  }

  async reopenComplaint(
    id: string,
    reopen: ReopenConcernDTO,
    requestingUser?: RequestingUserContext
  ): Promise<Complaint> {
    if (!reopen.reason || reopen.reason.trim().length === 0) {
      throw new ValidationError('A reason is mandatory to reopen a concern');
    }

    const complaint = await this.getComplaintById(id, requestingUser);
    const currentStatus = complaint.status.toUpperCase();
    if (currentStatus !== 'RESOLVED' && currentStatus !== 'CLOSED' && currentStatus !== 'DISMISSED') {
      throw new ValidationError(`Only resolved or closed concerns can be reopened. Current status: ${complaint.status}`);
    }

    let reopenedByName = reopen.reopenedByName || requestingUser?.name;
    if (this.userRepo && !reopenedByName && reopen.reopenedByUserId !== 'system') {
      const u = await this.userRepo.findById(reopen.reopenedByUserId);
      if (u) reopenedByName = u.fullName || u.email;
    }

    complaint.reopen(reopen.reason.trim(), reopen.reopenedByUserId, reopenedByName || 'Parent', requestingUser?.role || 'PARENT');
    const updated = await this.complaintRepo.update(complaint);

    // Notify administration of reopened concern
    if (this.notificationService) {
      this.notificationService
        .sendGeneralNotification?.({
          type: 'CONCERN_REOPENED',
          referenceNumber: complaint.referenceNumber,
          reason: reopen.reason
        })
        .catch(() => {});
    }

    return updated;
  }

  async dismissComplaint(
    id: string,
    reason: string,
    dismissedByUserId: string
  ): Promise<Complaint> {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Dismissal reason is required to dismiss a complaint');
    }

    const complaint = await this.getComplaintById(id);
    complaint.dismiss(reason.trim(), dismissedByUserId);
    return await this.complaintRepo.update(complaint);
  }

  async deleteComplaint(id: string): Promise<boolean> {
    await this.getComplaintById(id);
    return await this.complaintRepo.delete(id);
  }

  async getStats(schoolId?: string): Promise<ComplaintStats> {
    return await this.complaintRepo.getStats(schoolId);
  }
}
