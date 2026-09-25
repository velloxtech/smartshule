import { Entity } from '../shared/Entity';

export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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
  | 'OTHER';

export interface ComplaintProps {
  schoolId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  complainantName?: string;
  complainantRole?: string;
  complainantPhone?: string;
  complainantEmail?: string;
  complainantStudentId?: string;
  assignedToUserId?: string;
  resolutionNotes?: string;
  resolvedByUserId?: string;
  resolvedAt?: Date;
  createdByUserId?: string;
}

export class Complaint extends Entity<ComplaintProps> {
  public static create(
    props: Partial<ComplaintProps> & { schoolId: string; title: string; description: string },
    id: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Complaint {
    return new Complaint(
      {
        schoolId: props.schoolId,
        title: props.title,
        description: props.description,
        category: props.category || 'GENERAL',
        priority: props.priority || 'MEDIUM',
        status: props.status || 'OPEN',
        complainantName: props.complainantName,
        complainantRole: props.complainantRole || 'OTHER',
        complainantPhone: props.complainantPhone,
        complainantEmail: props.complainantEmail,
        complainantStudentId: props.complainantStudentId,
        assignedToUserId: props.assignedToUserId,
        resolutionNotes: props.resolutionNotes,
        resolvedByUserId: props.resolvedByUserId,
        resolvedAt: props.resolvedAt,
        createdByUserId: props.createdByUserId
      },
      id,
      createdAt,
      updatedAt
    );
  }

  public get schoolId(): string {
    return this._props.schoolId;
  }

  public get title(): string {
    return this._props.title;
  }

  public get description(): string {
    return this._props.description;
  }

  public get category(): string {
    return this._props.category;
  }

  public get priority(): string {
    return this._props.priority;
  }

  public get status(): string {
    return this._props.status;
  }

  public get complainantName(): string | undefined {
    return this._props.complainantName;
  }

  public get complainantRole(): string | undefined {
    return this._props.complainantRole;
  }

  public get complainantPhone(): string | undefined {
    return this._props.complainantPhone;
  }

  public get complainantEmail(): string | undefined {
    return this._props.complainantEmail;
  }

  public get complainantStudentId(): string | undefined {
    return this._props.complainantStudentId;
  }

  public get assignedToUserId(): string | undefined {
    return this._props.assignedToUserId;
  }

  public get resolutionNotes(): string | undefined {
    return this._props.resolutionNotes;
  }

  public get resolvedByUserId(): string | undefined {
    return this._props.resolvedByUserId;
  }

  public get resolvedAt(): Date | undefined {
    return this._props.resolvedAt;
  }

  public get createdByUserId(): string | undefined {
    return this._props.createdByUserId;
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
    if (updates.complainantStudentId !== undefined) this._props.complainantStudentId = updates.complainantStudentId;
    if (updates.assignedToUserId !== undefined) this._props.assignedToUserId = updates.assignedToUserId;
    this.touch();
  }

  public updateStatus(status: string, notes?: string): void {
    this._props.status = status;
    if (notes) {
      this._props.resolutionNotes = this._props.resolutionNotes
        ? `${this._props.resolutionNotes}\n${notes}`
        : notes;
    }
    this.touch();
  }

  public assignTo(userId: string): void {
    this._props.assignedToUserId = userId;
    if (this._props.status === 'OPEN') {
      this._props.status = 'IN_REVIEW';
    }
    this.touch();
  }

  public resolve(resolutionNotes: string, resolvedByUserId: string): void {
    this._props.status = 'RESOLVED';
    this._props.resolutionNotes = resolutionNotes;
    this._props.resolvedByUserId = resolvedByUserId;
    this._props.resolvedAt = new Date();
    this.touch();
  }

  public dismiss(reason: string, dismissedByUserId?: string): void {
    this._props.status = 'DISMISSED';
    this._props.resolutionNotes = reason;
    if (dismissedByUserId) {
      this._props.resolvedByUserId = dismissedByUserId;
    }
    this._props.resolvedAt = new Date();
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      schoolId: this.schoolId,
      title: this.title,
      description: this.description,
      category: this.category,
      priority: this.priority,
      status: this.status,
      complainantName: this.complainantName,
      complainantRole: this.complainantRole,
      complainantPhone: this.complainantPhone,
      complainantEmail: this.complainantEmail,
      complainantStudentId: this.complainantStudentId,
      assignedToUserId: this.assignedToUserId,
      resolutionNotes: this.resolutionNotes,
      resolvedByUserId: this.resolvedByUserId,
      resolvedAt: this.resolvedAt ? this.resolvedAt.toISOString() : undefined,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
