import { Entity } from '../shared/Entity';

export enum ConcernStatus {
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  AWAITING_PARENT_RESPONSE = 'AWAITING_PARENT_RESPONSE',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  // Backwards-compatible aliases
  OPEN = 'SUBMITTED',
  IN_REVIEW = 'UNDER_REVIEW',
  INVESTIGATING = 'UNDER_REVIEW',
  DISMISSED = 'CLOSED',
}

export type ComplaintStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'AWAITING_PARENT_RESPONSE'
  | 'ESCALATED'
  | 'CLOSED'
  | 'REOPENED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export enum ConcernCategory {
  ACADEMICS_PERFORMANCE = 'Academics and Performance',
  ATTENDANCE_PUNCTUALITY = 'Attendance and Punctuality',
  BEHAVIOUR_DISCIPLINE = 'Behaviour and Discipline',
  HEALTH_WELFARE = 'Health and Welfare',
  FEES_PAYMENTS = 'Fees and Payments',
  LUNCH_PROGRAMME = 'Lunch Programme',
  TRANSPORT = 'Transport',
  TEACHER_COMMUNICATION = 'Teacher Communication',
  SCHOOL_FACILITIES = 'School Facilities',
  GENERAL = 'General School Matters',
  OTHER = 'Other',
}

export type ComplaintCategory =
  | 'ACADEMIC'
  | 'DISCIPLINE'
  | 'FACILITY'
  | 'FINANCIAL'
  | 'STAFF_CONDUCT'
  | 'TRANSPORT'
  | 'SAFETY'
  | 'FOOD_DINING'
  | 'GENERAL'
  | 'OTHER'
  | string;

export interface ConcernAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface ConcernMessage {
  id: string;
  senderUserId: string;
  senderName: string;
  senderRole: string;
  message: string;
  visibility: 'PARENT_VISIBLE' | 'INTERNAL_ONLY';
  attachments?: ConcernAttachment[];
  createdAt: Date;
}

export interface ConcernAuditEntry {
  id: string;
  action:
    | 'SUBMITTED'
    | 'ACKNOWLEDGED'
    | 'ASSIGNED'
    | 'REASSIGNED'
    | 'STATUS_CHANGE'
    | 'MESSAGE_SENT'
    | 'INTERNAL_NOTE_ADDED'
    | 'ESCALATED'
    | 'RESOLVED'
    | 'CLOSED'
    | 'REOPENED'
    | 'ATTACHMENT_ADDED';
  performedByUserId: string;
  performedByName: string;
  performedByRole: string;
  timestamp: Date;
  details: string;
  notes?: string;
}

export interface ComplaintProps {
  schoolId: string;
  referenceNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;

  // Complainant / Parent
  complainantName?: string;
  complainantRole?: string;
  complainantPhone?: string;
  complainantEmail?: string;
  parentUserId?: string;

  // Linked Student
  complainantStudentId?: string; // legacy alias
  studentId?: string;
  studentName?: string;
  admissionNumber?: string;
  gradeLevel?: string;

  // Assignment
  assignedToUserId?: string;
  assignedToName?: string;
  assignedToRole?: string;
  assignedAt?: Date;
  assignedByUserId?: string;
  assignedByName?: string;
  reassignmentReason?: string;

  // Acknowledgment
  acknowledgedAt?: Date;
  acknowledgedByUserId?: string;
  acknowledgedByName?: string;

  // Escalation
  escalatedAt?: Date;
  escalatedToUserId?: string;
  escalatedToName?: string;
  escalatedToRole?: string;
  escalatedByUserId?: string;
  escalatedByName?: string;
  escalationReason?: string;

  // Resolution
  actionTaken?: string;
  resolutionDetails?: string;
  resolutionNotes?: string;
  resolvedByUserId?: string;
  resolvedByName?: string;
  resolvedAt?: Date;

  // Closure
  closedAt?: Date;
  closedByUserId?: string;
  closedByName?: string;
  closureNotes?: string;

  // Reopening
  reopenedAt?: Date;
  reopenedByUserId?: string;
  reopenedByName?: string;
  reopeningReason?: string;

  // Response Deadlines / SLA
  acknowledgementDeadline?: Date;
  resolutionDeadline?: Date;

  // Messages, Audit & Attachments
  messages: ConcernMessage[];
  auditTrail: ConcernAuditEntry[];
  attachments: ConcernAttachment[];

  createdByUserId?: string;
}

export class Complaint extends Entity<ComplaintProps> {
  public static create(
    props: Partial<ComplaintProps> & { schoolId: string; title: string; description: string },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Complaint {
    const now = createdAt || new Date();
    const year = now.getFullYear();
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const referenceNumber = props.referenceNumber || `CON-${year}-${randomSuffix}`;

    // Normalize initial status
    const initialStatus = props.status || 'OPEN';

    // Calculate default response deadlines
    const ackDeadline = props.acknowledgementDeadline || new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    const priorityHours = props.priority === 'URGENT' ? 24 : props.priority === 'HIGH' ? 48 : 72;
    const resDeadline = props.resolutionDeadline || new Date(now.getTime() + priorityHours * 60 * 60 * 1000);

    const initialAudit: ConcernAuditEntry[] = props.auditTrail && props.auditTrail.length > 0
      ? props.auditTrail
      : [
          {
            id: `audit-${id}-init`,
            action: 'SUBMITTED',
            performedByUserId: props.createdByUserId || props.parentUserId || 'system',
            performedByName: props.complainantName || 'Parent / Complainant',
            performedByRole: props.complainantRole || 'PARENT',
            timestamp: now,
            details: `Concern registered with reference #${referenceNumber}`
          }
        ];

    return new Complaint(
      {
        schoolId: props.schoolId,
        referenceNumber,
        title: props.title,
        description: props.description,
        category: props.category || 'GENERAL',
        priority: props.priority || 'MEDIUM',
        status: initialStatus,
        complainantName: props.complainantName,
        complainantRole: props.complainantRole || 'PARENT',
        complainantPhone: props.complainantPhone,
        complainantEmail: props.complainantEmail,
        parentUserId: props.parentUserId || props.createdByUserId,
        complainantStudentId: props.complainantStudentId || props.studentId,
        studentId: props.studentId || props.complainantStudentId,
        studentName: props.studentName,
        admissionNumber: props.admissionNumber,
        gradeLevel: props.gradeLevel,
        assignedToUserId: props.assignedToUserId,
        assignedToName: props.assignedToName,
        assignedToRole: props.assignedToRole,
        assignedAt: props.assignedAt,
        assignedByUserId: props.assignedByUserId,
        assignedByName: props.assignedByName,
        reassignmentReason: props.reassignmentReason,
        acknowledgedAt: props.acknowledgedAt,
        acknowledgedByUserId: props.acknowledgedByUserId,
        acknowledgedByName: props.acknowledgedByName,
        escalatedAt: props.escalatedAt,
        escalatedToUserId: props.escalatedToUserId,
        escalatedToName: props.escalatedToName,
        escalatedToRole: props.escalatedToRole,
        escalatedByUserId: props.escalatedByUserId,
        escalatedByName: props.escalatedByName,
        escalationReason: props.escalationReason,
        actionTaken: props.actionTaken,
        resolutionDetails: props.resolutionDetails || props.resolutionNotes,
        resolutionNotes: props.resolutionNotes || props.resolutionDetails,
        resolvedByUserId: props.resolvedByUserId,
        resolvedByName: props.resolvedByName,
        resolvedAt: props.resolvedAt,
        closedAt: props.closedAt,
        closedByUserId: props.closedByUserId,
        closedByName: props.closedByName,
        closureNotes: props.closureNotes,
        reopenedAt: props.reopenedAt,
        reopenedByUserId: props.reopenedByUserId,
        reopenedByName: props.reopenedByName,
        reopeningReason: props.reopeningReason,
        acknowledgementDeadline: ackDeadline,
        resolutionDeadline: resDeadline,
        messages: props.messages || [],
        auditTrail: initialAudit,
        attachments: props.attachments || [],
        createdByUserId: props.createdByUserId || props.parentUserId
      },
      id,
      createdAt,
      updatedAt
    );
  }

  // Getters
  public get schoolId(): string { return this._props.schoolId; }
  public get referenceNumber(): string { return this._props.referenceNumber; }
  public get title(): string { return this._props.title; }
  public get description(): string { return this._props.description; }
  public get category(): string { return this._props.category; }
  public get priority(): string { return this._props.priority; }
  public get status(): string { return this._props.status; }
  public get complainantName(): string | undefined { return this._props.complainantName; }
  public get complainantRole(): string | undefined { return this._props.complainantRole; }
  public get complainantPhone(): string | undefined { return this._props.complainantPhone; }
  public get complainantEmail(): string | undefined { return this._props.complainantEmail; }
  public get parentUserId(): string | undefined { return this._props.parentUserId; }
  public get complainantStudentId(): string | undefined { return this._props.complainantStudentId || this._props.studentId; }
  public get studentId(): string | undefined { return this._props.studentId || this._props.complainantStudentId; }
  public get studentName(): string | undefined { return this._props.studentName; }
  public get admissionNumber(): string | undefined { return this._props.admissionNumber; }
  public get gradeLevel(): string | undefined { return this._props.gradeLevel; }
  public get assignedToUserId(): string | undefined { return this._props.assignedToUserId; }
  public get assignedToName(): string | undefined { return this._props.assignedToName; }
  public get assignedToRole(): string | undefined { return this._props.assignedToRole; }
  public get assignedAt(): Date | undefined { return this._props.assignedAt; }
  public get assignedByUserId(): string | undefined { return this._props.assignedByUserId; }
  public get assignedByName(): string | undefined { return this._props.assignedByName; }
  public get reassignmentReason(): string | undefined { return this._props.reassignmentReason; }
  public get acknowledgedAt(): Date | undefined { return this._props.acknowledgedAt; }
  public get acknowledgedByUserId(): string | undefined { return this._props.acknowledgedByUserId; }
  public get acknowledgedByName(): string | undefined { return this._props.acknowledgedByName; }
  public get escalatedAt(): Date | undefined { return this._props.escalatedAt; }
  public get escalatedToUserId(): string | undefined { return this._props.escalatedToUserId; }
  public get escalatedToName(): string | undefined { return this._props.escalatedToName; }
  public get escalatedToRole(): string | undefined { return this._props.escalatedToRole; }
  public get escalatedByUserId(): string | undefined { return this._props.escalatedByUserId; }
  public get escalatedByName(): string | undefined { return this._props.escalatedByName; }
  public get escalationReason(): string | undefined { return this._props.escalationReason; }
  public get actionTaken(): string | undefined { return this._props.actionTaken; }
  public get resolutionDetails(): string | undefined { return this._props.resolutionDetails || this._props.resolutionNotes; }
  public get resolutionNotes(): string | undefined { return this._props.resolutionNotes || this._props.resolutionDetails; }
  public get resolvedByUserId(): string | undefined { return this._props.resolvedByUserId; }
  public get resolvedByName(): string | undefined { return this._props.resolvedByName; }
  public get resolvedAt(): Date | undefined { return this._props.resolvedAt; }
  public get closedAt(): Date | undefined { return this._props.closedAt; }
  public get closedByUserId(): string | undefined { return this._props.closedByUserId; }
  public get closedByName(): string | undefined { return this._props.closedByName; }
  public get closureNotes(): string | undefined { return this._props.closureNotes; }
  public get reopenedAt(): Date | undefined { return this._props.reopenedAt; }
  public get reopenedByUserId(): string | undefined { return this._props.reopenedByUserId; }
  public get reopenedByName(): string | undefined { return this._props.reopenedByName; }
  public get reopeningReason(): string | undefined { return this._props.reopeningReason; }
  public get acknowledgementDeadline(): Date | undefined { return this._props.acknowledgementDeadline; }
  public get resolutionDeadline(): Date | undefined { return this._props.resolutionDeadline; }
  public get messages(): ConcernMessage[] { return this._props.messages; }
  public get auditTrail(): ConcernAuditEntry[] { return this._props.auditTrail; }
  public get attachments(): ConcernAttachment[] { return this._props.attachments; }
  public get createdByUserId(): string | undefined { return this._props.createdByUserId; }

  public get isOverdue(): boolean {
    if (this._props.status === 'RESOLVED' || this._props.status === 'CLOSED') return false;
    const now = new Date().getTime();
    if (this._props.status === 'SUBMITTED' && this._props.acknowledgementDeadline) {
      return now > this._props.acknowledgementDeadline.getTime();
    }
    if (this._props.resolutionDeadline) {
      return now > this._props.resolutionDeadline.getTime();
    }
    return false;
  }

  // Domain Actions
  public acknowledge(userId: string, userName: string, userRole: string, notes?: string): void {
    this._props.status = 'ACKNOWLEDGED';
    this._props.acknowledgedAt = new Date();
    this._props.acknowledgedByUserId = userId;
    this._props.acknowledgedByName = userName;
    this.addAuditEntry(
      'ACKNOWLEDGED',
      userId,
      userName,
      userRole,
      `Concern acknowledged by ${userName} (${userRole})`,
      notes
    );
    this.touch();
  }

  public assignTo(
    assignedToUserId: string,
    assignedToName?: string,
    assignedToRole?: string,
    assigningUserId?: string,
    assigningUserName?: string,
    assigningUserRole?: string,
    reason?: string
  ): void {
    const prevAssignee = this._props.assignedToName || this._props.assignedToUserId || 'Unassigned';
    this._props.assignedToUserId = assignedToUserId;
    if (assignedToName) this._props.assignedToName = assignedToName;
    if (assignedToRole) this._props.assignedToRole = assignedToRole;
    this._props.assignedAt = new Date();
    if (assigningUserId) this._props.assignedByUserId = assigningUserId;
    if (assigningUserName) this._props.assignedByName = assigningUserName;
    if (reason) this._props.reassignmentReason = reason;

    // Transition from SUBMITTED or ACKNOWLEDGED to IN_REVIEW
    if (this._props.status === 'SUBMITTED' || this._props.status === 'OPEN' || this._props.status === 'ACKNOWLEDGED') {
      this._props.status = 'IN_REVIEW';
    }

    const action = prevAssignee === 'Unassigned' ? 'ASSIGNED' : 'REASSIGNED';
    this.addAuditEntry(
      action,
      assigningUserId || 'system',
      assigningUserName || 'Administrator',
      assigningUserRole || 'ADMIN',
      `Assigned to ${assignedToName || assignedToUserId}${prevAssignee !== 'Unassigned' ? ` (Previously: ${prevAssignee})` : ''}${reason ? `. Reason: ${reason}` : ''}`,
      reason
    );
    this.touch();
  }

  public escalate(
    escalatedToUserId: string,
    escalatedToName: string,
    escalatedToRole: string,
    reason: string,
    escalatingUserId: string,
    escalatingUserName: string,
    escalatingUserRole: string
  ): void {
    this._props.status = 'ESCALATED';
    this._props.escalatedAt = new Date();
    this._props.escalatedToUserId = escalatedToUserId;
    this._props.escalatedToName = escalatedToName;
    this._props.escalatedToRole = escalatedToRole;
    this._props.escalatedByUserId = escalatingUserId;
    this._props.escalatedByName = escalatingUserName;
    this._props.escalationReason = reason;

    this.addAuditEntry(
      'ESCALATED',
      escalatingUserId,
      escalatingUserName,
      escalatingUserRole,
      `Escalated to ${escalatedToName} (${escalatedToRole}). Reason: ${reason}`,
      reason
    );
    this.touch();
  }

  public addMessage(msg: {
    senderUserId: string;
    senderName: string;
    senderRole: string;
    message: string;
    visibility: 'PARENT_VISIBLE' | 'INTERNAL_ONLY';
    attachments?: ConcernAttachment[];
  }): ConcernMessage {
    const messageEntry: ConcernMessage = {
      id: `msg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      senderUserId: msg.senderUserId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      message: msg.message,
      visibility: msg.visibility,
      attachments: msg.attachments || [],
      createdAt: new Date()
    };

    this._props.messages.push(messageEntry);

    const isInternal = msg.visibility === 'INTERNAL_ONLY';
    this.addAuditEntry(
      isInternal ? 'INTERNAL_NOTE_ADDED' : 'MESSAGE_SENT',
      msg.senderUserId,
      msg.senderName,
      msg.senderRole,
      isInternal
        ? `Internal note added by ${msg.senderName}`
        : `Message sent to ${msg.senderRole === 'PARENT' ? 'School' : 'Parent'} by ${msg.senderName}`
    );

    this.touch();
    return messageEntry;
  }

  public updateStatus(status: string, notes?: string, actingUserId?: string, actingUserName?: string, actingUserRole?: string): void {
    const prevStatus = this._props.status;
    this._props.status = status;
    if (notes) {
      this._props.resolutionNotes = this._props.resolutionNotes
        ? `${this._props.resolutionNotes}\n${notes}`
        : notes;
    }

    this.addAuditEntry(
      'STATUS_CHANGE',
      actingUserId || 'system',
      actingUserName || 'Staff Member',
      actingUserRole || 'STAFF',
      `Status changed from ${prevStatus} to ${status}${notes ? `. Notes: ${notes}` : ''}`,
      notes
    );
    this.touch();
  }

  public resolve(
    resolutionNotesOrDetails: string,
    resolvedByUserId: string,
    actionTaken?: string,
    resolvedByName?: string,
    resolvedByRole?: string
  ): void {
    this._props.status = 'RESOLVED';
    this._props.resolutionNotes = resolutionNotesOrDetails;
    this._props.resolutionDetails = resolutionNotesOrDetails;
    if (actionTaken) this._props.actionTaken = actionTaken;
    this._props.resolvedByUserId = resolvedByUserId;
    if (resolvedByName) this._props.resolvedByName = resolvedByName;
    this._props.resolvedAt = new Date();

    this.addAuditEntry(
      'RESOLVED',
      resolvedByUserId,
      resolvedByName || 'Staff Member',
      resolvedByRole || 'STAFF',
      `Concern marked as RESOLVED by ${resolvedByName || resolvedByUserId}. Action taken: ${actionTaken || 'Resolution documented'}.`,
      resolutionNotesOrDetails
    );
    this.touch();
  }

  public close(closedByUserId: string, closedByName: string, closedByRole: string, closureNotes?: string): void {
    this._props.status = 'CLOSED';
    this._props.closedAt = new Date();
    this._props.closedByUserId = closedByUserId;
    this._props.closedByName = closedByName;
    if (closureNotes) this._props.closureNotes = closureNotes;

    this.addAuditEntry(
      'CLOSED',
      closedByUserId,
      closedByName,
      closedByRole,
      `Concern closed by ${closedByName} (${closedByRole})${closureNotes ? `. Closure remarks: ${closureNotes}` : ''}`,
      closureNotes
    );
    this.touch();
  }

  public reopen(reason: string, reopenedByUserId: string, reopenedByName: string, reopenedByRole: string): void {
    this._props.status = 'REOPENED';
    this._props.reopenedAt = new Date();
    this._props.reopenedByUserId = reopenedByUserId;
    this._props.reopenedByName = reopenedByName;
    this._props.reopeningReason = reason;

    this.addAuditEntry(
      'REOPENED',
      reopenedByUserId,
      reopenedByName,
      reopenedByRole,
      `Concern reopened by ${reopenedByName} (${reopenedByRole}). Reason: ${reason}`,
      reason
    );
    this.touch();
  }

  public dismiss(reason: string, dismissedByUserId?: string): void {
    this._props.status = 'DISMISSED';
    this._props.resolutionNotes = reason;
    if (dismissedByUserId) {
      this._props.resolvedByUserId = dismissedByUserId;
    }
    this._props.resolvedAt = new Date();

    this.addAuditEntry(
      'CLOSED',
      dismissedByUserId || 'system',
      'Administrator',
      'ADMIN',
      `Concern dismissed: ${reason}`,
      reason
    );
    this.touch();
  }

  public updateDetails(updates: Partial<{
    title: string;
    description: string;
    category: string;
    priority: string;
    complainantName: string;
    complainantRole: string;
    complainantPhone: string;
    complainantEmail: string;
    complainantStudentId: string;
    assignedToUserId: string;
  }>): void {
    if (updates.title !== undefined) this._props.title = updates.title;
    if (updates.description !== undefined) this._props.description = updates.description;
    if (updates.category !== undefined) this._props.category = updates.category;
    if (updates.priority !== undefined) this._props.priority = updates.priority;
    if (updates.complainantName !== undefined) this._props.complainantName = updates.complainantName;
    if (updates.complainantRole !== undefined) this._props.complainantRole = updates.complainantRole;
    if (updates.complainantPhone !== undefined) this._props.complainantPhone = updates.complainantPhone;
    if (updates.complainantEmail !== undefined) this._props.complainantEmail = updates.complainantEmail;
    if (updates.complainantStudentId !== undefined) {
      this._props.complainantStudentId = updates.complainantStudentId;
      this._props.studentId = updates.complainantStudentId;
    }
    if (updates.assignedToUserId !== undefined) this._props.assignedToUserId = updates.assignedToUserId;
    this.touch();
  }

  private addAuditEntry(
    action: ConcernAuditEntry['action'],
    performedByUserId: string,
    performedByName: string,
    performedByRole: string,
    details: string,
    notes?: string
  ): void {
    this._props.auditTrail.push({
      id: `audit-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      action,
      performedByUserId,
      performedByName,
      performedByRole,
      timestamp: new Date(),
      details,
      notes
    });
  }

  // Sanitized view for parent (STRICTLY removes all internal notes and internal audits)
  public toParentSafeJSON() {
    const full = this.toJSON();
    return {
      ...full,
      messages: this.messages
        .filter((m) => m.visibility === 'PARENT_VISIBLE')
        .map((m) => ({
          id: m.id,
          senderUserId: m.senderUserId,
          senderName: m.senderName,
          senderRole: m.senderRole,
          message: m.message,
          visibility: m.visibility,
          attachments: m.attachments,
          createdAt: m.createdAt.toISOString()
        })),
      auditTrail: this.auditTrail
        .filter((a) => a.action !== 'INTERNAL_NOTE_ADDED')
        .map((a) => ({
          id: a.id,
          action: a.action,
          performedByName: a.performedByName,
          performedByRole: a.performedByRole,
          timestamp: a.timestamp.toISOString(),
          details: a.details
        }))
    };
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      referenceNumber: this.referenceNumber,
      title: this.title,
      description: this.description,
      category: this.category,
      priority: this.priority,
      status: this.status,

      complainantName: this.complainantName,
      complainantRole: this.complainantRole,
      complainantPhone: this.complainantPhone,
      complainantEmail: this.complainantEmail,
      parentUserId: this.parentUserId,

      complainantStudentId: this.complainantStudentId,
      studentId: this.studentId,
      studentName: this.studentName,
      admissionNumber: this.admissionNumber,
      gradeLevel: this.gradeLevel,

      assignedToUserId: this.assignedToUserId,
      assignedToName: this.assignedToName,
      assignedToRole: this.assignedToRole,
      assignedAt: this.assignedAt ? this.assignedAt.toISOString() : undefined,
      assignedByUserId: this.assignedByUserId,
      assignedByName: this.assignedByName,
      reassignmentReason: this._props.reassignmentReason,

      acknowledgedAt: this.acknowledgedAt ? this.acknowledgedAt.toISOString() : undefined,
      acknowledgedByUserId: this.acknowledgedByUserId,
      acknowledgedByName: this.acknowledgedByName,

      escalatedAt: this.escalatedAt ? this.escalatedAt.toISOString() : undefined,
      escalatedToUserId: this.escalatedToUserId,
      escalatedToName: this.escalatedToName,
      escalatedToRole: this.escalatedToRole,
      escalationReason: this.escalationReason,

      actionTaken: this.actionTaken,
      resolutionDetails: this.resolutionDetails,
      resolutionNotes: this.resolutionNotes,
      resolvedByUserId: this.resolvedByUserId,
      resolvedByName: this.resolvedByName,
      resolvedAt: this.resolvedAt ? this.resolvedAt.toISOString() : undefined,

      closedAt: this.closedAt ? this.closedAt.toISOString() : undefined,
      closedByUserId: this.closedByUserId,
      closedByName: this.closedByName,
      closureNotes: this.closureNotes,

      reopenedAt: this.reopenedAt ? this.reopenedAt.toISOString() : undefined,
      reopenedByUserId: this.reopenedByUserId,
      reopenedByName: this.reopenedByName,
      reopeningReason: this.reopeningReason,

      acknowledgementDeadline: this.acknowledgementDeadline ? this.acknowledgementDeadline.toISOString() : undefined,
      resolutionDeadline: this.resolutionDeadline ? this.resolutionDeadline.toISOString() : undefined,
      isOverdue: this.isOverdue,

      messages: this.messages.map((m) => ({
        id: m.id,
        senderUserId: m.senderUserId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        message: m.message,
        visibility: m.visibility,
        attachments: m.attachments,
        createdAt: m.createdAt.toISOString()
      })),
      auditTrail: this.auditTrail.map((a) => ({
        id: a.id,
        action: a.action,
        performedByUserId: a.performedByUserId,
        performedByName: a.performedByName,
        performedByRole: a.performedByRole,
        timestamp: a.timestamp.toISOString(),
        details: a.details,
        notes: a.notes
      })),
      attachments: this.attachments,

      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
